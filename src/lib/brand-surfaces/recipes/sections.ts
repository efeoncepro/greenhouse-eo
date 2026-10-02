/**
 * Builders de la familia SECCIONES Y QUIÉNES SOMOS del deck (TASK-1928): `section-lens` (la sección con lente),
 * `section-bleed` (la sección con foto a sangre), `section-cine` en sus cuatro composiciones (`team`, `services`,
 * `about` y `purpose`), `content-team` (el squad real en fichas de vidrio) y `content-stack` (las herramientas en tres
 * capas sobre Efeonce, en isométrica).
 *
 * Todo lo que pintan sale de AXIS: la voz, de las reservas y tipos del manifest y del token; la lente, del motor de la
 * línea gráfica (`paintGraphicLine` con la pieza medida, la foto la inyecta quien compone: asset `painted`); el
 * escenario, la plataforma, las fichas y la isométrica, de los tokens de la receta. El CONTENIDO propio de cada lámina
 * (el equipo, las capas y sus herramientas, los pilares) llega en el intent y lo validan este builder y el contrato de
 * slots. Ninguna lámina interior con foto lleva logo (`photo-slide-no-logo`) ni velo sobre la foto (`no-scrim`).
 */

import { paintGraphicLine } from '@efeoncepro/axis-graphic-line'
import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { resolveGraphicLineIntent } from '@efeoncepro/axis-ui-contracts'

import type { SurfaceAssetRequest } from '../types'
import { SurfacePieceError } from '../types'
import { contentOf, photoOf, plateAsset, selectionSlot, voiceSlots, type SurfaceManifest } from '../shared'

import { platformSvg, type PlatformTokens } from './close'
import { progressIndicatorLayer, type RecipeBuilder } from './deck'
import { evidenceHtml } from './frame'
import { colorVar, css, fixedPx, layerAsset, measured, n, paletteColor, stageSvg, svgOpen, text, topOf, type StageTokens, type TypeToken } from './kit'

type RecipeType = TypeToken & { color?: string; insetPx?: number; tracking?: string }

const GLX = efeonceGraphicLine as unknown as {
  orbit: { ringAirRatio: number }
  pieces: { lens: Record<string, { ring: { cx: number; cy: number; r: number; strokePx: number; opacity: number }; arc: { strokePx: number }; sphereRadiusPx: number }> }
  lines: { key: string; accentOnDark: string }[]
}

/** El gris suave de la voz sobre oscuro (`slogan.leadColor.onDark`): el color del eyebrow y la pregunta si AXIS no mide otro. */
const SOFT_ON_DARK = (efeonceGraphicLine as unknown as { slogan: { leadColor: { onDark: string } } }).slogan.leadColor.onDark

const recipeType = (recipe: Record<string, unknown>, key: string): RecipeType =>
  measured((recipe.type as Record<string, RecipeType> | undefined)?.[key], `la tipografía «${key}» de la receta`)

const px = (type: RecipeType, what: string): number => fixedPx(type, what)

const tracking = (type: RecipeType, what: string): number => Number.parseFloat(measured(type.tracking, `el tracking de ${what}`))

const margin = (manifest: SurfaceManifest): number => measured(manifest.safeArea?.marginPx, 'el margen del deck')

/** La voz de una sección: eyebrow, pregunta y respuesta donde las midió AXIS, con su tipografía propia. */
const sectionVoiceFrame = (manifest: SurfaceManifest, recipe: Record<string, unknown>, prefix: string) => {
  const eyebrow = recipeType(recipe, 'eyebrow')
  const question = recipeType(recipe, 'question')
  const answer = recipeType(recipe, 'answer')

  return {
    margin: margin(manifest),
    eyebrowTop: topOf(manifest, 'eyebrow'),
    questionTop: topOf(manifest, 'question'),
    answerTop: topOf(manifest, 'answer'),
    answerPx: px(answer, 'la respuesta'),
    eyebrowPx: css(`${prefix}-eyebrow-px`, px(eyebrow, 'el eyebrow')),
    eyebrowWght: css(`${prefix}-eyebrow-wght`, measured(eyebrow.weight, 'el peso del eyebrow'), ''),
    eyebrowTracking: css(`${prefix}-eyebrow-tracking`, tracking(eyebrow, 'el eyebrow'), 'em'),
    eyebrowColor: colorVar(`${prefix}-eyebrow`, paletteColor(eyebrow.color ?? SOFT_ON_DARK, 'el eyebrow')),
    questionPx: css(`${prefix}-question-px`, px(question, 'la pregunta')),
    questionLeading: css(`${prefix}-question-leading`, measured(question.lineHeight, 'el interlineado de la pregunta'), ''),
    questionColor: colorVar(`${prefix}-question`, paletteColor(question.color ?? SOFT_ON_DARK, 'la pregunta')),
    answerLeading: css(`${prefix}-answer-leading`, measured(answer.lineHeight, 'el interlineado de la respuesta'), ''),
    answerTracking: css(`${prefix}-answer-tracking`, tracking(answer, 'la respuesta'), 'em'),
    answerInset: css(`${prefix}-answer-inset`, answer.insetPx ?? 0)
  }
}

/* ── section-lens: la sección con lente ─────────────────────────────────────────────────────────────────── */

type LensTokens = { piece: string; region: string; accentSphere?: string; arc: { startDeg: number }; inside?: { zoom: number } }

/** El marcador que el motor deja en el `href` de la foto; quien compone lo reemplaza por los bytes del plate. */
const PHOTO_MARKER = 'asset-photo:gl-section-lens'

