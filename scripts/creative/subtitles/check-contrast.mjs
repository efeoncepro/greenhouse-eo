#!/usr/bin/env node
// Control de contraste de subtítulos de video sobre los cuadros reales (estándar 2026-10-17: vidrio denso).
//
// Para cada subtítulo del archivo de tiempos toma tres cuadros del video (entrada, mitad y salida), compone encima el
// bloque de vidrio con los valores del manifiesto de AXIS y mide el contraste entre el texto y lo que queda detrás de
// las letras en el percentil del token (peor 5 %). Falla (exit 1) si alguna muestra queda bajo el mínimo del token.
//
// Los valores (vidrio, anillo, colocación por formato, mínimo y percentil) salen del manifiesto que resuelve AXIS
// (`pnpm surface:resolve` en el checkout de AXIS); este script no fija ninguno.
//
// Uso:
//   pnpm brand:subtitles:check -- --video corte.mp4 --tiempos para-cuando.tiempos.json \
//     [--manifest ../axis-design-system/docs/examples/surfaces/audiovisual-subtitles-manifest.json] \
//     [--format 4x5] [--side "Paula=l,Antonio=r"] [--out informe.json] [--keep <carpeta>]
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'
import { chromium } from 'playwright'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../../..')
const FONTS = path.join(ROOT, 'src/lib/artifact-composer/catalogs/graphic-line-overlays/fonts')
const DEFAULT_MANIFEST = path.resolve(ROOT, '../axis-design-system/docs/examples/surfaces/audiovisual-subtitles-manifest.json')

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? true : all[i + 1]]] : acc), []))
const fail = (msg) => { console.error(`✖ ${msg}`); process.exit(2) }

if (!args.video || !args.tiempos) fail('faltan --video y --tiempos (ver el encabezado del script)')
const manifestPath = path.resolve(args.manifest ?? DEFAULT_MANIFEST)

if (!existsSync(manifestPath)) fail(`no encuentro el manifiesto de AXIS: ${manifestPath}. Genéralo con «pnpm surface:resolve» en el checkout de AXIS.`)

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const token = manifest.type?.subtitle
const content = manifest.content?.subtitles

if (!token?.glass || !token?.contrast || !content?.placement) fail('el manifiesto no trae el estándar de video (glass, contrast y placement): usa AXIS con el delta 2026-10-17 (y)')

const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', args.video]).toString()).streams[0]
const { width: W, height: H } = probe
const ratio = W / H
const format = args.format ?? (Math.abs(ratio - 16 / 9) < 0.02 ? '16x9' : Math.abs(ratio - 9 / 16) < 0.02 ? '9x16' : Math.abs(ratio - 4 / 5) < 0.02 ? '4x5' : null)
const place = content.placement[format]

if (!place) fail(`formato sin colocación en el token: ${format ?? `${W}×${H}`} (usa --format)`)

const scale = Math.min(W, H) / 1080
const px = place.px * scale
const g = token.glass
const sides = Object.fromEntries(String(args.side ?? '').split(',').filter(Boolean).map(s => s.split('=').map(x => x.trim())))
const tiempos = JSON.parse(readFileSync(args.tiempos, 'utf8'))

const events = tiempos.lineas.filter(l => l.tipo === 'subtitulo').map(l => {
  const lines = l.lineas ?? [l.texto]
  const entra = l.palabras ? l.palabras[0][1] : l.entra

  return { plano: l.plano, quien: l.quien, lines, entra, sale: l.sale, who: sides[l.quien] ?? 'l', ask: lines.join(' ').includes('?') }
})

const work = args.keep ? path.resolve(args.keep) : mkdtempSync(path.join(tmpdir(), 'subt-contraste-'))

mkdirSync(work, { recursive: true })

const hexToRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))

const lin = c => { c /= 255; 

return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }

const lum = ([r, g2, b]) => 0.2126 * lin(r) + 0.7152 * lin(g2) + 0.0722 * lin(b)
const [fr, fg, fb] = hexToRgb(g.fill)

