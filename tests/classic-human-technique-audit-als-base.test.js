'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');
const ALS=require('../games/classic-human/als.js');

function blankState(){return new H.ClassicHumanState('0'.repeat(81));}
function maskOf(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function als(cells,digits,key){return {key:key||cells.join('.')+'|'+digits.join('.'),cells:cells.slice(),mask:maskOf(...digits),digits:digits.slice(),size:cells.length,houseId:'test'};}

test('ALS enumeration accepts exactly n cells with n+1 union candidates',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  s.restrictMask(1,maskOf(1,3));
  const rows=ALS.enumerateAls(s,{maxCells:2});
  const hit=rows.find(x=>x.cells.length===2&&x.cells[0]===0&&x.cells[1]===1);
  assert.ok(hit);
  assert.deepEqual(hit.digits,[1,2,3]);
  assert.equal(hit.size,2);
});

test('ALS enumeration rejects subsets whose union is not n+1 candidates',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  s.restrictMask(1,maskOf(1,2));
  const rows=ALS.enumerateAls(s,{maxCells:2});
  assert.equal(rows.some(x=>x.cells.length===2&&x.cells[0]===0&&x.cells[1]===1),false);
});

test('ALS enumeration is deterministic, deduplicated across overlapping houses, and bounded',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  const a=ALS.enumerateAls(s,{maxCells:1});
  const b=ALS.enumerateAls(s,{maxCells:1});
  assert.deepEqual(a,b);
  const keys=a.map(x=>x.key);
  assert.equal(new Set(keys).size,keys.length);
  assert.equal(keys.filter(k=>k.startsWith('0|')).length,1);
  assert.throws(()=>ALS.enumerateAls(s,{maxCells:0}),/1\.\.4/);
  assert.throws(()=>ALS.enumerateAls(s,{maxCells:5}),/1\.\.4/);
});

test('RCC requires every occurrence of the shared digit in one ALS to see every occurrence in the other',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  s.restrictMask(9,maskOf(1,3));
  const a=als([0],[1,2],'a');
  const b=als([9],[1,3],'b');
  const rcc=ALS.restrictedCommonCandidates(s,a,b);
  assert.deepEqual(rcc.map(x=>x.digit),[1]);
  assert.deepEqual(rcc[0].aCells,[0]);
  assert.deepEqual(rcc[0].bCells,[9]);
});

test('RCC rejects overlap and non-restricted shared candidates',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  s.restrictMask(40,maskOf(1,3));
  const a=als([0],[1,2],'a');
  const far=als([40],[1,3],'far');
  assert.deepEqual(ALS.restrictedCommonCandidates(s,a,far),[]);
  const overlap=als([0],[1,3],'overlap');
  assert.deepEqual(ALS.restrictedCommonCandidates(s,a,overlap),[]);
});

test('RCC pair enumeration is deterministic and only returns non-overlapping ALS pairs with at least one RCC',()=>{
  const s=blankState();
  s.restrictMask(0,maskOf(1,2));
  s.restrictMask(9,maskOf(1,3));
  s.restrictMask(40,maskOf(1,4));
  const list=[als([0],[1,2],'a'),als([9],[1,3],'b'),als([40],[1,4],'c')];
  const first=ALS.enumerateRccPairs(s,{als:list});
  const second=ALS.enumerateRccPairs(s,{als:list});
  assert.deepEqual(first,second);
  assert.ok(first.some(p=>p.a.key==='a'&&p.b.key==='b'&&p.rcc.some(r=>r.digit===1)));
  assert.equal(first.some(p=>p.a.key==='a'&&p.b.key==='c'),false);
});
