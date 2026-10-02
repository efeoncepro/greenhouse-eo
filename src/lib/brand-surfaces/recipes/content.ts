/**
 * Builders de la familia CONTENIDO Y DÍA A DÍA del deck (TASK-1928): `contact-sheet` (la hoja de contactos),
 * `content-text` (la respuesta es la lámina), `content-bullets` (cuatro puntos numerados), `content-day` en sus cuatro
 * composiciones (`clock`, el reloj del día; `tools`, `live-progress` y `live-results`, las láminas «vivas») y
 * `decision-agenda` (los cinco temas).
 *
 * Todo lo que pintan sale de AXIS: la voz, de las reservas y tipos del manifest y del token; la hoja, el reloj, el
 * escenario, la plataforma, el vidrio y las interfaces genéricas, de los tokens de la receta (las piezas «vivas» son
 * las de la cotización). El CONTENIDO de cada lámina (las tomas, los puntos, los momentos del día, las herramientas, el
 * plan, la revisión y el reporte) llega en el intent y lo validan este builder y el contrato de slots. Las interfaces
 * son genéricas con el isotipo real de cada herramienta: nunca el diseño propietario de nadie.
 */

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'

import type { SurfaceAssetRequest } from '../types'
import { SurfacePieceError } from '../types'
import { contentOf, photoOf, plateFrom, selectionSlot, voiceSlots, type SurfaceManifest } from '../shared'

import { documentVars, platformSvg, type Glass, type PlatformTokens } from './close'
import { progressIndicatorLayer, type RecipeBuilder } from './deck'
import { evidenceHtml } from './frame'
import { colorVar, css, fixedPx, layerAsset, measured, n, paletteColor, stageSvg, svgOpen, text, topOf, type StageTokens, type TypeToken } from './kit'
import { liveVoiceFrame } from './sections'

type RecipeType = TypeToken & { color?: string; insetPx?: number; raisePx?: number; widthPx?: number; paddingTopPx?: number; ruleStrokePx?: number; count?: number; chosenWeight?: number }

const GLX = efeonceGraphicLine as unknown as { orbit: { ringAirRatio: number }; lines: { key: string; accentOnDark: string }[] }

const recipeType = (recipe: Record<string, unknown>, key: string): RecipeType =>
  measured((recipe.type as Record<string, RecipeType> | undefined)?.[key], `la tipografía «${key}» de la receta`)

const px = (type: RecipeType, what: string): number => fixedPx(type, what)
const tracking = (type: RecipeType, what: string): number => Number.parseFloat(measured(type.tracking, `el tracking de ${what}`))
const margin = (manifest: SurfaceManifest): number => measured(manifest.safeArea?.marginPx, 'el margen del deck')
const accentOf = (line: string): string => measured(GLX.lines.find(entry => entry.key === line)?.accentOnDark, `el acento de la línea «${line}»`)

/** El ítem que toma la selección (1 = el primero), validado contra los que tiene la lámina. */
const selectedOf = (intent: Record<string, unknown>, count: number, what: string): number => {
  const index = Number(intent.selected)

  if (!Number.isInteger(index) || index < 1 || index > count) throw new SurfacePieceError(`${what} (\`selected\`) va de 1 a ${count}.`, 'invalid-intent')

  return index
}

/** La voz fija de una lámina de contenido, con el interlineado, el tracking y el corrimiento de la respuesta. */
const voiceFrame = (manifest: SurfaceManifest, recipe: Record<string, unknown>, prefix: string) => {
  const answer = recipeType(recipe, 'answer')
  const question = recipeType(recipe, 'question')

  return {
    margin: margin(manifest),
    // La hoja de contactos no lleva eyebrow: sólo se fija su altura si la receta la reserva.
    ...(manifest.reserves?.some(r => r.band === 'eyebrow') ? { eyebrowTop: topOf(manifest, 'eyebrow') } : {}),
    questionTop: topOf(manifest, 'question'),
    answerTop: topOf(manifest, 'answer'),
    answerPx: px(answer, 'la respuesta'),
    questionPx: css(`${prefix}-question-px`, px(question, 'la pregunta')),
    questionLeading: css(`${prefix}-question-leading`, measured(question.lineHeight, 'el interlineado de la pregunta'), ''),
    answerLeading: css(`${prefix}-answer-leading`, measured(answer.lineHeight, 'el interlineado de la respuesta'), ''),
    answerTracking: css(`${prefix}-answer-tracking`, tracking(answer, 'la respuesta'), 'em'),
    answerInset: css(`${prefix}-answer-inset`, answer.insetPx ?? 0)
  }
}

type Shadow = { yPx: number; blurPx: number; opacity: number }

/* ── contact-sheet: la hoja de contactos ────────────────────────────────────────────────────────────────── */

type SheetTokens = {
  count: number
  chosen: { xPx: number; yPx: number; widthPx: number; heightPx: number; shadows: Shadow[] }
  strip: { yPx: number; widthPx: number; heightPx: number; gapPx: number; shadows: Shadow[] }
  cropMarks: { color: string; armPx: number; offsetPx: number; strokePx: number }
}

type ShotIntent = { plateRef?: unknown; alt?: unknown; caption?: unknown }

/** Las marcas de corte alrededor de cada toma de la tira: cuatro esquinas, dos brazos por esquina, a su distancia. */
const cropMarksSvg = (manifest: SurfaceManifest, boxes: { x: number; y: number; w: number; h: number }[], marks: SheetTokens['cropMarks']): string => {
  const { armPx: arm, offsetPx: off } = marks
  const stroke = paletteColor(marks.color, 'las marcas de corte')
  const line = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${stroke}" stroke-width="${n(marks.strokePx)}"/>`

  return (
    svgOpen(manifest) +
    boxes
      .map(({ x, y, w, h }) =>
        [
          line(x - off - arm, y, x - off, y),
          line(x, y - off - arm, x, y - off),
          line(x + w + off, y, x + w + off + arm, y),
          line(x + w, y - off - arm, x + w, y - off),
          line(x - off - arm, y + h, x - off, y + h),
          line(x, y + h + off, x, y + h + off + arm),
          line(x + w + off, y + h, x + w + off + arm, y + h),
          line(x + w, y + h + off, x + w, y + h + off + arm)
        ].join('')
      )
      .join('') +
    '</svg>'
  )
}

const shadowVars = (shadows: Shadow[], prefix: string) =>
  Object.fromEntries(
    shadows.flatMap((shadow, i) => [
      [`${prefix}Shadow${i + 1}Y`, css(`cs-${prefix}-shadow${i + 1}-y`, shadow.yPx)],
      [`${prefix}Shadow${i + 1}Blur`, css(`cs-${prefix}-shadow${i + 1}-blur`, shadow.blurPx)],
      [`${prefix}Shadow${i + 1}Opacity`, css(`cs-${prefix}-shadow${i + 1}-opacity`, shadow.opacity * 100, '%')]
    ])
  )

