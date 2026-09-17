'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const files=[
  'games/sudoku-bank.js','games/sudoku-bank-iteration2.js','games/sudoku-bank-iteration3.js','games/sudoku-generator.js',
  'games/line-generator-core.js','games/killer-generator.js','games/line-generator-directed.js','games/line-generator-arrow.js',
  'games/line-generator-proven-siblings.js','games/line-generator-symmetric.js','games/line-generator-sliding-triple.js',
  'games/line-generator-whole-set.js','games/line-generator-transition.js','games/combined-killer-generator.js'
];
function context(){const c={console,Map,Set,WeakMap};c.globalThis=c;c.window=c;vm.createContext(c);for(const f of files)vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);return c;}
function cp(x){return JSON.parse(JSON.stringify(x));}
function subset(p,kinds){const v=cp(p);v.kind='combined';v.kinds=kinds.slice();delete v._singleKind;return v;}
const ids=['killer-thermo','killer-arrow','killer-palindrome','killer-zipper','killer-entropic','killer-modular','killer-renban','killer-dutch-whispers','killer-lockout'];

test('combined Killer compositor inventory covers all nine catalogue variants',()=>{
  const c=context();assert.deepEqual(Object.keys(c.CombinedKillerGenerator.SUPPORTED).sort(),ids.slice().sort());
  for(const id of ids){const v=c.SudokuBank.find(x=>x.id===id);assert.ok(v,id);assert.equal(v.kind,'combined');assert.equal(v.kinds[0],'killer');assert.equal(v.kinds.length,2);}
});

test('all combined Killer pilots are exact and require both component rules',()=>{
  const c=context();
  ids.forEach((id,i)=>{
    const v=c.SudokuBank.find(x=>x.id===id),p=c.CombinedKillerGenerator.makeVariantPilot(c.SudokuGenerator,v,0x4b430100+i*53,'focused');
    assert.equal(p.generation.generatorFamily,'combined-killer-fresh-fill-mrv-compositor',id);
    assert.equal(p.generation.unique,true,id);assert.equal(p.generation.variantEssential,true,id);assert.equal(p.generation.componentEssential,true,id);
    assert.ok(c.KillerGenerator.partitionValid(p.solution,p.data.cages),id);
    assert.equal(c.SudokuGenerator.countVariantSolutions(p.puzzle,p,2),1,id);
    assert.ok(c.SudokuGenerator.countSolutions(p.puzzle,2)>1,id+' classic');
    assert.ok(c.SudokuGenerator.countVariantSolutions(p.puzzle,subset(p,['killer']),2)>1,id+' killer-only');
    assert.ok(c.SudokuGenerator.countVariantSolutions(p.puzzle,subset(p,[p.kinds[1]]),2)>1,id+' secondary-only');
    assert.ok(p.generation.topologyFingerprint.includes('||'),id);
  });
});

test('representative combined Killer pilots replay deterministically and vary by seed',()=>{
  const c=context();
  for(const [j,id] of ['killer-thermo','killer-arrow','killer-lockout'].entries()){
    const v=c.SudokuBank.find(x=>x.id===id),seed=0x4b431000+j*101;
    const a=c.CombinedKillerGenerator.makeVariantPilot(c.SudokuGenerator,v,seed,'focused');
    const b=c.CombinedKillerGenerator.makeVariantPilot(c.SudokuGenerator,v,seed,'focused');
    const d=c.CombinedKillerGenerator.makeVariantPilot(c.SudokuGenerator,v,seed+17,'focused');
    assert.deepEqual(a.puzzle,b.puzzle,id);assert.deepEqual(a.solution,b.solution,id);assert.deepEqual(a.data,b.data,id);
    assert.notEqual(JSON.stringify(a.solution),JSON.stringify(d.solution),id+' solution diversity');
    assert.notEqual(a.generation.topologyFingerprint,d.generation.topologyFingerprint,id+' topology diversity');
  }
});

test('combined Killer compositor remains intentionally unwired from production',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.doesNotMatch(html,/combined-killer-generator-hardening\.js/);
});
