(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var L=root.ClassicHumanLinks;
  var A=root.ClassicHumanALS;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!L&&typeof require==='function')L=require('./links.js');
  if(!A&&typeof require==='function')A=require('./als.js');

  var normalizeDeduction=C.normalizeDeduction;

  function digitCells(state,als,digit){return als.cells.filter(function(cell){return L.hasCandidate(state,cell,digit);});}
  function seesAll(cell,cells){for(var i=0;i<cells.length;i++)if(!L.sees(cell,cells[i]))return false;return true;}
  function blockedCells(a,b){var s=new Set(a.cells);for(var i=0;i<b.cells.length;i++)s.add(b.cells[i]);return s;}

  function dedupe(list){
    var seen={},out=[];
    for(var i=0;i<list.length;i++){
      var d=list[i],key=d.eliminations.map(function(x){return x.cell+':'+x.digit;}).join(',')+'|'+d.explanationData.aKey+'|'+d.explanationData.bKey+'|'+d.explanationData.xDigit+'|'+d.explanationData.zDigit;
      if(seen[key])continue;seen[key]=1;out.push(d);
    }
    return out;
  }

  function findAlsXz(state,options){
    options=options||{};
    var pairs=options.rccPairs||A.enumerateRccPairs(state,options),out=[];
    for(var pi=0;pi<pairs.length;pi++){
      var pair=pairs[pi],a=pair.a,b=pair.b,shared=a.mask&b.mask,blocked=blockedCells(a,b);
      for(var ri=0;ri<pair.rcc.length;ri++){
        var x=pair.rcc[ri].digit;
        for(var z=1;z<=9;z++){
          if(z===x||!(shared&C.bitForDigit(z)))continue;
          var az=digitCells(state,a,z),bz=digitCells(state,b,z);
          if(!az.length||!bz.length)continue;
          var elims=[];
          for(var cell=0;cell<81;cell++){
            if(blocked.has(cell)||!L.hasCandidate(state,cell,z))continue;
            if(seesAll(cell,az)&&seesAll(cell,bz))elims.push({cell:cell,digit:z});
          }
          if(!elims.length)continue;
          out.push(normalizeDeduction({
            techniqueId:'als-xz',
            eliminations:elims,
            anchors:Array.from(blocked).sort(function(x,y){return x-y;}),
            complexity:{alsCount:2,totalCells:a.size+b.size,rccCount:pair.rcc.length},
            explanationData:{aKey:a.key,bKey:b.key,xDigit:x,zDigit:z,aCells:a.cells.slice(),bCells:b.cells.slice()}
          }));
        }
      }
    }
    out=dedupe(out);
    out.sort(C.compareDeductions);
    return out;
  }

  var api={findAlsXz:findAlsXz};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanAlsXz=api;
})(typeof globalThis!=='undefined'?globalThis:this);
