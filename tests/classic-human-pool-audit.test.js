'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const A=require('../games/classic-human/pool-audit.js');
const P=require('../games/classic-human/pool-record.js');
function accepted(hash,band='gentle'){return {reason:'ACCEPTED',record:{puzzleHash:hash,band}};}
const SOLUTION='534678912672195348198342567859761423426853791713924856961537284287419635345286179';
function record(seed,band='gentle',zeros=[],technique){
  const chars=SOLUTION.split('');zeros.forEach(i=>{chars[i]='0';});
  const hardest=technique||(seed%2?'hidden-single':'naked-single');
  const techniqueCounts=hardest==='xy-wing'?{'full-house':1,'hidden-single':2,'naked-single':3,'xy-wing':1}:hardest==='hidden-single'?{'hidden-single':2}:{'naked-single':3};
  return P.normalizePoolRecord({puzzle:chars.join(''),solution:SOLUTION,uniqueness:'UNIQUE',status:'SOLVED_LOGICALLY',targetBand:band,score:band==='expert'?650:120+seed,band,scoreStatus:'PROVISIONAL_UNCALIBRATED',hardestTechnique:hardest,techniqueCounts,familyCounts:{singles:3},totalSteps:3,placements:3,eliminations:0,advancedSteps:hardest==='xy-wing'?1:0,workload:{},dependencyDepth:0,usesUniquenessAssumption:false,usesServerPreferred:false,usesServerOnly:false,generatorProfile:band==='expert'?'classic-expert-sculpt-v4':'classic-human-guided-v1',seed,solverVersion:'solver-v1',raterVersion:'rater-v1',trace:[]});
}
function checkpoint(records,{band='gentle',attempted=records.length,duplicates=0,rejections={}}={}){
  return {schemaVersion:2,targetBand:band,generatorProfile:band==='expert'?'classic-expert-sculpt-v4':'classic-human-guided-v1',solverVersion:'solver-v1',raterVersion:'rater-v1',startSeed:100,nextSeed:100+attempted,attempted,duplicates,rejections,records};
}

test('audit summarizes acceptance, rejection, duplicates and deterministic runtime percentiles',()=>{
  const out=A.auditPoolResults([
    {result:accepted('a'),elapsedMs:10},
    {result:{reason:'NON_UNIQUE'},elapsedMs:2},
    {result:accepted('b'),elapsedMs:8},
    {result:accepted('a'),elapsedMs:4},
    {result:{reason:'BAND_MISMATCH'},elapsedMs:6}
  ]);
  assert.equal(out.total,5);
  assert.equal(out.accepted,3);
  assert.equal(out.acceptanceRate,0.6);
  assert.deepEqual(out.reasons,{ACCEPTED:3,NON_UNIQUE:1,BAND_MISMATCH:1});
  assert.deepEqual(out.bands,{gentle:3});
  assert.equal(out.duplicates,1);
  assert.deepEqual(out.runtime,{count:5,p50:6,p95:10,max:10});
});

test('audit handles empty input and validates timing samples',()=>{
  assert.deepEqual(A.auditPoolResults([]),{total:0,accepted:0,acceptanceRate:0,reasons:{},bands:{},duplicates:0,runtime:{count:0,p50:null,p95:null,max:null}});
  assert.throws(()=>A.auditPoolResults([{result:{reason:'INVALID'},elapsedMs:-1}]),/elapsedMs/);
});

test('persisted checkpoint audit is deterministic and reports pool diversity summaries',()=>{
  const cp=checkpoint([
    record(1,'gentle',[0,10,20]),
    record(2,'gentle',[1,11,21,31]),
    record(3,'gentle',[2,12,22,32,42])
  ]);
  const a=A.auditCheckpoint(cp),b=A.auditCheckpoint(JSON.parse(JSON.stringify(cp)));
  assert.deepEqual(a,b);
  assert.equal(a.attempted,3);
  assert.equal(a.accepted,3);
  assert.equal(a.acceptanceRate,1);
  assert.deepEqual(a.score,{min:121,p50:122,p95:123,max:123});
  assert.deepEqual(a.clueCount,{min:76,p50:77,p95:78,max:78});
  assert.deepEqual(a.hardestTechniques,{'hidden-single':2,'naked-single':1});
  assert.equal(a.puzzleHashesUnique,true);
  assert.equal(a.recordHashesUnique,true);
  assert.equal(a.exactMaskDuplicates,0);
  assert.equal(typeof a.maxMaskSimilarity,'number');
  assert.deepEqual(a.gate,{pass:true,failures:[]});
});

test('persisted audit gates low acceptance and duplicate-rate regressions',()=>{
  const low=A.auditCheckpoint(checkpoint([record(10,'gentle',[0])],{attempted:4,rejections:{BAND_MISMATCH:3}}));
  assert.equal(low.gate.pass,false);
  assert.deepEqual(low.gate.failures,['ACCEPTANCE_RATE']);
  const dup=A.auditCheckpoint(checkpoint([record(11,'expert',[0]),record(12,'expert',[1])],{band:'expert',attempted:8,duplicates:1,rejections:{BAND_MISMATCH:5}}));
  assert.equal(dup.acceptanceRate,.25);
  assert.equal(dup.gate.pass,false);
  assert.deepEqual(dup.gate.failures,['DUPLICATE_RATE']);
});

test('technique signature concentration is diagnostic for gentle but gated for expert',()=>{
  const gentle=[];for(let i=0;i<12;i++)gentle.push(record(100+i,'gentle',[i,20+i],'naked-single'));
  const g=A.auditCheckpoint(checkpoint(gentle,{attempted:12}));
  assert.deepEqual(g.techniqueSignatures,{'naked-single':12});
  assert.equal(g.gate.pass,true);
  const expert=[];for(let i=0;i<12;i++)expert.push(record(200+i,'expert',[i,30+i],'xy-wing'));
  const e=A.auditCheckpoint(checkpoint(expert,{band:'expert',attempted:12}));
  assert.equal(e.gate.pass,false);
  assert.deepEqual(e.gate.failures,['TECHNIQUE_SIGNATURE_CONCENTRATION']);
});
