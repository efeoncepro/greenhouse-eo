import fs from 'node:fs'; import path from 'node:path'
import { open, savePng } from './motor-harness.mjs'
const OUT = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-22_dots-fuente/motor/giros/prueba2'
fs.mkdirSync(OUT, { recursive: true })
const SIZE = 600
const { page, logs, close } = await open(SIZE)
await page.evaluate(async (s) => {
  const c = ensure(s); c.setReducedMotion(false); c.restore(engine.presetAppearance('blue_beret')); await settle(30)
  const cv = document.createElement('canvas'); cv.width = s; cv.height = s; const g = cv.getContext('2d', { willReadFrequently: true })
  window.T = 1000 // reloj sintético en segundos
  window.step = (dt=1/60) => { window.T += dt; c.render(window.T) }
  window.grab = () => { g.clearRect(0,0,s,s); g.drawImage(document.getElementById('c'),0,0); return window.b64(new Uint8Array(g.getImageData(0,0,s,s).data.buffer)) }
  for (let i=0;i<60;i++) step()
}, SIZE)
const frames = await page.evaluate(async () => {
  const c = window.ch(); const out = []
  c.pointer(E.PointerPhase.Down, 1, 0.5, 0.5, T)
  for (let i=1;i<=90;i++){ const x = 0.5 + 0.45*Math.min(1,i/30); c.pointer(E.PointerPhase.Move, 1, x, 0.5, T); step(); if (i%10===0) out.push(['der-'+i, grab()]) }
  c.pointer(E.PointerPhase.Up, 1, 0.95, 0.5, T)
  for (let i=1;i<=60;i++){ step(); if (i%15===0) out.push(['suelta-'+i, grab()]) }
  c.pointer(E.PointerPhase.Down, 2, 0.5, 0.5, T)
  for (let i=1;i<=60;i++){ const x = 0.5 - 0.45*Math.min(1,i/30); c.pointer(E.PointerPhase.Move, 2, x, 0.5, T); step(); if (i%20===0) out.push(['izq-'+i, grab()]) }
  for (let i=1;i<=60;i++){ const x = 0.05 - 1.5*Math.min(1,i/30); c.pointer(E.PointerPhase.Move, 2, x, 0.5, T); step(); if (i%20===0) out.push(['izq-lejos-'+i, grab()]) }
  c.pointer(E.PointerPhase.Up, 2, -1, 0.5, T)
  c.pointer(E.PointerPhase.Down, 3, 0.5, 0.5, T)
  for (let i=1;i<=60;i++){ const y = 0.5 - 0.45*Math.min(1,i/30); c.pointer(E.PointerPhase.Move, 3, 0.5, y, T); step(); if (i%30===0) out.push(['arriba-'+i, grab()]) }
  c.pointer(E.PointerPhase.Up, 3, 0.5, 0.05, T)
  return out
})
for (const [n, b] of frames) await savePng(b, SIZE, path.join(OUT, n + '.png'))
console.log(frames.length, 'cuadros'); await close()
