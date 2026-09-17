const fs=require('fs'),vm=require('vm'),path=require('path'),root=path.join(__dirname,'..');
const ctx={console};ctx.globalThis=ctx;vm.createContext(ctx);
const files=['games/sudoku-bank.js'];for(let i=2;i<=23;i++)files.push('games/sudoku-bank-iteration'+i+'.js');for(let i=30;i<=38;i++)files.push('games/sudoku-bank-iteration'+i+'.js');files.push('games/sudoku-generator.js');
files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx));
function ok(x,m){if(!x)throw Error(m)}
function variant(id){const v=ctx.SudokuBank.find(x=>x.id===id);ok(v,id+' exists');return v;}
for(const d of ['gentle','focused','expert']){
  const sl=new Set(),fu=new Set(),fi=new Set();
  for(const seed of [1,2,3,4,5,6,7,8,13,21]){
    const sg=ctx.SudokuGenerator.make(variant('slitherlink'),seed,d);
    ok(ctx.SudokuGenerator.countSlitherlinkSolutions(sg.puzzle,2)===1,'Slitherlink unique '+d+' '+seed);
    sl.add(JSON.stringify(sg.solution));
    const fg=ctx.SudokuGenerator.make(variant('futoshiki'),seed,d);
    ok(ctx.SudokuGenerator.countFutoshikiSolutions(fg.puzzle,fg.data.inequalities,2)===1,'Futoshiki unique '+d+' '+seed);
    fu.add(JSON.stringify(fg.solution));
    const ig=ctx.SudokuGenerator.make(variant('fillomino'),seed,d);
    ok(ctx.SudokuGenerator.countFillominoSolutions(ig.puzzle,2)===1,'Fillomino unique '+d+' '+seed);
    fi.add(JSON.stringify(ig.solution));
  }
  ok(sl.size>=6,'Slitherlink solution diversity '+d+' only '+sl.size);
  ok(fu.size>=8,'Futoshiki solution diversity '+d+' only '+fu.size);
  ok(fi.size>=6,'Fillomino transform diversity '+d+' only '+fi.size);
}
console.log('Iteration 41 generator-depth QA: PASS');
