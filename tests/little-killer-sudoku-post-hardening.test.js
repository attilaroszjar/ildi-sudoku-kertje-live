'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {performance}=require('node:perf_hooks');

const root=path.resolve(__dirname,'..');
const ctx={console};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const f of [...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(x=>x.startsWith('games/sudoku-bank')))vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'games/little-killer-runtime-hardening.js'),'utf8'),ctx);
const v=ctx.SudokuBank.find(x=>x.id==='little-killer');
assert.ok(v,'canonical Little Killer Sudoku must exist');

function clueSum(grid,cl){return cl.cells.reduce((s,p)=>s+grid[p[0]][p[1]],0);}
function latinAndBoxes(grid){const n=grid.length;for(let i=0;i<n;i++){assert.equal(new Set(grid[i]).size,n);assert.equal(new Set(grid.map(r=>r[i])).size,n);}for(let br=0;br<n;br+=3)for(let bc=0;bc<n;bc+=3){const z=[];for(let r=br;r<br+3;r++)for(let c=bc;c<bc+3;c++)z.push(grid[r][c]);assert.equal(new Set(z).size,9);}}
function clueSide(cl,n=9){const a=cl.cells[0],b=cl.cells[1],dr=Math.sign(b[0]-a[0]),dc=Math.sign(b[1]-a[1]);if(a[0]===0&&dr>0)return'top';if(a[0]===n-1&&dr<0)return'bottom';if(a[1]===0&&dc>0)return'left';if(a[1]===n-1&&dc<0)return'right';return'invalid';}
function topologySignature(out){return out.data.clues.map(cl=>`${clueSide(cl)}:${cl.cells.map(p=>p.join(',')).join(';')}`).sort().join('|');}

function validateGenerated(out,label){
  assert.equal(out.generation.unique,true,`${label}: variant must be unique`);
  assert.equal(out.generation.variantEssential,true,`${label}: Little Killer sums must be essential`);
  assert.equal(out.generation.mode,'seeded-variant-essential');
  assert.equal(out.generation.generatorFamily,'little-killer-bounded-sum-aware');
  assert.equal(out.generation.verification,'little-killer-exact-sum-solver');
  assert.equal(ctx.SudokuGenerator.countLittleKillerSolutions(out.puzzle,out,2),1,`${label}: exact Little Killer uniqueness`);
  assert.equal(ctx.SudokuGenerator.countVariantSolutions(out.puzzle,out,2),1,`${label}: shared variant counter must route to Little Killer exact solver`);
  assert.ok(ctx.SudokuGenerator.countSolutions(out.puzzle,2)>1,`${label}: must not be Classic-unique`);
  for(const cl of out.data.clues)assert.equal(clueSum(out.solution,cl),cl.sum,`${label}: refreshed diagonal sum`);
  const sides=new Set(out.data.clues.map(cl=>clueSide(cl)));
  assert.ok(!sides.has('invalid'),`${label}: every clue must enter from a real board edge`);
  assert.ok(sides.size>=2,`${label}: Little Killer must use at least two board sides`);
}

test('canonical Little Killer solution satisfies every diagonal sum clue',()=>{
  assert.equal(v.kind,'littlekiller');
  assert.ok(Array.isArray(v.data.clues)&&v.data.clues.length>0);
  latinAndBoxes(v.solution);
  for(const cl of v.data.clues){assert.ok(Array.isArray(cl.cells)&&cl.cells.length>0);assert.equal(clueSum(v.solution,cl),cl.sum);}
});

test('Little Killer generation is deterministic, exact and genuinely variant-essential',()=>{
  for(const difficulty of ['gentle','focused','expert']){
    const a=ctx.SudokuGenerator.make(v,0x1A771E,difficulty),b=ctx.SudokuGenerator.make(v,0x1A771E,difficulty);
    assert.deepEqual(a.puzzle,b.puzzle);assert.deepEqual(a.solution,b.solution);assert.deepEqual(a.data,b.data);
    validateGenerated(a,`0x1A771E/${difficulty}`);
  }
});

