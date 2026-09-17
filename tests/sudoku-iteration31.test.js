const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
let ctx={console,globalThis:null,Map,Set,WeakMap};ctx.globalThis=ctx;vm.createContext(ctx);
['games/sudoku-bank.js','games/sudoku-bank-iteration30.js','games/sudoku-bank-iteration31.js','games/sudoku-generator.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));
function ok(v,m){if(!v)throw new Error(m)}
const b=ctx.SudokuBank.find(v=>v.id==='hashiwokakero');ok(b,'Bridges registered');ok(b.family==='Japanese logic','Japanese family');ok(b.kind==='bridges','Bridges kind');
for(const difficulty of ['gentle','focused','expert'])for(const seed of [1,17,20260825]){
 const g=ctx.SudokuGenerator.make(b,seed,difficulty);ok(g.puzzle.size===7,'7x7 board');ok(g.puzzle.islands.length===9,'nine islands');ok(g.solution.length===12,'twelve candidate edges');ok(ctx.SudokuGenerator.countBridgesSolutions(g.puzzle,2)===1,'unique Bridges '+seed+' '+difficulty);ok(g.generation.unique,'unique metadata');
}
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');ok(lib.includes('mountBridges'),'special Bridges renderer');ok(lib.includes("current.kind==='bridges'"),'transform bypass');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');ok(css.includes('.bridges-board'),'Bridges CSS');
const i18n=fs.readFileSync(path.join(root,'assets/i18n.js'),'utf8');ok(i18n.includes("'hashiwokakero'"),'HU Bridges translation');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');ok(html.includes('sudoku-bank-iteration31.js'),'Iteration 31 bank loaded');
console.log('Iteration 31 Bridges QA: PASS');
