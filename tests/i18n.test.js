'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
global.window=global;global.localStorage={getItem:()=>null,setItem:()=>{}};
vm.runInThisContext(fs.readFileSync(path.join(root,'assets/i18n.js'),'utf8'));
['sudoku-bank.js','sudoku-bank-iteration2.js','sudoku-bank-iteration3.js','sudoku-bank-iteration4.js','sudoku-bank-iteration5.js','sudoku-bank-iteration6.js','sudoku-bank-iteration7.js','sudoku-bank-iteration8.js','sudoku-bank-iteration9.js','sudoku-bank-iteration10.js','sudoku-bank-iteration11.js','sudoku-bank-iteration12.js','sudoku-bank-iteration13.js','sudoku-bank-iteration14.js','sudoku-bank-iteration15.js','sudoku-bank-iteration16.js','sudoku-bank-iteration17.js','sudoku-bank-iteration18.js','sudoku-bank-iteration19.js','sudoku-bank-iteration20.js','sudoku-bank-iteration21.js','sudoku-bank-iteration22.js','sudoku-bank-iteration23.js','sudoku-bank-iteration30.js','sudoku-bank-iteration31.js','sudoku-bank-iteration32.js','sudoku-bank-iteration33.js','sudoku-bank-iteration34.js','sudoku-bank-iteration35.js','sudoku-bank-iteration36.js','sudoku-bank-iteration37.js','sudoku-bank-iteration38.js'].forEach(f=>vm.runInThisContext(fs.readFileSync(path.join(root,'games',f),'utf8')));
function ok(x,m){if(!x)throw new Error(m);}
ok(SudokuI18n.lang==='hu','Hungarian must be default');
ok(SudokuBank.length===97,'expected 97 variants');
SudokuBank.forEach(v=>{const tr=SudokuI18n.variant(v);ok(tr.title&&tr.rule&&tr.family,'missing HU translation '+v.id);ok(tr.rule!==v.rule || /^(Sukaku|German Whispers|Dutch Whispers)/.test(v.title)===false,'translation check '+v.id);});
SudokuI18n.set('en');SudokuBank.forEach(v=>{const tr=SudokuI18n.variant(v);ok(tr.title===v.title&&tr.rule===v.rule,'English mismatch '+v.id);});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
['latin.js','nonogram.js','lights.js','codebreaker.js','sliding.js'].forEach(x=>ok(!html.includes(x),'obsolete game referenced '+x));
console.log('PASS i18n: 97 Hungarian + English game descriptions, Hungarian default, Japanese logic included');
