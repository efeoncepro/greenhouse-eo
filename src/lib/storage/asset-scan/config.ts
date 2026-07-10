import 'server-only'

/**
 * TASK-1362 — Resolución del scanner activo.
 *
 * `structural` corre SIEMPRE: es in-process, sin infra, y es lo único que hoy
 * separa un CV real de un binario disfrazado. `clamav-http` se suma encima
 * cuando el flag está prendido; nunca lo reemplaza (uno detecta suplantación de
 * tipo, el otro firmas de malware; son ortogonales).
 *
 * Runtime del flag: Vercel (el upload público de CV corre en el route handler
 * de Next). Si algún día un worker Cloud Run sube assets de usuario, hay que
 * prender el flag también ahí — la env var no se comparte entre runtimes.
 */
const DEFAULT_TIMEOUT_MS = 10_000

export const isAssetMalwareScanEnabled = () => process.env.ASSET_MALWARE_SCAN_ENABLED === 'true'

export const getAssetMalwareScanEndpoint = () => {
  const endpoint = process.env.ASSET_MALWARE_SCAN_ENDPOINT?.trim()

  return endpoint || null
}

export const getAssetMalwareScanTimeoutMs = () => {
  const raw = Number.parseInt(process.env.ASSET_MALWARE_SCAN_TIMEOUT_MS ?? '', 10)

  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS
}