export const contactSheet: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const sheet = measured(recipe.sheet as SheetTokens | undefined, 'la hoja de contactos')
  const background = measured(recipe.background as { cxOfWidth: number; cyOfHeight: number; rxOfWidth: number; ryOfHeight: number; stops: { at: number; color: string }[] } | undefined, 'el fondo de la hoja')
  const voice = voiceSlots(manifest)
  const shots = (Array.isArray(intent.sheet) ? intent.sheet : []) as ShotIntent[]

  if (shots.length !== sheet.count) throw new SurfacePieceError(`La hoja lleva ${sheet.count} tomas: la elegida primero (\`sheet\`).`, 'invalid-intent')

  const { chosen, strip } = sheet

  const plate = (shot: ShotIntent, i: number, fit: { width: number; height: number }, crop: string) =>
    plateFrom({ plateRef: String(shot.plateRef ?? ''), alt: String(shot.alt ?? '') }, fit, `La toma ${i + 1} de la hoja`, crop)

  const first = plate(shots[0]!, 0, { width: chosen.widthPx, height: chosen.heightPx }, 'chosen')
  const rest = shots.slice(1).map((shot, i) => ({ plate: plate(shot, i + 1, { width: strip.widthPx, height: strip.heightPx }, 'strip'), caption: text(shot.caption, `El rótulo de la toma ${i + 2}`) }))
  const boxes = rest.map((_, i) => ({ x: chosen.xPx + i * (strip.widthPx + strip.gapPx), y: strip.yPx, w: strip.widthPx, h: strip.heightPx }))
  const marks = layerAsset('contact-sheet-marks', cropMarksSvg(manifest, boxes, sheet.cropMarks))
  const caption = recipeType(recipe, 'caption')
  const question = recipeType(recipe, 'question')
  const selection = selectionSlot(manifest)
  const [s0, s1, s2] = background.stops

  return {
    slots: {
      frame: {
        line: intent.line,
        ...voiceFrame(manifest, recipe, 'cs'),
        questionWidth: css('cs-question-width', measured(question.maxWidthPx, 'el ancho de la pregunta')),
        bgX: css('cs-bg-x', background.cxOfWidth * 100, '%'),
        bgY: css('cs-bg-y', background.cyOfHeight * 100, '%'),
        bgRx: css('cs-bg-rx', background.rxOfWidth * 100, '%'),
        bgRy: css('cs-bg-ry', background.ryOfHeight * 100, '%'),
        bgFrom: colorVar('cs-bg-from', paletteColor(s0!.color, 'el fondo')),
        bgMid: colorVar('cs-bg-mid', paletteColor(s1!.color, 'el fondo')),
        bgMidAt: css('cs-bg-mid-at', s1!.at * 100, '%'),
        bgTo: colorVar('cs-bg-to', paletteColor(s2!.color, 'el fondo')),
        chosenLeft: css('cs-chosen-left', chosen.xPx),
        chosenTop: css('cs-chosen-top', chosen.yPx),
        chosenWidth: css('cs-chosen-width', chosen.widthPx),
        chosenHeight: css('cs-chosen-height', chosen.heightPx),
        ...shadowVars(chosen.shadows, 'chosen'),
        stripLeft: css('cs-strip-left', chosen.xPx),
        stripTop: css('cs-strip-top', strip.yPx),
        stripWidth: css('cs-strip-width', strip.widthPx),
        stripHeight: css('cs-strip-height', strip.heightPx),
        stripGap: css('cs-strip-gap', strip.gapPx),
        ...shadowVars(strip.shadows, 'strip'),
        captionPx: css('cs-caption-px', px(caption, 'el rótulo')),
        captionTracking: css('cs-caption-tracking', tracking(caption, 'el rótulo'), 'em'),
        captionGap: css('cs-caption-gap', measured(caption.gapPx, 'el aire del rótulo')),
        captionColor: colorVar('cs-caption', paletteColor(measured(caption.color, 'el color del rótulo'), 'el rótulo'))
      },
      marks: { src: marks.ref },
      chosen: { src: first.ref, alt: first.alt },
      strip: rest.map(item => ({ src: item.plate.ref, alt: item.plate.alt, caption: item.caption })),
      voice,
      ...(selection ? { selection: { ...selection, item: 1 } } : {})
    },
    assets: [marks.asset, first.asset, ...rest.map(item => item.plate.asset)]
  }
}

/* ── content-text: la respuesta es la lámina ────────────────────────────────────────────────────────────── */

type PointIntent = { name?: unknown; text?: unknown }

export const contentText: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const voice = voiceSlots(manifest)
  const content = contentOf(manifest)
  const point = recipeType(recipe, 'point')
  const body = recipeType(recipe, 'body')
  const points = (Array.isArray(intent.points) ? intent.points : []) as PointIntent[]

  if (voice.answerLead) throw new SurfacePieceError('La respuesta del texto va en una línea.', 'invalid-intent')
  if (!content.body) throw new SurfacePieceError('El texto lleva su bajada (`body`).', 'invalid-intent')
  if (points.length !== point.count) throw new SurfacePieceError(`El texto lleva ${point.count} puntos (\`points\`).`, 'invalid-intent')

  const indicator = progressIndicatorLayer(manifest, intent.line, 'content', 'gl-ct')
  const selection = selectionSlot(manifest)

  return {
    slots: {
      frame: {
        line: intent.line,
        ...voiceFrame(manifest, recipe, 'ct'),
        bodyTop: topOf(manifest, 'body'),
        bodyPx: px(body, 'la bajada'),
        bodyWidth: measured(body.maxWidthPx, 'el ancho de la bajada'),
        bodyLeading: css('ct-body-leading', measured(body.lineHeight, 'el interlineado de la bajada'), ''),
        pointsTop: css('ct-points-top', topOf(manifest, 'points')),
        pointsRight: css('ct-points-right', margin(manifest)),
        pointsWidth: css('ct-points-width', measured(point.widthPx, 'el ancho de los puntos')),
        pointPx: css('ct-point-px', px(point, 'el punto')),
        pointGap: css('ct-point-gap', measured(point.gapPx, 'el aire entre puntos')),
        pointPad: css('ct-point-pad', measured(point.paddingTopPx, 'el aire del filete')),
        pointRule: css('ct-point-rule', measured(point.ruleStrokePx, 'el filete del punto'))
      },
      indicator: { src: indicator.ref },
      voice,
      body: evidenceHtml(content.body, 'none'),
      points: points.map((item, i) => ({ name: text(item.name, `El nombre del punto ${i + 1}`), text: `· ${text(item.text, `El punto ${i + 1}`)}` })),
      ...(selection ? { selection } : {})
    },
    assets: [indicator.asset]
  }
}

/* ── content-bullets: cuatro puntos numerados ───────────────────────────────────────────────────────────── */

