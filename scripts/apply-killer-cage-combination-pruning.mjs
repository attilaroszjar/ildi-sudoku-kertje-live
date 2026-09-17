import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const file=path.join(root,'games/sudoku-generator.js');
let s=fs.readFileSync(file,'utf8');

const old="function killerCageRemainingBounds(n,used,count){var available=[];for(var d=1;d<=n;d++)if(!used[d])available.push(d);if(available.length<count)return null;var min=0,max=0;for(var i=0;i<count;i++){min+=available[i];max+=available[available.length-1-i];}return{min:min,max:max};}\n  function killerCagesValid(variant,grid,r,c){var cages=(variant.data&&variant.data.cages)||[],n=grid.length;for(var i=0;i<cages.length;i+=1){var cage=cages[i];if(!cage.cells.some(function(p){return p[0]===r&&p[1]===c;}))continue;var vals=cage.cells.map(function(p){return grid[p[0]][p[1]];}).filter(Boolean),used={};for(var vi=0;vi<vals.length;vi++){if(used[vals[vi]])return false;used[vals[vi]]=1;}var sum=vals.reduce(function(a,b){return a+b;},0),remaining=cage.cells.length-vals.length;if(sum>cage.sum)return false;if(!remaining){if(sum!==cage.sum)return false;continue;}var bounds=killerCageRemainingBounds(n,used,remaining);if(!bounds)return false;var need=cage.sum-sum;if(need<bounds.min||need>bounds.max)return false;}return true;}";

const replacement="var killerCageComboCache={};\n  var killerCageIndexCache=typeof WeakMap!=='undefined'?new WeakMap():null;\n  function killerCageCombinationMasks(n,size,sum){var key=n+':'+size+':'+sum;if(killerCageComboCache[key])return killerCageComboCache[key];var out=[];function walk(next,left,total,mask){if(!left){if(total===sum)out.push(mask);return;}if(total>=sum)return;for(var d=next;d<=n;d++){if(total+d>sum)break;walk(d+1,left-1,total+d,mask|(1<<(d-1)));}}walk(1,size,0,0);killerCageComboCache[key]=out;return out;}\n  function killerCageIndex(variant,n){if(killerCageIndexCache&&killerCageIndexCache.has(variant))return killerCageIndexCache.get(variant);var idx=Array.from({length:n},function(){return Array.from({length:n},function(){return [];});}),cages=(variant.data&&variant.data.cages)||[];for(var i=0;i<cages.length;i++)for(var j=0;j<cages[i].cells.length;j++){var p=cages[i].cells[j];idx[p[0]][p[1]].push(cages[i]);}if(killerCageIndexCache)killerCageIndexCache.set(variant,idx);return idx;}\n  function killerCagesValid(variant,grid,r,c){var n=grid.length,cages=killerCageIndex(variant,n)[r][c]||[];for(var i=0;i<cages.length;i++){var cage=cages[i],usedMask=0,assigned=0;for(var j=0;j<cage.cells.length;j++){var p=cage.cells[j],v=grid[p[0]][p[1]];if(!v)continue;var bit=1<<(v-1);if(usedMask&bit)return false;usedMask|=bit;assigned++;}var combos=killerCageCombinationMasks(n,cage.cells.length,cage.sum),possible=false;for(var ci=0;ci<combos.length;ci++)if((combos[ci]&usedMask)===usedMask){possible=true;break;}if(!possible)return false;if(assigned===cage.cells.length){var exact=false;for(ci=0;ci<combos.length;ci++)if(combos[ci]===usedMask){exact=true;break;}if(!exact)return false;}}return true;}";

if(!s.includes(old))throw new Error('Expected bounded Killer cage pruning anchor not found');
s=s.replace(old,replacement);
fs.writeFileSync(file,s);
console.log('KILLER_CAGE_COMBINATION_PRUNING:APPLIED');
