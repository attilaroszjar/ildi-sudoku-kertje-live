import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const bank=fs.readFileSync(path.join(root,'games/sudoku-bank.js'),'utf8');
const generator=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
const core=fs.readFileSync(path.join(root,'games/extra-house-generator-core.js'),'utf8');
const hardening=fs.readFileSync(path.join(root,'games/diagonal-generator-hardening.js'),'utf8');

const ctx={console,globalThis:null,Map,Set,WeakMap};
ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext(bank,ctx,{filename:'sudoku-bank.js'});
vm.runInContext(generator,ctx,{filename:'sudoku-generator.js'});
vm.runInContext(core,ctx,{filename:'extra-house-generator-core.js'});
vm.runInContext(hardening,ctx,{filename:'diagonal-generator-hardening.js'});

const G=ctx.SudokuGenerator;
const variant=ctx.SudokuBank.find(v=>v.id==='diagonal');
if(!variant)throw new Error('canonical diagonal variant missing');
if(!ctx.ExtraHouseGeneratorCore)throw new Error('shared extra-house core missing');

const difficulties=['gentle','focused','expert'];
const targets={gentle:40,focused:32,expert:27};
const seeds=Array.from({length:32},(_,i)=>5000+i);

function normalizeSymbols(grid){
  const map=new Map();let next=1;
  return grid.map(row=>row.map(v=>{if(!map.has(v))map.set(v,next++);return map.get(v);}));
}
function rotate(grid){
  const n=grid.length;
  return Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>grid[n-1-c][r]));
}
function reflect(grid){return grid.map(row=>row.slice().reverse());}
function structuralFingerprint(grid){
  const forms=[];let g=grid.map(row=>row.slice());
  for(let i=0;i<4;i++){
    for(const x of [g,reflect(g)])forms.push(normalizeSymbols(x).flat().join(''));
    g=rotate(g);
  }
  forms.sort();return forms[0];
}
function percentile(xs,p){
  const a=xs.slice().sort((x,y)=>x-y);
  return a[Math.min(a.length-1,Math.max(0,Math.ceil(a.length*p)-1))];
}
function median(xs){return percentile(xs,0.5);}
function round(x){return Math.round(x*10)/10;}

const solutionHashes=new Set();
const structuralHashes=new Set();
const rows={};
let exactUnique=0,variantEssential=0,failures=[];

for(const difficulty of difficulties){
  const puzzleHashes=new Set(),times=[],scores=[],clues=[];
  for(const seed of seeds){
    const t0=performance.now();
    const g=G.make(variant,seed,difficulty);
    times.push(performance.now()-t0);
    const variantOk=g.generation&&g.generation.unique===true;
    const essentialOk=g.generation&&g.generation.variantEssential===true&&G.countSolutions(g.puzzle,2)>1;
    if(variantOk)exactUnique++;
    if(essentialOk)variantEssential++;
    if(!variantOk||!essentialOk)failures.push(difficulty+':'+seed);
    puzzleHashes.add(JSON.stringify(g.puzzle));
    solutionHashes.add(JSON.stringify(g.solution));
    structuralHashes.add(structuralFingerprint(g.solution));
    scores.push(g.generation.difficultyScore);
    clues.push(g.generation.clues);
  }
  rows[difficulty]={
    puzzleUnique:puzzleHashes.size,
    scoreMedian:median(scores),
    clueMin:Math.min(...clues),
    clueMax:Math.max(...clues),
    runtimeP50Ms:round(percentile(times,0.50)),
    runtimeP95Ms:round(percentile(times,0.95)),
    runtimeMaxMs:round(Math.max(...times))
  };
}

const total=seeds.length*difficulties.length;
const checks=[
  exactUnique===total,
  variantEssential===total,
  solutionHashes.size>=30,
  structuralHashes.size>=24,
  difficulties.every(d=>rows[d].puzzleUnique>=31),
  difficulties.every(d=>rows[d].clueMax<=targets[d]),
  rows.gentle.scoreMedian<rows.focused.scoreMedian,
  rows.focused.scoreMedian<rows.expert.scoreMedian,
  failures.length===0
];
const pass=checks.every(Boolean);

console.log('DIAGONAL_GENERATOR_AUDIT '+JSON.stringify({
  seeds:seeds.length,
  generated:total,
  exactUnique,
  variantEssential,
  solutionUnique:solutionHashes.size,
  structuralSolutionUnique:structuralHashes.size,
  difficulties:rows,
  failures:failures.length
}));
console.log('DIAGONAL_GENERATOR_AUDIT:'+(pass?'PASS':'FAIL'));
if(!pass)process.exitCode=1;
