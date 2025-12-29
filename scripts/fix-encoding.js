const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

function walk(dir, excludeDirs = new Set(['node_modules', '.git'])){
  const out = [];
  for(const name of fs.readdirSync(dir)){
    if (excludeDirs.has(name)) continue;
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if(st.isDirectory()) out.push(...walk(fp, excludeDirs));
    else out.push(fp);
  }
  return out;
}

function looksMojibake(s){
  return /[â•ھâ”کخ“أ‡أ®]/.test(s);
}

function processFile(fp){
  try{
    const ext = path.extname(fp).toLowerCase();
    if(!['.html','.htm','.css','.md','.js'].includes(ext)) return false;
    const buf = fs.readFileSync(fp);
    const asUtf8 = buf.toString('utf8');
    if(!looksMojibake(asUtf8)) return false;
    const decoded = iconv.decode(buf, 'windows-1256');
    if(!looksMojibake(decoded)){
      fs.writeFileSync(fp, decoded, 'utf8');
      console.log('Converted:', fp);
      return true;
    } else {
      console.warn('Detected mojibake but decode did not fix:', fp);
      return false;
    }
  }catch(e){ console.error('err', fp, e); return false; }
}

(function main(){
  const root = path.join(__dirname, '..');
  const files = walk(root);
  const affected = [];
  for(const f of files){
    if(processFile(f)) affected.push(f);
  }
  console.log('\nDone. Converted', affected.length, 'files.');
})();
