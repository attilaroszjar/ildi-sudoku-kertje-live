'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');

require('../games/sudoku-bank.js');
require('../games/sudoku-bank-iteration2.js');
require('../games/sudoku-bank-iteration3.js');
require('../games/sudoku-generator.js');

const bank=global.SudokuBank;
const gen=global.SudokuGenerator;

for(const id of ['killer-thermo','killer-arrow']){
  test(id+' uses every supported combined constraint during generation',()=>{
    const v=bank.find(x=>x.id===id);
    assert.ok(v,id);
    assert.equal(v.kind,'combined');
    assert.ok(Array.isArray(v.kinds));
    assert.ok(v.kinds.length>=2);

    for(const difficulty of ['gentle','focused','expert']){
      for(const seed of [1,17,101,2026]){
        const out=gen.make(v,seed,difficulty);

        assert.equal(out.generation.mode,'seeded-variant-essential');
        assert.equal(out.generation.variantEssential,true);
        assert.equal(out.generation.unique,true);
        assert.equal(out.generation.verification,'solver-verified');

        assert.equal(
          gen.countVariantSolutions(out.puzzle,out,2),
          1,
          id+' full combined rule set must remain unique'
        );

        assert.ok(
          gen.countSolutions(out.puzzle,2)>1,
          id+' must genuinely require its combined rules'
        );
      }
    }
  });
}

test('combined variant solver evaluates every kind in kinds[]',()=>{
  const kt=bank.find(x=>x.id==='killer-thermo');
  const ka=bank.find(x=>x.id==='killer-arrow');

  assert.deepEqual(kt.kinds,['killer','thermo']);
  assert.deepEqual(ka.kinds,['killer','arrow']);
});
