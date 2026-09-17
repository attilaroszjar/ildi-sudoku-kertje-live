'use strict';
const test=require('node:test'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ctx={console};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const f of [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(x=>x.startsWith('games/sudoku-bank')))vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8'),ctx);
const variant=id=>ctx.SudokuBank.find(x=>x.id===id);
function visible(a){let m=0,n=0;for(const x of a)if(x>m){m=x;n++;}return n;}
function line(g,cl){let a=cl.axis==='row'?g.solution[cl.index].slice():g.solution.map(r=>r[cl.index]);if(cl.side==='right'||cl.side==='bottom')a.reverse();return a;}

test('Iteration 45 makes Inside Skyscrapers seed-diverse with solution-derived sightlines',()=>{
 const v=variant('inside-skyscrapers'), sols=new Set();
 for(const seed of [1,2,3]){const g=ctx.SudokuGenerator.make(v,seed,'focused');sols.add(JSON.stringify(g.solution));assert.equal(g.generation.unique,true);assert.equal(g.generation.variantEssential,true);assert.match(g.generation.generatorFamily,/derived-sightlines/);assert.ok(g.data.sightClues.length>=10);for(const cl of g.data.sightClues){assert.equal(visible(cl.cells.map(p=>g.solution[p[0]][p[1]])),g.solution[cl.source[0]][cl.source[1]]);}}
 assert.equal(sols.size,3);
});

test('Iteration 45 makes Domino Skyscrapers seed-diverse with recomputed clues and equal-sum domino geometry',()=>{
 const v=variant('domino-skyscrapers'), sols=new Set();
 for(const seed of [1,2,3]){const g=ctx.SudokuGenerator.make(v,seed,'focused');sols.add(JSON.stringify(g.solution));assert.equal(g.generation.unique,true);assert.equal(g.generation.variantEssential,true);assert.match(g.generation.generatorFamily,/derived-dominoes/);for(const cl of g.data.clues)assert.equal(visible(line(g,cl)),cl.count);const sums=g.data.dominoes.map(dm=>dm.reduce((s,p)=>s+g.solution[p[0]][p[1]],0));assert.equal(g.data.dominoes.length,5);assert.equal(new Set(sums).size,1);}
 assert.equal(sols.size,3);
});

test('Iteration 45 closes solution-level seed diversity across all 16 Skyscraper systems',()=>{
 const ids=['classic-skyscrapers','skyscraper','skyscraper-sums','skyscraper-mixed','skyscraper-nontouching','skyscraper-parks','sum-skyscraper-parks','inside-skyscrapers','diagonal-skyscrapers','product-skyscrapers','killer-skyscrapers','domino-skyscrapers','skyscraper-parks2','evenodd-skyscrapers','toroidal-skyscrapers','double-skyscrapers'];
 for(const id of ids){const v=variant(id),sols=new Set();for(const seed of [1,2,3]){const g=ctx.SudokuGenerator.make(v,seed,'focused');sols.add(JSON.stringify(g.solution));assert.equal(g.generation.unique,true,id+' unique');assert.equal(g.generation.variantEssential,true,id+' essential');}assert.equal(sols.size,3,id+' solution diversity');}
});
