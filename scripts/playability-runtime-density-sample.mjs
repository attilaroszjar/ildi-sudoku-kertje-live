import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {classifyGridDensity} from './playability-clue-density-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const allRefs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const support=new Set([
  'games/sudoku-generator.js',
  'games/extra-house-generator-core.js',
  'games/extra-house-generator-hardening.js',
  'games/diagonal-generator-hardening.js',
  'games/disjoint-groups-generator-hardening.js',
  'games/final-three-generator-hardening.js'
]);
const refs=allRefs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref)||support.has(ref));
const ctx={
  console,globalThis:null,window:null,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date,performance,
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}}
};
ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const ref of refs){
  vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
}

if(!ctx.SudokuGenerator||!Array.isArray(ctx.SudokuBank))throw new Error('runtime density sampler failed to load Sudoku production generator');

const targetIds=['anti-king','anti-knight','diagonal','hyper','nonconsecutive','center-dot','disjoint-groups'];
const difficulties=['gentle','focused','expert'];
const seeds=[91001,91002,91003];
const rows=[];

function median(xs){
  const a=xs.slice().sort((x,y)=>x-y);
  return a[Math.floor(a.length/2)];
}
function round3(x){return Math.round(x*1000)/1000;}
function round1(x){return Math.round(x*10)/10;}

for(const id of targetIds){
  const variant=ctx.SudokuBank.find(v=>v.id===id);
  if(!variant)throw new Error(`runtime density target missing: ${id}`);
  for(const difficulty of difficulties){
    const samples=[];
    for(const seed of seeds){
      const t0=performance.now();
      const generated=ctx.SudokuGenerator.make(variant,seed,difficulty);
      const elapsed=performance.now()-t0;
      if(!generated||!Array.isArray(generated.puzzle))throw new Error(`generator returned no puzzle for ${id}/${difficulty}/${seed}`);
      const metric=classifyGridDensity(generated.puzzle,difficulty);
      samples.push({
        seed,
        density:metric.density,
        filled:metric.filled,
        total:metric.total,
        denseWarning:metric.denseWarning,
        unique:generated.generation&&generated.generation.unique===true,
        variantEssential:generated.generation&&generated.generation.variantEssential===true,
        runtimeMs:elapsed
      });
    }
    rows.push({id,difficulty,samples});
  }
}

console.log(`PLAYABILITY_RUNTIME_SAMPLE targets=${targetIds.length} difficulties=${difficulties.length} seeds=${seeds.length} generated=${rows.length*seeds.length}`);
for(const row of rows){
  const densities=row.samples.map(s=>s.density);
  const givens=row.samples.map(s=>s.filled);
  const runtimes=row.samples.map(s=>s.runtimeMs);
  const warnings=row.samples.filter(s=>s.denseWarning).length;
  const unique=row.samples.filter(s=>s.unique).length;
  const essential=row.samples.filter(s=>s.variantEssential).length;
  console.log(
    `RUNTIME_DENSITY id=${row.id} difficulty=${row.difficulty}`+
    ` givens=${Math.min(...givens)}-${Math.max(...givens)}/${row.samples[0].total}`+
    ` densityMin=${round3(Math.min(...densities)).toFixed(3)}`+
    ` densityMedian=${round3(median(densities)).toFixed(3)}`+
    ` densityMax=${round3(Math.max(...densities)).toFixed(3)}`+
    ` warnings=${warnings}/${row.samples.length}`+
    ` unique=${unique}/${row.samples.length}`+
    ` essential=${essential}/${row.samples.length}`+
    ` runtimeMaxMs=${round1(Math.max(...runtimes)).toFixed(1)}`
  );
}
console.log('NOTE diagnostic runtime sample only; warning rows identify the first carving-hardening wave');
