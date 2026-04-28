import 'server-only'

import type { TreasuryFreshness } from '@/lib/finance/account-balances'

/**
 * TASK-705 — Freshness signal canónico para Banco read path.
 * ===========================================================
 *
 * Convención: cualquier snapshot mayor a `STALE_THRESHOLD_SECONDS` se reporta
 * como `isStale: true` para que la UI muestre banner "Snapshot actualizado
 * hace X". El threshold es operativo (no negocio): refleja la SLA esperada
 * entre el evento (`finance.{income,expense}_payment.recorded`) y la
 * proyeccion reactiva (`accountBalancesProjection`).
 *
 * Default: 3600s (1 hora). Override via `BANK_FRESHNESS_STALE_THRESHOLD_SECONDS`
 * env var. El cron `ops-finance-rematerialize-balances` corre 5:00 CLT con
 * lookback 7 dias, asi que en peor caso el snapshot se refresca cada 24h.
 * Pero la lane reactiva (5min cadence) lo deberia mantener fresco minutos
 * despues de cada event.
 */

const DEFAULT_STALE_THRESHOLD_SECONDS = 3600

const getStaleThresholdSeconds = (): number => {
  const raw = process.env.BANK_FRESHNESS_STALE_THRESHOLD_SECONDS
  const parsed = raw ? Number(raw) : DEFAULT_STALE_THRESHOLD_SECONDS

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_STALE_THRESHOLD_SECONDS
}

const formatRelativeLabel = (ageSeconds: number): string => {
  if (ageSeconds < 60) return 'Hace menos de 1 minuto'
  if (ageSeconds < 3600) return `Hace ${Math.floor(ageSeconds / 60)} min`
  if (ageSeconds < 86400) return `Hace ${Math.floor(ageSeconds / 3600)} h`

  return `Hace ${Math.floor(ageSeconds / 86400)} días`
}

/**
 * Construye el `TreasuryFreshness` desde el `computed_at` máximo de los
 * snapshots feeding la response. Si no hay snapshots, retorna `null`-shape
 * (UI maneja como "sin datos").
 */
export const buildFreshnessSignal = (lastMaterializedAt: string | null | undefined): TreasuryFreshness => {
  if (!lastMaterializedAt) {
    return {
      lastMaterializedAt: null,
      ageSeconds: null,
      isStale: false,
      label: null
    }
  }

  const lastMs = new Date(lastMaterializedAt).getTime()

  if (!Number.isFinite(lastMs)) {
    return {
      lastMaterializedAt: null,
      ageSeconds: null,
      isStale: false,
      label: null
    }
  }

  const ageSeconds = Math.max(0, Math.floor((Date.now() - lastMs) / 1000))
  const threshold = getStaleThresholdSeconds()

  return {
    lastMaterializedAt,
    ageSeconds,
    isStale: ageSeconds > threshold,
    label: formatRelativeLabel(ageSeconds)
  }
}
