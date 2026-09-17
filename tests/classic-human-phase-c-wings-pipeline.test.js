'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');

function blankState(){return new H.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function mask(){let m=0;for(const d of arguments)m|=C.bitForDigit(d);return m;}
function setMask(state,index,digits){state.restrictMask(index,mask.apply(null,digits));return state;}

test('canonical classic entry exports Phase C wing recognizers',()=>{
  assert.equal(typeof H.findXYWing,'function');
  assert.equal(typeof H.findXYZWing,'function');
  assert.equal(typeof H.findWWing,'function');
});

test('findNext selects xy-wing through canonical orchestrator',()=>{
  const s=blankState();
  const pivot=cell(1,1),p1=cell(1,5),p2=cell(5,1),target=cell(5,5);
  setMask(s,pivot,[1,2]);setMask(s,p1,[1,3]);setMask(s,p2,[2,3]);setMask(s,target,[3,4]);
  const d=H.findNext(s,{techniques:['xy-wing']});
  assert.ok(d);
  assert.equal(d.techniqueId,'xy-wing');
  assert.ok(d.eliminations.some(e=>e.cell===target&&e.digit===3));
});

test('wing priorities remain contract driven',()=>{
  assert.ok(C.TECHNIQUES['xy-wing'].priority<C.TECHNIQUES['xyz-wing'].priority);
  assert.ok(C.TECHNIQUES['xyz-wing'].priority<C.TECHNIQUES['w-wing'].priority);
  assert.ok(C.TECHNIQUES['w-wing'].priority<C.TECHNIQUES['swordfish'].priority);
});

test('canonical orchestrator still never guesses',()=>{
  const puzzle='000000000000000000000000000000000000000000000000000000000000000000000000000000000';
  const result=H.solve(puzzle,{techniques:['xy-wing','xyz-wing','w-wing'],maxSteps:10});
  assert.equal(result.guessRequired,false);
  assert.equal(result.status,'STALLED');
});

test('orchestrator finder registry follows unique technique ids',()=>{
  const ids=H.FINDERS.map(x=>x.id);
  assert.equal(new Set(ids).size,ids.length);
  for(const id of ids)assert.ok(C.TECHNIQUES[id],id+' missing contract metadata');
});
