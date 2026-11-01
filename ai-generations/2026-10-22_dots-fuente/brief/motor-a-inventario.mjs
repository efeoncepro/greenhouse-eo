import fs from 'node:fs'; import path from 'node:path'
import { open } from './motor-harness.mjs'
const OUT = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-22_dots-fuente/motor'
const { page, logs, close } = await open(512)
const candidates = { Shape: ['crested_rounded_cube','round_head_small_lobes','hexagon','star','cloud','frog'], Color: ['light_yellow','charcoal','brown','white','black','green','red','orange'], Eyes: ['frog','pupils','tuft'], Eyewear: ['round_frames','aviators'], Accessory: ['antennae','antenna','headphones_starlight','jojo_heart','bulb','tuft','bow_tie','orb_crown'] }
const r = await page.evaluate(async (candidates) => {
  const e = engine, E = window.E
  const out = { presetPage: e.presetPage({ offset: 0, limit: 100 }).totalCount, curatedVersion: e.curatedRandomizerVersion(), retired: {}, accessoryColorsFor: {} }
  for (const [cat, ids] of Object.entries(candidates)) for (const id of ids) { const it = e.findSupportedItem(E.Category[cat], id); if (it) out.retired[cat + ':' + id] = it }
  for (const a of e.catalog(E.Category.Accessory).concat(Object.keys(out.retired).filter(k=>k.startsWith('Accessory:')).map(k=>({id:k.split(':')[1]})))) out.accessoryColorsFor[a.id] = e.accessoryColorsFor(a.id).map(c=>c.id)
  out.fs = {}
  const tryRead = (p) => { try { return window.b64(e.FS.readFile(p)) } catch { return null } }
  for (const p of ['/orbit/reference-characters.json','/orbit/native-resources.json','/orbit/index.json']) out.fs[p] = tryRead(p)
  const studio = []
  for (const g of ['accessories','eyes','eyewear','shapes','colors','characters']) for (const n of ['beanie','beret','bow','crown','hat','headphones','orb','three_lobe','antennae','crescent_inset','dots','double_highlights','highlight_capsules','oval','round_inset','sleepy_lids','sparkle_capsules','swept_lids','classic_sunglasses','monocle','round_sunglasses','separate_trapezoid_lenses','tall_oval_frames']) { const p = `/orbit/renders/studio/${g}/${n}@3x.png`; const b = tryRead(p); if (b) studio.push([p, b]) }
  out.studio = studio
  try { out.fsRoot = e.FS.readdir ? e.FS.readdir('/orbit') : 'sin readdir' } catch (err) { out.fsRoot = String(err) }
  return out
}, candidates)
for (const [p, b] of r.studio) { fs.writeFileSync(path.join(OUT, 'studio-renders', p.split('/').slice(-2).join('-')), Buffer.from(b, 'base64')) }
for (const [p, b] of Object.entries(r.fs)) if (b) fs.writeFileSync(path.join(OUT, path.basename(p)), Buffer.from(b, 'base64'))
delete r.studio; r.fs = Object.fromEntries(Object.entries(r.fs).map(([k,v]) => [k, v ? 'leído' : null]))
fs.writeFileSync(path.join(OUT, 'motor-meta.json'), JSON.stringify(r, null, 2))
console.log(JSON.stringify(r, null, 1).slice(0, 4000))
await close()
