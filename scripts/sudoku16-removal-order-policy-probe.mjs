import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=Number(process.argv[2]||93000);
function load(ref){const f=path.join(root,ref);(0,eval)(`${fs.readFileSync(f,'utf8')}\n//# sourceURL=${ref}`);}
function cloneGrid(grid){return grid.map(row=>row.slice());}
function mulberry32(seedValue){let x=seedValue>>>0;return function(){x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(list,random){for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));const t=list[i];list[i]=list[j];list[j]=t;}return list;}
function countGivens(grid){return grid.flat().filter(Boolean).length;}
function rounded(x){return +x.toFixed(3);}
function emit(prefix,obj){console.log(prefix+' '+JSON.stringify(obj));}

const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1].split('?')[0]);
const banks=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
globalThis.window=globalThis;globalThis.performance=performance;globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of banks)load(ref);
load('games/sudoku-generator.js');
const G=globalThis.SudokuGenerator,B=globalThis.SudokuBank;
const variant=B.find(v=>v.id==='sudoku-16x16');
if(!G||!variant)throw new Error('16x16 runtime missing');
const base=G.make(variant,seed,'expert');
if(!base||!Array.isArray(base.puzzle))throw new Error('base generation failed');
load('games/p3-size-control.js');
if(typeof G.countLargeClassicSolutionsExact!=='function')throw new Error('production 16x16 DLX missing');
const initial=cloneGrid(base.puzzle),n=16;
const givens=[];for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(initial[r][c])givens.push(r*n+c);

function seededOrder(){return shuffle(givens.slice(),mulberry32(((seed>>>0)^0x16E4A7C5)>>>0));}
function rowMajor(){return givens.slice();}
function reverseRowMajor(){return givens.slice().reverse();}
function boxInterleaved(){
  const groups=Array.from({length:16},()=>[]);
  for(const idx of givens){const r=Math.floor(idx/n),c=idx%n,b=((r>>2)<<2)+(c>>2);groups[b].push(idx);}
  const out=[];let pos=0,remaining=true;
  while(remaining){remaining=false;for(let b=0;b<16;b++){if(pos<groups[b].length){out.push(groups[b][pos]);remaining=true;}}pos++;}
  return out;
}

function carve(name,order){
  const grid=cloneGrid(initial);let accepted=0,rejected=0;const calls=[];
  const t0=performance.now();
  for(let i=0;i<order.length;i++){
    const idx=order[i],r=Math.floor(idx/n),c=idx%n,old=grid[r][c];if(!old)continue;
    grid[r][c]=0;
    const stats={},c0=performance.now(),count=G.countLargeClassicSolutionsExact(grid,2,stats),ms=performance.now()-c0;
    const keep=count===1;
    calls.push({index:i,cell:[r,c],givens:countGivens(grid),ms,count,nodes:stats.nodes||0,branches:stats.branches||0,deadEnds:stats.deadEnds||0,accepted:keep});
    if(keep)accepted++;else{grid[r][c]=old;rejected++;}
  }
  const finalStats={},v0=performance.now(),unique=G.countLargeClassicSolutionsExact(grid,2,finalStats)===1,verificationMs=performance.now()-v0;
  return {name,grid,accepted,rejected,unique,verificationMs,finalStats,ms:performance.now()-t0,calls};
}

const policies=[
  carve('seeded-shuffle',seededOrder()),
  carve('row-major',rowMajor()),
  carve('reverse-row-major',reverseRowMajor()),
  carve('box-interleaved',boxInterleaved())
];

const summaries=policies.map(p=>({
  name:p.name,
  ms:rounded(p.ms),
  finalGivens:countGivens(p.grid),
  accepted:p.accepted,
  rejected:p.rejected,
  unique:p.unique,
  verificationMs:rounded(p.verificationMs),
  finalStats:p.finalStats,
  worstCall:p.calls.slice().sort((a,b)=>b.ms-a.ms).slice(0,1).map(x=>({...x,ms:rounded(x.ms)}))[0]||null
}));
const best=summaries.slice().sort((a,b)=>a.ms-b.ms)[0];
emit('SUDOKU16_REMOVAL_ORDER_POLICY',{
  seed,
  initialGivens:countGivens(initial),
  policies:summaries,
  best:best.name,
  baseline:summaries[0].name,
  speedupVsSeeded:rounded(summaries[0].ms/best.ms),
  allUnique:summaries.every(x=>x.unique===true)
});
if(!summaries.every(x=>x.unique===true))throw new Error('removal-order policy lost uniqueness');
console.log('SUDOKU16_REMOVAL_ORDER_POLICY:PASS');
