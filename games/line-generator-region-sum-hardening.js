(function(root){
  'use strict';
  if(!root.SudokuGenerator||!root.LineGeneratorRegionSum)return;
  var generator=root.SudokuGenerator,regionSum=root.LineGeneratorRegionSum,baseMake=generator.make;
  generator.make=function(variant,seed,difficulty){
    if(variant&&variant.id==='region-sum'){
      var out=regionSum.makeVariantPilot(generator,variant,seed,difficulty||'focused');
      out.generation.pilot=false;
      out.generation.mode='seeded-variant-essential';
      return out;
    }
    return baseMake.call(this,variant,seed,difficulty);
  };
})(typeof window!=='undefined'?window:globalThis);
