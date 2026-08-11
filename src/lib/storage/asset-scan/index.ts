import 'server-only'

import { createClamAvHttpScanner } from './clamav-http'
import {
  getAssetMalwareScanAudience,
  getAssetMalwareScanEndpoint,
  getAssetMalwareScanTimeoutMs,
  isAssetMalwareScanEnabled,
} from './config'
import { structuralAssetScanner } from './structural'
import type { AssetScanFinding, AssetScanInput, AssetScanResult, AssetScanVerdict } from './types'

export type { AssetScanFinding, AssetScanInput, AssetScanResult, AssetScanVerdict, AssetScanner } from './types'
export { isBlockingVerdict } from './types'
export { structuralAssetScanner } from './structural'
export { createClamAvHttpScanner } from './clamav-http'
export { isAssetMalwareScanEnabled } from './config'

/** El peor veredicto gana. Un scanner limpio nunca revierte a otro que bloqueó. */
const VERDICT_SEVERITY: Record<AssetScanVerdict, number> = {
  clean: 0,
  legacy_unscanned: 1,
  error: 2,
  suspicious: 3,
  infected: 4,
}

const worstVerdict = (left: AssetScanVerdict, right: AssetScanVerdict) =>
  VERDICT_SEVERITY[right] > VERDICT_SEVERITY[left] ? right : left

/**
 * TASK-1362 — Punto único de escaneo. Todo upload que pueda venir de la web
 * pública pasa por acá ANTES de quedar `attached`.
 *
 * Composición, no reemplazo: `structural` corre siempre; `clamav-http` se suma
 * cuando el flag está prendido. Si el flag está prendido pero falta el endpoint,
 * el veredicto es `error` (bloqueante): una mala configuración no puede
 * degradar silenciosamente a "sin antivirus".
 */
export const scanAssetBytes = async (input: AssetScanInput): Promise<AssetScanResult> => {
  const startedAt = Date.now()

  const structural = await structuralAssetScanner.scan(input)

  let verdict = structural.verdict
  let scanner = structural.scanner
  let scannerVersion = structural.scannerVersion
  const findings: AssetScanFinding[] = [...structural.findings]

  if (isAssetMalwareScanEnabled()) {
    const endpoint = getAssetMalwareScanEndpoint()

    if (!endpoint) {
      verdict = worstVerdict(verdict, 'error')
      findings.push({
        code: 'scanner_misconfigured',
        severity: 'blocking',
        detail: 'ASSET_MALWARE_SCAN_ENABLED está prendido pero falta ASSET_MALWARE_SCAN_ENDPOINT.',
      })
    } else {
      // TASK-1378 — El servicio vive en Cloud Run detrás de IAM. La audiencia se
      // deriva del propio endpoint; si no es https (dev local sin IAM) no se
      // pide token y el adapter llama sin header.
      const audience = getAssetMalwareScanAudience()

      // `import()` diferido y no import estático: `google-auth-library` es pesado
      // y este módulo está en el path de TODA subida. Con el flag OFF —el default
      // en todos los runtimes— no hay razón para que el SDK de auth entre siquiera
      // al grafo. Estático, se cargaba en cada archivo que toca uploads y empujaba
      // la memoria del runner de CI hasta matarlo en un render de react-pdf.
      const getAuthToken = audience
        ? async () => {
            const { fetchGoogleIdTokenForAudience } = await import('@/lib/google-credentials')

            return fetchGoogleIdTokenForAudience(audience)
          }
        : undefined

      const clamav = await createClamAvHttpScanner({
        endpoint,
        timeoutMs: getAssetMalwareScanTimeoutMs(),
        ...(getAuthToken ? { getAuthToken } : {}),
      }).scan(input)

      verdict = worstVerdict(verdict, clamav.verdict)
      findings.push(...clamav.findings)
      scanner = `${scanner}+${clamav.scanner}`
      scannerVersion = `${scannerVersion}+${clamav.scannerVersion}`
    }
  }

  return {
    verdict,
    scanner,
    scannerVersion,
    findings,
    detectedMimeType: structural.detectedMimeType,
    durationMs: Date.now() - startedAt,
  }
}
