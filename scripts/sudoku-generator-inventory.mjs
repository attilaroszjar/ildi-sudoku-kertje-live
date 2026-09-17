import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { canonicalGeneratorAuditStatus, summarizeGeneratorAudit } from './sudoku-generator-audit-model.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const snapshotPath=path.join(root,'docs','generated','SUDOKU_GENERATOR_INVENTORY.json');
const checkOnly=process.argv.includes('--check');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]).filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x));
const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const ref of refs)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
const variants=Array.isArray(ctx.SudokuBank)?ctx.SudokuBank:[];
function is9x9(v){return Array.isArray(v.solution)&&v.solution.length===9&&v.solution.every(r=>Array.isArray(r)&&r.length===9&&r.every(Number.isInteger));}
const rows=variants.filter(is9x9).map(v=>({id:v.id,generatorAudit:canonicalGeneratorAuditStatus(v.id)})).sort((a,b)=>a.id.localeCompare(b.id));
if(rows.length!==77)throw new Error(`expected 77 standard 9x9 Sudoku variants, got ${rows.length}`);
const summary=summarizeGeneratorAudit(rows.map(r=>r.id));
function serialize(){
  const s=summary.byStatus;
  return [
    '{',
    '  "schemaVersion": 2,',
    '  "scope": "canonical-77-standard-9x9-solution-grid",',
    '  "summary": {',
    `    "variants": ${summary.variants},`,
    '    "byStatus": {',
    `      "CATEGORY_A": ${s.CATEGORY_A},`,
    `      "RECONCILE": ${s.RECONCILE},`,
    `      "PARTIAL": ${s.PARTIAL},`,
    `      "LEGACY": ${s.LEGACY},`,
    `      "STATIC_GENERIC": ${s.STATIC_GENERIC}`,
    '    }',
    '  },',
    '  "variants": [',
    ...rows.map((row,i)=>`    ${JSON.stringify(row)}${i===rows.length-1?'':','}`),
    '  ]',
    '}',
    ''
  ].join('\n');
}
const serialized=serialize();
if(checkOnly){
  const current=fs.existsSync(snapshotPath)?fs.readFileSync(snapshotPath,'utf8'):'';
  if(current!==serialized){console.error('SUDOKU_GENERATOR_INVENTORY STALE');process.exitCode=1;}
  else console.log(`SUDOKU_GENERATOR_INVENTORY FRESH variants=${summary.variants} categoryA=${summary.byStatus.CATEGORY_A} pending=0`);
}else{
  fs.mkdirSync(path.dirname(snapshotPath),{recursive:true});
  fs.writeFileSync(snapshotPath,serialized);
  console.log(`SUDOKU_GENERATOR_INVENTORY WRITTEN variants=${summary.variants} categoryA=${summary.byStatus.CATEGORY_A} reconcile=${summary.byStatus.RECONCILE} partial=${summary.byStatus.PARTIAL} legacy=${summary.byStatus.LEGACY} static=${summary.byStatus.STATIC_GENERIC}`);
}
