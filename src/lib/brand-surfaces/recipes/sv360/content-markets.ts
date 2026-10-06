/**
 * `content-markets` (deck SEO/AEO, TASK-1949): «¿Dónde operamos? Cinco países.». Las Américas de noche vistas desde la
 * órbita (plate MK2, a sangre, registro puesta en escena) con cinco nodos de luz unidos por arcos; junto a cada nodo, la
 * etiqueta del país y su ciudad de referencia, COMPUESTA (el modelo nunca escribe texto en el plate). La voz va en el
 * espacio oscuro de la izquierda y el lockup de SV360 arriba (aprobado aunque la foto vaya a sangre).
 *
 * El CONTENIDO llega en el intent con los nombres del catálogo de recetas: `photo` (el plate y su `alt`) y `markets` ×5
 * (`country`, `city`, `node` = [x, y] medidos en el plate, `side` = `right` o `left`: de qué lado del nodo va la
 * etiqueta). La ciudad marca el mercado, no declara una oficina.
 */

import { contentOf, plateAsset, voiceSlots } from '../../shared'
import { SurfacePieceError } from '../../types'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { css } from '../kit'
import { req, uniqueAssets } from '../line-stage/kit'
import { productMarkSlot, recipeProductMarkPlacement } from '../product-mark'

import { listOf, sv360Frame } from './kit'

/**
 * El tamaño en px de los plates aprobados de la lámina: los nodos se miden sobre el archivo y el plate va a sangre
 * (escalado al ancho, recortado al centro). TODO AXIS TASK-1949 / TASK-1931: sale del banco de plates.
 */
const PLATE_SIZES: Record<string, [number, number]> = { 'MK2-mercados': [1536, 1024], 'RG1b-regiones': [1792, 1024] }

/** El aire entre el nodo y su etiqueta, y cuánto sube la etiqueta sobre el nodo (medido en la lámina aprobada). */
const LABEL = { gapPx: 22, raisePx: 26 } as const

type MarketIntent = { country?: unknown; city?: unknown; node?: unknown; side?: unknown }

export const contentMarkets: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const line = String(intent.line)
  const { width, height } = manifest.canvas
  const voice = voiceSlots(manifest)
  const content = contentOf(manifest)

  if (!content.body) throw new SurfacePieceError('La lámina de mercados lleva su bajada (`body`).', 'invalid-intent')

  const photo = plateAsset(manifest, { width, height })
  const plateId = (photo.asset as { path: string }).path.split('/').pop()!.replace(/\.[a-z0-9]+$/i, '')
  const size = PLATE_SIZES[plateId]

  if (!size) {
    throw new SurfacePieceError(`La lámina de mercados usa un plate con sus nodos medidos (${Object.keys(PLATE_SIZES).join(' · ')}); «${plateId}» no lo está.`, 'invalid-intent')
  }

  const scale = width / size[0]
  const offsetY = (size[1] * scale - height) / 2

  const markets = listOf<MarketIntent>(intent.markets, 5, 'Los mercados (`markets`)').map((market, i) => {
    const node = market.node

    if (!Array.isArray(node) || node.length !== 2 || !node.every(v => typeof v === 'number') || node[0] < 0 || node[0] > size[0] || node[1] < 0 || node[1] > size[1]) {
      throw new SurfacePieceError(`El nodo del mercado ${i + 1} (\`markets[${i}].node\`) es [x, y] medido dentro del plate (${size[0]} × ${size[1]}).`, 'invalid-intent')
    }

    if (market.side !== 'right' && market.side !== 'left') throw new SurfacePieceError(`El lado de la etiqueta ${i + 1} (\`markets[${i}].side\`) es right o left.`, 'invalid-intent')

    const x = Math.round((node[0] as number) * scale)
    const y = Math.round((node[1] as number) * scale - offsetY)

    return {
      country: req(market.country, `El país del mercado ${i + 1} (\`markets[${i}].country\`)`),
      city: req(market.city, `La ciudad del mercado ${i + 1} (\`markets[${i}].city\`)`),
      // `start`: la etiqueta arranca a la derecha del nodo; `end`: termina a su izquierda.
      side: market.side === 'right' ? 'start' : 'end',
      x: css('smk-x', market.side === 'right' ? x + LABEL.gapPx : width - x + LABEL.gapPx),
      top: css('smk-top', y - LABEL.raisePx)
    }
  })

  const mark = productMarkSlot(intent.productMark, recipeProductMarkPlacement(recipe))
  const frame = sv360Frame(manifest, recipe, line, ['spaceBg', 'halo', 'shadow', 'labelBg', 'city'])

  return {
    contentType: 'deck.content-markets',
    slots: {
      frame,
      photo: { src: photo.ref, alt: photo.alt },
      voice,
      body: evidenceHtml(content.body, 'none'),
      markets,
      ...(mark ? { productMark: mark.slot } : {})
    },
    assets: uniqueAssets([photo.asset, ...(mark ? [mark.asset] : [])])
  }
}
