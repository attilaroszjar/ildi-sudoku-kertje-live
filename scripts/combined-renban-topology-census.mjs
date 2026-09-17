import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const files=[
  'games/sudoku-bank.js','games/sudoku-bank-iteration2.js','games/sudoku-bank-iteration3.js','games/sudoku-generator.js',
  'games/line-generator-core.js','games/line-generator-whole-set.js'
];
const c={console,Map,Set,WeakMap};c.globalThis=c;c.window=c;vm.createContext(c);
for(const f of files)vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c,{filename:f});

const ids=['killer-thermo','killer-arrow','killer-palindrome','killer-zipper','killer-entropic','killer-modular','killer-renban','killer-dutch-whispers','killer-lockout'];
const i=ids.indexOf('killer-renban');
const seed=(0x4b430100+i*53)>>>0;
const attemptSeed=((seed>>>0)^0x434F4D42^Math.imul(1,0x9E3779B1))>>>0;
const fresh=c.LineGeneratorCore.freshStandardSolution(attemptSeed);
const solution=fresh.grid;
const secondarySeed=(attemptSeed^0x5345434F)>>>0;
const seen=new Set();
let success=0, exhausted=0, duplicate=0;
const rows=[];
for(let n=0;n<30;n++){
  const s=(secondarySeed^Math.imul(n+1,0x85EBCA6B))>>>0;
  try{
    const built=c.LineGeneratorWholeSet.buildRenbanPath(solution,s,{minLength:4,maxLength:7,maxNodes:8000});
    success++;
    const fp=c.LineGeneratorCore.topologyFingerprint([built.path],{directed:false});
    const isDuplicate=seen.has(fp);
    if(isDuplicate)duplicate++; else seen.add(fp);
    rows.push(`${n+1}:${built.path.length}:${built.low}-${built.high}:${built.nodes}:${isDuplicate?'dup':'new'}`);
  }catch(error){
    if(String(error&&error.message||error).startsWith(c.LineGeneratorCore.EXHAUSTED)){exhausted++;continue;}
    throw error;
  }
}
process.stdout.write(`RENBAN_TOPOLOGY_CENSUS attempts=30 success=${success} exhausted=${exhausted} unique=${seen.size} duplicate=${duplicate}\n`);
process.stdout.write(`RENBAN_TOPOLOGY_ROWS ${rows.join(',')}\n`);