test('Little Killer difficulty removes progressively more givens after variant-essentiality',()=>{
  for(const seed of [17,53,97]){
    const g=ctx.SudokuGenerator.make(v,seed,'gentle'),f=ctx.SudokuGenerator.make(v,seed,'focused'),e=ctx.SudokuGenerator.make(v,seed,'expert');
    assert.ok(g.generation.clues>f.generation.clues,`${seed}: Gentle ${g.generation.clues} must exceed Focused ${f.generation.clues}`);
    assert.ok(f.generation.clues>e.generation.clues,`${seed}: Focused ${f.generation.clues} must exceed Expert ${e.generation.clues}`);
    assert.equal(f.generation.search.extraRemovals,4);
    assert.equal(e.generation.search.extraRemovals,8);
  }
});

test('Little Killer clue topology uses multiple sides and varies structurally across seeds',()=>{
  const seeds=[17,29,41,53,67,79,97,113];
  const signatures=new Set(),sidePatterns=new Set(),seenSides=new Set();
  for(const seed of seeds){
    const out=ctx.SudokuGenerator.make(v,seed,'focused');
    validateGenerated(out,`${seed}/topology`);
    const sides=out.data.clues.map(cl=>clueSide(cl));
    for(const side of sides)seenSides.add(side);
    signatures.add(topologySignature(out));
    sidePatterns.add([...new Set(sides)].sort().join(','));
    assert.ok(out.generation.topology&&out.generation.topology.clueCount===12,`${seed}: topology metadata`);
  }
  assert.equal(seenSides.size,4,'representative seeds must exercise all four board sides');
  assert.ok(signatures.size>=6,`expected structural topology diversity, got ${signatures.size}/8`);
  assert.ok(sidePatterns.size>=2,`expected more than one side pattern, got ${sidePatterns.size}`);
});

test('Little Killer switch-path generation stays bounded on representative seeds',()=>{
  const seeds=[17,29,41,53,67,79,97,0x1A771E];
  const started=performance.now();
  for(const seed of seeds){
    const out=ctx.SudokuGenerator.make(v,seed,'focused');
    validateGenerated(out,`${seed}/focused`);
    assert.ok(out.generation.search.nodes<500000,`${seed}: bounded search nodes`);
  }
  const elapsed=performance.now()-started;
  assert.ok(elapsed<5000,`Little Killer focused switch-path took ${elapsed.toFixed(1)}ms`);
});

test('Little Killer runtime hardening owns sum-aware exact generation',()=>{
  const src=fs.readFileSync(path.join(root,'games/little-killer-runtime-hardening.js'),'utf8');
  assert.match(src,/function solveCount\(/);
  assert.match(src,/clueFeasible/);
  assert.match(src,/nodeBudget/);
  assert.match(src,/function freshTopology\(/);
  assert.match(src,/sideCounts/);
  assert.match(src,/little-killer-bounded-sum-aware/);
  assert.match(src,/variant&&variant\.kind==='littlekiller'/);
});

test('Little Killer runtime hardening is wired before the Sudoku library',()=>{
  assert.match(html,/games\/little-killer-runtime-hardening\.js/);
  assert.ok(html.indexOf('games/little-killer-runtime-hardening.js')<html.indexOf('games/sudoku-library.js'));
});

test('renderer enforces Little Killer sums instead of displaying clues only',()=>{
  const src=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
  assert.match(src,/function littleKillerConflict\(/);
  assert.match(src,/kindIs\(v,'littlekiller'\)/);
  assert.match(src,/littleKillerConflict\(v,grid,r,c\)/);
  assert.match(src,/classList\.add\('checked-wrong'\)/);
  assert.match(src,/function changed\(\)\{[^}]*classList\.remove\('checked-wrong'\)/);
});
