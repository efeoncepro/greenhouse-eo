// Repone el contenido EXACTO de las pantallas compuestas sobre el acabado del modelo: el modelo deja marco, luz y
// reflejos alrededor; dentro de cada pantalla manda el anuncio determinístico (el modelo reescribió el logotipo).
// Uso: node reponer-pantalla.mjs <comp.png> <acabado.png> <comp.json> <salida.png>
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json');
const sharp = require('sharp');
const [comp, fin, meta, out] = process.argv.slice(2);
const { width: W, height: H } = await sharp(comp).metadata();
const quads = JSON.parse(fs.readFileSync(meta, 'utf8')).map(m => m.quad);
const svg = `<svg width="${W}" height="${H}"><rect width="100%" height="100%" fill="#000"/>${quads.map(q => `<polygon points="${q.map(p => p.join(',')).join(' ')}" fill="#fff"/>`).join('')}</svg>`;
const mask = await sharp(Buffer.from(svg)).blur(0.7).extractChannel(0).toBuffer();
const top = await sharp(comp).removeAlpha().joinChannel(mask).png().toBuffer();
await sharp(fin).composite([{ input: top }]).toFile(out);
console.log('ok', out);
