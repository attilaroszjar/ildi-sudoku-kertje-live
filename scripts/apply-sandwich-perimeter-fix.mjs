import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const file=path.join(root,'games/sudoku-library.js');
let s=fs.readFileSync(file,'utf8');

const oldKinds="var perimeterKinds=['skyscraper','skyscrapersums','skyscraperproduct','skyscrapermixed','skyscrapernontouching','killerskyscrapers','skyscraperparks','sumskyscraperparks','skyscraperparks2','dominoskyscrapers','evenoddskyscrapers','doubleskyscrapers'];";
const newKinds="var perimeterKinds=['skyscraper','skyscrapersums','skyscraperproduct','skyscrapermixed','skyscrapernontouching','killerskyscrapers','skyscraperparks','sumskyscraperparks','skyscraperparks2','dominoskyscrapers','evenoddskyscrapers','doubleskyscrapers','sandwich'];";
if(!s.includes(oldKinds))throw new Error('Expected perimeterKinds anchor not found');
s=s.replace(oldKinds,newKinds);

const oldText="function perimeterClueText(cl){\n      if(kindIs(v,'skyscrapersums')||kindIs(v,'sumskyscraperparks'))return 'Σ'+cl.sum;";
const newText="function perimeterClueText(cl){\n      if(kindIs(v,'sandwich'))return String(cl.sum);\n      if(kindIs(v,'skyscrapersums')||kindIs(v,'sumskyscraperparks'))return 'Σ'+cl.sum;";
if(!s.includes(oldText))throw new Error('Expected perimeterClueText anchor not found');
s=s.replace(oldText,newText);

fs.writeFileSync(file,s);
console.log('SANDWICH_PERIMETER_FIX:APPLIED');
