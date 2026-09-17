(function(root){
  'use strict';
  if(!root.LineGeneratorCore||!root.KillerGenerator||root.CombinedKillerGenerator)return;
  var core=root.LineGeneratorCore,EXHAUSTED=core.EXHAUSTED;
  var SUPPORTED={
    'killer-thermo':'thermo','killer-arrow':'arrow','killer-palindrome':'palindrome','killer-zipper':'zipper','killer-entropic':'entropic','killer-modular':'modular','killer-renban':'renban','killer-dutch-whispers':'dutchwhispers','killer-lockout':'lockout'
  };
  var CAGE_PROFILES=[
    {maxSize:9,minCages:9,maxCages:12,maxAttempts:64},
    {maxSize:8,minCages:10,maxCages:14,maxAttempts:56},
    {maxSize:7,minCages:12,maxCages:16,maxAttempts:48}
  ];
  function cp(x){return x===undefined?undefined:JSON.parse(JSON.stringify(x));}
  function pathFp(path,directed){return core.topologyFingerprint([path],{directed:!!directed});}
  function collectPaths(builder,count,seed,directed,wrap){
    var out=[],seen={};
    for(var i=0;i<Math.max(count*5,12)&&out.length<count;i++){
      var built;
      try{built=builder((seed^Math.imul(i+1,0x85EBCA6B))>>>0);}
      catch(error){if(String(error.message||error).indexOf(EXHAUSTED)===0)continue;throw error;}
      var path=built&&built.path;if(!path)continue;
      var fp=pathFp(path,directed);if(seen[fp])continue;seen[fp]=1;out.push(wrap?wrap(path):path.map(function(p){return p.slice();}));
    }
    if(out.length<count)throw new Error(EXHAUSTED+': combined secondary topology');
    return out;
  }
  function buildSecondary(solution,id,seed,options){
    options=options||{};
    if(id==='killer-thermo'){
      var tc=root.LineGeneratorDirected.configFor('thermo');
      var thermos=collectPaths(function(s){return root.LineGeneratorDirected.buildDirectedPath(solution,s,{transition:tc.transition,seedXor:tc.seedXor,minLength:tc.minLength,maxLength:tc.maxLength,maxNodes:options.pathNodeLimit||6000,maxStarts:81});},4,seed,true);
      return{data:{thermos:thermos},fingerprint:core.topologyFingerprint(thermos,{directed:true})};
    }
    if(id==='killer-arrow'){
      var arrows=[],seen={};
      for(var ai=0;ai<18&&arrows.length<3;ai++){
        var built=root.LineGeneratorArrow.buildArrow(solution,(seed^Math.imul(ai+1,0x9E3779B1))>>>0,{maxLength:4,maxNodes:options.pathNodeLimit||12000});
        var afp=built.arrow.circle.join(',')+'>'+built.arrow.path.map(function(p){return p.join(',');}).join(';');if(seen[afp])continue;seen[afp]=1;arrows.push(cp(built.arrow));
      }
      if(arrows.length<3)throw new Error(EXHAUSTED+': combined Arrow topology');
      return{data:{arrows:arrows},fingerprint:root.LineGeneratorArrow.topologyFingerprint(arrows)};
    }
    if(id==='killer-palindrome'){
      var pal=collectPaths(function(s){return root.LineGeneratorProvenSiblings.buildPalindromePath(solution,s,{minLength:3,maxLength:7,maxNodes:8000,maxCenters:81});},4,seed,false);
      return{data:{lines:pal},fingerprint:core.topologyFingerprint(pal,{directed:false})};
    }
    if(id==='killer-zipper'){
      var zip=collectPaths(function(s){return root.LineGeneratorSymmetric.buildZipperPath(solution,s,{minLength:3,maxLength:7,maxNodes:6000,maxCenters:81});},2,seed,false,function(path){return{cells:path.map(function(p){return p.slice();})};});
      var zipPaths=zip.map(function(x){return x.cells;});
      return{data:{lines:zip},fingerprint:core.topologyFingerprint(zipPaths,{directed:false})};
    }
    if(id==='killer-entropic'||id==='killer-modular'){
      var sid=id==='killer-entropic'?'entropic':'modular',sc=root.LineGeneratorSlidingTriple.configFor(sid);
      var sl=collectPaths(function(s){return root.LineGeneratorSlidingTriple.buildSlidingTriplePath(solution,s,{classOf:sc.classOf,seedXor:sc.seedXor,minLength:4,maxLength:7,maxNodes:6000,maxStarts:81});},2,seed,false);
      return{data:{lines:sl},fingerprint:core.topologyFingerprint(sl,{directed:false})};
    }
    if(id==='killer-renban'){
      var ren=collectPaths(function(s){return root.LineGeneratorWholeSet.buildRenbanPath(solution,s,{minLength:4,maxLength:7,maxNodes:8000});},6,seed,false);
      return{data:{lines:ren},fingerprint:core.topologyFingerprint(ren,{directed:false})};
    }
    if(id==='killer-dutch-whispers'){
      var dc=root.LineGeneratorTransition.configFor('dutch-whispers');
      var dutch=collectPaths(function(s){return core.buildTransitionPath(solution,s,{minLength:dc.minLength,maxLength:dc.maxLength,maxNodes:4000,maxStarts:81,seedXor:dc.seedXor,transition:dc.transition});},4,seed,false);
      return{data:{lines:dutch},fingerprint:core.topologyFingerprint(dutch,{directed:false})};
    }
    if(id==='killer-lockout'){
      var lock=collectPaths(function(s){return root.LineGeneratorProvenSiblings.buildLockoutPath(solution,s,{minLength:4,maxLength:7,maxNodes:9000,maxPairs:260,minGap:3});},2,seed,false,function(path){return{cells:path.map(function(p){return p.slice();})};});
      var lockPaths=lock.map(function(x){return x.cells;});
      return{data:{lines:lock},fingerprint:core.topologyFingerprint(lockPaths,{directed:false})};
    }
    throw new Error('Unsupported combined Killer variant: '+id);
  }
  function subsetVariant(candidate,kinds){var v=cp(candidate);v.kind='combined';v.kinds=kinds.slice();delete v._singleKind;return v;}
  function componentCounts(generator,grid,candidate,known){
    var secondary=candidate.kinds[1],counts=known||{};
    return{killer:counts.killer>1?counts.killer:generator.countVariantSolutions(grid,subsetVariant(candidate,['killer']),2),secondary:counts.secondary>1?counts.secondary:generator.countVariantSolutions(grid,subsetVariant(candidate,[secondary]),2)};
  }
  function combinedCageOptions(options,profileIndex){
    var profile=CAGE_PROFILES[profileIndex%CAGE_PROFILES.length],out=cp(profile);options=options||{};Object.keys(options).forEach(function(k){out[k]=options[k];});return out;
  }
  function buildCagesWithFallback(solution,seed,options,attempt){
    for(var offset=0;offset<CAGE_PROFILES.length;offset++){
      var profileIndex=(attempt+offset)%CAGE_PROFILES.length,cageOptions=combinedCageOptions(options,profileIndex);
      try{return{cages:root.KillerGenerator.buildCages(solution,(seed^0x4B494C4C^Math.imul(offset+1,0x85EBCA6B))>>>0,cageOptions),options:cageOptions};}
      catch(error){if(String(error.message||error).indexOf(EXHAUSTED)===0)continue;throw error;}
    }
    throw new Error(EXHAUSTED+': combined Killer cage profiles');
  }
  function carveCombined(generator,candidate,solution,seed,target,maxComponentAttempts){
    var grid=core.cloneGrid(solution),order=Array.from({length:81},function(_,i){return i;}),random=core.rng((seed^0x434F4D42)>>>0),clues=81,oi=0;
    core.shuffle(order,random);
    for(;oi<order.length&&clues>target;oi++){
      var idx=order[oi],r=Math.floor(idx/9),c=idx%9,old=grid[r][c];grid[r][c]=0;
      if(generator.countVariantSolutions(grid,candidate,2)!==1)grid[r][c]=old;else clues--;
    }
    var counts=componentCounts(generator,grid,candidate),componentAttempts=0;
    for(;oi<order.length&&(counts.killer===1||counts.secondary===1)&&componentAttempts<maxComponentAttempts;oi++){
      idx=order[oi];r=Math.floor(idx/9);c=idx%9;old=grid[r][c];if(!old)continue;componentAttempts++;grid[r][c]=0;
      if(generator.countVariantSolutions(grid,candidate,2)!==1){grid[r][c]=old;continue;}
      clues--;counts=componentCounts(generator,grid,candidate,counts);
    }
    if(counts.killer===1||counts.secondary===1)return null;
    if(generator.countSolutions(grid,2)<=1)return null;
    var stats={};if(generator.countVariantSolutions(grid,candidate,2,stats)!==1)return null;
    return{grid:grid,clues:clues,stats:stats,counts:counts,componentAttempts:componentAttempts};
  }
  function makeVariantPilot(generator,variant,seed,difficulty,options){
    options=options||{};
    if(!variant||variant.kind!=='combined'||!SUPPORTED[variant.id])throw new Error('Unsupported combined Killer variant');
    if(!variant.kinds||variant.kinds[0]!=='killer'||variant.kinds.length!==2)throw new Error('Combined Killer kinds required');
    var targets=options.targets||{gentle:40,focused:32,expert:26},target=targets[difficulty]||targets.focused,maxAttempts=options.maxAttempts||16,maxComponentAttempts=options.maxComponentAttempts||12;
    for(var attempt=0;attempt<maxAttempts;attempt++){
      var attemptSeed=((seed>>>0)^0x434F4D42^Math.imul(attempt+1,0x9E3779B1))>>>0;
      try{
        var fresh=core.freshStandardSolution(attemptSeed,options.solutionOptions),solution=fresh.grid;
        var cageBuild=buildCagesWithFallback(solution,attemptSeed,options.cageOptions,attempt),cageOptions=cageBuild.options,cages=cageBuild.cages;
        var secondary=buildSecondary(solution,variant.id,(attemptSeed^0x5345434F)>>>0,options);
        var candidate=cp(variant),data={cages:cp(cages)};Object.keys(secondary.data).forEach(function(k){data[k]=cp(secondary.data[k]);});
        candidate.solution=core.cloneGrid(solution);candidate.data=data;
        var carved=carveCombined(generator,candidate,solution,attemptSeed,target,maxComponentAttempts);if(!carved)continue;
        candidate.puzzle=carved.grid;
        candidate.generation={seed:seed>>>0,clues:carved.clues,unique:true,verification:'solver-verified',generatorFamily:'combined-killer-fresh-fill-mrv-compositor',solutionGenerationNodes:fresh.totalNodes,solutionGenerationAttempts:fresh.attempts,difficultyScore:(carved.stats.nodes||0)+(carved.stats.branches||0)*3+(carved.stats.deadEnds||0)*2,mode:'seeded-component-essential',variantEssential:true,componentEssential:true,killerOnlySolutions:carved.counts.killer,secondaryOnlySolutions:carved.counts.secondary,secondaryKind:variant.kinds[1],componentSearchAttempts:carved.componentAttempts,cageCount:cages.length,cageProfile:{maxSize:cageOptions.maxSize,minCages:cageOptions.minCages,maxCages:cageOptions.maxCages},topologyFingerprint:root.KillerGenerator.topologyFingerprint(cages)+'||'+secondary.fingerprint,pilot:true};
        return candidate;
      }catch(error){if(String(error.message||error).indexOf(EXHAUSTED)===0)continue;throw error;}
    }
    throw new Error(EXHAUSTED+': '+variant.id+' combined Killer pilot');
  }
  root.CombinedKillerGenerator={SUPPORTED:SUPPORTED,CAGE_PROFILES:CAGE_PROFILES,buildSecondary:buildSecondary,componentCounts:componentCounts,makeVariantPilot:makeVariantPilot};
})(globalThis);
