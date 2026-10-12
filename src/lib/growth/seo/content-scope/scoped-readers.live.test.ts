import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { readSeoOverviewKpisForWindow } from '../overview/read-overview-kpis'
import { readSeoWindowMovers } from '../overview/read-window-movers'
import { isPathInContentScope, type SeoContentScopeRuleV1 } from './contracts'

/**
 * TASK-2033 — los readers dueños recortados al alcance, contra PostgreSQL real.
 *
 * La verificación es INDEPENDIENTE del fragmento SQL: se leen los clics e impresiones por página de la
 * ventana sin ningún filtro y se suman en TS con `isPathInContentScope`. Si el reader recortado no da
 * exactamente esa suma, el recorte cuenta páginas de más o de menos. Sólo lectura.
 *
 * ⚠️ Un `*.live.test.ts` se SALTA en silencio sin credenciales: el criterio es leer `passed`.
 *
 * Correr con: `pnpm test:live src/lib/growth/seo/content-scope` (proxy Cloud SQL arriba).
 */
const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

interface Subject {
  organizationId: string
  window: { from: string; toExclusive: string }
  previous: { from: string; toExclusive: string }
  rules: SeoContentScopeRuleV1[]
}

/**
 * Sujeto real: la organización con más serie, sus dos últimos meses calendario COMPLETOS y, como alcance, las
 * dos secciones de primer nivel que no son la de más clics (así el alcance es una parte real del sitio, ni vacía
 * ni el sitio entero).
 */
const resolveSubject = async (): Promise<Subject | null> => {
  const [organization] = await runGreenhousePostgresQuery<{ organization_id: string; max_date: string }>(
    `SELECT organization_id, MAX(capture_date)::text AS max_date
       FROM greenhouse_growth.seo_gsc_daily
      GROUP BY organization_id
      ORDER BY COUNT(*) DESC
      LIMIT 1`
  )

  if (!organization) return null

  const [months] = await runGreenhousePostgresQuery<{ current_from: string; current_to: string; previous_from: string }>(
    `SELECT (date_trunc('month', $1::date) - interval '1 month')::date::text AS current_from,
            date_trunc('month', $1::date)::date::text AS current_to,
            (date_trunc('month', $1::date) - interval '2 month')::date::text AS previous_from`,
    [organization.max_date]
  )

  const sections = await runGreenhousePostgresQuery<{ section: string }>(
    `SELECT section
       FROM (
         SELECT '/' || split_part(regexp_replace(page, '^https?://[^/]+', ''), '/', 2) AS section, SUM(clicks) AS clicks
           FROM greenhouse_growth.seo_gsc_daily
          WHERE organization_id = $1 AND capture_date >= $2::date AND capture_date < $3::date
            AND split_part(regexp_replace(page, '^https?://[^/]+', ''), '/', 2) ~ '^[a-z0-9-]+$'
          GROUP BY 1
       ) AS sections
      ORDER BY clicks DESC, section COLLATE "C"
      LIMIT 3`,
    [organization.organization_id, months!.current_from, months!.current_to]
  )

  if (sections.length < 3) return null

  return {
    organizationId: organization.organization_id,
    window: { from: months!.current_from, toExclusive: months!.current_to },
    previous: { from: months!.previous_from, toExclusive: months!.current_from },
    rules: sections.slice(1).map(row => ({ kind: 'prefix' as const, path: row.section }))
  }
}

const sumByPage = async (subject: Subject, window: { from: string; toExclusive: string }) => {
  const rows = await runGreenhousePostgresQuery<{ page: string; clicks: string; impressions: string }>(
    `SELECT page, SUM(clicks)::text AS clicks, SUM(impressions)::text AS impressions
       FROM greenhouse_growth.seo_gsc_daily
      WHERE organization_id = $1 AND capture_date >= $2::date AND capture_date < $3::date
      GROUP BY page`,
    [subject.organizationId, window.from, window.toExclusive]
  )

  const inScope = rows.filter(row => isPathInContentScope(row.page, subject.rules))

  return {
    all: { clicks: rows.reduce((sum, row) => sum + Number(row.clicks), 0), impressions: rows.reduce((sum, row) => sum + Number(row.impressions), 0) },
    scoped: { clicks: inScope.reduce((sum, row) => sum + Number(row.clicks), 0), impressions: inScope.reduce((sum, row) => sum + Number(row.impressions), 0) }
  }
}

