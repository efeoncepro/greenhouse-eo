import fs from 'node:fs'; import path from 'node:path'
import { open, savePng } from './motor-harness.mjs'
const M = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-22_dots-fuente/motor'
const heroes = [['blue_beret','felipe'],['alfred','alfred'],['purple_heart','jojo'],['lime_frog','todd'],['coral_monocle','iris'],['gus','thelma'],['blue_spectacles','josh'],['lime_headphones','iggy']]
const mode = process.argv[2] || 'hd'
if (mode === 'hd') {
  const { page, close } = await open(1024)
  await page.evaluate(() => { ensure(1024).setReducedMotion(true) })
  const sizes = [4096, 3200, 2400]
  for (const [id, name] of heroes) {
    const r = await page.evaluate(async ([id, sizes]) => { const c = ch(); c.restore(engine.presetAppearance(id)); const e = await settle(10); if (e) return { error: e }
      for (const s of sizes) { try { const px = c.captureNeutral(s, s, 1); if (px) return { s, b: b64(px) } } catch (err) { return { error: String(err) } } }
      return { error: 'null en todos los tamaños' } }, [id, sizes])
    if (r.error) { console.log('✗', name, r.error); continue }
    await savePng(r.b, r.s, path.join(M, 'heroes-hd', `dots-heroe-${name}-${r.s}.png`)); console.log('✓', name, r.s)
  }
  await close()
} else {
  const SIZE = 900
  const { page, close } = await open(SIZE)
  const kinds = ['Working','Searching','Creating','Payment','Thinking','NeedsInput','Ready','Paused','Error']
  for (const [id, name] of heroes.slice(0, 4)) {
    const dir = path.join(M, 'actividades', name); fs.mkdirSync(dir, { recursive: true })
    const init = await page.evaluate(async ([id, s]) => {
      if (window.ach) { window.ach.delete() }
      const cv = document.getElementById('c'); const nc = cv.cloneNode(); cv.replaceWith(nc)
      window.ach = new engine.Character('#c', s, s, { activities: true }); const c = window.ach
      c.setQuality(E.Quality.Balanced); c.setActive(true); c.setReducedMotion(false)
      const er = c.restore(engine.presetAppearance(id)); if (er) return er
      window.seq = 0n; window.ep = 0n;
      const bound = c.applyActivity({ command: E.ActivityCommandType.Restore, sequence: 0n, episodeId: 0n, episodeHighWater: 0n, activity: E.ActivityKind.None, outcome: E.ActivityOutcome.Neutral, entry: E.ActivityEntry.Sustained }); if (bound !== 0) return 'bind ' + bound; window.T = performance.now()/1000
      window.arun = async (n) => { for (let i=0;i<n;i++){ window.T += 1/60; c.render(window.T); await sleep(3) } }
      let first=false; c.onFirstFrame(()=>{first=true}); for (let i=0;i<900;i++){ window.T += 1/60; c.render(window.T); await sleep(8); if (first && !c.preparationStats().pending && i>30) break }
      return 'ok ' + c.preparationStats().activityAssetsReady
    }, [id, SIZE])
    console.log(name, init)
    for (const k of kinds) {
      const r = await page.evaluate(async (k) => { const c = window.ach; seq += 1n; ep += 1n
        const res = c.applyActivity({ sequence: seq, episodeId: ep, episodeHighWater: 0n, command: E.ActivityCommandType.Start, activity: E.ActivityKind[k], outcome: E.ActivityOutcome.Neutral, entry: E.ActivityEntry.Start })
        for (let i=0;i<600;i++){ if (!c.preparationStats().pending) break; await arun(1) }
        await arun(100); return res }, k)
      await page.locator('#c').screenshot({ path: path.join(dir, `dots-${name}-actividad-${k.toLowerCase()}.png`), omitBackground: true, timeout: 180000 })
      const stop = await page.evaluate(async (k) => { const c = window.ach; seq += 1n; return c.applyActivity({ sequence: seq, episodeId: ep, episodeHighWater: 0n, command: E.ActivityCommandType.Stop, activity: E.ActivityKind[k], outcome: E.ActivityOutcome.Neutral, entry: E.ActivityEntry.Start }) }, k)
      await page.evaluate(async () => { await arun(60) })
      console.log(' ', k, r, 'stop', stop)
    }
  }
  await close()
}
