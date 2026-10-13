import { chromium } from 'playwright'
const [,, out, ...files] = process.argv
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 700, height: 260 } })
await p.setContent(`<body style="margin:0;display:flex">` + files.map((f, i) => `<div style="width:350px;height:260px;display:flex;align-items:center;justify-content:center;background:${i ? '#ffffff' : '#071d36'}"><img src="file://${f}" style="height:160px"></div>`).join('') + `</body>`)
await p.screenshot({ path: out })
await b.close()
