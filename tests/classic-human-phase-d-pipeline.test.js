'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const H=require('../games/classic-human/index.js');

function blankState(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}

test('canonical classic entry exports Phase D chain recognizers',()=>{
  assert.equal(typeof H.findXChain,'function');
  assert.equal(typeof H.findXYChain,'function');
  assert.equal(typeof H.findAIC,'function');
  assert.equal(typeof H.findGroupedAic,'function');
});

test('Phase D finder registry contains each chain technique exactly once',()=>{
  const ids=H.FINDERS.map(x=>x.id);
  for(const id of ['x-chain','xy-chain','aic','grouped-aic'])assert.equal(ids.filter(x=>x===id).length,1);
  assert.equal(new Set(ids).size,ids.length);
});

test('Phase D priorities remain contract driven',()=>{
  const order=['x-chain','xy-chain','aic','grouped-aic'];
  const priorities=order.map(id=>C.TECHNIQUES[id].priority);
  assert.deepEqual(priorities,[300,310,320,330]);
  assert.ok(priorities.every((p,i)=>i===0||priorities[i-1]<p));
});

test('explicit Phase D technique filters are accepted without guessing',()=>{
  for(const id of ['x-chain','xy-chain','aic','grouped-aic']){
    const r=H.solve(blankState(),{techniques:[id],maxSteps:1});
    assert.equal(r.guessRequired,false);
    assert.ok(r.status==='STALLED'||r.status==='SOLVED_LOGICALLY');
  }
});

test('uniqueness policy remains independent after Phase D integration',()=>{
  const s=blankState();
  const d=H.findNext(s,{techniques:['unique-rectangle'],maxSteps:1});
  assert.equal(d,null);
});
