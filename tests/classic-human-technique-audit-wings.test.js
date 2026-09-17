'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');

function blankState(){return new H.ClassicHumanState('0'.repeat(81));}
function maskOf(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function keyList(list){return list.map(C.deductionStateKey);}

function xyWingFixture(){
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  s.restrictMask(1,maskOf(1,3));
  s.restrictMask(9,maskOf(2,3));
  return s;
}
function xyzWingFixture(){
  const s=blankState();
  s.restrictMask(0,maskOf(1,2,3));
  s.restrictMask(1,maskOf(1,3));
  s.restrictMask(9,maskOf(2,3));
  return s;
}
function wWingFixture({secondWing=maskOf(1,2)}={}){
  const s=blankState();
  // Wings do not see each other. Cell 13 sees strong-link endpoint 4;
  // cell 26 sees endpoint 8. Cell 17 sees both wings for the elimination.
  s.restrictMask(13,maskOf(1,2));
  s.restrictMask(26,secondWing);
  // Conjugate strong link for digit 1 in row 1: cells 4 and 8 only.
  for(let cell=0;cell<9;cell++){
    if(cell===4||cell===8)continue;
    s.restrictMask(cell,s.masks[cell]&~C.bitForDigit(1));
  }
  return s;
}

test('XY-Wing detects canonical bivalue pivot/pincer pattern and eliminates only common-peer z candidates',()=>{
  const s=xyWingFixture();
  const d=H.findXYWing(s).find(x=>x.anchors.includes(0)&&x.anchors.includes(1)&&x.anchors.includes(9)&&x.explanationData.z===3);
  assert.ok(d);
  assert.ok(d.eliminations.some(e=>e.cell===10&&e.digit===3));
  assert.ok(d.eliminations.every(e=>e.digit===3));
  assert.equal(s.apply(d),true);
  assert.equal(s.valid,true);
});

test('XY-Wing rejects near miss when pivot does not see both pincers',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  s.restrictMask(1,maskOf(1,3));
  s.restrictMask(40,maskOf(2,3));
  assert.equal(H.findXYWing(s).some(d=>d.anchors.includes(0)&&d.anchors.includes(1)&&d.anchors.includes(40)),false);
});

test('XYZ-Wing detects canonical trivalue pivot pattern and requires target to see pivot and both pincers',()=>{
  const s=xyzWingFixture();
  const d=H.findXYZWing(s).find(x=>x.anchors.includes(0)&&x.anchors.includes(1)&&x.anchors.includes(9)&&x.explanationData.z===3);
  assert.ok(d);
  assert.ok(d.eliminations.some(e=>e.cell===10&&e.digit===3));
  assert.ok(d.eliminations.every(e=>e.digit===3));
  assert.equal(s.apply(d),true);
  assert.equal(s.valid,true);
});

test('XYZ-Wing rejects near miss when a pincer contains a candidate outside the pivot set',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2,3));
  s.restrictMask(1,maskOf(1,4));
  s.restrictMask(9,maskOf(2,3));
  assert.equal(H.findXYZWing(s).some(d=>d.anchors.includes(0)&&d.anchors.includes(1)&&d.anchors.includes(9)),false);
});

test('W-Wing uses identical bivalue wings plus an external conjugate strong link',()=>{
  const s=wWingFixture();
  const d=H.findWWing(s).find(x=>x.techniqueId==='w-wing'&&x.explanationData.strongDigit===1&&x.explanationData.eliminationDigit===2&&x.explanationData.wings.includes(13)&&x.explanationData.wings.includes(26));
  assert.ok(d);
  assert.ok(d.eliminations.some(e=>e.cell===17&&e.digit===2));
  assert.ok(d.eliminations.every(e=>e.digit===2));
  assert.equal(s.apply(d),true);
  assert.equal(s.valid,true);
});

test('W-Wing rejects near miss when wing candidate pairs differ',()=>{
  const s=wWingFixture({secondWing:maskOf(1,3)});
  assert.equal(H.findWWing(s).some(d=>d.explanationData&&d.explanationData.wings&&d.explanationData.wings.includes(13)&&d.explanationData.wings.includes(26)),false);
});

test('wing finders are deterministic on identical candidate states',()=>{
  for(const [make,find] of [[xyWingFixture,H.findXYWing],[xyzWingFixture,H.findXYZWing],[wWingFixture,H.findWWing]]){
    assert.deepEqual(keyList(find(make())),keyList(find(make())));
  }
});

test('wing logic is preserved under digit relabeling',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(4,5));
  s.restrictMask(1,maskOf(4,6));
  s.restrictMask(9,maskOf(5,6));
  const xy=H.findXYWing(s).find(d=>d.explanationData&&d.explanationData.z===6);
  assert.ok(xy);
  assert.ok(xy.eliminations.some(e=>e.cell===10&&e.digit===6));

  const t=blankState();
  t.restrictMask(0,maskOf(4,5,6));
  t.restrictMask(1,maskOf(4,6));
  t.restrictMask(9,maskOf(5,6));
  const xyz=H.findXYZWing(t).find(d=>d.explanationData&&d.explanationData.z===6);
  assert.ok(xyz);
  assert.ok(xyz.eliminations.some(e=>e.cell===10&&e.digit===6));
});

test('full solver integration can select each wing finder when explicitly isolated',()=>{
  for(const [id,make] of [['xy-wing',xyWingFixture],['xyz-wing',xyzWingFixture],['w-wing',wWingFixture]]){
    const d=H.findNext(make(),{techniques:[id]});
    assert.ok(d,id);
    assert.equal(d.techniqueId,id);
  }
});
