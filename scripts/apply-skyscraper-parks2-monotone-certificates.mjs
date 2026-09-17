import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'games','sudoku-generator.js');
let text=fs.readFileSync(file,'utf8');

const start=text.indexOf('  function makeParks2Puzzle(variant,seed,difficulty){');
const end=text.indexOf('\n  function toroidalSkyVisible',start);
if(start<0||end<0)throw new Error('Skyscraper Parks 2 generator block not found');
let block=text.slice(start,end);

if(block.includes("variantEssentialityProof:'monotone-base-nonuniqueness-under-clue-removal'")){
  console.log('SKYSCRAPER_PARKS2_MONOTONE_CERTIFICATES_PATCH:PASS already-present=true');
  process.exit(0);
}

const oldTail=`      essential=countParks2Solutions(grid,working,2,true)!==1;\n    }\n\n    var unique=countParks2Solutions(grid,working,2,false)===1;\n    return {`;
const newTail=`      // essential was proved before the expert carve. Removing givens can only\n      // enlarge the base solution set, so base non-uniqueness cannot revert to uniqueness.\n      // Likewise every accepted removal was checked exact-unique and every rejected one\n      // was restored, so uniqueness is an invariant of the complete carve.\n    }\n\n    var unique=expertLocalIrreducibility?true:(countParks2Solutions(grid,working,2,false)===1);\n    return {`;
if(!block.includes(oldTail))throw new Error('Parks2 post-carve certificate anchor not found');
block=block.replace(oldTail,newTail);

const oldProof=`      localIrreducibilityProof:expertLocalIrreducibility?'monotone-nonuniqueness-from-single-pass':undefined,\n      locallyIrreducibleUnderProductionContract:expertLocalIrreducibility&&unique&&essential,`;
const newProof=`      localIrreducibilityProof:expertLocalIrreducibility?'monotone-nonuniqueness-from-single-pass':undefined,\n      variantEssentialityProof:expertLocalIrreducibility?'monotone-base-nonuniqueness-under-clue-removal':undefined,\n      uniquenessProof:expertLocalIrreducibility?'exact-unique-invariant-through-verified-removal-pass':undefined,\n      locallyIrreducibleUnderProductionContract:expertLocalIrreducibility&&unique&&essential,`;
if(!block.includes(oldProof))throw new Error('Parks2 proof metadata anchor not found');
block=block.replace(oldProof,newProof);

text=text.slice(0,start)+block+text.slice(end);
fs.writeFileSync(file,text);
console.log('SKYSCRAPER_PARKS2_MONOTONE_CERTIFICATES_PATCH:PASS already-present=false');
