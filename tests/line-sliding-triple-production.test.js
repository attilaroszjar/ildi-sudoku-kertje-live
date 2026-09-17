'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);

function pos(file){const i=scripts.indexOf(file);assert.notEqual(i,-1,`${file} must be loaded by index.html`);return i;}

test('runtime load order registers sliding-triple primitive before production adapter',()=>{
  const core=pos('games/line-generator-core.js');
  const primitive=pos('games/line-generator-sliding-triple.js');
  const baseHardening=pos('games/line-generator-hardening.js');
  const adapter=pos('games/line-generator-sliding-triple-hardening.js');
  assert.ok(core<primitive,'core must load before sliding-triple primitive');
  assert.ok(primitive<baseHardening,'primitive must exist before line hardening chain');
  assert.ok(baseHardening<adapter,'production adapter must wrap the final line generator route');
});

test('production make() routes Entropic and Modular through fresh sliding-triple generator',()=>{
  const ctx={console};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
  for(const f of scripts.filter(x=>x.startsWith('games/sudoku-bank')))vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
  for(const f of [
    'games/sudoku-generator.js',
    'games/line-generator-core.js',
    'games/line-generator-whole-set.js',
    'games/line-generator-proven-siblings.js',
    'games/line-generator-sliding-triple.js',
    'games/line-generator-hardening.js',
    'games/line-generator-proven-siblings-hardening.js',
    'games/line-generator-sliding-triple-hardening.js'
  ])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);

  for(const id of ['entropic','modular']){
    const variant=ctx.SudokuBank.find(x=>x.id===id);assert.ok(variant);
    for(const difficulty of ['gentle','focused','expert']){
      const out=ctx.SudokuGenerator.make(variant,0xC0FFEE,difficulty);
      assert.equal(out.generation.pilot,false);
      assert.equal(out.generation.mode,'seeded-variant-essential');
      assert.match(out.generation.generatorFamily,new RegExp(`line-${id}-sliding-triple-fresh-fill-mrv`));
      assert.equal(ctx.SudokuGenerator.countVariantSolutions(out.puzzle,out,2),1);
      assert.ok(ctx.SudokuGenerator.countSolutions(out.puzzle,2)>1);
      assert.ok(Array.isArray(out.data.lines)&&out.data.lines.length>=2);
    }
  }
});
