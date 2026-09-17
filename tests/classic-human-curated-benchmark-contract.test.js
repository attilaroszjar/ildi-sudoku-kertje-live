const test=require('node:test');
const assert=require('node:assert/strict');
const corpus=require('./fixtures/classic-curated-brutal-benchmarks.json');
const Calibration=require('../games/classic-human/calibration.js');

test('curated brutal benchmark records are full-puzzle records with provenance',()=>{
  assert.equal(corpus.length,2);
  for(const [index,raw] of corpus.entries()){
    const record=Calibration.normalizePuzzleRecord(raw,index);
    assert.equal(record.puzzle.length,81);
    assert.equal(record.expectedBand,'brutal');
    assert.equal(record.source,'external-curated-benchmark');
    assert.ok(record.tags.includes('full-puzzle'));
    assert.ok(record.tags.includes('curated'));
    assert.equal(record.metadata.benchmarkRole,'external-hardness-anchor');
    assert.ok(record.metadata.creator);
    assert.ok(Number.isInteger(record.metadata.year));
    assert.ok(record.metadata.sourceReference);
    assert.ok(record.metadata.evidenceNote);
  }
});

test('curated brutal benchmark ids and puzzle grids are unique',()=>{
  assert.equal(new Set(corpus.map(row=>row.id)).size,corpus.length);
  assert.equal(new Set(corpus.map(row=>row.puzzle)).size,corpus.length);
});
