const test=require('node:test');
const assert=require('node:assert/strict');
const Anchors=require('../games/classic-human/calibration-anchors.js');

test('technique anchor ladder is explicitly synthetic and ordered by reference priority',()=>{
  const audit=Anchors.auditAnchors();
  assert.equal(audit.schemaVersion,1);
  assert.equal(audit.evidenceType,'SYNTHETIC_TECHNIQUE_ANCHOR_NOT_PUZZLE_CORPUS');
  assert.equal(audit.rows.length,8);
  for(let i=1;i<audit.rows.length;i++)assert.ok(audit.rows[i].priority>audit.rows[i-1].priority);
});

test('current provisional score remains strictly monotonic across technique anchors',()=>{
  const audit=Anchors.auditAnchors();
  assert.equal(audit.monotonicScore,true);
  for(let i=1;i<audit.rows.length;i++)assert.ok(audit.rows[i].score>audit.rows[i-1].score,`${audit.rows[i-1].id} -> ${audit.rows[i].id}`);
});

test('v2 provisional bands follow technique ceiling before accumulated workload',()=>{
  const rows=Object.fromEntries(Anchors.auditAnchors({baselineSingles:40}).rows.map(row=>[row.id,row]));
  assert.equal(rows.singles.band,'gentle');
  assert.equal(rows.subset.band,'focused');
  assert.equal(rows.fish.band,'focused');
  assert.equal(rows.wing.band,'expert');
  assert.equal(rows.chain.band,'expert');
  assert.equal(rows.als.band,'expert');
  assert.equal(rows.forcing.band,'brutal');
  assert.equal(rows.dynamic.band,'brutal');
});

test('anchor workload is controlled and does not masquerade as puzzle evidence',()=>{
  const audit=Anchors.auditAnchors({baselineSingles:40});
  assert.equal(audit.baselineSingles,40);
  assert.equal(audit.rows[0].techniqueId,'naked-single');
  assert.equal(audit.rows.at(-1).techniqueId,'nested-forcing-chain');
  assert.ok(audit.rows.every(row=>row.scoreStatus==='PROVISIONAL_UNCALIBRATED'));
});

test('anchor baseline is hard bounded',()=>{
  assert.throws(()=>Anchors.auditAnchors({baselineSingles:80}),/0\.\.79/);
});
