/**
 * Marketing con Manzanitas — del intent del contrato al plan del Artifact Composer (TASK-1939). Sólo piezas de MCM: el
 * registro complementa La órbita y nunca se mezcla con Glitch.
 *
 * El intent es el del contrato `efeonce.manzanitas-register` (@efeoncepro/axis-ui-contracts): el autor declara piezas,
 * voz y datos; nunca plantilla, coordenadas ni colores. Este módulo:
 *   1. resuelve el intent con el contrato (falla cerrado con sus códigos si no resuelve);
 *   2. traduce cada lámina resuelta a un `contentType` y sus slots (la plantilla la elige el selector del catálogo);
 *   3. pide los assets que el comando materializa: fotos al tamaño del lienzo, la Lente de La órbita con la foto adentro
 *      y la órbita del paso (ambas con `@efeoncepro/axis-graphic-line`).
 *
 * Es puro (sin sharp, sin render): lo pueden usar el comando y, después, el worker.
 */

import { efeonceGraphicLine as GL, manzanitasRegister as M } from '@efeoncepro/axis-tokens'
import { resolveManzanitasRegisterIntent, type AxisManzanitasRegisterIntent } from '@efeoncepro/axis-ui-contracts'
import { lensRecipe, orbitSvg } from '@efeoncepro/axis-graphic-line'

import type { CompositionPlanInput } from '@/lib/artifact-composer/pure'

export type ManzanitasCatalogName = 'manzanitas-carousel' | 'manzanitas-stills'

export type ManzanitasPieceErrorCode = 'intent-invalid' | 'contract-issues' | 'photo-missing' | 'dense-text-invalid' | 'piece-not-approved' | 'carousel-too-heavy'

export interface ManzanitasIssue {
  code: string
  path?: string
  message: string
}

export class ManzanitasPieceError extends Error {
  constructor(
    message: string,
    readonly code: ManzanitasPieceErrorCode,
    readonly issues: readonly ManzanitasIssue[] = []
  ) {
    super(message)
    this.name = 'ManzanitasPieceError'
  }
}

/** Lo que el comando materializa antes de componer. `ref` es la clave de `externalAssets` (sin `asset-ref:`). */
export type ManzanitasAssetRequest =
  | { kind: 'photo'; ref: string; path: string; width: number; height: number }
  | { kind: 'lens'; ref: string; path: string; width: number; height: number; svg: string; placeholder: string }
  | { kind: 'orbit'; ref: string; svg: string }

export interface ManzanitasCatalogPlan {
  catalog: ManzanitasCatalogName
  plan: CompositionPlanInput
}

export interface ManzanitasCompositionPlan {
  channel: AxisManzanitasRegisterIntent['channel']
  topicLine: string
  /** El documento del carrusel (PDF); sólo en el canal carrusel. */
  carousel: ManzanitasCatalogPlan | null
  /** Las láminas sueltas (PNG): todas las del carrusel o la pieza única de los otros canales. */
  stills: ManzanitasCatalogPlan
  assets: ManzanitasAssetRequest[]
}

/** Campos que el intent admite además de los del contrato: la foto real y los rótulos del gráfico. */
export interface ManzanitasSlideExtras {
  photo?: { path?: string; alt?: string }
  chart?: { caption?: string; figureLabel?: string; columnLabels?: [string, string]; keyLabels?: [string, string]; rateHeader?: string }
}

const CONTENT_TYPE: Record<string, string> = {
  'cover-pizarra': 'mcm.cover.pizarra',
  'cover-pizarra-swipe-response': 'mcm.cover.pizarra.response',
  'cover-escena': 'mcm.cover.escena',
  'step-pizarra': 'mcm.step',
  'data-apples-of-ten': 'mcm.data.apples',
  'interior-escena': 'mcm.interior.escena',
  'interior-lente': 'mcm.interior.lente',
  'dense-concept': 'mcm.dense.concept',
  'dense-comparison': 'mcm.dense.comparison',
  'dense-steps': 'mcm.dense.steps',
  'back-cover-a': 'mcm.back.a',
  'story-escena': 'mcm.story.escena',
  'story-close': 'mcm.story.close',
  'blog-banner-escena': 'mcm.blog.banner',
  'youtube-thumbnail': 'mcm.youtube.thumbnail',
  'youtube-close': 'mcm.youtube.close',
  'podcast-cover': 'mcm.podcast.cover'
}

