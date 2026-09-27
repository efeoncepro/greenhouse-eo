/**
 * Mapper puro: manifiesto de edición de Glitch → planes del Artifact Composer (TASK-1923). Sólo Glitch.
 *
 * - El autor nunca elige plantilla: la portada sale del contenido y de la plantilla de la semana anterior
 *   (`resolveCoverTemplate`), y cada lámina se pide por contentType (el selector del catálogo resuelve).
 * - Cada lámina se valida contra el contrato `efeonce.glitch-line` de AXIS antes de llegar al plan: una sola fuente de
 *   reglas (portada repetida, titular sin contraste, muletilla sin licencia…).
 * - No lee archivos: dice qué fotos hacen falta, a qué tamaño exacto y dónde se desarman en bytes
 *   (`GlitchAssetRequest`). El CLI las materializa y adjunta la falla con `attachFractures`.
 *
 * Sólo importa tipos del motor (`@/lib/artifact-composer/pure`) y paquetes AXIS: corre en cualquier runtime.
 */

import { validateGlitchLineIntent, type AxisGlitchLineIntent } from '@efeoncepro/axis-ui-contracts'

import type { CompositionPlanInput, SlotValues } from '@/lib/artifact-composer/pure'

import { GLITCH_BACK_NOTE, GLITCH_SECTION_LABEL, glitchShortDate, splitLastWord } from './copy'
import { parseGlitchEditionManifest, type GlitchEditionManifest, type GlitchNews } from './manifest'
import { GlitchPieceError, type GlitchAssetRequest, type GlitchEditionPlan, type GlitchIssue } from './types'

export { parseGlitchEditionManifest } from './manifest'
export * from './types'
export { computeByteFracture, paintByteFracture, fractureBand } from './byte-fracture'

type CoverTemplate = 'A' | 'B' | 'C'

const CANVAS_4X5 = { width: 1080, height: 1350 }
const COVER_PHOTO = { x: 0, y: 0, w: 1080, h: 660 }
const INTERIOR_PHOTO = { x: 0, y: 176, w: 1080, h: 450 }

const MOSAIC_CARDS = [
  { x: 88, y: 610, w: 436, h: 124 },
  { x: 556, y: 610, w: 436, h: 124 },
  { x: 88, y: 930, w: 436, h: 124 },
  { x: 556, y: 930, w: 436, h: 124 }
]

const MOSAIC_CARD_HEIGHT = 170
const LENS_DIAMETER = 220

/** Id de la pieza en `glitchLine.pieces` (AXIS) por contentType. */
export const GLITCH_PIECE_BY_CONTENT_TYPE: Record<string, string> = {
  'glitch.cover.a': 'portada-a',
  'glitch.cover.b': 'portada-b',
  'glitch.cover.c': 'portada-c',
  'glitch.interior': 'interior',
  'glitch.interior.opening': 'interior-noticia-1',
  'glitch.interior.lens': 'interior-lente',
  'glitch.back': 'contraportada'
}

export interface PlanGlitchEditionOptions {
  /** Id del artefacto (por defecto `glitch-<número>`). */
  artifactId?: string
  /**
   * Licencia de Guttery disponible para este render (la da el pack de fuentes). Sin ella, la portada B y la muletilla
   * de la contraportada no se componen (`font-license-missing`).
   */
  narratorLicenseStatus?: 'licensed' | 'pending'
}

/**
 * Plantilla de portada por contenido y rotación, en el orden de la norma §4.2 (A > B > C): A si la noticia de portada
 * trae una foto fuerte, B si hay un POV que pega solo, C si hay cuatro noticias del mismo peso. Nunca la de la semana
 * anterior. Sin candidatas, falla: lo corrige un humano cambiando contenido, nunca el composer.
 */
