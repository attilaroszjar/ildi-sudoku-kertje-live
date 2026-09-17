'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');

function blankState(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function rowCell(r,c){return C.cellIndex(r,c);}
function keepDigitOnlyAt(state,digit,cells){
  const keep=new Set(cells),bit=C.bitForDigit(digit),without=C.FULL_MASK&~bit;
  for(let i=0;i<81;i++)if(!keep.has(i))state.restrictMask(i,without);
  return state;
}

test('main solver exports all Phase B technique finders',()=>{
  for(const name of [
    'findFullHouse','findNakedSingle','findHiddenSingle','findLockedPointing','findLockedClaiming',
    'findNakedPair','findHiddenPair','findNakedTriple','findHiddenTriple',
    'findXWing','findSwordfish','findJellyfish'
  ])assert.equal(typeof S[name],'function',name+' must be exported');
});

test('findNext can select x-wing through the integrated technique pipeline',()=>{
  const s=blankState();
  const anchors=[rowCell(0,1),rowCell(0,7),rowCell(3,1),rowCell(3,7)];
  const targets=[rowCell(5,1),rowCell(5,7)];
  keepDigitOnlyAt(s,5,anchors.concat(targets));
  const d=S.findNext(s,{techniques:['x-wing']});
  assert.ok(d);
  assert.equal(d.techniqueId,'x-wing');
  assert.equal(d.familyId,'fish');
  assert.equal(d.complexity.fishSize,2);
});

test('findNext can select swordfish and jellyfish when explicitly enabled',()=>{
  const sword=blankState();
  keepDigitOnlyAt(sword,4,[
    rowCell(0,1),rowCell(0,4),rowCell(3,4),rowCell(3,7),rowCell(6,1),rowCell(6,7),
    rowCell(8,1),rowCell(8,4),rowCell(8,7)
  ]);
  const sd=S.findNext(sword,{techniques:['swordfish']});
  assert.ok(sd);
  assert.equal(sd.techniqueId,'swordfish');
  assert.equal(sd.complexity.fishSize,3);

  const jelly=blankState();
  keepDigitOnlyAt(jelly,8,[
    rowCell(0,0),rowCell(0,2),rowCell(2,2),rowCell(2,4),rowCell(4,4),rowCell(4,6),rowCell(6,0),rowCell(6,6),
    rowCell(8,0),rowCell(8,2),rowCell(8,4)
  ]);
  const jd=S.findNext(jelly,{techniques:['jellyfish']});
  assert.ok(jd);
  assert.equal(jd.techniqueId,'jellyfish');
  assert.equal(jd.complexity.fishSize,4);
});

test('technique priority remains contract-driven after fish integration',()=>{
  assert.ok(C.TECHNIQUES['naked-pair'].priority<C.TECHNIQUES['x-wing'].priority);
  assert.ok(C.TECHNIQUES['x-wing'].priority<C.TECHNIQUES['swordfish'].priority);
  assert.ok(C.TECHNIQUES['swordfish'].priority<C.TECHNIQUES['jellyfish'].priority);
});

test('solver still never guesses with Phase B pipeline enabled',()=>{
  const s=blankState();
  const result=S.solve(s,{maxSteps:5});
  assert.equal(result.guessRequired,false);
  assert.equal(result.status,'STALLED');
});
