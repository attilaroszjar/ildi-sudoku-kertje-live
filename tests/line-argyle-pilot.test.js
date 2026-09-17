'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const ctx={console};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const f of [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(x=>x.startsWith('games/sudoku-bank')))vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
for(const f of ['games/sudoku-generator.js','games/line-generator-core.js','games/argyle-runtime-hardening.js','games/line-generator-argyle.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);

const variant=ctx.SudokuBank.find(x=>x.id==='argyle');assert.ok(variant);
const gen=ctx.LineGeneratorArgyle,core=ctx.LineGeneratorCore;
function slope(line){return line[1][1]-line[0][1]>0?1:-1;}

 test('Argyle lattice builder uses both diagonal slopes, 4-8 cell lines, and no repeats',()=>{
  const fresh=core.freshStandardSolution(0xA491E),a=gen.chooseLattice(fresh.grid,0xBEEF),b=gen.chooseLattice(fresh.grid,0xBEEF);
  assert.deepEqual(a,b);assert.ok(a.length>=6);
  assert.ok(a.some(l=>slope(l)>0));assert.ok(a.some(l=>slope(l)<0));assert.ok(gen.intersectionCount(a)>=3);
  for(const line of a){assert.ok(line.length>=4&&line.length<=8);assert.equal(gen.uniqueOnSolution(fresh.grid,line),true);}
});

test('Argyle pilot is deterministic, exact, variant-essential, and fresh',()=>{
  const seed=0xA49A11,a=gen.makeVariantPilot(ctx.SudokuGenerator,variant,seed,'focused'),b=gen.makeVariantPilot(ctx.SudokuGenerator,variant,seed,'focused');
  assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.data,b.data);
  assert.equal(a.generation.generatorFamily,'line-argyle-lattice-fresh-fill-mrv');assert.equal(a.generation.pilot,true);
  assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1);
  assert.equal(a.generation.variantEssential,true);assert.ok(a.data.lines.length>=6);
  for(const line of a.data.lines)assert.equal(gen.uniqueOnSolution(a.solution,line),true);
});

test('Argyle production lifecycle loads primitive before hardening adapter',()=>{
  const primitive='games/line-generator-argyle.js',hardening='games/line-generator-argyle-hardening.js';
  const primitivePos=html.indexOf(primitive),hardeningPos=html.indexOf(hardening);
  assert.ok(primitivePos>=0,'Argyle primitive missing from runtime load order');
  assert.ok(hardeningPos>=0,'Argyle hardening adapter missing from runtime load order');
  assert.ok(primitivePos<hardeningPos,'Argyle primitive must load before production hardening adapter');
});
