import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const seed=92001;
const difficulty='expert';

function cloneGrid(grid){return grid.map(row=>row.slice());}
function round1(value){return Math.round(value*10)/10;}

const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const allRefs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match=>match[1]);
const bankRefs=allRefs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const firstGenerator=allRefs.indexOf('games/sudoku-generator.js');
const preP3End=allRefs.indexOf('games/miracle-generator-hardening.js');
if(firstGenerator<0||preP3End<firstGenerator)throw new Error('pre-P3 production generator range not found');

const preRefs=[...bankRefs,...allRefs.slice(firstGenerator,preP3End+1).filter(ref=>ref.startsWith('games/')&&!bankRefs.includes(ref))];
globalThis.window=globalThis;
globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
for(const ref of preRefs)await import(pathToFileURL(path.join(root,ref)).href);

const variant=globalThis.SudokuBank.find(entry=>entry&&entry.id==='sudoku-16x16');
if(!variant)throw new Error('sudoku-16x16 not found');
const referenceCount=globalThis.SudokuGenerator.countSolutions.bind(globalThis.SudokuGenerator);
const baseGenerated=globalThis.SudokuGenerator.make(variant,seed,difficulty);
if(!baseGenerated||!Array.isArray(baseGenerated.puzzle))throw new Error('base 16x16 generation failed');

await import(pathToFileURL(path.join(root,'games/p3-size-control.js')).href);
const specialized=globalThis.SudokuGenerator.countLargeClassicSolutionsExact;
if(typeof specialized!=='function')throw new Error('specialized 16x16 exact counter not installed');

const cases=[{name:'baseline',grid:cloneGrid(baseGenerated.puzzle)}];
const givens=[];
for(let r=0;r<16;r++)for(let c=0;c<16;c++)if(baseGenerated.puzzle[r][c])givens.push([r,c]);
for(let i=0;i<Math.min(32,givens.length);i++){
  const [r,c]=givens[Math.floor(i*(givens.length-1)/Math.max(1,Math.min(31,givens.length-1)))];
  const grid=cloneGrid(baseGenerated.puzzle);grid[r][c]=0;
  cases.push({name:`r${r+1}c${c+1}`,grid});
}

let mismatches=0,specializedTotal=0,referenceTotal=0,specializedMax=0,referenceMax=0;
console.log(`SUDOKU16_EXACT_DIFFERENTIAL seed=${seed} difficulty=${difficulty} cases=${cases.length} hostRealm=true`);
for(const item of cases){
  const stats={};
  let t0=performance.now();
  const s=specialized(item.grid,2,stats);
  const sm=performance.now()-t0;
  t0=performance.now();
  const r=referenceCount(item.grid,2);
  const rm=performance.now()-t0;
  const same=s===r;
  if(!same)mismatches++;
  specializedTotal+=sm;referenceTotal+=rm;specializedMax=Math.max(specializedMax,sm);referenceMax=Math.max(referenceMax,rm);
  console.log(`DIFF_CASE ${item.name} specialized=${s} reference=${r} same=${same} specializedMs=${round1(sm).toFixed(1)} referenceMs=${round1(rm).toFixed(1)} nodes=${stats.nodes||0} branches=${stats.branches||0} deadEnds=${stats.deadEnds||0} propagated=${stats.propagated||0}`);
}
const speedup=specializedTotal?referenceTotal/specializedTotal:0;
console.log(`DIFF_SUMMARY cases=${cases.length} mismatches=${mismatches} specializedTotalMs=${round1(specializedTotal).toFixed(1)} referenceTotalMs=${round1(referenceTotal).toFixed(1)} speedup=${speedup.toFixed(2)} specializedMaxMs=${round1(specializedMax).toFixed(1)} referenceMaxMs=${round1(referenceMax).toFixed(1)}`);
if(mismatches){console.log('SUDOKU16_EXACT_DIFFERENTIAL:FAIL');process.exitCode=1;}
else console.log('SUDOKU16_EXACT_DIFFERENTIAL:PASS');
