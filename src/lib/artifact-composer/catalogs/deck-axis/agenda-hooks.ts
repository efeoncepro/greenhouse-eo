import type { Page } from 'playwright'

import type { DeckPlan, SlideSpec } from '../../contracts'

/**
 * AgendaFull — números de página DERIVADOS del plan (2026-07-14).
 *
 * Una agenda sin páginas no funge como agenda: el comité no puede saltar al capítulo. Y el número
 * NO es autorable — un deck reordenado con páginas escritas a mano se contradice solo (misma bug
 * class que los ordinales). Se deriva acá: `targetSlideId` → posición real en `deckPlan.slides`.
 *
 * Degradación deliberada: sin `deckPlan` (render standalone del probe sintético) o con un target
 * que no existe en el plan, el capítulo queda SIN chip — nunca se inventa un número. El validador
 * semántico del catálogo es quien decide si un target roto es error de autoría; este hook sólo
 * pinta lo que puede probar.
 */
export const agendaLayoutHook = async (page: Page, slide: SlideSpec, deckPlan?: DeckPlan): Promise<void> => {
  if (!deckPlan) return

  const chapters = Array.isArray(slide.slots.chapters) ? (slide.slots.chapters as Record<string, unknown>[]) : []

  const pages = chapters.map(chapter => {
    const target = typeof chapter.targetSlideId === 'string' ? chapter.targetSlideId : null
    const index = target ? deckPlan.slides.findIndex(s => s.slideId === target) : -1

    return index >= 0 ? String(index + 1).padStart(2, '0') : null
  })

  await page.evaluate(pageNumbers => {
    const rows = document.querySelectorAll('#grid .ch')

    rows.forEach((row, i) => {
      const pageNumber = pageNumbers[i]

      if (!pageNumber) return

      const chip = document.createElement('span')

      chip.className = 'pg'
      chip.innerHTML = `<i>pág.</i>${pageNumber}`
      row.appendChild(chip)
    })
  }, pages)
}
