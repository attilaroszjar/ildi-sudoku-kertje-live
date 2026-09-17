(function(root){'use strict';
  var C=root.ClassicHumanContracts,S=root.ClassicHumanSolver,W=root.ClassicHumanWings,G=root.ClassicHumanColoring,U=root.ClassicHumanUniqueness,Ch=root.ClassicHumanChains,A=root.ClassicHumanAIC,GA=root.ClassicHumanGroupedAic,AX=root.ClassicHumanAlsXz,AW=root.ClassicHumanAlsXyWing,AC=root.ClassicHumanAlsChain;
  if(typeof require==='function'){
    if(!C)C=require('./contracts.js');if(!S)S=require('./solver.js');if(!W)W=require('./wings.js');if(!G)G=require('./coloring.js');if(!U)U=require('./uniqueness.js');if(!Ch)Ch=require('./chains.js');if(!A)A=require('./aic.js');if(!GA)GA=require('./grouped-aic.js');if(!AX)AX=require('./als-xz.js');if(!AW)AW=require('./als-xy-wing.js');if(!AC)AC=require('./als-chain.js');
  }
  var FINDERS=Object.freeze([
    {id:'full-house',fn:S.findFullHouse},{id:'naked-single',fn:S.findNakedSingle},{id:'hidden-single',fn:S.findHiddenSingle},
    {id:'locked-candidate-pointing',fn:S.findLockedPointing},{id:'locked-candidate-claiming',fn:S.findLockedClaiming},
    {id:'naked-pair',fn:S.findNakedPair},{id:'hidden-pair',fn:S.findHiddenPair},{id:'naked-triple',fn:S.findNakedTriple},{id:'hidden-triple',fn:S.findHiddenTriple},
    {id:'x-wing',fn:S.findXWing},{id:'skyscraper',fn:S.findSkyscraper},{id:'two-string-kite',fn:S.findTwoStringKite},{id:'turbot-fish',fn:S.findTurbotFish},{id:'empty-rectangle',fn:S.findEmptyRectangle},
    {id:'xy-wing',fn:W.findXYWing},{id:'xyz-wing',fn:W.findXYZWing},{id:'w-wing',fn:W.findWWing},{id:'swordfish',fn:S.findSwordfish},
    {id:'simple-coloring',fn:G.findSimpleColoring},{id:'multi-coloring',fn:G.findMultiColoring},
    {id:'unique-rectangle',fn:U.findUniqueRectangle,requiresUniqueness:true},{id:'unique-loop',fn:U.findUniqueLoop,requiresUniqueness:true},{id:'bug-plus-one',fn:U.findBugPlusOne,requiresUniqueness:true},
    {id:'jellyfish',fn:S.findJellyfish},{id:'x-chain',fn:Ch.findXChain},{id:'xy-chain',fn:Ch.findXYChain},{id:'aic',fn:A.findAIC},{id:'grouped-aic',fn:GA.findGroupedAic},
    {id:'als-xz',fn:AX.findAlsXz},{id:'als-xy-wing',fn:AW.findAlsXyWing},{id:'als-chain',fn:AC.findAlsChain}
  ]);
  function eligible(options){options=options||{};var out=[];for(var i=0;i<FINDERS.length;i++){var e=FINDERS[i];if(e.requiresUniqueness&&!options.allowUniqueness)continue;out.push(e);}return out;}
  function numericComplexity(deduction){var out=0,complexity=deduction&&deduction.complexity||{};Object.keys(complexity).forEach(function(key){var value=complexity[key];if(Number.isFinite(value)&&value>0)out+=value;});return out;}
  function brutalLowerBoundTracker(){
    var maxPriority=0,maxBaseRating=0,maxComplexity=0,weightedLogicalWork=0,advancedFamilies={},usesServerPreferred=false,usesServerOnly=false;
    function scoreParts(priority,baseRating,work,familyCount,complexity,serverPreferred,serverOnly){
      return Math.round(priority*0.40)+Math.round(baseRating*4)+Math.round(Math.min(48,Math.sqrt(work)*4))+(priority>=60?8:0)+Math.max(0,familyCount-1)*6+Math.round(Math.min(12,complexity*0.70))+(serverPreferred?12:0)+(serverOnly?24:0);
    }
    function push(step){
      var meta=C.TECHNIQUES[step.techniqueId],actions=(step.placements||[]).length+(step.eliminations||[]).length,complexity=numericComplexity(step);
      weightedLogicalWork+=meta.baseRating*(1+Math.log2(1+actions))+0.05*complexity;
      if(complexity>maxComplexity)maxComplexity=complexity;
      if(meta.priority>maxPriority){maxPriority=meta.priority;maxBaseRating=meta.baseRating;}
      if(meta.priority>=100)advancedFamilies[meta.familyId]=1;
      if(meta.serverPreferred)usesServerPreferred=true;if(meta.serverOnly)usesServerOnly=true;
    }
    function score(){return scoreParts(maxPriority,maxBaseRating,weightedLogicalWork,Object.keys(advancedFamilies).length,maxComplexity,usesServerPreferred,usesServerOnly);}
    function scoreWithMinimalStep(meta){
      var priority=maxPriority,baseRating=maxBaseRating,work=weightedLogicalWork+meta.baseRating*2,families=Object.keys(advancedFamilies).length;
      if(meta.priority>priority){priority=meta.priority;baseRating=meta.baseRating;}
      if(meta.priority>=100&&!advancedFamilies[meta.familyId])families++;
      return scoreParts(priority,baseRating,work,families,maxComplexity,usesServerPreferred||!!meta.serverPreferred,usesServerOnly||!!meta.serverOnly);
    }
    return{push:push,score:score,scoreWithMinimalStep:scoreWithMinimalStep};
  }
  function findNext(state,options,tracker,brutalMin){
    var list=eligible(options),best=null;
    for(var i=0;i<list.length;i++){
      if(tracker&&brutalMin!=null){
        var minFuture=Infinity;
        for(var ri=i;ri<list.length;ri++)minFuture=Math.min(minFuture,tracker.scoreWithMinimalStep(C.TECHNIQUES[list[ri].id]));
        if(minFuture>=brutalMin)return {brutalGuaranteed:true,brutalLowerBound:minFuture};
      }
      var found=list[i].fn(state,options||{});for(var j=0;j<found.length;j++)if(!best||C.compareDeductions(found[j],best)<0)best=found[j];if(best&&best.priority===C.TECHNIQUES[list[i].id].priority)return best;
    }
    return best;
  }
  function solve(source,options){
    options=options||{};var state=source instanceof S.ClassicHumanState?source:new S.ClassicHumanState(source),maxSteps=options.maxSteps||10000,count=0,brutalMin=Number.isFinite(options.brutalLowerBoundMin)?options.brutalLowerBoundMin:null,tracker=brutalMin!=null?brutalLowerBoundTracker():null;
    if(!state.valid)return {status:'INVALID',steps:[],finalState:state.cloneGrid(),guessRequired:false};
    while(!state.isSolved()&&count<maxSteps){
      var d=findNext(state,options,tracker,brutalMin);
      if(d&&d.brutalGuaranteed)return {status:'BRUTAL_LOWER_BOUND',steps:state.steps.slice(),finalState:state.cloneGrid(),guessRequired:false,brutalLowerBound:d.brutalLowerBound,brutalPruneStage:'finder-suffix',usesUniquenessAssumption:state.steps.some(function(step){return !!C.TECHNIQUES[step.techniqueId].requiresUniqueness;})};
      if(!d||!state.apply(d))break;count++;
      if(tracker){tracker.push(d);var lower=tracker.score();if(lower>=brutalMin)return {status:'BRUTAL_LOWER_BOUND',steps:state.steps.slice(),finalState:state.cloneGrid(),guessRequired:false,brutalLowerBound:lower,brutalPruneStage:'post-step',usesUniquenessAssumption:state.steps.some(function(step){return !!C.TECHNIQUES[step.techniqueId].requiresUniqueness;})};}
    }
    return {status:state.valid?(state.isSolved()?'SOLVED_LOGICALLY':'STALLED'):'INVALID',steps:state.steps.slice(),finalState:state.cloneGrid(),guessRequired:false,usesUniquenessAssumption:state.steps.some(function(d){return !!C.TECHNIQUES[d.techniqueId].requiresUniqueness;})};
  }
  var api={FINDERS:FINDERS,findNext:findNext,solve:solve};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ClassicHumanRuntimeSolver=api;
})(typeof globalThis!=='undefined'?globalThis:this);
