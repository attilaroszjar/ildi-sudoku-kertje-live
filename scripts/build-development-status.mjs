'use strict';

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { canonicalGeneratorAuditStatus, summarizeGeneratorAudit } from './sudoku-generator-audit-model.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const output=process.argv[2]?path.resolve(process.argv[2]):path.join(root,'development-status.html');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...index.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(x=>x.startsWith('games/sudoku-bank'));
const ctx={console};ctx.globalThis=ctx;ctx.window=ctx;ctx.localStorage={getItem:()=>null,setItem:()=>{}};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'assets/i18n.js'),'utf8'),ctx);
for(const ref of refs)vm.runInContext(fs.readFileSync(path.join(root,ref),'utf8'),ctx,{filename:ref});
const bank=ctx.SudokuBank||[];
if(bank.length!==106)throw new Error(`expected 106 catalogue entries, got ${bank.length}`);

const overridesPath=path.join(root,'data/development-status-overrides.json');
const overrides=fs.existsSync(overridesPath)?JSON.parse(fs.readFileSync(overridesPath,'utf8')).items||{}:{};
const backlogPath=path.join(root,'data/ildi-development-backlog.json');
const backlogData=fs.existsSync(backlogPath)?JSON.parse(fs.readFileSync(backlogPath,'utf8')):{items:[]};
const backlogItems=Array.isArray(backlogData.items)?backlogData.items:[];
const activeBacklog=backlogItems.filter(x=>['OPEN','IN_PROGRESS','VERIFY'].includes(x.status));
const catalogueIds=new Set(bank.map(v=>v.id));
const unknownBacklogGameIds=Array.from(new Set(
  activeBacklog
    .map(x=>x.gameId)
    .filter(id=>id!=='*'&&!catalogueIds.has(id))
));
if(unknownBacklogGameIds.length){
  throw new Error(
    `unknown backlog gameId(s): ${unknownBacklogGameIds.join(', ')}`
  );
}

const backlogByGame=new Map();
for(const item of activeBacklog){
  if(item.gameId==='*')continue;
  const list=backlogByGame.get(item.gameId)||[];
  list.push(item);
  backlogByGame.set(item.gameId,list);
}
const workRank={IN_PROGRESS:0,VERIFY:1,OPEN:2};
function currentWorkFor(id){
  const items=(backlogByGame.get(id)||[]).slice().sort((a,b)=>
    workRank[a.status]-workRank[b.status]||
    String(a.priority).localeCompare(String(b.priority))||
    String(a.id).localeCompare(String(b.id))
  );
  if(!items.length)return {status:'NONE',items:[],note:'Nincs nyitott Ildi-teendő.'};
  const status=items.some(x=>x.status==='IN_PROGRESS')?'IN_PROGRESS':
    items.some(x=>x.status==='VERIFY')?'VERIFY':'OPEN';
  return {
    status,
    items,
    note:items.map(x=>`${x.priority}: ${x.summary}`).join(' · ')
  };
}
const qualityPath=path.join(root,'docs/game-quality-status.md');
const qualityText=fs.existsSync(qualityPath)?fs.readFileSync(qualityPath,'utf8'):'';
const testFiles=fs.readdirSync(path.join(root,'tests')).filter(x=>x.endsWith('.test.js'));
const auditDocs=fs.readdirSync(root).filter(x=>/^ITERATION\d+_AUDIT\.md$/.test(x));
const evidenceNames=testFiles.concat(auditDocs).map(x=>x.toLowerCase());

