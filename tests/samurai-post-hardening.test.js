'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const gen=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
function samuraiGenerator(){const start=gen.indexOf('function makeSamurai('),end=gen.indexOf('function nonogramClue(',start);assert.ok(start>=0&&end>start,'makeSamurai source must exist');return gen.slice(start,end);}
function samuraiRenderer(){const start=lib.indexOf('function mountSamurai('),end=lib.indexOf('function mountBoard(',start);assert.ok(start>=0&&end>start,'mountSamurai source must exist');return lib.slice(start,end);}
function generator(){const ctx={console,globalThis:null,Map,Set,WeakMap};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(gen,ctx,{filename:'sudoku-generator.js'});return ctx.SudokuGenerator;}
function median(xs){const a=xs.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}

test('Samurai construction keeps all five component Sudoku puzzles uniqueness-proven',()=>{
  const src=samuraiGenerator();
  assert.match(src,/grids\.forEach[\s\S]*?makePuzzle\(/,'each Samurai component must be generated through unique-preserving Sudoku generation');
  assert.match(src,/unique:true/,'Samurai generation must retain unique metadata');
});

test('Samurai exposes a non-null measured difficulty score',()=>{
  const src=samuraiGenerator();
  assert.match(src,/difficultyScore\s*:/,'Samurai generation must expose a measured difficulty score');
  assert.match(src,/search|nodes|branches|deadEnds/i,'Samurai difficulty must be based on measured solver/search complexity');
});

test('Samurai measured difficulty separates Gentle, Focused and Expert',()=>{
  const G=generator(),variant={id:'samurai-audit',title:'Samurai Sudoku',family:'Grid',kind:'samurai',data:{},puzzle:[],solution:[]};
  const seeds=[1,17,101,2026,20260827],scores={gentle:[],focused:[],expert:[]};
  for(const d of Object.keys(scores))for(const seed of seeds){const g=G.make(variant,seed,d);assert.equal(g.generation.unique,true,d+' '+seed+' must remain unique');assert.ok(Number.isFinite(g.generation.difficultyScore)&&g.generation.difficultyScore>0,d+' '+seed+' must expose positive measured difficulty');scores[d].push(g.generation.difficultyScore);}
  const med={gentle:median(scores.gentle),focused:median(scores.focused),expert:median(scores.expert)};
  assert.ok(med.gentle<med.focused,'Focused median must exceed Gentle: '+JSON.stringify(med));
  assert.ok(med.focused<med.expert,'Expert median must exceed Focused: '+JSON.stringify(med));
});

test('Samurai language refresh updates board accessibility in place',()=>{
  const src=samuraiRenderer(),refresh=src.slice(src.indexOf('refreshLanguage:function()'));
  assert.match(refresh,/board\.setAttribute\('aria-label'/,'language refresh must update Samurai board ARIA label');
  assert.match(refresh,/render\(\)/,'language refresh must rerender localized cell semantics');
});

test('Samurai cells retain localized empty, notes and fixed semantics',()=>{
  const src=samuraiRenderer();
  assert.match(src,/I\?I\.t\('empty'\):'empty'/,'empty state must remain localized');
  assert.match(src,/I\?I\.t\('noteMark'\):'notes'/,'note state must remain localized');
  assert.match(src,/I\?I\.t\('fixedShort'\):'fixed'/,'fixed state must remain localized');
});

test('Samurai mobile board preserves at least 44px cell interaction targets',()=>{
  assert.match(css,/@media\(max-width:[^)]*\)[^{]*\{[\s\S]*?\.samurai-shell[^}]*overflow(?:-x)?:\s*auto/,'mobile Samurai shell must allow scrolling instead of shrinking the 21x21 board');
  assert.match(css,/\.samurai-board[^}]*min-width:\s*(?:9[2-9]\d|[1-9]\d{3,})px/,'Samurai board must retain enough width for 21 44px cells plus gaps');
  assert.match(css,/\.samurai-cell[^}]*min-width:\s*44px[^}]*min-height:\s*44px|\.samurai-cell[^}]*min-height:\s*44px[^}]*min-width:\s*44px/,'Samurai cells must guarantee 44px interaction dimensions');
});
