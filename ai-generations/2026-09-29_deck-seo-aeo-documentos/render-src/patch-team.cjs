// Bajada del equipo (operador, 2026-09-30): la receta section-cine-team no tiene slot de cuerpo.
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const fs = require('fs');
const P = `<p style="position:absolute;left:140px;top:900px;width:540px;margin:0;font-family:'Poppins',sans-serif;font-weight:300;font-size:22px;line-height:1.4;color:#e6edf3">Lo ejecutan <b style="font-weight:600;color:#ffffff">expertos multidisciplinarios</b>: copywriters, especialistas en SEO técnico, relacionistas públicos, diseñadores y creativos.</p>`;
module.exports.P = P;
if (require.main === module) (async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const f of process.argv.slice(2)) {
    const src = 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
    await pg.setContent(`<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;600&display=swap" rel="stylesheet"><style>body{margin:0}</style></head><body><div style="position:relative;width:1920px;height:1080px"><img src="${src}" style="display:block;width:1920px;height:1080px">${P}</div></body></html>`);
    await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
    await pg.screenshot({ path: f }); console.log('team', f);
  }
  await b.close();
})();
