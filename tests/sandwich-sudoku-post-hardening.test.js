'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.join(__dirname,'..');
const bank=fs.readFileSync(path.join(root,'games/sudoku-bank.js'),'utf8');
const gen=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');

function context(){
  const c={console,globalThis:null,window:null,Map,Set,WeakMap};
  c.globalThis=c;
  c.window=c;
  vm.createContext(c);
  vm.runInContext(bank,c);
  vm.runInContext(gen,c);
  return c;
}

function variant(c){
  const v=c.SudokuBank.find(x=>x.id==='sandwich');
  assert.ok(v,'Sandwich Sudoku missing');
  return v;
}

function sandwichSum(line){
  const a=line.indexOf(1),b=line.indexOf(9);
  assert.ok(a>=0&&b>=0);
  const lo=Math.min(a,b),hi=Math.max(a,b);
  return line.slice(lo+1,hi).reduce((sum,v)=>sum+v,0);
}

function median(xs){
  const a=xs.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}

test('Sandwich canonical solution satisfies all 18 outside clues',()=>{
  const c=context(),v=variant(c);
  assert.equal(v.data.clues.length,18);

  for(const clue of v.data.clues){
    const line=clue.axis==='row'
      ?v.solution[clue.index].slice()
      :v.solution.map(row=>row[clue.index]);

    assert.equal(sandwichSum(line),clue.sum);
  }
});

test('Sandwich renderer validates clue sums during play',()=>{
  assert.match(lib,/v\.kind==='sandwich'&&d\.clues/);
  assert.match(lib,/ssum>scl\.sum/);
  assert.match(lib,/ssum!==scl\.sum/);
});

test('Sandwich generation is deterministic and variant-essential',()=>{
  const c=context(),v=variant(c);

  for(const difficulty of ['gentle','focused','expert']){
    for(const seed of [1,17,101,2026]){
      const a=c.SudokuGenerator.make(v,seed,difficulty);
      const b=c.SudokuGenerator.make(v,seed,difficulty);

      assert.deepEqual(a.puzzle,b.puzzle);
      assert.equal(a.generation.unique,true);
      assert.equal(a.generation.verification,'solver-verified');
      assert.equal(a.generation.mode,'seeded-variant-essential');
      assert.equal(a.generation.variantEssential,true);

      assert.equal(
        c.SudokuGenerator.countVariantSolutions(a.puzzle,a,2),
        1
      );

      assert.ok(
        c.SudokuGenerator.countSolutions(a.puzzle,2)>1,
        'Sandwich rule must genuinely be required'
      );
    }
  }
});

test('Sandwich measured difficulty increases Gentle < Focused < Expert',()=>{
  const c=context(),v=variant(c);
  const scores={gentle:[],focused:[],expert:[]};

  for(const difficulty of Object.keys(scores)){
    for(const seed of [1,17,101,2026,20260828]){
      scores[difficulty].push(
        c.SudokuGenerator.make(v,seed,difficulty)
          .generation.difficultyScore
      );
    }
  }

  assert.ok(median(scores.gentle)<median(scores.focused));
  assert.ok(median(scores.focused)<median(scores.expert));
});

test('Sandwich retains shared Sudoku lifecycle',()=>{
  assert.match(lib,/note-mode-button/);
  assert.match(lib,/classList\.remove\('checked-wrong'\)/);
  assert.match(lib,/api\.solved\(\)/);
  assert.match(lib,/refreshLanguage:function\(\)/);
});

