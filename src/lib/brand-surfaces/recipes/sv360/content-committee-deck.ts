/**
 * `content-committee-deck` (deck SEO/AEO, TASK-1949): «¿Y el PPT del comité? Ya está.». La lámina de comité que arma
 * Efeonce Insights, en perspectiva sobre la plataforma de luz con dos apiladas detrás: el titular escrito por la IA, la
 * cifra del trimestre, la curva anotada con la pieza que la movió, la barra «Modo presentación» y tres formatos en chip.
 *
 * El CONTENIDO llega en el intent con los nombres del catálogo de recetas: `slideKicker`, `slideHeadline`,
 * `slideFigure` (`value`, `label`), `annotation` y `features` ×3 (`title`, `detail`). La numeración de ejemplo
 * («04 / 12») y la barra «Modo presentación» las pone la plantilla. Las cifras son de maqueta y la lámina no promete un
 * formato que no esté vivo.
 */

import { contentOf, voiceSlots } from '../../shared'
import { SurfacePieceError } from '../../types'
import type { RecipeBuilder } from '../deck'
import { evidenceHtml } from '../frame'
import { req, uniqueAssets } from '../line-stage/kit'
import { productMarkSlot } from '../product-mark'

import { listOf, sv360Frame, sv360Layers, sv360Platform, sv360Stage } from './kit'

/** TODO AXIS TASK-1949: `content-committee-deck.stage` y `.platform` (medidos en `native/Insights-Formatos.html`). */
const STAGE = sv360Stage(1270, 420)
const PLATFORM = sv360Platform(1270, 905, 520, 74, [-0.9231, 0.3784], [0.6962, 0.7162])

type Obj = Record<string, unknown>

export const contentCommitteeDeck: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const line = String(intent.line)
  const voice = voiceSlots(manifest)
  const content = contentOf(manifest)

  if (!content.body) throw new SurfacePieceError('La lámina del comité lleva su bajada (`body`).', 'invalid-intent')

  const figure = (intent.slideFigure ?? {}) as Obj
  const { stage, platform } = sv360Layers(manifest, line, 'scd', STAGE, PLATFORM)
  const mark = productMarkSlot(intent.productMark)

  const frame = sv360Frame(manifest, recipe, line, ['bg', 'soft', 'muted', 'halo', 'shadow', 'cardTo', 'miniFrom', 'slideFrom', 'slideBack', 'slideMid'])

  return {
    contentType: 'deck.content-committee-deck',
    slots: {
      frame,
      stage: { src: stage.ref },
      platform: { src: platform!.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      slide: {
        kicker: req(intent.slideKicker, 'El rótulo de la lámina (`slideKicker`)'),
        headline: req(intent.slideHeadline, 'El titular que escribe la IA (`slideHeadline`)'),
        figure: req(figure.value, 'La cifra del trimestre (`slideFigure.value`)'),
        figureLabel: req(figure.label, 'Lo que cuenta la cifra (`slideFigure.label`)'),
        annotation: req(intent.annotation, 'La pieza que movió la curva (`annotation`)')
      },
      features: listOf<Obj>(intent.features, 3, 'Los formatos (`features`)').map((feature, i) => ({
        title: req(feature.title, `El formato ${i + 1} (\`features[${i}].title\`)`),
        detail: req(feature.detail, `El formato ${i + 1} (\`features[${i}].detail\`)`)
      })),
      ...(mark ? { productMark: mark.slot } : {})
    },
    assets: uniqueAssets([stage.asset, platform!.asset, ...(mark ? [mark.asset] : [])])
  }
}
