/**
 * Validadores de EDICIÓN de los catálogos de Glitch (TASK-1923). Repiten, sobre el plan ya resuelto, las reglas que el
 * mapper (`src/lib/glitch-composition`) aplica antes con el contrato `efeonce.glitch-line` de AXIS: así un plan hecho a
 * mano —o uno que saltó el mapper— tampoco se compone si rompe la línea. Deterministas: plan + registry, nada más.
 *
 * Las reglas y su fuente:
 *   - `glitch.cover-rotation`    la portada nunca repite la plantilla de la semana anterior (norma §4.2).
 *   - `glitch.single-sphere`     cada plantilla declara exactamente una esfera (manzana, lente o ninguna).
 *   - `glitch.headline-contrast` titular con entrada ligera y remate pesado: sin remate no hay contraste.
 *   - `glitch.photo-credit`      toda foto de noticia lleva crédito pintado y licencia admitida (licensed/owned/generated);
 *                                la del host (propia) sólo declara la licencia.
 *   - `glitch.face-safe-fracture` ninguna celda de la falla en bytes cae sobre un rostro.
 *   - `glitch.accent-on-light`   el verde nunca es texto sobre fondo claro: hoy toda plantilla es de superficie oscura.
 *   - `glitch.edition-structure` (sólo carrusel) portada + 8 noticias en orden + contraportada; el Glitch Flash, portada +
 *                                la noticia + contraportada, sin avance n/8 (edición `flash` del token, 2026-09-28).
 */

import type { CatalogSemanticValidator, CatalogSemanticViolation } from '../../catalog'
import type { SlideSpec } from '../../contracts'
import { parseFractureCells } from './fracture-hook'
import { glitchTemplateOf } from './validators'

type Slots = Record<string, unknown>
type Box = { x: number; y: number; w: number; h: number }

const COVER_LETTER: Record<string, 'A' | 'B' | 'C'> = { CoverPhoto: 'A', CoverType: 'B', CoverMosaic: 'C' }
const LICENSE_KINDS = new Set(['licensed', 'owned', 'generated'])
const PHOTO_SLOTS = ['photo', 'card1', 'card2', 'card3', 'card4']

const slotsOf = (slide: SlideSpec) => slide.slots as Slots
const filled = (value: unknown) => typeof value === 'string' && value.trim().length > 0

const violation = (code: string, slideId: string, message: string): CatalogSemanticViolation => ({ code, slideId, message })

const perSlide = (name: string, check: (slide: SlideSpec, snapshot: Parameters<CatalogSemanticValidator['validate']>[1]) => string | null): CatalogSemanticValidator => ({
  name,
  version: '1.0.0',
  validate: (plan, snapshot) =>
    plan.slides.flatMap((slide) => {
      const message = check(slide, snapshot)

      return message ? [violation(name, slide.slideId, message)] : []
    })
})

export const coverRotationValidator = perSlide('glitch.cover-rotation', (slide) => {
  const letter = COVER_LETTER[slide.template]

  if (!letter) return null

  const previous = slotsOf(slide).previousCoverTemplate

  if (!filled(previous)) return 'La portada no declara la plantilla de la semana anterior (`none` en la primera edición).'

  return previous === letter ? `La portada ${letter} repite la plantilla de la semana anterior.` : null
})

export const singleSphereValidator = perSlide('glitch.single-sphere', (slide, { registry }) => {
  const sphere = glitchTemplateOf(registry, slide.template)?.sphere

  return sphere === 'apple' || sphere === 'lens' || sphere === 'none' ? null : `La plantilla ${slide.template} no declara una sola esfera (manzana, lente o ninguna).`
})

export const headlineContrastValidator = perSlide('glitch.headline-contrast', (slide) => {
  const headline = slotsOf(slide).headline

  if (headline === undefined || typeof headline === 'string') return null

  const h = headline as Slots

  return filled(h.entry) && (filled(h.punch) || filled(h.punchLast)) ? null : 'El titular necesita entrada ligera y remate pesado: sin los dos no hay contraste de pesos.'
})

export const photoCreditValidator = perSlide('glitch.photo-credit', (slide) => {
  const slots = slotsOf(slide)
  const hostOnly = slots.host !== undefined && !PHOTO_SLOTS.some((key) => slots[key] !== undefined)

  if (!hostOnly && !PHOTO_SLOTS.some((key) => slots[key] !== undefined)) return null

  // La foto del host es propia (portada del reel, miniatura del vlog): no pinta crédito, pero declara su licencia.
  if (!hostOnly && !filled(slots.credit)) return 'Una lámina con foto lleva su crédito pintado.'

  const licenses = typeof slots.photoLicense === 'string' ? slots.photoLicense.trim().split(/\s+/).filter(Boolean) : []

  if (licenses.length === 0) return 'Una lámina con foto declara la licencia de cada foto (`kind:ref`).'

  const bad = licenses.find((l) => !LICENSE_KINDS.has(l.split(':')[0]) || !l.includes(':') || l.endsWith(':'))

  return bad ? `Licencia de foto no admitida: «${bad}» (sólo licensed, owned o generated, con su referencia; el kit de prensa no cuenta).` : null
})

