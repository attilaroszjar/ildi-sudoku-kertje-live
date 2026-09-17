'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');

const SOLVED='534678912672195348198342567859761423426853791713924856961537284287419635345286179';

function blankState(){
  const grid=Array.from({length:9},()=>Array(9).fill(0));
  return new S.ClassicHumanState(grid);
}
function setMasks(state,entries){
  for(const [cell,digits] of entries)state.restrictMask(cell,digits.reduce((m,d)=>m|C.bitForDigit(d),0));
  return state;
}
function actionKeys(list){return list.map(x=>x.cell+':'+x.digit).sort();}

function assertSoundAgainstSolution(deduction,solution=SOLVED){
  for(const e of deduction.eliminations){
    const expected=Number(solution[e.cell]);
    assert.notEqual(e.digit,expected,`elimination ${e.cell}:${e.digit} must preserve canonical solution`);
  }
  for(const p of deduction.placements){
    assert.equal(p.digit,Number(solution[p.cell]),`placement ${p.cell} must match canonical solution`);
  }
}

test('naked pair eliminates the pair digits from other cells in the same house',()=>{
  const s=blankState();
  const without12=C.FULL_MASK & ~C.bitForDigit(1) & ~C.bitForDigit(2);
  setMasks(s,[
    [0,[1,2]],[1,[1,2]],[2,[1,2,3]],[3,[2,4]],[4,[3,4,5]]
  ]);
  for(let c=5;c<9;c++)s.restrictMask(c,without12);
  const d=S.findNakedPair(s).find(x=>x.houses.includes('r1'));
  assert.ok(d);
  assert.equal(d.techniqueId,'naked-pair');
  assert.deepEqual(actionKeys(d.eliminations),['2:1','2:2','3:2']);
  assert.deepEqual(d.explanationData.digits,[1,2]);
});

test('naked pair near miss is rejected when three cells are restricted to the same pair',()=>{
  const s=blankState();
  setMasks(s,[[0,[1,2]],[1,[1,2]],[2,[1,2]],[3,[1,2,3]]]);
  const row=S.findNakedPair(s).filter(x=>x.houses.includes('r1'));
  assert.equal(row.length,0);
});

test('hidden pair removes non-pair candidates from exactly two shared cells',()=>{
  const s=blankState();
  const without12=C.FULL_MASK & ~C.bitForDigit(1) & ~C.bitForDigit(2);
  setMasks(s,[[0,[1,2,3]],[1,[1,2,4]]]);
  for(let c=2;c<9;c++)s.restrictMask(c,without12);
  const d=S.findHiddenPair(s).find(x=>x.houses.includes('r1')&&x.explanationData.digits[0]===1&&x.explanationData.digits[1]===2);
  assert.ok(d);
  assert.equal(d.techniqueId,'hidden-pair');
  assert.deepEqual(actionKeys(d.eliminations),['0:3','1:4']);
  assert.deepEqual(d.explanationData.digits,[1,2]);
});

test('hidden pair near miss is rejected when one selected digit has a third position',()=>{
  const s=blankState();
  const without12=C.FULL_MASK & ~C.bitForDigit(1) & ~C.bitForDigit(2);
  setMasks(s,[[0,[1,2,3]],[1,[1,2,4]],[2,[1,5]]]);
  for(let c=3;c<9;c++)s.restrictMask(c,without12);
  const pair12=S.findHiddenPair(s).filter(x=>x.houses.includes('r1')&&x.explanationData.digits[0]===1&&x.explanationData.digits[1]===2);
  assert.equal(pair12.length,0);
});

test('naked triple eliminates all union digits from other cells in a house',()=>{
  const s=blankState();
  const without123=C.FULL_MASK & ~C.bitForDigit(1) & ~C.bitForDigit(2) & ~C.bitForDigit(3);
  setMasks(s,[
    [0,[1,2]],[1,[1,3]],[2,[2,3]],[3,[1,2,3,4]],[4,[3,4,5]]
  ]);
  for(let c=5;c<9;c++)s.restrictMask(c,without123);
  const d=S.findNakedTriple(s).find(x=>x.houses.includes('r1'));
  assert.ok(d);
  assert.equal(d.techniqueId,'naked-triple');
  assert.deepEqual(actionKeys(d.eliminations),['3:1','3:2','3:3','4:3']);
});

test('naked triple near miss is rejected when union contains four digits',()=>{
  const s=blankState();
  setMasks(s,[[0,[1,2]],[1,[1,3]],[2,[2,4]],[3,[1,2,3,4,5]]]);
  const row=S.findNakedTriple(s).filter(x=>x.houses.includes('r1'));
  assert.equal(row.length,0);
});

test('hidden triple keeps three selected digits inside exactly three cells',()=>{
  const s=blankState();
  const remove123=C.FULL_MASK & ~C.bitForDigit(1) & ~C.bitForDigit(2) & ~C.bitForDigit(3);
  setMasks(s,[[0,[1,2,4]],[1,[1,3,5]],[2,[2,3,6]]]);
  for(let c=3;c<9;c++)s.restrictMask(c,remove123);
  const d=S.findHiddenTriple(s).find(x=>x.houses.includes('r1'));
  assert.ok(d);
  assert.equal(d.techniqueId,'hidden-triple');
  assert.deepEqual(actionKeys(d.eliminations),['0:4','1:5','2:6']);
  assert.deepEqual(d.explanationData.digits,[1,2,3]);
});

test('subset finder ordering remains deterministic across repeated calls',()=>{
  const s=blankState();
  setMasks(s,[[0,[1,2]],[1,[1,2]],[2,[1,2,3]],[3,[2,4]]]);
  const a=S.findNakedPair(s).map(C.deductionStateKey);
  const b=S.findNakedPair(s).map(C.deductionStateKey);
  assert.deepEqual(a,b);
});

test('subset deductions are solution-sound on a canonical grid-derived state',()=>{
  const grid=SOLVED.split('').map(Number);
  const puzzle=Array.from({length:9},(_,r)=>Array.from({length:9},(_,c)=>grid[r*9+c]));
  for(const idx of [0,1,2,3])puzzle[Math.floor(idx/9)][idx%9]=0;
  const s=new S.ClassicHumanState(puzzle);
  const deductions=[...S.findNakedPair(s),...S.findHiddenPair(s),...S.findNakedTriple(s),...S.findHiddenTriple(s)];
  for(const d of deductions)assertSoundAgainstSolution(d);
});
