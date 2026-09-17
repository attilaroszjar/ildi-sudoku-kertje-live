'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
for(const file of fs.readdirSync(path.join(root,'games')).filter(x=>/^sudoku-bank(?:-iteration\d+)?\.js$/.test(x)).sort((a,b)=>+(a.match(/iteration(\d+)/)||[,0])[1]-+(b.match(/iteration(\d+)/)||[,0])[1]).concat(['sudoku-generator.js']))(0,eval)(fs.readFileSync(path.join(root,'games',file),'utf8'));
const generator=globalThis.SudokuGenerator,variant=globalThis.SudokuBank.find(v=>v.id==='masyu'),seed=101001;

test('Masyu Expert reaches the canonical three-circle frontier',()=>{
  const made=generator.make(variant,seed,'expert');
  assert.equal(made.generation.clues,3);
  assert.equal(made.puzzle.flat().filter(Boolean).length,3);
  assert.equal(made.generation.acceptedRemovals,3);
  assert.equal(made.generation.rejectedRemovals,3);
});

test('Masyu canonical Expert puzzle is exact unique',()=>{
  const made=generator.make(variant,seed,'expert'),stats={};
  assert.equal(generator.countMasyuSolutions(made.puzzle,2,stats),1);
  assert.equal(stats.solutions,1);
  assert.equal(made.generation.unique,true);
});

test('every remaining Masyu circle is necessary',()=>{
  const made=generator.make(variant,seed,'expert');
  for(let r=0;r<made.puzzle.length;r++)for(let c=0;c<made.puzzle.length;c++)if(made.puzzle[r][c]){
    const candidate=made.puzzle.map(row=>row.slice());candidate[r][c]=null;
    assert.notEqual(generator.countMasyuSolutions(candidate,2),1,`removable circle ${r},${c}`);
  }
});

test('Masyu Expert emits the local-irreducibility contract',()=>{
  const meta=generator.make(variant,seed,'expert').generation;
  assert.equal(meta.policy,'contract-driven-local-irreducibility');
  assert.equal(meta.locallyIrreducibleUnderProductionContract,true);
  assert.equal(meta.localIrreducibilityProof,'monotone-nonuniqueness-from-single-pass');
  assert.equal(meta.verification,'solver-verified-local-irreducible');
});

test('Masyu Gentle and Focused canonical output remains unchanged',()=>{
  for(const difficulty of ['gentle','focused']){
    const made=generator.make(variant,seed,difficulty);
    assert.equal(made.generation.clues,6);
    assert.equal(made.generation.policy,undefined);
    assert.equal(made.generation.verification,'solver-verified');
  }
});

test('Masyu Expert generation stays deterministic',()=>{
  assert.deepEqual(generator.make(variant,seed,'expert'),generator.make(variant,seed,'expert'));
});
