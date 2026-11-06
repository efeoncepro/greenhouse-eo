// Mide la caja visible (alfa) de cada hoja de los HPH genéricos para ubicar logo, puntualidad y lista.
const fs = require('fs');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const H = '/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/556be26d-0508-40ae-90b2-998711ee8289/scratchpad/kvhm-canvas/src2/FORMATO HPH/';
const SEL = 'svg path, svg rect, svg text, svg image, svg use, svg polygon, svg circle, svg ellipse, svg line, svg polyline';
(async () => {
  const b = await chromium.launch();
  const out = {};
  for (const f of fs.readdirSync(H).filter((x) => x.endsWith('.svg'))) {
    const svg = fs.readFileSync(H + f, 'utf8').replace(/^<\?xml[^>]*>/, '');
    const [, w, h] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(`<style>body{margin:0;background:transparent}svg{display:block;width:${w}px;height:${h}px}</style>` + svg);
    const n = await p.evaluate((SEL) => { const l = [...document.querySelectorAll(SEL)].filter((e) => !e.closest('defs, clipPath, mask, symbol, pattern')); l.forEach((e, i) => { e.dataset.leaf = i; }); return l.length; }, SEL);
    const rows = [];
    for (let i = 0; i < n; i++) {
      const meta = await p.evaluate(([SEL, i]) => { const all = [...document.querySelectorAll('[data-leaf]')]; all.forEach((e) => { e.style.visibility = e.dataset.leaf == i ? 'visible' : 'hidden'; }); const e = all[i]; const g = e.closest('[id]'); return { tag: e.tagName, id: (e.id || (g && g.id) || '').slice(0, 40), txt: (e.textContent || '').slice(0, 30) }; }, [SEL, i]);
      const buf = await p.screenshot({ omitBackground: true });
      const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      rows.push({ i, ...meta, box: x1 < 0 ? null : [x0, y0, x1 + 1, y1 + 1] });
    }
    out[f] = rows;
    console.log('==', f, n);
    for (const r of rows) if (r.box && r.tag === 'image' || r.tag === 'use') console.log(r.i, r.tag, r.id, JSON.stringify(r.box));
    await p.close();
  }
  fs.writeFileSync('probe.json', JSON.stringify(out));
  await b.close();
})();
