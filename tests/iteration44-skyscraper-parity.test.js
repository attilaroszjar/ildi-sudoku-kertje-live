'use strict';
const test=require('node:test'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ctx={console};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const f of [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(x=>x.startsWith('games/sudoku-bank')))vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8'),ctx);
const variant=id=>{const v=ctx.SudokuBank.find(x=>x.id===id);assert.ok(v,id);return v;};
function visible(a){let m=0,n=0;for(const x of a)if(x>m){m=x;n++;}return n;}
function visSum(a){let m=0,s=0;for(const x of a)if(x>m){m=x;s+=x;}return s;}
function visProduct(a){let m=0,p=1;for(const x of a)if(x>m){m=x;p*=x;}return p;}
function line(g,cl){let a=cl.axis==='row'?g.solution[cl.index].slice():g.solution.map(r=>r[cl.index]);if(cl.side==='right'||cl.side==='bottom')a.reverse();return a;}

test('Iteration 44 makes the standard Skyscraper counter enforce its UI visibility rule',()=>{
  const v=variant('skyscraper'),g=ctx.SudokuGenerator.make(v,44,'focused');
  assert.equal(ctx.SudokuGenerator.countVariantSolutions(g.puzzle,g,2),1);
  const broken=JSON.parse(JSON.stringify(g));broken.data.clues[0].count=99;
  assert.equal(ctx.SudokuGenerator.countVariantSolutions(g.solution,broken,2),0);
  assert.equal(g.generation.variantEssential,true);
});

test('Iteration 44 gives eight additional Skyscraper systems seed-specific completed solutions and recomputed constraints',()=>{
  const ids=['skyscraper','skyscraper-sums','skyscraper-mixed','skyscraper-nontouching','product-skyscrapers','killer-skyscrapers','diagonal-skyscrapers','toroidal-skyscrapers'];
  for(const id of ids){
    const v=variant(id),solutions=new Set();
    for(const seed of [1,2,3]){
      const g=ctx.SudokuGenerator.make(v,seed,'focused');solutions.add(JSON.stringify(g.solution));
      assert.equal(g.generation.unique,true,id+' unique');assert.equal(g.generation.variantEssential,true,id+' essential');assert.match(g.generation.generatorFamily,/symbol-permutation/,id+' family');
      if(id==='skyscraper')for(const cl of g.data.clues)assert.equal(visible(line(g,cl)),cl.count);
      if(id==='skyscraper-sums')for(const cl of g.data.clues)assert.equal(visSum(line(g,cl)),cl.sum);
      if(id==='product-skyscrapers')for(const cl of g.data.clues)assert.equal(visProduct(line(g,cl)),cl.product);
      if(id==='skyscraper-mixed')for(const cl of g.data.clues){const a=line(g,cl);assert.ok(cl.value===visible(a)||cl.value===a[0]);}
      if(id==='skyscraper-nontouching')for(let r=0;r<9;r++)for(let c=0;c<9;c++)for(const [dr,dc] of [[1,1],[1,-1]]){const rr=r+dr,cc=c+dc;if(rr<9&&cc>=0&&cc<9)assert.notEqual(g.solution[r][c],g.solution[rr][cc]);}
      if(id==='killer-skyscrapers')for(const cage of g.data.cages)assert.equal(cage.cells.reduce((s,p)=>s+g.solution[p[0]][p[1]],0),cage.sum);
      if(id==='diagonal-skyscrapers')for(const cl of g.data.sightClues)assert.equal(visible(cl.cells.map(p=>g.solution[p[0]][p[1]])),cl.count);
      if(id==='toroidal-skyscrapers')for(const cl of g.data.toroidalClues)assert.equal(visible(cl.cells.map(p=>g.solution[p[0]][p[1]])),cl.count);
    }
    assert.equal(solutions.size,3,id+' solution diversity');
  }
});

test('Iteration 44 documents that Inside and Domino were the remaining fixed-topology families before Iteration 45',()=>{
  const limits=fs.readFileSync(path.join(root,'docs/limitations.md'),'utf8');
  assert.match(limits,/Iteration 44[\s\S]*(Inside|Domino)/i);
});
