// Artes planos exactos para las maquetas de íconos (2026-09-26). Salen del paquete publicado
// @efeoncepro/axis-graphic-line/icons (resolveIcon, skewedOrbitHeroSvg) y los logos oficiales de axis-brand-assets.
// Sin leyendas de lámina: el modelo imprime lo que ve. node arte.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { chromium } = require('playwright-core')
const AX = '/Users/jreye/Documents/axis-design-system'
const { iconSvg, skewedOrbitHeroSvg } = await import(`${AX}/packages/graphic-line/dist/icons.js`)
const F = `${AX}/apps/lab/public/fonts`
const NEG = readFileSync(`${AX}/packages/brand-assets/assets/efeonce-logo-negative.svg`, 'utf8')
const OUT = new URL('./arte/', import.meta.url).pathname
const b64 = (f) => readFileSync(`${F}/${f}`).toString('base64')
const css = `@font-face{font-family:B;src:url(data:font/ttf;base64,${b64('BricolageGrotesque-Variable.ttf')});font-weight:200 800}
@font-face{font-family:P;src:url(data:font/ttf;base64,${b64('Poppins-300.ttf')});font-weight:300}
@font-face{font-family:P;src:url(data:font/ttf;base64,${b64('Poppins-400.ttf')});font-weight:400}
*{margin:0;box-sizing:border-box} body{font-family:P}`
const GROUND = '#001a33', OR = '#ff6500', TEAL = '#36c8bf'
const voice = (q, a, acc, qs, as, gap) => `<div style="font:300 ${qs}px/1.35 P;color:#e2e2e2"><span style="display:inline-block;width:.42em;height:.42em;border:max(1px,.06em) solid ${acc};border-radius:50%;margin-right:.35em;vertical-align:.08em"></span>${q}</div>
<div style="font:760 ${as}px/1.02 B;letter-spacing:-.035em;color:#fff;white-space:nowrap">${a}<span style="display:inline-block;width:.2em;height:.2em;border-radius:50%;background:${acc};margin-left:${gap}em"></span></div>`
const logo = (w) => NEG.replace('<svg', `<svg style="width:${w}px;height:auto;display:block"`)
const arts = {
  // 1 · Muro del área Growth: el ícono de Trazo responde (es la señal), el nombre sin esfera.
  area: [1536, 1024, `<div style="width:1536px;height:1024px;background:${GROUND};display:flex;align-items:center;gap:90px;padding:0 150px">
    ${iconSvg({ glyph: 'medicion', state: 'response', size: 64, line: 'growth' }).replace('width="64" height="64"', 'width="520" height="520"')}
    <div><div style="font:760 210px/1 B;letter-spacing:-.04em;color:#fff">Growth</div>
    <div style="font:300 44px/1.4 P;color:#cfd8e3;margin-top:24px">Estrategia de crecimiento<br>y medición</div></div></div>`],
  // 2 · Informe impreso abierto: apertura navy (el ícono es la página y responde) + contenido en papel (reposo).
  informe: [1588, 1123, `<div style="width:1588px;height:1123px;display:flex">
    <div style="width:794px;height:1123px;background:${GROUND};padding:68px;position:relative;color:#fff">
      <div style="font:400 15px P;letter-spacing:.14em;text-transform:uppercase;color:#9fb3c8">Capítulo 2</div>
      <div style="position:absolute;left:68px;top:300px">${iconSvg({ glyph: 'informe', state: 'response', size: 64, line: 'growth' }).replace('width="64" height="64"', 'width="280" height="280"')}</div>
      <div style="position:absolute;left:68px;top:700px;font:700 66px/1.02 B;letter-spacing:-.03em">Resultados<br>del mes</div></div>
    <div style="width:794px;height:1123px;background:#f7f8f6;padding:68px;position:relative;color:#023c70">
      <div style="font:300 22px/1.35 P;color:#3d4f63"><span style="display:inline-block;width:.42em;height:.42em;border:1.5px solid #0e8c82;border-radius:50%;margin-right:.35em"></span>¿Cómo cerró septiembre?</div>
      <div style="font:760 64px/1.02 B;letter-spacing:-.035em">Creciendo<span style="display:inline-block;width:.2em;height:.2em;border-radius:50%;background:#0e8c82;margin-left:.035em"></span></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:56px">
        ${[['medicion', '+18 %', 'sesiones'], ['embudo', '3,4 %', 'conversión'], ['web', '1,2 s', 'carga móvil']].map(([g, v, l]) => `<div style="background:#fff;border:1px solid #dce2e8;border-radius:12px;padding:22px">${iconSvg({ glyph: g, size: 28, surface: 'light', line: 'growth' })}<div style="font:700 40px B;margin-top:12px">${v}</div><div style="font:400 15px P;color:#3d4f63">${l}</div></div>`).join('')}
      </div>
      <div style="margin-top:60px">${[['automatizacion', 'Conectar el formulario con el CRM'], ['contenido', 'Publicar la guía de octubre'], ['busqueda', 'Revisar las páginas que bajaron']].map(([g, t]) => `<div style="display:flex;align-items:center;gap:16px;padding:18px 0;border-bottom:1px solid #dce2e8;font:400 19px P">${iconSvg({ glyph: g, size: 24, surface: 'light', line: 'growth' })}${t}</div>`).join('')}</div>
    </div></div>`],
  // 3 · Hoja de stickers troquelados (E8): cada sticker es su propia pieza y responde, con gesto si lo tiene.
  stickers: [1536, 1024, `<div style="width:1536px;height:1024px;background:#ffffff;position:relative">
    ${[['camara', 150, 110, -8], ['bombillo', 560, 70, 6], ['pincel', 980, 130, -4], ['megafono', 330, 520, 5], ['corazon', 760, 540, -7], ['cursor', 1160, 520, 8]].map(([g, x, y, r]) => `<div style="position:absolute;left:${x}px;top:${y}px;width:340px;height:340px;border-radius:50%;background:#fff;box-shadow:0 0 0 0 #fff;transform:rotate(${r}deg)"><div style="position:absolute;inset:14px;border-radius:50%;background:${GROUND};display:flex;align-items:center;justify-content:center">${iconSvg({ glyph: g, state: 'response', size: 230, line: 'brand', gesture: ['bombillo'].includes(g) })}</div></div>`).join('')}</div>`],
  // 4 · Pantalla de escenario 16:9: Plastilina protagonista en su órbita sesgada + la voz + la firma.
  escenario: [1920, 1080, `<div style="width:1920px;height:1080px;background:${GROUND};position:relative">
    <div style="position:absolute;left:0;top:0">${skewedOrbitHeroSvg({ glyph: 'bombillo', line: 'brand', width: 1920, height: 1080, object: { x: 1200, y: 110, size: 600 }, gesture: true })}</div>
    <div style="position:absolute;left:150px;top:560px">${voice('¿Dónde empieza<br>una campaña?', 'Idea', OR, 46, 190, 0.03)}</div>
    <div style="position:absolute;left:150px;top:120px">${logo(230)}</div></div>`],
  // 5 · Story 9:16 (E6): pincel en su órbita, la voz y la firma centrada.
  story: [1080, 1920, `<div style="width:1080px;height:1920px;background:${GROUND};position:relative">
    <div style="position:absolute;left:0;top:0">${skewedOrbitHeroSvg({ glyph: 'pincel', line: 'brand', width: 1080, height: 1920, object: { x: 220, y: 330, size: 640 } })}</div>
    <div style="position:absolute;left:96px;top:1270px">${voice('¿Qué hacemos con la idea?', 'Crear', OR, 42, 160, -0.02)}</div>
    <div style="position:absolute;left:432px;top:1640px">${logo(216)}</div></div>`],
  // 6 · Estampa de la tote: la cámara responde (única pieza), sin texto.
  tote: [1024, 1024, `<div style="width:1024px;height:1024px;background:${GROUND};display:flex;align-items:center;justify-content:center">${iconSvg({ glyph: 'camara', state: 'response', size: 760, line: 'brand' })}</div>`]
}
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
for (const [name, [w, h, body]] of Object.entries(arts)) {
  await page.setViewportSize({ width: w, height: h })
  await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body>${body}</body></html>`, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `${OUT}${name}.png`, clip: { x: 0, y: 0, width: w, height: h } })
  console.log('arte', name)
}
await browser.close()
