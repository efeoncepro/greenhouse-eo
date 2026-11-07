const fs = require('fs');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const P = process.argv[2] + '/';
const files = process.argv.slice(3);
const TIMES = [0.001, 0.15, 0.3, 0.5, 0.8, 1.1, 1.5, 3.9];
(async () => {
  const b = await chromium.launch();
  const rows = [];
  for (const f of files) {
    const s = fs.readFileSync(P + f, 'utf8');
    const html = '<!doctype html><meta charset="utf-8"><style>body{margin:0}' + s.split('<style>')[1].split('</style>')[0] + '</style>' + s.split('</helmet>')[1].split('</x-dc>')[0];
    fs.writeFileSync(P + '_test.html', html);
    const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
    await p.goto('file://' + P + '_test.html');
    await p.waitForTimeout(500); await p.evaluate(() => document.getAnimations().forEach((a) => a.pause())); await p.waitForTimeout(200);
    for (const t of TIMES) {
      await p.evaluate((t) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t * 1000; }), t);
      await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      rows.push({ input: await sharp(await p.screenshot()).resize(270, 338).toBuffer(), left: TIMES.indexOf(t) * 270, top: files.indexOf(f) * 338 });
    }
    await p.close();
  }
  fs.unlinkSync(P + '_test.html');
  await sharp({ create: { width: 270 * TIMES.length, height: 338 * files.length, channels: 3, background: '#000' } }).composite(rows).jpeg({ quality: 82 }).toFile(__dirname + '/anim-test.jpg');
  await b.close();
})();
