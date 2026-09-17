import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=Number(process.argv[2]||93000);
const difficulty='expert';

function load(ref){const f=path.join(root,ref);(0,eval)(`${fs.readFileSync(f,'utf8')}\n//# sourceURL=${ref}`);}
function cloneGrid(grid){return grid.map(row=>row.slice());}
function mulberry32(seedValue){let x=seedValue>>>0;return function(){x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(list,random){for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));const t=list[i];list[i]=list[j];list[j]=t;}return list;}
function pct(xs,p){if(!xs.length)return null;const a=xs.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(p*a.length)-1)];}
function round(x){return x==null?null:+x.toFixed(3);}
function givens(grid){return grid.flat().filter(Boolean).length;}
function emit(prefix,obj){console.log(prefix+' '+JSON.stringify(obj));}

const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1].split('?')[0]);
const sizeRef='games/p3-size-control.js';
const sizeIndex=refs.indexOf(sizeRef);
if(sizeIndex<0)throw new Error('p3-size-control runtime missing');
const runtimeRefs=refs.slice(0,sizeIndex).filter(ref=>ref.startsWith('games/'));

globalThis.window=globalThis;
globalThis.performance=performance;
globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of runtimeRefs)load(ref);

const G=globalThis.SudokuGenerator,B=globalThis.SudokuBank;
if(!G||!Array.isArray(B)||typeof G.make!=='function')throw new Error('Sudoku runtime missing');
const variant=B.find(v=>v.id==='sudoku-16x16');
if(!variant)throw new Error('sudoku-16x16 variant missing');

const baseStart=performance.now();
const base=G.make(variant,seed,difficulty);
const baseMs=performance.now()-baseStart;
if(!base||!Array.isArray(base.puzzle)||base.puzzle.length!==16)throw new Error('16x16 base generation failed');
const initial=cloneGrid(base.puzzle);
const initialGivens=givens(initial);

load(sizeRef);
if(typeof G.countLargeClassicSolutionsExact!=='function')throw new Error('16x16 exact-cover counter missing');
const exact=G.countLargeClassicSolutionsExact;

const grid=cloneGrid(initial),n=16,order=[];
for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(grid[r][c])order.push(r*n+c);
shuffle(order,mulberry32(((seed>>>0)^0x16E4A7C5)>>>0));

const calls=[];
let accepted=0,rejected=0;
const passStart=performance.now();
for(let i=0;i<order.length;i++){
  const idx=order[i],r=Math.floor(idx/n),c=idx%n,old=grid[r][c];
  if(!old)continue;
  grid[r][c]=0;
  const stats={};
  const t0=performance.now();
  const count=exact(grid,2,stats);
  const ms=performance.now()-t0;
  const keep=count===1;
  calls.push({index:i,cell:[r,c],givens:givens(grid),ms,count,nodes:stats.nodes||0,branches:stats.branches||0,deadEnds:stats.deadEnds||0,openCells:stats.openCells||0,accepted:keep});
  if(keep)accepted++;
  else{grid[r][c]=old;rejected++;}
}
const localPassMs=performance.now()-passStart;

const finalStats={};
const finalStart=performance.now();
const finalCount=exact(grid,2,finalStats);
const finalVerificationMs=performance.now()-finalStart;
const times=calls.map(x=>x.ms);
const ranked=calls.slice().sort((a,b)=>b.ms-a.ms).slice(0,10);
const nodeRanked=calls.slice().sort((a,b)=>b.nodes-a.nodes).slice(0,10);

emit('SUDOKU16_PHASE_PROFILE',{
  seed,difficulty,
  base:{generationMs:round(baseMs),givens:initialGivens,unique:base.generation&&base.generation.unique},
  localIrreducibility:{
    passMs:round(localPassMs),calls:calls.length,exactTotalMs:round(times.reduce((s,x)=>s+x,0)),
    p50Ms:round(pct(times,.5)),p95Ms:round(pct(times,.95)),worstMs:round(times.length?Math.max(...times):0),
    accepted,rejected,finalGivens:givens(grid),finalVerificationMs:round(finalVerificationMs),finalCount,
    finalStats
  },
  worstCalls:ranked.map(x=>({...x,ms:round(x.ms)})),
  highestNodeCalls:nodeRanked.map(x=>({...x,ms:round(x.ms)}))
});

if(finalCount!==1)throw new Error('16x16 final puzzle is not unique');
console.log('SUDOKU16_HOTSPOT_PHASE_PROFILE:PASS');
