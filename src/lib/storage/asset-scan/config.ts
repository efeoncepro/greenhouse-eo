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

/**
 * TASK-1378 — Audiencia del ID token OIDC.
 *
 * El servicio ClamAV corre en Cloud Run con `--no-allow-unauthenticated`, y el
 * `aud` que Cloud Run valida es el origin del servicio. Por eso se deriva del
 * endpoint en vez de configurarse aparte: dos variables que siempre tienen que
 * coincidir son dos variables que algún día no van a coincidir.
 *
 * `null` cuando el endpoint no es https (dev local contra un ClamAV sin IAM):
 * ahí no hay token que pedir ni Cloud Run que lo valide.
 */
export const getAssetMalwareScanAudience = () => {
  const endpoint = getAssetMalwareScanEndpoint()

  if (!endpoint) return null

  try {
    const url = new URL(endpoint)

    return url.protocol === 'https:' ? url.origin : null
  } catch {
    return null
  }
}
