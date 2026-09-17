'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const U=require('../games/classic-human/uniqueness.js');

function m(ds){return ds.reduce((x,d)=>x|C.bitForDigit(d),0);}
function state(overrides){
  const s=new S.ClassicHumanState('.'.repeat(81));
  for(let i=0;i<81;i++)s.masks[i]=m([9]);
  for(const [r,c,ds] of overrides)s.masks[C.cellIndex(r,c)]=m(ds);
  return s;
}
function type(ds,t){return ds.filter(d=>d.explanationData.type===t);}
function elimKey(d){return d.eliminations.map(x=>x.cell+':'+x.digit);}
const R=[[0,0],[0,3],[1,0],[1,3]];
function rect(pairExtras,other=[]){return state(R.map(([r,c],i)=>[r,c,pairExtras[i]]).concat(other));}

test('UR Type 2 eliminates common extra candidate',()=>{
  const s=rect([[1,2],[1,2],[1,2,3],[1,2,3]],[[1,6,[3,9]]]);
  const d=type(U.findUniqueRectangle(s),2).find(x=>x.explanationData.extraDigit===3);
  assert.ok(d);assert.deepEqual(elimKey(d),[C.cellIndex(1,6)+':3']);assert.deepEqual(d.explanationData.pair,[1,2]);
});

test('UR Type 2 rejects mismatched roof extras',()=>{
  const s=rect([[1,2],[1,2],[1,2,3],[1,2,4]],[[1,6,[3,4,9]]]);
  assert.equal(type(U.findUniqueRectangle(s),2).length,0);
});

test('UR Type 3 forms bounded virtual-cell naked subset',()=>{
  const s=rect([[1,2],[1,2],[1,2,3],[1,2,4]],[[1,6,[3,4]],[1,7,[3,9]]]);
  const d=type(U.findUniqueRectangle(s),3).find(x=>x.explanationData.house==='r2'&&x.explanationData.companions.includes(C.cellIndex(1,6)));
  assert.ok(d);assert.ok(elimKey(d).includes(C.cellIndex(1,7)+':3'));assert.deepEqual(d.explanationData.subsetDigits,[3,4]);
});

test('UR Type 3 rejects the mismatched intended subset',()=>{
  const companion=C.cellIndex(1,6);
  const s=rect([[1,2],[1,2],[1,2,3],[1,2,4]],[[1,6,[3,4,5]],[1,7,[6,9]]]);
  const bad=type(U.findUniqueRectangle(s),3).filter(x=>x.explanationData.house==='r2'&&x.explanationData.companions.includes(companion)&&x.explanationData.subsetDigits.length!==x.explanationData.companions.length+1);
  assert.equal(bad.length,0);
});

test('UR Type 4 uses a roof strong link and removes the other UR digit',()=>{
  const s=rect([[1,2],[1,2],[1,2,3],[1,2,4]]);
  const d=type(U.findUniqueRectangle(s),4).find(x=>x.explanationData.house==='r2'&&x.explanationData.strongDigit===1);
  assert.ok(d);assert.deepEqual(elimKey(d),[C.cellIndex(1,0)+':2',C.cellIndex(1,3)+':2']);
});

test('UR Type 4 rejects broken strong link',()=>{
  const s=rect([[1,2],[1,2],[1,2,3],[1,2,4]],[[1,6,[1,9]],[0,1,[1,9]],[0,2,[1,9]],[2,0,[1,9]],[2,1,[1,9]],[2,2,[1,9]]]);
  const hits=type(U.findUniqueRectangle(s),4).filter(x=>x.explanationData.strongDigit===1);
  assert.equal(hits.length,0);
});

test('UR Type 5 supports diagonal guardians with a common extra',()=>{
  const s=rect([[1,2,3],[1,2],[1,2],[1,2,3]],[[1,1,[3,9]]]);
  const d=type(U.findUniqueRectangle(s),5).find(x=>x.explanationData.extraDigit===3);
  assert.ok(d);assert.deepEqual(elimKey(d),[C.cellIndex(1,1)+':3']);
});

