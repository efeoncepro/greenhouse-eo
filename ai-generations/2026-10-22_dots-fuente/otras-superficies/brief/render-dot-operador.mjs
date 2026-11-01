// Renderiza el dot del operador («Friday») con el motor orbit-character sin modificar.
// La apariencia se reconstruye desde el manifiesto público cacheado por Codex (sin tokens ni URLs firmadas).
import fs from 'node:fs'; import path from 'node:path'
import { open, savePng } from '../../brief/motor-harness.mjs'
const OUT = process.argv[2]; const SIZE = 1600
const man = JSON.parse(fs.readFileSync(path.join(OUT, '..', 'dot-del-operador.json'), 'utf8')).appearance
const { page, logs, close } = await open(SIZE)
const r = await page.evaluate(async ({ man, SIZE }) => {
  const c = ensure(SIZE); c.setReducedMotion(true)
  const ok = c.selectHereCharacter(man.hereCharacter.id); await settle(30)
  const want = [[E.Category.Shape, man.shape], [E.Category.Color, man.color], [E.Category.Eyes, man.eyes], [E.Category.Eyewear, man.eyewear], ...man.accessories.map(a => [E.Category.Accessory, a])]
  const sel = want.map(([k, id]) => [k, id, c.isSelected(k, id)])
  for (const [k, id, s] of sel) if (!s) c.select(k, id)
  c.setDepth(man.depth); await settle(30)
  const st = c.state(); const pre = engine.presetAppearance(man.hereCharacter.id)
  const igual = st.length === pre.length && st.every((b, i) => b === pre[i])
  const front = neutral(SIZE)
  return { ok, sel, igual, err: c.error(), front, stateB64: b64(st) }
}, { man, SIZE })
await savePng(r.front, SIZE, path.join(OUT, 'friday-frente-neutro-1600.png'))
fs.writeFileSync(path.join(OUT, 'friday-estado-orbast1.b64'), r.stateB64)
// Reacción «firma»: el giro hacia tres cuartos que da el motor
await page.evaluate(async () => { const c = ch(); c.setReducedMotion(false); startLoop() })
await page.waitForTimeout(800)
const res = await page.evaluate(() => ch().playReaction(E.ReactionKind.Signature))
for (let i = 0; i < 16; i++) { await page.waitForTimeout(110); await page.locator('#c').screenshot({ path: path.join(OUT, `friday-firma-${String(i + 1).padStart(2, '0')}.png`), omitBackground: true }) }
fs.writeFileSync(path.join(OUT, 'render.json'), JSON.stringify({ selectHere: r.ok, seleccion: r.sel, igualAlPresetAlfred: r.igual, error: r.err, reaccion: res, consola: logs }, null, 2))
console.log(JSON.stringify({ ok: r.ok, igual: r.igual, err: r.err, reaccion: res }))
await close()
