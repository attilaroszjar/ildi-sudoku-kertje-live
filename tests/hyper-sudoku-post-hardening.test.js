'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const gen=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
const core=fs.readFileSync(path.join(root,'games/extra-house-generator-core.js'),'utf8');
const hardening=fs.readFileSync(path.join(root,'games/extra-house-generator-hardening.js'),'utf8');
const bank=fs.readFileSync(path.join(root,'games/sudoku-bank.js'),'utf8');
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
function context(){const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);vm.runInContext(bank,ctx,{filename:'sudoku-bank.js'});vm.runInContext(gen,ctx,{filename:'sudoku-generator.js'});vm.runInContext(core,ctx,{filename:'extra-house-generator-core.js'});vm.runInContext(hardening,ctx,{filename:'extra-house-generator-hardening.js'});return ctx;}
function variant(ctx){const v=ctx.SudokuBank.find(x=>x.id==='hyper');assert.ok(v,'Hyper variant must exist');return v;}
function median(xs){const a=xs.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function windowsValid(grid){for(const [r0,c0] of [[1,1],[1,5],[5,1],[5,5]]){const vals=[];for(let r=r0;r<r0+3;r++)for(let c=c0;c<c0+3;c++)vals.push(grid[r][c]);assert.equal(new Set(vals).size,9,'each Hyper window must contain 9 distinct digits');assert.deepEqual(vals.slice().sort((a,b)=>a-b),[1,2,3,4,5,6,7,8,9]);}}
function normalizeSymbols(grid){const map=new Map();let next=1;return grid.map(row=>row.map(v=>{if(!map.has(v))map.set(v,next++);return map.get(v);}));}
function rotate(grid){const n=grid.length;return Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>grid[n-1-c][r]));}
function reflect(grid){return grid.map(row=>row.slice().reverse());}
function structuralFingerprint(grid){const forms=[];let g=grid.map(row=>row.slice());for(let i=0;i<4;i++){for(const x of [g,reflect(g)])forms.push(normalizeSymbols(x).flat().join(''));g=rotate(g);}forms.sort();return forms[0];}

test('Hyper renderer exposes four shaded windows and enforces Hyper conflicts',()=>{
  assert.match(lib,/if\(kindIs\(v,'hyper'\)\) board\.classList\.add\('show-hyper'\)/);
  assert.match(lib,/if\(kindIs\(v,'hyper'\)[\s\S]*?b\.classList\.add\('hyper-cell'\)/);
  assert.match(lib,/if\(v\.kind==='hyper'\)[\s\S]*?grid\[rr\]\[cc\]===val/);
});

test('Hyper generation is deterministic, solver-certified and Hyper-valid',()=>{
  const ctx=context(),v=variant(ctx);assert.ok(ctx.ExtraHouseGeneratorCore,'shared extra-house core must be loaded');
  for(const d of ['gentle','focused','expert'])for(const seed of [1,17,101,2026]){const a=ctx.SudokuGenerator.make(v,seed,d),b=ctx.SudokuGenerator.make(v,seed,d);assert.deepEqual(a.puzzle,b.puzzle,d+' '+seed+' deterministic');assert.deepEqual(a.solution,b.solution,d+' '+seed+' solution replay');assert.equal(a.generation.unique,true,d+' '+seed+' unique');assert.equal(a.generation.verification,'solver-verified',d+' '+seed+' verified');assert.equal(a.generation.generatorFamily,'extra-house-fresh-fill-mrv');windowsValid(a.solution);}
});

test('Hyper generation is variant-essential instead of Classic-only unique',()=>{
  const ctx=context(),v=variant(ctx);
  for(const d of ['gentle','focused','expert'])for(const seed of [1,17,101,2026]){const g=ctx.SudokuGenerator.make(v,seed,d);assert.equal(g.generation.mode,'seeded-variant-essential',d+' '+seed+' must use Hyper-aware generator');assert.equal(g.generation.variantEssential,true,d+' '+seed+' must require Hyper windows for uniqueness');assert.equal(ctx.SudokuGenerator.countVariantSolutions(g.puzzle,g,2),1);assert.ok(ctx.SudokuGenerator.countSolutions(g.puzzle,2)>1,d+' '+seed+' must not be Classic-unique');}
});

test('Hyper fresh generation is structurally diverse',()=>{const ctx=context(),G=ctx.SudokuGenerator,v=variant(ctx),seeds=Array.from({length:16},(_,i)=>2000+i),solutions=new Set(),structures=new Set(),canonical=JSON.stringify(v.solution);for(const seed of seeds){const g=G.make(v,seed,'focused');assert.notEqual(JSON.stringify(g.solution),canonical,'seed '+seed+' must not carve canonical solution');assert.ok(Number.isInteger(g.generation.solutionGenerationNodes)&&g.generation.solutionGenerationNodes>0);solutions.add(JSON.stringify(g.solution));structures.add(structuralFingerprint(g.solution));}assert.ok(solutions.size>=15,'expected broad solution diversity, got '+solutions.size+'/16');assert.ok(structures.size>=12,'expected broad structural diversity, got '+structures.size+'/16');});

test('Hyper exposes measured Gentle < Focused < Expert difficulty',()=>{
  const ctx=context(),v=variant(ctx),seeds=[1,17,101,2026,20260828],scores={gentle:[],focused:[],expert:[]};
  for(const d of Object.keys(scores))for(const seed of seeds){const g=ctx.SudokuGenerator.make(v,seed,d);assert.ok(Number.isFinite(g.generation.difficultyScore)&&g.generation.difficultyScore>0,d+' '+seed+' must expose measured difficulty');scores[d].push(g.generation.difficultyScore);}
  const med={gentle:median(scores.gentle),focused:median(scores.focused),expert:median(scores.expert)};assert.ok(med.gentle<med.focused,'Focused median must exceed Gentle: '+JSON.stringify(med));assert.ok(med.focused<med.expert,'Expert median must exceed Focused: '+JSON.stringify(med));
});

test('Hyper retains shared notes, Check cleanup, completion and language refresh',()=>{
  assert.match(lib,/note-mode-button/);assert.match(lib,/classList\.remove\('checked-wrong'\)/);assert.match(lib,/if\(solved\(\)\)\{cells\.forEach[\s\S]*?api\.solved\(\)/);assert.match(lib,/refreshLanguage:function\(\)/);
});
