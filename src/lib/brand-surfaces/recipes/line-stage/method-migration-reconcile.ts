/**
 * `method-migration-reconcile` (deck Salesforce, SF13, TASK-1942): «¿Cómo sabes que migró todo? Porque cuadra.». Cuatro
 * etapas de la carga como bloques de vidrio numerados que bajan en escalera, unidos por haces del acento; al frente, en
 * papel, la quinta etapa: la reconciliación con el ícono oficial de la plataforma, el conteo que cuadra y la píldora
 * «Rollback listo». La selección «Cliente» toma la reconciliación (ancla `bottom-start`).
 *
 * Todo lo que pinta sale de AXIS (`efeonceGraphicLine.surfaces.deck.recipes['method-migration-reconcile']`): la voz, el
 * escenario, la plataforma, los bloques, los haces entre bloques y la tarjeta de reconciliación. El CONTENIDO llega en el
 * intent: `stages` (cuatro: `label`, `value` con separador de miles es-CL y `description`; el número de cada etapa lo pone
 * el builder), `reconciliation` (`<origen> = <destino> · cuadra`), `rollbackBadge` y la `note` obligatoria mientras las
 * cifras sean de muestra. Regla que se cierra aquí: los números cuadran — origen − duplicados = carga completa = los dos
 * lados de la reconciliación.
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
  lineColor,
  lineVoiceFrame,
  lumVars,
  noteVars,
  productIcon,
  req,
  stageLayers,
  uniqueAssets,
  type FrostedGlass,
  type LineBeam,
  type LineDocument, cssFine } from './kit'

type Text = { px: number; weight?: number; tracking?: string; gapPx?: number; gapTopPx?: number; lineHeight?: number; color?: string; numbered?: boolean; form?: string; text?: string }

type StageTokens = {
  count: number
  xPx: number
  yPx: number
  stepDownPx: number
  widthPx: number
  heightPx: number
  gapPx: number
  padding: number
  radiusPx: number
  glass: FrostedGlass
  kicker: Text
  value: Text
  desc: Text
  arrows: { insetPx: number; atYPx: number; bendPx: number }
}

type ReconcileTokens = {
  xOffsetPx: number
  yPx: number
  widthPx: number
  padding: [number, number]
  radiusPx: number
  gapPx: number
  document: LineDocument
  icon: { px: number }
  kicker: Text
  title: Text
  tag: { padding: [number, number]; radiusPx: number; ring: { px: number; color: string }; px: number; weight: number; text: string }
}

type StageIntent = { label?: unknown; value?: unknown; description?: unknown }

/** Una cifra con separador de miles es-CL (48.210): la única forma en que la lámina escribe un conteo. */
const COUNT = /^\d{1,3}(?:\.\d{3})*$/

/** Las etapas que entran a la cuenta: origen, duplicados unificados y carga completa (la de prueba no suma ni resta). */
const ORIGIN = 0
const DUPLICATES = 1
const FULL_LOAD = 3

const tracking = (value: string | undefined, what: string): number => Number.parseFloat(measured(value, `el tracking de ${what}`))

const count = (value: string, what: string): number => {
  if (!COUNT.test(value)) throw new SurfacePieceError(`${what} es una cifra con separador de miles es-CL (48.210).`, 'invalid-intent')

  return Number(value.replace(/\./g, ''))
}

const step = (index: number): string => String(index).padStart(2, '0')

