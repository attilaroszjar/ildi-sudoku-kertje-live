(function (root) {
  'use strict';
  if (!root.LogicRoom || !root.SudokuBank) return;
  var LR = root.LogicRoom, I = root.SudokuI18n;

  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function rcKey(r,c){ return r+','+c; }
  function kindIs(v, kind){ return v.kind===kind || (Array.isArray(v.kinds) && v.kinds.indexOf(kind)!==-1); }
  function symbolFor(v,n){if(v.data&&v.data.parkValue===n)return '🌿';var set=v.symbolSet||'123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';return n?set[n-1]:'';}
  function valueForKey(v,key,max){var set=v.symbolSet||'123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',ch=String(key||'').toUpperCase(),idx=set.indexOf(ch);return idx>=0&&idx<max?idx+1:0;}
  function runningCellCount(line){var used=Array(line.length).fill(false);for(var i=0;i<line.length-1;i+=1)if(Math.abs(line[i]-line[i+1])===1){used[i]=true;used[i+1]=true;}return used.filter(Boolean).length;}
  function ascendingSequenceCount(line){var count=0,inRun=false;for(var i=0;i<line.length-1;i+=1){if(line[i]<line[i+1]){if(!inRun)count+=1;inRun=true;}else inRun=false;}return count;}
  function outsideCountConflict(v,grid,r,c,measure){var clues=(v.data&&v.data.clues)||[];for(var i=0;i<clues.length;i+=1){var clue=clues[i];if((clue.axis==='row'&&clue.index!==r)||(clue.axis==='col'&&clue.index!==c))continue;var line=clue.axis==='row'?grid[clue.index].slice():grid.map(function(row){return row[clue.index];});if(line.every(Boolean)&&measure(line)!==clue.count)return true;}return false;}
  function skyscraperLine(grid,clue){var line=clue.axis==='row'?grid[clue.index].slice():grid.map(function(row){return row[clue.index];});if(clue.side==='right'||clue.side==='bottom')line.reverse();return line;}
  function skyscraperVisibleCount(line){var max=0,count=0;for(var i=0;i<line.length;i+=1)if(line[i]>max){max=line[i];count+=1;}return count;}
  function skyscraperVisibleSum(line){var max=0,sum=0;for(var i=0;i<line.length;i+=1)if(line[i]>max){max=line[i];sum+=line[i];}return sum;}
  function skyscraperVisibleProduct(line){var max=0,product=1;for(var i=0;i<line.length;i+=1)if(line[i]>max){max=line[i];product*=line[i];}return product;}
  function littleKillerConflict(v,grid,r,c){
    var clues=(v.data&&v.data.clues)||[];
    for(var i=0;i<clues.length;i+=1){
      var cl=clues[i];
      if(!cl.cells.some(function(p){return p[0]===r&&p[1]===c;}))continue;
      var vals=cl.cells.map(function(p){return grid[p[0]][p[1]];});
      var sum=vals.reduce(function(total,z){return total+(z||0);},0);
      if(sum>cl.sum)return true;
      if(vals.every(Boolean)&&sum!==cl.sum)return true;
    }
    return false;
  }
  function skyscraperFamilyConflict(v,grid,r,c){var clues=(v.data&&v.data.clues)||[];for(var i=0;i<clues.length;i+=1){var cl=clues[i];if((cl.axis==='row'&&cl.index!==r)||(cl.axis==='col'&&cl.index!==c))continue;var line=skyscraperLine(grid,cl);if(!line.every(Boolean))continue;if(v.kind==='skyscrapersums'&&skyscraperVisibleSum(line)!==cl.sum)return true;if(v.kind==='skyscraperproduct'&&skyscraperVisibleProduct(line)!==cl.product)return true;if(v.kind==='skyscrapermixed'&&skyscraperVisibleCount(line)!==cl.value&&line[0]!==cl.value)return true;if((v.kind==='skyscrapernontouching'||v.kind==='killerskyscrapers')&&skyscraperVisibleCount(line)!==cl.count)return true;}return false;}


  function sightlineConflict(v,grid,r,c){var clues=(v.data&&v.data.sightClues)||[];for(var i=0;i<clues.length;i+=1){var cl=clues[i],touch=(cl.source&&cl.source[0]===r&&cl.source[1]===c)||(cl.cells||[]).some(function(p){return p[0]===r&&p[1]===c;});if(!touch)continue;var line=cl.cells.map(function(p){return grid[p[0]][p[1]];});if(!line.every(Boolean))continue;var count=skyscraperVisibleCount(line);if(kindIs(v,'insideskyscrapers')){var sv=grid[cl.source[0]][cl.source[1]];if(sv&&count!==sv)return true;}else if(kindIs(v,'diagonalskyscrapers')&&count!==cl.count)return true;}return false;}
  function dominoSkyscraperConflict(v,grid,r,c){
    var clues=(v.data&&v.data.clues)||[],i;
    for(i=0;i<clues.length;i+=1){var cl=clues[i];if((cl.axis==='row'&&cl.index!==r)||(cl.axis==='col'&&cl.index!==c))continue;var line=skyscraperLine(grid,cl);if(line.every(Boolean)&&skyscraperVisibleCount(line)!==cl.count)return true;}
    var dominoes=(v.data&&v.data.dominoes)||[],target=null;
    for(i=0;i<dominoes.length;i+=1){var dm=dominoes[i],a=grid[dm[0][0]][dm[0][1]],b=grid[dm[1][0]][dm[1][1]];if(a&&b){var sum=a+b;if(target===null)target=sum;else if(sum!==target)return true;}}
    return false;
  }
  function parkVisibleCount(line,parkValue){var max=0,count=0;for(var i=0;i<line.length;i+=1){var v=line[i];if(v===parkValue)continue;if(v>max){max=v;count+=1;}}return count;}
  function parkVisibleSum(line,parkValue){var max=0,sum=0;for(var i=0;i<line.length;i+=1){var v=line[i];if(v===parkValue)continue;if(v>max){max=v;sum+=v;}}return sum;}
  function parkConflict(v,grid,r,c){var clues=(v.data&&v.data.clues)||[],park=(v.data&&v.data.parkValue)||grid.length;for(var i=0;i<clues.length;i+=1){var cl=clues[i];if((cl.axis==='row'&&cl.index!==r)||(cl.axis==='col'&&cl.index!==c))continue;var line=skyscraperLine(grid,cl);if(!line.every(Boolean))continue;if((v.kind==='skyscraperparks'||v.kind==='skyscraperparks2')&&parkVisibleCount(line,park)!==cl.count)return true;if(v.kind==='sumskyscraperparks'&&parkVisibleSum(line,park)!==cl.sum)return true;}return false;}
  function evenOddSkyscraperConflict(v,grid,r,c){var d=v.data||{},pcs=d.parityCells||[],i;for(i=0;i<pcs.length;i++){var pc=pcs[i];if(pc.cell[0]===r&&pc.cell[1]===c){var value=grid[r][c];if(value&&((value%2?'odd':'even')!==pc.parity))return true;break;}}var clues=d.clues||[];for(i=0;i<clues.length;i++){var cl=clues[i];if((cl.axis==='row'&&cl.index!==r)||(cl.axis==='col'&&cl.index!==c))continue;var line=skyscraperLine(grid,cl);if(line.every(Boolean)&&((skyscraperVisibleCount(line)%2?'odd':'even')!==cl.parity))return true;}return false;}

  function classicConflict(grid,r,c,vdef){
    var v=grid[r][c], n=grid.length, i, br,bc,rr,cc,dims=n===6?[2,3]:(n===12?[3,4]:(n===16?[4,4]:[Math.sqrt(n)|0,Math.sqrt(n)|0])),boxH=dims[0],boxW=dims[1];
    if(!v)return false;
    if(kindIs(vdef,'skyscraperparks2')&&vdef.data&&v===vdef.data.parkValue){var rowParks=0,colParks=0;for(i=0;i<n;i+=1){if(grid[r][i]===v)rowParks+=1;if(grid[i][c]===v)colParks+=1;}if(rowParks>(vdef.data.parksPerLine||2)||colParks>(vdef.data.parksPerLine||2))return true;}
    else if(kindIs(vdef,'doubleskyscrapers')){var rowCopies=0,colCopies=0,maxCopies=(vdef.data&&vdef.data.copiesPerLine)||2;for(i=0;i<n;i+=1){if(grid[r][i]===v)rowCopies+=1;if(grid[i][c]===v)colCopies+=1;}if(rowCopies>maxCopies||colCopies>maxCopies)return true;}
    else for(i=0;i<n;i+=1){if(i!==c&&grid[r][i]===v)return true;if(i!==r&&grid[i][c]===v)return true;}
    if(!(vdef.data&&vdef.data.latinOnly)&&!kindIs(vdef,'jigsaw')&&!kindIs(vdef,'skyscraperparks')&&!kindIs(vdef,'sumskyscraperparks')&&!kindIs(vdef,'skyscraperparks2')&&!kindIs(vdef,'dominoskyscrapers')&&!kindIs(vdef,'evenoddskyscrapers')&&!kindIs(vdef,'toroidalskyscrapers')&&!kindIs(vdef,'doubleskyscrapers')){br=Math.floor(r/boxH)*boxH;bc=Math.floor(c/boxW)*boxW;for(rr=br;rr<br+boxH;rr+=1)for(cc=bc;cc<bc+boxW;cc+=1)if((rr!==r||cc!==c)&&grid[rr][cc]===v)return true;}
    return false;
  }

  function doubleSkyscraperConflict(v,grid,r,c){var clues=(v.data&&v.data.clues)||[];for(var i=0;i<clues.length;i++){var cl=clues[i];if((cl.axis==='row'&&cl.index!==r)||(cl.axis==='col'&&cl.index!==c))continue;var line=skyscraperLine(grid,cl);if(line.every(Boolean)&&skyscraperVisibleCount(line)!==cl.count)return true;}return false;}

  function toroidalSkyscraperConflict(v,grid,r,c){
    var d=v.data||{},clues=d.toroidalClues||[],clueValue=d.clueValue||grid.length;
    if(grid[r][c]===clueValue)return false;
    for(var i=0;i<clues.length;i++){var cl=clues[i];if(!cl.cells.some(function(p){return p[0]===r&&p[1]===c;}))continue;var line=cl.cells.map(function(p){return grid[p[0]][p[1]];});if(line.every(Boolean)&&skyscraperVisibleCount(line)!==cl.count)return true;}
    return false;
  }

  function variantConflict(v,grid,r,c){
    if(Array.isArray(v.kinds) && !v._singleKind){
      for(var ki=0;ki<v.kinds.length;ki+=1){var sub=Object.assign({},v,{kind:v.kinds[ki],_singleKind:true});if(variantConflict(sub,grid,r,c))return true;}
      return false;
    }
    var val=grid[r][c], d=v.data||{}, n=grid.length, i,j,a,b,x,y,vals,lo,hi,rr,cc;
    if(!val)return false;
    if(v.kind==='diagonal'){
      if(r===c)for(i=0;i<n;i+=1)if(i!==r&&grid[i][i]===val)return true;
      if(r+c===n-1)for(i=0;i<n;i+=1)if(i!==r&&grid[i][n-1-i]===val)return true;
    }
    if(v.kind==='hyper'){
      [[1,1],[1,5],[5,1],[5,5]].forEach(function(s){if(s[0]<=r&&r<s[0]+3&&s[1]<=c&&c<s[1]+3){for(var rr=s[0];rr<s[0]+3;rr+=1)for(var cc=s[1];cc<s[1]+3;cc+=1)if((rr!==r||cc!==c)&&grid[rr][cc]===val)x=true;}});if(x)return true;
    }
    if(v.kind==='anti-knight'){
      for(i=0;i<8;i+=1){a=[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]][i];x=r+a[0];y=c+a[1];if(x>=0&&y>=0&&x<n&&y<n&&grid[x][y]===val)return true;}
    }
    if(v.kind==='anti-king'){
      for(i=-1;i<=1;i+=1)for(j=-1;j<=1;j+=1)if(i||j){x=r+i;y=c+j;if(x>=0&&y>=0&&x<n&&y<n&&grid[x][y]===val)return true;}
    }
    if(v.kind==='anti-queen'&&val===(d.digit||9)){for(i=0;i<n;i+=1)for(j=0;j<n;j+=1)if((i!==r||j!==c)&&grid[i][j]===val&&Math.abs(i-r)===Math.abs(j-c))return true;}
    if(v.kind==='battenburg'){
      for(var jr=Math.max(1,r);jr<=Math.min(n-1,r+1);jr+=1)for(var jc=Math.max(1,c);jc<=Math.min(n-1,c+1);jc+=1){
        vals=[grid[jr-1][jc-1],grid[jr-1][jc],grid[jr][jc-1],grid[jr][jc]];if(!vals.every(Boolean))continue;
        var checker=(vals[0]%2)===(vals[3]%2)&&(vals[1]%2)===(vals[2]%2)&&(vals[0]%2)!==(vals[1]%2);
        var marked=(d.battenburg||[]).some(function(p){return p[0]===jr&&p[1]===jc;});if(checker!==marked)return true;
      }
    }
    if(v.kind==='reflection'&&d.reflectionGroups){for(i=0;i<d.reflectionGroups.length;i+=1){var rg=d.reflectionGroups[i],rl=rg.lines||[];for(var li=0;li<rl.length;li+=1)for(var pos=0;pos<rl[li].length;pos+=1){var here=rl[li][pos];if(here[0]!==r||here[1]!==c)continue;for(var lj=0;lj<rl.length;lj+=1){if(lj===li||pos>=rl[lj].length)continue;var peer=rl[lj][pos],pv=grid[peer[0]][peer[1]];if(pv&&pv!==val)return true;}}}}
    if(v.kind==='slingshot'&&d.slingshots){for(i=0;i<d.slingshots.length;i+=1){var sh=d.slingshots[i],sc=sh.cell,src=sh.source,dist=grid[sc[0]][sc[1]];if(!dist)continue;var tr=sc[0]+sh.dir[0]*dist,tc=sc[1]+sh.dir[1]*dist;if(tr<0||tc<0||tr>=n||tc>=n)return true;if(!((sc[0]===r&&sc[1]===c)||(src[0]===r&&src[1]===c)||(tr===r&&tc===c)))continue;var sv=grid[src[0]][src[1]],tv=grid[tr][tc];if(sv&&tv&&sv!==tv)return true;}}
    if(v.kind==='axia'&&d.axia){for(i=0;i<d.axia.length;i+=1){var ac=d.axia[i],av=grid[ac[0]][ac[1]];if(!av)continue;if(ac[0]===r&&ac[1]===c){for(var adr=-1;adr<=1;adr+=2)for(var adc=-1;adc<=1;adc+=2)for(var ak=1;;ak+=1){var arr=ac[0]+adr*ak,arc=ac[1]+adc*ak;if(arr<0||arr>=n||arc<0||arc>=n)break;if(grid[arr][arc]===av)return true;}}else if(Math.abs(r-ac[0])===Math.abs(c-ac[1])&&val===av)return true;}}
    if(v.kind==='couples'&&d.couples){for(i=0;i<d.couples.length;i+=1){var cp=d.couples[i];if(!((cp.a[0]===r&&cp.a[1]===c)||(cp.b[0]===r&&cp.b[1]===c)))continue;var cva=grid[cp.a[0]][cp.a[1]],cvb=grid[cp.b[0]][cp.b[1]];if(cva&&cvb&&(((cva%2)===(cvb%2))!==!!cp.same))return true;}}
    if(v.kind==='bishopsgate'){var bp=(d.parity==null?0:d.parity);if(((r+c)&1)===bp){for(var bdr=-1;bdr<=1;bdr+=2)for(var bdc=-1;bdc<=1;bdc+=2)for(var bk=1;;bk+=1){var brr=r+bdr*bk,bcc=c+bdc*bk;if(brr<0||brr>=n||bcc<0||bcc>=n)break;if(grid[brr][bcc]===val)return true;}}}
    if(v.kind==='minmax'&&d.extrema){for(i=0;i<d.extrema.length;i+=1){var ex=d.extrema[i],er=ex.cell[0],ec=ex.cell[1];if(Math.abs(er-r)+Math.abs(ec-c)>1)continue;var ev=grid[er][ec];if(!ev)continue;var ed=[[-1,0],[1,0],[0,-1],[0,1]];for(j=0;j<ed.length;j+=1){var enr=er+ed[j][0],enc=ec+ed[j][1];if(enr<0||enr>=n||enc<0||enc>=n)continue;var env=grid[enr][enc];if(!env)continue;if(ex.type==='min'&&ev>=env)return true;if(ex.type==='max'&&ev<=env)return true;}}}
    if(v.kind==='runningcells'&&outsideCountConflict(v,grid,r,c,runningCellCount))return true;
    if(v.kind==='ascendingsequences'&&outsideCountConflict(v,grid,r,c,ascendingSequenceCount))return true;
    if(v.kind==='evensandwich'&&d.clues){for(i=0;i<d.clues.length;i+=1){var es=d.clues[i];if((es.axis==='row'&&es.index!==r)||(es.axis==='col'&&es.index!==c))continue;var el=es.axis==='row'?grid[es.index].slice():grid.map(function(row){return row[es.index];});var ee=es.digits||[];for(j=0;j<el.length;j+=1){var em=el[j];if(!em)continue;var listed=ee.indexOf(em)>=0;if(j===0||j===el.length-1){if(listed)return true;continue;}var ea=el[j-1],eb=el[j+1];if(listed){if((ea&&ea%2===1)||(eb&&eb%2===1))return true;}else if(ea&&eb&&ea%2===0&&eb%2===0)return true;}}}
    if(v.kind==='topheavyparity'){if(r>0){var thUp=grid[r-1][c];if(thUp&&thUp%2===val%2&&thUp<=val)return true;}if(r<n-1){var thDown=grid[r+1][c];if(thDown&&thDown%2===val%2&&val<=thDown)return true;}}
    if((v.kind==='skyscrapersums'||v.kind==='skyscraperproduct'||v.kind==='skyscrapermixed'||v.kind==='skyscrapernontouching'||v.kind==='killerskyscrapers')&&skyscraperFamilyConflict(v,grid,r,c))return true;
    if(v.kind==='killerskyscrapers'&&d.cages){for(i=0;i<d.cages.length;i+=1){a=d.cages[i];if(!a.cells.some(function(p){return p[0]===r&&p[1]===c;}))continue;vals=a.cells.map(function(p){return grid[p[0]][p[1]];}).filter(Boolean);if(new Set(vals).size!==vals.length||vals.reduce(function(sum,z){return sum+z;},0)>a.sum)return true;if(vals.length===a.cells.length&&vals.reduce(function(sum,z){return sum+z;},0)!==a.sum)return true;}}
    if((v.kind==='skyscraperparks'||v.kind==='sumskyscraperparks'||v.kind==='skyscraperparks2')&&parkConflict(v,grid,r,c))return true;
    if(v.kind==='evenoddskyscrapers'&&evenOddSkyscraperConflict(v,grid,r,c))return true;
    if(v.kind==='toroidalskyscrapers'&&toroidalSkyscraperConflict(v,grid,r,c))return true;
    if(v.kind==='doubleskyscrapers'&&doubleSkyscraperConflict(v,grid,r,c))return true;
    if((kindIs(v,'insideskyscrapers')||kindIs(v,'diagonalskyscrapers'))&&sightlineConflict(v,grid,r,c))return true;
    if(v.kind==='skyscrapernontouching'){for(var nsdr=-1;nsdr<=1;nsdr+=2)for(var nsdc=-1;nsdc<=1;nsdc+=2){var nsr=r+nsdr,nsc=c+nsdc;if(nsr>=0&&nsr<n&&nsc>=0&&nsc<n&&grid[nsr][nsc]===val)return true;}}
    if(v.kind==='nonconsecutive'){
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(o){x=r+o[0];y=c+o[1];if(x>=0&&y>=0&&x<n&&y<n&&grid[x][y]&&Math.abs(grid[x][y]-val)===1)a=true;});if(a)return true;
    }
    if(v.kind==='parity'){
      x=d[rcKey(r,c)];if((x==='odd'&&val%2===0)||(x==='even'&&val%2===1))return true;
    }
    if(d.edges){
      for(i=0;i<d.edges.length;i+=1){a=d.edges[i];if(!((a.a[0]===r&&a.a[1]===c)||(a.b[0]===r&&a.b[1]===c)))continue;x=grid[a.a[0]][a.a[1]];y=grid[a.b[0]][a.b[1]];if(!x||!y)continue;
        if(v.kind==='kropki'&&((a.type==='white'&&Math.abs(x-y)!==1)||(a.type==='black'&&Math.max(x,y)!==2*Math.min(x,y))))return true;
        if(v.kind==='xv'&&x+y!==a.sum)return true;
        if(v.kind==='consecutive'&&Math.abs(x-y)!==1)return true;
        if(v.kind==='greater'&&!((a.op==='>'&&x>y)||(a.op==='<'&&x<y)))return true;
      }
    }
    if(v.kind==='thermo'&&d.thermos){for(i=0;i<d.thermos.length;i+=1){a=d.thermos[i];for(j=0;j<a.length-1;j+=1){x=grid[a[j][0]][a[j][1]];y=grid[a[j+1][0]][a[j+1][1]];if(x&&y&&x>=y&&((a[j][0]===r&&a[j][1]===c)||(a[j+1][0]===r&&a[j+1][1]===c)))return true;}}}
    if(v.kind==='arrow'&&d.arrows){for(i=0;i<d.arrows.length;i+=1){a=d.arrows[i];if(!(a.circle[0]===r&&a.circle[1]===c)&&!a.path.some(function(p){return p[0]===r&&p[1]===c;}))continue;x=grid[a.circle[0]][a.circle[1]];vals=a.path.map(function(p){return grid[p[0]][p[1]];});if(x&&vals.every(Boolean)&&vals.reduce(function(s,z){return s+z;},0)!==x)return true;}}
    if(v.kind==='killer'&&d.cages){for(i=0;i<d.cages.length;i+=1){a=d.cages[i];if(!a.cells.some(function(p){return p[0]===r&&p[1]===c;}))continue;vals=a.cells.map(function(p){return grid[p[0]][p[1]];}).filter(Boolean);if(new Set(vals).size!==vals.length||vals.reduce(function(s,z){return s+z;},0)>a.sum)return true;}}
    if(v.kind==='renban'&&d.lines){for(i=0;i<d.lines.length;i+=1){a=d.lines[i];if(!a.some(function(p){return p[0]===r&&p[1]===c;}))continue;vals=a.map(function(p){return grid[p[0]][p[1]];}).filter(Boolean);if(new Set(vals).size!==vals.length||(vals.length&&Math.max.apply(null,vals)-Math.min.apply(null,vals)>=a.length))return true;}}
    if(v.kind==='whispers'&&d.lines){for(i=0;i<d.lines.length;i+=1){a=d.lines[i];for(j=0;j<a.length-1;j+=1){x=grid[a[j][0]][a[j][1]];y=grid[a[j+1][0]][a[j+1][1]];if(x&&y&&Math.abs(x-y)<5&&((a[j][0]===r&&a[j][1]===c)||(a[j+1][0]===r&&a[j+1][1]===c)))return true;}}}
    if(v.kind==='between'&&d.lines){for(i=0;i<d.lines.length;i+=1){a=d.lines[i].cells;if(!a.some(function(p){return p[0]===r&&p[1]===c;}))continue;x=grid[a[0][0]][a[0][1]];y=grid[a[a.length-1][0]][a[a.length-1][1]];if(x&&y){lo=Math.min(x,y);hi=Math.max(x,y);for(j=1;j<a.length-1;j+=1){var z=grid[a[j][0]][a[j][1]];if(z&&!(z>lo&&z<hi))return true;}}}}
    if(['palindrome','parityline','entropic','modular','slowthermo'].indexOf(v.kind)!==-1&&d.lines){for(i=0;i<d.lines.length;i+=1){a=Array.isArray(d.lines[i])?d.lines[i]:d.lines[i].cells;if(!a.some(function(p){return p[0]===r&&p[1]===c;}))continue;vals=a.map(function(p){return grid[p[0]][p[1]];});if(v.kind==='palindrome')for(j=0;j<Math.floor(vals.length/2);j+=1)if(vals[j]&&vals[vals.length-1-j]&&vals[j]!==vals[vals.length-1-j])return true;if(v.kind==='parityline')for(j=0;j<vals.length-1;j+=1)if(vals[j]&&vals[j+1]&&(vals[j]%2)===(vals[j+1]%2))return true;if(v.kind==='entropic')for(j=0;j<=vals.length-3;j+=1)if(vals.slice(j,j+3).every(Boolean)&&new Set(vals.slice(j,j+3).map(function(z){return Math.floor((z-1)/3);})).size!==3)return true;if(v.kind==='modular')for(j=0;j<=vals.length-3;j+=1)if(vals.slice(j,j+3).every(Boolean)&&new Set(vals.slice(j,j+3).map(function(z){return z%3;})).size!==3)return true;if(v.kind==='slowthermo')for(j=0;j<vals.length-1;j+=1)if(vals[j]&&vals[j+1]&&(vals[j+1]<vals[j]||vals[j+1]-vals[j]>1))return true;}}
    if(v.kind==='regionsum'&&d.lines){for(i=0;i<d.lines.length;i+=1){a=d.lines[i];if(!a.some(function(p){return p[0]===r&&p[1]===c;}))continue;if(!root.RegionSumSegments.valid(grid,a))return true;}}
    if(v.kind==='quadruple'&&d.quads){for(i=0;i<d.quads.length;i+=1){a=d.quads[i];if(!a.cells.some(function(p){return p[0]===r&&p[1]===c;}))continue;vals=a.cells.map(function(p){return grid[p[0]][p[1]];});if(vals.every(Boolean)){var need=a.digits.slice().sort().join(',');if(vals.slice().sort().join(',')!==need)return true;}}}
    if(v.kind==='quadsums'&&d.quadSums){for(i=0;i<d.quadSums.length;i+=1){a=d.quadSums[i];var qc=[[a[0]-1,a[1]-1],[a[0]-1,a[1]],[a[0],a[1]-1],[a[0],a[1]]];if(!qc.some(function(p){return p[0]===r&&p[1]===c;}))continue;vals=qc.map(function(p){return grid[p[0]][p[1]];});if(vals.every(Boolean)){var total=vals.reduce(function(sum,z){return sum+z;},0);if(!vals.some(function(z){return z*2===total;}))return true;}}}
    if(kindIs(v,'clone')&&d.clones&&d.clones.length===2){for(i=0;i<d.clones[0].length;i+=1){a=d.clones[0][i];b=d.clones[1][i];x=grid[a[0]][a[1]];y=grid[b[0]][b[1]];if(x&&y&&x!==y&&((a[0]===r&&a[1]===c)||(b[0]===r&&b[1]===c)))return true;}}
    if(v.kind==='xsums'&&d.clues){for(i=0;i<d.clues.length;i+=1){a=d.clues[i];var seq=a.axis==='row'?grid[a.index].slice():grid.map(function(row){return row[a.index];});if(a.side==='right'||a.side==='bottom')seq.reverse();x=seq[0];if(x&&seq.slice(0,x).every(Boolean)&&seq.slice(0,x).reduce(function(s,z){return s+z;},0)!==a.sum)return true;}}
    if(v.kind==='rossini'&&d.clues){for(i=0;i<d.clues.length;i+=1){a=d.clues[i];var rs=a.axis==='row'?grid[a.index].slice():grid.map(function(row){return row[a.index];});if(a.side==='right'||a.side==='bottom')rs.reverse();rs=rs.slice(0,3);if(rs.every(Boolean)){var inc=rs[0]<rs[1]&&rs[1]<rs[2],dec=rs[0]>rs[1]&&rs[1]>rs[2];if((a.dir==='inc'&&!inc)||(a.dir==='dec'&&!dec))return true;}}}
    if(kindIs(v,'fortress')&&d.cells){var marked={};d.cells.forEach(function(p){marked[p[0]+','+p[1]]=1;});for(i=0;i<d.cells.length;i+=1){a=d.cells[i];if(!(a[0]===r&&a[1]===c)&&Math.abs(a[0]-r)+Math.abs(a[1]-c)!==1)continue;x=grid[a[0]][a[1]];if(!x)continue;[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(o){var rr=a[0]+o[0],cc=a[1]+o[1];if(rr>=0&&cc>=0&&rr<n&&cc<n&&!marked[rr+','+cc]&&grid[rr][cc]&&x<=grid[rr][cc])y=true;});if(y)return true;}}
    if(v.kind==='zipper'&&d.lines){for(i=0;i<d.lines.length;i+=1){a=d.lines[i].cells;var mid=(a.length-1)/2,center=grid[a[mid][0]][a[mid][1]];for(j=0;j<mid;j+=1){x=grid[a[j][0]][a[j][1]];y=grid[a[a.length-1-j][0]][a[a.length-1-j][1]];if(center&&x&&y&&x+y!==center)return true;}}}
    if(v.kind==='dutchwhispers'&&d.lines){for(i=0;i<d.lines.length;i+=1){a=d.lines[i];for(j=0;j<a.length-1;j+=1){x=grid[a[j][0]][a[j][1]];y=grid[a[j+1][0]][a[j+1][1]];if(x&&y&&Math.abs(x-y)<4&&((a[j][0]===r&&a[j][1]===c)||(a[j+1][0]===r&&a[j+1][1]===c)))return true;}}}
    if(v.kind==='nabner'&&d.lines){for(i=0;i<d.lines.length;i+=1){a=d.lines[i];if(!a.some(function(p){return p[0]===r&&p[1]===c;}))continue;vals=a.map(function(p){return grid[p[0]][p[1]];}).filter(Boolean);for(j=0;j<vals.length;j+=1)for(var nj=j+1;nj<vals.length;nj+=1)if(Math.abs(vals[j]-vals[nj])<2)return true;}}
    if(v.kind==='lockout'&&d.lines){for(i=0;i<d.lines.length;i+=1){a=d.lines[i].cells;if(!a.some(function(p){return p[0]===r&&p[1]===c;}))continue;x=grid[a[0][0]][a[0][1]];y=grid[a[a.length-1][0]][a[a.length-1][1]];if(x&&y){if(x===y)return true;lo=Math.min(x,y);hi=Math.max(x,y);for(j=1;j<a.length-1;j+=1){var lv=grid[a[j][0]][a[j][1]];if(lv&&lv>lo&&lv<hi)return true;}}}}
    if(v.kind==='frame'&&d.clues){for(i=0;i<d.clues.length;i+=1){a=d.clues[i];var fs=a.axis==='row'?grid[a.index].slice():grid.map(function(row){return row[a.index];});if(a.side==='right'||a.side==='bottom')fs.reverse();fs=fs.slice(0,3);if(fs.every(Boolean)&&fs.reduce(function(sum,z){return sum+z;},0)!==a.sum)return true;}}
    if(kindIs(v,'extracells')&&d.cells){if(d.cells.some(function(p){return p[0]===r&&p[1]===c;})){vals=d.cells.map(function(p){return grid[p[0]][p[1]];}).filter(Boolean);if(new Set(vals).size!==vals.length)return true;}}

    if(v.kind==='jigsaw'&&d.regions){var rg=d.regions[r][c];for(rr=0;rr<n;rr+=1)for(cc=0;cc<n;cc+=1)if((rr!==r||cc!==c)&&d.regions[rr][cc]===rg&&grid[rr][cc]===val)return true;}
    if(v.kind==='uniqueline'&&d.lines){for(i=0;i<d.lines.length;i+=1){a=d.lines[i];if(a.some(function(p){return p[0]===r&&p[1]===c;})){vals=a.map(function(p){return grid[p[0]][p[1]];}).filter(Boolean);if(new Set(vals).size!==vals.length)return true;}}}
    if(v.kind==='magicsquare'&&d.cells){if(r>=3&&r<=5&&c>=3&&c<=5){var mg=[];for(rr=3;rr<=5;rr++)mg.push(grid[rr].slice(3,6));if(mg.flat().every(Boolean)){for(i=0;i<3;i++)if(mg[i].reduce(function(s,z){return s+z;},0)!==15||mg.map(function(row){return row[i];}).reduce(function(s,z){return s+z;},0)!==15)return true;if(mg[0][0]+mg[1][1]+mg[2][2]!==15||mg[0][2]+mg[1][1]+mg[2][0]!==15)return true;}}}
    if(v.kind==='sukaku'&&d.candidates&&d.candidates[r]&&d.candidates[r][c]&&d.candidates[r][c].indexOf(val)===-1)return true;
    if(v.kind==='disjoint'){var pr=r%3,pc=c%3;for(var br2=0;br2<3;br2++)for(var bc2=0;bc2<3;bc2++){var rr2=br2*3+pr,cc2=bc2*3+pc;if((rr2!==r||cc2!==c)&&grid[rr2][cc2]===val)return true;}}
    if(kindIs(v,'littlekiller')&&littleKillerConflict(v,grid,r,c))return true;
    if(v.kind==='sandwich'&&d.clues){
      for(i=0;i<d.clues.length;i+=1){
        var scl=d.clues[i];
        if((scl.axis==='row'&&scl.index!==r)||(scl.axis==='col'&&scl.index!==c))continue;
        var sl=scl.axis==='row'?grid[scl.index].slice():grid.map(function(row){return row[scl.index];});
        var sp1=sl.indexOf(1),sp9=sl.indexOf(9);
        if(sp1<0||sp9<0)continue;
        var sslo=Math.min(sp1,sp9),sshi=Math.max(sp1,sp9);
        var sins=sl.slice(sslo+1,sshi);
        var ssum=sins.reduce(function(sum,z){return sum+(z||0);},0);
        if(ssum>scl.sum)return true;
        if(sins.every(Boolean)&&ssum!==scl.sum)return true;
      }
    }
    if(v.kind==='dominoskyscrapers'&&dominoSkyscraperConflict(v,grid,r,c))return true;
    if((v.kind==='numberedrooms'||v.kind==='nexttonine')&&d.clues){for(i=0;i<d.clues.length;i+=1){var oc=d.clues[i];if((oc.axis==='row'&&oc.index!==r)||(oc.axis==='col'&&oc.index!==c))continue;var ol=oc.axis==='row'?grid[oc.index].slice():grid.map(function(row){return row[oc.index];});if(oc.side==='right'||oc.side==='bottom')ol.reverse();if(v.kind==='numberedrooms'){var on=ol[0];if(on&&ol[on-1]&&ol[on-1]!==oc.digit)return true;}else{var op=ol.indexOf(9);if(op>=0){var oe=oc.digits||[],os=[];if(op>0&&ol[op-1])os.push(ol[op-1]);if(op<ol.length-1&&ol[op+1])os.push(ol[op+1]);for(j=0;j<os.length;j+=1)if(oe.indexOf(os[j])<0)return true;var need=(op===0||op===ol.length-1)?1:2;if(os.length===need){os.sort(function(a,b){return a-b;});if(os.length!==oe.length)return true;for(j=0;j<os.length;j+=1)if(os[j]!==oe[j])return true;}}}}}
    return false;
  }

  function svgLine(svg, points, cls, circleStart){
    var pts=points.map(function(p){return ((p[1]+.5)*100/9)+','+((p[0]+.5)*100/9);}).join(' ');
    var line=document.createElementNS('http://www.w3.org/2000/svg','polyline');line.setAttribute('points',pts);line.setAttribute('class',cls);svg.appendChild(line);
    if(circleStart){var c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx',(points[0][1]+.5)*100/9);c.setAttribute('cy',(points[0][0]+.5)*100/9);c.setAttribute('r','4.0');c.setAttribute('class',cls+'-bulb');svg.appendChild(c);}
  }



  function mountMasyu(host,v,api){
    var I=root.SudokuI18n,n=v.puzzle.length,edges=[],r,c;for(r=0;r<n;r++)for(c=0;c<n;c++){if(c+1<n)edges.push({a:[r,c],b:[r,c+1]});if(r+1<n)edges.push({a:[r,c],b:[r+1,c]});}var marks=Array(edges.length).fill(0),moves=0,edgeEls=[];
    var board=LR.el('div',{className:'masyu-board',role:'group','aria-label':(I?I.variant(v).title:v.title)+' board'});board.style.setProperty('--masyu-size',n);host.appendChild(board);
    function masyuClueLabel(kind,r,c){if(!kind)return '';var color=kind==='b'?(I&&I.lang==='hu'?'fekete':'black'):(I&&I.lang==='hu'?'fehér':'white');return (I&&I.lang==='hu'?'Masyu '+color+' kör':'Masyu '+color+' circle')+', '+(r+1)+'. '+(I&&I.lang==='hu'?'sor, ':'row, ')+(c+1)+'. '+(I&&I.lang==='hu'?'oszlop':'column');}
    var clueEls=[];
    for(r=0;r<n;r++)for(c=0;c<n;c++){var clue=v.puzzle[r][c],dot=LR.el('span',{className:'masyu-node '+(clue==='b'?'black':clue==='w'?'white':'')});dot.style.left=((c+.5)*100/n)+'%';dot.style.top=((r+.5)*100/n)+'%';if(clue==='b'||clue==='w'){dot.setAttribute('role','img');dot.setAttribute('aria-label',masyuClueLabel(clue,r,c));clueEls.push({el:dot,kind:clue,r:r,c:c});}else dot.setAttribute('aria-hidden','true');board.appendChild(dot);}
    function solved(){for(var i=0;i<marks.length;i++)if((marks[i]===1?1:0)!==v.solution[i])return false;return true;}
    function render(){edgeEls.forEach(function(el,i){el.classList.toggle('on',marks[i]===1);el.classList.toggle('off',marks[i]===2);el.setAttribute('aria-pressed',marks[i]===1?'true':'false');el.setAttribute('aria-label',(I&&I.lang==='hu'?'Hurokszakasz ':'Loop segment ')+(i+1)+', '+(marks[i]===1?(I&&I.lang==='hu'?'vonal':'line'):(marks[i]===2?'X':(I&&I.lang==='hu'?'üres':'empty'))));});}
    edges.forEach(function(e,i){var horiz=e.a[0]===e.b[0],el=LR.el('button',{type:'button',className:'masyu-edge '+(horiz?'horizontal':'vertical'),onclick:function(){marks[i]=(marks[i]+1)%3;moves++;api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');render();if(solved()){api.setStatus(I&&I.lang==='hu'?'Megoldva!':'Solved!');api.complete({moves:moves});}}});if(horiz){el.style.left=((e.a[1]+.5)*100/n)+'%';el.style.top=((e.a[0]+.5)*100/n)+'%';el.style.width=(100/n)+'%';}else{el.style.left=((e.a[1]+.5)*100/n)+'%';el.style.top=((e.a[0]+.5)*100/n)+'%';el.style.height=(100/n)+'%';}edgeEls.push(el);board.appendChild(el);});
    var hint=LR.el('p',{className:'masyu-hint',text:I&&I.lang==='hu'?'Kattints egy szakaszra: vonal → X → üres. A fehér körön egyenesen haladj át, a fekete körben fordulj.':'Click a segment: line → X → empty. Go straight through white circles and turn at black circles.'});host.appendChild(hint);var tools=LR.el('div',{className:'sudoku-tools masyu-tools'});tools.appendChild(LR.el('button',{type:'button',className:'tool-button clear-masyu-button',text:I&&I.lang==='hu'?'Jelölések törlése':'Clear marks',onclick:function(){marks.fill(0);moves++;api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');render();}}));tools.appendChild(LR.el('button',{type:'button',className:'tool-button check-button',text:I?I.t('check'):'Check',onclick:function(){var wrong=0;for(var i=0;i<marks.length;i++)if(marks[i]&&((marks[i]===1?1:0)!==v.solution[i]))wrong++;api.toast(wrong?(I&&I.lang==='hu'?'Van még javítandó szakasz.':'Some segments still need attention.'):(I&&I.lang==='hu'?'Az eddigi jelölések rendben vannak.':'Current marks look good.'));}}));api.tools.appendChild(tools);render();api.setStatus(I&&I.lang==='hu'?'Készen áll':'Ready');api.setCounter(0,I&&I.lang==='hu'?'Lépések':'Moves');return {moves:function(){return moves;},refreshLanguage:function(){board.setAttribute('aria-label',(I?I.variant(v).title:v.title)+' board');clueEls.forEach(function(q){q.el.setAttribute('aria-label',masyuClueLabel(q.kind,q.r,q.c));});hint.textContent=I&&I.lang==='hu'?'Kattints egy szakaszra: vonal → X → üres. A fehér körön egyenesen haladj át, a fekete körben fordulj.':'Click a segment: line → X → empty. Go straight through white circles and turn at black circles.';tools.querySelector('.clear-masyu-button').textContent=I&&I.lang==='hu'?'Jelölések törlése':'Clear marks';tools.querySelector('.check-button').textContent=I?I.t('check'):'Check';render();},destroy:function(){}};
  }

  function mountNonogram(host,v,api){
    var I=root.SudokuI18n,n=v.solution.length,moves=0,marks=Array.from({length:n},function(){return Array(n).fill(0);}),cells=[];
    var shell=LR.el('div',{className:'nonogram-shell'}),corner=LR.el('div',{className:'nonogram-corner','aria-hidden':'true'}),top=LR.el('div',{className:'nonogram-top'}),left=LR.el('div',{className:'nonogram-left'}),board=LR.el('div',{className:'nonogram-board',role:'grid','aria-label':(I?I.variant(v).title:v.title)+' board'});shell.style.setProperty('--nonogram-size',n);shell.appendChild(corner);shell.appendChild(top);shell.appendChild(left);shell.appendChild(board);host.appendChild(shell);
    v.puzzle.cols.forEach(function(cl){top.appendChild(LR.el('div',{className:'nonogram-col-clue',text:cl.join(' ')}));});v.puzzle.rows.forEach(function(cl){left.appendChild(LR.el('div',{className:'nonogram-row-clue',text:cl.join(' ')}));});
    function solved(){for(var r=0;r<n;r++)for(var c=0;c<n;c++)if((marks[r][c]===1?1:0)!==v.solution[r][c])return false;return true;}
    function lineClue(line){var out=[],run=0;line.forEach(function(x){if(x===1)run++;else if(run){out.push(run);run=0;}});if(run)out.push(run);return out.length?out:[0];}function sameClue(a,b){return a.length===b.length&&a.every(function(x,i){return x===b[i];});}
    function render(){cells.forEach(function(el){var r=+el.dataset.r,c=+el.dataset.c;el.classList.toggle('filled',marks[r][c]===1);el.classList.toggle('cross',marks[r][c]===2);el.textContent=marks[r][c]===2?'×':'';el.setAttribute('aria-label',(I&&I.lang==='hu'?'Mező ':'Cell ')+(r+1)+','+(c+1)+' '+(marks[r][c]===1?(I&&I.lang==='hu'?'kitöltött':'filled'):marks[r][c]===2?'X':'empty'));});Array.prototype.forEach.call(left.children,function(el,r){var decided=marks[r].every(function(x){return x!==0;}),done=decided&&sameClue(lineClue(marks[r]),v.puzzle.rows[r]);el.classList.toggle('done',done);});Array.prototype.forEach.call(top.children,function(el,c){var line=[];for(var r=0;r<n;r++)line.push(marks[r][c]);var decided=line.every(function(x){return x!==0;}),done=decided&&sameClue(lineClue(line),v.puzzle.cols[c]);el.classList.toggle('done',done);});}
    for(var r=0;r<n;r++)for(var c=0;c<n;c++){var el=LR.el('button',{type:'button',className:'nonogram-cell',role:'gridcell',onclick:(function(rr,cc){return function(){marks[rr][cc]=(marks[rr][cc]+1)%3;moves++;api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');render();if(solved()){api.setStatus(I&&I.lang==='hu'?'Megoldva!':'Solved!');api.complete({moves:moves});}};})(r,c)});el.dataset.r=r;el.dataset.c=c;cells.push(el);board.appendChild(el);}render();
    var hint=LR.el('p',{className:'nonogram-hint',text:I&&I.lang==='hu'?'Kattints: kitöltött → X → üres. A sor- és oszlopnyomok a kitöltött blokkok hosszát adják sorrendben.':'Click: filled → X → empty. Row and column clues give filled run lengths in order.'});host.appendChild(hint);var tools=LR.el('div',{className:'sudoku-tools nonogram-tools'});tools.appendChild(LR.el('button',{type:'button',className:'tool-button clear-nonogram-button',text:I&&I.lang==='hu'?'Jelölések törlése':'Clear marks',onclick:function(){marks.forEach(function(row){row.fill(0);});moves++;api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');render();}}));tools.appendChild(LR.el('button',{type:'button',className:'tool-button check-button',text:I?I.t('check'):'Check',onclick:function(){var wrong=0;for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(marks[r][c]&&((marks[r][c]===1?1:0)!==v.solution[r][c]))wrong++;api.toast(wrong?(I&&I.lang==='hu'?'Van még javítandó jelölés.':'Some marks still need attention.'):(I&&I.lang==='hu'?'Az eddigi jelölések rendben vannak.':'Current marks look good.'));}}));api.tools.appendChild(tools);api.setStatus(I&&I.lang==='hu'?'Készen áll':'Ready');api.setCounter(0,I&&I.lang==='hu'?'Lépések':'Moves');return {moves:function(){return moves;},refreshLanguage:function(){board.setAttribute('aria-label',(I?I.variant(v).title:v.title)+' board');hint.textContent=I&&I.lang==='hu'?'Kattints: kitöltött → X → üres. A sor- és oszlopnyomok a kitöltött blokkok hosszát adják sorrendben.':'Click: filled → X → empty. Row and column clues give filled run lengths in order.';tools.querySelector('.clear-nonogram-button').textContent=I&&I.lang==='hu'?'Jelölések törlése':'Clear marks';tools.querySelector('.check-button').textContent=I?I.t('check'):'Check';render();},destroy:function(){}};
  }

  function mountNurikabe(host,v,api){
    var I=root.SudokuI18n,n=v.puzzle.length,moves=0,marks=Array.from({length:n},function(){return Array(n).fill(0);});(v.preShaded||[]).forEach(function(q){marks[q[0]][q[1]]=1;});
    var board=LR.el('div',{className:'nurikabe-board',role:'grid','aria-label':(I?I.variant(v).title:v.title)+' board'});board.style.setProperty('--nurikabe-size',n);host.appendChild(board);var cells=[];
    function solved(){for(var r=0;r<n;r++)for(var c=0;c<n;c++)if((marks[r][c]===1?1:0)!==v.solution[r][c])return false;return true;}
    function render(){cells.forEach(function(el){var r=+el.dataset.r,c=+el.dataset.c,cl=v.puzzle[r][c];el.classList.toggle('sea',marks[r][c]===1);el.classList.toggle('white-mark',marks[r][c]===2);el.textContent=cl!=null?String(cl):(marks[r][c]===1?'':(marks[r][c]===2?'•':''));el.setAttribute('aria-label',cl!=null?((I&&I.lang==='hu'?'Sziget ':'Island ')+cl):((I&&I.lang==='hu'?'Mező':'Cell')+' '+(r+1)+','+(c+1)));});}
    for(var r=0;r<n;r++)for(var c=0;c<n;c++){var clue=v.puzzle[r][c]!=null,el=LR.el(clue?'div':'button',clue?{className:'nurikabe-cell clue',role:'gridcell'}:{type:'button',className:'nurikabe-cell',role:'gridcell',onclick:(function(rr,cc){return function(){marks[rr][cc]=(marks[rr][cc]+1)%3;moves++;api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');render();if(solved()){api.setStatus(I&&I.lang==='hu'?'Megoldva!':'Solved!');api.complete({moves:moves});}};})(r,c)});el.dataset.r=r;el.dataset.c=c;cells.push(el);board.appendChild(el);}render();
    var hint=LR.el('p',{className:'nurikabe-hint',text:I&&I.lang==='hu'?'Kattints: tenger → biztos fehér → üres. A fekete tenger legyen összefüggő, 2×2 fekete blokk nélkül.':'Click: sea → confirmed white → empty. Keep one connected black sea with no 2×2 black block.'});host.appendChild(hint);var tools=LR.el('div',{className:'sudoku-tools nurikabe-tools'});tools.appendChild(LR.el('button',{type:'button',className:'tool-button clear-nurikabe-button',text:I&&I.lang==='hu'?'Jelölések törlése':'Clear marks',onclick:function(){marks.forEach(function(row){row.fill(0);});(v.preShaded||[]).forEach(function(q){marks[q[0]][q[1]]=1;});moves++;api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');render();}}));tools.appendChild(LR.el('button',{type:'button',className:'tool-button check-button',text:I?I.t('check'):'Check',onclick:function(){var wrong=0;for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(marks[r][c]&&((marks[r][c]===1?1:0)!==v.solution[r][c]))wrong++;api.toast(wrong?(I&&I.lang==='hu'?'Van még javítandó jelölés.':'Some marks still need attention.'):(I&&I.lang==='hu'?'Az eddigi jelölések rendben vannak.':'Current marks look good.'));}}));api.tools.appendChild(tools);api.setStatus(I&&I.lang==='hu'?'Készen áll':'Ready');api.setCounter(0,I&&I.lang==='hu'?'Lépések':'Moves');return {moves:function(){return moves;},refreshLanguage:function(){board.setAttribute('aria-label',(I?I.variant(v).title:v.title)+' board');hint.textContent=I&&I.lang==='hu'?'Kattints: tenger → biztos fehér → üres. A fekete tenger legyen összefüggő, 2×2 fekete blokk nélkül.':'Click: sea → confirmed white → empty. Keep one connected black sea with no 2×2 black block.';tools.querySelector('.clear-nurikabe-button').textContent=I&&I.lang==='hu'?'Jelölések törlése':'Clear marks';tools.querySelector('.check-button').textContent=I?I.t('check'):'Check';render();},destroy:function(){}};
  }

  function mountAkari(host,v,api){
    var n=v.puzzle.length,marks=Array.from({length:n},function(){return Array(n).fill(0);}),cells=[],moves=0,I=root.SudokuI18n;
    var board=LR.el('div',{className:'akari-board',role:'grid','aria-label':(I?I.variant(v).title:v.title)+' board'});board.style.setProperty('--akari-size',n);host.appendChild(board);
    function isWall(r,c){return v.puzzle[r][c]!==false;}function lit(r,c){if(marks[r][c]===1)return true;var ok=false;[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){var rr=r+d[0],cc=c+d[1];while(rr>=0&&cc>=0&&rr<n&&cc<n&&!isWall(rr,cc)){if(marks[rr][cc]===1)ok=true;rr+=d[0];cc+=d[1];}});return ok;}
    function bulbConflict(r,c){if(marks[r][c]!==1)return false;var conflict=false;[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){var rr=r+d[0],cc=c+d[1];while(rr>=0&&cc>=0&&rr<n&&cc<n&&!isWall(rr,cc)){if(marks[rr][cc]===1)conflict=true;rr+=d[0];cc+=d[1];}});return conflict;}
    function wallState(r,c){var clue=v.puzzle[r][c];if(clue==null)return null;var bulbs=[[r+1,c],[r-1,c],[r,c+1],[r,c-1]].reduce(function(sum,q){return sum+(q[0]>=0&&q[1]>=0&&q[0]<n&&q[1]<n&&marks[q[0]][q[1]]===1?1:0);},0);return {bulbs:bulbs,satisfied:bulbs===clue,conflict:bulbs>clue};}
    function solved(){for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(!isWall(r,c)){if((marks[r][c]===1?1:0)!==v.solution[r][c])return false;}return true;}
    function render(){cells.forEach(function(el){var r=+el.dataset.r,c=+el.dataset.c;if(isWall(r,c)){var ws=wallState(r,c);el.classList.toggle('wall-satisfied',!!(ws&&ws.satisfied));el.classList.toggle('wall-conflict',!!(ws&&ws.conflict));if(ws)el.setAttribute('aria-label',(I&&I.lang==='hu'?'Fal, előírt lámpák: ':'Wall, required bulbs: ')+v.puzzle[r][c]+', '+(I&&I.lang==='hu'?'jelenleg ':'currently ')+ws.bulbs);return;}var conflict=bulbConflict(r,c);el.classList.toggle('bulb',marks[r][c]===1);el.classList.toggle('cross',marks[r][c]===2);el.classList.toggle('lit',lit(r,c));el.classList.toggle('conflict',conflict);el.textContent=marks[r][c]===1?'💡':(marks[r][c]===2?'×':'');el.setAttribute('aria-invalid',conflict?'true':'false');el.setAttribute('aria-label',(r+1)+'. '+(I&&I.lang==='hu'?'sor':'row')+', '+(c+1)+'. '+(I&&I.lang==='hu'?'oszlop':'column')+', '+(marks[r][c]===1?(I&&I.lang==='hu'?(conflict?'ütköző lámpa':'lámpa'):(conflict?'conflicting bulb':'bulb')):(marks[r][c]===2?'X':(I&&I.lang==='hu'?'üres':'empty'))));});}
    for(var r=0;r<n;r++)for(var c=0;c<n;c++){var wall=isWall(r,c),el=LR.el(wall?'div':'button',wall?{className:'akari-cell wall',role:'gridcell',text:v.puzzle[r][c]==null?'':String(v.puzzle[r][c])}:{type:'button',className:'akari-cell',role:'gridcell',onclick:(function(rr,cc){return function(){marks[rr][cc]=(marks[rr][cc]+1)%3;moves++;api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');render();if(solved()){api.setStatus(I&&I.lang==='hu'?'Megoldva!':'Solved!');api.complete({moves:moves});}};})(r,c)});el.dataset.r=r;el.dataset.c=c;cells.push(el);board.appendChild(el);}
    var hint=LR.el('p',{className:'akari-hint',text:I&&I.lang==='hu'?'Kattints egy fehér mezőre: lámpa → X → üres. Minden fehér mezőt világíts meg.':'Click a white cell: bulb → X → empty. Illuminate every white cell.'});host.appendChild(hint);var tools=LR.el('div',{className:'sudoku-tools akari-tools'});tools.appendChild(LR.el('button',{type:'button',className:'tool-button clear-akari-button',text:I&&I.lang==='hu'?'Jelölések törlése':'Clear marks',onclick:function(){marks.forEach(function(row){row.fill(0);});moves++;api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');render();}}));tools.appendChild(LR.el('button',{type:'button',className:'tool-button check-button',text:I?I.t('check'):'Check',onclick:function(){var wrong=0;for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(!isWall(r,c)&&marks[r][c]&&((marks[r][c]===1?1:0)!==v.solution[r][c]))wrong++;api.toast(wrong?(I&&I.lang==='hu'?'Van még javítandó jelölés.':'Some marks still need attention.'):(I&&I.lang==='hu'?'Az eddigi jelölések rendben vannak.':'Current marks look good.'));}}));api.tools.appendChild(tools);render();api.setStatus(I&&I.lang==='hu'?'Készen áll':'Ready');api.setCounter(0,I&&I.lang==='hu'?'Lépések':'Moves');return {moves:function(){return moves;},refreshLanguage:function(){board.setAttribute('aria-label',(I?I.variant(v).title:v.title)+' board');hint.textContent=I&&I.lang==='hu'?'Kattints egy fehér mezőre: lámpa → X → üres. Minden fehér mezőt világíts meg.':'Click a white cell: bulb → X → empty. Illuminate every white cell.';tools.querySelector('.clear-akari-button').textContent=I&&I.lang==='hu'?'Jelölések törlése':'Clear marks';tools.querySelector('.check-button').textContent=I?I.t('check'):'Check';render();},destroy:function(){}};
  }

  function mountSlitherlink(host,v,api){
    var n=v.puzzle.length,edges=(function(){var e=[],r,c;for(r=0;r<=n;r++)for(c=0;c<n;c++)e.push({a:[r,c],b:[r,c+1]});for(r=0;r<n;r++)for(c=0;c<=n;c++)e.push({a:[r,c],b:[r+1,c]});return e;}()),marks=Array(edges.length).fill(0),moves=0,edgeEls=[],I=root.SudokuI18n;
    var board=LR.el('div',{className:'slitherlink-board',role:'group','aria-label':(I?I.variant(v).title:v.title)+' board'});board.style.setProperty('--slither-size',n);host.appendChild(board);
    for(var r=0;r<=n;r++)for(var c=0;c<=n;c++){var dot=LR.el('span',{className:'slither-dot','aria-hidden':'true'});dot.style.left=(c*100/n)+'%';dot.style.top=(r*100/n)+'%';board.appendChild(dot);}
    function slitherClueLabel(value,r,c){return (I&&I.lang==='hu'?'Slitherlink számjelzés ':'Slitherlink clue ')+value+', '+(r+1)+'. '+(I&&I.lang==='hu'?'sor, ':'row, ')+(c+1)+'. '+(I&&I.lang==='hu'?'oszlop':'column');}
    var clueEls=[];
    for(r=0;r<n;r++)for(c=0;c<n;c++)if(v.puzzle[r][c]!=null){var clue=LR.el('span',{className:'slither-clue',text:String(v.puzzle[r][c]),role:'img'});clue.setAttribute('aria-label',slitherClueLabel(v.puzzle[r][c],r,c));clue.style.left=((c+.5)*100/n)+'%';clue.style.top=((r+.5)*100/n)+'%';clueEls.push({el:clue,value:v.puzzle[r][c],r:r,c:c});board.appendChild(clue);}
    function solved(){for(var i=0;i<marks.length;i++)if((marks[i]===1?1:0)!==v.solution[i])return false;return true;}
    function render(){edgeEls.forEach(function(el,i){el.classList.toggle('on',marks[i]===1);el.classList.toggle('off',marks[i]===2);el.setAttribute('aria-pressed',marks[i]===1?'true':'false');el.setAttribute('aria-label',(I&&I.lang==='hu'?'Rácsél ':'Grid edge ')+(i+1)+', '+(marks[i]===1?(I&&I.lang==='hu'?'hurok':'loop'):(marks[i]===2?'X':(I&&I.lang==='hu'?'üres':'empty'))));});}
    edges.forEach(function(e,i){var horiz=e.a[0]===e.b[0],el=LR.el('button',{type:'button',className:'slither-edge '+(horiz?'horizontal':'vertical'),onclick:function(){marks[i]=(marks[i]+1)%3;moves++;api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');render();if(solved()){api.setStatus(I&&I.lang==='hu'?'Megoldva!':'Solved!');api.complete({moves:moves});}}});if(horiz){el.style.left=(e.a[1]*100/n)+'%';el.style.top=(e.a[0]*100/n)+'%';el.style.width=(100/n)+'%';}else{el.style.left=(e.a[1]*100/n)+'%';el.style.top=(e.a[0]*100/n)+'%';el.style.height=(100/n)+'%';}edgeEls.push(el);board.appendChild(el);});
    var hint=LR.el('p',{className:'slitherlink-hint',text:I&&I.lang==='hu'?'Kattints egy élre: hurokvonal → X (nem része) → üres.':'Click an edge: loop line → X (not used) → empty.'});host.appendChild(hint);
    var tools=LR.el('div',{className:'sudoku-tools slitherlink-tools'});tools.appendChild(LR.el('button',{type:'button',className:'tool-button clear-slither-button',text:I&&I.lang==='hu'?'Jelölések törlése':'Clear marks',onclick:function(){marks.fill(0);moves++;api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');render();}}));tools.appendChild(LR.el('button',{type:'button',className:'tool-button check-button',text:I?I.t('check'):'Check',onclick:function(){var wrong=0;for(var i=0;i<marks.length;i++)if(marks[i]&&((marks[i]===1?1:0)!==v.solution[i]))wrong++;api.toast(wrong?(I&&I.lang==='hu'?'Van még javítandó él.':'Some edges still need attention.'):(I&&I.lang==='hu'?'Az eddigi jelölések rendben vannak.':'Current marks look good.'));}}));api.tools.appendChild(tools);render();api.setStatus(I&&I.lang==='hu'?'Készen áll':'Ready');api.setCounter(0,I&&I.lang==='hu'?'Lépések':'Moves');
    return {moves:function(){return moves;},refreshLanguage:function(){board.setAttribute('aria-label',(I?I.variant(v).title:v.title)+' board');clueEls.forEach(function(q){q.el.setAttribute('aria-label',slitherClueLabel(q.value,q.r,q.c));});hint.textContent=I&&I.lang==='hu'?'Kattints egy élre: hurokvonal → X (nem része) → üres.':'Click an edge: loop line → X (not used) → empty.';tools.querySelector('.clear-slither-button').textContent=I&&I.lang==='hu'?'Jelölések törlése':'Clear marks';tools.querySelector('.check-button').textContent=I?I.t('check'):'Check';render();},destroy:function(){}};
  }

  function mountHitori(host,v,api){
    var n=v.puzzle.length,marks=Array.from({length:n},function(){return Array(n).fill(0);}),cells=[],moves=0,selected=[0,0];
    var board=LR.el('div',{className:'hitori-board',role:'grid',tabindex:'0','aria-label':(I?I.variant(v).title:v.title)+' board'});board.style.setProperty('--hitori-size',n);host.appendChild(board);
    function label(r,c){var state=marks[r][c]===1?(I&&I.lang==='hu'?'fekete':'black'):(marks[r][c]===2?(I&&I.lang==='hu'?'biztos fehér':'confirmed white'):(I&&I.lang==='hu'?'jelöletlen':'unmarked'));return (r+1)+'. '+(I&&I.lang==='hu'?'sor':'row')+', '+(c+1)+'. '+(I&&I.lang==='hu'?'oszlop':'column')+', '+v.puzzle[r][c]+', '+state;}
    function render(){for(var r=0;r<n;r++)for(var c=0;c<n;c++){var el=cells[r*n+c];el.classList.toggle('black',marks[r][c]===1);el.classList.toggle('white-mark',marks[r][c]===2);el.classList.toggle('selected',selected[0]===r&&selected[1]===c);el.setAttribute('aria-label',label(r,c));el.setAttribute('aria-pressed',marks[r][c]===1?'true':'false');}}
    function complete(){for(var r=0;r<n;r++)for(var c=0;c<n;c++)if((marks[r][c]===1?1:0)!==v.solution[r][c])return false;return true;}
    function choose(r,c,next){selected=[r,c];cells[r*n+c].classList.remove('checked-wrong');marks[r][c]=next;moves++;api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');render();if(complete()){api.setStatus(I&&I.lang==='hu'?'Megoldva!':'Solved!');api.complete({moves:moves});api.toast(I&&I.lang==='hu'?'Szép munka! A Hitori elkészült.':'Lovely! Hitori solved.');}}
    function cycle(r,c){choose(r,c,(marks[r][c]+1)%3);}
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)(function(rr,cc){var b=LR.el('button',{type:'button',className:'hitori-cell',text:String(v.puzzle[rr][cc]),role:'gridcell',onclick:function(){cycle(rr,cc);}});b.addEventListener('contextmenu',function(e){e.preventDefault();choose(rr,cc,marks[rr][cc]===2?0:2);});cells.push(b);board.appendChild(b);}(r,c));
    board.addEventListener('keydown',function(e){var r=selected[0],c=selected[1];if(e.key==='ArrowLeft')c=Math.max(0,c-1);else if(e.key==='ArrowRight')c=Math.min(n-1,c+1);else if(e.key==='ArrowUp')r=Math.max(0,r-1);else if(e.key==='ArrowDown')r=Math.min(n-1,r+1);else if(e.key===' '||e.key==='Enter'){cycle(r,c);e.preventDefault();return;}else if(e.key==='b'||e.key==='B'){choose(r,c,1);e.preventDefault();return;}else if(e.key==='w'||e.key==='W'){choose(r,c,2);e.preventDefault();return;}else if(e.key==='x'||e.key==='X'||e.key==='Delete'||e.key==='Backspace'){choose(r,c,0);e.preventDefault();return;}else return;selected=[r,c];render();e.preventDefault();cells[r*n+c].focus();});
    var tools=LR.el('div',{className:'sudoku-tools hitori-tools'});
    tools.appendChild(LR.el('button',{type:'button',className:'tool-button hitori-black-button',text:'■ '+(I&&I.lang==='hu'?'Fekete':'Black'),onclick:function(){choose(selected[0],selected[1],1);}}));
    tools.appendChild(LR.el('button',{type:'button',className:'tool-button hitori-white-button',text:'○ '+(I&&I.lang==='hu'?'Fehér jel':'White mark'),onclick:function(){choose(selected[0],selected[1],2);}}));
    tools.appendChild(LR.el('button',{type:'button',className:'tool-button clear-button',text:'×',onclick:function(){choose(selected[0],selected[1],0);},'aria-label':I?I.t('clear'):'Clear'}));
    tools.appendChild(LR.el('button',{type:'button',className:'tool-button check-button',text:I?I.t('check'):'Check',onclick:function(){var wrong=0;for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++){var bad=marks[rr][cc]&&((marks[rr][cc]===1?1:0)!==v.solution[rr][cc]);cells[rr*n+cc].classList.toggle('checked-wrong',!!bad);if(bad)wrong++;}api.toast(wrong?(I&&I.lang==='hu'?'Van még javítandó jelölés.':'Some marks still need attention.'):(I&&I.lang==='hu'?'Eddig minden jelölés rendben van.':'All current marks look good.'));}}));
    api.tools.appendChild(tools);render();api.setStatus(I&&I.lang==='hu'?'Készen áll':'Ready');api.setCounter(0,I&&I.lang==='hu'?'Lépések':'Moves');
    return {moves:function(){return moves;},refreshLanguage:function(){board.setAttribute('aria-label',(I?I.variant(v).title:v.title)+' board');tools.querySelector('.hitori-black-button').textContent='■ '+(I&&I.lang==='hu'?'Fekete':'Black');tools.querySelector('.hitori-white-button').textContent='○ '+(I&&I.lang==='hu'?'Fehér jel':'White mark');tools.querySelector('.check-button').textContent=I?I.t('check'):'Check';render();},destroy:function(){}};
  }



  function mountFutoshiki(host,v,api){
    var n=v.puzzle.length,grid=clone(v.puzzle),selected=[0,0],moves=0,cells=[],I=root.SudokuI18n,ineq=(v.data&&v.data.inequalities)||[];
    var shell=LR.el('div',{className:'futoshiki-shell'}),board=LR.el('div',{className:'futoshiki-board',role:'grid','aria-label':(I?I.variant(v).title:v.title)+' board'});board.style.setProperty('--futo-size',n);shell.appendChild(board);host.appendChild(shell);
    function idx(r,c){return r*n+c;}function render(){for(var r=0;r<n;r++)for(var c=0;c<n;c++){var b=cells[idx(r,c)],given=!!v.puzzle[r][c];b.textContent=grid[r][c]?String(grid[r][c]):'';b.classList.toggle('given',given);b.classList.toggle('selected',selected[0]===r&&selected[1]===c);b.classList.remove('wrong');b.setAttribute('aria-label',(I&&I.lang==='hu'?'Sor ':'Row ')+(r+1)+', '+(I&&I.lang==='hu'?'oszlop ':'column ')+(c+1)+(grid[r][c]?', '+grid[r][c]:', '+(I&&I.lang==='hu'?'üres':'empty'))+(given?(I&&I.lang==='hu'?', adott':', given'):''));}}
    function solvedGrid(){for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(grid[rr][cc]!==v.solution[rr][cc])return false;return true;}
    function setCell(r,c,val){if(v.puzzle[r][c])return;grid[r][c]=val;moves++;api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');render();if(solvedGrid())api.solved();}
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)(function(rr,cc){var b=LR.el('button',{type:'button',className:'futoshiki-cell',role:'gridcell',onclick:function(){selected=[rr,cc];render();}});b.addEventListener('keydown',function(e){var value=Number(e.key);if(/^[1-9]$/.test(e.key)&&value>=1&&value<=n){e.preventDefault();setCell(rr,cc,value);}else if(e.key==='Backspace'||e.key==='Delete'||e.key==='0'){e.preventDefault();setCell(rr,cc,0);}});cells.push(b);board.appendChild(b);}(r,c));
    ineq.forEach(function(q){var a=q.a,b=q.b,m=LR.el('span',{className:'futoshiki-sign',text:q.op,'aria-hidden':'true'});var horizontal=a[0]===b[0];m.style.left=(((a[1]+b[1]+1)/2)*100/n)+'%';m.style.top=(((a[0]+b[0]+1)/2)*100/n)+'%';if(!horizontal)m.classList.add('vertical');shell.appendChild(m);});
    var hint=LR.el('p',{className:'fillomino-hint futoshiki-hint',text:I&&I.lang==='hu'?'Minden sorban és oszlopban 1–'+n+' egyszer; közben figyeld a < és > jeleket.':'Use 1–'+n+' once in every row and column, while obeying every < and > sign.'});host.appendChild(hint);
    var tools=LR.el('div',{className:'sudoku-tools fillomino-number-pad'});for(var d=1;d<=n;d++)(function(x){tools.appendChild(LR.el('button',{type:'button',className:'tool-button',text:String(x),onclick:function(){setCell(selected[0],selected[1],x);}}));}(d));tools.appendChild(LR.el('button',{type:'button',className:'tool-button clear-futoshiki-button',text:I&&I.lang==='hu'?'Törlés':'Clear',onclick:function(){setCell(selected[0],selected[1],0);}}));tools.appendChild(LR.el('button',{type:'button',className:'tool-button check-button',text:I?I.t('check'):'Check',onclick:function(){var wrong=0,empty=0;for(var r=0;r<n;r++)for(var c=0;c<n;c++){var bad=grid[r][c]&&grid[r][c]!==v.solution[r][c];cells[idx(r,c)].classList.toggle('wrong',!!bad);if(bad)wrong++;if(!grid[r][c])empty++;}api.toast(wrong?(I&&I.lang==='hu'?'Van még javítandó cella.':'Some cells still need attention.'):(empty?(I&&I.lang==='hu'?'Az eddigi számok rendben vannak.':'Current entries look good.'):(I&&I.lang==='hu'?'Kész a Futoshiki!':'Futoshiki complete!')));}}));api.tools.appendChild(tools);render();api.setStatus(I&&I.lang==='hu'?'Készen áll':'Ready');api.setCounter(0,I&&I.lang==='hu'?'Lépések':'Moves');
    return {moves:function(){return moves;},refreshLanguage:function(){board.setAttribute('aria-label',(I?I.variant(v).title:v.title)+' board');hint.textContent=I&&I.lang==='hu'?'Minden sorban és oszlopban 1–'+n+' egyszer; közben figyeld a < és > jeleket.':'Use 1–'+n+' once in every row and column, while obeying every < and > sign.';tools.querySelector('.clear-futoshiki-button').textContent=I&&I.lang==='hu'?'Törlés':'Clear';tools.querySelector('.check-button').textContent=I?I.t('check'):'Check';render();},destroy:function(){}};
  }

  function mountFillomino(host,v,api){
    var n=v.puzzle.length,grid=clone(v.puzzle),selected=[0,0],moves=0,cells=[],I=root.SudokuI18n;
    var board=LR.el('div',{className:'fillomino-board',role:'grid','aria-label':(I?I.variant(v).title:v.title)+' board'});board.style.setProperty('--fillomino-size',n);host.appendChild(board);
    function idx(r,c){return r*n+c;}
    function render(){for(var r=0;r<n;r++)for(var c=0;c<n;c++){var b=cells[idx(r,c)],given=!!v.puzzle[r][c];b.textContent=grid[r][c]?String(grid[r][c]):'';b.classList.toggle('given',given);b.classList.toggle('selected',selected[0]===r&&selected[1]===c);b.classList.remove('wrong');b.setAttribute('aria-label',(I&&I.lang==='hu'?'Sor ':'Row ')+(r+1)+', '+(I&&I.lang==='hu'?'oszlop ':'column ')+(c+1)+(grid[r][c]?', '+grid[r][c]:'')+(given?(I&&I.lang==='hu'?', adott':', given'):''));}}
    function solvedGrid(){for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(grid[rr][cc]!==v.solution[rr][cc])return false;return true;}
    function setCell(r,c,val){if(v.puzzle[r][c])return;grid[r][c]=val;moves++;api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');render();if(solvedGrid())api.solved();}
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)(function(rr,cc){var b=LR.el('button',{type:'button',className:'fillomino-cell',role:'gridcell',onclick:function(){selected=[rr,cc];render();}});b.addEventListener('keydown',function(e){if(/^[1-6]$/.test(e.key)){e.preventDefault();setCell(rr,cc,+e.key);}else if(e.key==='Backspace'||e.key==='Delete'||e.key==='0'){e.preventDefault();setCell(rr,cc,0);}});cells.push(b);board.appendChild(b);}(r,c));
    var hint=LR.el('p',{className:'fillomino-hint',text:I&&I.lang==='hu'?'Válassz egy cellát, majd írd be a csoport méretét 1–6 között.':'Select a cell, then enter the group size from 1–6.'});host.appendChild(hint);
    var tools=LR.el('div',{className:'sudoku-tools fillomino-number-pad'});for(var d=1;d<=6;d++)(function(x){tools.appendChild(LR.el('button',{type:'button',className:'tool-button',text:String(x),onclick:function(){setCell(selected[0],selected[1],x);}}));}(d));
    tools.appendChild(LR.el('button',{type:'button',className:'tool-button clear-fillomino-button',text:I&&I.lang==='hu'?'Törlés':'Clear',onclick:function(){setCell(selected[0],selected[1],0);}}));
    tools.appendChild(LR.el('button',{type:'button',className:'tool-button check-button',text:I?I.t('check'):'Check',onclick:function(){var wrong=0,empty=0;for(var r=0;r<n;r++)for(var c=0;c<n;c++){var bad=grid[r][c]&&grid[r][c]!==v.solution[r][c];cells[idx(r,c)].classList.toggle('wrong',!!bad);if(bad)wrong++;if(!grid[r][c])empty++;}api.toast(wrong?(I&&I.lang==='hu'?'Van még javítandó cella.':'Some cells still need attention.'):(empty?(I&&I.lang==='hu'?'Az eddigi számok rendben vannak.':'Current entries look good.'):(I&&I.lang==='hu'?'Kész a Fillomino!':'Fillomino complete!')));}}));api.tools.appendChild(tools);render();api.setStatus(I&&I.lang==='hu'?'Készen áll':'Ready');api.setCounter(0,I&&I.lang==='hu'?'Lépések':'Moves');
    return {moves:function(){return moves;},refreshLanguage:function(){board.setAttribute('aria-label',(I?I.variant(v).title:v.title)+' board');hint.textContent=I&&I.lang==='hu'?'Válassz egy cellát, majd írd be a csoport méretét 1–6 között.':'Select a cell, then enter the group size from 1–6.';tools.querySelector('.clear-fillomino-button').textContent=I&&I.lang==='hu'?'Törlés':'Clear';tools.querySelector('.check-button').textContent=I?I.t('check'):'Check';render();},destroy:function(){}};
  }

  function mountBridges(host,v,api){
    var puzzle=v.puzzle,islands=puzzle.islands,n=islands.length,edges=[],edgeMap={},values=[],selected=-1,moves=0;
    for(var i=0;i<n;i++){
      var a=islands[i],bestR=null,bestD=null;
      for(var j=0;j<n;j++)if(i!==j){var b=islands[j];if(a.r===b.r&&b.c>a.c&&(!bestR||b.c<bestR.c))bestR={idx:j,c:b.c};if(a.c===b.c&&b.r>a.r&&(!bestD||b.r<bestD.r))bestD={idx:j,r:b.r};}
      if(bestR)edges.push([i,bestR.idx]);if(bestD)edges.push([i,bestD.idx]);
    }
    edges.forEach(function(e,k){edgeMap[e[0]+','+e[1]]=k;edgeMap[e[1]+','+e[0]]=k;values[k]=0;});
    var board=LR.el('div',{className:'bridges-board',role:'group','aria-label':(I?I.variant(v).title:v.title)+' board'}),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','bridges-lines');svg.setAttribute('viewBox','0 0 100 100');board.appendChild(svg);host.appendChild(board);
    var buttons=[];
    function incidentCount(idx){var x=0;edges.forEach(function(e,k){if(e[0]===idx||e[1]===idx)x+=values[k];});return x;}
    function edgesCross(e1,e2){var a=islands[e1[0]],b=islands[e1[1]],c=islands[e2[0]],d=islands[e2[1]],h1=a.r===b.r,h2=c.r===d.r;if(h1===h2)return false;var h=h1?[a,b]:[c,d],vv=h1?[c,d]:[a,b],hr=h[0].r,vc=vv[0].c;return vc>Math.min(h[0].c,h[1].c)&&vc<Math.max(h[0].c,h[1].c)&&hr>Math.min(vv[0].r,vv[1].r)&&hr<Math.max(vv[0].r,vv[1].r);}
    function lineFor(e,k,offset,cls){var a=islands[e[0]],b=islands[e[1]],x1=8+a.c*14,x2=8+b.c*14,y1=8+a.r*14,y2=8+b.r*14;if(a.r===b.r){y1+=offset;y2+=offset;}else{x1+=offset;x2+=offset;}var line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',x1);line.setAttribute('y1',y1);line.setAttribute('x2',x2);line.setAttribute('y2',y2);line.setAttribute('class','bridge-line '+cls);svg.appendChild(line);}
    function render(){while(svg.firstChild)svg.removeChild(svg.firstChild);edges.forEach(function(e,k){if(values[k]===1)lineFor(e,k,0,'single');else if(values[k]===2){lineFor(e,k,-1.15,'double-a');lineFor(e,k,1.15,'double-b');}});buttons.forEach(function(b,idx){b.classList.toggle('selected',selected===idx);b.classList.toggle('satisfied',incidentCount(idx)===islands[idx].clue);b.setAttribute('aria-label',(I&&I.lang==='hu'?'Sziget':'Island')+' '+islands[idx].clue+', '+incidentCount(idx)+'/'+islands[idx].clue+' '+(I&&I.lang==='hu'?'híd':'bridges'));});}
    function solved(){if(values.length!==v.solution.length)return false;for(var k=0;k<values.length;k++)if(values[k]!==v.solution[k])return false;return true;}
    function clickIsland(idx){if(selected<0){selected=idx;render();return;}if(selected===idx){selected=-1;render();return;}var key=selected+','+idx,k=edgeMap[key];if(k===undefined){selected=idx;render();return;}var next=(values[k]+1)%3;if(next>0&&values[k]===0){for(var ce=0;ce<edges.length;ce++)if(values[ce]>0&&edgesCross(edges[k],edges[ce])){api.toast(I&&I.lang==='hu'?'A hidak nem keresztezhetik egymást.':'Bridges cannot cross.');selected=idx;render();return;}}values[k]=next;moves++;selected=idx;api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');render();if(solved()){api.setStatus(I&&I.lang==='hu'?'Megoldva!':'Solved!');api.complete({moves:moves});api.toast(I&&I.lang==='hu'?'A szigetek összekapcsolódtak!':'All islands are connected!');}}
    islands.forEach(function(x,idx){var b=LR.el('button',{type:'button',className:'bridge-island',text:String(x.clue),onclick:function(){clickIsland(idx);}});b.style.left=(8+x.c*14)+'%';b.style.top=(8+x.r*14)+'%';buttons.push(b);board.appendChild(b);});
    var hint=LR.el('p',{className:'bridges-hint',text:I&&I.lang==='hu'?'Kattints két egy vonalban lévő szigetre: 1 híd → 2 híd → törlés.':'Click two aligned islands: 1 bridge → 2 bridges → remove.'});host.appendChild(hint);
    var tools=LR.el('div',{className:'sudoku-tools bridges-tools'});tools.appendChild(LR.el('button',{type:'button',className:'tool-button clear-bridges-button',text:I&&I.lang==='hu'?'Hidak törlése':'Clear bridges',onclick:function(){values.fill(0);selected=-1;moves++;api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');render();}}));tools.appendChild(LR.el('button',{type:'button',className:'tool-button check-button',text:I?I.t('check'):'Check',onclick:function(){var wrong=0;for(var k=0;k<values.length;k++)if(values[k]&&values[k]!==v.solution[k])wrong++;api.toast(wrong?(I&&I.lang==='hu'?'Van még javítandó híd.':'Some bridges still need attention.'):(I&&I.lang==='hu'?'Az eddigi hidak rendben vannak.':'Current bridges look good.'));}}));api.tools.appendChild(tools);render();api.setStatus(I&&I.lang==='hu'?'Készen áll':'Ready');api.setCounter(0,I&&I.lang==='hu'?'Lépések':'Moves');
    return {moves:function(){return moves;},refreshLanguage:function(){board.setAttribute('aria-label',(I?I.variant(v).title:v.title)+' board');hint.textContent=I&&I.lang==='hu'?'Kattints két egy vonalban lévő szigetre: 1 híd → 2 híd → törlés.':'Click two aligned islands: 1 bridge → 2 bridges → remove.';tools.querySelector('.clear-bridges-button').textContent=I&&I.lang==='hu'?'Hidak törlése':'Clear bridges';tools.querySelector('.check-button').textContent=I?I.t('check'):'Check';render();},destroy:function(){}};
  }

  function mountShadePuzzle(host,v,api,type){
    var n=v.puzzle.size,grid=Array.from({length:n},function(){return Array(n).fill(0);}),moves=0,cells=[],I=root.SudokuI18n,reg=v.puzzle.regions;
    var wrap=LR.el('div',{className:'newlogic-wrap '+type+'-wrap'});wrap.style.setProperty('--newlogic-size',n);var board=LR.el('div',{className:'newlogic-board '+type+'-board',role:'grid'});board.style.setProperty('--newlogic-size',n);wrap.appendChild(board);host.appendChild(wrap);

    function borderStyle(b,r,c){
      if(!reg)return;
      var id=reg[r][c];
      if(r===0||reg[r-1][c]!==id)b.style.borderTopWidth='3px';
      if(c===0||reg[r][c-1]!==id)b.style.borderLeftWidth='3px';
      if(r===n-1||reg[r+1][c]!==id)b.style.borderBottomWidth='3px';
      if(c===n-1||reg[r][c+1]!==id)b.style.borderRightWidth='3px';
    }

    function done(){
      for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(grid[r][c]!==v.solution[r][c])return false;
      return true;
    }

    function aquariumStateLabel(r,c){
      var hu=I&&I.lang==='hu';
      var state=grid[r][c]?(hu?'víz':'water'):(hu?'üres':'empty');
      return (hu?'Akvárium mező ':'Aquarium cell ')+(r+1)+','+(c+1)+', '+state;
    }
    function starBattleStateLabel(r,c){
      var hu=I&&I.lang==='hu';
      var state=grid[r][c]?(hu?'csillag':'star'):(hu?'üres':'empty');
      return (hu?'Csillagcsata mező ':'Star Battle cell ')+(r+1)+','+(c+1)+', '+state;
    }

    for(var r=0;r<n;r++)for(var c=0;c<n;c++)(function(rr,cc){
      var b=LR.el('button',{
        type:'button',
        className:'newlogic-cell',
        role:'gridcell',
        onclick:function(){
          grid[rr][cc]=grid[rr][cc]?0:1;
          moves++;
          render();
          api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');
          if(done())api.solved();
        }
      });
      borderStyle(b,rr,cc);
      cells.push(b);
      board.appendChild(b);
    }(r,c));

    if(type==='aquarium'){
      var top=LR.el('div',{className:'aquarium-top'});
      v.puzzle.colClues.forEach(function(x){top.appendChild(LR.el('span',{text:String(x)}));});
      wrap.insertBefore(top,board);

      var side=LR.el('div',{className:'aquarium-side'});
      v.puzzle.rowClues.forEach(function(x){side.appendChild(LR.el('span',{text:String(x)}));});
      wrap.appendChild(side);
    }

    function render(){
      cells.forEach(function(b,i){
        var r=Math.floor(i/n),c=i%n;
        b.classList.toggle(type==='starbattle'?'starred':'water',!!grid[r][c]);
        b.textContent=type==='starbattle'&&grid[r][c]?'★':'';
        b.setAttribute('aria-pressed',grid[r][c]?'true':'false');
        if(type==='aquarium')b.setAttribute('aria-label',aquariumStateLabel(r,c));
        if(type==='starbattle')b.setAttribute('aria-label',starBattleStateLabel(r,c));
      });
    }

    var hint=LR.el('p',{className:'newlogic-hint'});
    host.appendChild(hint);

    var tools=null,clearButton=null,checkButton=null;

    if(type==='aquarium'||type==='starbattle'){
      tools=LR.el('div',{className:'sudoku-tools '+type+'-tools'});

      clearButton=LR.el('button',{
        type:'button',
        className:'tool-button clear-'+type+'-button',
        onclick:function(){
          var changed=false;
          grid.forEach(function(row){
            for(var c=0;c<n;c++)if(row[c]){
              row[c]=0;
              changed=true;
            }
          });
          if(changed){
            moves++;
            api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');
            render();
          }
        }
      });

      checkButton=LR.el('button',{
        type:'button',
        className:'tool-button check-button check-'+type+'-button',
        onclick:function(){
          var wrong=0;
          for(var r=0;r<n;r++)for(var c=0;c<n;c++)
            if(grid[r][c]&&grid[r][c]!==v.solution[r][c])wrong++;
          if(type==='aquarium'){
            api.toast(wrong
              ?(I&&I.lang==='hu'?'Van még javítandó vízjelölés.':'Some water markings still need attention.')
              :(I&&I.lang==='hu'?'Az eddigi vízjelölések rendben vannak.':'Current water markings look good.'));
          }else{
            api.toast(wrong
              ?(I&&I.lang==='hu'?'Van még javítandó csillag.':'Some stars still need attention.')
              :(I&&I.lang==='hu'?'Az eddigi csillagok rendben vannak.':'Current stars look good.'));
          }
        }
      });

      tools.append(clearButton,checkButton);
      api.tools.appendChild(tools);
    }

    function language(){
      hint.textContent=type==='starbattle'
        ?(I&&I.lang==='hu'
          ?'Egy csillag minden sorba, oszlopba és régióba; a csillagok nem érhetnek össze.'
          :'One star in every row, column and region; stars may not touch.')
        :(I&&I.lang==='hu'
          ?'Töltsd fel az akváriumokat alulról; a szélső számok a vízzel telt cellákat számolják.'
          :'Fill aquariums from the bottom; edge clues count water cells.');

      if(clearButton)clearButton.textContent=type==='aquarium'
        ?(I&&I.lang==='hu'?'Víz törlése':'Clear water')
        :(I&&I.lang==='hu'?'Csillagok törlése':'Clear stars');
      if(checkButton)checkButton.textContent=I?I.t('check'):'Check';
    }

    language();
    render();

    return {
      moves:function(){return moves;},
      refreshLanguage:function(){language();render();},
      destroy:function(){}
    };
  }

  function mountGalaxies(host,v,api){
    var n=v.puzzle.size,centers=v.puzzle.centers||[],moves=0,I=root.SudokuI18n,edges=[],marks=[],edgeEls=[];
    function edgeKey(a,b){var x=a[0]+','+a[1],y=b[0]+','+b[1];return x<y?x+'|'+y:y+'|'+x;}
    function centerAnchors(center){var out=[];for(var r=0;r<n;r++)if(center.r>=r-1e-9&&center.r<=r+1+1e-9)for(var c=0;c<n;c++)if(center.c>=c-1e-9&&center.c<=c+1+1e-9){var onR=Math.abs(center.r-r)<1e-9||Math.abs(center.r-r-1)<1e-9||(center.r>r&&center.r<r+1),onC=Math.abs(center.c-c)<1e-9||Math.abs(center.c-c-1)<1e-9||(center.c>c&&center.c<c+1);if(onR&&onC)out.push([r,c]);}return out;}
    function partner(r,c,center){var rr=2*center.r-r-1,cc=2*center.c-c-1;if(Math.abs(rr-Math.round(rr))>1e-9||Math.abs(cc-Math.round(cc))>1e-9)return null;rr=Math.round(rr);cc=Math.round(cc);return rr>=0&&cc>=0&&rr<n&&cc<n?[rr,cc]:null;}
    var wrap=LR.el('div',{className:'galaxies-wrap'}),board=LR.el('div',{className:'galaxies-boundary-board',role:'group','aria-label':(I?I.variant(v).title:v.title)+' board'});board.style.setProperty('--galaxy-size',n);wrap.appendChild(board);host.appendChild(wrap);
    for(var r=0;r<n;r++)for(var c=0;c<n;c++){var cell=LR.el('div',{className:'galaxy-plain-cell','aria-hidden':'true'});cell.style.left=(c*100/n)+'%';cell.style.top=(r*100/n)+'%';cell.style.width=(100/n)+'%';cell.style.height=(100/n)+'%';board.appendChild(cell);if(c+1<n)edges.push({a:[r,c],b:[r,c+1],vertical:true});if(r+1<n)edges.push({a:[r,c],b:[r+1,c],vertical:false});}
    marks=Array(edges.length).fill(false);var edgeIndex={};edges.forEach(function(e,i){edgeIndex[edgeKey(e.a,e.b)]=i;var el=LR.el('button',{type:'button',className:'galaxy-boundary '+(e.vertical?'vertical':'horizontal'),'aria-label':I&&I.lang==='hu'?'Galaxishatár':'Galaxy boundary',onclick:function(){marks[i]=!marks[i];moves++;api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');render();if(validPartition()){api.setStatus(I&&I.lang==='hu'?'Megoldva!':'Solved!');api.complete({moves:moves});}}});if(e.vertical){el.style.left=((e.a[1]+1)*100/n)+'%';el.style.top=(e.a[0]*100/n)+'%';el.style.height=(100/n)+'%';}else{el.style.left=(e.a[1]*100/n)+'%';el.style.top=((e.a[0]+1)*100/n)+'%';el.style.width=(100/n)+'%';}edgeEls.push(el);board.appendChild(el);});
    centers.forEach(function(x){var dot=LR.el('span',{className:'galaxy-center',text:'✦','aria-hidden':'true'});dot.style.left=(x.c/n*100)+'%';dot.style.top=(x.r/n*100)+'%';board.appendChild(dot);});
    function validPartition(){var comp=Array.from({length:n},function(){return Array(n).fill(-1);}),groups=[],gid=0;for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(comp[r][c]<0){var q=[[r,c]],cells=[];comp[r][c]=gid;while(q.length){var a=q.shift();cells.push(a);[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){var rr=a[0]+d[0],cc=a[1]+d[1];if(rr<0||cc<0||rr>=n||cc>=n||comp[rr][cc]>=0)return;var ei=edgeIndex[edgeKey(a,[rr,cc])];if(ei!=null&&marks[ei])return;comp[rr][cc]=gid;q.push([rr,cc]);});}groups.push(cells);gid++;}
      if(groups.length!==centers.length)return false;for(var k=0;k<centers.length;k++){var anchors=centerAnchors(centers[k]);if(!anchors.length)return false;var g=comp[anchors[0][0]][anchors[0][1]];for(var z=1;z<anchors.length;z++)if(comp[anchors[z][0]][anchors[z][1]]!==g)return false;var centerCount=0,centerId=-1;for(var j=0;j<centers.length;j++){var aa=centerAnchors(centers[j]),same=true;for(z=0;z<aa.length;z++)if(comp[aa[z][0]][aa[z][1]]!==g)same=false;if(same){centerCount++;centerId=j;}}if(centerCount!==1||centerId!==k)return false;for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(comp[r][c]===g){var p=partner(r,c,centers[k]);if(!p||comp[p[0]][p[1]]!==g)return false;}}
      return true;}
    function galaxyBoundaryStateLabel(i){
      var hu=I&&I.lang==='hu',e=edges[i],state=marks[i]?(hu?'bejelölve':'marked'):(hu?'nincs bejelölve':'not marked');
      return (hu?'Galaxishatár ':'Galaxy boundary ')+(e.a[0]+1)+','+(e.a[1]+1)+' - '+(e.b[0]+1)+','+(e.b[1]+1)+', '+state;
    }
    function render(){edgeEls.forEach(function(el,i){el.classList.toggle('on',marks[i]);el.setAttribute('aria-pressed',marks[i]?'true':'false');el.setAttribute('aria-label',galaxyBoundaryStateLabel(i));});}
    var hint=LR.el('p',{className:'newlogic-hint galaxies-hint'});host.appendChild(hint);
    var tools=LR.el('div',{className:'sudoku-tools galaxies-tools'}),
        clear=LR.el('button',{type:'button',className:'tool-button clear-galaxies-button',onclick:function(){marks.fill(false);moves++;render();}}),
        check=LR.el('button',{type:'button',className:'tool-button check-button check-galaxies-button',onclick:function(){
          if(validPartition())api.toast(I&&I.lang==='hu'?'A határok helyesek.':'The boundaries are correct.');
          else api.toast(I&&I.lang==='hu'?'A határok még nem alkotnak helyes galaxisokat.':'The boundaries do not form valid galaxies yet.');
        }});
    tools.append(clear,check);api.tools.appendChild(tools);
    function language(){
      hint.textContent=I&&I.lang==='hu'?'Rajzold be a galaxisok határait. Minden tartomány pontosan egy csillagot tartalmazzon, legyen összefüggő és 180°-osan szimmetrikus a saját csillaga körül.':'Draw the galaxy boundaries. Every region must contain exactly one star, be connected, and be 180° symmetric around its own star.';
      clear.textContent=I&&I.lang==='hu'?'Határok törlése':'Clear boundaries';
      check.textContent=I?I.t('check'):'Check';
    }
    language();render();return {moves:function(){return moves;},refreshLanguage:function(){language();render();},destroy:function(){}};
  }

  function mountYajilin(host,v,api){
    var I=root.SudokuI18n,n=v.puzzle.size,clues=v.puzzle.clues||[],clueMap={},moves=0,mode='loop',cells=[],edges=[],edgeEls=[],marks=[],black=Array.from({length:n},function(){return Array(n).fill(false);}),arrows={right:'→',left:'←',up:'↑',down:'↓'};
    clues.forEach(function(cl){clueMap[cl.r+','+cl.c]=cl;});
    function edgeKey(a,b){var x=a[0]+','+a[1],y=b[0]+','+b[1];return x<y?x+'|'+y:y+'|'+x;}var solutionEdges={};(v.solution.edges||[]).forEach(function(e){solutionEdges[edgeKey([e[0],e[1]],[e[2],e[3]])]=1;});
    var wrap=LR.el('div',{className:'yajilin-wrap'}),board=LR.el('div',{className:'yajilin-board',role:'group','aria-label':(I?I.variant(v).title:v.title)+' board'});board.style.setProperty('--yajilin-size',n);wrap.appendChild(board);host.appendChild(wrap);
    for(var r=0;r<n;r++)for(var c=0;c<n;c++){if(c+1<n&&!clueMap[r+','+c]&&!clueMap[r+','+(c+1)])edges.push({a:[r,c],b:[r,c+1]});if(r+1<n&&!clueMap[r+','+c]&&!clueMap[(r+1)+','+c])edges.push({a:[r,c],b:[r+1,c]});}marks=Array(edges.length).fill(0);
    function solved(){for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(!clueMap[r+','+c]&&black[r][c]!==!!v.solution.black[r][c])return false;for(var i=0;i<edges.length;i++)if((marks[i]===1)!==!!solutionEdges[edgeKey(edges[i].a,edges[i].b)])return false;return true;}
    function completeIfSolved(){if(solved()){api.setStatus(I&&I.lang==='hu'?'Megoldva!':'Solved!');api.complete({moves:moves});}}
    for(r=0;r<n;r++)for(c=0;c<n;c++)(function(rr,cc){var clue=clueMap[rr+','+cc],cell=LR.el('button',{type:'button',className:'yajilin-cell'+(clue?' clue':''),role:'gridcell',onclick:function(){if(clue||mode!=='black')return;black[rr][cc]=!black[rr][cc];moves++;api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');render();completeIfSolved();}});cell.style.left=(cc*100/n)+'%';cell.style.top=(rr*100/n)+'%';cell.style.width=(100/n)+'%';cell.style.height=(100/n)+'%';cell.dataset.r=rr;cell.dataset.c=cc;cells.push(cell);board.appendChild(cell);}(r,c));
    edges.forEach(function(e,i){var horiz=e.a[0]===e.b[0],el=LR.el('button',{type:'button',className:'yajilin-edge '+(horiz?'horizontal':'vertical'),onclick:function(){if(mode!=='loop')return;marks[i]=(marks[i]+1)%3;moves++;api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');render();completeIfSolved();}});if(horiz){el.style.left=((e.a[1]+.5)*100/n)+'%';el.style.top=((e.a[0]+.5)*100/n)+'%';el.style.width=(100/n)+'%';}else{el.style.left=((e.a[1]+.5)*100/n)+'%';el.style.top=((e.a[0]+.5)*100/n)+'%';el.style.height=(100/n)+'%';}edgeEls.push(el);board.appendChild(el);});
    var hint=LR.el('p',{className:'newlogic-hint yajilin-hint'});host.appendChild(hint);
    var tools=LR.el('div',{className:'sudoku-tools yajilin-tools'}),
        loopBtn=LR.el('button',{type:'button',className:'tool-button yajilin-loop-mode',onclick:function(){mode='loop';render();}}),
        blackBtn=LR.el('button',{type:'button',className:'tool-button yajilin-black-mode',onclick:function(){mode='black';render();}}),
        clearBtn=LR.el('button',{type:'button',className:'tool-button yajilin-clear',onclick:function(){marks.fill(0);black.forEach(function(row){row.fill(false);});moves++;render();}}),
        checkBtn=LR.el('button',{type:'button',className:'tool-button check-button yajilin-check',onclick:function(){
          var wrong=0;
          for(var r=0;r<n;r++)for(var c=0;c<n;c++){
            if(clueMap[r+','+c])continue;
            if(black[r][c]&&!v.solution.black[r][c])wrong++;
          }
          for(var i=0;i<edges.length;i++){
            var expected=!!solutionEdges[edgeKey(edges[i].a,edges[i].b)];
            if((marks[i]===1&&!expected)||(marks[i]===2&&expected))wrong++;
          }
          api.toast(wrong
            ?(I&&I.lang==='hu'?'Van még javítandó jelölés.':'Some markings still need attention.')
            :(I&&I.lang==='hu'?'Az eddigi jelölések rendben vannak.':'Current markings look good.'));
        }});
    tools.append(loopBtn,blackBtn,clearBtn,checkBtn);api.tools.appendChild(tools);

    function yajilinEdgeStateLabel(i){
      var hu=I&&I.lang==='hu',
          state=marks[i]===1?(hu?'vonal':'line'):(marks[i]===2?(hu?'kereszt':'cross'):(hu?'üres':'empty')),
          e=edges[i];
      return (hu?'Hurokszakasz ':'Loop edge ')+(e.a[0]+1)+','+(e.a[1]+1)+' - '+(e.b[0]+1)+','+(e.b[1]+1)+', '+state;
    }

    function render(){
      cells.forEach(function(cell){
        var r=+cell.dataset.r,c=+cell.dataset.c,cl=clueMap[r+','+c];
        if(cl){
          cell.textContent=(arrows[cl.dir]||'?')+cl.clue;
          cell.setAttribute('aria-label',(I&&I.lang==='hu'?'Nyíl ':'Arrow ')+(arrows[cl.dir]||'')+' '+cl.clue);
          return;
        }
        cell.classList.toggle('black',black[r][c]);
        cell.textContent=black[r][c]?'■':'';
        cell.disabled=mode!=='black';
        cell.setAttribute('aria-pressed',black[r][c]?'true':'false');
        cell.setAttribute('aria-label',(I&&I.lang==='hu'?'Mező ':'Cell ')+(r+1)+','+(c+1)+', '+(black[r][c]?(I&&I.lang==='hu'?'fekete':'black'):(I&&I.lang==='hu'?'fehér':'white')));
      });
      edgeEls.forEach(function(el,i){
        el.classList.toggle('on',marks[i]===1);
        el.classList.toggle('off',marks[i]===2);
        el.classList.toggle('inactive',mode!=='loop');
        el.disabled=mode!=='loop';
        el.setAttribute('aria-pressed',marks[i]===1?'true':'false');
        el.setAttribute('aria-label',yajilinEdgeStateLabel(i));
      });
      loopBtn.classList.toggle('active',mode==='loop');
      blackBtn.classList.toggle('active',mode==='black');
      loopBtn.setAttribute('aria-pressed',mode==='loop'?'true':'false');
      blackBtn.setAttribute('aria-pressed',mode==='black'?'true':'false');
      loopBtn.textContent=I&&I.lang==='hu'?'Hurok rajzolása':'Draw loop';
      blackBtn.textContent=I&&I.lang==='hu'?'Fekete mezők':'Black cells';
      clearBtn.textContent=I&&I.lang==='hu'?'Jelölések törlése':'Clear marks';
      checkBtn.textContent=I?I.t('check'):'Check';
      hint.textContent=I&&I.lang==='hu'?'Két mód: a Hurok módban érintsd a cellák közti szakaszokat (vonal → X → üres), a Fekete mezők módban jelöld a nyilak által számolt fekete cellákat.':'Two modes: in Loop mode tap segments between cells (line → X → empty); in Black cells mode mark the shaded cells counted by the arrows.';
    }

    render();api.setStatus(I&&I.lang==='hu'?'Készen áll':'Ready');api.setCounter(0,I&&I.lang==='hu'?'Lépések':'Moves');return {moves:function(){return moves;},refreshLanguage:function(){render();},destroy:function(){}};
  }

  function mountShakashaka(host,v,api){
    var I=root.SudokuI18n,n=v.puzzle.size,moves=0,cells=[],grid=Array.from({length:n},function(){return Array(n).fill(0);}),blockMap={};
    (v.puzzle.blocks||[]).forEach(function(b){blockMap[b.r+','+b.c]=b;});
    var board=LR.el('div',{className:'newlogic-board shakashaka-board',role:'grid','aria-label':v.title+' board'});board.style.setProperty('--newlogic-size',n);host.appendChild(board);
    function solved(){for(var r=0;r<n;r++)for(var c=0;c<n;c++){if(blockMap[r+','+c])continue;if(grid[r][c]!==v.solution[r][c])return false;}return true;}
    function orientationLabel(x){var hu=I&&I.lang==='hu',labs=hu?['üres','bal felső','jobb felső','jobb alsó','bal alsó']:['empty','top left','top right','bottom right','bottom left'];return labs[x];}
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)(function(rr,cc){var block=blockMap[rr+','+cc],b=LR.el('button',{type:'button',className:'newlogic-cell shakashaka-cell'+(block?' logic-clue':''),role:'gridcell',onclick:function(){if(block)return;grid[rr][cc]=(grid[rr][cc]+1)%5;moves++;render();api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');if(solved())api.solved();}});b.dataset.r=rr;b.dataset.c=cc;cells.push(b);board.appendChild(b);}(r,c));
    function render(){cells.forEach(function(b){var r=+b.dataset.r,c=+b.dataset.c,block=blockMap[r+','+c],x=grid[r][c];b.className=b.className.replace(/ shaka-tri-[1-4]/g,'');if(block){b.textContent=block.clue==null?'':String(block.clue);b.setAttribute('aria-label',(I&&I.lang==='hu'?'Fekete mező':'Black cell')+(block.clue==null?'':', '+block.clue));b.disabled=true;return;}b.textContent='';if(x)b.classList.add('shaka-tri-'+x);b.disabled=false;b.setAttribute('aria-label',(I&&I.lang==='hu'?'Háromszögkert mező ':'Shakashaka cell ')+(r+1)+','+(c+1)+', '+orientationLabel(x));b.setAttribute('aria-pressed',x?'true':'false');});}
    var hint=LR.el('p',{className:'newlogic-hint shakashaka-hint'});host.appendChild(hint);
    var tools=LR.el('div',{className:'sudoku-tools shakashaka-tools'}),
        clear=LR.el('button',{type:'button',className:'tool-button clear-shakashaka-button',onclick:function(){
          var changed=false;
          for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(!blockMap[r+','+c]&&grid[r][c]){grid[r][c]=0;changed=true;}
          if(changed){moves++;api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');render();}
        }}),
        check=LR.el('button',{type:'button',className:'tool-button check-button check-shakashaka-button',onclick:function(){
          var wrong=0;
          for(var r=0;r<n;r++)for(var c=0;c<n;c++){
            if(blockMap[r+','+c])continue;
            if(grid[r][c]&&grid[r][c]!==v.solution[r][c])wrong++;
          }
          api.toast(wrong
            ?(I&&I.lang==='hu'?'Van még javítandó háromszög.':'Some triangles still need attention.')
            :(I&&I.lang==='hu'?'Az eddigi háromszögek rendben vannak.':'Current triangles look good.'));
        }});
    tools.append(clear,check);api.tools.appendChild(tools);

    function refresh(){
      render();
      hint.textContent=I&&I.lang==='hu'
        ?'Érintsd a fehér mezőt: üres → négy fekete háromszögirány → üres. A számozott fekete mező száma azt mutatja, hogy a négy oldal-szomszédos (nem átlós) fehér mező közül hányban van fekete háromszög; a háromszög iránya ennél a számolásnál nem számít. A megmaradó fehér területeknek téglalapnak vagy négyzetnek kell lenniük.'
        :'Tap a white cell: empty → four black triangle orientations → empty. A numbered black cell tells how many of its four orthogonally adjacent (not diagonal) white cells contain a black triangle; triangle orientation does not affect this count. Every remaining white area must form a rectangle or square.';
      clear.textContent=I&&I.lang==='hu'?'Háromszögek törlése':'Clear triangles';
      check.textContent=I?I.t('check'):'Check';
    }
    refresh();return {moves:function(){return moves;},refreshLanguage:refresh,destroy:function(){}};
  }

  function mountIteration51Puzzle(host,v,api){
    var I=root.SudokuI18n,n=v.puzzle.size,moves=0,cells=[],selected=[0,0],grid=Array.from({length:n},function(){return Array(n).fill(0);}),board=LR.el('div',{className:'newlogic-board iteration51-board '+v.kind+'-board',role:'grid',tabindex:v.kind==='rippleeffect'?'0':null}),rooms=v.kind==='rippleeffect'?v.puzzle.rooms:null,roomSizes={};board.style.setProperty('--newlogic-size',n);host.appendChild(board);
    if(rooms)for(var rr0=0;rr0<n;rr0++)for(var cc0=0;cc0<n;cc0++){var rid=rooms[rr0][cc0];roomSizes[rid]=(roomSizes[rid]||0)+1;}
    function clueAt(r,c){if(v.kind==='shakashaka')return (v.puzzle.blocks||[]).find(function(x){return x.r===r&&x.c===c;});return null;}
    function roomBorder(b,r,c){if(!rooms)return;var id=rooms[r][c];if(r===0||rooms[r-1][c]!==id)b.style.borderTopWidth='3px';if(c===0||rooms[r][c-1]!==id)b.style.borderLeftWidth='3px';if(r===n-1||rooms[r+1][c]!==id)b.style.borderBottomWidth='3px';if(c===n-1||rooms[r][c+1]!==id)b.style.borderRightWidth='3px';}
    function solved(){for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(grid[r][c]!==v.solution[r][c]&&v.solution[r][c]>=0)return false;return true;}
    function rippleEffectStateLabel(r,c){var hu=I&&I.lang==='hu',x=grid[r][c],size=roomSizes[rooms[r][c]],value=x?String(x):(hu?'üres':'empty');return (hu?'Hullámhatás mező ':'Ripple Effect cell ')+(r+1)+','+(c+1)+', '+(hu?'érték ':'value ')+value+', '+(hu?'szobaméret ':'room size ')+size+(v.puzzle.givens[r][c]?(hu?', adott':', given'):'');}
    function setRippleCell(r,c,val){if(v.kind!=='rippleeffect'||v.puzzle.givens[r][c])return;var mx=roomSizes[rooms[r][c]]||n;if(val<0||val>mx)return;if(grid[r][c]!==val){grid[r][c]=val;moves++;api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');render();if(solved())api.solved();}}
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)(function(rr,cc){var clue=clueAt(rr,cc),given=v.kind==='rippleeffect'&&v.puzzle.givens[rr][cc];if(given)grid[rr][cc]=given;if(clue)grid[rr][cc]=-1;var b=LR.el('button',{type:'button',className:'newlogic-cell iteration51-cell',role:'gridcell',onclick:function(){selected=[rr,cc];if(clue||given){render();return;}if(v.kind==='rippleeffect'){var mx=roomSizes[rooms[rr][cc]]||n;setRippleCell(rr,cc,grid[rr][cc]>=mx?0:grid[rr][cc]+1);return;}else if(v.kind==='shakashaka')grid[rr][cc]=(grid[rr][cc]+1)%5;else grid[rr][cc]=(grid[rr][cc]+1)%3;moves++;render();api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');if(solved())api.solved();}});roomBorder(b,rr,cc);if(clue)b.classList.add('logic-clue');if(given){b.classList.add('given');b.setAttribute('aria-disabled','true');}cells.push(b);board.appendChild(b);}(r,c));
    function render(){cells.forEach(function(b,i){var r=Math.floor(i/n),c=i%n,clue=clueAt(r,c),x=grid[r][c];b.className=b.className.replace(/ tri-[1-4]| loopcell| blackcell/g,'');b.classList.toggle('selected',v.kind==='rippleeffect'&&selected[0]===r&&selected[1]===c);if(clue){b.textContent=String(clue.clue);return;}if(v.kind==='rippleeffect'){b.textContent=x?String(x):'';b.setAttribute('aria-label',rippleEffectStateLabel(r,c));}else if(v.kind==='shakashaka'){b.textContent=x?'◢':'';if(x)b.classList.add('tri-'+x);}else{b.textContent=x===1?'●':x===2?'■':'';if(x===1)b.classList.add('loopcell');if(x===2)b.classList.add('blackcell');}});}
    if(v.kind==='rippleeffect'){
      board.addEventListener('keydown',function(e){var val=/^[1-9]$/.test(e.key)?+e.key:0;if(val){setRippleCell(selected[0],selected[1],val);e.preventDefault();}else if(e.key==='0'||e.key==='Backspace'||e.key==='Delete'){setRippleCell(selected[0],selected[1],0);e.preventDefault();}});
    }
    var hint=LR.el('p',{className:'newlogic-hint'});host.appendChild(hint);
    var rippleTools=null,rippleClear=null,rippleCheck=null;
    if(v.kind==='rippleeffect'){
      rippleTools=LR.el('div',{className:'sudoku-tools rippleeffect-tools rippleeffect-number-pad'});
      for(var d=1;d<=n;d++)(function(x){rippleTools.appendChild(LR.el('button',{type:'button',className:'tool-button',text:String(x),onclick:function(){setRippleCell(selected[0],selected[1],x);}}));}(d));
      rippleClear=LR.el('button',{type:'button',className:'tool-button clear-rippleeffect-button',onclick:function(){setRippleCell(selected[0],selected[1],0);}});
      rippleCheck=LR.el('button',{type:'button',className:'tool-button check-button check-rippleeffect-button',onclick:function(){var wrong=0;for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(grid[r][c]&&grid[r][c]!==v.solution[r][c])wrong++;api.toast(wrong?(I&&I.lang==='hu'?'Van még javítandó szám.':'Some entries still need attention.'):(I&&I.lang==='hu'?'Az eddigi számok rendben vannak.':'Current entries look good.'));}});
      rippleTools.append(rippleClear,rippleCheck);api.tools.appendChild(rippleTools);
    }
    function language(){
      hint.textContent=v.kind==='shakashaka'?(I&&I.lang==='hu'?'Kattintással forgasd a háromszöget a négy irány között.':'Click to rotate the triangle through four orientations.'):v.kind==='rippleeffect'?(I&&I.lang==='hu'?'A vastag vonalak a szobákat jelölik. Egy N mezős szobában az 1–N számok szerepelnek egyszer-egyszer; két azonos k szám között sorban vagy oszlopban legalább k mező legyen.':'Thick lines mark rooms. A room of N cells contains 1–N exactly once; equal k values in a row or column need at least k cells between them.'):(I&&I.lang==='hu'?'Töltsd ki a feladványt a megadott szabály szerint.':'Complete the puzzle using its rule.');
      if(v.kind==='rippleeffect'){
        if(rippleClear)rippleClear.textContent=I&&I.lang==='hu'?'Törlés':'Clear';
        if(rippleCheck)rippleCheck.textContent=I?I.t('check'):'Check';
        cells.forEach(function(b,i){var r=Math.floor(i/n),c=i%n;b.setAttribute('aria-label',rippleEffectStateLabel(r,c));});
      }
    }
    language();render();return {moves:function(){return moves;},refreshLanguage:function(){language();render();},destroy:function(){}};
  }

  function mountIteration52Puzzle(host,v,api){
    var I=root.SudokuI18n,n=v.puzzle.size,moves=0,cells=[],reg=v.puzzle.regions||null,grid=Array.from({length:n},function(){return Array(n).fill(0);}),fixed={};
    var wrap=LR.el('div',{className:'newlogic-wrap iteration52-wrap '+v.kind+'-wrap'}),board=LR.el('div',{className:'newlogic-board iteration52-board '+v.kind+'-board',role:'grid'});board.style.setProperty('--newlogic-size',n);wrap.appendChild(board);host.appendChild(wrap);
    function regionBorder(b,r,c){if(!reg)return;var id=reg[r][c];if(r===0||reg[r-1][c]!==id)b.style.borderTopWidth='3px';if(c===0||reg[r][c-1]!==id)b.style.borderLeftWidth='3px';if(r===n-1||reg[r+1][c]!==id)b.style.borderBottomWidth='3px';if(c===n-1||reg[r][c+1]!==id)b.style.borderRightWidth='3px';}
    if(v.kind==='lits')(v.puzzle.starters||[]).forEach(function(p){grid[p[0]][p[1]]=1;fixed[p[0]+','+p[1]]=1;});
    if(v.kind==='heyawake')(v.puzzle.starters||[]).forEach(function(p){grid[p.r][p.c]=p.state?1:2;fixed[p.r+','+p.c]=1;});
    if(v.kind==='battleships')(v.puzzle.givens||[]).forEach(function(p){grid[p.r][p.c]=p.state?1:2;fixed[p.r+','+p.c]=1;});
    function solved(){for(var r=0;r<n;r++)for(var c=0;c<n;c++){var shaded=grid[r][c]===1;if(shaded!==!!v.solution[r][c])return false;}return true;}
    function battleshipStateLabel(r,c,x){var hu=I&&I.lang==='hu',state=x===1?(hu?'hajó':'ship'):(x===2?(hu?'víz':'water'):(hu?'üres':'empty')),pos=hu?((r+1)+'. sor, '+(c+1)+'. oszlop'):('Row '+(r+1)+', column '+(c+1));return pos+': '+state+(fixed[r+','+c]?(hu?', adott':', given'):'');}
    function shadeStateLabel(r,c,x){var hu=I&&I.lang==='hu',state=x===1?(hu?'fekete':'shaded'):(x===2?(hu?'X-szel jelölt fehér':'white marked X'):(hu?'üres':'empty')),pos=hu?((r+1)+'. sor, '+(c+1)+'. oszlop'):('Row '+(r+1)+', column '+(c+1));return pos+': '+state+(fixed[r+','+c]?(hu?', adott':', given'):'');}
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)(function(rr,cc){var b=LR.el('button',{type:'button',className:'newlogic-cell iteration52-cell',role:'gridcell',onclick:function(){if(fixed[rr+','+cc])return;if(v.kind==='battleships'||v.kind==='heyawake')grid[rr][cc]=(grid[rr][cc]+1)%3;else grid[rr][cc]=grid[rr][cc]===1?0:1;moves++;render();api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');if(solved())api.solved();}});regionBorder(b,rr,cc);if(fixed[rr+','+cc]){b.classList.add('given');b.setAttribute('aria-disabled','true');}cells.push(b);board.appendChild(b);}(r,c));
    if(v.kind==='heyawake'){var labels={};for(r=0;r<n;r++)for(c=0;c<n;c++){var id=reg[r][c];if(labels[id])continue;labels[id]=1;var roomClue=v.puzzle.roomClues[id];if(roomClue==null)continue;var lab=LR.el('span',{className:'heyawake-room-clue',text:String(roomClue)});lab.style.left=((c+.12)*100/n)+'%';lab.style.top=((r+.08)*100/n)+'%';board.appendChild(lab);}}
    if(v.kind==='battleships'){var top=LR.el('div',{className:'battleship-top'});v.puzzle.colClues.forEach(function(x){top.appendChild(LR.el('span',{text:String(x)}));});wrap.insertBefore(top,board);var side=LR.el('div',{className:'battleship-side'});v.puzzle.rowClues.forEach(function(x){side.appendChild(LR.el('span',{text:String(x)}));});wrap.appendChild(side);var fleet=LR.el('p',{className:'newlogic-fleet',text:(I&&I.lang==='hu'?'Flotta: ':'Fleet: ')+v.puzzle.fleet.map(function(x){return '▰'.repeat(x);}).join('  ')});host.appendChild(fleet);}
    function render(){cells.forEach(function(b,i){var r=Math.floor(i/n),c=i%n,x=grid[r][c];b.classList.toggle('shade',x===1);b.classList.toggle('water-mark',x===2);b.textContent=x===1?(v.kind==='battleships'?'●':''):x===2?'×':'';b.setAttribute('aria-pressed',x===1?'true':((v.kind==='battleships'||v.kind==='heyawake')&&x===2?'mixed':'false'));if(v.kind==='battleships')b.setAttribute('aria-label',battleshipStateLabel(r,c,x));else b.setAttribute('aria-label',shadeStateLabel(r,c,x));});}
    var clearButton=null,checkButton=null;
    if(v.kind==='battleships'){
      var tools=LR.el('div',{className:'sudoku-tools iteration52-tools battleships-tools'});
      clearButton=LR.el('button',{type:'button',className:'tool-button clear-iteration52-button clear-battleships-button',onclick:function(){var changed=false;for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(!fixed[r+','+c]&&grid[r][c]){grid[r][c]=0;changed=true;}if(changed){moves++;api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');render();}}});
      checkButton=LR.el('button',{type:'button',className:'tool-button check-button check-battleships-button',onclick:function(){var wrong=0;for(var r=0;r<n;r++)for(var c=0;c<n;c++){var x=grid[r][c],ship=!!v.solution[r][c];if((x===1&&!ship)||(x===2&&ship))wrong++;}api.toast(wrong?(I&&I.lang==='hu'?'Van még javítandó jelölés.':'Some markings still need attention.'):(I&&I.lang==='hu'?'Az eddigi jelölések rendben vannak.':'Current markings look good.'));}});
      tools.append(clearButton,checkButton);api.tools.appendChild(tools);
    }else if(v.kind==='heyawake'||v.kind==='lits'){
      var shadeTools=LR.el('div',{className:'sudoku-tools iteration52-tools '+v.kind+'-tools'});
      clearButton=LR.el('button',{type:'button',className:'tool-button clear-iteration52-button clear-'+v.kind+'-button',onclick:function(){var changed=false;for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(!fixed[r+','+c]&&grid[r][c]){grid[r][c]=0;changed=true;}if(changed){moves++;api.setCounter(moves,I&&I.lang==='hu'?'Lépések':'Moves');render();}}});
      checkButton=LR.el('button',{type:'button',className:'tool-button check-button check-'+v.kind+'-button',onclick:function(){var wrong=0;for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(grid[r][c]&&grid[r][c]!==v.solution[r][c])wrong++;api.toast(wrong?(I&&I.lang==='hu'?'Van még javítandó jelölés.':'Some markings still need attention.'):(I&&I.lang==='hu'?'Az eddigi jelölések rendben vannak.':'Current markings look good.'));}});
      shadeTools.append(clearButton,checkButton);api.tools.appendChild(shadeTools);
    }
    var hints={lits:['Minden régióban pontosan négy mezőt feketíts be úgy, hogy azok L, I, T vagy S tetrominót alkossanak. Az összes fekete mező oldal-szomszédosan összefüggő területet alkot; 2×2-es teljesen fekete blokk nem lehet; és két külön régió azonos alakú tetrominója nem érintkezhet egymással oldallal (az elforgatott vagy tükrözött alak is azonos típusnak számít).','Shade exactly four cells in every region so they form an L, I, T or S tetromino. All shaded cells must form one orthogonally connected area; no 2×2 block may be fully shaded; and equal tetromino shapes in different regions may not touch orthogonally (rotations and reflections count as the same type).'],battleships:['Helyezd el a flottát a szélső számok szerint. Kattintás: üres → hajó → vízjel.','Place the fleet using the edge counts. Click: empty → ship → water mark.'],heyawake:['Kattintás: üres → fekete → X (fehér) → üres. A szobaszám pontosan ennyi fekete mezőt kér; a fehér terület maradjon összefüggő.','Click: empty → black → X (white) → empty. Each room number gives its exact black-cell count; keep all white cells connected.']};
    var hint=LR.el('p',{className:'newlogic-hint'});host.appendChild(hint);
    function language(){
      hint.textContent=hints[v.kind][I&&I.lang==='hu'?0:1];
      if(v.kind==='battleships'&&fleet)fleet.textContent=(I&&I.lang==='hu'?'Flotta: ':'Fleet: ')+v.puzzle.fleet.map(function(x){return '▰'.repeat(x);}).join('  ');
      if(clearButton)clearButton.textContent=I&&I.lang==='hu'?'Jelölések törlése':'Clear markings';
      if(checkButton)checkButton.textContent=I?I.t('check'):'Check';
      render();
    }
    language();render();return {moves:function(){return moves;},refreshLanguage:language,destroy:function(){}};
  }


  function mountSamurai(host,v,api){
    var I=root.SudokuI18n,n=21,active=v.data&&v.data.active,grids=(v.data&&v.data.grids)||[],moves=0,cells=[],selected=null,noteMode=false,noteButton=null;
    var grid=Array.from({length:n},function(_,r){return Array.from({length:n},function(_,c){return v.puzzle[r]&&v.puzzle[r][c]||0;});});
    var fixed=Array.from({length:n},function(_,r){return Array.from({length:n},function(_,c){return !!(active&&active[r]&&active[r][c]&&grid[r][c]);});});
    var notes=Array.from({length:n},function(){return Array.from({length:n},function(){return new Set();});});
    var shell=LR.el('div',{className:'samurai-shell'});
    var board=LR.el('div',{className:'samurai-board',role:'grid',tabindex:'0','aria-label':(I?I.variant(v).title:v.title)+' board'});
    shell.appendChild(board);host.appendChild(shell);

    function isActive(r,c){return !!(active&&active[r]&&active[r][c]);}
    function memberships(r,c){
      return grids.filter(function(g){var ro=g.off[0],co=g.off[1];return r>=ro&&r<ro+9&&c>=co&&c<co+9;});
    }
    function conflict(r,c){
      var val=grid[r][c],gs,i,j,g,ro,co,lr,lc,br,bc,rr,cc;
      if(!val)return false;
      gs=memberships(r,c);
      for(i=0;i<gs.length;i+=1){
        g=gs[i];ro=g.off[0];co=g.off[1];lr=r-ro;lc=c-co;
        for(j=0;j<9;j+=1){
          if(co+j!==c&&grid[r][co+j]===val)return true;
          if(ro+j!==r&&grid[ro+j][c]===val)return true;
        }
        br=ro+Math.floor(lr/3)*3;bc=co+Math.floor(lc/3)*3;
        for(rr=br;rr<br+3;rr+=1)for(cc=bc;cc<bc+3;cc+=1)
          if((rr!==r||cc!==c)&&grid[rr][cc]===val)return true;
      }
      return false;
    }
    function solved(){
      for(var r=0;r<n;r+=1)for(var c=0;c<n;c+=1)
        if(isActive(r,c)&&grid[r][c]!==v.solution[r][c])return false;
      return true;
    }
    function render(){
      cells.forEach(function(cell){
        if(!cell.active)return;
        var r=cell.r,c=cell.c,el=cell.el,val=grid[r][c],marks=Array.from(notes[r][c]).sort(function(a,b){return a-b;});
        el.replaceChildren();
        if(val){
          el.textContent=symbolFor(v,val);
        }else if(marks.length){
          var noteGrid=LR.el('span',{className:'sudoku-notes','aria-hidden':'true'});
          noteGrid.style.setProperty('--note-cols',3);
          for(var ni=1;ni<=9;ni+=1){
            noteGrid.appendChild(LR.el('span',{
              className:'sudoku-note'+(notes[r][c].has(ni)?' on':''),
              text:notes[r][c].has(ni)?symbolFor(v,ni):''
            }));
          }
          el.appendChild(noteGrid);
        }
        el.classList.toggle('selected',!!selected&&selected[0]===r&&selected[1]===c);
        el.classList.toggle('conflict',conflict(r,c));
        el.setAttribute(
          'aria-label',
          (I?I.t('row'):'Row')+' '+(r+1)+', '+
          (I?I.t('column'):'column')+' '+(c+1)+
          (val?', '+symbolFor(v,val):', '+(I?I.t('empty'):'empty'))+
          (marks.length?', '+(I?I.t('noteMark'):'notes')+' '+marks.map(function(x){return symbolFor(v,x);}).join(' '):'')+
          (fixed[r][c]?', '+(I?I.t('fixedShort'):'fixed'):'')
        );
      });
      if(noteButton){
        noteButton.classList.toggle('active',noteMode);
        noteButton.setAttribute('aria-pressed',noteMode?'true':'false');
      }
    }
    function select(r,c){
      if(!isActive(r,c))return;
      selected=[r,c];render();
      var cell=cells[r*n+c];if(cell&&cell.el)cell.el.focus();
    }
    function changed(){
      moves+=1;
      api.setCounter(moves,I?I.t('moves'):'Moves');
      api.setStatus(I?I.t('progress'):'In progress');
      render();
      if(solved()){
        cells.forEach(function(cell){if(cell.active)cell.el.disabled=true;});
        api.solved();
      }
    }
    function prunePeerNotes(r,c,val){
      memberships(r,c).forEach(function(g){
        var ro=g.off[0],co=g.off[1],lr=r-ro,lc=c-co;
        var br=ro+Math.floor(lr/3)*3,bc=co+Math.floor(lc/3)*3;
        for(var i=0;i<9;i+=1){
          if(co+i!==c&&isActive(r,co+i))notes[r][co+i].delete(val);
          if(ro+i!==r&&isActive(ro+i,c))notes[ro+i][c].delete(val);
        }
        for(var rr=br;rr<br+3;rr+=1)for(var cc=bc;cc<bc+3;cc+=1)
          if((rr!==r||cc!==c)&&isActive(rr,cc))notes[rr][cc].delete(val);
      });
    }
    function enter(val){
      if(!selected)return;
      var r=selected[0],c=selected[1];
      if(fixed[r][c]){api.toast(I?I.t('fixed'):'That clue is fixed');return;}
      if(val<1||val>9)return;
      if(grid[r][c]!==val||notes[r][c].size){
        grid[r][c]=val;
        notes[r][c].clear();
        prunePeerNotes(r,c,val);
        changed();
      }
    }
    function toggleNote(val){
      if(!selected)return;
      var r=selected[0],c=selected[1];
      if(fixed[r][c]){api.toast(I?I.t('fixed'):'That clue is fixed');return;}
      if(val<1||val>9||grid[r][c])return;
      if(notes[r][c].has(val))notes[r][c].delete(val);
      else notes[r][c].add(val);
      changed();
    }
    function clearCell(){
      if(!selected)return;
      var r=selected[0],c=selected[1];
      if(fixed[r][c]){api.toast(I?I.t('fixed'):'That clue is fixed');return;}
      if(grid[r][c]||notes[r][c].size){
        grid[r][c]=0;
        notes[r][c].clear();
        changed();
      }
    }
    function setNoteMode(on,announce){
      noteMode=!!on;
      render();
      if(announce)api.toast(I?I.t(noteMode?'notesOn':'notesOff'):(noteMode?'Notes mode on':'Notes mode off'));
    }

    for(var r=0;r<n;r+=1)for(var c=0;c<n;c+=1)(function(rr,cc){
      if(!isActive(rr,cc)){
        var gap=LR.el('span',{className:'samurai-gap','aria-hidden':'true'});
        board.appendChild(gap);cells.push({active:false,r:rr,c:cc,el:gap});return;
      }
      var overlap=memberships(rr,cc).length>1;
      var el=LR.el('button',{
        type:'button',
        className:'samurai-cell'+(fixed[rr][cc]?' fixed':'')+(overlap?' overlap':''),
        role:'gridcell',
        onclick:function(){select(rr,cc);}
      });
      board.appendChild(el);cells.push({active:true,r:rr,c:cc,el:el});
      if(!selected&&!fixed[rr][cc])selected=[rr,cc];
    }(r,c));

    if(!selected){
      for(r=0;r<n&&!selected;r+=1)for(c=0;c<n;c+=1)
        if(isActive(r,c)){selected=[r,c];break;}
    }

    board.addEventListener('keydown',function(e){
      var value=valueForKey(v,e.key,9);
      if(e.key==='n'||e.key==='N'){
        setNoteMode(!noteMode,true);
        e.preventDefault();
        return;
      }
      if(value){
        if(noteMode||e.shiftKey)toggleNote(value);
        else enter(value);
        e.preventDefault();
        return;
      }
      if(e.key==='Backspace'||e.key==='Delete'||e.key==='0'){
        clearCell();
        e.preventDefault();
      }
    });

    var tools=LR.el('div',{className:'sudoku-tools samurai-tools'});
    for(var num=1;num<=9;num+=1)(function(value){
      tools.appendChild(LR.el('button',{
        type:'button',
        className:'tool-button',
        text:symbolFor(v,value),
        onclick:function(){if(noteMode)toggleNote(value);else enter(value);},
        'aria-label':(I?I.t('enter'):'Enter')+' '+symbolFor(v,value)
      }));
    }(num));

    noteButton=LR.el('button',{
      type:'button',
      className:'tool-button note-mode-button',
      text:'✎ '+(I?I.t('notes'):'Notes'),
      onclick:function(){setNoteMode(!noteMode,true);},
      'aria-pressed':'false',
      'aria-label':I?I.t('notes'):'Notes'
    });
    tools.appendChild(noteButton);

    tools.appendChild(LR.el('button',{
      type:'button',
      className:'tool-button clear-button',
      text:'×',
      onclick:clearCell,
      'aria-label':I?I.t('clear'):'Clear cell'
    }));
    tools.appendChild(LR.el('button',{
      type:'button',
      className:'tool-button check-button',
      text:I?I.t('check'):'Check',
      onclick:function(){
        var wrong=0;
        for(var rr=0;rr<n;rr+=1)for(var cc=0;cc<n;cc+=1)
          if(isActive(rr,cc)&&grid[rr][cc]&&grid[rr][cc]!==v.solution[rr][cc])wrong+=1;
        api.toast(
          wrong
            ?(wrong===1
              ?(I?I.t('wrongOne'):'1 entry needs attention')
              :wrong+(I?I.t('wrongMany'):' entries need attention'))
            :(I?I.t('noWrong'):'No incorrect entries')
        );
      }
    }));

    api.tools.appendChild(tools);
    render();
    api.setStatus(I&&I.lang==='hu'?'Készen áll':'Ready');
    api.setCounter(0,I?I.t('moves'):'Moves');

    return {
      moves:function(){return moves;},
      refreshLanguage:function(){
        board.setAttribute('aria-label',(I?I.variant(v).title:v.title)+' board');
        var check=tools.querySelector('.check-button'),clear=tools.querySelector('.clear-button');
        noteButton.textContent='✎ '+(I?I.t('notes'):'Notes');
        noteButton.setAttribute('aria-label',I?I.t('notes'):'Notes');
        if(check)check.textContent=I?I.t('check'):'Check';
        if(check)check.setAttribute('aria-label',I?I.t('check'):'Check');
        if(clear)clear.setAttribute('aria-label',I?I.t('clear'):'Clear cell');
        render();
      },
      destroy:function(){}
    };
  }

  function mountBoard(host, v, api, state){
    if(v.kind==='lits'||v.kind==='battleships'||v.kind==='heyawake')return mountIteration52Puzzle(host,v,api);
    if(v.kind==='yajilin')return mountYajilin(host,v,api);
    if(v.kind==='shakashaka')return mountShakashaka(host,v,api);
    if(v.kind==='rippleeffect')return mountIteration51Puzzle(host,v,api);
    if(v.kind==='starbattle')return mountShadePuzzle(host,v,api,'starbattle');
    if(v.kind==='aquarium')return mountShadePuzzle(host,v,api,'aquarium');
    if(v.kind==='galaxies')return mountGalaxies(host,v,api);
    if(v.kind==='masyu')return mountMasyu(host,v,api);
    if(v.kind==='nonogram')return mountNonogram(host,v,api);
    if(v.kind==='nurikabe')return mountNurikabe(host,v,api);
    if(v.kind==='akari')return mountAkari(host,v,api);
    if(v.kind==='slitherlink')return mountSlitherlink(host,v,api);
    if(v.kind==='futoshiki')return mountFutoshiki(host,v,api);
    if(v.kind==='fillomino')return mountFillomino(host,v,api);
    if(v.kind==='bridges')return mountBridges(host,v,api);
    if(v.kind==='hitori')return mountHitori(host,v,api);
    var n=v.solution.length, inputMax=(v.data&&v.data.inputMax)||n, grid=v.puzzle.map(function(r){return r.slice();}), fixed=v.puzzle.map(function(r){return r.map(Boolean);});
    var shell=LR.el('div',{className:'sudoku-board-shell'}), board=LR.el('div',{className:'puzzle-board sudoku-board',role:'grid',tabindex:'0','aria-label':v.title+' board'}), cells=[], selected=[0,0], moves=0, noteMode=false, noteButton=null, notes=Array.from({length:n},function(){return Array.from({length:n},function(){return new Set();});});
    board.style.setProperty('--sudoku-size',n); shell.appendChild(board); host.appendChild(shell);
    var perimeterKinds=['skyscraper','skyscrapersums','skyscraperproduct','skyscrapermixed','skyscrapernontouching','killerskyscrapers','skyscraperparks','sumskyscraperparks','skyscraperparks2','dominoskyscrapers','evenoddskyscrapers','doubleskyscrapers','sandwich','xsums','frame','runningcells','ascendingsequences','numberedrooms','nexttonine','evensandwich','rossini'];
    function perimeterClueText(cl){
      if(kindIs(v,'sandwich')||kindIs(v,'xsums')||kindIs(v,'frame'))return String(cl.sum);
      if(kindIs(v,'runningcells')||kindIs(v,'ascendingsequences'))return String(cl.count);
      if(kindIs(v,'numberedrooms'))return String(cl.digit);
      if(kindIs(v,'nexttonine')||kindIs(v,'evensandwich'))return (cl.digits&&cl.digits.length)?cl.digits.join('·'):'–';
      if(kindIs(v,'rossini'))return cl.dir==='inc'?'↗':'↘';
      if(kindIs(v,'skyscrapersums')||kindIs(v,'sumskyscraperparks'))return 'Σ'+cl.sum;
      if(kindIs(v,'skyscraperproduct'))return 'Π'+cl.product;
      if(kindIs(v,'skyscrapermixed'))return String(cl.value);
      if(kindIs(v,'evenoddskyscrapers'))return cl.parity==='even'?'■':'●';
      return String(cl.count);
    }
    function mountPerimeterClues(){
      if(!v.data.clues||!perimeterKinds.some(function(k){return kindIs(v,k);}))return false;
      shell.classList.add('has-perimeter-clues');
      ['top','right','bottom','left'].forEach(function(side){var rail=LR.el('div',{className:'sudoku-perimeter-clues '+side,'aria-hidden':'true'});rail.style.setProperty('--sudoku-size',n);shell.appendChild(rail);});
      v.data.clues.forEach(function(cl){
        var side=cl.side||(cl.axis==='row'?'left':'top'),idx=cl.index;
        if(idx==null||idx<0||idx>=n)return;
        var rail=shell.querySelector('.sudoku-perimeter-clues.'+side);if(!rail)return;
        var marker=LR.el('span',{className:'sudoku-perimeter-clue',text:perimeterClueText(cl)});
        marker.style.setProperty('--clue-index',idx);marker.setAttribute('aria-label',(I?I.t(side):side)+' '+(idx+1)+': '+perimeterClueText(cl));rail.appendChild(marker);
      });
      return true;
    }
    var hasPerimeterClues=mountPerimeterClues();
    function mountLittleKillerClues(){
      if(!kindIs(v,'littlekiller')||!v.data.clues)return false;
      shell.classList.add('has-littlekiller-clues');
      v.data.clues.forEach(function(cl){
        if(!cl.cells||cl.cells.length<2)return;
        var a=cl.cells[0],b=cl.cells[1],dr=b[0]-a[0],dc=b[1]-a[1];
        var arrows={'-1,-1':'↖','-1,1':'↗','1,-1':'↙','1,1':'↘'},arrow=arrows[dr+','+dc]||'↘';
        var marker=LR.el('span',{className:'sudoku-littlekiller-clue',text:String(cl.sum)+arrow,'aria-hidden':'true'});
        marker.style.left=((a[1]+.5-dc*.92)*100/n)+'%';
        marker.style.top=((a[0]+.5-dr*.92)*100/n)+'%';
        shell.appendChild(marker);
      });
      return true;
    }
    var hasLittleKillerClues=mountLittleKillerClues();
    if(kindIs(v,'diagonal')) board.classList.add('show-diagonals');
    if(kindIs(v,'bishopsgate')) board.classList.add('show-bishopsgate');
    if(kindIs(v,'hyper')) board.classList.add('show-hyper');
    var overlay=document.createElementNS('http://www.w3.org/2000/svg','svg');overlay.setAttribute('viewBox','0 0 100 100');overlay.setAttribute('class','sudoku-overlay');overlay.setAttribute('aria-hidden','true');shell.appendChild(overlay);
    if(v.data.thermos)v.data.thermos.forEach(function(line){svgLine(overlay,line,'thermo-line',true);});
    if(v.data.lines&&kindIs(v,'renban'))v.data.lines.forEach(function(line){if(Array.isArray(line))svgLine(overlay,line,'renban-line',false);});
    if(v.data.lines&&kindIs(v,'whispers'))v.data.lines.forEach(function(line){if(Array.isArray(line))svgLine(overlay,line,'whisper-line',false);});
    if(v.data.lines&&kindIs(v,'between'))v.data.lines.forEach(function(line){if(line.cells){svgLine(overlay,line.cells,'between-line',true);svgLine(overlay,line.cells.slice().reverse(),'between-line-endcap',true);}});
    if(v.data.arrows)v.data.arrows.forEach(function(a){svgLine(overlay,[a.circle].concat(a.path),'arrow-line',true);});
    ['palindrome','parityline','entropic','modular','regionsum','slowthermo'].forEach(function(k){if(v.data.lines&&kindIs(v,k))v.data.lines.forEach(function(line){var pts=Array.isArray(line)?line:line.cells;if(pts)svgLine(overlay,pts,k+'-line',k==='slowthermo');});});
    if(v.data.lines&&kindIs(v,'zipper'))v.data.lines.forEach(function(line){if(line.cells)svgLine(overlay,line.cells,'zipper-line',true);});
    if(v.data.lines&&kindIs(v,'dutchwhispers'))v.data.lines.forEach(function(line){if(Array.isArray(line))svgLine(overlay,line,'dutchwhispers-line',false);});
    if(v.data.lines&&kindIs(v,'nabner'))v.data.lines.forEach(function(line){if(Array.isArray(line))svgLine(overlay,line,'nabner-line',false);});
    if(v.data.lines&&kindIs(v,'uniqueline'))v.data.lines.forEach(function(line){if(Array.isArray(line))svgLine(overlay,line,'uniqueline-line',false);});
    if(v.data.lines&&kindIs(v,'lockout'))v.data.lines.forEach(function(line){if(line.cells)svgLine(overlay,line.cells,'lockout-line',true);});
    if(kindIs(v,'reflection')&&v.data.reflectionGroups){v.data.reflectionGroups.forEach(function(g){g.lines.forEach(function(line){svgLine(overlay,line,'reflection-line',false);});});}

    if(v.data.sightClues){v.data.sightClues.forEach(function(cl){if(kindIs(v,'insideskyscrapers')&&cl.source){var m=LR.el('span',{className:'sudoku-inside-sky-marker',text:cl.arrow||'→','aria-hidden':'true'});m.style.left=((cl.source[1]+.82)*100/n)+'%';m.style.top=((cl.source[0]+.18)*100/n)+'%';shell.appendChild(m);}else if(kindIs(v,'diagonalskyscrapers')&&cl.start){var dr=cl.dir[0],dc=cl.dir[1],dm=LR.el('span',{className:'sudoku-diagonal-sky-marker',text:String(cl.count)+(cl.arrow||''),'aria-hidden':'true'});dm.style.left=((cl.start[1]+.5-dc*.55)*100/n)+'%';dm.style.top=((cl.start[0]+.5-dr*.55)*100/n)+'%';shell.appendChild(dm);}});}

    function cageAt(r,c){return (v.data.cages||[]).find(function(g){return g.cells.some(function(p){return p[0]===r&&p[1]===c;});});}
    function cageHas(g,r,c){return g&&g.cells.some(function(p){return p[0]===r&&p[1]===c;});}
    function render(){
      cells.forEach(function(cell,idx){
        var r=Math.floor(idx/n),c=idx%n,val=grid[r][c],marks=Array.from(notes[r][c]).sort(function(a,b){return a-b;});cell.replaceChildren();
        if(val){var tc=kindIs(v,'toroidalskyscrapers')&&(v.data.toroidalClues||[]).find(function(cl){return cl.cell[0]===r&&cl.cell[1]===c;});cell.textContent=tc?(String(tc.count)+tc.arrow):symbolFor(v,val);}else if(marks.length){var noteGrid=LR.el('span',{className:'sudoku-notes','aria-hidden':'true'});noteGrid.style.setProperty('--note-cols',n<=4?2:(n<=9?3:4));for(var ni=1;ni<=inputMax;ni+=1)noteGrid.appendChild(LR.el('span',{className:'sudoku-note'+(notes[r][c].has(ni)?' on':''),text:notes[r][c].has(ni)?symbolFor(v,ni):''}));cell.appendChild(noteGrid);}
        cell.classList.toggle('selected',selected[0]===r&&selected[1]===c);cell.classList.toggle('park-cell',!!(v.data&&v.data.parkValue===val));cell.classList.toggle('toroidal-clue-cell',kindIs(v,'toroidalskyscrapers')&&(v.data.toroidalClues||[]).some(function(cl){return cl.cell[0]===r&&cl.cell[1]===c;}));cell.classList.toggle('conflict',classicConflict(grid,r,c,v)||variantConflict(v,grid,r,c));
        cell.setAttribute('aria-label',(I?I.t('row'):'Row')+' '+(r+1)+', '+(I?I.t('column'):'column')+' '+(c+1)+(val?', '+symbolFor(v,val):', '+(I?I.t('empty'):'empty'))+(marks.length?', '+(I?I.t('noteMark'):'notes')+' '+marks.map(function(x){return symbolFor(v,x);}).join(' '):'')+(fixed[r][c]?', '+(I?I.t('fixedShort'):'fixed'):''));
      });
      if(noteButton){noteButton.classList.toggle('active',noteMode);noteButton.setAttribute('aria-pressed',noteMode?'true':'false');}
    }
    function solved(){for(var r=0;r<n;r+=1)for(var c=0;c<n;c+=1)if(grid[r][c]!==v.solution[r][c])return false;return true;}
    function select(r,c){selected=[r,c];render();cells[r*n+c].focus();}
    function changed(){moves+=1;cells[selected[0]*n+selected[1]].classList.remove('checked-wrong');api.setCounter(moves,I?I.t('moves'):'Moves');api.setStatus(I?I.t('progress'):'In progress');render();}
    function prunePeerNotes(r,c,val){var dims=n===6?[2,3]:(n===12?[3,4]:(n===16?[4,4]:[Math.sqrt(n)|0,Math.sqrt(n)|0])),br=Math.floor(r/dims[0])*dims[0],bc=Math.floor(c/dims[1])*dims[1],rr,cc;if(kindIs(v,'doubleskyscrapers')){var rowSeen=0,colSeen=0;for(var di=0;di<n;di+=1){if(grid[r][di]===val)rowSeen+=1;if(grid[di][c]===val)colSeen+=1;}if(rowSeen>=2)for(di=0;di<n;di+=1)if(di!==c)notes[r][di].delete(val);if(colSeen>=2)for(di=0;di<n;di+=1)if(di!==r)notes[di][c].delete(val);}else if(kindIs(v,'skyscraperparks2')&&v.data&&val===v.data.parkValue){var parkQuota=v.data.parksPerLine||2,rowParks=0,colParks=0;for(var pi=0;pi<n;pi+=1){if(grid[r][pi]===val)rowParks+=1;if(grid[pi][c]===val)colParks+=1;}if(rowParks>=parkQuota)for(pi=0;pi<n;pi+=1)if(pi!==c)notes[r][pi].delete(val);if(colParks>=parkQuota)for(pi=0;pi<n;pi+=1)if(pi!==r)notes[pi][c].delete(val);}else for(var i=0;i<n;i+=1){if(i!==c)notes[r][i].delete(val);if(i!==r)notes[i][c].delete(val);}if(!(v.data&&v.data.latinOnly)&&!kindIs(v,'jigsaw')&&!kindIs(v,'skyscraperparks')&&!kindIs(v,'sumskyscraperparks')&&!kindIs(v,'skyscraperparks2')&&!kindIs(v,'dominoskyscrapers')&&!kindIs(v,'evenoddskyscrapers')&&!kindIs(v,'toroidalskyscrapers')&&!kindIs(v,'doubleskyscrapers'))for(rr=br;rr<br+dims[0];rr+=1)for(cc=bc;cc<bc+dims[1];cc+=1)if(rr!==r||cc!==c)notes[rr][cc].delete(val);if(kindIs(v,'axia')&&v.data.axia){v.data.axia.forEach(function(a){if(a[0]===r&&a[1]===c){for(var dr=-1;dr<=1;dr+=2)for(var dc=-1;dc<=1;dc+=2)for(var k=1;;k+=1){var ar=r+dr*k,ac=c+dc*k;if(ar<0||ar>=n||ac<0||ac>=n)break;notes[ar][ac].delete(val);}}else if(Math.abs(r-a[0])===Math.abs(c-a[1]))notes[a[0]][a[1]].delete(val);});}if(kindIs(v,'couples')&&v.data.couples){v.data.couples.forEach(function(cp){var other=null;if(cp.a[0]===r&&cp.a[1]===c)other=cp.b;else if(cp.b[0]===r&&cp.b[1]===c)other=cp.a;if(!other)return;for(var dgt=1;dgt<=n;dgt+=1)if((((dgt%2)===(val%2))!==!!cp.same))notes[other[0]][other[1]].delete(dgt);});}if(kindIs(v,'bishopsgate')&&(((r+c)&1)===(v.data.parity==null?0:v.data.parity))){for(var bdr=-1;bdr<=1;bdr+=2)for(var bdc=-1;bdc<=1;bdc+=2)for(var bk=1;;bk+=1){var brr=r+bdr*bk,bcc=c+bdc*bk;if(brr<0||brr>=n||bcc<0||bcc>=n)break;notes[brr][bcc].delete(val);}}if(kindIs(v,'minmax')&&v.data.extrema){v.data.extrema.forEach(function(ex){var er=ex.cell[0],ec=ex.cell[1],dist=Math.abs(er-r)+Math.abs(ec-c);if(dist>1)return;if(er===r&&ec===c){[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(o){var nr=r+o[0],nc=c+o[1];if(nr<0||nr>=n||nc<0||nc>=n)return;for(var dgt=1;dgt<=n;dgt+=1)if((ex.type==='min'&&dgt<=val)||(ex.type==='max'&&dgt>=val))notes[nr][nc].delete(dgt);});}else{for(var dgt=1;dgt<=n;dgt+=1)if((ex.type==='min'&&dgt>=val)||(ex.type==='max'&&dgt<=val))notes[er][ec].delete(dgt);}});}if(kindIs(v,'topheavyparity')){if(r>0)for(var td=1;td<=n;td+=1)if(td%2===val%2&&td<=val)notes[r-1][c].delete(td);if(r<n-1)for(var tu=1;tu<=n;tu+=1)if(tu%2===val%2&&tu>=val)notes[r+1][c].delete(tu);}if(kindIs(v,'skyscrapernontouching')){for(var ndr=-1;ndr<=1;ndr+=2)for(var ndc=-1;ndc<=1;ndc+=2){var nr=r+ndr,nc=c+ndc;if(nr>=0&&nr<n&&nc>=0&&nc<n)notes[nr][nc].delete(val);}}if(kindIs(v,'evenoddskyscrapers')&&v.data.parityCells){v.data.parityCells.forEach(function(pc){for(var pd=1;pd<=n;pd+=1)if((pd%2?'odd':'even')!==pc.parity)notes[pc.cell[0]][pc.cell[1]].delete(pd);});}}
    function enter(val){var r=selected[0],c=selected[1];if(fixed[r][c]){api.toast(I?I.t('fixed'):'That clue is fixed');return;}if(val<0||val>inputMax)return;if(grid[r][c]!==val||notes[r][c].size){grid[r][c]=val;notes[r][c].clear();if(val)prunePeerNotes(r,c,val);changed();}if(solved()){cells.forEach(function(x){x.disabled=true;});api.solved();}}
    function toggleNote(val){var r=selected[0],c=selected[1];if(fixed[r][c]){api.toast(I?I.t('fixed'):'That clue is fixed');return;}if(val<1||val>inputMax||grid[r][c])return;if(notes[r][c].has(val))notes[r][c].delete(val);else notes[r][c].add(val);changed();}
    function clearCell(){var r=selected[0],c=selected[1];if(fixed[r][c]){api.toast(I?I.t('fixed'):'That clue is fixed');return;}if(grid[r][c]||notes[r][c].size){grid[r][c]=0;notes[r][c].clear();changed();}}
    function setNoteMode(on,announce){noteMode=!!on;render();if(announce)api.toast(I?I.t(noteMode?'notesOn':'notesOff'):(noteMode?'Notes mode on':'Notes mode off'));}

    for(var r=0;r<n;r+=1)for(var c=0;c<n;c+=1)(function(rr,cc){
      var b=LR.el('button',{type:'button',className:'sudoku-cell'+(fixed[rr][cc]?' fixed':''),role:'gridcell',onclick:function(){select(rr,cc);}});
      var dims=n===6?[2,3]:(n===12?[3,4]:(n===16?[4,4]:[Math.sqrt(n)|0,Math.sqrt(n)|0]));
      if(!(v.data&&v.data.latinOnly)&&!kindIs(v,'jigsaw')&&!kindIs(v,'skyscraperparks')&&!kindIs(v,'sumskyscraperparks')&&!kindIs(v,'skyscraperparks2')&&!kindIs(v,'dominoskyscrapers')&&!kindIs(v,'evenoddskyscrapers')){if((cc+1)%dims[1]===0&&cc<n-1)b.classList.add('box-right');if((rr+1)%dims[0]===0&&rr<n-1)b.classList.add('box-bottom');}
      if(kindIs(v,'sukaku')&&v.data.candidates&&v.data.candidates[rr][cc]){b.classList.add('sukaku-cell');b.dataset.candidates=v.data.candidates[rr][cc].map(function(x){return symbolFor(v,x);}).join(' ');}
      if(kindIs(v,'hyper')&&((rr>=1&&rr<=3)||(rr>=5&&rr<=7))&&((cc>=1&&cc<=3)||(cc>=5&&cc<=7)))b.classList.add('hyper-cell');
      if(kindIs(v,'parity')&&v.data[rcKey(rr,cc)])b.classList.add(v.data[rcKey(rr,cc)]==='odd'?'parity-odd':'parity-even');
      if(kindIs(v,'evenoddskyscrapers')&&v.data.parityCells){var ep=v.data.parityCells.find(function(pc){return pc.cell[0]===rr&&pc.cell[1]===cc;});if(ep)b.classList.add(ep.parity==='odd'?'parity-odd':'parity-even');}
      if(kindIs(v,'fortress')&&(v.data.cells||[]).some(function(p){return p[0]===rr&&p[1]===cc;}))b.classList.add('fortress-cell');
      if(kindIs(v,'jigsaw')&&v.data.regions){b.dataset.region=String(v.data.regions[rr][cc]);if(rr===0||v.data.regions[rr-1][cc]!==v.data.regions[rr][cc])b.classList.add('jigsaw-top');if(rr===n-1||v.data.regions[rr+1][cc]!==v.data.regions[rr][cc])b.classList.add('jigsaw-bottom');if(cc===0||v.data.regions[rr][cc-1]!==v.data.regions[rr][cc])b.classList.add('jigsaw-left');if(cc===n-1||v.data.regions[rr][cc+1]!==v.data.regions[rr][cc])b.classList.add('jigsaw-right');}
      if(kindIs(v,'magicsquare')&&rr>=3&&rr<=5&&cc>=3&&cc<=5)b.classList.add('magic-square-cell');
      if(kindIs(v,'extracells')&&(v.data.cells||[]).some(function(p){return p[0]===rr&&p[1]===cc;}))b.classList.add('extra-region-cell');
      if(kindIs(v,'clone')&&v.data.clones){v.data.clones.forEach(function(group,gi){if(group.some(function(p){return p[0]===rr&&p[1]===cc;})){b.classList.add('clone-cell');b.classList.add(gi===0?'clone-a':'clone-b');}});}
      if(kindIs(v,'bishopsgate')&&(((rr+cc)&1)===(v.data.parity==null?0:v.data.parity)))b.classList.add('bishopsgate-cell');
      if(kindIs(v,'minmax')&&(v.data.extrema||[]).some(function(ex){return ex.cell[0]===rr&&ex.cell[1]===cc;}))b.classList.add('minmax-cell');
      var cg=cageAt(rr,cc);if(cg){b.classList.add('cage-cell');if(!cageHas(cg,rr-1,cc))b.classList.add('cage-top');if(!cageHas(cg,rr+1,cc))b.classList.add('cage-bottom');if(!cageHas(cg,rr,cc-1))b.classList.add('cage-left');if(!cageHas(cg,rr,cc+1))b.classList.add('cage-right');var first=cg.cells.slice().sort(function(a,bx){return a[0]-bx[0]||a[1]-bx[1];})[0];if(first[0]===rr&&first[1]===cc)b.dataset.cageSum=cg.sum;}
      if(kindIs(v,'dominoskyscrapers')&&v.data.dominoes){var dm=v.data.dominoes.find(function(x){return x.some(function(p){return p[0]===rr&&p[1]===cc;});});if(dm){b.classList.add('domino-cell');var other=dm[0][0]===rr&&dm[0][1]===cc?dm[1]:dm[0];if(other[0]!==rr-1)b.classList.add('domino-top');if(other[0]!==rr+1)b.classList.add('domino-bottom');if(other[1]!==cc-1)b.classList.add('domino-left');if(other[1]!==cc+1)b.classList.add('domino-right');}}
      cells.push(b);board.appendChild(b);
    }(r,c));

    // edge markers
    (v.data.edges||[]).forEach(function(e){
      var a=e.a,b=e.b, marker=LR.el('span',{className:'sudoku-edge-marker marker-'+(v.kind==='combined'?(v.kinds||[]).find(function(k){return ['kropki','xv','greater','consecutive'].indexOf(k)!==-1;})||'combined':v.kind),'aria-hidden':'true'}), midR=(a[0]+b[0]+1)/2,midC=(a[1]+b[1]+1)/2;
      marker.style.left=(midC*100/n)+'%';marker.style.top=(midR*100/n)+'%';
      if(kindIs(v,'kropki'))marker.classList.add(e.type==='black'?'black':'white');
      if(kindIs(v,'xv'))marker.textContent=e.sum===10?'X':'V';
      if(kindIs(v,'greater'))marker.textContent=e.op;
      if(kindIs(v,'consecutive'))marker.textContent='•';
      shell.appendChild(marker);
    });

    if(kindIs(v,'quadruple')&&v.data.quads){v.data.quads.forEach(function(q){var marker=LR.el('span',{className:'sudoku-quad-marker',text:q.digits.join(' · '),'aria-hidden':'true'});marker.style.left=(q.at[1]*100/n)+'%';marker.style.top=(q.at[0]*100/n)+'%';shell.appendChild(marker);});}
    if(kindIs(v,'quadsums')&&v.data.quadSums){v.data.quadSums.forEach(function(q){var marker=LR.el('span',{className:'sudoku-quad-sum-marker',text:'','aria-hidden':'true'});marker.style.left=(q[1]*100/n)+'%';marker.style.top=(q[0]*100/n)+'%';shell.appendChild(marker);});}
    if(kindIs(v,'battenburg')&&v.data.battenburg){v.data.battenburg.forEach(function(q){var marker=LR.el('span',{className:'sudoku-battenburg-marker','aria-hidden':'true'});marker.style.left=(q[1]*100/n)+'%';marker.style.top=(q[0]*100/n)+'%';shell.appendChild(marker);});}
    if(kindIs(v,'reflection')&&v.data.reflectionGroups){v.data.reflectionGroups.forEach(function(g){g.lines.forEach(function(line){var p=line[0],marker=LR.el('span',{className:'sudoku-reflection-symbol',text:g.symbol,'aria-hidden':'true'});marker.style.left=((p[1]+.5)*100/n)+'%';marker.style.top=((p[0]+.5)*100/n)+'%';shell.appendChild(marker);});});}
    if(kindIs(v,'slingshot')&&v.data.slingshots){v.data.slingshots.forEach(function(sh){var sc=sh.cell,src=sh.source,arrow=sh.dir[0]===-1?'↑':sh.dir[0]===1?'↓':sh.dir[1]===-1?'←':'→';var ring=LR.el('span',{className:'sudoku-slingshot-source','aria-hidden':'true'});ring.style.left=((src[1]+.5)*100/n)+'%';ring.style.top=((src[0]+.5)*100/n)+'%';shell.appendChild(ring);var mark=LR.el('span',{className:'sudoku-slingshot-arrow',text:arrow,'aria-hidden':'true'});mark.style.left=((sc[1]+.5)*100/n)+'%';mark.style.top=((sc[0]+.5)*100/n)+'%';shell.appendChild(mark);});}
    if(kindIs(v,'axia')&&v.data.axia){v.data.axia.forEach(function(p){var mark=LR.el('span',{className:'sudoku-axia-marker',text:'✣','aria-hidden':'true'});mark.style.left=((p[1]+.5)*100/n)+'%';mark.style.top=((p[0]+.5)*100/n)+'%';shell.appendChild(mark);});}
    if(kindIs(v,'couples')&&v.data.couples){v.data.couples.forEach(function(cp){var midR=(cp.a[0]+cp.b[0]+1)/2,midC=(cp.a[1]+cp.b[1]+1)/2,mark=LR.el('span',{className:'sudoku-couples-marker'+(cp.same?'':' different'),text:cp.same?'~':'≁','aria-hidden':'true'});mark.style.left=(midC*100/n)+'%';mark.style.top=(midR*100/n)+'%';shell.appendChild(mark);});}
    if(kindIs(v,'minmax')&&v.data.extrema){v.data.extrema.forEach(function(ex){var p=ex.cell,mark=LR.el('span',{className:'sudoku-minmax-marker '+ex.type,text:ex.type==='min'?'⌄':'⌃','aria-hidden':'true'});mark.style.left=((p[1]+.5)*100/n)+'%';mark.style.top=((p[0]+.5)*100/n)+'%';shell.appendChild(mark);});}

    // Outside clue panel, concise rather than crowding the board.
    if(!hasPerimeterClues&&!hasLittleKillerClues&&v.data.clues&&['sandwich','littlekiller','xsums','rossini','frame','runningcells','ascendingsequences','numberedrooms','nexttonine','evensandwich'].some(function(k){return kindIs(v,k);})){
      var countClueKind=kindIs(v,'runningcells')||kindIs(v,'ascendingsequences')||kindIs(v,'numberedrooms')||kindIs(v,'nexttonine')||kindIs(v,'evensandwich')||kindIs(v,'skyscraperparks')||kindIs(v,'sumskyscraperparks')||kindIs(v,'skyscraperparks2');
      var clueBox=LR.el('div',{className:'sudoku-clue-strip'+(countClueKind?' count-clues':'')});var maxClues=(kindIs(v,'frame')||kindIs(v,'numberedrooms')||kindIs(v,'skyscraperparks')||kindIs(v,'sumskyscraperparks')||kindIs(v,'skyscraperparks2'))?36:((kindIs(v,'skyscraper')||kindIs(v,'evenoddskyscrapers')||kindIs(v,'doubleskyscrapers')||countClueKind)?24:12),subset=v.data.clues.slice(0,maxClues);
      subset.forEach(function(cl){var label='';if(cl.cells)label='↘ '+cl.sum;else if(kindIs(v,'skyscraperparks')||kindIs(v,'skyscraperparks2'))label=(I?I.t(cl.side||''):(cl.side||''))+' '+(cl.index+1)+': '+cl.count;else if(kindIs(v,'sumskyscraperparks'))label=(I?I.t(cl.side||''):(cl.side||''))+' '+(cl.index+1)+': Σ'+cl.sum;else if(kindIs(v,'evenoddskyscrapers'))label=(I?I.t(cl.side||''):(cl.side||''))+' '+(cl.index+1)+': '+(cl.parity==='even'?'■':'●');else if(kindIs(v,'skyscraper')||kindIs(v,'skyscrapernontouching')||kindIs(v,'dominoskyscrapers')||kindIs(v,'doubleskyscrapers'))label=(I?I.t(cl.side||''):(cl.side||''))+' '+(cl.index+1)+': '+cl.count;else if(kindIs(v,'skyscrapersums'))label=(I?I.t(cl.side||''):(cl.side||''))+' '+(cl.index+1)+': Σ'+cl.sum;else if(kindIs(v,'skyscraperproduct'))label=(I?I.t(cl.side||''):(cl.side||''))+' '+(cl.index+1)+': Π'+cl.product;else if(kindIs(v,'killerskyscrapers'))label=(I?I.t(cl.side||''):(cl.side||''))+' '+(cl.index+1)+': '+cl.count;else if(kindIs(v,'skyscrapermixed'))label=(I?I.t(cl.side||''):(cl.side||''))+' '+(cl.index+1)+': '+cl.value;else if(kindIs(v,'numberedrooms'))label=(I?I.t(cl.side||''):(cl.side||''))+' '+(cl.axis==='row'?'R':'C')+(cl.index+1)+': '+cl.digit;else if(kindIs(v,'nexttonine'))label=(cl.axis==='row'?(I?I.t('row'):'Row'):(I?I.t('column'):'Column'))+' '+(cl.index+1)+': '+cl.digits.join('·');else if(kindIs(v,'evensandwich'))label=(cl.axis==='row'?(I?I.t('row'):'Row'):(I?I.t('column'):'Column'))+' '+(cl.index+1)+': '+(cl.digits.length?cl.digits.join('·'):'–');else if(countClueKind)label=(cl.axis==='row'?(I?I.t('row'):'Row'):(I?I.t('column'):'Column'))+' '+(cl.index+1)+': '+cl.count;else if(kindIs(v,'rossini'))label=(I?I.t(cl.side||''):(cl.side||''))+' '+(cl.axis==='row'?'R':'C')+(cl.index+1)+' '+(cl.dir==='inc'?'↗':'↘');else label=(cl.side?(I?I.t(cl.side):cl.side)+' ':'')+(cl.axis==='row'?'R':'C')+(cl.index+1)+': '+cl.sum;clueBox.appendChild(LR.el('span',{className:countClueKind?'clue-'+cl.axis:'',text:label}));});host.appendChild(clueBox);
    }

    board.addEventListener('keydown',function(e){var r=selected[0],c=selected[1];if(e.key==='ArrowLeft')c=Math.max(0,c-1);else if(e.key==='ArrowRight')c=Math.min(n-1,c+1);else if(e.key==='ArrowUp')r=Math.max(0,r-1);else if(e.key==='ArrowDown')r=Math.min(n-1,r+1);else if(e.key==='n'||e.key==='N'){setNoteMode(!noteMode,true);e.preventDefault();return;}else if((e.key==='p'||e.key==='P')&&v.data&&v.data.parkValue){if(noteMode)toggleNote(v.data.parkValue);else enter(v.data.parkValue);e.preventDefault();return;}else if(valueForKey(v,e.key,inputMax)>0){var keyed=valueForKey(v,e.key,inputMax);if(noteMode||e.shiftKey)toggleNote(keyed);else enter(keyed);e.preventDefault();return;}else if(e.key==='Backspace'||e.key==='Delete'||e.key==='0'){clearCell();e.preventDefault();return;}else return;e.preventDefault();select(r,c);});

    var tool=LR.el('div',{className:'sudoku-tools'+(inputMax>9?' large-input-tools':'')});for(var num=1;num<=inputMax;num+=1)(function(value){tool.appendChild(LR.el('button',{type:'button',className:'tool-button',text:symbolFor(v,value),onclick:function(){if(noteMode)toggleNote(value);else enter(value);},'aria-label':(I?I.t('enter'):'Enter')+' '+symbolFor(v,value)}));}(num));
    noteButton=LR.el('button',{type:'button',className:'tool-button note-mode-button',text:'✎ '+(I?I.t('notes'):'Notes'),onclick:function(){setNoteMode(!noteMode,true);},'aria-pressed':'false','aria-label':I?I.t('notes'):'Notes'});tool.appendChild(noteButton);
    tool.appendChild(LR.el('button',{type:'button',className:'tool-button clear-button',text:'×',onclick:clearCell,'aria-label':I?I.t('clear'):'Clear cell'}));
    tool.appendChild(LR.el('button',{type:'button',className:'tool-button check-button',text:I?I.t('check'):'Check',onclick:function(){var wrong=0;for(var rr=0;rr<n;rr+=1)for(var cc=0;cc<n;cc+=1)if(grid[rr][cc]&&grid[rr][cc]!==v.solution[rr][cc]){cells[rr*n+cc].classList.add('checked-wrong');wrong+=1;}api.toast(wrong?(wrong===1?(I?I.t('wrongOne'):'1 entry needs attention'):wrong+(I?I.t('wrongMany'):' entries need attention')):(I?I.t('noWrong'):'No incorrect entries'));}}));
    api.tools.appendChild(tool);render();api.setStatus('Ready');api.setCounter(0,'Moves');
    return {
      moves:function(){return moves;},
      refreshLanguage:function(){
        board.setAttribute('aria-label',(I?I.variant(v).title:v.title)+' board');
        render();
      },
      destroy:function(){}
    };
  }

  LR.register({
    id:'sudoku-library', title:'Sudoku Library', family:'Sudoku', families:['sudoku'], duration:'3–45 min',
    description:'97 logic systems · endless seeded boards.',
    objective:'Sudoku collection',
    rules:['Sudoku collection'],
    difficulties:[{id:'gentle',label:'Gentle'},{id:'focused',label:'Focused'},{id:'expert',label:'Expert'}],
    preview:'<div class="mini-sudoku"><i>5</i><i>3</i><i></i><i></i><i>7</i><i></i><i></i><i>1</i><i>9</i><i>5</i><i></i><i></i><i></i><i>6</i><i></i><i></i></div>',
    mount:function(api){
      root.SudokuLibraryState=root.SudokuLibraryState||{};
      var remembered=root.SudokuBank.find(function(v){return v.id===root.SudokuLibraryState.currentId;});
      var wrap=LR.el('div',{className:'sudoku-library-wrap'}), play=LR.el('div',{className:'sudoku-play-area'}), rule=LR.el('p',{className:'sudoku-variant-rule'}), generation=LR.el('p',{className:'sudoku-generation-note'}), boardHost=LR.el('div',{className:'sudoku-board-host'}), current=remembered||root.SudokuBank[0], boardInst=null, lastVariant=null, moves=0;
      var familySelect=document.getElementById('category-select'),variantSelect=document.getElementById('variant-select'),count=document.getElementById('variant-count'),categoryList=document.getElementById('category-list');
      var skyscraperIds=['classic-skyscrapers','skyscraper','skyscraper-sums','skyscraper-mixed','skyscraper-nontouching','skyscraper-parks','sum-skyscraper-parks','inside-skyscrapers','diagonal-skyscrapers','product-skyscrapers','killer-skyscrapers','domino-skyscrapers','skyscraper-parks2','evenodd-skyscrapers','toroidal-skyscrapers','double-skyscrapers'];
      function isSkyscraperVariant(v){return skyscraperIds.indexOf(v.id)!==-1;}
      var displayGroups=[
        {id:'classics',icon:'✿',hu:'Klasszikusok',en:'Classics',match:function(v){return v.family==='Core'||v.id==='mini'||v.id==='mini-6';}},
        {id:'skyscrapers',icon:'🏙',hu:'Lakótelepek',en:'Skyscrapers',match:isSkyscraperVariant},
        {id:'japanese',icon:'◉',hu:'Japán logikai játékok',en:'Japanese logic',match:function(v){return v.family==='Japanese logic';}},
        {id:'lines',icon:'⌁',hu:'Vonalak',en:'Lines',match:function(v){return v.family==='Lines';}},
        {id:'sums',icon:'▦',hu:'Ketrecek / összegek',en:'Cages / sums',match:function(v){return !isSkyscraperVariant(v)&&(v.family==='Cages'||v.family==='Outside clues');}},
        {id:'anti',icon:'×',hu:'Tiltó szabályok',en:'Anti rules',match:function(v){return v.family==='Anti-constraints'||v.family==='Cell relations';}},
        {id:'patterns',icon:'◇',hu:'Különleges minták',en:'Special patterns',match:function(v){return v.family==='Extra regions'||v.family==='Cell marks';}},
        {id:'structural',icon:'▧',hu:'Strukturális',en:'Structural',match:function(v){return !isSkyscraperVariant(v)&&v.family==='Grid'&&v.id!=='mini'&&v.id!=='mini-6';}},
        {id:'combinations',icon:'♡',hu:'Kombinációk',en:'Combinations',match:function(v){return !isSkyscraperVariant(v)&&v.family==='Combinations';}}
      ];
      function groupFor(v){return displayGroups.find(function(g){return g.match(v);})||displayGroups[0];}
      function groupName(group){return I&&I.lang==='hu'?group.hu:group.en;}
      function groupList(id){if(!id)return root.SudokuBank.slice();var g=displayGroups.find(function(x){return x.id===id;});return g?root.SudokuBank.filter(g.match):root.SudokuBank.slice();}
      function fillFamilies(){
        if(!familySelect)return;
        familySelect.replaceChildren(LR.el('option',{value:'',text:I?I.t('allFamilies'):'All categories'}));
        displayGroups.forEach(function(g){familySelect.appendChild(LR.el('option',{value:g.id,text:groupName(g)}));});
      }
      function fillVariants(fam){
        var list=groupList(fam);
        if(variantSelect){variantSelect.replaceChildren();list.forEach(function(v){var vt=I?I.variant(v):v;variantSelect.appendChild(LR.el('option',{value:v.id,text:vt.title}));});}
        if(!list.some(function(v){return v.id===current.id;}))current=list[0]||root.SudokuBank[0];
        if(variantSelect)variantSelect.value=current.id;
        if(count)count.textContent=list.length+' '+(I?I.t('variantCount'):'variants');
        renderCategoryButtons(fam);
      }
      function renderCategoryButtons(selected){
        if(!categoryList)return;
        categoryList.replaceChildren();
        function add(fam,label,total,icon){var b=LR.el('button',{type:'button',className:'category-button'+(selected===fam?' active':''),'data-family':fam});b.append(LR.el('span',{className:'category-icon',text:icon}),LR.el('span',{text:label}),LR.el('span',{className:'category-count',text:String(total)}));b.addEventListener('click',function(){if(familySelect){familySelect.value=fam;familySelect.dispatchEvent(new Event('change'));}});categoryList.appendChild(b);}
        add('',I?I.t('allFamilies'):'All categories',root.SudokuBank.length,'✿');
        displayGroups.forEach(function(g){add(g.id,groupName(g),root.SudokuBank.filter(g.match).length,g.icon);});
      }
      function selectCurrent(id){
        var next=root.SudokuBank.find(function(v){return v.id===id;});if(!next)return;
        current=next;root.SudokuLibraryState.currentId=current.id;
        if(familySelect){var group=groupFor(current);familySelect.value=group.id;fillVariants(group.id);}
        if(variantSelect)variantSelect.value=current.id;
        renderVariant();
      }
      fillFamilies();
      if(familySelect)familySelect.addEventListener('change',function(){fillVariants(familySelect.value);current=root.SudokuBank.find(function(v){return v.id===variantSelect.value;})||current;root.SudokuLibraryState.currentId=current.id;renderVariant();});
      if(variantSelect)variantSelect.addEventListener('change',function(){current=root.SudokuBank.find(function(v){return v.id===variantSelect.value;})||current;root.SudokuLibraryState.currentId=current.id;renderVariant();});
      function externalSelect(e){if(e.detail&&e.detail.id)selectCurrent(e.detail.id);}
      function generationText(v){if(v&&v.kind==='masyu'&&v.generation)return (I&&I.lang==='hu'?'Generált Masyu':'Generated Masyu')+' #'+String(v.generation.seed).padStart(10,'0')+' · '+(I?I.t('unique'):'unique solution');if(v&&v.kind==='nonogram'&&v.generation)return (I&&I.lang==='hu'?'Generált Nonogram':'Generated Nonogram')+' #'+String(v.generation.seed).padStart(10,'0')+' · '+(I?I.t('unique'):'unique solution');if(v&&v.kind==='nurikabe'&&v.generation)return (I&&I.lang==='hu'?'Generált Nurikabe':'Generated Nurikabe')+' #'+String(v.generation.seed).padStart(10,'0')+' · '+(I?I.t('unique'):'unique solution');if(v&&v.kind==='akari'&&v.generation)return (I&&I.lang==='hu'?'Generált Akari':'Generated Akari')+' #'+String(v.generation.seed).padStart(10,'0')+' · '+(I?I.t('unique'):'unique solution');if(v&&v.kind==='slitherlink'&&v.generation)return (I&&I.lang==='hu'?'Generált Slitherlink':'Generated Slitherlink')+' #'+String(v.generation.seed).padStart(10,'0')+' · '+(I?I.t('unique'):'unique solution');if(v&&v.kind==='futoshiki'&&v.generation)return (I&&I.lang==='hu'?'Generált Futoshiki':'Generated Futoshiki')+' #'+String(v.generation.seed).padStart(10,'0')+' · '+(I?I.t('unique'):'unique solution');if(v&&v.kind==='fillomino'&&v.generation)return (I&&I.lang==='hu'?'Generált Fillomino':'Generated Fillomino')+' #'+String(v.generation.seed).padStart(10,'0')+' · '+(I?I.t('unique'):'unique solution');if(v&&v.kind==='bridges'&&v.generation)return (I&&I.lang==='hu'?'Generált Hidak':'Generated Bridges')+' #'+String(v.generation.seed).padStart(10,'0')+' · '+(I?I.t('unique'):'unique solution');if(v&&v.kind==='hitori'&&v.generation)return (I&&I.lang==='hu'?'Generált Hitori':'Generated Hitori')+' #'+String(v.generation.seed).padStart(10,'0')+' · '+(I?I.t('unique'):'unique solution');return v&&v.generation?((I?I.t('generated'):'Generated board')+' #'+String(v.generation.seed).padStart(10,'0')+' · '+v.generation.clues+' '+(I?I.t('givens'):'givens')+' · '+(I?I.t('unique'):'unique solution')+(v.generation.variantEssential?' · '+(I?I.t('variantEssential'):'variant-essential'):'')):(I?I.t('curated'):'Curated board');}
      function refreshLanguage(){
        var group=groupFor(current),vt=I?I.variant(current):current;
        fillFamilies();if(familySelect)familySelect.value=group.id;fillVariants(group.id);if(variantSelect)variantSelect.value=current.id;
        rule.textContent=vt.rule;if(lastVariant)generation.textContent=generationText(lastVariant);
        var note=api.tools.querySelector('.note-mode-button'),clear=api.tools.querySelector('.clear-button'),check=api.tools.querySelector('.check-button');
        if(note){note.textContent='✎ '+(I?I.t('notes'):'Notes');note.setAttribute('aria-label',I?I.t('notes'):'Notes');}
        if(clear)clear.setAttribute('aria-label',I?I.t('clear'):'Clear cell');
        if(check){check.textContent=I?I.t('check'):'Check';check.setAttribute('aria-label',I?I.t('check'):'Check');}
        if(boardInst&&boardInst.refreshLanguage)boardInst.refreshLanguage();
        Array.prototype.forEach.call(api.tools.querySelectorAll('.tool-button:not(.note-mode-button):not(.clear-button):not(.check-button)'),function(b){var value=b.textContent;b.setAttribute('aria-label',(I?I.t('enter'):'Enter')+' '+value);});
        document.dispatchEvent(new CustomEvent('sudoku:variantchange',{detail:{id:current.id,family:current.family,title:vt.title,rule:vt.rule}}));
      }
      document.addEventListener('sudoku:select',externalSelect);
      document.addEventListener('sudoku:languagechange',refreshLanguage);
      fillVariants(familySelect?familySelect.value:'');
      play.append(rule,generation,boardHost);wrap.append(play);api.root.appendChild(wrap);
      function renderVariant(){
        boardHost.replaceChildren();api.tools.replaceChildren();
        var generated=root.SudokuGenerator?root.SudokuGenerator.make(current,(api.seed^LR.hashString(current.id))>>>0,api.difficulty):clone(current);
        var v=generated,vt=I?I.variant(v):v;
        rule.textContent=vt.rule;
        lastVariant=v;generation.textContent=generationText(v);
        if(variantSelect)variantSelect.value=current.id;
        boardInst=v.kind==='samurai'?mountSamurai(boardHost,v,api):mountBoard(boardHost,v,api,{});api.setStatus('Ready');
        document.dispatchEvent(new CustomEvent('sudoku:variantchange',{detail:{id:current.id,family:current.family,title:vt.title,rule:vt.rule}}));
      }
      renderVariant();
      return {moves:function(){return boardInst&&boardInst.moves?boardInst.moves():moves;},destroy:function(){document.removeEventListener('sudoku:select',externalSelect);document.removeEventListener('sudoku:languagechange',refreshLanguage);if(boardInst&&boardInst.destroy)boardInst.destroy();}};
    }
  });
}(typeof window!=='undefined'?window:globalThis));
