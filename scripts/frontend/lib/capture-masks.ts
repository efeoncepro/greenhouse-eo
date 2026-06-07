/**
 * Capture-time helpers para el contrato baseline (TASK-1018 Slice 1):
 *
 * - `resolveMaskRects`: traduce `baseline.maskSelectors` a rectángulos en
 *   coordenadas de imagen (ya escaladas por deviceScaleFactor) según el modo
 *   de captura del frame (viewport / clipSelector / fullPage).
 * - `applyCaptureDeterminism`: normaliza la página para que el pixel-diff sea
 *   determinista cross-máquina (animaciones off, caret oculto, reduced-motion,
 *   fonts settled). Prerequisito de cualquier `maxDiffRatio`/`maxChangedPixels`.
 */

import type { Page } from 'playwright'

import type { FrameMaskRect } from './manifest'

export interface MaskResolution {
  rects: FrameMaskRect[]
  missingSelectors: string[]
}

interface MaskCaptureMode {
  clipSelector?: string
  fullPage?: boolean
}

/**
 * Resuelve los selectores de mask a rects de imagen. Cada selector puede
 * matchear múltiples nodos (e.g. `[data-dynamic-count]`) → un rect por nodo.
 * Un selector sin matches se reporta en `missingSelectors`.
 */
export const resolveMaskRects = async (
  page: Page,
  selectors: string[],
  mode: MaskCaptureMode
): Promise<MaskResolution> => {
  if (!selectors.length) return { rects: [], missingSelectors: [] }

  return page.evaluate(
    ({ sels, clip, fullPage }) => {
      const dpr = window.devicePixelRatio || 1
      const rects: Array<{ x: number; y: number; width: number; height: number }> = []
      const missingSelectors: string[] = []

      let originX = 0
      let originY = 0

      if (clip) {
        const clipEl = document.querySelector(clip)

        if (clipEl) {
          const r = clipEl.getBoundingClientRect()

          originX = r.left
          originY = r.top
        }
      } else if (fullPage) {
        // fullPage screenshot empieza en el top del documento → sumar scroll.
        originX = -window.scrollX
        originY = -window.scrollY
      }

      for (const sel of sels) {
        const nodes = document.querySelectorAll(sel)

        if (!nodes.length) {
          missingSelectors.push(sel)
          continue
        }

        nodes.forEach(node => {
          const r = node.getBoundingClientRect()

          if (r.width <= 0 || r.height <= 0) return

          rects.push({
            x: (r.left - originX) * dpr,
            y: (r.top - originY) * dpr,
            width: r.width * dpr,
            height: r.height * dpr
          })
        })
      }

      return { rects, missingSelectors }
    },
    { sels: selectors, clip: mode.clipSelector ?? null, fullPage: Boolean(mode.fullPage) }
  )
}

/**
 * Aplica el contrato de determinismo del diff. Se invoca SOLO cuando el
 * scenario declara un baseline contract (`baseline.surfaceId`) para no alterar
 * la evidencia de motion de scenarios de microinteracción.
 */
export const applyCaptureDeterminism = async (page: Page): Promise<void> => {
  await page.emulateMedia({ reducedMotion: 'reduce' })

  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
        caret-color: transparent !important;
      }
    `
  })

  await page.evaluate(async () => {
    if ('fonts' in document) await document.fonts.ready
  })
}
