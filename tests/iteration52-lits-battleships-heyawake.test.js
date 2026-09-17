'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..'),ctx={console};ctx.globalThis=ctx;vm.createContext(ctx);
for(const f of ['games/sudoku-bank.js','games/sudoku-bank-iteration52.js','games/sudoku-generator.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const ids=['lits','battleships','heyawake'];
test('Iteration 52 adds three researched families',()=>{for(const id of ids)assert.ok(ctx.SudokuBank.find(v=>v.id===id),id);});
test('all three use exact solution counters and remain unique across seeds',()=>{
 const counters={lits:'countLitsSolutions',battleships:'countBattleshipSolutions',heyawake:'countHeyawakeSolutions'};
 for(const id of ids){const v=ctx.SudokuBank.find(x=>x.id===id);for(const seed of [3,7,19]){const g=ctx.SudokuGenerator.make(v,seed,'expert');assert.equal(g.generation.unique,true,id+' seed '+seed);assert.equal(ctx.SudokuGenerator[counters[id]](g.puzzle,2),1,id+' counter '+seed);}}
});
test('difficulty gives more starter information on easier levels',()=>{
 for(const id of ids){const v=ctx.SudokuBank.find(x=>x.id===id),a=ctx.SudokuGenerator.make(v,23,'gentle'),b=ctx.SudokuGenerator.make(v,23,'focused'),c=ctx.SudokuGenerator.make(v,23,'expert');assert.ok(a.generation.clues>=b.generation.clues,id+' gentle>=focused');assert.ok(b.generation.clues>=c.generation.clues,id+' focused>=expert');}
});
test('seed diversity changes completed solutions or geometry',()=>{
 for(const id of ids){const v=ctx.SudokuBank.find(x=>x.id===id),a=ctx.SudokuGenerator.make(v,5,'focused'),b=ctx.SudokuGenerator.make(v,14,'focused');const sa=JSON.stringify([a.solution,a.puzzle.regions]),sb=JSON.stringify([b.solution,b.puzzle.regions]);assert.notEqual(sa,sb,id+' seed diversity');}
});
test('Iteration 52 UI, localization and offline loader are wired',()=>{const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8'),css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8'),i18n=fs.readFileSync(path.join(root,'assets/i18n.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.match(lib,/mountIteration52Puzzle/);assert.match(css,/iteration52-board/);for(const id of ids)assert.ok(i18n.includes("'"+id+"'"),id+' translation');assert.match(html,/sudoku-bank-iteration52\.js/);assert.match(html,/106 logikai játék/);});
