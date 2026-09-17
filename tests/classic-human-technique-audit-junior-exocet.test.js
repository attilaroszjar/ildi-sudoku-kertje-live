'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');const S=require('../games/classic-human/solver.js');const J=require('../games/classic-human/junior-exocet.js');
function m(ds){return ds.reduce((x,d)=>x|C.bitForDigit(d),0);}
function blank(){const s=new S.ClassicHumanState('.'.repeat(81));for(let i=0;i<81;i++)s.masks[i]=m([9]);return s;}
function set(s,r,c,ds){s.masks[C.cellIndex(r,c)]=m(ds);}
function transposeState(s){const t=blank();for(let r=0;r<9;r++)for(let c=0;c<9;c++)t.masks[C.cellIndex(c,r)]=s.masks[C.cellIndex(r,c)];return t;}
function relabelState(s,map){const t=blank();for(let i=0;i<81;i++){const ds=C.digitsFromMask(s.masks[i]).map(d=>map[d]);t.masks[i]=m(ds);}return t;}
function fixture(digits=[1,2,3],extras=[8,9]){const s=blank(),x=digits;set(s,0,0,x);set(s,0,1,x);set(s,1,4,x.concat(extras[0]));set(s,2,7,x.concat(extras[1]));set(s,2,4,[4,5]);set(s,1,7,[4,5]);const cross=[2,4,7];for(const c of cross)set(s,3,c,[x[0],9]);set(s,4,2,[x[0],9]);for(const c of cross)set(s,5,c,[x[1],9]);set(s,6,4,[x[1],9]);for(const c of cross)set(s,7,c,[x[2],9]);set(s,8,7,[x[2],9]);return s;}
const BASE=[C.cellIndex(0,0),C.cellIndex(0,1)],TARGETS=[C.cellIndex(1,4),C.cellIndex(2,7)];
function desired(ds){return ds.find(d=>d.explanationData.orientation==='rows'&&JSON.stringify(d.explanationData.baseCells)===JSON.stringify(BASE)&&JSON.stringify(d.explanationData.targetCells)===JSON.stringify(TARGETS));}
function elimKeys(d){return d.eliminations.map(x=>x.cell+':'+x.digit);}

test('Junior Exocet target rule removes only non-base target candidates',()=>{const s=fixture(),before=Array.from(s.masks),d=desired(J.findJuniorExocet(s));assert.ok(d);assert.deepEqual(elimKeys(d),[TARGETS[0]+':8',TARGETS[1]+':9']);assert.deepEqual(d.explanationData.baseDigits,[1,2,3]);assert.deepEqual(d.explanationData.companionCells,[C.cellIndex(2,4),C.cellIndex(1,7)]);assert.deepEqual(Array.from(s.masks),before);});

test('Junior Exocet rejects companion containing a base candidate',()=>{const s=fixture();set(s,2,4,[1,4,5]);assert.equal(!!desired(J.findJuniorExocet(s)),false);});

test('Junior Exocet rejects a base digit spread over three S-cell cover houses',()=>{const s=fixture();set(s,5,2,[1,2,9]);assert.equal(!!desired(J.findJuniorExocet(s)),false);});

test('Junior Exocet rejects target pair that does not cover the base digit set',()=>{const s=fixture();set(s,1,4,[1,2,8]);set(s,2,7,[1,2,9]);assert.equal(!!desired(J.findJuniorExocet(s)),false);});

test('Junior Exocet requires three or four base candidates',()=>{const s=fixture();set(s,0,0,[1,2]);set(s,0,1,[1,2]);assert.equal(!!desired(J.findJuniorExocet(s)),false);const s2=fixture();set(s2,0,0,[1,2,3,4,5]);set(s2,0,1,[1,2,3,4,5]);assert.equal(!!desired(J.findJuniorExocet(s2)),false);});

test('Junior Exocet transpose produces the transposed target eliminations',()=>{const a=fixture(),b=transposeState(a),da=desired(J.findJuniorExocet(a));assert.ok(da);const db=J.findJuniorExocet(b).find(d=>d.explanationData.orientation==='columns'&&d.explanationData.baseCells.includes(C.cellIndex(0,0))&&d.explanationData.baseCells.includes(C.cellIndex(1,0)));assert.ok(db);const transposed=da.eliminations.map(x=>{const [r,c]=C.rowCol(x.cell);return C.cellIndex(c,r)+':'+x.digit;}).sort();assert.deepEqual(elimKeys(db).sort(),transposed);});

test('Junior Exocet digit relabeling preserves geometry',()=>{const source=fixture(),map={1:4,2:5,3:6,4:1,5:2,6:3,7:9,8:7,9:8},a=desired(J.findJuniorExocet(source)),b=desired(J.findJuniorExocet(relabelState(source,map)));assert.ok(a&&b);assert.deepEqual(a.eliminations.map(x=>x.cell),b.eliminations.map(x=>x.cell));assert.deepEqual(b.explanationData.baseDigits,[4,5,6]);});

test('Junior Exocet deduction applies safely and does not self-eliminate pattern cells',()=>{const s=fixture(),d=desired(J.findJuniorExocet(s));assert.ok(d);const protectedCells=new Set(d.explanationData.baseCells.concat(d.explanationData.companionCells,d.explanationData.sCells));assert.ok(d.eliminations.every(x=>!protectedCells.has(x.cell)));assert.equal(s.apply(d),true);assert.equal(s.valid,true);assert.deepEqual(s.candidates(TARGETS[0]),[1,2,3]);assert.deepEqual(s.candidates(TARGETS[1]),[1,2,3]);});

test('Junior Exocet local cover oracle forces both targets to base digits',()=>{const s=fixture(),d=desired(J.findJuniorExocet(s));assert.ok(d);const baseDigits=d.explanationData.baseDigits,cross=d.explanationData.crossLines,targets=new Set(d.explanationData.targetCells),companions=new Set(d.explanationData.companionCells),bandRows=new Set([0,1,2]);function candidatesFor(digit,col){const out=[];for(let r=0;r<9;r++){const cell=C.cellIndex(r,col);if(!(s.masks[cell]&C.bitForDigit(digit)))continue;if(bandRows.has(r)&&!targets.has(cell)&&!companions.has(cell))continue;if(companions.has(cell))continue;out.push(cell);}return out;}function placements(digit){const pools=cross.map(c=>candidatesFor(digit,c)),out=[];for(const a of pools[0])for(const b of pools[1])for(const c of pools[2]){const rows=[a,b,c].map(x=>C.rowCol(x)[0]);if(new Set(rows).size!==3)continue;out.push([a,b,c]);}return out;}for(let i=0;i<baseDigits.length;i++)for(let j=i+1;j<baseDigits.length;j++){const pa=placements(baseDigits[i]),pb=placements(baseDigits[j]);for(const a of pa)for(const b of pb){if(a.some(x=>b.includes(x)))continue;const used=new Set(a.concat(b));assert.equal([...targets].every(t=>used.has(t)),true);}}});

test('Junior Exocet enumeration is deterministic',()=>{const s=fixture();assert.deepEqual(J.findJuniorExocet(s),J.findJuniorExocet(s));});

test('Junior Exocet enforces explicit hard budgets',()=>{const s=fixture();assert.throws(()=>J.findJuniorExocet(s,{maxBasePairs:163}),/maxBasePairs/);assert.throws(()=>J.findJuniorExocet(s,{maxTargetPairsPerBase:19}),/maxTargetPairsPerBase/);assert.throws(()=>J.findJuniorExocet(s,{maxFindings:65}),/maxFindings/);assert.ok(J.findJuniorExocet(s,{maxFindings:1}).length<=1);});
