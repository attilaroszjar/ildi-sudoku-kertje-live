(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  if(!C&&typeof require==='function')C=require('./contracts.js');

  var bitForDigit=C.bitForDigit,bitCount=C.bitCount,digitsFromMask=C.digitsFromMask;
  var cellIndex=C.cellIndex,rowCol=C.rowCol,boxIndex=C.boxIndex,normalizeDeduction=C.normalizeDeduction;

  function unsolved(state,cell){var rc=rowCol(cell);return !state.grid[rc[0]][rc[1]];}
  function mask(state,cell){return state.masks[cell];}
  function hasPair(state,cell,pairMask){return unsolved(state,cell)&&(mask(state,cell)&pairMask)===pairMask;}
  function exactPair(state,cell,pairMask){return hasPair(state,cell,pairMask)&&mask(state,cell)===pairMask;}
  function rectCells(r1,r2,c1,c2){return [cellIndex(r1,c1),cellIndex(r1,c2),cellIndex(r2,c1),cellIndex(r2,c2)];}
  function validRectangleBoxes(cells){var boxes=[...new Set(cells.map(function(cell){var rc=rowCol(cell);return boxIndex(rc[0],rc[1]);}))];return boxes.length===2;}
  function sees(a,b){var ra=rowCol(a),rb=rowCol(b);return ra[0]===rb[0]||ra[1]===rb[1]||boxIndex(ra[0],ra[1])===boxIndex(rb[0],rb[1]);}
  function diagonalInRect(a,b){var ra=rowCol(a),rb=rowCol(b);return ra[0]!==rb[0]&&ra[1]!==rb[1];}
  function houseCells(id){var out=[],n=Number(id.slice(1))-1,r,c;if(id[0]==='r'){for(c=0;c<9;c++)out.push(cellIndex(n,c));}else if(id[0]==='c'){for(r=0;r<9;r++)out.push(cellIndex(r,n));}else{var br=Math.floor(n/3)*3,bc=(n%3)*3;for(r=br;r<br+3;r++)for(c=bc;c<bc+3;c++)out.push(cellIndex(r,c));}return out;}
  function commonHouseIds(a,b){var ra=rowCol(a),rb=rowCol(b),out=[];if(ra[0]===rb[0])out.push('r'+(ra[0]+1));if(ra[1]===rb[1])out.push('c'+(ra[1]+1));var ba=boxIndex(ra[0],ra[1]),bb=boxIndex(rb[0],rb[1]);if(ba===bb)out.push('b'+(ba+1));return out;}
  function commonPeers(state,cells,exclude){var out=[],skip={};(exclude||[]).forEach(function(x){skip[x]=1;});for(var cell=0;cell<81;cell++){if(skip[cell]||!unsolved(state,cell))continue;if(cells.every(function(x){return sees(cell,x);}))out.push(cell);}return out;}
  function combinations(items,size,start,pick,out){if(pick.length===size){out.push(pick.slice());return;}for(var i=start;i<=items.length-(size-pick.length);i++){pick.push(items[i]);combinations(items,size,i+1,pick,out);pick.pop();}}
  function candidateCountInHouse(state,id,digit,allowed){var bit=bitForDigit(digit),cells=houseCells(id),out=[];for(var i=0;i<cells.length;i++)if(unsolved(state,cells[i])&&(mask(state,cells[i])&bit))out.push(cells[i]);if(allowed)return out.every(function(x){return allowed.indexOf(x)>=0;})?out:null;return out;}
  function dedupe(list){var seen={},out=[];for(var i=0;i<list.length;i++){var d=list[i],k=d.techniqueId+'|'+d.placements.map(function(x){return 'P'+x.cell+':'+x.digit;}).concat(d.eliminations.map(function(x){return 'E'+x.cell+':'+x.digit;})).join(',')+'|'+d.anchors.join(',')+'|'+String(d.explanationData.type);if(seen[k])continue;seen[k]=1;out.push(d);}return out;}
  function pushUr(out,type,cells,pair,elims,extraData,complexity,houses){if(!elims.length)return;out.push(normalizeDeduction({techniqueId:'unique-rectangle',eliminations:elims,anchors:cells,houses:houses||[],complexity:Object.assign({rectangleType:type},complexity||{}),explanationData:Object.assign({type:type,pair:pair.slice()},extraData||{})}));}

  function findExtendedForPair(state,cells,pairMask,pair,r1,r2,c1,c2,out){
    var exact=[],extras=[],i;
    for(i=0;i<4;i++){if(!hasPair(state,cells[i],pairMask))return;if(exactPair(state,cells[i],pairMask))exact.push(cells[i]);else extras.push(cells[i]);}
    if(extras.length<2)return;
    var extraMasks=extras.map(function(x){return mask(state,x)&~pairMask;});

    // Type 2: exactly two non-diagonal roof cells, same single extra candidate.
    if(extras.length===2&&!diagonalInRect(extras[0],extras[1])&&bitCount(extraMasks[0])===1&&extraMasks[0]===extraMasks[1]){
      var d2=digitsFromMask(extraMasks[0])[0],peers2=commonPeers(state,extras,cells),el2=[];for(i=0;i<peers2.length;i++)if(mask(state,peers2[i])&extraMasks[0])el2.push({cell:peers2[i],digit:d2});
      pushUr(out,2,cells,pair,el2,{roof:extras.slice(),extraDigit:d2,rows:[r1,r2],columns:[c1,c2]},{guardianCount:2});
    }

    // Type 3: two non-diagonal roof cells are one virtual cell of extra candidates in a naked subset.
    if(extras.length===2&&!diagonalInRect(extras[0],extras[1])){
      var shared=commonHouseIds(extras[0],extras[1]),extraUnion=extraMasks[0]|extraMasks[1];
      for(var hi=0;hi<shared.length;hi++){
        var hid=shared[hi],hc=houseCells(hid),pool=hc.filter(function(x){return cells.indexOf(x)<0&&unsolved(state,x)&&(mask(state,x)&pairMask)===0;});
        for(var n=1;n<=Math.min(3,pool.length);n++){
          var combos=[];combinations(pool,n,0,[],combos);
          for(var ci=0;ci<combos.length;ci++){
            var companions=combos[ci],union=extraUnion;for(i=0;i<companions.length;i++)union|=mask(state,companions[i]);if(bitCount(union)!==n+1)continue;
            var selected={};cells.forEach(function(x){selected[x]=1;});companions.forEach(function(x){selected[x]=1;});var el3=[];
            for(i=0;i<hc.length;i++){var target=hc[i];if(selected[target]||!unsolved(state,target))continue;var rem=mask(state,target)&union;for(var bits=rem;bits;bits&=bits-1){var one=bits&-bits;el3.push({cell:target,digit:digitsFromMask(one)[0]});}}
            pushUr(out,3,cells,pair,el3,{roof:extras.slice(),house:hid,companions:companions.slice(),subsetDigits:digitsFromMask(union),rows:[r1,r2],columns:[c1,c2]},{subsetSize:n+1},[hid]);
          }
        }
      }
    }

    // Type 4: one UR digit is conjugate in a house containing both roof cells; eliminate the other UR digit from the roof.
    if(extras.length===2&&!diagonalInRect(extras[0],extras[1])){
      var shared4=commonHouseIds(extras[0],extras[1]);
      for(var h4=0;h4<shared4.length;h4++)for(var pi=0;pi<2;pi++){
        var strongDigit=pair[pi],otherDigit=pair[1-pi],places=candidateCountInHouse(state,shared4[h4],strongDigit,extras);if(!places||places.length!==2)continue;
        pushUr(out,4,cells,pair,[{cell:extras[0],digit:otherDigit},{cell:extras[1],digit:otherDigit}],{roof:extras.slice(),house:shared4[h4],strongDigit:strongDigit,eliminatedDigit:otherDigit,rows:[r1,r2],columns:[c1,c2]},{strongLinkCount:1},[shared4[h4]]);
      }
    }

    // Type 5: same single extra candidate in two diagonal or in three roof cells.
    if(extras.length===2||extras.length===3){
      var valid5=extras.length===3||diagonalInRect(extras[0],extras[1]),single5=extraMasks.length&&bitCount(extraMasks[0])===1&&extraMasks.every(function(x){return x===extraMasks[0];});
      if(valid5&&single5){var d5=digitsFromMask(extraMasks[0])[0],peers5=commonPeers(state,extras,cells),el5=[];for(i=0;i<peers5.length;i++)if(mask(state,peers5[i])&extraMasks[0])el5.push({cell:peers5[i],digit:d5});pushUr(out,5,cells,pair,el5,{roof:extras.slice(),extraDigit:d5,rows:[r1,r2],columns:[c1,c2]},{guardianCount:extras.length});}
    }

    // Type 6: two diagonal roof cells; one UR digit has no candidates outside the rectangle in both rows and both columns.
    if(extras.length===2&&diagonalInRect(extras[0],extras[1])){
      var ids6=['r'+(r1+1),'r'+(r2+1),'c'+(c1+1),'c'+(c2+1)];
      for(var p6=0;p6<2;p6++){
        var d6=pair[p6],ok6=ids6.every(function(id){var places=candidateCountInHouse(state,id,d6);return places.length===2&&places.every(function(x){return cells.indexOf(x)>=0;});});
        if(ok6)pushUr(out,6,cells,pair,[{cell:extras[0],digit:d6},{cell:extras[1],digit:d6}],{roof:extras.slice(),strongDigit:d6,rows:[r1,r2],columns:[c1,c2]},{strongLinkCount:4},ids6);
      }
    }

    // Hidden Rectangle: from any exact corner, if one UR digit is confined to the rectangle in both row and column of the opposite corner, eliminate the other digit there.
    if(exact.length>=1&&extras.length>=1){
      for(var ei=0;ei<exact.length;ei++)for(var ti=0;ti<extras.length;ti++){
        var start=exact[ei],target=extras[ti];if(!diagonalInRect(start,target))continue;var trc=rowCol(target),rowId='r'+(trc[0]+1),colId='c'+(trc[1]+1);
        for(var ph=0;ph<2;ph++){
          var strongH=pair[ph],otherH=pair[1-ph],rp=candidateCountInHouse(state,rowId,strongH),cp=candidateCountInHouse(state,colId,strongH);if(rp.length!==2||cp.length!==2)continue;if(!rp.every(function(x){return cells.indexOf(x)>=0;})||!cp.every(function(x){return cells.indexOf(x)>=0;}))continue;
          pushUr(out,'hidden',cells,pair,[{cell:target,digit:otherH}],{start:start,target:target,strongDigit:strongH,eliminatedDigit:otherH,row:rowId,column:colId,rows:[r1,r2],columns:[c1,c2]},{strongLinkCount:2},[rowId,colId]);
        }
      }
    }
  }

  function findUniqueRectangle(state){
    var out=[];
    for(var r1=0;r1<8;r1++)for(var r2=r1+1;r2<9;r2++)for(var c1=0;c1<8;c1++)for(var c2=c1+1;c2<9;c2++){
      var cells=rectCells(r1,r2,c1,c2);if(!validRectangleBoxes(cells))continue;
      for(var a=1;a<=8;a++)for(var b=a+1;b<=9;b++){
        var pairMask=bitForDigit(a)|bitForDigit(b),pairCells=[],guardian=-1,ok=true;
        for(var i=0;i<4;i++){var cell=cells[i];if(!hasPair(state,cell,pairMask)){ok=false;break;}if(exactPair(state,cell,pairMask))pairCells.push(cell);else if(guardian<0)guardian=cell;else guardian=-2;}
        if(ok&&pairCells.length===3&&guardian>=0){var extra=mask(state,guardian)&~pairMask;if(extra)pushUr(out,1,cells,[a,b],[{cell:guardian,digit:a},{cell:guardian,digit:b}],{guardian:guardian,extraDigits:digitsFromMask(extra),rows:[r1,r2],columns:[c1,c2]},{guardianCount:1});}
        if(ok)findExtendedForPair(state,cells,pairMask,[a,b],r1,r2,c1,c2,out);
      }
    }
    return dedupe(out);
  }

  function houseIdsForPair(a,b){var ra=rowCol(a),rb=rowCol(b),out=[];if(ra[0]===rb[0])out.push('r'+(ra[0]+1));if(ra[1]===rb[1])out.push('c'+(ra[1]+1));var ba=boxIndex(ra[0],ra[1]),bb=boxIndex(rb[0],rb[1]);if(ba===bb)out.push('b'+(ba+1));return out;}
  function uniqueLoopPairCells(state,pairMask){var exact=[],guardians=[];for(var i=0;i<81;i++){if(!hasPair(state,i,pairMask))continue;if(exactPair(state,i,pairMask))exact.push(i);else guardians.push(i);}return {exact:exact,guardians:guardians};}
  function buildLoopAdj(nodes){var adj={};for(var i=0;i<nodes.length;i++)adj[nodes[i]]=[];for(i=0;i<nodes.length;i++)for(var j=i+1;j<nodes.length;j++){var hs=houseIdsForPair(nodes[i],nodes[j]);for(var h=0;h<hs.length;h++){adj[nodes[i]].push({cell:nodes[j],house:hs[h]});adj[nodes[j]].push({cell:nodes[i],house:hs[h]});}}Object.keys(adj).forEach(function(k){adj[k].sort(function(x,y){return x.cell-y.cell||x.house.localeCompare(y.house);});});return adj;}
  function findUniqueLoop(state){var out=[],MAX_LOOP=8;for(var a=1;a<=8;a++)for(var b=a+1;b<=9;b++){var pairMask=bitForDigit(a)|bitForDigit(b),parts=uniqueLoopPairCells(state,pairMask);if(parts.exact.length<3||!parts.guardians.length)continue;for(var gi=0;gi<parts.guardians.length;gi++){var guardian=parts.guardians[gi],extra=mask(state,guardian)&~pairMask;if(!extra)continue;var nodes=parts.exact.concat([guardian]).sort(function(x,y){return x-y;}),adj=buildLoopAdj(nodes),seenState={},seenCycle={};function dfs(current,path,houses){if(path.length>MAX_LOOP)return;var stateKey=current+'|'+houses[houses.length-1]+'|'+path.slice().sort(function(x,y){return x-y;}).join(',');if(seenState[stateKey])return;seenState[stateKey]=1;var edges=adj[current]||[];for(var ei=0;ei<edges.length;ei++){var e=edges[ei];if(path.length>=4&&e.cell===guardian&&path.length%2===0){if(houses.length&&houses[houses.length-1]===e.house)continue;var cycle=path.slice(),key=cycle.slice().sort(function(x,y){return x-y;}).join(',');if(seenCycle[key])continue;seenCycle[key]=1;out.push(normalizeDeduction({techniqueId:'unique-loop',eliminations:[{cell:guardian,digit:a},{cell:guardian,digit:b}],anchors:cycle,complexity:{loopLength:cycle.length},explanationData:{pair:[a,b],guardian:guardian,extraDigits:digitsFromMask(extra),loop:cycle.slice(),houses:houses.concat([e.house])}}));continue;}if(e.cell===guardian||path.indexOf(e.cell)>=0)continue;if(houses.length&&houses[houses.length-1]===e.house)continue;path.push(e.cell);houses.push(e.house);dfs(e.cell,path,houses);houses.pop();path.pop();}}dfs(guardian,[guardian],[]);}}return dedupe(out);}

  function rowCells(r){var a=[];for(var c=0;c<9;c++)a.push(cellIndex(r,c));return a;}function colCells(c){var a=[];for(var r=0;r<9;r++)a.push(cellIndex(r,c));return a;}function boxCells(b){var a=[],br=Math.floor(b/3)*3,bc=(b%3)*3;for(var r=br;r<br+3;r++)for(var c=bc;c<bc+3;c++)a.push(cellIndex(r,c));return a;}function allHouses(){var out=[];for(var i=0;i<9;i++)out.push({id:'r'+(i+1),cells:rowCells(i)});for(i=0;i<9;i++)out.push({id:'c'+(i+1),cells:colCells(i)});for(i=0;i<9;i++)out.push({id:'b'+(i+1),cells:boxCells(i)});return out;}var BUG_HOUSES=allHouses();
  function houseCandidateCount(state,cells,digit){var bit=bitForDigit(digit),n=0;for(var i=0;i<cells.length;i++)if(unsolved(state,cells[i])&&(mask(state,cells[i])&bit))n++;return n;}
  function bugStructureValid(state,bug,extraDigit){var rc=rowCol(bug),extraBox=boxIndex(rc[0],rc[1]),extraIds=new Set(['r'+(rc[0]+1),'c'+(rc[1]+1),'b'+(extraBox+1)]);for(var h=0;h<BUG_HOUSES.length;h++)for(var d=1;d<=9;d++){var count=houseCandidateCount(state,BUG_HOUSES[h].cells,d),expected=(d===extraDigit&&extraIds.has(BUG_HOUSES[h].id))?3:2;if(count!==expected)return false;}return true;}
  function findBugPlusOne(state){var odd=[];for(var cell=0;cell<81;cell++){if(!unsolved(state,cell))continue;var n=bitCount(mask(state,cell));if(n===2)continue;if(n===3)odd.push(cell);else return [];}if(odd.length!==1)return [];var bug=odd[0],digits=digitsFromMask(mask(state,bug)),valid=[];for(var i=0;i<digits.length;i++)if(bugStructureValid(state,bug,digits[i]))valid.push(digits[i]);if(valid.length!==1)return [];var rc=rowCol(bug),b=boxIndex(rc[0],rc[1]);return [normalizeDeduction({techniqueId:'bug-plus-one',placements:[{cell:bug,digit:valid[0]}],anchors:[bug],houses:['r'+(rc[0]+1),'c'+(rc[1]+1),'b'+(b+1)],complexity:{trivalueCells:1},explanationData:{bugCell:bug,digit:valid[0],candidates:digits}})];}

  var api={findUniqueRectangle:findUniqueRectangle,findUniqueLoop:findUniqueLoop,findBugPlusOne:findBugPlusOne};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ClassicHumanUniqueness=api;
})(typeof globalThis!=='undefined'?globalThis:this);
