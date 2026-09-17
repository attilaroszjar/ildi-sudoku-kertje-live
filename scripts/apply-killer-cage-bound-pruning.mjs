import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');

const generatorFile=path.join(root,'games/sudoku-generator.js');
let s=fs.readFileSync(generatorFile,'utf8');
const old="function killerCagesValid(variant,grid,r,c){var cages=(variant.data&&variant.data.cages)||[];for(var i=0;i<cages.length;i+=1){var cage=cages[i];if(!cage.cells.some(function(p){return p[0]===r&&p[1]===c;}))continue;var vals=cage.cells.map(function(p){return grid[p[0]][p[1]];}).filter(Boolean);if(new Set(vals).size!==vals.length)return false;var sum=vals.reduce(function(a,b){return a+b;},0);if(sum>cage.sum)return false;if(vals.length===cage.cells.length&&sum!==cage.sum)return false;}return true;}";
const replacement="function killerCageRemainingBounds(n,used,count){var available=[];for(var d=1;d<=n;d++)if(!used[d])available.push(d);if(available.length<count)return null;var min=0,max=0;for(var i=0;i<count;i++){min+=available[i];max+=available[available.length-1-i];}return{min:min,max:max};}\n  function killerCagesValid(variant,grid,r,c){var cages=(variant.data&&variant.data.cages)||[],n=grid.length;for(var i=0;i<cages.length;i+=1){var cage=cages[i];if(!cage.cells.some(function(p){return p[0]===r&&p[1]===c;}))continue;var vals=cage.cells.map(function(p){return grid[p[0]][p[1]];}).filter(Boolean),used={};for(var vi=0;vi<vals.length;vi++){if(used[vals[vi]])return false;used[vals[vi]]=1;}var sum=vals.reduce(function(a,b){return a+b;},0),remaining=cage.cells.length-vals.length;if(sum>cage.sum)return false;if(!remaining){if(sum!==cage.sum)return false;continue;}var bounds=killerCageRemainingBounds(n,used,remaining);if(!bounds)return false;var need=cage.sum-sum;if(need<bounds.min||need>bounds.max)return false;}return true;}";
if(!s.includes(old))throw new Error('Expected killerCagesValid anchor not found');
s=s.replace(old,replacement);
fs.writeFileSync(generatorFile,s);

const combinedFile=path.join(root,'games/combined-killer-generator.js');
let c=fs.readFileSync(combinedFile,'utf8');
c=c.replace("},6,seed,false);\n      return{data:{lines:pal}","},4,seed,false);\n      return{data:{lines:pal}");
c=c.replace("},4,seed,false,function(path){return{cells:path.map(function(p){return p.slice();})};});\n      var lockPaths", "},2,seed,false,function(path){return{cells:path.map(function(p){return p.slice();})};});\n      var lockPaths");
fs.writeFileSync(combinedFile,c);
console.log('KILLER_CAGE_BOUND_PRUNING:APPLIED');
