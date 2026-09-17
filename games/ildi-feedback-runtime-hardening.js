(function(root){
  'use strict';

  function spreadPositions(values,minGap,min,max){
    var indexed=values.map(function(value,index){
      return {value:value,index:index};
    }).sort(function(a,b){
      return a.value-b.value;
    });
    var coords=indexed.map(function(x){return x.value;});
    var result=Array(values.length);

    if(coords.length<2)return values.slice();

    for(var i=1;i<coords.length;i+=1){
      if(coords[i]-coords[i-1]<minGap)coords[i]=coords[i-1]+minGap;
    }

    if(coords[coords.length-1]>max){
      var shift=coords[coords.length-1]-max;
      for(i=0;i<coords.length;i+=1)coords[i]-=shift;
    }

    if(coords[0]<min){
      var shift2=min-coords[0];
      for(i=0;i<coords.length;i+=1)coords[i]+=shift2;
    }

    for(i=coords.length-2;i>=0;i-=1){
      if(coords[i+1]-coords[i]<minGap)coords[i]=coords[i+1]-minGap;
    }

    indexed.forEach(function(item,index){
      result[item.index]=coords[index];
    });
    return result;
  }

  function currentVariant(){
    var id=root.SudokuLibraryState&&root.SudokuLibraryState.currentId;
    return root.SudokuBank&&root.SudokuBank.find(function(v){
      return v.id===id;
    });
  }

  function tagBoard(){
    if(typeof document==='undefined')return null;
    var board=document.querySelector('.sudoku-board');
    var variant=currentVariant();
    if(!board||!variant)return null;

    board.dataset.ildiVariant=variant.id;
    board.classList.toggle(
      'ildi-no-box-grid',
      variant.id==='double-skyscrapers'
    );
    return board;
  }

  function spreadDiagonalMarkers(){
    if(typeof document==='undefined')return;

    Array.prototype.forEach.call(
      document.querySelectorAll('.sudoku-board-shell'),
      function(shell){
        var board=shell.querySelector('.sudoku-board');
        var markers=Array.prototype.slice.call(
          shell.querySelectorAll('.sudoku-diagonal-sky-marker')
        );

        if(!board||markers.length<2)return;

        var rect=board.getBoundingClientRect();
        var size=rect.width||board.clientWidth;
        if(!size)return;

        var groups={top:[],right:[],bottom:[],left:[]};

        markers.forEach(function(marker){
          if(!marker.dataset.ildiOriginalLeft){
            marker.dataset.ildiOriginalLeft=marker.style.left;
            marker.dataset.ildiOriginalTop=marker.style.top;
          }

          var x=parseFloat(marker.dataset.ildiOriginalLeft)*size/100;
          var y=parseFloat(marker.dataset.ildiOriginalTop)*size/100;
          if(!Number.isFinite(x)||!Number.isFinite(y))return;

          var distances={
            left:Math.abs(x),
            right:Math.abs(size-x),
            top:Math.abs(y),
            bottom:Math.abs(size-y)
          };
          var side='left';

          Object.keys(distances).forEach(function(key){
            if(distances[key]<distances[side])side=key;
          });

          groups[side].push({marker:marker,x:x,y:y});
        });

        Object.keys(groups).forEach(function(side){
          var list=groups[side];
          if(list.length<2)return;

          var horizontal=side==='top'||side==='bottom';
          var values=list.map(function(p){
            return horizontal?p.x:p.y;
          });
          var spread=spreadPositions(values,34,-26,size+26);

          list.forEach(function(p,index){
            if(horizontal)p.x=spread[index];
            else p.y=spread[index];

            p.marker.style.left=p.x+'px';
            p.marker.style.top=p.y+'px';
          });
        });
      }
    );
  }

  function ensureP1LayoutStyles(){
    if(typeof document==='undefined'||typeof document.createElement!=='function')return null;
    var id='ildi-p1-layout-hardening';
    var existing=document.getElementById(id);
    if(existing)return existing;

    var style=document.createElement('style');
    style.id=id;
    style.textContent=[
      '.nonogram-board{grid-template-rows:repeat(var(--nonogram-size),minmax(0,1fr));}',
      '.nonogram-cell{min-height:0;overflow:hidden;line-height:1;}',
      '.newlogic-board{grid-template-rows:repeat(var(--newlogic-size),minmax(0,1fr));}',
      '.futoshiki-board{grid-template-rows:repeat(var(--futo-size),minmax(0,1fr));}',
      '.futoshiki-cell{min-height:0;overflow:hidden;}',
      '.masyu-board{background-position:0 0;}'
    ].join('');
    var target=document.head||document.documentElement;
    if(!target||typeof target.appendChild!=='function')return null;
    target.appendChild(style);
    return style;
  }

  function solvedStage(){
    if(typeof document==='undefined')return null;
    var stage=document.getElementById('game-stage');
    return stage&&stage.classList&&stage.classList.contains('is-solved')?stage:null;
  }

  function targetInsideSolvedSurface(target){
    var stage=solvedStage();
    if(!stage||!target)return false;
    var tools=document.getElementById('game-tools');
    return !!(
      (stage.contains&&stage.contains(target))||
      (tools&&tools.contains&&tools.contains(target))
    );
  }

  function blockSolvedInteraction(event){
    if(!targetInsideSolvedSurface(event&&event.target))return false;
    if(event&&typeof event.preventDefault==='function')event.preventDefault();
    if(event&&typeof event.stopImmediatePropagation==='function')event.stopImmediatePropagation();
    else if(event&&typeof event.stopPropagation==='function')event.stopPropagation();
    return true;
  }

  var p2Installed=false;
  var p2Targets={
    skyscraper:{type:'outside',value:20},
    'double-skyscrapers':{type:'outside',value:12},
    'toroidal-skyscrapers':{type:'givens',value:10},
    'odd-even':{type:'givens',value:16}
  };

  function p2Clone(x){return JSON.parse(JSON.stringify(x));}
  function p2Rng(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function p2Shuffle(a,random){for(var i=a.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function p2GivenCount(grid){var count=0;for(var r=0;r<grid.length;r++)for(var c=0;c<grid[r].length;c++)if(Number.isFinite(grid[r][c])&&grid[r][c]!==0)count++;return count;}
  function p2SkyVisible(line){var max=0,count=0;for(var i=0;i<line.length;i++)if(line[i]>max){max=line[i];count++;}return count;}
  function p2ToroidalValid(variant,grid,r,c,ignoreSpecial){
    if(ignoreSpecial)return true;
    var clues=variant.data&&variant.data.toroidalClues||[];
    for(var i=0;i<clues.length;i++){
      var cl=clues[i],touches=cl.cells.some(function(p){return p[0]===r&&p[1]===c;});
      if(!touches)continue;
      var line=cl.cells.map(function(p){return grid[p[0]][p[1]];});
      if(line.every(Boolean)&&p2SkyVisible(line)!==cl.count)return false;
    }
    return true;
  }
  function p2CountToroidal(source,variant,limit,ignoreSpecial){
    var grid=source.map(function(row){return row.slice();}),n=grid.length,d=variant.data||{},clueValue=d.clueValue||n,maxDigit=d.maxDigit||n-1,full=(1<<maxDigit)-1,rows=Array(n).fill(0),cols=Array(n).fill(0),clueMap={},r,c;
    (d.toroidalClues||[]).forEach(function(cl){clueMap[cl.cell[0]+','+cl.cell[1]]=1;grid[cl.cell[0]][cl.cell[1]]=clueValue;});
    for(r=0;r<n;r++)for(c=0;c<n;c++){
      if(clueMap[r+','+c])continue;
      var value=grid[r][c];if(!value)continue;if(value<1||value>maxDigit)return 0;
      var bit=1<<(value-1);if((rows[r]|cols[c])&bit)return 0;rows[r]|=bit;cols[c]|=bit;
      if(!p2ToroidalValid(variant,grid,r,c,ignoreSpecial))return 0;
    }
    var found=0;
    function visit(){
      if(found>=limit)return;
      var br=-1,bc=-1,best=[],bestCount=maxDigit+1;
      for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!clueMap[rr+','+cc]&&!grid[rr][cc]){
        var mask=full&~(rows[rr]|cols[cc]),allowed=[];
        for(var bits=mask;bits;bits&=bits-1){var one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);grid[rr][cc]=digit;if(p2ToroidalValid(variant,grid,rr,cc,ignoreSpecial))allowed.push(digit);grid[rr][cc]=0;}
        if(allowed.length<bestCount){br=rr;bc=cc;best=allowed;bestCount=allowed.length;if(bestCount<=1)break;}
      }
      if(br<0){for(var i=0;i<n;i++)if(rows[i]!==full||cols[i]!==full)return;found++;return;}
      if(!best.length)return;
      for(var ai=0;ai<best.length;ai++){
        var digit=best[ai],one=1<<(digit-1);grid[br][bc]=digit;rows[br]|=one;cols[bc]|=one;visit();rows[br]^=one;cols[bc]^=one;grid[br][bc]=0;if(found>=limit)return;
      }
    }
    visit();return found;
  }

  function p2ExactCount(generator,id,puzzle,candidate){
    if(id==='double-skyscrapers')return generator.countDoubleSkyscraperSolutions(puzzle,candidate,2,false);
    if(id==='toroidal-skyscrapers')return p2CountToroidal(puzzle,candidate,2,false);
    return generator.countVariantSolutions(puzzle,candidate,2);
  }
  function p2BaselineCount(generator,id,puzzle,candidate){
    if(id==='double-skyscrapers')return generator.countDoubleSkyscraperSolutions(puzzle,candidate,2,true);
    if(id==='toroidal-skyscrapers')return p2CountToroidal(puzzle,candidate,2,true);
    return generator.countSolutions(puzzle,2);
  }
  function p2CarveGivens(generator,id,generated,target,seed){
    var out=p2Clone(generated),n=out.puzzle.length,order=[];
    for(var i=0;i<n*n;i++)if(out.puzzle[Math.floor(i/n)][i%n])order.push(i);
    p2Shuffle(order,p2Rng((seed^0xC411B4A7)>>>0));
    for(var oi=0;oi<order.length;oi++){
      if(p2GivenCount(out.puzzle)<=target)break;
      var idx=order[oi],r=Math.floor(idx/n),c=idx%n,old=out.puzzle[r][c];
      out.puzzle[r][c]=0;
      if(p2ExactCount(generator,id,out.puzzle,out)!==1)out.puzzle[r][c]=old;
    }
    return out;
  }
  function p2CarveOutside(generator,id,generated,target,seed){
    var out=p2Clone(generated),list=out.data&&out.data.clues;
    if(!Array.isArray(list))return out;
    var order=p2Shuffle(Array.from({length:list.length},function(_,i){return i;}),p2Rng((seed^0x0C1751DE)>>>0)),removed={};
    for(var oi=0;oi<order.length;oi++){
      if(list.length-Object.keys(removed).length<=target)break;
      var idx=order[oi];removed[idx]=1;
      out.data.clues=list.filter(function(_,i){return !removed[i];});
      if(p2ExactCount(generator,id,out.puzzle,out)!==1){delete removed[idx];out.data.clues=list.filter(function(_,i){return !removed[i];});}
    }
    return out;
  }
  function p2Annotate(generator,id,out,target){
    var exact=p2ExactCount(generator,id,out.puzzle,out),baseline=p2BaselineCount(generator,id,out.puzzle,out);
    if(exact!==1||baseline<=1)throw new Error('P2 recalibration contract failed for '+id);
    var actual=target.type==='givens'?p2GivenCount(out.puzzle):(out.data&&Array.isArray(out.data.clues)?out.data.clues.length:null);
    out.generation=out.generation||{};
    out.generation.p2Recalibrated=true;
    out.generation.p2Calibration={strategy:target.type,target:target.value,actual:actual};
    if(id==='double-skyscrapers')out.clues=p2GivenCount(out.puzzle)+(out.data&&Array.isArray(out.data.clues)?out.data.clues.length:0);
    else out.clues=p2GivenCount(out.puzzle);
    if(Number.isFinite(out.generation.clues))out.generation.clues=out.clues;
    return out;
  }
  function installP2DifficultyHardening(){
    if(p2Installed||!root.SudokuGenerator||typeof root.SudokuGenerator.make!=='function')return false;
    var generator=root.SudokuGenerator,baseMake=generator.make;
    generator.make=function(variant,seed,difficulty){
      var out=baseMake.call(this,variant,seed,difficulty);
      var id=variant&&variant.id,target=p2Targets[id];
      if(!target||difficulty!=='expert')return out;
      out=target.type==='outside'?p2CarveOutside(generator,id,out,target.value,seed):p2CarveGivens(generator,id,out,target.value,seed);
      return p2Annotate(generator,id,out,target);
    };
    p2Installed=true;
    return true;
  }

  function harden(){
    installP2DifficultyHardening();
    ensureP1LayoutStyles();
    tagBoard();
    spreadDiagonalMarkers();
  }

  root.IldiFeedbackHardening={
    spreadPositions:spreadPositions,
    ensureP1LayoutStyles:ensureP1LayoutStyles,
    solvedStage:solvedStage,
    targetInsideSolvedSurface:targetInsideSolvedSurface,
    blockSolvedInteraction:blockSolvedInteraction,
    installP2DifficultyHardening:installP2DifficultyHardening,
    p2Targets:p2Targets,
    harden:harden
  };

  installP2DifficultyHardening();

  if(typeof document!=='undefined'){
    var pending=false;

    function schedule(){
      if(pending)return;
      pending=true;
      (root.requestAnimationFrame||function(fn){
        return setTimeout(fn,0);
      })(function(){
        pending=false;
        harden();
      });
    }

    ['click','contextmenu','keydown','beforeinput','input','change'].forEach(function(type){
      document.addEventListener(type,blockSolvedInteraction,true);
    });

    document.addEventListener('sudoku:variantchange',schedule);

    if(root.addEventListener){
      root.addEventListener('resize',schedule,{passive:true});
    }

    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',schedule,{once:true});
    }else{
      schedule();
    }
  }
})(typeof window!=='undefined'?window:globalThis);
