/**
 * TASK-850 — Preflight check #7: Vercel staging + production readiness.
 *
 * Queries Vercel API for the most recent deployment per environment and
 * verifies state=READY. Degraded sources (missing token, API failure)
 * produce severity=warning + degradedSources entry, NOT a hard block —
 * Vercel API outages should not stop a manual release if other gates pass.
 */

import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'

import type { PreflightCheckResult } from '../types'
import type { PreflightInput } from '../runner'

const VERCEL_API_BASE = 'https://api.vercel.com'
const VERCEL_TIMEOUT_MS = 6_000

interface VercelDeployment {
  readonly uid: string
  readonly url: string
  readonly state: 'READY' | 'BUILDING' | 'ERROR' | 'CANCELED' | 'QUEUED'
  readonly target: 'production' | 'staging' | 'preview' | null
  readonly createdAt: number
  readonly meta?: { readonly githubCommitSha?: string }
}

interface VercelDeploymentsResponse {
  readonly deployments: readonly VercelDeployment[]
}

const fetchVercelDeployments = async (
  token: string,
  teamId: string | null,
  projectId: string,
  target: 'production' | 'staging'
): Promise<readonly VercelDeployment[]> => {
  const teamParam = teamId ? `&teamId=${encodeURIComponent(teamId)}` : ''
  const url = `${VERCEL_API_BASE}/v6/deployments?projectId=${encodeURIComponent(projectId)}&target=${target}&limit=5${teamParam}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), VERCEL_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal
    })

    if (!response.ok) {
      throw new Error(`Vercel API ${target} returned ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as VercelDeploymentsResponse

    return data.deployments
  } finally {
    clearTimeout(timer)
  }
}

export const checkVercelReadiness = async (
  _input: PreflightInput
): Promise<PreflightCheckResult> => {
  void _input
  const observedAtStart = Date.now()
  const observedAt = new Date().toISOString()

  const token = process.env.VERCEL_TOKEN ?? null
  const teamId = process.env.VERCEL_TEAM_ID ?? 'efeonce-7670142f'
  const projectId = process.env.VERCEL_PROJECT_ID ?? 'prj_d9v6gihlDq4k1EXazPvzWhSU0qbl'

  if (!token) {
    return {
      checkId: 'vercel_readiness',
      severity: 'unknown',
      status: 'not_configured',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: 'VERCEL_TOKEN no configurado en runtime',
      error: null,
      evidence: { teamId, projectId },
      recommendation: 'Configurar VERCEL_TOKEN local o en CI runner.'
    }
  }

  try {
    const [productionDeploys, stagingDeploys] = await Promise.all([
      fetchVercelDeployments(token, teamId, projectId, 'production'),
      fetchVercelDeployments(token, teamId, projectId, 'staging').catch(() => [] as readonly VercelDeployment[])
    ])

    const latestProduction = productionDeploys[0] ?? null
    const latestStaging = stagingDeploys[0] ?? null

    const productionReady = latestProduction?.state === 'READY'
    const stagingReady = latestStaging?.state === 'READY'

    if (!latestProduction) {
      return {
        checkId: 'vercel_readiness',
        severity: 'warning',
        status: 'ok',
        observedAt,
        durationMs: Date.now() - observedAtStart,
        summary: 'Sin deployments production en Vercel — proyecto recien provisionado o filtro mal configurado',
        error: null,
        evidence: { productionReady, stagingReady, teamId, projectId },
        recommendation: 'Verificar VERCEL_PROJECT_ID + filtros de target.'
      }
    }

    if (!productionReady) {
      return {
        checkId: 'vercel_readiness',
        severity: 'error',
        status: 'ok',
        observedAt,
        durationMs: Date.now() - observedAtStart,
        summary: `Latest production deploy en estado ${latestProduction.state} (NO READY)`,
        error: null,
        evidence: {
          productionReady: false,
          stagingReady,
          latestProductionState: latestProduction.state,
          latestProductionUid: latestProduction.uid,
          latestProductionUrl: latestProduction.url
        },
        recommendation:
          'Resolver deploy production fallido/en build antes de promover release. Revisar Vercel logs.'
      }
    }

    if (!stagingReady && latestStaging) {
      return {
        checkId: 'vercel_readiness',
        severity: 'warning',
        status: 'ok',
        observedAt,
        durationMs: Date.now() - observedAtStart,
        summary: `Production READY, pero staging deploy ${latestStaging.state}`,
        error: null,
        evidence: {
          productionReady: true,
          stagingReady: false,
          latestStagingState: latestStaging.state
        },
        recommendation:
          'Verificar staging deploy antes de promover (smoke tests dependen de staging healthy).'
      }
    }

    return {
      checkId: 'vercel_readiness',
      severity: 'ok',
      status: 'ok',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: `Production + staging Vercel deployments READY`,
      error: null,
      evidence: {
        productionReady: true,
        stagingReady,
        latestProductionUid: latestProduction.uid,
        latestStagingUid: latestStaging?.uid ?? null
      },
      recommendation: ''
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'preflight', stage: 'vercel_readiness' }
    })

    return {
      checkId: 'vercel_readiness',
      severity: 'unknown',
      status: 'error',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: 'No se pudo consultar Vercel API',
      error: redactErrorForResponse(error),
      evidence: null,
      recommendation: 'Reintentar; si persiste, verificar conectividad Vercel API + VERCEL_TOKEN.'
    }
  }
}
