'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),performance=require('node:perf_hooks').performance;
const root=path.join(__dirname,'..');
function load(){const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);const files=['games/sudoku-bank.js'];for(let i=2;i<=23;i++)files.push(`games/sudoku-bank-iteration${i}.js`);for(let i=30;i<=38;i++)files.push(`games/sudoku-bank-iteration${i}.js`);for(let i=50;i<=52;i++)files.push(`games/sudoku-bank-iteration${i}.js`);files.push('games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-proven-siblings.js');for(const f of files){const p=path.join(root,f);if(fs.existsSync(p))vm.runInContext(fs.readFileSync(p,'utf8'),ctx,{filename:f});}return ctx;}
function median(xs){const a=xs.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function p95(xs){const a=xs.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(a.length*0.95)-1)];}
function rawLine(entry){return Array.isArray(entry)?entry:entry.cells;}
const SEEDS=[3,7,11,17,23,29,37,43,53,61,71,83,97,109,127,149,173,197,223,251,281,313,347,383,421,461,503,547,593,641,691,743];

test('Lockout expert 29-clue target stays expert while bounding runtime tail',()=>{
  const ctx=load(),v=ctx.SudokuBank.find(x=>x.id==='lockout');assert.ok(v);const times=[],scores=[];let maxMs=0;
  for(const seed of SEEDS){
    const t0=performance.now(),a=ctx.LineGeneratorProvenSiblings.makeVariantPilot(ctx.SudokuGenerator,v,seed,'expert',{targets:{gentle:40,focused:32,expert:29},initialLines:4}),elapsed=performance.now()-t0;times.push(elapsed);scores.push(a.generation.difficultyScore);if(elapsed>maxMs)maxMs=elapsed;
    assert.equal(a.generation.generatorFamily,'line-lockout-fresh-fill-mrv');assert.equal(a.generation.clues,29);assert.ok(a.generation.lineCount>=4);assert.equal(ctx.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);assert.ok(ctx.SudokuGenerator.countSolutions(a.puzzle,2)>1);
    for(const entry of a.data.lines){const line=rawLine(entry),values=line.map(([r,c])=>a.solution[r][c]),lo=Math.min(values[0],values[values.length-1]),hi=Math.max(values[0],values[values.length-1]);for(let i=1;i<values.length-1;i++)assert.ok(values[i]<lo||values[i]>hi);}
  }
  const summary={seeds:SEEDS.length,medianScore:median(scores),p95Ms:p95(times),maxMs};console.log('LOCKOUT_EXPERT_CLUE_TARGET_PILOT '+JSON.stringify(summary));
  assert.ok(summary.medianScore>114,'expert median must stay above observed focused median 114');assert.ok(summary.p95Ms<1000);
});
