/**
 * Runner read-only de GA4 para la proyección del Blog SKY (2026-11).
 * Reutiliza la conexión GA4 consentida por SKY (misma auth que .captures/sky-blog-seo-audit-2026-10-23/data/fetch.ts).
 * Solo lectura: Data API runReport / runFunnelReport (v1alpha) / getMetadata y Admin API GET (keyEvents, dataStreams...).
 * Uso: pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs outputs/sky-blog-proyeccion-2026-11/ga4/ga4q.ts <specs.mjs> <rawDir>
 * specs.mjs exporta default: Array<{ name, kind: 'report'|'funnel'|'get', body?, path? }>
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = process.env.SKY_AUDIT_PG_PORT ?? '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

const ORG = 'org-b9977f96-f7ef-4afb-bb26-7355d78c981f'

type Spec = { name: string; kind: 'report' | 'funnel' | 'get'; body?: Record<string, unknown>; path?: string; force?: boolean }

const main = async () => {
  const [specFile, dir] = process.argv.slice(2)

  if (!specFile || !dir) throw Error('uso: ga4q.ts <specs.mjs> <rawDir>')
  await fs.mkdir(dir, { recursive: true })
  const specs = (await import(pathToFileURL(path.resolve(specFile)).href)).default as Spec[]
  const { resolveSecretByRef } = await import('@/lib/secrets/secret-manager')
  const { getGa4Connection } = await import('@/lib/growth/analytics-ga4/connection-store')
  const { resolveGa4OAuthConfig, refreshGa4AccessToken } = await import('@/lib/growth/analytics-ga4/oauth-client')
  const ga4 = await getGa4Connection(ORG)

  if (ga4?.status !== 'active' || !ga4.tokenSecretRef || !ga4.propertyId) throw Error('GA4 no activa')
  const pid = ga4.propertyId
  const refresh = (await resolveSecretByRef(ga4.tokenSecretRef))!
  const cfg = (await resolveGa4OAuthConfig())!
  let token = await refreshGa4AccessToken(cfg, refresh)
  let tokenAt = Date.now()

  const tok = async () => {
    if (Date.now() - tokenAt > 30 * 60 * 1000) { token = await refreshGa4AccessToken(cfg, refresh); tokenAt = Date.now() }
    
return token
  }

  const call = async (url: string, body?: unknown) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers: { Authorization: `Bearer ${await tok()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined
      })

      if (res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 4000 * (attempt + 1))); continue }
      const text = await res.text()

      if (!res.ok) return { error: { status: res.status, body: text.slice(0, 2000) } }
      
return JSON.parse(text)
    }

    
return { error: { status: 'retries_exhausted' } }
  }

  const report = async (body: Record<string, unknown>) => {
    const rows: unknown[] = []
    let offset = 0
    let first: Record<string, unknown> | undefined

    for (;;) {
      const r = await call(`https://analyticsdata.googleapis.com/v1beta/properties/${pid}:runReport`, { limit: '100000', ...body, offset: String(offset) })

      if (r.error) return r
      first ??= r
      for (const x of r.rows ?? []) rows.push(x)
      offset += (r.rows ?? []).length
      if (!r.rows?.length || offset >= (r.rowCount ?? 0)) break
    }

    
return { ...first, rows }
  }

  for (const s of specs) {
    const file = path.join(dir, `${s.name}.json`)

    if (!s.force && (await fs.stat(file).then(() => true, () => false))) { console.log('skip', s.name); continue }
    const capturedAt = new Date().toISOString()
    let result: unknown

    if (s.kind === 'report') result = await report(s.body!)
    else if (s.kind === 'funnel') result = await call(`https://analyticsdata.googleapis.com/v1alpha/properties/${pid}:runFunnelReport`, s.body)
    else result = await call(s.path!.replace('{pid}', pid))
    await fs.writeFile(file, JSON.stringify({ capturedAt, propertyId: pid, spec: s, result }))
    const err = (result as { error?: unknown }).error

    console.log(err ? 'ERROR' : 'saved', s.name, err ? JSON.stringify(err).slice(0, 400) : '')
  }

  process.exit(0)
}

main().catch(e => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1) })
