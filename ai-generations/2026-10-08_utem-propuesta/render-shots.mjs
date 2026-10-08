import { chromium } from 'playwright'; import fs from 'fs';
const [dir, out, ...names] = process.argv.slice(2); const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const logo = { b397c33481405b476462814aec64dac3: 'efeonce-logo-negative.svg', '374f0987b3b271674331e68c112de6e1': 'efeonce-logo-positive.svg', '5d02dd72cc8612c88976ffd0e350fbe3': 'utem-logo-blanco-canvas.svg' };
for (const f of names) { let h = fs.readFileSync(`${dir}/${f}`, 'utf8').replace('<script src="./support.js"></script>', '').replace(/<\/?helmet>/g, '').replace(/\/_blob\/([0-9a-f]{32})/g, (m, id) => logo[id] ? `file://${out}/../assets/${logo[id]}` : m);
  fs.writeFileSync(`${out}/_t.html`, h); await p.goto(`file://${out}/_t.html`, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `${out}/${f.replace('.dc.html', '.jpg')}`, type: 'jpeg', quality: 70 }); }
await b.close();
