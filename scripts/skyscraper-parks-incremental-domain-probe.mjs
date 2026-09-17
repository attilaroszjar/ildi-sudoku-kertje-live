import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const allRefs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const first=allRefs.indexOf('games/sudoku-generator.js');
const last=allRefs.indexOf('games/miracle-generator-hardening.js');
if(first<0||last<first)throw new Error('production generator range missing');
const banks=allRefs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const refs=[...banks,...allRefs.slice(first,last+1).filter(ref=>!banks.includes(ref))];
globalThis.window=globalThis;globalThis.performance=performance;globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of refs)(0,eval)(`${fs.readFileSync(path.join(root,ref),'utf8')}\n//# sourceURL=${ref}`);

const G=globalThis.SudokuGenerator;
const variant=globalThis.SudokuBank?.find(x=>x.id==='skyscraper-parks');
if(!G||!variant||typeof G.countParkSolutions!=='function')throw new Error('Skyscraper Parks runtime unavailable');
const seed=Number(process.env.SKYSCRAPER_PARKS_EXPERT_SEED||92001);
const generated=G.make(variant,seed,'expert');
const n=generated.puzzle.length,park=generated.data?.parkValue??n,full=(1<<n)-1;
function bitCount(x){let c=0;while(x){x&=x-1;c++;}return c;}
function visible(line){let max=0,count=0;for(const v of line){if(v===park)continue;if(v>max){max=v;count++;}}return count;}
function cluePair(axis,index){const clues=(generated.data?.clues||[]).filter(cl=>cl.axis===axis&&cl.index===index);const near=axis==='row'?'left':'top',far=axis==='row'?'right':'bottom';const a=clues.find(cl=>cl.side===near)?.count,b=clues.find(cl=>cl.side===far)?.count;if(!Number.isInteger(a)||!Number.isInteger(b))throw new Error(`missing clue pair ${axis} ${index}`);return[a,b];}
function key(a,b){return `${a},${b}`;}

const needed=new Set();for(let i=0;i<n;i++){const r=cluePair('row',i),c=cluePair('col',i);needed.add(key(r[0],r[1]));needed.add(key(c[0],c[1]));}
const buckets=new Map([...needed].map(k=>[k,[]]));
const perm=Array(n).fill(0),used=Array(n+1).fill(false);
function emit(pos){if(pos===n){const a=visible(perm),b=visible([...perm].reverse()),bucket=buckets.get(key(a,b));if(bucket)bucket.push(Uint8Array.from(perm));return;}for(let d=1;d<=n;d++)if(!used[d]){used[d]=true;perm[pos]=d;emit(pos+1);used[d]=false;}}
const buildStart=performance.now();emit(0);
function buildDomainIndex(domain){const wordCount=Math.ceil(domain.length/32),all=new Uint32Array(wordCount);for(let i=0;i<domain.length;i++)all[i>>>5]|=1<<(i&31);const byPos=Array.from({length:n},()=>Array.from({length:n+1},()=>new Uint32Array(wordCount)));for(let i=0;i<domain.length;i++)for(let p=0;p<n;p++)byPos[p][domain[i][p]][i>>>5]|=1<<(i&31);return{domain,all,byPos,wordCount};}
const rowIndex=Array.from({length:n},(_,i)=>{const p=cluePair('row',i);return buildDomainIndex(buckets.get(key(p[0],p[1])));});
const colIndex=Array.from({length:n},(_,i)=>{const p=cluePair('col',i);return buildDomainIndex(buckets.get(key(p[0],p[1])));});
const domainBuildMs=performance.now()-buildStart;

function cloneBits(bits){return bits.slice();}
function intersectInto(bits,mask,stats){let any=false;for(let w=0;w<bits.length;w++){bits[w]&=mask[w];stats.andWords++;if(bits[w])any=true;}return any;}
function supportedDigitMask(active,index,pos,stats){let mask=0;for(let d=1;d<=n;d++){const hit=index.byPos[pos][d];for(let w=0;w<active.length;w++){stats.testWords++;if(active[w]&hit[w]){mask|=1<<(d-1);break;}}}return mask;}
function buildSupportCache(active,index,gridLine,stats){const out=Array(n).fill(0);for(let p=0;p<n;p++)out[p]=gridLine[p]?1<<(gridLine[p]-1):supportedDigitMask(active,index,p,stats);return out;}

