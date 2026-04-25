import 'server-only'

import { RELIABILITY_REGISTRY } from '@/lib/reliability/registry'
import type { ReliabilityModuleKey, ReliabilityRouteRef } from '@/types/reliability'
import type {
  SyntheticProbeRecord,
  SyntheticSweepSummary,
  SyntheticTriggerSource
} from '@/types/reliability-synthetic'

import { isReliabilitySyntheticEnabled } from './kill-switch'
import {
  generateProbeId,
  generateSweepRunId,
  recordProbeResult,
  recordSweepFinished,
  recordSweepStarted
} from './persist'

const PROBE_TIMEOUT_MS = 8_000
const DEFAULT_AGENT_EMAIL = 'agent@greenhouse.efeonce.org'

/**
 * Concurrencia máxima del fetch loop. Cap en 6 para no saturar el portal
 * cuando se ejecuta self-hit desde Vercel cron (10 rutas / 6 paralelas =
 * 2 olas, total ~16s peak) y mantener overhead bajo en Cloud SQL pool.
 */
const MAX_CONCURRENT_PROBES = 6

interface AgentAuthCookie {
  cookieName: string
  cookieValue: string
}

interface BaseUrlConfig {
  baseUrl: string
  bypassSecret: string | null
}

const stripTrailingSlash = (url: string) => url.replace(/\/+$/, '')

/**
 * Resuelve el base URL contra el cual ejecutar las pruebas.
 *
 * Orden de preferencia:
 *  1) `RELIABILITY_SYNTHETIC_BASE_URL` (override explícito)
 *  2) `NEXT_PUBLIC_APP_URL` (canónico del portal)
 *  3) `VERCEL_URL` con https:// (preview/staging deploy actual)
 *  4) `http://localhost:3000` (desarrollo local)
 */
export const resolveBaseUrl = (env: NodeJS.ProcessEnv = process.env): BaseUrlConfig => {
  const explicit = env.RELIABILITY_SYNTHETIC_BASE_URL?.trim()
  const appUrl = env.NEXT_PUBLIC_APP_URL?.trim()
  const vercelUrl = env.VERCEL_URL?.trim()

  const resolved = explicit || appUrl || (vercelUrl ? `https://${vercelUrl}` : 'http://localhost:3000')

  return {
    baseUrl: stripTrailingSlash(resolved),
    bypassSecret: env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() || null
  }
}

/**
 * Obtiene cookie de session via Agent Auth. Retorna null si no se puede
 * autenticar (kill-switch implícito: si falla auth, el sweep degrada y
 * marca cada probe como skipped).
 */
const acquireAgentSession = async (
  baseUrl: string,
  bypassSecret: string | null,
  env: NodeJS.ProcessEnv
): Promise<AgentAuthCookie | null> => {
  const secret = env.AGENT_AUTH_SECRET?.trim()

  if (!secret) return null

  const email = env.AGENT_AUTH_EMAIL?.trim() || DEFAULT_AGENT_EMAIL

  const headers: Record<string, string> = { 'content-type': 'application/json' }

  if (bypassSecret) headers['x-vercel-protection-bypass'] = bypassSecret

  try {
    const response = await fetch(`${baseUrl}/api/auth/agent-session`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ secret, email })
    })

    if (!response.ok) {
      console.warn('[reliability-synthetic] agent-session failed', {
        status: response.status,
        text: (await response.text()).slice(0, 200)
      })

      return null
    }

    const json = (await response.json()) as { cookieName?: string; cookieValue?: string }

    if (!json.cookieName || !json.cookieValue) return null

    return { cookieName: json.cookieName, cookieValue: json.cookieValue }
  } catch (error) {
    console.warn('[reliability-synthetic] agent-session threw', {
      error: (error as Error).message
    })

    return null
  }
}

