'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');

function blankState(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function keepDigitOnlyAt(state,digit,cells){
  const keep=new Set(cells),bit=C.bitForDigit(digit),without=C.FULL_MASK&~bit;
  for(let i=0;i<81;i++)if(!keep.has(i))state.restrictMask(i,without);
  return state;
}

test('Phase C recognizers are exported by the main classic solver',()=>{
  for(const name of ['findSkyscraper','findTwoStringKite','findTurbotFish','findEmptyRectangle'])assert.equal(typeof S[name],'function');
});

test('findNext can select a skyscraper when explicitly enabled',()=>{
  const s=blankState();
  keepDigitOnlyAt(s,5,[cell(0,1),cell(0,4),cell(3,1),cell(3,5),cell(2,5)]);
  const d=S.findNext(s,{techniques:['skyscraper']});
  assert.ok(d);
  assert.equal(d.techniqueId,'skyscraper');
});

test('findNext can select empty rectangle when explicitly enabled',()=>{
  const s=blankState();
  const boxCross=[cell(3,4),cell(3,5),cell(4,4),cell(5,4)];
  const strong=[cell(6,4),cell(6,8)];
  const target=cell(3,8);
  keepDigitOnlyAt(s,1,boxCross.concat(strong,[target]));
  const d=S.findNext(s,{techniques:['empty-rectangle']});
  assert.ok(d);
  assert.equal(d.techniqueId,'empty-rectangle');
  assert.ok(d.eliminations.some(e=>e.cell===target&&e.digit===1));
});

test('Phase C priorities remain contract driven',()=>{
  assert.ok(C.TECHNIQUES['x-wing'].priority<C.TECHNIQUES.skyscraper.priority);
  assert.ok(C.TECHNIQUES.skyscraper.priority<C.TECHNIQUES['two-string-kite'].priority);
  assert.ok(C.TECHNIQUES['two-string-kite'].priority<C.TECHNIQUES['turbot-fish'].priority);
  assert.ok(C.TECHNIQUES['turbot-fish'].priority<C.TECHNIQUES['empty-rectangle'].priority);
  assert.ok(C.TECHNIQUES['empty-rectangle'].priority<C.TECHNIQUES.swordfish.priority);
});

test('solver still reports no guessing with Phase C techniques enabled',()=>{
  const puzzle='000000000000000000000000000000000000000000000000000000000000000000000000000000000';
  const result=S.solve(puzzle,{maxSteps:4,techniques:['skyscraper','two-string-kite','turbot-fish','empty-rectangle']});
  assert.equal(result.guessRequired,false);
  assert.ok(['STALLED','SOLVED_LOGICALLY'].includes(result.status));
});