type BulletIntent = { title?: unknown; desc?: unknown }

export const contentBullets: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const voice = voiceSlots(manifest)
  const grid = measured(recipe.grid as { columns: number; widthPx: number; rowGapPx: number; columnGapPx: number; ruleStrokePx: number; paddingTopPx: number } | undefined, 'la grilla de viñetas')
  const count = measured((recipe.list as { count?: number } | undefined)?.count, 'cuántas viñetas')
  const items = (Array.isArray(intent.items) ? intent.items : []) as BulletIntent[]

  if (voice.answerLead) throw new SurfacePieceError('La respuesta de las viñetas va en una línea.', 'invalid-intent')
  if (items.length !== count) throw new SurfacePieceError(`La lámina lleva ${count} viñetas (\`items\`).`, 'invalid-intent')

  const number = recipeType(recipe, 'number')
  const title = recipeType(recipe, 'title')
  const desc = recipeType(recipe, 'desc')
  const indicator = progressIndicatorLayer(manifest, intent.line, 'content', 'gl-cb')
  const selection = selectionSlot(manifest)
  const chosen = selectedOf(intent, count, 'La viñeta seleccionada')

  return {
    slots: {
      frame: {
        line: intent.line,
        ...voiceFrame(manifest, recipe, 'cb'),
        listTop: css('cb-list-top', topOf(manifest, 'list')),
        listWidth: css('cb-list-width', grid.widthPx),
        rowGap: css('cb-row-gap', grid.rowGapPx),
        columnGap: css('cb-column-gap', grid.columnGapPx),
        rule: css('cb-rule', grid.ruleStrokePx),
        padTop: css('cb-pad-top', grid.paddingTopPx),
        numberPx: css('cb-number-px', px(number, 'el número')),
        numberWght: css('cb-number-wght', measured(number.weight, 'el peso del número'), ''),
        numberTracking: css('cb-number-tracking', tracking(number, 'el número'), 'em'),
        numberRaise: css('cb-number-raise', measured(number.raisePx, 'el alza del número')),
        numberGap: css('cb-number-gap', measured(number.gapPx, 'el aire del número')),
        titlePx: css('cb-title-px', px(title, 'el título')),
        descPx: css('cb-desc-px', px(desc, 'la descripción')),
        descGap: css('cb-desc-gap', measured(desc.gapPx, 'el aire de la descripción'))
      },
      indicator: { src: indicator.ref },
      voice,
      items: items.map((item, i) => ({ number: String(i + 1).padStart(2, '0'), title: text(item.title, `El título de la viñeta ${i + 1}`), desc: text(item.desc, `La descripción de la viñeta ${i + 1}`) })),
      ...(selection ? { selection: { ...selection, item: chosen } } : {})
    },
    assets: [indicator.asset]
  }
}

/* ── content-day: el día a día ──────────────────────────────────────────────────────────────────────────── */

type ClockTokens = {
  cxPx: number
  cyPx: number
  photoRadiusPx: number
  halo: { radiusRatio: number; stops: { at: number; color: string; opacity: number }[] }
  ring: { color: string; opacity: number; strokePx: number }
  arc: { strokePx: number; fromOffsetDeg: number; toOffsetDeg: number }
  satellites: { count: number; sizePx: number; borderPx: number; labelGapPx: number; labelRaisePx: number; belowGapPx: number; belowShiftPx: number; labelWidthPx: number }
  now: { offsetXPx: number; offsetYPx: number }
}

type MomentIntent = { photo?: { plateRef?: unknown; alt?: unknown }; hour?: unknown; time?: unknown; label?: unknown; side?: unknown }

/** La hora en el reloj: las 12 arriba y el sentido de las agujas (en grados, desde las 3). */
const clockDeg = (hour: number): number => (hour % 12) * 30 - 90

const clockOrbitSvg = (manifest: SurfaceManifest, clock: ClockTokens, accent: string, from: number, to: number): string => {
  const r = clock.photoRadiusPx * (1 + GLX.orbit.ringAirRatio)
  const at = (deg: number) => [clock.cxPx + r * Math.cos((deg * Math.PI) / 180), clock.cyPx + r * Math.sin((deg * Math.PI) / 180)] as const
  const [x0, y0] = at(clockDeg(from) + clock.arc.fromOffsetDeg)
  const [x1, y1] = at(clockDeg(to) + clock.arc.toOffsetDeg)
  const stops = clock.halo.stops.map(s => `<stop offset="${n(s.at)}" stop-color="${paletteColor(s.color, 'el halo del reloj')}" stop-opacity="${n(s.opacity)}"/>`).join('')

  return (
    svgOpen(manifest) +
    `<defs><linearGradient id="cd-arc" gradientUnits="userSpaceOnUse" x1="${n(x0)}" y1="${n(y0)}" x2="${n(x1)}" y2="${n(y1)}"><stop offset="0" stop-color="${accent}" stop-opacity="0"/><stop offset="1" stop-color="${accent}"/></linearGradient><radialGradient id="cd-halo">${stops}</radialGradient></defs>` +
    `<circle cx="${n(clock.cxPx)}" cy="${n(clock.cyPx)}" r="${n(r * clock.halo.radiusRatio)}" fill="url(#cd-halo)"/>` +
    `<circle cx="${n(clock.cxPx)}" cy="${n(clock.cyPx)}" r="${n(r)}" fill="none" stroke="${paletteColor(clock.ring.color, 'el anillo del reloj')}" stroke-opacity="${n(clock.ring.opacity)}" stroke-width="${n(clock.ring.strokePx)}"/>` +
    `<path d="M ${n(x0)} ${n(y0)} A ${n(r)} ${n(r)} 0 0 1 ${n(x1)} ${n(y1)}" fill="none" stroke="url(#cd-arc)" stroke-width="${n(clock.arc.strokePx)}" stroke-linecap="round"/>` +
    '</svg>'
  )
}

