'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');

const lib=fs.readFileSync(path.join(root,'games/sudoku-library.js'),'utf8');
const hardening=fs.readFileSync(
  path.join(root,'games/ildi-feedback-runtime-hardening.js'),
  'utf8'
);

function source(){
  const start=lib.indexOf('function mountFutoshiki(');
  const end=lib.indexOf('function mountFillomino(',start);
  assert.ok(start>=0&&end>start,'mountFutoshiki source must exist');
  return lib.slice(start,end);
}

test('Futoshiki keyboard input derives its maximum digit from board size',()=>{
  const src=source();
  assert.match(src,/value<=n/);
  assert.doesNotMatch(src,/\^\[1-6\]\$/);
});

test('Futoshiki number pad derives its buttons from board size',()=>{
  const src=source();
  assert.match(src,/for\(var d=1;d<=n;d\+\+\)/);
});

test('Futoshiki rule copy derives its digit range from board size',()=>{
  const src=source();
  assert.match(src,/1–'\+n\+'/);
  assert.doesNotMatch(src,/1–6 egyszer/);
  assert.doesNotMatch(src,/Use 1–6 once/);
});

test('Futoshiki has explicit content-independent row geometry',()=>{
  assert.match(
    hardening,
    /\.futoshiki-board\{grid-template-rows:repeat\(var\(--futo-size\),minmax\(0,1fr\)\);\}/
  );
  assert.match(
    hardening,
    /\.futoshiki-cell\{min-height:0;overflow:hidden;\}/
  );
});
