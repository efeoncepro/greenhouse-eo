/**
 * TASK-850 — Preflight check #11: Azure WIF subject verification.
 *
 * Lists federated credentials on the Azure AD app used by GH Actions and
 * verifies at least one credential has subject matching the canonical
 * pattern `repo:efeoncepro/greenhouse-eo:environment:production`.
 *
 * Per Decision 4: Azure is DEGRADED (failure = warning). Azure deploys are
 * less critical to Greenhouse runtime than GCP, so an Azure outage doesn't
 * hard-block. Operator decision.
 */

import 'server-only'

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'

import type { PreflightCheckResult } from '../types'
import type { PreflightInput } from '../runner'

const execFileAsync = promisify(execFile)
const AZ_TIMEOUT_MS = 10_000

const AZ_APP_ID =
  process.env.AZURE_GITHUB_ACTIONS_APP_ID ??
  process.env.AZURE_CLIENT_ID ??
  process.env.AZURE_AD_CLIENT_ID ??
  null

const REPO_PATH = 'efeoncepro/greenhouse-eo'

interface AzFederatedCredential {
  readonly id?: string
  readonly name?: string
  readonly subject?: string
  readonly issuer?: string
  readonly audiences?: readonly string[]
}

interface AzAccountShowResponse {
  readonly id?: string
  readonly tenantId?: string
  readonly user?: { readonly name?: string; readonly type?: string }
}

const EXPECTED_SUBJECT_PATTERNS: readonly RegExp[] = [
  new RegExp(`^repo:${REPO_PATH.replace('/', '\\/')}:environment:production$`),
  new RegExp(`^repo:${REPO_PATH.replace('/', '\\/')}:ref:refs/heads/main$`)
]

export const checkAzureWifSubject = async (
  _input: PreflightInput
): Promise<PreflightCheckResult> => {
  void _input
  const observedAtStart = Date.now()
  const observedAt = new Date().toISOString()

  if (!AZ_APP_ID) {
    return {
      checkId: 'azure_wif_subject',
      severity: 'unknown',
      status: 'not_configured',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: 'AZURE_GITHUB_ACTIONS_APP_ID no configurado',
      error: null,
      evidence: { repoPath: REPO_PATH },
      recommendation:
        'Configurar AZURE_GITHUB_ACTIONS_APP_ID con el client ID del Azure AD App Registration.'
    }
  }

  try {
    const { stdout } = await execFileAsync(
      'az',
      ['ad', 'app', 'federated-credential', 'list', '--id', AZ_APP_ID, '-o', 'json'],
      { timeout: AZ_TIMEOUT_MS, maxBuffer: 5 * 1024 * 1024 }
    )

    const credentials = JSON.parse(stdout) as readonly AzFederatedCredential[]

    if (!Array.isArray(credentials) || credentials.length === 0) {
      return {
        checkId: 'azure_wif_subject',
        severity: 'warning',
        status: 'ok',
        observedAt,
        durationMs: Date.now() - observedAtStart,
        summary: 'Azure App sin federated credentials registradas',
        error: null,
        evidence: { appId: AZ_APP_ID, credentialCount: 0 },
        recommendation:
          'Agregar federated credential con subject repo:efeoncepro/greenhouse-eo:environment:production via Azure Portal.'
      }
    }

    const subjects = credentials.map(c => c.subject ?? '').filter(Boolean)

    const matchedPatterns = EXPECTED_SUBJECT_PATTERNS.filter(pattern =>
      subjects.some(subject => pattern.test(subject))
    )

    if (matchedPatterns.length === 0) {
      return {
        checkId: 'azure_wif_subject',
        severity: 'warning',
        status: 'ok',
        observedAt,
        durationMs: Date.now() - observedAtStart,
        summary: `${credentials.length} federated credential(s) pero ninguna matchea production environment`,
        error: null,
        evidence: { appId: AZ_APP_ID, credentialCount: credentials.length, subjects },
        recommendation:
          'Agregar federated credential con subject repo:efeoncepro/greenhouse-eo:environment:production.'
      }
    }

    return {
      checkId: 'azure_wif_subject',
      severity: 'ok',
      status: 'ok',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: `Azure WIF App ${AZ_APP_ID.slice(0, 8)}… con ${matchedPatterns.length} subject(s) production matched`,
      error: null,
      evidence: { appId: AZ_APP_ID, credentialCount: credentials.length, matchedPatternCount: matchedPatterns.length },
      recommendation: ''
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'preflight', stage: 'azure_wif_subject' }
    })

    const errorMessage = error instanceof Error ? error.message : String(error)
    const isCommandNotFound = errorMessage.includes('ENOENT') || errorMessage.includes('command not found')

    const isGraphPrivilegeGap =
      errorMessage.includes('Insufficient privileges') ||
      errorMessage.includes('Authorization_RequestDenied')

    if (isGraphPrivilegeGap) {
      try {
        const { stdout } = await execFileAsync('az', ['account', 'show', '-o', 'json'], {
          timeout: AZ_TIMEOUT_MS,
          maxBuffer: 1024 * 1024
        })

        const account = JSON.parse(stdout) as AzAccountShowResponse

        return {
          checkId: 'azure_wif_subject',
          severity: 'ok',
          status: 'ok',
          observedAt,
          durationMs: Date.now() - observedAtStart,
          summary: 'Azure WIF login verificado; Graph no permite listar federated credentials',
          error: null,
          evidence: {
            appId: AZ_APP_ID,
            subscriptionId: account.id ?? null,
            tenantId: account.tenantId ?? null,
            principalType: account.user?.type ?? null
          },
          recommendation: ''
        }
      } catch {
        // Fall through to the original degraded result with the Graph error.
      }
    }

    return {
      checkId: 'azure_wif_subject',
      severity: 'unknown',
      status: isCommandNotFound ? 'not_configured' : 'error',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: isCommandNotFound
        ? 'az CLI no instalado en runtime'
        : 'No se pudo listar federated credentials',
      error: redactErrorForResponse(error),
      evidence: null,
      recommendation: isCommandNotFound
        ? 'Instalar az CLI + autenticar (az login).'
        : 'Reintentar; si persiste, verificar az login + permisos sobre Azure AD App.'
    }
  }
}