const contentDayClock: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const clock = measured(recipe.clock as ClockTokens | undefined, 'el reloj del día')
  const voice = voiceSlots(manifest)
  const content = contentOf(manifest)
  const moments = (Array.isArray(intent.moments) ? intent.moments : []) as MomentIntent[]
  const nowIntent = (intent.now ?? {}) as { hour?: unknown; time?: unknown; label?: unknown }

  if (!content.body) throw new SurfacePieceError('El día a día lleva su bajada (`body`).', 'invalid-intent')
  if (moments.length !== clock.satellites.count) throw new SurfacePieceError(`El reloj lleva ${clock.satellites.count} momentos además del de ahora (\`moments\`).`, 'invalid-intent')

  const hourOf = (value: unknown, what: string) => {
    const hour = Number(value)

    if (!Number.isFinite(hour) || hour < 0 || hour >= 24) throw new SurfacePieceError(`${what} es una hora del día (0–24).`, 'invalid-intent')

    return hour
  }

  const nowHour = hourOf(nowIntent.hour, 'La hora de ahora (`now.hour`)')
  const hours = moments.map((moment, i) => hourOf(moment.hour, `La hora del momento ${i + 1}`))
  const last = Math.max(...hours.filter(hour => hour < nowHour))
  const r = clock.photoRadiusPx * (1 + GLX.orbit.ringAirRatio)
  const at = (hour: number) => [clock.cxPx + r * Math.cos((clockDeg(hour) * Math.PI) / 180), clock.cyPx + r * Math.sin((clockDeg(hour) * Math.PI) / 180)] as const
  const accent = accentOf(intent.line)
  const orbit = layerAsset(`content-day-clock-${intent.line}`, clockOrbitSvg(manifest, clock, accent, last, nowHour))
  const lens = plateFrom(photoOf(manifest), { width: clock.photoRadiusPx * 2, height: clock.photoRadiusPx * 2 }, 'La foto del momento de ahora', 'lens')
  const lensFocus = photoOf(manifest)?.focus

  // El foco del plate (una toma vertical recortada a círculo) manda el recorte, como en la lámina aprobada.
  if (lensFocus && lens.asset.kind === 'plate') lens.asset.focus = lensFocus as { xOfWidth?: number; yOfHeight?: number }
  const sat = clock.satellites
  const assets: SurfaceAssetRequest[] = [orbit.asset, lens.asset]

  const items = moments.map((moment, i) => {
    const [x, y] = at(hours[i]!)
    const side = String(moment.side ?? '')

    if (!['start', 'end', 'below'].includes(side)) throw new SurfacePieceError(`El rótulo del momento ${i + 1} va a un lado: start, end o below (\`side\`).`, 'invalid-intent')

    const photo = plateFrom({ plateRef: String(moment.photo?.plateRef ?? ''), alt: String(moment.photo?.alt ?? '') }, { width: sat.sizePx, height: sat.sizePx }, `La foto del momento ${i + 1}`, 'moment')

    assets.push(photo.asset)

    const left = side === 'end' ? x + sat.sizePx / 2 + sat.labelGapPx : side === 'start' ? x - sat.sizePx / 2 - sat.labelGapPx - sat.labelWidthPx : x + sat.belowShiftPx - sat.labelWidthPx
    const top = side === 'below' ? y + sat.sizePx / 2 + sat.belowGapPx : y - sat.labelRaisePx

    return {
      photoLeft: css('cd-photo-left', x - sat.sizePx / 2),
      photoTop: css('cd-photo-top', y - sat.sizePx / 2),
      labelLeft: css('cd-label-left', left),
      labelTop: css('cd-label-top', top),
      align: side === 'end' ? 'start' : 'end',
      src: photo.ref,
      alt: photo.alt,
      time: text(moment.time, `La hora escrita del momento ${i + 1}`),
      label: text(moment.label, `Qué pasa en el momento ${i + 1}`)
    }
  })

  const [nx, ny] = at(nowHour)
  const question = recipeType(recipe, 'question')
  const body = recipeType(recipe, 'body')
  const time = recipeType(recipe, 'time')
  const timeLabel = recipeType(recipe, 'timeLabel')
  const now = recipeType(recipe, 'now')
  const nowLabel = recipeType(recipe, 'nowLabel')
  const selection = selectionSlot(manifest)

  return {
    slots: {
      frame: {
        line: intent.line,
        ...voiceFrame(manifest, recipe, 'cd'),
        questionWidth: css('cd-question-width', measured(question.maxWidthPx, 'el ancho de la pregunta')),
        bodyTop: topOf(manifest, 'body'),
        bodyPx: px(body, 'la bajada'),
        bodyWidth: measured(body.maxWidthPx, 'el ancho de la bajada'),
        lensLeft: css('cd-lens-left', clock.cxPx - clock.photoRadiusPx),
        lensTop: css('cd-lens-top', clock.cyPx - clock.photoRadiusPx),
        lensSize: css('cd-lens-size', clock.photoRadiusPx * 2),
        satSize: css('cd-sat-size', sat.sizePx),
        satBorder: css('cd-sat-border', sat.borderPx),
        labelWidth: css('cd-label-width', sat.labelWidthPx),
        timePx: css('cd-time-px', px(time, 'la hora')),
        timeWght: css('cd-time-wght', measured(time.weight, 'el peso de la hora'), ''),
        timeTracking: css('cd-time-tracking', tracking(time, 'la hora'), 'em'),
        timeLabelPx: css('cd-time-label-px', px(timeLabel, 'el rótulo de la hora')),
        timeLabelGap: css('cd-time-label-gap', measured(timeLabel.gapPx, 'el aire del rótulo')),
        nowLeft: css('cd-now-left', nx + clock.now.offsetXPx),
        nowTop: css('cd-now-top', ny - clock.now.offsetYPx),
        nowPx: css('cd-now-px', px(now, 'la hora de ahora')),
        nowTracking: css('cd-now-tracking', tracking(now, 'la hora de ahora'), 'em'),
        nowLabelPx: css('cd-now-label-px', px(nowLabel, 'el rótulo de ahora')),
        nowLabelTracking: css('cd-now-label-tracking', tracking(nowLabel, 'el rótulo de ahora'), 'em'),
        nowLabelGap: css('cd-now-label-gap', measured(nowLabel.gapPx, 'el aire del rótulo de ahora'))
      },
      orbit: { src: orbit.ref },
      lens: { src: lens.ref, alt: lens.alt },
      moments: items,
      now: { time: text(nowIntent.time, 'La hora escrita de ahora (`now.time`)'), label: text(nowIntent.label, 'Qué pasa ahora (`now.label`)') },
      voice,
      body: evidenceHtml(content.body, 'none'),
      ...(selection ? { selection } : {})
    },
    assets
  }
}

/* ── content-day: las composiciones «vivas» ─────────────────────────────────────────────────────────────── */

