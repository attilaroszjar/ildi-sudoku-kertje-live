'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
function load(){
  const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
  for(const file of ['games/sudoku-bank.js','games/sudoku-generator.js','games/line-generator-core.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
  return ctx;
}
function variant(ctx){const v=ctx.SudokuBank.find(x=>x.id==='whispers');assert.ok(v);return v;}
function solutionKey(grid){return grid.map(row=>row.join('')).join('/');}
function validateWhispers(g){for(const line of g.data.lines){assert.ok(g.LineGeneratorCore?true:true);for(let i=1;i<line.length;i++){const a=g.solution[line[i-1][0]][line[i-1][1]],b=g.solution[line[i][0]][line[i][1]];assert.ok(Math.abs(a-b)>=5);}}}

test('line core validates simple orthogonal paths and rejects repeated or jumping cells',()=>{
  const ctx=load(),core=ctx.LineGeneratorCore;
  assert.equal(core.validateSimplePath([[0,0],[0,1],[1,1]],{minLength:3}),true);
  assert.equal(core.validateSimplePath([[0,0],[0,1],[0,0]],{minLength:3}),false);
  assert.equal(core.validateSimplePath([[0,0],[0,2]],{minLength:2}),false);
});

test('Whispers four-seed pilot is deterministic, fresh, exact unique and variant-essential',()=>{
  const ctx=load(),v=variant(ctx),seeds=[1,17,101,2026],solutions=new Set(),topologies=new Set();
  for(const seed of seeds){
    const a=ctx.LineGeneratorCore.makeWhispersPilot(ctx.SudokuGenerator,v,seed,'focused'),b=ctx.LineGeneratorCore.makeWhispersPilot(ctx.SudokuGenerator,v,seed,'focused');
    assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.data.lines,b.data.lines);
    assert.equal(a.generation.generatorFamily,'line-whispers-fresh-fill-mrv');assert.equal(a.generation.variantEssential,true);assert.equal(a.generation.unique,true);assert.equal(a.generation.pilot,true);
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1);
    for(const line of a.data.lines){assert.equal(ctx.LineGeneratorCore.validateSimplePath(line,{minLength:4,maxLength:7}),true);for(let i=1;i<line.length;i++){const x=a.solution[line[i-1][0]][line[i-1][1]],y=a.solution[line[i][0]][line[i][1]];assert.ok(Math.abs(x-y)>=5);}}
    solutions.add(solutionKey(a.solution));topologies.add(a.generation.topologyFingerprint);
  }
  assert.ok(solutions.size>=3,'pilot must demonstrate fresh completed-solution diversity');
  assert.ok(topologies.size>=3,'pilot must demonstrate topology variation');
});

test('Whispers pilot does not reuse the bank solution or static bank topology for all seeds',()=>{
  const ctx=load(),v=variant(ctx),bankSolution=solutionKey(v.solution),bankTopology=ctx.LineGeneratorCore.topologyFingerprint(v.data.lines),generated=[1,17,101,2026].map(seed=>ctx.LineGeneratorCore.makeWhispersPilot(ctx.SudokuGenerator,v,seed,'focused'));
  assert.ok(generated.some(g=>solutionKey(g.solution)!==bankSolution));
  assert.ok(generated.some(g=>g.generation.topologyFingerprint!==bankTopology));
});

test('bounded impossible transition search fails explicitly with GENERATION_EXHAUSTED',()=>{
  const ctx=load(),solution=ctx.LineGeneratorCore.freshStandardSolution(7).grid;
  assert.throws(()=>ctx.LineGeneratorCore.buildTransitionPath(solution,7,{minLength:4,maxLength:4,maxNodes:20,transition:()=>false}),/GENERATION_EXHAUSTED/);
});
