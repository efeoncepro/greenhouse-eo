/**
 * TASK-1378 — Purga de las dos postulaciones de prueba del gate de escaneo.
 *
 * Contexto: para verificar el escáner de malware end-to-end se enviaron dos
 * postulaciones reales por el formulario público. Staging y producción comparten
 * base, así que quedaron junto a las postulaciones de candidatos reales.
 *
 * Qué borra y qué NO:
 *   - Borra: `hiring_application`, `candidate_facet` e `identity_profiles`
 *     sintéticos. Es lo que ve HR en el Desk.
 *   - NO borra `asset_scan_results`: la tabla es append-only por diseño
 *     (trigger `asset_scan_results_append_only` con RAISE EXCEPTION en DELETE),
 *     para que un veredicto de escaneo no se pueda repudiar. Desactivar ese
 *     guardrail para limpiar datos de prueba sería peor que la suciedad que
 *     limpia. Las dos filas quedan, ya anotadas como prueba en `resolution_notes`.
 *   - Los assets se marcan `deleted` (soft-delete del dominio) en vez de
 *     borrarse: `asset_scan_results` cascadea desde `assets`, así que un DELETE
 *     duro chocaría con el mismo trigger.
 *
 * Uso:
 *   npx tsx --require dotenv/config --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/hiring/purge-task-1378-test-applications.ts            # dry-run
 *   ... scripts/hiring/purge-task-1378-test-applications.ts --apply  # ejecuta
 */
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

const TEST_EMAILS = ['task-1378-scan-clean@efeonce.org', 'task-1378-scan-eicar@efeonce.org']
const APPLY = process.argv.includes('--apply')

type Target = {
  application_id: string
  public_id: string
  stage: string
  identity_profile_id: string
  candidate_facet_id: string
  full_name: string
  canonical_email: string
}

const main = async () => {
  const targets = await runGreenhousePostgresQuery<Target>(
    `SELECT ap.application_id, ap.public_id, ap.stage, ap.identity_profile_id, ap.candidate_facet_id,
            ip.full_name, ip.canonical_email
     FROM greenhouse_hiring.hiring_application ap
     JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = ap.identity_profile_id
     WHERE ip.canonical_email = ANY($1)`,
    [TEST_EMAILS],
  )

  if (!targets.length) {
    console.log('Nada que purgar: no hay postulaciones con los correos de prueba.')

    return
  }

  console.log(`\nObjetivos (${targets.length}):`)
  console.table(targets)

  // Guardrail: sólo se toca lo que es inequívocamente de prueba. Si alguna fila
  // no calza con el patrón esperado, se aborta entera — no se purga "casi todo".
  for (const t of targets) {
    if (!TEST_EMAILS.includes(t.canonical_email) || !t.full_name.includes('TASK-1378')) {
      throw new Error(`ABORT — la fila ${t.application_id} no calza con el patrón de prueba`)
    }

    if (t.stage !== 'sourced') {
      throw new Error(`ABORT — ${t.public_id} ya avanzó a stage="${t.stage}"; alguien la está trabajando`)
    }
  }

  // Nadie más puede estar colgando de estas filas: los FK hacia application y
  // facet son RESTRICT, así que un dependiente real haría fallar el DELETE. Se
  // chequea antes para dar un mensaje claro en vez de un error de constraint.
  const blockers = await runGreenhousePostgresQuery<{ tabla: string; n: number }>(
    `SELECT 'hiring_handoff' AS tabla, COUNT(*)::int n
       FROM greenhouse_hiring.hiring_handoff WHERE hiring_application_id = ANY($1)
     UNION ALL
     SELECT 'hiring_activation_request', COUNT(*)::int
       FROM greenhouse_hr.hiring_activation_request WHERE hiring_application_id = ANY($1)
     UNION ALL
     SELECT 'hiring_demographic_selfid', COUNT(*)::int
       FROM greenhouse_hiring.hiring_demographic_selfid WHERE application_id = ANY($1)`,
    [targets.map(t => t.application_id)],
  )

  const blocking = blockers.filter(b => b.n > 0)

  if (blocking.length) {
    console.table(blocking)
    throw new Error('ABORT — hay dependientes reales colgando de estas postulaciones')
  }

  if (!APPLY) {
    console.log('\nDRY-RUN. Se borrarían las postulaciones, facets y perfiles de arriba,')
    console.log('los assets quedarían en status="deleted", y las filas de asset_scan_results')
    console.log('se conservan (append-only por diseño). Re-ejecuta con --apply.')

    return
  }

  await withGreenhousePostgresTransaction(async client => {
    const applicationIds = targets.map(t => t.application_id)
    const facetIds = targets.map(t => t.candidate_facet_id)
    const profileIds = targets.map(t => t.identity_profile_id)

    // Soft-delete de los assets ANTES de soltar la postulación, para que no
    // queden como adjuntos vivos de un aggregate que ya no existe.
    const assets = await client.query(
      `UPDATE greenhouse_core.assets
          SET status = 'deleted', deleted_at = now()
        WHERE filename LIKE '%task-1378%' AND status <> 'deleted'
        RETURNING asset_id, bucket_name, object_path`,
    )

    await client.query(`DELETE FROM greenhouse_hiring.hiring_application WHERE application_id = ANY($1)`, [
      applicationIds,
    ])
    await client.query(`DELETE FROM greenhouse_hiring.candidate_facet WHERE candidate_facet_id = ANY($1)`, [facetIds])
    await client.query(`DELETE FROM greenhouse_core.identity_profiles WHERE profile_id = ANY($1)`, [profileIds])

    console.log(`\nAssets marcados deleted (${assets.rowCount}):`)
    console.table(assets.rows)
    console.log('Objetos GCS a purgar aparte (el borrado de bytes no va en esta transacción):')
    for (const a of assets.rows) console.log(`  gs://${a.bucket_name}/${a.object_path}`)
  })

  const left = await runGreenhousePostgresQuery<{ n: number }>(
    `SELECT COUNT(*)::int n FROM greenhouse_hiring.hiring_application ap
      JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = ap.identity_profile_id
      WHERE ip.canonical_email = ANY($1)`,
    [TEST_EMAILS],
  )

  console.log(`\nPostulaciones de prueba restantes: ${left[0]?.n ?? '?'} (esperado 0)`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
