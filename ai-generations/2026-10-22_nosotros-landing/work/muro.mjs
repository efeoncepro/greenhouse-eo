// Compone el muro de recepción de La órbita (anillo + arco + esfera + logo + eslogan) sobre el plate RC1.
// Geometría desde AXIS: orbitSvg (tokens) y proporciones de efeonceGraphicLine.motion.layout.
import { orbitSvg } from '@efeoncepro/axis-graphic-line'
import { efeonceGraphicLine as g } from '@efeoncepro/axis-tokens'
import { chromium } from 'playwright'
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const [plate, out, cx, cy, r] = process.argv.slice(2)
const W = 2560, H = 1440
const C = { cx: +cx, cy: +cy, r: +r }
const ring = orbitSvg({ width: W, height: H, line: 'growth', surface: 'dark', circle: C, halo: true, background: false })
const L = g.motion.layout
const S = (2 * C.r) / L.heroRingOfShortSide.wide
const logoW = L.logoOfShortSide.wide * S
const logoH = logoW * (196.68 / 837.07)
const sloganW = L.sloganOfLogo * logoW
const sloganFont = sloganW / g.slogan.widthEmByWord.Growth
const gap = L.sloganGapOfFont * sloganFont
const groupH = logoH + gap + sloganFont * 1.15
const logoTop = C.cy - groupH / 2
const logoSvg = fs.readFileSync(path.resolve('node_modules/@efeoncepro/axis-brand-assets/assets/efeonce-logo-negative.svg'), 'utf8')
const accent = (ring.svg.match(/data-axis-part="sphere"[^>]*fill="(#[0-9a-fA-F]+)"/) || [])[1] || '#36c8bf'

const html = `<!doctype html><html><head><style>html,body{margin:0;background:transparent}
.s{font-family:'Poppins';font-size:${sloganFont}px;line-height:1.15;white-space:nowrap;color:${g.slogan.leadColor.onDark}}</style></head>
<body><div style="position:relative;width:${W}px;height:${H}px">
<div style="position:absolute;inset:0">${ring.svg}</div>
<div style="position:absolute;left:${C.cx - logoW / 2}px;top:${logoTop}px;width:${logoW}px">${logoSvg.replace('<svg ', `<svg width="${logoW}" height="${logoH}" `)}</div>
<div style="position:absolute;left:0;width:${W}px;top:${logoTop + logoH + gap}px;display:flex;justify-content:center;padding-left:${2 * C.cx - W}px;box-sizing:border-box">
<div class="s"><span style="font-weight:800;font-style:italic">Empower</span> <span style="font-weight:800">your</span> <span style="font-weight:900;font-style:italic;color:${accent}">Growth</span></div></div>
</div></body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: W, height: H } })
await page.setContent(html)
await page.evaluate(() => document.fonts.ready)
const layer = await page.screenshot({ omitBackground: true })
await browser.close()
fs.writeFileSync(out.replace(/\.png$/, '-capa.png'), layer)
await sharp(plate).composite([{ input: layer, blend: 'over' }]).png().toFile(out)
console.log(JSON.stringify({ C, logoW, logoH, sloganFont, accent }))
