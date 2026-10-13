import type { SeoContentScopeFilter } from './contracts'

/**
 * TASK-2033 — fragmento SQL que recorta por alcance de contenido. Es la versión PostgreSQL de
 * `isPathInContentScope` (`./contracts.ts`): las mismas operaciones de texto, en el mismo orden.
 *
 * - La columna sale de un mapa CERRADO: nunca una cadena del caller dentro del SQL.
 * - Las reglas viajan como dos parámetros `text[]` (exactas y prefijos); `starts_with` en vez de
 *   `LIKE`, así un `%` o un `_` de una ruta no se interpreta como comodín.
 * - Una columna NULL (un ítem de la cola sin página) no pertenece a ningún alcance: el predicado da
 *   NULL y la fila queda fuera.
 */

const COLUMNS = { page: 'page', target_url: 'target_url', url: 'url', scope_pages_page: 'scope_pages.page' } as const

export type ContentScopeColumn = keyof typeof COLUMNS

export interface ContentScopeSqlClause {
  /** Predicado booleano entre paréntesis, listo para `AND <clause>`. */
  clause: string
  /** Dos parámetros, en este orden: rutas exactas y prefijos. */
  params: [string[], string[]]
}

/**
 * @param firstParamIndex índice (1-based) del primer `$n` libre de la consulta; el fragmento usa ese y el siguiente.
 */
export const contentScopeSqlClause = (column: ContentScopeColumn, scope: SeoContentScopeFilter, firstParamIndex: number): ContentScopeSqlClause => {
  const exact = scope.rules.filter(rule => rule.kind === 'exact').map(rule => rule.path)
  const prefixes = scope.rules.filter(rule => rule.kind === 'prefix').map(rule => rule.path)
  const exactParam = `$${firstParamIndex}::text[]`
  const prefixParam = `$${firstParamIndex + 1}::text[]`

  const clause = `(
    SELECT scope_path.path = ANY(${exactParam})
        OR EXISTS (
             SELECT 1
               FROM unnest(${prefixParam}) AS scope_prefix(prefix)
              WHERE scope_path.path = scope_prefix.prefix
                 OR starts_with(scope_path.path, scope_prefix.prefix || '/')
           )
      FROM (
        SELECT rtrim(split_part(split_part(regexp_replace(${COLUMNS[column]}, '^https?://[^/]+', ''), '?', 1), '#', 1), '/') AS path
      ) AS scope_path
  )`

  return { clause, params: [exact, prefixes] }
}

/**
 * Recorte de `greenhouse_growth.seo_gsc_daily` por alcance: `page IN (páginas del alcance en ese rango)`.
 *
 * ⚠️ NO uses `contentScopeSqlClause('page', …)` directo sobre esa tabla. El predicado por fila recalcula la ruta
 * (una expresión regular) varias veces por CADA fila de medición: medido sobre un mes real de una propiedad con
 * ~204 mil filas tardaba ~5 s por consulta, y una edición hace cerca de diez. Aquí la regla se aplica UNA vez por
 * página distinta del rango (cientos, no cientos de miles) y el resto es un hash join: ~0,4 s, mismo resultado
 * exacto. La ruta se sigue calculando con el mismo predicado canónico, así que la paridad con el matcher TS se
 * conserva.
 *
 * El rango acota qué páginas se clasifican; debe CUBRIR las fechas de la consulta que lo usa (un rango más ancho es
 * correcto, uno más angosto dejaría páginas fuera). Los tres fragmentos de rango son SQL del reader (`$1`,
 * `$2::date`), nunca texto del caller.
 */
export const gscPagesInContentScopeSql = (
  scope: SeoContentScopeFilter,
  firstParamIndex: number,
  range: { organizationSql: string; fromSql: string; toExclusiveSql: string }
): ContentScopeSqlClause => {
  const inner = contentScopeSqlClause('scope_pages_page', scope, firstParamIndex)

  const clause = `page IN (
    SELECT scope_pages.page
      FROM (
        SELECT DISTINCT page
          FROM greenhouse_growth.seo_gsc_daily
         WHERE organization_id = ${range.organizationSql}
           AND capture_date >= ${range.fromSql}
           AND capture_date < ${range.toExclusiveSql}
      ) AS scope_pages
     WHERE ${inner.clause}
  )`

  return { clause, params: inner.params }
}
