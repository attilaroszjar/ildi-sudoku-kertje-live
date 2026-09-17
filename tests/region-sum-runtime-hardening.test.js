'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const ctx={console};ctx.globalThis=ctx;ctx.window=ctx;ctx.SudokuGenerator={countVariantSolutions(){return 77;}};ctx.LogicRoom={games:[]};vm.createContext(ctx);
for(const f of ['games/region-sum-segments.js','games/region-sum-runtime-hardening.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);

const hard=ctx.RegionSumRuntimeHardening;assert.ok(hard);
const line=[[0,1],[0,2],[0,3],[1,3],[1,2]];
const variant={id:'region-sum',kind:'regionsum',data:{lines:[line]},solution:Array.from({length:9},()=>Array(9).fill(0))};
function grid(){return Array.from({length:9},()=>Array(9).fill(0));}

test('runtime wrapper routes Region Sum through contiguous-segment solver',()=>{
  const g=grid();g[0][1]=1;g[0][2]=5;g[0][3]=2;g[1][3]=4;g[1][2]=6;
  const stats={};const count=ctx.SudokuGenerator.countVariantSolutions(g,variant,2,stats);
  assert.notEqual(count,77,'Region Sum must bypass the legacy base solver');
  assert.ok(count>=1,'classic-valid A-B-A equal-segment partial must remain solvable');
  assert.ok(stats.nodes>0);
});

test('runtime Region Sum conflict uses A-B-A contiguous segments',()=>{
  const g=grid();g[0][1]=1;g[0][2]=5;g[0][3]=2;g[1][3]=4;g[1][2]=6;
  assert.equal(hard.regionConflict(variant,g,1,2),false,'equal A-B-A segment sums are valid');
  g[1][2]=7;
  assert.equal(hard.regionConflict(variant,g,1,2),true,'unequal re-entry segment must conflict');
});

test('runtime hardening preserves classic conflicts separately',()=>{
  const g=grid();g[0][0]=4;g[0][8]=4;
  assert.equal(hard.classicConflict(g,0,0),true);
  g[0][8]=0;assert.equal(hard.classicConflict(g,0,0),false);
});

test('index loads Region Sum semantics before runtime hardening and before app',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const seg=html.indexOf('games/region-sum-segments.js'),lib=html.indexOf('games/sudoku-library.js'),hardening=html.indexOf('games/region-sum-runtime-hardening.js'),app=html.indexOf('assets/app.js');
  assert.ok(seg>=0&&lib>=0&&hardening>=0&&app>=0);
  assert.ok(seg<lib);assert.ok(lib<hardening);assert.ok(hardening<app);
});
