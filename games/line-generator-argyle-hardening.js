(function(root){
  'use strict';
  if(!root.SudokuGenerator||!root.LineGeneratorArgyle)return;
  var generator=root.SudokuGenerator,argyle=root.LineGeneratorArgyle,baseMake=generator.make;
  generator.make=function(variant,seed,difficulty){
    if(variant&&variant.id==='argyle'){
      var out=argyle.makeVariantPilot(generator,variant,seed,difficulty||'focused');
      out.generation.pilot=false;
      out.generation.mode='seeded-variant-essential';
      return out;
    }
    return baseMake.call(this,variant,seed,difficulty);
  };
})(typeof window!=='undefined'?window:globalThis);
