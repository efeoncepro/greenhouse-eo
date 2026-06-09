#!/usr/bin/env tsx
/**
 * Greenhouse Visual Capture — microinteraction sampler.
 *
 * Captura un selector como secuencia de PNGs a FPS controlado para revisar
 * parpadeos, easing y estados intermedios que un mark/frame puntual no revela.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { resolveActor } from './lib/audit'
import { ensureStorageStateFresh, refreshStorageState } from './lib/auth'
import { assertNotRedirectedToLogin, launchCaptureSession } from './lib/browser'
import { isValidEnv, resolveEnvConfig, type CaptureEnv } from './lib/env'
import { applySecretMask, assertSafeOutputPath, enforceProductionGate } from './lib/safety'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '../..')
const CAPTURES_DIR = resolve(REPO_ROOT, '.captures')

const HELP_TEXT = `Greenhouse Visual Capture Micro Sampler

Uso:
  pnpm fe:capture:micro --route=/path --selector='[data-capture="x"]' [--env=local] [--duration=6000] [--fps=20]

Opciones:
  --env=<env>        Target: local | staging | dev-agent | production. Default: local
  --route=<path>     Ruta del portal a abrir
  --selector=<css>   Selector CSS visible a capturar como clip
  --duration=<ms>    Duración de sampling. Default: 6000
  --fps=<n>          Frames por segundo PNG. Default: 20
  --hold=<ms>        Espera inicial antes de muestrear. Default: 1000
  --padding=<px>     Padding alrededor del selector. Default: 24
  --gif              Genera micro.gif con ffmpeg si está disponible
  --headed           Abre Chromium visible para debug
  --device=<name>    Device Playwright preset
  --prod             Triple gate explícito para production
  -h, --help         Muestra esta ayuda

Ejemplo:
  pnpm fe:capture:micro --route=/admin/design-system/nexa-brand --selector='[data-capture="nexa-floating-trigger"]' --env=local --duration=5000 --fps=24 --gif
`

interface MicroFrame {
  index: number
  file: string
  elapsedMs: number
}

interface MicroManifest {
  schemaVersion: 1
  captureKind: 'microinteraction'
  route: string
  selector: string
  env: CaptureEnv
  actor: string
  startedAt: string
  finishedAt: string
  durationMs: number
  fps: number
  sampledFrameCount: number
  viewport: { width: number; height: number }
  clip: { x: number; y: number; width: number; height: number }
  reducedMotion: boolean
  outputs: {
    recordingWebm: string | null
    framesDir: string
    contactSheet: string | null
    gif: string | null
    trace: string | null
  }
  frames: MicroFrame[]
}

const PRINT = (msg: string) => {
  console.log(msg)
}

const slugify = (value: string): string => value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()

const buildOutputDir = (route: string, selector: string): string => {
  const iso = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const name = `micro-${slugify(route) || 'route'}-${slugify(selector).slice(0, 48) || 'selector'}`
  const dir = resolve(CAPTURES_DIR, `${iso}_${name}`)

  assertSafeOutputPath(dir, REPO_ROOT)
  mkdirSync(dir, { recursive: true })

  return dir
}

const toPositiveNumber = (value: unknown, fallback: number, label: string): number => {
  const parsed = Number(value ?? fallback)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} debe ser un número positivo. Recibido: ${String(value)}`)
  }

  return parsed
}

const composeContactSheet = (framesDir: string, frameCount: number, outputDir: string): string | null => {
  if (frameCount === 0) return null

  const columns = Math.min(10, Math.max(1, Math.ceil(Math.sqrt(frameCount))))
  const rows = Math.ceil(frameCount / columns)
  const path = resolve(outputDir, 'contact-sheet.png')

  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-framerate',
      '1',
      '-i',
      resolve(framesDir, 'frame-%04d.png'),
      '-vf',
      `tile=${columns}x${rows}:margin=10:padding=4:color=white`,
      '-frames:v',
      '1',
      path
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  )

  return result.status === 0 && existsSync(path) ? 'contact-sheet.png' : null
}

const composeGif = (framesDir: string, fps: number, outputDir: string): string | null => {
  const path = resolve(outputDir, 'micro.gif')

  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-framerate',
      String(fps),
      '-i',
      resolve(framesDir, 'frame-%04d.png'),
      '-vf',
      'split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer',
      path
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  )

  return result.status === 0 && existsSync(path) ? 'micro.gif' : null
}

const writeReport = (outputDir: string, manifest: MicroManifest): void => {
  const frames = manifest.frames
    .slice(0, 80)
    .map(
      frame => `
        <figure>
          <img src="./frames/${frame.file}" alt="Frame ${frame.index} at ${frame.elapsedMs}ms" loading="lazy" />
          <figcaption>${frame.index} · ${frame.elapsedMs}ms</figcaption>
        </figure>`
    )
    .join('\n')

  writeFileSync(
    resolve(outputDir, 'index.html'),
    `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>GVC Micro · ${manifest.route}</title>
  <style>
    body { margin: 0; padding: 24px; font-family: Inter, system-ui, sans-serif; background: #f7f7f9; color: #202124; }
    main { max-width: 1200px; margin: 0 auto; }
    code { background: #fff; border: 1px solid #dedee6; border-radius: 6px; padding: 2px 6px; }
    .media { display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); align-items: start; }
    .panel { background: #fff; border: 1px solid #dedee6; border-radius: 8px; padding: 16px; box-shadow: 0 4px 14px rgba(18, 25, 38, 0.06); }
    img, video { max-width: 100%; border-radius: 6px; border: 1px solid #e4e4ec; background: #fff; }
    .frames { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 12px; margin-top: 18px; }
    figure { margin: 0; }
    figcaption { color: #646775; font-size: 12px; padding-top: 4px; }
  </style>
</head>
<body>
  <main>
    <h1>GVC Microinteraction Evidence</h1>
    <p><code>${manifest.route}</code> · <code>${manifest.selector}</code> · ${manifest.sampledFrameCount} frames @ ${manifest.fps}fps</p>
    <div class="media">
      ${
        manifest.outputs.recordingWebm
          ? `<section class="panel"><h2>Recording</h2><video controls src="./${manifest.outputs.recordingWebm}"></video></section>`
          : ''
      }
      ${
        manifest.outputs.gif
          ? `<section class="panel"><h2>GIF</h2><img src="./${manifest.outputs.gif}" alt="Microinteraction GIF" /></section>`
          : ''
      }
      ${
        manifest.outputs.contactSheet
          ? `<section class="panel"><h2>Contact sheet</h2><img src="./${manifest.outputs.contactSheet}" alt="Contact sheet" /></section>`
          : ''
      }
    </div>
    <section class="frames">${frames}</section>
  </main>
</body>
</html>
`,
    'utf8'
  )
}

const main = async (): Promise<void> => {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      env: { type: 'string', default: 'local' },
      route: { type: 'string' },
      selector: { type: 'string' },
      duration: { type: 'string', default: '6000' },
      fps: { type: 'string', default: '20' },
      hold: { type: 'string', default: '1000' },
      padding: { type: 'string', default: '24' },
      gif: { type: 'boolean', default: false },
      headed: { type: 'boolean', default: false },
      prod: { type: 'boolean', default: false },
      device: { type: 'string' },
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

  if (!values.route || !String(values.route).startsWith('/')) {
    throw new Error('--route es requerido y debe empezar con /')
  }

  if (!values.selector) {
    throw new Error('--selector es requerido. Preferí un data-capture estable.')
  }

  const env = values.env as CaptureEnv
  const route = values.route as string
  const selector = values.selector as string
  const durationMs = Math.round(toPositiveNumber(values.duration, 6000, '--duration'))
  const fps = Math.min(60, Math.round(toPositiveNumber(values.fps, 20, '--fps')))
  const holdMs = Math.round(toPositiveNumber(values.hold, 1000, '--hold'))
  const padding = Math.round(toPositiveNumber(values.padding, 24, '--padding'))
  const viewport = { width: 1440, height: 900 }

  enforceProductionGate(env, values.prod === true)

  const envConfig = resolveEnvConfig(env)
  const outputDir = buildOutputDir(route, selector)
  const framesDir = resolve(outputDir, 'frames')
  const videoDir = resolve(outputDir, 'video')

  mkdirSync(framesDir, { recursive: true })
  mkdirSync(videoDir, { recursive: true })

  PRINT('▶ GVC Micro Sampler')
  PRINT(`  env:      ${env}`)
  PRINT(`  route:    ${route}`)
  PRINT(`  selector: ${selector}`)
  PRINT(`  fps:      ${fps}`)
  PRINT(`  duration: ${durationMs}ms`)
  PRINT(`  output:   ${outputDir.replace(REPO_ROOT, '<repo>')}`)
  PRINT('  auth:     checking storage state…')

  ensureStorageStateFresh(env, envConfig)

  const session = await launchCaptureSession({
    envConfig,
    viewport,
    headed: values.headed === true,
    deviceName: values.device as string | undefined,
    recordVideoDir: videoDir
  })

  let exitCode: 0 | 1 = 0
  let stepError: Error | null = null
  let reducedMotion = false
  const frames: MicroFrame[] = []
  let clip = { x: 0, y: 0, width: viewport.width, height: viewport.height }
  const startedAt = Date.now()

  try {
    await session.page.goto(new URL(route, envConfig.baseUrl).toString(), { waitUntil: 'domcontentloaded' })
    assertNotRedirectedToLogin(session.page, route)
    await applySecretMask(session.page)

    const locator = session.page.locator(selector).first()

    await locator.waitFor({ state: 'visible', timeout: 10000 })
    await session.page.waitForTimeout(holdMs)

    const box = await locator.boundingBox()

    if (!box) throw new Error(`Selector visible pero sin bounding box: ${selector}`)

    const viewportSize = session.page.viewportSize() ?? viewport
    const x = Math.max(0, Math.floor(box.x - padding))
    const y = Math.max(0, Math.floor(box.y - padding))
    const right = Math.min(viewportSize.width, Math.ceil(box.x + box.width + padding))
    const bottom = Math.min(viewportSize.height, Math.ceil(box.y + box.height + padding))

    clip = {
      x,
      y,
      width: Math.max(1, right - x),
      height: Math.max(1, bottom - y)
    }

    reducedMotion = await session.page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

    const frameCount = Math.max(1, Math.ceil((durationMs / 1000) * fps))
    const intervalMs = 1000 / fps
    const sampleStart = Date.now()

    for (let index = 0; index < frameCount; index += 1) {
      const target = sampleStart + index * intervalMs
      const waitMs = target - Date.now()

      if (waitMs > 0) await session.page.waitForTimeout(waitMs)

      const elapsedMs = Math.max(0, Math.round(Date.now() - sampleStart))
      const file = `frame-${String(index + 1).padStart(4, '0')}.png`

      await session.page.screenshot({ path: resolve(framesDir, file), clip, animations: 'allow' })
      frames.push({ index: index + 1, file, elapsedMs })
    }
  } catch (err) {
    exitCode = 1
    stepError = err instanceof Error ? err : new Error(String(err))
    PRINT(`✗ micro captura abortada: ${stepError.message}`)
  }

  const traceSavePath = exitCode === 1 ? resolve(outputDir, 'trace.zip') : null
  const traceSaved = await session.stopTracing(traceSavePath)
  const webmTmpPath = await session.finalizeRecording()
  let webmPath: string | null = null

  if (webmTmpPath) {
    webmPath = resolve(outputDir, 'recording.webm')

    try {
      renameSync(webmTmpPath, webmPath)
      rmSync(videoDir, { recursive: true, force: true })
    } catch {
      webmPath = webmTmpPath
    }
  }

  const contactSheet = composeContactSheet(framesDir, frames.length, outputDir)
  const gif = values.gif === true ? composeGif(framesDir, fps, outputDir) : null
  const finishedAt = Date.now()

  const manifest: MicroManifest = {
    schemaVersion: 1,
    captureKind: 'microinteraction',
    route,
    selector,
    env,
    actor: resolveActor(),
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt,
    fps,
    sampledFrameCount: frames.length,
    viewport,
    clip,
    reducedMotion,
    outputs: {
      recordingWebm: webmPath ? webmPath.replace(`${outputDir}/`, '') : null,
      framesDir: 'frames/',
      contactSheet,
      gif,
      trace: traceSaved ? 'trace.zip' : null
    },
    frames
  }

  writeFileSync(resolve(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  writeFileSync(
    resolve(outputDir, 'stdout.log'),
    `# Run actor=${resolveActor()} env=${env}\n# route=${route}\n# selector=${selector}\n# exitCode=${exitCode}\n# error=${stepError?.message ?? ''}\n`,
    'utf8'
  )
  writeReport(outputDir, manifest)

  if (contactSheet) PRINT('✓ contact-sheet.png guardado')
  if (gif) PRINT('✓ micro.gif guardado')
  if (webmPath) PRINT('✓ recording.webm guardado')
  PRINT('✓ manifest.json escrito')
  PRINT('✓ index.html escrito')

  if (exitCode !== 0) process.exit(exitCode)
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err)

  if (err instanceof Error && err.message.includes('redirigida a')) {
    const maybeEnv = process.argv.find(arg => arg.startsWith('--env='))?.split('=')[1] ?? 'local'

    if (isValidEnv(maybeEnv)) {
      try {
        const envConfig = resolveEnvConfig(maybeEnv)

        refreshStorageState(maybeEnv, envConfig)
      } catch {
        // Preserve original error.
      }
    }
  }

  process.exit(1)
})
