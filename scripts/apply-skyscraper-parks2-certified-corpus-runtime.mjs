#!/usr/bin/env node
import fs from 'node:fs';

const file='index.html';
let s=fs.readFileSync(file,'utf8');
const corpus='<script src="games/skyscraper-parks2-certified-corpus.js"></script>';
const generator='<script src="games/sudoku-generator.js"></script>';
if(!s.includes(corpus)){
  if(!s.includes(generator))throw new Error('sudoku-generator script anchor missing');
  s=s.replace(generator,corpus+'\n  '+generator);
  fs.writeFileSync(file,s);
}
console.log('PARKS2_CERTIFIED_CORPUS_RUNTIME_WIRING:PASS');
