'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const H=require('../games/classic-human/index.js');

const SOLVED='534678912672195348198342567859761423426853791713924856961537284287419635345286179';

function blankState(){return new H.ClassicHumanState('0'.repeat(81));}
function mask(...digits){return digits.reduce((m,d)=>m|C.bitForDigit(d),0);}
function keys(found){return found.map(C.deductionStateKey);}
function repeatStable(fn){const a=keys(fn()),b=keys(fn()),c=keys(fn());assert.deepEqual(a,b);assert.deepEqual(a,c);return a;}
function removed(index){return SOLVED.slice(0,index)+'0'+SOLVED.slice(index+1);}
function expectedDigit(index){return Number(SOLVED[index]);}
function assertPlacementOnly(found,cell,digit,techniqueId){
  assert.ok(found.length>0,techniqueId);
  for(const d of found){
    assert.equal(d.techniqueId,techniqueId);
    assert.deepEqual(d.eliminations,[]);
    assert.deepEqual(d.placements,[{cell,digit}]);
  }
}
function assertApplySafe(state,deduction){
  const copy=new H.ClassicHumanState(state.cloneGrid());
  for(let i=0;i<81;i++){
    const rc=C.rowCol(i);
    if(!copy.grid[rc[0]][rc[1]]&&copy.masks[i]!==state.masks[i])copy.restrictMask(i,state.masks[i]);
  }
  assert.equal(copy.apply(deduction),true);
  assert.equal(copy.valid,true);
}
function relabelPuzzle(puzzle){
  const map={0:'0',1:'9',2:'8',3:'7',4:'6',5:'5',6:'4',7:'3',8:'2',9:'1'};
  return puzzle.split('').map(x=>map[x]).join('');
}

test('full-house 10/10 slice: positive row/column/box, exact oracle, state safety, determinism, negative and digit symmetry',()=>{
  for(const cell of [0,40,80]){
    const puzzle=removed(cell),digit=expectedDigit(cell),state=new H.ClassicHumanState(puzzle);
    const found=H.findFullHouse(state);
    assertPlacementOnly(found,cell,digit,'full-house');
    repeatStable(()=>H.findFullHouse(new H.ClassicHumanState(puzzle)));
    assertApplySafe(state,found[0]);
    const wrong=Array.from({length:9},(_,i)=>i+1).filter(d=>d!==digit);
    assert.equal(C.countSolutions(puzzle,2),1);
    for(const d of wrong){
      const probe=puzzle.slice(0,cell)+String(d)+puzzle.slice(cell+1);
      assert.equal(C.countSolutions(probe,1),0,`wrong full-house placement ${cell}=${d}`);
    }
  }
  assert.deepEqual(H.findFullHouse(new H.ClassicHumanState(SOLVED)),[]);
  const relabeled=relabelPuzzle(removed(0));
  const relabeledFound=H.findFullHouse(new H.ClassicHumanState(relabeled));
  assertPlacementOnly(relabeledFound,0,5,'full-house');
  const integrated=H.findNext(new H.ClassicHumanState(removed(0)),{});
  assert.equal(integrated.techniqueId,'full-house');
});

test('naked-single 10/10 slice: arbitrary candidate state, state safety, determinism, negative discrimination and integration',()=>{
  const state=blankState();
  state.restrictMask(40,mask(7));
  const found=H.findNakedSingle(state);
  assertPlacementOnly(found,40,7,'naked-single');
  repeatStable(()=>{
    const s=blankState();s.restrictMask(40,mask(7));return H.findNakedSingle(s);
  });
  assertApplySafe(state,found[0]);
  const negative=blankState();negative.restrictMask(40,mask(7,8));
  assert.deepEqual(H.findNakedSingle(negative),[]);
  const integrated=H.findNext(state,{});
  assert.equal(integrated.techniqueId,'naked-single');
  assert.deepEqual(integrated.placements,[{cell:40,digit:7}]);
  const edge=blankState();edge.restrictMask(0,mask(1));
  assertPlacementOnly(H.findNakedSingle(edge),0,1,'naked-single');
});

test('hidden-single 10/10 slice: row column box forms, no false positive, determinism and integration',()=>{
  const cases=[
    {house:'row',target:4,cells:[0,1,2,3,4,5,6,7,8]},
    {house:'column',target:36,cells:[0,9,18,27,36,45,54,63,72]},
    {house:'box',target:20,cells:[0,1,2,9,10,11,18,19,20]},
  ];
  for(const rec of cases){
    const state=blankState();
    for(const cell of rec.cells)state.restrictMask(cell,cell===rec.target?mask(1,9):mask(1,2));
    const found=H.findHiddenSingle(state).filter(d=>d.placements.some(p=>p.cell===rec.target&&p.digit===9));
    assertPlacementOnly(found,rec.target,9,'hidden-single');
    repeatStable(()=>H.findHiddenSingle(state));
    assertApplySafe(state,found[0]);
  }
  const negative=blankState();
  for(let c=0;c<9;c++)negative.restrictMask(c,c<2?mask(1,9):mask(1,2));
  assert.equal(H.findHiddenSingle(negative).some(d=>d.placements.some(p=>p.digit===9)),false);
  const integration=blankState();
  for(let c=0;c<9;c++)integration.restrictMask(c,c===4?mask(1,9):mask(1,2));
  const next=H.findNext(integration,{});
  assert.equal(next.techniqueId,'hidden-single');
  assert.deepEqual(next.placements,[{cell:4,digit:9}]);
});
