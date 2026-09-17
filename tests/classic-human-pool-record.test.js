'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('../games/classic-human/pool-record.js');

const SOLUTION='534678912672195348198342567859761423426853791713924856961537284287419635345286179';
const PUZZLE='530070000600195000098000060800060003400803001700020006060000280000419005000080079';

function base(){
  return {
    puzzle:PUZZLE,
    solution:SOLUTION,
    uniqueness:'UNIQUE',
    status:'SOLVED_LOGICALLY',
    targetBand:'gentle',
    score:59,
    band:'gentle',
    scoreStatus:'PROVISIONAL_UNCALIBRATED',
    hardestTechnique:'naked-single',
    techniqueCounts:{'naked-single':51},
    familyCounts:{completion:51},
    totalSteps:51,
    placements:51,
    eliminations:0,
    advancedSteps:0,
    workload:{weightedLogicalWork:100.5,advancedFamilyCount:0,maxComplexity:0},
    dependencyDepth:5,
    usesUniquenessAssumption:false,
    usesServerPreferred:false,
    usesServerOnly:false,
    generatorProfile:'legacy-gentle',
    seed:101,
    solverVersion:'classic-human-v1',
    raterVersion:'classic-rating-v2',
    trace:[{techniqueId:'naked-single',placements:[{cell:2,digit:4}],eliminations:[],complexity:{}}]
  };
}

test('stableStringify and stableHash ignore object key insertion order',()=>{
  const a={z:1,a:{q:2,b:3},b:[{y:1,x:2}]};
  const b={b:[{x:2,y:1}],a:{b:3,q:2},z:1};
  assert.equal(P.stableStringify(a),P.stableStringify(b));
  assert.equal(P.stableHash(a),P.stableHash(b));
  assert.match(P.stableHash(a),/^fnv1a64-v1:[0-9a-f]{16}$/);
});

test('pool record normalizes puzzle notation and produces three stable identities',()=>{
  const raw=base();raw.puzzle=raw.puzzle.replace(/0/g,'.');
  const record=P.normalizePoolRecord(raw);
  assert.equal(record.schemaVersion,1);
  assert.equal(record.puzzle,PUZZLE);
  assert.equal(record.hashAlgorithm,'fnv1a64-v1');
  assert.match(record.puzzleHash,/^fnv1a64-v1:/);
  assert.match(record.traceHash,/^fnv1a64-v1:/);
  assert.match(record.recordHash,/^fnv1a64-v1:/);
  assert.ok(Object.isFrozen(record));
  assert.ok(Object.isFrozen(record.trace));
});

test('timestamps are metadata and do not change reproducible record identity',()=>{
  const a=base();a.generatedAt='2026-09-06T12:00:00Z';a.verifiedAt='2026-09-06T12:01:00Z';
  const b=base();b.generatedAt='2030-01-01T00:00:00Z';b.verifiedAt='2030-01-01T00:01:00Z';
  const ra=P.normalizePoolRecord(a),rb=P.normalizePoolRecord(b);
  assert.equal(ra.puzzleHash,rb.puzzleHash);
  assert.equal(ra.traceHash,rb.traceHash);
  assert.equal(ra.recordHash,rb.recordHash);
});

test('puzzle, trace and version changes affect only the expected stable identities',()=>{
  const a=P.normalizePoolRecord(base());
  const traceChanged=base();traceChanged.trace=[{techniqueId:'hidden-single',placements:[{cell:2,digit:4}],eliminations:[],complexity:{}}];traceChanged.hardestTechnique='hidden-single';traceChanged.techniqueCounts={'hidden-single':51};
  const b=P.normalizePoolRecord(traceChanged);
  assert.equal(a.puzzleHash,b.puzzleHash);
  assert.notEqual(a.traceHash,b.traceHash);
  assert.notEqual(a.recordHash,b.recordHash);
  const versionChanged=base();versionChanged.raterVersion='classic-rating-v3';
  const c=P.normalizePoolRecord(versionChanged);
  assert.equal(a.puzzleHash,c.puzzleHash);
  assert.equal(a.traceHash,c.traceHash);
  assert.notEqual(a.recordHash,c.recordHash);
});

test('accepted pool records reject incomplete or cross-band results',()=>{
  const incomplete=base();incomplete.status='STALLED';incomplete.scoreStatus='UNRATED_INCOMPLETE';incomplete.score=null;incomplete.band=null;
  assert.throws(()=>P.normalizePoolRecord(incomplete),/SOLVED_LOGICALLY/);
  const mismatch=base();mismatch.targetBand='focused';
  assert.throws(()=>P.normalizePoolRecord(mismatch),/must match targetBand/);
  const nonUnique=base();nonUnique.uniqueness='MULTIPLE';
  assert.throws(()=>P.normalizePoolRecord(nonUnique),/must be UNIQUE/);
});
