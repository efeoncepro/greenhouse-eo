import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright/index.mjs';
const dir = process.argv[2];
const ids = ['s1','s2','s3','s4','s5','s6','s7','s8','s9','s10'];
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (const id of ids) { await p.goto(`file://${dir}/f/${id}.html`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
  const boxes = await p.evaluate(() => [...document.querySelectorAll('.k-bed,.k-glass,.k-bub,.k-panel')].map(e => { const r = e.getBoundingClientRect(); return [e.className.split(' ')[0], Math.round(r.x), Math.round(r.y), Math.round(r.right), Math.round(r.bottom)] }));
  await p.screenshot({ path: `${dir}/f/${id}.png` }); console.log(id, JSON.stringify(boxes)); }
await b.close();
