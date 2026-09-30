/**
 * `content-industries` (deck SEO/AEO, TASK-1949): «¿Conocemos tu industria? Por dentro.». Seis fichas de vidrio en
 * perspectiva sobre la plataforma de luz, numeradas, cada una con el nombre de la industria y la pregunta que ese
 * comprador le hace a la IA en una caja con el ícono Trazo `composer` de AXIS. Una ficha va destacada, adelante y con la
 * única sombra profunda; tres columnas de luz suben de la plataforma.
 *
 * El CONTENIDO llega en el intent con los nombres del catálogo de recetas: `industries` ×6 (`name`, `question`) y
 * `highlightedIndustry` (1–6; la numeración 01–06 la pone la plantilla). Las preguntas son
 * de ejemplo: ilustran cómo pregunta ese comprador, no son un caso ni un cliente (regla
 * `example-questions-not-client-claims`).
 */

import { contentOf, iconAsset, voiceSlots } from '../../shared'
import { SurfacePieceError } from '../../types'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { layerAsset } from '../kit'
import { indexIn, req, uniqueAssets } from '../line-stage/kit'
import { productMarkSlot, recipeProductMarkPlacement } from '../product-mark'

import { lightColumnsSvg, listOf, sv360Frame, sv360Layers, sv360Platform, sv360Stage, type LightColumns } from './kit'

/** TODO AXIS TASK-1949: `content-industries.stage`, `.platform` y `.pillars` (medidos en `native/industrias-gen.mjs`). */
const STAGE = sv360Stage(1290, 420)
const PLATFORM = sv360Platform(1290, 905, 520, 74, [-0.9231, 0.3784], [0.6962, 0.7162])

const COLUMNS: LightColumns = {
  color: 'halo',
  opacity: [0.35, 0],
  blurPx: 14,
  columns: [
    { xPx: 930, yPx: 160, widthPx: 60, heightPx: 760, opacity: 1 },
    { xPx: 1265, yPx: 120, widthPx: 44, heightPx: 800, opacity: 0.7 },
    { xPx: 1590, yPx: 180, widthPx: 36, heightPx: 740, opacity: 0.6 }
  ]
}

/** El ícono de la pregunta: el glifo Trazo `composer` (la caja donde se le pregunta a la IA), en reposo. */
const QUESTION_GLYPH = 'composer'
const QUESTION_ICON_PX = 26

type IndustryIntent = { name?: unknown; question?: unknown }

export const contentIndustries: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const line = String(intent.line)
  const voice = voiceSlots(manifest)
  const content = contentOf(manifest)

  if (!content.body) throw new SurfacePieceError('La lámina de industrias lleva su bajada (`body`).', 'invalid-intent')

  const industries = listOf<IndustryIntent>(intent.industries, 6, 'Las industrias (`industries`)')
  const featured = indexIn(intent.highlightedIndustry, industries.length, 'La industria destacada (`highlightedIndustry`)')
  const icon = iconAsset(QUESTION_GLYPH, line, QUESTION_ICON_PX, 'Pregunta a la IA')
  const { stage, platform } = sv360Layers(manifest, line, 'sin', STAGE, PLATFORM)
  const columns = layerAsset('sin-columns', lightColumnsSvg(manifest, COLUMNS, line, 'sin'))
  const mark = productMarkSlot(intent.productMark, recipeProductMarkPlacement(recipe))

  const frame = sv360Frame(manifest, recipe, line, ['bg', 'soft', 'halo', 'shadow', 'cardFrom', 'cardTo', 'heroCardFrom', 'heroCardTo'])

  return {
    contentType: 'deck.content-industries',
    slots: {
      frame,
      stage: { src: stage.ref },
      platform: { src: platform!.ref },
      columns: { src: columns.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      industries: industries.map((industry, i) => ({
        number: String(i + 1).padStart(2, '0'),
        name: req(industry.name, `La industria ${i + 1} (\`industries[${i}].name\`)`),
        question: req(industry.question, `La pregunta de la industria ${i + 1} (\`industries[${i}].question\`)`),
        icon: icon.ref,
        role: i + 1 === featured ? 'lead' : 'rest'
      })),
      ...(mark ? { productMark: mark.slot } : {})
    },
    assets: uniqueAssets([stage.asset, platform!.asset, columns.asset, icon.asset, ...(mark ? [mark.asset] : [])])
  }
}
