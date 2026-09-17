(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var L=root.ClassicHumanLinks;
  var A=root.ClassicHumanALS;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!L&&typeof require==='function')L=require('./links.js');
  if(!A&&typeof require==='function')A=require('./als.js');

  var normalizeDeduction=C.normalizeDeduction;

  function overlaps(a,b){var s=new Set(a.cells);for(var i=0;i<b.cells.length;i++)if(s.has(b.cells[i]))return true;return false;}
  function digitCells(state,als,digit){return als.cells.filter(function(cell){return L.hasCandidate(state,cell,digit);});}
  function seesAll(cell,cells){for(var i=0;i<cells.length;i++)if(!L.sees(cell,cells[i]))return false;return true;}
  function pairKey(a,b){return a.key<b.key?a.key+'|'+b.key:b.key+'|'+a.key;}

  function findAlsXyWing(state,options){
    options=options||{};
    var pairs=options.rccPairs||A.enumerateRccPairs(state,options),byAls={},out=[];
    for(var i=0;i<pairs.length;i++){
      var p=pairs[i];
      (byAls[p.a.key]||(byAls[p.a.key]=[])).push({other:p.b,rcc:p.rcc,pair:p});
      (byAls[p.b.key]||(byAls[p.b.key]=[])).push({other:p.a,rcc:p.rcc,pair:p});
    }
    var pivots=Object.keys(byAls).sort();
    for(var pi=0;pi<pivots.length;pi++){
      var pivotKey=pivots[pi],links=byAls[pivotKey];
      for(var li=0;li<links.length;li++)for(var lj=li+1;lj<links.length;lj++){
        var left=links[li],right=links[lj],pivot=left.pair.a.key===pivotKey?left.pair.a:left.pair.b;
        var b=left.other,c=right.other;
        if(b.key===c.key||overlaps(pivot,b)||overlaps(pivot,c)||overlaps(b,c))continue;
        for(var xi=0;xi<left.rcc.length;xi++)for(var yi=0;yi<right.rcc.length;yi++){
          var x=left.rcc[xi].digit,y=right.rcc[yi].digit;if(x===y)continue;
          var shared=b.mask&c.mask;
          for(var z=1;z<=9;z++){
            var bit=C.bitForDigit(z);if(!(shared&bit)||z===x||z===y)continue;
            var bz=digitCells(state,b,z),cz=digitCells(state,c,z);if(!bz.length||!cz.length)continue;
            var blocked=new Set(pivot.cells.concat(b.cells,c.cells)),elims=[];
            for(var cell=0;cell<81;cell++){
              if(blocked.has(cell)||!L.hasCandidate(state,cell,z))continue;
              if(seesAll(cell,bz)&&seesAll(cell,cz))elims.push({cell:cell,digit:z});
            }
            if(!elims.length)continue;
            out.push(normalizeDeduction({
              techniqueId:'als-xy-wing',
              eliminations:elims,
              anchors:pivot.cells.concat(b.cells,c.cells),
              complexity:{alsCount:3,totalAlsCells:pivot.size+b.size+c.size,rccCount:2},
              explanationData:{pivotAls:pivot.key,leftAls:b.key,rightAls:c.key,xDigit:x,yDigit:y,zDigit:z,leftPair:pairKey(pivot,b),rightPair:pairKey(pivot,c)}
            }));
          }
        }
      }
    }
    var seen={},ded=[];
    for(i=0;i<out.length;i++){
      var d=out[i],k=d.eliminations.map(function(e){return e.cell+':'+e.digit;}).join(',')+'|'+d.explanationData.pivotAls+'|'+[d.explanationData.leftAls,d.explanationData.rightAls].sort().join('|')+'|'+d.explanationData.xDigit+'|'+d.explanationData.yDigit+'|'+d.explanationData.zDigit;
      if(!seen[k]){seen[k]=1;ded.push(d);}
    }
    ded.sort(C.compareDeductions);return ded;
  }

  var api={findAlsXyWing:findAlsXyWing};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanAlsXyWing=api;
})(typeof globalThis!=='undefined'?globalThis:this);