describe.skipIf(!hasPgConfig)('TASK-2033 — readers SEO recortados al alcance, contra PG real', () => {
  let subject: Subject | null = null

  beforeAll(async () => {
    // El runner de live tests sólo exporta el acceso a la base; el flag del módulo se prende aquí.
    vi.stubEnv('GROWTH_SEO_ENABLED', 'true')
    subject = await resolveSubject()
  })

  afterAll(() => {
    vi.unstubAllEnvs()
  })

  it('hay un sujeto real con al menos tres secciones', () => {
    expect(subject, 'ninguna organización tiene serie suficiente para probar el recorte').not.toBeNull()
  })

  it('totales y serie del alcance son la suma independiente de sus páginas, y una parte propia del sitio', async () => {
    const expected = await sumByPage(subject!, subject!.window)
    const scoped = await readSeoOverviewKpisForWindow(subject!.organizationId, subject!.window, { scope: { rules: subject!.rules } })
    const whole = await readSeoOverviewKpisForWindow(subject!.organizationId, subject!.window)

    expect(scoped.totals.clicks).toBe(expected.scoped.clicks)
    expect(scoped.totals.impressions).toBe(expected.scoped.impressions)
    expect(scoped.series.reduce((sum, point) => sum + point.clicks, 0)).toBe(expected.scoped.clicks)
    // Sin alcance, el reader sigue midiendo la propiedad completa.
    expect(whole.totals.clicks).toBe(expected.all.clicks)
    expect(whole.totals.impressions).toBe(expected.all.impressions)
    // El alcance es una parte real: ni vacía ni el sitio entero.
    expect(scoped.totals.impressions).toBeGreaterThan(0)
    expect(scoped.totals.impressions).toBeLessThan(whole.totals.impressions)
    // Posición y CTR existen y son coherentes con sus sumas.
    expect(scoped.totals.position).not.toBeNull()
    expect(scoped.totals.ctr).toBeCloseTo(expected.scoped.clicks / expected.scoped.impressions, 10)
  })

  it('una lista de reglas vacía no recorta', async () => {
    const whole = await readSeoOverviewKpisForWindow(subject!.organizationId, subject!.window)
    const empty = await readSeoOverviewKpisForWindow(subject!.organizationId, subject!.window, { scope: { rules: [] } })

    expect(empty.totals).toEqual(whole.totals)
  })

  it('el recorte no vuelve lenta la lectura mensual', async () => {
    // El predicado por fila tardaba ~5 s sobre un mes real; clasificar una vez por página lo deja bajo el segundo.
    // El umbral es holgado a propósito (red + proxy): caza una regresión de orden de magnitud, no milisegundos.
    const startedAt = Date.now()

    await readSeoOverviewKpisForWindow(subject!.organizationId, subject!.window, { scope: { rules: subject!.rules } })

    expect(Date.now() - startedAt).toBeLessThan(4000)
  })

  it.each(['query', 'page'] as const)('movers por %s: los totales son los del alcance en las dos ventanas', async dimension => {
    const current = await sumByPage(subject!, subject!.window)
    const previous = await sumByPage(subject!, subject!.previous)

    const result = await readSeoWindowMovers(subject!.organizationId, { window: subject!.window, previous: subject!.previous, dimension, limit: 20, scope: { rules: subject!.rules } })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.totalClicks).toBe(current.scoped.clicks)
    expect(result.previousTotalClicks).toBe(previous.scoped.clicks)

    // Ninguna página fuera del alcance aparece entre las que «movieron» los clics.
    if (dimension === 'page') {
      expect(result.movers.every(mover => isPathInContentScope(mover.key, subject!.rules))).toBe(true)
    }

    // El aporte de los grupos listados nunca supera en valor absoluto lo que el alcance tuvo en total.
    for (const mover of result.movers) {
      expect(mover.clicks).toBeLessThanOrEqual(current.scoped.clicks)
      expect(mover.previousClicks).toBeLessThanOrEqual(previous.scoped.clicks)
    }
  })
})
