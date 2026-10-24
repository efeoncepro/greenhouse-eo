/**
 * TASK-2054 — Gate visual de la presentación `inline_pill` contra el canvas aprobado (portada del blog v3).
 *
 * Qué hace, sin tocar la base, el sitio ni ningún deploy:
 *   1. Bundlea el renderer del árbol actual con la misma configuración de `renderer:build`, pero en una
 *      carpeta temporal (nunca escribe `public/growth-forms/`).
 *   2. Extrae el canvas congelado (`fuente-canvas-2026-10-24.tar.gz`) a una carpeta temporal FUERA del repo
 *      (Tailwind escanea el repo) y arma la referencia con el CSS y el marcado literales del canvas
 *      (`.gxs`, `.gxs--ev` dentro de `.evx`), aplicando los cinco estados por clase.
 *   3. Monta el `<greenhouse-form>` real con los contratos fixture (`glitchInlinePillContractFixture`,
 *      `eventInlinePillContractFixture`), la API pública simulada con `page.route` y la piel de anfitrión
 *      `inline-pill-host-skin.css` (sólo tokens), y recorre los estados con interacciones reales.
 *   4. Captura reposo, abierto, enviando, éxito y listo a 1440 y 390 (markers `data-capture`
 *      `ghf-inline-<estado>`), compara con pixelmatch (umbral 0,1; presupuesto 1 %) y deja un diff por estado.
 *   5. Verifica teclado (Tab, Enter, foco al campo, Esc, foco de vuelta), movimiento reducido, scroll
 *      horizontal a 390 y axe (WCAG 2.2 AA) en abierto y listo.
 *   6. Con `--baseline-rev <rev>` además bundlea el renderer de esa revisión y compara formularios estándar
 *      (fixtures del repo + contratos públicos vivos si `--live`) píxel a píxel: deben dar 0 px.
 *
 *   node scripts/growth/forms/fixtures/inline-pill.scenario.mjs --out .captures/2026-10-24-inline-pill \
 *     [--baseline-rev a0ccb79a4] [--live]
 *
 * Las transiciones se congelan para capturar estados finales (el movimiento se evidencia aparte con el GIF);
 * el cursor del campo se vuelve transparente para que el parpadeo no cambie píxeles.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

import { build } from 'esbuild'
import { chromium } from 'playwright'

const require = createRequire(import.meta.url)
const pixelmatchModule = require('pixelmatch')

const pixelmatch = typeof pixelmatchModule === 'function' ? pixelmatchModule : pixelmatchModule.default
const { PNG } = require('pngjs')

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../../../..')

const arg = (flag, fallback) => {
  const index = process.argv.indexOf(flag)

  return index >= 0 ? process.argv[index + 1] : fallback
}

const OUT = resolve(repoRoot, arg('--out', '.captures/2026-10-24-inline-pill'))
const BASELINE_REV = arg('--baseline-rev', null)
const LIVE = process.argv.includes('--live')
const CANVAS_TAR = resolve(repoRoot, arg('--canvas-tar', 'docs/ui/visual-directions/TASK-2051-blog-portada-v3/fuente-canvas-2026-10-24.tar.gz'))
const BUDGET = 0.01
const API_BASE = 'https://gh.test'
const STATES = ['idle', 'open', 'loading', 'success', 'done']

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900, board: 'Portada-v3.dc.html', root: 'v3', container: 600, box: 104 },
  { name: '390', width: 390, height: 844, board: 'Movil-v3.dc.html', root: 'm3', container: 342, box: 124 }
]

const TYPED_EMAIL = 'ana@empresa.com'
const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap">'
const FREEZE = '*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}'

mkdirSync(OUT, { recursive: true })
const work = mkdtempSync(join(tmpdir(), 'ghf-inline-pill-'))

// ─── 1. Bundles ──────────────────────────────────────────────────────────────

const bundle = async (srcRoot, outfile) => {
  await build({
    entryPoints: [join(srcRoot, 'growth-forms-renderer/index.ts')],
    bundle: true,
    format: 'iife',
    alias: { '@': srcRoot },
    target: ['es2021'],
    minify: true,
    legalComments: 'none',
    outfile,
    logLevel: 'silent'
  })

  return readFileSync(outfile, 'utf8')
}

const currentBundle = await bundle(join(repoRoot, 'src'), join(work, 'renderer-current.js'))

const fixturesModule = join(work, 'fixtures.mjs')

await build({
  entryPoints: [join(repoRoot, 'src/growth-forms-renderer/fixtures.ts')],
  bundle: true,
  format: 'esm',
  alias: { '@': join(repoRoot, 'src') },
  outfile: fixturesModule,
  logLevel: 'silent'
})

const fixtures = await import(pathToFileURL(fixturesModule).href)

const PILLS = [
  { id: 'glitch', prefix: 'gx', marker: 'class="gxs {{', skin: 'eo-inline-pill--glitch', contract: fixtures.glitchInlinePillContractFixture() },
  { id: 'event', prefix: 'ev', marker: 'class="gxs gxs--ev', skin: 'eo-inline-pill--event', contract: fixtures.eventInlinePillContractFixture() }
]

// ─── 2. Referencia: canvas literal ───────────────────────────────────────────

const canvasDir = join(work, 'canvas')

mkdirSync(canvasDir, { recursive: true })
execFileSync('tar', ['-xzf', CANVAS_TAR, '-C', canvasDir])

const boardSource = name => readFileSync(join(canvasDir, 'project', name), 'utf8')

const canvasCss = html => {
  const start = html.indexOf('<style>')
  const end = html.indexOf('</style>', start)

  return html.slice(start + '<style>'.length, end)
}

/** Bloque `.gxw` que contiene la píldora indicada por `marker`, literal del canvas. */
const canvasPillBlock = (html, marker) => {
  const at = html.indexOf(marker)
  const start = html.lastIndexOf('<div class="gxw"', at)
  const noteEnd = html.indexOf('</p>', html.indexOf('gxs__note', at))
  const end = html.indexOf('</div>', noteEnd) + '</div>'.length

  return html.slice(start, end).replace(/<div class="gxw"[^>]*>/, '<div class="gxw">')
}