export const resolveCoverTemplate = (manifest: GlitchEditionManifest, options: PlanGlitchEditionOptions = {}): CoverTemplate => {
  const coverNews = manifest.news.find((n) => n.id === manifest.cover.newsId)
  const previous = manifest.previousEdition.coverTemplate
  const candidates: CoverTemplate[] = []

  if (coverNews?.photo.strong) candidates.push('A')
  if (manifest.cover.standalonePov && (options.narratorLicenseStatus ?? 'licensed') === 'licensed') candidates.push('B')
  if (manifest.cover.mosaic) candidates.push('C')

  const allowed = candidates.filter((c) => c !== previous)

  if (allowed.length === 0) {
    throw new GlitchPieceError(
      `Ninguna plantilla de portada sirve esta semana: el contenido califica para ${candidates.join(', ') || 'ninguna'} y la semana anterior fue ${previous}.`,
      'cover-rotation-unsatisfiable',
      [
        {
          code: 'cover-rotation-unsatisfiable',
          path: 'cover',
          message: 'Cambia el contenido de la portada (una foto fuerte, un POV que pegue solo o cuatro noticias del mismo peso) para que haya una plantilla distinta a la de la semana anterior.'
        }
      ]
    )
  }

  return allowed[0]
}

const newsById = (manifest: GlitchEditionManifest, id: string): GlitchNews => {
  const news = manifest.news.find((n) => n.id === id)

  if (!news) throw new GlitchPieceError(`Noticia desconocida: ${id}`, 'manifest-invalid', [{ code: 'field-invalid', message: `noticia desconocida: ${id}` }])

  return news
}

const licenseOf = (news: GlitchNews) => `${news.photo.license.kind}:${news.photo.license.ref}`

type Box = { x: number; y: number; w: number; h: number }

/** Rostros de la foto en px del lienzo (la foto ocupa `box`). */
const faceBoxes = (box: Box, regions: GlitchNews['photo']['faceRegions']): Box[] =>
  regions.map((r) => ({ x: Math.round(box.x + r.x * box.w), y: Math.round(box.y + r.y * box.h), w: Math.round(r.w * box.w), h: Math.round(r.h * box.h) }))

const outletOf = (news: GlitchNews) => `${news.outlet} · ${glitchShortDate(news.date)}`

const punchParts = (punch: string) => {
  const { lead, last } = splitLastWord(punch)

  return lead ? { punchLead: lead, punchLast: last } : { punchLast: last }
}

interface Slide {
  slideId: string
  contentType: string
  slots: SlotValues
  /** Datos para validar la lámina contra el contrato AXIS (no viajan al render). */
  intent: AxisGlitchLineIntent
}

