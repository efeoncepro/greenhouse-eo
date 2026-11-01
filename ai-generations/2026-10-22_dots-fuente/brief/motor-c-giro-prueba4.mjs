import fs from 'node:fs'; import path from 'node:path'
import { open } from './motor-harness.mjs'
const OUT = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-22_dots-fuente/motor/giros/prueba4'
fs.mkdirSync(OUT, { recursive: true })
const SIZE = 600
const { page, close } = await open(SIZE)
await page.evaluate(async (s) => {
  const c = ensure(s); c.setReducedMotion(false); c.restore(engine.presetAppearance('blue_beret')); await settle(30)
  window.T = performance.now()/1000
  window.run = async (n, fn) => { for (let i=1;i<=n;i++){ if (fn) fn(i); window.T += 1/60; c.render(window.T); await sleep(4) } }
}, SIZE)
const shot = (n) => page.locator('#c').screenshot({ path: path.join(OUT, n + '.png'), omitBackground: true, timeout: 120000 })
// fling rápido a la derecha: 4 cuadros de 0.2 a 0.95 y suelta
await page.evaluate(async () => { const c = ch(); c.pointer(E.PointerPhase.Down, 1, 0.1, 0.5, T); await run(4, (i) => c.pointer(E.PointerPhase.Move, 1, 0.1 + 0.85*i/4, 0.5, T)); c.pointer(E.PointerPhase.Up, 1, 0.95, 0.5, T) })
for (let k=0;k<10;k++){ await page.evaluate(async () => { await run(4) }); await shot('fling-' + String(k).padStart(2,'0')) }
await page.evaluate(async () => { await run(120) })
// arrastre vertical hacia abajo (picado)
await page.evaluate(async () => { const c = ch(); c.pointer(E.PointerPhase.Down, 2, 0.5, 0.2, T); await run(40, (i) => c.pointer(E.PointerPhase.Move, 2, 0.5, 0.2 + 0.75*Math.min(1,i/20), T)) }); await shot('abajo')
await page.evaluate(async () => { const c = ch(); c.pointer(E.PointerPhase.Up, 2, 0.5, 0.95, T); await run(90); c.pointer(E.PointerPhase.Down, 3, 0.5, 0.8, T); await run(40, (i) => c.pointer(E.PointerPhase.Move, 3, 0.5, 0.8 - 0.75*Math.min(1,i/20), T)) }); await shot('arriba')
await page.evaluate(async () => { const c = ch(); c.pointer(E.PointerPhase.Up, 3, 0.5, 0.05, T); await run(90); c.pointer(E.PointerPhase.Down, 4, 0.5, 0.5, T); await run(40, (i) => c.pointer(E.PointerPhase.Move, 4, 0.5 - 0.45*Math.min(1,i/20), 0.5, T)) }); await shot('izquierda')
await page.evaluate(async () => { const c = ch(); c.pointer(E.PointerPhase.Up, 4, 0.05, 0.5, T); await run(90); c.setDepth(1); await run(60) }); await shot('depth-1')
await page.evaluate(async () => { const c = ch(); c.setDepth(0); await run(60) }); await shot('depth-0')
await close(); console.log('ok')
