(function(root){
  'use strict';
  if(!root.SudokuGenerator||root.SkyscraperParksExpertCarveHardening)return;
  var generator=root.SudokuGenerator;
  var baseMake=generator.make;
  var VERIFICATION='skyscraper-parks-hybrid-exact-v1';
  var POLICY='contract-driven-local-irreducibility';
  var PROOF='monotone-nonuniqueness-from-single-pass';

  function cloneGrid(grid){return grid.map(function(row){return row.slice();});}
  function rng(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(a,random){for(var i=a.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function clueCount(grid){var count=0;for(var r=0;r<grid.length;r++)for(var c=0;c<grid[r].length;c++)if(grid[r][c])count++;return count;}

  function carveExpert(out){
    if(!out||!out.puzzle||!out.generation)throw new Error('Skyscraper Parks expert source missing generation payload');
    if(typeof generator.countParkSolutions!=='function')throw new Error('Skyscraper Parks exact verifier unavailable');
    var grid=cloneGrid(out.puzzle),n=grid.length,order=[];
    var actualSeed=Number.isInteger(out.generation.actualSeed)?out.generation.actualSeed:(out.generation.seed>>>0);
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(grid[r][c])order.push(r*n+c);
    shuffle(order,rng((actualSeed^0x4C4F4341)>>>0));

    var startClues=order.length,accepted=0,rejected=0;
    for(var i=0;i<order.length;i++){
      var idx=order[i],rr=Math.floor(idx/n),cc=idx%n,old=grid[rr][cc];
      if(!old)continue;
      grid[rr][cc]=0;
      if(generator.countParkSolutions(grid,out,2,false)===1){accepted++;}
      else{grid[rr][cc]=old;rejected++;}
    }

    var finalClues=clueCount(grid);
    if(generator.countParkSolutions(grid,out,2,false)!==1)throw new Error('Skyscraper Parks contract carve lost uniqueness');
    if(generator.countParkSolutions(grid,out,2,true)<=1)throw new Error('Skyscraper Parks contract carve lost variant essentiality');

    out.puzzle=grid;
    out.generation=Object.assign({},out.generation,{
      clues:finalClues,
      sourceClues:startClues,
      acceptedRemovals:accepted,
      rejectedRemovals:rejected,
      policy:POLICY,
      verification:VERIFICATION,
      locallyIrreducibleUnderProductionContract:true,
      localIrreducibilityProof:PROOF,
      generatorFamily:'skyscraper-parks-contract-driven-expert-carve',
      difficultyCalibration:Object.assign({},out.generation.difficultyCalibration||{}, {
        sourceClues:startClues,
        targetClues:null,
        stopCondition:'no-remaining-single-clue-removal-preserves-variant-uniqueness',
        clueFloor:false,
        runtimeCutoff:false
      })
    });
    return out;
  }

  generator.make=function(variant,seed,difficulty){
    var out=baseMake.call(generator,variant,seed,difficulty);
    if(variant&&variant.id==='skyscraper-parks'&&difficulty==='expert')return carveExpert(out);
    return out;
  };

  root.SkyscraperParksExpertCarveHardening={verification:VERIFICATION,policy:POLICY,proof:PROOF,clueFloor:false,runtimeCutoff:false};
})(typeof window!=='undefined'?window:globalThis);
