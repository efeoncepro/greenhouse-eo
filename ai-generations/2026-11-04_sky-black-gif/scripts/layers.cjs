// Separa cada KV en capa base + capas animables (PNG transparentes 1080x1350).
const fs = require('fs');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const SP = __dirname;
const D = '/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/556be26d-0508-40ae-90b2-998711ee8289/scratchpad/kvhm-canvas/src2/KV X HM/';
const PATCH = require(SP + '/patches.cjs');
const W = { Regular: 400, Medium: 500, Semibold: 600, Bold: 700, Black: 800 };
const ff = Object.entries(W).map(([n, w]) => `@font-face{font-family:"Metric-${n}";src:url("file://${SP}/Metric-${n}.otf")}@font-face{font-family:"Metric";font-weight:${w};src:url("file://${SP}/Metric-${n}.otf")}`).join('');
// Regiones por capa: [x0,y0,x1,y1]; un elemento entra si su caja cabe completa. Orden = prioridad.
const BADGE = { badge: [785, 755, 1020, 995] };
const PRECIO = { precio: [400, 870, 1055, 1230] };
const DESTINO = { destino: [40, 920, 530, 1180] };
const REG = {
  default: { ...BADGE, ...PRECIO, ...DESTINO },
  'HM_CL_KV_DOM_CLUSTER.svg': { ...BADGE, ...PRECIO, lista: [40, 290, 560, 870], ...DESTINO },
  'HM_CL_KV_INTER_CLUSTER.svg': { ...BADGE, ...PRECIO, lista: [40, 340, 560, 1080] }
};
// Variantes 2026-11-04: la lista bajo el logo también entra animada desde abajo.
REG['HM_CL_KV_ENCUENTRA.svg'] = REG['HM_CL_KV_INTER_CLUSTER.svg'];
for (const n of ['HM_AR_KV_BANDERAS', 'HM_PE_KV_INTER_BANDERAS', 'HM_BR_KV_BANDERAS', 'HM_US_KV_BANDERAS', 'HM_PE_KV_ENCUENTRA', 'HM_PE_KV_DOM_REGIONES'])
  REG[n + '.svg'] = { ...BADGE, ...PRECIO, lista: [40, 320, 720, 890], ...DESTINO };
(async () => {
  const b = await chromium.launch();
  const files = process.argv[2] ? process.argv.slice(2) : fs.readdirSync(D).filter((x) => /^HM_.*\.svg$/.test(x));
  const report = {};
  for (const f of files) {
    let svg = fs.readFileSync(D + f, 'utf8').replace(/^<\?xml[^>]*>/, '').replace('<svg ', '<svg width="1080" height="1350" ')
      .replace('<rect x="537.61" y="879.81" width="381.35" height="339.95" fill="#671e75"/>', '<rect x="536.61" y="879.81" width="383.35" height="339.95" fill="#671e75"/>');
    for (const [a, z] of PATCH[f] || []) { if (!svg.includes(a)) throw new Error(f + ' sin ' + a); svg = svg.replace(a, z); }
    fs.writeFileSync(SP + '/tmp-l.html', `<!doctype html><meta charset="utf-8"><style>${ff}body{margin:0;background:transparent}svg{display:block}</style>${svg}`);
    const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
    await p.goto('file://' + SP + '/tmp-l.html');
    await p.evaluate(() => document.fonts.ready);
    const reg = REG[f] || REG.default;
    const big = await p.evaluate(() => {
      const leaves = [...document.querySelectorAll('svg image, svg use')].filter((e) => !e.closest('defs, clipPath, mask, symbol, pattern'));
      return leaves.map((e, i) => { e.dataset.big = i; const r = e.getBoundingClientRect(); return { i, w: r.width, h: r.height }; }).filter((x) => x.w > 700 || x.h > 700).map((x) => x.i);
    });
    const measured = {};
    for (const i of big) {
      await p.evaluate((i) => { [...document.querySelectorAll('svg path, svg rect, svg text, svg image, svg use, svg polygon, svg circle, svg ellipse, svg line, svg polyline')].filter((e) => !e.closest('defs, clipPath, mask, symbol, pattern')).forEach((e) => { e.style.visibility = e.dataset.big == i ? 'visible' : 'hidden'; }); }, i);
      const buf = await p.screenshot({ omitBackground: true });
      const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      measured[i] = x1 < 0 ? [0, 0, 0, 0] : [x0, y0, x1 + 1, y1 + 1];
    }
    console.log("medidas", JSON.stringify(measured));
    await p.evaluate(() => document.querySelectorAll('svg *').forEach((e) => { if (e.style) e.style.visibility = ''; }));
    const info = await p.evaluate(([reg, measured]) => {
      const leaves = [...document.querySelectorAll('svg path, svg rect, svg text, svg image, svg use, svg polygon, svg circle, svg ellipse, svg line, svg polyline')]
        .filter((e) => !e.closest('defs, clipPath, mask, symbol, pattern, text') || e.tagName === 'text' && !e.parentElement.closest('text'))
        .filter((e) => !e.closest('defs, clipPath, mask, symbol, pattern'));
      const out = {};
      leaves.forEach((e, i) => {
        let r = e.getBoundingClientRect();
        if (e.dataset.big !== undefined && measured[e.dataset.big]) { const [l, t, rr, bb] = measured[e.dataset.big]; r = { left: l, top: t, right: rr, bottom: bb, width: rr - l, height: bb - t }; }
        e.dataset.leaf = i;
        let layer = 'base';
        // Capa forzada (2026-11-05): PromPerú, el pin y la ubicación de las rutas van juntos aunque la ubicación
        // larga entre en la caja del logo.
        const forzada = e.closest('[data-capa]'), capa = forzada && forzada.getAttribute('data-capa'); if (capa && (reg[capa] || capa === 'base')) layer = capa; else
        if (r.width > 0 && r.height > 0) for (const [k, [x0, y0, x1, y1]] of Object.entries(reg)) {
          if (r.left >= x0 && r.top >= y0 && r.right <= x1 && r.bottom <= y1) { layer = k; break; }
        }
        e.dataset.layer = layer;
        const o = (out[layer] = out[layer] || { n: 0, box: [1e9, 1e9, -1e9, -1e9] });
        o.n++;
        if (r.width > 0) o.box = [Math.min(o.box[0], r.left), Math.min(o.box[1], r.top), Math.max(o.box[2], r.right), Math.max(o.box[3], r.bottom)].map(Math.round);
      });
      return out;
    }, [reg, measured]);
    report[f] = info;
    const name = f.replace('.svg', '');
    for (const layer of Object.keys(info)) {
      await p.evaluate((layer) => document.querySelectorAll('[data-leaf]').forEach((e) => { e.style.visibility = e.dataset.layer === layer ? 'visible' : 'hidden'; }), layer);
      await p.waitForTimeout(150);
      await p.screenshot({ path: `${SP}/layers/${name}__${layer}.png`, omitBackground: layer !== 'base' });
    }
    await p.close();
    console.log(f, JSON.stringify(info));
  }
  fs.writeFileSync(SP + '/layers/report.json', JSON.stringify(report, null, 1));
  await b.close();
})();