const stateBindings = (prefix, state) => {
  const reachable = state === 'open' || state === 'loading'

  return {
    [`${prefix}Cls`]: `is-${state}`,
    [`${prefix}Exp`]: state === 'idle' ? 'false' : 'true',
    [`${prefix}TabOpen`]: state === 'idle' ? '0' : '-1',
    [`${prefix}HideOpen`]: state === 'idle' ? 'false' : 'true',
    [`${prefix}TabForm`]: reachable ? '0' : '-1',
    [`${prefix}HideForm`]: reachable ? 'false' : 'true',
    [`${prefix}BusyAria`]: state === 'loading' ? 'true' : 'false',
    [`${prefix}Load`]: state === 'loading' ? 'is-loading' : ''
  }
}

const bindCanvasBlock = (block, prefix, state) => {
  const values = stateBindings(prefix, state)

  return block
    .replace(/\son[A-Z][A-Za-z]*="\{\{[^}]*\}\}"/g, '')
    .replace(/\{\{\s*([A-Za-z]+)\s*\}\}/g, (_match, key) => {
      if (!(key in values)) throw new Error(`binding sin valor en el canvas: ${key}`)

      return values[key]
    })
}

const shell = (body, head) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Formulario en línea · fixture</title><meta name="viewport" content="width=device-width, initial-scale=1">${FONTS}${head}</head><body>${body}</body></html>`

const referencePage = (viewport, pill, state) => {
  const html = boardSource(viewport.board)
  const block = bindCanvasBlock(canvasPillBlock(html, pill.marker), pill.prefix, state)
  const content = pill.id === 'event' ? `<div class="evx" style="display:block;margin:0;border-radius:0;overflow:visible"><div class="evcta" style="margin-top:0">${block}</div></div>` : block

  return shell(
    `<div class="${viewport.root}" style="width:auto;height:auto;overflow:visible;background:#001a33;color:#ffffff;font-family:'Poppins',system-ui,sans-serif"><div data-capture="ghf-inline-${state}" style="box-sizing:content-box;width:${viewport.container}px;height:${viewport.box}px;padding:24px;background:#001a33">${content}</div></div>`,
    `<style>${canvasCss(html)}</style><style>${FREEZE} body{margin:0;background:#001a33}</style>`
  )
}

// ─── 3. Candidata: <greenhouse-form> real ────────────────────────────────────

const hostSkin = readFileSync(join(here, 'inline-pill-host-skin.css'), 'utf8')

const candidatePage = (viewport, pill, rendererJs, { freeze = true } = {}) =>
  shell(
    `<div data-capture="ghf-inline-idle" style="box-sizing:content-box;width:${viewport.container}px;height:${viewport.box}px;padding:24px;background:#001a33"><greenhouse-form class="eo-inline-pill ${pill.skin}" form-key="${pill.contract.form.formKey}" base-url="${API_BASE}" locale="es-CL" color-scheme="dark" appearance="bare"><a href="#suscripcion">Suscríbete más abajo</a></greenhouse-form></div><script>${rendererJs}</script>`,
    `<style>${hostSkin}</style><style>${freeze ? FREEZE : ''} body{margin:0;background:#001a33}</style>`
  )

