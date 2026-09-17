const test=require('node:test');
const assert=require('node:assert/strict');
const Rating=require('../games/classic-human/rating.js');

function step(techniqueId,placements,eliminations,complexity){
  return {techniqueId,placements:placements||[],eliminations:eliminations||[],complexity:complexity||{}};
}

test('band thresholds are deterministic and provisional',()=>{
  assert.equal(Rating.bandForScore(0),'gentle');
  assert.equal(Rating.bandForScore(69),'gentle');
  assert.equal(Rating.bandForScore(70),'focused');
  assert.equal(Rating.bandForScore(129),'focused');
  assert.equal(Rating.bandForScore(130),'expert');
  assert.equal(Rating.bandForScore(239),'expert');
  assert.equal(Rating.bandForScore(240),'brutal');
});

test('1 to 9 difficulty levels refine legacy bands without changing brutal threshold',()=>{
  const boundaries=[
    [0,1],[54,1],[55,2],[62,2],[63,3],[69,3],
    [70,4],[89,4],[90,5],[109,5],[110,6],[129,6],
    [130,7],[174,7],[175,8],[239,8],[240,9],[999,9]
  ];
  for(const [score,level] of boundaries)assert.equal(Rating.levelForScore(score),level,`score ${score}`);
  assert.equal(Rating.LEVELS.length,9);
});

test('rateSolve collects raw trace metrics without clue-count input',()=>{
  const result=Rating.rateSolve({
    status:'SOLVED_LOGICALLY',
    steps:[
      step('naked-single',[{cell:1,digit:4}],[]),
      step('xy-wing',[],[{cell:10,digit:7},{cell:11,digit:7}],{pathLength:3}),
      step('aic',[],[{cell:20,digit:2}],{pathLength:7})
    ]
  });
  assert.equal(result.status,'SOLVED_LOGICALLY');
  assert.equal(result.solveComplete,true);
  assert.equal(result.totalSteps,3);
  assert.equal(result.placements,1);
  assert.equal(result.eliminations,3);
  assert.equal(result.hardestTechnique,'aic');
  assert.equal(result.maxTechniquePriority,320);
  assert.equal(result.techniqueCounts['xy-wing'],1);
  assert.equal(result.familyCounts.chain,1);
  assert.equal(result.advancedSteps,2);
  assert.equal(result.workload.advancedFamilyCount,2);
  assert.equal(result.workload.maxComplexity,7);
  assert.equal(result.scoreStatus,'PROVISIONAL_UNCALIBRATED');
  assert.ok(Number.isFinite(result.score));
  assert.ok(Number.isInteger(result.level));
  assert.ok(result.level>=1&&result.level<=9);
  assert.equal(result.rawScore,result.score);
  assert.ok(result.workload.weightedLogicalWork>0);
  assert.ok(Object.isFrozen(result.scoreComponents));
  assert.ok(result.scoreComponents.ceiling>result.scoreComponents.workload);
});

test('workload is a bounded modifier rather than a substitute for technique ceiling',()=>{
  const singles=Rating.rateSolve({status:'SOLVED_LOGICALLY',steps:Array.from({length:40},(_,i)=>step('naked-single',[{cell:i%81,digit:1}],[]))});
  const pair=Rating.rateSolve({status:'SOLVED_LOGICALLY',steps:Array.from({length:39},(_,i)=>step('naked-single',[{cell:i%81,digit:1}],[])).concat([step('naked-pair',[],[{cell:70,digit:2}])])});
  assert.equal(singles.band,'gentle');
  assert.equal(pair.band,'focused');
  assert.ok(singles.level<=3);
  assert.ok(pair.level>=4);
  assert.ok(singles.scoreComponents.workload<=48);
  assert.ok(pair.score>singles.score);
});

test('policy usage is derived from techniques actually present in incomplete trace without assigning a product band',()=>{
  const result=Rating.rateSolve({
    status:'STALLED',
    steps:[
      step('unique-rectangle',[],[{cell:2,digit:9}]),
      step('forcing-chain',[],[{cell:3,digit:3}],{depth:4}),
      step('nested-forcing-chain',[],[{cell:4,digit:5}],{depth:8,branches:2})
    ]
  });
  assert.equal(result.usesUniquenessAssumption,true);
  assert.equal(result.usesServerPreferred,true);
  assert.equal(result.usesServerOnly,true);
  assert.equal(result.solveComplete,false);
  assert.equal(result.hardestTechnique,'nested-forcing-chain');
  assert.equal(result.score,null);
  assert.equal(result.band,null);
  assert.equal(result.level,null);
  assert.equal(result.scoreStatus,'UNRATED_INCOMPLETE');
  assert.ok(Number.isFinite(result.rawScore));
  assert.equal(result.scoreComponents.serverPreferred,12);
  assert.equal(result.scoreComponents.serverOnly,24);
});

test('empty invalid trace remains well-defined but unrated',()=>{
  const result=Rating.rateSolve({status:'INVALID',steps:[]});
  assert.equal(result.score,null);
  assert.equal(result.band,null);
  assert.equal(result.level,null);
  assert.equal(result.rawScore,0);
  assert.equal(result.scoreStatus,'UNRATED_INCOMPLETE');
  assert.equal(result.hardestTechnique,null);
  assert.equal(result.totalSteps,0);
  assert.equal(result.solveComplete,false);
});

test('unknown techniques are rejected instead of silently scored',()=>{
  assert.throws(()=>Rating.rateSolve({status:'STALLED',steps:[step('not-a-technique')]}),/unknown technique/);
});
