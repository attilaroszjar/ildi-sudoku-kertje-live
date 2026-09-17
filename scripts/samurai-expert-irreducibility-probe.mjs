import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=92001;
const difficulty='expert';
const FALLBACK_OFFSETS=[[0,0],[0,12],[6,6],[12,0],[12,12]];

function cloneGrid(grid){return grid.map(row=>row.slice());}
function countGivens(grid){return grid.reduce((sum,row)=>sum+row.filter(Boolean).length,0);}
function round1(value){return Math.round(value*10)/10;}
function mulberry32(value){let x=value>>>0;return()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffle(list,random){for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}
function extractComponent(grid,[r0,c0]){
  return Array.from({length:9},(_,r)=>Array.from({length:9},(_,c)=>Number(grid[r0+r]?.[c0+c])||0));
}
function normalizeOffset(off){
  if(Array.isArray(off)&&off.length===2)return [Number(off[0]),Number(off[1])];
  if(off&&Number.isFinite(Number(off.r))&&Number.isFinite(Number(off.c)))return [Number(off.r),Number(off.c)];
  return null;
}
function resolveOffsets(generated,variant){
  for(const grids of [generated?.data?.grids,variant?.data?.grids]){
    if(!Array.isArray(grids)||grids.length!==5)continue;
    const offsets=grids.map(grid=>normalizeOffset(grid?.off));
    if(offsets.every(off=>off&&off.every(Number.isFinite)))return offsets;
  }
  return FALLBACK_OFFSETS.map(off=>off.slice());
}

const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match=>match[1]).filter(ref=>ref.startsWith('games/'));
const bankRefs=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const firstGenerator=refs.indexOf('games/sudoku-generator.js');
const lastGenerator=refs.indexOf('games/p3-size-control.js');
if(firstGenerator<0||lastGenerator<firstGenerator)throw new Error('production Sudoku runtime range not found');
const generatorRefs=refs.slice(firstGenerator,lastGenerator+1);
const loadRefs=[...bankRefs,...generatorRefs.filter(ref=>!bankRefs.includes(ref))];

globalThis.window=globalThis;
globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of loadRefs)await import(pathToFileURL(path.join(root,ref)).href);

if(!globalThis.SudokuGenerator||!Array.isArray(globalThis.SudokuBank))throw new Error('production Sudoku runtime failed to load');
const variant=globalThis.SudokuBank.find(entry=>entry&&entry.id==='samurai');
if(!variant)throw new Error('samurai not found in production SudokuBank');

const generationStart=performance.now();
const generated=globalThis.SudokuGenerator.make(variant,seed,difficulty);
const generationMs=performance.now()-generationStart;
if(!generated||!Array.isArray(generated.puzzle))throw new Error('Samurai production generator returned no puzzle');

const offsets=resolveOffsets(generated,variant);
function countSamuraiContract(grid,limit=2){
  const componentCounts=offsets.map(off=>globalThis.SudokuGenerator.countSolutions(extractComponent(grid,off),limit));
  const solutions=componentCounts.some(count=>count===0)?0:(componentCounts.every(count=>count===1)?1:2);
  return {solutions,componentCounts};
}

const startGrid=cloneGrid(generated.puzzle);
const startGivens=countGivens(startGrid);
const baseline=countSamuraiContract(startGrid,2);
const working=cloneGrid(startGrid);
const random=mulberry32((seed^0x5A4D5552)>>>0);
const order=[];
for(let r=0;r<working.length;r++)for(let c=0;c<working[r].length;c++)if(working[r][c])order.push([r,c]);
shuffle(order,random);

console.log(`SAMURAI_EXPERT_IRREDUCIBILITY seed=${seed} difficulty=${difficulty} hostRealm=true`);
console.log(`START givens=${startGivens} generationMs=${round1(generationMs).toFixed(1)} baseline=${baseline.solutions} components=${baseline.componentCounts.join(',')}`);
console.log(`COMPONENT_OFFSETS ${offsets.map(off=>off.join(',')).join('|')}`);

const carveStart=performance.now();
const accepted=[];
const rejected=[];
let slowestMs=0;
for(const [r,c] of order){
  const value=working[r][c];
  if(!value)continue;
  working[r][c]=0;
  const t0=performance.now();
  const result=countSamuraiContract(working,2);
  const elapsedMs=performance.now()-t0;
  slowestMs=Math.max(slowestMs,elapsedMs);
  if(result.solutions===1){
    accepted.push({row:r+1,col:c+1,value,componentCounts:result.componentCounts,elapsedMs});
    console.log(`CARVE_ACCEPT r${r+1}c${c+1} value=${value} givens=${countGivens(working)} components=${result.componentCounts.join(',')} runtimeMs=${round1(elapsedMs).toFixed(1)}`);
  }else{
    working[r][c]=value;
    rejected.push({row:r+1,col:c+1,value,componentCounts:result.componentCounts,elapsedMs});
  }
}
const carveMs=performance.now()-carveStart;

const finalContract=countSamuraiContract(working,2);
const finalGivens=countGivens(working);
const closureChecks=[];
for(let r=0;r<working.length;r++){
  for(let c=0;c<working[r].length;c++){
    const value=working[r][c];
    if(!value)continue;
    working[r][c]=0;
    const result=countSamuraiContract(working,2);
    working[r][c]=value;
    closureChecks.push({row:r+1,col:c+1,value,solutions:result.solutions,componentCounts:result.componentCounts});
  }
}
const removableAfterClosure=closureChecks.filter(check=>check.solutions===1);
console.log(`CLOSURE_SUMMARY startingGivens=${startGivens} removed=${accepted.length} finalGivens=${finalGivens} rejected=${rejected.length} finalSolutions=${finalContract.solutions} finalComponents=${finalContract.componentCounts.join(',')} removableAfterClosure=${removableAfterClosure.length} locallyIrreducible=${finalContract.solutions===1&&removableAfterClosure.length===0} carveMs=${round1(carveMs).toFixed(1)} slowestMs=${round1(slowestMs).toFixed(1)}`);
if(removableAfterClosure.length){
  for(const check of removableAfterClosure)console.log(`CLOSURE_LEAK r${check.row}c${check.col} value=${check.value} components=${check.componentCounts.join(',')}`);
}

const failures=[];
if(baseline.solutions!==1)failures.push(`baseline contract result is ${baseline.solutions}, expected 1`);
if(finalContract.solutions!==1)failures.push(`final contract result is ${finalContract.solutions}, expected 1`);
if(removableAfterClosure.length!==0)failures.push(`${removableAfterClosure.length} clues remain removable after closure`);
if(generated.generation?.unique!==true)failures.push('generation.unique is not true');
if(generated.generation?.verification!=='component-solver-verified')failures.push(`generation.verification is ${generated.generation?.verification}, expected component-solver-verified`);

if(failures.length){
  for(const failure of failures)console.error(`SAMURAI_EXPERT_IRREDUCIBILITY_FAILURE ${failure}`);
  console.log('SAMURAI_EXPERT_IRREDUCIBILITY:FAIL');
  process.exitCode=1;
}else{
  console.log('SAMURAI_EXPERT_IRREDUCIBILITY:PASS');
}
