import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {classifyGridDensity} from './playability-clue-density-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const allRefs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);

const firstGenerator=allRefs.indexOf('games/sudoku-generator.js');
const lastGenerator=allRefs.indexOf('games/miracle-generator-hardening.js');
if(firstGenerator<0||lastGenerator<firstGenerator)throw new Error('production Sudoku generator script range not found');

const bankRefs=allRefs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const generatorRefs=allRefs.slice(firstGenerator,lastGenerator+1);
const refs=[...bankRefs,...generatorRefs.filter(ref=>!bankRefs.includes(ref))];

const ctx={
  console,globalThis:null,window:null,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date,performance,
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},
  setTimeout,clearTimeout
};
ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const ref of refs)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});

if(!ctx.SudokuGenerator||!Array.isArray(ctx.SudokuBank))throw new Error('runtime density inventory failed to load Sudoku production generator');
function isStandard9(v){
  return Array.isArray(v.solution)&&v.solution.length===9&&v.solution.every(row=>Array.isArray(row)&&row.length===9&&row.every(Number.isInteger));
}
function median(xs){const a=xs.slice().sort((x,y)=>x-y);return a[Math.floor(a.length/2)];}
function round3(x){return Math.round(x*1000)/1000;}
function round1(x){return Math.round(x*10)/10;}

const variants=ctx.SudokuBank.filter(isStandard9).sort((a,b)=>a.id.localeCompare(b.id));
if(variants.length!==77)throw new Error(`expected 77 standard 9x9 Sudoku variants, got ${variants.length}`);
const difficulties=['gentle','focused','expert'];
const seed=92001;
const rows=[];
let generatedCount=0;

for(const variant of variants){
  for(const difficulty of difficulties){
    const t0=performance.now();
    const generated=ctx.SudokuGenerator.make(variant,seed,difficulty);
    const elapsed=performance.now()-t0;
    if(!generated||!Array.isArray(generated.puzzle))throw new Error(`generator returned no puzzle for ${variant.id}/${difficulty}/${seed}`);
    const metric=classifyGridDensity(generated.puzzle,difficulty);
    rows.push({
      id:variant.id,difficulty,filled:metric.filled,total:metric.total,density:metric.density,denseWarning:metric.denseWarning,
      runtimeMs:elapsed,
      unique:generated.generation&&generated.generation.unique===true,
      variantEssential:generated.generation&&generated.generation.variantEssential===true,
      verification:generated.generation&&generated.generation.verification||'unspecified',
      policy:generated.generation&&generated.generation.policy||'unspecified'
    });
    generatedCount++;
  }
}

const warnings=rows.filter(row=>row.denseWarning).sort((a,b)=>b.density-a.density||a.id.localeCompare(b.id));
const densities=rows.map(row=>row.density);
const runtimes=rows.map(row=>row.runtimeMs);
const warnedIds=[...new Set(warnings.map(row=>row.id))];
const slowest=rows.slice().sort((a,b)=>b.runtimeMs-a.runtimeMs||a.id.localeCompare(b.id)||a.difficulty.localeCompare(b.difficulty)).slice(0,10);
console.log(`PLAYABILITY_RUNTIME_INVENTORY variants=${variants.length} difficulties=${difficulties.length} seeds=1 generated=${generatedCount} denseWarnings=${warnings.length} warningVariants=${warnedIds.length}`);
console.log(`RUNTIME_DENSITY_RANGE min=${round3(Math.min(...densities)).toFixed(3)} median=${round3(median(densities)).toFixed(3)} max=${round3(Math.max(...densities)).toFixed(3)} runtimeMaxMs=${round1(Math.max(...runtimes)).toFixed(1)}`);
for(const row of warnings){
  console.log(`RUNTIME_DENSE_WARNING id=${row.id} difficulty=${row.difficulty} givens=${row.filled}/${row.total} density=${round3(row.density).toFixed(3)}`);
}
console.log(`RUNTIME_WARNING_IDS ${warnedIds.length?warnedIds.join(','):'none'}`);
for(const row of slowest){
  console.log(`RUNTIME_HOTSPOT id=${row.id} difficulty=${row.difficulty} runtimeMs=${round1(row.runtimeMs).toFixed(1)} givens=${row.filled}/${row.total} density=${round3(row.density).toFixed(3)} unique=${row.unique} variantEssential=${row.variantEssential} verification=${row.verification} policy=${row.policy}`);
}
console.log('NOTE diagnostic full-77 runtime inventory; density warnings and runtime hotspots are separate remediation signals');
