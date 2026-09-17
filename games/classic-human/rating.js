(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var T=root.ClassicHumanTraceAnalysis;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!T&&typeof require==='function')T=require('./trace-analysis.js');

  var BANDS=Object.freeze([
    Object.freeze({id:'gentle',min:0,max:69}),
    Object.freeze({id:'focused',min:70,max:129}),
    Object.freeze({id:'expert',min:130,max:239}),
    Object.freeze({id:'brutal',min:240,max:Infinity})
  ]);

  // Score-only ranges remain a compatibility fallback for persisted/legacy ratings.
  // New completed solves use levelForRating(), where technique ceiling is primary.
  var LEVELS=Object.freeze([
    Object.freeze({level:1,min:0,max:54}),
    Object.freeze({level:2,min:55,max:62}),
    Object.freeze({level:3,min:63,max:69}),
    Object.freeze({level:4,min:70,max:89}),
    Object.freeze({level:5,min:90,max:109}),
    Object.freeze({level:6,min:110,max:129}),
    Object.freeze({level:7,min:130,max:174}),
    Object.freeze({level:8,min:175,max:239}),
    Object.freeze({level:9,min:240,max:Infinity})
  ]);

  var LEVEL_POLICY=Object.freeze({
    brutalScoreMin:240,
    easyNakedSingleDependencyMax:6,
    easyNakedSingleScoreMax:59,
    techniquePriorityMax:Object.freeze({
      3:30,4:50,5:90,6:140,7:220,8:Infinity
    })
  });

  function finiteNonNegative(value){return Number.isFinite(value)&&value>=0?value:0;}
  function numericComplexity(deduction){
    var out=0,complexity=deduction&&deduction.complexity||{};
    Object.keys(complexity).sort().forEach(function(key){
      var value=complexity[key];
      if(Number.isFinite(value)&&value>0)out+=value;
    });
    return out;
  }
  function bandForScore(score){
    score=Math.max(0,Math.round(finiteNonNegative(score)));
    for(var i=0;i<BANDS.length;i++)if(score>=BANDS[i].min&&score<=BANDS[i].max)return BANDS[i].id;
    return 'brutal';
  }
  function levelForScore(score){
    score=Math.max(0,Math.round(finiteNonNegative(score)));
    for(var i=0;i<LEVELS.length;i++)if(score>=LEVELS[i].min&&score<=LEVELS[i].max)return LEVELS[i].level;
    return 9;
  }
  function priorityForRating(metrics){
    metrics=metrics||{};
    if(Number.isFinite(metrics.maxTechniquePriority)&&metrics.maxTechniquePriority>=0)return Math.round(metrics.maxTechniquePriority);
    var hardest=metrics.hardestTechnique||null;
    var meta=hardest&&C&&C.TECHNIQUES&&C.TECHNIQUES[hardest];
    return meta&&Number.isFinite(meta.priority)?meta.priority:0;
  }
  function levelForRating(metrics){
    metrics=metrics||{};
    var score=Math.max(0,Math.round(finiteNonNegative(metrics.score)));
    var priority=priorityForRating(metrics);
    var hardest=metrics.hardestTechnique||null;
    var hasDependencyDepth=Number.isFinite(metrics.dependencyDepth)&&metrics.dependencyDepth>=0;
    var dependencyDepth=hasDependencyDepth?Math.round(metrics.dependencyDepth):null;

    if(score>=LEVEL_POLICY.brutalScoreMin)return 9;

    // Levels 1-3 intentionally split the completion family by what the player
    // must notice. For naked-single solves, dependency depth separates a short
    // forced chain from a longer one. Persisted legacy records without depth
    // retain the empirically equivalent score fallback.
    if(priority<=20){
      if(hasDependencyDepth)return dependencyDepth<=LEVEL_POLICY.easyNakedSingleDependencyMax?1:2;
      return score<=LEVEL_POLICY.easyNakedSingleScoreMax?1:2;
    }
    if(priority<=LEVEL_POLICY.techniquePriorityMax[3])return 3;
    if(priority<=LEVEL_POLICY.techniquePriorityMax[4])return 4;
    if(priority<=LEVEL_POLICY.techniquePriorityMax[5])return 5;
    if(priority<=LEVEL_POLICY.techniquePriorityMax[6])return 6;
    if(priority<=LEVEL_POLICY.techniquePriorityMax[7])return 7;
    if(hardest||priority>0)return 8;
    if(hasDependencyDepth)return dependencyDepth<=LEVEL_POLICY.easyNakedSingleDependencyMax?1:2;
    return score<=LEVEL_POLICY.easyNakedSingleScoreMax?1:2;
  }
  function rateSolve(solveResult,options){
    if(!solveResult||!Array.isArray(solveResult.steps))throw new TypeError('solveResult.steps must be an array');
    options=options||{};
    var steps=solveResult.steps;
    var techniqueCounts={},familyCounts={},placements=0,eliminations=0,advancedSteps=0;
    var hardestTechnique=null,maxTechniquePriority=0,maxBaseRating=0,maxComplexity=0;
    var usesUniquenessAssumption=false,usesServerPreferred=false,usesServerOnly=false;
    var weightedLogicalWork=0,distinctAdvancedFamilies={};

    for(var i=0;i<steps.length;i++){
      var step=steps[i];
      if(!step||!C.TECHNIQUES[step.techniqueId])throw new TypeError('unknown technique in solve trace');
      var meta=C.TECHNIQUES[step.techniqueId];
      var stepPlacements=(step.placements||[]).length,stepEliminations=(step.eliminations||[]).length;
      placements+=stepPlacements;eliminations+=stepEliminations;
      techniqueCounts[step.techniqueId]=(techniqueCounts[step.techniqueId]||0)+1;
      familyCounts[meta.familyId]=(familyCounts[meta.familyId]||0)+1;
      var actionCount=stepPlacements+stepEliminations;
      var complexity=numericComplexity(step);
      if(complexity>maxComplexity)maxComplexity=complexity;
      weightedLogicalWork+=meta.baseRating*(1+Math.log2(1+actionCount))+0.05*complexity;
      if(meta.priority>=100){advancedSteps++;distinctAdvancedFamilies[meta.familyId]=1;}
      if(meta.priority>maxTechniquePriority||(meta.priority===maxTechniquePriority&&(!hardestTechnique||step.techniqueId<hardestTechnique))){
        maxTechniquePriority=meta.priority;hardestTechnique=step.techniqueId;maxBaseRating=meta.baseRating;
      }
      if(meta.requiresUniqueness)usesUniquenessAssumption=true;
      if(meta.serverPreferred)usesServerPreferred=true;
      if(meta.serverOnly)usesServerOnly=true;
    }

    var traceAnalysis=T.analyzeTraceDependencies(steps,{bottleneckPriority:options.bottleneckPriority});
    var advancedFamilyCount=Object.keys(distinctAdvancedFamilies).length;
    var workload=Math.round(weightedLogicalWork*100)/100;

    var ceilingComponent=Math.round(maxTechniquePriority*0.40);
    var baseTechniqueComponent=Math.round(maxBaseRating*4);
    var workloadComponent=Math.round(Math.min(48,Math.sqrt(weightedLogicalWork)*4));
    var advancedTechniqueComponent=maxTechniquePriority>=60?8:0;
    var diversityComponent=Math.max(0,advancedFamilyCount-1)*6;
    var complexityComponent=Math.round(Math.min(12,maxComplexity*0.70));
    var dependencyComponent=Math.round(Math.min(12,Math.max(0,traceAnalysis.dependencyDepth-1)*1.5));
    var bottleneckComponent=traceAnalysis.strongestBottleneck?Math.round(Math.min(12,traceAnalysis.strongestBottleneck.unlockSpan*1.5)):0;
    var serverPreferredComponent=usesServerPreferred?12:0;
    var serverOnlyComponent=usesServerOnly?24:0;
    var rawScore=ceilingComponent+baseTechniqueComponent+workloadComponent+advancedTechniqueComponent+diversityComponent+complexityComponent+dependencyComponent+bottleneckComponent+serverPreferredComponent+serverOnlyComponent;
    var solveComplete=solveResult.status==='SOLVED_LOGICALLY';
    var level=solveComplete?levelForRating({score:rawScore,maxTechniquePriority:maxTechniquePriority,hardestTechnique:hardestTechnique,dependencyDepth:traceAnalysis.dependencyDepth}):null;

    return Object.freeze({
      status:solveResult.status||null,
      score:solveComplete?rawScore:null,
      rawScore:rawScore,
      band:solveComplete?bandForScore(rawScore):null,
      level:level,
      scoreStatus:solveComplete?'PROVISIONAL_UNCALIBRATED':'UNRATED_INCOMPLETE',
      hardestTechnique:hardestTechnique,
      maxTechniquePriority:maxTechniquePriority,
      maxBaseRating:maxBaseRating,
      totalSteps:steps.length,
      placements:placements,
      eliminations:eliminations,
      advancedSteps:advancedSteps,
      techniqueCounts:Object.freeze(Object.assign({},techniqueCounts)),
      familyCounts:Object.freeze(Object.assign({},familyCounts)),
      usesUniquenessAssumption:usesUniquenessAssumption,
      usesServerPreferred:usesServerPreferred,
      usesServerOnly:usesServerOnly,
      workload:Object.freeze({weightedLogicalWork:workload,advancedFamilyCount:advancedFamilyCount,maxComplexity:maxComplexity}),
      scoreComponents:Object.freeze({
        ceiling:ceilingComponent,
        baseTechnique:baseTechniqueComponent,
        workload:workloadComponent,
        advancedTechnique:advancedTechniqueComponent,
        diversity:diversityComponent,
        complexity:complexityComponent,
        dependency:dependencyComponent,
        bottleneck:bottleneckComponent,
        serverPreferred:serverPreferredComponent,
        serverOnly:serverOnlyComponent
      }),
      bottleneck:traceAnalysis.strongestBottleneck,
      bottleneckCandidates:traceAnalysis.bottleneckCandidates,
      bottleneckStatus:traceAnalysis.bottleneckStatus,
      dependencyDepth:traceAnalysis.dependencyDepth,
      stepDependencyDepths:traceAnalysis.stepDependencyDepths,
      solveComplete:solveComplete,
      trace:steps.slice()
    });
  }

  var api={BANDS:BANDS,LEVELS:LEVELS,LEVEL_POLICY:LEVEL_POLICY,bandForScore:bandForScore,levelForScore:levelForScore,levelForRating:levelForRating,rateSolve:rateSolve};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanRating=api;
})(typeof globalThis!=='undefined'?globalThis:this);
