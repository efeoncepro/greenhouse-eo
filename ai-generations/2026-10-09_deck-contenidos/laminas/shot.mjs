import { chromium } from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright/index.mjs'
const [,, html, out] = process.argv
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
await p.goto('file://' + html); await p.waitForLoadState('networkidle'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400)
await p.screenshot({ path: out, type: 'jpeg', quality: 82 }); await b.close(); console.log('shot', out)
