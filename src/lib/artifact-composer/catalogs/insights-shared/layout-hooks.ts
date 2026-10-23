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

/**
 * Capitular de la narrada: una letra de 52 px sólo se sostiene junto a un párrafo de tres líneas o más. Con
 * afirmaciones cortas (datos reales: «Visibilidad en IA: 0.») quedaba una letra suelta. El hook mide el
 * primer párrafo YA compuesto y enciende la capitular sólo cuando cabe.
 */
export const narrativeDropCapHook: CatalogLayoutHook = async page => {
  await page.evaluate(() => {
    const body = document.querySelector('.narrative-body')
    const first = body?.querySelector('p')

    if (!body || !first) return

    const lineHeight = parseFloat(getComputedStyle(first).lineHeight)
    const lines = Math.round(first.getBoundingClientRect().height / lineHeight)

    if (lines >= 3) body.classList.add('has-dropcap')
  })
}

/**
 * Guarda del pie en las páginas en papel (`.paper-foot`): ningún bloque del cuerpo puede terminar sobre el pie.
 *
 * `assertSlideFitsCanvas` mide lo que se sale del LIENZO; un panel de cierre que crece hasta montarse sobre el pie
 * sigue dentro del lienzo y pasaba en silencio: el PDF mostraba el logo y el folio dentro del panel (caso fuente:
 * páginas de comparación con cinco métricas, 2026-10-23). Antes sólo la cascada lo vigilaba en su hook. Una página
 * sin pie (portadas, aperturas, contraportada) no tiene nada que vigilar.
 */
export const PAPER_FOOT_CLEARANCE_PX = 4

export const paperFootClearanceHook: CatalogLayoutHook = async (page, slide) => {
  const collisions = await page.evaluate(clearance => {
    const foot = document.querySelector('.paper-foot')
    const sheet = foot?.parentElement

    if (!foot || !sheet) return []

    const top = foot.getBoundingClientRect().top
    const out: string[] = []

    for (const child of Array.from(sheet.children)) {
      if (child === foot || child.classList.contains('chapter-tab') || child.classList.contains('grow')) continue

      const style = getComputedStyle(child)

      if (style.position === 'absolute' || style.position === 'fixed' || style.display === 'none') continue

      const rect = child.getBoundingClientRect()

      if (rect.height > 0 && rect.bottom > top - clearance) {
        out.push(`«${(child.getAttribute('data-slot') ?? child.className).toString().split(' ')[0]}» termina ${Math.round(rect.bottom - top + clearance)} px sobre el pie`)
      }
    }

    return out
  }, PAPER_FOOT_CLEARANCE_PX)

  if (collisions.length > 0) {
    throw new Error(`La página «${slide.slideId}» no cabe: ${collisions.join('; ')}. Acorta el copy; el pie nunca se cubre.`)
  }
}

/** Corre el hook propio de cada plantilla y después la guarda del pie. */
export const withPaperFootGuard = (
  hooks: Readonly<Record<string, CatalogLayoutHook>>,
  templateNames: readonly string[]
): Record<string, CatalogLayoutHook> =>
  Object.fromEntries(
    templateNames.map(name => [
      name,
      async (page, slide, deckPlan) => {
        await hooks[name]?.(page, slide, deckPlan)
        await paperFootClearanceHook(page, slide, deckPlan)
      }
    ])
  )
