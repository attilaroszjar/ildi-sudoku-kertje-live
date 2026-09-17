'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const bank=fs.readFileSync(path.join(root,'games/sudoku-bank.js'),'utf8');
const bank2=fs.readFileSync(path.join(root,'games/sudoku-bank-iteration2.js'),'utf8');
const gen=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
const core=fs.readFileSync(path.join(root,'games/extra-house-generator-core.js'),'utf8');
const hardening=fs.readFileSync(path.join(root,'games/disjoint-groups-generator-hardening.js'),'utf8');
function context(){const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);vm.runInContext(bank,ctx,{filename:'sudoku-bank.js'});vm.runInContext(bank2,ctx,{filename:'sudoku-bank-iteration2.js'});vm.runInContext(gen,ctx,{filename:'sudoku-generator.js'});vm.runInContext(core,ctx,{filename:'extra-house-generator-core.js'});vm.runInContext(hardening,ctx,{filename:'disjoint-groups-generator-hardening.js'});return ctx;}
function variant(ctx){const v=ctx.SudokuBank.find(x=>x.id==='disjoint-groups');assert.ok(v,'Disjoint Groups variant must exist');return v;}
function groupsValid(grid){for(let rr=0;rr<3;rr++)for(let cc=0;cc<3;cc++){const vals=[];for(let br=0;br<3;br++)for(let bc=0;bc<3;bc++)vals.push(grid[br*3+rr][bc*3+cc]);assert.equal(new Set(vals).size,9,'each disjoint group must contain 9 distinct digits');assert.deepEqual(vals.slice().sort((a,b)=>a-b),[1,2,3,4,5,6,7,8,9]);}}
function normalizeSymbols(grid){const map=new Map();let next=1;return grid.map(row=>row.map(v=>{if(!map.has(v))map.set(v,next++);return map.get(v);}));}
function rotate(grid){const n=grid.length;return Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>grid[n-1-c][r]));}
function reflect(grid){return grid.map(row=>row.slice().reverse());}
function structuralFingerprint(grid){const forms=[];let g=grid.map(row=>row.slice());for(let i=0;i<4;i++){for(const x of [g,reflect(g)])forms.push(normalizeSymbols(x).flat().join(''));g=rotate(g);}forms.sort();return forms[0];}
function median(xs){const a=xs.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}

test('Disjoint Groups fresh generation is deterministic, solver-certified and valid',()=>{const ctx=context(),G=ctx.SudokuGenerator,v=variant(ctx);for(const d of ['gentle','focused','expert'])for(const seed of [1,17,101,2026]){const a=G.make(v,seed,d),b=G.make(v,seed,d);assert.deepEqual(a.puzzle,b.puzzle,d+' '+seed+' deterministic puzzle');assert.deepEqual(a.solution,b.solution,d+' '+seed+' deterministic solution');assert.equal(a.generation.unique,true);assert.equal(a.generation.verification,'solver-verified');assert.equal(a.generation.generatorFamily,'extra-house-fresh-fill-mrv');assert.equal(G.countVariantSolutions(a.puzzle,a,2),1,d+' '+seed+' canonical variant solver unique');groupsValid(a.solution);}});

test('Disjoint Groups generation is genuinely variant-essential',()=>{const ctx=context(),G=ctx.SudokuGenerator,v=variant(ctx);for(const d of ['gentle','focused','expert'])for(const seed of [1,17,101,2026]){const g=G.make(v,seed,d);assert.equal(g.generation.variantEssential,true);assert.ok(G.countSolutions(g.puzzle,2)>1,d+' '+seed+' must not be Classic-unique');}});

test('Disjoint Groups fresh generation is structurally diverse',()=>{const ctx=context(),G=ctx.SudokuGenerator,v=variant(ctx),seeds=Array.from({length:16},(_,i)=>3000+i),solutions=new Set(),structures=new Set(),canonical=JSON.stringify(v.solution);for(const seed of seeds){const g=G.make(v,seed,'focused');assert.notEqual(JSON.stringify(g.solution),canonical,'seed '+seed+' must not use canonical solution');solutions.add(JSON.stringify(g.solution));structures.add(structuralFingerprint(g.solution));}assert.ok(solutions.size>=15,'expected broad solution diversity, got '+solutions.size+'/16');assert.ok(structures.size>=12,'expected broad structural diversity, got '+structures.size+'/16');});

test('Disjoint Groups keeps ordered measured difficulty',()=>{const ctx=context(),G=ctx.SudokuGenerator,v=variant(ctx),seeds=[1,17,101,2026,20260828],scores={gentle:[],focused:[],expert:[]};for(const d of Object.keys(scores))for(const seed of seeds){const g=G.make(v,seed,d);assert.ok(Number.isFinite(g.generation.difficultyScore)&&g.generation.difficultyScore>0);scores[d].push(g.generation.difficultyScore);}const med={gentle:median(scores.gentle),focused:median(scores.focused),expert:median(scores.expert)};assert.ok(med.gentle<med.focused,'Focused median must exceed Gentle: '+JSON.stringify(med));assert.ok(med.focused<med.expert,'Expert median must exceed Focused: '+JSON.stringify(med));});