type LiveTokens = {
  twoLineShiftPx: number
  questionWrapChars: number
  answerShadow: { yPx: number; blurPx: number; opacity: number }
  glass: Glass
  deep: { yPx: number; blurPx: number; color: string; opacity: number; edgeOpacity: number; haloBlurPx: number; haloOpacity: number }
  reflection: { gapPx: number; fromStop: number; opacity: number }
  beam: { strokePx: number; glow: { strokePx: number; opacity: number; blurPx: number }; liftPx: number; from: { color: string; opacity: number } }
  tools: {
    stage: StageTokens
    platform: PlatformTokens
    perspectivePx: number
    originPx: [number, number]
    panel: Panel
    tiles: { xPx: number; yPx: number; sizePx: number; z: number; beamTo: [number, number]; own?: boolean }[]
    tile: {
      radiusRatio: number
      iconRatio: number
      ownIconRatio: number
      labelGapPx: number
      labelWidthPx: number
      light: { fill: [string, string, string]; midAt: number; edgeOpacity: number }
      own: { fill: [string, string]; edgeOpacity: number }
      shadow: { yPx: number; blurPx: number; color: string; opacity: number }
      glow: { blurPx: number; opacity: number }
    }
    caption: { leftPx: number; topPx: number; widthPx: number; logoPx: number; gapPx: number }
  }
  progress: {
    stage: StageTokens
    platform: PlatformTokens
    perspectivePx: number
    originPx: [number, number]
    plan: { leftPx: number; topPx: number; widthPx: number; radiusPx: number; rotateYDeg: number; rotateXDeg: number; opacity: number; columns: number }
    review: { leftPx: number; topPx: number; widthPx: number; radiusPx: number; rotateYDeg: number; rotateXDeg: number; piece: { widthPx: number; heightPx: number; pin: { xPx: number; yPx: number; sizePx: number } } }
    beam: { from: [number, number]; to: [number, number] }
  }
  results: {
    stage: StageTokens
    platform: PlatformTokens
    perspectivePx: number
    originPx: [number, number]
    panel: Panel
    meeting: { leftPx: number; topPx: number; widthPx: number; radiusPx: number; rotateYDeg: number; perspectivePx: number }
    report: { leftPx: number; topPx: number; widthPx: number; radiusPx: number; border: { px: number; color: string; opacity: number }; glow: { blurPx: number; opacity: number } }
  }
}

type Panel = { leftPx: number; topPx: number; widthPx: number; heightPx: number; radiusPx: number; rotateYDeg: number; rotateXDeg: number }

type FileIntent = { path?: unknown; alt?: unknown; name?: unknown }

/** Un archivo del intent (un isotipo, el panel de Greenhouse) como asset que quien compone lee tal cual. */
const fileAsset = (file: FileIntent | undefined, what: string, assets: SurfaceAssetRequest[]): { src: string; alt: string } => {
  const path = text(file?.path, `El archivo de ${what} (\`path\`)`)
  const alt = text(file?.alt ?? file?.name, `El nombre de ${what} (\`alt\`)`)
  const ref = `asset-ref:file:${path.split('/').pop()!.replace(/\.[a-z0-9]+$/i, '')}`

  if (!assets.some(asset => asset.ref === ref)) assets.push({ ref, kind: 'file', path })

  return { src: ref, alt }
}

/** El haz de luz de una herramienta a su destino: una curva que sube y se apaga, con su resplandor. */
const beamSvg = (beams: { from: readonly [number, number]; to: readonly [number, number] }[], beam: LiveTokens['beam']): string => {
  const color = paletteColor(beam.from.color, 'el haz')

  return beams
    .map(({ from: [x1, y1], to: [x2, y2] }, i) => {
      const path = `M ${n(x1)} ${n(y1)} Q ${n((x1 + x2) / 2)} ${n(Math.min(y1, y2) - beam.liftPx)} ${n(x2)} ${n(y2)}`

      return (
        `<defs><linearGradient id="cd-beam-${i}" gradientUnits="userSpaceOnUse" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"><stop offset="0" stop-color="${color}" stop-opacity="${n(beam.from.opacity)}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient><filter id="cd-beam-glow-${i}"><feGaussianBlur stdDeviation="${n(beam.glow.blurPx)}"/></filter></defs>` +
        `<path d="${path}" fill="none" stroke="url(#cd-beam-${i})" stroke-width="${n(beam.glow.strokePx)}" opacity="${n(beam.glow.opacity)}" filter="url(#cd-beam-glow-${i})"/>` +
        `<path d="${path}" fill="none" stroke="url(#cd-beam-${i})" stroke-width="${n(beam.strokePx)}"/>`
      )
    })
    .join('')
}

/** Las variables comunes de las láminas vivas: el escenario 3D, la sombra profunda, el reflejo y el documento claro. */
const liveVars = (live: LiveTokens, scene: { perspectivePx: number; originPx: [number, number] }) => ({
  perspective: css('cd-perspective', scene.perspectivePx),
  originX: css('cd-origin-x', scene.originPx[0]),
  originY: css('cd-origin-y', scene.originPx[1]),
  deepY: css('cd-deep-y', live.deep.yPx),
  deepBlur: css('cd-deep-blur', live.deep.blurPx),
  deepColor: colorVar('cd-deep', paletteColor(live.deep.color, 'la sombra profunda')),
  deepOpacity: css('cd-deep-opacity', live.deep.opacity * 100, '%'),
  deepEdge: css('cd-deep-edge', live.deep.edgeOpacity * 100, '%'),
  deepHaloBlur: css('cd-deep-halo-blur', live.deep.haloBlurPx),
  deepHaloOpacity: css('cd-deep-halo-opacity', live.deep.haloOpacity * 100, '%'),
  haloColor: colorVar('cd-halo', paletteColor('halo', 'el halo')),
  reflectGap: css('cd-reflect-gap', live.reflection.gapPx),
  reflectFrom: css('cd-reflect-from', live.reflection.fromStop * 100, '%'),
  reflectOpacity: css('cd-reflect-opacity', live.reflection.opacity * 100, '%'),
  ...documentVars(live.glass, 'cd')
})

const panelVars = (panel: Panel) => ({
  panelLeft: css('cd-panel-left', panel.leftPx),
  panelTop: css('cd-panel-top', panel.topPx),
  panelWidth: css('cd-panel-width', panel.widthPx),
  panelHeight: css('cd-panel-height', panel.heightPx),
  panelRadius: css('cd-panel-radius', panel.radiusPx),
  panelRotateY: css('cd-panel-rotate-y', panel.rotateYDeg, 'deg'),
  panelRotateX: css('cd-panel-rotate-x', panel.rotateXDeg, 'deg')
})

type ToolIntent = { path?: unknown; name?: unknown; label?: unknown }

