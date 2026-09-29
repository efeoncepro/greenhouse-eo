// Portadas y avatares de redes de Efeonce (2026-09-29). Canon: línea gráfica, aplicaciones A6 (portada de LinkedIn:
// promesa con esfera + mecanismo a la izquierda, órbita con halo a la derecha, un solo anillo, sin logo dentro) y A7
// (avatar: isotipo negativo sobre navy, 60 % del ancho). Órbita con orbitSvg, esfera con answerHtml, logos del kit.
// node redes.mjs → out/*.png
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright/index.mjs'

const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const sharp = require('sharp')
const { efeonceGraphicLine: GL } = require('@efeoncepro/axis-tokens')
const { answerHtml, orbitSvg } = require('@efeoncepro/axis-graphic-line')

const R = '/Users/jreye/Documents/greenhouse-eo/'
const F = R + 'src/lib/artifact-composer/brand-packs/axis/fonts/'
const A = R + 'node_modules/@efeoncepro/axis-brand-assets/assets/'
const T = R + 'ai-generations/2026-09-29_fondos-teams/out/'
const DIR = new URL('./', import.meta.url).pathname
const b64 = (f, mime) => `data:${mime};base64,${readFileSync(f).toString('base64')}`
const bufb64 = (b, mime = 'image/png') => `data:${mime};base64,${b.toString('base64')}`
const growth = GL.lines.find(l => l.key === 'growth')
const DARK = GL.color.dark
const NAVY = GL.color.navy
const PAPER = GL.color.paper

const PROMESA = 'Te hacemos visible'
const MECANISMO = 'Crecimiento medido: marca, búsqueda y medios.'

const fuentes = `
@font-face { font-family: 'Bricolage Grotesque'; font-weight: 760; src: url('${b64(F + 'bricolage-grotesque-variable.ttf', 'font/ttf')}') format('truetype'); }
@font-face { font-family: 'Poppins'; font-weight: 500; src: url('${b64(F + 'poppins-500.ttf', 'font/ttf')}') format('truetype'); }
html, body { margin: 0; } .b { font-family: 'Bricolage Grotesque'; font-weight: 760; letter-spacing: -0.02em; line-height: 1; } .p { font-family: 'Poppins'; font-weight: 500; }`

const orbita = (w, h, cx, cy, r, surface) => orbitSvg({ width: w, height: h, circle: { cx, cy, r }, line: 'growth', surface }).svg

const recorte = async (src, left, top, width, height, w, h) => bufb64(await sharp(src).extract({ left, top, width, height }).resize(w, h).jpeg({ quality: 92 }).toBuffer(), 'image/jpeg')

const texto = ({ x, y, size, surface }) => `<div style="position:absolute;left:${x}px;top:${y}px">
  <div class="b" style="font-size:${size}px;color:${surface === 'dark' ? '#fff' : NAVY}">${answerHtml(PROMESA, surface === 'dark' ? growth.accentOnDark : growth.accentOnLight)}</div>
  <div class="p" style="margin-top:${Math.round(size * 0.32)}px;font-size:${Math.round(size * 0.3)}px;color:${surface === 'dark' ? '#9fb3c8' : '#3d4f63'}">${MECANISMO}</div></div>`

const PIEZAS = {
  // LinkedIn personal A — gráfica canónica (A6)
  'linkedin-perfil-a-grafica': async () => ({ w: 1584, h: 396, bg: DARK,
    html: `${orbita(1584, 396, 1300, 198, 150, 'dark')}${texto({ x: 360, y: 118, size: 82, surface: 'dark' })}` }),
  // LinkedIn personal B — fotográfica: la jornada de captura (aro de cámaras y logo 3D)
  'linkedin-perfil-b-foto': async () => ({ w: 1584, h: 396, bg: '#000',
    html: `<img src="${await recorte(T + 'teams-captura-m-v2a.png', 0, 380, 2048, 512, 1584, 396)}" style="position:absolute;inset:0;width:1584px;height:396px">` }),
  // LinkedIn personal C — lente sobre papel: la foto de la oficina dentro de la órbita
  'linkedin-perfil-c-lente': async () => ({ w: 1584, h: 396, bg: PAPER,
    html: `<img src="${await recorte(T + 'teams-captura-m-v2a.png', 1190, 170, 620, 620, 264, 264)}" style="position:absolute;left:${1300 - 132}px;top:${198 - 132}px;width:264px;height:264px;border-radius:50%">
    ${orbita(1584, 396, 1300, 198, 150, 'light')}${texto({ x: 360, y: 118, size: 82, surface: 'light' })}` }),
  // LinkedIn página de empresa (1128×191)
  'linkedin-empresa': async () => ({ w: 1128, h: 191, bg: DARK,
    html: `${orbita(1128, 191, 985, 96, 72, 'dark')}${texto({ x: 250, y: 50, size: 46, surface: 'dark' })}` }),
  // YouTube (2560×1440): la sala «Todos los formatos»; logo y promesa en la zona segura central (1546×423)
  'youtube-banner': async () => ({ w: 2560, h: 1440, bg: DARK,
    html: `${orbita(2560, 1440, 1790, 720, 190, 'dark')}
    <div style="position:absolute;left:560px;top:545px">
      <img src="${b64(A + 'efeonce-logo-negative.svg', 'image/svg+xml')}" style="height:70px;display:block;margin-bottom:40px">
      <div class="b" style="font-size:112px;color:#fff">${answerHtml(PROMESA, growth.accentOnDark)}</div>
      <div class="p" style="margin-top:34px;font-size:36px;color:#9fb3c8">${MECANISMO}</div></div>` }),
  // Avatar de redes (A7): isotipo negativo sobre navy, 60 % del ancho
  'avatar-redes': async () => ({ w: 1080, h: 1080, bg: NAVY,
    html: `<img src="${b64(A + 'efeonce-isotype-negative.svg', 'image/svg+xml')}" style="position:absolute;left:216px;top:50%;width:648px;transform:translateY(-50%)">` })
}

const b = await chromium.launch()
for (const [id, fn] of Object.entries(PIEZAS)) {
  const a = await fn()
  const p = await b.newPage({ viewport: { width: a.w, height: a.h } })
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${fuentes}</style></head><body><div id="a" style="position:relative;width:${a.w}px;height:${a.h}px;background:${a.bg};overflow:hidden">${a.html.replace(/<svg /, '<svg style="position:absolute;inset:0" ')}</div></body></html>`, { waitUntil: 'networkidle' })
  await p.evaluate(async () => { await document.fonts.load('760 60px "Bricolage Grotesque"'); await document.fonts.load('500 30px "Poppins"'); await document.fonts.ready })
  await p.locator('#a').screenshot({ path: DIR + 'out/' + id + '.png' })
  await p.close()
}
await b.close()
// Avatar por red: el mismo arte en el tamaño recomendado de cada plataforma (todas lo recortan en círculo)
for (const [red, px] of [['linkedin', 400], ['youtube', 800], ['instagram', 320], ['facebook', 720], ['x', 400], ['tiktok', 200]]) {
  await sharp(DIR + 'out/avatar-redes.png').resize(px, px).png().toFile(DIR + `out/avatar-${red}-${px}.png`)
}
console.log('ok')
