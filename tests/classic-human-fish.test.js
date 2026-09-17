'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const F=require('../games/classic-human/fish.js');

function blankState(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function keepDigitOnlyAt(state,digit,cells){
  const keep=new Set(cells),bit=C.bitForDigit(digit),without=C.FULL_MASK&~bit;
  for(let i=0;i<81;i++)if(!keep.has(i))state.restrictMask(i,without);
  return state;
}
function keys(d){return d.eliminations.map(x=>x.cell+':'+x.digit).sort();}
function rowCell(r,c){return C.cellIndex(r,c);}
function findFishByBaseSet(list,digit,orientation,bases){
  const key=bases.join(',');
  return list.find(x=>x.explanationData.digit===digit&&x.explanationData.orientation===orientation&&x.explanationData.baseLines.join(',')===key);
}

test('x-wing row orientation eliminates from its two cover columns',()=>{
  const s=blankState();
  const anchors=[rowCell(0,1),rowCell(0,7),rowCell(3,1),rowCell(3,7)];
  const targets=[rowCell(5,1),rowCell(5,7)];
  keepDigitOnlyAt(s,5,anchors.concat(targets));
  const d=findFishByBaseSet(F.findXWing(s),5,'rows',[0,3]);
  assert.ok(d);
  assert.deepEqual(d.explanationData.coverLines,[1,7]);
  assert.deepEqual(keys(d),targets.map(x=>x+':5').sort());
  assert.equal(d.complexity.fishSize,2);
});

test('x-wing column orientation is found by the same engine',()=>{
  const s=blankState();
  const anchors=[rowCell(1,0),rowCell(7,0),rowCell(1,4),rowCell(7,4)];
  const target=rowCell(1,8);
  keepDigitOnlyAt(s,6,anchors.concat([target]));
  const d=findFishByBaseSet(F.findXWing(s),6,'columns',[0,4]);
  assert.ok(d);
  assert.deepEqual(d.explanationData.coverLines,[1,7]);
  assert.deepEqual(keys(d),[target+':6']);
});

test('swordfish uses three base and cover lines without a separate algorithm',()=>{
  const s=blankState();
  const anchors=[rowCell(0,1),rowCell(0,4),rowCell(3,4),rowCell(3,7),rowCell(6,1),rowCell(6,7)];
  const targets=[rowCell(8,1),rowCell(8,4),rowCell(8,7)];
  keepDigitOnlyAt(s,4,anchors.concat(targets));
  const d=findFishByBaseSet(F.findSwordfish(s),4,'rows',[0,3,6]);
  assert.ok(d);
  assert.deepEqual(d.explanationData.coverLines,[1,4,7]);
  assert.deepEqual(keys(d),targets.map(x=>x+':4').sort());
  assert.equal(d.complexity.fishSize,3);
});

test('jellyfish uses four base and cover lines through the same generic search',()=>{
  const s=blankState();
  const anchors=[
    rowCell(0,0),rowCell(0,2),
    rowCell(2,2),rowCell(2,4),
    rowCell(4,4),rowCell(4,6),
    rowCell(6,0),rowCell(6,6)
  ];
  const targets=[rowCell(8,0),rowCell(8,2),rowCell(8,4)];
  keepDigitOnlyAt(s,8,anchors.concat(targets));
  const d=findFishByBaseSet(F.findJellyfish(s),8,'rows',[0,2,4,6]);
  assert.ok(d);
  assert.deepEqual(d.explanationData.coverLines,[0,2,4,6]);
  assert.deepEqual(keys(d),targets.map(x=>x+':8').sort());
  assert.equal(d.complexity.fishSize,4);
});

test('fish near miss is rejected when selected bases need too many cover lines',()=>{
  const s=blankState();
  const anchors=[rowCell(0,0),rowCell(0,1),rowCell(3,1),rowCell(3,2),rowCell(6,2),rowCell(6,3)];
  keepDigitOnlyAt(s,3,anchors);
  assert.equal(F.findSwordfish(s).filter(x=>x.explanationData.digit===3&&x.explanationData.orientation==='rows').length,0);
});

test('fish finder output is deterministic and normalized',()=>{
  const s=blankState();
  const anchors=[rowCell(0,1),rowCell(0,7),rowCell(3,1),rowCell(3,7)],targets=[rowCell(5,1),rowCell(5,7)];
  keepDigitOnlyAt(s,5,anchors.concat(targets));
  const a=F.findXWing(s).map(C.deductionStateKey);
  const b=F.findXWing(s).map(C.deductionStateKey);
  assert.deepEqual(a,b);
  assert.ok(a.length>0);
});
