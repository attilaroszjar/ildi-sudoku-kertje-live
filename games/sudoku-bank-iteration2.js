(function(root){
'use strict';
if(!root.SudokuBank||!root.SudokuBank.length)return;
var bank=root.SudokuBank, classic=bank.find(function(v){return v.id==='classic';}), base=classic.solution, puzzle=classic.puzzle;
function cp(x){return JSON.parse(JSON.stringify(x));}
function variant(id,title,family,rule,kind,data,solution,customPuzzle){bank.push({id:id,title:title,family:family,rule:rule,kind:kind,data:data||{},puzzle:cp(customPuzzle||puzzle),solution:cp(solution||base)});}
function val(p,g){return g[p[0]][p[1]];}
function lineVals(line,g){return line.map(function(p){return val(p,g);});}
function pathSearch(predicate,len){
  var dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  function walk(path,seen){if(path.length===len&&predicate(lineVals(path,base)))return path;var last=path[path.length-1];for(var i=0;i<dirs.length;i++){var r=last[0]+dirs[i][0],c=last[1]+dirs[i][1],k=r+','+c;if(r<0||c<0||r>8||c>8||seen[k])continue;seen[k]=1;path.push([r,c]);var z=walk(path,seen);if(z)return z;path.pop();delete seen[k];}return null;}
  for(var r=0;r<9;r++)for(var c=0;c<9;c++){var s={};s[r+','+c]=1;var out=walk([[r,c]],s);if(out)return out;}return null;
}
function collectPaths(predicate,len,count){var out=[],blocked={};for(var tries=0;tries<200&&out.length<count;tries++){var line=pathSearch(function(vals){var key=vals.join('-');return predicate(vals)&&!blocked[key];},len);if(!line)break;blocked[lineVals(line,base).join('-')]=1;out.push(line);}return out;}

// Palindrome: symmetric digits along a bent orthogonal path.
var pal=[[1,1],[2,1],[3,1],[3,2],[3,3]];
variant('palindrome','Palindrome Sudoku','Lines','Digits on each grey line read the same forwards and backwards.','palindrome',{lines:[pal]});

// Parity line: adjacent digits alternate odd/even.
var parity=[[0,0],[1,0],[2,0],[3,0],[3,1],[4,1],[5,1]];
variant('parity-line','Parity Line','Lines','Digits along each red line alternate between odd and even.','parityline',{lines:[parity]});

// Entropic: every three consecutive cells include one low/mid/high digit.
var entropic=[[0,0],[0,1],[1,1],[1,0],[2,0],[3,0],[4,0]];
variant('entropic','Entropic Line','Lines','Every three consecutive cells contain one digit from 1–3, one from 4–6, and one from 7–9.','entropic',{lines:[entropic]});

// Modular: every three consecutive cells include one digit from each residue class mod 3.
var modular=[[0,8],[0,7],[0,6],[0,5],[0,4],[1,4],[1,5]];
variant('modular','Modular Line','Lines','Every three consecutive cells contain one digit from each group 147, 258, and 369.','modular',{lines:[modular]});

// Region sum line: row 2 has equal three-cell sums across the three boxes in this solved grid.
variant('region-sum','Region Sum Line','Lines','Box borders split each blue line into segments; every segment on the same line has the same sum.','regionsum',{lines:[[[1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8]]]});

// Quadruples: clues at intersections list digits that must appear in the four surrounding cells.
var qs=[[1,1],[1,4],[4,1],[4,4],[4,7],[7,4]].map(function(p){var r=p[0],c=p[1],cells=[[r-1,c-1],[r-1,c],[r,c-1],[r,c]],digits=cells.map(function(x){return val(x,base);}).sort();return {at:p,cells:cells,digits:digits};});
variant('quadruple','Quadruple Sudoku','Cell marks','Digits written at an intersection must appear among the four cells touching that intersection.','quadruple',{quads:qs});

// Clone: two congruent shapes contain identical digits in matching positions.
var cloneA=[[0,0],[0,1],[1,0]], cloneB=null;
outer:for(var dr=0;dr<8;dr++)for(var dc=0;dc<8;dc++){var b=cloneA.map(function(p){return [p[0]+dr,p[1]+dc];});if(b.some(function(p){return p[0]>8||p[1]>8;}))continue;var ok=true;for(var i=0;i<cloneA.length;i++)if(val(cloneA[i],base)!==val(b[i],base))ok=false;if(ok&&(dr||dc)){cloneB=b;break outer;}}
if(!cloneB){cloneA=[[0,0],[1,0]];outer2:for(var r1=0;r1<8;r1++)for(var c1=0;c1<9;c1++)for(var r2=0;r2<8;r2++)for(var c2=0;c2<9;c2++){if(r1===r2&&c1===c2)continue;if(base[r1][c1]===base[r2][c2]&&base[r1+1][c1]===base[r2+1][c2]){cloneA=[[r1,c1],[r1+1,c1]];cloneB=[[r2,c2],[r2+1,c2]];break outer2;}}}
variant('clone','Clone Sudoku','Cell marks','Cells in matching positions of the two shaded clone shapes contain equal digits.','clone',{clones:[cloneA,cloneB]});

// X-Sums outside clues.
var xs=[];for(var ri=0;ri<9;ri++){var x=base[ri][0];xs.push({axis:'row',index:ri,side:'left',sum:base[ri].slice(0,x).reduce(function(a,b){return a+b;},0)});}for(var ci=0;ci<9;ci++){var xx=base[0][ci];xs.push({axis:'col',index:ci,side:'top',sum:base.slice(0,xx).reduce(function(a,row){return a+row[ci];},0)});}
variant('x-sums','X-Sums Sudoku','Outside clues','An outside clue is the sum of the first X digits from that side, where X is the first digit seen.','xsums',{clues:xs});

// Rossini: record every monotonic first-three sequence around the border.
var ros=[];function mono(vals){return vals[0]<vals[1]&&vals[1]<vals[2]?'inc':vals[0]>vals[1]&&vals[1]>vals[2]?'dec':null;}
for(var rr=0;rr<9;rr++){var m=mono(base[rr].slice(0,3));if(m)ros.push({axis:'row',index:rr,side:'left',dir:m});var rev=base[rr].slice(6).reverse(),m2=mono(rev);if(m2)ros.push({axis:'row',index:rr,side:'right',dir:m2});}
for(var cc=0;cc<9;cc++){var top=[base[0][cc],base[1][cc],base[2][cc]],mt=mono(top);if(mt)ros.push({axis:'col',index:cc,side:'top',dir:mt});var bot=[base[8][cc],base[7][cc],base[6][cc]],mb=mono(bot);if(mb)ros.push({axis:'col',index:cc,side:'bottom',dir:mb});}
variant('rossini','Rossini Sudoku','Outside clues','Outside arrows mark border triples that increase or decrease from the indicated side.','rossini',{clues:ros});

// Fortress: selected high cells are greater than all orthogonally adjacent unshaded cells.
var forts=[];for(var fr=0;fr<9;fr++)for(var fc=0;fc<9;fc++){var neigh=[[fr-1,fc],[fr+1,fc],[fr,fc-1],[fr,fc+1]].filter(function(p){return p[0]>=0&&p[1]>=0&&p[0]<9&&p[1]<9;});if(neigh.length>=3&&neigh.every(function(p){return val([fr,fc],base)>val(p,base);}))forts.push([fr,fc]);}
variant('fortress','Fortress Sudoku','Cell marks','Each shaded fortress cell is larger than every orthogonally adjacent unshaded cell.','fortress',{cells:forts.slice(0,8)});

// Slow thermo: digits never decrease and rise by at most one between adjacent bulbs on the line.
var slow=[[3,6],[2,6],[2,7],[2,8],[1,8]];
variant('slow-thermo','Slow Thermo','Lines','Digits along a slow thermometer do not decrease from bulb to tip, and each step rises by at most 1.','slowthermo',{lines:[slow]});

// Zipper: pairs equidistant from the centre sum to the centre digit.
var zipPath=[[0,4],[0,5],[0,6],[0,7],[0,8]];
variant('zipper','Zipper Line','Lines','Digits equally distant from the centre of a zipper line sum to the digit in the centre cell.','zipper',{lines:[{cells:zipPath}]});

// Center Dot: the nine centre cells of the classic boxes also contain 1-9 once each.
var dg=Array.from({length:9},function(_,r){return Array.from({length:9},function(_,c){return (r*3+Math.floor(r/3)+c)%9+1;});});
var dgPuzzle=dg.map(function(row,r){return row.map(function(v,c){return ((r+c)%3===0||r===4||c===4)?v:0;});});
var centers=[];for(var br=0;br<3;br++)for(var bc=0;bc<3;bc++)centers.push([br*3+1,bc*3+1]);
variant('center-dot','Center Dot Sudoku','Extra regions','The nine marked centre cells of the 3×3 boxes contain digits 1–9 exactly once.','extracells',{cells:centers},dg,dgPuzzle);

// Disjoint Groups: equal positions inside the nine boxes form nine additional all-different groups.
variant('disjoint-groups','Disjoint Groups','Extra regions','Cells in the same relative position inside each 3×3 box contain digits 1–9 exactly once.','disjoint',{},dg,dgPuzzle);

// Mini 6x6 with 2x3 boxes.
var s6=[[1,2,3,4,5,6],[4,5,6,1,2,3],[2,3,4,5,6,1],[5,6,1,2,3,4],[3,4,5,6,1,2],[6,1,2,3,4,5]], p6=s6.map(function(row,r){return row.map(function(v,c){return (r+c)%2===0?v:0;});});
variant('mini-6','Mini Sudoku 6×6','Grid','Use 1–6 once in every row, column, and 2×3 box.','mini6',{},s6,p6);
}(typeof window!=='undefined'?window:globalThis));
