// Captura evidencia pública de intermedica.pe (04/11/2026). Uso: node capturar-sitio.cjs <carpeta>
const path = require('path');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
(async () => {
  const out = path.resolve(process.argv[2]);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const shots = [['home', 'https://www.intermedica.pe/'], ['equipos', 'https://www.intermedica.pe/equipos/'], ['ficha', 'https://www.intermedica.pe/equipos/empower-rf/'], ['contacto', 'https://www.intermedica.pe/contacto/'], ['academy-404', 'https://www.intermedica.pe/?page_id=70']];
  for (const [n, u] of shots) {
    try { await p.goto(u, { waitUntil: 'networkidle', timeout: 45000 }); } catch (e) { console.log('timeout', n); }
    await p.waitForTimeout(1500);
    await p.screenshot({ path: path.join(out, n + '.png') });
    console.log(n);
  }
  // Tarjetas de asesores en Contacto
  try {
    await p.goto('https://www.intermedica.pe/contacto/', { waitUntil: 'networkidle', timeout: 45000 });
    const el = await p.$('a[href*="999999999"]');
    if (el) { await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(800); await p.screenshot({ path: path.join(out, 'contacto-asesores.png') }); console.log('contacto-asesores'); }
  } catch (e) { console.log('asesores', e.message); }
  await b.close();
})();