/** La lente de la portada del deck con el arco como navegación real (desde las 12, actual/total × 360°), pintada por AXIS. */
const lensSvg = (manifest: SurfaceManifest, line: string, lens: LensTokens, progress: { sections: number; current: number }, alt: string): string => {
  const { width, height } = manifest.canvas
  const piece = measured(GLX.pieces.lens[lens.piece], `la pieza de lente «${lens.piece}»`)

  const resolved = resolveGraphicLineIntent({
    canvas: { width, height, line: line as never, surface: 'dark', channel: 'deck' },
    elements: [{ kind: 'lens', id: 'lens', photoId: 'ph', alt, region: lens.region as never, ...(lens.accentSphere ? { accentSphere: lens.accentSphere as never } : {}) }]
  } as never) as unknown as { elements: Record<string, Record<string, unknown>>[]; issues?: { code: string }[] }

  if (resolved.issues && resolved.issues.length > 0) {
    throw new SurfacePieceError(`El contrato de la órbita rechazó la lente: ${resolved.issues.map(issue => issue.code).join(', ')}.`, 'surface-issues', resolved.issues)
  }

  const element = measured(resolved.elements[0], 'la lente')

  element.ring = { ...element.ring, strokePx: piece.ring.strokePx, opacity: piece.ring.opacity }
  element.arc = { ...element.arc, strokePx: piece.arc.strokePx, startDeg: lens.arc.startDeg, sweepDeg: (progress.current / progress.sections) * 360 }
  element.sphere = { ...element.sphere, radiusPx: piece.sphereRadiusPx }
  if (element.inside && lens.inside) element.inside = { ...element.inside, zoom: lens.inside.zoom }

  return paintGraphicLine(resolved as never, {
    photos: { ph: PHOTO_MARKER },
    background: true,
    idPrefix: 'sl',
    circles: { lens: { cx: piece.ring.cx, cy: piece.ring.cy, r: piece.ring.r / (1 + GLX.orbit.ringAirRatio) } }
  }).svg
}

export const sectionLens: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const { width, height } = manifest.canvas
  const voice = voiceSlots(manifest)
  const progress = measured(contentOf(manifest).progress, 'el progreso de la sección (`progress`)')
  const photo = photoOf(manifest)
  const plate = text(photo?.plateRef, 'La foto de la lente (`photo.plateRef`)')
  const alt = text(photo?.alt, 'El texto alternativo de la foto (`photo.alt`)')

  if (voice.answerLead) throw new SurfacePieceError('La respuesta de la sección va en una línea.', 'invalid-intent')

  const ref = `asset-ref:layer:section-lens-${intent.line}-${progress.current}-of-${progress.sections}`
  const svg = lensSvg(manifest, intent.line, measured(recipe.lens as LensTokens | undefined, 'la lente de la receta'), progress, alt)
  const asset: SurfaceAssetRequest = { ref, kind: 'painted', svg, photo: { marker: PHOTO_MARKER, path: plate, fit: { width, height } } }

  return {
    slots: { frame: { line: intent.line, ...sectionVoiceFrame(manifest, recipe, 'sec') }, lens: { src: ref, alt }, voice },
    assets: [asset]
  }
}

/* ── section-bleed: la sección con foto a sangre ────────────────────────────────────────────────────────── */

export const sectionBleed: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const { width, height } = manifest.canvas
  const voice = voiceSlots(manifest)
  const progressToken = measured(recipe.progress as { indicator?: { cxOfWidth: number; cyOfHeight: number }; ringOpacity?: number } | undefined, 'el indicador de la sección')
  const at = measured(progressToken.indicator, 'la posición del indicador')

  if (voice.answerLead) throw new SurfacePieceError('La respuesta de la sección va en una línea.', 'invalid-intent')

  const photo = plateAsset(manifest, { width, height })

  const indicator = progressIndicatorLayer(manifest, intent.line, 'content', 'gl-sb', {
    ringOpacity: measured(progressToken.ringOpacity, 'la opacidad del anillo del indicador'),
    center: { cx: Math.round(at.cxOfWidth * width), cy: Math.round(at.cyOfHeight * height) }
  })

  return {
    slots: {
      frame: { line: intent.line, ...sectionVoiceFrame(manifest, recipe, 'sec') },
      photo: { src: photo.ref, alt: photo.alt },
      indicator: { src: indicator.ref },
      voice
    },
    assets: [photo.asset, indicator.asset]
  }
}

/* ── section-cine: la sección de cine en sus cuatro composiciones ───────────────────────────────────────── */

type PillarIntent = { label?: unknown; text?: unknown }

