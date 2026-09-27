/**
 * Builder de `proposal-service`, la propuesta de servicio SOBRIA (TASK-1928): la versión para cuando la propuesta pide
 * datos y se lee sin presentador; la cine (`proposal-cinematic`) es para cuando pide impacto.
 *
 * Todo lo que pinta sale de AXIS: las reservas y la tipografía de la voz, del manifest; la lente (centro, radio de la
 * foto, anillo, arco y esfera) y las tarjetas (alto, canal, radio, aire, papel y contorno), de los tokens de la receta.
 * El ancho de cada tarjeta se DERIVA del contenido: (ancho del contenido − canales) / tarjetas. La primera tarjeta es
 * el objetivo de la selección (por dónde se empieza) y va en papel; su kicker, en navy (texto chico: nunca el acento).
 *
 * El pie lleva la nota o la prueba, nunca las dos; la prueba sólo con su fuente, impresa en la misma línea.
 */

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'

import type { SurfaceAssetRequest } from '../types'
import { SurfacePieceError } from '../types'
import { answerPxWithinRange, contentOf, lower, ofHeight, plateFrom, photoOf, reserve, selectionSlot, upper, voiceSlots, type SurfaceManifest } from '../shared'

import type { RecipeBuilder } from './deck'

type LensTokens = {
  centerXOfWidth: number
  centerYOfHeight: number
  photoRadiusPx: number
  ring: { color: string; opacity: number; strokePx: number }
  arc: { startDeg: number; endDeg: number; strokePx: number }
  sphereRadiusPx: number
}

type CardTokens = {
  heightPx: number
  gutterPx: number
  radiusPx: number
  paddingPx: number
  nameGapPx: number
  descGapPx: number
  first: { shadow: { yPx: number; blurPx: number; opacity: number } }
  rest: { strokePx: number }
}

type StepsTokens = {
  min: number
  layouts: Record<string, { count: number }>
  card: CardTokens
  kicker: { px: number }
  title: { px: number }
  desc: { px: number }
}

type StepItem = { name: string; kicker?: string | null; desc?: string | null }

const GL = efeonceGraphicLine as unknown as {
  color: Record<string, string>
  orbit: { ringAirRatio: number }
  lines: { key: string; accentOnDark: string }[]
}

const measured = <T>(value: T | null | undefined, what: string): T => {
  if (value === null || value === undefined) throw new SurfacePieceError(`AXIS no midió ${what}.`, 'invalid-intent')

  return value
}

const n = (value: number): string => String(Math.round(value * 100) / 100)
const css = (name: string, value: number | string, unit = 'px'): string => `--gl-${name}=${typeof value === 'number' ? n(value) : value}${typeof value === 'number' ? unit : ''}`

const topOf = (manifest: SurfaceManifest, band: string): number =>
  ofHeight(manifest, measured(reserve(manifest, band)?.fromTop, `la altura de «${band}»`))

