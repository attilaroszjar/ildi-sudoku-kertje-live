'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const ctx={console};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'games/quadruple-render-final-hardening.js'),'utf8'),ctx);
const H=ctx.QuadrupleRenderHardening;

function plain(value){return JSON.parse(JSON.stringify(value));}
function cellsFor(at){const [r,c]=at;return [[r-1,c-1],[r-1,c],[r,c-1],[r,c]];}

test('Quadruple layout anchors clues to internal board intersections',()=>{
  const quads=[
    {at:[1,1],digits:[1,2,3,4]},
    {at:[4,5],digits:[2,4,6,8]},
    {at:[8,8],digits:[3,5,7,9]}
  ];
  const out=H.layout(quads,9,540,540,20,30);
  assert.equal(out.length,3);
  assert.deepEqual(plain(out.map(x=>[x.left,x.top])),[[80,90],[320,270],[500,510]]);
  for(const p of out){assert.ok(p.left>20&&p.left<560);assert.ok(p.top>30&&p.top<570);}
});

test('Quadruple cell-derived intersections stay internal under every board rotation',()=>{
  for(let r=1;r<9;r++)for(let c=1;c<9;c++)for(let turns=0;turns<4;turns++){
    const rotated=cellsFor([r,c]).map(p=>plain(H.rotateCell(p,turns,9)));
    const at=plain(H.deriveIntersection(rotated,9));
    assert.ok(at,`missing intersection for ${r},${c} after ${turns} turns`);
    assert.ok(at[0]>=1&&at[0]<=8&&at[1]>=1&&at[1]<=8,`edge intersection ${at} from ${r},${c}/${turns}`);
  }
});

test('Quadruple regression: rotating a bottom-edge-adjacent internal clue never moves it onto the outer border',()=>{
  const generated={data:{quads:[{at:[8,1],cells:cellsFor([8,1]),digits:[1,2,4,6]}]}};
  const q=plain(H.normalizeGeneratedQuads(generated,1,9));
  assert.equal(q.length,1);
  assert.deepEqual(q[0].at,[1,1]);
  assert.notDeepEqual(q[0].at,[1,0]);
});

test('Quadruple rendering derives topology from cells rather than trusting stale q.at coordinates',()=>{
  const generated={data:{quads:[{at:[0,0],cells:cellsFor([4,5]),digits:[2,4,6,8]}]}};
  const q=plain(H.normalizeGeneratedQuads(generated,0,9));
  assert.equal(q.length,1);
  assert.deepEqual(q[0].at,[4,5]);
});

test('Quadruple layout rejects genuinely invalid intersections and malformed cell topology',()=>{
  assert.equal(H.validIntersection({at:[1,8]},9),true);
  assert.equal(H.validIntersection({at:[0,8]},9),false);
  assert.equal(H.deriveIntersection([[0,0],[0,1],[1,0],[2,1]],9),null);
  assert.equal(H.deriveIntersection([[0,0],[0,1],[1,0],[1,0]],9),null);
});

test('Quadruple final renderer uses generated topology, compact markers, and no global mutation/resize observer loop',()=>{
  const src=fs.readFileSync(path.join(root,'games/quadruple-render-final-hardening.js'),'utf8');
  assert.match(src,/QuadrupleRuntimeHardening\.lastGenerated/);
  assert.match(src,/deriveIntersection/);
  assert.match(src,/quadCompact/);
  assert.match(src,/gridTemplateColumns='repeat\(2,1fr\)'/);
  assert.match(src,/sudoku:variantchange/);
  assert.doesNotMatch(src,/MutationObserver/);
  assert.doesNotMatch(src,/ResizeObserver/);
});