export const sectionCine: RecipeBuilder = ({ intent, manifest, recipe: base }) => {
  const { width, height } = manifest.canvas
  const layout = manifest.layout ?? 'team'
  // El token de la composición manda sobre el de la receta (como lo mezcla el contrato de AXIS).
  const own = ((base.layouts as Record<string, Record<string, unknown>> | undefined)?.[layout] ?? {}) as Record<string, unknown>
  const recipe: Record<string, unknown> = { ...base, ...own, selection: { ...((base.selection as object | undefined) ?? {}), ...((own.selection as object | undefined) ?? {}) } }
  const voice = voiceSlots(manifest)
  const photo = plateAsset(manifest, { width, height })
  const frame: Record<string, unknown> = { line: intent.line, ...sectionVoiceFrame(manifest, recipe, 'sec') }
  const slots: Record<string, unknown> = { frame, photo: { src: photo.ref, alt: photo.alt }, voice }
  const question = recipeType(recipe, 'question')

  if (layout === 'team' || layout === 'services') {
    frame.questionWidth = css('sc-question-width', measured(question.maxWidthPx, 'el ancho de la pregunta'))

    // La bajada OPCIONAL del equipo (TASK-1949, deck SEO/AEO: «Lo ejecutan expertos multidisciplinarios…»), al pie de la
    // columna; su lugar y su cuerpo los fija la plantilla (`.gl-sec-cine`) con los valores que AXIS publica para `team`
    // (reserva 900/1080, cuerpo 22/300, 540 px). Sin `body` la lámina es la de siempre.
    const teamBody = contentOf(manifest).body

    if (layout === 'team' && teamBody) slots.body = evidenceHtml(teamBody, 'none')

    if (layout === 'services') {
      if (voice.answerLead) throw new SurfacePieceError('La respuesta de servicios va en una línea.', 'invalid-intent')

      // El cursor propio del lector sobre la respuesta, con ocho manijas (lo pinta el hook del CTA del catálogo).
      const selection = measured(recipe.selection as { collaboratorScale?: number } | undefined, 'la selección de servicios')

      slots.cta = { variant: 'eight-handles', cursorScale: measured(selection.collaboratorScale, 'la escala del cursor') }
    }

    return { slots, assets: [photo.asset], ...(layout === 'services' ? { contentType: 'deck.section-cine.services' } : {}) }
  }

  const content = contentOf(manifest)
  const body = recipeType(recipe, 'body')

  if (!content.body) throw new SurfacePieceError('Esta sección lleva su bajada (`body`).', 'invalid-intent')

  frame.bodyTop = topOf(manifest, 'body')
  frame.bodyPx = px(body, 'la bajada')
  frame.bodyWidth = measured(body.maxWidthPx, 'el ancho de la bajada')
  frame.bodyLeading = css('sc-body-leading', measured(body.lineHeight, 'el interlineado de la bajada'), '')
  slots.body = evidenceHtml(content.body, 'none')

  if (layout === 'about') {
    const figures = content.figures ?? []
    const max = measured((recipe.figures as { max?: number } | undefined)?.max, 'las cifras de quiénes somos')

    if (figures.length !== max) throw new SurfacePieceError(`Quiénes somos lleva ${max} cifras con su fuente (\`figures\`).`, 'invalid-intent')

    const figure = recipeType(recipe, 'figure')
    const label = recipeType(recipe, 'figureLabel')
    const divider = measured((recipe.type as Record<string, { strokePx?: number; opacity?: number }>).divider, 'el filete entre cifras')
    const source = recipeType(recipe, 'source')

    Object.assign(frame, {
      figuresTop: css('sc-figures-top', topOf(manifest, 'figures')),
      figurePx: css('sc-figure-px', px(figure, 'la cifra')),
      figureTracking: css('sc-figure-tracking', tracking(figure, 'la cifra'), 'em'),
      figureGap: css('sc-figure-gap', measured(figure.gapPx, 'el aire entre cifras')),
      labelPx: css('sc-label-px', px(label, 'el rótulo de la cifra')),
      labelGap: css('sc-label-gap', measured(label.gapPx, 'el aire del rótulo')),
      dividerStroke: css('sc-divider', measured(divider.strokePx, 'el trazo del filete')),
      dividerOpacity: css('sc-divider-opacity', measured(divider.opacity, 'la opacidad del filete') * 100, '%'),
      sourceTop: css('sc-source-top', topOf(manifest, 'source')),
      sourcePx: css('sc-source-px', px(source, 'la fuente'))
    })

    slots.figures = figures.map(item => ({ value: item.value, label: item.label }))
    slots.source = `Fuente: ${[...new Set(figures.map(item => item.source.trim()))].join(' · ')}`

    return { slots, assets: [photo.asset], contentType: 'deck.section-cine.about' }
  }

  if (layout !== 'purpose') throw new SurfacePieceError(`\`section-cine\` no tiene plantilla para la composición «${layout}».`, 'recipe-without-template')

  const row = measured((recipe.type as Record<string, { paddingYPx?: number; gapPx?: number; strokePx?: number; opacity?: number; widthPx?: number; count?: number }>).pillarRow, 'las filas de los pilares')
  const pillars = (Array.isArray(intent.pillars) ? intent.pillars : []) as PillarIntent[]

  if (pillars.length !== row.count) throw new SurfacePieceError(`Por qué lo hacemos lleva ${row.count} pilares (\`pillars\`).`, 'invalid-intent')

  const label = recipeType(recipe, 'pillarLabel')
  const pillarText = recipeType(recipe, 'pillarText')

  Object.assign(frame, {
    bodyColor: colorVar('sc-body', paletteColor(body.color ?? 'white', 'la bajada')),
    pillarsTop: css('sc-pillars-top', topOf(manifest, 'pillars')),
    pillarsWidth: css('sc-pillars-width', measured(row.widthPx, 'el ancho de los pilares')),
    pillarPadY: css('sc-pillar-pad-y', measured(row.paddingYPx, 'el aire de los pilares')),
    pillarGap: css('sc-pillar-gap', measured(row.gapPx, 'el canal de los pilares')),
    pillarStroke: css('sc-pillar-rule', measured(row.strokePx, 'el filete de los pilares')),
    pillarRuleOpacity: css('sc-pillar-rule-opacity', measured(row.opacity, 'la opacidad del filete') * 100, '%'),
    pillarLabelPx: css('sc-pillar-label-px', px(label, 'el rótulo del pilar')),
    pillarLabelWidth: css('sc-pillar-label-width', measured(label.maxWidthPx, 'el ancho del rótulo')),
    pillarTextPx: css('sc-pillar-text-px', px(pillarText, 'el pilar'))
  })

  slots.pillars = pillars.map((pillar, i) => ({ label: text(pillar.label, `El rótulo del pilar ${i + 1}`), text: text(pillar.text, `El pilar ${i + 1}`) }))

  return { slots, assets: [photo.asset], contentType: 'deck.section-cine.purpose' }
}

