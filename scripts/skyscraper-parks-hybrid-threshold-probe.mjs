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
const n=9,park=generated.data?.parkValue??9,full=(1<<9)-1;
function bitCount(x){let c=0;while(x){x&=x-1;c++;}return c;}
function visible(line){let max=0,count=0;for(const v of line){if(v===park)continue;if(v>max){max=v;count++;}}return count;}
function cluePair(axis,index){const clues=(generated.data?.clues||[]).filter(cl=>cl.axis===axis&&cl.index===index);const near=axis==='row'?'left':'top',far=axis==='row'?'right':'bottom';return [clues.find(cl=>cl.side===near)?.count,clues.find(cl=>cl.side===far)?.count];}
function key(a,b){return `${a},${b}`;}
const needed=new Set();for(let i=0;i<n;i++){const r=cluePair('row',i),c=cluePair('col',i);needed.add(key(r[0],r[1]));needed.add(key(c[0],c[1]));}
const buckets=new Map([...needed].map(k=>[k,[]]));
const perm=Array(n).fill(0),used=Array(n+1).fill(false);
function emit(pos){if(pos===n){const a=visible(perm),b=visible([...perm].reverse()),bucket=buckets.get(key(a,b));if(bucket)bucket.push(Uint8Array.from(perm));return;}for(let d=1;d<=n;d++)if(!used[d]){used[d]=true;perm[pos]=d;emit(pos+1);used[d]=false;}}
const buildStart=performance.now();emit(0);
function buildIndex(domain){const words=Math.ceil(domain.length/32),all=new Uint32Array(words),byPos=Array.from({length:n},()=>Array.from({length:n+1},()=>new Uint32Array(words)));for(let i=0;i<domain.length;i++){all[i>>>5]|=1<<(i&31);for(let p=0;p<n;p++)byPos[p][domain[i][p]][i>>>5]|=1<<(i&31);}return {domain,all,byPos,words};}
const rowIdx=Array.from({length:n},(_,i)=>{const p=cluePair('row',i);return buildIndex(buckets.get(key(p[0],p[1])));});
const colIdx=Array.from({length:n},(_,i)=>{const p=cluePair('col',i);return buildIndex(buckets.get(key(p[0],p[1])));});
const domainBuildMs=performance.now()-buildStart;

function intersectCopy(active,mask,stats){const out=new Uint32Array(active.length);let any=false;for(let w=0;w<active.length;w++){const v=active[w]&mask[w];out[w]=v;stats.andWords++;if(v)any=true;}return any?out:null;}
function supportMask(active,index,pos,stats){let mask=0;for(let d=1;d<=n;d++){const bits=index.byPos[pos][d];let ok=false;for(let w=0;w<active.length;w++){stats.testWords++;if(active[w]&bits[w]){ok=true;break;}}if(ok)mask|=1<<(d-1);}return mask;}
function countIncremental(source,limit=2){
  const grid=source.map(r=>r.slice()),rows=Array(n).fill(0),cols=Array(n).fill(0),rowActive=rowIdx.map(x=>x.all.slice()),colActive=colIdx.map(x=>x.all.slice());
  const stats={nodes:0,branches:0,deadEnds:0,solutions:0,andWords:0,testWords:0,cacheRebuilds:0,maxDepth:0};
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){const d=grid[r][c];if(!d)continue;const bit=1<<(d-1);if((rows[r]|cols[c])&bit)return {solutions:0,stats,runtimeMs:0};rows[r]|=bit;cols[c]|=bit;const ra=intersectCopy(rowActive[r],rowIdx[r].byPos[c][d],stats),ca=intersectCopy(colActive[c],colIdx[c].byPos[r][d],stats);if(!ra||!ca)return {solutions:0,stats,runtimeMs:0};rowActive[r]=ra;colActive[c]=ca;}
  function visit(depth){stats.nodes++;if(depth>stats.maxDepth)stats.maxDepth=depth;if(stats.solutions>=limit)return;let br=-1,bc=-1,bm=0,best=n+1;
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(!grid[r][c]){stats.cacheRebuilds+=2;const mask=supportMask(rowActive[r],rowIdx[r],c,stats)&supportMask(colActive[c],colIdx[c],r,stats)&full&~(rows[r]|cols[c]);const cnt=bitCount(mask);if(!cnt){stats.deadEnds++;return;}if(cnt<best){br=r;bc=c;bm=mask;best=cnt;if(cnt===1)break;}}
    if(br<0){stats.solutions++;return;}if(best>1)stats.branches++;
    for(let bits=bm;bits;bits&=bits-1){const one=bits&-bits,d=1+Math.round(Math.log(one)/Math.LN2),oldR=rowActive[br],oldC=colActive[bc],ra=intersectCopy(oldR,rowIdx[br].byPos[bc][d],stats),ca=intersectCopy(oldC,colIdx[bc].byPos[br][d],stats);if(!ra||!ca)continue;grid[br][bc]=d;rows[br]|=one;cols[bc]|=one;rowActive[br]=ra;colActive[bc]=ca;visit(depth+1);rowActive[br]=oldR;colActive[bc]=oldC;rows[br]^=one;cols[bc]^=one;grid[br][bc]=0;if(stats.solutions>=limit)return;}
  }
  const t0=performance.now();visit(0);return {solutions:stats.solutions,stats,runtimeMs:performance.now()-t0};
}

const removals=['r5c9','r7c7','r6c2','r1c9','r6c3','r6c1','r3c5','r1c3','r2c3','r9c4','r2c5','r7c3','r1c1','r5c1','r8c9','r8c6','r2c1','r7c6','r2c6'];
const wanted=new Set([15,14,13,12,11]);
const puzzle=generated.puzzle.map(r=>r.slice()),states=[];
for(const cell of removals){const m=/r(\d+)c(\d+)/.exec(cell);puzzle[+m[1]-1][+m[2]-1]=0;const clues=puzzle.flat().filter(Boolean).length;if(wanted.has(clues))states.push({clues,puzzle:puzzle.map(r=>r.slice()),lastRemoval:cell});}
const results=[];
for(const state of states){console.log('SKYSCRAPER_PARKS_HYBRID_THRESHOLD_PROGRESS '+JSON.stringify({phase:'start',clues:state.clues,lastRemoval:state.lastRemoval}));const out=countIncremental(state.puzzle,2);results.push({clues:state.clues,lastRemoval:state.lastRemoval,solutions:out.solutions,runtimeMs:+out.runtimeMs.toFixed(1),nodes:out.stats.nodes,branches:out.stats.branches,deadEnds:out.stats.deadEnds,andWords:out.stats.andWords,testWords:out.stats.testWords,cacheRebuilds:out.stats.cacheRebuilds});console.log('SKYSCRAPER_PARKS_HYBRID_THRESHOLD_PROGRESS '+JSON.stringify({phase:'done',...results.at(-1)}));}
const pass=results.length===5&&results.every(x=>x.solutions===1);
console.log('SKYSCRAPER_PARKS_HYBRID_THRESHOLD '+JSON.stringify({seed,domainBuildMs:+domainBuildMs.toFixed(1),results,recommendation:'choose sparse-dispatch threshold from measured crossover; threshold changes solver strategy only, never carving eligibility'}));
console.log('SKYSCRAPER_PARKS_HYBRID_THRESHOLD_GATE:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
