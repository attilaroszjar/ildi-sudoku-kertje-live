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

const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const allRefs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match=>match[1]);
const bankRefs=allRefs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const firstGenerator=allRefs.indexOf('games/sudoku-generator.js');
const lastGenerator=allRefs.indexOf('games/p3-size-control.js');
if(firstGenerator<0||lastGenerator<firstGenerator)throw new Error('production Sudoku generator range not found');
const refs=[...bankRefs,...allRefs.slice(firstGenerator,lastGenerator+1).filter(ref=>ref.startsWith('games/')&&!bankRefs.includes(ref))];

globalThis.window=globalThis;
globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of refs)await import(pathToFileURL(path.join(root,ref)).href);

if(!globalThis.SudokuGenerator||!Array.isArray(globalThis.SudokuBank))throw new Error('production Sudoku runtime failed to load');
const variant=globalThis.SudokuBank.find(entry=>entry&&entry.id==='sudoku-12x12');
if(!variant)throw new Error('sudoku-12x12 not found in production SudokuBank');

const generationStart=performance.now();
const generated=globalThis.SudokuGenerator.make(variant,seed,difficulty);
const generationMs=performance.now()-generationStart;
if(!generated||!Array.isArray(generated.puzzle))throw new Error('12x12 production generator returned no puzzle');

const givens=countGivens(generated.puzzle);
const total=generated.puzzle.length*generated.puzzle.length;
const baselineStart=performance.now();
const baselineSolutions=globalThis.SudokuGenerator.countSolutions(generated.puzzle,2);
const baselineMs=performance.now()-baselineStart;

console.log(`SUDOKU12_EXPERT_FRONTIER seed=${seed} difficulty=${difficulty} hostRealm=true`);
console.log(`START givens=${givens}/${total} density=${(givens/total).toFixed(3)} generationMs=${round1(generationMs).toFixed(1)}`);
console.log(`BASELINE solutions=${baselineSolutions} runtimeMs=${round1(baselineMs).toFixed(1)}`);
console.log(`GENERATOR_METADATA ${JSON.stringify(generated.generation||{})}`);

const checks=[];
for(let r=0;r<generated.puzzle.length;r++){
  for(let c=0;c<generated.puzzle[r].length;c++){
    const value=generated.puzzle[r][c];
    if(!value)continue;
    const candidate=cloneGrid(generated.puzzle);
    candidate[r][c]=0;
    const t0=performance.now();
    const solutions=globalThis.SudokuGenerator.countSolutions(candidate,2);
    const elapsedMs=performance.now()-t0;
    checks.push({row:r+1,col:c+1,value,solutions,removable:solutions===1,elapsedMs});
  }
}

const removable=checks.filter(check=>check.removable);
const rejected=checks.filter(check=>!check.removable);
const slowest=checks.slice().sort((a,b)=>b.elapsedMs-a.elapsedMs).slice(0,12);
for(const check of checks){
  console.log(`FRONTIER_CHECK r${check.row}c${check.col} value=${check.value} solutions=${check.solutions} removable=${check.removable} runtimeMs=${round1(check.elapsedMs).toFixed(1)}`);
}
for(const check of slowest){
  console.log(`SLOWEST_CHECK r${check.row}c${check.col} removable=${check.removable} runtimeMs=${round1(check.elapsedMs).toFixed(1)}`);
}
console.log(`FRONTIER_SUMMARY startingGivens=${givens} removable=${removable.length} rejected=${rejected.length} locallyIrreducible=${baselineSolutions===1&&removable.length===0} slowestMs=${round1(slowest[0]?.elapsedMs||0).toFixed(1)}`);

const failures=[];
if(baselineSolutions!==1)failures.push(`baseline solution count is ${baselineSolutions}, expected 1`);
if(generated.generation?.unique!==true)failures.push('generation.unique is not true');
if(generated.generation?.seed!==seed)failures.push(`generation.seed is ${generated.generation?.seed}, expected ${seed}`);
if(generated.generation?.locallyIrreducibleUnderProductionContract!==true)failures.push('generation.locallyIrreducibleUnderProductionContract is not true');
if(generated.generation?.policy!=='contract-driven-local-irreducibility')failures.push(`generation.policy is ${generated.generation?.policy}, expected contract-driven-local-irreducibility`);
if(generated.generation?.verification!=='rotation-safe-solver-verified-local-irreducible')failures.push(`generation.verification is ${generated.generation?.verification}, expected rotation-safe-solver-verified-local-irreducible`);
if(removable.length!==0)failures.push(`${removable.length} remaining givens are individually removable`);

if(failures.length){
  for(const failure of failures)console.error(`SUDOKU12_EXPERT_FRONTIER_FAILURE ${failure}`);
  console.log('SUDOKU12_EXPERT_FRONTIER:FAIL');
  process.exitCode=1;
}else{
  console.log('SUDOKU12_EXPERT_FRONTIER:PASS');
}
