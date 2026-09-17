'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');

test('Domino Skyscraper uses a distinct teal visual treatment',()=>{
  const css=fs.readFileSync(path.join(root,'assets/domino-skyscraper.css'),'utf8');
  const loader=fs.readFileSync(path.join(root,'assets/p3-size-control.css'),'utf8');

  assert.match(loader,/@import url\("\.\/domino-skyscraper\.css"\)/);
  assert.match(css,/--domino-sky-border:\s*#2f7f86/);
  assert.match(css,/--domino-sky-fill:\s*#e7f3f3/);
  assert.match(css,/\.sudoku-cell\.domino-cell\{[^}]*--domino-sky-fill/s);
  assert.match(css,/\.sudoku-cell\.domino-top\{border-top:3px solid var\(--domino-sky-border\)\}/);
  assert.match(css,/\.sudoku-cell\.domino-bottom\{border-bottom:3px solid var\(--domino-sky-border\)\}/);
  assert.match(css,/\.sudoku-cell\.domino-left\{border-left:3px solid var\(--domino-sky-border\)\}/);
  assert.match(css,/\.sudoku-cell\.domino-right\{border-right:3px solid var\(--domino-sky-border\)\}/);
});
