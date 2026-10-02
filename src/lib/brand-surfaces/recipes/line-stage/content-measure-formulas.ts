/**
 * `content-measure-formulas` (deck Salesforce, SF17, TASK-1942): «¿Cómo sabes que funciona? Lo medimos.». Cinco
 * métricas de la práctica en fichas de vidrio (tres arriba y dos abajo, centradas bajo las de arriba), cada una con su
 * ícono Trazo de AXIS, su nombre, su fórmula en un recuadro, su fuente y su dueño. Sin cifras: la línea base se mide en
 * el diagnóstico, y la nota lo dice.
 *
 * Todo lo que pinta sale de AXIS (`efeonceGraphicLine.surfaces.deck.recipes['content-measure-formulas']`). El CONTENIDO
 * llega en el intent: `note` y `metrics` (cinco: `glyph`, `name`, `formula`, `source`, `owner`). Los íconos son de la
 * voz de la línea (Trazo) en reposo, resueltos por `resolveIcon`: no son íconos de producto.
 */

import { SurfacePieceError, type SurfaceAssetRequest } from '../../types'
import { contentOf, iconAsset, voiceSlots } from '../../shared'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { colorVar, css, measured } from '../kit'

import { trackingPx } from './content-service-lanes'
import { exactly, glassVars, lineColor, lineVoiceFrame, lumVars, noteVars, req, stageLayers, uniqueAssets, type FrostedGlass } from './kit'

type Text = { px: number; weight?: number; lineHeight?: number; tracking?: string; gapTopPx?: number; color?: string }

type MetricTokens = {
  count: number
  rows: { yPx: number; count: number; offsetOfStep?: number }[]
  xPx: number
  widthPx: number
  heightPx: number
  gapPx: number
  padding: [number, number]
  radiusPx: number
  glass: FrostedGlass
  icon: { px: number; voice: string; state: string }
  title: Text
  formula: Text & { padding: [number, number]; radiusPx: number; fill: { color: string; opacity: number } }
  meta: { px: number; weight: number; tracking: string; uppercase: boolean; gapTopPx: [number, number]; color: string; fields: [string, string] }
}

type MetricIntent = { glyph?: unknown; name?: unknown; formula?: unknown; source?: unknown; owner?: unknown }

/** Sin cifras de promesa (catálogo de recetas, `content-measure-formulas.rules`): ni metas ni resultados. */
const FIGURE = /\d/

