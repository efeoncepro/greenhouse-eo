import { join } from 'node:path'

import sharp from 'sharp'

import type { InpaintImageAdapter } from './adapters/types'
import { assertBrandSafePrompt } from './brand'
import { cleanPlatePath, maskFromLayers, readLayersDocument, selectLayers } from './layers'
import { encodeMaskPng, loadMask, type MaskConvention } from './mask'
import { runImageInpaint, type ImageInpaintResult } from './pipeline-image'
import { loadRgba } from './raw'
import { readJson, sha256, writeFileEnsured, writeJson } from './run-io'
import { createPlateAdapter, ERASE_DEFAULT_PROMPT, loadPlateAtSize, measureErasure, prepareEraseMask, type ErasureReport } from './techniques'

/**
 * `pnpm ai:inpaint erase` (TASK-1973, Slice 4): borra un objeto.
 *
 * - Zona: `--mask` explícita (nunca se altera) o derivada de capas (`--layers` + `--layer`), que se agranda para
 *   llevarse borde y sombra.
 * - Relleno: `plate` (la base de Layerize: la escena sin el objeto, sin proveedor ni gasto) o `model` (un modelo con
 *   máscara reconstruye el fondo).
 * - Después de la verificación del núcleo se mide si el objeto sigue ahí (residuo).
 */
export interface EraseOptions {
  imagePath: string
  maskPath?: string
  maskConvention?: MaskConvention
  layersJson?: string
  layerSelectors?: string[]
  fill?: 'plate' | 'model'
  growPx?: number
  modelAdapter?: InpaintImageAdapter
  model?: string
  quality?: string
  prompt?: string
  count?: number
  runRoot: string
  dryRun?: boolean
  force?: boolean
  maxUsd?: number
  yes?: boolean
  allowBrand?: boolean
  log?: (line: string) => void
}

export interface EraseResult extends ImageInpaintResult {
  erasure: ErasureReport[]
}

export const runErase = async (options: EraseOptions): Promise<EraseResult> => {
  const log = options.log ?? (line => process.stdout.write(`${line}\n`))
  const meta = await sharp(options.imagePath).metadata()

  if (!meta.width || !meta.height) throw new Error('No se pudo leer el tamaño de la imagen.')
  if (!options.maskPath && !options.layersJson) throw new Error('Indica la zona: --mask, o --layers <layers.json> con --layer.')

  const fill = options.fill ?? (options.layersJson ? 'plate' : 'model')

  if (fill === 'plate' && !options.layersJson) throw new Error('--fill plate necesita --layers (el clean plate sale de pnpm ai:layers).')

  let maskPath = options.maskPath

  if (!maskPath) {
    const doc = await readLayersDocument(options.layersJson!)
    const selectors = options.layerSelectors ?? []

    if (!selectors.length) throw new Error('--layers necesita al menos un --layer <nombre|#índice>.')

    // Un logo o una marca no se borra ni se reconstruye con IA.
    for (const layer of selectLayers(doc, selectors)) assertBrandSafePrompt(`${layer.name ?? ''} ${layer.description ?? ''}`, Boolean(options.allowBrand))

    const derived = await prepareEraseMask(await maskFromLayers(options.layersJson!, selectors, { width: meta.width, height: meta.height }), options.growPx ?? 16)
    const png = await encodeMaskPng(derived)

    maskPath = join(options.runRoot, 'erase-masks', `${sha256(png).slice(0, 12)}.png`)
    await writeFileEnsured(maskPath, png)
    log(`  ✎ máscara de borrado desde ${selectors.length} capa(s), agrandada ${options.growPx ?? 16} px: ${maskPath.replace(process.cwd(), '.')}`)
  }

  let adapter: InpaintImageAdapter

  if (fill === 'plate') {
    const doc = await readLayersDocument(options.layersJson!)

    adapter = createPlateAdapter({
      png: await loadPlateAtSize(cleanPlatePath(options.layersJson!, doc), meta.width, meta.height),
      width: meta.width,
      height: meta.height,
      source: doc.base.file
    })
    log('  ◫ relleno: clean plate de Layerize (sin proveedor, sin gasto)')
  } else {
    if (!options.modelAdapter) throw new Error('--fill model necesita un adaptador de imagen.')
    adapter = options.modelAdapter
  }

  const result = await runImageInpaint({
    imagePath: options.imagePath,
    maskPath,
    maskConvention: options.maskConvention,
    prompt: options.prompt ?? ERASE_DEFAULT_PROMPT,
    adapter,
    model: fill === 'plate' ? 'clean-plate' : options.model,
    quality: fill === 'plate' ? undefined : options.quality,
    count: fill === 'plate' ? 1 : options.count,
    crop: fill === 'plate' ? 'off' : undefined,
    // El plate ya es la escena sin el objeto: sin guía de zona.
    guide: fill === 'plate' ? 'off' : undefined,
    runRoot: options.runRoot,
    dryRun: options.dryRun,
    force: options.force,
    maxUsd: options.maxUsd,
    yes: options.yes,
    allowBrand: options.allowBrand,
    log
  })

  if (result.manifest.status !== 'completed') return { ...result, erasure: [] }

  const base = await loadRgba(options.imagePath)
  const mask = await loadMask(maskPath, options.maskConvention)
  const erasure = await Promise.all(result.manifest.candidates.map(async candidate => measureErasure(base, await loadRgba(join(result.runDir, candidate.final)), mask)))

  erasure.forEach((report, index) =>
    log(
      report.residueSuspected
        ? `    ⚠ candidato ${index + 1}: la zona casi no cambió (${report.changeInCore}/255): el objeto puede seguir ahí.`
        : `    · candidato ${index + 1}: borrado (cambio en el núcleo ${report.changeInCore}/255)`
    )
  )

  const manifestPath = join(result.runDir, 'manifest.json')
  const manifest = await readJson<Record<string, unknown>>(manifestPath)

  if (manifest) await writeJson(manifestPath, { ...manifest, erase: { fill, layers: options.layerSelectors ?? null, erasure } })

  const exitCode = result.exitCode === 0 && erasure.length && erasure.every(report => report.residueSuspected) ? 3 : result.exitCode

  return { ...result, exitCode, erasure }
}
