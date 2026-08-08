import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { readRankEvolution } from '../rank-evolution-reader'
import { readSeoAeoGap } from '../gap/read-seo-aeo-gap'
import { readSiteAuditReport } from '../site-audit/reader'
import type { SeoSiteAuditFindingSeverity } from '../contracts'

/**
 * TASK-1306 — las tres regiones del sidebar del Overview (4a salud · 4b movers · 4c cruce AEO).
 *
 * Cada región degrada de forma INDEPENDIENTE (`observeAndDegrade` por región, §10.5): que
 * la auditoría no exista no puede tumbar los movers ni el cruce. Por eso cada una devuelve
 * su propio `{ ok } | { ok:false, reason }` en vez de un único resultado monolítico — un
 * try/catch global convertiría un fallo parcial en una pantalla vacía.
 *
 * `readRankSnapshotLatest` (citado por la spec) NO EXISTE en el dominio: TASK-1303 sólo
 * dejó `readRankEvolution`. Los movers se DERIVAN de la serie de evolución en vez de
 * reimplementar una lectura de snapshots — el reader canónico sigue siendo la única puerta
 * a los datos de rank.
 */

/** Razón de degradación de una región, para decir "Pendiente: {razón}" sin inventar dato. */
export type SeoSidebarRegionReason = 'disabled' | 'not_connected' | 'token_unhealthy' | 'query_failed' | 'no_data'

export type SeoSidebarRegion<T> = { ok: true; data: T } | { ok: false; reason: SeoSidebarRegionReason }

export interface SeoHealthSummary {
  healthScore: number | null
  captureDate: string
  totals: Record<SeoSiteAuditFindingSeverity, number>
}

export interface SeoMover {
  keyword: string
  url: string | null
  /** Posición actual (la más reciente de la serie). */
  current: number
  /** Posición de referencia ~7 días antes. */
  previous: number
  /** `previous - current`: POSITIVO = mejoró (subió en la SERP, bajó de número). */
  delta: number
}

export interface SeoMoversSummary {
  gained: SeoMover[]
  lost: SeoMover[]
}

export interface SeoAeoGapSummary {
  /** Keywords que rankean bien pero el dominio NO es citado por la IA. */
  riskCount: number
  domainQuadrant: string
}

export interface SeoOverviewSidebar {
  health: SeoSidebarRegion<SeoHealthSummary>
  movers: SeoSidebarRegion<SeoMoversSummary>
  gap: SeoSidebarRegion<SeoAeoGapSummary>
}

/** Umbral del wireframe: sólo es "mover" un cambio de ≥5 posiciones. */
const MOVER_THRESHOLD = 5
const MOVER_LIMIT = 5
const MOVER_WINDOW_DAYS = 14
/** Días hacia atrás que definen "la semana anterior" para el delta WoW. */
const MOVER_LOOKBACK_DAYS = 7

export interface ActiveSeoTarget {
  seoTargetId: string
  rootDomain: string
}

/**
 * Target SEO activo de la organización.
 *
 * Una org puede tener más de un target (dominios distintos); V1 toma el más reciente y
 * lo declara. NO se inventa un merge entre targets: mezclar dominios en un mismo gauge
 * daría una "salud" que no corresponde a ningún sitio real.
 *
 * Devuelve también el dominio porque toda superficie que nombra el sitio lo necesita
 * junto al id, y resolverlos por separado invita a que cada consumer escriba su propio
 * SELECT — que es justo lo que pasó en la ruta de keywords.
 */
export const resolveActiveSeoTarget = async (organizationId: string): Promise<ActiveSeoTarget | null> => {
  const rows = await runGreenhousePostgresQuery<{ seo_target_id: string; root_domain: string }>(
    `SELECT seo_target_id, root_domain
       FROM greenhouse_growth.seo_targets
      WHERE organization_id = $1
        AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1`,
    [organizationId]
  )

  const row = rows[0]

  return row ? { seoTargetId: row.seo_target_id, rootDomain: row.root_domain } : null
}

/** Azúcar para los consumers que sólo necesitan el id. */
export const resolveActiveSeoTargetId = async (organizationId: string): Promise<string | null> =>
  (await resolveActiveSeoTarget(organizationId))?.seoTargetId ?? null

const toRegionReason = (errorCode: string): SeoSidebarRegionReason => {
  switch (errorCode) {
    case 'disabled':
      return 'disabled'
    case 'no_data':
    case 'no_seo_data':
    case 'no_aeo_data':
    case 'run_not_found':
    case 'target_not_found':
      return 'no_data'
    default:
      return 'query_failed'
  }
}

