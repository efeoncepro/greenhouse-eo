/**
 * Quality gates MECÁNICOS del render (TASK-1391 · Slice 1b).
 *
 * La doctrina del composer —"los tests verdes NO son el gate: mirar los frames"— muere el día
 * que el render se automatiza, salvo que mirar se vuelva MECÁNICO. Estos detectores son ese
 * reemplazo. Son GATES DE PUBLICACIÓN, no advertencias: cualquier hallazgo aborta la lámina.
 *
 *   · missing_asset   — un <img> que no resolvió (404 → caja vacía) con `naturalWidth === 0`.
 *   · font_fallback   — un texto pide una familia SIN NINGUNA FontFace declarada: el browser
 *                       cae a una fuente del sistema EN SILENCIO (el fail-closed de
 *                       `document.fonts` sólo atrapa faces declaradas que fallaron al cargar).
 *   · blank_slide     — lámina sin "tinta": métrica de contraste local por tiles sobre el PNG
 *                       (un fondo degradado es suave en todas partes; texto/cards crean tiles de
 *                       alto contraste). Robusta ante los degradados vibrantes del molde.
 *
 * `assertSlideFitsCanvas` (geometría) ya existe y se conserva: esto lo COMPLEMENTA.
 */

import { PNG } from 'pngjs'

import type { Page } from 'playwright'

export class SlideQualityError extends Error {
  constructor(
    public readonly code: 'missing_asset' | 'font_fallback_detected' | 'blank_slide',
    public readonly slideId: string,
    detail: string
  ) {
    super(`[${code}] lámina "${slideId}": ${detail}`)
    this.name = 'SlideQualityError'
  }
}

/** Familias genéricas de CSS que nunca son un fallback detectable. */
const GENERIC_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'math',
  'emoji'
])

/** Todo `<img>` del DOM debe haber resuelto: 404 → caja vacía silenciosa en el PDF. */
export const assertAllImagesResolved = async (page: Page, slideId: string): Promise<void> => {
  const broken = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img'))
      .filter(img => !img.complete || img.naturalWidth === 0)
      .map(img => img.getAttribute('src') ?? '(sin src)')
  )

  if (broken.length > 0) {
    throw new SlideQualityError(
      'missing_asset',
      slideId,
      `${broken.length} imagen(es) sin resolver: ${broken.slice(0, 5).join(' · ')}`
    )
  }
}

/**
 * Detecta la familia pedida SIN NINGUNA FontFace: el browser usa la del sistema sin avisar.
 * (Una familia declarada cuyo face falló en cargar ya aborta antes, en `fillSlide`.)
 */
export const assertNoFontFallback = async (page: Page, slideId: string): Promise<void> => {
  const offenders = await page.evaluate(genericFamilies => {
    const generic = new Set(genericFamilies)
    const declared = new Set<string>()

    document.fonts.forEach(face => {
      declared.add(face.family.replace(/^['"]|['"]$/g, '').toLowerCase())
    })

    // Un catálogo SIN webfonts (cero FontFace) optó por fuentes del sistema: no hay
    // "fallback" que detectar. El gate juzga catálogos que declaran fuentes propias.
    if (declared.size === 0) return [] as string[]

    const NON_RENDERED = new Set(['STYLE', 'SCRIPT', 'NOSCRIPT', 'TEMPLATE', 'TITLE', 'META', 'LINK', 'HEAD'])
    const missing = new Map<string, string>()

    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      if (NON_RENDERED.has(el.tagName)) continue

      const hasText = Array.from(el.childNodes).some(
        n => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim().length > 0
      )

      if (!hasText) continue

      const style = getComputedStyle(el)

      if (style.display === 'none' || style.visibility === 'hidden') continue

      const stack = style.fontFamily

      if (!stack) continue

      const first = stack.split(',')[0]!.trim().replace(/^['"]|['"]$/g, '')
      const key = first.toLowerCase()

      if (generic.has(key) || declared.has(key) || missing.has(key)) continue

      missing.set(key, `${first} (en <${el.tagName.toLowerCase()}> "${(el.textContent ?? '').trim().slice(0, 30)}…")`)
    }

    return Array.from(missing.values())
  }, Array.from(GENERIC_FAMILIES))

  if (offenders.length > 0) {
    throw new SlideQualityError(
      'font_fallback_detected',
      slideId,
      `familia(s) sin FontFace declarada — el browser está usando una fuente del sistema en silencio: ${offenders.join(' · ')}`
    )
  }
}

export interface SlideInkMetrics {
  /** Fracción de tiles (16×16) con contraste local alto (std-dev de luminancia > umbral). */
  inkTileRatio: number
  tilesTotal: number
  tilesWithInk: number
}

/**
 * Métrica de "tinta" robusta a degradados: contraste LOCAL por tiles de 16 px. Un degradado es
 * suave dentro de cada tile (std-dev baja); texto, cards, íconos y fotos crean bordes duros.
 */
export const measureSlideInk = (pngBuffer: Buffer): SlideInkMetrics => {
  const png = PNG.sync.read(pngBuffer)
  const TILE = 16
  const tilesX = Math.floor(png.width / TILE)
  const tilesY = Math.floor(png.height / TILE)
  let tilesWithInk = 0

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      let sum = 0
      let sumSq = 0
      const n = TILE * TILE

      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const idx = ((ty * TILE + y) * png.width + (tx * TILE + x)) * 4
          const lum = 0.2126 * png.data[idx]! + 0.7152 * png.data[idx + 1]! + 0.0722 * png.data[idx + 2]!

          sum += lum
          sumSq += lum * lum
        }
      }

      const mean = sum / n
      const variance = Math.max(0, sumSq / n - mean * mean)

      // std-dev > 12 en escala 0-255: un borde real dentro del tile (un degradado suave
      // del molde queda muy por debajo; texto/ícono/card lo supera con holgura).
      if (Math.sqrt(variance) > 12) tilesWithInk++
    }
  }

  const tilesTotal = tilesX * tilesY

  return { inkTileRatio: tilesTotal === 0 ? 0 : tilesWithInk / tilesTotal, tilesTotal, tilesWithInk }
}

/**
 * Gate de lámina en blanco/casi vacía. Umbral default 1.5% de tiles con tinta: las láminas
 * reales del catálogo miden un orden de magnitud arriba; un fondo (aun degradado con grano)
 * queda debajo.
 */
export const assertSlideHasInk = (pngBuffer: Buffer, slideId: string, minInkTileRatio = 0.015): void => {
  const metrics = measureSlideInk(pngBuffer)

  if (metrics.inkTileRatio < minInkTileRatio) {
    throw new SlideQualityError(
      'blank_slide',
      slideId,
      `sólo ${(metrics.inkTileRatio * 100).toFixed(2)}% de tiles con contenido (umbral ${(minInkTileRatio * 100).toFixed(1)}%): la lámina está vacía o casi vacía`
    )
  }
}
