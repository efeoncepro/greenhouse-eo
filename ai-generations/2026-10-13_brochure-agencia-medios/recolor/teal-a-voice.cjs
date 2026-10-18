// Recolorea al acento Voice (#f83902) los tonos teal del acento Growth que traen fijos las recetas SEO/AEO
// (decision-ai-market, decision-traffic-to-revenue, method-surround-cycle). Mismo criterio que el brochure 360
// (regla 2026-10-15: una lámina de otra línea se recompone en el acento del tramo). Sólo toca píxeles de matiz
// teal con saturación; el navy de fondo (matiz ~210°) y el blanco quedan intactos.
// Uso: node teal-a-voice.cjs <entrada.png> <salida.png>
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const [src, out] = process.argv.slice(2);
const TARGET_H = 14 / 360; // matiz de #f83902
const rgb2hsl = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; };
const hue2 = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
const hsl2rgb = (h, s, l) => { if (s === 0) return [l, l, l].map(v => Math.round(v * 255)); const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; return [hue2(p, q, h + 1 / 3), hue2(p, q, h), hue2(p, q, h - 1 / 3)].map(v => Math.round(v * 255)); };
(async () => {
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let changed = 0;
  for (let i = 0; i < data.length; i += 3) {
    const [h, s, l] = rgb2hsl(data[i], data[i + 1], data[i + 2]);
    const deg = h * 360;
    if (deg < 150 || deg > 198 || s < 0.18 || l < 0.06) continue;
    // fuerza del cambio: completa en el centro del teal, suave en los bordes del rango
    const w = Math.min(1, Math.min(deg - 150, 198 - deg) / 8) * Math.min(1, (s - 0.18) / 0.15);
    const [r, g, b] = hsl2rgb(TARGET_H, Math.min(1, s * 1.45), l);
    data[i] = Math.round(data[i] * (1 - w) + r * w); data[i + 1] = Math.round(data[i + 1] * (1 - w) + g * w); data[i + 2] = Math.round(data[i + 2] * (1 - w) + b * w);
    changed++;
  }
  await sharp(data, { raw: info }).png().toFile(out);
  console.log(out, 'píxeles tocados', changed);
})();
