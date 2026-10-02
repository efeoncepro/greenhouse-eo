import { readFileSync, writeFileSync } from 'node:fs'
// nodos medidos en el plate MK2 (1536×1024) → lámina 1920×1080 (cover: ×1.25, −100 px arriba)
const N = [
  ['EE. UU.', 'Miami', 1112, 215, 'right'],
  ['México', 'Ciudad de México', 958, 283, 'left'],
  ['Colombia', 'Bogotá', 1132, 405, 'right'],
  ['Perú', 'Lima', 1098, 567, 'left'],
  ['Chile', 'Santiago', 1181, 773, 'right']
].map(([c, city, x, y, side]) => ({ c, city, x: Math.round(x * 1.25), y: Math.round(y * 1.25 - 100), side }))
const label = n => {
  const pos = n.side === 'right' ? `left: ${n.x + 22}px` : `right: ${1920 - n.x + 22}px`
  return `<div style="position: absolute; ${pos}; top: ${n.y - 26}px; padding: 8px 14px 9px; border-radius: 14px; background: rgba(4, 16, 40, 0.72); box-shadow: 0 0 0 1px rgba(114, 222, 216, 0.55), 0 10px 24px rgba(0, 6, 16, 0.5); text-align: ${n.side === 'right' ? 'left' : 'right'}"><div style="font-weight: 600; font-size: 22px; line-height: 1.1; color: #ffffff">${n.c}</div><div style="margin-top: 2px; font-weight: 400; font-size: 14px; line-height: 1.2; color: #9fd7ff">${n.city}</div></div>`
}
const body = `<div style="width: 1920px; height: 1080px; box-sizing: border-box; position: relative; overflow: hidden; background: #020716; color: #ffffff; font-family: 'Poppins', system-ui, sans-serif">
<img src="@PLATE@" alt="Las Américas de noche vistas desde la órbita; cinco puntos de luz azul unidos por arcos en Miami, Ciudad de México, Bogotá, Lima y Santiago" style="position: absolute; left: 0; top: -100px; display: block; width: 1920px; height: 1280px">
${N.map(label).join('\n')}
<img src="@SV360@" alt="Efeonce | SV360" style="position: absolute; left: 140px; top: 44px; display: block; width: 353.9px; height: 40px">
<div style="position: absolute; left: 140px; top: 130px; font-weight: 500; font-size: 16px; letter-spacing: 0.14em; text-transform: uppercase; color: #cfe4fa">Mercados</div>
<div style="position: absolute; left: 140px; top: 196px; width: 600px; display: flex; align-items: center; gap: 16px; font-weight: 300; font-size: 40px; line-height: 1.2; color: #cfe4fa"><span style="display: inline-block; flex-shrink: 0; width: 18px; height: 18px; border: 3px solid #0375db; border-radius: 50%"></span><span>¿Dónde operamos?</span></div>
<div style="position: absolute; left: 132px; top: 280px; font-family: 'Bricolage Grotesque', system-ui, sans-serif; font-weight: 760; font-size: 128px; line-height: 0.95; letter-spacing: -0.045em; color: #ffffff">Cinco<br>países<span style="display: inline-block; width: 0.2em; height: 0.2em; margin-left: 0.04em; border-radius: 50%; background: #0375db"></span></div>
<p style="position: absolute; left: 140px; top: 560px; width: 520px; margin: 0; font-weight: 300; font-size: 26px; line-height: 1.45; color: #e6edf3">Chile, Estados Unidos, Colombia, México y Perú, con <b style="font-weight: 600; color: #ffffff">un solo equipo</b> y un solo interlocutor.</p>
<img src="@URL@" alt="efeoncepro.com" style="position: absolute; left: 140px; bottom: 62px; display: block; width: 160px; height: 31.5px">
</div>`
const A = '/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets'
const PLATE = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-29_deck-seo-aeo-documentos/plates/MK2-mercados.png'
const HEAD = '<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet"><style>body{margin:0;background:#020716}</style></head><body>'
writeFileSync(new URL('../Mercados.html', import.meta.url), HEAD + body.replace('@PLATE@', 'file://' + PLATE).replace('@SV360@', `file://${A}/sv360-lockup-negative.svg`).replace('@URL@', `file://${A}/url-bubble-baked-dark.svg`) + '</body></html>')
writeFileSync(new URL('body.html', import.meta.url), body)
