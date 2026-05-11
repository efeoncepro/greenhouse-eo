/**
 * TASK-850 — Preflight check #12: Sentry unresolved critical issues (24h).
 *
 * Queries Sentry API for unresolved level=error issues in the project whose
 * last occurrence happened within the last 24h. Threshold ladder:
 *   - 0 issues → ok
 *   - 1-9 issues → warning (visible to operator, doesn't block)
 *   - 10+ issues → error (block — production already in fire mode)
 *
 * Per Decision 4: Sentry is STRICT (failure = error) per the foundational
 * validation. If Sentry API is down, we can't verify production health,
 * so we conservatively block.
 */

import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { resolveSecret } from '@/lib/secrets/secret-manager'

import type { PreflightCheckResult } from '../types'
import type { PreflightInput } from '../runner'

const SENTRY_API_BASE = process.env.SENTRY_API_BASE ?? 'https://sentry.io'
const SENTRY_TIMEOUT_MS = 6_000
const ERROR_THRESHOLD = 10

interface SentryIssue {
  readonly id: string
  readonly title: string
  readonly level: 'fatal' | 'error' | 'warning' | 'info' | 'debug'
  readonly status: 'unresolved' | 'resolved' | 'ignored'
  readonly count: string
  readonly userCount: number
  readonly permalink: string
  readonly firstSeen: string
  readonly lastSeen: string
}

const fetchSentryIssues = async (
  token: string,
  orgSlug: string,
  projectSlug: string
): Promise<readonly SentryIssue[]> => {
  const query = encodeURIComponent('is:unresolved level:[error,fatal] lastSeen:-24h')
  const url = `${SENTRY_API_BASE}/api/0/projects/${encodeURIComponent(orgSlug)}/${encodeURIComponent(projectSlug)}/issues/?query=${query}&statsPeriod=24h&limit=100`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SENTRY_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal
    })

    if (!response.ok) {
      throw new Error(`Sentry API issues returned ${response.status} ${response.statusText}`)
    }

    return (await response.json()) as readonly SentryIssue[]
  } finally {
    clearTimeout(timer)
  }
}

export const checkSentryCriticalIssues = async (
  _input: PreflightInput
): Promise<PreflightCheckResult> => {
  void _input
  const observedAtStart = Date.now()
  const observedAt = new Date().toISOString()

  const incidentsTokenResolution = await resolveSecret({
    envVarName: 'SENTRY_INCIDENTS_AUTH_TOKEN'
  })

  const token =
    incidentsTokenResolution.value?.trim() ||
    process.env.SENTRY_AUTH_TOKEN?.trim() ||
    null

  const orgSlug = process.env.SENTRY_ORG_SLUG ?? process.env.SENTRY_ORG ?? 'efeonce'
  const projectSlug = process.env.SENTRY_PROJECT_SLUG ?? process.env.SENTRY_PROJECT ?? 'greenhouse-eo'

  if (!token) {
    return {
      checkId: 'sentry_critical_issues',
      severity: 'unknown',
      status: 'not_configured',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: 'SENTRY_INCIDENTS_AUTH_TOKEN/SENTRY_AUTH_TOKEN no configurado',
      error: null,
      evidence: { orgSlug, projectSlug },
      recommendation:
        'Configurar SENTRY_INCIDENTS_AUTH_TOKEN_SECRET_REF o SENTRY_AUTH_TOKEN local/CI antes de promover.'
    }
  }

  try {
    const issues = await fetchSentryIssues(token, orgSlug, projectSlug)
    const criticalIssues = issues.filter(i => i.level === 'error' || i.level === 'fatal')
    const count = criticalIssues.length

    if (count === 0) {
      return {
        checkId: 'sentry_critical_issues',
        severity: 'ok',
        status: 'ok',
        observedAt,
        durationMs: Date.now() - observedAtStart,
        summary: 'Sin Sentry issues unresolved level=error/fatal en 24h',
        error: null,
        evidence: { count: 0, orgSlug, projectSlug },
        recommendation: ''
      }
    }

    const severity = count >= ERROR_THRESHOLD ? 'error' : 'warning'

    const topIssues = criticalIssues.slice(0, 5).map(i => ({
      id: i.id,
      title: i.title,
      level: i.level,
      count: i.count,
      userCount: i.userCount,
      permalink: i.permalink
    }))

    return {
      checkId: 'sentry_critical_issues',
      severity,
      status: 'ok',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: `${count} Sentry issue(s) unresolved level=error/fatal en 24h`,
      error: null,
      evidence: { count, topIssues, orgSlug, projectSlug },
      recommendation:
        severity === 'error'
          ? 'Production ya esta en fire mode (>=10 issues criticas activas). NO promover hasta resolver.'
          : 'Revisar issues activas en Sentry antes de promover release.'
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'preflight', stage: 'sentry_critical_issues' }
    })

    return {
      checkId: 'sentry_critical_issues',
      severity: 'unknown',
      status: 'error',
      observedAt,
      durationMs: Date.now() - observedAtStart,
      summary: 'No se pudo consultar Sentry API',
      error: redactErrorForResponse(error),
      evidence: null,
      recommendation:
        'Reintentar; si persiste, verificar conectividad Sentry + SENTRY_AUTH_TOKEN. ' +
        'Sentry API down significa que NO podemos verificar production health — bloquea por defecto.'
    }
  }
}
