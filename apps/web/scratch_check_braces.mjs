import fs from 'fs';
const s = fs.readFileSync('/home/administrator/web/riverly/apps/web/src/styles/tokens.css', 'utf8');
const lines = s.split('\n');
let depth = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (const ch of line) {
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        console.log('Depth hit 0 at line', i + 1, ':', line.trim());
      }
    }
  }
}
