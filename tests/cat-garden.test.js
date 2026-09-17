'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
assert(html.includes('cat-emblem') && html.includes('sleep-cat-head') && html.includes('mini-cat'));
assert(css.includes('Iteration 9 — Cat garden refinement'));
for(const label of ['Klasszikusok','Vonalak','Ketrecek / összegek','Tiltó szabályok','Különleges minták','Strukturális','Kombinációk','Lakótelepek','Japán logikai játékok']) assert(lib.includes(label),label);
const ctx={globalThis:{}};ctx.window=ctx.globalThis;vm.createContext(ctx);
for(const f of ['sudoku-bank.js','sudoku-bank-iteration2.js','sudoku-bank-iteration3.js','sudoku-bank-iteration4.js','sudoku-bank-iteration5.js','sudoku-bank-iteration6.js','sudoku-bank-iteration7.js','sudoku-bank-iteration8.js','sudoku-bank-iteration9.js','sudoku-bank-iteration10.js','sudoku-bank-iteration11.js','sudoku-bank-iteration12.js','sudoku-bank-iteration13.js','sudoku-bank-iteration14.js','sudoku-bank-iteration15.js','sudoku-bank-iteration16.js','sudoku-bank-iteration17.js','sudoku-bank-iteration18.js','sudoku-bank-iteration19.js','sudoku-bank-iteration20.js','sudoku-bank-iteration21.js','sudoku-bank-iteration22.js','sudoku-bank-iteration23.js','sudoku-bank-iteration30.js','sudoku-bank-iteration31.js','sudoku-bank-iteration32.js','sudoku-bank-iteration33.js','sudoku-bank-iteration34.js','sudoku-bank-iteration35.js','sudoku-bank-iteration36.js','sudoku-bank-iteration37.js','sudoku-bank-iteration38.js']) vm.runInContext(fs.readFileSync(path.join(root,'games',f),'utf8'),ctx);
const bank=ctx.globalThis.SudokuBank;
const skyscraperIds=['classic-skyscrapers','skyscraper','skyscraper-sums','skyscraper-mixed','skyscraper-nontouching','skyscraper-parks','sum-skyscraper-parks','inside-skyscrapers','diagonal-skyscrapers','product-skyscrapers','killer-skyscrapers','domino-skyscrapers','skyscraper-parks2','evenodd-skyscrapers','toroidal-skyscrapers','double-skyscrapers'];
const isSky=v=>skyscraperIds.includes(v.id);
const groups=[
 v=>v.family==='Core'||v.id==='mini'||v.id==='mini-6',
 isSky,
 v=>v.family==='Japanese logic',
 v=>v.family==='Lines',
 v=>!isSky(v)&&(v.family==='Cages'||v.family==='Outside clues'),
 v=>v.family==='Anti-constraints'||v.family==='Cell relations',
 v=>v.family==='Extra regions'||v.family==='Cell marks',
 v=>!isSky(v)&&v.family==='Grid'&&v.id!=='mini'&&v.id!=='mini-6',
 v=>!isSky(v)&&v.family==='Combinations'
];
for(const v of bank) assert.equal(groups.filter(g=>g(v)).length,1,'exactly one display group for '+v.id);
assert.equal(groups.reduce((n,g)=>n+bank.filter(g).length,0),97);
assert.equal(bank.filter(isSky).length,16);
console.log('PASS cat garden: local cat SVG design and nine-category navigation with dedicated Skyscrapers and Japanese logic groups covers all 97 variants exactly once');

assert(!lib.includes("play.append(title,rule,generation,boardHost)"),'inner duplicate variant title must stay removed');
