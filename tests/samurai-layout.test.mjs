import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../assets/samurai-layout.css',import.meta.url),'utf8');
const p3=fs.readFileSync(new URL('../assets/p3-size-control.css',import.meta.url),'utf8');

test('Samurai stacks the tool rail below the board instead of crowding it sideways',()=>{
  assert.match(css,/\.play-surface:has\(\.samurai-shell\)\s*\{[^}]*grid-template-columns:minmax\(0,1fr\)/s);
  assert.match(css,/\.play-surface:has\(\.samurai-shell\) \.game-tools\.tool-rail\s*\{[^}]*padding-top:0/s);
});

test('Samurai board remains bounded by the play column and scrolls only when needed',()=>{
  assert.match(css,/\.samurai-shell\s*\{[^}]*width:min\(760px,100%\)[^}]*max-width:100%/s);
  assert.match(css,/\.sudoku-board-host:has\(\.samurai-shell\)\s*\{[^}]*overflow-x:auto/s);
  assert.match(css,/@media\(max-width:650px\)[\s\S]*\.samurai-board\s*\{[^}]*width:760px[^}]*min-width:760px/s);
});

test('Samurai layout hardening is included in standalone CSS import chain',()=>{
  assert.match(p3,/@import url\("\.\/samurai-layout\.css"\);/);
});
