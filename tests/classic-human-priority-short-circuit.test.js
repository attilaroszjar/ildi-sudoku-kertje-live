const test=require('node:test');
const assert=require('node:assert/strict');
const H=require('../games/classic-human/index.js');

const ONE_MISSING='.23456789456789123789123456214365897365897214897214365531642978642978531978531642';

test('eligible finder groups preserve ascending effective priority',()=>{
  const rows=H.eligibleFinders({allowUniqueness:true,allowServerPreferred:true,allowServerOnly:true});
  assert.ok(rows.length>0);
  for(let i=1;i<rows.length;i++)assert.ok(rows[i-1].priority<=rows[i].priority);
  assert.equal(rows[0].entry.id,'full-house');
  assert.equal(rows[0].priority,10);
});

test('priority overrides reorder finder groups deterministically',()=>{
  const rows=H.eligibleFinders({priorityOverrides:{'xy-wing':5}});
  assert.equal(rows[0].entry.id,'xy-wing');
  assert.equal(rows[0].priority,5);
});

test('all policy layers enabled still solve an easy grid with the lowest-priority deduction trace',()=>{
  const solve=H.solve(ONE_MISSING,{allowUniqueness:true,allowServerPreferred:true,allowServerOnly:true});
  assert.equal(solve.status,'SOLVED_LOGICALLY');
  assert.equal(solve.steps.length,1);
  assert.equal(solve.steps[0].techniqueId,'full-house');
});

test('non-finite priority override is rejected before finder execution',()=>{
  assert.throws(()=>H.eligibleFinders({priorityOverrides:{'xy-wing':Infinity}}),/finite/);
});
