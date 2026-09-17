'use strict';
const test=require('node:test'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ctx={console};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const f of [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(x=>x.startsWith('games/sudoku-bank')))vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8'),ctx);
const variant=id=>{const v=ctx.SudokuBank.find(x=>x.id===id);assert.ok(v,id);return v;};
const cases=[
  ['classic-skyscrapers','countDominoSkyscraperSolutions'],
  ['skyscraper-parks','countParkSolutions'],
  ['sum-skyscraper-parks','countParkSolutions'],
  ['skyscraper-parks2','countParks2Solutions'],
  ['evenodd-skyscrapers','countEvenOddSkyscraperSolutions'],
  ['double-skyscrapers','countDoubleSkyscraperSolutions']
];
function visible(line){let max=0,count=0;for(const x of line)if(x>max){max=x;count++;}return count;}
function line(g,cl){let a=cl.axis==='row'?g.solution[cl.index].slice():g.solution.map(r=>r[cl.index]);if(cl.side==='right'||cl.side==='bottom')a.reverse();return a;}

test('Iteration 43 gives six Skyscraper systems seed-specific completed solutions with dynamic clues',()=>{
  for(const [id,solver] of cases){
    const v=variant(id),solutions=new Set();
    for(const seed of [1,2,3]){
      const g=ctx.SudokuGenerator.make(v,seed,'focused');solutions.add(JSON.stringify(g.solution));
      assert.equal(ctx.SudokuGenerator[solver](g.puzzle,g,2,false),1,id+' seed '+seed);
      assert.equal(g.generation.variantEssential,true,id+' essential');
      assert.match(g.generation.generatorFamily,/permutation/,id+' family');
      if(id==='evenodd-skyscrapers'){
        for(const p of g.data.parityCells)assert.equal(g.solution[p.cell[0]][p.cell[1]]%2?'odd':'even',p.parity);
        for(const cl of g.data.clues)assert.equal(visible(line(g,cl))%2?'odd':'even',cl.parity);
      } else if(id==='skyscraper-parks'||id==='sum-skyscraper-parks'||id==='skyscraper-parks2'){
        const park=g.data.parkValue;for(const cl of g.data.clues){const a=line(g,cl).filter(x=>x!==park);if(id==='sum-skyscraper-parks'){let m=0,sum=0;for(const x of a)if(x>m){m=x;sum+=x;}assert.equal(sum,cl.sum);}else assert.equal(visible(a),cl.count);}
      } else for(const cl of g.data.clues)assert.equal(visible(line(g,cl)),cl.count);
    }
    assert.equal(solutions.size,3,id+' solution diversity');
  }
});

test('Iteration 43 keeps the Skyscraper catalogue at sixteen systems and documents remaining fixed-topology families',()=>{
  const sky=['classic-skyscrapers','skyscraper','skyscraper-sums','skyscraper-mixed','skyscraper-nontouching','skyscraper-parks','sum-skyscraper-parks','inside-skyscrapers','diagonal-skyscrapers','product-skyscrapers','killer-skyscrapers','domino-skyscrapers','skyscraper-parks2','evenodd-skyscrapers','toroidal-skyscrapers','double-skyscrapers'];
  assert.equal(sky.filter(id=>ctx.SudokuBank.some(v=>v.id===id)).length,16);
  const limits=fs.readFileSync(path.join(root,'docs/limitations.md'),'utf8');assert.match(limits,/Iteration 43[\s\S]*remaining.*fixed/i);
});
