// Abre páginas oficiales de OpenAI en Chromium real y lista los medios que cargan (imágenes, video, iframes).
// Uso: node recolectar-medios.mjs <url> <salida.json>
import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright/index.mjs'
import fs from 'node:fs'

const [url, out] = process.argv.slice(2)
const browser = await chromium.launch({ headless: false, args: ['--disable-blink-features=AutomationControlled'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' })
const medios = new Map()
page.on('response', async (r) => {
  const ct = r.headers()['content-type'] || ''
  if (/image|video|mpegurl|dash/.test(ct)) medios.set(r.url(), { ct, status: r.status(), len: r.headers()['content-length'] || null })
})
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
await page.waitForTimeout(8000)
for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 900); await page.waitForTimeout(500) }
await page.waitForTimeout(4000)
const dom = await page.evaluate(() => ({
  title: document.title,
  iframes: [...document.querySelectorAll('iframe')].map((f) => f.src),
  videos: [...document.querySelectorAll('video, video source')].map((v) => v.currentSrc || v.src || v.getAttribute('src')).filter(Boolean),
  posters: [...document.querySelectorAll('video')].map((v) => v.poster).filter(Boolean),
  imgs: [...document.querySelectorAll('img')].map((i) => ({ src: i.currentSrc || i.src, alt: i.alt, w: i.naturalWidth })),
  links: [...document.querySelectorAll('a')].map((a) => a.href).filter((h) => /youtube|youtu\.be|x\.com|twitter|instagram|tiktok|linkedin|vimeo|help\.openai|apps\.apple|play\.google|dots/i.test(h)),
  text: document.body.innerText.slice(0, 6000),
}))
fs.writeFileSync(out, JSON.stringify({ url, dom, medios: [...medios].map(([u, m]) => ({ u, ...m })) }, null, 2))
console.log(dom.title, '| medios', medios.size, '| iframes', dom.iframes.length, '| videos', dom.videos.length)
await browser.close()
