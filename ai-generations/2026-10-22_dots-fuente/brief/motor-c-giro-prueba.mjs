import fs from 'node:fs'; import path from 'node:path'
import { open } from './motor-harness.mjs'
const OUT = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-22_dots-fuente/motor/giros/prueba'
fs.mkdirSync(OUT, { recursive: true })
const SIZE = 800
const { page, logs, close } = await open(SIZE)
await page.evaluate(async (s) => { const c = ensure(s); c.setReducedMotion(false); c.restore(engine.presetAppearance('blue_beret')); await settle(30); startLoop() }, SIZE)
await page.waitForTimeout(1500)
await page.locator('#c').screenshot({ path: path.join(OUT, '00-reposo.png'), omitBackground: true })
// arrastre horizontal manteniendo el puntero abajo
for (const dx of [0.15, 0.3, 0.45, 0.6, 0.9]) {
  await page.evaluate(async (dx) => { const c = window.ch(); const t = () => performance.now()/1000; c.pointer(E.PointerPhase.Down, 1, 0.5, 0.5, t()); for (let i=1;i<=20;i++){ c.pointer(E.PointerPhase.Move, 1, 0.5 + dx*i/20, 0.5, t()); await sleep(16) } }, dx)
  await page.waitForTimeout(500)
  await page.locator('#c').screenshot({ path: path.join(OUT, `drag-${String(Math.round(dx*100)).padStart(3,'0')}.png`), omitBackground: true })
  await page.evaluate(() => { const c = window.ch(); c.pointer(E.PointerPhase.Up, 1, 0.5, 0.5, performance.now()/1000) })
  await page.waitForTimeout(1200)
}
// arrastre fuera del canvas (x>1) por si el giro escala con la distancia
await page.evaluate(async () => { const c = window.ch(); const t = () => performance.now()/1000; c.pointer(E.PointerPhase.Down, 2, 0.5, 0.5, t()); for (let i=1;i<=40;i++){ c.pointer(E.PointerPhase.Move, 2, 0.5 + 2.0*i/40, 0.5, t()); await sleep(16) } })
await page.waitForTimeout(500)
await page.locator('#c').screenshot({ path: path.join(OUT, 'drag-200-fuera.png'), omitBackground: true })
// soltar con velocidad (fling)
await page.evaluate(async () => { const c = window.ch(); c.pointer(E.PointerPhase.Up, 2, 2.5, 0.5, performance.now()/1000) })
for (let i=0;i<8;i++){ await page.waitForTimeout(120); await page.locator('#c').screenshot({ path: path.join(OUT, `fling-${i}.png`), omitBackground: true }) }
fs.writeFileSync(path.join(OUT, 'consola.log'), logs.join('\n'))
await close()
