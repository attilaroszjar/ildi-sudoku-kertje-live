import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const Rating=require('../games/classic-human/rating.js');

const ROOT=path.resolve(import.meta.dirname,'..');
const POOLS=['gentle','focused','expert'];

function median(values){
  const xs=values.filter(Number.isFinite).slice().sort((a,b)=>a-b);
  if(!xs.length)return null;
  const mid=Math.floor(xs.length/2);
  return xs.length%2?xs[mid]:(xs[mid-1]+xs[mid])/2;
}
function counts(values){
  const out={};
  for(const value of values)out[value]=(out[value]||0)+1;
  return Object.fromEntries(Object.entries(out).sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]))));
}
function top(countMap,n=6){return Object.fromEntries(Object.entries(countMap).slice(0,n));}
function recordsFor(pool){
  const file=path.join(ROOT,'data','classic-human-pools',pool+'.json');
  const parsed=JSON.parse(fs.readFileSync(file,'utf8'));
  if(!Array.isArray(parsed.records))throw new Error(pool+': records missing');
  return parsed.records;
}
function levelForRecord(record){
  return Rating.levelForRating({
    score:record.score,
    maxTechniquePriority:record.maxTechniquePriority,
    hardestTechnique:record.hardestTechnique,
    dependencyDepth:record.dependencyDepth
  });
}
function familySignature(record){
  return Object.keys(record.familyCounts||{}).filter(k=>(record.familyCounts[k]||0)>0).sort().join('+')||'none';
}
function summarize(rows){
  const scores=rows.map(r=>r.score);
  const levels=rows.map(levelForRecord);
  return {
    count:rows.length,
    levels:counts(levels),
    score:[Math.min(...scores),median(scores),Math.max(...scores)],
    advancedPuzzles:rows.filter(r=>(r.advancedSteps||0)>0).length,
    dependencyMedian:median(rows.map(r=>r.dependencyDepth||0)),
    stepsMedian:median(rows.map(r=>r.totalSteps||0)),
    placementsMedian:median(rows.map(r=>r.placements||0)),
    eliminationsMedian:median(rows.map(r=>r.eliminations||0)),
    hardest:top(counts(rows.map(r=>r.hardestTechnique||'none'))),
    families:top(counts(rows.map(familySignature)))
  };
}
function nakedSingleDiagnostics(rows){
  const naked=rows.filter(r=>r.hardestTechnique==='naked-single');
  return {
    count:naked.length,
    scoreCounts:counts(naked.map(r=>r.score)),
    dependencyCounts:counts(naked.map(r=>r.dependencyDepth||0)),
    stepCounts:counts(naked.map(r=>r.totalSteps||0)),
    scoreDependency:counts(naked.map(r=>String(r.score)+'@d'+String(r.dependencyDepth||0))),
    levelCounts:counts(naked.map(levelForRecord))
  };
}

const all=[];
const byPool={};
for(const pool of POOLS){
  const rows=recordsFor(pool);
  for(const row of rows){
    if(row.status!=='SOLVED_LOGICALLY'||!Number.isFinite(row.score))throw new Error(pool+': unrated production record');
    all.push({...row,sourcePool:pool,currentLevel:levelForRecord(row)});
  }
  byPool[pool]=summarize(rows);
}

const byLevel={};
for(let level=1;level<=9;level++){
  const rows=all.filter(r=>r.currentLevel===level);
  byLevel[level]=rows.length?summarize(rows):{count:0};
}

const lower=all.filter(r=>r.currentLevel<=4);
const lowerTechniqueMatrix={};
for(const row of lower){
  const key=String(row.currentLevel);
  if(!lowerTechniqueMatrix[key])lowerTechniqueMatrix[key]={};
  const technique=row.hardestTechnique||'none';
  lowerTechniqueMatrix[key][technique]=(lowerTechniqueMatrix[key][technique]||0)+1;
}
for(const key of Object.keys(lowerTechniqueMatrix))lowerTechniqueMatrix[key]=top(counts(Object.entries(lowerTechniqueMatrix[key]).flatMap(([k,n])=>Array(n).fill(k))));

const occupied=Object.entries(byLevel).filter(([,v])=>v.count>0).map(([k])=>Number(k));
const sparse=Object.entries(byLevel).filter(([level,v])=>Number(level)<9&&v.count>0&&v.count<4).map(([level,v])=>({level:Number(level),count:v.count}));
console.log('CLASSIC_LEVEL_AUDIT total='+all.length+' occupied='+occupied.join(','));
console.log('CLASSIC_LEVEL_AUDIT_POLICY '+JSON.stringify(Rating.LEVEL_POLICY));
console.log('CLASSIC_LEVEL_AUDIT_POOLS '+JSON.stringify(byPool));
console.log('CLASSIC_LEVEL_AUDIT_LEVELS '+JSON.stringify(byLevel));
console.log('CLASSIC_LEVEL_AUDIT_LOWER_TECHNIQUES '+JSON.stringify(lowerTechniqueMatrix));
console.log('CLASSIC_LEVEL_AUDIT_NAKED_SINGLE '+JSON.stringify(nakedSingleDiagnostics(all)));
console.log('CLASSIC_LEVEL_AUDIT_COVERAGE '+JSON.stringify({occupied,sparse,missing:Array.from({length:9},(_,i)=>i+1).filter(level=>!occupied.includes(level))}));
