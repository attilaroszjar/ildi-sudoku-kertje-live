import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>m[1]);
const wanted=refs.filter(x=>/^games\/sudoku-bank(?:-iteration\d+)?\.js$/.test(x)||['games/sudoku-generator.js','games/line-generator-core.js','games/line-generator-proven-siblings.js'].includes(x));
const ctx={console,globalThis:null,window:null,Map,Set,WeakMap};ctx.globalThis=ctx;ctx.window=ctx;vm.createContext(ctx);for(const ref of wanted)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
const G=ctx.SudokuGenerator,C=ctx.LineGeneratorCore,S=ctx.LineGeneratorProvenSiblings,v=ctx.SudokuBank.find(x=>x.id==='nabner');if(!v)throw new Error('missing nabner');
function run(seed,mode){
 const cfg=S.CONFIGS.nabner,difficulty='expert',attemptSeed=((seed>>>0)^cfg.seedXor^0x45585054^Math.imul(1,0x9E3779B1))>>>0,fresh=C.freshStandardSolution(attemptSeed),solution=fresh.grid,lines=[],seen={};
 for(let li=0;li<4;li++){const built=cfg.builder(solution,(attemptSeed^Math.imul(li+1,0x85EBCA6B))>>>0,{}),fp=C.topologyFingerprint([built.path],{directed:false});if(seen[fp]){li--;continue;}seen[fp]=1;lines.push(built.path);}
 const candidate=JSON.parse(JSON.stringify(v));candidate.solution=C.cloneGrid(solution);candidate.data=Object.assign({},candidate.data||{},{lines:lines.map(cfg.wrap)});
 let order=Array.from({length:81},(_,i)=>i),random=C.rng((attemptSeed^0x43415256^4)>>>0);C.shuffle(order,random);
 const onLine=new Set(lines.flat().map(p=>p[0]*9+p[1]));
 if(mode==='off-first')order.sort((a,b)=>(onLine.has(a)?1:0)-(onLine.has(b)?1:0));
 if(mode==='line-first')order.sort((a,b)=>(onLine.has(b)?1:0)-(onLine.has(a)?1:0));
 const grid=C.cloneGrid(solution);let clues=81,calls=0,solverMs=0,maxCall=0;const t0=performance.now();
 for(const idx of order){if(clues<=30)break;const r=Math.floor(idx/9),c=idx%9,old=grid[r][c];grid[r][c]=0;const s=performance.now(),n=G.countVariantSolutions(grid,candidate,2),dt=performance.now()-s;calls++;solverMs+=dt;maxCall=Math.max(maxCall,dt);if(n!==1)grid[r][c]=old;else clues--;}
 return {seed,mode,runtimeMs:+(performance.now()-t0).toFixed(1),solverMs:+solverMs.toFixed(1),maxCallMs:+maxCall.toFixed(1),calls,clues,variantUnique:G.countVariantSolutions(grid,candidate,2)===1,classicAmbiguous:G.countSolutions(grid,2)>1};
}
const seeds=[31033,31003];for(let s=31000;s<31064;s++)if(!seeds.includes(s))seeds.push(s);
const modes=['baseline','off-first','line-first'],out=[];
for(const mode of modes){const rows=seeds.map(seed=>run(seed,mode)),times=rows.map(x=>x.runtimeMs).sort((a,b)=>a-b),pick=q=>times[Math.min(times.length-1,Math.floor(q*(times.length-1)))];out.push({mode,samples:rows.length,failures:rows.filter(x=>x.clues!==30||!x.variantUnique||!x.classicAmbiguous).length,p50:pick(.5),p95:pick(.95),max:times.at(-1),seed31033:rows.find(x=>x.seed===31033),seed31003:rows.find(x=>x.seed===31003)});}
console.log('NABNER_CARVE_ORDER_DIAGNOSTIC '+JSON.stringify(out));
