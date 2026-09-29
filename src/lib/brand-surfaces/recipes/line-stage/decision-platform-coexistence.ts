/**
 * `decision-platform-coexistence` (deck Salesforce, SF3, TASK-1942): «¿Hay que migrar a Next? No por defecto.». Dos
 * plataformas que conviven, atrás en vidrio y a distinta profundidad, cada una con el ícono oficial de su producto y lo
 * que resuelve; al frente, en papel y con reflejo, la decisión capacidad por capacidad con su veredicto. La fila elegida
 * se enciende en el acento: la selección «Cliente» la toma por ítem (`selectedCapability`).
 *
 * Todo lo que pinta sale de AXIS (`efeonceGraphicLine.surfaces.deck.recipes['decision-platform-coexistence']`): la voz,
 * el escenario, la plataforma, los haces, las tarjetas, la tabla y los colores de cada veredicto. `sceneOffsetXPx` corre
 * la escena entera (plataforma, tarjetas, haces y tabla; no el halo). El CONTENIDO llega en el intent: `platforms` (dos:
 * `icon`, `base`, `name` y cuatro `items`), `tableTitle`, `capabilities` (cinco: `capability` y `verdict` del
 * vocabulario fijo), `selectedCapability` y la `note` obligatoria. El encabezado de la tabla lleva el ícono del producto
 * sólo cuando las dos plataformas son del mismo producto (la decisión es de ese producto); si no, va sin ícono.
 */

import { SurfacePieceError } from '../../types'
import { contentOf, selectionSlot, voiceSlots } from '../../shared'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { colorVar, css, layerAsset, measured } from '../kit'

import {
  beamsSvg,
  documentVars,
  exactly,
  glassVars,
  indexIn,
  lineColor,
  lineVoiceFrame,
  lumVars,
  noteVars,
  productIcon,
  reflectionVars,
  req,
  stageLayers,
  uniqueAssets,
  type FrostedGlass,
  type LineBeam,
  type LineDocument,
  type Reflection, cssFine } from './kit'

type Text = { px: number; weight?: number; tracking?: string; gapPx?: number; color?: string }

type PlatformTokens = {
  count: number
  positions: [number, number, number][]
  widthPx: number
  padding: [number, number]
  radiusPx: number
  perspectivePx: number
  opacity: number
  glass: FrostedGlass
  icon: { px: number; gapPx: number }
  kicker: Text
  name: Text
  items: { max: number; paddingYPx: number; rule: { px: number; color: string; opacity: number }; dot: { px: number; color: string }; gapPx: number; text: Text }
  beams: { from: [number, number]; to: [number, number]; bendPx: number }[]
}

type DecisionTokens = {
  xPx: number
  yPx: number
  widthPx: number
  padding: [number, number, number]
  radiusPx: number
  document: LineDocument
  reflection: Reflection
  header: { icon: { px: number; gapPx: number }; title: Text; paddingBottomPx: number }
  rows: number
  row: { padding: [number, number]; rule: string; gapPx: number; capability: Text }
  selected: { padding: [number, number]; gapTopPx: number; radiusPx: number; fill: { color: string; opacity: number }; capability: { weight: number } }
  verdict: {
    padding: [number, number]
    radiusPx: number
    ring: { px: number; color: string }
    px: number
    weight: number
    tracking: string
    vocabulary: string[]
    fills: Record<string, { fill: string; color: string }>
  }
}

type PlatformIntent = { icon?: unknown; base?: unknown; name?: unknown; items?: unknown }
type CapabilityIntent = { capability?: unknown; verdict?: unknown }

/** El veredicto que, repetido en todas las filas, sería un reemplazo completo: la lámina nunca lo recomienda por defecto. */
const REPLACE = 'Migrar'

const tracking = (value: string | undefined, what: string): number => Number.parseFloat(measured(value, `el tracking de ${what}`))

