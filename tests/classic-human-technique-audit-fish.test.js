'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');

function blankState(){return new H.ClassicHumanState('0'.repeat(81));}
function removeCandidate(state,cell,digit){state.restrictMask(cell,state.masks[cell]&~C.bitForDigit(digit));}
function keyList(list){return list.map(C.deductionStateKey);}

function fishFixture(size,digit=1){
  const s=blankState();
  const patterns=size===2?[[0,1],[0,1]]:size===3?[[0,1],[1,2],[0,2]]:[[0,1],[1,2],[2,3],[0,3]];
  for(let r=0;r<size;r++){
    const keep=new Set(patterns[r]);
    for(let c=0;c<9;c++)if(!keep.has(c))removeCandidate(s,C.cellIndex(r,c),digit);
  }
  return s;
}

function findForSize(size){return size===2?H.findXWing:size===3?H.findSwordfish:H.findJellyfish;}
function idForSize(size){return size===2?'x-wing':size===3?'swordfish':'jellyfish';}

test('standard fish detect canonical row-based X-Wing Swordfish and Jellyfish and eliminate only from cover columns outside bases',()=>{
  for(const size of [2,3,4]){
    const s=fishFixture(size,1),find=findForSize(size),id=idForSize(size);
    const d=find(s).find(x=>x.techniqueId===id&&x.explanationData.orientation==='rows'&&x.explanationData.digit===1);
    assert.ok(d,id);
    assert.equal(d.complexity.fishSize,size);
    assert.equal(d.explanationData.baseLines.length,size);
    assert.equal(d.explanationData.coverLines.length,size);
    assert.ok(d.eliminations.length>0,id);
    assert.ok(d.eliminations.every(e=>C.rowCol(e.cell)[0]>=size&&d.explanationData.coverLines.includes(C.rowCol(e.cell)[1])&&e.digit===1),id);
    assert.equal(s.apply(d),true,id);
    assert.equal(s.valid,true,id);
  }
});

test('standard fish support transposed column orientation',()=>{
  const s=blankState(),digit=2;
  const keepByCol=[[0,1],[0,1]];
  for(let c=0;c<2;c++){
    const keep=new Set(keepByCol[c]);
    for(let r=0;r<9;r++)if(!keep.has(r))removeCandidate(s,C.cellIndex(r,c),digit);
  }
  const d=H.findXWing(s).find(x=>x.explanationData.orientation==='columns'&&x.explanationData.digit===digit);
  assert.ok(d);
  assert.ok(d.eliminations.every(e=>C.rowCol(e.cell)[1]>=2&&[0,1].includes(C.rowCol(e.cell)[0])&&e.digit===digit));
});

test('standard fish reject near misses whose selected base lines span too many cover positions',()=>{
  const s=blankState(),digit=3;
  for(let c=0;c<9;c++)if(![0,1].includes(c))removeCandidate(s,C.cellIndex(0,c),digit);
  for(let c=0;c<9;c++)if(![1,2].includes(c))removeCandidate(s,C.cellIndex(1,c),digit);
  const bad=H.findXWing(s).filter(d=>d.explanationData.orientation==='rows'&&d.explanationData.digit===digit&&d.explanationData.baseLines.includes(0)&&d.explanationData.baseLines.includes(1));
  assert.equal(bad.length,0);
});

test('standard fish are deterministic on identical candidate states',()=>{
  for(const size of [2,3,4]){
    const find=findForSize(size);
    assert.deepEqual(keyList(find(fishFixture(size,4))),keyList(find(fishFixture(size,4))),idForSize(size));
  }
});

test('standard fish are preserved under digit relabeling',()=>{
  for(const size of [2,3,4]){
    const digit=7,find=findForSize(size),id=idForSize(size);
    const d=find(fishFixture(size,digit)).find(x=>x.techniqueId===id&&x.explanationData.orientation==='rows'&&x.explanationData.digit===digit);
    assert.ok(d,id);
    assert.ok(d.eliminations.every(e=>e.digit===digit),id);
  }
});

test('full solver integration can select each standard fish when explicitly isolated',()=>{
  for(const size of [2,3,4]){
    const id=idForSize(size),d=H.findNext(fishFixture(size,5),{techniques:[id]});
    assert.ok(d,id);
    assert.equal(d.techniqueId,id);
  }
});