test('UR Type 6 uses four row/column strong links for diagonal roofs',()=>{
  const s=rect([[1,2,3],[1,2],[1,2],[1,2,4]]);
  const d=type(U.findUniqueRectangle(s),6).find(x=>x.explanationData.strongDigit===1);
  assert.ok(d);assert.deepEqual(elimKey(d),[C.cellIndex(0,0)+':1',C.cellIndex(1,3)+':1']);
});

test('UR Type 6 rejects an escape candidate in a rectangle line',()=>{
  const s=rect([[1,2,3],[1,2],[1,2],[1,2,4]],[[0,6,[1,9]]]);
  const hits=type(U.findUniqueRectangle(s),6).filter(x=>x.explanationData.strongDigit===1);
  assert.equal(hits.length,0);
});

test('Hidden Rectangle eliminates from diagonal target under row and column confinement',()=>{
  const s=rect([[1,2],[1,2,5],[1,2,6],[1,2,4]]);
  const d=type(U.findUniqueRectangle(s),'hidden').find(x=>x.explanationData.start===C.cellIndex(0,0)&&x.explanationData.target===C.cellIndex(1,3)&&x.explanationData.strongDigit===1);
  assert.ok(d);assert.deepEqual(elimKey(d),[C.cellIndex(1,3)+':2']);
});

test('Hidden Rectangle rejects row or column escape',()=>{
  const s=rect([[1,2],[1,2,5],[1,2,6],[1,2,4]],[[1,6,[1,9]]]);
  const hits=type(U.findUniqueRectangle(s),'hidden').filter(x=>x.explanationData.start===C.cellIndex(0,0)&&x.explanationData.target===C.cellIndex(1,3)&&x.explanationData.strongDigit===1);
  assert.equal(hits.length,0);
});

test('extended UR rejects four-box geometry',()=>{
  const s=state([[0,0,[1,2]],[0,3,[1,2]],[3,0,[1,2,3]],[3,3,[1,2,3]],[3,6,[3,9]]]);
  assert.equal(U.findUniqueRectangle(s).length,0);
});

test('extended UR enumeration is deterministic and source immutable',()=>{
  const s=rect([[1,2],[1,2],[1,2,3],[1,2,3]],[[1,6,[3,9]]]),before=Array.from(s.masks);
  const a=U.findUniqueRectangle(s),b=U.findUniqueRectangle(s);
  assert.deepEqual(a,b);assert.deepEqual(Array.from(s.masks),before);
});

test('extended UR deduction applies safely',()=>{
  const s=rect([[1,2],[1,2],[1,2,3],[1,2,3]],[[1,6,[3,9]]]);
  const d=type(U.findUniqueRectangle(s),2)[0];assert.ok(d);assert.equal(s.apply(d),true);assert.equal(s.valid,true);
});

test('digit relabeling preserves Type 2 geometry',()=>{
  const a=rect([[1,2],[1,2],[1,2,3],[1,2,3]],[[1,6,[3,9]]]);
  const b=rect([[4,5],[4,5],[4,5,6],[4,5,6]],[[1,6,[6,9]]]);
  const da=type(U.findUniqueRectangle(a),2)[0],db=type(U.findUniqueRectangle(b),2)[0];assert.ok(da&&db);assert.deepEqual(da.eliminations.map(x=>x.cell),db.eliminations.map(x=>x.cell));
});

test('transpose preserves Hidden Rectangle target geometry',()=>{
  const base=[[0,0,[1,2]],[0,3,[1,2,5]],[1,0,[1,2,6]],[1,3,[1,2,4]]];
  const a=state(base),b=state(base.map(([r,c,ds])=>[c,r,ds]));
  const da=type(U.findUniqueRectangle(a),'hidden').find(x=>x.explanationData.start===C.cellIndex(0,0)&&x.explanationData.target===C.cellIndex(1,3)&&x.explanationData.strongDigit===1);
  const db=type(U.findUniqueRectangle(b),'hidden').find(x=>x.explanationData.start===C.cellIndex(0,0)&&x.explanationData.target===C.cellIndex(3,1)&&x.explanationData.strongDigit===1);
  assert.ok(da&&db);assert.equal(db.eliminations[0].cell,C.cellIndex(3,1));
});
