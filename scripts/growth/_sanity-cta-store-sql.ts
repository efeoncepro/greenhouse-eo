/**
 * TASK-1339 — Sanity/smoke del SQL embebido del motor de CTAs contra PG real
 * (gate ISSUE-071/TASK-893: los mocks ejercitan el TS, NO el SQL — COALESCE,
 * intervalos, jsonb y arrays se prueban acá antes de mergear).
 *
 * Uso (proxy Cloud SQL en 15432 + credenciales de .env.local):
 *   GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME= \
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-cta-store-sql.ts
 *
 * Read-only: no escribe filas (el write path se ejercita con el seed del primer CTA).
 */
import {
  countAcceptedEventsByHash,
  countRejectedEventsByIp,
  findRecentDuplicateEvent,
  getCtaDefinitionBySlug,
  getSurfaceBindingById,
  listActiveCtaOrigins,
  listPublishedCandidates,
  summarizeConversionEvents,
} from '../../src/lib/growth/ctas/store'

const main = async () => {
  const candidatesAll = await listPublishedCandidates(null)

  console.log(`listPublishedCandidates(null) → ${candidatesAll.length} filas`)

  const candidatesFiltered = await listPublishedCandidates(['ai-visibility-report-followup'])

  console.log(`listPublishedCandidates([slug]) → ${candidatesFiltered.length} filas`)

  const origins = await listActiveCtaOrigins()

  console.log(`listActiveCtaOrigins() → ${JSON.stringify(origins)}`)

  const byIp = await countAcceptedEventsByHash('ip_hash', 'deadbeef', 24)
  const byVisitor = await countAcceptedEventsByHash('visitor_key_hash', 'deadbeef', 24)

  console.log(`countAcceptedEventsByHash(ip=deadbeef,24h) → ${byIp}; (visitor) → ${byVisitor}`)

  const rejected = await countRejectedEventsByIp('deadbeef')

  console.log(`countRejectedEventsByIp(deadbeef) → ${rejected}`)

  const duplicate = await findRecentDuplicateEvent('deadbeef', 30)

  console.log(`findRecentDuplicateEvent(deadbeef,30m) → ${duplicate ? duplicate.event_id : 'null'}`)

  const summary = await summarizeConversionEvents('cdef-00000000-0000-0000-0000-000000000000')

  console.log(`summarizeConversionEvents(inexistente) → ${JSON.stringify(summary)}`)

  const definition = await getCtaDefinitionBySlug('slug-inexistente')
  const surface = await getSurfaceBindingById('csur-inexistente')

  console.log(`getCtaDefinitionBySlug(inexistente) → ${definition === null ? 'null' : 'fila'}`)
  console.log(`getSurfaceBindingById(inexistente) → ${surface === null ? 'null' : 'fila'}`)

  console.log('OK — todos los queries embebidos ejecutaron contra PG real sin type mismatch.')
  process.exit(0)
}

main().catch(error => {
  console.error('SANITY FAILED:', error)
  process.exit(1)
})
