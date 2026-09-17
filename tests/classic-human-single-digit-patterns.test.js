'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');
const S=require('../games/classic-human/solver.js');
const L=require('../games/classic-human/links.js');
const P=require('../games/classic-human/single-digit-patterns.js');

function blankState(){return new S.ClassicHumanState(Array.from({length:9},()=>Array(9).fill(0)));}
function cell(r,c){return C.cellIndex(r,c);}
function keepDigitOnlyAt(state,digit,cells){
  const keep=new Set(cells),bit=C.bitForDigit(digit),without=C.FULL_MASK&~bit;
  for(let i=0;i<81;i++)if(!keep.has(i))state.restrictMask(i,without);
  return state;
}
function actionKeys(d){return d.eliminations.map(x=>x.cell+':'+x.digit).sort();}
function hasAnchors(d,cells){return cells.every(x=>d.anchors.includes(x));}

test('conjugate link infrastructure finds exactly-two candidate houses',()=>{
  const s=blankState();
  const pair=[cell(0,1),cell(0,4)];
  keepDigitOnlyAt(s,5,pair.concat([cell(3,7)]));
  const row=L.conjugateLinks(s,5,['row']).find(x=>x.houseId==='r1');
  assert.ok(row);
  assert.deepEqual([row.a,row.b],pair);
  assert.equal(row.houseType,'row');
});

test('skyscraper recognizes two row conjugate links with aligned roofs',()=>{
  const s=blankState();
  const r1=[cell(0,1),cell(0,4)];
  const r4=[cell(3,1),cell(3,5)];
  const target=cell(2,5);
  keepDigitOnlyAt(s,5,r1.concat(r4,[target]));
  const d=P.findSkyscraper(s).find(x=>
    x.explanationData.digit===5&&
    x.explanationData.orientation==='row'&&
    hasAnchors(x,r1.concat(r4))&&
    x.eliminations.some(e=>e.cell===target&&e.digit===5)
  );
  assert.ok(d);
  assert.equal(d.techniqueId,'skyscraper');
  assert.ok(actionKeys(d).includes(target+':5'));
  assert.equal(d.complexity.linkCount,3);
});

test('skyscraper near miss is rejected when the second base row has a third candidate',()=>{
  const s=blankState();
  const cells=[cell(0,1),cell(0,4),cell(3,1),cell(3,5),cell(3,8),cell(2,5)];
  keepDigitOnlyAt(s,5,cells);
  const matches=P.findSkyscraper(s).filter(x=>x.explanationData.digit===5&&x.explanationData.orientation==='row');
  assert.equal(matches.length,0);
});

test('two-string kite uses one row and one column conjugate link joined through a box',()=>{
  const s=blankState();
  const row=[cell(0,1),cell(0,6)];
  const col=[cell(2,2),cell(5,2)];
  const target=cell(5,6);
  keepDigitOnlyAt(s,7,row.concat(col,[target]));
  const d=P.findTwoStringKite(s).find(x=>
    x.explanationData.digit===7&&
    hasAnchors(x,row.concat(col))&&
    x.eliminations.some(e=>e.cell===target&&e.digit===7)
  );
  assert.ok(d);
  assert.equal(d.techniqueId,'two-string-kite');
  assert.ok(actionKeys(d).includes(target+':7'));
  assert.equal(d.complexity.linkCount,3);
});

test('two-string kite near miss is rejected when join endpoints do not share a box',()=>{
  const s=blankState();
  const row=[cell(0,1),cell(0,6)];
  const col=[cell(4,2),cell(5,2)];
  keepDigitOnlyAt(s,7,row.concat(col,[cell(5,6)]));
  const matches=P.findTwoStringKite(s).filter(x=>x.explanationData.digit===7&&hasAnchors(x,row.concat(col)));
  assert.equal(matches.length,0);
});

test('generic turbot fish recognizes a non-skyscraper non-kite conjugate-link chain',()=>{
  const s=blankState();
  const row=[cell(0,1),cell(0,7)];
  const box=[cell(3,1),cell(5,2)];
  const target=cell(5,7);
  keepDigitOnlyAt(s,4,row.concat(box,[target]));
  const d=P.findTurbotFish(s).find(x=>
    x.explanationData.digit===4&&
    hasAnchors(x,row.concat(box))&&
    x.eliminations.some(e=>e.cell===target&&e.digit===4)
  );
  assert.ok(d);
  assert.equal(d.techniqueId,'turbot-fish');
  assert.ok(actionKeys(d).includes(target+':4'));
});

test('named skyscraper and kite shapes are not duplicated as generic turbot fish',()=>{
  const sky=blankState();
  const skyCells=[cell(0,1),cell(0,4),cell(3,1),cell(3,5),cell(2,5)];
  keepDigitOnlyAt(sky,5,skyCells);
  assert.ok(P.findSkyscraper(sky).length>0);
  const duplicatedSky=P.findTurbotFish(sky).filter(x=>x.explanationData.digit===5&&hasAnchors(x,skyCells.slice(0,4)));
  assert.equal(duplicatedSky.length,0);

  const kite=blankState();
  const kiteAnchors=[cell(0,1),cell(0,6),cell(2,2),cell(5,2)];
  keepDigitOnlyAt(kite,7,kiteAnchors.concat([cell(5,6)]));
  assert.ok(P.findTwoStringKite(kite).length>0);
  const duplicatedKite=P.findTurbotFish(kite).filter(x=>x.explanationData.digit===7&&hasAnchors(x,kiteAnchors));
  assert.equal(duplicatedKite.length,0);
});

test('empty rectangle combines a box cross with an outside row conjugate pair',()=>{
  const s=blankState();
  const boxCross=[cell(3,4),cell(3,5),cell(4,4),cell(5,4)];
  const strong=[cell(6,4),cell(6,8)];
  const target=cell(3,8);
  keepDigitOnlyAt(s,1,boxCross.concat(strong,[target]));
  const d=P.findEmptyRectangle(s).find(x=>
    x.explanationData.digit===1&&
    x.explanationData.box===4&&
    x.explanationData.row===3&&
    x.explanationData.column===4&&
    x.eliminations.some(e=>e.cell===target&&e.digit===1)
  );
  assert.ok(d);
  assert.equal(d.techniqueId,'empty-rectangle');
  assert.deepEqual(actionKeys(d),[target+':1']);
  assert.equal(d.complexity.boxCandidateCount,4);
});

test('empty rectangle rejects a box candidate outside the row-column cross',()=>{
  const s=blankState();
  const boxCross=[cell(3,4),cell(3,5),cell(4,4),cell(5,4),cell(4,5)];
  const strong=[cell(6,4),cell(6,8)];
  const target=cell(3,8);
  keepDigitOnlyAt(s,1,boxCross.concat(strong,[target]));
  const matches=P.findEmptyRectangle(s).filter(x=>x.explanationData.digit===1&&x.explanationData.box===4);
  assert.equal(matches.length,0);
});

test('single-digit pattern output is deterministic',()=>{
  const s=blankState();
  keepDigitOnlyAt(s,5,[cell(0,1),cell(0,4),cell(3,1),cell(3,5),cell(2,5)]);
  const a=P.findSkyscraper(s).map(C.deductionStateKey);
  const b=P.findSkyscraper(s).map(C.deductionStateKey);
  assert.deepEqual(a,b);
  assert.ok(a.length>0);
});
