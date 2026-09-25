/**
 * Layout derivado del catálogo `insights-report` (TASK-1889): lo que se dibuja DESDE un slot pero no
 * es un slot, porque su geometría es arte.
 *
 * El número en contorno de la apertura de capítulo sangra fuera del lienzo a propósito (canvas
 * aprobado). Declarado como slot pintable, el guard de geometría lo rechazaría por salirse de la
 * página; por eso el número viaja como slot `validation-only` y este hook lo escribe en el arte,
 * igual que `deck-axis` deriva los conectores de TimelineFull.
 */

import type { CatalogLayoutHook } from '../../catalog'

/**
 * Compensación óptica del canvas: con `text-anchor: end`, un número que termina en «1» queda con un
 * hueco a la derecha (el 1 de Poppins es angosto dentro de su avance), y el canvas lo corre 20 px
 * (x = 830 en vez de 850). Es la regla del diseño aprobado, no un ajuste por página.
 */
export const chapterNumeralX = (numeral: string, baseX = 850): number => (numeral.endsWith('1') ? baseX - 20 : baseX)

/**
 * Hook del número de capítulo para un lienzo: `baseX` es el ancla derecha del número (850 en A4 y
 * 1330 en la lámina 16:9: el número sangra ~55 px fuera del borde en ambos).
 */
export const makeChapterNumeralHook = (baseX: number): CatalogLayoutHook => async (page, slide) => {
  const numeral = String(slide.slots.chapterNumeral ?? '')

  await page.evaluate(
    ({ text, x }) => {
      const node = document.querySelector('.chapter-numeral')

      if (!node) throw new Error('Apertura de capítulo: falta el nodo .chapter-numeral en la plantilla.')

      node.textContent = text
      node.setAttribute('x', String(x))
    },
    { text: numeral, x: chapterNumeralX(numeral, baseX) }
  )
}

export const chapterNumeralHook = makeChapterNumeralHook(850)
