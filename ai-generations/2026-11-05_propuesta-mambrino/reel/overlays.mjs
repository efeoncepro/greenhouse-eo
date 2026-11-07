import { chromium } from 'playwright'
import fs from 'node:fs'
const out = process.argv[2]; const logo = process.argv[3]
const logoB64 = fs.readFileSync(logo).toString('base64')
const shots = [
  ['1', 'Lo último', 'antes de salir'],
  ['2', 'Así', 'empieza'],
  ['3', 'Fuego', 'alto'],
  ['4', 'Directo', 'al plato'],
  ['5', 'Y a la', 'mesa'],
]
const css = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,500&family=Poppins:wght@500&display=swap');
html,body{margin:0;width:1080px;height:1920px;background:transparent}
.t{position:absolute;left:80px;right:80px;bottom:300px;color:#fff;font-family:'Playfair Display',serif;text-shadow:0 4px 30px rgba(0,0,0,.55),0 2px 6px rgba(0,0,0,.5)}
.a{font-size:120px;font-weight:600;line-height:1}.b{font-size:110px;font-style:italic;font-weight:500;line-height:1.05}
.grad{position:absolute;left:0;right:0;bottom:0;height:900px;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.55))}`
const browser = await chromium.launch(); const p = await browser.newPage({ viewport: { width: 1080, height: 1920 } })
for (const [n, a, b] of shots) {
  await p.setContent(`<style>${css}</style><div class="grad"></div><div class="t"><div class="a">${a}</div><div class="b">${b}</div></div>`)
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600)
  await p.screenshot({ path: `${out}/t${n}.png`, omitBackground: true })
}
await p.setContent(`<style>${css}
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:56px;color:#fff;text-align:center}
.c img{width:620px}.s{font-family:'Playfair Display',serif;font-size:92px;font-style:italic;font-weight:500;line-height:1.1;text-shadow:0 4px 30px rgba(0,0,0,.6)}
.k{font-family:'Poppins',sans-serif;font-size:34px;letter-spacing:.22em;text-transform:uppercase;font-weight:500;opacity:.9}
.v{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(0,0,0,.25),rgba(0,0,0,.7))}</style>
<div class="v"></div><div class="c"><img src="data:image/png;base64,${logoB64}"><div class="s">Santiago<br>23 de noviembre</div><div class="k">Abrimos</div></div>`)
await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800)
await p.screenshot({ path: `${out}/t6.png`, omitBackground: true })
await browser.close(); console.log('ok')
