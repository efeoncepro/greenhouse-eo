import 'server-only'

import { getFinanceSupplierFromPostgres } from '@/lib/finance/postgres-store'
import { syncProviderFromFinanceSupplier } from '@/lib/providers/canonical'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-771 Slice 2 — Reactive projection: greenhouse_core.providers (PG) →
 * greenhouse.providers (BQ) + greenhouse.fin_suppliers.provider_id (BQ).
 *
 * Subscribe a `provider.upserted` (emitido dentro de la tx PG por
 * `upsertProviderFromFinanceSupplierInPostgres`) y mantiene los datasets BQ
 * downstream consistentes vía `syncProviderFromFinanceSupplier` (helper canónico
 * que ya hace MERGE BQ + UPDATE fin_suppliers).
 *
 * Re-lee el supplier desde Postgres (single source of truth) en lugar de confiar
 * en el payload del outbox event. Eso garantiza:
 *   - Consistencia frente a updates posteriores al evento (p.ej. el operador
 *     edita el supplier antes que la projection drene el evento).
 *   - Robustez ante payloads stale o eventos viejos en backfill manual.
 *
 * **Idempotente**: tanto el MERGE BQ como el UPDATE fin_suppliers son safe
 * re-runs (MERGE por provider_id + UPDATE filtrado por COALESCE diff).
 *
 * **Domain**: 'finance'. El scheduler `ops-reactive-finance` (cron `(asterisco)/5 min`) ya
 * cubre este dominio sin Cloud Scheduler job nuevo.
 *
 * **Failure mode**: si `getFinanceSupplierFromPostgres` retorna null (supplier
 * eliminado tras emitir el evento), la projection retorna null silenciosamente
 * — el evento se acknowledged como no-op. Si el sync BQ throw-ea, el reactive
 * consumer routea a retry (maxRetries=3) y eventualmente dead-letter, donde el
 * reliability signal `finance.providers.bq_sync_drift` (Slice 4) lo captura.
 *
 * Recovery del incidente 2026-05-03: antes del refactor, el sync BQ corría
 * inline en el POST/PUT supplier handlers, devolviendo 500 al usuario aunque
 * PG hubiese commiteado. Ver TASK-771 + commit Slice 1.
 */
export const providerBqSyncProjection: ProjectionDefinition = {
  name: 'provider_bq_sync',
  description: 'Sync greenhouse_core.providers (PG) → greenhouse.providers + fin_suppliers.provider_id (BQ) when a finance supplier is upserted',
  domain: 'finance',
  triggerEvents: ['provider.upserted'],
  extractScope: payload => {
    const supplierId = typeof payload.supplierId === 'string' ? payload.supplierId.trim() : ''

    if (!supplierId) {
      // Eventos sin supplierId no aplican a este sink (otros emitters podrían
      // crear providers sin supplier — quedan no-op:no-scope).
      return null
    }

    return {
      entityType: 'finance_supplier',
      entityId: supplierId
    }
  },
  refresh: async scope => {
    const supplierId = scope.entityId

    let supplier: Awaited<ReturnType<typeof getFinanceSupplierFromPostgres>> = null

    try {
      supplier = await getFinanceSupplierFromPostgres(supplierId)
    } catch (err) {
      captureWithDomain(err, 'finance', {
        tags: { source: 'provider_bq_sync', stage: 'pg_lookup' },
        extra: { supplierId }
      })

      throw err
    }

    if (!supplier) {
      return `provider_bq_sync skipped: supplier ${supplierId} not found in PG (deleted after event emitted)`
    }

    try {
      const result = await syncProviderFromFinanceSupplier({
        supplierId: supplier.supplierId,
        providerId: supplier.providerId,
        legalName: supplier.legalName,
        tradeName: supplier.tradeName,
        website: supplier.website,
        isActive: supplier.isActive
      })

      if (!result) {
        return `provider_bq_sync no-op for ${supplierId}: provider id/name unresolved`
      }

      return `provider_bq_sync ok for ${supplierId}: provider=${result.providerId}`
    } catch (err) {
      captureWithDomain(err, 'finance', {
        tags: { source: 'provider_bq_sync', stage: 'bq_sync' },
        extra: { supplierId, providerId: supplier.providerId }
      })

      throw err
    }
  },
  maxRetries: 3
}
