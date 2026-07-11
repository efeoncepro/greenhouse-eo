const { chromium } = require('playwright')
const [,, htmlPath, outPath, w, h] = process.argv
;(async()=>{
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport:{ width:+w, height:+h }, deviceScaleFactor:1 })
  await page.goto('file://'+htmlPath)
  await page.waitForTimeout(400)
  await page.screenshot({ path: outPath })
  await browser.close()
  console.log('rendered ->', outPath)
})().catch(e=>{console.error('RENDER ERR:',e.message);process.exit(1)})
