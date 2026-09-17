'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');
const U=require('../games/classic-human/uniqueness.js');

function blankState(){return new H.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function maskOf(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function restrictAllExcept(state,allowedCells,removeDigits){
  const allowed=new Set(allowedCells),removeMask=removeDigits.reduce((m,d)=>m|C.bitForDigit(d),0),keep=C.FULL_MASK&~removeMask;
  for(let i=0;i<81;i++)if(!allowed.has(i))state.restrictMask(i,keep);
}
function snapshot(s){return {grid:s.cloneGrid(),masks:Array.from(s.masks),valid:s.valid,steps:s.steps.map(C.deductionStateKey)};}
function rectangleFixture(pair=[1,2],extra=3){
  const s=blankState(),rect=[cell(0,0),cell(0,3),cell(1,0),cell(1,3)],guardian=rect[3];
  restrictAllExcept(s,rect,pair);
  for(let i=0;i<3;i++)s.restrictMask(rect[i],maskOf(...pair));
  s.restrictMask(guardian,maskOf(...pair,extra));
  return {s,rect,guardian,pair};
}

test('unique rectangle deduction is exact, state-safe and digit-relabel invariant',()=>{
  for(const cfg of [{pair:[1,2],extra:3},{pair:[5,7],extra:9}]){
    const {s,guardian,pair}=rectangleFixture(cfg.pair,cfg.extra),before=snapshot(s);
    const d=U.findUniqueRectangle(s).find(x=>x.explanationData.type===1&&x.explanationData.guardian===guardian&&x.explanationData.pair.join(',')===pair.join(','));
    assert.ok(d);
    assert.deepEqual(d.eliminations.map(x=>x.digit).sort((a,b)=>a-b),pair.slice().sort((a,b)=>a-b));
    assert.deepEqual(snapshot(s),before);
    assert.equal(s.apply(d),true);
    assert.equal(s.valid,true);
  }
});

test('unique rectangle Type 1 rejects invalid geometry and multiple guardians',()=>{
  const s=blankState(),rect=[cell(0,0),cell(0,1),cell(1,0),cell(1,1)];
  restrictAllExcept(s,rect,[1,2]);
  s.restrictMask(rect[0],maskOf(1,2));s.restrictMask(rect[1],maskOf(1,2));s.restrictMask(rect[2],maskOf(1,2));s.restrictMask(rect[3],maskOf(1,2,3));
  assert.equal(U.findUniqueRectangle(s).some(x=>x.explanationData.type===1&&rect.every(c=>x.anchors.includes(c))),false);

  const bad=blankState(),badRect=[cell(0,0),cell(0,3),cell(1,0),cell(1,3)];
  restrictAllExcept(bad,badRect,[1,2]);
  bad.restrictMask(badRect[0],maskOf(1,2));
  bad.restrictMask(badRect[1],maskOf(1,2));
  bad.restrictMask(badRect[2],maskOf(1,2,4));
  bad.restrictMask(badRect[3],maskOf(1,2,3));
  assert.equal(U.findUniqueRectangle(bad).some(x=>x.explanationData.type===1&&x.explanationData.pair.join(',')==='1,2'),false);
});

test('unique loop requires a bounded even cycle and one guardian',()=>{
  const s=blankState(),loop=[cell(0,0),cell(0,3),cell(3,3),cell(3,6),cell(6,6),cell(6,0)],guardian=loop[2];
  restrictAllExcept(s,loop,[1,2]);
  for(const c of loop)s.restrictMask(c,c===guardian?maskOf(1,2,3):maskOf(1,2));
  const before=snapshot(s),d=U.findUniqueLoop(s).find(x=>x.explanationData.guardian===guardian&&x.complexity.loopLength===6);
  assert.ok(d);
  assert.deepEqual(d.eliminations,[{cell:guardian,digit:1},{cell:guardian,digit:2}]);
  assert.deepEqual(snapshot(s),before);
  assert.ok(d.complexity.loopLength<=8);
});

test('BUG+1 placement is structurally justified and deterministic',()=>{
  const s=blankState();
  const solved='534678912672195348198342567859761423426853791713924856961537284287419635345286179';
  const shift=d=>d===9?1:d+1,bug=cell(0,0),bugDigit=Number(solved[bug]),bugPair=[bugDigit,shift(bugDigit)],extra=[1,2,3,4,5,6,7,8,9].find(d=>!bugPair.includes(d));
  for(let i=0;i<81;i++){
    const d=Number(solved[i]),digits=[d,shift(d)];if(i===bug)digits.push(extra);s.restrictMask(i,maskOf(...digits));
  }
  const before=snapshot(s),a=U.findBugPlusOne(s),b=U.findBugPlusOne(s);
  assert.equal(a.length,1);
  assert.deepEqual(a,b);
  assert.deepEqual(a[0].placements,[{cell:bug,digit:extra}]);
  assert.deepEqual(snapshot(s),before);
  assert.equal(s.apply(a[0]),true);
  assert.equal(s.valid,true);
});

test('uniqueness techniques are gated out of full solver unless uniqueness is explicitly allowed',()=>{
  const {s}=rectangleFixture();
  const off=H.findNext(s,{techniques:['unique-rectangle'],allowUniqueness:false});
  const on=H.findNext(s,{techniques:['unique-rectangle'],allowUniqueness:true});
  assert.equal(off,null);
  assert.ok(on);
  assert.equal(on.techniqueId,'unique-rectangle');
});

test('all three uniqueness finders are deterministic on identical states',()=>{
  const {s}=rectangleFixture();
  const project=fn=>fn(s).map(C.deductionStateKey);
  assert.deepEqual(project(U.findUniqueRectangle),project(U.findUniqueRectangle));
  assert.deepEqual(project(U.findUniqueLoop),project(U.findUniqueLoop));
  assert.deepEqual(project(U.findBugPlusOne),project(U.findBugPlusOne));
});