export const planGlitchEdition = (input: unknown, options: PlanGlitchEditionOptions = {}): GlitchEditionPlan => {
  const manifest = parseGlitchEditionManifest(input)
  const edition = String(manifest.edition.number)
  const previous = manifest.previousEdition.coverTemplate === 'none' ? null : manifest.previousEdition.coverTemplate
  const cover = resolveCoverTemplate(manifest, options)
  const assets: GlitchAssetRequest[] = []

  const photo = (ref: string, news: GlitchNews, fit: Box, slideIds: string[], clip?: Box) => {
    assets.push({
      ref,
      kind: 'photo',
      path: news.photo.file,
      fit: { width: fit.w, height: fit.h },
      treatment: 'duotone',
      fracture: { slideIds, box: fit, edge: news.photo.fractureEdge, faceRegions: news.photo.faceRegions, clip, canvas: CANVAS_4X5 }
    })

    return `asset-ref:${ref}`
  }

  const coverNews = newsById(manifest, manifest.cover.newsId)
  const lines = manifest.cover.lines.map((line) => ({ section: GLITCH_SECTION_LABEL[newsById(manifest, line.newsId).section], text: line.text }))
  const slides: Slide[] = []

  // ─── Portada ───
  if (cover === 'A') {
    slides.push({
      slideId: 'cover',
      contentType: 'glitch.cover.a',
      slots: {
        photo: { src: photo('photo:cover', coverNews, COVER_PHOTO, ['cover']), alt: `Foto de la noticia de portada: ${coverNews.headline}` },
        credit: coverNews.photo.credit,
        photoLicense: licenseOf(coverNews),
        faces: JSON.stringify(faceBoxes(COVER_PHOTO, coverNews.photo.faceRegions)),
        edition,
        outlet: outletOf(coverNews),
        headline: { entry: manifest.cover.headline.entry, ...punchParts(manifest.cover.headline.punch) },
        lines,
        previousCoverTemplate: manifest.previousEdition.coverTemplate
      },
      intent: { piece: 'portada-a', previousCoverTemplate: previous, faces: faceBoxes(COVER_PHOTO, coverNews.photo.faceRegions), headline: { entry: manifest.cover.headline.entry, close: manifest.cover.headline.punch } }
    })
  } else if (cover === 'B') {
    const pov = manifest.cover.standalonePov!

    slides.push({
      slideId: 'cover',
      contentType: 'glitch.cover.b',
      slots: {
        edition,
        ...(manifest.cover.muletilla ? { muletilla: manifest.cover.muletilla } : {}),
        headline: { entry: pov.entry, punch: pov.punch },
        lines,
        previousCoverTemplate: manifest.previousEdition.coverTemplate
      },
      intent: {
        piece: 'portada-b',
        previousCoverTemplate: previous,
        headline: { entry: pov.entry, close: pov.punch },
        ...(manifest.cover.muletilla ? { narrator: { text: manifest.cover.muletilla } } : {})
      }
    })
  } else {
    const ids = manifest.cover.mosaic!

    const cards = ids.map((id, i) => {
      const news = newsById(manifest, id)
      const card = MOSAIC_CARDS[i]

      return {
        news,
        slot: {
          src: photo(`photo:mosaic-${id}`, news, card, ['cover'], { ...card, h: MOSAIC_CARD_HEIGHT }),
          alt: `Foto de la noticia: ${news.headline}`,
          section: GLITCH_SECTION_LABEL[news.section],
          pov: `${news.pov.entry} ${news.pov.punch}`
        }
      }
    })

    const mosaicFaces = cards.flatMap((c, i) => faceBoxes(MOSAIC_CARDS[i], c.news.photo.faceRegions))

    slides.push({
      slideId: 'cover',
      contentType: 'glitch.cover.c',
      slots: {
        edition,
        headline: { entry: manifest.cover.headline.entry, punch: manifest.cover.headline.punch },
        ...Object.fromEntries(cards.map((c, i) => [`card${i + 1}`, c.slot])),
        credit: `Fotos: ${[...new Set(cards.map((c) => c.news.photo.credit.replace(/^Fotos?:\s*/i, '')))].join(' · ')}`,
        photoLicense: cards.map((c) => licenseOf(c.news)).join(' '),
        faces: JSON.stringify(mosaicFaces),
        previousCoverTemplate: manifest.previousEdition.coverTemplate
      },
      intent: { piece: 'portada-c', previousCoverTemplate: previous, faces: mosaicFaces, headline: { entry: manifest.cover.headline.entry, close: manifest.cover.headline.punch } }
    })
  }

  // ─── Las ocho noticias ───
  manifest.news.forEach((news, index) => {
    const step = String(index + 1)
    const slideId = news.id
    const opening = index === 0

    if (opening && news.lens) {
      throw new GlitchPieceError('La noticia 1 abre con «El micrófono se abre»: la lente va en otra noticia.', 'manifest-invalid', [
        { code: 'field-invalid', path: 'news[0].lens', message: 'La lámina de la noticia 1 no admite la lente; quítala o mueve la noticia.' }
      ])
    }

    const faces = faceBoxes(INTERIOR_PHOTO, news.photo.faceRegions)

    const common = {
      edition,
      photo: { src: photo(`photo:${news.id}`, news, INTERIOR_PHOTO, [slideId]), alt: `Foto de la noticia: ${news.headline}` },
      credit: news.photo.credit,
      photoLicense: licenseOf(news),
      faces: JSON.stringify(faces),
      newsNumber: step,
      outlet: outletOf(news),
      section: GLITCH_SECTION_LABEL[news.section],
      headline: news.headline,
      why: news.why,
      progress: { step, label: `${step} / 8` }
    }

    if (news.lens) {
      const r = news.lens.region

      assets.push({ ref: `photo:${news.id}-lens`, kind: 'lens', path: news.photo.file, fit: { width: INTERIOR_PHOTO.w, height: INTERIOR_PHOTO.h }, region: r, diameter: LENS_DIAMETER })
      slides.push({
        slideId,
        contentType: 'glitch.interior.lens',
        slots: {
          ...common,
          pov: { entry: news.pov.entry, punch: news.pov.punch },
          lens: {
            src: `asset-ref:photo:${news.id}-lens`,
            x: String(Math.round(INTERIOR_PHOTO.x + (r.x + r.w / 2) * INTERIOR_PHOTO.w)),
            y: String(Math.round(INTERIOR_PHOTO.y + (r.y + r.h / 2) * INTERIOR_PHOTO.h))
          }
        },
        intent: { piece: 'interior-lente', spheres: ['lens'], faces, headline: { entry: news.pov.entry, close: news.pov.punch } }
      })

      return
    }

    slides.push({
      slideId,
      contentType: opening ? 'glitch.interior.opening' : 'glitch.interior',
      slots: { ...common, pov: { entry: news.pov.entry, ...punchParts(news.pov.punch) } },
      intent: { piece: opening ? 'interior-noticia-1' : 'interior', faces, headline: { entry: news.pov.entry, close: news.pov.punch } }
    })
  })

  // ─── Contraportada ───
  slides.push({
    slideId: 'back',
    contentType: 'glitch.back',
    slots: { edition, headline: { entry: 'El micrófono', punch: 'se cierra' }, closingLine: manifest.back.closingLine, note: GLITCH_BACK_NOTE },
    intent: { piece: 'contraportada', headline: { entry: 'El micrófono', close: 'se cierra' }, narrator: { text: manifest.back.closingLine } }
  })

  // ─── Contrato AXIS: cada lámina se valida antes de llegar al plan ───
  const issues: GlitchIssue[] = slides.flatMap((slide) =>
    validateGlitchLineIntent({ franchise: 'glitch', ...slide.intent }, { narratorLicenseStatus: options.narratorLicenseStatus }).map((issue) => ({
      code: issue.code,
      path: `${slide.slideId}${issue.path ? `.${issue.path}` : ''}`,
      message: issue.message
    }))
  )

  if (issues.some((i) => i.code === 'narrator-font-unlicensed')) {
    throw new GlitchPieceError('Guttery no tiene licencia para este render: la muletilla del narrador no se compone.', 'font-license-missing', issues)
  }

  if (issues.length > 0) throw new GlitchPieceError(`El contrato efeonce.glitch-line rechaza ${issues.length} punto(s) de la edición.`, 'contract-issues', issues)

  const artifactId = options.artifactId ?? `glitch-${edition}`

  const toPlan = (list: Slide[], suffix: string): CompositionPlanInput => ({
    artifactId: `${artifactId}-${suffix}`,
    slides: list.map(({ slideId, contentType, slots }) => ({ slideId, contentType, slots }))
  })

  const carouselSlides = slides
  const stillIds = new Set(manifest.outputs.stills.map((o) => (o === 'cover' ? 'cover' : o === 'back' ? 'back' : o.startsWith('interior:') ? o.slice('interior:'.length) : o)))
  const unsupported = [...stillIds].filter((id) => !slides.some((s) => s.slideId === id))

  if (unsupported.length > 0) {
    throw new GlitchPieceError(`Piezas sueltas todavía sin plantilla: ${unsupported.join(', ')}.`, 'manifest-invalid', unsupported.map((id) => ({ code: 'field-invalid', path: 'outputs.stills', message: `sin plantilla: ${id}` })))
  }

  return {
    edition: manifest.edition.number,
    coverTemplate: cover,
    carousel: { catalog: 'glitch-carousel', plan: toPlan(carouselSlides, 'carousel') },
    stills: { catalog: 'glitch-stills', plan: toPlan(slides.filter((s) => stillIds.has(s.slideId)), 'stills') },
    overlays: { catalog: 'glitch-overlays', plan: toPlan([], 'overlays') },
    assets
  }
}

/**
 * Adjunta la falla ya pintada a las láminas del plan (el CLI la calcula con la foto procesada: `computeByteFracture`
 * + `paintByteFracture`). Pura: devuelve un plan nuevo. Las celdas de varias fotos de una lámina (el mosaico) se suman.
 */
export const attachFractures = (plan: CompositionPlanInput, cellsBySlide: Readonly<Record<string, readonly unknown[]>>): CompositionPlanInput => ({
  ...plan,
  slides: plan.slides.map((slide) => (cellsBySlide[slide.slideId] ? { ...slide, slots: { ...slide.slots, bytes: JSON.stringify(cellsBySlide[slide.slideId]) } } : slide))
})
