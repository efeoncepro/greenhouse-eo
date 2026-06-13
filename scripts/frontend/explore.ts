#!/usr/bin/env tsx
/**
 * Greenhouse Visual Capture — explore mode (TASK-1098, Capa 2/3).
 *
 * Observa la página VIVA y le da al agente lo que necesita para autorar un
 * scenario sin adivinar selectores: el árbol de accesibilidad + candidatos con
 * su `getByRole(...)` sugerido + validación de uniqueness + markers estables +
 * probes opcionales. Es el `spawn → inspect → discard` de microsoft/webwright
 * aplicado a la AUTORÍA. READ-ONLY por construcción (no fill/click/mutación).
 *
 * Reusa la maquinaria canónica de GVC: env + agent auth + bypass + browser
 * lifecycle. La sesión se persiste en `.captures/_explore/<slug>/` para que
 * `fe:capture:promote` la cristalice en un `.scenario.ts` determinístico.
 */

import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import type { Page } from 'playwright'

import { resolveActor } from './lib/audit'
import { assertNotRedirectedToLogin, launchCaptureSession } from './lib/browser'
import { isValidEnv, resolveEnvConfig, type CaptureEnv } from './lib/env'
import {
  detectInteractionTimings,
  interactionName,
  parseAriaSnapshot,
  parseInteractionSpec,
  slugifyRoute,
  type ExploreCandidate,
  type ExploreInteraction,
  type ExploreProbeResult,
  type ExploreSession,
  type InteractionDiffSample
} from './lib/explore'
import { enforceProductionGate } from './lib/safety'
import { compareImages, loadPng } from './lib/visual-diff'


const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '../..')
const EXPLORE_DIR = resolve(REPO_ROOT, '.captures', '_explore')

const PRINT = (msg: string) => console.log(msg)

const HELP_TEXT = `Greenhouse Visual Capture — explore (TASK-1098)

Observá una ruta viva ANTES de autorar un scenario. Read-only.

Uso:
  pnpm fe:capture:explore --route=/path [--env=local|staging|dev-agent] [--ready=<selector>] [--probe='<selector>']…

Opciones:
  --route=<path>     Ruta del portal a explorar (requerido)
  --env=<env>        Target. Default: staging
  --ready=<selector> Selector de readiness a esperar antes de observar
  --probe=<selector> Valida un locator Playwright (role=button[name="X"], CSS, …). Repetible.
  --interaction=<kind>:<selector>  Observa una microinteracción (hover|focus|click — read-only):
                     performa la acción y MIDE los timings reales (before/feedback/settled vía
                     pixel-diff). Repetible. Ej: --interaction 'hover:[role="tab"]'.
  --interaction-window=<ms>  Ventana de muestreo para medir el motion (default 1000; subí a
                     ~1500-2000 para animaciones GSAP largas). Clamp [200, 4000].
  --headed           Chromium visible para debug
  -h, --help

Salida: .captures/_explore/<slug>/{session.json, aria.txt, snapshot.png}
Después: pnpm fe:capture:promote --route=<path> --name=<scenario-name>
`

const MAX_CANDIDATES = 200

const collectMarkers = async (page: Page): Promise<{ selector: string; count: number }[]> => {
  try {
    const raw = await page.evaluate(() => {
      const out: { selector: string; count: number }[] = []
      const seen = new Set<string>()

      for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-capture],[data-gvc-ready]'))) {
        for (const attr of ['data-capture', 'data-gvc-ready']) {
          const value = el.getAttribute(attr)

          if (!value) continue

          const selector = `[${attr}="${value}"]`

          if (seen.has(selector)) continue
          seen.add(selector)
          out.push({ selector, count: document.querySelectorAll(selector).length })
        }
      }

      return out
    })

    return raw
  } catch {
    return []
  }
}