/* ── la voz «viva» (equipo y día a día) ─────────────────────────────────────────────────────────────────── */

/**
 * La voz de las láminas «vivas»: la pregunta cabe en una línea o baja a dos (≥ `questionWrapChars` caracteres, la
 * misma regla con que se aprobaron), y entonces la respuesta y la bajada bajan `twoLineShiftPx`.
 */
export const liveVoiceFrame = (manifest: SurfaceManifest, recipe: Record<string, unknown>, question: string, prefix: string) => {
  const shift = measured(recipe.twoLineShiftPx as number | undefined, 'el corrimiento de la voz en dos líneas')
  const wrap = measured(recipe.questionWrapChars as number | undefined, 'desde cuántos caracteres baja la pregunta')
  const twoLines = [...question].length > wrap
  const q = recipeType(recipe, 'question')
  const answer = recipeType(recipe, 'answer')
  const body = recipeType(recipe, 'body')
  const answerShadow = measured(recipe.answerShadow as { yPx: number; blurPx: number; opacity: number } | undefined, 'la sombra de la respuesta')
  const down = twoLines ? shift : 0

  return {
    margin: margin(manifest),
    eyebrowTop: topOf(manifest, 'eyebrow'),
    questionTop: topOf(manifest, 'question'),
    answerTop: topOf(manifest, 'answer') + down,
    answerPx: px(answer, 'la respuesta'),
    bodyTop: topOf(manifest, 'body') + down,
    bodyPx: px(body, 'la bajada'),
    bodyWidth: measured(body.maxWidthPx, 'el ancho de la bajada'),
    questionWidth: css(`${prefix}-question-width`, measured(q.maxWidthPx, 'el ancho de la pregunta')),
    answerLeading: css(`${prefix}-answer-leading`, measured(answer.lineHeight, 'el interlineado de la respuesta'), ''),
    answerTracking: css(`${prefix}-answer-tracking`, tracking(answer, 'la respuesta'), 'em'),
    answerInset: css(`${prefix}-answer-inset`, answer.insetPx ?? 0),
    answerShadowY: css(`${prefix}-answer-shadow-y`, answerShadow.yPx),
    answerShadowBlur: css(`${prefix}-answer-shadow-blur`, answerShadow.blurPx),
    answerShadowOpacity: css(`${prefix}-answer-shadow-opacity`, answerShadow.opacity * 100, '%')
  }
}

/* ── content-team: el squad real en fichas de vidrio ────────────────────────────────────────────────────── */

type CardItem = { cxPx: number; topPx: number; widthPx: number; rotateYDeg: number; z: number; lead?: boolean }

type TeamCards = {
  perspectivePx: number
  originPx: [number, number]
  photoRatio: number
  items: CardItem[]
  fill: [string, string]
  radiusPx: { lead: number; rest: number }
  border: { lead: { px: number; color: string; opacity: number }; rest: { px: number; color: string; opacity: number } }
  shadow: { yPx: number; blurPx: number; color: string; opacity: number }
  glow: { lead: { blurPx: number; opacity: number }; rest: { blurPx: number; opacity: number } }
  padding: { lead: number[]; rest: number[] }
  name: { leadPx: number; px: number }
  role: { leadPx: number; px: number; gapPx: number; color: string }
  reflection: { gapPx: number; fromStop: number; opacity: number }
}

type MemberIntent = { photo?: { path?: unknown; alt?: unknown }; name?: unknown; role?: unknown }

