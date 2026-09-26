#!/usr/bin/env node
// Efeonce «La órbita» — render del reveal (línea → logo) y de la apertura (logo → línea).
//
//   node scripts/creative/brand-motion/render-orbit-motion.mjs --out <dir> [--anim reveal,open] [--format 16x9,1x1,4x5,9x16,16x9-4k]
//        [--scheme dark,light] [--fps 60] [--storyboard] [--ss 2] [--frames 0,120]
//
// Todo sale de los archivos oficiales (`@efeoncepro/axis-brand-assets`), de los tokens `efeonceGraphicLine` y de las
// curvas `axisMotion.ease`. Dos pasadas por cuadro, con transparencia real: `main` (anillo, nave, letras, eslogan) y
// `halo`. Las versiones con fondo se componen después (fondo + halo + main). `--storyboard` rinde sólo cuadros clave.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'
import { chromium } from 'playwright'
import { brandAssetUrl } from '@efeoncepro/axis-brand-assets'
import { axisMotion, efeonceGraphicLine as GL } from '@efeoncepro/axis-tokens'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../../..')
const args = process.argv.slice(2)
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback)

export const DURATION = { reveal: 4200, open: 2800 }
export const FORMATS = { '16x9': [1920, 1080], '16x9-4k': [3840, 2160], '1x1': [1080, 1080], '4x5': [1080, 1350], '9x16': [1080, 1920] }

// Paletas por fondo. Oscuro: logo negativo; claro: logo positivo y acento «sobre claro». Todo desde tokens.
const member = GL.family.find(f => f.key === 'efeonce')

export const SCHEMES = {
  dark: { background: GL.color.dark, logo: '#ffffff', ringLine: GL.color.halo, accent: member.accentOnDark, slogan: '#e2e2e2' },
  light: { background: GL.color.paper, logo: GL.color.navy, ringLine: GL.color.navy, accent: member.accentOnLight, slogan: '#848484', haloScale: 0.5 }
}

const bez = s => s.match(/[\d.]+/g).map(Number)
const font = f => `data:font/ttf;base64,${readFileSync(path.join(REPO, 'src/assets/fonts', f)).toString('base64')}`

