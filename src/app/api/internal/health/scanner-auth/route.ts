import { NextResponse } from 'next/server'

import {
  fetchGoogleIdTokenForAudience,
  getGoogleCredentialDiagnostics,
  getGoogleIdTokenProviderPlan
} from '@/lib/google-credentials'
import {
  getAssetMalwareScanAudience,
  getAssetMalwareScanEndpoint,
  getAssetMalwareScanTimeoutMs,
  isAssetMalwareScanEnabled
} from '@/lib/storage/asset-scan/config'
import { requireAgencyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-1378 / ISSUE-150 — Diagnóstico de credencial del scanner de malware.
 *
 * Existe porque el flag `ASSET_MALWARE_SCAN_ENABLED` falló DOS veces en
 * producción bloqueando CVs reales, y ninguna prueba local podía probar nada:
 * corrían con la identidad del operador, no con la del runtime. Este endpoint
 * ejercita `fetchGoogleIdTokenForAudience` EN el runtime donde corre (staging o
 * producción) contra la audiencia real del scanner, y opcionalmente hace un
 * probe `/scan` real, sin tocar el path de uploads ni crear cuarentenas.
 *
 * Regla operativa: NO prender el flag en Production hasta que este endpoint
 * responda `mint.ok=true` (y idealmente `probe.ok=true`) en producción.
 *
 * El token NUNCA se retorna: sólo claims públicos decodificados (aud/azp/exp).
 */

const decodeJwtClaims = (token: string) => {
  try {
    const payload = token.split('.')[1]

    if (!payload) return null

    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>

    return {
      aud: typeof claims.aud === 'string' ? claims.aud : null,
      azp: typeof claims.azp === 'string' ? claims.azp : null,
      email: typeof claims.email === 'string' ? claims.email : null,
      expiresInSeconds: typeof claims.exp === 'number' ? Math.max(0, claims.exp - Math.floor(Date.now() / 1000)) : null
    }
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const internalKey = searchParams.get('key')
  const cronSecret = process.env.CRON_SECRET?.trim()
  const isInternalKeyAuth = Boolean(cronSecret && internalKey === cronSecret)

  if (!isInternalKeyAuth) {
    const { tenant, errorResponse } = await requireAgencyTenantContext()

    if (!tenant) {
      return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const endpoint = getAssetMalwareScanEndpoint()
  const audience = getAssetMalwareScanAudience()

  const base = {
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
    flagEnabled: isAssetMalwareScanEnabled(),
    endpointConfigured: Boolean(endpoint),
    audience,
    credentialPlan: getGoogleIdTokenProviderPlan(),
    credentialDiagnostics: getGoogleCredentialDiagnostics()
  }

  if (!audience) {
    return NextResponse.json({
      ...base,
      mint: { ok: false, error: 'Sin audiencia: falta ASSET_MALWARE_SCAN_ENDPOINT o no es https.' }
    })
  }

  const mintStartedAt = Date.now()
  let token: string

  try {
    token = await fetchGoogleIdTokenForAudience(audience)
  } catch (error) {
    return NextResponse.json({
      ...base,
      mint: {
        ok: false,
        durationMs: Date.now() - mintStartedAt,
        error: error instanceof Error ? error.message : String(error)
      }
    })
  }

  const mint = {
    ok: true,
    durationMs: Date.now() - mintStartedAt,
    claims: decodeJwtClaims(token)
  }

  if (searchParams.get('probe') !== 'scan') {
    return NextResponse.json({ ...base, mint })
  }

  // Probe real contra el Cloud Run: bytes limpios inofensivos, directo a `/scan`.
  // No pasa por `scanAssetBytes` ni por el store: no puede crear cuarentenas.
  const probeStartedAt = Date.now()

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), getAssetMalwareScanTimeoutMs())

    try {
      const response = await fetch(`${endpoint!.replace(/\/+$/, '')}/scan`, {
        method: 'POST',
        headers: {
          'content-type': 'application/octet-stream',
          'x-file-name': 'scanner-auth-diagnostic.txt',
          authorization: `Bearer ${token}`
        },
        body: new TextEncoder().encode('greenhouse scanner auth diagnostic probe'),
        signal: controller.signal
      })

      const payload = response.ok ? ((await response.json()) as { status?: unknown }) : null

      return NextResponse.json({
        ...base,
        mint,
        probe: {
          ok: response.ok && payload?.status === 'ok',
          httpStatus: response.status,
          scanStatus: payload && typeof payload.status === 'string' ? payload.status : null,
          durationMs: Date.now() - probeStartedAt
        }
      })
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    return NextResponse.json({
      ...base,
      mint,
      probe: {
        ok: false,
        durationMs: Date.now() - probeStartedAt,
        error: error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'unreachable'
      }
    })
  }
}
