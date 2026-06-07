#!/usr/bin/env tsx
/**
 * Greenhouse Visual Capture — CLI canónico.
 *
 * Reusa agent auth, Vercel bypass y scenarios declarativos para producir
 * evidencia visual: video, frames, manifest, audit e index.html estático.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { appendAudit, resolveActor } from './lib/audit'
import { ensureStorageStateFresh, refreshStorageState } from './lib/auth'
import { runBaselineDiffContract } from './lib/baseline-contract'
import { assertNotRedirectedToLogin, launchCaptureSession } from './lib/browser'
import { applyCaptureDeterminism } from './lib/capture-masks'
import { isValidEnv, resolveEnvConfig, type CaptureEnv, type EnvConfig } from './lib/env'
import { classifyCaptureFailure } from './lib/failure-taxonomy'
import { composeGif } from './lib/gif'
import { writeManifest, type BaselineFrameDiff, type CaptureManifest, type PerformanceSummary, type RuntimeSummary } from './lib/manifest'
import { collectPerformanceSnapshot, derivePerformanceFindings } from './lib/perf-budget'
import { runScenario } from './lib/recorder'
import { writeCaptureReport } from './lib/report'
import { attachRuntimeCollectors, deriveRuntimeFindings } from './lib/runtime-collector'
import { applySecretMask, assertSafeOutputPath, enforceProductionGate } from './lib/safety'
import type { CaptureScenario, CaptureViewportVariant } from './lib/scenario'
import { uploadCaptureToGcs } from './lib/upload'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '../..')
const CAPTURES_DIR = resolve(REPO_ROOT, '.captures')

const PRINT = (msg: string) => {
  console.log(msg)
}

const HELP_TEXT = `Greenhouse Visual Capture (GVC)

Uso:
  pnpm fe:capture <scenario-name> [--env=local|staging|dev-agent|production] [--gif] [--headed]
  pnpm fe:capture --route=/path [--env=local|staging|dev-agent|production] [--hold=3000]

Opciones:
  --env=<env>       Target de captura. Default: staging
  --route=<path>    Captura inline de una ruta sin scenario
  --hold=<ms>       Espera inicial para capturas inline. Default: 1500
  --gif             Genera flipbook.gif
  --headed          Abre Chromium visible para debug
  --device=<name>   Device Playwright para capturas inline
  --upload=<bucket> Sube artifacts a GCS
  --prod            Triple gate explícito para production
  -h, --help        Muestra esta ayuda

Ejemplos:
  pnpm fe:capture onboarding-cases-inbox-mockup --env=local
  pnpm fe:capture --route=/agency/clients/onboarding/mockup --env=local --hold=3000
  pnpm fe:capture:review .captures/<capture-dir>

Scenarios:
  ls scripts/frontend/scenarios/
`

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
  assertions: [
    { kind: 'noLoginRedirect', reason: 'authenticated route expected' },
    { kind: 'noErrorBoundary', reason: 'visual evidence should not capture app error' }
  ],
  steps: [{ kind: 'mark', label: 'snapshot' }]
})

const viewportFromVariant = (
  scenario: CaptureScenario,
  variant?: CaptureViewportVariant
): { width: number; height: number } => {
  if (!variant || variant.device) return scenario.viewport

  return {
    width: variant.width ?? scenario.viewport.width,
    height: variant.height ?? scenario.viewport.height
  }
}

interface RunOneArgs {
  env: CaptureEnv
  envConfig: EnvConfig
  scenario: CaptureScenario
  outputDir: string
  headed: boolean
  gif: boolean
  deviceName?: string
  viewportName?: string
  viewport: { width: number; height: number }
}

const runOneCapture = async ({
  env,
  envConfig,
  scenario,
  outputDir,
  headed,
  gif,
  deviceName,
  viewportName,
  viewport
}: RunOneArgs): Promise<CaptureManifest> => {
  const videoDir = resolve(outputDir, '_video-tmp')

  mkdirSync(videoDir, { recursive: true })

  PRINT(`  output:   ${outputDir.replace(REPO_ROOT, '<repo>')}`)

  const session = await launchCaptureSession({
    envConfig,
    viewport,
    headed,
    deviceName,
    recordVideoDir: videoDir
  })

  const runtimeCollector = attachRuntimeCollectors(session.page)

  let exitCode: 0 | 1 = 0
  let stepError: { message: string; stepIndex: number } | undefined
  let baselineDiffs: BaselineFrameDiff[] | undefined
  let runtimeSummary: RuntimeSummary | undefined
  let performanceSummary: PerformanceSummary | undefined
  let outcome = {
    frames: [],
    startedAt: Date.now(),
    finishedAt: Date.now(),
    assertions: [],
    qualityFindings: [],
    interactions: []
  } as Awaited<ReturnType<typeof runScenario>>

  try {
    PRINT(`→ goto ${envConfig.baseUrl}${scenario.route}`)
    await session.page.goto(`${envConfig.baseUrl}${scenario.route}`, {
      waitUntil: 'networkidle',
      timeout: 60000
    })

    try {
      assertNotRedirectedToLogin(session.page, scenario.route)
    } catch (redirectErr) {
      PRINT(`  stale auth detectado, forzando refresh…`)
      refreshStorageState(env, envConfig)
      throw redirectErr
    }

    await applySecretMask(session.page, scenario.extraMaskSelectors ?? [])

    // Baseline contract: el diff pixel-perfect SOLO es válido bajo condiciones
    // deterministas. Se aplica sólo cuando el scenario declara un baseline para
    // no alterar la evidencia de motion de scenarios de microinteracción.
    if (scenario.baseline?.surfaceId) {
      await applyCaptureDeterminism(session.page)
    }

    outcome = await runScenario({
      page: session.page,
      scenario,
      outputDir,
      log: PRINT
    })

    if (outcome.error) {
      exitCode = 1
      stepError = outcome.error
    }

    if (scenario.baseline?.surfaceId) {
      const contract = runBaselineDiffContract({
        baseline: scenario.baseline,
        outputDir,
        frames: outcome.frames,
        viewportName
      })

      outcome.qualityFindings.push(...contract.findings)
      baselineDiffs = contract.baselineDiffs.length ? contract.baselineDiffs : undefined

      for (const diff of contract.baselineDiffs) {
        const badge = diff.status === 'match' ? '🟢' : diff.status === 'exceeded' || diff.status === 'dimension_mismatch' ? '🔴' : '🟡'

        PRINT(`  ${badge} baseline ${diff.frameLabel}: ${diff.status}${diff.diffRatio !== undefined ? ` (${(diff.diffRatio * 100).toFixed(2)}%)` : ''}`)
      }
    }

    runtimeSummary = runtimeCollector.summarize()
    outcome.qualityFindings.push(...deriveRuntimeFindings(runtimeCollector.raw(), scenario.quality?.runtime))

    performanceSummary = await collectPerformanceSnapshot(session.page)
    outcome.qualityFindings.push(...derivePerformanceFindings(performanceSummary, scenario.quality?.performance))

    const blockingFinding = outcome.qualityFindings.find(finding => finding.severity === 'error')

    if (blockingFinding) {
      exitCode = 1
      stepError = {
        message: `${blockingFinding.code}: ${blockingFinding.message}`,
        stepIndex: -1
      }
    }
  } catch (err) {
    exitCode = 1
    stepError = {
      message: err instanceof Error ? err.message : String(err),
      stepIndex: -1
    }
    PRINT(`✗ captura abortada: ${stepError.message}`)
  }

  runtimeSummary ??= runtimeCollector.summarize()
  runtimeCollector.dispose()

  // Trace on failure (retain-on-failure): guarda trace.zip sólo si la captura falló.
  const traceSavePath = exitCode === 1 ? resolve(outputDir, 'trace.zip') : null
  const traceSaved = await session.stopTracing(traceSavePath)

  if (traceSaved) PRINT(`✓ trace.zip guardado (debug: pnpm exec playwright show-trace ${outputDir.replace(REPO_ROOT, '<repo>')}/trace.zip)`)

  const webmTmpPath = await session.finalizeRecording()
  let webmPath: string | null = null

  if (webmTmpPath) {
    webmPath = resolve(outputDir, 'recording.webm')

    try {
      const { renameSync, rmSync } = await import('node:fs')

      renameSync(webmTmpPath, webmPath)
      rmSync(videoDir, { recursive: true, force: true })
    } catch {
      webmPath = webmTmpPath
    }

    PRINT(`✓ recording.webm guardado`)
  } else {
    PRINT(`⚠ no se generó recording`)
  }

  let gifPath: string | null = null

  if (gif && webmPath) {
    PRINT(`→ componiendo GIF con ffmpeg…`)

    const { gifPath: g, warning } = composeGif(webmPath, { fps: 12, maxWidth: 800 })

    gifPath = g
    if (warning) PRINT(`  ⚠ ${warning}`)
    if (g) PRINT(`✓ flipbook.gif guardado`)
  }

  const failureCategory = classifyCaptureFailure(stepError?.message)

  const reportManifest: CaptureManifest = {
    schemaVersion: 1,
    scenarioName: scenario.name,
    route: scenario.route,
    env,
    viewport,
    viewportName,
    startedAt: new Date(outcome.startedAt).toISOString(),
    finishedAt: new Date(outcome.finishedAt).toISOString(),
    durationMs: outcome.finishedAt - outcome.startedAt,
    outputs: {
      recordingWebm: webmPath ? webmPath.replace(`${outputDir}/`, '') : null,
      framesDir: 'frames/',
      flipbookGif: gifPath ? gifPath.replace(`${outputDir}/`, '') : null,
      trace: traceSaved ? 'trace.zip' : null
    },
    frames: outcome.frames,
    readiness: outcome.readiness,
    assertions: outcome.assertions,
    qualityFindings: outcome.qualityFindings,
    interactions: outcome.interactions,
    failureCategory,
    baseline: scenario.baseline,
    baselineDiffs,
    runtimeSummary,
    performanceSummary,
    exitCode,
    error: stepError
  }

  const reportHtml = writeCaptureReport(outputDir, reportManifest)
  const manifest: CaptureManifest = { ...reportManifest, reportHtml }

  writeManifest(outputDir, manifest)
  PRINT(`✓ manifest.json escrito`)
  PRINT(`✓ index.html escrito`)

  writeFileSync(
    resolve(outputDir, 'stdout.log'),
    `# Run actor=${resolveActor()} env=${env}\n# scenario=${scenario.name}\n# exitCode=${exitCode}\n`,
    'utf8'
  )

  return manifest
}

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
      upload: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false }
    }
  })

  if (values.help === true) {
    PRINT(HELP_TEXT)

    return
  }

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

  const cliDevice = values.device as string | undefined
  const scenarioVariants = !cliDevice && scenario.viewports?.length ? scenario.viewports : undefined

  const variants: CaptureViewportVariant[] = scenarioVariants ?? [
    {
      name: cliDevice ? cliDevice.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() : 'default',
      device: cliDevice,
      width: scenario.viewport.width,
      height: scenario.viewport.height
    }
  ]

  PRINT(`  scenario: ${scenario.name}`)
  PRINT(`  route:    ${scenario.route}`)
  PRINT(`  variants: ${variants.map(v => v.name).join(', ')}`)
  PRINT('')

  const rootOutputDir = buildOutputDir(scenario.name)
  const variantSummaries = []
  let rootExitCode: 0 | 1 = 0
  let primaryManifest: CaptureManifest | null = null

  for (const [index, variant] of variants.entries()) {
    const multi = variants.length > 1
    const outputDir = multi ? resolve(rootOutputDir, `${String(index + 1).padStart(2, '0')}-${variant.name}`) : rootOutputDir

    mkdirSync(outputDir, { recursive: true })

    PRINT(`▶ variant ${variant.name}`)
    PRINT(`  viewport: ${variant.device ? `device ${variant.device}` : `${variant.width}x${variant.height}`}`)

    const manifest = await runOneCapture({
      env,
      envConfig,
      scenario,
      outputDir,
      headed: values.headed === true,
      gif: values.gif === true,
      deviceName: variant.device,
      viewportName: variant.name,
      viewport: viewportFromVariant(scenario, variant)
    })

    if (!primaryManifest) primaryManifest = manifest
    if (manifest.exitCode !== 0) rootExitCode = 1

    variantSummaries.push({
      name: variant.name,
      viewport: manifest.viewport,
      device: variant.device,
      outputDir: outputDir.replace(`${rootOutputDir}/`, ''),
      manifestPath: `${outputDir.replace(`${rootOutputDir}/`, '')}/manifest.json`,
      exitCode: manifest.exitCode,
      durationMs: manifest.durationMs,
      frameCount: manifest.frames.length
    })
  }

  if (variants.length > 1 && primaryManifest) {
    const rootManifest: CaptureManifest = {
      ...primaryManifest,
      viewportName: undefined,
      outputs: {
        recordingWebm: null,
        framesDir: '',
        flipbookGif: null
      },
      frames: [],
      variants: variantSummaries,
      exitCode: rootExitCode,
      error: rootExitCode === 1 ? { message: 'One or more variants failed', stepIndex: -1 } : undefined,
      failureCategory: rootExitCode === 1 ? 'helper_error' : undefined,
      reportHtml: undefined
    }

    const reportHtml = writeCaptureReport(rootOutputDir, rootManifest)

    writeManifest(rootOutputDir, { ...rootManifest, reportHtml })
  }

  if (values.upload) {
    PRINT(`→ subiendo a gs://${values.upload}/ …`)

    const result = uploadCaptureToGcs(rootOutputDir, values.upload)

    if (result.warning) PRINT(`  ⚠ ${result.warning}`)

    if (result.signedUrl) {
      PRINT(`✓ subido a ${result.bucketPath}`)
      PRINT(`  manifest signed URL (7d): ${result.signedUrl}`)
    } else if (result.bucketPath && !result.warning) {
      PRINT(`✓ subido a ${result.bucketPath}`)
    }
  }

  appendAudit({
    timestamp: new Date().toISOString(),
    scenarioName: scenario.name,
    route: scenario.route,
    env,
    outputDir: rootOutputDir.replace(REPO_ROOT, '<repo>'),
    exitCode: rootExitCode,
    durationMs: variantSummaries.reduce((acc, v) => acc + v.durationMs, 0),
    actor: resolveActor(),
    error: rootExitCode === 1
      ? variants.length === 1
        ? primaryManifest?.error?.message ?? 'Capture failed'
        : 'One or more variants failed'
      : undefined,
    failureCategory: rootExitCode === 1
      ? variants.length === 1
        ? primaryManifest?.failureCategory ?? 'helper_error'
        : 'helper_error'
      : undefined
  })

  PRINT('')
  PRINT(`═══════════════════════════════════════`)
  PRINT(`  ${rootExitCode === 0 ? 'OK' : 'FALLÓ'} capture ${rootExitCode === 0 ? 'OK' : 'FALLÓ'}`)
  PRINT(`  ${variantSummaries.length} variant${variantSummaries.length === 1 ? '' : 's'} · ${variantSummaries.reduce((acc, v) => acc + v.frameCount, 0)} frames`)
  PRINT(`  → ${rootOutputDir.replace(REPO_ROOT, '<repo>')}`)
  PRINT(`═══════════════════════════════════════`)

  process.exit(rootExitCode)
}

main().catch(err => {
  console.error(err instanceof Error ? err.stack : String(err))
  process.exit(1)
})
