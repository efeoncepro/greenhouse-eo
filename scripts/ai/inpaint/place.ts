import { join } from 'node:path'

import type { InpaintImageAdapter, ProviderMaskMode } from './adapters/types'
import { assertBrandSafePrompt } from './brand'
import { maskFromLayers, readLayersDocument, selectLayers } from './layers'
import { createMask, dilate, encodeMaskPng, feather, maskStats, union } from './mask'
import { cutElement, HARMONIZE_PROMPT, integrationHalo, pasteElement } from './move'
import { runImageInpaint, type ImageInpaintManifest } from './pipeline-image'
import { encodeRgbaPng, loadRgba } from './raw'
import { measureZones, type ZoneDelta } from './recompose'
import { sha256, writeFileEnsured, writeJson } from './run-io'

/**
 * `pnpm ai:inpaint place` (TASK-1973): incorpora un elemento separado con `pnpm ai:layers` en OTRA imagen.
 *
 * 1. El elemento se recorta de su imagen ORIGINAL con el alfa de su capa (nunca los píxeles regenerados de la capa).
 * 2. Se pega en el destino, en el centro y ancho pedidos.
 * 3. El modelo lo TERMINA: `--finish halo` (default) sólo pone sombra de contacto, reflejo y borde alrededor; `element`
 *    además deja que relumine el elemento para que tome la luz de la escena (su forma puede variar: míralo al 100 %).
 *
 * Todo el destino fuera de lo pegado y de su zona de acabado queda idéntico y se verifica.
 */
export const RELIGHT_PROMPT =
  'Integrate the pasted object into the scene: match its lighting, color temperature and shadows to the scene light, add a soft contact shadow and subtle reflection, and blend its edges. Keep the object shape, proportions, colors, materials and any text exactly the same.'

export interface PlaceOptions {
  /** Imagen destino. */
  imagePath: string
  /** Imagen de donde sale el elemento (la que se separó con ai:layers). */
  sourceImagePath: string
  layersJson: string
  layerSelectors: string[]
  /** Centro del elemento en el destino, en fracciones 0–1. */
  at: { x: number; y: number }
  /** Ancho del elemento en el destino, en fracción del ancho del destino. Default: el mismo tamaño en píxeles. */
  width?: number
  finish?: 'halo' | 'element' | 'off'
  adapter?: InpaintImageAdapter
  model?: string
  quality?: string
  providerMask?: ProviderMaskMode
  prompt?: string
  runRoot: string
  dryRun?: boolean
  force?: boolean
  maxUsd?: number
  yes?: boolean
  allowBrand?: boolean
  log?: (line: string) => void
}

export interface PlaceResult {
  runDir: string
  final: string
  untouched: ZoneDelta
  verdict: 'PASS' | 'FAIL'
  finished: boolean
  exitCode: number
}

export const runPlace = async (options: PlaceOptions): Promise<PlaceResult> => {
  const log = options.log ?? (line => process.stdout.write(`${line}\n`))
  const finish = options.finish ?? 'halo'

  if (![options.at.x, options.at.y].every(value => value >= 0 && value <= 1)) throw new Error('--at espera fracciones 0–1: x,y del centro del elemento.')
  if (options.width !== undefined && !(options.width > 0 && options.width <= 1)) throw new Error('--width espera una fracción 0–1 del ancho del destino.')

  const doc = await readLayersDocument(options.layersJson)

  for (const layer of selectLayers(doc, options.layerSelectors)) assertBrandSafePrompt(`${layer.name ?? ''} ${layer.description ?? ''}`, Boolean(options.allowBrand))

  const source = await loadRgba(options.sourceImagePath, 'imagen de origen')
  const target = await loadRgba(options.imagePath, 'imagen destino')
  const element = await maskFromLayers(options.layersJson, options.layerSelectors, { width: source.width, height: source.height })
  const box = maskStats(element).bbox

  if (!box) throw new Error('La capa elegida no tiene píxeles visibles.')

  const width = Math.max(1, Math.round(options.width ? options.width * target.width : box.width))
  const height = Math.max(1, Math.round((box.height * width) / box.width))
  const left = Math.round(options.at.x * target.width - width / 2)
  const top = Math.round(options.at.y * target.height - height / 2)

  const runDir = join(
    options.runRoot,
    'place',
    sha256(JSON.stringify({ v: 1, target: sha256(target.data), source: sha256(source.data), layers: options.layerSelectors, left, top, width, finish })).slice(0, 12)
  )

  const { composed, placed } = await pasteElement(target, cutElement(source, element, box), { left, top, width, height })
  const composedPath = join(runDir, 'composed.png')

  await writeFileEnsured(composedPath, await encodeRgbaPng(composed))
  log(`  ⇢ elemento pegado en (${left}, ${top}) a ${width}x${height} px · píxeles tomados de la imagen de ORIGEN`)

  // Zona de acabado: el halo (sombra y borde) o, con `element`, también el elemento entero.
  const zone = finish === 'element' ? await feather(union(dilate(placed, 48), placed), 12) : await integrationHalo(placed)
  let finalPath = composedPath
  let finished = false
  let manifest: ImageInpaintManifest | null = null

  if (finish !== 'off') {
    if (!options.adapter) throw new Error('El acabado necesita un adaptador de imagen (o --finish off).')

    const zonePath = join(runDir, 'finish-mask.png')

    await writeFileEnsured(zonePath, await encodeMaskPng(zone))

    const result = await runImageInpaint({
      imagePath: composedPath,
      maskPath: zonePath,
      prompt: options.prompt ?? (finish === 'element' ? RELIGHT_PROMPT : HARMONIZE_PROMPT),
      adapter: options.adapter,
      model: options.model,
      quality: options.quality,
      providerMask: options.providerMask,
      runRoot: runDir,
      dryRun: options.dryRun,
      force: options.force,
      maxUsd: options.maxUsd,
      yes: options.yes,
      log
    })

    manifest = result.manifest

    if (result.manifest.status === 'completed' && result.manifest.candidates[0]) {
      finalPath = join(result.runDir, result.manifest.candidates[0].final)
      finished = true
    }
  }

  const touched = union(placed, finished ? zone : createMask(target.width, target.height))
  const untouched = measureZones(target, await loadRgba(finalPath), touched).protected
  const verdict = untouched.maxDelta === 0 ? 'PASS' : 'FAIL'

  await writeJson(join(runDir, 'place.json'), {
    kind: 'ai-inpaint-place',
    target: options.imagePath,
    source: options.sourceImagePath,
    layers: options.layerSelectors,
    box: { left, top, width, height },
    finish,
    finished,
    final: finalPath,
    untouched,
    verdict,
    finishRun: manifest ? { runId: manifest.runId, verdict: manifest.candidates[0]?.verdict ?? null } : null
  })

  log(`    ${verdict === 'PASS' ? '✓ PASS' : '✗ FAIL'} · destino fuera de lo pegado y su acabado: delta máximo ${untouched.maxDelta}/255 · ${finalPath.replace(process.cwd(), '.')}`)

  return { runDir, final: finalPath, untouched, verdict, finished, exitCode: verdict === 'PASS' ? 0 : 2 }
}
