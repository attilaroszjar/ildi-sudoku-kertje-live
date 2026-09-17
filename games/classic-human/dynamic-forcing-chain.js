(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var D=root.ClassicHumanDynamicForcing;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!D&&typeof require==='function')D=require('./dynamic-forcing.js');

  function intOption(value,fallback,min,max,name){
    var n=value==null?fallback:value;
    if(!Number.isInteger(n)||n<min||n>max)throw new RangeError(name+' must be '+min+'..'+max);
    return n;
  }

  function candidateSeeds(state,options){
    options=options||{};
    var budget=intOption(options.candidateBudget,8,1,16,'dynamic candidateBudget'),out=[];
    for(var cell=0;cell<81&&out.length<budget;cell++){
      var mask=state.masks[cell];
      if(C.bitCount(mask)!==2)continue;
      var digits=C.digitsFromMask(mask);
      for(var i=0;i<digits.length&&out.length<budget;i++)out.push({cell:cell,digit:digits[i]});
    }
    return out;
  }

  function findDynamicForcingChain(state,options){
    options=options||{};
    var seeds=options.seeds||candidateSeeds(state,options),out=[];
    for(var i=0;i<seeds.length;i++){
      var seed=seeds[i];
      var analysis=D.analyzeDynamicBinary(state,seed.cell,seed.digit,{
        directSteps:options.directSteps,
        nestedSteps:options.nestedSteps,
        candidateBudget:options.innerCandidateBudget,
        seedBudget:options.innerSeedBudget,
        innerSteps:options.innerSteps
      });
      if(analysis.status==='NONE'||analysis.status==='INCONSISTENT')continue;
      var placements=analysis.placements.slice(),eliminations=analysis.eliminations.slice();
      if(!placements.length&&!eliminations.length)continue;
      out.push(C.normalizeDeduction({
        techniqueId:'dynamic-forcing-chain',
        placements:placements,
        eliminations:eliminations,
        anchors:[seed.cell],
        complexity:{
          branchCount:2,
          seedIndex:i+1,
          directSteps:options.directSteps==null?24:options.directSteps,
          nestedSteps:options.nestedSteps==null?3:options.nestedSteps,
          innerSteps:options.innerSteps==null?12:options.innerSteps
        },
        explanationData:{seedCell:seed.cell,seedDigit:seed.digit,result:analysis.status}
      }));
    }
    out.sort(C.compareDeductions);
    return out;
  }

  var api={candidateSeeds:candidateSeeds,findDynamicForcingChain:findDynamicForcingChain};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanDynamicForcingChain=api;
})(typeof globalThis!=='undefined'?globalThis:this);
