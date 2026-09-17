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
function cluePair(axis,index){const clues=(generated.data?.clues||[]).filter(cl=>cl.axis===axis&&cl.index===index);const near=axis==='row'?'left':'top',far=axis==='row'?'right':'bottom';const a=clues.find(cl=>cl.side===near)?.count,b=clues.find(cl=>cl.side===far)?.count;if(!Number.isInteger(a)||!Number.isInteger(b))throw new Error(`missing clue pair ${axis} ${index}`);return [a,b];}
function key(a,b){return `${a},${b}`;}
const needed=new Set();for(let i=0;i<n;i++){const r=cluePair('row',i),c=cluePair('col',i);needed.add(key(r[0],r[1]));needed.add(key(c[0],c[1]));}
const buckets=new Map([...needed].map(k=>[k,[]]));
const perm=Array(n).fill(0),used=Array(n+1).fill(false);
function emit(pos){if(pos===n){const a=visible(perm),b=visible([...perm].reverse()),bucket=buckets.get(key(a,b));if(bucket)bucket.push(Uint8Array.from(perm));return;}for(let d=1;d<=n;d++)if(!used[d]){used[d]=true;perm[pos]=d;emit(pos+1);used[d]=false;}}
const buildStart=performance.now();emit(0);

function buildDomainIndex(domain){
  const wordCount=Math.ceil(domain.length/32);
  const all=new Uint32Array(wordCount);for(let i=0;i<domain.length;i++)all[i>>>5]|=1<<(i&31);
  const byPos=Array.from({length:n},()=>Array.from({length:n+1},()=>new Uint32Array(wordCount)));
  for(let i=0;i<domain.length;i++)for(let p=0;p<n;p++)byPos[p][domain[i][p]][i>>>5]|=1<<(i&31);
  return {domain,all,byPos,wordCount};
}
const rowDomains=Array.from({length:n},(_,i)=>{const p=cluePair('row',i);return buildDomainIndex(buckets.get(key(p[0],p[1])));});
const colDomains=Array.from({length:n},(_,i)=>{const p=cluePair('col',i);return buildDomainIndex(buckets.get(key(p[0],p[1])));});
const domainBuildMs=performance.now()-buildStart;

function supportMasks(line,index,stats){
  const active=index.all.slice();
  for(let p=0;p<n;p++)if(line[p]){const match=index.byPos[p][line[p]];for(let w=0;w<index.wordCount;w++)active[w]&=match[w];stats.bitsetWordsAnded+=index.wordCount;}
  let any=false;for(let w=0;w<active.length;w++)if(active[w]){any=true;break;}if(!any)return null;
  const masks=Array(n).fill(0);
  for(let p=0;p<n;p++)if(!line[p]){
    let mask=0;
    for(let d=1;d<=n;d++){
      const idx=index.byPos[p][d];let supported=false;
      for(let w=0;w<index.wordCount;w++){stats.bitsetWordsTested++;if(active[w]&idx[w]){supported=true;break;}}
      if(supported)mask|=1<<(d-1);
    }
    masks[p]=mask;
  }
  return masks;
}
function countIndexedDomainSolutions(source,limit=2){
  const grid=source.map(r=>r.slice());
  const stats={nodes:0,branches:0,deadEnds:0,solutions:0,bitsetWordsAnded:0,bitsetWordsTested:0,maxDepth:0};
  function visit(depth){
    stats.nodes++;if(depth>stats.maxDepth)stats.maxDepth=depth;if(stats.solutions>=limit)return;
    const rowSup=Array(n),colSup=Array(n);
    for(let r=0;r<n;r++){const s=supportMasks(grid[r],rowDomains[r],stats);if(!s){stats.deadEnds++;return;}rowSup[r]=s;}
    for(let c=0;c<n;c++){const line=Array.from({length:n},(_,r)=>grid[r][c]);const s=supportMasks(line,colDomains[c],stats);if(!s){stats.deadEnds++;return;}colSup[c]=s;}
    let br=-1,bc=-1,bm=0,best=n+1;
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!grid[r][c]){const mask=rowSup[r][c]&colSup[c][r]&full,cnt=bitCount(mask);if(!cnt){stats.deadEnds++;return;}if(cnt<best){br=r;bc=c;bm=mask;best=cnt;if(cnt===1)break;}}
    if(br<0){stats.solutions++;return;}if(best>1)stats.branches++;
    for(let bits=bm;bits;bits&=bits-1){const one=bits&-bits,d=1+Math.round(Math.log(one)/Math.LN2);grid[br][bc]=d;visit(depth+1);grid[br][bc]=0;if(stats.solutions>=limit)return;}
  }
  const t0=performance.now();visit(0);return {solutions:stats.solutions,stats,runtimeMs:performance.now()-t0};
}

const cases=[{id:'base',puzzle:generated.puzzle.map(r=>r.slice())}];
for(let idx=0;idx<n*n;idx++){const r=Math.floor(idx/n),c=idx%n;if(!generated.puzzle[r][c])continue;const p=generated.puzzle.map(row=>row.slice());p[r][c]=0;cases.push({id:`r${r+1}c${c+1}`,puzzle:p});}
let mismatches=0,legacyMs=0,indexedMs=0;const results=[];
for(const tc of cases){const t0=performance.now(),legacy=G.countParkSolutions(tc.puzzle,generated,2,false),lms=performance.now()-t0;const opt=countIndexedDomainSolutions(tc.puzzle,2);if(legacy!==opt.solutions)mismatches++;legacyMs+=lms;indexedMs+=opt.runtimeMs;results.push({id:tc.id,legacy,indexed:opt.solutions,match:legacy===opt.solutions,legacyMs:+lms.toFixed(1),indexedMs:+opt.runtimeMs.toFixed(1),speedup:opt.runtimeMs?+(lms/opt.runtimeMs).toFixed(2):null,nodes:opt.stats.nodes,branches:opt.stats.branches,deadEnds:opt.stats.deadEnds,bitsetWordsAnded:opt.stats.bitsetWordsAnded,bitsetWordsTested:opt.stats.bitsetWordsTested,maxDepth:opt.stats.maxDepth});}
console.log('SKYSCRAPER_PARKS_INDEXED_DOMAIN_DIFFERENTIAL '+JSON.stringify({seed,cases:cases.length,mismatches,domainBuildMs:+domainBuildMs.toFixed(1),legacyMs:+legacyMs.toFixed(1),indexedMs:+indexedMs.toFixed(1),aggregateSpeedup:indexedMs?+(legacyMs/indexedMs).toFixed(2):null,domainSizes:{rows:rowDomains.map(d=>d.domain.length),cols:colDomains.map(d=>d.domain.length)},slowest:results.slice().sort((a,b)=>b.indexedMs-a.indexedMs).slice(0,8)}));
console.log('SKYSCRAPER_PARKS_INDEXED_DOMAIN_DIFFERENTIAL_GATE:'+(mismatches===0?'PASS':'FAIL'));
if(mismatches)process.exitCode=1;
