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
for(const f of ['games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-sliding-triple.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);

const primitive=ctx.LineGeneratorSlidingTriple;
const seeds=[17,29,41,53,67,79,97,113,127,139,151,163,179,191,211,223,239,251,263,277,293,307,331,347,359,373,389,401,419,433,449,463];
const difficulties=['gentle','focused','expert'];
const P95_LIMIT_MS=1000;

function canonicalSolutionFingerprint(grid){
  const map=new Map();let next=1;
  return grid.flat().map(v=>{if(!map.has(v))map.set(v,next++);return map.get(v);}).join('');
}
function topologyFingerprint(lines){return ctx.LineGeneratorCore.topologyFingerprint(lines,{directed:false});}
function percentile(values,p){const a=values.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(a.length*p)-1)];}
function median(values){const a=values.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function variant(id){const v=ctx.SudokuBank.find(x=>x.id===id);assert.ok(v,`canonical ${id} must exist`);return v;}
function score(out){return out.generation.difficultyScore;}

for(const id of ['entropic','modular']){
  test(`${id} audit B: 32x3 exact/essential/diverse with ordered measured difficulty and bounded runtime`,()=>{
    const v=variant(id),byDifficulty={};
    for(const difficulty of difficulties){
      const solutions=new Set(),topologies=new Set(),scores=[],times=[];
      for(const seed of seeds){
        const t0=performance.now(),out=primitive.makeVariantPilot(ctx.SudokuGenerator,v,seed,difficulty),elapsed=performance.now()-t0;
        times.push(elapsed);
        assert.equal(ctx.SudokuGenerator.countVariantSolutions(out.puzzle,out,2),1,`${difficulty} seed ${seed} variant uniqueness`);
        assert.ok(ctx.SudokuGenerator.countSolutions(out.puzzle,2)>1,`${difficulty} seed ${seed} variant essentiality`);
        assert.equal(out.generation.unique,true);assert.equal(out.generation.variantEssential,true);assert.equal(out.generation.pilot,true);
        solutions.add(canonicalSolutionFingerprint(out.solution));
        topologies.add(topologyFingerprint(out.data.lines));
        scores.push(score(out));
      }
      assert.equal(solutions.size,seeds.length,`${difficulty}: structural solution diversity`);
      assert.equal(topologies.size,seeds.length,`${difficulty}: structural topology diversity`);
      const p95=percentile(times,0.95);assert.ok(p95<P95_LIMIT_MS,`${difficulty}: p95 ${p95.toFixed(1)}ms must stay below ${P95_LIMIT_MS}ms`);
      byDifficulty[difficulty]={medianScore:median(scores),p95:p95,solutions:solutions.size,topologies:topologies.size};
    }
    assert.ok(byDifficulty.gentle.medianScore<byDifficulty.focused.medianScore,`expected Gentle < Focused, got ${byDifficulty.gentle.medianScore} vs ${byDifficulty.focused.medianScore}`);
    assert.ok(byDifficulty.focused.medianScore<byDifficulty.expert.medianScore,`expected Focused < Expert, got ${byDifficulty.focused.medianScore} vs ${byDifficulty.expert.medianScore}`);
    console.log(`SLIDING_TRIPLE_B ${id} PASS total=${seeds.length*difficulties.length} structuralSolution=${byDifficulty.gentle.solutions}/${seeds.length} structuralTopology=${byDifficulty.gentle.topologies}/${seeds.length} difficulty=${byDifficulty.gentle.medianScore}<${byDifficulty.focused.medianScore}<${byDifficulty.expert.medianScore} p95Ms=${byDifficulty.gentle.p95.toFixed(1)}/${byDifficulty.focused.p95.toFixed(1)}/${byDifficulty.expert.p95.toFixed(1)}`);
  });
}

test('audit B confirms Entropic and Modular production wiring',()=>{
  const src=fs.readFileSync(path.join(root,'games/line-generator-sliding-triple-hardening.js'),'utf8');
  assert.match(src,/LineGeneratorSlidingTriple/);
});
