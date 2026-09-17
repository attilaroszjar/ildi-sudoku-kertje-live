(function(root){
  'use strict';
  if(!root.SudokuGenerator||!root.KillerGenerator)return;
  var generator=root.SudokuGenerator,killer=root.KillerGenerator,baseMake=generator.make;
  generator.make=function(variant,seed,difficulty){
    if(variant&&variant.id==='killer'){
      var out=killer.makeVariantPilot(generator,variant,seed,difficulty||'focused');
      out.generation.pilot=false;
      out.generation.mode='seeded-variant-essential';
      return out;
    }
    return baseMake.call(this,variant,seed,difficulty);
  };
})(typeof window!=='undefined'?window:globalThis);