const enrichCandidates = async (page: Page, candidates: ExploreCandidate[]): Promise<ExploreCandidate[]> => {
  const enriched: ExploreCandidate[] = []

  for (const candidate of candidates.slice(0, MAX_CANDIDATES)) {
    // Validación de uniqueness: el `getByRole` sugerido, ¿resuelve a 1 nodo?
    // Best-effort + graceful degrade (patrón webwright): nunca rompe el explore.
    if (!candidate.name) {
      enriched.push(candidate)
      continue
    }

    try {
      const locator = page.getByRole(candidate.role as Parameters<Page['getByRole']>[0], {
        name: candidate.name,
        exact: true
      })

      const count = await locator.count()

      candidate.unique = count === 1

      if (candidate.interactive && count === 1) {
        candidate.boundingBox = await locator.first().boundingBox()
      }
    } catch {
      // uniqueness no determinable; dejamos el candidato sin la marca.
    }

    enriched.push(candidate)
  }

  return enriched
}

const runProbes = async (page: Page, specs: string[]): Promise<ExploreProbeResult[]> => {
  const results: ExploreProbeResult[] = []

  for (const spec of specs) {
    try {
      const locator = page.locator(spec)
      const count = await locator.count()
      const samples: ExploreProbeResult['samples'] = []

      for (const node of (await locator.all()).slice(0, 5)) {
        const text = ((await node.textContent()) ?? '').trim().slice(0, 80)

        samples.push({ text, boundingBox: await node.boundingBox() })
      }

      results.push({ spec, count, samples })
    } catch (err) {
      results.push({ spec, count: -1, samples: [{ text: `error: ${err instanceof Error ? err.message : String(err)}`, boundingBox: null }] })
    }
  }

  return results
}

const EXPLORE_VIEWPORT = { width: 1440, height: 900 }
const SAMPLE_INTERVAL_MS = 50
const CLIP_PADDING = 24

/** Clip fijo (bbox del target + padding, clampeado al viewport) para que todos los samples tengan las mismas dims → pixelmatch funciona. */
const clipForBox = (box: { x: number; y: number; width: number; height: number }): { x: number; y: number; width: number; height: number } => {
  const x = Math.max(0, Math.floor(box.x - CLIP_PADDING))
  const y = Math.max(0, Math.floor(box.y - CLIP_PADDING))

  return {
    x,
    y,
    width: Math.max(1, Math.min(EXPLORE_VIEWPORT.width - x, Math.ceil(box.width + CLIP_PADDING * 2))),
    height: Math.max(1, Math.min(EXPLORE_VIEWPORT.height - y, Math.ceil(box.height + CLIP_PADDING * 2)))
  }
}

/**
 * Observa microinteracciones (TASK-1099) midiendo los timings reales (TASK-1100).
 * Performa la acción (read-only: hover/focus/click — NUNCA fill/press), muestrea
 * el clip del target cada 50ms hasta `windowMs`, computa el diff de píxeles
 * (`pixelmatch`) y deriva feedback/settled. Funciona para cualquier motion
 * (CSS/framer-motion/GSAP) porque mide píxeles, no eventos. Graceful degrade.
 */