const contentDayTools: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const live = measured(recipe.live as LiveTokens | undefined, 'las piezas vivas').tools
  const all = recipe.live as LiveTokens
  const voice = voiceSlots(manifest)
  const content = contentOf(manifest)
  const tools = (Array.isArray(intent.tools) ? intent.tools : []) as ToolIntent[]
  const own = (intent.insights ?? {}) as ToolIntent
  const panel = (intent.panel ?? {}) as FileIntent & { logo?: FileIntent; title?: unknown; note?: unknown }
  const assets: SurfaceAssetRequest[] = []

  if (!content.body) throw new SurfacePieceError('El día a día lleva su bajada (`body`).', 'invalid-intent')
  if (tools.length !== live.tiles.filter(tile => !tile.own).length) throw new SurfacePieceError(`El panel lleva ${live.tiles.filter(tile => !tile.own).length} herramientas (\`tools\`) y el reporte de Insights (\`insights\`).`, 'invalid-intent')

  const stage = layerAsset('content-day-tools-stage', stageSvg(manifest, live.stage, 'cdt'))
  const platform = layerAsset('content-day-tools-platform', platformSvg(manifest, live.platform, 'cdt'))
  const beams = layerAsset('content-day-tools-beams', svgOpen(manifest) + beamSvg(live.tiles.map(tile => ({ from: [tile.xPx + tile.sizePx / 2, tile.yPx + tile.sizePx / 2] as const, to: tile.beamTo })), all.beam) + '</svg>')
  const t = live.tile
  let next = 0

  const tiles = live.tiles.map(tile => {
    const source = tile.own ? own : tools[next++]!

    const image = tile.own
      ? { src: 'asset-ref:file:efeonce-isotype-negative', alt: text(source.name, 'El nombre del reporte (`insights.name`)') }
      : fileAsset(source, 'una herramienta', assets)

    if (tile.own) assets.push({ ref: image.src, kind: 'file', path: 'src/lib/artifact-composer/catalogs/graphic-line-deck/assets/efeonce-isotype-negative.svg' })

    return {
      left: css('cdt-left', tile.xPx),
      top: css('cdt-top', tile.yPx),
      size: css('cdt-size', tile.sizePx),
      radius: css('cdt-radius', Math.round(tile.sizePx * t.radiusRatio)),
      icon: css('cdt-icon', Math.round(tile.sizePx * (tile.own ? t.ownIconRatio : t.iconRatio))),
      z: css('cdt-z', tile.z, ''),
      fillFrom: colorVar('cdt-fill-from', paletteColor(tile.own ? t.own.fill[0] : t.light.fill[0], 'la ficha')),
      fillMid: colorVar('cdt-fill-mid', paletteColor(tile.own ? t.own.fill[1] : t.light.fill[1], 'la ficha')),
      fillTo: colorVar('cdt-fill-to', paletteColor(tile.own ? t.own.fill[1] : t.light.fill[2], 'la ficha')),
      fillMidAt: css('cdt-fill-mid-at', (tile.own ? 1 : t.light.midAt) * 100, '%'),
      edge: css('cdt-edge', (tile.own ? t.own.edgeOpacity : t.light.edgeOpacity) * 100, '%'),
      src: image.src,
      alt: image.alt,
      name: text(source.name, 'El nombre de la herramienta'),
      label: text(source.label, 'Para qué se usa la herramienta')
    }
  })

  const screen = fileAsset(panel, 'el panel de Greenhouse', assets)
  const logo = fileAsset(panel.logo, 'el isotipo de Greenhouse', assets)
  const kicker = recipeType(recipe, 'toolKicker')
  const title = recipeType(recipe, 'toolTitle')
  const caption = recipeType(recipe, 'caption')
  const captionNote = recipeType(recipe, 'captionNote')

  return {
    contentType: 'deck.content-day.tools',
    slots: {
      frame: {
        line: intent.line,
        ...liveVoiceFrame(manifest, liveVoiceToken(recipe, all), voice.question ?? '', 'cd'),
        ...liveVars(all, live),
        ...panelVars(live.panel),
        tileLabelGap: css('cdt-label-gap', t.labelGapPx),
        tileLabelWidth: css('cdt-label-width', t.labelWidthPx),
        tileShadowY: css('cdt-shadow-y', t.shadow.yPx),
        tileShadowBlur: css('cdt-shadow-blur', t.shadow.blurPx),
        tileShadowColor: colorVar('cdt-shadow', paletteColor(t.shadow.color, 'la sombra de la ficha')),
        tileShadowOpacity: css('cdt-shadow-opacity', t.shadow.opacity * 100, '%'),
        tileGlowBlur: css('cdt-glow-blur', t.glow.blurPx),
        tileGlowOpacity: css('cdt-glow-opacity', t.glow.opacity * 100, '%'),
        kickerPx: css('cdt-kicker-px', px(kicker, 'el nombre de la herramienta')),
        kickerTracking: css('cdt-kicker-tracking', tracking(kicker, 'el nombre de la herramienta'), 'em'),
        titlePx: css('cdt-title-px', px(title, 'el uso de la herramienta')),
        captionLeft: css('cdt-caption-left', live.caption.leftPx),
        captionTop: css('cdt-caption-top', live.caption.topPx),
        captionWidth: css('cdt-caption-width', live.caption.widthPx),
        captionLogo: css('cdt-caption-logo', live.caption.logoPx),
        captionGap: css('cdt-caption-gap', live.caption.gapPx),
        captionPx: css('cdt-caption-px', px(caption, 'el panel')),
        captionNotePx: css('cdt-caption-note-px', px(captionNote, 'la nota del panel'))
      },
      stage: { src: stage.ref },
      platform: { src: platform.ref },
      beams: { src: beams.ref },
      panel: screen,
      tiles,
      caption: { logo: logo.src, title: text(panel.title, 'El nombre del panel (`panel.title`)'), note: text(panel.note, 'La nota del panel (`panel.note`)') },
      voice,
      body: evidenceHtml(content.body, 'none')
    },
    assets: [stage.asset, platform.asset, beams.asset, ...assets]
  }
}

/** La voz «viva» toma su medida de la composición (reservas y tipos) y del token vivo (corrimiento y sombra). */
const liveVoiceToken = (recipe: Record<string, unknown>, live: LiveTokens): Record<string, unknown> => ({
  ...recipe,
  twoLineShiftPx: live.twoLineShiftPx,
  questionWrapChars: live.questionWrapChars,
  answerShadow: live.answerShadow
})

type CardIntent = { title?: unknown; tag?: unknown; highlight?: unknown }
type ColumnIntent = { name?: unknown; cards?: CardIntent[] }
type CommentIntent = { mark?: unknown; author?: unknown; version?: unknown; text?: unknown; own?: unknown }

