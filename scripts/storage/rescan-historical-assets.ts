/**
 * TASK-1378 Slice 5 — Re-escaneo de assets históricos con la base de firmas.
 *
 * Por qué existe: los assets que entraron antes de ClamAV tienen veredicto
 * `clean` de `structural` solamente, o `legacy_unscanned`. `structural` mira
 * magic bytes; nunca vio una firma. Ese "clean" dice menos de lo que parece.
 *
 * HUMANO EN EL LOOP, y no es una formalidad: estos bytes son el CV de una
 * persona real que postuló de buena fe. Un falso positivo le cierra la puerta
 * sin que nadie se entere. Por eso el job **registra el veredicto nuevo pero
 * NUNCA cuarentena por su cuenta**.
 *
 * Eso no lo deja sin dientes. `asset_scan_results` es append-only y el guard del
 * attach agrega sobre TODOS los veredictos de un asset: una fila bloqueante en
 * `open` ya impide que ese documento se vuelva a adjuntar, y el signal
 * `storage.asset_scan.open_quarantine` levanta la mano. Lo que queda en manos
 * humanas es el paso irreversible — sacarle el CV a un candidato.
 *
 * Uso:
 *   npx tsx --require dotenv/config --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/storage/rescan-historical-assets.ts                    # dry-run: sólo lista
 *   ... scripts/storage/rescan-historical-assets.ts --apply          # escanea y registra
 *   ... scripts/storage/rescan-historical-assets.ts --apply --limit 5
 *
 * Requiere `ASSET_MALWARE_SCAN_ENABLED=true` + `ASSET_MALWARE_SCAN_ENDPOINT`:
 * sin ClamAV esto re-correría `structural` sobre lo que `structural` ya vio, que
 * no aporta nada. El job aborta si el flag está apagado en vez de dar una falsa
 * sensación de haber revisado.
 */
import { isAssetMalwareScanEnabled } from '@/lib/storage/asset-scan/config'
import { scanAssetBytes } from '@/lib/storage/asset-scan'
import { recordAssetScanResult } from '@/lib/storage/asset-scan/store'
import { downloadGreenhouseStorageObject } from '@/lib/storage/greenhouse-media'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const APPLY = process.argv.includes('--apply')

