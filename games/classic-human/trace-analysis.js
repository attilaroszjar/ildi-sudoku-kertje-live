(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  if(!C&&typeof require==='function')C=require('./contracts.js');

  function candidateNodeCell(node){
    if(Number.isInteger(node))return node>=0&&node<81?node:null;
    if(node&&Number.isInteger(node.cell)&&node.cell>=0&&node.cell<81)return node.cell;
    return null;
  }

  function supportCells(step){
    var seen={},out=[];
    (step.anchors||[]).forEach(function(cell){if(Number.isInteger(cell)&&cell>=0&&cell<81)seen[cell]=1;});
    (step.candidateNodes||[]).forEach(function(node){var cell=candidateNodeCell(node);if(cell!=null)seen[cell]=1;});
    Object.keys(seen).map(Number).sort(function(a,b){return a-b;}).forEach(function(cell){out.push(cell);});
    return out;
  }

  function changedCells(step){
    var seen={},out=[];
    (step.placements||[]).concat(step.eliminations||[]).forEach(function(action){
      if(action&&Number.isInteger(action.cell)&&action.cell>=0&&action.cell<81)seen[action.cell]=1;
    });
    Object.keys(seen).map(Number).sort(function(a,b){return a-b;}).forEach(function(cell){out.push(cell);});
    return out;
  }

  function analyzeTraceDependencies(steps,options){
    if(!Array.isArray(steps))throw new TypeError('steps must be an array');
    options=options||{};
    var bottleneckPriority=Number.isFinite(options.bottleneckPriority)?options.bottleneckPriority:150;
    var lastModifier=new Array(81).fill(-1),depths=[],dependencies=[],maxDepth=0;

    for(var i=0;i<steps.length;i++){
      var step=steps[i];
      if(!step||!C.TECHNIQUES[step.techniqueId])throw new TypeError('unknown technique in solve trace');
      var supports=supportCells(step),parents={},parentList=[];
      supports.forEach(function(cell){var parent=lastModifier[cell];if(parent>=0)parents[parent]=1;});
      Object.keys(parents).map(Number).sort(function(a,b){return a-b;}).forEach(function(parent){parentList.push(parent);});
      var depth=1;
      if(parentList.length)depth=1+parentList.reduce(function(best,parent){return Math.max(best,depths[parent]||1);},0);
      depths.push(depth);dependencies.push(parentList);if(depth>maxDepth)maxDepth=depth;
      changedCells(step).forEach(function(cell){lastModifier[cell]=i;});
    }

    var bottlenecks=[];
    for(var j=0;j<steps.length;j++){
      var meta=C.TECHNIQUES[steps[j].techniqueId];
      if(meta.priority<bottleneckPriority)continue;
      var unlockSpan=0,unlockPlacements=0,unlockEliminations=0;
      for(var k=j+1;k<steps.length;k++){
        var nextMeta=C.TECHNIQUES[steps[k].techniqueId];
        if(nextMeta.priority>=bottleneckPriority)break;
        unlockSpan++;
        unlockPlacements+=(steps[k].placements||[]).length;
        unlockEliminations+=(steps[k].eliminations||[]).length;
      }
      bottlenecks.push(Object.freeze({
        stepIndex:j,
        techniqueId:steps[j].techniqueId,
        priority:meta.priority,
        dependencyDepth:depths[j],
        directDependencies:Object.freeze(dependencies[j].slice()),
        unlockSpan:unlockSpan,
        unlockPlacements:unlockPlacements,
        unlockEliminations:unlockEliminations,
        verificationStatus:'TRACE_CANDIDATE'
      }));
    }

    bottlenecks.sort(function(a,b){
      return b.priority-a.priority||b.dependencyDepth-a.dependencyDepth||b.unlockSpan-a.unlockSpan||a.stepIndex-b.stepIndex;
    });

    return Object.freeze({
      dependencyDepth:maxDepth,
      stepDependencyDepths:Object.freeze(depths.slice()),
      directDependencies:Object.freeze(dependencies.map(function(x){return Object.freeze(x.slice());})),
      bottleneckPriority:bottleneckPriority,
      bottleneckCandidates:Object.freeze(bottlenecks),
      strongestBottleneck:bottlenecks.length?bottlenecks[0]:null,
      bottleneckStatus:bottlenecks.length?'TRACE_CANDIDATES_REQUIRE_AVAILABILITY_AUDIT':'NONE_IN_TRACE'
    });
  }

  var api={supportCells:supportCells,changedCells:changedCells,analyzeTraceDependencies:analyzeTraceDependencies};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanTraceAnalysis=api;
})(typeof globalThis!=='undefined'?globalThis:this);
