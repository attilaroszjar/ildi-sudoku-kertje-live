import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const self=fileURLToPath(import.meta.url);
const args=process.argv.slice(2);

function loadSource(ref,transform){
  const file=path.join(root,ref);
  if(!fs.existsSync(file))throw new Error('missing runtime script: '+ref);
  let src=fs.readFileSync(file,'utf8');
  if(transform)src=transform(src);
  (0,eval)(`${src}\n//# sourceURL=${ref}`);
}
function countGivens(grid){let n=0;for(const row of grid||[])for(const v of row||[])if(v)n++;return n;}
function rounded(x){return +x.toFixed(3);}

if(args[0]==='--worker'){
  const entryCandidates=Number(args[1]);
  const seed=Number(args[2]);
  if(![1,2,4].includes(entryCandidates)||!Number.isFinite(seed))throw new Error('invalid worker args');
  globalThis.window=globalThis;
  globalThis.performance=performance;
  globalThis.localStorage={getItem(){return null;},setItem(){},removeItem(){}};
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const refs=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1].split('?')[0]);
  const bankRefs=refs.filter(ref=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(ref));
  const first=refs.indexOf('games/sudoku-generator.js');
  const last=refs.indexOf('games/p3-size-control.js');
  if(first<0||last<first)throw new Error('production runtime range missing');
  for(const ref of bankRefs)loadSource(ref);
  for(const ref of refs.slice(first,last+1).filter(ref=>!bankRefs.includes(ref))){
    if(ref==='games/classic-human-runtime-generator.js'){
      loadSource(ref,src=>{
        const needle='entryCandidates:4';
        if(!src.includes(needle))throw new Error('entryCandidates contract marker missing');
        return src.replace(needle,'entryCandidates:'+entryCandidates);
      });
    }else loadSource(ref);
  }
  const G=globalThis.SudokuGenerator,B=globalThis.SudokuBank;
  const variant=Array.isArray(B)&&B.find(v=>v.id==='classic');
  if(!G||!variant||typeof G.make!=='function')throw new Error('Classic production runtime missing');
  const t0=performance.now();
  const out=G.make(variant,seed,'expert');
  const generationMs=performance.now()-t0;
  const g=out&&out.generation||{};
  const row={
    seed,entryCandidates,generationMs:rounded(generationMs),givens:countGivens(out&&out.puzzle),
    unique:g.unique===true,locallyIrreducible:g.locallyIrreducibleUnderProductionContract===true,
    humanLevel:Number.isInteger(g.humanLevel)?g.humanLevel:null,humanScore:g.humanScore??null,humanStatus:g.humanStatus||null,
    baseAttempts:g.baseAttempts??null,removalAttempts:g.removalAttempts??null,localRemovalAttempts:g.localRemovalAttempts??null,
    localAcceptedRemovals:g.localAcceptedRemovals??null,multistartEvaluations:g.multistartEvaluations??null,
    evaluationCacheHits:g.evaluationCacheHits??null,brutalPrunes:g.brutalPrunes??null,
    rawEntryCandidateCount:g.rawEntryCandidateCount??null,selectedEntryCandidateCount:g.entryCandidateCount??null,
    chosenEntryClues:g.chosenEntryClues??null,runtimeProfile:g.runtimeProfile||null
  };
  console.log('CLASSIC_ENTRY_CANDIDATE_SAMPLE '+JSON.stringify(row));
  process.exit(0);
}

const seeds=[93003,93005,93009,93012,93013,93017];
const policies=[4,2,1];
const timeoutMs=8000;
const rows=[];
for(const entryCandidates of policies){
  for(const seed of seeds){
    const run=spawnSync(process.execPath,[self,'--worker',String(entryCandidates),String(seed)],{cwd:root,encoding:'utf8',timeout:timeoutMs,maxBuffer:1024*1024});
    if(run.error&&run.error.code==='ETIMEDOUT'){
      const row={seed,entryCandidates,timeout:true,timeoutMs};rows.push(row);console.log('CLASSIC_ENTRY_CANDIDATE_TIMEOUT '+JSON.stringify(row));continue;
    }
    if(run.status!==0){
      const row={seed,entryCandidates,error:true,status:run.status,stderr:(run.stderr||'').trim().slice(-1000)};rows.push(row);console.log('CLASSIC_ENTRY_CANDIDATE_ERROR '+JSON.stringify(row));continue;
    }
    const line=(run.stdout||'').split(/\r?\n/).find(x=>x.startsWith('CLASSIC_ENTRY_CANDIDATE_SAMPLE '));
    if(!line){const row={seed,entryCandidates,error:true,status:run.status,reason:'sample missing'};rows.push(row);console.log('CLASSIC_ENTRY_CANDIDATE_ERROR '+JSON.stringify(row));continue;}
    const row=JSON.parse(line.slice('CLASSIC_ENTRY_CANDIDATE_SAMPLE '.length));rows.push(row);console.log(line);
  }
}
function percentile(xs,p){const a=xs.slice().sort((x,y)=>x-y);return a.length?a[Math.min(a.length-1,Math.ceil(a.length*p)-1)]:null;}
const summary=policies.map(entryCandidates=>{
  const subset=rows.filter(r=>r.entryCandidates===entryCandidates),ok=subset.filter(r=>!r.timeout&&!r.error),times=ok.map(r=>r.generationMs);
  return {entryCandidates,completed:ok.length,timeouts:subset.filter(r=>r.timeout).length,errors:subset.filter(r=>r.error).length,
    minMs:times.length?rounded(Math.min(...times)):null,medianMs:times.length?rounded(percentile(times,.5)):null,maxMs:times.length?rounded(Math.max(...times)):null,
    allUnique:ok.length>0&&ok.every(r=>r.unique),allLocallyIrreducible:ok.length>0&&ok.every(r=>r.locallyIrreducible),
    levels:[...new Set(ok.map(r=>r.humanLevel))].sort((a,b)=>a-b),givens:ok.length?{min:Math.min(...ok.map(r=>r.givens)),max:Math.max(...ok.map(r=>r.givens))}:null,
    evaluations:ok.length?{min:Math.min(...ok.map(r=>r.multistartEvaluations)),max:Math.max(...ok.map(r=>r.multistartEvaluations))}:null};
});
console.log('CLASSIC_ENTRY_CANDIDATE_DIFFERENTIAL '+JSON.stringify({seeds,timeoutMs,summary}));
if(summary.some(s=>s.errors))throw new Error('entry candidate differential had worker errors');
console.log('CLASSIC_ENTRY_CANDIDATE_DIFFERENTIAL:PASS');