export const contentMeasureFormulas: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const line = String(intent.line)
  const metricsT = measured(recipe.metrics as MetricTokens | undefined, 'las métricas')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)

  if (!content.body) throw new SurfacePieceError('La lámina lleva su bajada (`body`).', 'invalid-intent')

  const note = req(content.note, 'La nota (`note`: explica por qué no hay cifras)')
  const metrics = exactly<MetricIntent>(intent.metrics, metricsT.count, 'Las métricas (`metrics`)')

  if (metricsT.rows.reduce((sum, row) => sum + row.count, 0) !== metricsT.count) throw new SurfacePieceError('AXIS no midió un lugar por cada métrica.', 'invalid-intent')

  // El lugar de cada ficha: fila por fila, con el corrimiento de medio paso de la fila de abajo.
  const step = metricsT.widthPx + metricsT.gapPx
  const places = metricsT.rows.flatMap(row => Array.from({ length: row.count }, (_, column) => ({ x: metricsT.xPx + column * step + (row.offsetOfStep ?? 0) * step, y: row.yPx })))

  const cards = metrics.map((metric, i) => {
    const name = req(metric.name, `La métrica ${i + 1} (\`metrics[${i}].name\`)`)
    const formula = req(metric.formula, `La fórmula de la métrica ${i + 1} (\`metrics[${i}].formula\`)`)
    const glyph = req(metric.glyph, `El ícono de la métrica ${i + 1} (\`metrics[${i}].glyph\`)`)

    if (FIGURE.test(name) || FIGURE.test(formula)) {
      throw new SurfacePieceError(`La métrica ${i + 1} trae una cifra: la lámina muestra fórmulas, no metas ni resultados (la línea base se mide en el diagnóstico).`, 'invalid-intent')
    }

    let icon: { ref: string; asset: SurfaceAssetRequest }

    try {
      icon = iconAsset(glyph, line, metricsT.icon.px, name)
    } catch (error) {
      throw new SurfacePieceError(`El ícono de la métrica ${i + 1} (\`metrics[${i}].glyph\`) no es un glifo Trazo de AXIS: ${(error as Error).message}`, 'invalid-intent')
    }

    return {
      icon,
      name,
      formula,
      source: req(metric.source, `La fuente de la métrica ${i + 1} (\`metrics[${i}].source\`)`),
      owner: req(metric.owner, `El dueño de la métrica ${i + 1} (\`metrics[${i}].owner\`): un rol, nunca un nombre`)
    }
  })

  const { stage, platform } = stageLayers(manifest, recipe, line, 'cmf')
  const { formula, meta, title } = metricsT
  const [sourceLabel, ownerLabel] = meta.fields

  const frame: Record<string, unknown> = {
    line,
    ...lineVoiceFrame(manifest, recipe),
    ...lumVars(recipe),
    ...noteVars(recipe, line),
    ...glassVars(metricsT.glass, line),
    // Las fichas
    cardWidth: css('cmf-card-width', metricsT.widthPx),
    cardHeight: css('cmf-card-height', metricsT.heightPx),
    cardPadY: css('cmf-card-pad-y', metricsT.padding[0]),
    cardPadX: css('cmf-card-pad-x', metricsT.padding[1]),
    cardRadius: css('cmf-card-radius', metricsT.radiusPx),
    iconSize: css('cmf-icon', metricsT.icon.px),
    titlePx: css('cmf-title-px', title.px),
    titleTracking: css('cmf-title-tracking', trackingPx(title.tracking, title.px, 'la métrica')),
    titleGap: css('cmf-title-gap', measured(title.gapTopPx, 'el aire de la métrica')),
    titleColor: colorVar('cmf-title', lineColor(measured(title.color, 'el color de la métrica'), line, 'la métrica')),
    // La fórmula en su recuadro
    formulaPx: css('cmf-formula-px', formula.px),
    formulaWeight: css('cmf-formula-wght', measured(formula.weight, 'el peso de la fórmula'), ''),
    formulaLeading: css('cmf-formula-leading', measured(formula.lineHeight, 'el interlineado de la fórmula'), ''),
    formulaGap: css('cmf-formula-gap', measured(formula.gapTopPx, 'el aire de la fórmula')),
    formulaPadY: css('cmf-formula-pad-y', formula.padding[0]),
    formulaPadX: css('cmf-formula-pad-x', formula.padding[1]),
    formulaRadius: css('cmf-formula-radius', formula.radiusPx),
    formulaFill: colorVar('cmf-formula-fill', lineColor(formula.fill.color, line, 'el recuadro de la fórmula')),
    formulaFillOpacity: css('cmf-formula-fill-opacity', formula.fill.opacity * 100, '%'),
    formulaColor: colorVar('cmf-formula', lineColor(measured(formula.color, 'el color de la fórmula'), line, 'la fórmula')),
    // Fuente y dueño
    metaPx: css('cmf-meta-px', meta.px),
    metaWeight: css('cmf-meta-wght', meta.weight, ''),
    metaTracking: css('cmf-meta-tracking', trackingPx(meta.tracking, meta.px, 'la fuente y el dueño')),
    metaGapFirst: css('cmf-meta-gap-first', meta.gapTopPx[0]),
    metaGapNext: css('cmf-meta-gap-next', meta.gapTopPx[1]),
    metaColor: colorVar('cmf-meta', lineColor(meta.color, line, 'la fuente y el dueño'))
  }

  return {
    contentType: 'deck.content-measure-formulas',
    slots: {
      frame,
      stage: { src: stage.ref },
      platform: { src: platform.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      note,
      metrics: cards.map((card, i) => ({
        icon: card.icon.ref,
        name: card.name,
        formula: card.formula,
        sourceLabel: req(sourceLabel, 'El rótulo de la fuente'),
        source: card.source,
        ownerLabel: req(ownerLabel, 'El rótulo del dueño'),
        owner: card.owner,
        left: css('cmf-left', places[i]!.x),
        top: css('cmf-top', places[i]!.y)
      }))
    },
    assets: uniqueAssets([stage.asset, platform.asset, ...cards.map(card => card.icon.asset)])
  }
}
