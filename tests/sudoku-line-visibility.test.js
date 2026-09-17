'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const lineCss=fs.readFileSync(path.join(root,'assets/sudoku-line-visibility.css'),'utf8');
const loaderCss=fs.readFileSync(path.join(root,'assets/p3-size-control.css'),'utf8');

test('shared Sudoku overlay strokes use one light neutral colour',()=>{
  assert.match(loaderCss,/@import url\("\.\/sudoku-line-visibility\.css"\)/);
  assert.match(lineCss,/:where\(\.sudoku-overlay polyline,[\s\S]*\.sudoku-overlay path,[\s\S]*\.sudoku-overlay line\)\{[\s\S]*stroke:#b4bab6!important;[\s\S]*stroke-opacity:\.88!important/);
});

test('Reflection line is thinner and its group badge is moved away from the digit centre',()=>{
  assert.match(lineCss,/\.sudoku-overlay \.reflection-line\{[^}]*stroke-width:1\.25!important;[^}]*opacity:1!important/);
  assert.match(lineCss,/\.sudoku-reflection-symbol\{[^}]*width:14px!important;[^}]*height:14px!important;[^}]*margin-left:-13px;[^}]*margin-top:-13px;[^}]*box-shadow:none!important/);
});
