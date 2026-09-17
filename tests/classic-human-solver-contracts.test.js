'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const contracts=require('../games/classic-human/contracts.js');

const SOLVED='534678912672195348198342567859761423426853791713924856961537284287419635345286179';
const UNIQUE='530070000600195000098000060800060003400803001700020006060000280000419005000080079';

function withCell(text,index,value){return text.slice(0,index)+String(value)+text.slice(index+1);}

test('classic contract exposes stable non-redundant family metadata',()=>{
  assert.equal(contracts.TECHNIQUES['x-wing'].familyId,'fish');
  assert.equal(contracts.TECHNIQUES['swordfish'].familyId,'fish');
  assert.equal(contracts.TECHNIQUES['jellyfish'].familyId,'fish');
  assert.equal(contracts.TECHNIQUES['xy-chain'].familyId,'chain');
  assert.equal(contracts.TECHNIQUES.aic.familyId,'chain');
  assert.equal(contracts.TECHNIQUES['unique-rectangle'].requiresUniqueness,true);
  assert.equal(contracts.TECHNIQUES['dynamic-forcing-chain'].serverOnly,true);
});

test('candidate state uses classic row column box constraints and 9-bit masks',()=>{
  const puzzle=withCell(SOLVED,2,0);
  const state=new contracts.ClassicCandidateState(puzzle);
  assert.equal(state.valid,true);
  assert.deepEqual(state.candidates(0,2),[4]);
  assert.equal(state.candidateMask(0,2),contracts.bitForDigit(4));
  assert.equal(contracts.bitCount(contracts.FULL_MASK),9);
});

test('candidate state rejects contradictory givens',()=>{
  const invalid='554678912'+SOLVED.slice(9);
  const state=new contracts.ClassicCandidateState(invalid);
  assert.equal(state.valid,false);
  assert.equal(contracts.countSolutions(invalid,2),0);
});

test('exact verifier counts solutions with a hard cap and confirms a canonical unique puzzle',()=>{
  assert.equal(contracts.countSolutions(SOLVED,2),1);
  assert.equal(contracts.countSolutions(UNIQUE,2),1);
  assert.equal(contracts.countSolutions('0'.repeat(81),2),2);
});

test('deduction normalization is deterministic and deduplicates state actions',()=>{
  const raw={
    techniqueId:'xy-wing',
    placements:[],
    eliminations:[{cell:40,digit:7},{cell:12,digit:3},{cell:40,digit:7}],
    anchors:[22,5,17],
    houses:['r5','b5']
  };
  const normalized=contracts.normalizeDeduction(raw);
  assert.equal(normalized.familyId,'wing');
  assert.equal(normalized.baseRating,4.2);
  assert.deepEqual(normalized.eliminations,[{cell:12,digit:3},{cell:40,digit:7}]);
  assert.deepEqual(normalized.anchors,[5,17,22]);
  assert.equal(contracts.deductionStateKey(raw),'E12!=3|E40!=7');
});

test('deduction contract forbids empty deductions and placement elimination overlap',()=>{
  assert.throws(()=>contracts.normalizeDeduction({techniqueId:'naked-single'}),/must change state/);
  assert.throws(()=>contracts.normalizeDeduction({techniqueId:'naked-single',placements:[{cell:1,digit:2}],eliminations:[{cell:1,digit:2}]}),/placed and eliminated/);
});

test('deduction ordering prefers human technique priority then normalized state key',()=>{
  const easy={techniqueId:'naked-single',placements:[{cell:8,digit:2}]};
  const hard={techniqueId:'x-wing',eliminations:[{cell:8,digit:2}]};
  assert.ok(contracts.compareDeductions(easy,hard)<0);
  const a={techniqueId:'xy-wing',eliminations:[{cell:40,digit:7}]};
  const b={techniqueId:'xy-wing',eliminations:[{cell:41,digit:7}]};
  assert.ok(contracts.compareDeductions(a,b)<0);
});

test('solved-grid boundary is separate from uniqueness counting',()=>{
  assert.equal(contracts.isSolvedGrid(SOLVED),true);
  assert.equal(contracts.isSolvedGrid(UNIQUE),false);
  assert.equal(contracts.countSolutions(UNIQUE,2),1);
});
