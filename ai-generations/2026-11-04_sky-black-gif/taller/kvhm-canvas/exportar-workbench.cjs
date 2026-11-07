// Exporta, para el Creative Workbench, las capas aprobadas de cada KV BLACK SIN los textos con cifras de relleno
// (precio, descuento, [ORIGEN], corchetes del legal) y la ficha tipográfica de cada uno de esos textos («slots»).
// El Workbench recompone las piezas desde estas capas y dibuja las cifras reales con fontkit.
// Mismo reparto en capas que parts.cjs (regiones, patches, fix del rect). Uso: node exportar-workbench.cjs <salida> [HM_….svg ...]
const fs = require('fs');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const SP = __dirname, D = SP + '/src2/KV X HM/';
const OUT = require('path').resolve(process.argv[2]);
const PATCH = require(SP + '/patches.cjs');
const W = { Regular: 400, Medium: 500, Semibold: 600, Bold: 700, Black: 800 };
const ff = Object.entries(W).map(([n, w]) => `@font-face{font-family:"Metric-${n}";src:url("file://${SP}/Metric-${n}.otf")}@font-face{font-family:"Metric";font-weight:${w};src:url("file://${SP}/Metric-${n}.otf")}`).join('');
// Regiones: copia literal de parts.cjs.
const src = fs.readFileSync(SP + '/parts.cjs', 'utf8');
const regBlock = src.slice(src.indexOf('const BADGE'), src.indexOf('(async () =>'));
const REG = new Function('fs', 'SP', regBlock + '; return REG;')(fs, SP);
// Un texto es slot si contiene un marcador de relleno: grupos de sólo ceros (000, 0.000, 0,000), 00% o [corchetes].
const SLOT_RE = '(^|[^0-9])0+([.,]0+)*(?![0-9])|\\[[^\\]]+\\]';
(async () => {
  fs.mkdirSync(OUT + '/capas', { recursive: true });
  const b = await chromium.launch();
  const files = process.argv[3] ? process.argv.slice(3) : fs.readdirSync(D).filter((x) => /^HM_.*\.svg$/.test(x)).sort();
  const fichas = {};
  for (const f of files) {
    let svg = fs.readFileSync(D + f, 'utf8').replace(/^<\?xml[^>]*>/, '').replace('<svg ', '<svg width="1080" height="1350" ')
      .replace('<rect x="537.61" y="879.81" width="381.35" height="339.95" fill="#671e75"/>', '<rect x="536.61" y="879.81" width="383.35" height="339.95" fill="#671e75"/>');
    for (const [a, z] of PATCH[f] || []) { if (!svg.includes(a)) throw new Error(f + ' sin ' + a); svg = svg.replace(a, z); }
    fs.writeFileSync(SP + '/tmp-x.html', `<!doctype html><meta charset="utf-8"><style>${ff}body{margin:0;background:transparent}svg{display:block}</style>${svg}`);
    const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
    await p.goto('file://' + SP + '/tmp-x.html');
    await p.evaluate(() => document.fonts.ready);
    const reg = REG[f] || REG.default;
    // Medida de imágenes grandes (igual que parts.cjs): su caja real, no la del elemento.
    const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
    const big = await p.evaluate(() => [...document.querySelectorAll('svg image, svg use')].filter((e) => !e.closest('defs, clipPath, mask, symbol, pattern'))
      .map((e, i) => { e.dataset.big = i; const r = e.getBoundingClientRect(); return { i, w: r.width, h: r.height }; }).filter((x) => x.w > 700 || x.h > 700).map((x) => x.i));
    const measured = {};
    for (const i of big) {
      await p.evaluate((i) => { [...document.querySelectorAll('svg path, svg rect, svg text, svg image, svg use, svg polygon, svg circle, svg ellipse, svg line, svg polyline')].filter((e) => !e.closest('defs, clipPath, mask, symbol, pattern')).forEach((e) => { e.style.visibility = e.dataset.big == i ? 'visible' : 'hidden'; }); }, i);
      const buf = await p.screenshot({ omitBackground: true });
      const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      measured[i] = x1 < 0 ? [0, 0, 0, 0] : [x0, y0, x1 + 1, y1 + 1];
    }
    await p.evaluate(() => document.querySelectorAll('svg *').forEach((e) => { if (e.style) e.style.visibility = ''; }));
    const res = await p.evaluate(([reg, measured, SLOT_RE]) => {
      const re = new RegExp(SLOT_RE);
      const leaves = [...document.querySelectorAll('svg path, svg rect, svg text, svg image, svg use, svg polygon, svg circle, svg ellipse, svg line, svg polyline')]
        .filter((e) => !e.closest('defs, clipPath, mask, symbol, pattern, text') || e.tagName === 'text' && !e.parentElement.closest('text'))
        .filter((e) => !e.closest('defs, clipPath, mask, symbol, pattern'));
      const out = {}, slots = [];
      leaves.forEach((e, i) => {
        let r = e.getBoundingClientRect();
        if (e.dataset.big !== undefined && measured[e.dataset.big]) { const [l, t, rr, bb] = measured[e.dataset.big]; r = { left: l, top: t, right: rr, bottom: bb, width: rr - l, height: bb - t }; }
        e.dataset.leaf = i;
        let layer = 'base';
        const forzada = e.closest('[data-capa]'), capa = forzada && forzada.getAttribute('data-capa'); if (capa && (reg[capa] || capa === 'base')) layer = capa; else
        if (r.width > 0 || r.height > 0) for (const [k, [x0, y0, x1, y1]] of Object.entries(reg)) {
          if (r.left >= x0 && r.top >= y0 && r.right <= x1 && r.bottom <= y1) { layer = k; break; }
        }
        e.dataset.layer = layer;
        const o = (out[layer] = out[layer] || { n: 0 }); o.n++;
        if (e.tagName === 'text' && re.test(e.textContent)) {
          e.dataset.slot = slots.length;
          const m = e.getCTM(), cs = getComputedStyle(e);
          const runEls = e.querySelectorAll('tspan').length ? [...e.querySelectorAll('tspan')] : [e];
          const runs = runEls.map((t) => {
            const s = getComputedStyle(t);
            const num = (a) => (t.getAttribute(a) != null ? parseFloat(t.getAttribute(a)) : null);
            return { text: t.textContent, x: num('x'), y: num('y'), family: s.fontFamily, weight: +s.fontWeight, size: parseFloat(s.fontSize), letterSpacing: s.letterSpacing === 'normal' ? 0 : parseFloat(s.letterSpacing), fill: s.fill, fillOpacity: +s.fillOpacity };
          });
          if (runEls[0] === e) { runs[0].x = parseFloat(e.getAttribute('x') || 0); runs[0].y = parseFloat(e.getAttribute('y') || 0); }
          const bb = e.getBoundingClientRect();
          slots.push({ index: slots.length, layer, placeholder: e.textContent, matrix: [m.a, m.b, m.c, m.d, m.e, m.f], anchor: cs.textAnchor, runs, box: [bb.left, bb.top, bb.right, bb.bottom].map((v) => Math.round(v * 100) / 100) });
        }
      });
      return { layers: out, slots };
    }, [reg, measured, SLOT_RE]);
    const name = f.replace('.svg', '');
    for (const layer of Object.keys(res.layers)) {
      await p.evaluate((layer) => document.querySelectorAll('[data-leaf]').forEach((e) => { e.style.visibility = e.dataset.layer === layer && e.dataset.slot === undefined ? 'visible' : 'hidden'; }), layer);
      await p.waitForTimeout(150);
      await p.screenshot({ path: `${OUT}/capas/${name}__${layer}.png`, omitBackground: layer !== 'base' });
    }
    fichas[name] = { layers: Object.keys(res.layers).sort(), slots: res.slots };
    await p.close();
    console.log(name, Object.keys(res.layers).join(','), 'slots:', res.slots.map((s) => JSON.stringify(s.placeholder)).join(' '));
  }
  fs.writeFileSync(OUT + '/slots.json', JSON.stringify(fichas, null, 1));
  await b.close();
})();
