import { join } from 'node:path'

import sharp from 'sharp'

import type { InpaintImageAdapter } from './adapters/types'
import { assertBrandSafePrompt } from './brand'
import { planCrop, type CropMode, type CropPlan } from './crop'
import { assertMaskUsable, cropMask, encodeMaskPng, loadMask, renderMaskPreview, resizeMask, type MaskConvention } from './mask'
import { cropRgba, measureZones, placePatch, recompose, renderDiff, resizeRgba, verifyRecomposition, type VerificationReport, type ZoneDelta } from './recompose'
import { encodeRgbaPng, loadRgba } from './raw'
import { exists, INPAINT_PIPELINE_VERSION, readJson, renderContactSheet, runDirFor, sha256, stableStringify, writeFileEnsured, writeJson } from './run-io'

/**
 * Pipeline de inpainting de imagen (TASK-1965):
 * máscara → recorte con contexto → generación (adaptador) → recomposición → verificación → manifiesto.
 *
 * La salida final se verifica RELEYENDO el archivo escrito, no el buffer en memoria: así una conversión de color o de
 * formato al guardar también queda medida.
 */
export interface ImageInpaintOptions {
  imagePath: string
  maskPath: string
  maskConvention?: MaskConvention
  prompt: string
  adapter: InpaintImageAdapter
  model?: string
  quality?: string
  seed?: number
  count?: number
  crop?: CropMode
  /** Carpeta de la pieza (p. ej. `ai-generations/2026-10-02_mi-pieza`); la corrida vive en `<runRoot>/inpaint/<id>/`. */
  runRoot: string
  dryRun?: boolean
  force?: boolean
  allowBrand?: boolean
  allowFull?: boolean
  /** Tope de confirmación en USD; sobre él se exige `yes`. */
  maxUsd?: number
  yes?: boolean
  log?: (line: string) => void
}

export interface CandidateRecord {
  index: number
  raw: string
  final: string
  diff: string
  verdict: VerificationReport['verdict']
  reason: string
  /** Cuánto cambió la zona abierta; bajo LOW_EDIT_MEAN_DELTA se avisa que el pedido quizá no se cumplió. */
  editedMeanDelta: number
  /** La zona editable volvió como panel negro plano (salida cruda): el candidato no sirve aunque pase la verificación. */
  suspectFlatPanel: boolean
  protected: ZoneDelta
  editable: ZoneDelta
  seam: ZoneDelta
  /** Cuánto cambió el modelo la zona protegida DENTRO del recorte antes de recomponer (deriva medida). */
  modelDriftInProtected: ZoneDelta
  outputUsd: number | null
  providerModel: string
  usage: Record<string, unknown> | null
  meta: Record<string, unknown>
}

export interface ImageInpaintManifest {
  kind: 'ai-inpaint-image'
  pipelineVersion: number
  runId: string
  key: string
  status: 'dry-run' | 'completed' | 'failed'
  createdAt: string
  inputs: { image: string; imageSha256: string; mask: string; maskSha256: string; maskConvention: MaskConvention; width: number; height: number }
  adapter: { id: string; provider: string; sendsMask: boolean; verifiedAt: string | null }
  request: { model: string; quality: string | null; seed: number | null; count: number; prompt: string }
  mask: { touchedFraction: number; editable: number; soft: number; protected: number }
  crop: CropPlan
  estimate: { usd: number | null; basis: string }
  candidates: CandidateRecord[]
  error?: string
}

export interface ImageInpaintResult {
  runDir: string
  manifest: ImageInpaintManifest
  reused: boolean
  exitCode: number
}

/**
 * Fracción de la zona totalmente editable que vino casi negra y plana (≤ 8/255 en todo canal). Sobre la mitad, el
 * modelo devolvió un panel en vez de la edición: la trampa de Sunburst con máscara (3 de 3 pasadas, 2026-09-23 y
 * 2026-10-02). Se mide sobre la salida CRUDA, antes de recomponer.
 */
export const flatBlackFraction = (generated: { data: Uint8Array }, mask: { data: Uint8Array }): number => {
  let open = 0
  let black = 0

  for (let i = 0; i < mask.data.length; i += 1) {
    if (mask.data[i] !== 255) continue
    open += 1

    if (generated.data[i * 4] <= 8 && generated.data[i * 4 + 1] <= 8 && generated.data[i * 4 + 2] <= 8) black += 1
  }

  return open ? black / open : 0
}

export const FLAT_PANEL_THRESHOLD = 0.5

/** Bajo este delta medio en la zona abierta, la edición probablemente no ocurrió (aviso, no veredicto). */
export const LOW_EDIT_MEAN_DELTA = 12

/** Delta medio de lo que la máscara abrió (núcleo + borde), ponderado por píxeles. */
export const editedMeanDelta = (report: Pick<VerificationReport, 'editable' | 'seam'>): number => {
  const pixels = report.editable.pixels + report.seam.pixels

  return pixels ? (report.editable.meanDelta * report.editable.pixels + report.seam.meanDelta * report.seam.pixels) / pixels : 0
}

