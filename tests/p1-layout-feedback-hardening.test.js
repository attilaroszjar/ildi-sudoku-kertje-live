'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(
  path.join(__dirname,'../games/ildi-feedback-runtime-hardening.js'),
  'utf8'
);

function makeDocument(){
  const byId=new Map();
  const appended=[];
  const head={appendChild(el){appended.push(el);if(el.id)byId.set(el.id,el);}};
  return {
    readyState:'complete',
    head,
    documentElement:head,
    createElement(tag){return {tagName:String(tag).toUpperCase(),id:'',textContent:''};},
    getElementById(id){return byId.get(id)||null;},
    querySelector(){return null;},
    querySelectorAll(){return [];},
    addEventListener(){},
    _appended:appended
  };
}

test('P1 Japanese layout hardening fixes row stability and Masyu cell centring',()=>{
  const document=makeDocument();
  const context={
    document,
    setTimeout(fn){fn();return 1;},
    requestAnimationFrame(fn){fn();return 1;},
    addEventListener(){},
    SudokuBank:[],
    SudokuLibraryState:{currentId:null}
  };
  context.window=context;
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(source,context);

  const api=context.IldiFeedbackHardening;
  assert.ok(api);
  const style=api.ensureP1LayoutStyles();
  assert.equal(style.id,'ildi-p1-layout-hardening');
  assert.match(style.textContent,/\.nonogram-board\{grid-template-rows:repeat\(var\(--nonogram-size\),minmax\(0,1fr\)\);\}/);
  assert.match(style.textContent,/\.nonogram-cell\{min-height:0;overflow:hidden;line-height:1;\}/);
  assert.match(style.textContent,/\.newlogic-board\{grid-template-rows:repeat\(var\(--newlogic-size\),minmax\(0,1fr\)\);\}/);
  assert.match(style.textContent,/\.masyu-board\{background-position:0 0;\}/);

  const before=document._appended.length;
  assert.equal(api.ensureP1LayoutStyles(),style,'style injection is idempotent');
  assert.equal(document._appended.length,before,'no duplicate hardening style');
});

test('Masyu runtime positions clue nodes at mathematical cell centres',()=>{
  const lib=fs.readFileSync(path.join(__dirname,'../games/sudoku-library.js'),'utf8');
  assert.match(lib,/dot\.style\.left=\(\(c\+\.5\)\*100\/n\)\+'%'/);
  assert.match(lib,/dot\.style\.top=\(\(r\+\.5\)\*100\/n\)\+'%'/);
});
