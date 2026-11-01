import fs from 'node:fs'; import path from 'node:path'
import { open, savePng } from './motor-harness.mjs'
const M = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-22_dots-fuente/motor'
const W = 800
const { page, logs, close } = await open(W)
const res = await page.evaluate(async () => { ensure(800).setReducedMotion(true); return true })
// base limpia: restaura un preset y quita lentes/accesorios
const make = async (spec) => page.evaluate(async ({ spec, W }) => {
  const c = ch(); const C = E.Category
  const err0 = c.restore(spec.base ? engine.presetAppearance(spec.base) : engine.generateCuratedAppearance(BigInt(spec.seed)))
  if (err0) return { error: 'restore ' + err0 }
  if (spec.clean) {
    for (const a of engine.catalog(C.Accessory).map(x=>x.id).concat(['antennae'])) if (c.isSelected(C.Accessory, a)) c.select(C.Accessory, a)
    c.select(C.Eyewear, 'none')
  }
  const ok = {}
  for (const [cat, id] of spec.sel || []) ok[cat+':'+id] = c.select(C[cat], id)
  if (spec.accColor) ok['color:' + spec.accColor.join('=')] = c.setAccessoryColor(spec.accColor[0], spec.accColor[1])
  const e = await settle(10); if (e) return { error: e, ok }
  const b = neutral(W); return b ? { b, ok } : { error: 'neutral null', ok }
}, { spec, W })
const jobs = []
const shapes = ['circle','rounded_triangle','capsule','rounded_head_two_ears','six_lobed_flower','heart','four_lobed_butterfly','circle_two_ears','twelve_scalloped_rosette','rounded_cube','rounded_diamond']
const colors = ['pink','orchid','violet','blue','cyan','teal','lime','yellow','coral']
shapes.forEach((s, i) => colors.forEach(col => jobs.push([`formas/forma-${String(i+1).padStart(2,'0')}-${s}-${col}.png`, { base: 'blue_beret', clean: true, sel: [['Shape', s], ['Color', col], ['Eyes', 'oval']] }])))
const eyes = ['swept_lids','oval','sparkle_capsules','highlight_capsules','dots','double_highlights','round_inset','crescent_inset','sleepy_lids']
eyes.forEach((e, i) => jobs.push([`piezas/ojos-${String(i+1).padStart(2,'0')}-${e}.png`, { base: 'blue_beret', clean: true, sel: [['Shape','capsule'],['Color','teal'],['Eyes', e]] }]))
const wear = ['monocle','tall_oval_frames','separate_trapezoid_lenses','classic_sunglasses','round_sunglasses']
wear.forEach((e, i) => jobs.push([`piezas/lentes-${String(i+1).padStart(2,'0')}-${e}.png`, { base: 'blue_beret', clean: true, sel: [['Shape','capsule'],['Color','teal'],['Eyes','oval'],['Eyewear', e]] }]))
const acc = ['headphones','bow','beanie','hat','beret','orb','three_lobe','crown','antennae']
acc.forEach((e, i) => jobs.push([`piezas/accesorio-${String(i+1).padStart(2,'0')}-${e}${e==='antennae'?'-RETIRADO':''}.png`, { base: 'blue_beret', clean: true, sel: [['Shape','capsule'],['Color','teal'],['Eyes','oval'],['Accessory', e]] }]))
for (const col of ['pink','orchid','violet','blue','cyan','teal','lime','yellow','coral','charcoal','brown']) jobs.push([`piezas/color-utileria-beanie-${col}.png`, { base: 'blue_beret', clean: true, sel: [['Shape','capsule'],['Color','yellow'],['Eyes','oval'],['Accessory','beanie']], accColor: ['beanie', col] }])
for (let s = 1; s <= 24; s++) jobs.push([`curados/curado-semilla-${String(s).padStart(2,'0')}.png`, { seed: s * 7919 }])
const report = []
for (const [file, spec] of jobs) {
  const r = await make(spec)
  if (r.error) { report.push({ file, error: r.error, ok: r.ok }); console.log('✗', file, r.error); continue }
  await savePng(r.b, W, path.join(M, file)); report.push({ file, ok: r.ok })
  if (Object.values(r.ok).includes(false)) console.log('⚠', file, JSON.stringify(r.ok))
}
fs.writeFileSync(path.join(M, 'catalogo-renders.json'), JSON.stringify(report, null, 1))
console.log('listo', report.filter(r=>!r.error).length, '/', jobs.length)
await close()