const probeRoute = async ({
  baseUrl,
  bypassSecret,
  cookie,
  moduleKey,
  routePath,
  sweepRunId,
  triggeredBy
}: {
  baseUrl: string
  bypassSecret: string | null
  cookie: AgentAuthCookie | null
  moduleKey: ReliabilityModuleKey
  routePath: string
  sweepRunId: string
  triggeredBy: SyntheticTriggerSource
}): Promise<SyntheticProbeRecord> => {
  const probeId = generateProbeId()
  const startedAt = new Date()

  const headers: Record<string, string> = {}

  if (bypassSecret) headers['x-vercel-protection-bypass'] = bypassSecret
  if (cookie) headers['cookie'] = `${cookie.cookieName}=${cookie.cookieValue}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)

  let httpStatus = 0
  let ok = false
  let errorMessage: string | null = null

  try {
    const response = await fetch(`${baseUrl}${routePath}`, {
      method: 'GET',
      headers,
      redirect: 'manual',
      signal: controller.signal
    })

    httpStatus = response.status

    // 2xx = ok. 3xx = ok if it's not a login redirect (we sent valid session).
    // 4xx/5xx = not ok.
    ok = httpStatus >= 200 && httpStatus < 400

    // Detect Vercel SSO wall (401 + html) or NextAuth login redirect (3xx → /login)
    if (httpStatus >= 300 && httpStatus < 400) {
      const location = response.headers.get('location') || ''

      if (/\/login|\/auth\/access-denied/i.test(location)) {
        ok = false
        errorMessage = `Redirected to ${location.slice(0, 120)} — agent session invalid or insufficient access.`
      }
    }

    if (!ok && !errorMessage) {
      const text = await response.text().catch(() => '')

      errorMessage = text ? text.slice(0, 200) : `HTTP ${httpStatus}`
    }
  } catch (error) {
    httpStatus = 0
    ok = false
    errorMessage =
      (error as Error).name === 'AbortError'
        ? `Timeout after ${PROBE_TIMEOUT_MS}ms`
        : (error as Error).message.slice(0, 200)
  } finally {
    clearTimeout(timeout)
  }

  const finishedAt = new Date()
  const latencyMs = Math.max(0, finishedAt.getTime() - startedAt.getTime())

  return {
    probeId,
    sweepRunId,
    moduleKey,
    routePath,
    httpStatus,
    ok,
    latencyMs,
    errorMessage,
    triggeredBy,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString()
  }
}

/**
 * Lista deduplicada de (módulo, ruta) declaradas en RELIABILITY_REGISTRY.
 * Algunas rutas (ej: /admin/integrations) están en >1 módulo — cada módulo
 * tiene su row porque el spotlight es por módulo.
 */
const collectRegistryRoutes = (): Array<{ moduleKey: ReliabilityModuleKey; route: ReliabilityRouteRef }> =>
  RELIABILITY_REGISTRY.flatMap(definition =>
    definition.routes.map(route => ({ moduleKey: definition.moduleKey, route }))
  )

export interface RunReliabilitySyntheticSweepResult {
  summary: SyntheticSweepSummary
  probes: SyntheticProbeRecord[]
}

export const runReliabilitySyntheticSweep = async ({
  triggeredBy = 'cron',
  env = process.env
}: { triggeredBy?: SyntheticTriggerSource; env?: NodeJS.ProcessEnv } = {}): Promise<RunReliabilitySyntheticSweepResult> => {
  const startedAt = new Date()
  const sweepRunId = generateSweepRunId()

  const buildSummary = (
    overrides: Partial<SyntheticSweepSummary>
  ): SyntheticSweepSummary => ({
    sweepRunId,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    triggeredBy,
    routesProbed: 0,
    routesOk: 0,
    routesFailed: 0,
    durationMs: Math.max(0, Date.now() - startedAt.getTime()),
    skippedReason: null,
    ...overrides
  })

  if (!isReliabilitySyntheticEnabled(env)) {
    return {
      summary: buildSummary({ skippedReason: 'RELIABILITY_SYNTHETIC_ENABLED=false' }),
      probes: []
    }
  }

  const { baseUrl, bypassSecret } = resolveBaseUrl(env)

  await recordSweepStarted({ sweepRunId, triggeredBy, notes: `baseUrl=${baseUrl}` })

  const cookie = await acquireAgentSession(baseUrl, bypassSecret, env)

  if (!cookie) {
    const summary = buildSummary({
      skippedReason: 'AGENT_AUTH_SECRET no configurado o agent-session falló — sweep cancelado.'
    })

    await recordSweepFinished(summary)

    return { summary, probes: [] }
  }

  const targets = collectRegistryRoutes()
  const probes: SyntheticProbeRecord[] = []

  /**
   * Paralelizamos las probes en olas de MAX_CONCURRENT_PROBES para encajar
   * holgadamente dentro del cap de 60s del Vercel cron y no saturar el
   * portal cuando se ejecuta self-hit.
   */
  for (let i = 0; i < targets.length; i += MAX_CONCURRENT_PROBES) {
    const chunk = targets.slice(i, i + MAX_CONCURRENT_PROBES)

    const chunkProbes = await Promise.all(
      chunk.map(target =>
        probeRoute({
          baseUrl,
          bypassSecret,
          cookie,
          moduleKey: target.moduleKey,
          routePath: target.route.path,
          sweepRunId,
          triggeredBy
        })
      )
    )

    probes.push(...chunkProbes)

    await Promise.all(
      chunkProbes.map(probe =>
        recordProbeResult(probe).catch(error => {
          console.warn('[reliability-synthetic] persist probe failed', {
            probeId: probe.probeId,
            error: (error as Error).message
          })
        })
      )
    )
  }

  const routesOk = probes.filter(p => p.ok).length
  const routesFailed = probes.length - routesOk

  const summary = buildSummary({
    routesProbed: probes.length,
    routesOk,
    routesFailed
  })

  await recordSweepFinished(summary)

  return { summary, probes }
}
