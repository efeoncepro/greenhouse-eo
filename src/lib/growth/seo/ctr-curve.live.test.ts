import { describe, expect, it } from 'vitest'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import {
  buildExpectedCtrCurve,
  estimateOrgCtrLevel,
  isCurveUsableAtPosition,
  readOrgCtrCurve,
  resolveExpectedCtrAtPosition,
  SEO_CTR_CURVE_SAMPLE_FLOOR
} from './ctr-curve'

/**
 * TASK-1792 — Live test de la curva de CTR contra PostgreSQL real.
 *
 * ═══ Por qué este archivo existe (la costura que dejó pasar el defecto) ═══
 *
 * El defecto original sobrevivió porque la verificación estaba partida justo por donde el bug
 * cayó: los tests unitarios mockean la curva y ejercitan el TS **sin el SQL**; el sanity
 * (`scripts/growth/_sanity-seo-keyword-opportunities.ts`) importa sólo
 * `SEO_KEYWORD_OPPORTUNITIES_SQL` y ejercita el SQL **sin el TS**, por una razón buena y
 * documentada (el reader usa el pool y no ve la transacción con `ROLLBACK`). Nada ejercitaba
 * el camino completo lectura → veredicto contra datos reales, y el score cayó en la costura.
 *
 * Este archivo la cierra: lee la curva de las organizaciones que TIENEN serie y verifica el
 * contrato del módulo sobre lo que la base realmente contiene.
 *
 * ⚠️ Un `*.live.test.ts` se SALTA en silencio sin credenciales, y un `skipped` se ve igual que
 * verde. El criterio de cierre de la task es leer `passed`, nunca la ausencia de rojo.
 *
 * Correr con: `pnpm test:live src/lib/growth/seo/ctr-curve` (proxy Cloud SQL arriba).
 */
const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

/** Ventanas realmente independientes: la serie más antigua empieza el 2026-07-31, así que 90d ≡ 28d. */
const WINDOWS = [7, 28]

const listOrganizationsWithSeries = async (): Promise<string[]> => {
  const rows = await runGreenhousePostgresQuery<{ organization_id: string }>(
    `SELECT DISTINCT organization_id
       FROM greenhouse_growth.seo_gsc_daily
      ORDER BY organization_id`
  )

  return rows.map(row => row.organization_id)
}

describe.skipIf(!hasPgConfig)('TASK-1792 — curva de CTR contra PG real', () => {
  it('lee la curva de al menos una organización con serie', async () => {
    const organizations = await listOrganizationsWithSeries()

    expect(organizations.length, 'no hay ninguna organización con serie GSC en la base').toBeGreaterThan(0)

    const curve = await readOrgCtrCurve(organizations[0]!, 28)

    // 🔴 Este assert es el que caza el bug de forma que los mocks no ven: si el helper de PG
    // deja de devolver un array pelado, o si una columna cambia de nombre, la curva llega
    // vacía y todo lo demás degradaría a `fallback` sin que nada fallara.
    expect(curve.size, 'la curva llegó vacía: revisa nombres de columna y la forma del helper de PG').
      toBeGreaterThan(0)

    for (const [position, bucket] of curve) {
      expect(Number.isInteger(position)).toBe(true)
      expect(position).toBeGreaterThan(0)
      expect(Number.isFinite(bucket.impressions)).toBe(true)
      expect(Number.isFinite(bucket.clicks)).toBe(true)
      expect(bucket.clicks).toBeLessThanOrEqual(bucket.impressions)
    }
  })

  it('reporta el veredicto por bucket de cada organización y cada ventana', async () => {
    const organizations = await listOrganizationsWithSeries()

    for (const organizationId of organizations) {
      for (const windowDays of WINDOWS) {
        const curve = await readOrgCtrCurve(organizationId, windowDays)
        const level = estimateOrgCtrLevel(curve)
        const verdict = resolveExpectedCtrAtPosition(curve, 5)

        const topTen = [...curve.entries()]
          .filter(([position]) => position <= 10)
          .sort((a, b) => a[0] - b[0])
          .map(
            ([position, bucket]) =>
              `p${position}=${bucket.impressions}/${bucket.clicks}${isCurveUsableAtPosition(curve, position) ? '✓' : '✗'}`
          )
          .join(' ')

        // Salida deliberada: la task pide que el live test REPORTE el veredicto por bucket, no
        // sólo que pase. Un umbral que deja sin curva a una org sana se ve acá antes de mergear.
         
        console.log(
          `[TASK-1792] ${organizationId} ${windowDays}d · buckets=${curve.size} · nivel=${level.basis}(${level.level.toFixed(3)}) · p5=${verdict.source} ctr=${verdict.expectedCtr.toFixed(5)} · ${topTen}`
        )

        expect(verdict.expectedCtr, `${organizationId} ${windowDays}d: el CTR esperado colapsó a cero`).
          toBeGreaterThan(0)
      }
    }
  })

  /**
   * 🔴 El invariante central, contra datos reales: un bucket sin clics JAMÁS es utilizable.
   * Es la doctrina ●/◑ — ausencia de evidencia no es evidencia de cero — verificada sobre lo
   * que la base contiene hoy, no sobre una fixture escrita a mano.
   */
  it('ningún bucket con cero clics se declara utilizable, y ninguno utilizable tiene CTR cero', async () => {
    const organizations = await listOrganizationsWithSeries()

    for (const organizationId of organizations) {
      const curve = await readOrgCtrCurve(organizationId, 28)

      for (const [position, bucket] of curve) {
        const usable = isCurveUsableAtPosition(curve, position)

        if (bucket.clicks === 0) {
          expect(usable, `${organizationId} p${position}: ${bucket.impressions} impresiones y 0 clics declarado utilizable`).
            toBe(false)
        }

        if (usable) {
          expect(bucket.ctr, `${organizationId} p${position}: bucket utilizable con CTR cero`).toBeGreaterThan(0)
          expect(bucket.impressions).toBeGreaterThanOrEqual(SEO_CTR_CURVE_SAMPLE_FLOOR.minBucketImpressions)
          expect(bucket.clicks).toBeGreaterThanOrEqual(SEO_CTR_CURVE_SAMPLE_FLOOR.minBucketClicks)
        }
      }
    }
  })

  /**
   * Slice 4: la curva EXPUESTA es una sola. Monótona no creciente y sin saltos de orden de
   * magnitud entre posiciones adyacentes — el híbrido anterior daba bucket 8 en 0,0000 y
   * bucket 9 en ~0,027 sobre datos reales.
   */
  it('la curva expuesta es monótona y sin saltos de orden de magnitud, sobre datos reales', async () => {
    const organizations = await listOrganizationsWithSeries()

    for (const organizationId of organizations) {
      for (const windowDays of WINDOWS) {
        const { byPosition } = buildExpectedCtrCurve(await readOrgCtrCurve(organizationId, windowDays))
        const positions = [...byPosition.keys()].sort((a, b) => a - b)

        expect(positions.length).toBeGreaterThan(0)

        for (let i = 1; i < positions.length; i += 1) {
          const previous = byPosition.get(positions[i - 1]!)!
          const current = byPosition.get(positions[i]!)!

          expect(current, `${organizationId} ${windowDays}d: p${positions[i]} promete más CTR que p${positions[i - 1]}`).
            toBeLessThanOrEqual(previous)

          expect(
            current / previous,
            `${organizationId} ${windowDays}d: salto de orden de magnitud entre p${positions[i - 1]} y p${positions[i]}`
          ).toBeGreaterThan(0.1)
        }
      }
    }
  })
})
