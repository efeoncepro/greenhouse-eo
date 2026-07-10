import 'server-only'

import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { AssetScanFinding, AssetScanResult, AssetScanVerdict } from './types'

export type PersistedAssetScanResult = {
  scanId: string
  assetId: string
  verdict: AssetScanVerdict
  scanner: string
  findings: AssetScanFinding[]
  detectedMimeType: string | null
  resolutionStatus: 'open' | 'ignored' | 'confirmed_malicious' | 'false_positive'
  scannedAt: string | null
}

type ScanRow = {
  scan_id: string
  asset_id: string
  verdict: string
  scanner: string
  findings_json: unknown
  detected_mime_type: string | null
  resolution_status: string
  scanned_at: string | null
}

const mapScanRow = (row: ScanRow): PersistedAssetScanResult => ({
  scanId: row.scan_id,
  assetId: row.asset_id,
  verdict: row.verdict as AssetScanVerdict,
  scanner: row.scanner,
  findings: Array.isArray(row.findings_json) ? (row.findings_json as AssetScanFinding[]) : [],
  detectedMimeType: row.detected_mime_type,
  resolutionStatus: row.resolution_status as PersistedAssetScanResult['resolutionStatus'],
  scannedAt: row.scanned_at,
})

/**
 * TASK-1362 — Persiste el veredicto. Append-only por trigger en DB: este writer
 * nunca actualiza una fila existente, y el triage humano muta sólo `resolution_*`.
 */
export const recordAssetScanResult = async ({
  assetId,
  result,
  declaredMimeType,
  sizeBytes,
}: {
  assetId: string
  result: AssetScanResult
  declaredMimeType: string
  sizeBytes: number
}): Promise<string> => {
  const scanId = `ascan-${randomUUID()}`

  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_core.asset_scan_results (
        scan_id, asset_id, verdict, scanner, scanner_version,
        findings_json, declared_mime_type, detected_mime_type, size_bytes, duration_ms
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
    `,
    [
      scanId,
      assetId,
      result.verdict,
      result.scanner,
      result.scannerVersion,
      JSON.stringify(result.findings),
      declaredMimeType,
      result.detectedMimeType,
      sizeBytes,
      result.durationMs,
    ],
  )

  return scanId
}

/** Último veredicto por asset. Consumido por el resolver documental (Slice 2). */
export const getLatestScanResultsForAssets = async (assetIds: string[]): Promise<Map<string, PersistedAssetScanResult>> => {
  if (assetIds.length === 0) return new Map()

  const rows = await runGreenhousePostgresQuery<ScanRow>(
    `
      SELECT DISTINCT ON (asset_id)
        scan_id, asset_id, verdict, scanner, findings_json, detected_mime_type, resolution_status, scanned_at
      FROM greenhouse_core.asset_scan_results
      WHERE asset_id = ANY($1::text[])
      ORDER BY asset_id, scanned_at DESC, scan_id DESC
    `,
    [assetIds],
  )

  return new Map(rows.map(row => [row.asset_id, mapScanRow(row)]))
}

/**
 * Cuenta de cuarentenas abiertas. Alimenta el reliability signal
 * `storage.asset_scan.open_quarantine` (steady = 0).
 */
export const countOpenQuarantinedScans = async () => {
  const rows = await runGreenhousePostgresQuery<{ verdict: string; total: string }>(
    `
      SELECT verdict, COUNT(*)::text AS total
      FROM greenhouse_core.asset_scan_results
      WHERE resolution_status = 'open'
        AND verdict IN ('suspicious', 'infected', 'error')
      GROUP BY verdict
    `,
  )

  return rows.map(row => ({ verdict: row.verdict as AssetScanVerdict, total: Number.parseInt(row.total, 10) }))
}
