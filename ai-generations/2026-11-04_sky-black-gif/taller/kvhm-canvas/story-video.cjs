// Story en video de 5 slides por mensaje (estructura de Daniela, 2026-11-04), 1080x1920, 30 fps, ~15,7 s:
//  1 intro (foto con acercamiento + logo BLACK) · 2 precios (story estático) · 3 brandlift (tarjeta blanca)
//  4 «Completa tu viaje» sobre el video del avión · 5 tapa de cierre con su música.
// Música del kit bajo los slides 1-4 con fundido al terminar el 4; la tapa conserva su propio audio.
const fs = require('fs');
const { execFileSync } = require('child_process');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const { cubrir, velo, DEST } = require(__dirname + '/destinos.cjs');
const K = __dirname, T = K + '/story-tmp/', OUT = require('path').resolve(__dirname, '../../story-video') + '/';
const D = '/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Sky - Efeonce - General/SKY Campañas/2026/10_Noviembre/Despliegue Base/';
const ST = D + 'FORMATO STORY/', G = D + 'GRAFICOS/COMPLETA TU VIAJE GRAFICO/';
const W8 = { Regular: 400, Medium: 500, Semibold: 600, Bold: 700, Black: 800 };
const FF = Object.entries(W8).map(([n, w]) => `@font-face{font-family:"Metric-${n}";src:url("file://${K}/Metric-${n}.otf")}@font-face{font-family:"Metric";font-weight:${w};src:url("file://${K}/Metric-${n}.otf")}`).join('');
const LANG = {
  es: { ctv: 'Completa-tu-viaje_ESP.svg', tapa: 'es' },
  ar: { ctv: 'Completa-tu-viaje_AR.svg', tapa: 'es' },
  pt: { ctv: 'Completa-tu-viaje_BR.svg', tapa: ST + 'TAPAS DE CIERRE/BRASIL/19oct_cierreSKY_PT_Vertical.mov' },
  en: { ctv: 'Completa-tu-viaje_USA.svg', tapa: ST + 'TAPAS DE CIERRE/INGLES/19oct_CierreSKY_EN_Vertical.mov' }
};
// Frases del brandlift: la doméstica es la de la referencia BLACK XL; las demás, adaptación propia por confirmar.
const FRASE = {
  'es-dom': ['Viaja con la aerolínea más puntual de la región', 'A DESTINOS NACIONALES'],
  'es-inter': ['Viaja a destinos internacionales', '¡CON OFERTAS IMPERDIBLES!'],
  'ar-inter': ['Viajá a destinos internacionales', '¡CON OFERTAS IMPERDIBLES!'],
  'pt-inter': ['Viaje para destinos internacionais', 'COM OFERTAS IMPERDÍVEIS!'],
  'en-inter': ['Fly to international destinations', 'WITH UNMISSABLE DEALS!']
};
const MSG = {
  HM_CL_KV_DOM_CLUSTER: ['es', 'dom'], HM_CL_KV_INTER_CLUSTER: ['es', 'inter'], HM_CL_KV_ENCUENTRA: ['es', 'inter'],
  HM_PE_KV_DOM_REGIONES: ['es', 'dom'], HM_PE_KV_INTER_BANDERAS: ['es', 'inter'], HM_PE_KV_ENCUENTRA: ['es', 'inter'],
  HM_AR_KV_SANTIAGO: ['ar', 'inter'], HM_AR_KV_LIMA: ['ar', 'inter'], HM_UY_KV_BANDERAS: ['ar', 'inter'],
  HM_BR_KV_SANTIAGO: ['pt', 'inter'], HM_BR_KV_PERU: ['pt', 'inter'], HM_US_KV_BANDERAS: ['en', 'inter']
};
const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
async function shot(b, html, file) {
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  fs.writeFileSync(T + '_s.html', `<!doctype html><meta charset="utf-8"><style>${FF}body{margin:0;background:transparent}</style>${html}`);
  await p.goto('file://' + T + '_s.html');
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(200);
  await p.screenshot({ path: file, omitBackground: true });
  await p.close();
}
(async () => {
  fs.mkdirSync(T, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv.slice(2);
  const b = await chromium.launch();
  // Fondo de foto del story (mismo encuadre que compose.cjs) y una versión más cerrada para el brandlift.
  const src = await sharp(K + '/foto-fuente.png').flop().toBuffer();
  const foto = async (s, X0, Y0, file) => {
    const sw = Math.round(1672 * s), sh = Math.round(941 * s);
    const img = await sharp(src).resize(sw, sh, { kernel: 'lanczos3' }).removeAlpha().toBuffer();
    await sharp(img).extract({ left: Math.round(sw - X0), top: Math.round(-Y0), width: 1080, height: 1920 }).png().toFile(file);
  };
  await foto(2.04, 2198, 0, T + 'bg.png');
  await foto(2.3, 2420, -60, T + 'bg2.png'); // algo más cerrada: rostro arriba, tarjeta sobre el torso
  // Tapa vertical en español: el kit sólo trae la horizontal; se recorta su centro sobre blanco.
  ff(['-i', ST + 'TAPAS DE CIERRE/ESPAÑOL/13oct_cierreSKY_horizontal.mov', '-vf', 'crop=1080:1080:380:0,pad=1080:1920:0:420:white,fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '16', '-c:a', 'aac', '-b:a', '192k', T + 'tapa-es.mp4']);
  for (const [n, [lang, tipo]] of Object.entries(MSG)) {
    if (only.length && !only.includes(n)) continue;
    const L = LANG[lang], [frase, pill] = FRASE[`${lang}-${tipo}`];
    // Overlays: logo de story (130 %, como el estático), tarjeta del brandlift y gráfico «Completa tu viaje».
    const lb = await (async () => { const { data, info } = await sharp(K + `/parts/${n}__logo.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }; })();
    const logo = await sharp(K + `/parts/${n}__logo.png`).extract({ left: lb.x, top: lb.y, width: lb.w, height: lb.h }).resize(Math.round(lb.w * 1.3)).toBuffer();
    await sharp({ create: { width: 1080, height: 1920, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: logo, left: lb.x, top: 270 }]).png().toFile(T + 'logo.png');
    await shot(b, `<div style="position:absolute;left:110px;right:110px;top:1180px;background:#fff;border-radius:40px;padding:52px 50px 46px;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.18)">
<div style="font:700 74px/1.04 Metric;color:#671e75;letter-spacing:-.01em">${frase}</div>
<div style="display:inline-flex;align-items:center;gap:12px;margin-top:30px;background:#f1d9fb;border-radius:999px;padding:12px 26px 10px;font:700 27px/1 Metric;color:#671e75">
<svg width="30" height="26" viewBox="0 0 30 26"><path d="M2 15l4-1 4 3 6-3-8-9 4-1 11 7 5-2c2-1 3 1 1 2L9 21z" fill="#671e75"/><rect x="2" y="23" width="26" height="2" rx="1" fill="#671e75"/></svg>${pill}</div></div>`, T + 'card.png');
    const ctv = fs.readFileSync(G + L.ctv, 'utf8').replace(/^<\?xml[^>]*>/, '');
    await shot(b, `<div style="position:absolute;left:70px;width:940px;top:1080px">${ctv.replace('<svg ', '<svg style="width:940px;height:auto;display:block" ')}</div>`, T + 'ctv.png');
    const story = K + `/formatos/${n}__story.png`;
    // Piezas con foto de destino (quinta ronda, 2026-11-05): intro y brandlift usan la foto del destino con el
    // encuadre y el gradiente de la story estática (antes mostraban a la mujer del kit). El brandlift va 10 % más cerrado.
    let BG = T + 'bg.png', BG2 = T + 'bg2.png';
    if (DEST[n]) {
      const f = await cubrir(n, 1080, 1920, 'story');
      const fv = await sharp(f).composite([{ input: await velo(n, f, 1080, 1920, 'story'), left: 0, top: 0 }]).png().toBuffer();
      BG = T + `bg-${n}.png`; BG2 = T + `bg2-${n}.png`;
      await sharp(fv).toFile(BG);
      await sharp(fv).resize(1188, 2112).extract({ left: 54, top: 96, width: 1080, height: 1920 }).toFile(BG2);
    }
    const tapa = L.tapa === 'es' ? T + 'tapa-es.mp4' : L.tapa;
    const c = (i) => T + `c${i}.mp4`;
    const enc = ['-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-an'];
    // 1) Intro 2,8 s: acercamiento lento a la foto; el logo entra con fundido y leve subida.
    ff(['-loop', '1', '-t', '2.8', '-i', BG, '-loop', '1', '-t', '2.8', '-i', T + 'logo.png', '-filter_complex',
      "[0]scale=w='trunc(1080*(1+0.07*t/2.8)/2)*2':h=-2:eval=frame,crop=1080:1920[bg];[1]format=rgba,fade=in:st=0.35:d=0.6:alpha=1[lg];[bg][lg]overlay=x=0:y='max(0,40-40*(t-0.35)/0.6)'", ...enc, c(1)]);
    // 2) Precios 4,8 s: story estático con un acercamiento inverso muy suave.
    ff(['-loop', '1', '-t', '4.8', '-i', story, '-vf', "scale=w='trunc(1080*(1.05-0.05*t/4.8)/2)*2':h=-2:eval=frame,crop=1080:1920", ...enc, c(2)]);
    // 3) Brandlift 3,3 s: foto más cerrada y tarjeta que entra con fundido.
    ff(['-loop', '1', '-t', '3.3', '-i', BG2, '-loop', '1', '-t', '3.3', '-i', T + 'card.png', '-filter_complex',
      "[0]scale=w='trunc(1080*(1+0.05*t/3.3)/2)*2':h=-2:eval=frame,crop=1080:1920[bg];[1]format=rgba,fade=in:st=0.25:d=0.5:alpha=1[cd];[bg][cd]overlay=x=0:y='max(0,30-30*(t-0.25)/0.5)'", ...enc, c(3)]);
    // 4) Completa tu viaje 3,3 s sobre el video del avión.
    ff(['-t', '3.3', '-i', ST + 'VIDEO PARA STORY/STORY AVION.mp4', '-loop', '1', '-t', '3.3', '-i', T + 'ctv.png', '-filter_complex',
      "[0]fps=30,scale=1080:1920[bg];[1]format=rgba,fade=in:st=0.3:d=0.5:alpha=1[g];[bg][g]overlay=0:0", ...enc, c(4)]);
    // 5) Tapa 2,7 s con su audio.
    ff(['-i', tapa, '-t', '2.7', '-vf', 'fps=30,scale=1080:1920,format=yuv420p', '-c:v', 'libx264', '-crf', '17', '-c:a', 'aac', '-b:a', '192k', c(5)]);
    // Unión con fundidos de 0,3 s; música bajo 1-4 (fundido entre 12,4 y 13,3) y audio de la tapa desde 13,0.
    const out = OUT + n + '__story-video.mp4';
    ff(['-i', c(1), '-i', c(2), '-i', c(3), '-i', c(4), '-i', c(5), '-i', ST + 'AUDIO PARA VIDEO/SONIC BRAND-3-STORY_1.mp3', '-filter_complex',
      '[0][1]xfade=transition=fade:duration=0.3:offset=2.5[v1];[v1][2]xfade=transition=fade:duration=0.3:offset=7.0[v2];[v2][3]xfade=transition=fade:duration=0.3:offset=10.0[v3];[v3][4]xfade=transition=fade:duration=0.3:offset=13.0,format=yuv420p[v];'
      + '[5]atrim=0:13.3,volume=-3dB,afade=t=out:st=12.4:d=0.9[m];[4:a]adelay=13000|13000,volume=-1dB[t];[m][t]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.89[a]',
      '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out]);
    console.log(n, lang, tipo);
  }
  await b.close();
})();
