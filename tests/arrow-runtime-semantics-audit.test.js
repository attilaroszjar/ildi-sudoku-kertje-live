'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function context(){const c={console,globalThis:null,window:null,Map,Set,WeakMap};c.globalThis=c;c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'games/sudoku-bank.js'),'utf8'),c);vm.runInContext(fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8'),c);return c;}
function arrow(c){const v=c.SudokuBank.find(x=>x.id==='arrow');assert.ok(v);return v;}

test('Arrow canonical data uses circle equals path sum semantics',()=>{
  const c=context(),v=arrow(c);assert.ok(v.data.arrows.length>0);
  for(const a of v.data.arrows){const circle=v.solution[a.circle[0]][a.circle[1]];const sum=a.path.reduce((s,p)=>s+v.solution[p[0]][p[1]],0);assert.equal(circle,sum);assert.ok(a.path.length>=2);}
});

test('Arrow exact variant solver rejects a completed wrong sum',()=>{
  const c=context(),v=arrow(c),bad=JSON.parse(JSON.stringify(v));
  bad.data.arrows=[{circle:[0,0],path:[[0,1],[0,2]]}];
  assert.notEqual(bad.solution[0][0],bad.solution[0][1]+bad.solution[0][2]);
  assert.equal(c.SudokuGenerator.countVariantSolutions(bad.solution,bad,2),0);
});

test('Arrow exact variant solver accepts the canonical completed solution',()=>{
  const c=context(),v=arrow(c);assert.equal(c.SudokuGenerator.countVariantSolutions(v.solution,v,2),1);
});

test('Arrow partial pruning rejects path overflow once circle is known',()=>{
  const c=context(),v=arrow(c),probe=Array.from({length:9},()=>Array(9).fill(0));
  const a=v.data.arrows[0];probe[a.circle[0]][a.circle[1]]=3;probe[a.path[0][0]][a.path[0][1]]=4;
  const working=Object.assign({},v,{puzzle:probe});assert.equal(c.SudokuGenerator.countVariantSolutions(probe,working,2),0);
});

test('Arrow renderer and existing production contract remain present',()=>{
  const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  const existing=fs.readFileSync(path.join(root,'tests/arrow-sudoku-post-hardening.test.js'),'utf8');
  assert.match(lib,/v\.kind==='arrow'/);assert.match(lib,/d\.arrows/);assert.match(existing,/variant-essential/);assert.match(existing,/Gentle < Focused < Expert/);
});
