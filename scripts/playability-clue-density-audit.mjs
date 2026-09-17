import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {classifyGridDensity,summarizeDensity} from './playability-clue-density-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)]
  .map(m=>m[1])
  .filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x));
const ctx={console,globalThis:null,window:null,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date};
ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const ref of refs)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
const variants=Array.isArray(ctx.SudokuBank)?ctx.SudokuBank:[];

function isStandard9(v){
  return Array.isArray(v.solution)&&v.solution.length===9&&v.solution.every(row=>Array.isArray(row)&&row.length===9&&row.every(Number.isInteger));
}

const rows=variants.filter(isStandard9).map(v=>{
  const difficulty=v.difficulty||v.defaultDifficulty||'focused';
  const metrics=classifyGridDensity(v.puzzle,difficulty);
  return {id:v.id,metricFamily:'grid-givens',source:'canonical-baseline',...metrics};
}).sort((a,b)=>a.id.localeCompare(b.id));

if(rows.length!==77)throw new Error(`expected 77 standard 9x9 Sudoku variants, got ${rows.length}`);
const summary=summarizeDensity(rows);

console.log(`PLAYABILITY_DENSITY_BASELINE variants=${rows.length} measured=${summary.measured} denseWarnings=${summary.denseWarnings}`);
console.log(`DENSITY_RANGE min=${summary.min.toFixed(3)} median=${summary.median.toFixed(3)} max=${summary.max.toFixed(3)}`);
for(const row of rows.filter(r=>r.denseWarning).sort((a,b)=>b.density-a.density)){
  console.log(`DENSE_WARNING id=${row.id} difficulty=${row.difficulty} givens=${row.filled}/${row.total} density=${row.density.toFixed(3)} ceiling=${row.warningCeiling.toFixed(3)}`);
}
console.log('NOTE runtime-seed sampling and non-Sudoku adapters are migration work; this baseline is diagnostic and non-blocking');
