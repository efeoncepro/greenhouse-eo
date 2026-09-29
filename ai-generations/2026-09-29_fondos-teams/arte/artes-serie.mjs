// Artes planos de los cinco fondos restantes (2026-09-29). Cada arte es la referencia EXACTA del texto que el modelo
// fotografía (método de la oficina en foto, §10.9). Acento de la línea desde el token; esfera con answerHtml de AXIS.
// node artes-serie.mjs → <id>.png
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright/index.mjs'

const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { efeonceGraphicLine: GL } = require('@efeoncepro/axis-tokens')
const { answerHtml } = require('@efeoncepro/axis-graphic-line')

const F = '/Users/jreye/Documents/greenhouse-eo/src/lib/artifact-composer/brand-packs/axis/fonts/'
const DIR = new URL('./', import.meta.url).pathname
const b64 = (f, mime = 'font/ttf') => `data:${mime};base64,${readFileSync(f).toString('base64')}`
const linea = k => GL.lines.find(l => l.key === k)
const NAVY = GL.color.navy
const DARK = GL.color.dark

const fuentes = `
@font-face { font-family: 'Bricolage Grotesque'; font-weight: 760; src: url('${b64(F + 'bricolage-grotesque-variable.ttf')}') format('truetype'); }
@font-face { font-family: 'Poppins'; font-weight: 500; src: url('${b64(F + 'poppins-500.ttf')}') format('truetype'); }
@font-face { font-family: 'Guttery'; src: url('${b64(F + 'guttery-400.ttf')}') format('truetype'); }
html, body { margin: 0; } .b { font-family: 'Bricolage Grotesque'; font-weight: 760; letter-spacing: -0.02em; line-height: 1; }
.p { font-family: 'Poppins'; font-weight: 500; } .g { font-family: 'Guttery'; }`

