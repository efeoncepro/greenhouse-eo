/**
 * TASK-1662 — Commands canónicos `declareCompetitors` / `retireCompetitors`.
 *
 * Primitive gobernado (Full API Parity): UI operador, Nexa y el lane ecosystem/MCP escriben
 * `greenhouse_growth.seo_competitors` SOLO por acá.
 *
 * ═══ Las dos decisiones que dan forma a este archivo ═══
 *
 * 1. **Un competidor es un hecho DECLARADO, con autor, fecha y procedencia.** La *propuesta*
 *    puede venir de una máquina (top-N ya pagado de TASK-1699, colector prospect de
 *    TASK-1709) y viaja como `proposalRef` OPACA; la *declaración* es siempre de un humano
 *    identificable. Propone la máquina, declara el humano — un competidor mal elegido
 *    invalida todo el análisis río abajo y esa decisión no se automatiza.
 *
 * 2. 🔴 **Declarar es un COMPROMISO DE GASTO DIFERIDO** (misma clase que `trackKeywords`):
 *    el write no cuesta nada; la captura de cobertura (Slice 2) paga al proveedor por cada
 *    competidor VIGENTE en cada ciclo. De ahí el techo gobernado por target, el outcome por
 *    ítem (nunca un booleano) y el reverso `retireCompetitors` en el mismo PR.
 *
 * ═══ Append-only ═══
 *
 * `seo_competitors` tiene trigger anti-DELETE (TASK-1299) e índice único parcial
 * `(seo_target_id, competitor_domain) WHERE effective_to IS NULL`. Retirar es cerrar la
 * ventana con `effective_to` (con `clock_timestamp()`, NUNCA `NOW()` — el dominio ya se
 * quemó con `effective_to = effective_from` violando el CHECK) + autoría del retiro
 * (`retired_by`, acoplada por CHECK en el schema). La cobertura ya capturada queda como
 * histórico; re-declarar el mismo dominio después abre una ventana nueva sin chocar.
 */

import 'server-only'

import { withTransaction } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import {
  SEO_COMPETITOR_DECLARED_EVENT,
  SEO_COMPETITOR_RETIRED_EVENT,
  SEO_RANK_SNAPSHOT_AGGREGATE_TYPE,
  type DeclareCompetitorsResult,
  type RetireCompetitorsResult,
  type SeoCompetitorDeclareOutcome,
  type SeoCompetitorRetireOutcome,
  type SeoCompetitorSummary,
  type SeoKeywordTrackSource
} from './contracts'
import { normalizeOverviewDomain } from './domain-overview/persist'
import { resolveSeoEntitlement } from './entitlement'
import { isSeoModuleEnabled } from './flags'

/**
 * Techo de competidores VIGENTES por target — el freno del gasto diferido de cobertura.
 *
 * El default es deliberadamente chico: la spec de la task manda "un competidor a la vez" en
 * V1 para medir el costo real antes de escalar, y cada competidor multiplica la factura de
 * cobertura (~2 llamadas Labs por ciclo). Subirlo a un cliente grande es un env var, no un
 * deploy — pero el default correcto de un límite de gasto es el que duele antes que la
 * factura.
 */
export const COMPETITORS_CAPACITY_ENV = 'GROWTH_SEO_COMPETITORS_PER_TARGET'
const DEFAULT_COMPETITORS_CAPACITY = 5

/** Techo del lote por llamada — declarar competidores nunca es una operación masiva. */
const MAX_DOMAINS_PER_CALL = 10

/** Largo máximo de un dominio declarable (RFC 1035) y de una `proposalRef` opaca. */
const MAX_DOMAIN_LENGTH = 253
const MAX_PROPOSAL_REF_LENGTH = 500

const DOMAIN_SHAPE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/

