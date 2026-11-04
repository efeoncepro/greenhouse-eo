// Captura cada HTML de una carpeta a PNG 1920x1080. Uso: node shot-all.cjs <carpeta-html> <carpeta-png>
const fs = require('fs'), path = require('path');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
(async () => {
  const [src, out] = process.argv.slice(2).map(p => path.resolve(p));
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const f of fs.readdirSync(src).filter(f => f.endsWith('.html')).sort()) {
    await p.goto('file://' + path.join(src, f)); await p.waitForLoadState('networkidle');
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(out, f.replace('.html', '.png')) }); console.log(f);
  }
  await b.close();
})();
