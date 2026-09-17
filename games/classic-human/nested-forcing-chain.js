(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var N=root.ClassicHumanNestedForcing;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!N&&typeof require==='function')N=require('./nested-forcing.js');

  function intOption(value,fallback,min,max,name){
    var n=value==null?fallback:value;
    if(!Number.isInteger(n)||n<min||n>max)throw new RangeError(name+' must be '+min+'..'+max);
    return n;
  }
  function candidateSeeds(state,options){
    options=options||{};
    var budget=intOption(options.candidateBudget,6,1,12,'nested candidateBudget'),out=[];
    for(var cell=0;cell<81&&out.length<budget;cell++){
      var mask=state.masks[cell];
      if(C.bitCount(mask)!==2)continue;
      var digits=C.digitsFromMask(mask);
      for(var i=0;i<digits.length&&out.length<budget;i++)out.push({cell:cell,digit:digits[i]});
    }
    return out;
  }
  function findNestedForcingChain(state,options){
    options=options||{};
    var seeds=options.seeds||candidateSeeds(state,options),out=[];
    for(var i=0;i<seeds.length;i++){
      var seed=seeds[i];
      var analysis=N.analyzeNestedBinary(state,seed.cell,seed.digit,{
        directSteps:options.directSteps,
        nestedSteps:options.nestedSteps,
        dynamicCandidateBudget:options.dynamicCandidateBudget,
        dynamicNestedSteps:options.dynamicNestedSteps,
        dynamicInnerSteps:options.dynamicInnerSteps,
        workBudget:options.workBudget
      });
      if(analysis.status==='NONE'||analysis.status==='INCONSISTENT')continue;
      var placements=analysis.placements.slice(),eliminations=analysis.eliminations.slice();
      if(!placements.length&&!eliminations.length)continue;
      out.push(C.normalizeDeduction({
        techniqueId:'nested-forcing-chain',
        placements:placements,
        eliminations:eliminations,
        anchors:[seed.cell],
        complexity:{
          branchCount:2,
          seedIndex:i+1,
          nestingDepth:2,
          workUsed:analysis.workUsed,
          workBudget:options.workBudget==null?6:options.workBudget
        },
        explanationData:{seedCell:seed.cell,seedDigit:seed.digit,result:analysis.status}
      }));
    }
    out.sort(C.compareDeductions);
    return out;
  }

  var api={candidateSeeds:candidateSeeds,findNestedForcingChain:findNestedForcingChain};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanNestedForcingChain=api;
})(typeof globalThis!=='undefined'?globalThis:this);