function git(args){const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});return r.status===0?String(r.stdout||'').trim():'';}
function norm(x){return String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
const quality10Names=new Set([...qualityText.matchAll(/^\|\s*([^|]+?)\s*\|\s*10\/10\s*\|/gm)].map(m=>norm(m[1])));
function quality10(v){return [v.title,v.name,v.id].map(norm).filter(Boolean).some(x=>quality10Names.has(x));}
function tokens(v){return Array.from(new Set([norm(v.id),norm(v.kind),norm(v.title)].filter(x=>x&&x.length>=3)));}
function dedicatedEvidence(v){const ts=tokens(v);return evidenceNames.filter(name=>ts.some(t=>name.includes(t))).slice(0,6);}
function baseStatusFor(v){
  const override=overrides[v.id];
  if(quality10(v))return {status:'READY',note:(override&&override.status==='READY'&&override.note)||'A játék szabályai és működése teljes körűen ellenőrzött.'};
  if(override)return {status:override.status,note:override.note||''};
  const ev=dedicatedEvidence(v);
  if(ev.some(x=>/production|post-hardening|quality-audit|audit-b|generation-hardening|generator-hardening/.test(x)))return {status:'AUDITED',note:'Külön ellenőrzések és tesztek készültek hozzá.'};
  if(ev.length)return {status:'VERIFIED',note:'Van hozzá célzott teszt vagy ellenőrzés.'};
  return {status:'BASELINE',note:'A katalógusban és a kiadásban ellenőrzött.'};
}
function is9x9(v){return Array.isArray(v.solution)&&v.solution.length===9&&v.solution.every(r=>Array.isArray(r)&&r.length===9&&r.every(Number.isInteger));}

const baseLabels={READY:'Kész',AUDITED:'Auditált',VERIFIED:'Ellenőrzött',IN_PROGRESS:'Fejlesztés alatt',BASELINE:'Alapállapot',OPEN:'Nyitott'};
const workLabels={NONE:'Nincs',OPEN:'Nyitott',IN_PROGRESS:'Fejlesztés alatt',VERIFY:'Ellenőrzésre vár'};
const generatorLabels={CATEGORY_A:'Teljesen kész',RECONCILE:'Majdnem kész',PARTIAL:'Fejlesztés alatt',LEGACY:'Régi generátor',STATIC_GENERIC:'Új generátor kell',N_A:'Nem érinti'};
const generatorNotes={
  CATEGORY_A:'A generátor minden fontos ellenőrzésen átment, és kiadásra kész.',
  RECONCILE:'A generátor már jól működik; még néhány végső ellenőrzést kell lezárni.',
  PARTIAL:'Még érdemi fejlesztés szükséges a megbízható generáláshoz.',
  LEGACY:'A játék még a régebbi generátort használja; korszerűsítésre vár.',
  STATIC_GENERIC:'Ehhez a játékhoz még külön, megbízható generátort kell készíteni.',
  N_A:'Ez a játék nem része a 77 darabos 9×9 Sudoku-generátor programnak.'
};
const baseRank={OPEN:0,IN_PROGRESS:1,BASELINE:2,VERIFIED:3,AUDITED:4,READY:5};
const genRank={LEGACY:0,STATIC_GENERIC:1,PARTIAL:2,RECONCILE:3,CATEGORY_A:4,N_A:5};
const sudokuRows=bank.filter(is9x9);
if(sudokuRows.length!==77)throw new Error(`expected 77 standard 9x9 Sudoku variants, got ${sudokuRows.length}`);
const generatorSummary=summarizeGeneratorAudit(sudokuRows.map(v=>v.id));

const japaneseFocusKinds=new Set([
  'hitori',
  'bridges',
  'fillomino',
  'slitherlink',
  'akari',
  'nurikabe',
  'nonogram',
  'masyu',
  'starbattle',
  'galaxies',
  'rippleeffect',
  'battleships',
  'heyawake',
  'futoshiki'
]);
const japaneseFocusIds=new Set(
  bank.filter(v=>japaneseFocusKinds.has(v.kind)).map(v=>v.id)
);
if(japaneseFocusIds.size!==14){
  throw new Error(`expected 14 Japanese logic focus games, got ${japaneseFocusIds.size}`);
}

const sudokuIds=new Set(sudokuRows.map(v=>v.id));
const otherCatalogueIds=new Set(
  bank
    .filter(v=>!sudokuIds.has(v.id) && !japaneseFocusIds.has(v.id))
    .map(v=>v.id)
);

if(otherCatalogueIds.size!==15){
  throw new Error(`expected 15 remaining catalogue games, got ${otherCatalogueIds.size}`);
}
if(sudokuIds.size+japaneseFocusIds.size+otherCatalogueIds.size!==106){
  throw new Error('catalogue scope partition does not cover exactly 106 games');
}

const rows=bank.map(v=>{
  const base=baseStatusFor(v);
  const generatorAudit=is9x9(v)?canonicalGeneratorAuditStatus(v.id):'N_A';
  const fresh=overrides[v.id]?.note||generatorNotes[generatorAudit];
  const catalogueScope=sudokuIds.has(v.id)
    ? 'sudoku'
    : japaneseFocusIds.has(v.id)
      ? 'japanese'
      : 'other';
  const work=currentWorkFor(v.id);
  return {id:v.id,title:ctx.SudokuI18n.variant(v).title,family:ctx.SudokuI18n.variant(v).family,baseStatus:base.status,baseNote:base.note,generatorAudit,fresh,japaneseFocus:japaneseFocusIds.has(v.id),catalogueScope,workStatus:work.status,workNote:work.note,workCount:work.items.length};
}).sort((a,b)=>genRank[a.generatorAudit]-genRank[b.generatorAudit]||baseRank[a.baseStatus]-baseRank[b.baseStatus]||a.family.localeCompare(b.family,'hu')||a.title.localeCompare(b.title,'hu'));

const japaneseRows=rows.filter(r=>r.japaneseFocus);
const japaneseBaseCounts={READY:0,AUDITED:0,VERIFIED:0,IN_PROGRESS:0,BASELINE:0,OPEN:0};
for(const row of japaneseRows){
  if(Object.prototype.hasOwnProperty.call(japaneseBaseCounts,row.baseStatus)){
    japaneseBaseCounts[row.baseStatus]+=1;
  }
}
const japaneseFurtherWork=
  japaneseBaseCounts.AUDITED+
  japaneseBaseCounts.VERIFIED+
  japaneseBaseCounts.IN_PROGRESS+
  japaneseBaseCounts.BASELINE+
  japaneseBaseCounts.OPEN;

const otherRows=rows.filter(r=>r.catalogueScope==='other');
const otherBaseCounts={READY:0,AUDITED:0,VERIFIED:0,IN_PROGRESS:0,BASELINE:0,OPEN:0};
for(const row of otherRows){
  if(Object.prototype.hasOwnProperty.call(otherBaseCounts,row.baseStatus)){
    otherBaseCounts[row.baseStatus]+=1;
  }
}
const otherFurtherWork=
  otherBaseCounts.AUDITED+
  otherBaseCounts.VERIFIED+
  otherBaseCounts.IN_PROGRESS+
  otherBaseCounts.BASELINE+
  otherBaseCounts.OPEN;

const globalBacklog=activeBacklog.filter(x=>x.gameId==='*');
const affectedGameIds=new Set(
  activeBacklog
    .filter(x=>x.gameId!=='*')
    .map(x=>x.gameId)
);
const backlogPriorityCounts={P0:0,P1:0,P2:0,P3:0};
const backlogStatusCounts={OPEN:0,IN_PROGRESS:0,VERIFY:0};

for(const item of activeBacklog){
  if(Object.prototype.hasOwnProperty.call(backlogPriorityCounts,item.priority)){
    backlogPriorityCounts[item.priority]+=1;
  }
  if(Object.prototype.hasOwnProperty.call(backlogStatusCounts,item.status)){
    backlogStatusCounts[item.status]+=1;
  }
}

const sourceHead=git(['rev-parse','--short','HEAD'])||'unknown';
const builtAt=new Date().toISOString().slice(0,10);
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function rowHtml(r){return `<tr data-generator="${r.generatorAudit}" data-base="${r.baseStatus}" data-work="${r.workStatus}" data-japanese="${r.japaneseFocus?'1':'0'}" data-scope="${r.catalogueScope}" data-search="${esc((r.title+' '+r.family+' '+r.id+' '+r.baseNote+' '+r.fresh).toLowerCase())}"><td><strong>${esc(r.title)}</strong><small>${esc(r.id)}</small></td><td>${esc(r.family)}</td><td><span class="badge base-${r.baseStatus}">${esc(baseLabels[r.baseStatus]||r.baseStatus)}</span></td><td><span class="badge gen-${r.generatorAudit}">${esc(generatorLabels[r.generatorAudit])}</span></td><td><span class="badge work-${r.workStatus}">${esc(workLabels[r.workStatus])}</span>${r.workCount?`<small>${r.workCount} teendő</small>`:''}</td><td>${esc(r.workStatus==='NONE'?r.fresh:r.workNote)}</td></tr>`;}
const gs=generatorSummary.byStatus;
const html=`<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><title>Ildi Sudoku Kertje – fejlesztési állapot</title><style>
:root{color-scheme:light dark;--bg:#f7f4ee;--card:#fffdf8;--text:#24312b;--muted:#68736e;--line:#d9ddd8;--accent:#466b59}*{box-sizing:border-box}body{margin:0;font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--bg);color:var(--text)}main{max-width:1220px;margin:auto;padding:28px 18px 48px}header{display:flex;gap:16px;justify-content:space-between;align-items:flex-end;flex-wrap:wrap}h1{margin:0;font-size:28px}h2{margin:26px 0 8px}p{margin:.4rem 0}.muted{color:var(--muted)}a{color:var(--accent)}.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin:18px 0}.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px}.card strong{font-size:23px;display:block}.filter-card{font:inherit;color:inherit;text-align:left;cursor:pointer;width:100%;appearance:none}.filter-card:hover{transform:translateY(-1px);border-color:var(--accent)}.filter-card:focus-visible{outline:3px solid var(--accent);outline-offset:2px}.filter-card.active{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 28%,transparent)}.program{border-left:4px solid var(--accent);padding-left:12px}.controls{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}.controls input,.controls select{font:inherit;padding:9px 11px;border:1px solid var(--line);border-radius:9px;background:var(--card);color:var(--text)}.controls input{min-width:260px;flex:1}table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line)}th,td{text-align:left;padding:10px 9px;border-bottom:1px solid var(--line);vertical-align:top}th{position:sticky;top:0;background:var(--card)}td small{display:block;color:var(--muted);margin-top:2px}.badge{display:inline-block;border-radius:999px;padding:3px 8px;font-weight:700;font-size:12px;white-space:nowrap}.gen-CATEGORY_A{background:#dcefe3;color:#245c38}.gen-RECONCILE{background:#e1edf7;color:#285d84}.gen-PARTIAL{background:#fff0cf;color:#795b16}.gen-LEGACY{background:#f8dddd;color:#8b3030}.gen-STATIC_GENERIC,.gen-N_A{background:#ececeb;color:#555}.base-READY{background:#dcefe3;color:#245c38}.base-AUDITED,.base-VERIFIED{background:#ece9f7;color:#544786}.base-IN_PROGRESS{background:#fff0cf;color:#795b16}.base-BASELINE{background:#ececeb;color:#555}.base-OPEN{background:#f8dddd;color:#8b3030}@media(max-width:760px){table,thead,tbody,tr,th,td{display:block}thead{display:none}tr{padding:10px;border-bottom:1px solid var(--line)}td{border:0;padding:4px 8px}td:nth-child(2)::before{content:'Kategória: ';font-weight:700}td:nth-child(3)::before{content:'Alapállapot: ';font-weight:700}td:nth-child(4)::before{content:'Generátor: ';font-weight:700}}@media(prefers-color-scheme:dark){:root{--bg:#18201c;--card:#202a25;--text:#edf4ef;--muted:#a9b5ae;--line:#3b4941;--accent:#9cc8ae}.gen-CATEGORY_A,.base-READY{background:#244a32;color:#c9efd5}.gen-RECONCILE{background:#243e52;color:#d2e9fa}.gen-PARTIAL,.base-IN_PROGRESS{background:#51431e;color:#ffe3a5}.gen-LEGACY,.base-OPEN{background:#542c2c;color:#ffd0d0}.gen-STATIC_GENERIC,.gen-N_A,.base-BASELINE{background:#3b3d3c;color:#ddd}.base-AUDITED,.base-VERIFIED{background:#3d365b;color:#e6defb}}
.work-OPEN{background:#f8dddd;color:#8b3030}.work-IN_PROGRESS{background:#fff0cf;color:#795b16}.work-VERIFY{background:#e1edf7;color:#285d84}.work-NONE{background:#dcefe3;color:#245c38}.global-work{margin:14px 0 22px;padding:12px 14px;border:1px solid var(--line);border-left:4px solid #8b3030;border-radius:10px;background:var(--card)}</style></head><body><main><header><div><h1>Fejlesztési állapot</h1><p class="muted">Itt látható, mely játékok generátora van már teljesen kész, és melyeken dolgozunk még.</p></div><div><a href="./">← Vissza a játékhoz</a><p class="muted">Frissítve: ${builtAt} · verzió: ${esc(sourceHead)}</p></div></header><h2>Aktuális fejlesztési program</h2><p class="program">A korábbi technikai auditok és a 77/77 Sudoku-generátor program lezárása mellett Ildi újabb visszajelzéseiből külön, élő backlogot vezetünk.</p><section class="summary"><div class="card"><strong>${activeBacklog.length}</strong>Aktív teendő</div><div class="card"><strong>${affectedGameIds.size}</strong>Érintett játék</div><div class="card"><strong>${backlogPriorityCounts.P0}</strong>P0 · helyesség</div><div class="card"><strong>${backlogPriorityCounts.P1}</strong>P1 · UX / szabály</div><div class="card"><strong>${backlogPriorityCounts.P2}</strong>P2 · nehézség</div><div class="card"><strong>${backlogPriorityCounts.P3}</strong>P3 · méretbővítés</div></section>${globalBacklog.length?`<section class="global-work"><strong>Globális teendő:</strong> ${globalBacklog.map(x=>esc(`${x.priority}: ${x.summary}`)).join(' · ')}</section>`:''}<h2>Sudoku-generátorok</h2><p class="program"><strong>77 darab 9×9-es Sudoku-változatot</strong> ellenőrzünk különösen szigorúan. Ez a blokk kizárólag a 77 darabos Sudoku-generátor program állapotát mutatja.</p><section class="summary"><button class="card filter-card" type="button" data-filter-scope="sudoku"><strong>77</strong>Összes Sudoku</button><button class="card filter-card" type="button" data-filter-scope="sudoku" data-filter-work="OPEN"><strong>${rows.filter(r=>r.catalogueScope==='sudoku'&&r.workStatus==='OPEN').length}</strong>Nyitott teendő</button><button class="card filter-card" type="button" data-filter-scope="sudoku" data-filter-work="IN_PROGRESS"><strong>${rows.filter(r=>r.catalogueScope==='sudoku'&&r.workStatus==='IN_PROGRESS').length}</strong>Fejlesztés alatt</button><button class="card filter-card" type="button" data-filter-scope="sudoku" data-filter-work="VERIFY"><strong>${rows.filter(r=>r.catalogueScope==='sudoku'&&r.workStatus==='VERIFY').length}</strong>Ellenőrzésre vár</button><button class="card filter-card" type="button" data-filter-scope="sudoku" data-filter-generator="CATEGORY_A"><strong>${gs.CATEGORY_A} / 77</strong>Teljesen kész</button><button class="card filter-card" type="button" data-filter-scope="sudoku" data-filter-generator="RECONCILE"><strong>${gs.RECONCILE}</strong>Majdnem kész</button><button class="card filter-card" type="button" data-filter-scope="sudoku" data-filter-generator="PARTIAL"><strong>${gs.PARTIAL}</strong>Fejlesztés alatt</button><button class="card filter-card" type="button" data-filter-scope="sudoku" data-filter-generator="LEGACY"><strong>${gs.LEGACY}</strong>Régi generátor</button><button class="card filter-card" type="button" data-filter-scope="sudoku" data-filter-generator="STATIC_GENERIC"><strong>${gs.STATIC_GENERIC}</strong>Új generátor kell</button></section><p class="muted"><strong>Teljesen kész:</strong> minden fontos generálási és megbízhatósági ellenőrzés teljesült. <strong>Majdnem kész:</strong> a generátor már működik, csak néhány végső ellenőrzés hiányzik. A többi kategóriánál még tényleges fejlesztési munka van hátra.</p><h2>Aktuális japán fejlesztési fókusz</h2><p class="program"><strong>${japaneseRows.length} kiemelt játék</strong> alkotja a következő fejlesztési fókuszt. Itt külön követhető, hogy közülük mennyi van teljesen lezárva, auditálva vagy még további munkára vár.</p><section class="summary"><button class="card filter-card" type="button" data-filter-scope="japanese"><strong>${japaneseRows.length}</strong>Összes japán játék</button><button class="card filter-card" type="button" data-filter-scope="japanese" data-filter-work="OPEN"><strong>${rows.filter(r=>r.catalogueScope==='japanese'&&r.workStatus==='OPEN').length}</strong>Nyitott teendő</button><button class="card filter-card" type="button" data-filter-scope="japanese" data-filter-work="IN_PROGRESS"><strong>${rows.filter(r=>r.catalogueScope==='japanese'&&r.workStatus==='IN_PROGRESS').length}</strong>Fejlesztés alatt</button><button class="card filter-card" type="button" data-filter-scope="japanese" data-filter-work="VERIFY"><strong>${rows.filter(r=>r.catalogueScope==='japanese'&&r.workStatus==='VERIFY').length}</strong>Ellenőrzésre vár</button><button class="card filter-card" type="button" data-filter-scope="japanese" data-filter-base="READY"><strong>${japaneseBaseCounts.READY}</strong>Kész</button><button class="card filter-card" type="button" data-filter-scope="japanese" data-filter-base="AUDITED"><strong>${japaneseBaseCounts.AUDITED}</strong>Auditált</button><button class="card filter-card" type="button" data-filter-scope="japanese" data-filter-base="VERIFIED"><strong>${japaneseBaseCounts.VERIFIED}</strong>Ellenőrzött</button><button class="card filter-card" type="button" data-filter-scope="japanese" data-filter-base-group="further"><strong>${japaneseFurtherWork}</strong>További munka</button></section><p class="muted">Ez az összesítés az alapműködés és a játékminőség állapotát mutatja; a 77 darabos Sudoku-generátor programtól külön kezeljük.</p><h2>További játékok</h2><p class="program"><strong>${otherRows.length} játék</strong> tartozik a teljes katalógushoz a 77 Sudoku és a 14 aktuálisan kiemelt japán játék mellett. Ezek státusza külön is követhető.</p><section class="summary"><button class="card filter-card" type="button" data-filter-scope="other"><strong>${otherRows.length}</strong>Összes további játék</button><button class="card filter-card" type="button" data-filter-scope="other" data-filter-work="OPEN"><strong>${rows.filter(r=>r.catalogueScope==='other'&&r.workStatus==='OPEN').length}</strong>Nyitott teendő</button><button class="card filter-card" type="button" data-filter-scope="other" data-filter-work="IN_PROGRESS"><strong>${rows.filter(r=>r.catalogueScope==='other'&&r.workStatus==='IN_PROGRESS').length}</strong>Fejlesztés alatt</button><button class="card filter-card" type="button" data-filter-scope="other" data-filter-work="VERIFY"><strong>${rows.filter(r=>r.catalogueScope==='other'&&r.workStatus==='VERIFY').length}</strong>Ellenőrzésre vár</button><button class="card filter-card" type="button" data-filter-scope="other" data-filter-base="READY"><strong>${otherBaseCounts.READY}</strong>Kész</button><button class="card filter-card" type="button" data-filter-scope="other" data-filter-base="AUDITED"><strong>${otherBaseCounts.AUDITED}</strong>Auditált</button><button class="card filter-card" type="button" data-filter-scope="other" data-filter-base="VERIFIED"><strong>${otherBaseCounts.VERIFIED}</strong>Ellenőrzött</button><button class="card filter-card" type="button" data-filter-scope="other" data-filter-base-group="further"><strong>${otherFurtherWork}</strong>További munka</button></section><div class="controls"><input id="q" type="search" placeholder="Keresés játékra vagy kategóriára…"><select id="scope"><option value="">Minden játék</option><option value="sudoku">Csak Sudoku</option><option value="japanese">Aktuális japán fókusz (14)</option><option value="other">További játékok (15)</option></select><select id="base-status"><option value="">Minden alapállapot</option><option value="READY">Kész</option><option value="AUDITED">Auditált</option><option value="VERIFIED">Ellenőrzött</option><option value="IN_PROGRESS">Fejlesztés alatt</option><option value="BASELINE">Alapállapot</option><option value="OPEN">Nyitott</option></select><select id="work-status"><option value="">Minden teendőállapot</option><option value="OPEN">Nyitott</option><option value="IN_PROGRESS">Fejlesztés alatt</option><option value="VERIFY">Ellenőrzésre vár</option><option value="NONE">Nincs nyitott teendő</option></select><select id="generator"><option value="">Minden generátorállapot</option>${['CATEGORY_A','RECONCILE','PARTIAL','LEGACY','STATIC_GENERIC','N_A'].map(k=>`<option value="${k}">${generatorLabels[k]}</option>`).join('')}</select></div><table><thead><tr><th>Játék</th><th>Kategória</th><th>Alapállapot</th><th>Generátor</th><th>Aktuális teendő</th><th>Részletek</th></tr></thead><tbody>${rows.map(rowHtml).join('')}</tbody></table><p class="muted" style="margin-top:16px">A lista automatikusan a fejlesztés aktuális állapotából készül, ezért minden új lezárt fejlesztéssel frissül.</p></main><script>const q=document.querySelector('#q'),s=document.querySelector('#generator'),scope=document.querySelector('#scope'),base=document.querySelector('#base-status'),work=document.querySelector('#work-status'),rs=[...document.querySelectorAll('tbody tr')];let cardBaseGroup='';function f(){const x=q.value.trim().toLowerCase(),st=s.value,sc=scope.value,bs=base.value,ws=work.value;rs.forEach(r=>{const further=cardBaseGroup==='further'&&!['AUDITED','VERIFIED','IN_PROGRESS','BASELINE','OPEN'].includes(r.dataset.base);r.hidden=!!((st&&r.dataset.generator!==st)||(sc&&r.dataset.scope!==sc)||(bs&&r.dataset.base!==bs)||(ws&&r.dataset.work!==ws)||further||(x&&!r.dataset.search.includes(x)))})}q.addEventListener('input',f);
s.addEventListener('change',()=>{cardBaseGroup='';f()});
scope.addEventListener('change',()=>{cardBaseGroup='';f()});
base.addEventListener('change',()=>{cardBaseGroup='';f()});
work.addEventListener('change',()=>{cardBaseGroup='';f()});

document.querySelectorAll('.filter-card').forEach(card=>{
  card.addEventListener('click',()=>{
    document.querySelectorAll('.filter-card').forEach(x=>x.classList.remove('active'));
    card.classList.add('active');

    q.value='';
    scope.value=card.dataset.filterScope||'';
    s.value=card.dataset.filterGenerator||'';
    base.value=card.dataset.filterBase||'';
    work.value=card.dataset.filterWork||'';
    cardBaseGroup=card.dataset.filterBaseGroup||'';

    f();
    document.querySelector('table').scrollIntoView({behavior:'smooth',block:'start'});
  });
});</script></body></html>`;
fs.writeFileSync(output,html);
console.log(`DEVELOPMENT_STATUS BUILT games=${rows.length} sudoku=${generatorSummary.variants} categoryA=${gs.CATEGORY_A} reconcile=${gs.RECONCILE} partial=${gs.PARTIAL} legacy=${gs.LEGACY} static=${gs.STATIC_GENERIC}`);
console.log(`DEVELOPMENT_STATUS_FILE ${output}`);