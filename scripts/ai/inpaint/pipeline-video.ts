import { mkdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

import sharp from 'sharp'

import type { InpaintImageAdapter } from './adapters/types'
import type { VideoEditEngine } from './adapters/video-fal'
import { assertBrandSafePrompt } from './brand'
import { encodeFrames, extractFrameAt, extractFrames, probeVideo, type VideoProbe } from './ffmpeg'
import { assertMaskUsable, encodeMaskPng, renderMaskPreview, type CanonicalMask } from './mask'
import { runImageInpaint } from './pipeline-image'
import { encodeRgbaPng, loadRgba, type RgbaImage } from './raw'
import { measureZones, recompose } from './recompose'
import { INPAINT_PIPELINE_VERSION, readJson, renderContactSheet, sha256, stableStringify, writeFileEnsured, writeJson } from './run-io'
import { loadVideoMask, type VideoMaskSource } from './video-mask'

/**
 * Pipeline de inpainting de video (TASK-1965):
 * máscara (fija o keyframes) → motor de edición → normalización a resolución/fps/duración del original → control de
 * alineación → recomposición cuadro a cuadro → verificación sobre la secuencia PNG → QA temporal → encode + audio.
 *
 * Un motor de edición puede mover el encuadre; recomponer sobre un encuadre movido produce ghosting. Por eso, antes
 * de recomponer, se mide cuánto cambió la zona protegida y se aborta sobre el umbral.
 */
export type VideoStrategy = 'edit-recompose' | 'first-frame'

export interface VideoInpaintOptions {
  videoPath: string
  mask: VideoMaskSource
  prompt: string
  engine: VideoEditEngine
  strategy?: VideoStrategy
  /** Segundo del cuadro que se edita en `first-frame` (default 0). */
  frameTime?: number
  imageAdapter?: InpaintImageAdapter
  imageModel?: string
  imageQuality?: string
  runRoot: string
  dryRun?: boolean
  force?: boolean
  allowBrand?: boolean
  allowFull?: boolean
  maxUsd?: number
  yes?: boolean
  /** Deriva media máxima de la zona protegida (0–255) para aceptar recomponer (default 12). */
  maxDrift?: number
  keepFrames?: boolean
  log?: (line: string) => void
}

export interface VideoInpaintManifest {
  kind: 'ai-inpaint-video'
  pipelineVersion: number
  runId: string
  key: string
  status: 'dry-run' | 'completed' | 'failed'
  createdAt: string
  inputs: { video: string; videoSha256: string; probe: VideoProbe; mask: string; maskFingerprintSha256: string; staticMask: boolean }
  engine: { id: string; slug: string; verifiedAt: string | null }
  strategy: VideoStrategy
  request: { prompt: string; frameTime: number | null }
  estimate: { usd: number | null; basis: string }
  firstFrameRun?: string
  alignment?: { sampledFrames: number; medianProtectedDrift: number; maxDrift: number }
  frames?: { original: number; engine: number; reconciled: 'exact' | 'padded-last' | 'dropped-last' }
  verification?: { framesChecked: number; protectedMaxDelta: number; verdict: 'PASS' | 'FAIL'; worstFrame: number | null }
  temporal?: { flickerIndex: number; editedMeanDelta: number }
  outputs?: { final: string; engineRaw: string; contactSheet: string }
  error?: string
}

export interface VideoInpaintResult {
  runDir: string
  manifest: VideoInpaintManifest
  reused: boolean
  exitCode: number
}

const resolveCostCap = (maxUsd: number | undefined) => maxUsd ?? Number(process.env.AI_COST_CONFIRM_USD ?? process.env.FAL_COST_CONFIRM_USD ?? 1)

/** Reconciliación de cuadros: ±1 se corrige (el motor redondea la duración); más que eso, el encuadre temporal no calza. */
export const reconcileFrameCount = (original: number, engine: number): 'exact' | 'padded-last' | 'dropped-last' => {
  if (engine === original) return 'exact'
  if (engine === original - 1) return 'padded-last'
  if (engine === original + 1) return 'dropped-last'

  throw new Error(`El motor devolvió ${engine} cuadros y el original tiene ${original}: la duración no calza y recomponer desalinearía el tiempo.`)
}

export const median = (values: number[]): number => {
  if (!values.length) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Índices repartidos de 0 a n−1 (muestreo de alineación y hoja de cuadros). */
export const spreadIndices = (n: number, count: number): number[] =>
  n <= count ? Array.from({ length: n }, (_, i) => i) : Array.from({ length: count }, (_, i) => Math.round((i * (n - 1)) / (count - 1)))

/** Diferencia media absoluta entre dos cuadros consecutivos dentro de lo que la máscara abre. */
export const meanDeltaWithin = (a: RgbaImage, b: RgbaImage, mask: CanonicalMask): number => {
  let sum = 0
  let count = 0

  for (let i = 0; i < mask.data.length; i += 1) {
    if (mask.data[i] === 0) continue

    for (let c = 0; c < 3; c += 1) sum += Math.abs(a.data[i * 4 + c] - b.data[i * 4 + c])

    count += 3
  }

  return count ? sum / count : 0
}

export const runVideoInpaint = async (options: VideoInpaintOptions): Promise<VideoInpaintResult> => {
  const log = options.log ?? (line => process.stdout.write(`${line}\n`))
  const engine = options.engine
  const strategy = options.strategy ?? 'edit-recompose'
  const maxDrift = options.maxDrift ?? 12

  if (!options.prompt.trim()) throw new Error('El prompt está vacío.')

  assertBrandSafePrompt(options.prompt, Boolean(options.allowBrand))

  if (strategy === 'first-frame' && !engine.acceptsReferenceImage) {
    throw new Error(`${engine.id} no recibe imágenes de referencia: la estrategia first-frame necesita fal:seedance25-edit.`)
  }

  if (strategy === 'first-frame' && !options.imageAdapter) throw new Error('first-frame necesita un adaptador de imagen.')

  const probe = await probeVideo(options.videoPath)
  const videoBytes = await readFile(options.videoPath)

  if (probe.durationSeconds > engine.maxSourceSeconds) throw new Error(`${engine.id} acepta hasta ${engine.maxSourceSeconds} s; el video dura ${probe.durationSeconds.toFixed(1)} s.`)
  if (videoBytes.byteLength > engine.maxSourceBytes) throw new Error(`${engine.id} acepta hasta ${Math.round(engine.maxSourceBytes / 1048576)} MB.`)

  const videoMask = await loadVideoMask(options.mask, probe.width, probe.height)
  const firstMask = await videoMask.at(0)
  const stats = assertMaskUsable(firstMask, { allowFull: options.allowFull })

  if (!engine.verifiedAt) log(`  ⚠ ${engine.id}: contrato del catálogo, sin canario propio de este pipeline todavía.`)
  log(`  🎞 ${probe.width}x${probe.height} · ${probe.fps.toFixed(3)} fps · ${probe.durationSeconds.toFixed(2)} s · audio ${probe.hasAudio ? 'sí' : 'no'} · máscara ${videoMask.isStatic ? 'fija' : 'por keyframes'} (${(stats.touchedFraction * 100).toFixed(1)} % en t=0)`)

  const estimate = engine.estimate(probe.durationSeconds)

  log(estimate.usd === null ? `  $ costo: sin estimación (${estimate.basis})` : `  $ costo estimado del motor ≈ USD ${estimate.usd.toFixed(3)} · ${estimate.basis}`)

  const key = sha256(
    stableStringify({
      v: INPAINT_PIPELINE_VERSION,
      video: sha256(videoBytes),
      mask: sha256(videoMask.fingerprint),
      prompt: options.prompt,
      engine: engine.id,
      engineRevision: engine.revision,
      strategy,
      frameTime: strategy === 'first-frame' ? options.frameTime ?? 0 : null,
      imageModel: strategy === 'first-frame' ? options.imageModel ?? options.imageAdapter?.defaultModel : null
    })
  )

  const runDir = join(options.runRoot, 'inpaint-video', key.slice(0, 12))
  const manifestPath = join(runDir, 'manifest.json')
  const previous = await readJson<VideoInpaintManifest>(manifestPath)

  if (!options.force && !options.dryRun && previous?.status === 'completed') {
    log(`  ↺ misma entrada ya generada: se reutiliza ${runDir.replace(process.cwd(), '.')} sin pagar (usa --force para regenerar)`)

    return { runDir, manifest: previous, reused: true, exitCode: previous.verification?.verdict === 'PASS' ? 0 : 2 }
  }

  const cap = resolveCostCap(options.maxUsd)

  if (!options.dryRun && estimate.usd !== null && estimate.usd > cap && !options.yes) {
    throw new Error(`La estimación (USD ${estimate.usd.toFixed(3)}) supera el tope de USD ${cap.toFixed(2)}. Repite con --yes o ajusta --max-usd.`)
  }

  await mkdir(runDir, { recursive: true })

  const firstFramePath = join(runDir, 'frame-0.png')

  await extractFrameAt(options.videoPath, 0, firstFramePath)
  await writeFileEnsured(join(runDir, 'mask-preview-t0.png'), await renderMaskPreview(await loadRgba(firstFramePath), firstMask))

  const manifest: VideoInpaintManifest = {
    kind: 'ai-inpaint-video',
    pipelineVersion: INPAINT_PIPELINE_VERSION,
    runId: key.slice(0, 12),
    key,
    status: 'dry-run',
    createdAt: new Date().toISOString(),
    inputs: { video: options.videoPath, videoSha256: sha256(videoBytes), probe, mask: options.mask.path, maskFingerprintSha256: sha256(videoMask.fingerprint), staticMask: videoMask.isStatic },
    engine: { id: engine.id, slug: engine.slug, verifiedAt: engine.verifiedAt },
    strategy,
    request: { prompt: options.prompt, frameTime: strategy === 'first-frame' ? options.frameTime ?? 0 : null },
    estimate
  }

  if (options.dryRun) {
    await writeJson(manifestPath, manifest)
    log(`  ◌ dry-run: nada se envió al proveedor. Revisa ${join(runDir, 'mask-preview-t0.png').replace(process.cwd(), '.')}`)

    return { runDir, manifest, reused: false, exitCode: 0 }
  }

  const dirs = { original: join(runDir, 'frames-original'), engine: join(runDir, 'frames-engine'), final: join(runDir, 'frames-final') }

  try {
    let referenceImage: Buffer | undefined

    if (strategy === 'first-frame') {
      const frameTime = options.frameTime ?? 0
      const framePath = join(runDir, `frame-${frameTime}.png`)
      const frameMaskPath = join(runDir, `frame-${frameTime}-mask.png`)

      await extractFrameAt(options.videoPath, frameTime, framePath)
      await writeFileEnsured(frameMaskPath, await encodeMaskPng(await videoMask.at(frameTime)))

      const image = await runImageInpaint({
        imagePath: framePath,
        maskPath: frameMaskPath,
        prompt: options.prompt,
        adapter: options.imageAdapter!,
        model: options.imageModel,
        quality: options.imageQuality,
        runRoot: runDir,
        allowBrand: options.allowBrand,
        allowFull: options.allowFull,
        maxUsd: options.maxUsd,
        yes: options.yes,
        log
      })

      if (image.exitCode !== 0 || image.manifest.candidates[0]?.suspectFlatPanel) throw new Error('El cuadro de referencia no pasó: revisa su manifiesto antes de gastar en video.')

      referenceImage = await readFile(join(image.runDir, image.manifest.candidates[0].final))
      manifest.firstFrameRun = image.runDir
    }

    log(`  → motor ${engine.id} …`)

    const edited = await engine.run({ prompt: options.prompt, video: videoBytes, durationSeconds: probe.durationSeconds, referenceImage })
    const engineRaw = join(runDir, 'engine-raw.mp4')

    await writeFileEnsured(engineRaw, edited.video)

    await Promise.all(Object.values(dirs).map(dir => mkdir(dir, { recursive: true })))

    const originalFrames = await extractFrames(options.videoPath, dirs.original)
    const engineFrames = await extractFrames(engineRaw, dirs.engine, { width: probe.width, height: probe.height, fpsFraction: probe.fpsFraction })
    const reconciled = reconcileFrameCount(originalFrames.length, engineFrames.length)

    manifest.frames = { original: originalFrames.length, engine: engineFrames.length, reconciled }

    const engineFrameAt = (index: number) => join(dirs.engine, engineFrames[Math.min(index, engineFrames.length - 1)])

    // Alineación: cuánto cambió el motor la zona protegida. Sobre el umbral, recomponer daría ghosting.
    const samples = spreadIndices(originalFrames.length, 12)
    const drifts: number[] = []

    for (const index of samples) {
      const mask = await videoMask.at(index / probe.fps)
      const zones = measureZones(await loadRgba(join(dirs.original, originalFrames[index])), await loadRgba(engineFrameAt(index)), mask)

      drifts.push(zones.protected.meanDelta)
    }

    manifest.alignment = { sampledFrames: samples.length, medianProtectedDrift: Math.round(median(drifts) * 1000) / 1000, maxDrift }
    log(`  ⇄ deriva media de la zona protegida: ${manifest.alignment.medianProtectedDrift.toFixed(2)}/255 (umbral ${maxDrift})`)

    if (manifest.alignment.medianProtectedDrift > maxDrift) {
      throw new Error(`El motor movió el encuadre (deriva ${manifest.alignment.medianProtectedDrift.toFixed(2)} > ${maxDrift}): recomponer daría ghosting. Usa cámara quieta, otro motor o --max-drift si lo revisaste.`)
    }

    let worstDelta = 0
    let worstFrame: number | null = null
    let flickerSum = 0
    let editedSum = 0
    let previous: { final: RgbaImage; original: RgbaImage } | null = null
    const sheetIndices = new Set(spreadIndices(originalFrames.length, 6))
    const sheet: Array<{ png: Buffer; label: string }> = []

    for (let index = 0; index < originalFrames.length; index += 1) {
      const mask = await videoMask.at(index / probe.fps)
      const original = await loadRgba(join(dirs.original, originalFrames[index]))
      const generated = await loadRgba(engineFrameAt(index))
      const finalPath = join(dirs.final, originalFrames[index])

      await writeFileEnsured(finalPath, await encodeRgbaPng(recompose(original, { ...generated, hadAlpha: original.hadAlpha }, mask)))

      const written = await loadRgba(finalPath)
      const zones = measureZones(original, written, mask)

      if (zones.protected.maxDelta > worstDelta) {
        worstDelta = zones.protected.maxDelta
        worstFrame = index
      }

      editedSum += meanDeltaWithin(original, written, mask)

      if (previous) flickerSum += Math.abs(meanDeltaWithin(previous.final, written, mask) - meanDeltaWithin(previous.original, original, mask))

      previous = { final: written, original }

      if (sheetIndices.has(index)) sheet.push({ png: await sharp(finalPath).png().toBuffer(), label: `${(index / probe.fps).toFixed(2)} s` })
    }

    const frames = originalFrames.length

    manifest.verification = { framesChecked: frames, protectedMaxDelta: worstDelta, verdict: worstDelta === 0 ? 'PASS' : 'FAIL', worstFrame }
    manifest.temporal = {
      flickerIndex: Math.round((frames > 1 ? flickerSum / (frames - 1) : 0) * 1000) / 1000,
      editedMeanDelta: Math.round((editedSum / frames) * 1000) / 1000
    }

    const finalVideo = join(runDir, 'final.mp4')
    const contactSheet = join(runDir, 'contact-sheet.png')

    await encodeFrames(dirs.final, probe.fpsFraction, finalVideo, probe.hasAudio ? options.videoPath : null)
    await writeFileEnsured(contactSheet, await renderContactSheet(sheet, 360))

    manifest.outputs = { final: 'final.mp4', engineRaw: 'engine-raw.mp4', contactSheet: 'contact-sheet.png' }
    manifest.status = 'completed'

    log(
      `    ${worstDelta === 0 ? '✓ PASS' : '✗ FAIL'} · ${frames} cuadros · zona protegida delta máximo ${worstDelta}/255 · parpadeo ${manifest.temporal.flickerIndex.toFixed(2)} · ` +
        `cambio en la zona ${manifest.temporal.editedMeanDelta.toFixed(1)}/255`
    )

    if (manifest.temporal.editedMeanDelta < 6) log('    ⚠ la zona editable casi no cambió: mira si el motor cumplió el pedido.')
  } catch (error) {
    manifest.status = 'failed'
    manifest.error = (error as Error)?.message ?? String(error)
    await writeJson(manifestPath, manifest)
    throw error
  } finally {
    if (!options.keepFrames) await Promise.all(Object.values(dirs).map(dir => rm(dir, { recursive: true, force: true })))
  }

  await writeJson(manifestPath, manifest)

  return { runDir, manifest, reused: false, exitCode: manifest.verification?.verdict === 'PASS' ? 0 : 2 }
}
