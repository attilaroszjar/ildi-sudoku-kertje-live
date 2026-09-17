(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var F=root.ClassicHumanForcing;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!F&&typeof require==='function')F=require('./forcing.js');

  function validateCandidateBudget(value){
    var max=value==null?12:value;
    if(!Number.isInteger(max)||max<1||max>24)throw new RangeError('forcing candidateBudget must be 1..24');
    return max;
  }

  function candidateSeeds(state,options){
    options=options||{};
    var budget=validateCandidateBudget(options.candidateBudget),out=[];
    for(var cell=0;cell<81&&out.length<budget;cell++){
      var mask=state.masks[cell];
      if(C.bitCount(mask)!==2)continue;
      var digits=C.digitsFromMask(mask);
      for(var i=0;i<digits.length&&out.length<budget;i++)out.push({cell:cell,digit:digits[i]});
    }
    return out;
  }

  function findForcingChain(state,options){
    options=options||{};
    var seeds=options.seeds||candidateSeeds(state,options),out=[];
    for(var i=0;i<seeds.length;i++){
      var seed=seeds[i],analysis=F.analyzeBinaryAssumption(state,seed.cell,seed.digit,{maxSteps:options.maxSteps});
      if(analysis.status==='NONE'||analysis.status==='INCONSISTENT')continue;
      var placements=analysis.placements.slice(),eliminations=analysis.eliminations.slice();
      if(!placements.length&&!eliminations.length)continue;
      out.push(C.normalizeDeduction({
        techniqueId:'forcing-chain',
        placements:placements,
        eliminations:eliminations,
        anchors:[seed.cell],
        complexity:{branchCount:2,maxPropagationSteps:options.maxSteps==null?24:options.maxSteps,seedIndex:i+1},
        explanationData:{seedCell:seed.cell,seedDigit:seed.digit,result:analysis.status}
      }));
    }
    out.sort(C.compareDeductions);
    return out;
  }

  var api={candidateSeeds:candidateSeeds,findForcingChain:findForcingChain};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanForcingChain=api;
})(typeof globalThis!=='undefined'?globalThis:this);
