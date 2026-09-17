'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const A=require('../games/classic-human/als.js');

function blankState(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function setMask(state,cellIndex,digits){let mask=0;for(const d of digits)mask|=C.bitForDigit(d);state.restrictMask(cellIndex,mask);}

test('ALS enumerator finds a bivalue singleton as size-one ALS',()=>{
  const s=blankState();
  setMask(s,cell(0,0),[1,2]);
  const als=A.enumerateAls(s,{maxCells:1});
  assert.ok(als.some(x=>x.cells.length===1&&x.cells[0]===cell(0,0)&&x.digits.join(',')==='1,2'));
});

test('ALS enumerator finds two cells with exactly three union candidates',()=>{
  const s=blankState();
  setMask(s,cell(0,0),[1,2]);
  setMask(s,cell(0,1),[2,3]);
  const als=A.enumerateAls(s,{maxCells:2});
  assert.ok(als.some(x=>x.cells.join(',')===[cell(0,0),cell(0,1)].join(',')&&x.digits.join(',')==='1,2,3'));
});

test('ALS enumerator rejects a locked set with union size equal to cell count',()=>{
  const s=blankState();
  setMask(s,cell(0,0),[1,2]);
  setMask(s,cell(0,1),[1,2]);
  const als=A.enumerateAls(s,{maxCells:2});
  assert.equal(als.some(x=>x.cells.join(',')===[cell(0,0),cell(0,1)].join(',')),false);
});

test('RCC requires every occurrence in one ALS to see every occurrence in the other',()=>{
  const s=blankState();
  setMask(s,cell(0,0),[1,2]);
  setMask(s,cell(0,1),[2,3]);
  setMask(s,cell(1,0),[2,4]);
  setMask(s,cell(1,1),[4,5]);
  const a={cells:[cell(0,0),cell(0,1)],mask:C.bitForDigit(1)|C.bitForDigit(2)|C.bitForDigit(3)};
  const b={cells:[cell(1,0),cell(1,1)],mask:C.bitForDigit(2)|C.bitForDigit(4)|C.bitForDigit(5)};
  const r=A.restrictedCommonCandidates(s,a,b);
  assert.deepEqual(r.map(x=>x.digit),[2]);
});

test('RCC rejects a shared digit when one occurrence cannot see the opposite ALS occurrence',()=>{
  const s=blankState();
  setMask(s,cell(0,0),[1,2]);
  setMask(s,cell(0,1),[2,3]);
  setMask(s,cell(4,0),[2,4]);
  setMask(s,cell(4,4),[2,5]);
  const a={cells:[cell(0,0),cell(0,1)],mask:C.bitForDigit(1)|C.bitForDigit(2)|C.bitForDigit(3)};
  const b={cells:[cell(4,0),cell(4,4)],mask:C.bitForDigit(2)|C.bitForDigit(4)|C.bitForDigit(5)};
  assert.equal(A.restrictedCommonCandidates(s,a,b).length,0);
});

test('ALS enumeration is bounded and deterministic',()=>{
  const s=blankState();
  assert.deepEqual(A.enumerateAls(s,{maxCells:3}),A.enumerateAls(s,{maxCells:3}));
  assert.throws(()=>A.enumerateAls(s,{maxCells:5}),/1..4/);
});
