'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
function load(){const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);for(const f of ['games/sudoku-bank.js','games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-whole-set.js','games/line-generator-hardening.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});return ctx;}
function variant(ctx){const v=ctx.SudokuBank.find(x=>x.id==='renban');assert.ok(v);return v;}
function solutionKey(grid){return grid.map(row=>row.join('')).join('/');}
function assertRenban(g){for(const line of g.data.lines){assert.equal(g.LineGeneratorCore.validateSimplePath(line,{minLength:4,maxLength:6}),true);const values=line.map(([r,c])=>g.solution[r][c]),unique=new Set(values);assert.equal(unique.size,line.length);assert.equal(Math.max(...values)-Math.min(...values)+1,line.length);}}

test('production make routes Renban through fresh whole-set generator',()=>{const ctx=load(),v=variant(ctx);for(const seed of [1,17,101,2026]){const g=ctx.SudokuGenerator.make(v,seed,'focused');assert.equal(g.generation.generatorFamily,'line-renban-fresh-fill-mrv');assert.equal(g.generation.pilot,false);assert.equal(g.generation.variantEssential,true);assert.equal(ctx.SudokuGenerator.countVariantSolutions(g.puzzle,g,2),1);assert.ok(ctx.SudokuGenerator.countSolutions(g.puzzle,2)>1);g.LineGeneratorCore=ctx.LineGeneratorCore;assertRenban(g);}});

test('production Renban replay is exact and pilot seeds vary solution/topology',()=>{const ctx=load(),v=variant(ctx),solutions=new Set(),topologies=new Set();for(const seed of [1,17,101,2026]){const a=ctx.SudokuGenerator.make(v,seed,'focused'),b=ctx.SudokuGenerator.make(v,seed,'focused');assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.data.lines,b.data.lines);solutions.add(solutionKey(a.solution));topologies.add(a.generation.topologyFingerprint);}assert.ok(solutions.size>=3);assert.ok(topologies.size>=3);});

test('Whispers production route remains intact after Renban wiring',()=>{const ctx=load(),v=ctx.SudokuBank.find(x=>x.id==='whispers');assert.ok(v);const g=ctx.SudokuGenerator.make(v,17,'focused');assert.equal(g.generation.generatorFamily,'line-whispers-fresh-fill-mrv');assert.equal(g.generation.pilot,false);assert.equal(g.generation.variantEssential,true);});
