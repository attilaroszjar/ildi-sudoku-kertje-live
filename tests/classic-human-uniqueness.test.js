'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const U=require('../games/classic-human/uniqueness.js');

function blankState(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function maskOf(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function restrictAllExcept(state,allowedCells,removeDigits){
  const allowed=new Set(allowedCells),removeMask=removeDigits.reduce((m,d)=>m|C.bitForDigit(d),0),keep=C.FULL_MASK&~removeMask;
  for(let i=0;i<81;i++)if(!allowed.has(i))state.restrictMask(i,keep);
}
function keys(d){return d.eliminations.map(x=>x.cell+':'+x.digit).sort();}

test('unique rectangle type 1 removes the deadly pair from the guardian cell',()=>{
  const s=blankState();
  const rect=[cell(0,0),cell(0,3),cell(1,0),cell(1,3)],guardian=rect[3];
  restrictAllExcept(s,rect,[1,2]);
  s.restrictMask(rect[0],maskOf(1,2));
  s.restrictMask(rect[1],maskOf(1,2));
  s.restrictMask(rect[2],maskOf(1,2));
  s.restrictMask(guardian,maskOf(1,2,3));
  const d=U.findUniqueRectangle(s).find(x=>x.explanationData.type===1&&x.explanationData.guardian===guardian&&x.explanationData.pair.join(',')==='1,2');
  assert.ok(d);
  assert.equal(d.techniqueId,'unique-rectangle');
  assert.deepEqual(keys(d),[guardian+':1',guardian+':2']);
  assert.equal(d.complexity.rectangleType,1);
});

test('unique rectangle type 1 rejects a rectangle with two guardian cells',()=>{
  const s=blankState();
  const rect=[cell(0,0),cell(0,3),cell(1,0),cell(1,3)];
  restrictAllExcept(s,rect,[1,2]);
  s.restrictMask(rect[0],maskOf(1,2));
  s.restrictMask(rect[1],maskOf(1,2));
  s.restrictMask(rect[2],maskOf(1,2,3));
  s.restrictMask(rect[3],maskOf(1,2,4));
  const matches=U.findUniqueRectangle(s).filter(x=>x.explanationData.type===1&&x.anchors.length===4&&rect.every(c=>x.anchors.includes(c))&&x.explanationData.pair.join(',')==='1,2');
  assert.equal(matches.length,0);
});

test('unique loop recognizes a six-cell deadly loop with one guardian',()=>{
  const s=blankState();
  const loop=[cell(0,0),cell(0,3),cell(3,3),cell(3,6),cell(6,6),cell(6,0)],guardian=loop[2];
  restrictAllExcept(s,loop,[1,2]);
  for(const c of loop)s.restrictMask(c,c===guardian?maskOf(1,2,3):maskOf(1,2));
  const d=U.findUniqueLoop(s).find(x=>x.explanationData.guardian===guardian&&x.explanationData.pair.join(',')==='1,2'&&x.complexity.loopLength===6);
  assert.ok(d);
  assert.equal(d.techniqueId,'unique-loop');
  assert.deepEqual(keys(d),[guardian+':1',guardian+':2']);
});

test('unique loop rejects an all-bivalue cycle without a guardian',()=>{
  const s=blankState();
  const loop=[cell(0,0),cell(0,3),cell(3,3),cell(3,6),cell(6,6),cell(6,0)];
  restrictAllExcept(s,loop,[1,2]);
  for(const c of loop)s.restrictMask(c,maskOf(1,2));
  const matches=U.findUniqueLoop(s).filter(x=>x.explanationData.pair.join(',')==='1,2');
  assert.equal(matches.length,0);
});

test('BUG+1 identifies the single extra candidate in an otherwise BUG structure',()=>{
  const s=blankState();
  const solved='534678912672195348198342567859761423426853791713924856961537284287419635345286179';
  const shift=d=>d===9?1:d+1;
  const bug=cell(0,0),bugDigit=Number(solved[bug]),bugPair=[bugDigit,shift(bugDigit)],extra=[1,2,3,4,5,6,7,8,9].find(d=>!bugPair.includes(d));
  for(let i=0;i<81;i++){
    const d=Number(solved[i]),digits=[d,shift(d)];
    if(i===bug)digits.push(extra);
    s.restrictMask(i,maskOf(...digits));
  }
  const d=U.findBugPlusOne(s)[0];
  assert.ok(d);
  assert.equal(d.techniqueId,'bug-plus-one');
  assert.deepEqual(d.placements,[{cell:bug,digit:extra}]);
});

test('BUG+1 rejects a structurally invalid near miss even with one trivalue cell',()=>{
  const s=blankState();
  const bug=cell(0,0);
  for(let i=0;i<81;i++)s.restrictMask(i,i===bug?maskOf(1,8,9):maskOf(8,9));
  assert.equal(U.findBugPlusOne(s).length,0);
});

test('uniqueness recognizers are deterministic',()=>{
  const s=blankState();
  const rect=[cell(0,0),cell(0,3),cell(1,0),cell(1,3)];
  restrictAllExcept(s,rect,[1,2]);
  s.restrictMask(rect[0],maskOf(1,2));s.restrictMask(rect[1],maskOf(1,2));s.restrictMask(rect[2],maskOf(1,2));s.restrictMask(rect[3],maskOf(1,2,3));
  const a=U.findUniqueRectangle(s).map(C.deductionStateKey);
  const b=U.findUniqueRectangle(s).map(C.deductionStateKey);
  assert.deepEqual(a,b);
});