/** Campos del slot `theme` de cada plantilla (el contrato de slots los exige exactos). */
const THEME_FIELDS: Record<string, readonly string[]> = {
  'mcm.cover.pizarra': ['line', 'tone', 'masthead', 'signature', 'swipe', 'apple', 'sphereGap'],
  'mcm.cover.pizarra.response': ['line', 'tone', 'masthead', 'signature', 'swipe', 'apple', 'sphereGap'],
  'mcm.cover.escena': ['line', 'tone', 'masthead', 'signature', 'swipe', 'sphereGap'],
  'mcm.step': ['line', 'tone', 'masthead', 'signature', 'swipe', 'sphereGap'],
  'mcm.data.apples': ['line', 'tone', 'masthead', 'signature', 'swipe', 'sphereGap'],
  'mcm.interior.escena': ['line', 'tone', 'masthead', 'signature', 'swipe', 'sphereGap'],
  'mcm.interior.lente': ['line', 'tone', 'masthead', 'signature', 'swipe'],
  'mcm.chart.voice': ['line', 'tone', 'masthead', 'signature', 'swipe', 'sphereGap'],
  'mcm.chart.question': ['line', 'tone', 'masthead', 'signature', 'swipe'],
  'mcm.dense': ['line', 'tone', 'masthead', 'signature', 'swipe', 'sphereGap'],
  'mcm.back.a': ['line', 'tone', 'masthead', 'signature', 'apple', 'sphereGap'],
  'mcm.story.escena': ['line', 'tone', 'masthead', 'signature', 'sphereGap'],
  'mcm.story.close': ['line', 'tone', 'masthead', 'signature', 'sphereGap'],
  'mcm.blog.banner': ['line', 'tone', 'masthead', 'signature', 'sphereGap'],
  'mcm.youtube.thumbnail': ['line', 'tone', 'masthead', 'signature', 'sphereGap'],
  'mcm.youtube.close': ['line', 'tone', 'signature'],
  'mcm.podcast.cover': ['line', 'tone', 'masthead', 'signature', 'apple', 'sphereGap']
}

/** La órbita del paso: medida en el canvas v39 (tablero de paso); el token todavía no la publica. */
export const MANZANITAS_STEP_ORBIT = { cx: 640, cy: 500, r: 324 } as const

const LENS_PHOTO_PLACEHOLDER = '__MCM_LENS_PHOTO__'

/** Las láminas que cuentan como pasos del carrusel («Paso n de N»): el paso en Pizarra, la Escena y la Lente interiores. */
const STEP_PIECES = new Set(['step-pizarra', 'interior-escena', 'interior-lente'])

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Texto del autor con énfasis en `**así**`: se escapa todo y sólo el énfasis vuelve como `<strong>`. */
export const emphasize = (s: string): string => escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

/** El aire antes de la esfera según la última letra de la respuesta (`efeonceGraphicLine.sphere.opticalGapEm`). */
export const sphereGapOf = (answer: string): string => {
  const last = answer.trim().slice(-1).toLowerCase()
  const byLetter = GL.sphere.opticalGapEm as Record<string, number>

  return String(byLetter[last] ?? GL.sphere.defaultGapEm)
}

const templateKey = (contentType: string): string => {
  if (contentType === 'mcm.chart.measure' || contentType === 'mcm.chart.trend') return 'mcm.chart.question'
  if (contentType.startsWith('mcm.chart.')) return 'mcm.chart.voice'
  if (contentType.startsWith('mcm.dense.')) return 'mcm.dense'

  return contentType
}

type ResolvedSlide = Extract<ReturnType<typeof resolveManzanitasRegisterIntent>, { status: 'resolved' }>['slides'][number]

const canvasOf = (piece: string) => {
  const p = (M.pieces as Record<string, { canvas: keyof typeof M.canvases }>)[piece]

  return M.canvases[p.canvas]
}

