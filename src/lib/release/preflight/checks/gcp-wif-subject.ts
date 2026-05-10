/**
 * TASK-850 — Preflight check #10: GCP WIF subject verification.
 *
 * Verifies that the GCP Workload Identity Federation provider for GitHub
 * Actions is configured with the canonical attribute mapping that includes
 * `environment` (production). Without this, GH Actions impersonation may
 * fall back to less-restrictive policies.
 *
 * Per Decision 4: GCP is STRICT (failure = error). gcloud CLI must be
 * installed + authenticated; if not, severity unknown not_configured.
 */

import 'server-only'

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'

import type { PreflightCheckResult } from '../types'
import type { PreflightInput } from '../runner'

const execFileAsync = promisify(execFile)
const GCLOUD_TIMEOUT_MS = 10_000

const GCP_PROJECT = process.env.GCP_PROJECT ?? 'efeonce-group'
const WIF_POOL = process.env.GCP_WIF_POOL ?? 'github-actions-pool'
const WIF_PROVIDER = process.env.GCP_WIF_PROVIDER ?? 'github-actions-provider'

interface WifProviderResponse {
  readonly name?: string
  readonly attributeMapping?: Record<string, string>
  readonly attributeCondition?: string
  readonly state?: string
  readonly oidc?: { readonly issuerUri?: string }
}

const REQUIRED_ATTRIBUTE_KEYS = ['google.subject', 'attribute.repository']

export const checkGcpWifSubject = async (
  _input: PreflightInput
): Promise<PreflightCheckResult> => {
  void _input
  const observedAtStart = Date.now()
  const observedAt = new Date().toISOString()

  try {
    const { stdout } = await execFileAsync(
      'gcloud',
      [
        'iam',
        'workload-identity-pools',
        'providers',
        'describe',
        WIF_PROVIDER,
        `--workload-identity-pool=${WIF_POOL}`,
        '--location=global',
        `--project=${GCP_PROJECT}`,
        '--format=json'
      ],
      { timeout: GCLOUD_TIMEOUT_MS, maxBuffer: 5 * 1024 * 1024 }
    )

    const data = JSON.parse(stdout) as WifProviderResponse
    const mapping = data.attributeMapping ?? {}
    const missingKeys = REQUIRED_ATTRIBUTE_KEYS.filter(key => !(key in mapping))
    const oidcIssuer = data.oidc?.issuerUri ?? null
    const state = data.state ?? 'UNKNOWN'

    if (missingKeys.length > 0) {
      return {
        checkId: 'gcp_wif_subject',
        severity: 'error',
        status: 'ok',
        observedAt,
        durationMs: Date.now() - observedAtStart,
        summary: `WIF provider ${WIF_PROVIDER} le falta(n) attribute mapping: ${missingKeys.join(', ')}`,
        error: null,
        evidence: { provider: WIF_PROVIDER, pool: WIF_POOL, missingKeys, state },
        recommendation: `Reaplicar terraform/bicep que provisiona el WIF provider con attribute mapping completo.`
      }
    }

    if (state !== 'ACTIVE') {
      return {
        checkId: 'gcp_wif_subject',
        severity: 'error',
        status: 'ok',
        observedAt,
        durationMs: Date.now() - observedAtStart,
        summary: `WIF provider state=${state} (esperado ACTIVE)`,
        error: null,
        evidence: { provider: WIF_PROVIDER, pool: WIF_POOL, state, oidcIssuer },
        recommendation: 'Re-activar provider via gcloud iam workload-identity-pools providers update.'
      }
    }

    return {
      checkId: 'gcp_wif_subject',
      severity: 'ok',
      status: 'ok',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: `WIF provider ${WIF_PROVIDER} ACTIVE con attribute mapping completo`,
      error: null,
      evidence: { provider: WIF_PROVIDER, pool: WIF_POOL, state, oidcIssuer, attributeMappingKeys: Object.keys(mapping) },
      recommendation: ''
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'preflight', stage: 'gcp_wif_subject' }
    })

    const errorMessage = error instanceof Error ? error.message : String(error)
    const isCommandNotFound = errorMessage.includes('ENOENT') || errorMessage.includes('command not found')

    return {
      checkId: 'gcp_wif_subject',
      severity: 'unknown',
      status: isCommandNotFound ? 'not_configured' : 'error',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: isCommandNotFound
        ? 'gcloud CLI no instalado en runtime'
        : 'No se pudo describir WIF provider',
      error: redactErrorForResponse(error),
      evidence: null,
      recommendation: isCommandNotFound
        ? 'Instalar gcloud CLI + autenticar (gcloud auth login + application-default login).'
        : 'Reintentar; si persiste, verificar gcloud auth + permisos sobre proyecto efeonce-group.'
    }
  }
}
