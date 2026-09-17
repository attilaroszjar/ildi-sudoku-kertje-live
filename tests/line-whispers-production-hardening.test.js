'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
function load(){const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);for(const f of ['games/sudoku-bank.js','games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-hardening.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});return ctx;}
function variant(ctx){const v=ctx.SudokuBank.find(x=>x.id==='whispers');assert.ok(v);return v;}
function key(g){return g.map(r=>r.join('')).join('/');}

test('production make routes Whispers through fresh line generator',()=>{const ctx=load(),v=variant(ctx);for(const seed of [1,17,101,2026]){const g=ctx.SudokuGenerator.make(v,seed,'focused');assert.equal(g.generation.generatorFamily,'line-whispers-fresh-fill-mrv');assert.equal(g.generation.pilot,false);assert.equal(g.generation.variantEssential,true);assert.equal(ctx.SudokuGenerator.countVariantSolutions(g.puzzle,g,2),1);assert.ok(ctx.SudokuGenerator.countSolutions(g.puzzle,2)>1);for(const line of g.data.lines){assert.equal(ctx.LineGeneratorCore.validateSimplePath(line,{minLength:4,maxLength:7}),true);for(let i=1;i<line.length;i++){const a=g.solution[line[i-1][0]][line[i-1][1]],b=g.solution[line[i][0]][line[i][1]];assert.ok(Math.abs(a-b)>=5);}}}});

test('production Whispers replay is exact and multiple seeds change solution/topology',()=>{const ctx=load(),v=variant(ctx),solutions=new Set(),topologies=new Set();for(const seed of [1,17,101,2026]){const a=ctx.SudokuGenerator.make(v,seed,'focused'),b=ctx.SudokuGenerator.make(v,seed,'focused');assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.data.lines,b.data.lines);solutions.add(key(a.solution));topologies.add(a.generation.topologyFingerprint);}assert.ok(solutions.size>=3);assert.ok(topologies.size>=3);});

test('non-Whispers variants delegate unchanged through production wrapper',()=>{const ctx=load(),v=ctx.SudokuBank.find(x=>x.id==='classic');if(!v)return;const g=ctx.SudokuGenerator.make(v,17,'focused');assert.notEqual(g.generation&&g.generation.generatorFamily,'line-whispers-fresh-fill-mrv');});
