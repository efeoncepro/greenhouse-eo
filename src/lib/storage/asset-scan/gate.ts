import 'server-only'

import { quarantineAsset } from '@/lib/storage/greenhouse-assets'

import { scanAssetBytes } from './index'
import { recordAssetScanResult } from './store'
import { isBlockingVerdict } from './types'

export type ScanGateOutcome =
  | {
      outcome: 'clean'
      assetId: string
      scanId: string
      scanner: string
      /** Hallazgos no bloqueantes (p. ej. un PDF con `/JavaScript` exportado por Word). */
      advisoryFindingCodes: string[]
    }
  | { outcome: 'quarantined'; assetId: string; scanId: string; verdict: string; findingCodes: string[] }

/**
 * TASK-1362 — Puerta canónica entre "asset subido" y "asset adjuntable".
 *
 * Opera sobre `bytes` + `assetId`, NO sobre un `File`. Eso es deliberado: el
 * escaneo original quedó soldado al `File` del submit síncrono, y TASK-1372
 * parte ese flujo en un upload en Vercel (que tiene los bytes) más un consumer
 * reactivo en el worker (que sólo ve JSON de Postgres y nunca un archivo). Un
 * helper que exija `File` no es reusable por el camino nuevo.
 *
 * Contrato: llamá esto INMEDIATAMENTE después de `createPrivatePendingAsset` y
 * antes de cualquier `attachAssetToAggregate`. Si el veredicto bloquea, el asset
 * queda en cuarentena acá y el caller NO debe adjuntarlo.
 *
 * Defensa en profundidad: aunque olvides llamarlo, `attachAssetToAggregate`
 * rechaza los contextos de documento de candidato sin veredicto limpio. Este
 * helper es el camino ergonómico; el guard del attach es la red.
 */
export const scanAndGateUploadedAsset = async ({
  assetId,
  bytes,
  declaredMimeType,
  fileName,
}: {
  assetId: string
  bytes: Buffer
  declaredMimeType: string
  fileName: string
}): Promise<ScanGateOutcome> => {
  const scan = await scanAssetBytes({ bytes, declaredMimeType, fileName })

  const scanId = await recordAssetScanResult({
    assetId,
    result: scan,
    declaredMimeType,
    sizeBytes: bytes.byteLength,
  })

  if (!isBlockingVerdict(scan.verdict)) {
    return {
      outcome: 'clean',
      assetId,
      scanId,
      scanner: scan.scanner,
      advisoryFindingCodes: scan.findings
        .filter(finding => finding.severity === 'advisory')
        .map(finding => finding.code),
    }
  }

  const findingCodes = scan.findings.filter(finding => finding.severity === 'blocking').map(finding => finding.code)

  await quarantineAsset({ assetId, scanId, verdict: scan.verdict, findingCodes })

  return { outcome: 'quarantined', assetId, scanId, verdict: scan.verdict, findingCodes }
}
