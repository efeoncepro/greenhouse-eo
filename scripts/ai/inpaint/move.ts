import { join } from 'node:path'

import sharp from 'sharp'

import type { InpaintImageAdapter, ProviderMaskMode } from './adapters/types'
import { assertBrandSafePrompt } from './brand'
import { maskFromLayers, otherObjectsMask, plateWithoutLayers, readLayersDocument, selectLayers } from './layers'
import { createMask, dilate, encodeMaskPng, erode, feather, intersect, invert, maskStats, union, type CanonicalMask } from './mask'
import { runImageInpaint, type ImageInpaintManifest } from './pipeline-image'
import { encodeRgbaPng, loadRgba, readRaw, singleChannel, type RgbaImage } from './raw'
import { matchColorInRing, measureZones, recompose, type ZoneDelta } from './recompose'
import { sha256, writeFileEnsured, writeJson } from './run-io'
import { detectCastShadow, prepareEraseMask, withCastShadow } from './techniques'

/**
 * Mover o escalar un elemento desde sus capas (TASK-1973, Slice 7), sin IA en lo sensible:
 *
 * 1. el hueco del elemento se rellena con el clean plate de Layerize (corregido de color en un anillo);
 * 2. el elemento se recorta de la imagen ORIGINAL con el alfa de su capa —nunca se usan sus píxeles regenerados— y se
 *    pega en la posición y escala nuevas;
 * 3. opcional: una pasada SÓLO de integración (sombra de contacto, reflejo) en un halo alrededor de la nueva posición.
 *
 * Todo lo que no está en el hueco, el elemento movido o el halo queda idéntico a la original y se verifica.
 */
export const HARMONIZE_PROMPT =
  'Add only a soft contact shadow and subtle reflection under and around the object, matching the light direction of the scene, and blend its edges. Keep the object and everything else exactly the same.'

export interface MoveOptions {
  imagePath: string
  layersJson: string
  layerSelectors: string[]
  dx?: number
  dy?: number
  scale?: number
  harmonize?: 'auto' | 'off'
  /** Incluir en el hueco la sombra proyectada del elemento, medida contra el clean plate. Default `auto`. */
  shadow?: 'auto' | 'off'
  adapter?: InpaintImageAdapter
  model?: string
  quality?: string
  providerMask?: ProviderMaskMode
  runRoot: string
  dryRun?: boolean
  force?: boolean
  maxUsd?: number
  yes?: boolean
  allowBrand?: boolean
  log?: (line: string) => void
}

export interface MoveResult {
  runDir: string
  final: string
  /** Fuera de hueco + elemento movido + halo: debe ser 0. */
  untouched: ZoneDelta
  verdict: 'PASS' | 'FAIL'
  harmonized: boolean
  exitCode: number
}

const scaleRgba = async (image: RgbaImage, width: number, height: number): Promise<RgbaImage> => ({
  ...(await readRaw(sharp(Buffer.from(image.data.buffer, image.data.byteOffset, image.data.length), { raw: { width: image.width, height: image.height, channels: 4 } }).resize(width, height, { fit: 'fill' }), 4, 'elemento escalado')),
  channels: 4,
  hadAlpha: image.hadAlpha
})

const scaleMask = async (mask: CanonicalMask, width: number, height: number): Promise<CanonicalMask> => {
  const raw = await readRaw(singleChannel(mask.data, mask.width, mask.height).resize(width, height, { fit: 'fill' }).toColourspace('b-w'), 1, 'máscara escalada')

  return { width, height, data: raw.data }
}

export interface CutElement {
  pixels: RgbaImage
  alpha: CanonicalMask
}

/** Recorta un elemento de la imagen ORIGINAL con el alfa de su máscara (nunca con los píxeles regenerados de la capa). */
export const cutElement = (image: RgbaImage, mask: CanonicalMask, box: { left: number; top: number; width: number; height: number }): CutElement => {
  const pixels: RgbaImage = { ...image, width: box.width, height: box.height, data: new Uint8Array(box.width * box.height * 4) }
  const alpha = createMask(box.width, box.height)

  for (let y = 0; y < box.height; y += 1) {
    for (let x = 0; x < box.width; x += 1) {
      const from = (box.top + y) * image.width + box.left + x

      pixels.data.set(image.data.subarray(from * 4, from * 4 + 4), (y * box.width + x) * 4)
      alpha.data[y * box.width + x] = mask.data[from]
    }
  }

  return { pixels, alpha }
}

/**
 * Pega un elemento recortado sobre `target` en la caja `at` (escalándolo a su tamaño). Devuelve la composición y la
 * máscara de lo pegado, en el tamaño del destino.
 */
export const pasteElement = async (
  target: RgbaImage,
  cut: CutElement,
  at: { left: number; top: number; width: number; height: number }
): Promise<{ composed: RgbaImage; placed: CanonicalMask }> => {
  const [pixels, alpha] = await Promise.all([scaleRgba(cut.pixels, at.width, at.height), scaleMask(cut.alpha, at.width, at.height)])
  const placed = createMask(target.width, target.height)
  const composed: RgbaImage = { ...target, data: new Uint8Array(target.data) }

  for (let y = 0; y < at.height; y += 1) {
    for (let x = 0; x < at.width; x += 1) {
      const cx = at.left + x
      const cy = at.top + y

      if (cx < 0 || cy < 0 || cx >= target.width || cy >= target.height) continue

      const a = alpha.data[y * at.width + x]

      if (!a) continue

      const o = (cy * target.width + cx) * 4
      const i = (y * at.width + x) * 4

      for (let c = 0; c < 4; c += 1) composed.data[o + c] = Math.round((pixels.data[i + c] * a + composed.data[o + c] * (255 - a)) / 255)
      placed.data[cy * target.width + cx] = a
    }
  }

  if (!maskStats(placed).editable && !maskStats(placed).soft) throw new Error('El elemento quedó fuera del lienzo con esa posición.')

  return { composed, placed }
}

