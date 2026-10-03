import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import sharp from 'sharp'

import { createMask, MaskError, union, type CanonicalMask } from './mask'
import { readRaw, singleChannel } from './raw'

/**
 * Capas de Seedream 5 Pro Layerize como SEGMENTADOR y fuente de CLEAN PLATE (TASK-1973).
 *
 * Las capas son contenido regenerado: el modelo vuelve a dibujar cada elemento y rellena lo ocluido. Por eso nunca se
 * usan como píxeles finales de lo que no se edita: aportan (1) la máscara de un elemento con nombre —el alfa de su
 * capa, ubicado con su `bounding_box`— que se aplica sobre la imagen ORIGINAL, y (2) la imagen base, una escena sin
 * los elementos (clean plate), para borrar o mover.
 *
 * Contrato del endpoint (OpenAPI leído 2026-10-03): `layers[0]` es la base (`z_index` 0, sin caja); luego hasta 16
 * capas por `z_index` creciente, cada una con `name`, `description`, `image` y `bounding_box.absolute`
 * `[left, top, right, bottom]` en píxeles de la BASE (que puede no medir lo mismo que la entrada) y `normalized` 0–1000.
 */
export interface LayerRecord {
  index: number
  zIndex: number
  name: string | null
  description: string | null
  /** Archivo PNG de la capa, relativo a la carpeta de `layers.json`. */
  file: string
  width: number
  height: number
  /** Caja en píxeles de la base; null en la base. */
  box: { left: number; top: number; right: number; bottom: number } | null
  /** Fracción del rectángulo de la capa con alfa > 127 (null en la base). */
  alphaCoverage: number | null
}

export interface LayersDocument {
  kind: 'ai-layers'
  version: 1
  source: { image: string; sha256: string; width: number; height: number }
  base: { file: string; width: number; height: number }
  layers: LayerRecord[]
  request: { prompt: string | null; imageSize: string }
  cost: { layerCount: number; perLayerUsd: number | null; estimatedUsd: number | null; note: string }
  providerMeta: Record<string, unknown>
}

export const readLayersDocument = async (path: string): Promise<LayersDocument> => {
  const doc = JSON.parse(await readFile(path, 'utf8')) as LayersDocument

  if (doc.kind !== 'ai-layers' || !Array.isArray(doc.layers)) throw new Error(`${path} no es un layers.json de pnpm ai:layers.`)

  return doc
}

const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

/**
 * Elige capas por índice (`#3` o `3`) o por nombre. El nombre se busca exacto y, si no hay exacto, como fragmento;
 * un fragmento que coincide con varias capas es ambiguo y se rechaza con la lista, para no editar la capa equivocada.
 */
export const selectLayers = (doc: LayersDocument, selectors: string[]): LayerRecord[] => {
  const candidates = doc.layers.filter(layer => layer.box)

  return selectors.map(selector => {
    const asIndex = /^#?(\d+)$/.exec(selector.trim())

    if (asIndex) {
      const found = candidates.find(layer => layer.index === Number(asIndex[1]))

      if (!found) throw new Error(`No hay capa #${asIndex[1]}. Capas: ${describeLayers(doc)}.`)

      return found
    }

    const wanted = normalize(selector)
    const exact = candidates.filter(layer => normalize(layer.name ?? '') === wanted)

    if (exact.length === 1) return exact[0]

    const partial = candidates.filter(layer => normalize(layer.name ?? '').includes(wanted) || normalize(layer.description ?? '').includes(wanted))

    if (partial.length === 1) return partial[0]
    if (partial.length > 1) throw new Error(`"${selector}" coincide con varias capas (${partial.map(layer => `#${layer.index} ${layer.name}`).join(', ')}): usa el índice.`)

    throw new Error(`Ninguna capa se llama "${selector}". Capas: ${describeLayers(doc)}.`)
  })
}

export const describeLayers = (doc: LayersDocument): string =>
  doc.layers
    .filter(layer => layer.box)
    .map(layer => `#${layer.index} ${layer.name ?? '(sin nombre)'}`)
    .join(', ')

/**
 * Máscara canónica de una capa en el tamaño de la imagen ORIGINAL: el alfa de la capa se lleva al tamaño de su caja,
 * se ubica en el lienzo de la base y el lienzo se reescala a la original (la base puede medir distinto).
 */
export const maskFromLayer = async (layersJsonPath: string, layer: LayerRecord, doc: LayersDocument, target: { width: number; height: number }): Promise<CanonicalMask> => {
  if (!layer.box) throw new MaskError('La base no tiene máscara: elige una capa.')

  const width = Math.max(1, Math.round(layer.box.right - layer.box.left))
  const height = Math.max(1, Math.round(layer.box.bottom - layer.box.top))
  const file = join(dirname(layersJsonPath), layer.file)
  const alpha = await readRaw(sharp(file).ensureAlpha().extractChannel(3).resize(width, height, { fit: 'fill' }).toColourspace('b-w'), 1, `alfa de la capa #${layer.index}`)
  const canvas = createMask(doc.base.width, doc.base.height)
  const left = Math.round(layer.box.left)
  const top = Math.round(layer.box.top)

  for (let y = 0; y < height; y += 1) {
    const cy = top + y

    if (cy < 0 || cy >= canvas.height) continue

    for (let x = 0; x < width; x += 1) {
      const cx = left + x

      if (cx < 0 || cx >= canvas.width) continue

      canvas.data[cy * canvas.width + cx] = alpha.data[y * width + x]
    }
  }

  if (canvas.width === target.width && canvas.height === target.height) return canvas

  const resized = await readRaw(singleChannel(canvas.data, canvas.width, canvas.height).resize(target.width, target.height, { fit: 'fill' }).toColourspace('b-w'), 1, 'máscara de capa reescalada')

  return { width: target.width, height: target.height, data: resized.data }
}

/** Unión de las máscaras de varias capas. */
export const maskFromLayers = async (layersJsonPath: string, selectors: string[], target: { width: number; height: number }): Promise<CanonicalMask> => {
  const doc = await readLayersDocument(layersJsonPath)
  const chosen = selectLayers(doc, selectors)
  const masks = await Promise.all(chosen.map(layer => maskFromLayer(layersJsonPath, layer, doc, target)))

  return masks.reduce((acc, mask) => union(acc, mask))
}

/** Ruta del clean plate (la base) de un `layers.json`. */
export const cleanPlatePath = (layersJsonPath: string, doc: LayersDocument) => join(dirname(layersJsonPath), doc.base.file)

/** Fracción opaca del alfa de una imagen (para registrar qué tan «llena» viene cada capa). */
export const alphaCoverage = async (png: Buffer): Promise<number> => {
  const alpha = await readRaw(sharp(png).ensureAlpha().extractChannel(3).toColourspace('b-w'), 1, 'alfa de capa')
  let opaque = 0

  for (const value of alpha.data) if (value > 127) opaque += 1

  return opaque / alpha.data.length
}

/** Slug de archivo para una capa: `NN-nombre.png`. */
export const layerFileName = (index: number, name: string | null) =>
  `${String(index).padStart(2, '0')}-${(name ?? 'capa').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'capa'}.png`

/** `<bbox>` del prompt de Layerize desde fracciones 0–1 (el endpoint usa enteros 0–1000). */
export const bboxTag = (rect: { x0: number; y0: number; x1: number; y1: number }) =>
  `<bbox>${[rect.x0, rect.y0, rect.x1, rect.y1].map(value => Math.round(Math.min(1, Math.max(0, value)) * 1000)).join(' ')}</bbox>`