const routeApi = async (page, contract, { submitDelayMs = 0 } = {}) => {
  let release = () => {}
  const gate = new Promise(resolveGate => (release = resolveGate))

  await page.route(`${API_BASE}/api/public/growth/forms/**`, async route => {
    const url = route.request().url()

    if (url.endsWith('/submit')) {
      if (submitDelayMs < 0) await gate
      else if (submitDelayMs > 0) await new Promise(r => setTimeout(r, submitDelayMs))

      return route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ outcome: 'accepted', submissionId: 'fsub-fixture', registrationStatus: 'confirmed' }) })
    }

    if (url.endsWith('/verify-email')) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })

    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(contract) })
  })

  return release
}

// ─── Utilidades de comparación ───────────────────────────────────────────────

const compare = (referenceFile, candidateFile, diffFile) => {
  const a = PNG.sync.read(readFileSync(referenceFile))
  const b = PNG.sync.read(readFileSync(candidateFile))

  if (a.width !== b.width || a.height !== b.height) {
    return { verdict: 'SIZE', reference: `${a.width}x${a.height}`, candidate: `${b.width}x${b.height}` }
  }

  const diff = new PNG({ width: a.width, height: a.height })
  const pixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 })
  const share = pixels / (a.width * a.height)

  if (pixels) writeFileSync(diffFile, PNG.sync.write(diff))

  return { verdict: share <= BUDGET ? 'PASS' : 'FAIL', diffPixels: pixels, diffShare: Number((share * 100).toFixed(3)), size: `${a.width}x${a.height}` }
}

const setMarker = (page, state) => page.evaluate(s => document.querySelector('[data-capture]').setAttribute('data-capture', `ghf-inline-${s}`), state)
const shot = (page, file) => page.locator('[data-capture]').screenshot({ path: file, animations: 'disabled' })
const pillState = page => page.locator('[data-ghf-part="inline-pill"]').getAttribute('data-ghf-inline-state')
const waitState = (page, state) => page.waitForFunction(s => document.querySelector('[data-ghf-part="inline-pill"]')?.getAttribute('data-ghf-inline-state') === s, state)

// ─── 4. Capturas y comparación ───────────────────────────────────────────────

const browser = await chromium.launch()
const report = { generatedAt: new Date().toISOString(), budget: BUDGET, fidelity: [], keyboard: [], reducedMotion: [], scrollWidth: [], axe: [], liveForms: [] }
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')

for (const viewport of VIEWPORTS) {
  for (const pill of PILLS) {
    const base = `${pill.id}-${viewport.name}`

    // Referencia: una página por estado.
    const refContext = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 })
    const refPage = await refContext.newPage()

    for (const state of STATES) {
      const referenceHtml = referencePage(viewport, pill, state)

      writeFileSync(join(OUT, `${base}-${state}.reference.html`), referenceHtml)
      await refPage.setContent(referenceHtml, { waitUntil: 'networkidle' })
      await refPage.evaluate(() => document.fonts.ready)

      if (state === 'open' || state === 'loading') {
        await refPage.evaluate(({ value, typed }) => {
          const input = document.querySelector('.gxs__form input')

          if (typed) input.value = value
          input.focus({ preventScroll: true })
        }, { value: TYPED_EMAIL, typed: state === 'loading' })
      }

      await shot(refPage, join(OUT, `${base}-${state}.reference.png`))
    }

    await refContext.close()

    // Candidata: un solo montaje recorriendo los estados con interacción real.
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 })
    const page = await context.newPage()
    const release = await routeApi(page, pill.contract, { submitDelayMs: -1 })

    await page.setContent(candidatePage(viewport, pill, currentBundle), { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-ghf-part="inline-pill"]')
    await page.evaluate(() => document.fonts.ready)

    await setMarker(page, 'idle')
    await shot(page, join(OUT, `${base}-idle.candidate.png`))

    await page.click('[data-ghf-part="inline-open"]')
    await page.mouse.move(0, 0)
    await page.waitForFunction(() => document.activeElement?.matches('[data-ghf-part="inline-input"]'))
    await setMarker(page, 'open')
    await shot(page, join(OUT, `${base}-open.candidate.png`))

    await page.keyboard.type(TYPED_EMAIL)
    await page.keyboard.press('Enter')
    await waitState(page, 'loading')
    await setMarker(page, 'loading')
    await shot(page, join(OUT, `${base}-loading.candidate.png`))

    release()
    await waitState(page, 'success')
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur())
    await setMarker(page, 'success')
    await shot(page, join(OUT, `${base}-success.candidate.png`))

    await waitState(page, 'done')
    await setMarker(page, 'done')
    await shot(page, join(OUT, `${base}-done.candidate.png`))

    if (viewport.name === '390') {
      report.scrollWidth.push({ pill: pill.id, ...(await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }))) })
    }

    await context.close()

    for (const state of STATES) {
      report.fidelity.push({
        pill: pill.id,
        viewport: viewport.name,
        state,
        ...compare(join(OUT, `${base}-${state}.reference.png`), join(OUT, `${base}-${state}.candidate.png`), join(OUT, `${base}-${state}.diff.png`))
      })
    }
  }
}

