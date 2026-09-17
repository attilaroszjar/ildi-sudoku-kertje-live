import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'games','sudoku-generator.js');
let text=fs.readFileSync(file,'utf8');

const start=text.indexOf('  function countParks2Solutions(source,variant,limit,ignoreClues){');
const end=text.indexOf('\n  function makeParks2Puzzle',start);
if(start<0||end<0)throw new Error('Parks2 solver block not found');
const current=text.slice(start,end);
if(current.includes('parks2RowDomainMRV-v3')){
  console.log('SKYSCRAPER_PARKS2_ROW_DOMAIN_MRV_V3_PATCH:PASS already-present=true');
  process.exit(0);
}
const fallback=current.replace('  function countParks2Solutions(source,variant,limit,ignoreClues){','  function countParks2SolutionsCellFallback(source,variant,limit,ignoreClues){');
if(fallback===current)throw new Error('Parks2 fallback rename failed');

const optimized=`  function countParks2Solutions(source,variant,limit,ignoreClues){
    var grid=cloneGrid(source),n=grid.length,d=variant.data||{},park=d.parkValue,maxDigit=d.maxDigit||n-2,parksPerLine=d.parksPerLine||2;
    if(n!==8||maxDigit!==6||parksPerLine!==2)return countParks2SolutionsCellFallback(source,variant,limit,ignoreClues);
    var clues=Array.isArray(d.clues)?d.clues:[];
    var left=Array(n).fill(null),right=Array(n).fill(null),top=Array(n).fill(null),bottom=Array(n).fill(null);
    if(!ignoreClues){
      for(var ci=0;ci<clues.length;ci++){
        var cl=clues[ci];
        if(cl.axis==='row'){
          if(cl.side==='left')left[cl.index]=cl.count;
          else if(cl.side==='right')right[cl.index]=cl.count;
        }else if(cl.axis==='col'){
          if(cl.side==='top')top[cl.index]=cl.count;
          else if(cl.side==='bottom')bottom[cl.index]=cl.count;
        }
      }
    }
    function visible(line){var max=0,count=0;for(var i=0;i<line.length;i++){var v=line[i];if(v===park)continue;if(v>max){max=v;count++;}}return count;}
    function matchesRowPattern(row,pattern){for(var c=0;c<n;c++)if(row[c]&&row[c]!==pattern[c])return false;return true;}
    var base=[1,2,3,4,5,6,park,park],patterns=[];
    function permute(pos){
      if(pos===n){patterns.push(base.slice());return;}
      var seen={};
      for(var i=pos;i<n;i++){
        var v=base[i];if(seen[v])continue;seen[v]=1;
        var t=base[pos];base[pos]=base[i];base[i]=t;permute(pos+1);t=base[pos];base[pos]=base[i];base[i]=t;
      }
    }
    permute(0);
    var domains=Array(n);
    for(var r=0;r<n;r++){
      var dom=[];
      for(var pi=0;pi<patterns.length;pi++){
        var p=patterns[pi];if(!matchesRowPattern(grid[r],p))continue;
        if(!ignoreClues&&left[r]!=null&&visible(p)!==left[r])continue;
        if(!ignoreClues&&right[r]!=null&&visible(p.slice().reverse())!==right[r])continue;
        dom.push(p);
      }
      if(!dom.length)return 0;domains[r]=dom;
    }
    var assigned=Array(n).fill(false),colMasks=Array(n).fill(0),colParks=Array(n).fill(0),colValues=Array.from({length:n},function(){return Array(n).fill(0);}),found=0;
    function columnPrefixFeasible(c){
      if(ignoreClues)return true;
      var first=-1,last=-1;
      for(var r=0;r<n;r++)if(assigned[r]){if(first<0)first=r;last=r;}
      if(first===0){
        var vis=0,high=0,k=0;for(;k<n&&assigned[k];k++){var v=colValues[c][k];if(v===park)continue;if(v>high){high=v;vis++;}}
        if(top[c]!=null){if(vis>top[c])return false;var rem=n-k,maxAdd=Math.min(rem,Math.max(0,maxDigit-high));if(vis+maxAdd<top[c])return false;}
      }
      if(last===n-1){
        var vis2=0,high2=0,q=n-1;for(;q>=0&&assigned[q];q--){var vv=colValues[c][q];if(vv===park)continue;if(vv>high2){high2=vv;vis2++;}}
        if(bottom[c]!=null){if(vis2>bottom[c])return false;var rem2=q+1,maxAdd2=Math.min(rem2,Math.max(0,maxDigit-high2));if(vis2+maxAdd2<bottom[c])return false;}
      }
      return true;
    }
    function patternCompatible(rowIndex,p){
      for(var c=0;c<n;c++){
        var v=p[c];
        if(v===park){if(colParks[c]>=2)return false;}
        else if(colMasks[c]&(1<<(v-1)))return false;
      }
      return true;
    }
    function applyRow(rowIndex,p,add){
      for(var c=0;c<n;c++){
        var v=p[c];
        if(add){colValues[c][rowIndex]=v;if(v===park)colParks[c]++;else colMasks[c]|=1<<(v-1);}
        else{if(v===park)colParks[c]--;else colMasks[c]^=1<<(v-1);colValues[c][rowIndex]=0;}
      }
      assigned[rowIndex]=add;
    }
    function finalColumnsValid(){
      for(var c=0;c<n;c++){
        if(colParks[c]!==2||colMasks[c]!==63)return false;
        if(!ignoreClues){var line=[];for(var r=0;r<n;r++)line.push(colValues[c][r]);if(top[c]!=null&&visible(line)!==top[c])return false;if(bottom[c]!=null&&visible(line.slice().reverse())!==bottom[c])return false;}
      }
      return true;
    }
    function visit(depth){
      if(found>=limit)return;
      if(depth===n){if(finalColumnsValid())found++;return;}
      var bestRow=-1,bestCandidates=null;
      for(var r=0;r<n;r++)if(!assigned[r]){
        var candidates=[];
        for(var pi=0;pi<domains[r].length;pi++)if(patternCompatible(r,domains[r][pi]))candidates.push(domains[r][pi]);
        if(!candidates.length)return;
        if(bestCandidates===null||candidates.length<bestCandidates.length){bestRow=r;bestCandidates=candidates;if(candidates.length===1)break;}
      }
      for(var bi=0;bi<bestCandidates.length;bi++){
        var p=bestCandidates[bi];applyRow(bestRow,p,true);
        var ok=true;
        for(var c=0;c<n;c++){
          var remaining=n-depth-1;
          if(colParks[c]>2||colParks[c]+remaining<2){ok=false;break;}
          if(!columnPrefixFeasible(c)){ok=false;break;}
        }
        if(ok)visit(depth+1);
        applyRow(bestRow,p,false);
        if(found>=limit)return;
      }
    }
    visit(0);return found;
  }
  // parks2RowDomainMRV-v3
`;

text=text.slice(0,start)+fallback+'\n'+optimized+text.slice(end);
fs.writeFileSync(file,text);
console.log('SKYSCRAPER_PARKS2_ROW_DOMAIN_MRV_V3_PATCH:PASS already-present=false');
