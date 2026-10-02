/**
 * `content-service-lanes` (deck Salesforce, SF8, TASK-1942): «¿Qué hacemos en Salesforce? Todo el ciclo.». Seis
 * carriles de la práctica en vidrio (3 × 2), cada uno con el ícono oficial de su producto, y bajo la rejilla las cuatro
 * fases del ciclo unidas por un tramo en el acento. A la derecha, la plataforma de luz chica: vacía por defecto o con la
 * mascota del partner (slot OPCIONAL `mascot`, sujeto a la autorización escrita de Salesforce).
 *
 * Todo lo que pinta sale de AXIS (`efeonceGraphicLine.surfaces.deck.recipes['content-service-lanes']`): la voz propia de
 * la lámina (pregunta de una línea en 170, respuesta de una línea a 124 px en 228, sin bajada), el escenario, la
 * plataforma, los carriles, las fases y el lugar de la mascota. El CONTENIDO llega en el intent: `lanes` (seis: `icon`,
 * `title`, `products`, `description`), `phases` (cuatro textos) y, opcional, `mascot` (`path`, `alt`, `authorizationRef`).
 */

import path from 'node:path'

import { SurfacePieceError, type SurfaceAssetRequest } from '../../types'
import { voiceSlots } from '../../shared'
import type { RecipeBuilder } from '../deck'
import { colorVar, css, measured } from '../kit'

import {
  exactly,
  glassVars,
  lineColor,
  lineVoiceFrame,
  lumVars,
  productIcon,
  req,
  stageLayers,
  uniqueAssets,
  type FrostedGlass,
  type Shadow
} from './kit'

type Text = { px: number; weight?: number; lineHeight?: number; tracking?: string; gapPx?: number; gapTopPx?: number; color?: string }

type LaneTokens = {
  count: number
  columns: number
  xPx: number
  yPx: number
  widthPx: number
  heightPx: number
  gapPx: [number, number]
  padding: [number, number]
  radiusPx: number
  glass: FrostedGlass
  icon: { px: number; gapPx: number }
  title: Text
  product: Text
  desc: Text
}

type PhaseTokens = {
  count: number
  yPx: number
  gapPx: number
  text: { px: number; weight: number; color: string; numbered: boolean }
  connector: { widthPx: number; heightPx: number; color: string; opacity: number }
}

export type MascotTokens = { optional: boolean; requiresAuthorization: boolean; xPx: number; yPx: number; widthPx: number; shadow: Shadow; pose: string }

type LaneIntent = { icon?: unknown; title?: unknown; products?: unknown; description?: unknown }

/**
 * La catalogación de la lámina aprobada: las cuatro fases suman 95 caracteres y la tira termina justo antes de la
 * mascota (catálogo de recetas, `content-service-lanes.phases`). Más texto la empuja sobre la plataforma.
 */
const PHASES_MAX_TOTAL_CHARS = 95

/**
 * El tracking en px (em × cuerpo): `css()` redondea a dos decimales y un tracking de −0,015 em quedaría en −0,01 em.
 */
export const trackingPx = (value: string | undefined, px: number, what: string): number => Number.parseFloat(measured(value, `el tracking de ${what}`)) * px

/**
 * La mascota del partner (Agent Astro), slot OPCIONAL de las láminas con escenario: no vive en ningún paquete ni en el
 * catálogo, así que sólo se acepta una ruta local explícita del intent, relativa al repositorio, con su texto
 * alternativo y la referencia a la autorización escrita archivada de Salesforce. Sin ella falla cerrado.
 */
