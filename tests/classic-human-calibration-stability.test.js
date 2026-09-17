const test=require('node:test');
const assert=require('node:assert/strict');
const corpus=require('./fixtures/classic-calibration-corpus.json');
const Calibration=require('../games/classic-human/calibration.js');
const Stability=require('../games/classic-human/calibration-stability.js');

test('controlled calibration corpus is unique, human-solvable and gentle',()=>{
  const audit=Calibration.auditCorpus(corpus);
  assert.equal(audit.total,3);
  assert.equal(audit.uniqueCount,3);
  assert.equal(audit.solvedLogicallyCount,3);
  assert.equal(audit.expectedBandCount,3);
  assert.equal(audit.expectedBandMatchCount,3);
  assert.deepEqual(audit.bandCounts,{gentle:3});
});

test('default bounded stability profiles preserve controlled corpus bands',()=>{
  const audit=Stability.auditCorpusStability(corpus);
  assert.equal(audit.total,3);
  assert.equal(audit.stableBandCount,3);
  assert.equal(audit.stableStatusCount,3);
  assert.equal(audit.maxScoreSpread,0);
  for(const row of audit.rows){
    assert.equal(row.audit.profileCount,3);
    assert.deepEqual(row.audit.observedBands,['gentle']);
    assert.deepEqual(row.audit.observedStatuses,['SOLVED_LOGICALLY']);
  }
});

test('stability audit is bounded to at most three profiles',()=>{
  assert.throws(()=>Stability.auditPuzzleStability(corpus[0].puzzle,{profiles:[
    {id:'a'},{id:'b'},{id:'c'},{id:'d'}
  ]}),/1\.\.3 entries/);
});

test('priority override contract is deterministic and finite-only',()=>{
  const profiles=Stability.normalizeProfiles([{id:'x',priorityOverrides:{'xy-wing':149}}]);
  assert.equal(profiles[0].priorityOverrides['xy-wing'],149);
  assert.throws(()=>Stability.normalizeProfiles([{id:'bad',priorityOverrides:{'xy-wing':Infinity}}]),/finite/);
});
