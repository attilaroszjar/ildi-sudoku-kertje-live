'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const gen=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
const bank=fs.readFileSync(path.join(root,'games/sudoku-bank.js'),'utf8');
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
function context(){const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);vm.runInContext(bank,ctx,{filename:'sudoku-bank.js'});vm.runInContext(gen,ctx,{filename:'sudoku-generator.js'});return ctx;}
function variant(ctx){const v=ctx.SudokuBank.find(x=>x.id==='killer');assert.ok(v,'Killer variant must exist');return v;}
function median(xs){const a=xs.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function cagesValid(v){for(const cage of v.data.cages){const vals=cage.cells.map(([r,c])=>v.solution[r][c]);assert.equal(new Set(vals).size,vals.length,'Killer cage digits must not repeat');assert.equal(vals.reduce((a,b)=>a+b,0),cage.sum,'Killer cage sum must match clue');}}

test('Killer canonical cage solution is valid',()=>{const ctx=context(),v=variant(ctx);cagesValid(v);});

test('Killer renderer enforces cage duplicate and sum conflicts',()=>{assert.match(lib,/if\(v\.kind==='killer'&&d\.cages\)[\s\S]*?new Set\(vals\)\.size!==vals\.length[\s\S]*?reduce\(function\(s,z\)\{return s\+z;\},0\)>a\.sum/);});

test('Killer generation is deterministic, solver-certified and variant-essential',()=>{const ctx=context(),v=variant(ctx);for(const d of ['gentle','focused','expert'])for(const seed of [1,17,101,2026]){const a=ctx.SudokuGenerator.make(v,seed,d),b=ctx.SudokuGenerator.make(v,seed,d);assert.deepEqual(a.puzzle,b.puzzle,d+' '+seed+' deterministic');assert.equal(a.generation.unique,true,d+' '+seed+' unique');assert.equal(a.generation.verification,'solver-verified',d+' '+seed+' verified');assert.equal(a.generation.mode,'seeded-variant-essential',d+' '+seed+' must use Killer-aware generator');assert.equal(a.generation.variantEssential,true,d+' '+seed+' must require cages for uniqueness');assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1,d+' '+seed+' unique under Killer rules');assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1,d+' '+seed+' should not be Classic-only unique');}});

test('Killer exposes measured Gentle < Focused < Expert difficulty',()=>{const ctx=context(),v=variant(ctx),seeds=[1,17,101,2026,20260828],scores={gentle:[],focused:[],expert:[]};for(const d of Object.keys(scores))for(const seed of seeds){const g=ctx.SudokuGenerator.make(v,seed,d);assert.ok(Number.isFinite(g.generation.difficultyScore)&&g.generation.difficultyScore>0,d+' '+seed+' measured difficulty');scores[d].push(g.generation.difficultyScore);}const med={gentle:median(scores.gentle),focused:median(scores.focused),expert:median(scores.expert)};assert.ok(med.gentle<med.focused,'Focused median must exceed Gentle: '+JSON.stringify(med));assert.ok(med.focused<med.expert,'Expert median must exceed Focused: '+JSON.stringify(med));});

test('Killer retains shared notes, Check cleanup, completion and language refresh',()=>{assert.match(lib,/note-mode-button/);assert.match(lib,/classList\.remove\('checked-wrong'\)/);assert.match(lib,/if\(solved\(\)\)\{cells\.forEach[\s\S]*?api\.solved\(\)/);assert.match(lib,/refreshLanguage:function\(\)/);});
