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
type Box = { x: number; y: number; w: number; h: number }

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

type Canvas = { width: number; height: number }

const CANVAS_16X9 = { width: 1920, height: 1080 }
const CANVAS_1X1 = { width: 1080, height: 1080 }
const CANVAS_NEWS = { width: 1600, height: 900 }
const CANVAS_9X16 = { width: 1080, height: 1920 }
const CANVAS_THUMB = { width: 1280, height: 720 }

/** Huecos de foto de las piezas sueltas (medidos en el canvas; los mismos que declara cada plantilla). */
const BLOG_PHOTO = { x: 820, y: 0, w: 1100, h: 800 }
const BLOG_CARDS = [0, 1, 2, 3].map((i) => ({ x: 110 + i * 433, y: 486, w: 400, h: 220 }))
const BLOG_CARD_CLIP = 270
const SQUARE_PHOTO = { x: 0, y: 0, w: 1080, h: 500 }

const SQUARE_CARDS = [
  { x: 88, y: 452, w: 436, h: 104 },
  { x: 556, y: 452, w: 436, h: 104 },
  { x: 88, y: 720, w: 436, h: 104 },
  { x: 556, y: 720, w: 436, h: 104 }
]

const SQUARE_CARD_CLIP = 150
const NEWS_PHOTO = { x: 0, y: 0, w: 1600, h: 600 }
const REEL_HOST = { x: 0, y: 900, w: 1080, h: 1020 }
const THUMB_HOST = { x: 700, y: 0, w: 580, h: 720 }

/** Un borde de la foto que se rompe: el borde por defecto es el que declara la noticia (`fractureEdge`). */
interface FracturePart {
  edge?: 'bottom' | 'top' | 'left' | 'right'
  profile: 'band' | 'side' | 'host' | 'card'
  clip?: Box
}

export interface PlanGlitchEditionOptions {
  /** Id del artefacto (por defecto `glitch-<número>`). */
  artifactId?: string
  /**
   * Licencia de Guttery disponible para este render (la da el pack de fuentes). Sin ella, la portada B y la muletilla
   * de la contraportada no se componen (`font-license-missing`).
   */
  narratorLicenseStatus?: 'licensed' | 'pending'
  /**
   * Tamaño original de cada foto (por su ruta en el manifiesto). Los rostros y la región de la lente se declaran sobre la
   * foto ORIGINAL; la foto se recorta centrada para llenar su hueco (cover), así que el mapper los traslada a ese
   * recorte. Sin el tamaño (pruebas), se asume que la foto ya tiene la proporción del hueco.
   */
  photoSizes?: Readonly<Record<string, { width: number; height: number }>>
}

type Region = { x: number; y: number; w: number; h: number }

/**
 * Lleva una región normalizada a la foto original al recorte centrado que llena `fit` (cover, como el materializador).
 * Devuelve `null` si la región queda entera fuera del recorte; la recorta al borde si queda en parte.
 */
