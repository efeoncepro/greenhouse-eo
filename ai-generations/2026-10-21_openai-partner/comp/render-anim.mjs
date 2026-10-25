import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json')
const { chromium } = require('playwright')
const [,, html, outMp4, W, H, secs] = process.argv
const dir = outMp4.replace(/\.mp4$/, '-frames'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir)
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +W, height: +H } })
await p.goto('file://' + html)
await p.waitForTimeout(500); await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r }))) })
const N = Math.round(+secs * 30)
for (let f = 0; f < N; f++) { await p.evaluate(t => window.setT(t), f / 30); await p.screenshot({ path: `${dir}/f${String(f).padStart(4, '0')}.png`, clip: { x: 0, y: 0, width: +W, height: +H } }) }
await b.close()
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', `${dir}/f%04d.png`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outMp4])
console.log('ok', N)