const observeInteractions = async (
  page: Page,
  specs: string[],
  sessionDir: string,
  windowMs: number
): Promise<ExploreInteraction[]> => {
  const out: ExploreInteraction[] = []
  const tmpDir = resolve(sessionDir, '_interaction-tmp')

  mkdirSync(tmpDir, { recursive: true })

  for (const spec of specs) {
    const { kind, selector } = parseInteractionSpec(spec)
    const name = interactionName(kind, selector)
    const frames: ExploreInteraction['frames'] = []

    try {
      const locator = page.locator(selector).first()

      await locator.waitFor({ state: 'visible', timeout: 8000 })

      const box = await locator.boundingBox()
      const clip = box ? clipForBox(box) : undefined

      const beforePath = resolve(tmpDir, `${name}-before.png`)

      await page.screenshot({ path: beforePath, clip })

      // Acción
      if (kind === 'hover') await locator.hover({ timeout: 8000 })
      else if (kind === 'focus') await locator.focus({ timeout: 8000 })
      else await locator.click({ timeout: 8000 })

      // Muestreo de estabilidad visual
      const sampleCount = Math.max(2, Math.ceil(windowMs / SAMPLE_INTERVAL_MS))
      const samplePaths: { atMs: number; path: string }[] = []

      for (let i = 1; i <= sampleCount; i++) {
        await page.waitForTimeout(SAMPLE_INTERVAL_MS)
        const path = resolve(tmpDir, `${name}-s${String(i).padStart(3, '0')}.png`)

        await page.screenshot({ path, clip })
        samplePaths.push({ atMs: i * SAMPLE_INTERVAL_MS, path })
      }

      const beforePng = loadPng(beforePath)
      const samples: InteractionDiffSample[] = []
      let prevPng = beforePng

      for (const s of samplePaths) {
        const png = loadPng(s.path)

        samples.push({
          atMs: s.atMs,
          diffVsBefore: compareImages(beforePng, png).diffRatio,
          diffVsPrev: compareImages(prevPng, png).diffRatio
        })
        prevPng = png
      }

      const timings = detectInteractionTimings(samples)

      const persist = (label: string, atMs: number, srcPath: string): void => {
        const file = `interaction-${name}-${label}.png`

        copyFileSync(srcPath, resolve(sessionDir, file))
        frames.push({ label, atMs, screenshotPath: file })
      }

      const sampleAt = (atMs: number): string => samplePaths.find(s => s.atMs === atMs)?.path ?? samplePaths[samplePaths.length - 1].path

      persist('before', 0, beforePath)

      if (timings.changed) {
        persist('feedback', timings.feedbackAtMs, sampleAt(timings.feedbackAtMs))
        persist('settled', timings.settledAtMs, sampleAt(timings.settledAtMs))
      } else {
        // Sin feedback visible: before + el frame final, sin inventar un 'feedback'.
        persist('settled', samplePaths[samplePaths.length - 1].atMs, samplePaths[samplePaths.length - 1].path)
      }

      out.push({ name, action: { kind, selector }, resolved: true, frames, measuredTimings: timings.changed })
    } catch (err) {
      out.push({
        name,
        action: { kind, selector },
        resolved: false,
        frames,
        error: err instanceof Error ? err.message : String(err)
      })
    }
  }

  rmSync(tmpDir, { recursive: true, force: true })

  return out
}