/** La lente como capa transparente del lienzo: el anillo en el halo y el arco en el acento que cierra en la esfera. */
const lensSvg = (manifest: SurfaceManifest, lens: LensTokens, accent: string): string => {
  const { width, height } = manifest.canvas
  const cx = Math.round(lens.centerXOfWidth * width)
  const cy = Math.round(lens.centerYOfHeight * height)
  const r = lens.photoRadiusPx * (1 + GL.orbit.ringAirRatio)
  const at = (deg: number) => ({ x: cx + r * Math.cos((deg * Math.PI) / 180), y: cy + r * Math.sin((deg * Math.PI) / 180) })
  const from = at(lens.arc.startDeg)
  const to = at(lens.arc.endDeg)
  const ringColor = measured(GL.color[lens.ring.color], `el color «${lens.ring.color}» del anillo`)

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true" focusable="false">` +
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="none" stroke="${ringColor}" stroke-opacity="${n(lens.ring.opacity)}" stroke-width="${n(lens.ring.strokePx)}"/>` +
    `<path d="M ${n(from.x)} ${n(from.y)} A ${n(r)} ${n(r)} 0 0 1 ${n(to.x)} ${n(to.y)}" fill="none" stroke="${accent}" stroke-width="${n(lens.arc.strokePx)}" stroke-linecap="round"/>` +
    `<circle cx="${n(to.x)}" cy="${n(to.y)}" r="${n(lens.sphereRadiusPx)}" fill="${accent}"/>` +
    '</svg>'
  )
}

export const proposalService: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const { width } = manifest.canvas
  const type = manifest.type ?? {}
  const lens = measured(recipe.lens as LensTokens | undefined, 'la lente de la receta')
  const stepsTokens = measured(recipe.steps as StepsTokens | undefined, 'las tarjetas de la receta')
  const card = stepsTokens.card
  const margin = measured(manifest.safeArea?.marginPx, 'el margen del deck')
  const content = contentOf(manifest) as ReturnType<typeof contentOf> & { note?: string | null }

  const steps = (intent.steps ?? []) as StepItem[]

  if (steps.length < stepsTokens.min || steps.length > Math.max(...Object.values(stepsTokens.layouts).map(layout => layout.count))) {
    throw new SurfacePieceError('`proposal-service` lleva tres o cuatro formas de empezar.', 'invalid-intent')
  }

  if (!content.body) throw new SurfacePieceError('La receta lleva bajada (`body`).', 'invalid-intent')

  if (content.note && content.proof) {
    throw new SurfacePieceError('El pie lleva la nota o la prueba, no las dos.', 'invalid-intent')
  }

  if (content.proof && (!content.proof.text || !content.proof.source)) {
    throw new SurfacePieceError('La prueba va con su fuente (`proof.text` y `proof.source`).', 'invalid-intent')
  }

  // La respuesta en una línea, del mayor tamaño que cabe en la columna de la bajada, sin bajar de 3× la pregunta.
  const voice = voiceSlots(manifest)

  if (voice.answerLead) throw new SurfacePieceError('La respuesta de `proposal-service` va en una línea.', 'invalid-intent')
  const bodyWidth = upper(type.body?.maxWidthPx, 900)
  const answerPx = answerPxWithinRange(voice.answer!, [lower(type.answer?.px, 120), upper(type.answer?.px, 140)], bodyWidth)

  const contentWidth = width - 2 * margin
  const cardWidth = (contentWidth - (steps.length - 1) * card.gutterPx) / steps.length

  const accent = measured(GL.lines.find(line => line.key === intent.line)?.accentOnDark, `el acento de la línea «${intent.line}»`)
  const photoSize = lens.photoRadiusPx * 2
  const photo = plateFrom(photoOf(manifest), { width: photoSize, height: photoSize }, 'La foto de la lente', 'lens')
  const layerRef = `asset-ref:layer:proposal-service-lens-${intent.line}`
  const layer: SurfaceAssetRequest = { ref: layerRef, kind: 'svg', svg: lensSvg(manifest, lens, accent) }

  const shadow = card.first.shadow

  const slots: Record<string, unknown> = {
    frame: {
      line: intent.line,
      margin,
      eyebrowTop: topOf(manifest, 'eyebrow'),
      questionTop: topOf(manifest, 'question'),
      answerTop: topOf(manifest, 'answer'),
      answerPx,
      bodyTop: topOf(manifest, 'body'),
      bodyPx: measured(type.body?.px as number | undefined, 'el cuerpo de la bajada'),
      bodyWidth,
      lensLeft: css('ps-lens-left', Math.round(lens.centerXOfWidth * width) - lens.photoRadiusPx),
      lensTop: css('ps-lens-top', Math.round(lens.centerYOfHeight * manifest.canvas.height) - lens.photoRadiusPx),
      lensSize: css('ps-lens-size', photoSize),
      cardsTop: css('ps-cards-top', topOf(manifest, 'steps')),
      cardWidth: css('ps-card-width', cardWidth),
      cardHeight: css('ps-card-height', card.heightPx),
      cardGutter: css('ps-card-gutter', card.gutterPx),
      cardRadius: css('ps-card-radius', card.radiusPx),
      cardPadding: css('ps-card-padding', card.paddingPx),
      cardStroke: css('ps-card-stroke', card.rest.strokePx),
      cardShadowY: css('ps-card-shadow-y', shadow.yPx),
      cardShadowBlur: css('ps-card-shadow-blur', shadow.blurPx),
      cardShadowOpacity: css('ps-card-shadow-opacity', shadow.opacity * 100, '%'),
      nameGap: css('ps-name-gap', card.nameGapPx),
      descGap: css('ps-desc-gap', card.descGapPx),
      kickerPx: css('ps-kicker-px', stepsTokens.kicker.px),
      namePx: css('ps-name-px', stepsTokens.title.px),
      descPx: css('ps-desc-px', stepsTokens.desc.px),
      footTop: css('ps-foot-top', topOf(manifest, 'note')),
      footLeft: css('ps-foot-left', Math.round(measured(reserve(manifest, 'note')?.inset, 'el inicio de la nota') * width)),
      footPx: css('ps-foot-px', measured((type as Record<string, { px?: number }>).note?.px, 'el cuerpo de la nota'))
    },
    lens: { src: layerRef },
    photo: { src: photo.ref, alt: photo.alt },
    voice,
    body: content.body,
    steps: steps.map(step => ({ kicker: step.kicker ?? '', name: step.name, desc: step.desc ?? '' }))
  }

  if (content.note) slots.footnote = content.note
  if (content.proof) slots.footnote = `${content.proof.text} · Fuente: ${content.proof.source}`

  const selection = selectionSlot(manifest)

  if (selection) slots.selection = selection

  return { slots, assets: [photo.asset, layer] }
}
