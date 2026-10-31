import fs from 'node:fs'; import path from 'node:path'
import { open } from './motor-harness.mjs'
const OUT = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-22_dots-fuente/motor/giros/prueba3'
fs.mkdirSync(OUT, { recursive: true })
const SIZE = 600
const { page, close } = await open(SIZE)
await page.evaluate(async (s) => {
  const c = ensure(s); c.setReducedMotion(false); c.restore(engine.presetAppearance('blue_beret')); await settle(30)
  window.T = performance.now()/1000
  window.run = async (n, fn) => { for (let i=1;i<=n;i++){ if (fn) fn(i); window.T += 1/60; c.render(window.T); await sleep(4) } }
}, SIZE)
const shot = (n) => page.locator('#c').screenshot({ path: path.join(OUT, n + '.png'), omitBackground: true, timeout: 120000 })
await shot('00-reposo')
await page.evaluate(() => { ch().pointer(E.PointerPhase.Down, 1, 0.5, 0.5, T) })
for (const k of [10, 20, 30, 45]) {
  await page.evaluate(async (k) => { await run(10, (i) => ch().pointer(E.PointerPhase.Move, 1, 0.5 + 0.45*k/45, 0.5, T)) }, k)
  await shot('der-' + k)
}
await page.evaluate(async () => { await run(30, () => ch().pointer(E.PointerPhase.Move, 1, 2.0, 0.5, T)) }); await shot('der-lejos')
await page.evaluate(async () => { ch().pointer(E.PointerPhase.Up, 1, 2.0, 0.5, T); await run(10) }); await shot('suelta-10')
await page.evaluate(async () => { await run(60) }); await shot('suelta-70')
await close(); console.log('ok')
