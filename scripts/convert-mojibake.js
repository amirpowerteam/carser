const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const ROOT = path.join(__dirname, '..');
const EXCLUDE = new Set(['node_modules', '.git', 'dist', 'build']);
const RE_MOJIBAKE = /[╪┘ΓÇîâïÃ]/;
const EXT_OK = new Set(['.html','.htm','.css','.md','.js','.ts','.tsx','.json','.txt','.svg']);

function walk(dir){
  let out = [];
  for(const name of fs.readdirSync(dir)){
    if(EXCLUDE.has(name)) continue;
    const fp = path.join(dir, name);
    let st;
    try{ st = fs.statSync(fp); }catch(e){ continue; }
    if(st.isDirectory()) out = out.concat(walk(fp));
    else out.push(fp);
  }
  return out;
}

function looksMojibake(s){
  if(!s) return false;
  return RE_MOJIBAKE.test(s);
}

function tryDecode(buf){
  const candidates = ['windows-1256', 'windows-1252', 'iso-8859-1'];
  for(const enc of candidates){
    try{
      const dec = iconv.decode(buf, enc);
      if(!looksMojibake(dec)) return { ok: true, enc, text: dec };
    }catch(e){ /* ignore */ }
  }
  return { ok: false };
}

function backup(fp){
  const bak = fp + '.bak';
  if(fs.existsSync(bak)) return bak;
  fs.copyFileSync(fp, bak);
  return bak;
}

(function main(){
  const files = walk(ROOT);
  const affected = [];
  for(const fp of files){
    const ext = path.extname(fp).toLowerCase();
    if(!EXT_OK.has(ext)) continue;
    let buf;
    try{ buf = fs.readFileSync(fp); }catch(e){ continue; }
    let asUtf8 = null;
    try{ asUtf8 = buf.toString('utf8'); }catch(e){ asUtf8 = null; }
    if(!asUtf8 || !looksMojibake(asUtf8)) continue;
    const dec = tryDecode(buf);
    if(!dec.ok){ console.warn('Could not decode safely:', fp); continue; }
    const bak = backup(fp);
    fs.writeFileSync(fp, dec.text, 'utf8');
    console.log('Converted', fp, 'backup->', bak, 'used:', dec.enc);
    affected.push(fp);
  }
  console.log('\nDone. Converted', affected.length, 'files.');
})();