const contentDayProgress: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const all = measured(recipe.live as LiveTokens | undefined, 'las piezas vivas')
  const live = all.progress
  const voice = voiceSlots(manifest)
  const content = contentOf(manifest)
  const planIntent = (intent.plan ?? {}) as { tool?: FileIntent; kicker?: unknown; title?: unknown; meta?: unknown; columns?: ColumnIntent[] }
  const review = (intent.review ?? {}) as { tool?: FileIntent; kicker?: unknown; title?: unknown; versions?: unknown[]; piece?: { plateRef?: unknown; alt?: unknown }; pin?: unknown; comments?: CommentIntent[]; secondary?: unknown; primary?: unknown }
  const columns = Array.isArray(planIntent.columns) ? planIntent.columns : []
  const comments = Array.isArray(review.comments) ? review.comments : []
  const versions = Array.isArray(review.versions) ? review.versions : []
  const assets: SurfaceAssetRequest[] = []

  if (!content.body) throw new SurfacePieceError('El día a día lleva su bajada (`body`).', 'invalid-intent')
  if (columns.length !== live.plan.columns) throw new SurfacePieceError(`El plan lleva ${live.plan.columns} columnas (\`plan.columns\`).`, 'invalid-intent')
  if (comments.length < 1 || comments.length > 2) throw new SurfacePieceError('La revisión lleva uno o dos comentarios (`review.comments`).', 'invalid-intent')
  if (versions.length < 1) throw new SurfacePieceError('La revisión nombra sus versiones (`review.versions`).', 'invalid-intent')

  const stage = layerAsset('content-day-progress-stage', stageSvg(manifest, live.stage, 'cdp'))
  const platform = layerAsset('content-day-progress-platform', platformSvg(manifest, live.platform, 'cdp'))
  const beam = layerAsset('content-day-progress-beam', svgOpen(manifest) + beamSvg([{ from: live.beam.from, to: live.beam.to }], all.beam) + '</svg>')
  const planTool = fileAsset(planIntent.tool, 'la herramienta del plan', assets)
  const reviewTool = fileAsset(review.tool, 'la herramienta de revisión', assets)
  const piece = plateFrom({ plateRef: String(review.piece?.plateRef ?? ''), alt: String(review.piece?.alt ?? '') }, { width: live.review.piece.widthPx, height: live.review.piece.heightPx }, 'La pieza en revisión', 'review')

  assets.push(piece.asset, { ref: 'asset-ref:file:efeonce-isotype-negative', kind: 'file', path: 'src/lib/artifact-composer/catalogs/graphic-line-deck/assets/efeonce-isotype-negative.svg' })

  return {
    contentType: 'deck.content-day.live-progress',
    slots: {
      frame: {
        line: intent.line,
        ...liveVoiceFrame(manifest, liveVoiceToken(recipe, all), voice.question ?? '', 'cd'),
        ...liveVars(all, live),
        planLeft: css('cdp-plan-left', live.plan.leftPx),
        planTop: css('cdp-plan-top', live.plan.topPx),
        planWidth: css('cdp-plan-width', live.plan.widthPx),
        planRadius: css('cdp-plan-radius', live.plan.radiusPx),
        planRotateY: css('cdp-plan-rotate-y', live.plan.rotateYDeg, 'deg'),
        planRotateX: css('cdp-plan-rotate-x', live.plan.rotateXDeg, 'deg'),
        planOpacity: css('cdp-plan-opacity', live.plan.opacity, ''),
        reviewLeft: css('cdp-review-left', live.review.leftPx),
        reviewTop: css('cdp-review-top', live.review.topPx),
        reviewWidth: css('cdp-review-width', live.review.widthPx),
        reviewRadius: css('cdp-review-radius', live.review.radiusPx),
        reviewRotateY: css('cdp-review-rotate-y', live.review.rotateYDeg, 'deg'),
        reviewRotateX: css('cdp-review-rotate-x', live.review.rotateXDeg, 'deg'),
        pieceWidth: css('cdp-piece-width', live.review.piece.widthPx),
        pieceHeight: css('cdp-piece-height', live.review.piece.heightPx),
        pinLeft: css('cdp-pin-left', live.review.piece.pin.xPx),
        pinTop: css('cdp-pin-top', live.review.piece.pin.yPx),
        pinSize: css('cdp-pin-size', live.review.piece.pin.sizePx),
        accentColor: colorVar('cdp-accent', accentOf(intent.line))
      },
      stage: { src: stage.ref },
      platform: { src: platform.ref },
      beam: { src: beam.ref },
      plan: {
        tool: planTool.src,
        kicker: text(planIntent.kicker, 'Dónde está el plan (`plan.kicker`)'),
        title: text(planIntent.title, 'El nombre del plan (`plan.title`)'),
        meta: text(planIntent.meta, 'El avance del plan (`plan.meta`)')
      },
      columns: columns.map((column, i) => ({
        name: text(column.name, `El nombre de la columna ${i + 1}`),
        cards: (Array.isArray(column.cards) ? column.cards : []).map((card, j) => ({
          role: card.highlight === true ? 'lead' : 'rest',
          title: text(card.title, `La tarjeta ${j + 1} de la columna ${i + 1}`),
          tag: text(card.tag, `La etiqueta de la tarjeta ${j + 1}`)
        }))
      })),
      review: {
        tool: reviewTool.src,
        kicker: text(review.kicker, 'Dónde se revisa (`review.kicker`)'),
        title: text(review.title, 'La pieza que se revisa (`review.title`)')
      },
      piece: { src: piece.ref, alt: piece.alt, pin: text(review.pin, 'La marca del comentario sobre la pieza (`review.pin`)') },
      secondary: text(review.secondary, 'La acción secundaria (`review.secondary`)'),
      versions: versions.map((version, i) => ({ role: i === versions.length - 1 ? 'lead' : 'rest', label: text(version, `La versión ${i + 1}`) })),
      comments: comments.map((comment, i) => ({
        role: comment.own === true ? 'lead' : 'rest',
        ...(comment.own === true ? {} : { mark: text(comment.mark, `La marca del comentario ${i + 1}`) }),
        author: text(comment.author, `Quién comenta (${i + 1})`),
        version: `· ${text(comment.version, `La versión del comentario ${i + 1}`)}`,
        text: text(comment.text, `El comentario ${i + 1}`)
      })),
      cta: { text: text(review.primary, 'La acción del lector (`review.primary`, p. ej. «Aprobar»)'), cursorScale: 1 },
      voice,
      body: evidenceHtml(content.body, 'none')
    },
    assets: [stage.asset, platform.asset, beam.asset, ...assets]
  }
}

type KpiIntent = { value?: unknown; label?: unknown }

