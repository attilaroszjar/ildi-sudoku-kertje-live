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

const givens=countGivens(generated.puzzle);
const total=generated.puzzle.length*generated.puzzle.length;
const baselineStart=performance.now();
const baseline=countSamuraiContract(generated.puzzle,2);
const baselineMs=performance.now()-baselineStart;

console.log(`SAMURAI_EXPERT_FRONTIER seed=${seed} difficulty=${difficulty} hostRealm=true`);
console.log(`START givens=${givens}/${total} density=${(givens/total).toFixed(3)} generationMs=${round1(generationMs).toFixed(1)}`);
console.log(`COMPONENT_OFFSETS ${offsets.map(off=>off.join(',')).join('|')}`);
console.log(`BASELINE solutions=${baseline.solutions} components=${baseline.componentCounts.join(',')} runtimeMs=${round1(baselineMs).toFixed(1)} counter=component-solver-verified`);
console.log(`GENERATOR_METADATA ${JSON.stringify(generated.generation||{})}`);

const checks=[];
for(let r=0;r<generated.puzzle.length;r++){
  for(let c=0;c<generated.puzzle[r].length;c++){
    const value=generated.puzzle[r][c];
    if(!value)continue;
    const candidate=cloneGrid(generated.puzzle);
    candidate[r][c]=0;
    const t0=performance.now();
    const result=countSamuraiContract(candidate,2);
    const elapsedMs=performance.now()-t0;
    checks.push({row:r+1,col:c+1,value,solutions:result.solutions,componentCounts:result.componentCounts,removable:result.solutions===1,elapsedMs});
  }
}

const removable=checks.filter(check=>check.removable);
const rejected=checks.filter(check=>!check.removable);
const slowest=checks.slice().sort((a,b)=>b.elapsedMs-a.elapsedMs).slice(0,15);
for(const check of checks){
  console.log(`FRONTIER_CHECK r${check.row}c${check.col} value=${check.value} solutions=${check.solutions} components=${check.componentCounts.join(',')} removable=${check.removable} runtimeMs=${round1(check.elapsedMs).toFixed(1)}`);
}
for(const check of slowest){
  console.log(`SLOWEST_CHECK r${check.row}c${check.col} removable=${check.removable} runtimeMs=${round1(check.elapsedMs).toFixed(1)}`);
}
console.log(`FRONTIER_SUMMARY startingGivens=${givens} removable=${removable.length} rejected=${rejected.length} locallyIrreducible=${baseline.solutions===1&&removable.length===0} slowestMs=${round1(slowest[0]?.elapsedMs||0).toFixed(1)}`);

const failures=[];
if(baseline.solutions!==1)failures.push(`baseline contract result is ${baseline.solutions}, expected 1 (${baseline.componentCounts.join(',')})`);
if(baseline.componentCounts.some(count=>count!==1))failures.push(`baseline components are ${baseline.componentCounts.join(',')}, expected 1,1,1,1,1`);
if(givens!==110)failures.push(`production givens are ${givens}, expected canonical 110`);
if(generated.generation?.unique!==true)failures.push('generation.unique is not true');
if(generated.generation?.seed!==seed)failures.push(`generation.seed is ${generated.generation?.seed}, expected ${seed}`);
if(generated.generation?.verification!=='component-solver-verified-local-irreducible')failures.push(`generation.verification is ${generated.generation?.verification}, expected component-solver-verified-local-irreducible`);
if(generated.generation?.generatorFamily!=='five-overlapping-unique-sudokus-expert-local-irreducible')failures.push(`generation.generatorFamily is ${generated.generation?.generatorFamily}, expected five-overlapping-unique-sudokus-expert-local-irreducible`);
if(generated.generation?.policy!=='contract-driven-local-irreducibility')failures.push(`generation.policy is ${generated.generation?.policy}, expected contract-driven-local-irreducibility`);
if(generated.generation?.localIrreducibilityProof!=='monotone-nonuniqueness-from-single-pass')failures.push(`generation.localIrreducibilityProof is ${generated.generation?.localIrreducibilityProof}, expected monotone-nonuniqueness-from-single-pass`);
if(generated.generation?.locallyIrreducibleUnderProductionContract!==true)failures.push('generation.locallyIrreducibleUnderProductionContract is not true');
if(generated.generation?.acceptedRemovals!==22)failures.push(`generation.acceptedRemovals is ${generated.generation?.acceptedRemovals}, expected 22`);
if(generated.generation?.rejectedRemovals!==110)failures.push(`generation.rejectedRemovals is ${generated.generation?.rejectedRemovals}, expected 110`);
if(removable.length!==0)failures.push(`${removable.length} clues remain removable under the Samurai production contract`);

if(failures.length){
  for(const failure of failures)console.error(`SAMURAI_EXPERT_FRONTIER_FAILURE ${failure}`);
  console.log('SAMURAI_EXPERT_FRONTIER:FAIL');
  process.exitCode=1;
}else{
  console.log('SAMURAI_EXPERT_FRONTIER:PASS');
}
