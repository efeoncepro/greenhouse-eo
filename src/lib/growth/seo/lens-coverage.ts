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

  for (const leaf of leaves) {
    const owners = input.provenance.filter(entry => sectionClaims(entry.section, leaf))

    if (owners.length === 0) unclaimed.push(leaf)
    else if (owners.length > 1) ambiguous.push(leaf)
  }

  return { unclaimed, ambiguous }
}
