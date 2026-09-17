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
require('../games/sudoku-bank-iteration9.js');
require('../games/sudoku-generator.js');
require('../games/extra-house-generator-core.js');
require('../games/diagonal-generator-hardening.js');
require('../games/iteration4-generator-hardening.js');
require('../games/iteration5-generator-hardening.js');
require('../games/iteration6-generator-hardening.js');
require('../games/iteration7-generator-hardening.js');
require('../games/iteration8-generator-hardening.js');
require('../games/iteration9-generator-hardening.js');
const bank=global.SudokuBank,gen=global.SudokuGenerator;
const variant=id=>bank.find(v=>v.id===id);

function axiaValid(v,grid){for(const [r,c] of v.data.axia){const d=grid[r][c];for(const dr of [-1,1])for(const dc of [-1,1])for(let k=1;;k++){const rr=r+dr*k,cc=c+dc*k;if(rr<0||rr>=9||cc<0||cc>=9)break;assert.notEqual(grid[rr][cc],d,'axia '+r+','+c);}}}
function couplesValid(v,grid){for(const cp of v.data.couples){const a=grid[cp.a[0]][cp.a[1]],b=grid[cp.b[0]][cp.b[1]];assert.equal((a%2)===(b%2),cp.same,JSON.stringify(cp));}}

test('Axia and Couples static solutions satisfy their full variant rules',()=>{axiaValid(variant('axia'),variant('axia').solution);couplesValid(variant('couples'),variant('couples').solution);});

test('Axia and Couples generation is deterministic, seed-diverse, unique and variant-essential',()=>{for(const id of ['axia','couples']){const v=variant(id),seen=new Set();for(const seed of [901,902,903,904]){const a=gen.make(v,seed,'focused'),b=gen.make(v,seed,'focused');assert.deepEqual(a.puzzle,b.puzzle,id+' deterministic '+seed);assert.equal(a.generation.unique,true,id+' unique');assert.equal(a.generation.variantEssential,true,id+' essential');assert.equal(gen.countVariantSolutions(a.puzzle,v,2),1,id+' variant solver');assert.ok(gen.countSolutions(a.puzzle,2)>1,id+' classic baseline ambiguous');seen.add(a.puzzle.flat().join(''));}assert.ok(seen.size>=3,id+' seed diversity');}});

test('Axia and Couples difficulty is clue-ordered and carries measured variant search evidence',()=>{for(const id of ['axia','couples']){const v=variant(id),outs=['gentle','focused','expert'].map(d=>gen.make(v,909,d));assert.ok(outs[0].generation.clues>=outs[1].generation.clues,id+' gentle/focused clues');assert.ok(outs[1].generation.clues>=outs[2].generation.clues,id+' focused/expert clues');for(const out of outs){assert.ok(Number.isFinite(out.generation.difficultyScore)&&out.generation.difficultyScore>0,id+' measured difficulty');assert.ok(out.generation.searchStats&&Number.isFinite(out.generation.searchStats.nodes),id+' search stats');}}});

test('Axia and Couples runtime enforcement and visual hooks are present',()=>{const source=fs.readFileSync(path.join(__dirname,'../games/sudoku-library.js'),'utf8');assert.match(source,/kindIs\(v,'axia'\)|v\.kind==='axia'/,'axia runtime branch');assert.match(source,/d\.axia/,'axia data enforcement');assert.match(source,/sudoku-axia-marker/,'axia marker');assert.match(source,/kindIs\(v,'couples'\)|v\.kind==='couples'/,'couples runtime branch');assert.match(source,/d\.couples/,'couples data enforcement');assert.match(source,/sudoku-couples-marker/,'couples marker');});