export const contentTeam: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const cards = measured(recipe.cards as TeamCards | undefined, 'las fichas del equipo')
  const center = measured(recipe.center as { leftPx: number; topPx: number; widthPx: number; glow: { blurPx: number; opacity: number } } | undefined, 'el centro de la plataforma')
  const voice = voiceSlots(manifest)
  const content = contentOf(manifest)
  const team = (Array.isArray(intent.team) ? intent.team : []) as MemberIntent[]
  const lead = cards.items.findIndex(card => card.lead)

  if (!content.body) throw new SurfacePieceError('El equipo lleva su bajada (`body`).', 'invalid-intent')
  if (team.length !== cards.items.length) throw new SurfacePieceError(`El equipo va en ${cards.items.length} fichas (\`team\`).`, 'invalid-intent')

  const centerText = (intent.center ?? {}) as { title?: unknown; note?: unknown }
  const stage = layerAsset('content-team-stage', stageSvg(manifest, measured(recipe.stage as StageTokens | undefined, 'el escenario'), 'tm'))
  const platform = layerAsset('content-team-platform', platformSvg(manifest, measured(recipe.platform as PlatformTokens | undefined, 'la plataforma'), 'tm'))
  const centerType = recipeType(recipe, 'center')
  const centerNote = recipeType(recipe, 'centerNote')
  const assets: SurfaceAssetRequest[] = [stage.asset, platform.asset]

  const members = team.map((member, i) => {
    const card = cards.items[i]!
    const file = text(member.photo?.path, `La foto de la persona ${i + 1} (\`team[${i}].photo.path\`)`)
    const alt = text(member.photo?.alt, `El texto alternativo de la persona ${i + 1}`)
    const ref = `asset-ref:file:${file.split('/').pop()!.replace(/\.[a-z0-9]+$/i, '')}`

    assets.push({ ref, kind: 'file', path: file })

    return {
      role: card.lead ? 'lead' : 'rest',
      left: css('tm-left', card.cxPx - card.widthPx / 2),
      top: css('tm-top', card.topPx),
      width: css('tm-width', card.widthPx),
      photoHeight: css('tm-photo-height', Math.round(card.widthPx * cards.photoRatio)),
      rotate: css('tm-rotate', card.rotateYDeg, 'deg'),
      z: css('tm-z', card.z, ''),
      src: ref,
      alt,
      name: text(member.name, `El nombre de la persona ${i + 1}`),
      title: text(member.role, `El rol de la persona ${i + 1}`)
    }
  })

  const selection = selectionSlot(manifest)

  return {
    slots: {
      frame: {
        line: intent.line,
        ...liveVoiceFrame(manifest, recipe, voice.question ?? '', 'tm'),
        perspective: css('tm-perspective', cards.perspectivePx),
        originX: css('tm-origin-x', cards.originPx[0]),
        originY: css('tm-origin-y', cards.originPx[1]),
        fillFrom: colorVar('tm-fill-from', paletteColor(cards.fill[0], 'las fichas')),
        fillTo: colorVar('tm-fill-to', paletteColor(cards.fill[1], 'las fichas')),
        leadRadius: css('tm-lead-radius', cards.radiusPx.lead),
        restRadius: css('tm-rest-radius', cards.radiusPx.rest),
        leadBorder: css('tm-lead-border', cards.border.lead.px),
        leadBorderColor: colorVar('tm-lead-border', paletteColor(cards.border.lead.color, 'el filete de la ficha')),
        leadBorderOpacity: css('tm-lead-border-opacity', cards.border.lead.opacity * 100, '%'),
        restBorder: css('tm-rest-border', cards.border.rest.px),
        restBorderColor: colorVar('tm-rest-border', paletteColor(cards.border.rest.color, 'el filete de la ficha')),
        restBorderOpacity: css('tm-rest-border-opacity', cards.border.rest.opacity * 100, '%'),
        shadowY: css('tm-shadow-y', cards.shadow.yPx),
        shadowBlur: css('tm-shadow-blur', cards.shadow.blurPx),
        shadowColor: colorVar('tm-shadow', paletteColor(cards.shadow.color, 'la sombra')),
        shadowOpacity: css('tm-shadow-opacity', cards.shadow.opacity * 100, '%'),
        haloColor: colorVar('tm-halo', paletteColor('halo', 'el halo')),
        leadGlowBlur: css('tm-lead-glow-blur', cards.glow.lead.blurPx),
        leadGlowOpacity: css('tm-lead-glow-opacity', cards.glow.lead.opacity * 100, '%'),
        restGlowBlur: css('tm-rest-glow-blur', cards.glow.rest.blurPx),
        restGlowOpacity: css('tm-rest-glow-opacity', cards.glow.rest.opacity * 100, '%'),
        leadPadTop: css('tm-lead-pad-top', cards.padding.lead[0]!),
        leadPadX: css('tm-lead-pad-x', cards.padding.lead[1]!),
        leadPadBottom: css('tm-lead-pad-bottom', cards.padding.lead[2]!),
        restPadTop: css('tm-rest-pad-top', cards.padding.rest[0]!),
        restPadX: css('tm-rest-pad-x', cards.padding.rest[1]!),
        restPadBottom: css('tm-rest-pad-bottom', cards.padding.rest[2]!),
        leadNamePx: css('tm-lead-name-px', cards.name.leadPx),
        restNamePx: css('tm-rest-name-px', cards.name.px),
        leadRolePx: css('tm-lead-role-px', cards.role.leadPx),
        restRolePx: css('tm-rest-role-px', cards.role.px),
        roleGap: css('tm-role-gap', cards.role.gapPx),
        roleColor: colorVar('tm-role', paletteColor(cards.role.color, 'el rol')),
        reflectGap: css('tm-reflect-gap', cards.reflection.gapPx),
        reflectFrom: css('tm-reflect-from', cards.reflection.fromStop * 100, '%'),
        reflectOpacity: css('tm-reflect-opacity', cards.reflection.opacity * 100, '%'),
        centerLeft: css('tm-center-left', center.leftPx),
        centerTop: css('tm-center-top', center.topPx),
        centerWidth: css('tm-center-width', center.widthPx),
        centerPx: css('tm-center-px', px(centerType, 'el centro')),
        centerTracking: css('tm-center-tracking', tracking(centerType, 'el centro'), 'em'),
        centerGlowBlur: css('tm-center-glow-blur', center.glow.blurPx),
        centerGlowOpacity: css('tm-center-glow-opacity', center.glow.opacity * 100, '%'),
        centerNotePx: css('tm-center-note-px', px(centerNote, 'la nota del centro')),
        centerNoteGap: css('tm-center-note-gap', measured(centerNote.gapPx, 'el aire de la nota'))
      },
      stage: { src: stage.ref },
      platform: { src: platform.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      team: members,
      center: { title: text(centerText.title, 'El centro de la plataforma (`center.title`)'), note: text(centerText.note, 'La nota del centro (`center.note`)') },
      ...(selection ? { selection: { ...selection, item: lead + 1 } } : {})
    },
    assets
  }
}

/* ── content-stack: las herramientas en tres capas sobre Efeonce ────────────────────────────────────────── */

type Rgba = { color: string; opacity: number }

