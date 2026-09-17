import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=Number(process.argv[2]||97001)>>>0;
const size=Number(process.argv[3]||6);
const difficulty='expert',id='fillomino';
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]).filter(x=>x.startsWith('games/'));
const bankRefs=refs.filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x));
const a=refs.indexOf('games/sudoku-generator.js'),b=refs.indexOf('games/p3-size-control.js');
if(a<0||b<a)throw new Error('production runtime range not found');
const load=[...bankRefs,...refs.slice(a,b+1).filter(x=>!bankRefs.includes(x))];
globalThis.window=globalThis;globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of load)await import(pathToFileURL(path.join(root,ref)).href);
const generator=globalThis.SudokuGenerator,variant=globalThis.SudokuBank&&globalThis.SudokuBank.find(v=>v&&v.id===id);
if(!generator||!variant)throw new Error('Fillomino production runtime unavailable');
variant.data=variant.data||{};variant.data.p3Size=size;
const clone=x=>JSON.parse(JSON.stringify(x));
const countClues=grid=>grid.flat().filter(Boolean).length;
function rng(seed){let x=seed>>>0;return()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(a,random){for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

function connectedSubsets(n,size){
  const key=(cells)=>cells.slice().sort((a,b)=>a-b).join(',');
  const seen=new Set(),out=[];
  function expand(cells,frontier){
    if(cells.length===size){const k=key(cells);if(!seen.has(k)){seen.add(k);out.push(cells.slice().sort((a,b)=>a-b));}return;}
    const current=new Set(cells),nextFront=new Set(frontier);
    for(const idx of frontier){
      nextFront.delete(idx);
      const r=Math.floor(idx/n),c=idx%n,dirs=[[1,0],[-1,0],[0,1],[0,-1]];
      const added=cells.concat(idx);
      const nf=new Set(nextFront);
      for(const [dr,dc] of dirs){const rr=r+dr,cc=c+dc;if(rr<0||cc<0||rr>=n||cc>=n)continue;const j=rr*n+cc;if(!current.has(j)&&!added.includes(j))nf.add(j);}
      expand(added,[...nf]);
    }
  }
  for(let start=0;start<n*n;start++)expand([],[start]);
  return out;
}
const subsetCache=new Map();
function subsetsFor(n,k){const key=`${n}:${k}`;if(!subsetCache.has(key))subsetCache.set(key,connectedSubsets(n,k));return subsetCache.get(key);}
function regionExactCount(puzzle,limit=2,stats={}){
  const n=puzzle.length,N=n*n,max=Math.max(6,...puzzle.flat());
  const candidates=[];
  for(let value=1;value<=max;value++){
    for(const cells of subsetsFor(n,value)){
      let ok=true,hasGiven=false;
      for(const idx of cells){const r=Math.floor(idx/n),c=idx%n,v=puzzle[r][c];if(v&&v!==value){ok=false;break;}if(v===value)hasGiven=true;}
      if(!ok)continue;
      // A given of this value outside the region cannot be orthogonally adjacent to it,
      // otherwise it would belong to the same connected component.
      const set=new Set(cells);
      for(const idx of cells){const r=Math.floor(idx/n),c=idx%n;for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const rr=r+dr,cc=c+dc;if(rr<0||cc<0||rr>=n||cc>=n)continue;const j=rr*n+cc;if(set.has(j))continue;if(puzzle[rr][cc]===value){ok=false;break;}}if(!ok)break;}
      if(ok)candidates.push({value,cells,mask:new Set(cells),hasGiven});
    }
  }
  const byCell=Array.from({length:N},()=>[]);
  candidates.forEach((cand,i)=>cand.cells.forEach(idx=>byCell[idx].push(i)));
  let found=0,nodes=0,branches=0;
  const covered=new Uint8Array(N),chosen=[];
  function compatible(ci){const cand=candidates[ci];for(const idx of cand.cells)if(covered[idx])return false;for(const cj of chosen){const other=candidates[cj];if(other.value!==cand.value)continue;for(const idx of cand.cells){const r=Math.floor(idx/n),c=idx%n;for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){const rr=r+dr,cc=c+dc;if(rr<0||cc<0||rr>=n||cc>=n)continue;if(other.mask.has(rr*n+cc))return false;}}}return true;}
  function visit(){
    if(found>=limit)return;nodes++;
    let best=-1,opts=null;
    for(let idx=0;idx<N;idx++)if(!covered[idx]){
      const list=[];for(const ci of byCell[idx])if(compatible(ci))list.push(ci);
      if(!list.length)return;
      if(opts===null||list.length<opts.length){best=idx;opts=list;if(opts.length===1)break;}
    }
    if(best<0){found++;return;}
    if(opts.length>1)branches++;
    for(const ci of opts){const cand=candidates[ci];for(const idx of cand.cells)covered[idx]=1;chosen.push(ci);visit();chosen.pop();for(const idx of cand.cells)covered[idx]=0;if(found>=limit)return;}
  }
  visit();stats.candidates=candidates.length;stats.nodes=nodes;stats.branches=branches;stats.solutions=found;return found;
}

