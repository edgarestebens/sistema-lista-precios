const fs = require('fs');
const path = require('path');

function walk(d, a = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, a);
    else if (p.endsWith('.spec.ts')) a.push(p);
  }
  return a;
}

for (const f of walk('src')) {
  let lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(\s*)updated_at:\s*'([^']*)'\s*,?\s*$/);
    if (m) {
      // Skip subsequent updated_at lines
      while (
        i + 1 < lines.length &&
        /^\s*updated_at:\s*'[^']*'\s*,?\s*$/.test(lines[i + 1])
      ) {
        i++;
      }
      out.push(`${m[1]}updated_at: '${m[2]}',`);
      continue;
    }
    out.push(line);
  }
  let n = out.join('\n');
  // Ensure comma after created_at before updated_at
  n = n.replace(/(created_at:\s*'[^']*')\s*,?\s*\n(\s*updated_at:)/g, '$1,\n$2');
  fs.writeFileSync(f, n);
  console.log('cleaned', f);
}
