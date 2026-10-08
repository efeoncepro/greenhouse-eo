import { chromium } from 'playwright'; import fs from 'fs';
const dir = process.argv[2]; const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.dc.html')).sort()) {
  let html = fs.readFileSync(`${dir}/${f}`, 'utf8').replace('<script src="./support.js"></script>', '').replace(/<helmet>|<\/helmet>/g, '').replace(/\/_blob\/[0-9a-f]+/g, 'data:image/gif;base64,R0lGODlhAQABAAAAACw=');
  fs.writeFileSync(`${dir}/../_t.html`, html); await p.goto(`file://${dir}/../_t.html`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    const root = document.querySelector('x-dc > div'); const kids = [...root.children].filter(e => e.tagName === 'DIV' || e.tagName === 'IMG');
    const bx = kids.map(e => { const r = e.getBoundingClientRect(); return { t: (e.innerText || e.alt || '').slice(0, 30).replace(/\n/g, ' '), x1: r.left, y1: r.top, x2: r.right, y2: r.bottom }; });
    const out = [];
    for (const a of bx) if (a.y2 > 1062 || a.x2 > 1900) out.push(`OUT ${Math.round(a.x2)}x${Math.round(a.y2)} «${a.t}»`);
    for (let i = 0; i < bx.length; i++) for (let j = i + 1; j < bx.length; j++) { const a = bx[i], c = bx[j];
      const ox = Math.min(a.x2, c.x2) - Math.max(a.x1, c.x1), oy = Math.min(a.y2, c.y2) - Math.max(a.y1, c.y1);
      if (ox > 4 && oy > 4) out.push(`OVERLAP ${Math.round(oy)}px «${a.t}» × «${c.t}»`); }
    return out; });
  if (r.length) console.log(f, '\n  ' + r.join('\n  '));
}
await b.close();
