import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)]
  .map(match=>match[1])
  .filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));

const ctx={console,globalThis:null,window:null,Map,Set,WeakMap,Math,JSON,Array,Object,Number,String,Boolean,RegExp,Error,Date};
ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);
for(const ref of refs)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});

const entries=Array.isArray(ctx.SudokuBank)?ctx.SudokuBank:[];
if(entries.length!==106)throw new Error(`expected canonical catalogue size 106, got ${entries.length}`);

function isStandard9(entry){
  return Array.isArray(entry.solution)&&entry.solution.length===9&&entry.solution.every(row=>Array.isArray(row)&&row.length===9&&row.every(Number.isInteger));
}
function shape(value){
  if(!Array.isArray(value))return typeof value;
  if(value.length===0)return 'array:empty';
  const nested=value.every(Array.isArray);
  if(!nested)return `array:${value.length}`;
  const widths=[...new Set(value.map(row=>row.length))];
  return `grid:${value.length}x${widths.length===1?widths[0]:'mixed'}`;
}
function keys(value){return value&&typeof value==='object'&&!Array.isArray(value)?Object.keys(value).sort():[];}
function groupKey(entry){
  const data=entry.data&&typeof entry.data==='object'?entry.data:{};
  return [entry.family||'unspecified',entry.kind||'unspecified',data.inputMode||'unspecified'].join(' | ');
}

const standard=entries.filter(isStandard9);
const other=entries.filter(entry=>!isStandard9(entry));
const groups=new Map();
for(const entry of other){
  const key=groupKey(entry);
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(entry);
}

console.log(`PLAYABILITY_CATALOGUE_POLICY_INVENTORY total=${entries.length} standard9=${standard.length} nonStandard=${other.length} registryFiles=${refs.length}`);
console.log(`POLICY_COVERAGE standard9Policy=77 nonStandardPending=${other.length} totalExplicit=${standard.length}/${entries.length}`);

for(const [group,items] of [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0]))){
  console.log(`POLICY_GROUP group=${JSON.stringify(group)} count=${items.length} ids=${items.map(item=>item.id).sort().join(',')}`);
}

for(const entry of other.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)))){
  const data=entry.data&&typeof entry.data==='object'?entry.data:{};
  console.log(`POLICY_ENTRY id=${entry.id} family=${JSON.stringify(entry.family||'unspecified')} kind=${entry.kind||'unspecified'} inputMode=${data.inputMode||'unspecified'} puzzleShape=${shape(entry.puzzle)} solutionShape=${shape(entry.solution)} dataKeys=${keys(data).join(',')||'none'}`);
}

const familyCounts=new Map();
for(const entry of other)familyCounts.set(entry.family||'unspecified',(familyCounts.get(entry.family||'unspecified')||0)+1);
console.log(`POLICY_FAMILIES ${[...familyCounts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([family,count])=>`${JSON.stringify(family)}:${count}`).join(' ')}`);
console.log('NOTE Phase D discovery only: no non-Sudoku information policy is inferred from names; adapter semantics follow from these canonical runtime/input models.');
