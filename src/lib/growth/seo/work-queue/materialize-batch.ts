import 'server-only'

/**
 * TASK-1700 — Batch del materializador: un target que falla no cae al batch.
 *
 * Resiliencia por fila. La cola no le llama al proveedor —lee tablas ya pagadas— así que un
 * target que revienta cuesta CPU, no dólares; lo que no puede costar es el plan del día de
 * los demás targets.
 *
 * ⚠️ Este módulo entra al bundle del ops-worker (Cloud Run). Su árbol de imports no puede
 * tocar `@core/**`, `@menu` ni `@layouts`: un import de tema revienta el arranque del worker
 * en silencio. El gate `boundary.test.ts` lo verifica sobre el código.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { SEO_MODULE_KEYS_READ } from '../entitlement'
import { isSeoModuleEnabled, isSeoWorkQueueEnabled } from '../flags'
import { materializeSeoWorkQueue } from './materialize'

export interface SeoWorkQueueBatchOutcome {
  seoTargetId: string
  organizationId: string
  status: 'materialized' | 'reused' | 'skipped' | 'failed'
  snapshotId?: string
  itemCount?: number
  errorCode?: string
  /** Orígenes que NO quedaron en `ok`, para que el log diga qué se degradó y no sólo cuántos. */
  degradedOrigins?: string[]
}

export interface SeoWorkQueueBatchResult {
  status: 'succeeded' | 'partial' | 'degraded' | 'skipped'
  eligible: number
  materialized: number
  reused: number
  failed: number
  outcomes: SeoWorkQueueBatchOutcome[]
}

interface EligibleTargetRow extends Record<string, unknown> {
  seo_target_id: string
  organization_id: string
}

/**
 * Mismo predicado de elegibilidad que el resto de los batches SEO: assignment `seo_v2`
 * vigente. Reusarlo y no reescribirlo es lo que evita que un target sea "elegible" para un
 * batch y no para otro.
 */
const listEligibleTargets = async (maxTargets?: number): Promise<EligibleTargetRow[]> => {
  const rows = await runGreenhousePostgresQuery<EligibleTargetRow>(
    `SELECT t.seo_target_id, t.organization_id
       FROM greenhouse_growth.seo_targets t
      WHERE t.status = 'active'
        AND EXISTS (
          SELECT 1
            FROM greenhouse_client_portal.module_assignments ma
           WHERE ma.organization_id = t.organization_id
             AND ma.module_key = ANY($1::text[])
             AND ma.effective_to IS NULL
             AND ma.status IN ('active', 'pilot')
        )
      ORDER BY t.seo_target_id`,
    [[...SEO_MODULE_KEYS_READ]]
  )

  return typeof maxTargets === 'number' && maxTargets > 0 ? rows.slice(0, maxTargets) : rows
}

export const runSeoWorkQueueMaterializeBatch = async (
  options: { maxTargets?: number; force?: boolean; env?: NodeJS.ProcessEnv } = {}
): Promise<SeoWorkQueueBatchResult> => {
  const env = options.env ?? process.env

  // Doble gate: el módulo y el flag propio. Con cualquiera apagado el batch es no-op
  // prod-safe — cero queries, cero ruido en Sentry.
  if (!isSeoModuleEnabled(env) || !isSeoWorkQueueEnabled(env)) {
    return { status: 'skipped', eligible: 0, materialized: 0, reused: 0, failed: 0, outcomes: [] }
  }

  const targets = await listEligibleTargets(options.maxTargets)
  const outcomes: SeoWorkQueueBatchOutcome[] = []

  let materialized = 0
  let reused = 0
  let failed = 0

  for (const target of targets) {
    try {
      const result = await materializeSeoWorkQueue({
        seoTargetId: target.seo_target_id,
        actor: 'ops-worker:seo-work-queue',
        force: options.force,
        env
      })

      if (!result.ok) {
        failed += 1
        outcomes.push({
          seoTargetId: target.seo_target_id,
          organizationId: target.organization_id,
          status: 'failed',
          errorCode: result.errorCode,
          degradedOrigins: result.originHealth.filter(h => h.state !== 'ok').map(h => h.origin)
        })

        continue
      }

      if (result.reused) reused += 1
      else materialized += 1

      outcomes.push({
        seoTargetId: target.seo_target_id,
        organizationId: target.organization_id,
        status: result.reused ? 'reused' : 'materialized',
        snapshotId: result.snapshotId,
        itemCount: result.itemCount,
        degradedOrigins: result.originHealth.filter(h => h.state !== 'ok').map(h => h.origin)
      })
    } catch (error) {
      // Resiliencia por fila: el batch sigue. El command ya reporta a Sentry por dentro.
      failed += 1
      outcomes.push({
        seoTargetId: target.seo_target_id,
        organizationId: target.organization_id,
        status: 'failed',
        errorCode: error instanceof Error ? error.message : 'unknown_error'
      })
    }
  }

  /*
   * Degradación honesta del batch. Elegibles > 0 y CERO materializados nunca se reporta como
   * éxito: un batch que no produjo nada teniendo trabajo que hacer es una falla, aunque cada
   * fila haya "terminado". `reused` sí cuenta como producción — significa que el plan vigente
   * ya era correcto.
   */
  const status: SeoWorkQueueBatchResult['status'] =
    targets.length === 0
      ? 'succeeded'
      : failed === 0
        ? 'succeeded'
        : materialized + reused > 0
          ? 'partial'
          : 'degraded'

  return { status, eligible: targets.length, materialized, reused, failed, outcomes }
}
