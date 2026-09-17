const test=require('node:test');
const assert=require('node:assert/strict');
const Analysis=require('../games/classic-human/trace-analysis.js');
const Rating=require('../games/classic-human/rating.js');

function step(techniqueId,{placements=[],eliminations=[],anchors=[],candidateNodes=[],complexity={}}={}){
  return {techniqueId,placements,eliminations,anchors,candidateNodes,complexity};
}

test('dependency depth follows actual modified support cells',()=>{
  const steps=[
    step('locked-candidate-pointing',{eliminations:[{cell:10,digit:4}],anchors:[1,2]}),
    step('xy-wing',{eliminations:[{cell:20,digit:7}],anchors:[10,11,12]}),
    step('aic',{eliminations:[{cell:30,digit:3}],anchors:[20,21]}),
    step('naked-single',{placements:[{cell:40,digit:8}],anchors:[40]})
  ];
  const analysis=Analysis.analyzeTraceDependencies(steps);
  assert.deepEqual(analysis.stepDependencyDepths,[1,2,3,1]);
  assert.deepEqual(analysis.directDependencies,[[],[0],[1],[]]);
  assert.equal(analysis.dependencyDepth,3);
});

test('candidate-node support participates in dependency provenance',()=>{
  const steps=[
    step('x-wing',{eliminations:[{cell:44,digit:6}],anchors:[4,13,31,40]}),
    step('aic',{eliminations:[{cell:50,digit:2}],candidateNodes:[{cell:44,digit:6},{cell:45,digit:2}]})
  ];
  const analysis=Analysis.analyzeTraceDependencies(steps);
  assert.deepEqual(analysis.directDependencies,[[],[0]]);
  assert.equal(analysis.dependencyDepth,2);
});

test('bottleneck candidates are explicit trace evidence, not claimed availability proofs',()=>{
  const steps=[
    step('naked-single',{placements:[{cell:1,digit:4}],anchors:[1]}),
    step('xy-wing',{eliminations:[{cell:10,digit:7}],anchors:[2,3,4]}),
    step('hidden-single',{placements:[{cell:11,digit:2}],anchors:[10]}),
    step('naked-single',{placements:[{cell:12,digit:5}],anchors:[11]}),
    step('aic',{eliminations:[{cell:20,digit:6}],anchors:[12,13]})
  ];
  const analysis=Analysis.analyzeTraceDependencies(steps,{bottleneckPriority:150});
  assert.equal(analysis.bottleneckCandidates.length,2);
  assert.equal(analysis.strongestBottleneck.techniqueId,'aic');
  const wing=analysis.bottleneckCandidates.find(x=>x.techniqueId==='xy-wing');
  assert.equal(wing.unlockSpan,2);
  assert.equal(wing.verificationStatus,'TRACE_CANDIDATE');
  assert.equal(analysis.bottleneckStatus,'TRACE_CANDIDATES_REQUIRE_AVAILABILITY_AUDIT');
});

test('rating exposes dependency and trace-bottleneck metrics deterministically',()=>{
  const result=Rating.rateSolve({
    status:'SOLVED_LOGICALLY',
    steps:[
      step('x-wing',{eliminations:[{cell:22,digit:5}],anchors:[1,4,10,13]}),
      step('aic',{eliminations:[{cell:31,digit:5}],anchors:[22,23],complexity:{pathLength:6}}),
      step('hidden-single',{placements:[{cell:32,digit:9}],anchors:[31]})
    ]
  },{bottleneckPriority:150});
  assert.equal(result.dependencyDepth,3);
  assert.deepEqual(result.stepDependencyDepths,[1,2,3]);
  assert.equal(result.bottleneck.techniqueId,'aic');
  assert.equal(result.bottleneckStatus,'TRACE_CANDIDATES_REQUIRE_AVAILABILITY_AUDIT');
  assert.ok(result.score>0);
});

test('empty trace has zero dependency depth and no bottleneck',()=>{
  const analysis=Analysis.analyzeTraceDependencies([]);
  assert.equal(analysis.dependencyDepth,0);
  assert.equal(analysis.strongestBottleneck,null);
  assert.equal(analysis.bottleneckStatus,'NONE_IN_TRACE');
});