const ARTES = {
  // Engine · open space: letras de vinilo navy sobre muro claro
  'organico': {
    w: 1000, h: 520, bg: '#f2f0eb',
    html: `<div class="b" style="position:absolute;left:60px;top:70px;font-size:170px;color:${NAVY}">Crecimiento<br>${answerHtml('orgánico', linea('engine').accentOnLight)}</div>`
  },
  // RevOps · sala «Cerrar.»: nombre de sala + pizarra con el bow-tie y la frase a la Magritte
  'cerrar': {
    w: 900, h: 1150, bg: '#dfe2e6',
    html: `<div class="b" style="position:absolute;left:60px;top:50px;font-size:150px;color:${NAVY}">${answerHtml('Cerrar', linea('revenue-hubspot').accentOnLight)}</div>
    <div style="position:absolute;left:60px;top:290px;width:780px;height:800px;background:#f6f7f8;border:12px solid #c7ccd2;border-radius:6px;box-sizing:border-box">
      <svg width="756" height="776" style="position:absolute;left:0;top:0" fill="none" stroke="${NAVY}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round">
        <path d="M60 150 L360 330 L60 510 Z"/><path d="M696 150 L396 330 L696 510 Z"/><circle cx="378" cy="330" r="20" fill="${linea('revenue-hubspot').accentOnLight}" stroke="none"/>
      </svg>
      <div class="g" style="position:absolute;left:0;right:0;top:590px;text-align:center;font-size:96px;color:${NAVY}">Esto no es un embudo.</div>
    </div>`
  },
  // RevOps · cocina: letrero de muro
  'cocina': {
    w: 1320, h: 380, bg: '#f4f3f0',
    html: `<div class="p" style="position:absolute;left:60px;top:60px;font-size:54px;color:${NAVY}">Limpiamos CRMs todo el día.</div>
    <div class="b" style="position:absolute;left:56px;top:150px;font-size:150px;white-space:nowrap;color:${NAVY}">${answerHtml('Tu taza, lávala tú', linea('revenue-hubspot').accentOnLight)}</div>`
  },
  // Cultura · cuadro «Empleada del mes» con el retrato canónico de Nexa (identidad A)
  'nexa-mes': {
    w: 700, h: 900, bg: '#ffffff',
    html: `<div style="position:absolute;inset:0;border:26px solid #1b1d21;box-sizing:border-box"></div>
    <div style="position:absolute;left:60px;top:60px;right:60px;bottom:60px;background:#f7f6f3"></div>
    <div class="p" style="position:absolute;left:0;right:0;top:100px;text-align:center;font-size:34px;letter-spacing:4px;color:${NAVY}">EMPLEADA DEL MES</div>
    <img src="${b64('/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-29_fondos-teams/arte/nexa-retrato-uniforme.png', 'image/png')}" style="position:absolute;left:130px;top:170px;width:440px;height:560px;object-fit:cover;object-position:50% 30%">
    <div class="b" style="position:absolute;left:0;right:0;top:760px;text-align:center;font-size:64px;color:${NAVY}">${answerHtml('Nexa', linea('growth').accentOnLight)}</div>`
  },
  // Creativo · muro de trabajo: la pieza clavada con el nombre de archivo y el timbre
  'v27': {
    w: 760, h: 1040, bg: '#ffffff',
    html: `<div style="position:absolute;left:40px;top:150px;width:680px;height:826px;background:${DARK};overflow:hidden">
      <div style="position:absolute;left:-120px;top:420px;width:620px;height:620px;border-radius:50%;background:radial-gradient(circle at 60% 40%, #1d4f86, ${DARK} 70%)"></div>
      <div class="b" style="position:absolute;left:50px;top:40px;font-size:96px;color:#fff">${answerHtml('Idea', linea('brand').accentOnDark)}</div>
    </div>
    <div class="g" style="position:absolute;left:10px;top:30px;width:740px;padding:22px 0;text-align:center;background:#efe6cf;transform:rotate(-2deg);font-size:64px;color:#1b1d21">final_final_v27_AHORA_SÍ</div>
    <div class="b" style="position:absolute;left:150px;top:620px;font-size:92px;white-space:nowrap;color:${linea('brand').accentOnLight};transform:rotate(-14deg);border:10px solid ${linea('brand').accentOnLight};border-radius:18px;padding:10px 30px;background:rgba(255,255,255,.08)">Aprobada.</div>`
  },
  // Creativo · mesa de producción: letras pintadas en muro navy + «(casi)» agregado a mano con plumón blanco
  'hecho-a-mano': {
    w: 1000, h: 520, bg: DARK,
    html: `<div class="b" style="position:absolute;left:60px;top:70px;font-size:170px;color:#fff">Hecho<br>${answerHtml('a mano', linea('brand').accentOnDark)}</div>
    <div class="g" style="position:absolute;left:700px;top:350px;font-size:120px;color:#fff;transform:rotate(-8deg)">(casi)</div>`
  }
}

const b = await chromium.launch()
for (const [id, a] of Object.entries(ARTES)) {
  const p = await b.newPage({ viewport: { width: a.w, height: a.h } })
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${fuentes}</style></head><body><div id="a" style="position:relative;width:${a.w}px;height:${a.h}px;background:${a.bg};overflow:hidden">${a.html}</div></body></html>`, { waitUntil: 'networkidle' })
  await p.evaluate(async () => { await document.fonts.load('760 100px "Bricolage Grotesque"'); await document.fonts.load('500 40px "Poppins"'); await document.fonts.load('60px "Guttery"'); await document.fonts.ready })
  const ok = await p.evaluate(() => document.fonts.check('760 100px "Bricolage Grotesque"') && document.fonts.check('60px "Guttery"'))
  if (!ok) throw new Error(`${id}: las fuentes no cargaron`)
  await p.locator('#a').screenshot({ path: DIR + id + '.png' })
  await p.close()
}
await b.close()
console.log('ok', Object.keys(ARTES).join(' '))
