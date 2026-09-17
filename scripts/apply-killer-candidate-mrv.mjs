import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const file=path.join(root,'games/sudoku-generator.js');
let s=fs.readFileSync(file,'utf8');

const helperName='killerCageCandidateMask';
const helperSignature='function killerCageCandidateMask(variant,grid,r,c,mask,n)';
const oldGuard='if(!mask||!variant||!variant.data||!variant.data.cages)return mask;';
const activeGuard="var killerActive=variant&&(variant.kind==='killer'||variant.kind==='killerskyscrapers'||(variant.kind==='combined'&&variant.kinds&&variant.kinds.indexOf('killer')>=0));\n    if(!mask||!killerActive||!variant.data||!variant.data.cages)return mask;";
const helper=`${helperSignature}{\n    ${activeGuard}\n    var cages=killerCageIndex(variant,n)[r][c]||[];\n    for(var i=0;i<cages.length;i++){\n      var cage=cages[i],usedMask=0;\n      for(var j=0;j<cage.cells.length;j++){\n        var p=cage.cells[j];\n        if(p[0]===r&&p[1]===c)continue;\n        var v=grid[p[0]][p[1]];\n        if(v)usedMask|=1<<(v-1);\n      }\n      var combos=killerCageCombinationMasks(n,cage.cells.length,cage.sum),allowed=0;\n      for(var ci=0;ci<combos.length;ci++)if((combos[ci]&usedMask)===usedMask)allowed|=combos[ci]&~usedMask;\n      mask&=allowed;\n      if(!mask)return 0;\n    }\n    return mask;\n  }\n  `;

if(s.includes(helperSignature)){
  if(s.includes(oldGuard))s=s.replace(oldGuard,activeGuard);
  else if(!s.includes('var killerActive='))throw new Error('existing Killer candidate helper has unknown guard');
}else{
  const pos=s.indexOf('function killerCagesValid(variant,grid,r,c)');
  if(pos<0)throw new Error('killerCagesValid anchor not found');
  s=s.slice(0,pos)+helper+s.slice(pos);
}

const start=s.indexOf('function countVariantSolutions(');
if(start<0)throw new Error('countVariantSolutions not found');
let tail=s.slice(start);
const call=`${helperName}(variant,grid,rr,cc,mask,n)`;
if(!tail.includes(call)){
  const current=/var bb=Math\.floor\(rr\/bh\)\*Math\.floor\(n\/bw\)\+Math\.floor\(cc\/bw\),mask=full&~\(rows\[rr\]\|cols\[cc\]\|boxes\[bb\]\),allowed=0;/;
  if(!current.test(tail))throw new Error('current variant MRV mask anchor not found');
  tail=tail.replace(current,`var bb=Math.floor(rr/bh)*Math.floor(n/bw)+Math.floor(cc/bw),mask=full&~(rows[rr]|cols[cc]|boxes[bb]),allowed=0;mask=${call};`);
  s=s.slice(0,start)+tail;
}

fs.writeFileSync(file,s);
const verify=fs.readFileSync(file,'utf8');
if(!verify.includes(helperSignature)||!verify.includes('var killerActive='))throw new Error('Killer candidate MRV helper was not written with active-kind guard');
const verifyStart=verify.indexOf('function countVariantSolutions(');
if(verifyStart<0||!verify.slice(verifyStart).includes(call))throw new Error('Killer candidate MRV call was not written');
console.log('KILLER_CANDIDATE_MRV:APPLIED_AND_VERIFIED');
