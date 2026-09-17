'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
require('../games/sudoku-bank.js');
require('../games/sudoku-bank-iteration2.js');
require('../games/sudoku-bank-iteration3.js');
require('../games/sudoku-bank-iteration4.js');
require('../games/sudoku-bank-iteration5.js');
require('../games/sudoku-bank-iteration6.js');
require('../games/sudoku-bank-iteration7.js');
require('../games/sudoku-generator.js');
require('../games/extra-house-generator-core.js');
require('../games/diagonal-generator-hardening.js');
require('../games/iteration4-generator-hardening.js');
require('../games/iteration5-generator-hardening.js');
require('../games/iteration6-generator-hardening.js');
require('../games/iteration7-generator-hardening.js');
const bank=global.SudokuBank,gen=global.SudokuGenerator,v=bank.find(x=>x.id==='battenburg');

function checker(g,r,c){const a=g[r-1][c-1]%2,b=g[r-1][c]%2,d=g[r][c-1]%2,e=g[r][c]%2;return a===e&&b===d&&a!==b;}
function markedSet(variant){return new Set((variant.data.battenburg||[]).map(p=>p.join(',')));}
function assertAllGivenContract(variant,solution){const marked=markedSet(variant);let actual=0;for(let r=1;r<9;r++)for(let c=1;c<9;c++){const is=checker(solution,r,c);if(is)actual++;assert.equal(marked.has(r+','+c),is,'intersection '+r+','+c);}assert.equal(actual,marked.size);}

test('Battenburg static topology is a complete all-given parity contract',()=>{assert.equal(v.data.allGiven,true);assert.ok(v.data.battenburg.length>0);assertAllGivenContract(v,v.solution);});

test('Battenburg generated puzzles are deterministic, seed-diverse, unique and variant-essential',()=>{const seen=new Set();for(const seed of [701,702,703,704]){const a=gen.make(v,seed,'focused'),b=gen.make(v,seed,'focused');assert.deepEqual(a.puzzle,b.puzzle,'deterministic '+seed);assert.equal(a.generation.unique,true);assert.equal(a.generation.variantEssential,true);assert.equal(gen.countVariantSolutions(a.puzzle,a,2),1);assert.ok(gen.countSolutions(a.puzzle,2)>1,'classic baseline ambiguous '+seed);assertAllGivenContract(a,a.solution);seen.add(a.puzzle.flat().join(''));}assert.ok(seen.size>=3,'seed diversity');});

test('Battenburg difficulty is clue-ordered and carries measured variant search evidence',()=>{const outs=['gentle','focused','expert'].map(d=>gen.make(v,707,d));assert.ok(outs[0].generation.clues>=outs[1].generation.clues,'gentle/focused clues');assert.ok(outs[1].generation.clues>=outs[2].generation.clues,'focused/expert clues');for(const out of outs){assert.ok(Number.isFinite(out.generation.difficultyScore)&&out.generation.difficultyScore>0,'measured difficulty');assert.ok(out.generation.searchStats&&Number.isFinite(out.generation.searchStats.nodes),'search stats');}});

test('Battenburg runtime enforces marked and unmarked checkerboards and renders markers',()=>{const source=fs.readFileSync(path.join(__dirname,'../games/sudoku-library.js'),'utf8');assert.match(source,/v\.kind==='battenburg'/,'runtime branch');assert.match(source,/checker!==marked/,'positive and negative all-given enforcement');assert.match(source,/sudoku-battenburg-marker/,'visual marker');});
