(function(root){
  'use strict';
  if(root.RegionSumSegments)return;

  function boxDims(n){
    if(n===4)return[2,2];
    if(n===6)return[2,3];
    if(n===9)return[3,3];
    var h=Math.floor(Math.sqrt(n));return[h,Math.floor(n/h)];
  }
  function regionKey(cell,n){
    var dims=boxDims(n),bh=dims[0],bw=dims[1];
    return Math.floor(cell[0]/bh)+','+Math.floor(cell[1]/bw);
  }
  function split(line,n){
    var out=[],current=[],last=null;
    for(var i=0;i<line.length;i++){
      var cell=line[i],key=regionKey(cell,n);
      if(last!==null&&key!==last){out.push(current);current=[];}
      current.push(cell);last=key;
    }
    if(current.length)out.push(current);
    return out;
  }
  function sums(grid,line){
    return split(line,grid.length).map(function(seg){
      var values=seg.map(function(p){return grid[p[0]][p[1]];});
      return{cells:seg,values:values,complete:values.every(Boolean),sum:values.reduce(function(total,v){return total+(v||0);},0)};
    });
  }
  function valid(grid,line){
    var segments=sums(grid,line),target=null;
    for(var i=0;i<segments.length;i++)if(segments[i].complete){
      if(target===null)target=segments[i].sum;
      else if(segments[i].sum!==target)return false;
    }
    if(target!==null)for(i=0;i<segments.length;i++)if(segments[i].sum>target)return false;
    return true;
  }

  root.RegionSumSegments={boxDims:boxDims,regionKey:regionKey,split:split,sums:sums,valid:valid};
})(typeof window!=='undefined'?window:globalThis);

// Exact 12x12 Classic counter used by the large-board Expert playability pass.
// The model is the standard Sudoku exact-cover matrix with 3x4 boxes. Fixed givens
// are pre-covered before candidate rows are built, matching the proven 16x16 path.
// There is no timeout, approximation, or clue floor.
(function(root){
  'use strict';
  if(!root.SudokuGenerator||typeof root.SudokuGenerator.countSolutions!=='function')return;
  var generator=root.SudokuGenerator,baseCount=generator.countSolutions;

  function count12SolutionsExact(source,limit,stats){
    limit=Math.max(1,Number(limit)||2);
    if(!Array.isArray(source)||source.length!==12)return 0;
    var n=12,totalCols=4*n*n,full=(1<<n)-1;
    var rowMask=new Uint16Array(n),colMask=new Uint16Array(n),boxMask=new Uint16Array(n);
    var active=new Uint8Array(totalCols);active.fill(1);
    var empties=[];
    function boxIndex(r,c){return Math.floor(r/3)*3+Math.floor(c/4);}
    function cellCol(r,c){return r*n+c;}
    function rowDigitCol(r,d){return n*n+r*n+(d-1);}
    function colDigitCol(c,d){return 2*n*n+c*n+(d-1);}
    function boxDigitCol(b,d){return 3*n*n+b*n+(d-1);}

    for(var r=0;r<n;r++){
      if(!Array.isArray(source[r])||source[r].length!==n)return 0;
      for(var c=0;c<n;c++){
        var d=Number(source[r][c])||0;
        if(!d){empties.push(r*n+c);continue;}
        if(d<1||d>n)return 0;
        var bit=1<<(d-1),b=boxIndex(r,c);
        if((rowMask[r]&bit)||(colMask[c]&bit)||(boxMask[b]&bit))return 0;
        rowMask[r]|=bit;colMask[c]|=bit;boxMask[b]|=bit;
        active[cellCol(r,c)]=0;
        active[rowDigitCol(r,d)]=0;
        active[colDigitCol(c,d)]=0;
        active[boxDigitCol(b,d)]=0;
      }
    }

    var head={L:null,R:null};head.L=head;head.R=head;
    var cols=new Array(totalCols);
    for(var ci=0;ci<totalCols;ci++){
      var col={L:null,R:null,U:null,D:null,size:0,index:ci};col.U=col;col.D=col;cols[ci]=col;
      if(!active[ci]){col.L=col;col.R=col;continue;}
      col.L=head.L;col.R=head;head.L.R=col;head.L=col;
    }

    function addRow(indices){
      var first=null,last=null;
      for(var k=0;k<indices.length;k++){
        var col=cols[indices[k]],node={L:null,R:null,U:col.U,D:col,C:col};
        col.U.D=node;col.U=node;col.size++;
        if(!first){first=node;node.L=node;node.R=node;last=node;}
        else{node.L=last;node.R=first;last.R=node;first.L=node;last=node;}
      }
    }

    for(var ei=0;ei<empties.length;ei++){
      var idx=empties[ei],rr=Math.floor(idx/n),cc=idx%n,bx=boxIndex(rr,cc);
      var mask=full&~(rowMask[rr]|colMask[cc]|boxMask[bx]);
      if(!mask){if(stats){stats.nodes=0;stats.branches=0;stats.deadEnds=1;stats.solutions=0;stats.openCells=empties.length;}return 0;}
      while(mask){
        var one=mask&-mask;mask^=one;
        var digit=32-Math.clz32(one);
        addRow([cellCol(rr,cc),rowDigitCol(rr,digit),colDigitCol(cc,digit),boxDigitCol(bx,digit)]);
      }
    }

    function cover(c){c.R.L=c.L;c.L.R=c.R;for(var i=c.D;i!==c;i=i.D)for(var j=i.R;j!==i;j=j.R){j.D.U=j.U;j.U.D=j.D;j.C.size--;}}
    function uncover(c){for(var i=c.U;i!==c;i=i.U)for(var j=i.L;j!==i;j=j.L){j.C.size++;j.D.U=j;j.U.D=j;}c.R.L=c;c.L.R=c;}

    var solutions=0,nodes=0,branches=0,deadEnds=0;
    function search(){
      if(solutions>=limit)return;
      nodes++;
      if(head.R===head){solutions++;return;}
      var chosen=null,min=1e9;
      for(var c=head.R;c!==head;c=c.R){if(c.size<min){min=c.size;chosen=c;if(min<=1)break;}}
      if(!chosen||chosen.size===0){deadEnds++;return;}
      branches++;
      cover(chosen);
      for(var row=chosen.D;row!==chosen&&solutions<limit;row=row.D){
        for(var j=row.R;j!==row;j=j.R)cover(j.C);
        search();
        for(var u=row.L;u!==row;u=u.L)uncover(u.C);
      }
      uncover(chosen);
    }

    search();
    if(stats){stats.nodes=nodes;stats.branches=branches;stats.deadEnds=deadEnds;stats.solutions=solutions;stats.openCells=empties.length;}
    return solutions;
  }

  generator.countLargeClassic12SolutionsExact=count12SolutionsExact;
  generator.countSolutions=function(source,limit,stats){
    if(Array.isArray(source)&&source.length===12)return count12SolutionsExact(source,limit,stats);
    return baseCount.apply(this,arguments);
  };
})(typeof window!=='undefined'?window:globalThis);
