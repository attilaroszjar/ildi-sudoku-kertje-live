const test=require('node:test');
const assert=require('node:assert/strict');
const Ingestion=require('../games/classic-human/corpus-ingestion.js');
const Calibration=require('../games/classic-human/calibration.js');

const SOLVED='123456789456789123789123456214365897365897214897214365531642978642978531978531642';
const SOLVED_GRID=Array.from({length:9},(_,r)=>SOLVED.slice(r*9,r*9+9).split('').map(Number));
const FAST_RUNTIME={
  classic:{id:'classic'},
  generator:{make(_variant,seed,band){
    const clues={gentle:40,focused:32,expert:27}[band];
    return {puzzle:SOLVED_GRID.map(row=>row.slice()),generation:{clues,generatorFamily:'test-fast-runtime',difficultyScore:seed%10}};
  }}
};

test('legacy classic ingestion produces deterministic gentle focused expert records',()=>{
  const records=Ingestion.ingestLegacyClassic({runtime:FAST_RUNTIME,seeds:[7],sourceBands:['gentle','focused','expert']});
  assert.equal(records.length,3);
  assert.deepEqual(records.map(r=>r.metadata.sourceBand),['gentle','focused','expert']);
  assert.ok(records.every(r=>r.puzzle.length===81));
  assert.ok(records.every(r=>r.source==='legacy-classic-generator'));
  assert.ok(records.every(r=>Number.isInteger(r.metadata.clueCount)));
});

test('legacy ingestion rejects a nonexistent brutal generator band',()=>{
  assert.throws(()=>Ingestion.ingestLegacyClassic({runtime:FAST_RUNTIME,seeds:[1],sourceBands:['brutal']}),/supports gentle\/focused\/expert only/);
});

test('representative coverage exposes missing brutal source until curated records exist',()=>{
  const built=Ingestion.buildRepresentativeCorpus({runtime:FAST_RUNTIME,seeds:[11]});
  assert.equal(built.records.length,3);
  assert.deepEqual(built.coverage.sourceBandCounts,{gentle:1,focused:1,expert:1});
  assert.deepEqual(built.coverage.missingTargetBands,['brutal']);
});

test('curated brutal records can close representative band coverage explicitly',()=>{
  const built=Ingestion.buildRepresentativeCorpus({runtime:FAST_RUNTIME,seeds:[13],curated:[{
    id:'curated-brutal-placeholder',
    puzzle:SOLVED,
    expectedBand:'brutal',
    source:'test-curated',
    metadata:{sourceBand:'brutal'}
  }]});
  assert.deepEqual(built.coverage.missingTargetBands,[]);
  assert.equal(built.coverage.sourceBandCounts.brutal,1);
});

test('calibration keeps source band separate from measured human-rated band',()=>{
  const records=Ingestion.ingestLegacyClassic({runtime:FAST_RUNTIME,seeds:[17],sourceBands:['gentle']});
  const audit=Calibration.auditCorpus(records);
  assert.equal(audit.schemaVersion,2);
  assert.deepEqual(audit.sourceBandCounts,{gentle:1});
  assert.equal(audit.rows[0].sourceBand,'gentle');
  assert.equal(audit.rows[0].seed,17);
  assert.ok(audit.sourceBandRatingMatrix.gentle[audit.rows[0].band]>=1);
});
