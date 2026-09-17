import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSymbols,rotateGrid,reflectGrid,structuralSolutionFingerprint,canonicalJson,summarizeProductionSamples} from '../scripts/lib/sudoku-production-audit.mjs';

const base=[
  [1,2,3,4,5,6,7,8,9],[4,5,6,7,8,9,1,2,3],[7,8,9,1,2,3,4,5,6],
  [2,3,4,5,6,7,8,9,1],[5,6,7,8,9,1,2,3,4],[8,9,1,2,3,4,5,6,7],
  [3,4,5,6,7,8,9,1,2],[6,7,8,9,1,2,3,4,5],[9,1,2,3,4,5,6,7,8]
];

test('symbol normalization ignores digit relabeling',()=>{
  const relabeled=base.map(row=>row.map(v=>({1:9,2:7,3:5,4:3,5:1,6:8,7:6,8:4,9:2})[v]));
  assert.deepEqual(normalizeSymbols(base),normalizeSymbols(relabeled));
  assert.equal(structuralSolutionFingerprint(base),structuralSolutionFingerprint(relabeled));
});

test('structural fingerprint is invariant under all D4 transforms',()=>{
  const expected=structuralSolutionFingerprint(base);let grid=base;
  for(let i=0;i<4;i++){
    assert.equal(structuralSolutionFingerprint(grid),expected);
    assert.equal(structuralSolutionFingerprint(reflectGrid(grid)),expected);
    grid=rotateGrid(grid);
  }
});

test('canonical JSON ignores object key insertion order',()=>{
  assert.equal(canonicalJson({b:2,a:{d:4,c:3}}),canonicalJson({a:{c:3,d:4},b:2}));
});

test('sample summary passes only complete distinct bounded evidence',()=>{
  const rows=[0,1,2].map(i=>({status:'PASS',solution:`s${i}`,structure:`x${i}`,topology:`t${i}`,puzzle:`p${i}`,ms:10+i}));
  const result=summarizeProductionSamples(rows,{expectedSamples:3,requireTopology:true,maxSampleMs:20});
  assert.equal(result.pass,true);
  assert.deepEqual(result.failures,[]);
});

test('sample summary fails closed on structural duplicates, timeout and runtime excess',()=>{
  const rows=[
    {status:'PASS',solution:'s0',structure:'same',topology:'t0',puzzle:'p0',ms:25},
    {status:'PASS',solution:'s1',structure:'same',topology:'t1',puzzle:'p1',ms:10},
    {status:'TIMEOUT'}
  ];
  const result=summarizeProductionSamples(rows,{expectedSamples:3,requireTopology:true,maxSampleMs:20});
  assert.equal(result.pass,false);
  assert.ok(result.failures.some(x=>x.startsWith('passes=')));
  assert.ok(result.failures.some(x=>x.startsWith('timeouts=')));
  assert.ok(result.failures.some(x=>x.startsWith('structuralSolutionUnique=')));
  assert.ok(result.failures.includes('runtime>20ms'));
});
