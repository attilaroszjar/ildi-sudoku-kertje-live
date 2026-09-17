import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'games','sudoku-generator.js');
let text=fs.readFileSync(file,'utf8');

const start=text.indexOf('  function countParks2Solutions(source,variant,limit,ignoreClues){');
const end=text.indexOf('\n  function makeParks2Puzzle',start);
if(start<0||end<0)throw new Error('Parks2 solver block not found');
let solver=text.slice(start,end);
if(solver.includes('parks2AlternativeWitnessV6')){
  console.log('SKYSCRAPER_PARKS2_ALTERNATIVE_WITNESS_V6_PATCH:PASS already-present=true');
  process.exit(0);
}
if(!solver.includes('parks2BigIntDomainV5'))throw new Error('Parks2 BigInt v5 solver not found');

solver=solver.replace(
  'function countParks2Solutions(source,variant,limit,ignoreClues){',
  'function countParks2Solutions(source,variant,limit,ignoreClues,forbid){'
);
solver=solver.replace(
  "function matchesRowGivens(seq,row){for(var c=0;c<n;c++){var g=source[row][c];if(g&&g!==seq[c])return false;}return true;}",
  "function matchesRowGivens(seq,row){for(var c=0;c<n;c++){var g=source[row][c];if(g&&g!==seq[c])return false;if(forbid&&row===forbid.r&&c===forbid.c&&seq[c]===forbid.value)return false;}return true;}"
);
solver=solver.replace(
  "function matchesColGivens(seq,col){for(var r=0;r<n;r++){var g=source[r][col];if(g&&g!==seq[r])return false;}return true;}",
  "function matchesColGivens(seq,col){for(var r=0;r<n;r++){var g=source[r][col];if(g&&g!==seq[r])return false;if(forbid&&r===forbid.r&&col===forbid.c&&seq[r]===forbid.value)return false;}return true;}"
);
solver=solver.replace(
  '  // parks2BigIntDomainV5',
  '  // parks2BigIntDomainV5\n  // parks2AlternativeWitnessV6'
);

text=text.slice(0,start)+solver+text.slice(end);

const makeStart=text.indexOf('  function makeParks2Puzzle(variant,seed,difficulty){');
const makeEnd=text.indexOf('\n  function toroidalSkyVisible',makeStart);
if(makeStart<0||makeEnd<0)throw new Error('Parks2 generator block not found');
let make=text.slice(makeStart,makeEnd);
const expertStart=make.indexOf("if(expertLocalIrreducibility){");
if(expertStart<0)throw new Error('Parks2 expert local-irreducibility block not found');
const expertTail=make.slice(expertStart);
const oldCall='if(countParks2Solutions(grid,working,2,false)===1){clues-=1;acceptedRemovals+=1;}';
const newCall='if(countParks2Solutions(grid,working,1,false,{r:r,c:c,value:old})===0){clues-=1;acceptedRemovals+=1;}';
if(!expertTail.includes(oldCall))throw new Error('Parks2 expert exact-removal call not found');
const replacedTail=expertTail.replace(oldCall,newCall);
make=make.slice(0,expertStart)+replacedTail;
text=text.slice(0,makeStart)+make+text.slice(makeEnd);

fs.writeFileSync(file,text);
console.log('SKYSCRAPER_PARKS2_ALTERNATIVE_WITNESS_V6_PATCH:PASS already-present=false');
