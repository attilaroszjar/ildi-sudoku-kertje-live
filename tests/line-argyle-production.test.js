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
for(const f of ['games/sudoku-generator.js','games/line-generator-core.js','games/argyle-runtime-hardening.js','games/line-generator-argyle.js','games/line-generator-argyle-hardening.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const v=ctx.SudokuBank.find(x=>x.id==='argyle');assert.ok(v);

test('Argyle production make() routes through fresh lattice generator',()=>{
  const p=ctx.SudokuGenerator.make(v,0xA671E,'focused');
  assert.equal(p.generation.pilot,false);
  assert.equal(p.generation.generatorFamily,'line-argyle-lattice-fresh-fill-mrv');
  assert.equal(p.generation.variantEssential,true);
  assert.equal(ctx.SudokuGenerator.countVariantSolutions(p.puzzle,p,2),1);
  assert.ok(ctx.SudokuGenerator.countSolutions(p.puzzle,2)>1);
  assert.ok(Array.isArray(p.data.lines)&&p.data.lines.length>=6);
});

test('Argyle production adapter is deterministic',()=>{
  const a=ctx.SudokuGenerator.make(v,0xA671E,'expert');
  const b=ctx.SudokuGenerator.make(v,0xA671E,'expert');
  assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.data,b.data);
});
