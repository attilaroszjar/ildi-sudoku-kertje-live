'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const H=require('../games/classic-human/index.js');

function blankState(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}

test('canonical classic entry exports Phase E ALS recognizers',()=>{
  assert.equal(typeof H.findAlsXz,'function');
  assert.equal(typeof H.findAlsXyWing,'function');
  assert.equal(typeof H.findAlsChain,'function');
});

test('Phase E finder registry contains each ALS technique exactly once',()=>{
  const ids=H.FINDERS.map(x=>x.id);
  for(const id of ['als-xz','als-xy-wing','als-chain'])assert.equal(ids.filter(x=>x===id).length,1);
  assert.equal(new Set(ids).size,ids.length);
});

test('Phase E priorities remain contract driven',()=>{
  const order=['als-xz','als-xy-wing','als-chain'];
  const priorities=order.map(id=>C.TECHNIQUES[id].priority);
  assert.deepEqual(priorities,[350,360,370]);
  assert.ok(priorities[0]<priorities[1]&&priorities[1]<priorities[2]);
});

test('explicit Phase E technique filters are accepted without guessing',()=>{
  for(const id of ['als-xz','als-xy-wing','als-chain']){
    const r=H.solve(blankState(),{techniques:[id],maxSteps:1,maxCells:2,maxAls:4});
    assert.equal(r.guessRequired,false);
    assert.ok(r.status==='STALLED'||r.status==='SOLVED_LOGICALLY');
  }
});

test('Phase E integration preserves uniqueness policy isolation',()=>{
  const d=H.findNext(blankState(),{techniques:['unique-rectangle'],maxSteps:1});
  assert.equal(d,null);
});
