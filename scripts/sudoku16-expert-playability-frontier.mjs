import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=92001;
const difficulty='expert';

function cloneGrid(grid){return grid.map(row=>row.slice());}
function countGivens(grid){return grid.reduce((sum,row)=>sum+row.filter(Boolean).length,0);}
function round1(value){return Math.round(value*10)/10;}

async function loadRuntime(){
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const allRefs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match=>match[1]);
  const bankRefs=allRefs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
  const firstGenerator=allRefs.indexOf('games/sudoku-generator.js');
  const lastGenerator=allRefs.indexOf('games/p3-size-control.js');
  if(firstGenerator<0||lastGenerator<firstGenerator)throw new Error('production Sudoku generator script range not found');
  const generatorRefs=allRefs.slice(firstGenerator,lastGenerator+1).filter(ref=>ref.startsWith('games/'));
  const refs=[...bankRefs,...generatorRefs.filter(ref=>!bankRefs.includes(ref))];

  globalThis.window=globalThis;
  globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
  for(const ref of refs)await import(pathToFileURL(path.join(root,ref)).href);

  if(!globalThis.SudokuGenerator||!Array.isArray(globalThis.SudokuBank))throw new Error('production Sudoku runtime failed to load');
  const variant=globalThis.SudokuBank.find(entry=>entry&&entry.id==='sudoku-16x16');
  if(!variant)throw new Error('sudoku-16x16 not found in production SudokuBank');
  if(typeof globalThis.SudokuGenerator.countLargeClassicSolutionsExact!=='function')throw new Error('optimized 16x16 exact counter not installed');
  return {generator:globalThis.SudokuGenerator,variant};
}

const {generator,variant}=await loadRuntime();
const exact=generator.countLargeClassicSolutionsExact;
const generationStart=performance.now();
const generated=generator.make(variant,seed,difficulty);
const generationMs=performance.now()-generationStart;
if(!generated||!Array.isArray(generated.puzzle))throw new Error('16x16 production generator returned no puzzle');

const givens=countGivens(generated.puzzle);
const total=generated.puzzle.length*generated.puzzle.length;
const baselineStats={};
const baselineStart=performance.now();
const baselineSolutions=exact(generated.puzzle,2,baselineStats);
const baselineMs=performance.now()-baselineStart;

console.log(`SUDOKU16_EXPERT_FRONTIER seed=${seed} difficulty=${difficulty} hostRealm=true`);
console.log(`START givens=${givens}/${total} density=${(givens/total).toFixed(3)} generationMs=${round1(generationMs).toFixed(1)}`);
console.log(`BASELINE solutions=${baselineSolutions} runtimeMs=${round1(baselineMs).toFixed(1)} nodes=${baselineStats.nodes||0} branches=${baselineStats.branches||0} deadEnds=${baselineStats.deadEnds||0} propagated=${baselineStats.propagated||0}`);
console.log(`GENERATOR_METADATA ${JSON.stringify(generated.generation||{})}`);

const checks=[];
for(let r=0;r<generated.puzzle.length;r++){
  for(let c=0;c<generated.puzzle[r].length;c++){
    const value=generated.puzzle[r][c];
    if(!value)continue;
    const candidate=cloneGrid(generated.puzzle);
    candidate[r][c]=0;
    const stats={};
    const t0=performance.now();
    const solutions=exact(candidate,2,stats);
    const elapsedMs=performance.now()-t0;
    checks.push({row:r+1,col:c+1,value,solutions,removable:solutions===1,elapsedMs,stats});
  }
}

const removable=checks.filter(check=>check.removable);
const rejected=checks.filter(check=>!check.removable);
const slowest=checks.slice().sort((a,b)=>b.elapsedMs-a.elapsedMs).slice(0,15);
for(const check of checks){
  console.log(`FRONTIER_CHECK r${check.row}c${check.col} value=${check.value} solutions=${check.solutions} removable=${check.removable} runtimeMs=${round1(check.elapsedMs).toFixed(1)} nodes=${check.stats.nodes||0} branches=${check.stats.branches||0} deadEnds=${check.stats.deadEnds||0} propagated=${check.stats.propagated||0}`);
}
for(const check of slowest){
  console.log(`SLOWEST_CHECK r${check.row}c${check.col} removable=${check.removable} runtimeMs=${round1(check.elapsedMs).toFixed(1)} nodes=${check.stats.nodes||0} branches=${check.stats.branches||0} deadEnds=${check.stats.deadEnds||0} propagated=${check.stats.propagated||0}`);
}
console.log(`FRONTIER_SUMMARY startingGivens=${givens} removable=${removable.length} rejected=${rejected.length} locallyIrreducible=${baselineSolutions===1&&removable.length===0} slowestMs=${round1(slowest[0]?.elapsedMs||0).toFixed(1)}`);

const failures=[];
if(baselineSolutions!==1)failures.push(`baseline solution count is ${baselineSolutions}, expected 1`);
if(generated.generation&&generated.generation.unique!==true)failures.push('generation.unique is not true');
if(generated.generation&&generated.generation.seed!==seed)failures.push(`generation.seed is ${generated.generation.seed}, expected ${seed}`);
if(generated.generation?.locallyIrreducibleUnderProductionContract!==true)failures.push('generation.locallyIrreducibleUnderProductionContract is not true');
if(generated.generation?.policy!=='contract-driven-local-irreducibility')failures.push(`generation.policy is ${generated.generation?.policy}, expected contract-driven-local-irreducibility`);
if(generated.generation?.verification!=='classic16-dlx-precovered-exact-v2')failures.push(`generation.verification is ${generated.generation?.verification}, expected classic16-dlx-precovered-exact-v2`);
if(removable.length!==0)failures.push(`${removable.length} remaining givens are individually removable`);

if(failures.length){
  for(const failure of failures)console.error(`SUDOKU16_EXPERT_FRONTIER_FAILURE ${failure}`);
  console.log('SUDOKU16_EXPERT_FRONTIER:FAIL');
  process.exitCode=1;
}else{
  console.log('SUDOKU16_EXPERT_FRONTIER:PASS');
}
