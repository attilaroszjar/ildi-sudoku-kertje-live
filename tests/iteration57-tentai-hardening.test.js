const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..'),ctx={console,Map,Set,Math,JSON,Array,Object,Number,String,Boolean,Date,Uint8Array};ctx.globalThis=ctx;vm.createContext(ctx);
for(const f of fs.readdirSync(path.join(root,'games')).filter(x=>/^sudoku-bank(?:-iteration\d+)?\.js$/.test(x)).sort((a,b)=>{const n=x=>+(x.match(/iteration(\d+)/)||[,0])[1];return n(a)-n(b)}).concat(['sudoku-generator.js']))vm.runInContext(fs.readFileSync(path.join(root,'games',f),'utf8'),ctx,{filename:f});
const G=ctx.SudokuBank.find(x=>x.id==='tentai-show'),count=(p,l=2,s={})=>ctx.SudokuGenerator.countGalaxiesSolutions(p,l,s);
test('counter distinguishes zero, one and multiple visible-center puzzles',()=>{
  assert.equal(count({size:1,centers:[{r:.5,c:.5}]}),1);
  assert.equal(count({size:2,centers:[{r:.5,c:.5},{r:1.5,c:1.5}]}),0);
  assert.equal(count({size:4,centers:[{r:2,c:2},{r:.5,c:1.5},{r:3.5,c:2.5}]}),2);
});
test('center anchoring and exact rotational partners are enforced',()=>{
  assert.equal(count({size:2,centers:[{r:1,c:1}]}),1);
  assert.equal(count({size:2,centers:[{r:.75,c:.75}]}),0);
});
test('10 focused seeds are solver-certified unique and seed-diverse',()=>{const puzzles=new Set(),solutions=new Set();for(let seed=1;seed<=10;seed++){const g=ctx.SudokuGenerator.make(G,seed,'focused'),stats={};assert.equal(g.generation.unique,true,'seed '+seed);assert.equal(g.generation.verification,'solver-verified');assert.equal(count(g.puzzle,2,stats),1,'seed '+seed);assert.ok(stats.firstSolution);puzzles.add(JSON.stringify(g.puzzle));solutions.add(JSON.stringify(g.solution));}assert.equal(puzzles.size,10);assert.ok(solutions.size>=8,solutions.size);});
test('difficulty grows by measured search complexity',()=>{const avg={};for(const d of ['gentle','focused','expert']){const xs=[];for(let seed=1;seed<=10;seed++)xs.push(ctx.SudokuGenerator.make(G,seed,d).generation.difficultyScore);avg[d]=xs.reduce((a,b)=>a+b,0)/xs.length;}assert.ok(avg.focused>avg.gentle,{avg});assert.ok(avg.expert>avg.focused,{avg});});
test('runtime uses boundary drawing with mobile-safe edge targets',()=>{const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8'),css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');assert.match(lib,/function mountGalaxies/);assert.match(lib,/galaxy-boundary/);assert.match(lib,/validPartition/);assert.match(lib,/Határok törlése/);assert.doesNotMatch(lib,/grid\[rr\]\[cc\]=grid\[rr\]\[cc\]<0\?near/);assert.match(css,/\.galaxy-boundary\.vertical\{width:24px/);assert.match(css,/@media\(max-width:650px\).*\.galaxy-boundary\.vertical\{width:44px\}/s);assert.match(css,/\.galaxy-boundary\.horizontal\{height:44px\}/);});
test('catalog remains 106',()=>assert.equal(ctx.SudokuBank.length,106));