function countIncremental(source,limit=2){
  const grid=source.map(r=>r.slice());
  const stats={nodes:0,branches:0,deadEnds:0,solutions:0,andWords:0,testWords:0,cacheRebuilds:0,maxDepth:0};
  const rowActive=rowIndex.map(x=>cloneBits(x.all)),colActive=colIndex.map(x=>cloneBits(x.all));
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){const v=grid[r][c];if(!v)continue;if(!intersectInto(rowActive[r],rowIndex[r].byPos[c][v],stats))return{solutions:0,stats,runtimeMs:0};if(!intersectInto(colActive[c],colIndex[c].byPos[r][v],stats))return{solutions:0,stats,runtimeMs:0};}
  const rowCache=Array(n),colCache=Array(n);
  for(let r=0;r<n;r++){rowCache[r]=buildSupportCache(rowActive[r],rowIndex[r],grid[r],stats);stats.cacheRebuilds++;}
  for(let c=0;c<n;c++){const line=Array.from({length:n},(_,r)=>grid[r][c]);colCache[c]=buildSupportCache(colActive[c],colIndex[c],line,stats);stats.cacheRebuilds++;}

  function visit(depth){
    stats.nodes++;if(depth>stats.maxDepth)stats.maxDepth=depth;if(stats.solutions>=limit)return;
    let br=-1,bc=-1,bm=0,best=n+1;
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!grid[r][c]){const mask=rowCache[r][c]&colCache[c][r]&full,cnt=bitCount(mask);if(!cnt){stats.deadEnds++;return;}if(cnt<best){br=r;bc=c;bm=mask;best=cnt;if(cnt===1)break;}}
    if(br<0){stats.solutions++;return;}if(best>1)stats.branches++;
    for(let bits=bm;bits;bits&=bits-1){
      const one=bits&-bits,d=1+Math.round(Math.log(one)/Math.LN2);
      const prevRowActive=rowActive[br],prevColActive=colActive[bc],prevRowCache=rowCache[br],prevColCache=colCache[bc];
      const nextRow=cloneBits(prevRowActive),nextCol=cloneBits(prevColActive);
      const rowOk=intersectInto(nextRow,rowIndex[br].byPos[bc][d],stats);
      const colOk=rowOk&&intersectInto(nextCol,colIndex[bc].byPos[br][d],stats);
      if(colOk){
        grid[br][bc]=d;rowActive[br]=nextRow;colActive[bc]=nextCol;
        rowCache[br]=buildSupportCache(nextRow,rowIndex[br],grid[br],stats);stats.cacheRebuilds++;
        const colLine=Array.from({length:n},(_,r)=>grid[r][bc]);colCache[bc]=buildSupportCache(nextCol,colIndex[bc],colLine,stats);stats.cacheRebuilds++;
        visit(depth+1);
        grid[br][bc]=0;rowActive[br]=prevRowActive;colActive[bc]=prevColActive;rowCache[br]=prevRowCache;colCache[bc]=prevColCache;
      }
      if(stats.solutions>=limit)return;
    }
  }
  const t0=performance.now();visit(0);return{solutions:stats.solutions,stats,runtimeMs:performance.now()-t0};
}

const cases=[{id:'base',puzzle:generated.puzzle.map(r=>r.slice())}];for(let idx=0;idx<n*n;idx++){const r=Math.floor(idx/n),c=idx%n;if(!generated.puzzle[r][c])continue;const p=generated.puzzle.map(row=>row.slice());p[r][c]=0;cases.push({id:`r${r+1}c${c+1}`,puzzle:p});}
let mismatches=0,productionMs=0,incrementalMs=0;for(const tc of cases){const t0=performance.now(),prod=G.countParkSolutions(tc.puzzle,generated,2,false),pms=performance.now()-t0,inc=countIncremental(tc.puzzle,2);productionMs+=pms;incrementalMs+=inc.runtimeMs;if(prod!==inc.solutions)mismatches++;}
console.log('SKYSCRAPER_PARKS_INCREMENTAL_DOMAIN_DIFFERENTIAL '+JSON.stringify({seed,cases:cases.length,mismatches,productionMs:+productionMs.toFixed(1),incrementalMs:+incrementalMs.toFixed(1),aggregateSpeedup:incrementalMs?+(productionMs/incrementalMs).toFixed(2):null,domainBuildMs:+domainBuildMs.toFixed(1)}));
if(mismatches){console.log('SKYSCRAPER_PARKS_INCREMENTAL_DOMAIN_GATE:FAIL');process.exitCode=1;}else{
  const removed=['r5c9','r7c7','r6c2','r1c9','r6c3','r6c1','r3c5','r1c3','r2c3','r9c4','r2c5','r7c3','r1c1','r5c1','r8c9','r8c6','r2c1','r7c6','r2c6'];
  const sparse=generated.puzzle.map(r=>r.slice());for(const cell of removed){const m=/r(\d+)c(\d+)/.exec(cell);sparse[Number(m[1])-1][Number(m[2])-1]=0;}
  const clues=sparse.flat().filter(Boolean).length;if(clues!==11)throw new Error(`expected 11 clues, got ${clues}`);
  console.log('SKYSCRAPER_PARKS_INCREMENTAL_DOMAIN_PROGRESS '+JSON.stringify({phase:'start',seed,clues,domainBuildMs:+domainBuildMs.toFixed(1)}));
  const result=countIncremental(sparse,2);
  console.log('SKYSCRAPER_PARKS_INCREMENTAL_DOMAIN '+JSON.stringify({seed,clues,solutions:result.solutions,expectedSolutions:1,match:result.solutions===1,runtimeMs:+result.runtimeMs.toFixed(1),domainBuildMs:+domainBuildMs.toFixed(1),stats:result.stats}));
  console.log('SKYSCRAPER_PARKS_INCREMENTAL_DOMAIN_GATE:'+(result.solutions===1?'PASS':'FAIL'));if(result.solutions!==1)process.exitCode=1;
}
