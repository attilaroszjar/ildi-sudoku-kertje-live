'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {performance}=require('node:perf_hooks');

const root=path.resolve(__dirname,'..');
const ctx={console};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const f of [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(x=>x.startsWith('games/sudoku-bank')))vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
for(const f of ['games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-directed.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);

const primitive=ctx.LineGeneratorDirected;
const seeds=[17,29,41,53,67,79,97,113];

function canonicalSolutionFingerprint(grid){
  const map=new Map();let next=1;
  return grid.flat().map(v=>{if(!map.has(v))map.set(v,next++);return map.get(v);}).join('');
}
function topologyFingerprint(lines){return ctx.LineGeneratorCore.topologyFingerprint(lines,{directed:true});}
function percentile(values,p){const a=values.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(a.length*p)-1)];}
function variant(id){const v=ctx.SudokuBank.find(x=>x.id===id);assert.ok(v,`canonical ${id} must exist`);return v;}
function linesOf(v,id){return id==='thermo'?v.data.thermos:v.data.lines;}
function assertDirected(v,id){const cfg=primitive.configFor(id);for(const line of linesOf(v,id))assert.ok(primitive.lineValid(v.solution,line,cfg.transition),`${id} line must satisfy exact directed transition`);}

for(const id of ['thermo','slow-thermo']){
  test(`${id} audit A: 8/8 exact, essential, replayable and structurally diverse`,()=>{
    const v=variant(id),solutions=new Set(),topologies=new Set(),times=[];
    for(const seed of seeds){
      const t0=performance.now(),a=primitive.makeVariantPilot(ctx.SudokuGenerator,v,seed,'focused'),elapsed=performance.now()-t0;
      const b=primitive.makeVariantPilot(ctx.SudokuGenerator,v,seed,'focused');
      times.push(elapsed);
      assert.deepEqual(a.puzzle,b.puzzle,`seed ${seed} puzzle replay`);
      assert.deepEqual(a.solution,b.solution,`seed ${seed} solution replay`);
      assert.deepEqual(a.data,b.data,`seed ${seed} topology replay`);
      assert.equal(a.generation.pilot,true,`seed ${seed} remains pilot`);
      assert.equal(a.generation.variantEssential,true,`seed ${seed} metadata essentiality`);
      assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1,`seed ${seed} variant uniqueness`);
      assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1,`seed ${seed} variant essentiality`);
      assertDirected(a,id);
      solutions.add(canonicalSolutionFingerprint(a.solution));
      topologies.add(topologyFingerprint(linesOf(a,id)));
    }
    assert.equal(solutions.size,seeds.length,'must not collapse to digit-permutation-equivalent solution family');
    assert.equal(topologies.size,seeds.length,'every seed must produce a distinct directed topology in audit A');
    console.log(`DIRECTED_LINE_A ${id} PASS seeds=${seeds.length} structuralSolution=${solutions.size}/${seeds.length} structuralTopology=${topologies.size}/${seeds.length} p95Ms=${percentile(times,0.95).toFixed(1)}`);
  });
}

test('audit A confirms directed-line production wiring',()=>{
  const src=fs.readFileSync(path.join(root,'games/line-generator-directed-hardening.js'),'utf8');
  assert.match(src,/LineGeneratorDirected/);
  assert.match(html,/line-generator-directed\.js/);
});
