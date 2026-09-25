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

/**
 * Satélites de canal de la portada blanca (TASK-1889): uno por canal medido, repartidos sobre el anillo
 * exterior (centro 572,404; radio 258) entre 165° y 305°, como en el canvas aprobado (cinco canales =
 * 35° de paso). Un canal sin isotipo conocido no se dibuja en la portada (queda sin disco).
 */
export const satelliteCenters = (count: number, cx = 572, cy = 404, radius = 258): Array<{ x: number; y: number }> => {
  if (count <= 0) return []

  const angles = count === 1 ? [270] : Array.from({ length: count }, (_, i) => 165 + (140 * i) / (count - 1))

  return angles.map(deg => ({
    x: Math.round((cx + radius * Math.cos((deg * Math.PI) / 180)) * 10) / 10,
    y: Math.round((cy + radius * Math.sin((deg * Math.PI) / 180)) * 10) / 10
  }))
}

export const coverSatellitesHook: CatalogLayoutHook = async page => {
  const count = await page.evaluate(() => {
    document.querySelectorAll('.satellite').forEach(node => {
      if (!node.querySelector('.channel-disc')) node.remove()
    })

    return document.querySelectorAll('.satellite').length
  })

  await page.evaluate(
    centers => {
      document.querySelectorAll<HTMLElement>('.satellite').forEach((node, i) => {
        node.style.left = `${centers[i]!.x - 15}px`
        node.style.top = `${centers[i]!.y - 15}px`
      })
    },
    satelliteCenters(count)
  )
}