const main = async (): Promise<void> => {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      route: { type: 'string' },
      env: { type: 'string', default: 'staging' },
      ready: { type: 'string' },
      probe: { type: 'string', multiple: true },
      interaction: { type: 'string', multiple: true },
      'interaction-window': { type: 'string', default: '1000' },
      headed: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false }
    }
  })

  if (values.help === true) {
    PRINT(HELP_TEXT)

    return
  }

  if (!values.route) throw new Error('--route=<path> es requerido. Ej: pnpm fe:capture:explore --route=/finance/cash-out')
  if (!(values.route as string).startsWith('/')) throw new Error(`--route debe empezar con /: "${values.route}"`)
  if (!isValidEnv(values.env as string)) throw new Error(`--env inválido: "${values.env}". Valores: local | staging | dev-agent | production`)

  const env = values.env as CaptureEnv
  const route = values.route as string

  // explore es read-only, pero el gate de production se respeta igual.
  enforceProductionGate(env, false)

  const envConfig = resolveEnvConfig(env)

  PRINT(`▶ GVC explore (read-only)`)
  PRINT(`  env:    ${env}`)
  PRINT(`  route:  ${route}`)
  PRINT(`  actor:  ${resolveActor()}`)

  const slug = slugifyRoute(route)
  const sessionDir = resolve(EXPLORE_DIR, slug)

  mkdirSync(sessionDir, { recursive: true })

  const videoTmp = resolve(sessionDir, '_video-tmp')

  mkdirSync(videoTmp, { recursive: true })

  const session = await launchCaptureSession({
    envConfig,
    viewport: { width: 1440, height: 900 },
    headed: values.headed === true,
    recordVideoDir: videoTmp
  })

  try {
    PRINT(`→ goto ${envConfig.baseUrl}${route} (domcontentloaded)`)
    await session.page.goto(`${envConfig.baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    assertNotRedirectedToLogin(session.page, route)

    if (values.ready) {
      PRINT(`→ readiness: esperando ${values.ready}`)
      await session.page.locator(values.ready as string).first().waitFor({ state: 'visible', timeout: 12000 })
    }

    // Estabiliza fonts + un hold corto antes de observar.
    try {
      await session.page.evaluate(async () => {
        if ('fonts' in document) await document.fonts.ready
      })
    } catch {
      // fonts.ready best-effort
    }

    await session.page.waitForTimeout(400)

    const ariaSnapshot = await session.page.locator('body').ariaSnapshot({ timeout: 8000 })

    writeFileSync(resolve(sessionDir, 'aria.txt'), ariaSnapshot, 'utf8')
    await session.page.screenshot({ path: resolve(sessionDir, 'snapshot.png'), fullPage: false })

    const candidates = await enrichCandidates(session.page, parseAriaSnapshot(ariaSnapshot))
    const markers = await collectMarkers(session.page)
    const probes = values.probe?.length ? await runProbes(session.page, values.probe as string[]) : []

    // Las interacciones van AL FINAL: pueden mutar el estado visual (un click abre
    // un drawer) y la observación estática de arriba refleja el estado inicial.
    const interactionWindowMs = Math.max(200, Math.min(4000, Number(values['interaction-window']) || 1000))

    const interactions = values.interaction?.length
      ? await observeInteractions(session.page, values.interaction as string[], sessionDir, interactionWindowMs)
      : []

    const record: ExploreSession = {
      route,
      env,
      capturedAt: new Date().toISOString(),
      ariaSnapshotPath: 'aria.txt',
      screenshotPath: 'snapshot.png',
      markers,
      candidates,
      probes,
      interactions
    }

    writeFileSync(resolve(sessionDir, 'session.json'), `${JSON.stringify(record, null, 2)}\n`, 'utf8')

    const interactive = candidates.filter(c => c.interactive && c.name)
    const uniqueInteractive = interactive.filter(c => c.unique)

    PRINT('')
    PRINT(`═══════════════════════════════════════`)
    PRINT(`  OK explore → ${sessionDir.replace(REPO_ROOT, '<repo>')}`)
    PRINT(`  ${candidates.length} candidatos · ${interactive.length} interactivos (${uniqueInteractive.length} con locator único) · ${markers.length} markers`)
    PRINT(`═══════════════════════════════════════`)
    PRINT('')
    PRINT(`Top elementos interactivos (locator sugerido):`)

    for (const c of uniqueInteractive.slice(0, 12)) {
      PRINT(`  • ${c.suggestedLocator}`)
    }

    if (markers.length) {
      PRINT(`Markers de captura:`)
      for (const m of markers.slice(0, 12)) PRINT(`  • ${m.selector} (×${m.count})`)
    }

    for (const p of probes) {
      PRINT(`Probe "${p.spec}" → ${p.count} match${p.count === 1 ? '' : 'es'}${p.samples[0]?.text ? ` · "${p.samples[0].text}"` : ''}`)
    }

    for (const i of interactions) {
      if (!i.resolved) {
        PRINT(`Interacción "${i.name}" → no resuelta (${i.error ?? 'sin selector visible'})`)
      } else if (i.measuredTimings) {
        const fb = i.frames.find(f => f.label === 'feedback')?.atMs
        const st = i.frames.find(f => f.label === 'settled')?.atMs

        PRINT(`Interacción "${i.name}" → timings MEDIDOS: feedback ${fb}ms · settled ${st}ms`)
      } else {
        PRINT(`Interacción "${i.name}" → sin feedback visible observado (${i.frames.length} frames)`)
      }
    }

    if (interactions.some(i => i.resolved)) {
      PRINT(`  → promote la emite como step \`interaction\` (coreografía).`)
    }

    PRINT('')
    PRINT(`Leé el árbol completo: ${sessionDir.replace(REPO_ROOT, '<repo>')}/aria.txt`)
    PRINT(`Promové a scenario:    pnpm fe:capture:promote --route=${route} --name=<scenario-name>`)
  } finally {
    await session.stopTracing(null)
    await session.finalizeRecording()
    rmSync(videoTmp, { recursive: true, force: true })
  }
}

main().catch(err => {
  console.error(err instanceof Error ? err.stack : String(err))
  process.exit(1)
})
