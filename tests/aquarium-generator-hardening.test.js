'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..'),ctx={console};ctx.globalThis=ctx;vm.createContext(ctx);
let files=['games/sudoku-bank.js'];for(let i=2;i<=23;i++)files.push(`games/sudoku-bank-iteration${i}.js`);for(let i=30;i<=38;i++)files.push(`games/sudoku-bank-iteration${i}.js`);files.push('games/sudoku-bank-iteration50.js','games/sudoku-generator.js');files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx));
const v=ctx.SudokuBank.find(x=>x.id==='aquarium');
const seeds=Array.from({length:24},(_,i)=>1000+i*7919);

function sample(difficulty){
  const signatures=new Set(),nodes=[];
  for(const seed of seeds){
    const a=ctx.SudokuGenerator.make(v,seed,difficulty),b=ctx.SudokuGenerator.make(v,seed,difficulty),stats={};
    assert.deepEqual(a,b,'same Aquarium seed must be deterministic');
    assert.equal(a.generation.unique,true,'Aquarium generation must declare uniqueness');
    assert.equal(ctx.SudokuGenerator.countAquariumSolutions(a.puzzle,2,stats),1,'Aquarium puzzle must be solver-unique');
    signatures.add(JSON.stringify({puzzle:a.puzzle,solution:a.solution}));
    nodes.push(stats.nodes);
  }
  nodes.sort((a,b)=>a-b);
  return {distinct:signatures.size,median:nodes[Math.floor(nodes.length/2)]};
}

test('Aquarium seed sample stays fully diverse at every difficulty',()=>{
  for(const d of ['gentle','focused','expert'])assert.equal(sample(d).distinct,seeds.length,d+' should produce one distinct puzzle per sampled seed');
});

test('Aquarium difficulty has meaningful solver-complexity separation',()=>{
  const gentle=sample('gentle'),focused=sample('focused'),expert=sample('expert');
  assert.ok(focused.median>=gentle.median*1.5,'focused median search cost should materially exceed gentle');
  assert.ok(expert.median>=focused.median*1.5,'expert median search cost should materially exceed focused');
});
