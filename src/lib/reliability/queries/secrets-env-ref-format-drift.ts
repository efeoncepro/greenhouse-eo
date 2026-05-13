import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { isCanonicalSecretRefShape } from '@/lib/secrets/secret-manager'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-870 Slice 3 — Reliability signal: secret-ref env var format drift.
 *
 * Detección activa upstream del Sentry burst downstream. Cuando un agente
 * future copy-paste un env var `*_SECRET_REF` con quotes envolventes, `\n`
 * literal, whitespace residual o cualquier shape fuera del canónico documentado
 * en CLAUDE.md "Secret Manager Hygiene", el normalizer V2 (TASK-870) lo rechaza
 * en el boundary y los consumers caen al fallback canónico sin spam de Sentry.
 *
 * Esta signal es la **detección upstream** que cierra el loop: itera
 * `process.env`, filtra los names que terminan en `_SECRET_REF`, y cuenta los
 * que NO pasan `isCanonicalSecretRefShape`. Steady=0; cualquier > 0 indica que
 * una env var fue persistida corrupta y los consumers están degradando.
 *
 * **Why "drift" kind**: dos source-of-truth que deberían coincidir — el shape
 * canónico (regex `SECRET_REF_SHAPE` en `secret-manager.ts`) vs el valor real
 * en `process.env`. Mismo vocabulario que `home.rollout.drift`,
 * `account_balances.fx_drift`, etc.
 *
 * **Severidad**:
 *   - 0 → ok
 *   - ≥ 1 → error (configuración rota; consumers caen a fallback degraded)
 *
 * **No-logging policy**: la signal NO loggea el VALOR de las env vars corruptas
 * — solo los NOMBRES. Los valores pueden contener PII, tokens, o leaking info.
 *
 * Pattern reference: TASK-844 Slice 5 `cloud-run-silent-observability.ts`,
 * TASK-780 Phase 3 `home-rollout-drift.ts`.
 */
export const SECRETS_ENV_REF_FORMAT_DRIFT_SIGNAL_ID = 'secrets.env_ref_format_drift'

interface EnvRefDriftSnapshot {
  totalEnvRefs: number
  violations: string[]
}

/**
 * Inspecciona `process.env` (o el env source provisto para tests) y retorna
 * los nombres de `*_SECRET_REF` env vars cuyo valor falla validación canónica.
 *
 * Exportado para reuso desde scripts/audit + tests anti-regresión.
 *
 * Accepts a loose `Record<string, string | undefined>` para permitir test
 * harnesses sin tener que recrear el shape completo de `NodeJS.ProcessEnv`.
 */
export const detectEnvRefFormatDrift = (
  envSource: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): EnvRefDriftSnapshot => {
  const entries = Object.entries(envSource).filter(([key]) => key.endsWith('_SECRET_REF'))

  const violations: string[] = []

  for (const [name, value] of entries) {
    // Tratamos value vacío/undefined como "unset" — NO drift.
    if (!value || value.trim() === '') {
      continue
    }

    if (!isCanonicalSecretRefShape(value)) {
      violations.push(name)
    }
  }

  return {
    totalEnvRefs: entries.length,
    violations
  }
}

export const getSecretsEnvRefFormatDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const snapshot = detectEnvRefFormatDrift()
    const count = snapshot.violations.length

    return {
      signalId: SECRETS_ENV_REF_FORMAT_DRIFT_SIGNAL_ID,
      moduleKey: 'cloud',
      kind: 'drift',
      source: 'getSecretsEnvRefFormatDriftSignal',
      label: 'Env vars *_SECRET_REF con shape no canónico',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? `Sin drift en ${snapshot.totalEnvRefs} env var(s) *_SECRET_REF detectadas.`
          : `${count} env var(s) *_SECRET_REF con shape inválido. Consumers cayendo a fallback degraded. Re-set con \`printf %s "<value>" | vercel env add <NAME> production --force\`.`,
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'total_env_refs',
          value: String(snapshot.totalEnvRefs)
        },
        {
          kind: 'metric',
          label: 'violation_count',
          value: String(count)
        },
        ...(count > 0
          ? [
              {
                kind: 'metric' as const,
                label: 'affected_env_vars',
                value: snapshot.violations.join(', ')
              }
            ]
          : []),
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-870-secret-manager-normalizer-hardening-v2.md'
        },
        {
          kind: 'doc',
          label: 'Hygiene contract',
          value: 'CLAUDE.md — Secret Manager Hygiene section'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'reliability_signal_secrets_env_ref_format_drift' }
    })

    return {
      signalId: SECRETS_ENV_REF_FORMAT_DRIFT_SIGNAL_ID,
      moduleKey: 'cloud',
      kind: 'drift',
      source: 'getSecretsEnvRefFormatDriftSignal',
      label: 'Env vars *_SECRET_REF con shape no canónico',
      severity: 'unknown',
      summary: 'Detector falló — no se pudo evaluar drift de env vars secret-ref.',
      observedAt,
      evidence: []
    }
  }
}
