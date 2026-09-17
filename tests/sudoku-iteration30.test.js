const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
let ctx={console,globalThis:null,Map,Set,WeakMap};ctx.globalThis=ctx;vm.createContext(ctx);
['games/sudoku-bank.js','games/sudoku-bank-iteration30.js','games/sudoku-generator.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));
function ok(v,m){if(!v)throw new Error(m)}
const h=ctx.SudokuBank.find(v=>v.id==='hitori');
ok(h,'Hitori registered');ok(h.family==='Japanese logic','Japanese family');
for(const difficulty of ['gentle','focused','expert']){
  for(const seed of [1,17,20260825]){
    const g=ctx.SudokuGenerator.make(h,seed,difficulty);
    ok(g.puzzle.length===6,'6x6 puzzle');ok(g.solution.length===6,'6x6 solution');
    ok(ctx.SudokuGenerator.countHitoriSolutions(g.puzzle,2)===1,'unique Hitori '+seed+' '+difficulty);
    for(let r=0;r<6;r++)for(let c=0;c<6;c++)if(g.solution[r][c]){
      if(r+1<6)ok(!g.solution[r+1][c],'no adjacent black vertical');
      if(c+1<6)ok(!g.solution[r][c+1],'no adjacent black horizontal');
    }
  }
}
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');ok(lib.includes("id:'japanese'"),'Japanese display group');ok(lib.includes('mountHitori'),'special renderer');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');ok(css.includes('.hitori-board'),'Hitori CSS');
const i18n=fs.readFileSync(path.join(root,'assets/i18n.js'),'utf8');ok(i18n.includes("hitori:['Hitori'"),'HU Hitori translation');
console.log('Iteration 30 Hitori QA: PASS');
