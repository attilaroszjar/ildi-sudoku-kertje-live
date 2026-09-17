import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const self=fileURLToPath(import.meta.url);
const seeds=[93001,93002,93003,93004,93005];
const timeoutMs=12000;

function percentile(xs,p){if(!xs.length)return null;const a=xs.slice().sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(p*a.length)-1)];}
function emit(prefix,obj){console.log(prefix+' '+JSON.stringify(obj));}

if(process.argv[2]==='--case'){
  const target=process.argv[3],seed=Number(process.argv[4]);
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const refs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1].split('?')[0]);
  const bankRefs=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
  const first=refs.indexOf('games/sudoku-generator.js');
  const arc=refs.indexOf('games/skyscraper-parks-arc-runtime.js');
  if(first<0||arc<first)throw new Error('production generator range missing');
  const coreRefs=refs.slice(first,arc+1);
  const extras=['games/p3-skyscraper-complete.js','games/p3-size-control.js'];
  const loadRefs=[...bankRefs,...coreRefs.filter(x=>!bankRefs.includes(x)),...extras.filter(x=>refs.includes(x))];
  globalThis.window=globalThis;
  globalThis.performance=performance;
  globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
  for(const ref of loadRefs){const f=path.join(root,ref);if(fs.existsSync(f))(0,eval)(`${fs.readFileSync(f,'utf8')}\n//# sourceURL=${ref}`);}
  const G=globalThis.SudokuGenerator,B=globalThis.SudokuBank;
  if(!G||!Array.isArray(B))throw new Error('Sudoku runtime missing');
  function findParity(){
    const ids=['even-odd','odd-even','parity','even-odd-sudoku'];
    for(const id of ids){const v=B.find(x=>x.id===id);if(v)return v;}
    return B.find(v=>/even.*odd|odd.*even|parity|páros.*páratlan/i.test([v.id,v.title,v.rule].filter(Boolean).join(' '))&&!/top-heavy/i.test([v.id,v.title].filter(Boolean).join(' ')));
  }
  const map={
    classic:()=>B.find(v=>v.id==='classic'),
    'little-killer':()=>B.find(v=>v.id==='little-killer'),
    parity:findParity,
    skyscraper:()=>B.find(v=>v.id==='skyscraper'),
    'sudoku-12x12':()=>B.find(v=>v.id==='sudoku-12x12'),
    'sudoku-16x16':()=>B.find(v=>v.id==='sudoku-16x16')
  };
  const variant=map[target]&&map[target]();
  if(!variant)throw new Error('target variant missing: '+target);
  if(target==='skyscraper'){variant.data=variant.data||{};variant.data.p3Size=9;}
  const t0=performance.now();
  const out=G.make(variant,seed,'expert');
  const generationMs=performance.now()-t0;
  const stats={};let count=null;const v0=performance.now();
  if(target==='classic')count=G.countSolutions(out.puzzle,2,stats);
  else if(target==='little-killer'&&typeof G.countLittleKillerSolutions==='function')count=G.countLittleKillerSolutions(out.puzzle,out,2,stats);
  else if(target==='sudoku-16x16'&&typeof G.countLargeClassicSolutionsExact==='function')count=G.countLargeClassicSolutionsExact(out.puzzle,2,stats);
  else if(target==='sudoku-12x12')count=G.countSolutions(out.puzzle,2,stats);
  else if(target==='skyscraper'&&typeof G.countP3SkyscraperSolutions==='function')count=G.countP3SkyscraperSolutions(out.puzzle,out.data&&out.data.clues,2,stats,false);
  else count=G.countVariantSolutions(out.puzzle,out,2,stats);
  const verificationMs=performance.now()-v0;
  emit('P1_RUNTIME_SAMPLE',{
    target,id:variant.id,seed,generationMs:+generationMs.toFixed(1),verificationMs:+verificationMs.toFixed(1),
    givens:out.puzzle.flat().filter(Boolean).length,unique:count===1,
    variantEssential:out.generation?.variantEssential??null,
    nodes:stats.nodes??out.generation?.searchStats?.nodes??out.generation?.exactSearchStats?.nodes??null,
    branches:stats.branches??out.generation?.searchStats?.branches??out.generation?.exactSearchStats?.branches??null,
    deadEnds:stats.deadEnds??out.generation?.searchStats?.deadEnds??out.generation?.exactSearchStats?.deadEnds??null,
    verification:out.generation?.verification??null,generatorFamily:out.generation?.generatorFamily??null
  });
  process.exit(count===1?0:2);
}

const targets=['little-killer','sudoku-12x12','sudoku-16x16','skyscraper','classic','parity'];
const rows=[];
for(const target of targets){
  for(const seed of seeds){
    console.log(`P1_RUNTIME_CASE_START target=${target} seed=${seed}`);
    const r=spawnSync(process.execPath,[self,'--case',target,String(seed)],{cwd:root,encoding:'utf8',timeout:timeoutMs,maxBuffer:1024*1024});
    if(r.error&&r.error.code==='ETIMEDOUT'){const row={target,seed,timeout:true,timeoutMs};rows.push(row);emit('P1_RUNTIME_TIMEOUT',row);continue;}
    const output=(r.stdout||'').trim();if(output)console.log(output);
    if(r.stderr&&r.stderr.trim())process.stderr.write(r.stderr);
    const line=output.split(/\r?\n/).find(x=>x.startsWith('P1_RUNTIME_SAMPLE '));
    if(line){const row=JSON.parse(line.slice('P1_RUNTIME_SAMPLE '.length));rows.push(row);}
    else rows.push({target,seed,error:true,status:r.status});
  }
}
for(const target of targets){
  const xs=rows.filter(r=>r.target===target),done=xs.filter(r=>Number.isFinite(r.generationMs));
  emit('P1_RUNTIME_SUMMARY',{
    target,samples:xs.length,completed:done.length,timeouts:xs.filter(r=>r.timeout).length,errors:xs.filter(r=>r.error).length,
    generationP50Ms:percentile(done.map(r=>r.generationMs),.5),generationP95Ms:percentile(done.map(r=>r.generationMs),.95),generationWorstMs:done.length?Math.max(...done.map(r=>r.generationMs)):null,
    verificationP95Ms:percentile(done.map(r=>r.verificationMs),.95),allUnique:done.length>0&&done.every(r=>r.unique),countersAvailable:done.some(r=>r.nodes!==null)
  });
}
const ranked=targets.map(target=>{const xs=rows.filter(r=>r.target===target),done=xs.filter(r=>Number.isFinite(r.generationMs));return{target,timeouts:xs.filter(r=>r.timeout).length,p95:percentile(done.map(r=>r.generationMs),.95),worst:done.length?Math.max(...done.map(r=>r.generationMs)):null};}).sort((a,b)=>(b.timeouts-a.timeouts)||((b.p95||0)-(a.p95||0)));
emit('P1_RUNTIME_RANKING',ranked);
console.log('P1_HARD_RUNTIME_INVENTORY:PASS');
