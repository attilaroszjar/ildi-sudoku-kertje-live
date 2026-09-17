'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');

function blankState(){return new H.ClassicHumanState('0'.repeat(81));}
function removeCandidate(state,cell,digit){
  const mask=state.masks[cell]&~C.bitForDigit(digit);
  state.restrictMask(cell,mask);
}
function stateWithDigitOnlyAt(digit,allowed){
  const s=blankState(),keep=new Set(allowed);
  for(let cell=0;cell<81;cell++)if(!keep.has(cell))removeCandidate(s,cell,digit);
  return s;
}
function keys(list){return list.map(C.deductionStateKey);}
function hasElim(d,cell,digit){return d.eliminations.some(e=>e.cell===cell&&e.digit===digit);}

function skyscraperFixture(digit=1,nearMiss=false){
  // r1: r1c9--r1c1, r5: r5c9--r5c2. Roofs align on c9.
  // r2c2 sees both free ends (box with r1c1, column with r5c2).
  const allowed=[8,0,44,37,10];
  if(nearMiss)allowed.push(7); // third candidate in r1 destroys its conjugate link.
  return stateWithDigitOnlyAt(digit,allowed);
}
function kiteFixture(digit=2,nearMiss=false){
  // Row r1: join r1c1, free r1c9. Column c2: join r2c2, free r9c2.
  // Joins share box 1; r9c9 sees both free ends.
  const allowed=[0,8,10,73,80];
  if(nearMiss)allowed.push(4); // third candidate in the row destroys conjugacy.
  return stateWithDigitOnlyAt(digit,allowed);
}
function turbotFixture(digit=3,nearMiss=false){
  // Row r1 link r1c5--r1c9; box 5 link r4c5--r5c4.
  // Joins r1c5/r4c5 see each other by column; r5c9 sees both free ends.
  const allowed=[4,8,31,39,44];
  if(nearMiss)allowed.push(40); // third candidate in box 5 destroys its conjugate link.
  return stateWithDigitOnlyAt(digit,allowed);
}
function emptyRectangleFixture(digit=4,nearMiss=false){
  // Box 1 ER cross at row 1 / column 1: r1c2,r1c3,r2c1.
  // Row r5 conjugate r5c1--r5c6 implies elimination at r1c6.
  const allowed=[1,2,9,36,41,5];
  if(nearMiss)allowed.push(10); // r2c2 lies off the ER cross and destroys the rectangle condition.
  return stateWithDigitOnlyAt(digit,allowed);
}

test('skyscraper: canonical geometry, safe elimination, determinism and isolated integration',()=>{
  const s=skyscraperFixture();
  const list=H.findSkyscraper(s);
  const d=list.find(x=>hasElim(x,10,1));
  assert.ok(d);
  assert.equal(d.techniqueId,'skyscraper');
  assert.equal(s.apply(d),true);
  assert.equal(s.valid,true);
  assert.deepEqual(keys(H.findSkyscraper(skyscraperFixture())),keys(H.findSkyscraper(skyscraperFixture())));
  assert.equal(H.findNext(skyscraperFixture(),{techniques:['skyscraper']}).techniqueId,'skyscraper');
});

test('skyscraper rejects a near miss without two conjugate base links',()=>{
  assert.equal(H.findSkyscraper(skyscraperFixture(1,true)).some(d=>hasElim(d,10,1)),false);
});

test('two-string kite: canonical geometry, safe elimination, determinism and isolated integration',()=>{
  const s=kiteFixture();
  const list=H.findTwoStringKite(s);
  const d=list.find(x=>hasElim(x,80,2));
  assert.ok(d);
  assert.equal(d.techniqueId,'two-string-kite');
  assert.equal(s.apply(d),true);
  assert.equal(s.valid,true);
  assert.deepEqual(keys(H.findTwoStringKite(kiteFixture())),keys(H.findTwoStringKite(kiteFixture())));
  assert.equal(H.findNext(kiteFixture(),{techniques:['two-string-kite']}).techniqueId,'two-string-kite');
});

test('two-string kite rejects a near miss when a strong row link is absent',()=>{
  assert.equal(H.findTwoStringKite(kiteFixture(2,true)).some(d=>hasElim(d,80,2)),false);
});

test('turbot fish: canonical row-plus-box geometry, safe elimination, determinism and integration',()=>{
  const s=turbotFixture();
  const list=H.findTurbotFish(s);
  const d=list.find(x=>hasElim(x,44,3));
  assert.ok(d);
  assert.equal(d.techniqueId,'turbot-fish');
  assert.equal(s.apply(d),true);
  assert.equal(s.valid,true);
  assert.deepEqual(keys(H.findTurbotFish(turbotFixture())),keys(H.findTurbotFish(turbotFixture())));
  assert.equal(H.findNext(turbotFixture(),{techniques:['turbot-fish']}).techniqueId,'turbot-fish');
});

test('turbot fish rejects a near miss without the second conjugate link',()=>{
  assert.equal(H.findTurbotFish(turbotFixture(3,true)).some(d=>hasElim(d,44,3)),false);
});

test('empty rectangle: canonical cross, safe elimination, determinism and isolated integration',()=>{
  const s=emptyRectangleFixture();
  const list=H.findEmptyRectangle(s);
  const d=list.find(x=>hasElim(x,5,4));
  assert.ok(d);
  assert.equal(d.techniqueId,'empty-rectangle');
  assert.equal(s.apply(d),true);
  assert.equal(s.valid,true);
  assert.deepEqual(keys(H.findEmptyRectangle(emptyRectangleFixture())),keys(H.findEmptyRectangle(emptyRectangleFixture())));
  assert.equal(H.findNext(emptyRectangleFixture(),{techniques:['empty-rectangle']}).techniqueId,'empty-rectangle');
});

test('empty rectangle rejects a box candidate outside the ER cross',()=>{
  assert.equal(H.findEmptyRectangle(emptyRectangleFixture(4,true)).some(d=>hasElim(d,5,4)),false);
});

test('single-digit pattern deductions are invariant under digit relabeling',()=>{
  assert.ok(H.findSkyscraper(skyscraperFixture(7)).some(d=>hasElim(d,10,7)));
  assert.ok(H.findTwoStringKite(kiteFixture(8)).some(d=>hasElim(d,80,8)));
  assert.ok(H.findTurbotFish(turbotFixture(6)).some(d=>hasElim(d,44,6)));
  assert.ok(H.findEmptyRectangle(emptyRectangleFixture(9)).some(d=>hasElim(d,5,9)));
});