const contentDayResults: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const all = measured(recipe.live as LiveTokens | undefined, 'las piezas vivas')
  const live = all.results
  const voice = voiceSlots(manifest)
  const content = contentOf(manifest)
  const panel = (intent.panel ?? {}) as FileIntent
  const meeting = (intent.meeting ?? {}) as { tool?: FileIntent; kicker?: unknown; title?: unknown; meta?: unknown }
  const report = (intent.report ?? {}) as { kicker?: unknown; title?: unknown; sample?: unknown; kpis?: KpiIntent[]; action?: unknown; logo?: FileIntent }
  const kpis = Array.isArray(report.kpis) ? report.kpis : []
  const assets: SurfaceAssetRequest[] = []

  if (!content.body) throw new SurfacePieceError('El día a día lleva su bajada (`body`).', 'invalid-intent')
  if (kpis.length !== 3) throw new SurfacePieceError('El reporte lleva tres cifras (`report.kpis`).', 'invalid-intent')

  const stage = layerAsset('content-day-results-stage', stageSvg(manifest, live.stage, 'cdr'))
  const platform = layerAsset('content-day-results-platform', platformSvg(manifest, live.platform, 'cdr'))
  const screen = fileAsset(panel, 'el panel de Greenhouse', assets)
  const meetingTool = fileAsset(meeting.tool, 'la herramienta de la reunión', assets)
  const logo = fileAsset(report.logo, 'el isotipo de Greenhouse', assets)

  assets.push({ ref: 'asset-ref:file:efeonce-isotype-negative', kind: 'file', path: 'src/lib/artifact-composer/catalogs/graphic-line-deck/assets/efeonce-isotype-negative.svg' })

  const { meeting: m, report: r } = live

  return {
    contentType: 'deck.content-day.live-results',
    slots: {
      frame: {
        line: intent.line,
        ...liveVoiceFrame(manifest, liveVoiceToken(recipe, all), voice.question ?? '', 'cd'),
        ...liveVars(all, live),
        ...panelVars(live.panel),
        meetingLeft: css('cdr-meeting-left', m.leftPx),
        meetingTop: css('cdr-meeting-top', m.topPx),
        meetingWidth: css('cdr-meeting-width', m.widthPx),
        meetingRadius: css('cdr-meeting-radius', m.radiusPx),
        meetingRotate: css('cdr-meeting-rotate', m.rotateYDeg, 'deg'),
        meetingPerspective: css('cdr-meeting-perspective', m.perspectivePx),
        reportLeft: css('cdr-report-left', r.leftPx),
        reportTop: css('cdr-report-top', r.topPx),
        reportWidth: css('cdr-report-width', r.widthPx),
        reportRadius: css('cdr-report-radius', r.radiusPx),
        reportBorder: css('cdr-report-border', r.border.px),
        reportBorderColor: colorVar('cdr-report-border', paletteColor(r.border.color, 'el filete del reporte')),
        reportBorderOpacity: css('cdr-report-border-opacity', r.border.opacity * 100, '%'),
        reportGlowBlur: css('cdr-report-glow-blur', r.glow.blurPx),
        reportGlowOpacity: css('cdr-report-glow-opacity', r.glow.opacity * 100, '%'),
        accentColor: colorVar('cdr-accent', accentOf(intent.line))
      },
      stage: { src: stage.ref },
      platform: { src: platform.ref },
      panel: screen,
      meeting: {
        tool: meetingTool.src,
        kicker: text(meeting.kicker, 'Dónde es la reunión (`meeting.kicker`)'),
        title: text(meeting.title, 'La reunión (`meeting.title`)'),
        meta: text(meeting.meta, 'Cuándo es la reunión (`meeting.meta`)')
      },
      report: {
        kicker: text(report.kicker, 'Quién arma el reporte (`report.kicker`)'),
        title: text(report.title, 'El reporte (`report.title`)'),
        sample: text(report.sample, 'La procedencia de las cifras del reporte (`report.sample`, p. ej. «Datos de muestra»)')
      },
      kpis: kpis.map((kpi, i) => ({ value: text(kpi.value, `La cifra ${i + 1} del reporte`), label: text(kpi.label, `El rótulo de la cifra ${i + 1}`) })),
      cta: { text: text(report.action, 'La acción del lector (`report.action`)'), logo: logo.src, cursorScale: 1 },
      voice,
      body: evidenceHtml(content.body, 'none')
    },
    assets: [stage.asset, platform.asset, ...assets]
  }
}

export const contentDay: RecipeBuilder = ctx => {
  const layout = ctx.manifest.layout ?? 'clock'
  const own = ((ctx.recipe.layouts as Record<string, Record<string, unknown>> | undefined)?.[layout] ?? {}) as Record<string, unknown>
  const recipe: Record<string, unknown> = { ...ctx.recipe, ...own }
  const merged = { ...ctx, recipe }

  if (layout === 'clock') return contentDayClock(merged)
  if (layout === 'tools') return contentDayTools(merged)
  if (layout === 'live-progress') return contentDayProgress(merged)
  if (layout === 'live-results') return contentDayResults(merged)

  throw new SurfacePieceError(`\`content-day\` no tiene plantilla para la composición «${layout}».`, 'recipe-without-template')
}

/* ── decision-agenda: los cinco temas ───────────────────────────────────────────────────────────────────── */

export const decisionAgenda: RecipeBuilder = ({ intent, manifest, recipe }) => {
  const voice = voiceSlots(manifest)
  const rows = measured(recipe.rows as { widthPx: number; gapPx: number; ruleStrokePx: number; paddingTopPx: number; paddingBottomPx: number } | undefined, 'las filas de la agenda')
  const count = measured((recipe.list as { count?: number } | undefined)?.count, 'cuántos temas')
  const topics = (Array.isArray(intent.topics) ? intent.topics : []) as unknown[]

  if (topics.length !== count) throw new SurfacePieceError(`La agenda lleva ${count} temas (\`topics\`).`, 'invalid-intent')

  const chosen = selectedOf(intent, count, 'El tema que importa')
  const number = recipeType(recipe, 'listNumber')
  const topic = recipeType(recipe, 'listText')
  const list = measured(manifest.reserves?.find(r => r.band === 'list'), 'la reserva de la lista')
  const indicator = progressIndicatorLayer(manifest, intent.line, 'content', 'gl-ag')
  const selection = selectionSlot(manifest)

  return {
    slots: {
      frame: {
        line: intent.line,
        ...voiceFrame(manifest, recipe, 'ag'),
        listLeft: css('ag-list-left', Math.round(measured(list.inset, 'el inicio de la lista') * manifest.canvas.width)),
        listTop: css('ag-list-top', topOf(manifest, 'list')),
        listWidth: css('ag-list-width', rows.widthPx),
        rowGap: css('ag-row-gap', rows.gapPx),
        rule: css('ag-rule', rows.ruleStrokePx),
        padTop: css('ag-pad-top', rows.paddingTopPx),
        padBottom: css('ag-pad-bottom', rows.paddingBottomPx),
        numberPx: css('ag-number-px', px(number, 'el número')),
        numberWght: css('ag-number-wght', measured(number.weight, 'el peso del número'), ''),
        numberTracking: css('ag-number-tracking', tracking(number, 'el número'), 'em'),
        numberWidth: css('ag-number-width', measured(number.widthPx, 'el ancho del número')),
        topicPx: css('ag-topic-px', px(topic, 'el tema')),
        topicTracking: css('ag-topic-tracking', tracking(topic, 'el tema'), 'em'),
        topicChosenWght: css('ag-topic-chosen-wght', measured(topic.chosenWeight, 'el peso del tema elegido'), '')
      },
      indicator: { src: indicator.ref },
      voice,
      topics: topics.map((item, i) => ({ role: i + 1 === chosen ? 'lead' : 'rest', number: String(i + 1).padStart(2, '0'), topic: text(item, `El tema ${i + 1}`) })),
      ...(selection ? { selection: { ...selection, item: chosen } } : {})
    },
    assets: [indicator.asset]
  }
}

export const CONTENT_BUILDERS: Record<string, RecipeBuilder> = {
  'contact-sheet': contactSheet,
  'content-text': contentText,
  'content-bullets': contentBullets,
  'content-day': contentDay,
  'decision-agenda': decisionAgenda
}
