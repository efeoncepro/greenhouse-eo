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

import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import type { Page } from 'playwright'

import { resolveActor } from './lib/audit'
import { assertNotRedirectedToLogin, launchCaptureSession } from './lib/browser'
import { isValidEnv, resolveEnvConfig, type CaptureEnv } from './lib/env'
import {
  parseAriaSnapshot,
  slugifyRoute,
  type ExploreCandidate,
  type ExploreProbeResult,
  type ExploreSession
} from './lib/explore'
import { enforceProductionGate } from './lib/safety'


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

const main = async (): Promise<void> => {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      route: { type: 'string' },
      env: { type: 'string', default: 'staging' },
      ready: { type: 'string' },
      probe: { type: 'string', multiple: true },
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

    const record: ExploreSession = {
      route,
      env,
      capturedAt: new Date().toISOString(),
      ariaSnapshotPath: 'aria.txt',
      screenshotPath: 'snapshot.png',
      markers,
      candidates,
      probes
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
