import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const snapshot=JSON.parse(fs.readFileSync(path.join(root,'data/playability-catalogue-policy-snapshot.json'),'utf8'));
const targetIds=new Set(snapshot.entries.filter(entry=>entry.family==='Grid'||entry.family==='Outside clues').map(entry=>entry.id));
if(targetIds.size!==11)throw new Error(`expected 11 Grid/Outside-clue targets, got ${targetIds.size}`);

const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const allRefs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const firstBank=allRefs.indexOf('games/sudoku-bank.js');
const firstGenerator=allRefs.indexOf('games/sudoku-generator.js');
const lastGenerator=allRefs.indexOf('games/miracle-generator-hardening.js');
if(firstBank<0||firstGenerator<0||lastGenerator<firstGenerator)throw new Error('production Sudoku runtime script range not found');
const bankRefs=allRefs.slice(firstBank,firstGenerator).filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
const generatorRefs=allRefs.slice(firstGenerator,lastGenerator+1);
const refs=[...bankRefs,...generatorRefs];

const ctx={console,globalThis:null,window:null,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date,performance,
  localStorage:{getItem(){return null;},setItem(){},removeItem(){}},setTimeout,clearTimeout};
ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const ref of refs)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
if(!ctx.SudokuGenerator||!Array.isArray(ctx.SudokuBank))throw new Error('failed to load production generator/runtime');

function countFilled(grid){return Array.isArray(grid)?grid.reduce((sum,row)=>sum+(Array.isArray(row)?row.filter(Boolean).length:0),0):0;}
function totalCells(grid){return Array.isArray(grid)?grid.reduce((sum,row)=>sum+(Array.isArray(row)?row.length:0),0):0;}
function structuralCounts(data){
  data=data||{};
  const keys=['clues','dominoes','parityCells','toroidalClues'];
  const out={};
  let total=0;
  for(const key of keys){
    const value=data[key];
    const count=Array.isArray(value)?value.length:(value&&typeof value==='object'?Object.keys(value).length:0);
    if(count){out[key]=count;total+=count;}
  }
  out.total=total;
  return out;
}
function round1(x){return Math.round(x*10)/10;}

const variants=ctx.SudokuBank.filter(v=>v&&targetIds.has(v.id)).sort((a,b)=>a.id.localeCompare(b.id));
if(variants.length!==11)throw new Error(`expected 11 runtime variants, got ${variants.length}`);
const seed=92001;
const difficulty='expert';
const rows=[];
for(const variant of variants){
  const t0=performance.now();
  let generated=null,error=null;
  try{generated=ctx.SudokuGenerator.make(variant,seed,difficulty);}catch(err){error=err;}
  const runtimeMs=performance.now()-t0;
  if(error){
    rows.push({id:variant.id,kind:variant.kind,error:String(error&&error.message||error),runtimeMs});
    continue;
  }
  const puzzle=generated&&generated.puzzle;
  const filled=countFilled(puzzle);
  const total=totalCells(puzzle);
  const structures=structuralCounts((generated&&generated.data)||variant.data);
  rows.push({
    id:variant.id,kind:variant.kind,filled,total,density:total?filled/total:0,structures,
    runtimeMs,
    unique:generated&&generated.generation&&generated.generation.unique===true,
    variantEssential:generated&&generated.generation&&generated.generation.variantEssential===true,
    verification:generated&&generated.generation&&generated.generation.verification||'unspecified',
    policy:generated&&generated.generation&&generated.generation.policy||'unspecified',
    generated
  });
}

console.log(`NONSTANDARD_GRID_EXPERT_INVENTORY targets=${rows.length} seed=${seed} difficulty=${difficulty} hostRealm=false vmDiagnostic=true`);
for(const row of rows){
  if(row.error){
    console.log(`EXPERT_ENTRY id=${row.id} kind=${row.kind} ERROR=${JSON.stringify(row.error)} runtimeMs=${round1(row.runtimeMs).toFixed(1)}`);
    continue;
  }
  console.log(`EXPERT_ENTRY id=${row.id} kind=${row.kind} givens=${row.filled}/${row.total} density=${row.density.toFixed(3)} structural=${row.structures.total} structuralBreakdown=${JSON.stringify(row.structures)} runtimeMs=${round1(row.runtimeMs).toFixed(1)} unique=${row.unique} variantEssential=${row.variantEssential} verification=${row.verification} policy=${row.policy}`);
}
const successful=rows.filter(row=>!row.error);
const byDensity=successful.slice().sort((a,b)=>b.density-a.density||b.structures.total-a.structures.total||a.id.localeCompare(b.id));
for(const row of byDensity){
  console.log(`EXPERT_PRIORITY id=${row.id} density=${row.density.toFixed(3)} givens=${row.filled}/${row.total} structural=${row.structures.total} runtimeMs=${round1(row.runtimeMs).toFixed(1)}`);
}
console.log(`NONSTANDARD_GRID_EXPERT_SUMMARY success=${successful.length} errors=${rows.length-successful.length} zeroGiven=${successful.filter(r=>r.filled===0).length} withStructural=${successful.filter(r=>r.structures.total>0).length}`);
console.log('NOTE diagnostic only: density and structural counts are separate information channels; no universal threshold is applied.');