export const mascotOf = (
  value: unknown,
  tokens: MascotTokens | undefined,
  prefix: string
): { slot: Record<string, string>; asset: SurfaceAssetRequest } | null => {
  if (value === undefined || value === null) return null

  const mascot = measured(tokens, 'el lugar de la mascota')
  const m = value as { path?: unknown; alt?: unknown; authorizationRef?: unknown }
  const file = req(m.path, 'La mascota (`mascot.path`)')
  const alt = req(m.alt, 'La mascota (`mascot.alt`): describe el personaje y su pose')

  req(m.authorizationRef, 'La mascota del partner (`mascot.authorizationRef`) exige la referencia a la autorización escrita de Salesforce y')

  if (path.isAbsolute(file) || file.split(/[\\/]/).includes('..')) {
    throw new SurfacePieceError('La mascota (`mascot.path`) va como ruta local relativa al repositorio, sin `..`.', 'invalid-intent')
  }

  if (file.replace(/\\/g, '/').startsWith('src/lib/artifact-composer/catalogs/')) {
    throw new SurfacePieceError('La mascota del partner no se copia al catálogo: va desde su ruta local autorizada.', 'invalid-intent')
  }

  if (!/\.(png|svg)$/i.test(file)) throw new SurfacePieceError('La mascota (`mascot.path`) es un PNG con alfa o un SVG.', 'invalid-intent')

  const ref = `asset-ref:file:mascot-${path.basename(file).replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9-]+/gi, '-').toLowerCase()}`

  // El lugar y la sombra viajan en el mismo slot: sin mascota, la plataforma queda vacía y nada se declara.
  return {
    slot: {
      src: ref,
      alt,
      left: css(`${prefix}-mascot-left`, mascot.xPx),
      top: css(`${prefix}-mascot-top`, mascot.yPx),
      width: css(`${prefix}-mascot-width`, mascot.widthPx),
      shadowY: css(`${prefix}-mascot-shadow-y`, mascot.shadow.yPx),
      shadowBlur: css(`${prefix}-mascot-shadow-blur`, mascot.shadow.blurPx),
      shadowColor: colorVar(`${prefix}-mascot-shadow`, lineColor(mascot.shadow.color, '', 'la sombra de la mascota')),
      shadowOpacity: css(`${prefix}-mascot-shadow-opacity`, mascot.shadow.opacity * 100, '%')
    },
    asset: { ref, kind: 'file', path: file }
  }
}

