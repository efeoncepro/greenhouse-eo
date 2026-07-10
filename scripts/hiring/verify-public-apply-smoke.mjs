/**
 * Verifica el smoke humano del apply público de Careers.
 *
 * Cierra el criterio de aceptación pendiente de TASK-354 ("submit smoke") y la
 * evidencia runtime de TASK-1362 (escaneo de CV) en una sola pasada.
 *
 * Por qué existe: `hiring_application_intake_events` sólo lo escribe la ruta HTTP
 * pública (`src/app/api/public/hiring/applications/route.ts`). Una llamada directa
 * a `submitPublicHiringApplication` desde un script crea la postulación pero NO
 * deja evento de intake. Ese es el único discriminador honesto entre "el dominio
 * funciona" y "una persona puede postular".
 *
 * Uso (requiere el proxy Cloud SQL en 127.0.0.1:15432):
 *   set -a && source .env.local && set +a
 *   GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME= node scripts/hiring/verify-public-apply-smoke.mjs
 */
import pg from 'pg'

const client = new pg.Client({
  host: '127.0.0.1',
  port: 15432,
  user: process.env.GREENHOUSE_POSTGRES_USER,
  password: process.env.GREENHOUSE_POSTGRES_PASSWORD,
  database: process.env.GREENHOUSE_POSTGRES_DATABASE,
  ssl: false,
})

const check = (label, ok, detail) => {
  console.log(`  ${ok ? '✅' : '❌'}  ${label}`)
  if (detail) console.log(`      ${detail}`)

  return ok
}

await client.connect()

console.log('\n── TASK-354: ¿pasó un submit real por la ruta HTTP pública? ──\n')

const intake = await client.query(
  `SELECT outcome, COUNT(*)::int AS n, MAX(created_at) AS ultimo
   FROM greenhouse_hiring.hiring_application_intake_events
   GROUP BY outcome ORDER BY n DESC`,
)

const accepted = intake.rows.find(r => r.outcome === 'accepted')

const t354 = check(
  'Existe al menos un intake event `accepted`',
  Boolean(accepted),
  accepted
    ? `${accepted.n} aceptado(s); último ${accepted.ultimo.toISOString()}`
    : 'Sin ningún `accepted`. Nadie ha postulado por el navegador todavía.',
)

console.table(intake.rows)

console.log('\n── TASK-1362: ¿el escaneo corrió sobre bytes reales? ──\n')

const scans = await client.query(
  `SELECT r.verdict, r.scanner, a.filename, a.size_bytes, a.status AS asset_status,
          r.findings_json, r.scanned_at
   FROM greenhouse_core.asset_scan_results r
   JOIN greenhouse_core.assets a USING (asset_id)
   WHERE a.retention_class = 'hiring_candidate_document'
   ORDER BY r.scanned_at DESC`,
)

const clean = scans.rows.find(r => r.verdict === 'clean' && r.scanner.startsWith('structural'))
const blocked = scans.rows.find(r => ['suspicious', 'infected'].includes(r.verdict))

const t1362a = check(
  'Un PDF real quedó `clean` + `attached`',
  Boolean(clean && clean.asset_status === 'attached'),
  clean ? `${clean.filename} (${clean.size_bytes} bytes), scanner=${clean.scanner}` : 'Ningún veredicto `clean` todavía.',
)

const t1362b = check(
  'Un binario disfrazado quedó bloqueado + `quarantined`',
  Boolean(blocked && blocked.asset_status === 'quarantined'),
  blocked
    ? `${blocked.filename} → ${blocked.verdict}; hallazgos: ${(blocked.findings_json ?? []).map(f => f.code).join(', ')}`
    : 'Ningún asset en cuarentena todavía.',
)

console.table(
  scans.rows.map(r => ({
    archivo: r.filename?.slice(0, 34),
    bytes: r.size_bytes,
    veredicto: r.verdict,
    asset: r.asset_status,
    scanner: r.scanner,
  })),
)

console.log('\n── Signal de reliability ──\n')

const signal = await client.query(
  `SELECT COUNT(*)::int AS abiertos
   FROM greenhouse_core.asset_scan_results
   WHERE resolution_status = 'open' AND verdict IN ('suspicious','infected','error')`,
)

console.log(`  storage.asset_scan.open_quarantine → ${signal.rows[0].abiertos} sin triage`)
console.log('  (esperado: 1 tras el smoke — el binario. Steady state = 0 tras el triage humano.)')

const legacy = await client.query(
  `SELECT COUNT(*)::int AS n FROM greenhouse_core.asset_scan_results WHERE verdict = 'legacy_unscanned'`,
)

console.log(`\n  Assets históricos sin escanear: ${legacy.rows[0].n} (entraron antes de TASK-1362)`)

await client.end()

console.log('\n──────────────────────────────────────────')
console.log(`  TASK-354  submit smoke:  ${t354 ? 'CERRADO' : 'PENDIENTE'}`)
console.log(`  TASK-1362 scan smoke:   ${t1362a && t1362b ? 'CERRADO' : 'PENDIENTE'}`)
console.log('──────────────────────────────────────────\n')

process.exit(t354 && t1362a && t1362b ? 0 : 1)
