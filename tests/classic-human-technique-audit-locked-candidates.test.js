'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');

function blankState(){return new H.ClassicHumanState('0'.repeat(81));}
function withoutDigit(mask,digit){return mask&~C.bitForDigit(digit);}
function removeCandidate(state,cell,digit){state.restrictMask(cell,withoutDigit(state.masks[cell],digit));}
function key(d){return C.deductionStateKey(d);}

function pointingFixture(digit=1,extraBoxCell=null){
  const s=blankState();
  const keep=new Set([0,1]);
  if(extraBoxCell!=null)keep.add(extraBoxCell);
  for(const cell of [0,1,2,9,10,11,18,19,20])if(!keep.has(cell))removeCandidate(s,cell,digit);
  return s;
}

function claimingFixture(digit=2,extraLineCell=null){
  const s=blankState();
  const keep=new Set([0,1]);
  if(extraLineCell!=null)keep.add(extraLineCell);
  for(let cell=0;cell<9;cell++)if(!keep.has(cell))removeCandidate(s,cell,digit);
  return s;
}

test('locked pointing detects canonical row confinement and only eliminates outside the box',()=>{
  const s=pointingFixture();
  const found=H.findLockedPointing(s);
  assert.ok(found.length>0);
  const d=found.find(x=>x.techniqueId==='locked-candidate-pointing'&&x.eliminations.some(e=>e.cell===3&&e.digit===1));
  assert.ok(d);
  assert.deepEqual(d.anchors,[0,1]);
  assert.ok(d.eliminations.every(e=>C.rowCol(e.cell)[0]===0&&C.boxIndex(...C.rowCol(e.cell))!==0&&e.digit===1));
});

test('locked pointing rejects a near miss when the box candidates are not confined to one line',()=>{
  const s=pointingFixture(1,9);
  assert.equal(H.findLockedPointing(s).some(d=>d.eliminations.some(e=>e.cell===3&&e.digit===1)),false);
});

test('locked claiming detects canonical line confinement and only eliminates inside the box off the line',()=>{
  const s=claimingFixture();
  const found=H.findLockedClaiming(s);
  const d=found.find(x=>x.techniqueId==='locked-candidate-claiming'&&x.eliminations.some(e=>e.cell===9&&e.digit===2));
  assert.ok(d);
  assert.deepEqual(d.anchors,[0,1]);
  assert.ok(d.eliminations.every(e=>C.boxIndex(...C.rowCol(e.cell))===0&&C.rowCol(e.cell)[0]!==0&&e.digit===2));
});

test('locked claiming rejects a near miss when line candidates span multiple boxes',()=>{
  const s=claimingFixture(2,3);
  assert.equal(H.findLockedClaiming(s).some(d=>d.eliminations.some(e=>e.cell===9&&e.digit===2)),false);
});

test('locked candidate finders are deterministic and deductions apply safely',()=>{
  for(const [make,find] of [[pointingFixture,H.findLockedPointing],[claimingFixture,H.findLockedClaiming]]){
    const a=find(make()),b=find(make());
    assert.deepEqual(a.map(key),b.map(key));
    const s=make(),d=find(s)[0];
    assert.ok(d);
    assert.equal(s.apply(d),true);
    assert.equal(s.valid,true);
  }
});

test('locked candidates are preserved under digit relabeling',()=>{
  const p=pointingFixture(7);
  assert.ok(H.findLockedPointing(p).some(d=>d.eliminations.some(e=>e.cell===3&&e.digit===7)));
  const c=claimingFixture(8);
  assert.ok(H.findLockedClaiming(c).some(d=>d.eliminations.some(e=>e.cell===9&&e.digit===8)));
});

test('full solver integration chooses locked pointing when simpler techniques are excluded',()=>{
  const s=pointingFixture();
  const d=H.findNext(s,{techniques:['locked-candidate-pointing']});
  assert.ok(d);
  assert.equal(d.techniqueId,'locked-candidate-pointing');
});