export const fitRegion = (region: Region, source: { width: number; height: number }, fit: { width: number; height: number }): Region | null => {
  const scale = Math.max(fit.width / source.width, fit.height / source.height)
  const ox = (source.width * scale - fit.width) / 2
  const oy = (source.height * scale - fit.height) / 2
  const x0 = (region.x * source.width * scale - ox) / fit.width
  const y0 = (region.y * source.height * scale - oy) / fit.height
  const x1 = ((region.x + region.w) * source.width * scale - ox) / fit.width
  const y1 = ((region.y + region.h) * source.height * scale - oy) / fit.height
  const [cx0, cy0, cx1, cy1] = [Math.max(0, x0), Math.max(0, y0), Math.min(1, x1), Math.min(1, y1)]

  if (cx1 <= cx0 || cy1 <= cy0) return null

  return { x: cx0, y: cy0, w: cx1 - cx0, h: cy1 - cy0 }
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

/** Rostros de la foto en px del lienzo (la foto ocupa `box`). */
const faceBoxes = (box: Box, regions: readonly Region[]): Box[] =>
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

  /** Las regiones de una foto, llevadas al recorte de su hueco. */
  const regionsIn = (file: string, regions: readonly Region[], box: Box): Region[] => {
    const source = options.photoSizes?.[file]

    return source ? regions.flatMap((r) => fitRegion(r, source, { width: box.w, height: box.h }) ?? []) : [...regions]
  }

  const facesOf = (news: GlitchNews, box: Box) => faceBoxes(box, regionsIn(news.photo.file, news.photo.faceRegions, box))

  /** Pide una foto de noticia al tamaño exacto de su hueco, con su falla (el perfil y el borde los fija la plantilla). */
  const photo = (ref: string, news: GlitchNews, box: Box, canvas: Canvas, slideIds: string[], parts: FracturePart[]) => {
    assets.push({
      ref,
      kind: 'photo',
      path: news.photo.file,
      fit: { width: box.w, height: box.h },
      treatment: 'duotone',
      fractures: parts.map((p) => ({ slideIds, box, edge: p.edge ?? news.photo.fractureEdge, profile: p.profile, faceRegions: regionsIn(news.photo.file, news.photo.faceRegions, box), clip: p.clip, canvas }))
    })

    return `asset-ref:${ref}`
  }

  const coverNews = newsById(manifest, manifest.cover.newsId)
  const lines = manifest.cover.lines.map((line) => ({ section: GLITCH_SECTION_LABEL[newsById(manifest, line.newsId).section], text: line.text }))
  const coverHeadline = manifest.cover.headline
  const coverIntent = { entry: coverHeadline.entry, close: coverHeadline.punch }
  const muletilla: SlotValues = manifest.cover.muletilla ? { muletilla: manifest.cover.muletilla } : {}
  const narrator = manifest.cover.muletilla ? { narrator: { text: manifest.cover.muletilla } } : {}
  const slides: Slide[] = []

  /** Las cuatro tarjetas del mosaico (portada C y sus versiones de blog), cada una con su foto recortada a la tarjeta. */
  const mosaic = (prefix: string, boxes: Box[], clipHeight: number, canvas: Canvas, slideId: string, profile: FracturePart['profile']) => {
    const cards = manifest.cover.mosaic!.map((id, i) => {
      const news = newsById(manifest, id)
      const box = boxes[i]

      return {
        news,
        slot: {
          src: photo(`photo:${prefix}-${id}`, news, box, canvas, [slideId], [{ edge: 'bottom', profile, clip: { ...box, h: clipHeight } }]),
          alt: `Foto de la noticia: ${news.headline}`,
          section: GLITCH_SECTION_LABEL[news.section],
          pov: `${news.pov.entry} ${news.pov.punch}`
        }
      }
    })

    const faces = cards.flatMap((c, i) => facesOf(c.news, boxes[i]))

    return {
      faces,
      slots: {
        ...Object.fromEntries(cards.map((c, i) => [`card${i + 1}`, c.slot])),
        credit: `Fotos: ${[...new Set(cards.map((c) => c.news.photo.credit.replace(/^Fotos?:\s*/i, '')))].join(' · ')}`,
        photoLicense: cards.map((c) => licenseOf(c.news)).join(' '),
        faces: JSON.stringify(faces)
      }
    }
  }

  // ─── Portada ───
  if (cover === 'A') {
    slides.push({
      slideId: 'cover',
      contentType: 'glitch.cover.a',
      slots: {
        photo: { src: photo('photo:cover', coverNews, COVER_PHOTO, CANVAS_4X5, ['cover'], [{ profile: 'band' }]), alt: `Foto de la noticia de portada: ${coverNews.headline}` },
        credit: coverNews.photo.credit,
        photoLicense: licenseOf(coverNews),
        faces: JSON.stringify(facesOf(coverNews, COVER_PHOTO)),
        edition,
        outlet: outletOf(coverNews),
        headline: { entry: coverHeadline.entry, ...punchParts(coverHeadline.punch) },
        lines,
        previousCoverTemplate: manifest.previousEdition.coverTemplate
      },
      intent: { piece: 'portada-a', previousCoverTemplate: previous, faces: facesOf(coverNews, COVER_PHOTO), headline: coverIntent }
    })
  } else if (cover === 'B') {
    const pov = manifest.cover.standalonePov!

    slides.push({
      slideId: 'cover',
      contentType: 'glitch.cover.b',
      slots: { edition, ...muletilla, headline: { entry: pov.entry, punch: pov.punch }, lines, previousCoverTemplate: manifest.previousEdition.coverTemplate },
      intent: { piece: 'portada-b', previousCoverTemplate: previous, headline: { entry: pov.entry, close: pov.punch }, ...narrator }
    })
  } else {
    const m = mosaic('mosaic', MOSAIC_CARDS, MOSAIC_CARD_HEIGHT, CANVAS_4X5, 'cover', 'band')

    slides.push({
      slideId: 'cover',
      contentType: 'glitch.cover.c',
      slots: { edition, headline: { entry: coverHeadline.entry, punch: coverHeadline.punch }, ...m.slots, previousCoverTemplate: manifest.previousEdition.coverTemplate },
      intent: { piece: 'portada-c', previousCoverTemplate: previous, faces: m.faces, headline: coverIntent }
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

    const faces = facesOf(news, INTERIOR_PHOTO)

    const common = {
      edition,
      photo: { src: photo(`photo:${news.id}`, news, INTERIOR_PHOTO, CANVAS_4X5, [slideId], [{ profile: 'band' }]), alt: `Foto de la noticia: ${news.headline}` },
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
      const r = regionsIn(news.photo.file, [news.lens.region], INTERIOR_PHOTO)[0] ?? news.lens.region

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

  // ─── Piezas sueltas: repiten láminas del carrusel o son del blog y del video ───
  const extra: Slide[] = []
  const bySlideId = new Map(slides.map((s) => [s.slideId, s]))
  const stillIds: string[] = []
  const letter = cover.toLowerCase() as 'a' | 'b' | 'c'

  /** Banner del blog (16:9) o su versión cuadrada, con la misma plantilla de portada que el carrusel. */
  const blogBanner = (square: boolean): Slide => {
    const slideId = square ? 'blog-square' : 'blog-banner'
    const piece = `blog-banner-${square ? 'square-' : ''}${letter}`
    const contentType = `glitch.blog.${square ? 'square' : 'banner'}.${letter}`
    const canvas = square ? CANVAS_1X1 : CANVAS_16X9
    const prevSlot = { previousCoverTemplate: manifest.previousEdition.coverTemplate }

    if (cover === 'A') {
      const box = square ? SQUARE_PHOTO : BLOG_PHOTO
      const parts: FracturePart[] = square ? [{ edge: 'bottom', profile: 'band' }] : [{ edge: 'bottom', profile: 'band' }, { edge: 'left', profile: 'side' }]
      const faces = facesOf(coverNews, box)

      return {
        slideId,
        contentType,
        slots: {
          photo: { src: photo(`photo:${slideId}`, coverNews, box, canvas, [slideId], parts), alt: `Foto de la noticia de portada: ${coverNews.headline}` },
          credit: coverNews.photo.credit,
          photoLicense: licenseOf(coverNews),
          faces: JSON.stringify(faces),
          edition,
          outlet: outletOf(coverNews),
          headline: { entry: coverHeadline.entry, ...punchParts(coverHeadline.punch) },
          ...(square ? {} : { lines }),
          ...prevSlot
        },
        intent: { piece, previousCoverTemplate: previous, faces, headline: coverIntent }
      }
    }

    if (cover === 'B') {
      const pov = manifest.cover.standalonePov!

      return {
        slideId,
        contentType,
        slots: { edition, ...muletilla, headline: { entry: pov.entry, punch: pov.punch }, lines, ...prevSlot },
        intent: { piece, previousCoverTemplate: previous, headline: { entry: pov.entry, close: pov.punch }, ...narrator }
      }
    }

    const m = square ? mosaic('square', SQUARE_CARDS, SQUARE_CARD_CLIP, canvas, slideId, 'band') : mosaic('blog', BLOG_CARDS, BLOG_CARD_CLIP, canvas, slideId, 'card')

    return {
      slideId,
      contentType,
      slots: { edition, headline: { entry: coverHeadline.entry, ...punchParts(coverHeadline.punch) }, ...m.slots, ...prevSlot },
      intent: { piece, previousCoverTemplate: previous, faces: m.faces, headline: coverIntent }
    }
  }

  /** Portada del reel o miniatura del vlog: la foto del host (color) que se desarma por el borde que fija la plantilla. */
  const videoCover = (thumbnail: boolean): Slide => {
    const video = manifest.video!
    const host = video.hostPhoto!
    const head = video.cover!
    const slideId = thumbnail ? 'video-thumbnail' : 'reel-cover'
    const box = thumbnail ? THUMB_HOST : REEL_HOST
    const canvas = thumbnail ? CANVAS_THUMB : CANVAS_9X16
    const hostRegions = regionsIn(host.file, host.faceRegions, box)
    const faces = faceBoxes(box, hostRegions)

    assets.push({
      ref: `photo:${slideId}`,
      kind: 'photo',
      path: host.file,
      fit: { width: box.w, height: box.h },
      treatment: 'color',
      fractures: [{ slideIds: [slideId], box, edge: thumbnail ? 'left' : 'top', profile: thumbnail ? 'side' : 'host', faceRegions: hostRegions, canvas }]
    })

    return {
      slideId,
      contentType: thumbnail ? 'glitch.video.thumbnail' : 'glitch.reel.cover',
      slots: {
        host: { src: `asset-ref:photo:${slideId}`, alt: 'El host de Glitch, con un gesto fuerte.' },
        photoLicense: `${host.license.kind}:${host.license.ref}`,
        faces: JSON.stringify(faces),
        edition,
        headline: { entry: head.entry, ...punchParts(head.punch) }
      },
      // La miniatura del vlog no tiene pieza propia en el token: la valida su portada hermana del reel.
      intent: { piece: 'reel-portada', faces: thumbnail ? [] : faces, headline: { entry: head.entry, close: head.punch } }
    }
  }

  for (const output of manifest.outputs.stills) {
    if (output === 'cover' || output === 'back') stillIds.push(output)
    else if (output.startsWith('interior:')) stillIds.push(output.slice('interior:'.length))
    else if (output === 'blog:banner') extra.push(blogBanner(false))
    else if (output === 'blog:square') extra.push(blogBanner(true))
    else if (output === 'reel:cover') extra.push(videoCover(false))
    else if (output === 'video:thumbnail') extra.push(videoCover(true))
    else if (output.startsWith('blog:news:')) {
      const news = newsById(manifest, output.slice('blog:news:'.length))
      const slideId = `blog-news-${news.id}`
      const faces = facesOf(news, NEWS_PHOTO)

      extra.push({
        slideId,
        contentType: 'glitch.blog.news',
        slots: {
          photo: { src: photo(`photo:${slideId}`, news, NEWS_PHOTO, CANVAS_NEWS, [slideId], [{ edge: 'bottom', profile: 'band' }]), alt: `Foto de la noticia: ${news.headline}` },
          credit: news.photo.credit,
          photoLicense: licenseOf(news),
          faces: JSON.stringify(faces),
          newsNumber: news.id.slice(1),
          section: GLITCH_SECTION_LABEL[news.section],
          edition
        },
        intent: { piece: 'blog-banner-interno', faces }
      })
    }
  }

  // ─── Overlays del reel y del vlog (PNG con alfa): el cuadro fijo del kit de motion ───
  const overlays: Slide[] = []

  for (const fmt of manifest.outputs.overlays) {
    const video = manifest.video!
    const piece = `${fmt}-overlay`

    const push = (name: string, kind: string, slots: SlotValues, intent: Partial<AxisGlitchLineIntent> = {}) =>
      overlays.push({ slideId: `${fmt}-${name}`, contentType: `glitch.overlay.${kind}.${fmt}`, slots, intent: { piece, ...intent } })

    video.newsIds.forEach((_, i) => push(`header-${i + 1}`, 'header', { progress: { step: String(i + 1), label: `${i + 1} / ${video.newsIds.length}` } }))
    push('lower-third-host', 'lower-third', { person: { kind: 'host', tag: `AL AIRE · GLITCH #${edition}`, name: video.host.name, role: video.host.role } })

    if (video.guest) push('lower-third-guest', 'lower-third', { person: { kind: 'guest', tag: `INVITADO · GLITCH #${edition}`, name: video.guest.name, role: video.guest.role } })

    video.newsIds.forEach((id, i) => {
      const news = newsById(manifest, id)

      push(`news-${i + 1}`, 'news', { section: GLITCH_SECTION_LABEL[news.section], headline: news.headline, source: news.outlet })
    })

    const dropNews = newsById(manifest, video.drop.newsId)
    const dropIndex = video.newsIds.indexOf(video.drop.newsId) + 1

    push(
      'drop',
      'drop',
      {
        pov: { entry: dropNews.pov.entry, ...punchParts(dropNews.pov.punch) },
        ...(fmt === 'vlog' ? { about: { number: String(dropIndex), text: video.shortHeadlines[video.drop.newsId] } } : {})
      },
      { headline: { entry: dropNews.pov.entry, close: dropNews.pov.punch } }
    )
    push('cta', 'cta', { nextEdition: String(manifest.edition.number + 1), invite: video.cta[fmt] }, { narrator: { text: `el #${manifest.edition.number + 1} sale el lunes.` } })
  }

  // ─── Contrato AXIS: cada lámina se valida antes de llegar al plan ───
  const issues: GlitchIssue[] = [...slides, ...extra, ...overlays].flatMap((slide) =>
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

  return {
    edition: manifest.edition.number,
    coverTemplate: cover,
    carousel: { catalog: 'glitch-carousel', plan: toPlan(slides, 'carousel') },
    stills: { catalog: 'glitch-stills', plan: toPlan([...stillIds.map((id) => bySlideId.get(id)!), ...extra], 'stills') },
    overlays: { catalog: 'glitch-overlays', plan: toPlan(overlays, 'overlays') },
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