const css = `@font-face{font-family:Pop;font-weight:500;src:url(file://${FONTS}/poppins-500.ttf)}
*{box-sizing:border-box}body{margin:0;width:${W}px;height:${H}px;position:relative;overflow:hidden}
.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.w{position:absolute;display:flex}
.g{display:flex;align-items:flex-start;gap:${token.ask?.gapEm ?? 0.4}em;max-width:100%;font:500 ${px}px/${token.lineHeight} Pop;color:#fff;
 padding:${g.paddingEm[0]}em ${g.paddingEm[1]}em;border-radius:${g.radiusPx * scale}px;background:rgba(${fr},${fg},${fb},${g.alpha});
 -webkit-backdrop-filter:blur(${g.blurPx * scale}px) saturate(${g.saturate});backdrop-filter:blur(${g.blurPx * scale}px) saturate(${g.saturate});
 box-shadow:inset 0 0 0 ${g.rimPx * scale}px rgba(255,255,255,${g.rimAlpha})}
.g.l{border-bottom-left-radius:0}.g.r{border-bottom-right-radius:0}
.g span{display:block}.ring{width:${token.ask?.sizeEm ?? 0.62}em;height:${token.ask?.sizeEm ?? 0.62}em;flex:none;margin-top:.36em;border-radius:50%;border:${token.ask?.strokeEm ?? 0.1}em solid ${token.ask?.color ?? '#36c8bf'}}
.hide span{color:transparent!important}`

const wrapStyle = (who) => {
  const [l, r] = place.insetOfWidth ?? [0.06, 0.06]
  const v = place.endsAtOfHeight !== undefined ? `bottom:${(1 - place.endsAtOfHeight) * 100}%` : `top:${place.fromTop * 100}%`

  return `left:${l * 100}%;right:${r * 100}%;${v};justify-content:${who === 'r' ? 'flex-end' : who === 'l' ? 'flex-start' : 'center'}`
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: W, height: H } })
const results = []

for (const [i, ev] of events.entries()) {
  const span = ev.sale - ev.entra

  for (const [label, t] of [['entrada', ev.entra + Math.min(0.05, span / 4)], ['mitad', ev.entra + span / 2], ['salida', ev.sale - Math.min(0.05, span / 4)]]) {
    const frame = path.join(work, `ev${i}-${label}.png`)

    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', args.video, '-frames:v', '1', frame])
    const block = `<div class="w" style="${wrapStyle(ev.who)}"><div class="g ${ev.who} hide">${ev.ask ? '<i class="ring"></i>' : ''}<div>${ev.lines.map(l => `<span>${l}</span>`).join('')}</div></div></div>`

    writeFileSync(path.join(work, 'p.html'), `<html><head><style>${css}</style></head><body><img class="bg" src="file://${frame}">${block}</body></html>`)
    await page.goto('file://' + path.join(work, 'p.html'))
    await page.evaluate(() => document.fonts.ready)

    const boxes = await page.evaluate(() => [...document.querySelectorAll('.g span')].map(s => { const r = document.createRange();

 r.selectNodeContents(s); const b = r.getBoundingClientRect();

 

return [b.left, b.top, b.width, b.height].map(Math.round) }))

    const { data, info } = await sharp(await page.screenshot()).raw().toBuffer({ resolveWithObject: true })
    const ls = []

    for (const [x, y, w, h] of boxes) for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++) for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) { const k = (yy * info.width + xx) * info.channels;

 ls.push(lum([data[k], data[k + 1], data[k + 2]])) }

    ls.sort((a, b) => a - b)
    const worst = ls[Math.floor(token.contrast.percentile * (ls.length - 1))]
    const contrast = 1.05 / (worst + 0.05)

    results.push({ plano: ev.plano, quien: ev.quien, muestra: label, t: Number(t.toFixed(3)), contraste: Number(contrast.toFixed(2)), pasa: contrast >= token.contrast.minRatio })
  }
}

await browser.close()
if (!args.keep) rmSync(work, { recursive: true, force: true })

console.table(results.map(r => ({ ...r, pasa: r.pasa ? '✓' : '✗' })))
const fails = results.filter(r => !r.pasa)
const report = { manifiesto: manifestPath, video: path.resolve(args.video), formato: format, minimo: token.contrast.minRatio, percentil: token.contrast.percentile, muestras: results, fallas: fails.length }

if (args.out) writeFileSync(path.resolve(args.out), JSON.stringify(report, null, 1))
console.log(fails.length ? `✖ ${fails.length} muestra(s) bajo ${token.contrast.minRatio}:1 — reubica el subtítulo en el plano o pide la excepción aprobada` : `✓ ${results.length} muestras sobre ${token.contrast.minRatio}:1`)
process.exit(fails.length ? 1 : 0)
