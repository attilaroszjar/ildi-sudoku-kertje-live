'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');

function blankState(){return new H.ClassicHumanState('0'.repeat(81));}
function maskOf(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function removeDigits(state,cell,digits){
  let mask=state.masks[cell];
  for(const d of digits)mask&=~C.bitForDigit(d);
  state.restrictMask(cell,mask);
}
function keyList(list){return list.map(C.deductionStateKey);}

function nakedPairFixture(){
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  s.restrictMask(1,maskOf(1,2));
  return s;
}
function hiddenPairFixture(){
  const s=blankState();
  s.restrictMask(0,maskOf(1,2,3));
  s.restrictMask(1,maskOf(1,2,4));
  for(let cell=2;cell<9;cell++)removeDigits(s,cell,[1,2]);
  return s;
}
function nakedTripleFixture(){
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  s.restrictMask(1,maskOf(1,3));
  s.restrictMask(2,maskOf(2,3));
  return s;
}
function hiddenTripleFixture(){
  const s=blankState();
  s.restrictMask(0,maskOf(1,2,3,4));
  s.restrictMask(1,maskOf(1,2,3,5));
  s.restrictMask(2,maskOf(1,2,3,6));
  for(let cell=3;cell<9;cell++)removeDigits(s,cell,[1,2,3]);
  return s;
}

test('naked pair detects canonical subset, eliminates only pair digits outside anchors, and applies safely',()=>{
  const s=nakedPairFixture();
  const found=H.findNakedPair(s);
  const d=found.find(x=>x.houses.includes('r1')&&x.anchors.length===2&&x.anchors[0]===0&&x.anchors[1]===1);
  assert.ok(d);
  assert.ok(d.eliminations.some(e=>e.cell===2&&e.digit===1));
  assert.ok(d.eliminations.some(e=>e.cell===2&&e.digit===2));
  assert.ok(d.eliminations.every(e=>e.cell!==0&&e.cell!==1&&(e.digit===1||e.digit===2)));
  assert.equal(s.apply(d),true);
  assert.equal(s.valid,true);
});

test('hidden pair detects canonical subset and removes only non-pair candidates from the pair cells',()=>{
  const s=hiddenPairFixture();
  const d=H.findHiddenPair(s).find(x=>x.houses.includes('r1')&&x.anchors.includes(0)&&x.anchors.includes(1));
  assert.ok(d);
  assert.deepEqual(d.eliminations,[{cell:0,digit:3},{cell:1,digit:4}]);
  assert.equal(s.apply(d),true);
  assert.equal(s.valid,true);
});

test('naked triple detects canonical three-cell union and applies safely',()=>{
  const s=nakedTripleFixture();
  const d=H.findNakedTriple(s).find(x=>x.houses.includes('r1')&&x.anchors.length===3&&x.anchors.includes(0)&&x.anchors.includes(1)&&x.anchors.includes(2));
  assert.ok(d);
  for(const digit of [1,2,3])assert.ok(d.eliminations.some(e=>e.cell===3&&e.digit===digit));
  assert.ok(d.eliminations.every(e=>![0,1,2].includes(e.cell)&&[1,2,3].includes(e.digit)));
  assert.equal(s.apply(d),true);
  assert.equal(s.valid,true);
});

test('hidden triple detects canonical three-digit confinement and removes only extras from anchor cells',()=>{
  const s=hiddenTripleFixture();
  const d=H.findHiddenTriple(s).find(x=>x.houses.includes('r1')&&x.anchors.length===3&&x.anchors.includes(0)&&x.anchors.includes(1)&&x.anchors.includes(2));
  assert.ok(d);
  assert.deepEqual(d.eliminations,[{cell:0,digit:4},{cell:1,digit:5},{cell:2,digit:6}]);
  assert.equal(s.apply(d),true);
  assert.equal(s.valid,true);
});

test('subset finders reject canonical near misses',()=>{
  const np=blankState();
  np.restrictMask(0,maskOf(1,2));
  np.restrictMask(1,maskOf(1,2,3));
  assert.equal(H.findNakedPair(np).some(d=>d.houses.includes('r1')&&d.anchors.includes(0)&&d.anchors.includes(1)),false);

  const nt=blankState();
  nt.restrictMask(0,maskOf(1,2));
  nt.restrictMask(1,maskOf(1,3));
  nt.restrictMask(2,maskOf(2,3,4));
  assert.equal(H.findNakedTriple(nt).some(d=>d.houses.includes('r1')&&d.anchors.includes(0)&&d.anchors.includes(1)&&d.anchors.includes(2)),false);

  const hp=blankState();
  hp.restrictMask(0,maskOf(1,2,3));
  hp.restrictMask(1,maskOf(1,2,4));
  hp.restrictMask(2,maskOf(1,5));
  for(let cell=3;cell<9;cell++)removeDigits(hp,cell,[1,2]);
  assert.equal(H.findHiddenPair(hp).some(d=>d.houses.includes('r1')&&d.anchors.length===2&&d.anchors.includes(0)&&d.anchors.includes(1)),false);

  const ht=blankState();
  ht.restrictMask(0,maskOf(1,2,3,4));
  ht.restrictMask(1,maskOf(1,2,3,5));
  ht.restrictMask(2,maskOf(1,2,3,6));
  ht.restrictMask(3,maskOf(1,7));
  for(let cell=4;cell<9;cell++)removeDigits(ht,cell,[1,2,3]);
  assert.equal(H.findHiddenTriple(ht).some(d=>d.houses.includes('r1')&&d.anchors.length===3&&d.anchors.includes(0)&&d.anchors.includes(1)&&d.anchors.includes(2)),false);
});

test('subset finders are deterministic on identical candidate states',()=>{
  for(const [make,find] of [
    [nakedPairFixture,H.findNakedPair],
    [hiddenPairFixture,H.findHiddenPair],
    [nakedTripleFixture,H.findNakedTriple],
    [hiddenTripleFixture,H.findHiddenTriple],
  ]) assert.deepEqual(keyList(find(make())),keyList(find(make())));
});

test('subset deductions are preserved under digit relabeling when fixtures are constructed with relabeled digits',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(7,8));
  s.restrictMask(1,maskOf(7,8));
  const pair=H.findNakedPair(s).find(d=>d.houses.includes('r1')&&d.anchors.includes(0)&&d.anchors.includes(1));
  assert.ok(pair);
  assert.ok(pair.eliminations.some(e=>e.cell===2&&e.digit===7));
  assert.ok(pair.eliminations.some(e=>e.cell===2&&e.digit===8));

  const t=blankState();
  t.restrictMask(0,maskOf(4,5));
  t.restrictMask(1,maskOf(4,6));
  t.restrictMask(2,maskOf(5,6));
  const triple=H.findNakedTriple(t).find(d=>d.houses.includes('r1')&&d.anchors.includes(0)&&d.anchors.includes(1)&&d.anchors.includes(2));
  assert.ok(triple);
  for(const digit of [4,5,6])assert.ok(triple.eliminations.some(e=>e.cell===3&&e.digit===digit));
});

test('full solver integration can select each subset finder when explicitly isolated',()=>{
  for(const [id,make] of [
    ['naked-pair',nakedPairFixture],
    ['hidden-pair',hiddenPairFixture],
    ['naked-triple',nakedTripleFixture],
    ['hidden-triple',hiddenTripleFixture],
  ]){
    const d=H.findNext(make(),{techniques:[id]});
    assert.ok(d,id);
    assert.equal(d.techniqueId,id);
  }
});
