(function(root){
  'use strict';
  if(!root.SudokuGenerator||!root.LineGeneratorArrow)return;
  var generator=root.SudokuGenerator,arrow=root.LineGeneratorArrow,baseMake=generator.make;
  generator.make=function(variant,seed,difficulty){
    if(variant&&variant.id==='arrow'){
      var out=arrow.makeVariantPilot(generator,variant,seed,difficulty||'focused');
      out.generation.pilot=false;
      out.generation.mode='seeded-variant-essential';
      return out;
    }
    return baseMake.call(this,variant,seed,difficulty);
  };
})(typeof window!=='undefined'?window:globalThis);
