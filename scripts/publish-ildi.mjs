'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const liveRoot=process.env.ILDI_LIVE_REPO
  ? path.resolve(process.env.ILDI_LIVE_REPO)
  : path.resolve(root,'..','ildi-sudoku-kertje-live');
const standalone=path.join(root,'Ildi Sudoku Kertje.html');
const liveIndex=path.join(liveRoot,'index.html');
const liveStatus=path.join(liveRoot,'status.html');
const statusBuilder=path.join(root,'scripts/build-development-status.mjs');
const expectedRemote='attilaroszjar/ildi-sudoku-kertje-live';

function run(cmd,args,cwd,{capture=false}={}){
  const result=spawnSync(cmd,args,{cwd,encoding:'utf8',stdio:capture?'pipe':'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0){
    const detail=capture?String(result.stderr||result.stdout||'').trim():'';
    throw new Error(`${cmd} ${args.join(' ')} failed${detail?`: ${detail}`:''}`);
  }
  return capture?String(result.stdout||'').trim():'';
}
function git(args,cwd,opts){return run('git',args,cwd,opts);}
function ensureClean(cwd,label){
  const dirty=git(['status','--porcelain'],cwd,{capture:true});
  if(dirty)throw new Error(`${label} working tree is not clean:\n${dirty}`);
}
function sha256(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function liveHtml(sourceHead){
  let html=fs.readFileSync(standalone,'utf8');
  const statusHref=`status.html?v=${encodeURIComponent(sourceHead)}`;
  const link=`<a href="${statusHref}" style="margin-left:auto;color:inherit;font-weight:700;text-decoration:none">Fejlesztési állapot</a>`;
  const marker='</footer>';
  if(!html.includes(marker))throw new Error('live status link anchor not found');
  html=html.replace(/<a href="status\.html(?:\?v=[^"]*)?"[^>]*>Fejlesztési állapot<\/a>/g,'');
  html=html.replace(marker,link+marker);
  return html;
}

console.log('===== ILDI LIVE PUBLISH PREFLIGHT =====');
if(!fs.existsSync(standalone))throw new Error(`standalone not found: ${standalone}`);
if(!fs.existsSync(statusBuilder))throw new Error(`status builder not found: ${statusBuilder}`);
if(!fs.existsSync(path.join(liveRoot,'.git')))throw new Error(`live repository not found: ${liveRoot}`);
ensureClean(root,'source');
ensureClean(liveRoot,'live');

const sourceHead=git(['rev-parse','--short','HEAD'],root,{capture:true});
const sourceBranch=git(['branch','--show-current'],root,{capture:true});
const remote=git(['remote','get-url','origin'],liveRoot,{capture:true});
if(!remote.includes(expectedRemote))throw new Error(`unexpected live origin: ${remote}`);

console.log(`SOURCE:${sourceBranch}@${sourceHead}`);
console.log(`LIVE_REPO:${liveRoot}`);

console.log('===== RELEASE GATE =====');
run('npm',['run','test:release'],root);

console.log('===== SYNC LIVE REPO =====');
git(['pull','--ff-only','origin','main'],liveRoot);
ensureClean(liveRoot,'live after pull');

console.log('===== BUILD DEVELOPMENT STATUS =====');
run(process.execPath,[statusBuilder,liveStatus],root);
fs.writeFileSync(liveIndex,liveHtml(sourceHead));

const standaloneHash=sha256(standalone);
const liveIndexHash=sha256(liveIndex);
const changed=git(['status','--porcelain','--','index.html','status.html'],liveRoot,{capture:true});
if(!changed){
  console.log(`PUBLISH:NO_CHANGE standalone_sha256=${standaloneHash}`);
  console.log('ILDI_LIVE_PUBLISH:PASS');
  process.exit(0);
}

git(['add','index.html','status.html'],liveRoot);
git(['commit','-m',`Publish Ildi Sudoku Kertje from ${sourceHead}`],liveRoot);
git(['push','origin','main'],liveRoot);
ensureClean(liveRoot,'live after push');

const liveHead=git(['rev-parse','--short','HEAD'],liveRoot,{capture:true});
console.log(`PUBLISHED_SOURCE:${sourceHead}`);
console.log(`LIVE_HEAD:${liveHead}`);
console.log(`STANDALONE_SHA256:${standaloneHash}`);
console.log(`LIVE_INDEX_SHA256:${liveIndexHash}`);
console.log(`STATUS_URL:https://attilaroszjar.github.io/ildi-sudoku-kertje-live/status.html?v=${sourceHead}`);
console.log('ILDI_LIVE_PUBLISH:PASS');