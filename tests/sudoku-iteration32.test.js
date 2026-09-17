const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
let ctx={console,globalThis:null,Map,Set,WeakMap};ctx.globalThis=ctx;vm.createContext(ctx);
['games/sudoku-bank.js','games/sudoku-bank-iteration30.js','games/sudoku-bank-iteration31.js','games/sudoku-bank-iteration32.js','games/sudoku-generator.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));
function ok(v,m){if(!v)throw new Error(m)}
const f=ctx.SudokuBank.find(v=>v.id==='fillomino');ok(f,'Fillomino registered');ok(f.family==='Japanese logic','Japanese family');ok(f.kind==='fillomino','Fillomino kind');
for(const difficulty of ['gentle','focused','expert'])for(const seed of [1,17,20260825]){
 const g=ctx.SudokuGenerator.make(f,seed,difficulty);ok(g.puzzle.length===6&&g.puzzle[0].length===6,'6x6 board');ok(ctx.SudokuGenerator.countFillominoSolutions(g.puzzle,2)===1,'unique Fillomino '+seed+' '+difficulty);ok(g.generation.unique,'unique metadata');ok(g.solution.flat().every(x=>x>=1&&x<=6),'valid values');
}
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');ok(lib.includes('mountFillomino'),'special Fillomino renderer');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');ok(css.includes('.fillomino-board'),'Fillomino CSS');
const i18n=fs.readFileSync(path.join(root,'assets/i18n.js'),'utf8');ok(i18n.includes("'fillomino'"),'HU Fillomino translation');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');ok(html.includes('sudoku-bank-iteration32.js'),'Iteration 32 bank loaded');
console.log('Iteration 32 Fillomino QA: PASS');
