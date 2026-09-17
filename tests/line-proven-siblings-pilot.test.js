'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
function load(){
  const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
  const files=['games/sudoku-bank.js'];
  for(let i=2;i<=23;i++)files.push(`games/sudoku-bank-iteration${i}.js`);
  for(let i=30;i<=38;i++)files.push(`games/sudoku-bank-iteration${i}.js`);
  for(let i=50;i<=52;i++)files.push(`games/sudoku-bank-iteration${i}.js`);
  files.push('games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-proven-siblings.js');
  for(const f of files){const p=path.join(root,f);if(fs.existsSync(p))vm.runInContext(fs.readFileSync(p,'utf8'),ctx,{filename:f});}
  return ctx;
}
function solutionKey(grid){return grid.map(r=>r.join('')).join('/');}
function rawLine(entry){return Array.isArray(entry)?entry:entry.cells;}
function assertSemantics(ctx,g,id){
  for(const entry of g.data.lines){const line=rawLine(entry);assert.equal(ctx.LineGeneratorCore.validateSimplePath(line,{minLength:3,maxLength:7}),true);
    const values=line.map(([r,c])=>g.solution[r][c]);
    if(id==='nabner')for(let i=0;i<values.length;i++)for(let j=i+1;j<values.length;j++)assert.ok(Math.abs(values[i]-values[j])>1);
    else if(id==='palindrome')for(let i=0;i<Math.floor(line.length/2);i++)assert.equal(values[i],values[values.length-1-i]);
    else {const lo=Math.min(values[0],values[values.length-1]),hi=Math.max(values[0],values[values.length-1]);assert.notEqual(values[0],values[values.length-1]);for(let i=1;i<values.length-1;i++)assert.ok(values[i]<lo||values[i]>hi);}
  }
}
const SPECS=[['nabner','line-nabner-fresh-fill-mrv'],['palindrome','line-palindrome-fresh-fill-mrv'],['lockout','line-lockout-fresh-fill-mrv']];
const SEEDS=[1,17,101,2026];
for(const [id,family] of SPECS)test(id+' four-seed proven-sibling pilot is exact essential deterministic and diverse',()=>{
  const ctx=load(),v=ctx.SudokuBank.find(x=>x.id===id);assert.ok(v,'missing '+id+' bank entry');const solutions=new Set(),topologies=new Set();
  for(const seed of SEEDS){
    const a=ctx.LineGeneratorProvenSiblings.makeVariantPilot(ctx.SudokuGenerator,v,seed,'focused'),b=ctx.LineGeneratorProvenSiblings.makeVariantPilot(ctx.SudokuGenerator,v,seed,'focused');
    assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.data.lines,b.data.lines);assert.equal(a.generation.generatorFamily,family);assert.equal(a.generation.variantEssential,true);assert.equal(a.generation.unique,true);assert.equal(a.generation.pilot,true);
    assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1);assertSemantics(ctx,a,id);solutions.add(solutionKey(a.solution));topologies.add(a.generation.topologyFingerprint);
  }
  assert.ok(solutions.size>=3);assert.ok(topologies.size>=3);
});

test('proven sibling builders fail explicitly when bounded search is impossible',()=>{
  const ctx=load(),solution=ctx.LineGeneratorCore.freshStandardSolution(7).grid;
  assert.throws(()=>ctx.LineGeneratorProvenSiblings.buildNabnerPath(solution,7,{minLength:9,maxLength:9,maxNodes:1}),/GENERATION_EXHAUSTED/);
  assert.throws(()=>ctx.LineGeneratorProvenSiblings.buildPalindromePath(solution,7,{minLength:9,maxLength:9,maxNodes:1}),/GENERATION_EXHAUSTED/);
  assert.throws(()=>ctx.LineGeneratorProvenSiblings.buildLockoutPath(solution,7,{minLength:8,maxLength:8,maxNodes:1}),/GENERATION_EXHAUSTED/);
});
