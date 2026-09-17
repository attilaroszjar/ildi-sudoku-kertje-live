(function(root){
  'use strict';
  if(!root.SudokuGenerator||!root.LineGeneratorDirected)return;
  var generator=root.SudokuGenerator,directed=root.LineGeneratorDirected,baseMake=generator.make;
  generator.make=function(variant,seed,difficulty){
    if(variant&&(variant.id==='thermo'||variant.id==='slow-thermo')){
      var out=directed.makeVariantPilot(generator,variant,seed,difficulty||'focused');
      out.generation.pilot=false;
      out.generation.mode='seeded-variant-essential';
      return out;
    }
    return baseMake.call(this,variant,seed,difficulty);
  };
})(typeof window!=='undefined'?window:globalThis);
