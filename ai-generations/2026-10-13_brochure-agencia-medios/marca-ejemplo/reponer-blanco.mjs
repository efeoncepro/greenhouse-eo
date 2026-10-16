// Repone el contenido exacto de pantalla sobre el acabado del modelo, usando como máscara la pantalla blanca de la foto base.
// Uso: node reponer-blanco.mjs <base.png> <comp.png> <acabado.png> <salida.png>
import { createRequire } from 'node:module';
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json');
const sharp = require('sharp');
const [base, comp, fin, out] = process.argv.slice(2);
const { data, info } = await sharp(base).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const m = Buffer.alloc(info.width * info.height);
for (let p = 0, i = 0; p < m.length; p++, i += 3) { const r = data[i], g = data[i + 1], b = data[i + 2]; m[p] = Math.min(r, g, b) > 175 && Math.max(r, g, b) - Math.min(r, g, b) < 45 ? 255 : 0; }
// sólo la región grande de pantalla (no reflejos): se limita a la caja vertical de la pantalla en cada columna no hace falta; reflejo se excluye por y
const mask = await sharp(m, { raw: { width: info.width, height: info.height, channels: 1 } }).blur(0.8).png().toBuffer();
const top = await sharp(comp).removeAlpha().joinChannel(mask).png().toBuffer();
await sharp(fin).composite([{ input: top }]).toFile(out);
console.log('ok', out);
