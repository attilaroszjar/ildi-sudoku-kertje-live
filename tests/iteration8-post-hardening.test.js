'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
require('../games/sudoku-bank.js');
require('../games/sudoku-bank-iteration2.js');
require('../games/sudoku-bank-iteration3.js');
require('../games/sudoku-bank-iteration4.js');
require('../games/sudoku-bank-iteration5.js');
require('../games/sudoku-bank-iteration6.js');
require('../games/sudoku-bank-iteration7.js');
require('../games/sudoku-bank-iteration8.js');
require('../games/sudoku-generator.js');
require('../games/extra-house-generator-core.js');
require('../games/diagonal-generator-hardening.js');
require('../games/iteration4-generator-hardening.js');
require('../games/iteration5-generator-hardening.js');
require('../games/iteration6-generator-hardening.js');
require('../games/iteration7-generator-hardening.js');
require('../games/iteration8-generator-hardening.js');
const bank=global.SudokuBank,gen=global.SudokuGenerator;
const variant=id=>bank.find(v=>v.id===id);

function reflectionValid(v,grid){for(const group of v.data.reflectionGroups){const base=group.lines[0].map(([r,c])=>grid[r][c]);for(const line of group.lines.slice(1)){const vals=line.map(([r,c])=>grid[r][c]);assert.deepEqual(vals,base.slice(0,vals.length),group.symbol);}}}
function slingshotValid(v,grid){for(const sh of v.data.slingshots){const n=grid[sh.cell[0]][sh.cell[1]],tr=sh.cell[0]+sh.dir[0]*n,tc=sh.cell[1]+sh.dir[1]*n;assert.ok(tr>=0&&tr<9&&tc>=0&&tc<9,'target in range');assert.equal(grid[sh.source[0]][sh.source[1]],grid[tr][tc],JSON.stringify(sh));}}

test('Reflection and Slingshot static solutions satisfy their full variant rules',()=>{reflectionValid(variant('reflection'),variant('reflection').solution);slingshotValid(variant('slingshot'),variant('slingshot').solution);});

test('Reflection and Slingshot generation is deterministic, seed-diverse, unique and variant-essential',()=>{for(const id of ['reflection','slingshot']){const v=variant(id),seen=new Set();for(const seed of [801,802,803,804]){const a=gen.make(v,seed,'focused'),b=gen.make(v,seed,'focused');assert.deepEqual(a.puzzle,b.puzzle,id+' deterministic '+seed);assert.equal(a.generation.unique,true,id+' unique');assert.equal(a.generation.variantEssential,true,id+' essential');assert.equal(gen.countVariantSolutions(a.puzzle,v,2),1,id+' variant solver');assert.ok(gen.countSolutions(a.puzzle,2)>1,id+' classic baseline ambiguous');seen.add(a.puzzle.flat().join(''));}assert.ok(seen.size>=3,id+' seed diversity');}});

test('Reflection and Slingshot difficulty is clue-ordered and carries measured variant search evidence',()=>{for(const id of ['reflection','slingshot']){const v=variant(id),outs=['gentle','focused','expert'].map(d=>gen.make(v,808,d));assert.ok(outs[0].generation.clues>=outs[1].generation.clues,id+' gentle/focused clues');assert.ok(outs[1].generation.clues>=outs[2].generation.clues,id+' focused/expert clues');for(const out of outs){assert.ok(Number.isFinite(out.generation.difficultyScore)&&out.generation.difficultyScore>0,id+' measured difficulty');assert.ok(out.generation.searchStats&&Number.isFinite(out.generation.searchStats.nodes),id+' search stats');}}});

test('Reflection and Slingshot runtime enforcement and visual hooks are present',()=>{const source=fs.readFileSync(path.join(__dirname,'../games/sudoku-library.js'),'utf8');assert.match(source,/kindIs\(v,'reflection'\)|v\.kind==='reflection'/,'reflection runtime branch');assert.match(source,/reflectionGroups/,'reflection data enforcement');assert.match(source,/sudoku-reflection-symbol/,'reflection marker');assert.match(source,/kindIs\(v,'slingshot'\)|v\.kind==='slingshot'/,'slingshot runtime branch');assert.match(source,/slingshots/,'slingshot data enforcement');assert.match(source,/sudoku-slingshot-source/,'slingshot source marker');assert.match(source,/sudoku-slingshot-arrow/,'slingshot arrow marker');});
