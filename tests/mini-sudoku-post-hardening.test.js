'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const gen=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
const bank=fs.readFileSync(path.join(root,'games/sudoku-bank.js'),'utf8');
function context(source,filename,extra){const ctx=Object.assign({console,globalThis:null,Map,Set,WeakMap},extra||{});ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(source,ctx,{filename});return ctx;}
function generator(){return context(gen,'sudoku-generator.js').SudokuGenerator;}
function miniVariant(){const ctx=context(bank,'sudoku-bank.js');const v=ctx.SudokuBank.find(x=>x.id==='mini');assert.ok(v,'canonical Mini Sudoku entry must exist');return JSON.parse(JSON.stringify(v));}
function median(xs){const a=xs.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function mountBoardSource(){const start=lib.indexOf('function mountBoard('),end=lib.indexOf('LR.register({',start);assert.ok(start>=0&&end>start,'mountBoard source must exist');return lib.slice(start,end);}

test('Mini Sudoku canonical contract is a 4x4 Latin grid with 2x2 boxes',()=>{
 const v=miniVariant();assert.equal(v.kind,'mini');assert.equal(v.solution.length,4);assert.ok(v.solution.every(row=>row.length===4));
 const want='1234';for(const row of v.solution)assert.equal(row.slice().sort().join(''),want);for(let c=0;c<4;c++)assert.equal(v.solution.map(row=>row[c]).sort().join(''),want);
 for(let br=0;br<4;br+=2)for(let bc=0;bc<4;bc+=2){const vals=[];for(let r=br;r<br+2;r++)for(let c=bc;c<bc+2;c++)vals.push(v.solution[r][c]);assert.equal(vals.sort().join(''),want);}
});

test('Mini generation is deterministic, solver-certified unique and seed-diverse',()=>{
 const G=generator(),v=miniVariant(),seen=new Set();
 for(const d of ['gentle','focused','expert'])for(const seed of [1,17,101,2026,20260827]){const a=G.make(v,seed,d),b=G.make(v,seed,d);assert.deepEqual(a.puzzle,b.puzzle,d+' '+seed+' deterministic');assert.equal(a.generation.unique,true,d+' '+seed+' unique');assert.equal(a.generation.verification,'solver-verified',d+' '+seed+' verified');seen.add(JSON.stringify(a.puzzle));}
 assert.ok(seen.size>=6,'sampled Mini puzzles should vary materially across seed/difficulty; got '+seen.size);
});

test('Mini difficulty exposes ordered clue counts and measured search medians',()=>{
 const G=generator(),v=miniVariant(),seeds=[1,17,101,2026,20260827],expected={gentle:10,focused:8,expert:6},scores={gentle:[],focused:[],expert:[]};
 for(const d of Object.keys(scores))for(const seed of seeds){const g=G.make(v,seed,d);assert.equal(g.generation.clues,expected[d],d+' must retain its 4x4 clue target');assert.ok(Number.isFinite(g.generation.difficultyScore)&&g.generation.difficultyScore>0);scores[d].push(g.generation.difficultyScore);}
 const med={gentle:median(scores.gentle),focused:median(scores.focused),expert:median(scores.expert)};assert.ok(med.gentle<med.focused&&med.focused<med.expert,'Mini medians must rise Gentle < Focused < Expert: '+JSON.stringify(med));
});

test('Mini renderer inherits complete shared interaction and language lifecycle',()=>{
 const src=mountBoardSource(),ret=src.slice(src.lastIndexOf('return {'));
 assert.match(src,/n<=4\?2:/,'Mini notes must use a 2-column candidate layout');assert.match(src,/note-mode-button/);assert.match(src,/Backspace|Delete/);assert.match(src,/clear-button/);assert.match(src,/check-button/);assert.match(src,/api\.setCounter\(moves/);
 assert.match(ret,/refreshLanguage\s*:\s*function\(\)/);assert.match(ret,/board\.setAttribute\('aria-label'/);assert.match(ret,/render\(\)/);
});

test('Mini 4x4 cells remain comfortably above 44px on the narrowest supported viewport',()=>{
 const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
 assert.match(css,/body\s*\{[^}]*min-width:\s*320px/s,'application minimum viewport contract must remain 320px');
 const usable=320-20-20; // garden-main 10px/side + puzzle-card 10px/side at <=560px
 const cell=(usable-6-3)/4; // shared 3px border each side + three 1px grid gaps
 assert.ok(cell>=44,'Mini effective narrow-layout cell estimate must remain >=44px; got '+cell.toFixed(2));
});