export const contentServiceLanes: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const line = String(intent.line)
  const lanesT = measured(recipe.lanes as LaneTokens | undefined, 'los carriles de servicio')
  const phasesT = measured(recipe.phases as PhaseTokens | undefined, 'las fases del ciclo')
  const voice = voiceSlots(manifest)

  if (voice.answerLead) throw new SurfacePieceError('La respuesta de «nuestros servicios» va en una línea.', 'invalid-intent')
  if (intent.body !== undefined) throw new SurfacePieceError('La lámina de servicios no lleva bajada (`body`): los carriles la reemplazan.', 'invalid-intent')

  const lanes = exactly<LaneIntent>(intent.lanes, lanesT.count, 'Los carriles de servicio (`lanes`)')
  const phases = exactly<unknown>(intent.phases, phasesT.count, 'Las fases del ciclo (`phases`)').map((phase, i) => req(phase, `La fase ${i + 1} (\`phases[${i}]\`)`))

  if (phases.join('').length > PHASES_MAX_TOTAL_CHARS) {
    throw new SurfacePieceError(`Las cuatro fases suman ${phases.join('').length} caracteres: la tira termina antes de la mascota con ${PHASES_MAX_TOTAL_CHARS} como máximo.`, 'invalid-intent')
  }

  const icons = lanes.map((lane, i) => productIcon(lane.icon, `El carril ${i + 1} (\`lanes[${i}].icon\`)`))
  const mascot = mascotOf(intent.mascot, recipe.mascot as MascotTokens | undefined, 'csl')
  const { stage, platform } = stageLayers(manifest, recipe, line, 'csl')

  const frame: Record<string, unknown> = {
    line,
    ...lineVoiceFrame(manifest, recipe),
    ...lumVars(recipe),
    ...glassVars(lanesT.glass, line),
    // Los carriles
    laneWidth: css('csl-lane-width', lanesT.widthPx),
    laneHeight: css('csl-lane-height', lanesT.heightPx),
    lanePadY: css('csl-lane-pad-y', lanesT.padding[0]),
    lanePadX: css('csl-lane-pad-x', lanesT.padding[1]),
    laneRadius: css('csl-lane-radius', lanesT.radiusPx),
    laneIcon: css('csl-lane-icon', lanesT.icon.px),
    laneIconGap: css('csl-lane-icon-gap', lanesT.icon.gapPx),
    titlePx: css('csl-title-px', lanesT.title.px),
    titleLeading: css('csl-title-leading', measured(lanesT.title.lineHeight, 'el interlineado del carril'), ''),
    titleTracking: css('csl-title-tracking', trackingPx(lanesT.title.tracking, lanesT.title.px, 'el carril')),
    titleColor: colorVar('csl-title', lineColor(measured(lanesT.title.color, 'el color del carril'), line, 'el carril')),
    productPx: css('csl-product-px', lanesT.product.px),
    productWeight: css('csl-product-wght', measured(lanesT.product.weight, 'el peso del producto'), ''),
    productGap: css('csl-product-gap', measured(lanesT.product.gapPx, 'el aire del producto')),
    productColor: colorVar('csl-product', lineColor(measured(lanesT.product.color, 'el color del producto'), line, 'el producto')),
    descPx: css('csl-desc-px', lanesT.desc.px),
    descWeight: css('csl-desc-wght', measured(lanesT.desc.weight, 'el peso de la descripción'), ''),
    descLeading: css('csl-desc-leading', measured(lanesT.desc.lineHeight, 'el interlineado de la descripción'), ''),
    descGap: css('csl-desc-gap', measured(lanesT.desc.gapTopPx, 'el aire de la descripción')),
    descColor: colorVar('csl-desc', lineColor(measured(lanesT.desc.color, 'el color de la descripción'), line, 'la descripción')),
    // Las fases
    phasesTop: css('csl-phases-top', phasesT.yPx),
    phasesGap: css('csl-phases-gap', phasesT.gapPx),
    phasePx: css('csl-phase-px', phasesT.text.px),
    phaseWeight: css('csl-phase-wght', phasesT.text.weight, ''),
    phaseColor: colorVar('csl-phase', lineColor(phasesT.text.color, line, 'las fases')),
    connectorWidth: css('csl-connector-width', phasesT.connector.widthPx),
    connectorHeight: css('csl-connector-height', phasesT.connector.heightPx),
    connectorColor: colorVar('csl-connector', lineColor(phasesT.connector.color, line, 'el tramo entre fases')),
    connectorOpacity: css('csl-connector-opacity', phasesT.connector.opacity * 100, '%')
  }

  return {
    contentType: 'deck.content-service-lanes',
    slots: {
      frame,
      stage: { src: stage.ref },
      platform: { src: platform.ref },
      voice,
      lanes: lanes.map((lane, i) => {
        const column = i % lanesT.columns
        const row = Math.floor(i / lanesT.columns)

        return {
          icon: icons[i]!.ref,
          title: req(lane.title, `El carril ${i + 1} (\`lanes[${i}].title\`)`),
          products: req(lane.products, `Los productos del carril ${i + 1} (\`lanes[${i}].products\`)`),
          description: req(lane.description, `La descripción del carril ${i + 1} (\`lanes[${i}].description\`)`),
          left: css('csl-left', lanesT.xPx + column * (lanesT.widthPx + lanesT.gapPx[0])),
          top: css('csl-top', lanesT.yPx + row * (lanesT.heightPx + lanesT.gapPx[1]))
        }
      }),
      // Numeradas «01 · …» (`phases.text.numbered`).
      phases: phases.map((label, i) => ({ number: phasesT.text.numbered ? String(i + 1).padStart(2, '0') : '', label })),
      ...(mascot ? { mascot: mascot.slot } : {})
    },
    assets: uniqueAssets([stage.asset, platform.asset, ...icons.map(icon => icon.asset), ...(mascot ? [mascot.asset] : [])])
  }
}
