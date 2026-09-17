'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function load(name){return fs.readFileSync(path.join(root,name),'utf8');}
function context(){const c={console,globalThis:null,window:null,Map,Set,WeakMap};c.globalThis=c;c.window=c;vm.createContext(c);for(const f of ['games/sudoku-bank.js','games/sudoku-generator.js','games/line-generator-core.js','games/killer-generator.js','games/killer-generator-hardening.js'])vm.runInContext(load(f),c,{filename:f});return c;}
function killer(c){const v=c.SudokuBank.find(x=>x.id==='killer');assert.ok(v);return v;}
function key(p){return p[0]+','+p[1];}
function connected(cage){const cells=new Set(cage.cells.map(key)),seen=new Set(),stack=[cage.cells[0]];while(stack.length){const p=stack.pop(),k=key(p);if(seen.has(k))continue;seen.add(k);for(const q of [[p[0]-1,p[1]],[p[0]+1,p[1]],[p[0],p[1]-1],[p[0],p[1]+1]])if(cells.has(key(q))&&!seen.has(key(q)))stack.push(q);}return seen.size===cage.cells.length;}
test('Killer fresh cage topology is a complete connected non-singleton partition',()=>{const c=context(),v=killer(c);for(const seed of [1,17,101,2026]){const g=c.SudokuGenerator.make(v,seed,'focused'),covered=new Set();assert.equal(g.generation.generatorFamily,'killer-fresh-fill-mrv-cages');for(const cage of g.data.cages){assert.ok(cage.cells.length>=2&&cage.cells.length<=4);assert.ok(connected(cage));const digits=cage.cells.map(p=>g.solution[p[0]][p[1]]);assert.equal(new Set(digits).size,digits.length);assert.equal(digits.reduce((a,b)=>a+b,0),cage.sum);for(const p of cage.cells){assert.ok(!covered.has(key(p)));covered.add(key(p));}}assert.equal(covered.size,81);}});
test('Killer fresh generation is deterministic, exact and variant-essential',()=>{const c=context(),v=killer(c);for(const d of ['gentle','focused','expert'])for(const seed of [1,17,101]){const a=c.SudokuGenerator.make(v,seed,d),b=c.SudokuGenerator.make(v,seed,d);assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.data.cages,b.data.cages);assert.equal(a.generation.unique,true);assert.equal(a.generation.verification,'solver-verified');assert.equal(a.generation.variantEssential,true);assert.equal(c.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),1);assert.ok(c.SudokuGenerator.countSolutions(a.puzzle,2)>1);}});
test('Killer fresh generation changes solution and cage topology across seeds',()=>{const c=context(),v=killer(c),solutions=new Set(),topologies=new Set();for(const seed of [1,2,3,4,5,6,7,8]){const g=c.SudokuGenerator.make(v,seed,'focused');solutions.add(g.solution.flat().join(''));topologies.add(g.generation.topologyFingerprint);}assert.ok(solutions.size>=6,'expected fresh solution diversity');assert.ok(topologies.size>=6,'expected cage topology diversity');});
