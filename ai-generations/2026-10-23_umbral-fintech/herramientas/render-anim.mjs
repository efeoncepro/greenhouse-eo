// node render-anim.mjs <html> <outdir> <seconds> [fps]
import { chromium } from 'playwright'
import path from 'node:path'
const [html, out, secs, fpsArg] = process.argv.slice(2)
const fps = Number(fpsArg ?? 30), n = Math.round(Number(secs) * fps)
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
await p.goto('file://' + path.resolve(html)); await p.evaluate(() => document.fonts.ready)
await p.evaluate(() => document.getAnimations().forEach(a => a.pause()))
for (let i = 0; i < n; i++) {
  await p.evaluate(t => document.getAnimations().forEach(a => { a.currentTime = t }), (i * 1000) / fps)
  await p.screenshot({ path: path.join(out, `f${String(i).padStart(4, '0')}.png`) })
}
await b.close(); console.log('frames', n)