type StackTokens = {
  iso: { unitPx: number; cxPx: number; cyPx: number; angleDeg: number }
  layers: { count: number; heightsPx: number[]; thicknessPx: number; u: [number, number]; v: [number, number]; columns: number; top: Rgba; side: Rgba; stroke: Rgba & { px: number }; accentLayer: number }
  base: { u: [number, number]; v: [number, number]; thicknessPx: number; fill: [string, string, string]; side: string; stroke: Rgba & { px: number } }
  floor: { rxPx: number; ryPx: number; stops: { at: number; color: string; opacity: number }[] }
  halo: { offsetYPx: number; rPx: number; stops: { at: number; color: string; opacity: number }[] }
  orbit: {
    radiusUnits: number
    dropPx: number
    back: { fromTurn: number; toTurn: number; opacity: number; strokePx: number }
    front: { fromTurn: number; toTurn: number; opacity: number; strokePx: number }
    arc: { fromTurn: number; toTurn: number; strokePx: number; glow: { strokePx: number; opacity: number; blurPx: number } }
  }
  tiles: {
    sizePx: number
    iconPx: number
    radiusPx: number
    liftPx: number
    light: { fill: [string, string, string]; midAt: number; edge: Rgba }
    dark: { fade: string; midAt: number; edge: Rgba }
    shadow: { yPx: number; blurPx: number; color: string; opacity: number }
    glow: { blurPx: number; opacity: number }
    native: Record<string, string>
  }
  labels: { widthPx: number; offsetXPx: number; offsetYPx: number; dropPx: number; guide: { lengthPx: number; gapPx: number; raisePx: number; strokePx: number; color: string } }
  baseLabel: { widthPx: number; offsetXPx: number; offsetYPx: number; logoWidthPx: number; logoGapPx: number; guide: { lengthPx: number; gapPx: number; dropPx: number; opacity: number; strokePx: number }; glow: { blurPx: number; opacity: number } }
}

type ToolIntent = { path?: unknown; name?: unknown }
type LayerIntent = { name?: unknown; note?: unknown; tools?: ToolIntent[] }

/** Las piezas geométricas de la isométrica: un punto (u, v) del plano a la altura h, en px del lienzo. */
const isoOf = (tokens: StackTokens) => {
  const { unitPx: u, cxPx: cx, cyPx: cy, angleDeg } = tokens.iso
  const cos = Math.cos((angleDeg * Math.PI) / 180)
  const sin = Math.sin((angleDeg * Math.PI) / 180)

  return (a: number, b: number, h = 0): [number, number] => [cx + (a - b) * cos * u, cy + (a + b) * sin * u - h]
}

const pts = (points: [number, number][]) => points.map(([x, y]) => `${n(x)},${n(y)}`).join(' ')

