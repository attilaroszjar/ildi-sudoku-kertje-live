const test=require('node:test');
const assert=require('node:assert/strict');
const Rating=require('../games/classic-human/rating.js');

function rated(score,priority,hardestTechnique,dependencyDepth){
  return Rating.levelForRating({score,maxTechniquePriority:priority,hardestTechnique,dependencyDepth});
}

test('levels 1-3 separate completion experiences before advanced families',()=>{
  assert.equal(rated(59,20,'naked-single',6),1);
  assert.equal(rated(60,20,'naked-single',7),2);
  assert.equal(rated(68,20,'naked-single',9),2);
  assert.equal(rated(63,30,'hidden-single',6),3);
  assert.equal(rated(81,30,'hidden-single',9),3);
});

test('naked-single boundary follows dependency depth when available',()=>{
  assert.equal(rated(60,20,'naked-single',6),1,'dependency depth wins over score at easy boundary');
  assert.equal(rated(59,20,'naked-single',7),2,'deeper forced chain is level 2 even with lower score');
  assert.equal(Rating.levelForRating({score:59,hardestTechnique:'naked-single'}),1,'legacy persisted fallback remains score-based');
  assert.equal(Rating.levelForRating({score:60,hardestTechnique:'naked-single'}),2,'legacy persisted fallback remains score-based');
});

test('levels 4-8 follow technique ceiling families rather than score buckets',()=>{
  assert.equal(rated(70,40,'locked-candidate-pointing',7),4);
  assert.equal(rated(103,60,'naked-pair',8),5);
  assert.equal(rated(126,110,'skyscraper',7),6);
  assert.equal(rated(130,150,'xy-wing',9),7);
  assert.equal(rated(173,220,'multi-coloring',9),7);
  assert.equal(rated(181,230,'unique-rectangle',10),8);
  assert.equal(rated(219,310,'xy-chain',10),8);
});

test('persisted pool ratings infer missing priority from hardest technique metadata',()=>{
  assert.equal(Rating.levelForRating({score:68,hardestTechnique:'hidden-single'}),3);
  assert.equal(Rating.levelForRating({score:70,hardestTechnique:'locked-candidate-pointing'}),4);
  assert.equal(Rating.levelForRating({score:103,hardestTechnique:'naked-pair'}),5);
  assert.equal(Rating.levelForRating({score:126,hardestTechnique:'skyscraper'}),6);
  assert.equal(Rating.levelForRating({score:165,hardestTechnique:'xy-wing'}),7);
  assert.equal(Rating.levelForRating({score:219,hardestTechnique:'xy-chain'}),8);
});

test('240 plus is always level 9 brutal regardless of technique ceiling',()=>{
  assert.equal(rated(240,20,'naked-single',5),9);
  assert.equal(rated(999,510,'nested-forcing-chain',12),9);
});

test('score-only level mapping remains available as legacy compatibility fallback',()=>{
  assert.equal(Rating.levelForScore(54),1);
  assert.equal(Rating.levelForScore(55),2);
  assert.equal(Rating.levelForScore(63),3);
  assert.equal(Rating.levelForScore(70),4);
  assert.equal(Rating.levelForScore(90),5);
  assert.equal(Rating.levelForScore(110),6);
  assert.equal(Rating.levelForScore(130),7);
  assert.equal(Rating.levelForScore(175),8);
  assert.equal(Rating.levelForScore(240),9);
});
