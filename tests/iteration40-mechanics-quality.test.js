const fs=require('fs'),vm=require('vm'),path=require('path'),root=path.join(__dirname,'..');
const ctx={console};ctx.globalThis=ctx;vm.createContext(ctx);
const files=['games/sudoku-bank.js'];for(let i=2;i<=23;i++)files.push('games/sudoku-bank-iteration'+i+'.js');for(let i=30;i<=38;i++)files.push('games/sudoku-bank-iteration'+i+'.js');files.push('games/sudoku-generator.js');
files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx));
function ok(x,m){if(!x)throw Error(m)}
for(const id of ['nurikabe','nonogram','masyu']){
  const v=ctx.SudokuBank.find(x=>x.id===id);ok(v,id+' exists');
  for(const d of ['gentle','focused','expert']){
    const sig=new Set();
    for(const seed of [1,2,3,5,8,13]){
      const g=ctx.SudokuGenerator.make(v,seed,d);sig.add(JSON.stringify(g.solution));
      const count=id==='nurikabe'?ctx.SudokuGenerator.countNurikabeSolutions(g.puzzle,2):id==='nonogram'?ctx.SudokuGenerator.countNonogramSolutions(g.puzzle,2):ctx.SudokuGenerator.countMasyuSolutions(g.puzzle,2);
      ok(count===1,id+' unique '+d+' '+seed);ok(g.generation.unique,id+' unique metadata');
    }
    ok(sig.size>=4,id+' diversity '+d+' only '+sig.size);
  }
}
const nv=ctx.SudokuBank.find(x=>x.id==='nurikabe');
const ng=ctx.SudokuGenerator.make(nv,12345,'gentle'),nf=ctx.SudokuGenerator.make(nv,12345,'focused'),ne=ctx.SudokuGenerator.make(nv,12345,'expert');
ok((ng.preShaded||[]).length>0,'Nurikabe gentle starter marks propagated');ok((nf.preShaded||[]).length===1,'Nurikabe focused starter mark propagated');ok((ne.preShaded||[]).length===0,'Nurikabe expert has no starter sea');
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8'),app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8'),css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8'),gen=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
ok(app.includes('function finishSolve(){if(state.completed)return;')&&app.includes('complete:finishSolve'),'central completion API and duplicate guard');ok((lib.match(/function solvedGrid\(\)/g)||[]).length>=2,'Futoshiki and Fillomino auto-complete');ok(lib.includes("(marks[r][c]===1?1:0)!==v.solution[r][c]"),'mark semantics ignore safe X/white annotations');ok(gen.includes('bridgesCross(islands'),'Bridges solver rejects crossings');ok(lib.includes('A hidak nem keresztezhetik egymást.'),'Bridges UI blocks crossings');ok(css.includes('background-position:calc(50% / var(--masyu-size))'),'Masyu guide grid aligned to nodes');ok(css.includes('.nonogram-col-clue.done'),'Nonogram completed clue styling');
console.log('Iteration 40 mechanics/generation QA: PASS');
