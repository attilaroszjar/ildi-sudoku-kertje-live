'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..');
const gen=fs.readFileSync(path.join(root,'games/sudoku-generator.js'),'utf8');
const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
function generator(){const ctx={console,globalThis:null,Map,Set,WeakMap};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(gen,ctx,{filename:'sudoku-generator.js'});return ctx.SudokuGenerator;}
function classicVariant(){return {id:'classic-audit',title:'Classic Sudoku',family:'Core',kind:'classic',data:{},puzzle:[[5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],[8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],[0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]],solution:[[5,3,4,6,7,8,9,1,2],[6,7,2,1,9,5,3,4,8],[1,9,8,3,4,2,5,6,7],[8,5,9,7,6,1,4,2,3],[4,2,6,8,5,3,7,9,1],[7,1,3,9,2,4,8,5,6],[9,6,1,5,3,7,2,8,4],[2,8,7,4,1,9,6,3,5],[3,4,5,2,8,6,1,7,9]]};}
function median(xs){const a=xs.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function mountBoardSource(){const start=lib.indexOf('function mountBoard('),end=lib.indexOf('LR.register({',start);assert.ok(start>=0&&end>start,'mountBoard source must exist');return lib.slice(start,end);}
function loadedCss(){
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const hrefs=[...html.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+\.css)["'][^>]*>/g)].map(m=>m[1]);
 assert.ok(hrefs.length>0,'index must load at least one stylesheet');
 return hrefs.map(href=>fs.readFileSync(path.join(root,href),'utf8')).join('\n');
}
function cssRules(css){const out=[];for(const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g))out.push({selector:m[1].trim(),body:m[2]});return out;}
function declarations(body){const out={};for(const piece of body.split(';')){const at=piece.indexOf(':');if(at>0)out[piece.slice(0,at).trim()]=piece.slice(at+1).trim();}return out;}
function px(value){const m=String(value||'').match(/^([0-9]+(?:\.[0-9]+)?)px$/);return m?Number(m[1]):NaN;}

test('Classic generation remains deterministic and solver-certified unique',()=>{
 const G=generator(),v=classicVariant();
 for(const d of ['gentle','focused','expert'])for(const seed of [1,17,101,2026]){const a=G.make(v,seed,d),b=G.make(v,seed,d);assert.deepEqual(a.puzzle,b.puzzle,d+' '+seed+' deterministic');assert.equal(a.generation.unique,true,d+' '+seed+' unique');assert.equal(a.generation.verification,'solver-verified',d+' '+seed+' solver verified');}
});

test('Classic generation exposes measured difficulty with Gentle < Focused < Expert medians',()=>{
 const G=generator(),v=classicVariant(),seeds=[1,17,101,2026,20260827],scores={gentle:[],focused:[],expert:[]};
 for(const d of Object.keys(scores))for(const seed of seeds){const g=G.make(v,seed,d);assert.ok(Number.isFinite(g.generation.difficultyScore)&&g.generation.difficultyScore>0,d+' '+seed+' must expose positive measured difficulty');scores[d].push(g.generation.difficultyScore);}
 const med={gentle:median(scores.gentle),focused:median(scores.focused),expert:median(scores.expert)};
 assert.ok(med.gentle<med.focused,'Focused median must exceed Gentle: '+JSON.stringify(med));
 assert.ok(med.focused<med.expert,'Expert median must exceed Focused: '+JSON.stringify(med));
});

test('Classic renderer refreshes board and localized cell accessibility in place',()=>{
 const src=mountBoardSource(),ret=src.slice(src.lastIndexOf('return {'));
 assert.match(ret,/refreshLanguage\s*:\s*function\(\)/,'shared Sudoku board must expose refreshLanguage');
 assert.match(ret,/board\.setAttribute\('aria-label'/,'language refresh must update board ARIA label');
 assert.match(ret,/render\(\)/,'language refresh must rerender localized cell semantics');
});

test('Classic renderer retains notes, keyboard entry, clear and check controls',()=>{
 const src=mountBoardSource();
 assert.match(src,/note-mode-button/);assert.match(src,/Backspace|Delete/);assert.match(src,/clear-button/);assert.match(src,/check-button/);assert.match(src,/api\.setCounter\(moves/);
});

test('Classic Check error markers are cleared when the checked cell is edited',()=>{
 const src=mountBoardSource(),changed=src.match(/function changed\(\)\{([^}]*)\}/);
 assert.ok(changed,'shared Sudoku changed lifecycle must exist');
 assert.match(changed[1],/cells\[selected\[0\]\*n\+selected\[1\]\]\.classList\.remove\(['"]checked-wrong['"]\)/,'editing a checked cell must clear its stale solution-error marker before rerendering');
});

test('Classic 9x9 mobile board preserves 44px cells with horizontal overflow',()=>{
 const rules=cssRules(loadedCss());
 const shellRule=rules.find(rule=>rule.selector.includes('.sudoku-board-shell')&&rule.selector.includes('--sudoku-size: 9'));
 assert.ok(shellRule,'9x9 Sudoku must have a size-scoped shell minimum instead of shrinking with the viewport');
 const shellDecl=declarations(shellRule.body),shellMin=px(shellDecl['min-width']);
 assert.ok(Number.isFinite(shellMin),'9x9 shell minimum must be expressed in CSS pixels');
 const hostRule=rules.find(rule=>rule.selector.includes('.sudoku-board-host')&&rule.selector.includes('--sudoku-size: 9'));
 assert.ok(hostRule,'the 9x9 board host must expose a size-scoped narrow-viewport overflow contract');
 const hostDecl=declarations(hostRule.body);
 assert.match(hostDecl['overflow-x']||'',/^(auto|scroll)$/,'9x9 board must scroll horizontally when its minimum width exceeds the viewport');
 const boardRule=rules.find(rule=>rule.selector.split(',').map(s=>s.trim()).includes('.sudoku-board'));
 assert.ok(boardRule,'shared Sudoku board geometry rule must exist');
 const boardDecl=declarations(boardRule.body),borderMatch=String(boardDecl.border||'').match(/([0-9]+(?:\.[0-9]+)?)px/),gap=px(boardDecl.gap);
 assert.ok(borderMatch&&Number.isFinite(gap),'shared board border and gap geometry must be measurable');
 const border=Number(borderMatch[1]),cell=(shellMin-(2*border)-(8*gap))/9;
 assert.ok(cell>=44,'9x9 mobile cells must remain at least 44px; computed '+cell.toFixed(2)+'px from the CSS contract');
});
