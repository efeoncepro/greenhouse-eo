import 'server-only'

import { createClamAvHttpScanner } from './clamav-http'
import {
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
      const clamav = await createClamAvHttpScanner({ endpoint, timeoutMs: getAssetMalwareScanTimeoutMs() }).scan(input)

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