export const contentStack: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const tokens = recipe as unknown as StackTokens
  const { width, height } = manifest.canvas
  const iso = isoOf(tokens)
  const voice = voiceSlots(manifest)
  const content = contentOf(manifest)
  const layers = (Array.isArray(intent.layers) ? intent.layers : []) as LayerIntent[]
  const accent = measured(GLX.lines.find(entry => entry.key === intent.line)?.accentOnDark, `el acento de la línea «${intent.line}»`)

  if (!content.body) throw new SurfacePieceError('El stack lleva su bajada (`body`).', 'invalid-intent')
  if (layers.length !== tokens.layers.count) throw new SurfacePieceError(`El stack va en ${tokens.layers.count} capas, de abajo hacia arriba (\`layers\`).`, 'invalid-intent')

  const halo = paletteColor('halo', 'el halo')
  const stop = (s: { at: number; color: string; opacity: number }) => `<stop offset="${n(s.at)}" stop-color="${paletteColor(s.color, 'el stack')}" stop-opacity="${n(s.opacity)}"/>`

  /** Una losa isométrica: sus dos caras visibles y la tapa con su filete. */
  const slab = (u0: number, v0: number, u1: number, v1: number, h: number, th: number, top: string, topOpacity: number, side: string, sideOpacity: number, stroke: Rgba & { px: number }) => {
    const A = iso(u0, v0, h)
    const B = iso(u1, v0, h)
    const C = iso(u1, v1, h)
    const D = iso(u0, v1, h)
    const B2 = iso(u1, v0, h - th)
    const C2 = iso(u1, v1, h - th)
    const D2 = iso(u0, v1, h - th)

    return (
      `<polygon points="${pts([D, C, C2, D2])}" fill="${side}" fill-opacity="${n(sideOpacity * 0.95)}"/>` +
      `<polygon points="${pts([C, B, B2, C2])}" fill="${side}" fill-opacity="${n(sideOpacity * 0.75)}"/>` +
      `<polygon points="${pts([A, B, C, D])}" fill="${top}" fill-opacity="${n(topOpacity)}" stroke="${paletteColor(stroke.color, 'el filete de la capa')}" stroke-opacity="${n(stroke.opacity)}" stroke-width="${n(stroke.px)}"/>`
    )
  }

  // La órbita alrededor del centro de las capas, un poco bajo la base.
  const [uc, vc] = [(tokens.layers.u[0] + tokens.layers.u[1]) / 2, (tokens.layers.v[0] + tokens.layers.v[1]) / 2]

  const orbitPath = (fromTurn: number, toTurn: number, steps = 120) =>
    Array.from({ length: steps + 1 }, (_, k) => {
      const t = 2 * Math.PI * (fromTurn + ((toTurn - fromTurn) * k) / steps)
      const [x, y] = iso(uc + tokens.orbit.radiusUnits * Math.cos(t), vc + tokens.orbit.radiusUnits * Math.sin(t), -tokens.orbit.dropPx)

      return `${k ? 'L' : 'M'}${n(x)} ${n(y)}`
    }).join(' ')

  const [floorX, floorY] = iso(uc, vc, 0)

  let back =
    svgOpen(manifest) +
    '<defs>' +
    `<radialGradient id="stk-halo" cx="${n(tokens.iso.cxPx)}" cy="${n(tokens.iso.cyPx + tokens.halo.offsetYPx)}" r="${n(tokens.halo.rPx)}" gradientUnits="userSpaceOnUse">${tokens.halo.stops.map(stop).join('')}</radialGradient>` +
    `<radialGradient id="stk-floor">${tokens.floor.stops.map(stop).join('')}</radialGradient>` +
    `<linearGradient id="stk-base" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${paletteColor(tokens.base.fill[0], 'la base')}"/><stop offset="0.55" stop-color="${paletteColor(tokens.base.fill[1], 'la base')}"/><stop offset="1" stop-color="${paletteColor(tokens.base.fill[2], 'la base')}"/></linearGradient>` +
    '</defs>' +
    `<rect width="${width}" height="${height}" fill="url(#stk-halo)"/>` +
    `<path d="${orbitPath(tokens.orbit.back.fromTurn, tokens.orbit.back.toTurn)}" fill="none" stroke="${halo}" stroke-opacity="${n(tokens.orbit.back.opacity)}" stroke-width="${n(tokens.orbit.back.strokePx)}"/>` +
    `<ellipse cx="${n(floorX)}" cy="${n(floorY)}" rx="${n(tokens.floor.rxPx)}" ry="${n(tokens.floor.ryPx)}" fill="url(#stk-floor)"/>` +
    slab(tokens.base.u[0], tokens.base.v[0], tokens.base.u[1], tokens.base.v[1], 0, tokens.base.thicknessPx, 'url(#stk-base)', 1, paletteColor(tokens.base.side, 'la base'), 1, tokens.base.stroke)

  const tiles: Record<string, unknown>[] = []
  const labels: Record<string, unknown>[] = []
  const assets: SurfaceAssetRequest[] = []
  const guide = tokens.labels.guide
  const rule = paletteColor(guide.color, 'la guía de la capa')
  let total = 0

  layers.forEach((layer, li) => {
    const h = tokens.layers.heightsPx[li]!
    const tools = Array.isArray(layer.tools) ? layer.tools : []
    const name = text(layer.name, `El nombre de la capa ${li + 1}`)
    const note = text(layer.note, `Qué hace la capa ${li + 1}`)

    if (tools.length < 1 || tools.length > tokens.layers.columns * 2) throw new SurfacePieceError(`La capa «${name}» lleva de 1 a ${tokens.layers.columns * 2} herramientas.`, 'invalid-intent')

    back += slab(tokens.layers.u[0], tokens.layers.v[0], tokens.layers.u[1], tokens.layers.v[1], h, tokens.layers.thicknessPx, paletteColor(tokens.layers.top.color, 'la capa'), tokens.layers.top.opacity, paletteColor(tokens.layers.side.color, 'la capa'), tokens.layers.side.opacity, tokens.layers.stroke)

    const rows = Math.ceil(tools.length / tokens.layers.columns)

    const cells = tools
      .map((tool, k) => ({ tool, u: (k % tokens.layers.columns) + 0.5, v: rows === 1 ? 1 : k < tokens.layers.columns ? 0.5 : 1.5 }))
      .sort((a, b) => a.u + a.v - (b.u + b.v))

    for (const { tool, u, v } of cells) {
      const file = text(tool.path, `El isotipo de una herramienta de «${name}» (\`path\`)`)
      const alt = text(tool.name, `El nombre de una herramienta de «${name}»`)
      const id = file.split('/').pop()!.replace(/\.[a-z0-9]+$/i, '')
      const ref = `asset-ref:file:${id}`
      const [x, y] = iso(u, v, h)
      const native = tokens.tiles.native[id]
      const t = tokens.tiles

      assets.push({ ref, kind: 'file', path: file })
      tiles.push({
        left: css('stk-left', x - t.sizePx / 2),
        top: css('stk-top', y - t.sizePx - t.liftPx),
        z: css('stk-z', 10 + li * 20 + Math.round((u + v) * 2), ''),
        fillFrom: colorVar('stk-fill-from', paletteColor(native ?? t.light.fill[0], 'la ficha')),
        fillMid: colorVar('stk-fill-mid', paletteColor(native ?? t.light.fill[1], 'la ficha')),
        fillTo: colorVar('stk-fill-to', paletteColor(native ? t.dark.fade : t.light.fill[2], 'la ficha')),
        fillMidAt: css('stk-fill-mid-at', (native ? t.dark.midAt : t.light.midAt) * 100, '%'),
        edgeOpacity: css('stk-edge-opacity', (native ? t.dark.edge.opacity : t.light.edge.opacity) * 100, '%'),
        src: ref,
        alt
      })
      total++
    }

    const [lx, ly] = iso(tokens.layers.u[0], tokens.layers.v[1], h - tokens.labels.dropPx)

    back += `<line x1="${n(lx - guide.gapPx - guide.lengthPx)}" y1="${n(ly - guide.raisePx)}" x2="${n(lx - guide.gapPx)}" y2="${n(ly - guide.raisePx)}" stroke="${rule}" stroke-width="${n(guide.strokePx)}"/>`
    labels.push({
      left: css('stk-label-left', lx - tokens.labels.offsetXPx),
      top: css('stk-label-top', ly - tokens.labels.offsetYPx),
      tone: li === tokens.layers.accentLayer ? 'lead' : 'rest',
      name,
      note: `${tools.length} herramientas · ${note}`
    })
  })

  back += '</svg>'

  const [gx, gy] = iso(tokens.base.u[0], tokens.base.v[1], 0)
  const bl = tokens.baseLabel
  const glow = tokens.orbit.arc.glow

  const front =
    svgOpen(manifest) +
    `<defs><filter id="stk-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${n(glow.blurPx)}"/></filter></defs>` +
    `<path d="${orbitPath(tokens.orbit.front.fromTurn, tokens.orbit.front.toTurn)}" fill="none" stroke="${halo}" stroke-opacity="${n(tokens.orbit.front.opacity)}" stroke-width="${n(tokens.orbit.front.strokePx)}"/>` +
    `<path d="${orbitPath(tokens.orbit.arc.fromTurn, tokens.orbit.arc.toTurn)}" fill="none" stroke="${accent}" stroke-width="${n(glow.strokePx)}" stroke-linecap="round" filter="url(#stk-glow)" opacity="${n(glow.opacity)}"/>` +
    `<path d="${orbitPath(tokens.orbit.arc.fromTurn, tokens.orbit.arc.toTurn)}" fill="none" stroke="${accent}" stroke-width="${n(tokens.orbit.arc.strokePx)}" stroke-linecap="round"/>` +
    `<line x1="${n(gx - bl.guide.gapPx - bl.guide.lengthPx)}" y1="${n(gy + bl.guide.dropPx)}" x2="${n(gx - bl.guide.gapPx)}" y2="${n(gy + bl.guide.dropPx)}" stroke="${halo}" stroke-opacity="${n(bl.guide.opacity)}" stroke-width="${n(bl.guide.strokePx)}"/>` +
    '</svg>'

  const backLayer = layerAsset(`content-stack-back-${intent.line}`, back)
  const frontLayer = layerAsset(`content-stack-front-${intent.line}`, front)
  const base = (intent.base ?? {}) as { lead?: unknown; note?: unknown }
  const t = tokens.tiles
  const answer = recipeType(recipe, 'answer')
  const body = recipeType(recipe, 'body')

  // La bajada nombra cuántas herramientas hay: se escribe con el conteo real, nunca con uno a mano.
  const bodyText = content.body.replace('{count}', `**${total}**`)

  if (bodyText === content.body) throw new SurfacePieceError('La bajada del stack cita el conteo con `{count}` (se escribe con el número real).', 'invalid-intent')

  return {
    slots: {
      frame: {
        line: intent.line,
        margin: margin(manifest),
        eyebrowTop: topOf(manifest, 'eyebrow'),
        questionTop: topOf(manifest, 'question'),
        answerTop: topOf(manifest, 'answer'),
        answerPx: px(answer, 'la respuesta'),
        bodyTop: topOf(manifest, 'body'),
        bodyPx: px(body, 'la bajada'),
        bodyWidth: measured(body.maxWidthPx, 'el ancho de la bajada'),
        answerLeading: css('stk-answer-leading', measured(answer.lineHeight, 'el interlineado de la respuesta'), ''),
        answerTracking: css('stk-answer-tracking', tracking(answer, 'la respuesta'), 'em'),
        tileSize: css('stk-tile', t.sizePx),
        iconSize: css('stk-icon', t.iconPx),
        tileRadius: css('stk-tile-radius', t.radiusPx),
        tileShadowY: css('stk-tile-shadow-y', t.shadow.yPx),
        tileShadowBlur: css('stk-tile-shadow-blur', t.shadow.blurPx),
        tileShadowColor: colorVar('stk-tile-shadow', paletteColor(t.shadow.color, 'la sombra de la ficha')),
        tileShadowOpacity: css('stk-tile-shadow-opacity', t.shadow.opacity * 100, '%'),
        tileGlowBlur: css('stk-tile-glow-blur', t.glow.blurPx),
        tileGlowOpacity: css('stk-tile-glow-opacity', t.glow.opacity * 100, '%'),
        haloColor: colorVar('stk-halo', halo),
        labelWidth: css('stk-label-width', tokens.labels.widthPx),
        labelPx: css('stk-label-px', px(recipeType(recipe, 'layerName'), 'la capa')),
        labelNotePx: css('stk-label-note-px', px(recipeType(recipe, 'layerNote'), 'la nota de la capa')),
        baseLeft: css('stk-base-left', gx - bl.offsetXPx),
        baseTop: css('stk-base-top', gy - bl.offsetYPx),
        baseWidth: css('stk-base-width', bl.widthPx),
        baseLogo: css('stk-base-logo', bl.logoWidthPx),
        baseLogoGap: css('stk-base-logo-gap', bl.logoGapPx),
        baseGlowBlur: css('stk-base-glow-blur', bl.glow.blurPx),
        baseGlowOpacity: css('stk-base-glow-opacity', bl.glow.opacity * 100, '%'),
        baseLeadPx: css('stk-base-lead-px', px(recipeType(recipe, 'baseLead'), 'la base')),
        baseNotePx: css('stk-base-note-px', px(recipeType(recipe, 'baseNote'), 'la nota de la base'))
      },
      back: { src: backLayer.ref },
      front: { src: frontLayer.ref },
      voice,
      body: evidenceHtml(bodyText, 'none'),
      tiles,
      labels,
      base: { lead: text(base.lead, 'La base del stack (`base.lead`)'), note: text(base.note, 'La nota de la base (`base.note`)') }
    },
    assets: [backLayer.asset, frontLayer.asset, ...assets]
  }
}

export const SECTION_BUILDERS: Record<string, RecipeBuilder> = {
  'section-lens': sectionLens,
  'section-bleed': sectionBleed,
  'section-cine': sectionCine,
  'content-team': contentTeam,
  'content-stack': contentStack
}
