'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const C=require('../games/classic-human/contracts.js');const F=require('../games/classic-human/fish.js');
function stateFor(digit,cells){const s=new C.ClassicCandidateState('.'.repeat(81)),bit=C.bitForDigit(digit);for(let i=0;i<81;i++)s.masks[i]&=~bit;for(const [r,c] of cells)s.masks[C.cellIndex(r,c)]|=bit;return s;}
function exact(d){return d.eliminations.map(x=>x.cell+':'+x.digit);}
function rowMatch(d,finBase,finPositions){return d.explanationData.orientation==='rows'&&d.explanationData.finBaseLine===finBase&&finPositions.every(x=>d.explanationData.finPositions.includes(x));}

test('finned x-wing exact elimination and immutable source',()=>{const pattern=[[0,1],[0,4],[3,1],[3,4],[3,5],[4,4]],s=stateFor(7,pattern),before=Array.from(s.masks);const d=F.findFinnedXWing(s).find(x=>rowMatch(x,3,[5]));assert.ok(d);assert.deepEqual(exact(d),[C.cellIndex(4,4)+':7']);assert.deepEqual(Array.from(s.masks),before);assert.equal(d.explanationData.sashimi,false);assert.ok(!d.eliminations.some(x=>d.anchors.includes(x.cell)));});

test('sashimi x-wing recognizes one missing core base',()=>{const pattern=[[0,2],[3,1],[3,4],[1,1]],s=stateFor(6,pattern);const d=F.findSashimiXWing(s).find(x=>rowMatch(x,0,[2]));assert.ok(d);assert.deepEqual(exact(d),[C.cellIndex(1,1)+':6']);assert.equal(d.explanationData.sashimi,true);});

test('finned swordfish explicit positive',()=>{const s=stateFor(3,[[0,1],[0,4],[3,1],[3,7],[6,4],[6,7],[6,8],[7,7]]),d=F.findFinnedSwordfish(s).find(x=>rowMatch(x,6,[8]));assert.ok(d);assert.deepEqual(exact(d),[C.cellIndex(7,7)+':3']);assert.equal(d.techniqueId,'finned-swordfish');});

test('sashimi swordfish explicit positive',()=>{const s=stateFor(3,[[0,1],[0,4],[3,4],[3,7],[6,8],[7,7]]),d=F.findSashimiSwordfish(s).find(x=>rowMatch(x,6,[8]));assert.ok(d);assert.deepEqual(exact(d),[C.cellIndex(7,7)+':3']);assert.equal(d.techniqueId,'sashimi-swordfish');});

test('finned jellyfish explicit positive',()=>{const s=stateFor(8,[[0,1],[0,3],[2,1],[2,5],[4,3],[4,7],[6,5],[6,7],[6,8],[7,7]]),d=F.findFinnedJellyfish(s).find(x=>rowMatch(x,6,[8]));assert.ok(d);assert.deepEqual(exact(d),[C.cellIndex(7,7)+':8']);assert.equal(d.techniqueId,'finned-jellyfish');});

test('sashimi jellyfish explicit positive',()=>{const s=stateFor(8,[[0,1],[0,3],[2,1],[2,5],[4,3],[4,7],[6,8],[7,7]]),d=F.findSashimiJellyfish(s).find(x=>rowMatch(x,6,[8]));assert.ok(d);assert.deepEqual(exact(d),[C.cellIndex(7,7)+':8']);assert.equal(d.techniqueId,'sashimi-jellyfish');});

test('multiple fins in one box are supported',()=>{const s=stateFor(7,[[0,1],[0,4],[3,1],[3,3],[3,4],[3,5],[4,4]]),d=F.findFinnedXWing(s).find(x=>rowMatch(x,3,[3,5])&&x.explanationData.finPositions.length===2);assert.ok(d);assert.deepEqual(exact(d),[C.cellIndex(4,4)+':7']);assert.equal(d.complexity.finCount,2);});

test('fins split across boxes are rejected as one multi-fin pattern',()=>{const s=stateFor(5,[[0,1],[0,4],[3,1],[3,4],[3,5],[3,8],[4,4]]),bad=F.findFinnedXWing(s).find(x=>x.explanationData.orientation==='rows'&&x.explanationData.finBaseLine===3&&x.explanationData.finPositions.length===2&&x.explanationData.finPositions.includes(5)&&x.explanationData.finPositions.includes(8));assert.equal(bad,undefined);});

test('row column transpose symmetry',()=>{const p=[[0,1],[0,4],[3,1],[3,4],[3,5],[4,4]],a=stateFor(4,p),b=stateFor(4,p.map(([r,c])=>[c,r]));const da=F.findFinnedXWing(a).find(x=>rowMatch(x,3,[5])),db=F.findFinnedXWing(b).find(x=>x.explanationData.orientation==='columns'&&x.explanationData.finBaseLine===3&&x.explanationData.finPositions.includes(5));assert.ok(da&&db);assert.deepEqual(db.eliminations.map(x=>x.cell),da.eliminations.map(x=>{const [r,c]=C.rowCol(x.cell);return C.cellIndex(c,r);}));});

test('digit relabeling preserves geometry',()=>{const p=[[0,1],[0,4],[3,1],[3,4],[3,5],[4,4]],a=F.findFinnedXWing(stateFor(2,p)).find(x=>rowMatch(x,3,[5])),b=F.findFinnedXWing(stateFor(9,p)).find(x=>rowMatch(x,3,[5]));assert.ok(a&&b);assert.deepEqual(a.eliminations.map(x=>x.cell),b.eliminations.map(x=>x.cell));assert.ok(b.eliminations.every(x=>x.digit===9));});

test('deterministic enumeration',()=>{const p=[[0,1],[0,4],[3,1],[3,4],[3,5],[4,4]],s=stateFor(7,p);assert.deepEqual(F.findFinnedFish(s,2),F.findFinnedFish(s,2));});
