(function(root){
  'use strict';

  if(!root.SudokuGenerator||!root.SudokuBank)return;

  var generator=root.SudokuGenerator;
  var baseMake=generator.make;
  var baseCount=generator.countDoubleSkyscraperSolutions;
  var supported=[6,8];
  var cache=new Map();
  var familyCache=new Map();
  var countCache=new Map();
  var permutationCache=null;
  var clueBucketCache=null;

  function clone(x){return JSON.parse(JSON.stringify(x));}
  function rng(seed){
    var x=seed>>>0;
    return function(){
      x=(x+0x6D2B79F5)>>>0;
      var t=x;
      t=Math.imul(t^(t>>>15),t|1);
      t^=t+Math.imul(t^(t>>>7),t|61);
      return((t^(t>>>14))>>>0)/4294967296;
    };
  }
  function shuffle(a,random){
    for(var i=a.length-1;i>0;i--){
      var j=Math.floor(random()*(i+1));
      var t=a[i];a[i]=a[j];a[j]=t;
    }
    return a;
  }
  function visible(line){
    var max=0,count=0;
    for(var i=0;i<line.length;i++)if(line[i]>max){max=line[i];count++;}
    return count;
  }
  function outsideClues(solution){
    var n=solution.length,out=[];
    for(var i=0;i<n;i++){
      var row=solution[i].slice(),col=solution.map(function(r){return r[i];});
      out.push({axis:'row',index:i,side:'left',count:visible(row)});
      out.push({axis:'row',index:i,side:'right',count:visible(row.slice().reverse())});
      out.push({axis:'col',index:i,side:'top',count:visible(col)});
      out.push({axis:'col',index:i,side:'bottom',count:visible(col.slice().reverse())});
    }
    return out;
  }
  function repeatedLatin8(random){
    var rowShift=[0,0,1,1,2,2,3,3];
    var colShift=[0,0,1,1,2,2,3,3];
    var digits=shuffle([1,2,3,4],random);
    shuffle(rowShift,random);shuffle(colShift,random);
    var out=[];
    for(var r=0;r<8;r++){
      var row=[];
      for(var c=0;c<8;c++)row.push(digits[(rowShift[r]+colShift[c])%4]);
      out.push(row);
    }
    return out;
  }
  function extraGivens(difficulty){
    return difficulty==='gentle'?8:(difficulty==='focused'?4:0);
  }

  function allDoubleRows(){
    if(permutationCache)return permutationCache;
    var out=[],row=Array(8).fill(0),left=[0,2,2,2,2];
    function rec(pos){
      if(pos===8){out.push(row.slice());return;}
      for(var d=1;d<=4;d++)if(left[d]){
        left[d]--;row[pos]=d;rec(pos+1);left[d]++;
      }
    }
    rec(0);
    permutationCache=out;
    clueBucketCache={};
    for(var i=0;i<out.length;i++){
      var p=out[i],l=visible(p),r=visible(p.slice().reverse()),key=l+':'+r;
      (clueBucketCache[key]||(clueBucketCache[key]=[])).push(p);
    }
    return out;
  }

  function clueMaps(variant){
    var row=Array.from({length:8},function(){return {left:null,right:null};});
    var col=Array.from({length:8},function(){return {top:null,bottom:null};});
    var clues=(variant.data&&variant.data.clues)||[];
    for(var i=0;i<clues.length;i++){
      var cl=clues[i];
      if(cl.axis==='row'&&row[cl.index])row[cl.index][cl.side]=cl.count;
      else if(cl.axis==='col'&&col[cl.index])col[cl.index][cl.side]=cl.count;
    }
    return {row:row,col:col};
  }

  function filteredDomain(pool,givens){
    var out=[];
    outer: for(var i=0;i<pool.length;i++){
      var p=pool[i];
      for(var k=0;k<8;k++)if(givens[k]&&givens[k]!==p[k])continue outer;
      out.push(p);
    }
    return out;
  }

  function fastCountEight(source,variant,limit,ignoreSpecial){
    allDoubleRows();
    var maps=clueMaps(variant),rowDomains=Array(8),colDomains=Array(8),r,c;

    for(r=0;r<8;r++){
      var rm=maps.row[r],rpool=!ignoreSpecial&&rm.left!=null&&rm.right!=null?(clueBucketCache[rm.left+':'+rm.right]||[]):permutationCache;
      rowDomains[r]=filteredDomain(rpool,source[r]||[]);
      if(!rowDomains[r].length)return 0;
    }
    for(c=0;c<8;c++){
      var cm=maps.col[c],cpool=!ignoreSpecial&&cm.top!=null&&cm.bottom!=null?(clueBucketCache[cm.top+':'+cm.bottom]||[]):permutationCache;
      var cg=Array(8);for(r=0;r<8;r++)cg[r]=(source[r]||[])[c]||0;
      colDomains[c]=filteredDomain(cpool,cg);
      if(!colDomains[c].length)return 0;
    }

    var assigned=Array(8).fill(false),found=0;

    function allowedMask(domain,pos){
      var mask=0;
      for(var i=0;i<domain.length;i++)mask|=1<<domain[i][pos];
      return mask;
    }

    function feasibleRows(rowIndex,cols){
      var base=rowDomains[rowIndex],masks=Array(8),out=[];
      for(var cc=0;cc<8;cc++)masks[cc]=allowedMask(cols[cc],rowIndex);
      outer: for(var i=0;i<base.length;i++){
        var p=base[i];
        for(cc=0;cc<8;cc++)if(!(masks[cc]&(1<<p[cc])))continue outer;
        out.push(p);
      }
      return out;
    }

    function visit(done,cols){
      if(found>=limit)return;
      if(done===8){found++;return;}

      var bestRow=-1,best=null;
      for(var rr=0;rr<8;rr++)if(!assigned[rr]){
        var fr=feasibleRows(rr,cols);
        if(!fr.length)return;
        if(best===null||fr.length<best.length){bestRow=rr;best=fr;if(fr.length===1)break;}
      }

      assigned[bestRow]=true;
      for(var i=0;i<best.length;i++){
        var row=best[i],nextCols=Array(8),ok=true;
        for(var cc=0;cc<8;cc++){
          var old=cols[cc],filtered=[];
          for(var j=0;j<old.length;j++)if(old[j][bestRow]===row[cc])filtered.push(old[j]);
          if(!filtered.length){ok=false;break;}
          nextCols[cc]=filtered;
        }
        if(ok)visit(done+1,nextCols);
        if(found>=limit)break;
      }
      assigned[bestRow]=false;
    }

    visit(0,colDomains);
    return found;
  }

  function countKey(source,variant,limit,ignoreSpecial){
    if(!source||source.length!==8)return null;
    var clues=(variant.data&&variant.data.clues)||[];
    var ck=ignoreSpecial?'*':clues.map(function(c){return c.axis[0]+c.index+c.side[0]+c.count;}).join(',');
    return JSON.stringify(source)+'|'+ck+'|'+(limit||2);
  }

  function countDouble(source,variant,limit,ignoreSpecial){
    var n=source&&source.length;
    if(n===8&&variant&&variant.data&&Number(variant.data.maxDigit)===4&&Number(variant.data.copiesPerLine)===2){
      var key=countKey(source,variant,limit,!!ignoreSpecial);
      if(key&&countCache.has(key))return countCache.get(key);
      var result=fastCountEight(source,variant,limit||2,!!ignoreSpecial);
      if(key)countCache.set(key,result);
      return result;
    }
    return baseCount.call(generator,source,variant,limit,ignoreSpecial);
  }

  generator.countDoubleSkyscraperSolutions=countDouble;

  function buildFamily(variant,seed){
    var familyKey=String(seed>>>0);
    if(familyCache.has(familyKey))return clone(familyCache.get(familyKey));

    for(var attempt=0;attempt<16;attempt++){
      var random=rng(((seed>>>0)^0xD08B1E8^Math.imul(attempt+1,0x9E3779B1))>>>0);
      var solution=repeatedLatin8(random);
      var data=clone(variant.data||{});
      data.maxDigit=4;
      data.inputMax=4;
      data.copiesPerLine=2;
      data.clues=outsideClues(solution);
      data.p3Size=8;
      data.p3SupportedSizes=supported.slice();

      var working=Object.assign({},variant,{solution:solution,data:data});
      var order=shuffle(Array.from({length:64},function(_,i){return i;}),random);
      var grid=Array.from({length:8},function(){return Array(8).fill(0);});
      var shown=0,pos=0,unique=false;

      while(!unique&&pos<order.length&&shown<36){
        for(var add=0;add<4&&pos<order.length;add++){
          var idx=order[pos++];
          var rr=Math.floor(idx/8),cc=idx%8;
          if(!grid[rr][cc]){grid[rr][cc]=solution[rr][cc];shown++;}
        }
        unique=countDouble(grid,working,2,false)===1;
      }
      if(!unique)continue;
      if(countDouble(grid,working,2,true)===1)continue;

      var family={
        solution:solution,
        data:data,
        working:working,
        baseGrid:grid,
        order:order,
        nextPos:pos,
        baseShown:shown
      };
      familyCache.set(familyKey,clone(family));
      return family;
    }

    throw new Error('Double Skyscraper 8x8 base family generation failed for seed '+seed);
  }

  function makeEight(variant,seed,difficulty){
    var key=[seed>>>0,difficulty].join(':');
    if(cache.has(key))return clone(cache.get(key));

    var family=buildFamily(variant,seed),solution=family.solution,data=family.data;
    var working=Object.assign({},variant,{solution:solution,data:data});
    var grid=family.baseGrid.map(function(row){return row.slice();});
    var shown=family.baseShown,pos=family.nextPos,extras=extraGivens(difficulty),added=0;

    while(added<extras&&pos<family.order.length){
      var idx=family.order[pos++],r=Math.floor(idx/8),c=idx%8;
      if(grid[r][c])continue;
      grid[r][c]=solution[r][c];
      if(countDouble(grid,working,2,true)===1){
        grid[r][c]=0;
        continue;
      }
      shown++;added++;
    }

    var out=clone(variant);
    out.solution=solution;
    out.puzzle=grid;
    out.data=data;
    out.generation={
      seed:seed>>>0,
      clues:shown+data.clues.length,
      unique:true,
      verification:'solver-verified-row-column-domain',
      generatorFamily:'double-skyscraper-8x8-repeated-latin',
      difficultyScore:shown,
      mode:'seeded-variant-essential',
      variantEssential:true,
      boardSize:8
    };
    cache.set(key,clone(out));
    return out;
  }

  var variant=root.SudokuBank.find(function(v){return v.id==='double-skyscrapers';});
  if(variant){
    variant.data=variant.data||{};
    var remembered=null;
    try{remembered=Number(root.localStorage&&root.localStorage.getItem('ildi-size-double-skyscrapers'));}catch(e){}
    variant.data.p3SupportedSizes=supported.slice();
    variant.data.p3Size=supported.indexOf(remembered)>=0?remembered:6;
  }

  generator.make=function(variant,seed,difficulty){
    if(!variant||variant.id!=='double-skyscrapers')return baseMake.call(this,variant,seed,difficulty);
    var requested=Number(variant.data&&variant.data.p3Size);
    if(requested!==8)return baseMake.call(this,variant,seed,difficulty);
    return makeEight(variant,seed>>>0,difficulty||'focused');
  };

  root.IldiP3SizeSupport=root.IldiP3SizeSupport||{};
  root.IldiP3SizeSupport['double-skyscrapers']=supported.slice();
})(typeof window!=='undefined'?window:globalThis);
