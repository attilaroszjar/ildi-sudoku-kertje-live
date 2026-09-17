import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const outputs=['Ildi Sudoku Kertje.html','Ildi Sudoku Kertje - Post-Hardening.html'];

function localPath(reference){
  if(path.isAbsolute(reference)||reference.split(/[\\/]/).includes('..'))throw new Error(`Unsafe local reference: ${reference}`);
  return path.join(root,reference);
}

function importedCssPath(reference,fromDir){
  if(path.isAbsolute(reference)||/^(?:https?:|data:|\/\/)/i.test(reference))throw new Error(`Unsafe CSS import: ${reference}`);
  const resolved=path.resolve(fromDir,reference);
  if(resolved!==root&&!resolved.startsWith(root+path.sep))throw new Error(`CSS import escaped repository root: ${reference}`);
  return resolved;
}

function inlineCssFile(file,stack=new Set()){
  if(stack.has(file))throw new Error(`Circular CSS import: ${path.relative(root,file)}`);
  const nextStack=new Set(stack);
  nextStack.add(file);
  let css=fs.readFileSync(file,'utf8');
  if(/<\/style/i.test(css))throw new Error(`Unexpected </style in ${path.relative(root,file)}`);
  return css.replace(/@import\s+(?:url\(\s*)?(['"])([^'"]+)\1\s*\)?\s*;/g,function(_,quote,reference){
    const imported=importedCssPath(reference,path.dirname(file));
    return `/* inlined CSS import: ${reference} */\n${inlineCssFile(imported,nextStack)}`;
  });
}

export function renderStandalone(){
  let html=fs.readFileSync(path.join(root,'index.html'),'utf8');

  html=html.replace(/  <link rel="stylesheet" href="([^"]+)">/g,function(_,reference){
    const css=inlineCssFile(localPath(reference));
    return `  <style data-source="${reference}">\n${css}\n  </style>`;
  });

  html=html.replace(/  <script src="([^"]+)"><\/script>/g,function(_,reference){
    const js=fs.readFileSync(localPath(reference),'utf8');
    if(/<\/script/i.test(js))throw new Error(`Unexpected </script in ${reference}`);
    return `  <script data-source="${reference}">\n${js}\n  </script>`;
  });

  if(/<script[^>]+src=|<link[^>]+rel="stylesheet"/i.test(html))throw new Error('External runtime reference remained after inlining');
  if(/@import\s+(?:url\()?\s*['"]?(?:\.|\/)/i.test(html))throw new Error('Local CSS @import remained after inlining');
  return html;
}

export function writeStandalone(){
  const html=renderStandalone();
  for(const output of outputs){
    const target=path.join(root,output),temporary=target+'.tmp';
    fs.writeFileSync(temporary,html);
    fs.renameSync(temporary,target);
  }
  return outputs;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  for(const output of writeStandalone())console.log(output);
}
