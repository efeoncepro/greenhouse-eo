import fs from 'node:fs'; import path from 'node:path'
import { open } from './motor-harness.mjs'
const OUT = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-22_dots-fuente/motor/giros'
const SIZE = 1000
const heroes = [['blue_beret','felipe'],['lime_frog','todd'],['alfred','alfred'],['purple_heart','jojo'],['coral_monocle','iris'],['gus','thelma'],['blue_spectacles','josh'],['lime_headphones','iggy']]
const { page, close } = await open(SIZE)
await page.evaluate(async (s) => {
  const c = ensure(s); c.setReducedMotion(false)
  window.T = performance.now()/1000
  window.run = async (n, fn) => { for (let i=1;i<=n;i++){ if (fn) fn(i); window.T += 1/60; c.render(window.T); await sleep(3) } }
}, SIZE)
const shot = (dir, n) => page.locator('#c').screenshot({ path: path.join(dir, n + '.png'), omitBackground: true, timeout: 180000 })
for (const [id, name] of heroes) {
  const dir = path.join(OUT, name); fs.mkdirSync(dir, { recursive: true })
  await page.evaluate(async (id) => { ch().restore(engine.presetAppearance(id)); await settle(20); window.T = performance.now()/1000; await run(30) }, id)
  await shot(dir, `dots-${name}-00-frente`)
  let pid = 10
  const hold = async (label, x0, y0, x1, y1) => {
    pid++
    await page.evaluate(async ([p, x0, y0, x1, y1]) => { const c = ch(); c.pointer(E.PointerPhase.Down, p, x0, y0, T); await run(40, (i) => { const k = Math.min(1, i/20); c.pointer(E.PointerPhase.Move, p, x0 + (x1-x0)*k, y0 + (y1-y0)*k, T) }) }, [pid, x0, y0, x1, y1])
    await shot(dir, label)
    await page.evaluate(async ([p, x1, y1]) => { ch().pointer(E.PointerPhase.Up, p, x1, y1, T); await run(90) }, [pid, x1, y1])
  }
  const fling = async (label, x0, x1) => {
    pid++
    await page.evaluate(async ([p, x0, x1]) => { const c = ch(); c.pointer(E.PointerPhase.Down, p, x0, 0.5, T); await run(4, (i) => c.pointer(E.PointerPhase.Move, p, x0 + (x1-x0)*i/4, 0.5, T)); c.pointer(E.PointerPhase.Up, p, x1, 0.5, T) }, [pid, x0, x1])
    await shot(dir, label)
    await page.evaluate(async () => { await run(4) }); await shot(dir, label + '-b')
    await page.evaluate(async () => { await run(120) })
  }
  await hold(`dots-${name}-01-gira-derecha`, 0.5, 0.5, 1.6, 0.5)
  await hold(`dots-${name}-02-gira-izquierda`, 0.5, 0.5, -0.6, 0.5)
  await fling(`dots-${name}-03-tres-cuartos-derecha`, 0.1, 0.95)
  await fling(`dots-${name}-04-tres-cuartos-izquierda`, 0.9, 0.05)
  await hold(`dots-${name}-05-contrapicado`, 0.5, 0.5, 0.5, -0.6)
  await hold(`dots-${name}-06-picado`, 0.5, 0.5, 0.5, 1.6)
  // reacción firma: muestra 6 cuadros
  const res = await page.evaluate(() => ch().playReaction(E.ReactionKind.Signature))
  for (let k = 0; k < 6; k++) { await page.evaluate(async () => { await run(10) }); await shot(dir, `dots-${name}-07-firma-${k}`) }
  await page.evaluate(async () => { await run(120) })
  console.log('✓', name, 'firma=', res)
}
await close()
