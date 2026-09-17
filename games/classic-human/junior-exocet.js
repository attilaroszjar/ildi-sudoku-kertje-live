(function(root){'use strict';
  var C=root.ClassicHumanContracts;if(!C&&typeof require==='function')C=require('./contracts.js');
  var bitForDigit=C.bitForDigit,bitCount=C.bitCount,digitsFromMask=C.digitsFromMask,cellIndex=C.cellIndex,rowCol=C.rowCol,boxIndex=C.boxIndex,normalizeDeduction=C.normalizeDeduction,compareDeductions=C.compareDeductions;

  var DEFAULT_MAX_BASE_PAIRS=162,DEFAULT_MAX_TARGET_PAIRS_PER_BASE=18,DEFAULT_MAX_FINDINGS=64;
  function optionInt(options,key,def,max){var v=options&&options[key]!=null?options[key]:def;if(!Number.isInteger(v)||v<1||v>max)throw new RangeError(key+' must be 1..'+max);return v;}
  function unsolved(state,cell){var rc=rowCol(cell);return !state.grid[rc[0]][rc[1]];}
  function hasDigit(state,cell,digit){var rc=rowCol(cell),v=state.grid[rc[0]][rc[1]];return v===digit||(!v&&(state.masks[cell]&bitForDigit(digit))!==0);}
  function pairUnionMask(state,a,b){return state.masks[a]|state.masks[b];}
  function combinations3(items){return [[items[0],items[1]],[items[0],items[2]],[items[1],items[2]]];}
  function transposeCell(cell){var rc=rowCol(cell);return cellIndex(rc[1],rc[0]);}
  function maskHasBase(state,cell,baseMask){var rc=rowCol(cell),v=state.grid[rc[0]][rc[1]];return v?!!(baseMask&bitForDigit(v)):!!(state.masks[cell]&baseMask);}

  function rowPatternGeometry(band,baseBoxOffset,baseRow,baseCols,target1Row,target1Col,target2Row,target2Col){
    var bandStart=band*3,baseBox=band*3+baseBoxOffset,boxColStart=baseBoxOffset*3,escapeCol=[boxColStart,boxColStart+1,boxColStart+2].filter(function(c){return baseCols.indexOf(c)<0;})[0];
    var baseCells=[cellIndex(baseRow,baseCols[0]),cellIndex(baseRow,baseCols[1])];
    var targets=[cellIndex(target1Row,target1Col),cellIndex(target2Row,target2Col)];
    var companions=[cellIndex(target2Row,target1Col),cellIndex(target1Row,target2Col)];
    var crossCols=[escapeCol,target1Col,target2Col].sort(function(a,b){return a-b;});
    var sCells=[];for(var r=0;r<9;r++){if(r>=bandStart&&r<bandStart+3)continue;for(var i=0;i<crossCols.length;i++)sCells.push(cellIndex(r,crossCols[i]));}
    return {orientation:'rows',band:band,baseBox:baseBox,baseCells:baseCells,targets:targets,companions:companions,crossLines:crossCols,sCells:sCells,coverType:'row'};
  }
  function transposeGeometry(g){return {orientation:'columns',band:g.band,baseBox:boxIndex(rowCol(transposeCell(g.baseCells[0]))[0],rowCol(transposeCell(g.baseCells[0]))[1]),baseCells:g.baseCells.map(transposeCell),targets:g.targets.map(transposeCell),companions:g.companions.map(transposeCell),crossLines:g.crossLines.slice(),sCells:g.sCells.map(transposeCell),coverType:'column'};}
  function coverHousesForDigit(state,g,digit){var seen={};for(var i=0;i<g.sCells.length;i++){var cell=g.sCells[i];if(!hasDigit(state,cell,digit))continue;var rc=rowCol(cell),house=g.coverType==='row'?rc[0]:rc[1];seen[house]=1;}return Object.keys(seen).map(Number).sort(function(a,b){return a-b;});}
  function everyCrossLineHasBaseInstance(state,g,baseMask){for(var i=0;i<g.crossLines.length;i++){var line=g.crossLines[i],found=false;for(var j=0;j<g.sCells.length;j++){var rc=rowCol(g.sCells[j]),pos=g.orientation==='rows'?rc[1]:rc[0];if(pos!==line)continue;if(maskHasBase(state,g.sCells[j],baseMask)){found=true;break;}}if(!found)return false;}return true;}
  function geometryValid(state,g,baseMask){
    for(var i=0;i<g.baseCells.length;i++)if(!unsolved(state,g.baseCells[i]))return false;
    for(i=0;i<g.targets.length;i++){if(!unsolved(state,g.targets[i]))return false;if(!(state.masks[g.targets[i]]&baseMask))return false;}
    var targetUnion=(state.masks[g.targets[0]]|state.masks[g.targets[1]])&baseMask;if(targetUnion!==baseMask)return false;
    for(i=0;i<g.companions.length;i++)if(maskHasBase(state,g.companions[i],baseMask))return false;
    if(!everyCrossLineHasBaseInstance(state,g,baseMask))return false;
    var digits=digitsFromMask(baseMask),covers={};for(i=0;i<digits.length;i++){var hs=coverHousesForDigit(state,g,digits[i]);if(hs.length>2)return false;covers[digits[i]]=hs;}
    return covers;
  }
  function targetEliminations(state,g,baseMask){var out=[];for(var i=0;i<g.targets.length;i++){var cell=g.targets[i],extra=state.masks[cell]&~baseMask;for(var bits=extra;bits;bits&=bits-1){var one=bits&-bits;out.push({cell:cell,digit:digitsFromMask(one)[0]});}}return out;}
  function findingKey(d){return C.deductionStateKey(d)+'|'+d.explanationData.baseCells.join(',')+'|'+d.explanationData.targetCells.join(',');}

  function enumerateRowGeometries(state,visit,maxBasePairs,maxTargetPairsPerBase){var examinedBases=0;
    for(var band=0;band<3;band++)for(var baseBoxOffset=0;baseBoxOffset<3;baseBoxOffset++)for(var rr=0;rr<3;rr++){
      var baseRow=band*3+rr,cols=[baseBoxOffset*3,baseBoxOffset*3+1,baseBoxOffset*3+2],pairs=combinations3(cols);
      for(var pi=0;pi<pairs.length;pi++){
        if(++examinedBases>maxBasePairs)return;
        var baseCells=[cellIndex(baseRow,pairs[pi][0]),cellIndex(baseRow,pairs[pi][1])];if(!unsolved(state,baseCells[0])||!unsolved(state,baseCells[1]))continue;
        var baseMask=pairUnionMask(state,baseCells[0],baseCells[1]),digitCount=bitCount(baseMask);if(digitCount<3||digitCount>4)continue;
        var otherRows=[band*3,band*3+1,band*3+2].filter(function(r){return r!==baseRow;}),targetBoxes=[0,1,2].filter(function(x){return x!==baseBoxOffset;}),examinedTargets=0;
        for(var swap=0;swap<2;swap++){var r1=otherRows[swap],r2=otherRows[1-swap];for(var c1=targetBoxes[0]*3;c1<targetBoxes[0]*3+3;c1++)for(var c2=targetBoxes[1]*3;c2<targetBoxes[1]*3+3;c2++){
          if(++examinedTargets>maxTargetPairsPerBase)break;
          var g=rowPatternGeometry(band,baseBoxOffset,baseRow,pairs[pi],r1,c1,r2,c2);visit(g,baseMask);
        }}
      }
    }
  }

  function findJuniorExocet(state,options){options=options||{};var maxBasePairs=optionInt(options,'maxBasePairs',DEFAULT_MAX_BASE_PAIRS,DEFAULT_MAX_BASE_PAIRS),maxTargetPairsPerBase=optionInt(options,'maxTargetPairsPerBase',DEFAULT_MAX_TARGET_PAIRS_PER_BASE,DEFAULT_MAX_TARGET_PAIRS_PER_BASE),maxFindings=optionInt(options,'maxFindings',DEFAULT_MAX_FINDINGS,DEFAULT_MAX_FINDINGS),out=[],seen={};
    function consider(g,baseMask){if(out.length>=maxFindings)return;var covers=geometryValid(state,g,baseMask);if(!covers)return;var elims=targetEliminations(state,g,baseMask);if(!elims.length)return;var baseDigits=digitsFromMask(baseMask),houses=[];for(var i=0;i<g.crossLines.length;i++)houses.push((g.orientation==='rows'?'c':'r')+(g.crossLines[i]+1));for(i=0;i<baseDigits.length;i++){var hs=covers[baseDigits[i]];for(var j=0;j<hs.length;j++)houses.push((g.coverType==='row'?'r':'c')+(hs[j]+1));}
      var d=normalizeDeduction({techniqueId:'junior-exocet',eliminations:elims,anchors:g.baseCells.concat(g.targets,g.companions,g.sCells),houses:houses,complexity:{baseCells:2,baseDigitCount:baseDigits.length,targetCells:2,sCells:g.sCells.length,crossLines:3},explanationData:{scope:'standard-junior-target-rule',orientation:g.orientation,baseCells:g.baseCells.slice(),baseDigits:baseDigits,targetCells:g.targets.slice(),companionCells:g.companions.slice(),sCells:g.sCells.slice(),crossLines:g.crossLines.slice(),coverHouses:Object.assign({},covers)}});var key=findingKey(d);if(!seen[key]){seen[key]=1;out.push(d);}}
    enumerateRowGeometries(state,consider,maxBasePairs,maxTargetPairsPerBase);
    var transposed={grid:Array.from({length:9},function(_,r){return Array.from({length:9},function(__,c){return state.grid[c][r];});}),masks:new Uint16Array(81)};for(var cell=0;cell<81;cell++)transposed.masks[transposeCell(cell)]=state.masks[cell];
    enumerateRowGeometries(transposed,function(g,baseMask){var tg=transposeGeometry(g);consider(tg,baseMask);},maxBasePairs,maxTargetPairsPerBase);
    out.sort(compareDeductions);return out.slice(0,maxFindings);
  }

  var api={findJuniorExocet:findJuniorExocet,DEFAULT_MAX_BASE_PAIRS:DEFAULT_MAX_BASE_PAIRS,DEFAULT_MAX_TARGET_PAIRS_PER_BASE:DEFAULT_MAX_TARGET_PAIRS_PER_BASE,DEFAULT_MAX_FINDINGS:DEFAULT_MAX_FINDINGS};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ClassicHumanJuniorExocet=api;
})(typeof globalThis!=='undefined'?globalThis:this);
