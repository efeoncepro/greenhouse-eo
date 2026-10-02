/**
 * Hook del cierre de Marketing con Manzanitas (TASK-1939): la palabra de la línea del eslogan va en el acento sólo si el
 * cuerpo llega al mínimo del acento en texto (`--mcm-accent-min-text-px`, de `manzanitasRegister.accent.contrast`);
 * bajo él, va en la tinta de la superficie. El cuerpo sale del logo (64 % de su ancho, regla del operador del
 * 2026-09-29), así que sólo se sabe después del layout: por eso lo decide el hook midiendo, no la plantilla.
 */

import type { CatalogLayoutHook } from '../../catalog'

export const MANZANITAS_SLOGAN_TEMPLATES = ['BackCover', 'StoryClose', 'YoutubeClose'] as const

export const manzanitasSloganHook: CatalogLayoutHook = async (page, slide) => {
  const result = await page.evaluate(() => {
    const slogan = document.querySelector<HTMLElement>('.mcm-slogan')

    if (!slogan) return { found: false, fontPx: 0, minPx: 0 }

    const fontPx = parseFloat(getComputedStyle(slogan).fontSize)
    const minPx = parseFloat(getComputedStyle(slogan).getPropertyValue('--mcm-accent-min-text-px'))

    slogan.classList.toggle('mcm-slogan--ink', !(fontPx >= minPx))

    return { found: true, fontPx, minPx }
  })

  if (!result.found) throw new Error(`manzanitas: la plantilla de ${slide.slideId} no tiene eslogan (.mcm-slogan).`)
  if (!Number.isFinite(result.minPx) || result.minPx <= 0) throw new Error(`manzanitas: falta --mcm-accent-min-text-px en ${slide.slideId}: recompila con pnpm manzanitas:tokens.`)
}
