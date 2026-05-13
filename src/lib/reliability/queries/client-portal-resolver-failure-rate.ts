import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-827 Slice 8 — Reliability signal: client portal resolver failure rate.
 *
 * Detecta failures del resolver canónico
 * (`resolveClientPortalModulesForOrganization`, TASK-825) cuando page guards
 * (`requireViewCodeAccess`, Slice 4) o `<ClientPortalNavigation>` (Slice 3)
 * lo invocan. Falla típica = PG down, cache miss en network failure, query
 * timeout.
 *
 * **D7 V1.0 decision**: signal vive en TASK-827 con `moduleKey='identity'`
 * temporal hasta que TASK-829 cree subsystem rollup `Client Portal Health`
 * dedicado + 5 signals adicionales (cascade, lifecycle drift, etc.).
 *
 * **V1.0 IMPLEMENTATION SCAFFOLD**:
 *
 * El resolver falla se reporta via `captureWithDomain(err, 'client_portal',
 * ...)` desde 2 callsites:
 *   1. `<ClientPortalNavigation>` server component (try/catch → fallback items=[])
 *   2. `requireViewCodeAccess` page guard (try/catch → redirect ?error=)
 *
 * Estos emiten incidents a Sentry con tag `domain=client_portal`. Una
 * implementación canónica del rate signal requiere telemetry adapter para
 * leer Sentry events count via MCP/API. Eso vive en TASK-829 + Sentry
 * adapter canónico.
 *
 * V1.0 reader returns `severity='unknown'` con summary explicativo,
 * preservando la **shape canonical del signal** + wire-up en
 * `getReliabilityOverview`. Cuando TASK-829 ship la telemetry adapter, este
 * reader actualiza solo la lógica interna — call site NO cambia.
 *
 * **Steady state esperado V1.0**: `unknown` (sin data).
 * **Steady state esperado V1.1**: `ok` (resolver healthy, failure rate < 1%).
 *
 * Pattern reference: `entra-webhook-subscription-health.ts` (ISSUE-075) —
 * mismo shape (degrade honest a `unknown`, evidence con state + doc refs).
 */

export const CLIENT_PORTAL_RESOLVER_FAILURE_RATE_SIGNAL_ID =
  'client_portal.composition.resolver_failure_rate'

interface ResolverFailureRateEvaluation {
  readonly severity: 'ok' | 'warning' | 'error' | 'unknown'
  readonly summary: string
  readonly failureRatePercent: number | null
  readonly state: 'pending_implementation' | 'ok' | 'warning' | 'error'
}

/**
 * V1.0 stub — returns `unknown`. TASK-829 V1.1 reemplaza con telemetry
 * adapter real que cuente Sentry events `domain=client_portal` últimos 5min.
 *
 * El stub preserva la shape para que la wire-up downstream sea idempotente.
 */
export const evaluateResolverFailureRate = (): ResolverFailureRateEvaluation => {
  return {
    severity: 'unknown',
    summary:
      'Telemetry adapter pending — TASK-829 V1.1 implementa Sentry events query para domain=client_portal últimos 5min. V1.0 scaffold preserva shape canonical.',
    failureRatePercent: null,
    state: 'pending_implementation'
  }
}

export const getClientPortalResolverFailureRateSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const evaluation = evaluateResolverFailureRate()

    return {
      signalId: CLIENT_PORTAL_RESOLVER_FAILURE_RATE_SIGNAL_ID,
      moduleKey: 'identity', // D7: temporal hasta TASK-829 crea 'client_portal' subsystem
      kind: 'drift',
      source: 'getClientPortalResolverFailureRateSignal',
      label: 'Client portal resolver failure rate',
      severity: evaluation.severity,
      summary: evaluation.summary,
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'state',
          value: evaluation.state
        },
        {
          kind: 'metric',
          label: 'failure_rate_percent',
          value: evaluation.failureRatePercent === null ? 'unknown' : evaluation.failureRatePercent.toFixed(2)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-827-client-portal-composition-layer-ui.md'
        },
        {
          kind: 'doc',
          label: 'V1.1 follow-up',
          value: 'TASK-829 client-portal-reliability-backfill (Sentry telemetry adapter)'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'client_portal', {
      tags: { source: 'reliability_signal_resolver_failure_rate' }
    })

    return {
      signalId: CLIENT_PORTAL_RESOLVER_FAILURE_RATE_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getClientPortalResolverFailureRateSignal',
      label: 'Client portal resolver failure rate',
      severity: 'unknown',
      summary: 'No fue posible computar el signal. Revisa los logs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}
