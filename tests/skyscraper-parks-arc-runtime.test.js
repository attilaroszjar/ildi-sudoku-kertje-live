'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'..');

function loadProduction(){
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const miracle='<script src="games/miracle-generator-hardening.js"></script>';
  const arc='<script src="games/skyscraper-parks-arc-runtime.js"></script>';
  assert.ok(html.includes(arc),'arc runtime must be wired in index.html');
  assert.ok(html.indexOf(arc)>html.indexOf(miracle),'arc runtime must load after legacy hybrid hardening');
  const refs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1].split('?')[0]);
  const banks=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
  const first=refs.indexOf('games/sudoku-generator.js');
  const last=refs.indexOf('games/skyscraper-parks-arc-runtime.js');
  assert.ok(first>=0&&last>first,'production generator range must include arc runtime');
  global.window=global;
  global.performance=performance;
  global.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
  for(const ref of [...banks,...refs.slice(first,last+1).filter(ref=>!banks.includes(ref))]){
    const file=path.join(root,ref);if(!fs.existsSync(file))continue;
    vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:ref});
  }
  return global.SudokuGenerator;
}

test('Skyscraper Parks production uses sound arc exact verifier',()=>{
  const G=loadProduction();
  const variant=global.SudokuBank.find(v=>v.id==='skyscraper-parks');
  assert.ok(G&&variant&&global.SkyscraperParksArcRuntime);
  const out=G.make(variant,92001,'expert');
  assert.equal(out.generation.unique,true);
  assert.equal(out.generation.variantEssential,true);
  assert.equal(out.generation.verification,'skyscraper-parks-arc-exact-v1');
  const stats={};
  assert.equal(G.countParkSolutions(out.puzzle,out,2,false,stats),1);
  assert.ok(stats.nodes>0);
  assert.ok(stats.propagationRounds>0);
  assert.ok(stats.domainPrunes>0);
});