// ─── 5. Teclado, movimiento reducido, axe ────────────────────────────────────

for (const pill of PILLS) {
  const viewport = VIEWPORTS[0]
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } })
  const page = await context.newPage()

  await routeApi(page, pill.contract, { submitDelayMs: 300 })
  await page.setContent(candidatePage(viewport, pill, currentBundle, { freeze: false }), { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-ghf-part="inline-pill"]')

  const active = () => page.evaluate(() => document.activeElement?.getAttribute('data-ghf-part') ?? document.activeElement?.tagName ?? null)

  await page.keyboard.press('Tab')
  const tabStop = await active()

  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  const afterEnter = { state: await pillState(page), focus: await active() }

  await page.addScriptTag({ content: axeSource })
  report.axe.push({ pill: pill.id, state: 'open', violations: await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => `${n.target.join(' ')} — ${n.any?.[0]?.message ?? n.failureSummary ?? ''}`) }))) })

  await page.keyboard.press('Escape')
  await page.waitForTimeout(150)
  const afterEscape = { state: await pillState(page), focus: await active() }

  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  await page.keyboard.type(TYPED_EMAIL)
  await page.keyboard.press('Escape')
  const escapeWithText = await pillState(page)

  await page.keyboard.press('Enter')
  await waitState(page, 'success')
  const afterSubmit = { state: await pillState(page), focus: await active() }

  await waitState(page, 'done')
  await page.waitForTimeout(600) // fin de los fundidos antes de medir contraste
  report.axe.push({ pill: pill.id, state: 'done', violations: await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => `${n.target.join(' ')} — ${n.any?.[0]?.message ?? n.failureSummary ?? ''}`) }))) })

  report.keyboard.push({ pill: pill.id, tabStop, afterEnter, afterEscape, escapeWithText, afterSubmit })
  await context.close()

  const reduced = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' })
  const reducedPage = await reduced.newPage()

  await routeApi(reducedPage, pill.contract)
  await reducedPage.setContent(candidatePage(viewport, pill, currentBundle, { freeze: false }), { waitUntil: 'networkidle' })
  await reducedPage.waitForSelector('[data-ghf-part="inline-pill"]')
  await reducedPage.click('[data-ghf-part="inline-open"]')

  const computed = await reducedPage.evaluate(() => {
    const pillNode = document.querySelector('[data-ghf-part="inline-pill"]')
    const style = getComputedStyle(pillNode)

    return { transitionDuration: style.transitionDuration, animationName: style.animationName, width: pillNode.getBoundingClientRect().width }
  })

  await reducedPage.waitForTimeout(300)
  await reducedPage.locator('[data-capture]').screenshot({ path: join(OUT, `${pill.id}-1440-open.reduced-motion.png`) })
  report.reducedMotion.push({ pill: pill.id, ...computed })
  await reduced.close()
}

// ─── 5b. Movimiento: video (y GIF si hay ffmpeg) de la secuencia completa ─────

