/**
 * TASK-1378 / incidente 2026-08-11 — Recuperación de los CV que el scanner
 * bloqueó por un 403.
 *
 * Qué pasó: al prender `ASSET_MALWARE_SCAN_ENABLED` en producción, el runtime de
 * Vercel no pudo invocar el Cloud Run del scanner — su identidad no tiene
 * `roles/run.invoker` sobre el servicio. El adapter devolvió `scanner_http_error`
 * (HTTP 403) y, por diseño fail-closed, cada CV quedó en cuarentena. Cinco
 * personas postularon, vieron el mensaje de éxito, y su currículum nunca se
 * adjuntó.
 *
 * Por qué la recuperación es posible: la cuarentena preserva los bytes, y el
 * `metadata_json` del asset conserva `applicationId`, `candidateFacetId` e
 * `identityProfileId`. Nada se perdió; quedó desconectado.
 *
 * Qué hace este job, por asset:
 *   1. Baja los bytes de GCS y los vuelve a escanear con el scanner ya operativo.
 *   2. Si el veredicto es `clean`: marca el `error` previo como `false_positive`
 *      (el archivo nunca fue el problema — el scanner no era alcanzable), registra
 *      el veredicto nuevo y adjunta el CV a su postulación.
 *   3. Si NO es `clean`: no toca nada y lo reporta. Un archivo que de verdad
 *      objeta necesita ojos humanos, no un job de recovery.
 *
 * Uso:
 *   npx tsx --require dotenv/config --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/hiring/recover-scanner-403-quarantined-cvs.ts           # dry-run
 *   ... scripts/hiring/recover-scanner-403-quarantined-cvs.ts --apply
 */
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { scanAssetBytes } from '@/lib/storage/asset-scan'
import { recordAssetScanResult } from '@/lib/storage/asset-scan/store'
import { attachAssetToAggregate } from '@/lib/storage/greenhouse-assets'
import { downloadGreenhouseStorageObject } from '@/lib/storage/greenhouse-media'

const APPLY = process.argv.includes('--apply')

/** Sólo los bloqueados por falla del scanner. Un `infected` real NO entra acá. */
const AFFECTED_SQL = `
  SELECT
    a.asset_id, a.filename, a.mime_type, a.bucket_name, a.object_path, a.metadata_json,
    r.scan_id
  FROM greenhouse_core.assets a
  JOIN greenhouse_core.asset_scan_results r ON r.asset_id = a.asset_id
  WHERE a.status = 'quarantined'
    AND r.verdict = 'error'
    AND r.resolution_status = 'open'
    -- Cualquier falla de credencial o transporte del scanner: el archivo nunca
    -- fue el problema. NO incluye infected ni suspicious, que son veredictos
    -- reales sobre el contenido y necesitan ojos humanos.
    AND (r.findings_json::text LIKE '%scanner_http_error%'
         OR r.findings_json::text LIKE '%scanner_auth_failed%'
         OR r.findings_json::text LIKE '%scanner_unreachable%')
  ORDER BY a.created_at ASC
`

type Affected = {
  asset_id: string
  filename: string
  mime_type: string
  bucket_name: string
  object_path: string
  metadata_json: Record<string, unknown> | null
  scan_id: string
}

const main = async () => {
  const affected = await runGreenhousePostgresQuery<Affected>(AFFECTED_SQL)

  if (!affected.length) {
    console.log('No hay CV bloqueados por falla del scanner.')

    return
  }

  console.log(`\nAfectados (${affected.length}):`)
  console.table(
    affected.map(a => ({
      archivo: a.filename.slice(0, 40),
      postulacion: String(a.metadata_json?.applicationId ?? '—'),
      vacante: String(a.metadata_json?.openingPublicId ?? '—'),
    })),
  )

  if (!APPLY) {
    console.log('\nDRY-RUN. Re-ejecuta con --apply para re-escanear, liberar y adjuntar.')

    return
  }

  let recovered = 0
  const stillBlocked: Array<{ archivo: string; veredicto: string }> = []

  for (const asset of affected) {
    const applicationId = typeof asset.metadata_json?.applicationId === 'string' ? asset.metadata_json.applicationId : null

    if (!applicationId) {
      console.error(`  × ${asset.filename} → sin applicationId en metadata; requiere revisión manual`)
      continue
    }

    try {
      const object = await downloadGreenhouseStorageObject({
        bucketName: asset.bucket_name,
        objectName: asset.object_path,
      })

      const bytes = Buffer.from(object.arrayBuffer)
      const declaredMimeType = asset.mime_type || 'application/octet-stream'

      const result = await scanAssetBytes({ bytes, declaredMimeType, fileName: asset.filename })

      if (result.verdict !== 'clean') {
        stillBlocked.push({ archivo: asset.filename, veredicto: result.verdict })
        console.log(`  ! ${asset.filename} → ${result.verdict}: NO se libera, requiere revisión humana`)
        continue
      }

      // El `error` previo se resuelve como `false_positive` porque eso es lo que
      // fue: el archivo nunca objetó nada, el scanner no era alcanzable. Dejarlo
      // `open` mantendría el veto del attach para siempre.
      await runGreenhousePostgresQuery(
        `UPDATE greenhouse_core.asset_scan_results
            SET resolution_status = 'false_positive',
                resolution_notes = $2,
                resolved_at = now()
          WHERE scan_id = $1`,
        [
          asset.scan_id,
          'TASK-1378 — bloqueado por falla de credencial/transporte del scanner, no por el contenido. Re-escaneado limpio.',
        ],
      )

      await recordAssetScanResult({ assetId: asset.asset_id, result, declaredMimeType, sizeBytes: bytes.byteLength })

      // `attachAssetToAggregate` vuelve a correr el guard: si algo quedara
      // bloqueante, falla acá en vez de adjuntar un documento que no debía pasar.
      await attachAssetToAggregate({
        assetId: asset.asset_id,
        ownerAggregateType: 'hiring_application_cv',
        ownerAggregateId: applicationId,
        actorUserId: null,
        metadata: { recoveredBy: 'TASK-1378', recoveryReason: 'scanner_http_error_403' },
      })

      recovered += 1
      console.log(`  ✓ ${asset.filename} → limpio y adjuntado a ${applicationId}`)
    } catch (error) {
      console.error(`  × ${asset.filename} → ${error instanceof Error ? error.message : 'error'}`)
    }
  }

  console.log(`\nRecuperados: ${recovered}/${affected.length}`)

  if (stillBlocked.length) {
    console.log('\n⚠ Siguen bloqueados y necesitan revisión humana:')
    console.table(stillBlocked)
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