const denseSlots = (template: string, content: Record<string, unknown> | null, path: string): Record<string, unknown> => {
  const fail = (message: string): never => {
    throw new ManzanitasPieceError(message, 'dense-text-invalid', [{ code: 'dense-text-invalid', path, message }])
  }

  if (!content) return fail('La lámina de texto denso no trae su contenido.')

  const items = (list: unknown, n: number) => {
    if (!Array.isArray(list) || list.length !== n) fail(`Se esperan ${n} elementos con título y cuerpo.`)

    return (list as { title?: string; body?: string }[]).map((x) => {
      if (typeof x?.title !== 'string' || typeof x?.body !== 'string') fail('Cada elemento lleva título y cuerpo.')

      return { title: x.title, body: x.body }
    })
  }

  if (template === 'concept-three-points') {
    if (typeof content.paragraph !== 'string') fail('Falta el párrafo del concepto.')

    return { paragraph: emphasize(content.paragraph as string), points: items(content.points, 3) }
  }

  if (template === 'comparison-two-columns') {
    const cols = content.columns as unknown
    const rows = content.rows as unknown

    if (!Array.isArray(cols) || cols.length !== 2) fail('La comparación lleva dos columnas.')
    if (!Array.isArray(rows) || rows.length !== 4) fail('La comparación lleva cuatro filas.')
    if (typeof content.closer !== 'string') fail('Falta el remate de la comparación.')

    return {
      columns: { a: String((cols as string[])[0]), b: String((cols as string[])[1]) },
      rows: (rows as unknown[]).map((r) => {
        const row = Array.isArray(r) ? { label: r[0], a: r[1], b: r[2] } : (r as { label?: string; a?: string; b?: string })

        if (typeof row.label !== 'string' || typeof row.a !== 'string' || typeof row.b !== 'string') fail('Cada fila lleva etiqueta y las dos celdas.')

        return { label: row.label, a: row.a, b: row.b }
      }),
      closer: content.closer
    }
  }

  return { steps: items(content.steps, 4) }
}

/**
 * Traduce un intent del contrato a los planes de los dos catálogos. Lanza `ManzanitasPieceError` con los códigos del
 * contrato cuando el intent no resuelve: nunca compone algo fuera del registro.
 */
