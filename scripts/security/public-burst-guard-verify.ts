/**
 * TASK-1876 — Ráfaga CONTROLADA de verificación del guard volumétrico, sólo contra staging.
 *
 *   pnpm security:public-burst-guard:verify            # 30 requests concurrentes (máximo)
 *   pnpm security:public-burst-guard:verify --n=20
 *
 * Frenos incorporados (la instancia PostgreSQL es la misma de producción, ISSUE-174):
 *   - sólo el host de staging `.vercel.app` (nunca un host productivo);
 *   - como máximo 30 requests, una sola ráfaga por corrida;
 *   - aborta ANTES de disparar si `num_backends` (métrica nativa de Cloud SQL, últimos 5 min) supera 50;
 *   - token con forma válida pero inexistente: el dominio responde 404 sin datos de ningún cliente.
 *
 * Después de la ráfaga muestrea `num_backends` durante ~6 min (la métrica llega con 1–3 min de
 * retraso) para ver el pico y la vuelta a la línea base.
 */
import { randomBytes } from 'node:crypto'

import { readPostgresBackendsPeak } from '../../src/lib/reliability/queries/postgres-backends-peak'
import { PRODUCTION_HOSTS } from '../../src/lib/security/public-burst-guard/firewall-rules'
import { DEFAULT_STAGING_URL, resolveBypassSecret } from '../lib/vercel-staging-access.mjs'

const MAX_REQUESTS = 30
const ABORT_IF_BACKENDS_ABOVE = 50
const SAMPLE_EVERY_MS = 30_000
const SAMPLE_FOR_MS = 6 * 60_000

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const recentBackends = async (minutes: number) => {
  const peak = await readPostgresBackendsPeak({ windowHours: minutes / 60 })

  return peak ? `${peak.peak} @ ${peak.peakAt}` : 'sin datos'
}

const main = async () => {
  const requested = Number(process.argv.find(arg => arg.startsWith('--n='))?.slice(4) ?? MAX_REQUESTS)
  const n = Math.min(Math.max(Math.trunc(requested) || MAX_REQUESTS, 1), MAX_REQUESTS)
  const origin = DEFAULT_STAGING_URL
  const host = new URL(origin).host

  if ((PRODUCTION_HOSTS as readonly string[]).includes(host)) throw new Error(`ABORT: ${host} es un host productivo.`)

  const before = await readPostgresBackendsPeak({ windowHours: 5 / 60 })

  if (!before) throw new Error('ABORT: no se pudo leer num_backends (¿roles/monitoring.viewer?). Sin línea base no se dispara.')

  console.log(`Línea base num_backends (máx. últimos 5 min): ${before.peak} @ ${before.peakAt}`)

  if (before.peak > ABORT_IF_BACKENDS_ABOVE) {
    throw new Error(`ABORT: la base ya tiene ${before.peak} conexiones (> ${ABORT_IF_BACKENDS_ABOVE}). Reintentar más tarde.`)
  }

  const bypass = await resolveBypassSecret({ persist: false })
  const token = `isg_${randomBytes(32).toString('base64url')}`
  const url = `${origin}/api/public/insights/shared/${token}`

  console.log(`Ráfaga: ${n} requests concurrentes a ${host}/api/public/insights/shared/<token inexistente>`)

  const startedAt = new Date().toISOString()

  const results = await Promise.all(
    Array.from({ length: n }, async () => {
      try {
        const response = await fetch(url, { headers: { 'x-vercel-protection-bypass': bypass } })
        const body = await response.text()
        const domainJson = body.trim().startsWith('{') && body.includes('"code"')

        return { status: response.status, domainJson, retryAfter: response.headers.get('retry-after') }
      } catch (error) {
        return { status: 0, domainJson: false, retryAfter: null, error: error instanceof Error ? error.message : String(error) }
      }
    })
  )

  const summary = new Map<string, number>()

  for (const result of results) {
    const key = result.status === 429 ? `429 ${result.domainJson ? 'dominio' : 'borde'}` : String(result.status)

    summary.set(key, (summary.get(key) ?? 0) + 1)
  }

  console.log(`Inicio ${startedAt}. Respuestas: ${[...summary].map(([k, v]) => `${k}×${v}`).join(', ')}`)

  for (let elapsed = SAMPLE_EVERY_MS; elapsed <= SAMPLE_FOR_MS; elapsed += SAMPLE_EVERY_MS) {
    await sleep(SAMPLE_EVERY_MS)
    console.log(`+${elapsed / 1000}s  num_backends máx. últimos 2 min: ${await recentBackends(2)}`)
  }

  console.log(`Pico desde el inicio de la ráfaga: ${await recentBackends(Math.ceil(SAMPLE_FOR_MS / 60_000) + 2)}`)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
