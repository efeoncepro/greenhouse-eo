/**
 * TASK-2046 Slice 1 — lectura (read-only) de Search Console para las URLs del portafolio de Ohio en efeoncepro.com.
 * Usa la conexión GSC ya consentida de la organización dueña de efeoncepro.com; no cambia conexión, scopes ni datos.
 * Lista clics e impresiones por página bajo /project/ y /portfolio-category/ en los últimos 16 meses.
 * Los enlaces externos no salen por la API: se revisan en la interfaz de Search Console.
 *
 *   pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/public-website/eo-portfolio/gsc-project-urls.ts <salida.json>
 */
import fs from 'node:fs/promises'

import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

const HOST = 'efeoncepro.com'

const main = async () => {
  const out = process.argv[2]

  if (!out) throw Error('Falta la ruta de salida')
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')
  const { resolveSecretByRef } = await import('@/lib/secrets/secret-manager')
  const { resolveSearchConsoleOAuthConfig, refreshAccessToken } = await import('@/lib/growth/search-console/oauth-client')

  const rows = await runGreenhousePostgresQuery<{ organization_id: string; site_url: string; status: string; token_secret_ref: string | null }>(
    `SELECT organization_id, site_url, status, token_secret_ref
       FROM greenhouse_growth.search_console_connections
      WHERE site_url ILIKE $1`,
    [`%${HOST}%`]
  )

  const gsc = rows.find(row => row.status === 'active' && row.token_secret_ref)

  if (!gsc) {
    await fs.writeFile(out, JSON.stringify({ host: HOST, connections: rows.map(row => ({ organizationId: row.organization_id, siteUrl: row.site_url, status: row.status })), error: 'Sin conexión GSC activa para el host' }, null, 2))
    console.log(`Sin conexión GSC activa para ${HOST} (${rows.length} filas). Detalle en ${out}`)

    return
  }

  const token = await refreshAccessToken((await resolveSearchConsoleOAuthConfig())!, (await resolveSecretByRef(gsc.token_secret_ref!))!)
  const end = new Date()
  const start = new Date(end)

  start.setMonth(start.getMonth() - 16)
  const day = (d: Date) => d.toISOString().slice(0, 10)

  const query = async (expression: string) => {
    const res = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(gsc.site_url)}/searchAnalytics/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'web',
        startDate: day(start),
        endDate: day(end),
        dimensions: ['page'],
        dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'contains', expression }] }],
        rowLimit: 25000
      })
    })

    if (!res.ok) throw Error(`GSC ${res.status}: ${(await res.text()).slice(0, 300)}`)

    return ((await res.json()) as { rows?: Array<{ keys?: string[]; clicks: number; impressions: number }> }).rows ?? []
  }

  const pages = [...(await query('/project/')), ...(await query('/portfolio-category/'))].map(row => ({
    page: row.keys?.[0],
    clicks: row.clicks,
    impressions: row.impressions
  }))

  await fs.writeFile(out, JSON.stringify({ host: HOST, siteUrl: gsc.site_url, range: { start: day(start), end: day(end) }, pages }, null, 2))
  console.log(`GSC ${gsc.site_url}: ${pages.length} páginas con datos. Detalle en ${out}`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
