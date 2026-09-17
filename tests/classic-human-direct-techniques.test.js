'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');

const EASY='530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const SOLUTION='534678912672195348198342567859761423426853791713924856961537284287419635345286179';

function removeDigit(state,index,digit){
  const next=state.candidateMask(index)&~C.bitForDigit(digit);
  state.restrictMask(index,next);
}

test('direct solver deterministically solves a canonical easy classic without guessing',()=>{
  const a=S.solve(EASY),b=S.solve(EASY);
  assert.equal(a.status,'SOLVED_LOGICALLY');
  assert.equal(a.guessRequired,false);
  assert.equal(a.finalState.flat().join(''),SOLUTION);
  assert.ok(a.steps.length>0);
  assert.deepEqual(a.steps,b.steps);
  assert.ok(a.steps.every(step=>['full-house','naked-single','hidden-single','locked-candidate-pointing','locked-candidate-claiming'].includes(step.techniqueId)));
});

test('every direct placement in canonical solve is exact-oracle sound at the state where it is made',()=>{
  const state=new S.ClassicHumanState(EASY);
  let checked=0;
  while(!state.isSolved()){
    const step=S.findNext(state);
    assert.ok(step,'solver should keep progressing');
    for(const p of step.placements){
      const grid=state.cloneGrid(),[r,c]=C.rowCol(p.cell);
      for(let alt=1;alt<=9;alt++){
        if(alt===p.digit)continue;
        const probe=grid.map(row=>row.slice());probe[r][c]=alt;
        assert.equal(C.countSolutions(probe,1),0,`${step.techniqueId} ${p.cell} rejects ${alt}`);
      }
      checked++;
    }
    for(const e of step.eliminations){
      const grid=state.cloneGrid(),[r,c]=C.rowCol(e.cell),probe=grid.map(row=>row.slice());probe[r][c]=e.digit;
      assert.equal(C.countSolutions(probe,1),0,`${step.techniqueId} elimination ${e.cell}!=${e.digit}`);
      checked++;
    }
    assert.equal(state.apply(step),true);
  }
  assert.ok(checked>0);
});

test('full house has priority over equivalent naked single completion',()=>{
  const state=new S.ClassicHumanState(SOLUTION);
  state.grid[0][0]=0;
  state.masks[0]=C.bitForDigit(5);
  const found=S.findNext(state);
  assert.equal(found.techniqueId,'full-house');
  assert.deepEqual(found.placements,[{cell:0,digit:5}]);
});

test('naked single is emitted when one candidate remains without a full-house house',()=>{
  const state=new S.ClassicHumanState('0'.repeat(81));
  state.restrictMask(40,C.bitForDigit(5));
  const found=S.findNext(state,{techniques:['naked-single']});
  assert.equal(found.techniqueId,'naked-single');
  assert.deepEqual(found.placements,[{cell:40,digit:5}]);
});

test('hidden single is emitted when a digit has one position in a house',()=>{
  const state=new S.ClassicHumanState('0'.repeat(81));
  for(let c=1;c<9;c++)removeDigit(state,c,7);
  const found=S.findNext(state,{techniques:['hidden-single']});
  assert.equal(found.techniqueId,'hidden-single');
  assert.deepEqual(found.placements,[{cell:0,digit:7}]);
  assert.ok(found.houses.includes('r1'));
});

test('locked candidate pointing eliminates a box-confined digit from the rest of a line',()=>{
  const state=new S.ClassicHumanState('0'.repeat(81));
  for(const idx of [2,9,10,11,18,19,20])removeDigit(state,idx,1);
  const found=S.findLockedPointing(state).sort(C.compareDeductions)[0];
  assert.ok(found);
  assert.equal(found.techniqueId,'locked-candidate-pointing');
  assert.deepEqual(found.anchors,[0,1]);
  assert.deepEqual(found.eliminations.map(x=>x.cell),[3,4,5,6,7,8]);
  assert.ok(found.eliminations.every(x=>x.digit===1));
});

test('locked candidate claiming eliminates a line-confined digit from the rest of a box',()=>{
  const state=new S.ClassicHumanState('0'.repeat(81));
  for(const idx of [2,3,4,5,6,7,8])removeDigit(state,idx,2);
  const found=S.findLockedClaiming(state).sort(C.compareDeductions)[0];
  assert.ok(found);
  assert.equal(found.techniqueId,'locked-candidate-claiming');
  assert.deepEqual(found.anchors,[0,1]);
  assert.deepEqual(found.eliminations.map(x=>x.cell),[9,10,11,18,19,20]);
  assert.ok(found.eliminations.every(x=>x.digit===2));
});

test('solver stalls instead of guessing when no enabled technique can progress',()=>{
  const result=S.solve(EASY,{techniques:[]});
  assert.equal(result.status,'STALLED');
  assert.equal(result.guessRequired,false);
  assert.equal(result.steps.length,0);
});
