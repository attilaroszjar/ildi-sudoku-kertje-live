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
if(current.includes('parks2RowDomainMRV-v2')){
  console.log('SKYSCRAPER_PARKS2_ROW_DOMAIN_MRV_PRUNING_PATCH:PASS already-present=true');
  process.exit(0);
}

const replacement=`  function countParks2Solutions(source,variant,limit,ignoreClues){
    var grid=cloneGrid(source),n=grid.length,d=variant.data||{},park=d.parkValue,maxDigit=d.maxDigit||n-2,parksPerLine=d.parksPerLine||2,full=(1<<maxDigit)-1;
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
    function columnFeasible(c,assignedRows){
      if(colParks[c]>2)return false;
      if(colParks[c]+(n-assignedRows)<2)return false;
      if(ignoreClues)return true;
      var prefix=[];for(var r=0;r<n;r++){if(!assigned[r])break;prefix.push(colValues[c][r]);}
      if(prefix.length){
        var vis=0,high=0;for(var i=0;i<prefix.length;i++){var v=prefix[i];if(v===park)continue;if(v>high){high=v;vis++;}}
        if(top[c]!=null){if(vis>top[c])return false;var rem=n-prefix.length,maxAdd=Math.min(rem,Math.max(0,maxDigit-high));if(vis+maxAdd<top[c])return false;}
      }
      var suffix=[];for(var rr=n-1;rr>=0;rr--){if(!assigned[rr])break;suffix.push(colValues[c][rr]);}
      if(suffix.length){
        var vis2=0,high2=0;for(var j=0;j<suffix.length;j++){var vv=suffix[j];if(vv===park)continue;if(vv>high2){high2=vv;vis2++;}}
        if(bottom[c]!=null){if(vis2>bottom[c])return false;var rem2=n-suffix.length,maxAdd2=Math.min(rem2,Math.max(0,maxDigit-high2));if(vis2+maxAdd2<bottom[c])return false;}
      }
      if(assignedRows===n){
        var line=[];for(var q=0;q<n;q++)line.push(colValues[c][q]);
        if(top[c]!=null&&visible(line)!==top[c])return false;
        if(bottom[c]!=null&&visible(line.slice().reverse())!==bottom[c])return false;
      }
      return true;
    }
    function patternCompatible(rowIndex,p,assignedRows){
      for(var c=0;c<n;c++){
        var v=p[c];
        if(v===park){if(colParks[c]>=2)return false;}
        else{var bit=1<<(v-1);if(colMasks[c]&bit)return false;}
      }
      for(var c2=0;c2<n;c2++){
        var val=p[c2];colValues[c2][rowIndex]=val;
        if(val===park)colParks[c2]++;else colMasks[c2]|=1<<(val-1);
      }
      assigned[rowIndex]=true;
      var ok=true;for(var c3=0;c3<n;c3++)if(!columnFeasible(c3,assignedRows+1)){ok=false;break;}
      assigned[rowIndex]=false;
      for(var c4=0;c4<n;c4++){
        var val2=p[c4];if(val2===park)colParks[c4]--;else colMasks[c4]^=1<<(val2-1);colValues[c4][rowIndex]=0;
      }
      return ok;
    }
    function visit(depth){
      if(found>=limit)return;
      if(depth===n){found++;return;}
      var bestRow=-1,bestCandidates=null;
      for(var r=0;r<n;r++)if(!assigned[r]){
        var candidates=[];
        for(var pi=0;pi<domains[r].length;pi++)if(patternCompatible(r,domains[r][pi],depth))candidates.push(domains[r][pi]);
        if(!candidates.length)return;
        if(bestCandidates===null||candidates.length<bestCandidates.length){bestRow=r;bestCandidates=candidates;if(candidates.length===1)break;}
      }
      for(var bi=0;bi<bestCandidates.length;bi++){
        var p=bestCandidates[bi];
        for(var c=0;c<n;c++){var v=p[c];colValues[c][bestRow]=v;if(v===park)colParks[c]++;else colMasks[c]|=1<<(v-1);}
        assigned[bestRow]=true;
        var ok=true;for(var cc=0;cc<n;cc++)if(!columnFeasible(cc,depth+1)){ok=false;break;}
        if(ok)visit(depth+1);
        assigned[bestRow]=false;
        for(var c2=0;c2<n;c2++){var v2=p[c2];if(v2===park)colParks[c2]--;else colMasks[c2]^=1<<(v2-1);colValues[c2][bestRow]=0;}
        if(found>=limit)return;
      }
    }
    visit(0);
    return found;
  }
  // parks2RowDomainMRV-v2
`;

text=text.slice(0,start)+replacement+text.slice(end);
fs.writeFileSync(file,text);
console.log('SKYSCRAPER_PARKS2_ROW_DOMAIN_MRV_PRUNING_PATCH:PASS already-present=false');
