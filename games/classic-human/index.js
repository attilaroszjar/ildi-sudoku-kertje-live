(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var S=root.ClassicHumanSolver;
  var F=root.ClassicHumanFish;
  var W=root.ClassicHumanWings;
  var G=root.ClassicHumanColoring;
  var U=root.ClassicHumanUniqueness;
  var Ch=root.ClassicHumanChains;
  var A=root.ClassicHumanAIC;
  var GA=root.ClassicHumanGroupedAic;
  var AX=root.ClassicHumanAlsXz;
  var AW=root.ClassicHumanAlsXyWing;
  var AC=root.ClassicHumanAlsChain;
  var AP=root.ClassicHumanAlignedPairExclusion;
  var SD=root.ClassicHumanSueDeCoq;
  var JE=root.ClassicHumanJuniorExocet;
  var MS=root.ClassicHumanMSLS;
  var Q=root.ClassicHumanSubsetQuads;
  var DB=root.ClassicHumanDeathBlossom;
  var FC=root.ClassicHumanForcingChain;
  var FN=root.ClassicHumanForcingNet;
  var DF=root.ClassicHumanDigitForcing;
  var DFC=root.ClassicHumanDynamicForcingChain;
  var NFC=root.ClassicHumanNestedForcingChain;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!S&&typeof require==='function')S=require('./solver.js');
  if(!F&&typeof require==='function')F=require('./fish.js');
  if(!W&&typeof require==='function')W=require('./wings.js');
  if(!G&&typeof require==='function')G=require('./coloring.js');
  if(!U&&typeof require==='function')U=require('./uniqueness.js');
  if(!Ch&&typeof require==='function')Ch=require('./chains.js');
  if(!A&&typeof require==='function')A=require('./aic.js');
  if(!GA&&typeof require==='function')GA=require('./grouped-aic.js');
  if(!AX&&typeof require==='function')AX=require('./als-xz.js');
  if(!AW&&typeof require==='function')AW=require('./als-xy-wing.js');
  if(!AC&&typeof require==='function')AC=require('./als-chain.js');
  if(!AP&&typeof require==='function')AP=require('./aligned-pair-exclusion.js');
  if(!SD&&typeof require==='function')SD=require('./sue-de-coq.js');
  if(!JE&&typeof require==='function')JE=require('./junior-exocet.js');
  if(!MS&&typeof require==='function')MS=require('./msls.js');
  if(!Q&&typeof require==='function')Q=require('./subset-quads.js');
  if(!DB&&typeof require==='function')DB=require('./death-blossom.js');
  if(!FC&&typeof require==='function')FC=require('./forcing-chain.js');
  if(!FN&&typeof require==='function')FN=require('./forcing-net.js');
  if(!DF&&typeof require==='function')DF=require('./digit-forcing.js');
  if(!DFC&&typeof require==='function')DFC=require('./dynamic-forcing-chain.js');
  if(!NFC&&typeof require==='function')NFC=require('./nested-forcing-chain.js');

  var FINDERS=Object.freeze([
    {id:'full-house',fn:S.findFullHouse},{id:'naked-single',fn:S.findNakedSingle},{id:'hidden-single',fn:S.findHiddenSingle},{id:'locked-candidate-pointing',fn:S.findLockedPointing},{id:'locked-candidate-claiming',fn:S.findLockedClaiming},{id:'naked-pair',fn:S.findNakedPair},{id:'hidden-pair',fn:S.findHiddenPair},{id:'naked-triple',fn:S.findNakedTriple},{id:'hidden-triple',fn:S.findHiddenTriple},{id:'x-wing',fn:S.findXWing},{id:'skyscraper',fn:S.findSkyscraper},{id:'two-string-kite',fn:S.findTwoStringKite},{id:'turbot-fish',fn:S.findTurbotFish},{id:'empty-rectangle',fn:S.findEmptyRectangle},{id:'xy-wing',fn:W.findXYWing},{id:'xyz-wing',fn:W.findXYZWing},{id:'w-wing',fn:W.findWWing},{id:'swordfish',fn:S.findSwordfish},{id:'naked-quad',fn:Q.findNakedQuad},{id:'hidden-quad',fn:Q.findHiddenQuad},{id:'simple-coloring',fn:G.findSimpleColoring},{id:'multi-coloring',fn:G.findMultiColoring},{id:'unique-rectangle',fn:U.findUniqueRectangle,requiresUniqueness:true},{id:'unique-loop',fn:U.findUniqueLoop,requiresUniqueness:true},{id:'bug-plus-one',fn:U.findBugPlusOne,requiresUniqueness:true},{id:'jellyfish',fn:S.findJellyfish},
    {id:'finned-x-wing',fn:F.findFinnedXWing},{id:'sashimi-x-wing',fn:F.findSashimiXWing},{id:'finned-swordfish',fn:F.findFinnedSwordfish},{id:'sashimi-swordfish',fn:F.findSashimiSwordfish},{id:'finned-jellyfish',fn:F.findFinnedJellyfish},{id:'sashimi-jellyfish',fn:F.findSashimiJellyfish},
    {id:'x-chain',fn:Ch.findXChain},{id:'xy-chain',fn:Ch.findXYChain},{id:'aic',fn:A.findAIC},{id:'grouped-aic',fn:GA.findGroupedAic},{id:'sue-de-coq',fn:SD.findSueDeCoq},{id:'als-xz',fn:AX.findAlsXz},{id:'als-xy-wing',fn:AW.findAlsXyWing},{id:'als-chain',fn:AC.findAlsChain},{id:'death-blossom',fn:DB.findDeathBlossom,serverPreferred:true},{id:'junior-exocet',fn:JE.findJuniorExocet,serverPreferred:true},{id:'multi-sector-locked-set',fn:MS.findMultiSectorLockedSet,serverPreferred:true},{id:'forcing-chain',fn:FC.findForcingChain,serverPreferred:true},{id:'forcing-net',fn:FN.findForcingNet,serverPreferred:true},{id:'digit-forcing-chain',fn:DF.findDigitForcingChain,serverPreferred:true},{id:'digit-forcing-net',fn:DF.findDigitForcingNet,serverPreferred:true},{id:'dynamic-forcing-chain',fn:DFC.findDynamicForcingChain,serverOnly:true},{id:'nested-forcing-chain',fn:NFC.findNestedForcingChain,serverOnly:true}
  ]);

  function effectiveTechniquePriority(techniqueId,overrides){var base=C.TECHNIQUES[techniqueId].priority;if(!overrides||!Object.prototype.hasOwnProperty.call(overrides,techniqueId))return base;var value=overrides[techniqueId];if(!Number.isFinite(value))throw new TypeError('priority override must be finite');return value;}
  function effectivePriority(deduction,overrides){return effectiveTechniquePriority(deduction.techniqueId,overrides);}
  function compareWithOverrides(a,b,overrides){var pa=effectivePriority(a,overrides),pb=effectivePriority(b,overrides);return pa-pb||C.deductionStateKey(a).localeCompare(C.deductionStateKey(b))||a.techniqueId.localeCompare(b.techniqueId);}
  function eligibleFinders(options){options=options||{};var enabled=options.techniques?new Set(options.techniques):null,overrides=options.priorityOverrides||null,out=[];for(var i=0;i<FINDERS.length;i++){var entry=FINDERS[i];if(enabled&&!enabled.has(entry.id))continue;if(entry.requiresUniqueness&&!options.allowUniqueness)continue;if(entry.serverPreferred&&!options.allowServerPreferred)continue;if(entry.serverOnly&&!options.allowServerOnly)continue;out.push({entry:entry,priority:effectiveTechniquePriority(entry.id,overrides)});}out.sort(function(a,b){return a.priority-b.priority||a.entry.id.localeCompare(b.entry.id);});return out;}
  function optionsForFinder(options,techniqueId){options=options||{};var per=options.finderOptions&&options.finderOptions[techniqueId];if(per==null)return options;if(typeof per!=='object'||Array.isArray(per))throw new TypeError('finderOptions.'+techniqueId+' must be an object');var merged=Object.assign({},options,per);delete merged.finderOptions;return merged;}
  function findNext(state,options){if(!state.valid)return null;options=options||{};var overrides=options.priorityOverrides||null,eligible=eligibleFinders(options),i=0;while(i<eligible.length){var priority=eligible[i].priority,all=[];while(i<eligible.length&&eligible[i].priority===priority){var entry=eligible[i].entry,found=entry.fn(state,optionsForFinder(options,entry.id));for(var j=0;j<found.length;j++)all.push(found[j]);i++;}if(all.length){all.sort(function(a,b){return overrides?compareWithOverrides(a,b,overrides):C.compareDeductions(a,b);});return all[0];}}return null;}
  function solve(source,options){var state=source instanceof S.ClassicHumanState?source:new S.ClassicHumanState(source);var maxSteps=(options&&options.maxSteps)||10000,count=0;if(!state.valid)return {status:'INVALID',steps:[],finalState:state.cloneGrid(),guessRequired:false};while(!state.isSolved()&&count<maxSteps){var deduction=findNext(state,options);if(!deduction)break;if(!state.apply(deduction))break;count++;}return {status:state.valid?(state.isSolved()?'SOLVED_LOGICALLY':'STALLED'):'INVALID',steps:state.steps.slice(),finalState:state.cloneGrid(),guessRequired:false,usesUniquenessAssumption:state.steps.some(function(d){return !!C.TECHNIQUES[d.techniqueId].requiresUniqueness;})};}

  var api=Object.assign({},S,{FINDERS:FINDERS,findXYWing:W.findXYWing,findXYZWing:W.findXYZWing,findWWing:W.findWWing,findNakedQuad:Q.findNakedQuad,findHiddenQuad:Q.findHiddenQuad,findSimpleColoring:G.findSimpleColoring,findMultiColoring:G.findMultiColoring,findUniqueRectangle:U.findUniqueRectangle,findUniqueLoop:U.findUniqueLoop,findBugPlusOne:U.findBugPlusOne,findFinnedXWing:F.findFinnedXWing,findSashimiXWing:F.findSashimiXWing,findFinnedSwordfish:F.findFinnedSwordfish,findSashimiSwordfish:F.findSashimiSwordfish,findFinnedJellyfish:F.findFinnedJellyfish,findSashimiJellyfish:F.findSashimiJellyfish,findXChain:Ch.findXChain,findXYChain:Ch.findXYChain,findAIC:A.findAIC,findGroupedAic:GA.findGroupedAic,findSueDeCoq:SD.findSueDeCoq,findAlsXz:AX.findAlsXz,findAlsXyWing:AW.findAlsXyWing,findAlsChain:AC.findAlsChain,findAlignedPairExclusion:AP.findAlignedPairExclusion,findDeathBlossom:DB.findDeathBlossom,findJuniorExocet:JE.findJuniorExocet,findMultiSectorLockedSet:MS.findMultiSectorLockedSet,findForcingChain:FC.findForcingChain,findForcingNet:FN.findForcingNet,findDigitForcingChain:DF.findDigitForcingChain,findDigitForcingNet:DF.findDigitForcingNet,findDynamicForcingChain:DFC.findDynamicForcingChain,findNestedForcingChain:NFC.findNestedForcingChain,effectiveTechniquePriority:effectiveTechniquePriority,effectivePriority:effectivePriority,compareWithOverrides:compareWithOverrides,eligibleFinders:eligibleFinders,optionsForFinder:optionsForFinder,findNext:findNext,solve:solve});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ClassicHuman=api;
})(typeof globalThis!=='undefined'?globalThis:this);
