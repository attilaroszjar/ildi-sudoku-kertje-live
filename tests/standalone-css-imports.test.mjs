import test from 'node:test';
import assert from 'node:assert/strict';
import { renderStandalone } from '../scripts/build-standalone.mjs';

test('standalone recursively inlines local CSS imports',()=>{
  const html=renderStandalone();
  assert.match(html,/stroke:#b4bab6/);
  assert.match(html,/reflection-line\{[\s\S]*stroke-width:1\.25/);
  assert.doesNotMatch(html,/@import\s+url\(["']?\.\/sudoku-line-visibility\.css/);
  assert.doesNotMatch(html,/@import\s+url\(["']?\.\/domino-skyscraper-visibility\.css/);
});
