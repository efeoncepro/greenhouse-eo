const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const fs = require('fs'); const P = __dirname + '/png/';
(async () => {
  const fl = fs.readdirSync(P).filter((x) => x.endsWith('.png')).sort();
  const w = 360, h = 450, cols = 5;
  const comp = await Promise.all(fl.map(async (f, i) => ({ input: await sharp(P + f).resize(w, h).toBuffer(), left: (i % cols) * w, top: Math.floor(i / cols) * h })));
  await sharp({ create: { width: w * cols, height: h * Math.ceil(fl.length / cols), channels: 3, background: '#888' } }).composite(comp).jpeg({ quality: 85 }).toFile(__dirname + '/sheet.jpg');
  console.log(fl.join(' | '));
})();
