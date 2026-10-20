// Pasa los logos de clientes de Basis (lámina 13 de su propuesta) a blanco monocromo con alfa.
// modo 'oscuro': la marca es lo oscuro/de color sobre fondo claro. modo 'claro': la marca es lo claro sobre fondo de color.
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const path = require('path');
const dir = __dirname;
const L = [['image34','rushbet','oscuro'],['image35','betplay','oscuro'],['image36','caliente','oscuro'],['image37','betfred','claro',8],['image38','betano','oscuro'],['image39','superbet','claro'],['image40','coolbet','oscuro'],['image41','bet','fondo-negro']];
(async () => {
  for (const [f, n, modo, recorte = 0] of L) {
    let img = sharp(path.join(dir, 'orig', f + '.png')).flatten({ background: '#ffffff' });
    if (recorte) { const m = await sharp(path.join(dir, 'orig', f + '.png')).metadata(); img = sharp(await img.extract({ left: recorte, top: recorte, width: m.width - 2 * recorte, height: m.height - 2 * recorte }).toBuffer()); }
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const a = Buffer.alloc(info.width * info.height);
    for (let i = 0; i < a.length; i++) {
      const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), lum = 0.2126 * r + 0.7152 * g + 0.0722 * b, sat = mx ? (mx - mn) / mx : 0;
      let v;
      if (modo === 'oscuro') v = Math.max(255 - lum, sat * 255) * 1.6 - 60;     // tinta o color sobre blanco
      else if (modo === 'claro') v = (lum - 150) * 3 * (1 - sat * 0.85);
      else v = (lum - 45) * 2.2;                                                 // todo lo que no es el fondo negro                               // blanco/dorado claro sobre fondo de color
      a[i] = Math.max(0, Math.min(255, Math.round(v)));
    }
    const white = Buffer.alloc(info.width * info.height * 4);
    for (let i = 0; i < a.length; i++) { white[i * 4] = white[i * 4 + 1] = white[i * 4 + 2] = 255; white[i * 4 + 3] = a[i]; }
    await sharp(white, { raw: { width: info.width, height: info.height, channels: 4 } }).trim({ threshold: 10 }).png().toFile(path.join(dir, `${n}-blanco.png`));
    console.log(n);
  }
})();