export const resolveCompetitorCapacity = (env: NodeJS.ProcessEnv = process.env): number => {
  const parsed = Number.parseInt(env[COMPETITORS_CAPACITY_ENV] ?? '', 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_COMPETITORS_CAPACITY
}

/**
 * Normaliza un dominio declarable: lowercase, sin scheme, sin path, sin `www.`.
 * Reusa el normalizador canónico del hecho de dominio (TASK-1775) — dos normalizadores
 * distintos harían que el mismo competidor fuera dos filas y dos compras.
 */
export const normalizeCompetitorDomain = (raw: string): string | null => {
  const value = normalizeOverviewDomain(typeof raw === 'string' ? raw : '')

  if (value.length === 0 || value.length > MAX_DOMAIN_LENGTH) return null
  if (!DOMAIN_SHAPE.test(value)) return null

  return value
}

interface TargetRow extends Record<string, unknown> {
  organization_id: string
  status: string
  root_domain: string
}

export interface DeclareCompetitorsOptions {
  /** Procedencia del write (quién EJECUTÓ). Ortogonal al autor de la declaración. */
  source?: SeoKeywordTrackSource
  /**
   * Referencia OPACA a la propuesta de máquina que originó la declaración (p. ej. el
   * reader de candidatos del top-N de TASK-1699). NULL = declaración directa. Nunca FK.
   */
  proposalRef?: string
  env?: NodeJS.ProcessEnv
}

export const declareCompetitors = async (
  seoTargetId: string,
  domains: string[],
  actor: string,
  options: DeclareCompetitorsOptions = {}
): Promise<DeclareCompetitorsResult> => {
  const env = options.env ?? process.env

  if (!isSeoModuleEnabled(env)) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  const source: SeoKeywordTrackSource = options.source ?? 'operator_ui'
  const proposalRef = options.proposalRef?.trim().slice(0, MAX_PROPOSAL_REF_LENGTH) || null
  const capacity = resolveCompetitorCapacity(env)

  // Dedupe preservando orden de llegada; las inválidas también se dedupean (dos cadenas
  // basura iguales son el mismo problema reportado dos veces).
  const seen = new Set<string>()
  const requested: Array<{ raw: string; domain: string | null }> = []

  for (const raw of domains.slice(0, MAX_DOMAINS_PER_CALL)) {
    const domain = normalizeCompetitorDomain(raw)
    const key = domain ?? (typeof raw === 'string' ? raw.trim().toLowerCase() : '')

    if (seen.has(key)) continue

    seen.add(key)
    requested.push({ raw: typeof raw === 'string' ? raw : '', domain })
  }

  if (!requested.some(entry => entry.domain !== null)) {
    return { ok: false, errorCode: 'no_domains', status: null }
  }

  try {
    const targets = await runGreenhousePostgresQuery<TargetRow>(
      `SELECT organization_id, status, root_domain
         FROM greenhouse_growth.seo_targets
        WHERE seo_target_id = $1`,
      [seoTargetId]
    )

    const target = targets[0]

    if (!target) {
      return { ok: false, errorCode: 'target_not_found', status: null }
    }

    // Un target pausado no debe crecer su lista: los competidores nuevos entrarían al ciclo
    // de gasto en cuanto alguien lo reactive, sin que nadie haya vuelto a decidirlo.
    if (target.status !== 'active') {
      return { ok: false, errorCode: 'target_not_active', status: null }
    }

    const entitlement = await resolveSeoEntitlement(target.organization_id, env)

    if (!entitlement.hasModule) {
      return { ok: false, errorCode: 'no_entitlement', status: null }
    }

    const clientRootDomain = normalizeCompetitorDomain(target.root_domain)

    const result = await withTransaction(async client => {
      // `FOR UPDATE` serializa dos declaraciones concurrentes contra el mismo techo.
      const activeRows = await client.query<{ competitor_domain: string }>(
        `SELECT competitor_domain
           FROM greenhouse_growth.seo_competitors
          WHERE seo_target_id = $1
            AND effective_to IS NULL
            FOR UPDATE`,
        [seoTargetId]
      )

      const active = new Set(activeRows.rows.map(row => row.competitor_domain))
      const outcomes: SeoCompetitorDeclareOutcome[] = []
      const toInsert: string[] = []

      for (const entry of requested) {
        // El propio dominio del cliente no es su competidor: declararlo produciría un gap
        // de sí mismo contra sí mismo, siempre vacío y siempre cobrado.
        if (entry.domain === null || entry.domain === clientRootDomain) {
          outcomes.push({ domain: entry.domain ?? entry.raw, status: 'invalid' })
          continue
        }

        if (active.has(entry.domain)) {
          outcomes.push({ domain: entry.domain, status: 'already_declared' })
          continue
        }

        // Techo contra el conteo PROYECTADO: un lote de 4 con 1 cupo libre declara 1 y
        // rebota 3, en vez de rebotar el lote entero o pasarse.
        if (active.size + toInsert.length >= capacity) {
          outcomes.push({ domain: entry.domain, status: 'capacity_exceeded' })
          continue
        }

        toInsert.push(entry.domain)
        outcomes.push({ domain: entry.domain, status: 'declared' })
      }

      let inserted = 0

      if (toInsert.length > 0) {
        // `DO NOTHING` sobre el índice único parcial: última defensa contra una carrera que
        // el `FOR UPDATE` no cubra. La autoría es NOT NULL de facto: el CHECK del schema
        // exige el triple (declared_by, declared_at, declared_source) completo.
        const insertResult = await client.query<{ seo_competitor_id: string; competitor_domain: string }>(
          `INSERT INTO greenhouse_growth.seo_competitors
                       (seo_target_id, competitor_domain, declared_by, declared_at, declared_source, proposal_ref)
                SELECT $1, domain, $2, clock_timestamp(), $3, $4
                  FROM UNNEST($5::text[]) AS domain
           ON CONFLICT (seo_target_id, competitor_domain) WHERE effective_to IS NULL DO NOTHING
             RETURNING seo_competitor_id, competitor_domain`,
          [seoTargetId, actor, source, proposalRef, toInsert]
        )

        inserted = insertResult.rowCount ?? 0

        for (const row of insertResult.rows) {
          const outcome = outcomes.find(o => o.domain === row.competitor_domain && o.status === 'declared')

          if (outcome) outcome.seoCompetitorId = row.seo_competitor_id
        }
      }

      const activeCompetitorCount = active.size + inserted

      // Outbox DENTRO de la transacción y sólo si el estado REALMENTE cambió. Rastro de
      // auditoría de un compromiso de gasto — coordenadas, nunca los datos.
      if (inserted > 0) {
        await publishOutboxEvent(
          {
            aggregateType: SEO_RANK_SNAPSHOT_AGGREGATE_TYPE,
            aggregateId: seoTargetId,
            eventType: SEO_COMPETITOR_DECLARED_EVENT,
            payload: {
              seoTargetId,
              organizationId: target.organization_id,
              declaredCount: inserted,
              declaredDomains: toInsert,
              activeCompetitorCount,
              proposalRef,
              source,
              actor
            }
          },
          client as never
        )
      }

      return { outcomes, activeCompetitorCount }
    })

    return {
      ok: true,
      seoTargetId,
      organizationId: target.organization_id,
      outcomes: result.outcomes,
      activeCompetitorCount: result.activeCompetitorCount,
      capacity
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_declare_competitors_command' },
      extra: { seoTargetId, actor, requested: requested.length }
    })

    return { ok: false, errorCode: 'query_failed', status: null }
  }
}

