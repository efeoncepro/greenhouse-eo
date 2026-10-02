/**
 * `content-service-mockups` (deck SEO/AEO, TASK-1949): «¿Y qué hace ese equipo? Todo esto.». Lo que el equipo SEO hace,
 * mostrado con maquetas NATIVAS grandes y legibles (nunca capturas chicas de la web): tres fichas en vidrio sobre la
 * plataforma de luz —SEO técnico (el anillo de Core Web Vitals y cuatro chequeos), Contenido SEO (el cluster con su
 * pillar, la protagonista con la única sombra profunda) y PR y link building (la cifra de dominios, la curva y tres
 * medios)— y abajo tres entregables en chip.
 *
 * El CONTENIDO llega en el intent con los nombres del catálogo de recetas: `technicalTitle`, `technicalScore` (0–100),
 * `technicalScoreLabel` (con saltos de línea y la última en negrita), `technicalChecks` ×4, `technicalCaption`,
 * `contentTitle`, `contentPillar`, `contentNodes` ×6, `contentCaption` (una negrita), `authorityTitle`,
 * `authorityMetric` (`value`, `label`), `authorityOutlets` ×3, `authorityCaption` y `chips` ×3 (`title`, `detail`). Las
 * cifras son de maqueta: ilustran el entregable, no prometen un resultado.
 */

import { contentOf, voiceSlots } from '../../shared'
import { SurfacePieceError } from '../../types'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { css } from '../kit'
import { req, uniqueAssets } from '../line-stage/kit'
import { productMarkSlot, recipeProductMarkPlacement } from '../product-mark'

import { listOf, strings, sv360Frame, sv360Layers, sv360Platform, sv360Stage } from './kit'

/** TODO AXIS TASK-1949: `content-service-mockups.stage` y `.platform` (medidos en `native/SEO-Servicios.html`). */
const STAGE = sv360Stage(1270, 430)
const PLATFORM = sv360Platform(1250, 912, 500, 72, [-0.92, 0.4028], [0.7, 0.75])

/** El perímetro del anillo del puntaje (r = 50 en la maqueta de 120 px). */
const RING_LENGTH = 2 * Math.PI * 50

type Obj = Record<string, unknown>

export const contentServiceMockups: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const line = String(intent.line)
  const voice = voiceSlots(manifest)
  const content = contentOf(manifest)

  if (!content.body) throw new SurfacePieceError('La lámina de servicios lleva su bajada (`body`).', 'invalid-intent')

  const score = intent.technicalScore

  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 100) {
    throw new SurfacePieceError('El puntaje de SEO técnico (`technicalScore`) es un entero de 0 a 100.', 'invalid-intent')
  }

  const metric = (intent.authorityMetric ?? {}) as Obj
  const { stage, platform } = sv360Layers(manifest, line, 'ssm', STAGE, PLATFORM)
  const mark = productMarkSlot(intent.productMark, recipeProductMarkPlacement(recipe))

  const frame = {
    ...sv360Frame(manifest, recipe, line, ['bg', 'soft', 'muted', 'halo', 'teal', 'shadow', 'cardFrom', 'cardTo', 'heroFrom', 'chip', 'miniFrom']),
    scoreDash: css('ssm-score-dash', (RING_LENGTH * score) / 100, '')
  }

  return {
    contentType: 'deck.content-service-mockups',
    slots: {
      frame,
      stage: { src: stage.ref },
      platform: { src: platform!.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      technical: {
        title: req(intent.technicalTitle, 'El rótulo de SEO técnico (`technicalTitle`)'),
        score: String(score),
        scoreLabel: evidenceHtml(req(intent.technicalScoreLabel, 'Lo que mide el anillo (`technicalScoreLabel`)'), 'none'),
        caption: req(intent.technicalCaption, 'La nota de SEO técnico (`technicalCaption`)')
      },
      checks: strings(intent.technicalChecks, 4, 'Los chequeos de SEO técnico (`technicalChecks`)').map(label => ({ label })),
      cluster: {
        title: req(intent.contentTitle, 'El rótulo del contenido (`contentTitle`)'),
        pillar: req(intent.contentPillar, 'El pillar del cluster (`contentPillar`)'),
        caption: evidenceHtml(req(intent.contentCaption, 'La nota del contenido (`contentCaption`)'), 'none')
      },
      nodes: strings(intent.contentNodes, 6, 'Las piezas del cluster (`contentNodes`)').map(label => ({ label })),
      authority: {
        title: req(intent.authorityTitle, 'El rótulo de PR y link building (`authorityTitle`)'),
        value: req(metric.value, 'La cifra de dominios (`authorityMetric.value`)'),
        label: evidenceHtml(req(metric.label, 'Lo que cuenta la cifra (`authorityMetric.label`)'), 'none'),
        caption: req(intent.authorityCaption, 'La nota de PR y link building (`authorityCaption`)')
      },
      outlets: strings(intent.authorityOutlets, 3, 'Los medios de enlaces (`authorityOutlets`)').map(label => ({ label })),
      chips: listOf<Obj>(intent.chips, 3, 'Los entregables (`chips`)').map((chip, i) => ({
        title: req(chip.title, `El entregable ${i + 1} (\`chips[${i}].title\`)`),
        detail: req(chip.detail, `El entregable ${i + 1} (\`chips[${i}].detail\`)`)
      })),
      ...(mark ? { productMark: mark.slot } : {})
    },
    assets: uniqueAssets([stage.asset, platform!.asset, ...(mark ? [mark.asset] : [])])
  }
}
