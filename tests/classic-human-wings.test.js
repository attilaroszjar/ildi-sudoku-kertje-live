'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const W=require('../games/classic-human/wings.js');

function blankState(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function setMask(state,idx,digits){return state.restrictMask(idx,digits.reduce((m,d)=>m|C.bitForDigit(d),0));}
function removeDigitExcept(state,digit,keep){
  const allowed=new Set(keep),bit=C.bitForDigit(digit),without=C.FULL_MASK&~bit;
  for(let i=0;i<81;i++)if(!allowed.has(i))state.restrictMask(i,state.masks[i]&without||state.masks[i]);
}
function actionKeys(d){return d.eliminations.map(x=>x.cell+':'+x.digit).sort();}

test('wing cell indexes expose bivalue and trivalue cells',()=>{
  const s=blankState();
  setMask(s,cell(0,0),[1,2]);
  setMask(s,cell(0,1),[1,2,3]);
  assert.ok(W.bivalueCells(s).includes(cell(0,0)));
  assert.ok(W.trivalueCells(s).includes(cell(0,1)));
});

test('xy-wing eliminates shared z from cells seeing both pincers',()=>{
  const s=blankState();
  const pivot=cell(1,1),a=cell(1,4),b=cell(4,1),target=cell(4,4);
  setMask(s,pivot,[1,2]);setMask(s,a,[1,3]);setMask(s,b,[2,3]);setMask(s,target,[3,4]);
  const d=W.findXYWing(s).find(x=>x.explanationData.pivot===pivot&&x.explanationData.z===3&&x.eliminations.some(e=>e.cell===target&&e.digit===3));
  assert.ok(d);
  assert.equal(d.techniqueId,'xy-wing');
  assert.ok(actionKeys(d).includes(target+':3'));
});

test('xy-wing near miss is rejected when a pincer does not see the pivot',()=>{
  const s=blankState();
  const pivot=cell(1,1),a=cell(1,4),b=cell(5,5),target=cell(5,4);
  setMask(s,pivot,[1,2]);setMask(s,a,[1,3]);setMask(s,b,[2,3]);setMask(s,target,[3,4]);
  const matches=W.findXYWing(s).filter(x=>x.explanationData.pivot===pivot&&x.explanationData.z===3&&x.anchors.includes(a)&&x.anchors.includes(b));
  assert.equal(matches.length,0);
});

test('xyz-wing eliminates z from a cell seeing pivot and both pincers',()=>{
  const s=blankState();
  const pivot=cell(1,1),a=cell(1,2),b=cell(2,1),target=cell(2,2);
  setMask(s,pivot,[1,2,3]);setMask(s,a,[1,3]);setMask(s,b,[2,3]);setMask(s,target,[3,4]);
  const d=W.findXYZWing(s).find(x=>x.explanationData.pivot===pivot&&x.explanationData.z===3&&x.eliminations.some(e=>e.cell===target&&e.digit===3));
  assert.ok(d);
  assert.equal(d.techniqueId,'xyz-wing');
  assert.ok(actionKeys(d).includes(target+':3'));
});

test('xyz-wing near miss is rejected when pincer union does not cover pivot digits',()=>{
  const s=blankState();
  const pivot=cell(1,1),a=cell(1,2),b=cell(2,1);
  setMask(s,pivot,[1,2,3]);setMask(s,a,[1,3]);setMask(s,b,[1,3]);
  const matches=W.findXYZWing(s).filter(x=>x.explanationData.pivot===pivot&&x.anchors.includes(a)&&x.anchors.includes(b));
  assert.equal(matches.length,0);
});

test('w-wing uses an external conjugate strong link and eliminates the other wing digit',()=>{
  const s=blankState();
  const a=cell(0,0),b=cell(4,4),e1=cell(0,3),e2=cell(4,3),target=cell(4,0);
  setMask(s,a,[1,2]);setMask(s,b,[1,2]);setMask(s,e1,[1,3]);setMask(s,e2,[1,4]);setMask(s,target,[2,5]);
  const keep=[a,b,e1,e2];
  const bit=C.bitForDigit(1),without=C.FULL_MASK&~bit;
  for(let i=0;i<81;i++)if(!keep.includes(i)&&i!==target&&s.masks[i]&bit)s.restrictMask(i,s.masks[i]&without);
  const d=W.findWWing(s).find(x=>x.explanationData.strongDigit===1&&x.explanationData.eliminationDigit===2&&x.eliminations.some(e=>e.cell===target&&e.digit===2));
  assert.ok(d);
  assert.equal(d.techniqueId,'w-wing');
  assert.ok(actionKeys(d).includes(target+':2'));
});

test('w-wing near miss is rejected without a conjugate link',()=>{
  const s=blankState();
  const a=cell(0,0),b=cell(4,4),e1=cell(0,3),e2=cell(4,3),extra=cell(7,3),target=cell(4,0);
  setMask(s,a,[1,2]);setMask(s,b,[1,2]);setMask(s,e1,[1,3]);setMask(s,e2,[1,4]);setMask(s,extra,[1,5]);setMask(s,target,[2,5]);
  const matches=W.findWWing(s).filter(x=>x.explanationData.strongDigit===1&&x.anchors.includes(a)&&x.anchors.includes(b));
  assert.equal(matches.length,0);
});

test('wing recognizer output is deterministic',()=>{
  const s=blankState();
  const pivot=cell(1,1),a=cell(1,4),b=cell(4,1),target=cell(4,4);
  setMask(s,pivot,[1,2]);setMask(s,a,[1,3]);setMask(s,b,[2,3]);setMask(s,target,[3,4]);
  const x=W.findXYWing(s).map(C.deductionStateKey);
  const y=W.findXYWing(s).map(C.deductionStateKey);
  assert.deepEqual(x,y);
  assert.ok(x.length>0);
});