const readHealth = async (seoTargetId: string): Promise<SeoSidebarRegion<SeoHealthSummary>> => {
  const report = await readSiteAuditReport(seoTargetId)

  if (!report.ok) {
    return { ok: false, reason: toRegionReason(report.errorCode) }
  }

  return {
    ok: true,
    data: {
      // `null` se propaga tal cual → la UI dice "Pendiente", no un 0/100 que leería
      // como "sitio pésimo" cuando en realidad el score no se calculó.
      healthScore: report.run.healthScore,
      captureDate: report.run.captureDate,
      totals: report.totals
    }
  }
}

const readMovers = async (seoTargetId: string): Promise<SeoSidebarRegion<SeoMoversSummary>> => {
  const evolution = await readRankEvolution(seoTargetId, { rangeDays: MOVER_WINDOW_DAYS })

  if (!evolution.ok) {
    return { ok: false, reason: toRegionReason(evolution.errorCode) }
  }

  const movers: SeoMover[] = []

  for (const serie of evolution.series) {
    // Sólo puntos con posición real: un `null` significa "no rankeó en el top-20",
    // y tratarlo como un número daría un delta fabricado.
    const measured = serie.points.filter(point => point.position !== null)

    if (measured.length < 2) {
      continue
    }

    const latest = measured[measured.length - 1]
    const latestTime = new Date(latest.date).getTime()

    // Punto de referencia: el más cercano a 7 días atrás SIN pasarse del último.
    // Tomar simplemente el primero de la ventana compararía contra 14 días, no contra
    // "la semana anterior" que promete el copy.
    const reference = measured
      .slice(0, -1)
      .reduce<(typeof measured)[number] | null>((best, candidate) => {
        const candidateGapDays = Math.abs(
          (latestTime - new Date(candidate.date).getTime()) / (1000 * 60 * 60 * 24) - MOVER_LOOKBACK_DAYS
        )

        if (!best) {
          return candidate
        }

        const bestGapDays = Math.abs(
          (latestTime - new Date(best.date).getTime()) / (1000 * 60 * 60 * 24) - MOVER_LOOKBACK_DAYS
        )

        return candidateGapDays < bestGapDays ? candidate : best
      }, null)

    if (!reference) {
      continue
    }

    const current = latest.position as number
    const previous = reference.position as number
    // Positivo = mejoró: pasar de la posición 8 a la 3 es +5.
    const delta = previous - current

    if (Math.abs(delta) < MOVER_THRESHOLD) {
      continue
    }

    movers.push({ keyword: serie.keyword, url: latest.url ?? null, current, previous, delta })
  }

  if (movers.length === 0) {
    return { ok: false, reason: 'no_data' }
  }

  return {
    ok: true,
    data: {
      gained: movers
        .filter(mover => mover.delta > 0)
        .sort((a, b) => b.delta - a.delta)
        .slice(0, MOVER_LIMIT),
      lost: movers
        .filter(mover => mover.delta < 0)
        .sort((a, b) => a.delta - b.delta)
        .slice(0, MOVER_LIMIT)
    }
  }
}

const readGap = async (seoTargetId: string): Promise<SeoSidebarRegion<SeoAeoGapSummary>> => {
  const gap = await readSeoAeoGap(seoTargetId)

  if (!gap.ok) {
    return { ok: false, reason: toRegionReason(gap.errorCode) }
  }

  return {
    ok: true,
    data: {
      // La señal del cruce: rankea (posición buena) pero la IA no lo cita. NUNCA se
      // promedia con el score SEO — son dos ejes ortogonales (boundary §1.1).
      riskCount: gap.quadrants.filter(entry => entry.quadrant === 'riesgo').length,
      domainQuadrant: gap.domainQuadrant
    }
  }
}

export const readSeoOverviewSidebar = async (organizationId: string): Promise<SeoOverviewSidebar> => {
  const seoTargetId = await resolveActiveSeoTargetId(organizationId)

  if (!seoTargetId) {
    const noTarget = { ok: false as const, reason: 'no_data' as const }

    return { health: noTarget, movers: noTarget, gap: noTarget }
  }

  // En paralelo y con `allSettled`: una región que revienta NO puede arrastrar a las
  // otras dos. El fallo se traduce a "Pendiente: la consulta falló", nunca a un throw
  // que deje la página entera en el error boundary.
  const [health, movers, gap] = await Promise.allSettled([
    readHealth(seoTargetId),
    readMovers(seoTargetId),
    readGap(seoTargetId)
  ])

  const settle = <T,>(result: PromiseSettledResult<SeoSidebarRegion<T>>): SeoSidebarRegion<T> =>
    result.status === 'fulfilled' ? result.value : { ok: false, reason: 'query_failed' }

  return { health: settle(health), movers: settle(movers), gap: settle(gap) }
}