export const retireCompetitors = async (
  seoTargetId: string,
  domains: string[],
  actor: string,
  options: { reason?: string; env?: NodeJS.ProcessEnv } = {}
): Promise<RetireCompetitorsResult> => {
  const env = options.env ?? process.env

  if (!isSeoModuleEnabled(env)) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  const capacity = resolveCompetitorCapacity(env)
  const reason = options.reason?.trim().slice(0, 500) || null

  const seen = new Set<string>()
  const requested: Array<{ raw: string; domain: string | null }> = []

  for (const raw of domains.slice(0, MAX_DOMAINS_PER_CALL)) {
    const domain = normalizeCompetitorDomain(raw)
    const key = domain ?? (typeof raw === 'string' ? raw.trim().toLowerCase() : '')

    if (seen.has(key)) continue

    seen.add(key)
    requested.push({ raw: typeof raw === 'string' ? raw : '', domain })
  }

  if (!requested.some(entry => entry.domain !== null)) {
    return { ok: false, errorCode: 'no_domains', status: null }
  }

  try {
    const targets = await runGreenhousePostgresQuery<TargetRow>(
      `SELECT organization_id, status, root_domain
         FROM greenhouse_growth.seo_targets
        WHERE seo_target_id = $1`,
      [seoTargetId]
    )

    const target = targets[0]

    if (!target) {
      return { ok: false, errorCode: 'target_not_found', status: null }
    }

    // ⚠️ Como en `untrackKeywords`, acá NO se exige `status = 'active'`: retirar siempre
    // tiene que poder hacerse — bloquear la salida dejaría el gasto congelado sin bajada.
    const entitlement = await resolveSeoEntitlement(target.organization_id, env)

    if (!entitlement.hasModule) {
      return { ok: false, errorCode: 'no_entitlement', status: null }
    }

    const result = await withTransaction(async client => {
      const valid = requested.filter(entry => entry.domain !== null).map(entry => entry.domain as string)

      const closed = await client.query<{ competitor_domain: string }>(
        // 🔴 `clock_timestamp()` y NO `NOW()` — ver header del archivo.
        `UPDATE greenhouse_growth.seo_competitors
            SET effective_to = clock_timestamp(),
                retired_by = $3,
                retired_reason = $4
          WHERE seo_target_id = $1
            AND effective_to IS NULL
            AND competitor_domain = ANY($2::text[])
        RETURNING competitor_domain`,
        [seoTargetId, valid, actor, reason]
      )

      const closedSet = new Set(closed.rows.map(row => row.competitor_domain))

      const outcomes: SeoCompetitorRetireOutcome[] = requested.map(entry => ({
        domain: entry.domain ?? entry.raw,
        status: entry.domain === null ? 'invalid' : closedSet.has(entry.domain) ? 'retired' : 'not_declared'
      }))

      const remaining = await client.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n
           FROM greenhouse_growth.seo_competitors
          WHERE seo_target_id = $1
            AND effective_to IS NULL`,
        [seoTargetId]
      )

      const activeCompetitorCount = Number(remaining.rows[0]?.n ?? 0)

      if (closedSet.size > 0) {
        await publishOutboxEvent(
          {
            aggregateType: SEO_RANK_SNAPSHOT_AGGREGATE_TYPE,
            aggregateId: seoTargetId,
            eventType: SEO_COMPETITOR_RETIRED_EVENT,
            payload: {
              seoTargetId,
              organizationId: target.organization_id,
              retiredCount: closedSet.size,
              retiredDomains: [...closedSet],
              activeCompetitorCount,
              reason,
              actor
            }
          },
          client as never
        )
      }

      return { outcomes, activeCompetitorCount }
    })

    return {
      ok: true,
      seoTargetId,
      organizationId: target.organization_id,
      outcomes: result.outcomes,
      activeCompetitorCount: result.activeCompetitorCount,
      capacity
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_retire_competitors_command' },
      extra: { seoTargetId, actor, requested: requested.length }
    })

    return { ok: false, errorCode: 'query_failed', status: null }
  }
}

/**
 * Reader de competidores vigentes de un target — la lista que el gap recorre y la que las
 * superficies muestran. ⚠️ El listado de competidores de un cliente es información comercial
 * sensible: el consumer decide el gate (capability en el app-lane; bindings `internal` en el
 * lane ecosystem — auditoría §7: la comparativa competitiva no se expone al cliente).
 */
export const listActiveCompetitors = async (seoTargetId: string): Promise<SeoCompetitorSummary[]> => {
  const rows = await runGreenhousePostgresQuery<{
    seo_competitor_id: string
    competitor_domain: string
    declared_by: string
    declared_at: string
    declared_source: string
    proposal_ref: string | null
  }>(
    `SELECT seo_competitor_id, competitor_domain, declared_by,
            declared_at::text AS declared_at, declared_source, proposal_ref
       FROM greenhouse_growth.seo_competitors
      WHERE seo_target_id = $1
        AND effective_to IS NULL
      ORDER BY declared_at ASC`,
    [seoTargetId]
  )

  return rows.map(row => ({
    seoCompetitorId: row.seo_competitor_id,
    competitorDomain: row.competitor_domain,
    declaredBy: row.declared_by,
    declaredAt: row.declared_at,
    declaredSource: row.declared_source as SeoKeywordTrackSource,
    proposalRef: row.proposal_ref
  }))
}
