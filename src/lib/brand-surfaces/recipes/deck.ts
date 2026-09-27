/**
 * Builders de las recetas APROBADAS de la superficie deck (catálogo `graphic-line-deck`).
 *
 * Cada builder recibe el intent, el manifest que resolvió AXIS y los tokens de la receta, y devuelve los
 * slots de la lámina. No decide copy ni elige plantilla: traduce medidas y contenido ya gobernados.
 */

import type { RecipeSlots } from '../types'
import { SurfacePieceError } from '../types'
import {
  answerPxWithinRange,
  clamp,
  iconAsset,
  lower,
  ofHeight,
  plateAsset,
  reserve,
  selectionSlot,
  upper,
  voiceSlots,
  type SurfaceIntent,
  type SurfaceManifest
} from '../shared'

export interface RecipeContext {
  intent: SurfaceIntent
  manifest: SurfaceManifest
  /** `efeonceGraphicLine.surfaces.<surface>.recipes.<recipe>` */
  recipe: Record<string, unknown>
}

export type RecipeBuilder = (ctx: RecipeContext) => RecipeSlots

type StepsLayoutToken = {
  count: number
  xStepPx: number
  widthPx: number
  fromTop?: number
  fromTopRange?: [number, number]
  iconPx: number
  kicker: { px: number }
  title: { px: number }
}

/**
 * `proposal-cinematic`: vende un servicio con una imagen que se recuerda. Foto de cine a sangre con el sujeto
 * a la derecha, voz en el espacio oscuro de la izquierda, prueba con fuente y hasta cuatro pasos con íconos de
 * la voz de la línea en reposo. Hasta tres pasos van en fila (`inline-3`); cuatro, en columnas (`columns-4`).
 */
export const proposalCinematic: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const { width, height } = manifest.canvas
  const type = manifest.type ?? {}
  const margin = manifest.safeArea?.marginPx ?? Math.round(width * 0.0729)
  const textShare = reserve(manifest, 'text')?.share ?? 0.45

  const voice = voiceSlots(intent)
  const answerRange: [number, number] = [lower(type.answer?.px, 140), upper(type.answer?.px, 176)]
  const answerPx = answerPxWithinRange(voice.answer!, answerRange, textShare * width - margin)

  // La respuesta vive en su rango de altura: más grande, más arriba, para que la bajada conserve su aire.
  const answerBand = reserve(manifest, 'answer')?.fromTopRange ?? [0.2639, 0.2944]
  const answerTop = Math.round(ofHeight(manifest, answerBand[1]) - (answerPx - answerRange[0]) * 0.2)
  const answerLines = voice.answerLead ? 2 : 1
  const answerBottom = answerTop + answerPx * 0.95 * answerLines

  const bodyBand = reserve(manifest, 'body')?.fromTopRange ?? [0.463, 0.5185]
  const bodyTop = Math.round(clamp(answerBottom + answerPx * 0.34, ofHeight(manifest, bodyBand[0]), ofHeight(manifest, bodyBand[1])))
  const bodyPx = lower(type.body?.px, 26)
  const bodyWidth = Math.round((lower(type.body?.maxWidthPx, 500) + upper(type.body?.maxWidthPx, 640)) / 2)

  const steps = intent.steps ?? []

  if (steps.length === 0 || steps.length > 4) {
    throw new SurfacePieceError('`proposal-cinematic` lleva entre uno y cuatro pasos.', 'invalid-intent')
  }

  const layouts = (recipe.steps as { layouts: Record<string, StepsLayoutToken> }).layouts
  const layoutKey = steps.length <= 3 ? 'inline-3' : 'columns-4'
  const layout = layouts[layoutKey]!
  const stepsTop = ofHeight(manifest, layout.fromTop ?? layout.fromTopRange![0])

  const assets: RecipeSlots['assets'] = []
  const photo = plateAsset(intent, { width, height })

  assets.push(photo.asset)

  const stepItems = steps.map(step => {
    const icon = iconAsset(step.glyph, intent.line, layout.iconPx, step.name)

    if (!assets.some(a => a.ref === icon.ref)) assets.push(icon.asset)

    return { icon: icon.ref, kicker: step.kicker, name: step.name }
  })

  if (!intent.proof?.text || !intent.proof.source) {
    throw new SurfacePieceError('La prueba va con su fuente (`proof.text` y `proof.source`).', 'invalid-intent')
  }

  if (!intent.body) throw new SurfacePieceError('La receta lleva bajada (`body`).', 'invalid-intent')

  const slots: Record<string, unknown> = {
    frame: {
      line: intent.line,
      stepsLayout: layoutKey === 'inline-3' ? 'inline' : 'columns',
      margin,
      eyebrowTop: ofHeight(manifest, reserve(manifest, 'eyebrow')?.fromTop ?? 0.1111),
      questionTop: ofHeight(manifest, reserve(manifest, 'question')?.fromTop ?? 0.1722),
      answerTop,
      answerPx,
      bodyTop,
      bodyPx,
      bodyWidth,
      proofTop: ofHeight(manifest, reserve(manifest, 'proof')?.fromTop ?? 0.6852),
      stepsTop,
      stepsGap: layout.xStepPx,
      stepWidth: layout.widthPx,
      iconPx: layout.iconPx,
      kickerPx: layout.kicker.px,
      stepNamePx: layout.title.px
    },
    photo: { src: photo.ref, alt: photo.alt },
    voice,
    body: intent.body,
    proof: { text: intent.proof.text, source: intent.proof.source },
    steps: stepItems
  }

  const selection = selectionSlot(manifest)

  if (selection) slots.selection = selection

  return { slots, assets }
}

export const DECK_BUILDERS: Record<string, RecipeBuilder> = {
  'proposal-cinematic': proposalCinematic
}
