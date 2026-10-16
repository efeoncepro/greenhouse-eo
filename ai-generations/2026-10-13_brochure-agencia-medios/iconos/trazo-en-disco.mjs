// Íconos Trazo oficiales de AXIS (resolveIcon, en reposo, línea Voice) dentro de un disco de vidrio oscuro, como PNG
// para las estaciones de method-surround-cycle (que recibe una imagen por estación). Reemplaza el clay 3D del deck AEO.
import sharp from 'sharp';
import { resolveIcon } from '@efeoncepro/axis-graphic-line/icons';
const out = process.argv[2];
const items = [['publicar', 'contenido'], ['leer', 'medicion'], ['pautar', 'medios'], ['aprender', 'republicar']];
for (const [name, glyph] of items) {
  const svg = resolveIcon({ glyph, size: 120, line: 'voice', surface: 'dark', state: 'rest', idPrefix: `pc-${glyph}` }).svg;
  const icon = await sharp(Buffer.from(svg), { density: 300 }).resize(120, 120).png().toBuffer();
  const disc = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><defs><radialGradient id="g" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#1d4a73"/><stop offset="1" stop-color="#06213d"/></radialGradient></defs><circle cx="128" cy="128" r="118" fill="url(#g)" stroke="#ffffff" stroke-opacity="0.35" stroke-width="3"/></svg>`);
  await sharp(disc).composite([{ input: icon, left: 68, top: 68 }]).png().toFile(`${out}/${name}.png`);
  console.log(name);
}