const html = () => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Poppins;font-weight:800;font-style:normal;src:url(${font('Poppins-ExtraBold.ttf')})}
@font-face{font-family:Poppins;font-weight:800;font-style:italic;src:url(${font('Poppins-ExtraBoldItalic.ttf')})}
@font-face{font-family:Poppins;font-weight:900;font-style:italic;src:url(${font('Poppins-BlackItalic.ttf')})}
html,body{margin:0;background:transparent}svg{display:block}
</style></head><body><svg id="stage" xmlns="http://www.w3.org/2000/svg"></svg>
<script>${readFileSync(path.join(HERE, 'orbit-scene.js'), 'utf8')}</script></body></html>`

export async function openScene(browser, { format, scheme, ss }) {
  const [W, H] = FORMATS[format]
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: ss })

  await page.setContent(html(), { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)

  const cfg = {
    W, H, format: format.replace('-4k', ''),
    isotypeSvg: readFileSync(brandAssetUrl('efeonce-isotype-negative'), 'utf8'),
    logoSvg: readFileSync(brandAssetUrl('efeonce-logo-negative'), 'utf8'),
    tokens: { orbit: GL.orbit },
    colors: SCHEMES[scheme],
    slogan: { parts: [{ text: 'Empower', weight: 800, italic: true }, { text: 'your', weight: 800, italic: false }, { text: member.sloganWord, weight: 900, italic: true, accent: true }] }
  }

  await page.evaluate(({ cfg, ease }) => {
    window.orbitScene.setEasing(ease)
    window.orbitScene.init(cfg)
  }, { cfg, ease: { emphasized: bez(axisMotion.ease.emphasized), standard: bez(axisMotion.ease.standard), emphasizedAccelerate: bez(axisMotion.ease.emphasizedAccelerate) } })

  return { page, W, H }
}

// Tramos rápidos: ahí cada cuadro promedia subcuadros (obturador de 180°) para un desenfoque de movimiento real.
export const BLUR = { reveal: [[1550, 2250], [2450, 3250]], open: [[600, 1300], [1100, 1700]] }
const SUB = 5

export async function shootBlurred(scene, t, anim, pass, ss, fps) {
  if (!BLUR[anim].some(([a, b]) => t > a && t < b)) return shoot(scene, t, anim, pass, ss)
  const dt = 1000 / fps
  const acc = new Float64Array(scene.W * scene.H * 4)

  for (let k = 0; k < SUB; k++) {
    const tk = t - dt / 4 + (dt / 2) * (k / (SUB - 1))
    const { data } = await sharp(await shoot(scene, tk, anim, pass, ss)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

    // Promedio en alfa premultiplicado: sin halos oscuros en los bordes.
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3] / 255

      acc[i] += data[i] * a
      acc[i + 1] += data[i + 1] * a
      acc[i + 2] += data[i + 2] * a
      acc[i + 3] += data[i + 3]
    }
  }

  const out = Buffer.alloc(acc.length)

  for (let i = 0; i < acc.length; i += 4) {
    const a = acc[i + 3] / SUB
    const k = a > 0 ? 255 / a / SUB : 0

    out[i] = Math.round(Math.min(255, acc[i] * k))
    out[i + 1] = Math.round(Math.min(255, acc[i + 1] * k))
    out[i + 2] = Math.round(Math.min(255, acc[i + 2] * k))
    out[i + 3] = Math.round(a)
  }

  return sharp(out, { raw: { width: scene.W, height: scene.H, channels: 4 } }).png().toBuffer()
}

export async function shoot(scene, t, anim, pass, ss) {
  await scene.page.evaluate(({ t, anim, pass }) => window.orbitScene.render(t, anim, pass), { t, anim, pass })
  const png = await scene.page.screenshot({ omitBackground: true, type: 'png' })

  return ss === 1 ? png : sharp(png).resize(scene.W, scene.H, { kernel: 'lanczos3' }).png().toBuffer()
}

async function main() {
  const out = path.resolve(opt('--out', 'out'))
  const anims = opt('--anim', 'reveal,open').split(',')
  const formats = opt('--format', '16x9').split(',')
  const schemes = opt('--scheme', 'dark').split(',')
  const fps = Number(opt('--fps', 60))
  const ssArg = opt('--ss', null)
  const storyboard = args.includes('--storyboard')
  const browser = await chromium.launch()

  try {
    for (const anim of anims) {
      for (const format of formats) {
        for (const scheme of schemes) {
          const ss = Number(ssArg ?? (format === '16x9-4k' ? 1 : 2))
          const scene = await openScene(browser, { format, scheme, ss })
          const total = Math.round((DURATION[anim] / 1000) * fps)
          const dir = path.join(out, `${anim}_${format}_${scheme}`)

          const times = storyboard
            ? (anim === 'reveal' ? [0, 300, 700, 1100, 1450, 1700, 1950, 2250, 2600, 2950, 3300, 4200] : [0, 500, 900, 1250, 1500, 1800, 2100, 2400, 2800])
            : Array.from({ length: total + 1 }, (_, i) => (i * 1000) / fps)

          mkdirSync(path.join(dir, 'main'), { recursive: true })
          mkdirSync(path.join(dir, 'halo'), { recursive: true })
          const bg = SCHEMES[scheme].background

          mkdirSync(path.join(dir, 'bg'), { recursive: true })

          for (const [i, t] of times.entries()) {
            const name = storyboard ? `t${String(Math.round(t)).padStart(4, '0')}.png` : `${String(i).padStart(4, '0')}.png`
            const tt = Math.min(t, DURATION[anim])
            const main = storyboard ? await shoot(scene, tt, anim, 'main', ss) : await shootBlurred(scene, tt, anim, 'main', ss, fps)
            const halo = await shoot(scene, tt, anim, 'halo', ss)

            writeFileSync(path.join(dir, 'main', name), main)
            writeFileSync(path.join(dir, 'halo', name), halo)

            const composed = await sharp({ create: { width: scene.W, height: scene.H, channels: 3, background: bg } })
              .composite([{ input: halo }, { input: main }])
              .png()
              .toBuffer()

            writeFileSync(path.join(dir, 'bg', name), composed)
          }

          await scene.page.close()
          console.log(`${anim} ${format} ${scheme}: ${times.length} cuadros → ${dir}`)
        }
      }
    }
  } finally {
    await browser.close()
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
