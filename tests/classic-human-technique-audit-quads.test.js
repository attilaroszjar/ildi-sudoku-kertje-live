'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const Q=require('../games/classic-human/subset-quads.js');

function blank(){return new S.ClassicHumanState('0'.repeat(81));}
function maskOf(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function snapshot(s){return {grid:s.grid.map(r=>r.slice()),masks:Array.from(s.masks),valid:s.valid,steps:s.steps.slice()};}

function nakedRowFixture(d=[1,2,3,4]){
  const [a,b,c,e]=d,s=blank();
  s.restrictMask(0,maskOf(a,b));
  s.restrictMask(1,maskOf(b,c));
  s.restrictMask(2,maskOf(c,e));
  s.restrictMask(3,maskOf(a,e));
  s.restrictMask(4,maskOf(a,5,6));
  return {s,d,target:4};
}
function nakedColumnFixture(){
  const s=blank(),cells=[0,9,18,27];
  s.restrictMask(cells[0],maskOf(1,2));s.restrictMask(cells[1],maskOf(2,3));
  s.restrictMask(cells[2],maskOf(3,4));s.restrictMask(cells[3],maskOf(1,4));
  s.restrictMask(36,maskOf(2,5,6));
  return {s,target:36};
}
function hiddenRowFixture(d=[1,2,3,4],escapeDigit=null){
  const [a,b,c,e]=d,s=blank(),keep=new Set([0,1,2,3]);
  const extras=[1,2,3,4,5,6,7,8,9].filter(x=>!d.includes(x));
  if(extras.length<4)throw new Error('hidden quad fixture needs four non-quad digits');
  for(let cell=0;cell<9;cell++){
    let m=maskOf(...extras);
    if(keep.has(cell))m|=maskOf(a,b,c,e);
    if(cell===4&&escapeDigit!=null)m|=maskOf(escapeDigit);
    s.restrictMask(cell,m);
  }
  // Each hidden digit occurs only inside four selected cells; one non-quad candidate
  // is retained in each selected cell so the quad has an observable elimination.
  s.restrictMask(0,maskOf(a,b,extras[0]));s.restrictMask(1,maskOf(b,c,extras[1]));
  s.restrictMask(2,maskOf(c,e,extras[2]));s.restrictMask(3,maskOf(a,e,extras[3]));
  return {s,d,extras};
}
function hiddenBoxFixture(){
  const s=blank(),box=[0,1,9,10,2,11,18,19,20],selected=new Set([0,1,9,10]);
  for(const cell of box){
    let m=maskOf(5,6,7,8,9);
    if(selected.has(cell))m|=maskOf(1,2,3,4);
    s.restrictMask(cell,m);
  }
  s.restrictMask(0,maskOf(1,2,5));s.restrictMask(1,maskOf(2,3,6));
  s.restrictMask(9,maskOf(3,4,7));s.restrictMask(10,maskOf(1,4,8));
  return s;
}

test('naked quad finds canonical row eliminations',()=>{
  const f=nakedRowFixture(),d=Q.findNakedQuad(f.s).find(x=>x.explanationData.house==='r1'&&x.anchors.join(',')==='0,1,2,3');
  assert.ok(d);assert.deepEqual(d.explanationData.digits,[1,2,3,4]);
  assert.ok(d.eliminations.some(e=>e.cell===f.target&&e.digit===1));
});

test('naked quad works in columns',()=>{
  const f=nakedColumnFixture(),d=Q.findNakedQuad(f.s).find(x=>x.explanationData.house==='c1');
  assert.ok(d);assert.ok(d.eliminations.some(e=>e.cell===f.target&&e.digit===2));
});

test('naked quad rejects five-digit union near-miss',()=>{
  const s=blank();s.restrictMask(0,maskOf(1,2));s.restrictMask(1,maskOf(2,3));s.restrictMask(2,maskOf(3,4));s.restrictMask(3,maskOf(4,5));s.restrictMask(4,maskOf(1,6));
  assert.equal(Q.findNakedQuad(s).some(d=>d.explanationData.house==='r1'&&d.anchors.join(',')==='0,1,2,3'),false);
});

test('naked quad refuses elimination that would empty an outside cell',()=>{
  const f=nakedRowFixture();f.s.restrictMask(f.target,maskOf(1));
  assert.equal(Q.findNakedQuad(f.s).some(d=>d.explanationData.house==='r1'&&d.anchors.join(',')==='0,1,2,3'),false);
});

test('naked quad is invariant under digit relabeling',()=>{
  const f=nakedRowFixture([4,6,7,9]),d=Q.findNakedQuad(f.s).find(x=>x.explanationData.house==='r1'&&x.anchors.join(',')==='0,1,2,3');
  assert.ok(d);assert.deepEqual(d.explanationData.digits,[4,6,7,9]);
});

test('naked quad finder is deterministic and does not mutate state',()=>{
  const f=nakedRowFixture(),before=snapshot(f.s);
  const a=Q.findNakedQuad(f.s).map(C.deductionStateKey),b=Q.findNakedQuad(f.s).map(C.deductionStateKey);
  assert.deepEqual(a,b);assert.deepEqual(snapshot(f.s),before);
});

test('hidden quad finds canonical row eliminations from selected cells',()=>{
  const f=hiddenRowFixture(),d=Q.findHiddenQuad(f.s).find(x=>x.explanationData.house==='r1'&&x.anchors.join(',')==='0,1,2,3');
  assert.ok(d);assert.deepEqual(d.explanationData.digits,[1,2,3,4]);
  assert.deepEqual(d.eliminations,[{cell:0,digit:5},{cell:1,digit:6},{cell:2,digit:7},{cell:3,digit:8}]);
});

test('hidden quad works in boxes',()=>{
  const s=hiddenBoxFixture(),d=Q.findHiddenQuad(s).find(x=>x.explanationData.house==='b1'&&x.anchors.join(',')==='0,1,9,10');
  assert.ok(d);assert.equal(d.techniqueId,'hidden-quad');
});

test('hidden quad rejects a digit whose candidates escape the four selected cells',()=>{
  const f=hiddenRowFixture([1,2,3,4],1);
  assert.equal(Q.findHiddenQuad(f.s).some(d=>d.explanationData.house==='r1'&&d.explanationData.digits.join(',')==='1,2,3,4'),false);
});

test('hidden quad requires exactly four union cells',()=>{
  const f=hiddenRowFixture([1,2,3,4],4);
  assert.equal(Q.findHiddenQuad(f.s).some(d=>d.explanationData.house==='r1'&&d.explanationData.digits.join(',')==='1,2,3,4'),false);
});

test('hidden quad is invariant under digit relabeling',()=>{
  const f=hiddenRowFixture([2,4,6,8]),d=Q.findHiddenQuad(f.s).find(x=>x.explanationData.house==='r1'&&x.anchors.join(',')==='0,1,2,3');
  assert.ok(d);assert.deepEqual(d.explanationData.digits,[2,4,6,8]);
});

test('hidden quad finder is deterministic and does not mutate state',()=>{
  const f=hiddenRowFixture(),before=snapshot(f.s);
  const a=Q.findHiddenQuad(f.s).map(C.deductionStateKey),b=Q.findHiddenQuad(f.s).map(C.deductionStateKey);
  assert.deepEqual(a,b);assert.deepEqual(snapshot(f.s),before);
});
