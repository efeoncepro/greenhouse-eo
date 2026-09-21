/**
 * Reparto determinista de un flujo de bloques en páginas de alto fijo.
 *
 * DOMAIN-FREE a propósito. No conoce Insights, ni módulos, ni identificadores de un informe
 * concreto: recibe bloques ya medidos y un presupuesto de página, y devuelve qué bloque cae en qué
 * página. Vive acá y no dentro de un catálogo porque el segundo informe vertical del repo
 * (auditoría SEO, TASK-1672) debe poder usarlo sin copiarlo — mientras viva dentro de un catálogo,
 * "el catálogo es dato" deja de ser verdad justo en la frontera donde importa.
 *
 * Es una función PURA: la medición —que sí necesita un navegador— la hace `measureSlideFit` en el
 * motor, y acá entra ya resuelta. Esa separación es lo que permite probar el reparto entero sin
 * levantar Chromium, y es lo que hace que dos corridas con las mismas alturas repartan igual.
 *
 * Decisión: `GREENHOUSE_ARTIFACT_VERTICAL_PAGINATION_DECISION_V1.md`.
 */

export interface FlowBlock {
  /** Identificador estable del bloque dentro del flujo. */
  readonly blockId: string

  /** Alto medido, en píxeles del lienzo. */
  readonly heightPx: number

  /**
   * El bloque no puede quedar último en una página: arrastra al siguiente consigo.
   * Es el control de viudas — un título de capítulo solo al pie de página es el caso típico.
   */
  readonly keepWithNext?: boolean
}

export interface PageBudget {
  /** Alto útil de una página, ya descontados cabecera, pie y márgenes. */
  readonly contentHeightPx: number

  /**
   * Holgura que se reserva en cada página.
   *
   * No es decoración: el render rasteriza con variación leve entre entornos (ISSUE-122), y sin
   * margen un bloque que mide justo puede caber en una corrida y desbordar en la siguiente,
   * cambiando el reparto — y con él la numeración y el índice. El margen compra estabilidad del
   * plan de páginas, no estética.
   */
  readonly guardPx: number
}

export interface PaginatedPage {
  /** 1-based: es el folio que se imprime. */
  readonly pageNumber: number
  readonly blockIds: readonly string[]
}

/**
 * Un bloque que no cabe ni en una página vacía. Es un rechazo honesto, no un corte silencioso:
 * el contrato del motor es `OverflowPolicy = 'reject'` y este error lo respeta.
 */
export class BlockTooTallError extends Error {
  readonly blockId: string
  readonly heightPx: number
  readonly availableHeightPx: number

  constructor(blockId: string, heightPx: number, availableHeightPx: number) {
    super(
      `El bloque "${blockId}" mide ${heightPx}px y la página útil son ${availableHeightPx}px: no cabe ` +
        `ni en una página vacía.\nDivide el contenido en el catálogo o corrige la geometría de la ` +
        `plantilla. NO se recorta: un informe que amputa una cifra o una afirmación miente.`
    )
    this.name = 'BlockTooTallError'
    this.blockId = blockId
    this.heightPx = heightPx
    this.availableHeightPx = availableHeightPx
  }
}

/**
 * Reparte `blocks` en páginas, en orden, sin reordenar ni omitir ninguno.
 *
 * Greedy de una pasada: cada bloque entra en la página en curso si cabe; si no, abre una nueva.
 * No hay backtracking — un reparto que "optimiza" el llenado moviendo bloques dejaría de ser
 * predecible para quien compone, y la previsibilidad es lo que permite resolver el índice sin una
 * segunda pasada de render.
 */
export const paginateFlow = (blocks: readonly FlowBlock[], budget: PageBudget): PaginatedPage[] => {
  const available = budget.contentHeightPx - budget.guardPx

  if (available <= 0) {
    throw new RangeError(
      `El presupuesto de página es ${budget.contentHeightPx}px con ${budget.guardPx}px de guarda: no queda alto útil.`
    )
  }

  for (const block of blocks) {
    if (block.heightPx > available) {
      throw new BlockTooTallError(block.blockId, block.heightPx, available)
    }
  }

  const pages: string[][] = []
  let current: string[] = []
  let used = 0

  const closePage = () => {
    if (current.length > 0) {
      pages.push(current)
      current = []
      used = 0
    }
  }

  blocks.forEach((block, index) => {
    if (used + block.heightPx > available) {
      closePage()
    }

    current.push(block.blockId)
    used += block.heightPx

    // Control de viudas: si este bloque arrastra al siguiente y el siguiente no cabe, ninguno de
    // los dos se queda acá. Se reabre la página sin el bloque arrastrante, que pasa a la próxima
    // junto a su compañero.
    const next = blocks[index + 1]

    if (block.keepWithNext && next && used + next.heightPx > available) {
      current.pop()
      used -= block.heightPx
      closePage()
      current.push(block.blockId)
      used = block.heightPx
    }
  })

  closePage()

  return pages.map((blockIds, i) => ({ pageNumber: i + 1, blockIds }))
}
