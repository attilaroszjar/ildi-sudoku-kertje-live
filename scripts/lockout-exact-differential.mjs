import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=92001;
const difficulty='expert';
const targetHardening='games/line-generator-proven-siblings-hardening.js';

function cloneGrid(grid){return grid.map(row=>row.slice());}
function round1(value){return Math.round(value*10)/10;}

const indexHtml=fs.readFileSync(path.join(root,'index.html'),'utf8');
const allRefs=[...indexHtml.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match=>match[1]);
const firstGenerator=allRefs.indexOf('games/sudoku-generator.js');
const lastGenerator=allRefs.indexOf('games/miracle-generator-hardening.js');
if(firstGenerator<0||lastGenerator<firstGenerator)throw new Error('production Sudoku generator script range not found');
const bankRefs=allRefs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const generatorRefs=allRefs.slice(firstGenerator,lastGenerator+1);
const refs=[...bankRefs,...generatorRefs.filter(ref=>!bankRefs.includes(ref))];
if(!refs.includes(targetHardening))throw new Error('Lockout proven-siblings hardening is not in production script order');

globalThis.window=globalThis;
globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
let referenceCount=null;
for(const ref of refs){
  if(ref===targetHardening){
    if(!globalThis.SudokuGenerator)throw new Error('SudokuGenerator missing before Lockout hardening');
    referenceCount=globalThis.SudokuGenerator.countVariantSolutions.bind(globalThis.SudokuGenerator);
  }
  await import(pathToFileURL(path.join(root,ref)).href);
}
if(!referenceCount)throw new Error('failed to capture pre-Lockout generic exact counter');

const generator=globalThis.SudokuGenerator;
const bankVariant=globalThis.SudokuBank.find(entry=>entry&&entry.id==='lockout');
if(!bankVariant)throw new Error('production SudokuBank does not contain lockout');

const generationStart=performance.now();
const generated=generator.make(bankVariant,seed,difficulty);
const generationMs=performance.now()-generationStart;
if(!generated||!Array.isArray(generated.puzzle))throw new Error('Lockout production generator returned no puzzle');

const cases=[{id:'baseline',grid:cloneGrid(generated.puzzle)}];
for(let r=0;r<generated.puzzle.length;r++){
  for(let c=0;c<generated.puzzle[r].length;c++){
    if(!generated.puzzle[r][c])continue;
    const grid=cloneGrid(generated.puzzle);
    grid[r][c]=0;
    cases.push({id:`r${r+1}c${c+1}`,grid});
  }
}

let mismatches=0;
let specializedTotal=0;
let referenceTotal=0;
let specializedMax=0;
let referenceMax=0;
let maxNodes=0;
console.log(`LOCKOUT_EXACT_DIFFERENTIAL seed=${seed} difficulty=${difficulty} cases=${cases.length} hostRealm=true`);
console.log(`GENERATION runtimeMs=${round1(generationMs).toFixed(1)} givens=${cases.length-1} verification=${generated.generation&&generated.generation.verification}`);
for(const item of cases){
  const stats={};
  const specializedStart=performance.now();
  const specialized=generator.countVariantSolutions(item.grid,generated,2,stats);
  const specializedMs=performance.now()-specializedStart;
  const referenceStart=performance.now();
  const reference=referenceCount(item.grid,generated,2);
  const referenceMs=performance.now()-referenceStart;
  specializedTotal+=specializedMs;
  referenceTotal+=referenceMs;
  specializedMax=Math.max(specializedMax,specializedMs);
  referenceMax=Math.max(referenceMax,referenceMs);
  maxNodes=Math.max(maxNodes,stats.nodes||0);
  const same=specialized===reference;
  if(!same)mismatches++;
  console.log(`DIFF_CASE ${item.id} specialized=${specialized} reference=${reference} same=${same} specializedMs=${round1(specializedMs).toFixed(1)} referenceMs=${round1(referenceMs).toFixed(1)} nodes=${stats.nodes||0} branches=${stats.branches||0} deadEnds=${stats.deadEnds||0} propagated=${stats.propagated||0}`);
}

const speedup=specializedTotal>0?referenceTotal/specializedTotal:Infinity;
console.log(`DIFF_SUMMARY cases=${cases.length} mismatches=${mismatches} specializedTotalMs=${round1(specializedTotal).toFixed(1)} referenceTotalMs=${round1(referenceTotal).toFixed(1)} speedup=${Number.isFinite(speedup)?speedup.toFixed(2):'inf'} specializedMaxMs=${round1(specializedMax).toFixed(1)} referenceMaxMs=${round1(referenceMax).toFixed(1)} maxNodes=${maxNodes}`);
if(mismatches){
  console.log('LOCKOUT_EXACT_DIFFERENTIAL:FAIL');
  process.exitCode=1;
}else{
  console.log('LOCKOUT_EXACT_DIFFERENTIAL:PASS');
}
