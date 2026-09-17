const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Rating=require('../games/classic-human/rating.js');
const Contracts=require('../games/classic-human/contracts.js');

const POOLS=['gentle','focused','expert'];
function rows(){
  return POOLS.flatMap(pool=>{
    const parsed=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','classic-human-pools',pool+'.json'),'utf8'));
    return parsed.records.map(record=>({...record,sourcePool:pool}));
  });
}
function level(record){
  return Rating.levelForRating({
    score:record.score,
    maxTechniquePriority:record.maxTechniquePriority,
    hardestTechnique:record.hardestTechnique,
    dependencyDepth:record.dependencyDepth
  });
}

test('production pools occupy audited semantic levels 1 through 8',()=>{
  const records=rows();
  assert.equal(records.length,120);
  const counts=Array(10).fill(0);
  for(const record of records){
    assert.equal(record.status,'SOLVED_LOGICALLY');
    const value=level(record);
    assert.ok(value>=1&&value<=8,'legacy production pools should remain below brutal');
    counts[value]++;
  }
  for(let value=1;value<=8;value++)assert.ok(counts[value]>0,'level '+value+' must have audited production coverage');
  assert.ok(counts[1]>=10&&counts[2]>=20&&counts[3]>=20,'lower levels must retain useful coverage');
  assert.ok(counts[6]>=5&&counts[7]>=10&&counts[8]>=3,'upper audited levels must retain useful coverage');
});

test('production level semantics remain technique-monotone',()=>{
  for(const record of rows()){
    const value=level(record);
    const meta=Contracts.TECHNIQUES[record.hardestTechnique];
    assert.ok(meta,'hardest technique must be registered');
    if(value<=2)assert.equal(record.hardestTechnique,'naked-single');
    if(value===3)assert.equal(record.hardestTechnique,'hidden-single');
    if(value===4)assert.ok(meta.priority>=40&&meta.priority<=50);
    if(value===5)assert.ok(meta.priority>=60&&meta.priority<=90);
    if(value===6)assert.ok(meta.priority>=100&&meta.priority<=140);
    if(value===7)assert.ok(meta.priority>=150&&meta.priority<=220);
    if(value===8)assert.ok(meta.priority>=230);
  }
});

test('naked-single production split is dependency calibrated',()=>{
  const naked=rows().filter(record=>record.hardestTechnique==='naked-single');
  assert.equal(naked.length,46);
  for(const record of naked){
    assert.ok(Number.isFinite(record.dependencyDepth));
    const expected=record.dependencyDepth<=Rating.LEVEL_POLICY.easyNakedSingleDependencyMax?1:2;
    assert.equal(level(record),expected);
  }
});
