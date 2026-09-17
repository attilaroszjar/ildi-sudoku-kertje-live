'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(x=>x.startsWith('games/sudoku-bank'));
const ctx={console};ctx.globalThis=ctx;ctx.window=ctx;ctx.localStorage={getItem:()=>null,setItem:()=>{}};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'assets/i18n.js'),'utf8'),ctx);
for(const f of scripts) vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const bank=ctx.SudokuBank;
assert.equal(bank.length,106,'runtime catalogue must contain 106 systems');
assert.equal(new Set(bank.map(v=>v.id)).size,bank.length,'every game id must be unique');
for(const v of bank){
  assert(v.id&&v.title&&v.rule&&v.family,'complete metadata for '+(v.id||'?'));
  const hu=ctx.SudokuI18n.variant(v);assert(hu.title&&hu.rule&&hu.family,'HU translation for '+v.id);
}
ctx.SudokuI18n.set('en');for(const v of bank){const en=ctx.SudokuI18n.variant(v);assert.equal(en.title,v.title,'EN title '+v.id);assert.equal(en.rule,v.rule,'EN rule '+v.id);}
const skyIds=['classic-skyscrapers','skyscraper','skyscraper-sums','skyscraper-mixed','skyscraper-nontouching','skyscraper-parks','sum-skyscraper-parks','inside-skyscrapers','diagonal-skyscrapers','product-skyscrapers','killer-skyscrapers','domino-skyscrapers','skyscraper-parks2','evenodd-skyscrapers','toroidal-skyscrapers','double-skyscrapers'];
const isSky=v=>skyIds.includes(v.id);
const groups=[v=>v.family==='Core'||v.id==='mini'||v.id==='mini-6',isSky,v=>v.family==='Japanese logic',v=>v.family==='Lines',v=>!isSky(v)&&(v.family==='Cages'||v.family==='Outside clues'),v=>v.family==='Anti-constraints'||v.family==='Cell relations',v=>v.family==='Extra regions'||v.family==='Cell marks',v=>!isSky(v)&&v.family==='Grid'&&v.id!=='mini'&&v.id!=='mini-6',v=>!isSky(v)&&v.family==='Combinations'];
for(const v of bank) assert.equal(groups.filter(g=>g(v)).length,1,'exactly one display category for '+v.id);
assert.equal(bank.filter(v=>v.family==='Japanese logic').length,18,'eighteen Japanese logic games');
assert.equal(bank.filter(isSky).length,16,'sixteen Skyscrapers games');
assert(html.includes('106 logikai játék · gyakorlatilag végtelen feladványok'),'static HTML summary must not be stale');
console.log('PASS catalogue integrity: all 106 runtime systems load exactly once with HU/EN metadata and consistent categories');
