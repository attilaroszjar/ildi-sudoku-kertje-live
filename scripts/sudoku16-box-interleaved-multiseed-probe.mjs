import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seeds=[93000,93001,93002,93003,93004];
function load(ref){const f=path.join(root,ref);(0,eval)(`${fs.readFileSync(f,'utf8')}\n//# sourceURL=${ref}`);}
function cloneGrid(grid){return grid.map(row=>row.slice());}
function countGivens(grid){return grid.flat().filter(Boolean).length;}
function rounded(x){return +x.toFixed(3);}
function percentile(xs,p){const a=xs.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(p*a.length)-1)];}

const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1].split('?')[0]);
const banks=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
globalThis.window=globalThis;globalThis.performance=performance;globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of banks)load(ref);
load('games/sudoku-generator.js');
const G=globalThis.SudokuGenerator,B=globalThis.SudokuBank;
const variant=B.find(v=>v.id==='sudoku-16x16');
if(!G||!variant)throw new Error('16x16 runtime missing');
load('games/p3-size-control.js');
if(typeof G.countLargeClassicSolutionsExact!=='function')throw new Error('production 16x16 DLX missing');

function boxInterleavedOrder(grid){
  const n=16,groups=Array.from({length:16},()=>[]);
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(grid[r][c])groups[((r>>2)<<2)+(c>>2)].push(r*n+c);
  const out=[];let pos=0,remaining=true;
  while(remaining){remaining=false;for(let b=0;b<16;b++){if(pos<groups[b].length){out.push(groups[b][pos]);remaining=true;}}pos++;}
  return out;
}
function carve(initial){
  const grid=cloneGrid(initial),order=boxInterleavedOrder(initial),calls=[];
  let accepted=0,rejected=0;
  const t0=performance.now();
  for(let i=0;i<order.length;i++){
    const idx=order[i],r=Math.floor(idx/16),c=idx%16,old=grid[r][c];if(!old)continue;
    grid[r][c]=0;
    const stats={},c0=performance.now(),count=G.countLargeClassicSolutionsExact(grid,2,stats),ms=performance.now()-c0;
    const keep=count===1;
    calls.push({index:i,cell:[r,c],givens:countGivens(grid),ms,count,nodes:stats.nodes||0,branches:stats.branches||0,deadEnds:stats.deadEnds||0,accepted:keep});
    if(keep)accepted++;else{grid[r][c]=old;rejected++;}
  }
  const finalStats={},v0=performance.now(),unique=G.countLargeClassicSolutionsExact(grid,2,finalStats)===1,verificationMs=performance.now()-v0;
  return {grid,accepted,rejected,unique,verificationMs,finalStats,ms:performance.now()-t0,calls};
}

const samples=[];
for(const seed of seeds){
  // Load only the raw generator path for the initial 16x16 puzzle. p3-size-control's
  // wrapper would otherwise perform the seeded-shuffle local pass we are replacing.
  const savedMake=G.make;
  // Recover the base function by rebuilding a fresh realm-like runtime once per seed
  // is unnecessary here: p3 wrapper caches no 16x16 result, so build the known base
  // from the variant solution using the same raw generator in a tiny isolated eval.
  // Instead use the production base puzzle captured by temporarily reading a fresh
  // copy of sudoku-generator.js into a local object realm.
  const sandbox={window:null,globalThis:null,performance,localStorage:globalThis.localStorage};sandbox.window=sandbox;sandbox.globalThis=sandbox;
  for(const ref of banks){const code=fs.readFileSync(path.join(root,ref),'utf8');Function('root',`with(root){${code}}`)(sandbox);}
  const generatorCode=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');Function('root',`with(root){${generatorCode}}`)(sandbox);
  const v=sandbox.SudokuBank.find(x=>x.id==='sudoku-16x16');
  const base=sandbox.SudokuGenerator.make(v,seed,'expert');
  if(!base||!Array.isArray(base.puzzle))throw new Error('base generation failed for seed '+seed);
  const out=carve(base.puzzle);
  const worst=out.calls.slice().sort((a,b)=>b.ms-a.ms)[0]||null;
  const sample={seed,generationMs:rounded(out.ms),finalGivens:countGivens(out.grid),accepted:out.accepted,rejected:out.rejected,unique:out.unique,verificationMs:rounded(out.verificationMs),finalStats:out.finalStats,worstCall:worst?{...worst,ms:rounded(worst.ms)}:null};
  samples.push(sample);
  console.log('SUDOKU16_BOX_INTERLEAVED_SAMPLE '+JSON.stringify(sample));
}
const times=samples.map(x=>x.generationMs);
const summary={seeds,count:samples.length,minMs:rounded(Math.min(...times)),medianMs:rounded(percentile(times,.5)),p95Ms:rounded(percentile(times,.95)),maxMs:rounded(Math.max(...times)),maxSeed:samples.slice().sort((a,b)=>b.generationMs-a.generationMs)[0].seed,givens:{min:Math.min(...samples.map(x=>x.finalGivens)),max:Math.max(...samples.map(x=>x.finalGivens))},allUnique:samples.every(x=>x.unique)};
console.log('SUDOKU16_BOX_INTERLEAVED_MULTI_SEED '+JSON.stringify(summary));
if(!summary.allUnique)throw new Error('box-interleaved lost uniqueness');
console.log('SUDOKU16_BOX_INTERLEAVED_MULTI_SEED:PASS');