if (process.argv.includes('--motion')) {
  for (const viewport of VIEWPORTS) {
    for (const pill of PILLS) {
      const videoDir = join(work, `video-${pill.id}-${viewport.name}`)
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, recordVideo: { dir: videoDir, size: { width: viewport.width, height: viewport.height } } })
      const page = await context.newPage()

      // Misma latencia que la simulación del canvas (1,1 s de envío).
      await routeApi(page, pill.contract, { submitDelayMs: 1100 })
      await page.setContent(candidatePage(viewport, pill, currentBundle, { freeze: false }).replace(/caret-color:transparent!important/, ''), { waitUntil: 'networkidle' })
      await page.waitForSelector('[data-ghf-part="inline-pill"]')
      await page.waitForTimeout(600)
      await page.click('[data-ghf-part="inline-open"]')
      await page.waitForTimeout(700)
      await page.keyboard.type(TYPED_EMAIL, { delay: 45 })
      await page.waitForTimeout(300)
      await page.keyboard.press('Enter')
      await waitState(page, 'done')
      await page.waitForTimeout(1200)

      const video = page.video()

      await context.close()

      const webm = join(OUT, `${pill.id}-${viewport.name}-sequence.webm`)

      await video.saveAs(webm)

      try {
        const clipWidth = viewport.container + 48
        const gif = join(OUT, `${pill.id}-${viewport.name}-sequence.gif`)

        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-vf', `crop=${clipWidth}:${viewport.box + 48}:0:0,fps=20,split[a][b];[a]palettegen[p];[b][p]paletteuse`, gif])
      } catch (error) {
        report.motion = [...(report.motion ?? []), { pill: pill.id, viewport: viewport.name, gif: 'no generado', error: String(error).slice(0, 200) }]
      }
    }
  }
}

// ─── 6. Formularios estándar: 0 px contra la revisión base ───────────────────

if (BASELINE_REV) {
  const baselineSrc = join(work, 'baseline')

  mkdirSync(baselineSrc, { recursive: true })
  execFileSync('sh', ['-c', `git -C "${repoRoot}" archive ${BASELINE_REV} src | tar -x -C "${baselineSrc}"`])
  const baselineBundle = await bundle(join(baselineSrc, 'src'), join(work, 'renderer-baseline.js'))

  const contracts = [
    ['fixture-static', fixtures.staticContractFixture()],
    ['fixture-conditional', fixtures.conditionalContractFixture()],
    ['fixture-success-card', fixtures.successCardContractFixture()],
    ['fixture-multi-step', fixtures.multiStepContractFixture()],
    ['fixture-partner', fixtures.partnerApplicationContractFixture()]
  ]

  if (LIVE) {
    for (const slug of ['efeonce-media-diagnostic', 'efeonce-inbound-diagnostic', 'efeonce-hubspot-scope', 'efeonce-aeo-diagnostic']) {
      try {
        const response = await fetch(`https://greenhouse.efeoncepro.com/api/public/growth/forms/${slug}`, { headers: { accept: 'application/json' } })

        if (response.ok) contracts.push([`live-${slug}`, await response.json()])
        else report.liveForms.push({ slug, verdict: 'UNAVAILABLE', status: response.status })
      } catch (error) {
        report.liveForms.push({ slug, verdict: 'UNAVAILABLE', error: String(error) })
      }
    }
  }

  const standardPage = (rendererJs, contract) =>
    shell(
      `<div data-capture="standard" style="width:640px;max-width:100%;padding:0"><greenhouse-form form-key="${contract.form.formKey}" base-url="${API_BASE}" locale="${contract.form.locale}" color-scheme="light"></greenhouse-form></div><script>${rendererJs}</script>`,
      `<style>${FREEZE} body{margin:0;background:#ffffff}</style>`
    )

  for (const width of [1440, 390]) {
    for (const [name, contract] of contracts) {
      const files = {}

      for (const [label, js] of [['baseline', baselineBundle], ['current', currentBundle]]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })
        const page = await context.newPage()

        await routeApi(page, contract)
        await page.setContent(standardPage(js, contract), { waitUntil: 'networkidle' })
        await page.waitForSelector('greenhouse-form .ghf-form, greenhouse-form .ghf-status')
        await page.waitForTimeout(150)
        files[label] = join(OUT, `standard-${name}-${width}.${label}.png`)
        await page.locator('[data-capture]').screenshot({ path: files[label] })
        await context.close()
      }

      report.liveForms.push({ form: name, width, ...compare(files.baseline, files.current, join(OUT, `standard-${name}-${width}.diff.png`)) })
    }
  }
}

await browser.close()

writeFileSync(join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
console.table(report.fidelity.map(row => ({ pill: row.pill, viewport: row.viewport, state: row.state, verdict: row.verdict, diff: row.diffShare ?? row.reference })))
if (report.liveForms.length) console.table(report.liveForms)
console.log(JSON.stringify({ keyboard: report.keyboard, reducedMotion: report.reducedMotion, scrollWidth: report.scrollWidth, axe: report.axe }, null, 2))

const failed = report.fidelity.filter(row => row.verdict !== 'PASS').length + report.liveForms.filter(row => row.verdict && row.verdict !== 'PASS' && row.verdict !== 'UNAVAILABLE').length

console.log(failed ? `FALLA: ${failed} comparaciones fuera de presupuesto` : 'OK: todas las comparaciones dentro de presupuesto')
process.exit(failed ? 1 : 0)
