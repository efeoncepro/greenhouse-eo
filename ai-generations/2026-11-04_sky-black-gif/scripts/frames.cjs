// Renderiza un artboard animado cuadro a cuadro (fps fijo) para armar MP4/GIF.
const fs = require('fs');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const [P, file, outDir, fps = '30'] = process.argv.slice(2);
const T = 3.968, N = Math.round(T * Number(fps));
(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const s = fs.readFileSync(P + '/' + file, 'utf8');
  const html = '<!doctype html><meta charset="utf-8"><style>body{margin:0}' + s.split('<style>')[1].split('</style>')[0] + '</style>' + s.split('</helmet>')[1].split('</x-dc>')[0];
  fs.writeFileSync(P + '/_frames-' + file + '.html', html);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await p.goto('file://' + P + '/_frames-' + file + '.html');
  await p.waitForTimeout(600);
  await p.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0; }));
  await p.waitForTimeout(300);
  await p.screenshot();
  // El compositor entrega la captura con 2 cuadros de retraso: se capturan N+2 y se descartan los 2 primeros.
  const LAG = 2;
  for (let j = 0; j < N + LAG; j++) {
    const i = j - LAG;
    const t = Math.min(Math.max(j / Number(fps), 0.0005), T - 0.001);
    await p.evaluate((t) => document.getAnimations().forEach((a) => { a.currentTime = t * 1000; }), t);
    await p.waitForTimeout(40);
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const shot = await p.screenshot();
    if (i >= 0) fs.writeFileSync(`${outDir}/f${String(i).padStart(4, '0')}.png`, shot);
  }
  await b.close();
  fs.unlinkSync(P + '/_frames-' + file + '.html');
  console.log(N, 'cuadros');
})();
