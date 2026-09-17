(function(root){
  'use strict';
  if(!root.SudokuGenerator||!root.ExtraHouseGeneratorCore)return;
  var baseMake=root.SudokuGenerator.make,cache=new Map(),Core=root.ExtraHouseGeneratorCore;
  var houses=[];
  for(var rr=0;rr<3;rr++)for(var cc=0;cc<3;cc++){
    var house=[];
    for(var br=0;br<3;br++)for(var bc=0;bc<3;bc++)house.push([br*3+rr,bc*3+cc]);
    houses.push(house);
  }
  function makeDisjoint(variant,seed,difficulty){
    return Core.makeVariant(root.SudokuGenerator,variant,seed,difficulty,houses,{
      label:'Disjoint Groups',
      generatorFamily:'extra-house-fresh-fill-mrv',
      seedXor:0xD15A01A7,
      carveSeedXor:0xD15C4A7E,
      maxAttempts:4,
      nodeLimit:180000,
      attemptMix:0x9E3779B1,
      targets:{gentle:40,focused:30,expert:27}
    });
  }
  root.SudokuGenerator.make=function(variant,seed,difficulty){
    if(variant&&variant.kind==='disjoint'){
      var key=(seed>>>0)+':'+(difficulty||'focused');
      if(!cache.has(key))cache.set(key,makeDisjoint(variant,seed,difficulty||'focused'));
      return JSON.parse(JSON.stringify(cache.get(key)));
    }
    return baseMake.call(this,variant,seed,difficulty);
  };
})(globalThis);
