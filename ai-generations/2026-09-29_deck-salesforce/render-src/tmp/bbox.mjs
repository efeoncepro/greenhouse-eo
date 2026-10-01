import { chromium } from 'playwright'
import { readFileSync } from 'fs'
const svg = readFileSync(process.argv[2], 'utf8')
const br = await chromium.launch({ channel: 'chrome' }); const pg = await br.newPage()
await pg.setContent(`<html><body>${svg}</body></html>`)
const r = await pg.evaluate(() => [...document.querySelectorAll('path')].map((p, i) => { const b = p.getBBox(); return [i, p.getAttribute('fill'), +b.x.toFixed(2), +b.y.toFixed(2), +b.width.toFixed(2), +b.height.toFixed(2)] }))
console.log(r.map(x => x.join('\t')).join('\n'))
await br.close()
