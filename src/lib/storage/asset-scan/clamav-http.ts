/**
 * TASK-1362 — Adapter ClamAV sobre HTTP (por ejemplo, ClamAV en Cloud Run).
 *
 * ESTADO: code-complete, NO verificado contra un servicio real. El flag
 * `ASSET_MALWARE_SCAN_ENABLED` nace en `false` en todos los runtimes; hasta que
 * exista el servicio provisionado, el único scanner activo es `structural`.
 * Antes de prenderlo hay que ejercitar el flujo real (archivo limpio pasa,
 * EICAR queda `infected`) — que la env var exista no prueba que el consumer sirva.
 *
 * Costo del servicio (estimado sobre la factura real de Cloud Run, 2026-07):
 * ClamAV necesita ~2 GiB residentes para la base de firmas y no puede escalar a
 * cero (el cold start cargando firmas rompería el submit público), así que exige
 * `min-instances=1`: ≈ USD 19-25/mes.
 *
 * Fail-closed: cualquier error de red, timeout o respuesta no reconocida emite
 * `error`, que es un veredicto bloqueante. Un scanner caído NO deja pasar bytes.
 */
import type { AssetScanInput, AssetScanner, AssetScanResult } from './types'

const VERSION = '1.0.0'

type ClamAvResponse = {
  status?: unknown
  signature?: unknown
}

const parseSignature = (payload: ClamAvResponse) =>
  typeof payload.signature === 'string' && payload.signature.trim() ? payload.signature.trim() : 'unknown_signature'

const buildScanner = ({ endpoint, timeoutMs }: { endpoint: string; timeoutMs: number }): AssetScanner => ({
  name: 'clamav-http',
  version: VERSION,
  scan: async ({ bytes, fileName }: AssetScanInput): Promise<Omit<AssetScanResult, 'durationMs'>> => {
    const base = {
      scanner: 'clamav-http',
      scannerVersion: VERSION,
      detectedMimeType: null,
    } as const

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(`${endpoint.replace(/\/+$/, '')}/scan`, {
        method: 'POST',
        headers: {
          'content-type': 'application/octet-stream',
          // El nombre viaja como header para no forzar multipart; el servicio lo
          // usa sólo para logging. NUNCA se confía en él para decidir tipo.
          'x-file-name': encodeURIComponent(fileName),
        },
        body: new Uint8Array(bytes),
        signal: controller.signal,
      })

      if (!response.ok) {
        return {
          ...base,
          verdict: 'error',
          findings: [
            {
              code: 'scanner_http_error',
              severity: 'blocking',
              detail: `El servicio de scan respondió HTTP ${response.status}.`,
            },
          ],
        }
      }

      const payload = (await response.json()) as ClamAvResponse

      if (payload.status === 'ok') {
        return { ...base, verdict: 'clean', findings: [] }
      }

      if (payload.status === 'found') {
        return {
          ...base,
          verdict: 'infected',
          findings: [
            {
              code: 'malware_signature_match',
              severity: 'blocking',
              detail: `ClamAV reconoció la firma ${parseSignature(payload)}.`,
            },
          ],
        }
      }

      return {
        ...base,
        verdict: 'error',
        findings: [
          {
            code: 'scanner_unrecognized_response',
            severity: 'blocking',
            detail: 'El servicio de scan devolvió un estado que no se reconoce.',
          },
        ],
      }
    } catch (error) {
      const aborted = error instanceof Error && error.name === 'AbortError'

      return {
        ...base,
        verdict: 'error',
        findings: [
          {
            code: aborted ? 'scanner_timeout' : 'scanner_unreachable',
            severity: 'blocking',
            detail: aborted
              ? `El servicio de scan no respondió dentro de ${timeoutMs} ms.`
              : 'No se pudo contactar el servicio de scan.',
          },
        ],
      }
    } finally {
      clearTimeout(timeout)
    }
  },
})

export const createClamAvHttpScanner = buildScanner