const tm=performance.now(),out=generator.make(variant,seed,difficulty),makeMs=performance.now()-tm;
let puzzle=clone(out.puzzle),sourceClues=countClues(puzzle);
const order=[];for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(puzzle[r][c])order.push(r*size+c);
shuffle(order,rng((seed^0xF17A0C5E)>>>0));
let accepted=0,rejected=0,totalMs=0,worstMs=0,worst='n/a';
for(const idx of order){const r=Math.floor(idx/size),c=idx%size;if(!puzzle[r][c])continue;const saved=puzzle[r][c];puzzle[r][c]=0;const t=performance.now(),count=regionExactCount(puzzle,2,{}),ms=performance.now()-t;totalMs+=ms;if(ms>worstMs){worstMs=ms;worst=`${r},${c},value=${saved},count=${count}`;}if(count===1)accepted++;else{puzzle[r][c]=saved;rejected++;}}
const finalClues=countClues(puzzle),finalStats={};const tf=performance.now(),finalCount=regionExactCount(puzzle,2,finalStats),finalMs=performance.now()-tf;
let removable=0,closureMs=0,closureWorstMs=0,closureWorst='n/a';
for(let r=0;r<size;r++)for(let c=0;c<size;c++)if(puzzle[r][c]){const cand=clone(puzzle),saved=cand[r][c];cand[r][c]=0;const t=performance.now(),count=regionExactCount(cand,2,{}),ms=performance.now()-t;closureMs+=ms;if(ms>closureWorstMs){closureWorstMs=ms;closureWorst=`${r},${c},value=${saved},count=${count}`;}if(count===1)removable++;}
console.log(`FILLOMINO_REGION_CARVE seed=${seed} size=${size}x${size} makeMs=${makeMs.toFixed(1)} sourceClues=${sourceClues} finalClues=${finalClues} accepted=${accepted} rejected=${rejected}`);
console.log(`FILLOMINO_REGION_CARVE_RUNTIME totalMs=${totalMs.toFixed(1)} worstMs=${worstMs.toFixed(1)} worst=${worst} finalMs=${finalMs.toFixed(1)}`);
console.log(`FILLOMINO_REGION_CLOSURE checks=${finalClues} removable=${removable} locallyIrreducible=${removable===0} totalMs=${closureMs.toFixed(1)} worstMs=${closureWorstMs.toFixed(1)} worst=${closureWorst}`);
console.log(`FILLOMINO_REGION_EXACT finalCount=${finalCount} candidates=${finalStats.candidates} nodes=${finalStats.nodes} branches=${finalStats.branches}`);
console.log(`FILLOMINO_REGION_FINAL ${puzzle.map((row,r)=>row.map((v,c)=>v?`${r},${c}=${v}`:null).filter(Boolean).join(' ')).filter(Boolean).join(' | ')}`);
if(finalCount===1&&removable===0)console.log('FILLOMINO_REGION_CARVE:PASS_LOCAL_IRREDUCIBLE');else{console.log('FILLOMINO_REGION_CARVE:FAIL');process.exitCode=1;}
