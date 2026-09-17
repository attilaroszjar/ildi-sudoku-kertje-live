(function(root){
  'use strict';

  function rotateCell(cell,turns,n){
    var r=cell[0],c=cell[1];
    for(var t=0;t<(turns%4+4)%4;t++){var nr=c,nc=n-1-r;r=nr;c=nc;}
    return[r,c];
  }

  function deriveIntersection(cells,n){
    if(!Array.isArray(cells)||cells.length!==4)return null;
    var uniq={};cells.forEach(function(p){if(Array.isArray(p)&&p.length===2&&Number.isInteger(p[0])&&Number.isInteger(p[1]))uniq[p[0]+','+p[1]]=p;});
    var pts=Object.keys(uniq).map(function(k){return uniq[k];});if(pts.length!==4)return null;
    var rows=Array.from(new Set(pts.map(function(p){return p[0];}))).sort(function(a,b){return a-b;}),cols=Array.from(new Set(pts.map(function(p){return p[1];}))).sort(function(a,b){return a-b;});
    if(rows.length!==2||cols.length!==2||rows[1]!==rows[0]+1||cols[1]!==cols[0]+1)return null;
    var want={};rows.forEach(function(r){cols.forEach(function(c){want[r+','+c]=1;});});
    if(!pts.every(function(p){return want[p[0]+','+p[1]];}))return null;
    var at=[rows[1],cols[1]];
    return at[0]>=1&&at[0]<n&&at[1]>=1&&at[1]<n?at:null;
  }

  function validIntersection(q,n){
    return !!(q&&Array.isArray(q.at)&&q.at.length===2&&Number.isInteger(q.at[0])&&Number.isInteger(q.at[1])&&q.at[0]>=1&&q.at[0]<n&&q.at[1]>=1&&q.at[1]<n);
  }

  function normalizeGeneratedQuads(generated,turns,n){
    if(!generated||!generated.data||!Array.isArray(generated.data.quads))return[];
    return generated.data.quads.map(function(q,index){
      var cells=(q.cells||[]).map(function(p){return rotateCell(p,turns,n);}),at=deriveIntersection(cells,n);
      return at?{index:index,at:at,cells:cells,digits:(q.digits||[]).slice()}:null;
    }).filter(Boolean);
  }

  function layout(quads,n,boardWidth,boardHeight,offsetLeft,offsetTop){
    var out=[];
    (quads||[]).forEach(function(q,index){
      if(!validIntersection(q,n))return;
      out.push({index:q.index==null?index:q.index,left:(offsetLeft||0)+q.at[1]*boardWidth/n,top:(offsetTop||0)+q.at[0]*boardHeight/n,digits:(q.digits||[]).slice(),at:q.at.slice()});
    });
    return out;
  }

  function turnsForGenerated(generated){
    if(!generated||!generated.generation||!root.LogicRoom||typeof root.LogicRoom.hashString!=='function')return 0;
    var apiSeed=((generated.generation.seed>>>0)^(root.LogicRoom.hashString('quadruple')>>>0))>>>0;
    return apiSeed%4;
  }

  function compactMarker(marker,digits){
    if(marker.dataset.quadCompact==='1')return;
    marker.replaceChildren();
    (digits||[]).slice(0,4).forEach(function(d){var s=document.createElement('span');s.textContent=String(d);s.style.display='grid';s.style.placeItems='center';marker.appendChild(s);});
    marker.dataset.quadCompact='1';
    marker.style.width='30px';marker.style.height='30px';marker.style.minWidth='30px';marker.style.minHeight='30px';marker.style.padding='2px';marker.style.borderRadius='50%';marker.style.display='grid';marker.style.gridTemplateColumns='repeat(2,1fr)';marker.style.gridTemplateRows='repeat(2,1fr)';marker.style.gap='0';marker.style.fontSize='9px';marker.style.lineHeight='1';marker.style.letterSpacing='0';marker.style.whiteSpace='normal';
  }

  function hardenShell(shell){
    if(!shell)return;
    var board=shell.querySelector('.sudoku-board'),markers=Array.prototype.slice.call(shell.querySelectorAll('.sudoku-quad-marker'));
    if(!board||!markers.length)return;
    var generated=root.QuadrupleRuntimeHardening&&root.QuadrupleRuntimeHardening.lastGenerated;if(!generated||generated.id!=='quadruple')return;
    var n=generated.solution.length,turns=turnsForGenerated(generated),quads=normalizeGeneratedQuads(generated,turns,n),positions=layout(quads,n,board.offsetWidth,board.offsetHeight,board.offsetLeft,board.offsetTop),byIndex={};
    positions.forEach(function(p){byIndex[p.index]=p;});
    markers.forEach(function(marker,index){
      var p=byIndex[index];if(!p){marker.remove();return;}
      compactMarker(marker,p.digits);
      marker.style.left=p.left+'px';marker.style.top=p.top+'px';marker.dataset.quadIntersection=p.at.join(',');
    });
  }

  function hardenAll(){Array.prototype.forEach.call(document.querySelectorAll('.sudoku-board-shell'),function(shell){if(shell.querySelector('.sudoku-quad-marker'))hardenShell(shell);});}

  root.QuadrupleRenderHardening={validIntersection:validIntersection,rotateCell:rotateCell,deriveIntersection:deriveIntersection,normalizeGeneratedQuads:normalizeGeneratedQuads,layout:layout,harden:hardenAll};

  if(typeof document!=='undefined'){
    var pending=false;
    function schedule(){if(pending)return;pending=true;(root.requestAnimationFrame||function(fn){return setTimeout(fn,0);})(function(){pending=false;hardenAll();});}
    document.addEventListener('sudoku:variantchange',schedule);
    if(root.addEventListener)root.addEventListener('resize',schedule,{passive:true});
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  }
})(typeof window!=='undefined'?window:globalThis);
