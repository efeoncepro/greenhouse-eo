/**
 * TASK-1785 — El caminador que convierte `provenance` en contrato.
 *
 * Sin esto, `section` sería una intención con buen nombre: nada obligaría a que las entradas
 * declaradas cubran de verdad las cifras del DTO, y un campo numérico nuevo podría nacer sin
 * lente sin que nada fallara. Con esto, agregarlo rompe CI.
 *
 * 🔴 La pregunta que responde NO es "¿hay un campo `provenance`?" sino "¿queda alguna cifra
 * sin dueño?". Es la diferencia entre medir la forma y medir la cobertura, y es exactamente
 * la distinción que este módulo ya pagó cara en otros invariantes.
 *
 * ⚠️ **Alcance conocido, declarado para que nadie lo lea como total.** El guard corre sobre
 * FIXTURES tipados de cada reader, no sobre su salida real. La cadena que lo hace efectivo es
 * indirecta: un campo numérico **requerido** nuevo rompe el fixture en `tsc`, alguien lo
 * completa, y recién ahí el guard ve la hoja sin dueño. Por eso funciona para campos
 * requeridos y **NO** para campos OPCIONALES: un `nuevoKpi?: number` no rompe el fixture y
 * el guard no lo llega a ver. Mitigación mientras no exista un live test que ejercite los DTO
 * reales contra PostgreSQL: **preferir campos requeridos** en los readers del módulo, y si un
 * campo debe ser opcional, agregarlo al fixture a mano en el mismo PR.
 */

import type { SeoProvenance } from './lens'

/**
 * Path normalizado de una hoja numérica. Los arrays colapsan a `[]` porque la lente es del
 * CAMPO, no del índice: `opportunities[3].position` y `opportunities[7].position` son la
 * misma cifra observada dos veces, y pedir una entrada por índice sería ruido sin señal.
 */
export const collectNumericLeafPaths = (value: unknown, prefix = ''): string[] => {
  if (typeof value === 'number') return [prefix]
  if (value === null || typeof value !== 'object') return []

  if (Array.isArray(value)) {
    // Se recorre TODO el array, no sólo el primer elemento: una fila con un campo que las
    // demás no traen es justo el caso que un muestreo perdería.
    return [...new Set(value.flatMap(item => collectNumericLeafPaths(item, `${prefix}[]`)))]
  }

  return Object.entries(value).flatMap(([key, child]) =>
    collectNumericLeafPaths(child, prefix ? `${prefix}.${key}` : key)
  )
}

/**
 * ¿Esta entrada de procedencia reclama esta hoja?
 *
 * Gramática de `section`, deliberadamente pequeña:
 *   `*`                      todo el DTO
 *   `summary`                ese subárbol entero
 *   `points[]`               toda hoja bajo los items de ese array
 *   `a[].{x,y}`              esos campos de los items, y lo que contengan
 */
export const sectionClaims = (section: string, leafPath: string): boolean => {
  if (section === '*') return true

  const brace = section.indexOf('{')

  if (brace === -1) {
    return leafPath === section || leafPath.startsWith(`${section}.`) || leafPath.startsWith(`${section}[`)
  }

  const prefix = section.slice(0, brace)

  const names = section
    .slice(brace + 1, section.lastIndexOf('}'))
    .split(',')
    .map(name => name.trim())
    .filter(Boolean)

  if (!leafPath.startsWith(prefix)) return false

  const remainder = leafPath.slice(prefix.length)

  // Nombrar un campo reclama el campo Y lo que haya dentro: `{trend}` cubre `trend[]`, que es
  // un array de escalares. Exigir el nombre exacto obligaría a declarar la forma interna de
  // cada campo en el `section`, y eso convertiría la gramática en una copia del DTO.
  return names.some(
    name => remainder === name || remainder.startsWith(`${name}.`) || remainder.startsWith(`${name}[`)
  )
}

export interface LensCoverageReport {
  /** Cifras que ninguna procedencia reclama: el agujero que el guard persigue. */
  unclaimed: string[]
  /** Cifras reclamadas por MÁS de una entrada: ambigüedad, no redundancia. */
  ambiguous: string[]
  /**
   * Secciones que traen al menos una cifra pero declaran `capturedAt: null`.
   *
   * `null` es legítimo cuando la sección está VACÍA ("no hay nada que fechar"), y deja de
   * serlo en cuanto hay un número: una cifra sin as-of se lee como vigente para siempre. La
   * regla estaba escrita en `lens.ts` desde el primer commit y no tenía nada que la
   * sostuviera — que es precisamente el defecto que este módulo persigue.
   */
  figuresWithoutAsOf: string[]
}

/**
 * Verifica que cada hoja numérica del DTO tenga exactamente un dueño.
 *
 * `notFigures` enumera los números que NO son mediciones —ecos del request (`rangeDays`,
 * `windowDays`), parámetros de cálculo (`targetPosition`), conteos de filas— y exigir que se
 * declaren es parte del punto: "esto es un parámetro, no una cifra" es una afirmación que
 * alguien tiene que hacer a propósito, no algo que se asume por omisión.
 */
export const reportLensCoverage = (input: {
  dto: unknown
  provenance: SeoProvenance[]
  notFigures?: string[]
}): LensCoverageReport => {
  const notFigures = new Set(input.notFigures ?? [])

  const leaves = collectNumericLeafPaths(input.dto).filter(path => !notFigures.has(path))

  const unclaimed: string[] = []
  const ambiguous: string[] = []
  const sectionsWithFigures = new Set<string>()

  for (const leaf of leaves) {
    const owners = input.provenance.filter(entry => sectionClaims(entry.section, leaf))

    if (owners.length === 0) unclaimed.push(leaf)
    else if (owners.length > 1) ambiguous.push(leaf)

    for (const owner of owners) sectionsWithFigures.add(owner.section)
  }

  const figuresWithoutAsOf = input.provenance
    .filter(entry => entry.capturedAt === null && sectionsWithFigures.has(entry.section))
    .map(entry => entry.section)

  return { unclaimed, ambiguous, figuresWithoutAsOf }
}
