(function(root){
  'use strict';
  if(!root.SudokuGenerator||!root.LineGeneratorSlidingTriple)return;
  var generator=root.SudokuGenerator,sliding=root.LineGeneratorSlidingTriple,baseMake=generator.make;
  generator.make=function(variant,seed,difficulty){
    if(variant&&(variant.id==='entropic'||variant.id==='modular')){
      var out=sliding.makeVariantPilot(generator,variant,seed,difficulty||'focused');
      out.generation.pilot=false;
      out.generation.mode='seeded-variant-essential';
      return out;
    }
    return baseMake.call(this,variant,seed,difficulty);
  };
})(typeof window!=='undefined'?window:globalThis);
