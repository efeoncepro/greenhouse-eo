import { describe, expect, it } from 'vitest'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { isPathInContentScope, type SeoContentScopeRuleV1 } from './contracts'
import { contentScopeSqlClause } from './sql'

/**
 * TASK-2033 — paridad entre el matcher TS (`isPathInContentScope`) y el fragmento SQL
 * (`contentScopeSqlClause`) contra PostgreSQL real.
 *
 * Son dos implementaciones de la MISMA regla y viven en lenguajes distintos: el informe recorta con el
 * SQL y el resto del código razona con el TS. Si divergen, una página cuenta en la cifra y no en la
 * explicación (o al revés), y ningún test con mocks lo ve. Sólo lectura: no escribe nada.
 *
 * ⚠️ Un `*.live.test.ts` se SALTA en silencio sin credenciales: el criterio es leer `passed`.
 *
 * Correr con: `pnpm test:live src/lib/growth/seo/content-scope` (proxy Cloud SQL arriba).
 */
const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

const RULES: SeoContentScopeRuleV1[] = [
  { kind: 'prefix', path: '/articulos' },
  { kind: 'prefix', path: '/tutoriales' },
  { kind: 'prefix', path: '/inspiracion' },
  { kind: 'exact', path: '/pintura-y-barniz-para-madera-como-elegir' },
  // Comodines de LIKE dentro de una ruta: deben compararse como texto.
  { kind: 'prefix', path: '/100%_natural' }
]

const EDGE_CASES = [
  'https://berel.com/articulos',
  'https://berel.com/articulos/',
  'https://berel.com/articulos/como-pintar',
  'https://www.berel.com/articulos/x?utm_source=a&b=/tutoriales',
  'http://berel.com/tutoriales/x#paso',
  'https://berel.com/articulos-viejos/x',
  'https://berel.com/articulosx',
  'https://berel.com/Articulos/x',
  'https://berel.com/pintura-y-barniz-para-madera-como-elegir',
  'https://berel.com/pintura-y-barniz-para-madera-como-elegir/',
  'https://berel.com/pintura-y-barniz-para-madera-como-elegir/hija',
  'https://berel.com/',
  'https://berel.com',
  'https://berel.com/productos/articulos/x',
  'https://berel.com/100%_natural/guia',
  'https://berel.com/100x_natural/guia',
  'https://berel.com/100%25natural/guia',
  'https://berel.com/inspiracion//',
  'https://sub.berel.com/inspiracion/exteriores'
]

describe.skipIf(!hasPgConfig)('TASK-2033 — alcance de contenido: SQL ≡ TS contra PG real', () => {
  it('clasifica igual los casos de borde', async () => {
    const { clause, params } = contentScopeSqlClause('page', { rules: RULES }, 2)

    const rows = await runGreenhousePostgresQuery<{ page: string; in_scope: boolean | null }>(
      `SELECT page, ${clause} AS in_scope FROM unnest($1::text[]) AS t(page)`,
      [EDGE_CASES, ...params]
    )

    expect(rows).toHaveLength(EDGE_CASES.length)

    for (const row of rows) {
      expect(row.in_scope === true, `divergencia en ${row.page}`).toBe(isPathInContentScope(row.page, RULES))
    }

    // El conjunto no es trivial: hay de los dos lados.
    expect(rows.filter(row => row.in_scope === true).length).toBeGreaterThan(5)
    expect(rows.filter(row => row.in_scope !== true).length).toBeGreaterThan(5)
  })

  it('una página NULL no pertenece a ningún alcance', async () => {
    const { clause, params } = contentScopeSqlClause('page', { rules: RULES }, 1)
    const rows = await runGreenhousePostgresQuery<{ in_scope: boolean | null }>(`SELECT ${clause} AS in_scope FROM (SELECT NULL::text AS page) AS t`, params)

    expect(rows[0]?.in_scope ?? null).not.toBe(true)
  })

  it('clasifica igual TODAS las páginas reales de la organización con más serie', async () => {
    const [organization] = await runGreenhousePostgresQuery<{ organization_id: string }>(
      `SELECT organization_id FROM greenhouse_growth.seo_gsc_daily GROUP BY organization_id ORDER BY COUNT(*) DESC LIMIT 1`
    )

    expect(organization, 'no hay ninguna organización con serie GSC').toBeDefined()

    const { clause, params } = contentScopeSqlClause('page', { rules: RULES }, 2)

    const rows = await runGreenhousePostgresQuery<{ page: string; in_scope: boolean | null }>(
      `SELECT page, ${clause} AS in_scope
         FROM (SELECT DISTINCT page FROM greenhouse_growth.seo_gsc_daily WHERE organization_id = $1) AS pages`,
      [organization!.organization_id, ...params]
    )

    expect(rows.length).toBeGreaterThan(0)

    const diverging = rows.filter(row => (row.in_scope === true) !== isPathInContentScope(row.page, RULES)).map(row => row.page)

    expect(diverging, `páginas que el SQL y el TS clasifican distinto: ${diverging.slice(0, 5).join(', ')}`).toEqual([])
  })
})
