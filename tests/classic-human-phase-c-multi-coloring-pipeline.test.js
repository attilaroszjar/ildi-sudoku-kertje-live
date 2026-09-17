'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const Col=require('../games/classic-human/coloring.js');
const H=require('../games/classic-human/index.js');

function blankState(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}

test('canonical classic entry exports multi coloring',()=>{
  assert.equal(H.findMultiColoring,Col.findMultiColoring);
  assert.ok(H.FINDERS.some(x=>x.id==='multi-coloring'));
});

test('multi coloring priority remains contract driven',()=>{
  const simple=C.TECHNIQUES['simple-coloring'];
  const multi=C.TECHNIQUES['multi-coloring'];
  const jelly=C.TECHNIQUES['jellyfish'];
  assert.ok(simple.priority<multi.priority);
  assert.ok(multi.priority<jelly.priority);
});

test('orchestrator accepts multi coloring as an explicit technique filter without guessing',()=>{
  const result=H.solve(blankState(),{techniques:['multi-coloring'],maxSteps:4});
  assert.equal(result.guessRequired,false);
  assert.ok(result.status==='STALLED'||result.status==='SOLVED_LOGICALLY');
});

test('orchestrator finder registry still uses unique technique ids',()=>{
  const ids=H.FINDERS.map(x=>x.id);
  assert.equal(new Set(ids).size,ids.length);
});
