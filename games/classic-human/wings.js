(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var L=root.ClassicHumanLinks;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!L&&typeof require==='function')L=require('./links.js');

  var bitCount=C.bitCount,digitsFromMask=C.digitsFromMask,bitForDigit=C.bitForDigit;
  var normalizeDeduction=C.normalizeDeduction;

  function candidateCellsByCount(state,count){
    var out=[];
    for(var cell=0;cell<81;cell++){
      var rc=C.rowCol(cell);if(state.grid[rc[0]][rc[1]])continue;
      if(bitCount(state.masks[cell])===count)out.push(cell);
    }
    return out;
  }
  function bivalueCells(state){return candidateCellsByCount(state,2);}
  function trivalueCells(state){return candidateCellsByCount(state,3);}
  function maskDigits(state,cell){return digitsFromMask(state.masks[cell]);}
  function hasDigit(state,cell,digit){return !!(state.masks[cell]&bitForDigit(digit));}
  function commonPeersWithDigit(state,cells,digit,exclude){
    var blocked=new Set(exclude||[]),out=[];
    for(var cell=0;cell<81;cell++){
      if(blocked.has(cell)||!hasDigit(state,cell,digit))continue;
      var rc=C.rowCol(cell);if(state.grid[rc[0]][rc[1]])continue;
      if(cells.every(function(x){return L.sees(cell,x);} ))out.push(cell);
    }
    return out;
  }
  function uniqueKey(d){
    return d.techniqueId+'|'+d.anchors.join(',')+'|'+d.eliminations.map(function(x){return x.cell+':'+x.digit;}).join(',');
  }
  function dedupe(list){
    var seen={},out=[];
    for(var i=0;i<list.length;i++){var key=uniqueKey(list[i]);if(seen[key])continue;seen[key]=1;out.push(list[i]);}
    return out;
  }
  function sortedPair(a,b){return a<b?[a,b]:[b,a];}

  function findXYWing(state){
    var out=[],bi=bivalueCells(state);
    for(var pi=0;pi<bi.length;pi++){
      var pivot=bi[pi],pd=maskDigits(state,pivot),x=pd[0],y=pd[1];
      for(var ai=0;ai<bi.length;ai++){
        var a=bi[ai];if(a===pivot||!L.sees(pivot,a))continue;
        var ad=maskDigits(state,a),sharedA=ad.filter(function(d){return d===x||d===y;});
        if(sharedA.length!==1)continue;
        var wingA=sharedA[0],z=ad[0]===wingA?ad[1]:ad[0];
        if(z===x||z===y)continue;
        var wingB=wingA===x?y:x;
        for(var bj=ai+1;bj<bi.length;bj++){
          var b=bi[bj];if(b===pivot||!L.sees(pivot,b))continue;
          var bd=maskDigits(state,b);
          if(!bd.includes(wingB)||!bd.includes(z)||bd.length!==2)continue;
          var elims=commonPeersWithDigit(state,[a,b],z,[pivot,a,b]).map(function(cell){return {cell:cell,digit:z};});
          if(!elims.length)continue;
          out.push(normalizeDeduction({techniqueId:'xy-wing',eliminations:elims,anchors:[pivot,a,b],candidateNodes:[pivot,a,b],proofEdges:[{type:'bivalue',cell:pivot},{type:'bivalue',cell:a},{type:'bivalue',cell:b}],complexity:{wingCells:3},explanationData:{pivot:pivot,pincers:sortedPair(a,b),pivotDigits:pd.slice(),z:z}}));
        }
      }
    }
    return dedupe(out);
  }

  function findXYZWing(state){
    var out=[],tri=trivalueCells(state),bi=bivalueCells(state);
    for(var pi=0;pi<tri.length;pi++){
      var pivot=tri[pi],pd=maskDigits(state,pivot);
      for(var ai=0;ai<bi.length;ai++){
        var a=bi[ai];if(!L.sees(pivot,a))continue;
        var ad=maskDigits(state,a);if(ad.some(function(d){return !pd.includes(d);} ))continue;
        for(var bj=ai+1;bj<bi.length;bj++){
          var b=bi[bj];if(!L.sees(pivot,b))continue;
          var bd=maskDigits(state,b);if(bd.some(function(d){return !pd.includes(d);} ))continue;
          var common=ad.filter(function(d){return bd.includes(d);});if(common.length!==1)continue;
          var z=common[0],union=new Set(ad.concat(bd));if(union.size!==3)continue;
          var elims=commonPeersWithDigit(state,[pivot,a,b],z,[pivot,a,b]).map(function(cell){return {cell:cell,digit:z};});
          if(!elims.length)continue;
          out.push(normalizeDeduction({techniqueId:'xyz-wing',eliminations:elims,anchors:[pivot,a,b],candidateNodes:[pivot,a,b],proofEdges:[{type:'trivalue',cell:pivot},{type:'bivalue',cell:a},{type:'bivalue',cell:b}],complexity:{wingCells:3},explanationData:{pivot:pivot,pincers:sortedPair(a,b),pivotDigits:pd.slice(),z:z}}));
        }
      }
    }
    return dedupe(out);
  }

  function findWWing(state){
    var out=[],bi=bivalueCells(state),linksByDigit={};
    for(var i=0;i<bi.length;i++)for(var j=i+1;j<bi.length;j++){
      var a=bi[i],b=bi[j];if(L.sees(a,b))continue;
      var ad=maskDigits(state,a),bd=maskDigits(state,b);if(ad[0]!==bd[0]||ad[1]!==bd[1])continue;
      for(var k=0;k<2;k++){
        var strongDigit=ad[k],elimDigit=ad[1-k];
        if(!linksByDigit[strongDigit])linksByDigit[strongDigit]=L.conjugateLinks(state,strongDigit,['row','column','box']);
        var links=linksByDigit[strongDigit];
        for(var li=0;li<links.length;li++){
          var link=links[li],direct=L.sees(a,link.a)&&L.sees(b,link.b),cross=L.sees(a,link.b)&&L.sees(b,link.a);
          if(!direct&&!cross)continue;
          var e1=direct?link.a:link.b,e2=direct?link.b:link.a;
          if(e1===a||e1===b||e2===a||e2===b)continue;
          var elims=commonPeersWithDigit(state,[a,b],elimDigit,[a,b,e1,e2]).map(function(cell){return {cell:cell,digit:elimDigit};});
          if(!elims.length)continue;
          out.push(normalizeDeduction({techniqueId:'w-wing',eliminations:elims,anchors:[a,b,e1,e2],houses:[link.houseId],candidateNodes:[a,b,e1,e2],proofEdges:[{type:'bivalue',cell:a},{type:'strong',a:e1,b:e2,digit:strongDigit},{type:'bivalue',cell:b}],complexity:{linkCount:3},explanationData:{wings:sortedPair(a,b),strongDigit:strongDigit,eliminationDigit:elimDigit,strongLink:[e1,e2],strongHouse:link.houseId}}));
        }
      }
    }
    return dedupe(out);
  }

  var api={bivalueCells:bivalueCells,trivalueCells:trivalueCells,findXYWing:findXYWing,findXYZWing:findXYZWing,findWWing:findWWing};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanWings=api;
})(typeof globalThis!=='undefined'?globalThis:this);
