(function(root){
  'use strict';
  if(!root.SudokuGenerator||!root.ExtraHouseGeneratorCore)throw new Error('Diagonal generator requires SudokuGenerator and ExtraHouseGeneratorCore');
  var baseMake=root.SudokuGenerator.make,core=root.ExtraHouseGeneratorCore;
  var diagonalHouses=[
    Array.from({length:9},function(_,i){return [i,i];}),
    Array.from({length:9},function(_,i){return [i,8-i];})
  ];
  function makeDiagonal(variant,seed,difficulty){
    return core.makeVariant(root.SudokuGenerator,variant,seed,difficulty,diagonalHouses,{
      label:'Diagonal',
      seedXor:0xD1460A11,
      carveSeedXor:0x0D1A60A1,
      maxAttempts:1,
      nodeLimit:250000,
      generatorFamily:'diagonal-fresh-fill-mrv'
    });
  }
  root.SudokuGenerator.make=function(variant,seed,difficulty){
    if(variant&&variant.kind==='diagonal')return makeDiagonal(variant,seed,difficulty||'focused');
    return baseMake.call(this,variant,seed,difficulty);
  };
})(globalThis);
