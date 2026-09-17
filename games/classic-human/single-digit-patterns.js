(function(root){'use strict';
  var C=root.ClassicHumanContracts;
  var L=root.ClassicHumanLinks;
  if(!C&&typeof require==='function')C=require('./contracts.js');
  if(!L&&typeof require==='function')L=require('./links.js');

  var normalizeDeduction=C.normalizeDeduction,rowCol=C.rowCol,boxIndex=C.boxIndex,cellIndex=C.cellIndex;

  function other(link,cell){return link.a===cell?link.b:link.a;}
  function endpoints(link){return [link.a,link.b];}
  function uniquePatternKey(d){
    var e=d.eliminations.map(function(x){return x.cell+':'+x.digit;}).join(',');
    var a=d.anchors.join(',');
    return d.techniqueId+'|'+d.explanationData.digit+'|'+a+'|'+e;
  }
  function dedupe(list){
    var seen={},out=[];
    for(var i=0;i<list.length;i++){var k=uniquePatternKey(list[i]);if(seen[k])continue;seen[k]=1;out.push(list[i]);}
    return out;
  }
  function eliminationsFor(state,a,b,digit,exclude){
    return L.commonCandidatePeers(state,a,b,digit,exclude).map(function(cell){return {cell:cell,digit:digit};});
  }

  function findSkyscraper(state){
    var out=[];
    for(var digit=1;digit<=9;digit++){
      ['row','column'].forEach(function(type){
        var links=L.conjugateLinks(state,digit,[type]);
        for(var i=0;i<links.length;i++)for(var j=i+1;j<links.length;j++){
          var A=links[i],B=links[j],ae=endpoints(A),be=endpoints(B);
          for(var ai=0;ai<2;ai++)for(var bi=0;bi<2;bi++){
            var roofA=ae[ai],roofB=be[bi],freeA=other(A,roofA),freeB=other(B,roofB);
            var rA=rowCol(roofA),rB=rowCol(roofB),aligned=type==='row'?rA[1]===rB[1]:rA[0]===rB[0];
            if(!aligned||L.sees(freeA,freeB))continue;
            var elims=eliminationsFor(state,freeA,freeB,digit,[A.a,A.b,B.a,B.b]);if(!elims.length)continue;
            out.push(normalizeDeduction({techniqueId:'skyscraper',eliminations:elims,anchors:[A.a,A.b,B.a,B.b],houses:[A.houseId,B.houseId],candidateNodes:[roofA,roofB,freeA,freeB],proofEdges:[{type:'strong',a:A.a,b:A.b},{type:'weak',a:roofA,b:roofB},{type:'strong',a:B.a,b:B.b}],complexity:{linkCount:3},explanationData:{digit:digit,orientation:type,roof:[roofA,roofB],free:[freeA,freeB]}}));
          }
        }
      });
    }
    return dedupe(out);
  }

  function findTwoStringKite(state){
    var out=[];
    for(var digit=1;digit<=9;digit++){
      var rows=L.conjugateLinks(state,digit,['row']),cols=L.conjugateLinks(state,digit,['column']);
      for(var i=0;i<rows.length;i++)for(var j=0;j<cols.length;j++){
        var R=rows[i],K=cols[j],re=endpoints(R),ce=endpoints(K);
        for(var ri=0;ri<2;ri++)for(var ci=0;ci<2;ci++){
          var joinR=re[ri],joinC=ce[ci];if(joinR===joinC)continue;
          var rr=rowCol(joinR),rc=rowCol(joinC);
          if(boxIndex(rr[0],rr[1])!==boxIndex(rc[0],rc[1]))continue;
          var freeR=other(R,joinR),freeC=other(K,joinC);if(L.sees(freeR,freeC))continue;
          var elims=eliminationsFor(state,freeR,freeC,digit,[R.a,R.b,K.a,K.b]);if(!elims.length)continue;
          out.push(normalizeDeduction({techniqueId:'two-string-kite',eliminations:elims,anchors:[R.a,R.b,K.a,K.b],houses:[R.houseId,K.houseId,'b'+(boxIndex(rr[0],rr[1])+1)],candidateNodes:[joinR,joinC,freeR,freeC],proofEdges:[{type:'strong',a:R.a,b:R.b},{type:'weak',a:joinR,b:joinC},{type:'strong',a:K.a,b:K.b}],complexity:{linkCount:3},explanationData:{digit:digit,join:[joinR,joinC],free:[freeR,freeC]}}));
        }
      }
    }
    return dedupe(out);
  }

  function isSkyscraperShape(A,B,joinA,joinB){
    if(A.houseType!==B.houseType||!(A.houseType==='row'||A.houseType==='column'))return false;
    var a=rowCol(joinA),b=rowCol(joinB);
    return A.houseType==='row'?a[1]===b[1]:a[0]===b[0];
  }
  function isKiteShape(A,B,joinA,joinB){
    if(!((A.houseType==='row'&&B.houseType==='column')||(A.houseType==='column'&&B.houseType==='row')))return false;
    var a=rowCol(joinA),b=rowCol(joinB);
    return joinA!==joinB&&boxIndex(a[0],a[1])===boxIndex(b[0],b[1]);
  }
  function findTurbotFish(state){
    var out=[];
    for(var digit=1;digit<=9;digit++){
      var links=L.conjugateLinks(state,digit,['row','column','box']);
      for(var i=0;i<links.length;i++)for(var j=i+1;j<links.length;j++){
        var A=links[i],B=links[j];
        if(A.houseId===B.houseId)continue;
        var ae=endpoints(A),be=endpoints(B);
        for(var ai=0;ai<2;ai++)for(var bi=0;bi<2;bi++){
          var joinA=ae[ai],joinB=be[bi];if(joinA===joinB||!L.sees(joinA,joinB))continue;
          if(isSkyscraperShape(A,B,joinA,joinB)||isKiteShape(A,B,joinA,joinB))continue;
          var freeA=other(A,joinA),freeB=other(B,joinB);if(freeA===freeB||L.sees(freeA,freeB))continue;
          var elims=eliminationsFor(state,freeA,freeB,digit,[A.a,A.b,B.a,B.b]);if(!elims.length)continue;
          out.push(normalizeDeduction({techniqueId:'turbot-fish',eliminations:elims,anchors:[A.a,A.b,B.a,B.b],houses:[A.houseId,B.houseId],candidateNodes:[joinA,joinB,freeA,freeB],proofEdges:[{type:'strong',a:A.a,b:A.b},{type:'weak',a:joinA,b:joinB},{type:'strong',a:B.a,b:B.b}],complexity:{linkCount:3},explanationData:{digit:digit,linkHouses:[A.houseId,B.houseId],join:[joinA,joinB],free:[freeA,freeB]}}));
        }
      }
    }
    return dedupe(out);
  }

  function boxCandidateCells(state,box,digit){
    return L.candidateCellsInHouse(state,L.HOUSES[18+box],digit);
  }
  function erCrosses(state,box,digit){
    var cells=boxCandidateCells(state,box,digit),out=[];
    if(cells.length<3)return out;
    var br=Math.floor(box/3)*3,bc=(box%3)*3;
    for(var r=br;r<br+3;r++)for(var c=bc;c<bc+3;c++){
      var rowArm=false,colArm=false,ok=true;
      for(var i=0;i<cells.length;i++){
        var rc=rowCol(cells[i]);
        if(rc[0]!==r&&rc[1]!==c){ok=false;break;}
        if(rc[0]===r&&rc[1]!==c)rowArm=true;
        if(rc[1]===c&&rc[0]!==r)colArm=true;
      }
      if(ok&&rowArm&&colArm)out.push({row:r,col:c,cells:cells.slice()});
    }
    return out;
  }
  function findEmptyRectangle(state){
    var out=[];
    for(var digit=1;digit<=9;digit++){
      var rowLinks=L.conjugateLinks(state,digit,['row']),colLinks=L.conjugateLinks(state,digit,['column']);
      for(var box=0;box<9;box++){
        var crosses=erCrosses(state,box,digit),br=Math.floor(box/3)*3,bc=(box%3)*3;
        for(var xi=0;xi<crosses.length;xi++){
          var er=crosses[xi];
          for(var i=0;i<rowLinks.length;i++){
            var R=rowLinks[i],ends=endpoints(R);
            for(var ei=0;ei<2;ei++){
              var onCol=ends[ei],rc=rowCol(onCol);if(rc[1]!==er.col||boxIndex(rc[0],rc[1])===box)continue;
              var far=other(R,onCol),frc=rowCol(far);if(frc[1]>=bc&&frc[1]<bc+3)continue;
              var target=cellIndex(er.row,frc[1]);
              if(!L.hasCandidate(state,target,digit))continue;
              out.push(normalizeDeduction({techniqueId:'empty-rectangle',eliminations:[{cell:target,digit:digit}],anchors:er.cells.concat([R.a,R.b]),houses:['b'+(box+1),R.houseId],candidateNodes:er.cells.concat([onCol,far,target]),proofEdges:[{type:'grouped-strong',box:box,row:er.row,column:er.col},{type:'strong',a:R.a,b:R.b},{type:'weak',a:far,b:target}],complexity:{linkCount:3,boxCandidateCount:er.cells.length},explanationData:{digit:digit,box:box,row:er.row,column:er.col,strongHouse:R.houseId,strongPair:[R.a,R.b],target:target}}));
            }
          }
          for(i=0;i<colLinks.length;i++){
            var K=colLinks[i],kends=endpoints(K);
            for(ei=0;ei<2;ei++){
              var onRow=kends[ei],krc=rowCol(onRow);if(krc[0]!==er.row||boxIndex(krc[0],krc[1])===box)continue;
              var kfar=other(K,onRow),kfrc=rowCol(kfar);if(kfrc[0]>=br&&kfrc[0]<br+3)continue;
              var ktarget=cellIndex(kfrc[0],er.col);
              if(!L.hasCandidate(state,ktarget,digit))continue;
              out.push(normalizeDeduction({techniqueId:'empty-rectangle',eliminations:[{cell:ktarget,digit:digit}],anchors:er.cells.concat([K.a,K.b]),houses:['b'+(box+1),K.houseId],candidateNodes:er.cells.concat([onRow,kfar,ktarget]),proofEdges:[{type:'grouped-strong',box:box,row:er.row,column:er.col},{type:'strong',a:K.a,b:K.b},{type:'weak',a:kfar,b:ktarget}],complexity:{linkCount:3,boxCandidateCount:er.cells.length},explanationData:{digit:digit,box:box,row:er.row,column:er.col,strongHouse:K.houseId,strongPair:[K.a,K.b],target:ktarget}}));
            }
          }
        }
      }
    }
    return dedupe(out);
  }

  var api={findSkyscraper:findSkyscraper,findTwoStringKite:findTwoStringKite,findTurbotFish:findTurbotFish,findEmptyRectangle:findEmptyRectangle};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ClassicHumanSingleDigitPatterns=api;
})(typeof globalThis!=='undefined'?globalThis:this);
