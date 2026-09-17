const test=require('node:test');
const assert=require('node:assert/strict');
const Calibration=require('../games/classic-human/calibration.js');

const SOLVED='123456789456789123789123456214365897365897214897214365531642978642978531978531642';

test('normalizePuzzleRecord creates deterministic ids and sorted tags',()=>{
  const rec=Calibration.normalizePuzzleRecord({puzzle:SOLVED,tags:['z','a']},2);
  assert.equal(rec.id,'puzzle-0003');
  assert.deepEqual(rec.tags,['a','z']);
});

test('auditCorpus verifies uniqueness and emits deterministic aggregate fields',()=>{
  const audit=Calibration.auditCorpus([
    {id:'solved-grid',puzzle:SOLVED,expectedBand:'gentle'}
  ]);
  assert.equal(audit.schemaVersion,2);
  assert.equal(audit.ratingStatus,'PROVISIONAL_UNCALIBRATED');
  assert.equal(audit.total,1);
  assert.equal(audit.uniqueCount,1);
  assert.equal(audit.solvedLogicallyCount,1);
  assert.equal(audit.expectedBandCount,1);
  assert.equal(audit.expectedBandMatchCount,1);
  assert.deepEqual(audit.bandCounts,{gentle:1});
  assert.deepEqual(audit.statusCounts,{SOLVED_LOGICALLY:1});
  assert.deepEqual(audit.sourceBandCounts,{});
  assert.deepEqual(audit.sourceBandRatingMatrix,{});
  assert.equal(audit.rows[0].id,'solved-grid');
  assert.equal(audit.rows[0].unique,true);
  assert.equal(audit.rows[0].status,'SOLVED_LOGICALLY');
  assert.equal(audit.rows[0].band,'gentle');
  assert.ok(Number.isFinite(audit.runtime.totalMs));
  assert.ok(Number.isFinite(audit.runtime.medianMs));
  assert.ok(Number.isFinite(audit.runtime.p95Ms));
});

test('empty corpus remains well-defined',()=>{
  const audit=Calibration.auditCorpus([]);
  assert.equal(audit.total,0);
  assert.equal(audit.uniqueCount,0);
  assert.equal(audit.solvedLogicallyCount,0);
  assert.deepEqual(audit.bandCounts,{});
  assert.deepEqual(audit.sourceBandCounts,{});
  assert.equal(audit.runtime.medianMs,0);
  assert.equal(audit.runtime.p95Ms,0);
  assert.equal(audit.runtime.maxMs,0);
});

test('invalid corpus records are rejected early',()=>{
  assert.throws(()=>Calibration.auditCorpus([{id:'bad',puzzle:'123'}]),/81-char classic grid/);
});
