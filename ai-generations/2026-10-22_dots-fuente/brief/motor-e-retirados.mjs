import fs from 'node:fs'; import path from 'node:path'
import { open, savePng } from './motor-harness.mjs'
const M = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-22_dots-fuente/motor'
const W = 800
const { page, close } = await open(W)
const r = await page.evaluate(async () => {
  const C = E.Category; const c = ensure(800); c.setReducedMotion(true)
  const out = {}
  c.restore(engine.presetAppearance('blue_beret'))
  for (const a of engine.catalog(C.Accessory).map(x=>x.id)) if (c.isSelected(C.Accessory, a)) c.select(C.Accessory, a)
  c.select(C.Eyewear,'none'); c.select(C.Shape,'capsule'); c.select(C.Color,'teal'); c.select(C.Accessory,'beanie')
  await settle(10)
  const st = c.state(); const txt = new TextDecoder('latin1').decode(st)
  out.len = st.length; out.header = txt.slice(0, 8); out.hasBeanie = txt.indexOf('beanie')
  // formas que aceptan round_inset
  out.roundInset = engine.catalog(C.Shape).map(s => s.id).filter(s => { const t = engine.normalizeAppearance(c.state()); return true })
  // intento: sustituir 'beanie' por 'antennae' en una copia (mismo largo no; se prueba validación)
  const enc = new TextEncoder()
  const i = out.hasBeanie
  if (i >= 0) {
    const a = Array.from(st.slice(0, i)), b = Array.from(st.slice(i + 6))
    // si el byte anterior es la longitud del string, se ajusta
    const pre = a[a.length - 1]
    const cand = []
    cand.push(Uint8Array.from([...a, ...enc.encode('antennae'), ...b]))
    if (pre === 6) { const a2 = a.slice(0, -1).concat([8]); cand.push(Uint8Array.from([...a2, ...enc.encode('antennae'), ...b])) }
    out.bytes = Array.from(st)
    for (let k = 1; k <= 4; k++) if (a[a.length - k] === 6) { const a3 = a.slice(); a3[a3.length - k] = 8; const s3 = Uint8Array.from([...a3, ...enc.encode('antennae'), ...b]); cand.push(s3)
      for (let h = 8; h < 16; h++) if (s3[h] === st.length) { const s4 = s3.slice(); s4[h] = s3.length; cand.push(s4) } }
    out.tries = cand.map(s => engine.validateAppearance(s) || 'VALIDO')
    const ok = cand.find(s => !engine.validateAppearance(s))
    if (ok) { const er = c.restore(ok); await settle(10); out.restore = er || 'ok'; const px = c.captureNeutral(800, 800, 1); if (px) out.png = b64(px) }
    out.preByte = pre
  }
  return out
})
if (r.png) { await savePng(r.png, W, path.join(M, 'ocultos', 'dots-accesorio-retirado-antenas-antennae.png')); delete r.png }
console.log(JSON.stringify(r))
await close()
