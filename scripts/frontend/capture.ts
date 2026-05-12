#!/usr/bin/env tsx
/**
 * Greenhouse Frontend Capture Helper — CLI canónico.
 *
 * Reemplaza el patrón "cada agente escribe su _cap.mjs ad-hoc". Reusa
 * scripts/playwright-auth-setup.mjs (agent session canónico) + storage
 * states existentes (.auth/storageState.<env>.json) + bypass header
 * canónico para staging.
 *
 * Usage:
 *   pnpm fe:capture <scenario-name> --env=staging
 *   pnpm fe:capture --route=/hr/offboarding --env=staging --hold=3000
 *   pnpm fe:capture <scenario-name> --env=staging --gif
 *   pnpm fe:capture <scenario-name> --env=staging --headed
 *
 * Output: .captures/<ISO>_<scenario>/
 *   - recording.webm        (continuous video del session)
 *   - frames/01-<label>.png (marker-based stills sync)
 *   - flipbook.gif          (opt, ffmpeg)
 *   - manifest.json         (scenario meta + timings + frames)
 *   - stdout.log            (debug)
 *
 * Spec arquitectónica: design via arch-architect, 4 pillars scored,
 * 5-layer defense-in-depth Safety. Ver docs/manual-de-uso/plataforma/
 * captura-visual-playwright.md.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { appendAudit, resolveActor } from './lib/audit'
import { assertNotRedirectedToLogin, launchCaptureSession } from './lib/browser'
import { isValidEnv, resolveEnvConfig, type CaptureEnv } from './lib/env'
import { ensureStorageStateFresh, refreshStorageState } from './lib/auth'
import { composeGif } from './lib/gif'
import { writeManifest, type CaptureManifest, type FrameRecord } from './lib/manifest'
import { runScenario } from './lib/recorder'
import { applySecretMask, assertSafeOutputPath, enforceProductionGate } from './lib/safety'
import type { CaptureScenario } from './lib/scenario'
import { uploadCaptureToGcs } from './lib/upload'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '../..')
const CAPTURES_DIR = resolve(REPO_ROOT, '.captures')

const PRINT = (msg: string) => {
  console.log(msg)
}

const buildOutputDir = (scenarioName: string): string => {
  const iso = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const dir = resolve(CAPTURES_DIR, `${iso}_${scenarioName}`)

  assertSafeOutputPath(dir, REPO_ROOT)
  mkdirSync(dir, { recursive: true })

  return dir
}

const loadScenarioByName = async (name: string): Promise<CaptureScenario> => {
  const path = resolve(SCRIPT_DIR, 'scenarios', `${name}.scenario.ts`)

  if (!existsSync(path)) {
    throw new Error(
      `Scenario "${name}" no encontrado: ${path}\n` +
        `Lista los scenarios disponibles con:\n  ls scripts/frontend/scenarios/`
    )
  }

  const mod = (await import(path)) as { scenario?: CaptureScenario }

  if (!mod.scenario) {
    throw new Error(`El archivo ${path} no exporta \`scenario\`. Ver scenarios/_README.md.`)
  }

  return mod.scenario
}

const buildInlineScenario = (route: string, holdMs: number): CaptureScenario => ({
  name: `inline-${route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}`,
  route,
  viewport: { width: 1440, height: 900 },
  initialHoldMs: holdMs,
  finalHoldMs: 200,
  steps: [{ kind: 'mark', label: 'snapshot' }]
})

const main = async (): Promise<void> => {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      env: { type: 'string', default: 'staging' },
      route: { type: 'string' },
      hold: { type: 'string', default: '1500' },
      gif: { type: 'boolean', default: false },
      headed: { type: 'boolean', default: false },
      prod: { type: 'boolean', default: false },
      device: { type: 'string' },
      upload: { type: 'string' }
    }
  })

  if (!isValidEnv(values.env as string)) {
    throw new Error(`--env inválido: "${values.env}". Valores: local | staging | dev-agent | production`)
  }

  const env = values.env as CaptureEnv

  enforceProductionGate(env, values.prod === true)

  const scenarioName = positionals[0]

  if (!scenarioName && !values.route) {
    throw new Error('Provide either a <scenario-name> positional OR --route=<path>')
  }

  const envConfig = resolveEnvConfig(env)

  PRINT(`▶ Capture canónica`)
  PRINT(`  env:      ${env}`)
  PRINT(`  baseUrl:  ${envConfig.baseUrl}`)
  PRINT(`  actor:    ${resolveActor()}`)

  // Auth check + refresh proactivo si <1h restante o ausente
  PRINT(`  auth:     checking storage state…`)

  try {
    ensureStorageStateFresh(env, envConfig)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    PRINT(`  ✗ auth refresh failed: ${message}`)
    process.exit(1)
  }

  const scenario = scenarioName
    ? await loadScenarioByName(scenarioName)
    : buildInlineScenario(values.route as string, Number(values.hold))

  PRINT(`  scenario: ${scenario.name}`)
  PRINT(`  route:    ${scenario.route}`)
  PRINT(`  viewport: ${scenario.viewport.width}x${scenario.viewport.height}`)

  const outputDir = buildOutputDir(scenario.name)
  const videoDir = resolve(outputDir, '_video-tmp')

  mkdirSync(videoDir, { recursive: true })
  PRINT(`  output:   ${outputDir.replace(REPO_ROOT, '<repo>')}`)
  PRINT('')

  const session = await launchCaptureSession({
    envConfig,
    viewport: scenario.viewport,
    headed: values.headed === true,
    deviceName: values.device,
    recordVideoDir: videoDir
  })

  if (values.device) {
    PRINT(`  device:   ${values.device} (Playwright preset)`)
  }

  let exitCode: 0 | 1 = 0
  let stepError: { message: string; stepIndex: number } | undefined
  let frames: FrameRecord[] = []
  let startedAt = Date.now()
  let finishedAt = startedAt

  try {
    PRINT(`→ goto ${envConfig.baseUrl}${scenario.route}`)
    await session.page.goto(`${envConfig.baseUrl}${scenario.route}`, {
      waitUntil: 'networkidle',
      timeout: 60000
    })

    // Stale auth detection — si redirigió a /login después de goto, refresh + retry
    try {
      assertNotRedirectedToLogin(session.page, scenario.route)
    } catch (redirectErr) {
      PRINT(`  ⚠️  stale auth detectado, forzando refresh…`)
      refreshStorageState(env, envConfig)
      throw redirectErr // No re-launch en V1; usuario re-ejecuta. V1.1 puede auto-retry.
    }

    await applySecretMask(session.page, scenario.extraMaskSelectors ?? [])

    const outcome = await runScenario({
      page: session.page,
      scenario,
      outputDir,
      log: PRINT
    })

    frames = outcome.frames
    startedAt = outcome.startedAt
    finishedAt = outcome.finishedAt

    if (outcome.error) {
      exitCode = 1
      stepError = outcome.error
    }
  } catch (err) {
    exitCode = 1
    stepError = {
      message: err instanceof Error ? err.message : String(err),
      stepIndex: -1
    }
    PRINT(`✗ captura abortada: ${stepError.message}`)
  }

  const webmTmpPath = await session.finalizeRecording()
  let webmPath: string | null = null

  if (webmTmpPath) {
    // Mover el webm fuera del videoDir tmp al outputDir final
    webmPath = resolve(outputDir, 'recording.webm')

    try {
      const { renameSync, rmSync } = await import('node:fs')

      renameSync(webmTmpPath, webmPath)
      rmSync(videoDir, { recursive: true, force: true })
    } catch {
      // Si rename falla (cross-device, etc.) dejá el webm en videoDir
      webmPath = webmTmpPath
    }

    PRINT(`✓ recording.webm guardado`)
  } else {
    PRINT(`⚠️  no se generó recording (¿context cerró antes?)`)
  }

  let gifPath: string | null = null

  if (values.gif && webmPath) {
    PRINT(`→ componiendo GIF con ffmpeg…`)

    const { gifPath: g, warning } = composeGif(webmPath, { fps: 12, maxWidth: 800 })

    gifPath = g

    if (warning) PRINT(`  ⚠️  ${warning}`)

    if (g) PRINT(`✓ flipbook.gif guardado`)
  }

  // Manifest
  const manifest: CaptureManifest = {
    schemaVersion: 1,
    scenarioName: scenario.name,
    route: scenario.route,
    env,
    viewport: scenario.viewport,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt,
    outputs: {
      recordingWebm: webmPath ? webmPath.replace(`${outputDir}/`, '') : null,
      framesDir: 'frames/',
      flipbookGif: gifPath ? gifPath.replace(`${outputDir}/`, '') : null
    },
    frames,
    exitCode,
    error: stepError
  }

  writeManifest(outputDir, manifest)
  PRINT(`✓ manifest.json escrito`)

  // OQ-1: opt-in GCS upload
  if (values.upload) {
    PRINT(`→ subiendo a gs://${values.upload}/ …`)

    const result = uploadCaptureToGcs(outputDir, values.upload)

    if (result.warning) {
      PRINT(`  ⚠️  ${result.warning}`)
    }

    if (result.signedUrl) {
      PRINT(`✓ subido a ${result.bucketPath}`)
      PRINT(`  manifest signed URL (7d): ${result.signedUrl}`)
    } else if (result.bucketPath && !result.warning) {
      PRINT(`✓ subido a ${result.bucketPath}`)
    }
  }

  // Audit
  appendAudit({
    timestamp: new Date().toISOString(),
    scenarioName: scenario.name,
    route: scenario.route,
    env,
    outputDir: outputDir.replace(REPO_ROOT, '<repo>'),
    exitCode,
    durationMs: finishedAt - startedAt,
    actor: resolveActor(),
    error: stepError?.message
  })

  // Summary
  PRINT('')
  PRINT(`═══════════════════════════════════════`)
  PRINT(`  ${exitCode === 0 ? '✅' : '❌'} capture ${exitCode === 0 ? 'OK' : 'FALLÓ'}`)
  PRINT(`  ${frames.length} frame${frames.length === 1 ? '' : 's'} · ${finishedAt - startedAt}ms`)
  PRINT(`  → ${outputDir.replace(REPO_ROOT, '<repo>')}`)
  PRINT(`═══════════════════════════════════════`)

  // Write stdout.log placeholder (full piped log requires shell redirect)
  writeFileSync(
    resolve(outputDir, 'stdout.log'),
    `# Run actor=${resolveActor()} env=${env}\n# scenario=${scenario.name}\n# exitCode=${exitCode}\n`,
    'utf8'
  )

  process.exit(exitCode)
}

main().catch(err => {
  console.error('✗', err instanceof Error ? err.message : err)
  process.exit(1)
})
