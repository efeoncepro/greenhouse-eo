const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const P = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-17_breakr-marca/';
const OUT = process.argv[2];
async function foco(src, x0, e, out, bright=0.5) {
  const W = 720, H = 1280;
  const crop = await sharp(src).extract({ left: x0, top: 0, width: W, height: H }).toBuffer();
  const base = await sharp(crop).blur(12).modulate({ brightness: bright }).toBuffer();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="black"/><ellipse cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}" fill="white" transform="rotate(${e.rot} ${e.cx} ${e.cy})"/></svg>`;
  const mask = await sharp(Buffer.from(svg)).blur(28).extractChannel(0).raw().toBuffer();
  const withAlpha = await sharp(crop).joinChannel(mask, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();
  const comp = await sharp(base).composite([{ input: withAlpha }]).png().toBuffer();
  await sharp(comp).resize(1080, 1920, { kernel: 'lanczos3' }).png().toFile(out);
}
(async () => {
  await foco(P + 'planos/11a-ola-llega-breakr-v1.png', 100, { cx: 337, cy: 658, rx: 125, ry: 175, rot: 29 }, OUT + '/b-chica.png');
  await foco(P + 'planos/11a-ola-llega-v3.png', 100, { cx: 230, cy: 641, rx: 220, ry: 360, rot: 16 }, OUT + '/b-gigante.png');
  await foco(P + 'planos/11a-ola-llega-v6.png', 100, { cx: 270, cy: 675, rx: 140, ry: 200, rot: 10 }, OUT + '/b-justa.png');
  await foco(P + 'planos/final/01-kickoff.png', 200, { cx: 190, cy: 470, rx: 210, ry: 300, rot: 0 }, OUT + '/b-antes.png', 0.3);
  console.log('ok');
})().catch(e => { console.error(e); process.exit(1); });