export const methodMigrationReconcile: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const line = String(intent.line)
  const stages = measured(recipe.stages as StageTokens | undefined, 'las etapas de la carga')
  const reconcile = measured(recipe.reconcile as ReconcileTokens | undefined, 'la reconciliación')
  const beam = measured(recipe.beam as LineBeam | undefined, 'el haz de luz')
  const content = contentOf(manifest)
  const voice = voiceSlots(manifest)
  const doc = reconcile.document

  if (!voice.answerLead) throw new SurfacePieceError('La respuesta va en dos líneas (`voice.answer` con dos tramos).', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('La lámina lleva su bajada (`body`).', 'invalid-intent')

  const note = req(content.note, 'La nota de datos de muestra (`note`), obligatoria mientras las cifras sean de muestra,')
  const list = exactly<StageIntent>(intent.stages, stages.count, 'Las etapas de la carga (`stages`)')

  const rows = list.map((stage, i) => {
    const where = `la etapa ${i + 1} (\`stages[${i}]\`)`
    const value = req(stage.value, `La cifra de ${where} (\`value\`)`)

    return {
      label: req(stage.label, `El nombre de ${where} (\`label\`)`),
      value,
      count: count(value, `La cifra de ${where}`),
      description: req(stage.description, `La descripción de ${where} (\`description\`)`)
    }
  })

  // Los números cuadran: origen − duplicados = carga completa = los dos lados de la reconciliación.
  const expected = rows[ORIGIN]!.count - rows[DUPLICATES]!.count

  if (rows[FULL_LOAD]!.count !== expected) {
    throw new SurfacePieceError(
      `Los números no cuadran: origen (${rows[ORIGIN]!.value}) − duplicados (${rows[DUPLICATES]!.value}) no da la carga completa (${rows[FULL_LOAD]!.value}).`,
      'invalid-intent'
    )
  }

  const reconciliation = req(intent.reconciliation, 'La reconciliación (`reconciliation`)')
  const sides = /^(\S+) = (\S+) · cuadra$/.exec(reconciliation)

  if (!sides) throw new SurfacePieceError(`La reconciliación va como «${measured(reconcile.title.form, 'la forma de la reconciliación')}».`, 'invalid-intent')

  for (const side of [sides[1]!, sides[2]!]) {
    if (count(side, 'Cada lado de la reconciliación') !== expected) {
      throw new SurfacePieceError(`Los dos lados de la reconciliación son la carga completa (${rows[FULL_LOAD]!.value}): «${reconciliation}» no cuadra.`, 'invalid-intent')
    }
  }

  const icon = productIcon('platform', 'El ícono de la reconciliación')
  const { stage, platform } = stageLayers(manifest, recipe, line, 'mmr')

  const leftOf = (i: number) => stages.xPx + i * (stages.widthPx + stages.gapPx)
  const topOf = (i: number) => stages.yPx + i * stages.stepDownPx
  const { insetPx, atYPx, bendPx } = stages.arrows

  // Un haz de cada bloque al siguiente: del borde derecho (menos el sangrado) al izquierdo del siguiente (más el sangrado).
  const beams = layerAsset(
    'method-migration-reconcile-beams',
    beamsSvg(
      manifest,
      rows.slice(1).map((_, i) => ({
        from: [leftOf(i) + stages.widthPx - insetPx, topOf(i) + atYPx] as [number, number],
        to: [leftOf(i + 1) + insetPx, topOf(i + 1) + atYPx] as [number, number],
        bend: bendPx
      })),
      beam,
      line,
      'mmr'
    )
  )

  const k = stages.kicker
  const color = (value: string | undefined, what: string, d?: LineDocument) => lineColor(measured(value, `el color de ${what}`), line, what, d)

  const frame: Record<string, unknown> = {
    line,
    ...lineVoiceFrame(manifest, recipe),
    ...lumVars(recipe),
    ...noteVars(recipe, line),
    ...glassVars(stages.glass, line),
    ...documentVars(doc, line),
    // Los bloques
    blockWidth: css('mmr-block-width', stages.widthPx),
    blockHeight: css('mmr-block-height', stages.heightPx),
    blockPad: css('mmr-block-pad', stages.padding),
    blockRadius: css('mmr-block-radius', stages.radiusPx),
    kickerPx: css('mmr-kicker-px', k.px),
    kickerWeight: css('mmr-kicker-wght', measured(k.weight, 'el peso del nombre de la etapa'), ''),
    kickerTracking: cssFine('mmr-kicker-tracking', tracking(k.tracking, 'el nombre de la etapa')),
    kickerColor: colorVar('mmr-kicker', color(k.color, 'el nombre de la etapa')),
    valuePx: css('mmr-value-px', stages.value.px),
    valueTracking: cssFine('mmr-value-tracking', tracking(stages.value.tracking, 'la cifra')),
    valueGap: css('mmr-value-gap', measured(stages.value.gapTopPx, 'el aire sobre la cifra')),
    valueColor: colorVar('mmr-value', color(stages.value.color, 'la cifra')),
    descPx: css('mmr-desc-px', stages.desc.px),
    descWeight: css('mmr-desc-wght', measured(stages.desc.weight, 'el peso de la descripción'), ''),
    descLeading: css('mmr-desc-leading', measured(stages.desc.lineHeight, 'el interlineado de la descripción'), ''),
    descGap: css('mmr-desc-gap', measured(stages.desc.gapPx, 'el aire de la descripción')),
    descColor: colorVar('mmr-desc', color(stages.desc.color, 'la descripción')),
    // La reconciliación
    recLeft: css('mmr-rec-left', stages.xPx + reconcile.xOffsetPx),
    recTop: css('mmr-rec-top', reconcile.yPx),
    recWidth: css('mmr-rec-width', reconcile.widthPx),
    recPadY: css('mmr-rec-pad-y', reconcile.padding[0]),
    recPadX: css('mmr-rec-pad-x', reconcile.padding[1]),
    recRadius: css('mmr-rec-radius', reconcile.radiusPx),
    recGap: css('mmr-rec-gap', reconcile.gapPx),
    recIcon: css('mmr-rec-icon', reconcile.icon.px),
    recKickerPx: css('mmr-rec-kicker-px', reconcile.kicker.px),
    recKickerWeight: css('mmr-rec-kicker-wght', measured(reconcile.kicker.weight, 'el peso del rótulo de la reconciliación'), ''),
    recKickerTracking: cssFine('mmr-rec-kicker-tracking', tracking(reconcile.kicker.tracking, 'el rótulo de la reconciliación')),
    recKickerColor: colorVar('mmr-rec-kicker', color(reconcile.kicker.color, 'el rótulo de la reconciliación', doc)),
    recTitlePx: css('mmr-rec-title-px', reconcile.title.px),
    recTitleTracking: cssFine('mmr-rec-title-tracking', tracking(reconcile.title.tracking, 'la reconciliación')),
    recTitleGap: css('mmr-rec-title-gap', measured(reconcile.title.gapPx, 'el aire de la reconciliación')),
    tagPadY: css('mmr-tag-pad-y', reconcile.tag.padding[0]),
    tagPadX: css('mmr-tag-pad-x', reconcile.tag.padding[1]),
    tagRadius: css('mmr-tag-radius', reconcile.tag.radiusPx),
    tagRing: css('mmr-tag-ring', reconcile.tag.ring.px),
    tagRingColor: colorVar('mmr-tag-ring', lineColor(reconcile.tag.ring.color, line, 'el anillo de la píldora', doc)),
    tagPx: css('mmr-tag-px', reconcile.tag.px),
    tagWeight: css('mmr-tag-wght', reconcile.tag.weight, '')
  }

  const selection = selectionSlot(manifest)

  return {
    contentType: 'deck.method-migration-reconcile',
    slots: {
      frame,
      stage: { src: stage.ref },
      platform: { src: platform.ref },
      beams: { src: beams.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      note,
      stages: rows.map((row, i) => ({
        left: css('mmr-left', leftOf(i)),
        top: css('mmr-top', topOf(i)),
        // Las etapas van numeradas 01–04 (`kicker.numbered`): el número lo pone el builder.
        label: k.numbered ? `${step(i + 1)} · ${row.label}` : row.label,
        value: row.value,
        description: row.description
      })),
      reconcile: {
        icon: icon.ref,
        step: step(stages.count + 1),
        result: reconciliation,
        badge: req(intent.rollbackBadge, 'La píldora de vuelta atrás (`rollbackBadge`)')
      },
      ...(selection ? { selection } : {})
    },
    assets: uniqueAssets([stage.asset, platform.asset, beams.asset, icon.asset])
  }
}
