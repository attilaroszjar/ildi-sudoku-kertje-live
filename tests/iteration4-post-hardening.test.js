'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../games/sudoku-bank.js');
require('../games/sudoku-bank-iteration2.js');
require('../games/sudoku-bank-iteration3.js');
require('../games/sudoku-bank-iteration4.js');
require('../games/sudoku-generator.js');
require('../games/iteration4-generator-hardening.js');
const bank=global.SudokuBank,gen=global.SudokuGenerator;
const ids=['miracle','magic-square','asterisk','argyle','jigsaw'];
const variant=id=>bank.find(v=>v.id===id);

test('Iteration 4 generated puzzles are solver-certified and variant-essential',()=>{
  for(const id of ids){
    const v=variant(id),out=gen.make(v,0x41D1,'focused');
    assert.equal(out.generation.unique,true,id+' unique');
    assert.equal(out.generation.mode,'seeded-variant-essential',id+' mode');
    assert.equal(out.generation.variantEssential,true,id+' essential');
  }
});

test('Miracle and Asterisk use the shared variant-aware solver, not classic uniqueness alone',()=>{
  for(const id of ['miracle','asterisk']){
    const v=variant(id),out=gen.make(v,0xBEEF,'expert');
    assert.equal(gen.countVariantSolutions(out.puzzle,v,2),1,id+' variant solver');
    assert.notEqual(gen.countSolutions(out.puzzle,2),1,id+' classic baseline');
  }
});

test('Magic Square and Argyle use dedicated constraint-aware solving',()=>{
  for(const id of ['magic-square','argyle']){
    const v=variant(id),out=gen.make(v,0xCAFE,'expert');
    assert.equal(gen.countIteration4SpecialSolutions(out.puzzle,v,2,{}),1,id+' special solver');
    assert.notEqual(gen.countSolutions(out.puzzle,2),1,id+' classic baseline');
  }
});

test('Jigsaw generation is unique under irregular regions and essential over Latin rows/columns',()=>{
  const v=variant('jigsaw');
  for(const seed of [1,2,3,7,11]){const out=gen.make(v,seed,'focused');assert.equal(gen.countJigsawSolutions(out.puzzle,v.data.regions,2),1,'seed '+seed);assert.notEqual(gen.countLatinSolutions(out.puzzle,2),1,'Latin baseline '+seed);}
});

test('Iteration 4 generation is deterministic, seed-diverse, and difficulty ordered by givens',()=>{
  for(const id of ids){
    const v=variant(id),a=gen.make(v,101,'focused'),b=gen.make(v,101,'focused'),c=gen.make(v,102,'focused');
    assert.deepEqual(a.puzzle,b.puzzle,id+' deterministic');
    assert.notDeepEqual(a.puzzle,c.puzzle,id+' seed diversity');
    const gentle=gen.make(v,303,'gentle'),focused=gen.make(v,303,'focused'),expert=gen.make(v,303,'expert');
    assert.ok(gentle.generation.clues>=focused.generation.clues,id+' gentle/focused clues');
    assert.ok(focused.generation.clues>=expert.generation.clues,id+' focused/expert clues');
  }
});
