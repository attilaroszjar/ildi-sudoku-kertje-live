'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const X=require('../games/classic-human/pool-promotion.js');
const A=require('../games/classic-human/pool-audit.js');
const P=require('../games/classic-human/pool-record.js');
const SOLUTION='534678912672195348198342567859761423426853791713924856961537284287419635345286179';
function record(seed,band){
  const p=SOLUTION.split('');p[seed%81]='0';
  const expertTechnique=seed%2?'xy-wing':'skyscraper';
  const hardestTechnique=band==='expert'?expertTechnique:band==='focused'?'hidden-single':'naked-single';
  const techniqueCounts=band==='expert'?{[expertTechnique]:1}:{[band==='focused'?'hidden-single':'naked-single']:1};
  return P.normalizePoolRecord({puzzle:p.join(''),solution:SOLUTION,uniqueness:'UNIQUE',status:'SOLVED_LOGICALLY',targetBand:band,score:band==='expert'?150:band==='focused'?80:60,band,scoreStatus:'PROVISIONAL_UNCALIBRATED',hardestTechnique,techniqueCounts,familyCounts:{},totalSteps:1,placements:1,eliminations:0,advancedSteps:band==='expert'?1:0,workload:{},dependencyDepth:0,usesUniquenessAssumption:false,usesServerPreferred:false,usesServerOnly:false,generatorProfile:band==='expert'?'classic-expert-sculpt-v4':'classic-human-guided-v2',seed,solverVersion:'classic-human-solver-v1',raterVersion:'classic-human-rater-v1',trace:[]});
}
function checkpoint(band,count){const records=[];for(let i=0;i<count;i++)records.push(record(i+(band==='focused'?100:band==='expert'?200:0),band));return {schemaVersion:2,targetBand:band,generatorProfile:band==='expert'?'classic-expert-sculpt-v4':'classic-human-guided-v2',solverVersion:'classic-human-solver-v1',raterVersion:'classic-human-rater-v1',startSeed:0,nextSeed:count,attempted:count,duplicates:0,rejections:{},records};}

test('promotion bundle and manifest are deterministic',()=>{
  const gcp=checkpoint('gentle',48),fcp=checkpoint('focused',48),ecp=checkpoint('expert',24);
  const g=X.buildBundle(gcp);
  const f=X.buildBundle(fcp);
  const e=X.buildBundle(ecp);
  assert.equal(g.accepted,48);assert.equal(f.accepted,48);assert.equal(e.accepted,24);
  assert.deepEqual(A.auditCheckpoint(ecp).techniqueSignatures,{skyscraper:12,'xy-wing':12});
  assert.match(g.bundleHash,/^fnv1a64-v1:/);
  const m1=X.buildManifest([g,f,e]),m2=X.buildManifest([e,g,f]);
  assert.deepEqual(m1,m2);
  assert.match(m1.manifestHash,/^fnv1a64-v1:/);
});

test('promotion rejects incomplete targets and missing bands',()=>{
  assert.throws(()=>X.buildBundle(checkpoint('gentle',47)),/promotion target/);
  const g=X.buildBundle(checkpoint('gentle',48));
  const f=X.buildBundle(checkpoint('focused',48));
  assert.throws(()=>X.buildManifest([g,f]),/three production bundles/);
});