const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

export const faceSafeFractureValidator = perSlide('glitch.face-safe-fracture', (slide) => {
  const slots = slotsOf(slide)
  const cells = parseFractureCells(slide.slideId, slots.bytes)

  if (cells.length === 0) return null

  let faces: Box[]

  try {
    faces = typeof slots.faces === 'string' ? (JSON.parse(slots.faces) as Box[]) : []
  } catch {
    return 'El slot `faces` no es JSON válido: sin saber dónde están los rostros, la falla no se pinta.'
  }

  const hit = cells.find((c) => faces.some((f) => overlaps({ x: c.x, y: c.y, w: c.size, h: c.size }, f)))

  return hit ? `Una celda de la falla en bytes (${hit.x}, ${hit.y}) cae sobre un rostro.` : null
})

export const accentOnLightValidator = perSlide('glitch.accent-on-light', (slide, { registry }) =>
  glitchTemplateOf(registry, slide.template)?.surfaceTone === 'dark'
    ? null
    : `La plantilla ${slide.template} no es de superficie oscura: el verde de Glitch es texto en ella y nunca va sobre claro.`
)

const INTERIORS = new Set(['Interior', 'InteriorOpening', 'InteriorLens'])

/** El carrusel del Glitch Flash: una sola noticia, sin número ni avance (la estructura la fija el token). */
const FLASH_CAROUSEL = ['FlashCover', 'FlashInterior', 'FlashBackCover'] as const
const FLASH_TEMPLATES = new Set<string>([...FLASH_CAROUSEL, 'FlashBlogBanner', 'FlashNewsBanner', 'FlashThreads'])

/** Sólo el carrusel: la edición completa, en orden. Las piezas sueltas no lo necesitan. */
export const editionStructureValidator: CatalogSemanticValidator = {
  name: 'glitch.edition-structure',
  version: '1.1.0',
  validate: (plan) => {
    const out: CatalogSemanticViolation[] = []
    const slides = plan.slides
    const at = (slideId: string, message: string) => out.push(violation('glitch.edition-structure', slideId, message))
    const flash = slides.some((slide) => FLASH_TEMPLATES.has(slide.template))

    if (flash) {
      if (slides.length !== FLASH_CAROUSEL.length || slides.some((slide, i) => slide.template !== FLASH_CAROUSEL[i])) {
        at(slides[0]?.slideId ?? 'plan', `El carrusel del Glitch Flash lleva ${FLASH_CAROUSEL.length} láminas: portada, la noticia y contraportada, sin mezclar piezas de la edición semanal.`)
      }

      for (const slide of slides) {
        if (slotsOf(slide).progress !== undefined || slotsOf(slide).edition !== undefined) at(slide.slideId, 'Un Glitch Flash no lleva número de edición ni avance n/8.')
      }

      return out
    }

    if (slides.length !== 10) {
      at(slides[0]?.slideId ?? 'plan', `El carrusel lleva 10 láminas (portada, 8 noticias, contraportada); este trae ${slides.length}.`)

      return out
    }

    if (!COVER_LETTER[slides[0].template]) at(slides[0].slideId, 'La primera lámina del carrusel es la portada.')
    if (slides[9].template !== 'BackCover') at(slides[9].slideId, 'La última lámina del carrusel es la contraportada.')

    slides.slice(1, 9).forEach((slide, i) => {
      const n = i + 1

      if (!INTERIORS.has(slide.template)) at(slide.slideId, `La lámina ${n + 1} debe ser la noticia ${n}.`)
      if (n === 1 && slide.template !== 'InteriorOpening') at(slide.slideId, 'La noticia 1 abre con «El micrófono se abre» (sin lente).')
      if (n > 1 && slide.template === 'InteriorOpening') at(slide.slideId, 'Sólo la noticia 1 lleva la apertura.')

      const step = (slotsOf(slide).progress as Slots | undefined)?.step

      if (String(step) !== String(n)) at(slide.slideId, `El avance de la noticia ${n} dice ${String(step)}.`)
    })

    return out
  }
}

/** Los de toda pieza de Glitch; el carrusel suma la estructura de la edición. */
export const glitchEditionValidators = (catalog: 'carousel' | 'stills' | 'overlays'): CatalogSemanticValidator[] => [
  coverRotationValidator,
  singleSphereValidator,
  headlineContrastValidator,
  photoCreditValidator,
  faceSafeFractureValidator,
  accentOnLightValidator,
  ...(catalog === 'carousel' ? [editionStructureValidator] : [])
]