/** Halo de integración alrededor de lo pegado: donde el modelo pone sombra de contacto y reflejo, nunca encima del elemento. */
export const integrationHalo = (placed: CanonicalMask): Promise<CanonicalMask> => feather(intersect(dilate(placed, 48), invert(erode(placed, 4))), 12)

export const runMove = async (options: MoveOptions): Promise<MoveResult> => {
  const log = options.log ?? (line => process.stdout.write(`${line}\n`))
  const dx = options.dx ?? 0
  const dy = options.dy ?? 0
  const scale = options.scale ?? 1

  if (!(scale > 0.2 && scale <= 3)) throw new Error('--scale debe estar entre 0,2 y 3.')
  if (dx === 0 && dy === 0 && scale === 1) throw new Error('Indica --dx, --dy o --scale: el elemento no se mueve.')

  const doc = await readLayersDocument(options.layersJson)

  for (const layer of selectLayers(doc, options.layerSelectors)) assertBrandSafePrompt(`${layer.name ?? ''} ${layer.description ?? ''}`, Boolean(options.allowBrand))

  const base = await loadRgba(options.imagePath)
  const element = await maskFromLayers(options.layersJson, options.layerSelectors, { width: base.width, height: base.height })
  const box = maskStats(element).bbox

  if (!box) throw new Error('La capa elegida no tiene píxeles visibles.')

  const runDir = join(options.runRoot, 'move', sha256(JSON.stringify({ v: 2, image: sha256(base.data), layers: options.layerSelectors, dx, dy, scale, h: options.harmonize ?? 'auto', shadow: options.shadow ?? 'auto' })).slice(0, 12))

  // 1. Hueco: clean plate corregido de color, sólo dentro de la máscara agrandada del elemento.
  const plate = await loadRgba(await plateWithoutLayers(options.layersJson, doc, selectLayers(doc, options.layerSelectors), { width: base.width, height: base.height }))
  const others = await otherObjectsMask(options.layersJson, doc, selectLayers(doc, options.layerSelectors), { width: base.width, height: base.height })
  const shadow = (options.shadow ?? 'auto') === 'auto' ? detectCastShadow(base, plate, element, { others }) : null
  // El hueco nunca pisa a otro objeto: el agrandado y el difuminado se recortan contra los demás.
  const hole = intersect(await prepareEraseMask(shadow ? withCastShadow(element, shadow) : element, 12), invert(others))

  if (shadow?.pixels) log(`  ◐ la sombra del elemento en su lugar original también se borra: ${shadow.pixels} px (--shadow off para dejarla)`)

  const corrected = matchColorInRing(base, plate, hole).image
  const withHole = recompose(base, corrected, hole)

  // 2. Elemento recortado de la ORIGINAL, escalado alrededor de su centro y pegado en la posición nueva.
  const cut = cutElement(base, element, box)
  const width = Math.max(1, Math.round(box.width * scale))
  const height = Math.max(1, Math.round(box.height * scale))

  const { composed, placed } = await pasteElement(withHole, cut, {
    left: Math.round(box.left + box.width / 2 - width / 2 + dx),
    top: Math.round(box.top + box.height / 2 - height / 2 + dy),
    width,
    height
  })

  const composedPath = join(runDir, 'composed.png')

  await writeFileEnsured(composedPath, await encodeRgbaPng(composed))
  log(`  ⇢ elemento movido (${dx}, ${dy}) px · escala ${scale} · hueco con clean plate · píxeles del elemento tomados de la ORIGINAL`)

  // 3. Integración opcional en un halo alrededor de la posición nueva.
  const halo = await integrationHalo(placed)
  let finalPath = composedPath
  let harmonized = false
  let manifest: ImageInpaintManifest | null = null

  if ((options.harmonize ?? 'auto') === 'auto') {
    if (!options.adapter) throw new Error('La integración necesita un adaptador de imagen (o --harmonize off).')

    const haloPath = join(runDir, 'halo-mask.png')

    await writeFileEnsured(haloPath, await encodeMaskPng(halo))

    const result = await runImageInpaint({
      imagePath: composedPath,
      maskPath: haloPath,
      prompt: HARMONIZE_PROMPT,
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
      harmonized = true
    }
  }

  // Verificación contra la ORIGINAL: todo lo que no es hueco, elemento movido o halo, intacto.
  const touched = union(union(hole, placed), harmonized ? halo : createMask(base.width, base.height))
  const final = await loadRgba(finalPath)
  const untouched = measureZones(base, final, touched).protected
  const verdict = untouched.maxDelta === 0 ? 'PASS' : 'FAIL'

  await writeJson(join(runDir, 'move.json'), {
    kind: 'ai-inpaint-move',
    source: options.imagePath,
    layers: options.layerSelectors,
    dx,
    dy,
    scale,
    harmonized,
    shadowPixels: shadow?.pixels ?? 0,
    final: finalPath,
    untouched,
    verdict,
    harmonizeRun: manifest ? { runId: manifest.runId, verdict: manifest.candidates[0]?.verdict ?? null } : null
  })

  log(`    ${verdict === 'PASS' ? '✓ PASS' : '✗ FAIL'} · fuera de lo tocado: delta máximo ${untouched.maxDelta}/255 · ${finalPath.replace(process.cwd(), '.')}`)

  return { runDir, final: finalPath, untouched, verdict, harmonized, exitCode: verdict === 'PASS' ? 0 : 2 }
}
