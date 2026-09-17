'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const ctx={console};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const f of [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1])){
  if(!f.startsWith('games/')) continue;
  if(f==='games/sudoku-library.js') break;
  vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
}

function variant(id){const v=ctx.SudokuBank.find(x=>x.id===id);assert.ok(v,`canonical ${id} must exist`);return v;}
function linesOf(v,id){return id==='thermo'?v.data.thermos:v.data.lines;}
function assertDirected(v,id){const cfg=ctx.LineGeneratorDirected.configFor(id);for(const line of linesOf(v,id))assert.ok(ctx.LineGeneratorDirected.lineValid(v.solution,line,cfg.transition));}

test('runtime load order registers directed primitive before production adapter',()=>{
  const primitive=html.indexOf('games/line-generator-directed.js');
  const adapter=html.indexOf('games/line-generator-directed-hardening.js');
  assert.ok(primitive>0);assert.ok(adapter>primitive);
});

for(const id of ['thermo','slow-thermo']){
  test(`production make() routes ${id} through fresh directed generator`,()=>{
    const v=variant(id),out=ctx.SudokuGenerator.make(v,0xD1EC7+(id==='thermo'?1:2),'focused');
    assert.equal(out.generation.pilot,false);
    assert.equal(out.generation.variantEssential,true);
    assert.match(out.generation.generatorFamily,/directed-fresh-fill-mrv$/);
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(out.puzzle,out,2),1);
    assert.ok(ctx.SudokuGenerator.countSolutions(out.puzzle,2)>1);
    assertDirected(out,id);
  });
}

test('thermometer transparency override remains present after production promotion',()=>{
  const css=fs.readFileSync(path.join(root,'assets/sudoku-mobile.css'),'utf8');
  assert.match(css,/\.thermo-line,\.slowthermo-line\{stroke-opacity:\.32\}/);
  assert.match(css,/\.thermo-line-bulb,\.slowthermo-line-bulb\{fill-opacity:\.16;stroke-opacity:\.42\}/);
});