const LIMIT = (() => {
  const index = process.argv.indexOf('--limit')

  if (index === -1) return 100

  const parsed = Number.parseInt(process.argv[index + 1] ?? '', 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 100
})()

/**
 * Elegibles: assets vivos de los contextos que el attach gatea, cuyo veredicto
 * más reciente no incluye a ClamAV — o lo incluye pero terminó en \`error\`, que
 * es una no-respuesta y merece reintento. Se excluyen los ya cuarentenados: su
 * caso ya está en manos de alguien.
 *
 * Sobre el timeout: el default del adapter (10 s) alcanza de sobra para un CV,
 * pero no para un entregable de 12 MB. Correr este job con
 * \`ASSET_MALWARE_SCAN_TIMEOUT_MS\` holgado evita generar \`scanner_timeout\`
 * masivos, que son ruido bloqueante y no hallazgos.
 */
const ELIGIBLE_SQL = `
  SELECT
    a.asset_id,
    a.owner_aggregate_type,
    a.filename,
    a.mime_type,
    a.size_bytes,
    a.bucket_name,
    a.object_path,
    latest.verdict AS previous_verdict,
    latest.scanner AS previous_scanner
  FROM greenhouse_core.assets a
  LEFT JOIN LATERAL (
    SELECT r.verdict, r.scanner
    FROM greenhouse_core.asset_scan_results r
    WHERE r.asset_id = a.asset_id
    ORDER BY r.scanned_at DESC, r.scan_id DESC
    LIMIT 1
  ) latest ON TRUE
  WHERE a.status IN ('attached', 'pending')
    AND a.owner_aggregate_type IN (
      'hiring_application_cv',
      'hiring_candidate_portfolio_file',
      'proposal_rfp',
      'proposal_deliverable'
    )
    -- Un \`error\` NO es un veredicto, es una no-respuesta: reintentar es
    -- correcto y necesario. Sin esto, un timeout deja al asset con una fila
    -- bloqueante abierta para siempre y fuera del alcance del propio job.
    AND (latest.scanner IS NULL OR latest.scanner NOT LIKE '%clamav%' OR latest.verdict = 'error')
  ORDER BY a.created_at ASC
  LIMIT $1
`

type Eligible = {
  asset_id: string
  owner_aggregate_type: string
  filename: string
  mime_type: string
  size_bytes: string | number | null
  bucket_name: string
  object_path: string
  previous_verdict: string | null
  previous_scanner: string | null
}

const main = async () => {
  if (!isAssetMalwareScanEnabled()) {
    throw new Error(
      'ABORT — ASSET_MALWARE_SCAN_ENABLED está apagado. Sin ClamAV esto re-correría `structural` sobre lo que ya vio.',
    )
  }

  const eligible = await runGreenhousePostgresQuery<Eligible>(ELIGIBLE_SQL, [LIMIT])

  if (!eligible.length) {
    console.log('No hay assets elegibles: todos los gateados ya tienen veredicto con firmas.')

    return
  }

  console.log(`\nElegibles (${eligible.length}, límite ${LIMIT}):`)
  console.table(
    eligible.map(a => ({
      asset: a.asset_id.slice(0, 20),
      contexto: a.owner_aggregate_type,
      archivo: a.filename.slice(0, 34),
      bytes: a.size_bytes,
      veredicto_previo: `${a.previous_verdict ?? 'ninguno'} (${a.previous_scanner ?? '—'})`,
    })),
  )

  if (!APPLY) {
    console.log('\nDRY-RUN. Re-ejecuta con --apply para escanear y registrar los veredictos.')
    console.log('El job NUNCA cuarentena por su cuenta: los hallazgos se reportan para decisión humana.')

    return
  }

  const findings: Array<{ asset: string; archivo: string; veredicto: string; codigos: string }> = []
  let scanned = 0
  let failed = 0

  for (const asset of eligible) {
    try {
      const object = await downloadGreenhouseStorageObject({
        bucketName: asset.bucket_name,
        objectName: asset.object_path,
      })

      const bytes = Buffer.from(object.arrayBuffer)

      const result = await scanAssetBytes({
        bytes,
        declaredMimeType: asset.mime_type || 'application/octet-stream',
        fileName: asset.filename,
      })

      // Append-only: registrar es seguro y deja trazabilidad del re-escaneo.
      // Lo que NO se hace es tocar `assets.status`.
      const scanId = await recordAssetScanResult({
        assetId: asset.asset_id,
        result,
        declaredMimeType: asset.mime_type || 'application/octet-stream',
        sizeBytes: bytes.byteLength,
      })

      scanned += 1

      const blocking = result.findings.filter(f => f.severity === 'blocking')

      if (result.verdict !== 'clean') {
        findings.push({
          asset: asset.asset_id,
          archivo: asset.filename,
          veredicto: result.verdict,
          codigos: blocking.map(f => f.code).join(', ') || '—',
        })
        console.log(`  ! ${asset.filename} → ${result.verdict} (${scanId})`)
      } else {
        console.log(`  ✓ ${asset.filename} → clean [${result.scanner}]`)
      }
    } catch (error) {
      failed += 1
      // Resiliencia por fila: un objeto ilegible en GCS no puede abortar el lote.
      console.error(`  × ${asset.filename} → ${error instanceof Error ? error.message : 'error'}`)
    }
  }

  console.log(`\nEscaneados: ${scanned}/${eligible.length}  ·  fallidos: ${failed}  ·  hallazgos: ${findings.length}`)

  if (findings.length) {
    console.log('\n⚠ HALLAZGOS — requieren decisión humana. NO se cuarentenó nada automáticamente:')
    console.table(findings)
    console.log('\nCada uno ya quedó como veredicto bloqueante `open`, así que el attach los veta y el signal')
    console.log('`storage.asset_scan.open_quarantine` los reporta. Revisar antes de quitarle el documento a nadie:')
    console.log('un falso positivo le cierra la puerta a una persona que postuló de buena fe.')
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
