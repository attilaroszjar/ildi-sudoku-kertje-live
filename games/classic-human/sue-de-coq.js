(function(root){'use strict';
  var C=root.ClassicHumanContracts;if(!C&&typeof require==='function')C=require('./contracts.js');
  var bitCount=C.bitCount,digitsFromMask=C.digitsFromMask,cellIndex=C.cellIndex,rowCol=C.rowCol,boxIndex=C.boxIndex,normalizeDeduction=C.normalizeDeduction;

  function unsolved(state,cell){var rc=rowCol(cell);return !state.grid[rc[0]][rc[1]];}
  function unionMask(state,cells){var m=0;for(var i=0;i<cells.length;i++)m|=state.masks[cells[i]];return m;}
  function combinations(items,size,visit){var chosen=[];function rec(start){if(chosen.length===size){visit(chosen.slice());return;}for(var i=start;i<=items.length-(size-chosen.length);i++){chosen.push(items[i]);rec(i+1);chosen.pop();}}rec(0);}
  function rowCells(r){var out=[];for(var c=0;c<9;c++)out.push(cellIndex(r,c));return out;}
  function colCells(c){var out=[];for(var r=0;r<9;r++)out.push(cellIndex(r,c));return out;}
  function boxCells(b){var out=[],br=Math.floor(b/3)*3,bc=(b%3)*3;for(var r=br;r<br+3;r++)for(var c=bc;c<bc+3;c++)out.push(cellIndex(r,c));return out;}
  function diff(a,blocked){var out=[];for(var i=0;i<a.length;i++)if(!blocked.has(a[i]))out.push(a[i]);return out;}
  function eliminationList(state,pool,blocked,mask){var out=[];for(var i=0;i<pool.length;i++){var cell=pool[i];if(blocked.has(cell)||!unsolved(state,cell))continue;var rem=state.masks[cell]&mask;for(var bits=rem;bits;bits&=bits-1){var one=bits&-bits;out.push({cell:cell,digit:digitsFromMask(one)[0]});}}return out;}
  function dedupe(list){var seen={},out=[];for(var i=0;i<list.length;i++){var d=list[i],k=C.deductionStateKey(d)+'|'+d.explanationData.lineHouse+'|'+d.explanationData.boxHouse+'|'+d.explanationData.intersectionCells.join('.')+'|'+d.explanationData.lineCells.join('.')+'|'+d.explanationData.boxCells.join('.');if(seen[k])continue;seen[k]=1;out.push(d);}out.sort(C.compareDeductions);return out;}

  function visitOrientation(state,orientation,lineIndex,boxIndexValue,options,out){
    var line=orientation==='row'?rowCells(lineIndex):colCells(lineIndex),box=boxCells(boxIndexValue),boxSet=new Set(box),lineSet=new Set(line);
    var intersection=line.filter(function(cell){return boxSet.has(cell)&&unsolved(state,cell)&&bitCount(state.masks[cell])>=2;});
    if(intersection.length<2)return;
    var linePool=line.filter(function(cell){return !boxSet.has(cell)&&unsolved(state,cell)&&bitCount(state.masks[cell])>=2;});
    var boxPool=box.filter(function(cell){return !lineSet.has(cell)&&unsolved(state,cell)&&bitCount(state.masks[cell])>=2;});
    var maxIntersection=options.maxIntersectionCells==null?3:options.maxIntersectionCells,maxComponent=options.maxComponentCells==null?3:options.maxComponentCells;
    for(var is=2;is<=Math.min(maxIntersection,intersection.length);is++)combinations(intersection,is,function(iCells){
      var iMask=unionMask(state,iCells);if(bitCount(iMask)!==iCells.length+2)return;
      for(var ls=1;ls<=Math.min(maxComponent,linePool.length,is-1);ls++){
        var bs=is-ls;if(bs<1||bs>maxComponent||bs>boxPool.length)continue;
        combinations(linePool,ls,function(lCells){
          var lMask=unionMask(state,lCells);if(bitCount(lMask)!==lCells.length+1||(lMask&~iMask))return;
          combinations(boxPool,bs,function(bCells){
            var bMask=unionMask(state,bCells);if(bitCount(bMask)!==bCells.length+1||(bMask&~iMask))return;
            if(lMask&bMask)return;if((lMask|bMask)!==iMask)return;
            var blocked=new Set(iCells.concat(lCells,bCells)),lineElims=eliminationList(state,line,blocked,lMask),boxElims=eliminationList(state,box,blocked,bMask),elims=lineElims.concat(boxElims);
            if(!elims.length)return;
            var lineHouse=(orientation==='row'?'r':'c')+(lineIndex+1),boxHouse='b'+(boxIndexValue+1);
            out.push(normalizeDeduction({techniqueId:'sue-de-coq',eliminations:elims,anchors:Array.from(blocked),houses:[lineHouse,boxHouse],complexity:{intersectionCells:iCells.length,lineCells:lCells.length,boxCells:bCells.length,totalCells:iCells.length+lCells.length+bCells.length},explanationData:{orientation:orientation,lineHouse:lineHouse,boxHouse:boxHouse,intersectionCells:iCells.slice().sort(function(a,b){return a-b;}),lineCells:lCells.slice().sort(function(a,b){return a-b;}),boxCells:bCells.slice().sort(function(a,b){return a-b;}),intersectionDigits:digitsFromMask(iMask),lineDigits:digitsFromMask(lMask),boxDigits:digitsFromMask(bMask)}}));
          });
        });
      }
    });
  }

  function findSueDeCoq(state,options){
    options=options||{};var maxIntersection=options.maxIntersectionCells==null?3:options.maxIntersectionCells,maxComponent=options.maxComponentCells==null?3:options.maxComponentCells;
    if(!Number.isInteger(maxIntersection)||maxIntersection<2||maxIntersection>3)throw new RangeError('Sue de Coq maxIntersectionCells must be 2..3');
    if(!Number.isInteger(maxComponent)||maxComponent<1||maxComponent>3)throw new RangeError('Sue de Coq maxComponentCells must be 1..3');
    var out=[];
    for(var r=0;r<9;r++)for(var bc=0;bc<3;bc++)visitOrientation(state,'row',r,Math.floor(r/3)*3+bc,options,out);
    for(var c=0;c<9;c++)for(var br=0;br<3;br++)visitOrientation(state,'column',c,br*3+Math.floor(c/3),options,out);
    return dedupe(out);
  }

  var api={findSueDeCoq:findSueDeCoq};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ClassicHumanSueDeCoq=api;
})(typeof globalThis!=='undefined'?globalThis:this);