export const decisionPlatformCoexistence: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const line = String(intent.line)
  const platforms = measured(recipe.platforms as PlatformTokens | undefined, 'las plataformas que conviven')
  const decisions = measured(recipe.decisions as DecisionTokens | undefined, 'la decisión por capacidad')
  const beam = measured(recipe.beam as LineBeam | undefined, 'el haz de luz')
  const dx = measured(recipe.sceneOffsetXPx as number | undefined, 'el corrimiento de la escena')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)
  const doc = decisions.document
  const verdict = decisions.verdict

  if (!voice.answerLead) throw new SurfacePieceError('La respuesta va en dos líneas (`voice.answer` con dos tramos).', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('La lámina lleva su bajada (`body`).', 'invalid-intent')

  const note = req(content.note, 'La nota de ejemplo (`note`), obligatoria mientras los veredictos no salgan del inventario real,')
  const cards = exactly<PlatformIntent>(intent.platforms, platforms.count, 'Las plataformas que conviven (`platforms`)')
  const rows = exactly<CapabilityIntent>(intent.capabilities, decisions.rows, 'Las capacidades de la tabla (`capabilities`)')
  const selected = indexIn(intent.selectedCapability, decisions.rows, 'La fila elegida (`selectedCapability`)')
  const icons = cards.map((card, i) => productIcon(card.icon, `La plataforma ${i + 1} (\`platforms[${i}].icon\`)`))

  const verdicts = rows.map((row, i) => {
    const value = req(row.verdict, `El veredicto de la fila ${i + 1} (\`capabilities[${i}].verdict\`)`)

    if (!verdict.vocabulary.includes(value)) {
      throw new SurfacePieceError(`El veredicto de la fila ${i + 1} es uno de ${verdict.vocabulary.join(' · ')}.`, 'invalid-intent')
    }

    return value
  })

  if (verdicts.every(value => value === REPLACE)) {
    throw new SurfacePieceError('Todas las filas en «Migrar» son un reemplazo completo: la lámina no lo recomienda por defecto.', 'invalid-intent')
  }

  // La tabla decide sobre UN producto: lleva su ícono sólo si las dos plataformas son ese producto.
  const tableIcon = icons.every(icon => icon.ref === icons[0]!.ref) ? icons[0]! : null

  const { stage, platform } = stageLayers(manifest, recipe, line, 'dpc', { dx })

  const beams = layerAsset(
    'decision-platform-coexistence-beams',
    beamsSvg(
      manifest,
      platforms.beams.map(b => ({ from: b.from, to: b.to, bend: b.bendPx })),
      beam,
      line,
      'dpc',
      dx
    )
  )

  const it = platforms.items
  const color = (value: string | undefined, what: string, d?: LineDocument) => lineColor(measured(value, `el color de ${what}`), line, what, d)

  const frame: Record<string, unknown> = {
    line,
    ...lineVoiceFrame(manifest, recipe),
    ...lumVars(recipe),
    ...noteVars(recipe, line),
    ...glassVars(platforms.glass, line),
    ...documentVars(doc, line),
    ...reflectionVars(decisions.reflection),
    // Las plataformas que conviven
    cardWidth: css('dpc-card-width', platforms.widthPx),
    cardPadY: css('dpc-card-pad-y', platforms.padding[0]),
    cardPadX: css('dpc-card-pad-x', platforms.padding[1]),
    cardRadius: css('dpc-card-radius', platforms.radiusPx),
    cardPerspective: css('dpc-card-perspective', platforms.perspectivePx),
    cardOpacity: css('dpc-card-opacity', platforms.opacity * 100, '%'),
    iconSize: css('dpc-icon', platforms.icon.px),
    iconGap: css('dpc-icon-gap', platforms.icon.gapPx),
    kickerPx: css('dpc-kicker-px', platforms.kicker.px),
    kickerWeight: css('dpc-kicker-wght', measured(platforms.kicker.weight, 'el peso del producto base'), ''),
    kickerTracking: cssFine('dpc-kicker-tracking', tracking(platforms.kicker.tracking, 'el producto base')),
    kickerColor: colorVar('dpc-kicker', color(platforms.kicker.color, 'el producto base')),
    namePx: css('dpc-name-px', platforms.name.px),
    nameTracking: cssFine('dpc-name-tracking', tracking(platforms.name.tracking, 'el nombre de la plataforma')),
    nameGap: css('dpc-name-gap', measured(platforms.name.gapPx, 'el aire del nombre')),
    nameColor: colorVar('dpc-name', color(platforms.name.color, 'el nombre de la plataforma')),
    itemPadY: css('dpc-item-pad-y', it.paddingYPx),
    itemGap: css('dpc-item-gap', it.gapPx),
    itemRule: css('dpc-item-rule', it.rule.px),
    itemRuleColor: colorVar('dpc-item-rule', lineColor(it.rule.color, line, 'el filete de la lista')),
    itemRuleOpacity: css('dpc-item-rule-opacity', it.rule.opacity * 100, '%'),
    dotSize: css('dpc-dot', it.dot.px),
    dotColor: colorVar('dpc-dot', lineColor(it.dot.color, line, 'el punto de la lista')),
    itemPx: css('dpc-item-px', it.text.px),
    itemWeight: css('dpc-item-wght', measured(it.text.weight, 'el peso de la lista'), ''),
    itemColor: colorVar('dpc-item', color(it.text.color, 'la lista')),
    // La decisión por capacidad
    tableLeft: css('dpc-table-left', decisions.xPx + dx),
    tableTop: css('dpc-table-top', decisions.yPx),
    tableWidth: css('dpc-table-width', decisions.widthPx),
    tablePadTop: css('dpc-table-pad-top', decisions.padding[0]),
    tablePadX: css('dpc-table-pad-x', decisions.padding[1]),
    tablePadBottom: css('dpc-table-pad-bottom', decisions.padding[2]),
    tableRadius: css('dpc-table-radius', decisions.radiusPx),
    headIcon: css('dpc-head-icon', decisions.header.icon.px),
    headGap: css('dpc-head-gap', decisions.header.icon.gapPx),
    headPadBottom: css('dpc-head-pad-bottom', decisions.header.paddingBottomPx),
    headPx: css('dpc-head-px', decisions.header.title.px),
    headTracking: cssFine('dpc-head-tracking', tracking(decisions.header.title.tracking, 'el título de la tabla')),
    rowPadY: css('dpc-row-pad-y', decisions.row.padding[0]),
    rowPadX: css('dpc-row-pad-x', decisions.row.padding[1]),
    rowGap: css('dpc-row-gap', decisions.row.gapPx),
    rowRule: colorVar('dpc-row-rule', lineColor(decisions.row.rule, line, 'el filete de la fila', doc)),
    capPx: css('dpc-cap-px', decisions.row.capability.px),
    capWeight: css('dpc-cap-wght', measured(decisions.row.capability.weight, 'el peso de la capacidad'), ''),
    selPadY: css('dpc-sel-pad-y', decisions.selected.padding[0]),
    selPadX: css('dpc-sel-pad-x', decisions.selected.padding[1]),
    selGap: css('dpc-sel-gap', decisions.selected.gapTopPx),
    selRadius: css('dpc-sel-radius', decisions.selected.radiusPx),
    selFill: colorVar('dpc-sel', lineColor(decisions.selected.fill.color, line, 'la fila elegida')),
    selFillOpacity: css('dpc-sel-opacity', decisions.selected.fill.opacity * 100, '%'),
    selWeight: css('dpc-sel-wght', decisions.selected.capability.weight, ''),
    pillPadY: css('dpc-pill-pad-y', verdict.padding[0]),
    pillPadX: css('dpc-pill-pad-x', verdict.padding[1]),
    pillRadius: css('dpc-pill-radius', verdict.radiusPx),
    pillRing: css('dpc-pill-ring', verdict.ring.px),
    pillRingColor: colorVar('dpc-pill-ring', lineColor(verdict.ring.color, line, 'el anillo del veredicto', doc)),
    pillPx: css('dpc-pill-px', verdict.px),
    pillWeight: css('dpc-pill-wght', verdict.weight, ''),
    pillTracking: cssFine('dpc-pill-tracking', tracking(verdict.tracking, 'el veredicto'))
  }

  const delegate = selectionSlot(manifest)

  return {
    contentType: 'deck.decision-platform-coexistence',
    slots: {
      frame,
      stage: { src: stage.ref },
      platform: { src: platform.ref },
      beams: { src: beams.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      note,
      platforms: cards.map((card, i) => {
        const [x, y, rotate] = measured(platforms.positions[i], `la posición de la plataforma ${i + 1}`)
        const where = `la plataforma ${i + 1} (\`platforms[${i}]\`)`
        const items = exactly<unknown>(card.items, it.max, `Lo que resuelve ${where} (\`items\`)`)

        return {
          left: css('dpc-left', x + dx),
          top: css('dpc-top', y),
          rotate: css('dpc-rotate', rotate, 'deg'),
          icon: icons[i]!.ref,
          base: req(card.base, `El producto base de ${where} (\`base\`)`),
          name: req(card.name, `El nombre de ${where} (\`name\`)`),
          items: items.map((item, j) => ({ text: req(item, `El ítem ${j + 1} de ${where}`) }))
        }
      }),
      tableTitle: req(intent.tableTitle, 'El título de la tabla (`tableTitle`)'),
      ...(tableIcon ? { tableIcon: { src: tableIcon.ref } } : {}),
      capabilities: rows.map((row, i) => {
        const fill = measured(verdict.fills[verdicts[i]!], `el color del veredicto «${verdicts[i]}»`)

        return {
          role: i + 1 === selected ? 'lead' : 'rest',
          pillFill: colorVar('dpc-pill', lineColor(fill.fill, line, 'el veredicto', doc)),
          pillInk: colorVar('dpc-pill-ink', lineColor(fill.color, line, 'el texto del veredicto', doc)),
          capability: req(row.capability, `La capacidad de la fila ${i + 1} (\`capabilities[${i}].capability\`)`),
          verdict: verdicts[i]!
        }
      }),
      ...(delegate ? { selection: { ...delegate, item: selected } } : {})
    },
    assets: uniqueAssets([stage.asset, platform.asset, beams.asset, ...icons.map(icon => icon.asset)])
  }
}
