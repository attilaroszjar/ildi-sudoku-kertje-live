(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var L=root.ClassicHumanLinks;
  var A=root.ClassicHumanALS;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!L&&typeof require==='function')L=require('./links.js');
  if(!A&&typeof require==='function')A=require('./als.js');

  function intOption(value,fallback,min,max,name){var n=value==null?fallback:value;if(!Number.isInteger(n)||n<min||n>max)throw new RangeError(name+' must be '+min+'..'+max);return n;}
  function digitCells(state,als,digit){return als.cells.filter(function(cell){return L.hasCandidate(state,cell,digit);});}
  function seesAll(cell,cells){for(var i=0;i<cells.length;i++)if(!L.sees(cell,cells[i]))return false;return true;}
  function unsolvedCells(state){var out=[];for(var cell=0;cell<81;cell++){var rc=C.rowCol(cell);if(!state.grid[rc[0]][rc[1]]&&C.bitCount(state.masks[cell])>=2)out.push(cell);}return out;}
  function rejectionWitness(state,a,b,p,q,alsList){
    if(p===q)return L.sees(a,b)?{kind:'aligned-equal-digit',digit:p}:null;
    for(var i=0;i<alsList.length;i++){
      var als=alsList[i];
      if(als.cells.indexOf(a)>=0||als.cells.indexOf(b)>=0)continue;
      var pm=als.mask&C.bitForDigit(p),qm=als.mask&C.bitForDigit(q);if(!pm||!qm)continue;
      var pc=digitCells(state,als,p),qc=digitCells(state,als,q);if(!pc.length||!qc.length)continue;
      if(seesAll(a,pc)&&seesAll(b,qc))return {kind:'als',alsKey:als.key,alsCells:als.cells.slice(),p:p,q:q,orientation:'ab'};
    }
    return null;
  }
  function pairAnalysis(state,a,b,alsList){
    var ad=C.digitsFromMask(state.masks[a]),bd=C.digitsFromMask(state.masks[b]),survivors=[],rejected=[];
    for(var i=0;i<ad.length;i++)for(var j=0;j<bd.length;j++){
      var p=ad[i],q=bd[j],w=rejectionWitness(state,a,b,p,q,alsList);
      if(w)rejected.push({aDigit:p,bDigit:q,witness:w});else survivors.push([p,q]);
    }
    var elims=[];
    for(i=0;i<ad.length;i++)if(!survivors.some(function(x){return x[0]===ad[i];}))elims.push({cell:a,digit:ad[i],side:'a'});
    for(j=0;j<bd.length;j++)if(!survivors.some(function(x){return x[1]===bd[j];}))elims.push({cell:b,digit:bd[j],side:'b'});
    return {aDigits:ad,bDigits:bd,survivors:survivors,rejected:rejected,eliminations:elims};
  }
  function proofForElimination(analysis,elim){
    var rows=[];
    if(elim.side==='a'){
      for(var i=0;i<analysis.bDigits.length;i++){var q=analysis.bDigits[i],r=analysis.rejected.find(function(x){return x.aDigit===elim.digit&&x.bDigit===q;});if(!r)return null;rows.push(r);}
    }else{
      for(i=0;i<analysis.aDigits.length;i++){var p=analysis.aDigits[i],rr=analysis.rejected.find(function(x){return x.aDigit===p&&x.bDigit===elim.digit;});if(!rr)return null;rows.push(rr);}
    }
    return rows;
  }
  function findingKey(d){return C.deductionStateKey(d)+'|'+d.explanationData.baseCells.join(',');}
  function findAlignedPairExclusion(state,options){
    options=options||{};
    var maxAlsCells=intOption(options.maxAlsCells,4,1,4,'APE maxAlsCells');
    var pairBudget=intOption(options.pairBudget,2000,1,4096,'APE pairBudget');
    var maxFindings=intOption(options.maxFindings,64,1,128,'APE maxFindings');
    var als=options.als||A.enumerateAls(state,{maxCells:maxAlsCells}),cells=unsolvedCells(state),out=[],seen={},pairs=0;
    for(var ai=0;ai<cells.length&&pairs<pairBudget&&out.length<maxFindings;ai++)for(var bi=ai+1;bi<cells.length&&pairs<pairBudget&&out.length<maxFindings;bi++){
      var a=cells[ai],b=cells[bi];pairs++;
      var analysis=pairAnalysis(state,a,b,als);if(!analysis.eliminations.length)continue;
      for(var ei=0;ei<analysis.eliminations.length&&out.length<maxFindings;ei++){
        var elim=analysis.eliminations[ei],proof=proofForElimination(analysis,elim);if(!proof||!proof.length)continue;
        var anchors=[a,b],alsKeys=[],alsCells=[];
        for(var pi=0;pi<proof.length;pi++)if(proof[pi].witness.kind==='als'){
          var w=proof[pi].witness;if(alsKeys.indexOf(w.alsKey)<0)alsKeys.push(w.alsKey);for(var ci=0;ci<w.alsCells.length;ci++)if(alsCells.indexOf(w.alsCells[ci])<0)alsCells.push(w.alsCells[ci]);
        }
        anchors=anchors.concat(alsCells);
        var d=C.normalizeDeduction({techniqueId:'aligned-pair-exclusion',eliminations:[{cell:elim.cell,digit:elim.digit}],anchors:anchors,complexity:{baseCandidates:analysis.aDigits.length+analysis.bDigits.length,basePairProduct:analysis.aDigits.length*analysis.bDigits.length,rejectedPairs:proof.length,alsWitnessCount:alsKeys.length,pairIndex:pairs},explanationData:{baseCells:[a,b],aligned:L.sees(a,b),eliminatedCell:elim.cell,eliminatedDigit:elim.digit,side:elim.side,alsKeys:alsKeys,pairProofs:proof.map(function(r){return {aDigit:r.aDigit,bDigit:r.bDigit,witness:r.witness};})}});
        var key=findingKey(d);if(!seen[key]){seen[key]=1;out.push(d);}
      }
    }
    out.sort(C.compareDeductions);return out.slice(0,maxFindings);
  }

  var api={rejectionWitness:rejectionWitness,pairAnalysis:pairAnalysis,findAlignedPairExclusion:findAlignedPairExclusion};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanAlignedPairExclusion=api;
})(typeof globalThis!=='undefined'?globalThis:this);
