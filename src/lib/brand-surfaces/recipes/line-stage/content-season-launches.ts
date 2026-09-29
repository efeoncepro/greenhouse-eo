/**
 * `content-season-launches` (deck Salesforce, SF9, TASK-1942): «¿Qué trajo Dreamforce? Agentes.». Lo nuevo de una
 * temporada en ocho fichas de vidrio, cuatro a cada lado de la plataforma de luz, cada una con su estado anunciado (en
 * píldora sólida si ya está disponible, en contorno si no) y el ícono oficial de su producto. Al centro, la plataforma:
 * vacía por defecto o con la mascota del partner (slot OPCIONAL `mascot`, sujeto a la autorización escrita de Salesforce).
 *
 * Es una lámina de TEMPORADA (`evergreen: false` en AXIS): la fecha de corte `asOf` es obligatoria, se imprime en el
 * eyebrow y en la nota («… al 18-09-2026») y la nota deja visible que el estado «se verifica en cada org». El builder lo
 * comprueba: una fecha que no aparece impresa, o una pieza marcada evergreen, falla cerrado.
 *
 * Todo lo que pinta sale de AXIS (`efeonceGraphicLine.surfaces.deck.recipes['content-season-launches']`). El CONTENIDO
 * llega en el intent: `asOf`, `note`, `launches` (ocho: `status`, `name`, `description`, `icon`) y, opcional, `mascot`.
 */

import { SurfacePieceError } from '../../types'
import { contentOf, voiceSlots } from '../../shared'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { colorVar, css, measured } from '../kit'

import { mascotOf, trackingPx, type MascotTokens } from './content-service-lanes'
import { exactly, glassVars, lineColor, lineVoiceFrame, lumVars, noteVars, productIcon, req, stageLayers, uniqueAssets, type FrostedGlass } from './kit'

type Text = { px: number; weight?: number; lineHeight?: number; tracking?: string; gapPx?: number; gapTopPx?: number; color?: string }

type LaunchTokens = {
  max: number
  columnsXPx: [number, number]
  rowsYPx: number[]
  widthPx: number
  padding: [number, number]
  radiusPx: number
  glass: FrostedGlass
  icon: { px: number; endPx: number; topPx: number }
  status: {
    padding: [number, number]
    radiusPx: number
    px: number
    weight: number
    tracking: string
    uppercase: boolean
    solid: { fill: string; color: string; values: string[] }
    outline: { ring: { px: number; color: string; opacity: number }; color: string }
  }
  title: Text
  desc: Text
}

type LaunchIntent = { status?: unknown; name?: unknown; description?: unknown; icon?: unknown }

/** La frase que la nota deja siempre visible (catálogo de recetas, `content-season-launches.rules`). */
const VERIFIED_PER_ORG = 'se verifica en cada org'

/** La fecha de corte: ISO `AAAA-MM-DD` válida, impresa como `DD-MM-AAAA`. */
const asOfOf = (value: unknown): { iso: string; printed: string } => {
  const iso = req(value, 'La fecha de corte de la temporada (`asOf`) es obligatoria y')
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  const date = match ? new Date(`${iso}T00:00:00Z`) : null

  if (!match || !date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) {
    throw new SurfacePieceError('La fecha de corte (`asOf`) va como AAAA-MM-DD.', 'invalid-intent')
  }

  return { iso, printed: `${match[3]}-${match[2]}-${match[1]}` }
}

