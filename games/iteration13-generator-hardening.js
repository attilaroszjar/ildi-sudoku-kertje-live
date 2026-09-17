(function(root){
  'use strict';
  if(!root.SudokuGenerator)return;
  var generator=root.SudokuGenerator,baseMake=generator.make;
  function clone(g){return g.map(function(row){return row.slice();});}
  function deepClone(x){return JSON.parse(JSON.stringify(x));}
  function bitCount(x){var n=0;while(x){x&=x-1;n++;}return n;}
  function rng(seed){var x=seed>>>0;return function(){x=(x+0x6D2B79F5)>>>0;var t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(a,random){for(var i=a.length-1;i>0;i--){var j=Math.floor(random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function lineAt(grid,axis,index){return axis==='row'?grid[index].slice():grid.map(function(row){return row[index];});}
  function evenSandwichDigits(line){var out=[];for(var i=1;i<line.length-1;i++)if(line[i-1]%2===0&&line[i+1]%2===0)out.push(line[i]);return out.sort(function(a,b){return a-b;});}
  function evenSandwichClues(solution){var clues=[];for(var i=0;i<solution.length;i++){clues.push({axis:'row',index:i,side:'left',digits:evenSandwichDigits(lineAt(solution,'row',i))});clues.push({axis:'col',index:i,side:'top',digits:evenSandwichDigits(lineAt(solution,'col',i))});}return clues;}
  function transformedSudokuSolution(source,seed){var random=rng(seed>>>0),digits=shuffle([1,2,3,4,5,6,7,8,9],random),digitMap={},bands=shuffle([0,1,2],random),stacks=shuffle([0,1,2],random),rows=[],cols=[];for(var d=1;d<=9;d++)digitMap[d]=digits[d-1];bands.forEach(function(b){shuffle([0,1,2],random).forEach(function(x){rows.push(b*3+x);});});stacks.forEach(function(s){shuffle([0,1,2],random).forEach(function(x){cols.push(s*3+x);});});if(random()<0.5){var tmp=rows;rows=cols;cols=tmp;}var out=rows.map(function(r){return cols.map(function(c){return digitMap[source[r][c]];});});if(random()<0.5)out=Array.from({length:9},function(_,r){return Array.from({length:9},function(_,c){return out[c][r];});});return out;}
  function topHeavySolution(seed){var random=rng(seed>>>0),grid=Array.from({length:9},function(){return Array(9).fill(0);}),rows=Array(9).fill(0),cols=Array(9).fill(0),boxes=Array(9).fill(0),full=511,nodes=0,limit=250000;function box(r,c){return Math.floor(r/3)*3+Math.floor(c/3);}function allowed(r,c,d){if(r>0){var up=grid[r-1][c];if(up&&up%2===d%2&&up<=d)return false;}if(r<8){var down=grid[r+1][c];if(down&&down%2===d%2&&d<=down)return false;}return true;}function visit(){if(++nodes>limit)return false;var br=-1,bc=-1,cands=null,best=10;for(var r=0;r<9;r++)for(var c=0;c<9;c++)if(!grid[r][c]){var mask=full&~(rows[r]|cols[c]|boxes[box(r,c)]),a=[];for(var d=1;d<=9;d++)if((mask&(1<<(d-1)))&&allowed(r,c,d))a.push(d);if(!a.length)return false;if(a.length<best){best=a.length;br=r;bc=c;cands=a;if(best===1)break;}}if(br<0)return true;shuffle(cands,random);var b=box(br,bc);for(var i=0;i<cands.length;i++){var d=cands[i],bit=1<<(d-1);grid[br][bc]=d;rows[br]|=bit;cols[bc]|=bit;boxes[b]|=bit;if(visit())return true;rows[br]^=bit;cols[bc]^=bit;boxes[b]^=bit;grid[br][bc]=0;}return false;}return visit()?grid:null;}
  function bishopsgateSolution(seed,parity){
    var random=rng(seed>>>0);
    var grid=Array.from({length:9},function(){return Array(9).fill(0);});
    var rows=Array(9).fill(0);
    var cols=Array(9).fill(0);
    var boxes=Array(9).fill(0);
    var diagDown=Array(17).fill(0);
    var diagUp=Array(17).fill(0);
    var full=511;
    var nodes=0;
    var limit=350000;

    function box(r,c){
      return Math.floor(r/3)*3+Math.floor(c/3);
    }

    function downIndex(r,c){
      return r-c+8;
    }

    function upIndex(r,c){
      return r+c;
    }

    function candidateMask(r,c){
      var used=rows[r]|cols[c]|boxes[box(r,c)];
      if(((r+c)&1)===parity){
        used|=diagDown[downIndex(r,c)]|diagUp[upIndex(r,c)];
      }
      return full&~used;
    }

    function visit(){
      if(++nodes>limit)return false;

      var br=-1,bc=-1,bm=0,best=10;

      for(var r=0;r<9;r++){
        for(var c=0;c<9;c++){
          if(grid[r][c])continue;

          var mask=candidateMask(r,c);
          if(!mask)return false;

          var count=bitCount(mask);
          if(count<best){
            best=count;
            br=r;
            bc=c;
            bm=mask;
            if(best===1)break;
          }
        }
        if(best===1)break;
      }

      if(br<0)return true;

      var candidates=[];
      for(var bits=bm;bits;bits&=bits-1){
        var one=bits&-bits;
        candidates.push(1+Math.round(Math.log(one)/Math.LN2));
      }
      shuffle(candidates,random);

      var b=box(br,bc);
      var active=((br+bc)&1)===parity;
      var dd=downIndex(br,bc);
      var du=upIndex(br,bc);

      for(var i=0;i<candidates.length;i++){
        var d=candidates[i];
        var bit=1<<(d-1);

        grid[br][bc]=d;
        rows[br]|=bit;
        cols[bc]|=bit;
        boxes[b]|=bit;

        if(active){
          diagDown[dd]|=bit;
          diagUp[du]|=bit;
        }

        if(visit())return true;

        if(active){
          diagDown[dd]^=bit;
          diagUp[du]^=bit;
        }

        boxes[b]^=bit;
        cols[bc]^=bit;
        rows[br]^=bit;
        grid[br][bc]=0;
      }

      return false;
    }

    return visit()?grid:null;
  }
  function couplesFor(solution,seed){var all=[];for(var r=0;r<9;r++)for(var c=0;c<9;c++){if(c<8)all.push({a:[r,c],b:[r,c+1],same:(solution[r][c]%2)===(solution[r][c+1]%2)});if(r<8)all.push({a:[r,c],b:[r+1,c],same:(solution[r][c]%2)===(solution[r+1][c]%2)});}shuffle(all,rng(seed>>>0));return all.slice(0,36).sort(function(x,y){return x.a[0]-y.a[0]||x.a[1]-y.a[1]||x.b[0]-y.b[0]||x.b[1]-y.b[1];});}
  function axiaFor(solution,seed){var all=[];for(var r=0;r<9;r++)for(var c=0;c<9;c++){var value=solution[r][c],ok=true;for(var dr=-1;dr<=1;dr+=2)for(var dc=-1;dc<=1;dc+=2)for(var k=1;;k++){var rr=r+dr*k,cc=c+dc*k;if(rr<0||rr>=9||cc<0||cc>=9)break;if(solution[rr][cc]===value)ok=false;}if(ok)all.push([r,c]);}shuffle(all,rng(seed>>>0));return all.slice(0,Math.min(24,all.length)).sort(function(a,b){return a[0]-b[0]||a[1]-b[1];});}
  function reflectionGroupsFor(solution,seed){var dirs=[[0,1],[1,0],[1,1],[1,-1]],segments=[],byKey={};for(var r=0;r<9;r++)for(var c=0;c<9;c++)for(var di=0;di<dirs.length;di++){var dr=dirs[di][0],dc=dirs[di][1],rr=r+dr,cc=c+dc;if(rr<0||rr>=9||cc<0||cc>=9)continue;var line=[[r,c],[rr,cc]],key=solution[r][c]+','+solution[rr][cc];(byKey[key]||(byKey[key]=[])).push(line);}Object.keys(byKey).forEach(function(key){var lines=byKey[key];for(var a=0;a<lines.length;a++)for(var b=a+1;b<lines.length;b++){var used={},overlap=false;lines[a].concat(lines[b]).forEach(function(p){var k=p[0]+','+p[1];if(used[k])overlap=true;used[k]=1;});if(!overlap)segments.push([lines[a],lines[b]]);}});shuffle(segments,rng(seed>>>0));var symbols=['●','◆','✦','■','▲','✚'],out=[];for(var i=0;i<segments.length&&out.length<6;i++){var pair=segments[i];out.push({symbol:symbols[out.length%symbols.length],lines:deepClone(pair)});}return out;}
  function slingshotsFor(solution,seed){var all=[],adj=[[-1,0],[1,0],[0,-1],[0,1]],dirs=[[-1,0],[1,0],[0,-1],[0,1]];for(var r=0;r<9;r++)for(var c=0;c<9;c++){var d=solution[r][c];for(var ai=0;ai<adj.length;ai++){var sr=r+adj[ai][0],sc=c+adj[ai][1];if(sr<0||sr>=9||sc<0||sc>=9)continue;for(var di=0;di<dirs.length;di++){var tr=r+dirs[di][0]*d,tc=c+dirs[di][1]*d;if(tr<0||tr>=9||tc<0||tc>=9)continue;if(sr===tr&&sc===tc)continue;if(solution[sr][sc]===solution[tr][tc])all.push({cell:[r,c],source:[sr,sc],dir:dirs[di].slice()});}}}shuffle(all,rng(seed>>>0));return all.slice(0,Math.min(12,all.length)).sort(function(a,b){return a.cell[0]-b.cell[0]||a.cell[1]-b.cell[1]||a.source[0]-b.source[0]||a.source[1]-b.source[1]||a.dir[0]-b.dir[0]||a.dir[1]-b.dir[1];});}
  function searchStats(source,variant){var grid=clone(source),n=grid.length,full=(1<<n)-1,rows=Array(n).fill(0),cols=Array(n).fill(0),boxes=Array(n).fill(0),stats={nodes:0,branches:0,deadEnds:0,solutions:0};function boxIndex(r,c){return Math.floor(r/3)*3+Math.floor(c/3);}function evenSandwichValid(){var clues=(variant.data&&variant.data.clues)||[];for(var i=0;i<clues.length;i++){var cl=clues[i],line=lineAt(grid,cl.axis,cl.index);if(line.every(Boolean)){var actual=evenSandwichDigits(line),want=(cl.digits||[]).slice().sort(function(a,b){return a-b;});if(actual.length!==want.length)return false;for(var j=0;j<actual.length;j++)if(actual[j]!==want[j])return false;}}return true;}function topHeavyParityValid(){for(var r=0;r<n-1;r++)for(var c=0;c<n;c++){var a=grid[r][c],b=grid[r+1][c];if(a&&b&&a%2===b%2&&a<=b)return false;}return true;}function extraValid(){return variant.kind==='evensandwich'?evenSandwichValid():variant.kind==='topheavyparity'?topHeavyParityValid():true;}for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(grid[r][c]){var value=grid[r][c],bit=1<<(value-1),box=boxIndex(r,c);if((rows[r]|cols[c]|boxes[box])&bit)return stats;rows[r]|=bit;cols[c]|=bit;boxes[box]|=bit;}if(!extraValid())return stats;function visit(){if(stats.solutions>=2)return;stats.nodes++;var br=-1,bc=-1,bm=0,best=n+1;for(var rr=0;rr<n;rr++)for(var cc=0;cc<n;cc++)if(!grid[rr][cc]){var mask=full&~(rows[rr]|cols[cc]|boxes[boxIndex(rr,cc)]),validMask=0;for(var bits=mask;bits;bits&=bits-1){var one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);grid[rr][cc]=digit;if(extraValid())validMask|=one;grid[rr][cc]=0;}var count=bitCount(validMask);if(count<best){br=rr;bc=cc;bm=validMask;best=count;if(count<=1)break;}}if(br<0){stats.solutions++;return;}if(!bm){stats.deadEnds++;return;}if(best>1)stats.branches++;var box=boxIndex(br,bc);for(var bits=bm;bits;bits&=bits-1){var one=bits&-bits,digit=1+Math.round(Math.log(one)/Math.LN2);grid[br][bc]=digit;rows[br]|=one;cols[bc]|=one;boxes[box]|=one;visit();rows[br]^=one;cols[bc]^=one;boxes[box]^=one;grid[br][bc]=0;if(stats.solutions>=2)return;}}visit();return stats;}
  function makeEvenSandwich(variant,seed,difficulty){for(var attempt=0;attempt<12;attempt++){var actualSeed=((seed>>>0)^0x45565357^Math.imul(attempt+1,0x9E3779B1))>>>0,working=deepClone(variant),solution=transformedSudokuSolution(variant.solution,(actualSeed^0x534F4C56)>>>0);working.solution=solution;working.data=Object.assign({},working.data||{},{clues:evenSandwichClues(solution)});var out=baseMake.call(generator,working,actualSeed,difficulty||'focused');if(!out.generation||out.generation.unique!==true||out.generation.variantEssential!==true)continue;out.solution=solution;out.data=working.data;out.generation.seed=seed>>>0;out.generation.transformationSeed=actualSeed;out.generation.generatorFamily='even-sandwich-fresh-solution-derived-clues';return out;}throw new Error('Even Sandwich bounded generation failed for seed '+seed+' / '+(difficulty||'focused'));}
  function makeTopHeavy(variant,seed,difficulty){for(var attempt=0;attempt<12;attempt++){var actualSeed=((seed>>>0)^0x54485059^Math.imul(attempt+1,0x9E3779B1))>>>0,solution=topHeavySolution((actualSeed^0x534f4c56)>>>0);if(!solution)continue;var working=deepClone(variant);working.solution=solution;var out=baseMake.call(generator,working,actualSeed,difficulty||'focused');if(!out.generation||out.generation.unique!==true||out.generation.variantEssential!==true)continue;out.solution=solution;out.data=working.data||{};out.generation.seed=seed>>>0;out.generation.transformationSeed=actualSeed;out.generation.generatorFamily='top-heavy-parity-fresh-constrained-solution';return out;}throw new Error('Top-Heavy Parity bounded generation failed for seed '+seed+' / '+(difficulty||'focused'));}
  function makeRelationVariant(variant,seed,difficulty){for(var attempt=0;attempt<16;attempt++){var actualSeed=((seed>>>0)^0x52454c47^Math.imul(attempt+1,0x9E3779B1))>>>0,working=deepClone(variant),solution;if(variant.id==='bishopsgate')solution=bishopsgateSolution((actualSeed^0x534f4c56)>>>0,(working.data&&working.data.parity)||0);else solution=transformedSudokuSolution(variant.solution,(actualSeed^0x534f4c56)>>>0);if(!solution)continue;working.solution=solution;working.data=Object.assign({},working.data||{});if(variant.id==='couples')working.data.couples=couplesFor(solution,(actualSeed^0x43504c53)>>>0);else if(variant.id==='axia')working.data.axia=axiaFor(solution,(actualSeed^0x41584941)>>>0);else if(variant.id==='reflection'){working.data.reflectionGroups=reflectionGroupsFor(solution,(actualSeed^0x52464c43)>>>0);if(working.data.reflectionGroups.length<3)continue;}else if(variant.id==='slingshot'){working.data.slingshots=slingshotsFor(solution,(actualSeed^0x534c494e)>>>0);if(working.data.slingshots.length<4)continue;}var out=baseMake.call(generator,working,actualSeed,difficulty||'focused');if(!out.generation||out.generation.unique!==true||out.generation.variantEssential!==true)continue;out.solution=solution;out.data=working.data;out.generation.seed=seed>>>0;out.generation.transformationSeed=actualSeed;out.generation.generatorFamily=variant.id==='bishopsgate'?'bishopsgate-fresh-constrained-solution':variant.id+'-fresh-solution-derived-topology';return out;}throw new Error(variant.id+' bounded generation failed for seed '+seed+' / '+(difficulty||'focused'));}
  generator.iteration13SearchStats=searchStats;
  generator.make=function(variant,seed,difficulty){var relation=variant&&['couples','reflection','slingshot','bishopsgate','axia'].indexOf(variant.id)>=0;var out=variant&&variant.id==='even-sandwich'?makeEvenSandwich(variant,seed,difficulty):variant&&variant.id==='top-heavy-parity'?makeTopHeavy(variant,seed,difficulty):relation?makeRelationVariant(variant,seed,difficulty):baseMake.call(this,variant,seed,difficulty);if(variant&&(variant.id==='even-sandwich'||variant.id==='top-heavy-parity')){var stats=searchStats(out.puzzle,out);out.generation.searchStats=stats;out.generation.difficultyScore=stats.nodes+stats.branches*3+stats.deadEnds*2;out.generation.measured=true;}return out;};
})(typeof window!=='undefined'?window:globalThis);
