import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as PostgresClientModule from '@/lib/postgres/client'

/**
 * TASK-1362 — El escaneo NO puede depender de que el caller se acuerde.
 *
 * TASK-1372/1373 migran el apply de Careers a Growth Forms: parten el flujo en un
 * upload síncrono (Vercel, con los bytes) y un consumer reactivo (worker, sólo
 * JSON de PG), y jubilan la ruta directa que hoy escanea. Un implementador que
 * cablee el camino nuevo con `createPrivatePendingAsset` + `attachAssetToAggregate`
 * —los dos helpers que la spec de 1372 nombra literalmente— abriría un segundo
 * camino de subida sin escanear.
 *
 * Estos tests fijan el guardrail que lo hace imposible: adjuntar un documento de
 * candidato sin veredicto limpio falla, venga el attach de donde venga.
 */

const runGreenhousePostgresQuery = vi.fn()
const publishOutboxEvent = vi.fn()
const uploadGreenhouseStorageObject = vi.fn()
const downloadGreenhouseStorageObject = vi.fn()
const deleteGreenhouseStorageObject = vi.fn()

// Mock parcial: sólo interceptamos la query. El resto del cliente (pool, tx,
// hooks de reset) lo consume el grafo de imports de `greenhouse-assets`.
vi.mock('@/lib/postgres/client', async importOriginal => ({
  ...(await importOriginal<typeof PostgresClientModule>()),
  runGreenhousePostgresQuery,
}))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent }))
vi.mock('../greenhouse-media', () => ({
  uploadGreenhouseStorageObject,
  downloadGreenhouseStorageObject,
  deleteGreenhouseStorageObject,
}))
vi.mock('@/lib/bigquery', () => ({ getBigQueryProjectId: () => 'test-project' }))

const { attachAssetToAggregate } = await import('../greenhouse-assets')

const ASSET_ID = 'asset-1'

const attachedRow = {
  asset_id: ASSET_ID,
  public_id: 'EO-AST-1',
  visibility: 'private',
  status: 'attached',
  bucket_name: 'b',
  object_path: 'p',
  filename: 'cv.pdf',
  mime_type: 'application/pdf',
  size_bytes: '10',
  retention_class: 'hiring_candidate_document',
  owner_aggregate_type: 'hiring_application_cv',
  owner_aggregate_id: 'happ-1',
  owner_client_id: null,
  owner_space_id: null,
  owner_member_id: null,
  uploaded_by_user_id: null,
  attached_by_user_id: null,
  deleted_by_user_id: null,
  upload_source: 'user',
  download_count: 0,
  metadata_json: {},
  content_hash: null,
  created_at: null,
  uploaded_at: null,
  attached_at: null,
  deleted_at: null,
  last_downloaded_at: null,
}

/**
 * Primera query = agregado de veredictos del asset; el resto = UPDATE del attach
 * + access log. El guard agrega sobre TODOS los scans, no toma el último.
 */
const mockScanSummary = (summary: { blocking_verdict?: string | null; has_clean?: boolean } | null) => {
  runGreenhousePostgresQuery.mockReset()
  runGreenhousePostgresQuery
    .mockResolvedValueOnce(
      summary ? [{ blocking_verdict: summary.blocking_verdict ?? null, has_clean: summary.has_clean ?? false, total: 1 }] : [],
    )
    .mockResolvedValue([attachedRow])
}

const attachCv = () =>
  attachAssetToAggregate({
    assetId: ASSET_ID,
    ownerAggregateType: 'hiring_application_cv',
    ownerAggregateId: 'happ-1',
    actorUserId: null,
  })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('attachAssetToAggregate — guardrail de escaneo', () => {
  it('rechaza adjuntar un CV que nunca fue escaneado', async () => {
    mockScanSummary(null)

    await expect(attachCv()).rejects.toThrow('asset_scan_required')
  })

  it.each(['suspicious', 'infected', 'error'])('rechaza adjuntar un CV con veredicto %s', async verdict => {
    mockScanSummary({ blocking_verdict: verdict })

    await expect(attachCv()).rejects.toThrow(`asset_scan_blocking:${verdict}`)
  })

  it('un veredicto limpio NO levanta un bloqueante abierto del mismo asset', async () => {
    // "El peor veredicto gana" no puede depender del orden de los scans.
    mockScanSummary({ blocking_verdict: 'infected', has_clean: true })

    await expect(attachCv()).rejects.toThrow('asset_scan_blocking:infected')
  })

  it('rechaza adjuntar un CV que sólo tiene el marcador legacy_unscanned', async () => {
    // El backfill marcó así los que entraron antes del escaneo. Ese veredicto
    // documenta el pasado; no autoriza un attach nuevo.
    mockScanSummary({ has_clean: false })

    await expect(attachCv()).rejects.toThrow('asset_scan_required')
  })

  it('permite adjuntar un CV con veredicto limpio', async () => {
    mockScanSummary({ has_clean: true })

    await expect(attachCv()).resolves.toMatchObject({ assetId: ASSET_ID, status: 'attached' })
  })

  it('aplica el mismo guardrail al portafolio-archivo del candidato', async () => {
    mockScanSummary(null)

    await expect(
      attachAssetToAggregate({
        assetId: ASSET_ID,
        ownerAggregateType: 'hiring_candidate_portfolio_file',
        ownerAggregateId: 'cndf-1',
        actorUserId: null,
      }),
    ).rejects.toThrow('asset_scan_required')
  })

  it('NO exige escaneo en contextos que no vienen de la web pública', async () => {
    // Un recibo de nómina lo genera Greenhouse; no hay bytes de terceros.
    runGreenhousePostgresQuery.mockReset()
    runGreenhousePostgresQuery.mockResolvedValue([{ ...attachedRow, owner_aggregate_type: 'payroll_receipt' }])

    await expect(
      attachAssetToAggregate({
        assetId: ASSET_ID,
        ownerAggregateType: 'payroll_receipt',
        ownerAggregateId: 'pr-1',
        actorUserId: 'user-1',
      }),
    ).resolves.toBeTruthy()
  })

  it('lee el veredicto ANTES de mutar el asset: un attach bloqueado no deja rastro', async () => {
    mockScanSummary({ blocking_verdict: 'infected' })

    await expect(attachCv()).rejects.toThrow()

    // Sólo corrió la lectura del veredicto. Ningún UPDATE, ningún evento.
    expect(runGreenhousePostgresQuery).toHaveBeenCalledTimes(1)
    expect(publishOutboxEvent).not.toHaveBeenCalled()
  })
})
