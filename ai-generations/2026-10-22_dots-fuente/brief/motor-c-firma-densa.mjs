import fs from 'node:fs'; import path from 'node:path'
import { open } from './motor-harness.mjs'
const OUT = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-22_dots-fuente/motor/giros'
const SIZE = 1000
const heroes = [['blue_beret','felipe'],['lime_frog','todd'],['alfred','alfred'],['purple_heart','jojo'],['coral_monocle','iris'],['gus','thelma'],['blue_spectacles','josh'],['lime_headphones','iggy']]
const { page, close } = await open(SIZE)
await page.evaluate(async (s) => { const c = ensure(s); c.setReducedMotion(false)
  window.T = performance.now()/1000
  window.run = async (n) => { for (let i=1;i<=n;i++){ window.T += 1/60; c.render(window.T); await sleep(3) } } }, SIZE)
for (const [id, name] of heroes) {
  const dir = path.join(OUT, name, 'firma-cuadro-a-cuadro'); fs.mkdirSync(dir, { recursive: true })
  await page.evaluate(async (id) => { ch().restore(engine.presetAppearance(id)); await settle(20); window.T = performance.now()/1000; await run(30); return ch().playReaction(E.ReactionKind.Signature) }, id)
  for (let k = 0; k < 40; k++) { await page.evaluate(async () => { await run(4) }); await page.locator('#c').screenshot({ path: path.join(dir, `dots-${name}-firma-${String(k).padStart(2,'0')}.png`), omitBackground: true, timeout: 180000 }) }
  // y la reacción saludo
  const wdir = path.join(OUT, name, 'saludo-cuadro-a-cuadro'); fs.mkdirSync(wdir, { recursive: true })
  await page.evaluate(async () => { await run(120); return ch().playReaction(E.ReactionKind.Wave) })
  for (let k = 0; k < 20; k++) { await page.evaluate(async () => { await run(6) }); await page.locator('#c').screenshot({ path: path.join(wdir, `dots-${name}-saludo-${String(k).padStart(2,'0')}.png`), omitBackground: true, timeout: 180000 }) }
  await page.evaluate(async () => { await run(120) })
  console.log('✓', name)
}
await close()