export const planManzanitasIntent = (intent: AxisManzanitasRegisterIntent & { artifactId?: string }): ManzanitasCompositionPlan => {
  const manifest = resolveManzanitasRegisterIntent(intent)

  if (manifest.status !== 'resolved') {
    throw new ManzanitasPieceError(
      `El intent no cumple el registro Marketing con Manzanitas (${manifest.issues.length} issue(s)).`,
      'contract-issues',
      manifest.issues.map((i) => ({ code: i.code, path: i.path, message: i.message }))
    )
  }

  const line = manifest.topicLine.key
  const lineInfo = GL.lines.find((l) => l.key === line)!
  const slides = manifest.slides as readonly ResolvedSlide[]
  const extras = intent.slides as unknown as ManzanitasSlideExtras[]
  const assets: ManzanitasAssetRequest[] = []
  const stepIndex = slides.map((s) => s.piece.id).filter((id) => STEP_PIECES.has(id))
  let stepSeen = 0

  const planSlides = slides.map((slide, i) => {
    const pieceId = slide.piece.id
    const slideId = `s${String(i + 1).padStart(2, '0')}-${pieceId}`
    const path = `slides[${i}]`
    const contentType = pieceId.startsWith('chart-') ? `mcm.chart.${slide.chart?.recipe ?? pieceId.slice(6)}` : CONTENT_TYPE[pieceId]
    const tone = slide.surface as 'paper' | 'navy'
    const voice = slide.voice
    const answer = voice?.answer ?? ''
    const extra = extras[i] ?? {}

    const themeValues: Record<string, string> = {
      line,
      tone,
      masthead: slide.masthead ? (slide.masthead.withApple ? `${slide.masthead.assetId}-${line}` : slide.masthead.assetId) : '',
      signature: tone === 'navy' ? 'efeonce-logo-negative' : 'efeonce-logo-positive',
      swipe: slide.swipe ? `swipe-${slide.swipe.state}-${tone}-${line}` : 'none',
      apple: `manzanitas-apple-${tone}-${line}`,
      sphereGap: sphereGapOf(answer)
    }

    const theme = Object.fromEntries(THEME_FIELDS[templateKey(contentType)].map((f) => [f, themeValues[f]]))
    const slots: Record<string, unknown> = { theme }

    if (voice && templateKey(contentType) !== 'mcm.chart.question' && contentType !== 'mcm.youtube.close') {
      const chartAnswer = slide.chart && slide.chart.answer?.kind === 'numeric' ? slide.chart.answer.text : null

      slots.voice = { question: voice.question ?? '', answer: chartAnswer ?? answer }
    }

    if (templateKey(contentType) === 'mcm.chart.question') slots.question = voice?.question ?? ''

    const sub = voice?.sub ?? null

    if (sub && ['mcm.step', 'mcm.back.a', 'mcm.story.close', 'mcm.blog.banner'].includes(contentType)) {
      const lead = M.backCover.voice.sub.lead

      slots.sub = contentType === 'mcm.back.a' && sub.startsWith(lead) && !sub.includes('**') ? `${escapeHtml(lead)} <strong>${escapeHtml(sub.slice(lead.length).trim())}</strong>` : emphasize(sub)
    }

    // La portada del pódcast lleva el episodio en la bajada (`voice.sub`): un salto de línea separa episodio e invitado.
    if (contentType === 'mcm.podcast.cover') slots.episode = emphasize(sub ?? '').replace(/\n/g, '<br>')

    if (contentType === 'mcm.back.a' || contentType === 'mcm.story.close' || contentType === 'mcm.youtube.close') slots.slogan = { word: lineInfo.sloganWord }

    if (STEP_PIECES.has(pieceId)) {
      stepSeen += 1

      if (contentType === 'mcm.step') slots.step = { numeral: String(stepSeen).padStart(2, '0'), label: `Paso ${stepSeen} de ${stepIndex.length}` }
      if (contentType === 'mcm.interior.escena') slots.stepLabel = `Paso ${stepSeen} de ${stepIndex.length}`
    }

    if (slide.photo) {
      const photoPath = extra.photo?.path
      const alt = extra.photo?.alt ?? (intent.slides[i] as { photo?: { alt?: string } }).photo?.alt

      if (!photoPath) throw new ManzanitasPieceError('La lámina con foto no trae la foto.', 'photo-missing', [{ code: 'photo-missing', path: `${path}.photo.path`, message: 'Declara photo.path con el archivo de la foto (registro cine).' }])
      if (!alt) throw new ManzanitasPieceError('La foto no trae texto alternativo.', 'photo-missing', [{ code: 'photo-missing', path: `${path}.photo.alt`, message: 'Declara photo.alt: qué se ve en la foto.' }])

      const canvas = canvasOf(pieceId)

      if (contentType === 'mcm.interior.lente') {
        const recipe = lensRecipe('post', { photoId: 'photo', photoSrc: LENS_PHOTO_PLACEHOLDER, alt, question: voice?.question ?? '', answer, line, surface: 'dark' })
        const svg = recipe.svg.replace(/<image data-axis-part="signature"[^>]*\/>/, '')

        assets.push({ kind: 'lens', ref: `lens:${slideId}`, path: photoPath, width: canvas.w, height: canvas.h, svg, placeholder: LENS_PHOTO_PLACEHOLDER })
        slots.lens = { src: `asset-ref:lens:${slideId}`, alt }
      } else {
        assets.push({ kind: 'photo', ref: `photo:${slideId}`, path: photoPath, width: canvas.w, height: canvas.h })
        slots.photo = { src: `asset-ref:photo:${slideId}`, alt }
      }
    }

    if (contentType === 'mcm.step') {
      const { svg } = orbitSvg({ width: 1080, height: 1350, circle: MANZANITAS_STEP_ORBIT, line, surface: 'light', channel: 'social', halo: false })

      assets.push({ kind: 'orbit', ref: `orbit:${slideId}`, svg })
      slots.orbit = { src: `asset-ref:orbit:${slideId}` }
    }

    if (contentType === 'mcm.data.apples') {
      const data = slide.dataValue

      slots.apples = { count: String(data?.value ?? 0), label: `${data?.value ?? 0} de 10 manzanas destacadas` }
      slots.sub = `${data?.illustrative ? `${M.charts.grammar.illustrativeMark} · ` : ''}Fuente: <strong>${escapeHtml(data?.source ?? '')}</strong>`
    }

    if (slide.chart) {
      const intentChart = (intent.slides[i] as { chart?: Record<string, unknown> }).chart ?? {}
      // El dato del gráfico es el del contrato sin la receta (viaja aparte) ni los rótulos (van como opciones del painter).
      const { caption, figureLabel, columnLabels, keyLabels, rateHeader, ...rest } = intentChart as Record<string, unknown>
      const data = Object.fromEntries(Object.entries(rest).filter(([key]) => key !== 'recipe'))
      const options = Object.fromEntries(Object.entries({ caption, figureLabel, columnLabels, keyLabels, rateHeader }).filter(([, v]) => v !== undefined))

      slots.chart = JSON.stringify({ recipe: slide.chart.recipe, line, surface: tone, data, options })
    }

    if (slide.denseText) Object.assign(slots, denseSlots(slide.denseText.template, slide.denseText.content as Record<string, unknown> | null, `${path}.denseText`))

    return { slideId, contentType, slots }
  })

  const artifactId = intent.artifactId ?? `MCM-${intent.channel}-${line}`
  const stills: ManzanitasCatalogPlan = { catalog: 'manzanitas-stills', plan: { artifactId, slides: planSlides as CompositionPlanInput['slides'] } }

  return {
    channel: intent.channel,
    topicLine: line,
    carousel: intent.channel === 'carousel' ? { catalog: 'manzanitas-carousel', plan: { artifactId, slides: planSlides as CompositionPlanInput['slides'] } } : null,
    stills,
    assets
  }
}