export const contentSeasonLaunches: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const line = String(intent.line)
  const launchesT = measured(recipe.launches as LaunchTokens | undefined, 'los lanzamientos de la temporada')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)

  if (recipe.evergreen === false && (intent as { evergreen?: unknown }).evergreen === true) {
    throw new SurfacePieceError('La lámina de temporada no entra en un documento evergreen: lleva fecha de corte.', 'invalid-intent')
  }

  if (voice.answerLead) throw new SurfacePieceError('La respuesta de la temporada va en una línea.', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('La lámina lleva su bajada (`body`).', 'invalid-intent')

  const asOf = asOfOf((intent as { asOf?: unknown }).asOf)
  const note = req(content.note, 'La nota de la temporada (`note`) es obligatoria y')

  if (!voice.eyebrow?.includes(asOf.printed)) {
    throw new SurfacePieceError(`El eyebrow imprime la fecha de corte («… al ${asOf.printed}»).`, 'invalid-intent')
  }

  if (!note.includes(asOf.printed)) throw new SurfacePieceError(`La nota repite la fecha de corte (${asOf.printed}).`, 'invalid-intent')

  if (!note.toLocaleLowerCase('es').includes(VERIFIED_PER_ORG)) {
    throw new SurfacePieceError(`La nota deja visible que el estado «${VERIFIED_PER_ORG}».`, 'invalid-intent')
  }

  const launches = exactly<LaunchIntent>(intent.launches, launchesT.max, 'Los lanzamientos (`launches`)')
  const perColumn = launchesT.rowsYPx.length

  if (launchesT.columnsXPx.length * perColumn !== launchesT.max) throw new SurfacePieceError('AXIS no midió una ficha por cada lugar de la temporada.', 'invalid-intent')

  const icons = launches.map((launch, i) => productIcon(launch.icon, `El lanzamiento ${i + 1} (\`launches[${i}].icon\`)`))
  const mascot = mascotOf(intent.mascot, recipe.mascot as MascotTokens | undefined, 'csn')
  const { stage, platform } = stageLayers(manifest, recipe, line, 'csn')
  const status = launchesT.status

  const frame: Record<string, unknown> = {
    line,
    ...lineVoiceFrame(manifest, recipe),
    ...lumVars(recipe),
    ...noteVars(recipe, line),
    ...glassVars(launchesT.glass, line),
    // Las fichas
    cardWidth: css('csn-card-width', launchesT.widthPx),
    cardPadY: css('csn-card-pad-y', launchesT.padding[0]),
    cardPadX: css('csn-card-pad-x', launchesT.padding[1]),
    cardRadius: css('csn-card-radius', launchesT.radiusPx),
    iconSize: css('csn-icon', launchesT.icon.px),
    iconEnd: css('csn-icon-end', launchesT.icon.endPx),
    iconTop: css('csn-icon-top', launchesT.icon.topPx),
    // El estado anunciado
    statusPadY: css('csn-status-pad-y', status.padding[0]),
    statusPadX: css('csn-status-pad-x', status.padding[1]),
    statusRadius: css('csn-status-radius', status.radiusPx),
    statusPx: css('csn-status-px', status.px),
    statusWeight: css('csn-status-wght', status.weight, ''),
    statusTracking: css('csn-status-tracking', trackingPx(status.tracking, status.px, 'el estado')),
    statusSolidFill: colorVar('csn-status-solid-fill', lineColor(status.solid.fill, line, 'la píldora sólida')),
    statusSolidInk: colorVar('csn-status-solid-ink', lineColor(status.solid.color, line, 'el texto de la píldora sólida')),
    statusRing: css('csn-status-ring', status.outline.ring.px),
    statusRingColor: colorVar('csn-status-ring', lineColor(status.outline.ring.color, line, 'el contorno de la píldora')),
    statusRingOpacity: css('csn-status-ring-opacity', status.outline.ring.opacity * 100, '%'),
    statusOutlineInk: colorVar('csn-status-outline-ink', lineColor(status.outline.color, line, 'el texto de la píldora en contorno')),
    titlePx: css('csn-title-px', launchesT.title.px),
    titleLeading: css('csn-title-leading', measured(launchesT.title.lineHeight, 'el interlineado del lanzamiento'), ''),
    titleTracking: css('csn-title-tracking', trackingPx(launchesT.title.tracking, launchesT.title.px, 'el lanzamiento')),
    titleGap: css('csn-title-gap', measured(launchesT.title.gapTopPx, 'el aire del lanzamiento')),
    titleColor: colorVar('csn-title', lineColor(measured(launchesT.title.color, 'el color del lanzamiento'), line, 'el lanzamiento')),
    descPx: css('csn-desc-px', launchesT.desc.px),
    descWeight: css('csn-desc-wght', measured(launchesT.desc.weight, 'el peso de la descripción'), ''),
    descLeading: css('csn-desc-leading', measured(launchesT.desc.lineHeight, 'el interlineado de la descripción'), ''),
    descGap: css('csn-desc-gap', measured(launchesT.desc.gapPx, 'el aire de la descripción')),
    descColor: colorVar('csn-desc', lineColor(measured(launchesT.desc.color, 'el color de la descripción'), line, 'la descripción'))
  }

  return {
    contentType: 'deck.content-season-launches',
    slots: {
      frame,
      stage: { src: stage.ref },
      platform: { src: platform.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      note,
      asOf: asOf.iso,
      // Cuatro por columna, de arriba abajo: primero la de la izquierda.
      launches: launches.map((launch, i) => {
        const label = req(launch.status, `El estado del lanzamiento ${i + 1} (\`launches[${i}].status\`)`)

        return {
          icon: icons[i]!.ref,
          status: label,
          state: status.solid.values.includes(label) ? 'solid' : 'outline',
          name: req(launch.name, `El lanzamiento ${i + 1} (\`launches[${i}].name\`)`),
          description: req(launch.description, `La descripción del lanzamiento ${i + 1} (\`launches[${i}].description\`)`),
          left: css('csn-left', launchesT.columnsXPx[Math.floor(i / perColumn)]!),
          top: css('csn-top', launchesT.rowsYPx[i % perColumn]!)
        }
      }),
      ...(mascot ? { mascot: mascot.slot } : {})
    },
    assets: uniqueAssets([stage.asset, platform.asset, ...icons.map(icon => icon.asset), ...(mascot ? [mascot.asset] : [])])
  }
}
