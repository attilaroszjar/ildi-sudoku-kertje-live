(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var L=root.ClassicHumanLinks;
  var A=root.ClassicHumanALS;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!L&&typeof require==='function')L=require('./links.js');
  if(!A&&typeof require==='function')A=require('./als.js');

  function intOption(value,fallback,min,max,name){
    var n=value==null?fallback:value;
    if(!Number.isInteger(n)||n<min||n>max)throw new RangeError(name+' must be '+min+'..'+max);
    return n;
  }
  function digitCells(state,als,digit){return als.cells.filter(function(cell){return L.hasCandidate(state,cell,digit);});}
  function allSeenByStem(stem,cells){for(var i=0;i<cells.length;i++)if(!L.sees(stem,cells[i]))return false;return true;}
  function overlapsCells(a,b){var s=new Set(a.cells);for(var i=0;i<b.cells.length;i++)if(s.has(b.cells[i]))return true;return false;}
  function candidatePetals(state,stem,digit,als,maxPerDigit){
    var out=[];
    for(var i=0;i<als.length&&out.length<maxPerDigit;i++){
      var petal=als[i];
      if(petal.cells.indexOf(stem)>=0||!(petal.mask&C.bitForDigit(digit)))continue;
      var linked=digitCells(state,petal,digit);
      if(!linked.length||!allSeenByStem(stem,linked))continue;
      out.push(petal);
    }
    return out;
  }
  function commonDigits(petals,links){
    var mask=C.FULL_MASK;
    for(var i=0;i<petals.length;i++)mask&=petals[i].mask&~C.bitForDigit(links[i]);
    return C.digitsFromMask(mask);
  }
  function targetEliminations(state,stem,petals,z){
    var blocked=new Set([stem]);
    var zCells=[];
    for(var i=0;i<petals.length;i++){
      for(var j=0;j<petals[i].cells.length;j++)blocked.add(petals[i].cells[j]);
      zCells.push(digitCells(state,petals[i],z));
    }
    if(zCells.some(function(cells){return !cells.length;}))return [];
    var out=[];
    for(var cell=0;cell<81;cell++){
      if(blocked.has(cell)||!L.hasCandidate(state,cell,z))continue;
      var seesAll=true;
      for(i=0;i<zCells.length&&seesAll;i++)for(j=0;j<zCells[i].length;j++)if(!L.sees(cell,zCells[i][j])){seesAll=false;break;}
      if(seesAll)out.push({cell:cell,digit:z});
    }
    return out;
  }
  function findDeathBlossom(state,options){
    options=options||{};
    var maxStemCandidates=intOption(options.maxStemCandidates,3,2,3,'Death Blossom maxStemCandidates');
    var maxCells=intOption(options.maxCells,4,1,4,'Death Blossom maxCells');
    var maxPetalsPerDigit=intOption(options.maxPetalsPerDigit,12,1,24,'Death Blossom maxPetalsPerDigit');
    var combinationBudget=intOption(options.combinationBudget,512,1,2048,'Death Blossom combinationBudget');
    var als=options.als||A.enumerateAls(state,{maxCells:maxCells}),out=[],combinationsUsed=0;
    for(var stem=0;stem<81&&combinationsUsed<combinationBudget;stem++){
      var rc=C.rowCol(stem);if(state.grid[rc[0]][rc[1]])continue;
      var links=C.digitsFromMask(state.masks[stem]);
      if(links.length<2||links.length>maxStemCandidates)continue;
      var choices=[],viable=true;
      for(var li=0;li<links.length;li++){
        var petals=candidatePetals(state,stem,links[li],als,maxPetalsPerDigit);
        if(!petals.length){viable=false;break;}choices.push(petals);
      }
      if(!viable)continue;
      var selected=[];
      function dfs(depth){
        if(combinationsUsed>=combinationBudget)return;
        if(depth===links.length){
          combinationsUsed++;
          var zs=commonDigits(selected,links);
          for(var zi=0;zi<zs.length;zi++){
            var z=zs[zi],elims=targetEliminations(state,stem,selected,z);if(!elims.length)continue;
            var anchors=[stem],petalKeys=[];
            for(var p=0;p<selected.length;p++){anchors=anchors.concat(selected[p].cells);petalKeys.push(selected[p].key);}
            out.push(C.normalizeDeduction({techniqueId:'death-blossom',eliminations:elims,anchors:anchors,complexity:{stemCandidates:links.length,petalCount:selected.length,totalPetalCells:selected.reduce(function(n,x){return n+x.size;},0),combinationIndex:combinationsUsed},explanationData:{stemCell:stem,stemDigits:links.slice(),petalKeys:petalKeys,linkDigits:links.slice(),zDigit:z}}));
          }
          return;
        }
        var list=choices[depth];
        for(var i=0;i<list.length&&combinationsUsed<combinationBudget;i++){
          var petal=list[i],ok=true;
          for(var j=0;j<selected.length;j++)if(overlapsCells(petal,selected[j])){ok=false;break;}
          if(!ok)continue;
          selected.push(petal);dfs(depth+1);selected.pop();
        }
      }
      dfs(0);
    }
    var seen={},ded=[];
    out.sort(C.compareDeductions);
    for(var i=0;i<out.length;i++){
      var key=C.deductionStateKey(out[i]);if(seen[key])continue;seen[key]=1;ded.push(out[i]);
    }
    return ded;
  }

  var api={candidatePetals:candidatePetals,findDeathBlossom:findDeathBlossom};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanDeathBlossom=api;
})(typeof globalThis!=='undefined'?globalThis:this);
