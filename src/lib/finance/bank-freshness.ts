import 'server-only'

import type { TreasuryFreshness } from '@/lib/finance/account-balances'

/**
 * TASK-705 — Freshness signal canónico para Banco read path.
 * ===========================================================
 *
 * Convención: si el snapshot cubre la fecha esperada del período, no se reporta
 * stale solo porque `computed_at` tenga varias horas. El threshold operativo
 * de `computed_at` se usa como fallback cuando no sabemos hasta qué fecha llega
 * el snapshot. Esto evita falsos banners en Banco cuando el materializador diario
 * ya produjo balances de hoy en la mañana.
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
 * Construye el `TreasuryFreshness` desde el `computed_at` máximo y, cuando está
 * disponible, la última `balance_date` materializada. Si `latestBalanceDate`
 * cubre `expectedFreshThroughDate`, la señal no es stale aunque `computed_at`
 * supere el threshold horario.
 */
export const buildFreshnessSignal = (
  lastMaterializedAt: string | null | undefined,
  coverage?: {
    latestBalanceDate?: string | Date | null
    expectedFreshThroughDate?: string | Date | null
  }
): TreasuryFreshness => {
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
  const latestBalanceDate = normalizeDateKey(coverage?.latestBalanceDate)
  const expectedFreshThroughDate = normalizeDateKey(coverage?.expectedFreshThroughDate)

  const isCoveredThroughExpectedDate =
    Boolean(latestBalanceDate && expectedFreshThroughDate && latestBalanceDate >= expectedFreshThroughDate)

  return {
    lastMaterializedAt,
    ageSeconds,
    isStale: isCoveredThroughExpectedDate ? false : ageSeconds > threshold,
    label: formatRelativeLabel(ageSeconds)
  }
}

const normalizeDateKey = (value: string | Date | null | undefined): string | null => {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : null
  }

  const trimmed = value.trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  const parsed = new Date(trimmed)

  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null
}