/** 0 si todos los candidatos pasan; 2 si alguno falló la verificación. */
export const exitCodeFor = (manifest: Pick<ImageInpaintManifest, 'status' | 'candidates'>): number => {
  if (manifest.status === 'failed') return 1

  return manifest.candidates.every(candidate => candidate.verdict === 'PASS') ? 0 : 2
}

const resolveCostCap = (maxUsd: number | undefined) => maxUsd ?? Number(process.env.AI_COST_CONFIRM_USD ?? process.env.FAL_COST_CONFIRM_USD ?? 1)

export const runImageInpaint = async (options: ImageInpaintOptions): Promise<ImageInpaintResult> => {
  const log = options.log ?? (line => process.stdout.write(`${line}\n`))
  const adapter = options.adapter
  const model = options.model ?? adapter.defaultModel
  const count = options.count ?? 1
  const convention = options.maskConvention ?? 'white-editable'

  if (!Number.isInteger(count) || count < 1 || count > 8) throw new Error('--count debe ser un entero entre 1 y 8.')
  if (!options.prompt.trim()) throw new Error('El prompt está vacío.')

  adapter.validate({ model, quality: options.quality, seed: options.seed })

  for (const advisory of adapter.advisories?.({ model, quality: options.quality, seed: options.seed }) ?? []) log(`  ⚠ ${advisory}`)
  assertBrandSafePrompt(options.prompt, Boolean(options.allowBrand))

  const [imageBytes, baseMeta] = await Promise.all([sharp(options.imagePath).toBuffer(), sharp(options.imagePath).metadata()])
  const base = await loadRgba(options.imagePath, 'base')
  const mask = await loadMask(options.maskPath, convention)

  if (mask.width !== base.width || mask.height !== base.height) {
    throw new Error(`La máscara mide ${mask.width}x${mask.height} y la base ${base.width}x${base.height}: deben medir lo mismo (pnpm ai:mask --base).`)
  }

  const stats = assertMaskUsable(mask, { allowFull: options.allowFull })

  if (baseMeta.icc) log('  ⚠ la base trae perfil ICC: la salida queda en sRGB (la verificación compara en sRGB).')
  if (!adapter.verifiedAt) log(`  ⚠ ${adapter.id}: contrato verificado, generación real SIN verificar todavía.`)
  if (!adapter.sendsMask) log(`  · ${adapter.id} edita por instrucción: la máscara no viaja, sólo recompone.`)

  const plan = planCrop({ imageWidth: base.width, imageHeight: base.height, maskBox: stats.bbox!, pick: adapter.pickSize(model), mode: options.crop })

  log(`  ✂ ${plan.mode === 'crop' ? `recorte ${plan.box.width}x${plan.box.height} en (${plan.box.left}, ${plan.box.top})` : 'imagen completa'} → ${plan.target.width}x${plan.target.height} · ${plan.reason}`)

  const estimate = await adapter.estimate({ model, quality: options.quality, seed: options.seed, size: plan.target, count })

  log(estimate.usd === null ? `  $ costo: sin estimación (${estimate.basis})` : `  $ costo estimado ≈ USD ${estimate.usd.toFixed(3)} · ${estimate.basis}`)

  const key = sha256(
    stableStringify({
      v: INPAINT_PIPELINE_VERSION,
      image: sha256(base.data),
      mask: sha256(mask.data),
      size: [base.width, base.height],
      prompt: options.prompt,
      adapter: adapter.id,
      adapterRevision: adapter.revision,
      model,
      quality: options.quality ?? null,
      seed: options.seed ?? null,
      count,
      crop: { box: plan.box, target: plan.target }
    })
  )

  const runDir = runDirFor(options.runRoot, key)
  const manifestPath = join(runDir, 'manifest.json')
  const previous = await readJson<ImageInpaintManifest>(manifestPath)

  if (!options.force && !options.dryRun && previous?.status === 'completed') {
    const files = await Promise.all(previous.candidates.map(candidate => exists(join(runDir, candidate.final))))

    if (files.every(Boolean)) {
      log(`  ↺ misma entrada ya generada: se reutiliza ${runDir.replace(process.cwd(), '.')} sin pagar (usa --force para regenerar)`)

      return { runDir, manifest: previous, reused: true, exitCode: exitCodeFor(previous) }
    }
  }

  const cap = resolveCostCap(options.maxUsd)

  if (!options.dryRun && estimate.usd !== null && estimate.usd > cap && !options.yes) {
    throw new Error(`La estimación (USD ${estimate.usd.toFixed(3)}) supera el tope de USD ${cap.toFixed(2)}. Repite con --yes o ajusta --max-usd.`)
  }

  const cropImage = await resizeRgba(cropRgba(base, plan.box), plan.target.width, plan.target.height)
  const cropMaskTarget = await resizeMask(cropMask(mask, plan.box), plan.target.width, plan.target.height)
  const providerImage = await encodeRgbaPng(cropImage)

  await writeFileEnsured(join(runDir, 'mask-preview.png'), await renderMaskPreview(base, mask))
  await writeFileEnsured(join(runDir, 'provider-input.png'), providerImage)
  await writeFileEnsured(join(runDir, 'provider-mask.png'), await encodeMaskPng(cropMaskTarget))

  const manifest: ImageInpaintManifest = {
    kind: 'ai-inpaint-image',
    pipelineVersion: INPAINT_PIPELINE_VERSION,
    runId: key.slice(0, 12),
    key,
    status: 'dry-run',
    createdAt: new Date().toISOString(),
    inputs: {
      image: options.imagePath,
      imageSha256: sha256(imageBytes),
      mask: options.maskPath,
      maskSha256: sha256(mask.data),
      maskConvention: convention,
      width: base.width,
      height: base.height
    },
    adapter: { id: adapter.id, provider: adapter.provider, sendsMask: adapter.sendsMask, verifiedAt: adapter.verifiedAt },
    request: { model, quality: options.quality ?? null, seed: options.seed ?? null, count, prompt: options.prompt },
    mask: { touchedFraction: stats.touchedFraction, editable: stats.editable, soft: stats.soft, protected: stats.protected },
    crop: plan,
    estimate,
    candidates: []
  }

  if (options.dryRun) {
    await writeJson(manifestPath, manifest)
    log(`  ◌ dry-run: nada se envió al proveedor. Revisa ${join(runDir, 'mask-preview.png').replace(process.cwd(), '.')}`)

    return { runDir, manifest, reused: false, exitCode: 0 }
  }

  try {
    for (let index = 0; index < count; index += 1) {
      log(`  → candidato ${index + 1}/${count} …`)

      const output = await adapter.run({
        prompt: options.prompt,
        image: providerImage,
        mask: cropMaskTarget,
        size: plan.target,
        model,
        quality: options.quality,
        seed: options.seed === undefined ? undefined : options.seed + index
      })

      const rawName = `candidate-${index + 1}-raw.png`
      const finalName = `candidate-${index + 1}.png`
      const diffName = `candidate-${index + 1}-diff.png`

      await writeFileEnsured(join(runDir, rawName), await sharp(output.image).png().toBuffer())

      const patch = await resizeRgba(await loadRgba(output.image, 'salida del proveedor'), plan.box.width, plan.box.height)
      const generatedFull = placePatch(base, { ...patch, hadAlpha: base.hadAlpha }, plan.box)
      const drift = measureZones(base, generatedFull, mask).protected
      const blackShare = flatBlackFraction(generatedFull, mask)

      await writeFileEnsured(join(runDir, finalName), await encodeRgbaPng(recompose(base, generatedFull, mask)))

      // La verificación lee el ARCHIVO, no el buffer.
      const written = await loadRgba(join(runDir, finalName), 'resultado escrito')
      const report = verifyRecomposition(base, written, mask)

      await writeFileEnsured(join(runDir, diffName), await renderDiff(base, written))

      manifest.candidates.push({
        index: index + 1,
        raw: rawName,
        final: finalName,
        diff: diffName,
        verdict: report.verdict,
        reason: report.reason,
        editedMeanDelta: Math.round(editedMeanDelta(report) * 1000) / 1000,
        suspectFlatPanel: blackShare > FLAT_PANEL_THRESHOLD,
        protected: report.protected,
        editable: report.editable,
        seam: report.seam,
        modelDriftInProtected: drift,
        outputUsd: output.outputUsd,
        providerModel: output.providerModel,
        usage: output.usage,
        meta: output.meta
      })

      log(
        `    ${report.verdict === 'PASS' ? '✓' : '✗'} ${report.verdict} · ${report.reason} · el modelo había movido la zona protegida hasta ${drift.maxDelta}/255` +
          (output.outputUsd === null ? '' : ` · salida USD ${output.outputUsd.toFixed(4)}`)
      )

      // La verificación garantiza lo que NO se toca; no juzga si el pedido se cumplió. Si la zona abierta casi no
      // cambió, el modelo probablemente ignoró el prompt (canario 2026-10-02: GPT Image `low` redibujó sin la planta).
      if (blackShare > FLAT_PANEL_THRESHOLD) {
        log(`    ⚠ el ${(blackShare * 100).toFixed(0)} % de la zona editable volvió negra y plana: el modelo devolvió un panel, no la edición. Descarta este candidato.`)
      } else if (editedMeanDelta(report) < LOW_EDIT_MEAN_DELTA) {
        log(`    ⚠ la zona editable casi no cambió (delta medio ${editedMeanDelta(report).toFixed(1)}/255): mira si el modelo cumplió el pedido.`)
      }
    }

    if (count > 1) {
      const items = await Promise.all(manifest.candidates.map(async c => ({ png: await sharp(join(runDir, c.final)).png().toBuffer(), label: `${c.index} · ${c.verdict}` })))

      await writeFileEnsured(join(runDir, 'contact-sheet.png'), await renderContactSheet(items))
    }

    manifest.status = 'completed'
  } catch (error) {
    manifest.status = 'failed'
    manifest.error = (error as Error)?.message ?? String(error)
    await writeJson(manifestPath, manifest)
    throw error
  }

  await writeJson(manifestPath, manifest)

  return { runDir, manifest, reused: false, exitCode: exitCodeFor(manifest) }
}
