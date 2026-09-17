(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var S=root.ClassicHumanSolver;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!S&&typeof require==='function')S=require('./solver.js');

  var bitForDigit=C.bitForDigit,bitCount=C.bitCount,digitsFromMask=C.digitsFromMask,rowCol=C.rowCol,normalizeDeduction=C.normalizeDeduction;

  function combinations(items,size,start,pick,out){
    if(pick.length===size){out.push(pick.slice());return;}
    for(var i=start;i<=items.length-(size-pick.length);i++){
      pick.push(items[i]);combinations(items,size,i+1,pick,out);pick.pop();
    }
  }
  function unsolved(state,house){
    var out=[];
    for(var i=0;i<house.cells.length;i++){
      var cell=house.cells[i],rc=rowCol(cell);
      if(!state.grid[rc[0]][rc[1]])out.push(cell);
    }
    return out;
  }
  function findNakedQuad(state){
    var out=[];
    for(var h=0;h<S.HOUSES.length;h++){
      var house=S.HOUSES[h],cells=unsolved(state,house).filter(function(cell){var n=bitCount(state.masks[cell]);return n>=2&&n<=4;});
      if(cells.length<4)continue;
      var combos=[];combinations(cells,4,0,[],combos);
      for(var ci=0;ci<combos.length;ci++){
        var selected=combos[ci],union=0,chosen={},i;
        for(i=0;i<selected.length;i++){union|=state.masks[selected[i]];chosen[selected[i]]=1;}
        if(bitCount(union)!==4)continue;
        var elims=[],invalid=false;
        for(i=0;i<house.cells.length;i++){
          var target=house.cells[i],rc=rowCol(target);if(chosen[target]||state.grid[rc[0]][rc[1]])continue;
          var remove=state.masks[target]&union;
          if(remove&&remove===state.masks[target]){invalid=true;break;}
          for(var bits=remove;bits;bits&=bits-1){var one=bits&-bits;elims.push({cell:target,digit:digitsFromMask(one)[0]});}
        }
        if(invalid||!elims.length)continue;
        out.push(normalizeDeduction({techniqueId:'naked-quad',eliminations:elims,houses:[house.id],anchors:selected,explanationData:{house:house.id,cells:selected.slice(),digits:digitsFromMask(union)}}));
      }
    }
    return out;
  }
  function findHiddenQuad(state){
    var out=[];
    for(var h=0;h<S.HOUSES.length;h++){
      var house=S.HOUSES[h],digitPlaces=Array.from({length:10},function(){return [];});
      for(var i=0;i<house.cells.length;i++){
        var cell=house.cells[i],rc=rowCol(cell);if(state.grid[rc[0]][rc[1]])continue;
        for(var bits=state.masks[cell];bits;bits&=bits-1){var one=bits&-bits,d=digitsFromMask(one)[0];digitPlaces[d].push(cell);}
      }
      var digits=[];
      for(var d=1;d<=9;d++)if(digitPlaces[d].length>0&&digitPlaces[d].length<=4)digits.push(d);
      if(digits.length<4)continue;
      var combos=[];combinations(digits,4,0,[],combos);
      for(var ci=0;ci<combos.length;ci++){
        var selectedDigits=combos[ci],cellSet={},di;
        for(di=0;di<selectedDigits.length;di++)digitPlaces[selectedDigits[di]].forEach(function(cell){cellSet[cell]=1;});
        var selectedCells=Object.keys(cellSet).map(Number).sort(function(a,b){return a-b;});
        if(selectedCells.length!==4)continue;
        var keep=0;for(di=0;di<selectedDigits.length;di++)keep|=bitForDigit(selectedDigits[di]);
        var elims=[];
        for(var si=0;si<selectedCells.length;si++){
          var target=selectedCells[si],remove=state.masks[target]&~keep;
          for(var rem=remove;rem;rem&=rem-1){var one=rem&-rem;elims.push({cell:target,digit:digitsFromMask(one)[0]});}
        }
        if(!elims.length)continue;
        out.push(normalizeDeduction({techniqueId:'hidden-quad',eliminations:elims,houses:[house.id],anchors:selectedCells,explanationData:{house:house.id,cells:selectedCells.slice(),digits:selectedDigits.slice()}}));
      }
    }
    return out;
  }

  var api={findNakedQuad:findNakedQuad,findHiddenQuad:findHiddenQuad};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanSubsetQuads=api;
})(typeof globalThis!=='undefined'?globalThis:this);
