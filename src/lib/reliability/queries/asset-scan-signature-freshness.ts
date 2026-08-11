import 'server-only'

import {
  getAssetMalwareScanAudience,
  getAssetMalwareScanEndpoint,
  isAssetMalwareScanEnabled,
} from '@/lib/storage/asset-scan/config'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1378 — Frescura de la base de firmas de ClamAV.
 *
 * Por qué existe: un ClamAV con firmas viejas es peor que no tener ClamAV,
 * porque nadie lo sabe. El servicio responde, los veredictos salen `clean` y el
 * portal reporta cobertura de firmas que en la práctica ya no cubre nada nuevo.
 * Es una falla silenciosa por definición, así que necesita un detector propio.
 *
 * A diferencia del resto de los signals, la fuente NO es PostgreSQL: la edad de
 * la base vive en el filesystem del contenedor y sólo el propio servicio la
 * conoce. Por eso se consulta su `/health`, con timeout corto para no colgar la
 * página de operaciones.
 *
 * Complementa a `storage.asset_scan.open_quarantine`: aquel detecta el scanner
 * CAÍDO (se llena de veredictos `error`), este detecta el scanner VIVO pero
 * ciego, que no levanta ninguna alarma por sí solo.
 */
export const ASSET_SCAN_SIGNATURE_FRESHNESS_SIGNAL_ID = 'storage.asset_scan.signature_freshness'

/** El propio contenedor degrada a 503 pasado este umbral; acá se replica para no depender del status. */
const STALE_HOURS = 168

/**
 * `freshclam` chequea cada 2 h. Pasadas 24 h sin actualizar, algo está fallando
 * aunque las firmas todavía sirvan: es la ventana para enterarse ANTES de los 7 días.
 */
const WARNING_HOURS = 24

/** La página de operaciones no puede quedarse esperando a un contenedor lento. */
const HEALTH_TIMEOUT_MS = 5_000

type ClamAvHealth = {
  status?: unknown
  clamd?: unknown
  signatureAgeHours?: unknown
  signaturesStale?: unknown
}

const LABEL = 'Frescura de firmas del scanner'

const base = {
  signalId: ASSET_SCAN_SIGNATURE_FRESHNESS_SIGNAL_ID,
  moduleKey: 'hiring',
  kind: 'freshness',
  source: 'getAssetScanSignatureFreshnessSignal',
  label: LABEL,
} as const

export const getAssetScanSignatureFreshnessSignal = async (): Promise<ReliabilitySignal> => {
  // Flag apagado: el único escáner activo es `structural`, que no usa firmas.
  // No hay nada que envejecer, así que esto no es un hallazgo — es el estado
  // esperado y se reporta como tal en vez de ensuciar el panel.
  if (!isAssetMalwareScanEnabled()) {
    return {
      ...base,
      severity: 'ok',
      summary: 'Escáner de firmas apagado; sólo corre el escáner estructural, que no usa base de firmas.',
      observedAt: new Date().toISOString(),
      evidence: [{ kind: 'metric', label: 'flag', value: 'ASSET_MALWARE_SCAN_ENABLED=false' }],
    }
  }

  const endpoint = getAssetMalwareScanEndpoint()

  if (!endpoint) {
    // Misma condición que hace fail-closed a `scanAssetBytes`: el flag está
    // prendido y no hay a quién preguntarle. Toda subida gateada está siendo
    // bloqueada ahora mismo.
    return {
      ...base,
      severity: 'error',
      summary: 'Flag prendido sin ASSET_MALWARE_SCAN_ENDPOINT: toda subida gateada está bloqueada (fail-closed).',
      observedAt: new Date().toISOString(),
      evidence: [{ kind: 'metric', label: 'endpoint', value: 'missing' }],
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)

  try {
    const audience = getAssetMalwareScanAudience()
    const headers: Record<string, string> = {}

    if (audience) {
      // `import()` diferido igual que en el puerto de escaneo: no vale la pena
      // meter el SDK de auth al grafo de la página de operaciones.
      const { fetchGoogleIdTokenForAudience } = await import('@/lib/google-credentials')

      headers.authorization = `Bearer ${await fetchGoogleIdTokenForAudience(audience)}`
    }

    const response = await fetch(`${endpoint.replace(/\/+$/, '')}/health`, {
      method: 'GET',
      headers,
      signal: controller.signal,
      cache: 'no-store',
    })

    // El contenedor devuelve 503 cuando está degradado, así que un no-2xx sigue
    // trayendo cuerpo útil: se parsea igual antes de decidir.
    const payload = (await response.json().catch(() => null)) as ClamAvHealth | null

    if (!payload) {
      return {
        ...base,
        severity: 'unknown',
        summary: `El scanner respondió HTTP ${response.status} sin un cuerpo interpretable.`,
        observedAt: new Date().toISOString(),
        evidence: [{ kind: 'metric', label: 'http_status', value: String(response.status) }],
      }
    }

    const clamdUp = payload.clamd === 'up'
    const ageHours = typeof payload.signatureAgeHours === 'number' ? payload.signatureAgeHours : null

    const evidence = [
      { kind: 'metric' as const, label: 'clamd', value: clamdUp ? 'up' : 'down' },
      { kind: 'metric' as const, label: 'signature_age_hours', value: ageHours === null ? 'desconocida' : String(ageHours) },
      { kind: 'metric' as const, label: 'stale_after_hours', value: String(STALE_HOURS) },
      { kind: 'doc' as const, label: 'Runbook', value: 'docs/manual-de-uso/plataforma/operar-scanner-malware-assets.md' },
    ]

    if (!clamdUp) {
      return {
        ...base,
        severity: 'error',
        summary: 'clamd no responde: el scanner de firmas está caído y las subidas gateadas se bloquean.',
        observedAt: new Date().toISOString(),
        evidence,
      }
    }

    if (ageHours === null) {
      return {
        ...base,
        severity: 'error',
        summary: 'No hay base de firmas cargada: el scanner responde pero no puede reconocer nada.',
        observedAt: new Date().toISOString(),
        evidence,
      }
    }

    if (ageHours > STALE_HOURS) {
      const days = Math.floor(ageHours / 24)

      return {
        ...base,
        severity: 'error',
        summary: `Firmas de hace ${days} días: el scanner responde pero ya no reconoce nada nuevo (falsa confianza).`,
        observedAt: new Date().toISOString(),
        evidence,
      }
    }

    if (ageHours > WARNING_HOURS) {
      return {
        ...base,
        severity: 'warning',
        summary: `freshclam lleva ${Math.round(ageHours)} h sin actualizar (chequea cada 2 h): revisar los logs del contenedor.`,
        observedAt: new Date().toISOString(),
        evidence,
      }
    }

    return {
      ...base,
      severity: 'ok',
      summary: `Firmas actualizadas hace ${ageHours} h.`,
      observedAt: new Date().toISOString(),
      evidence,
    }
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError'

    captureWithDomain(error, 'hiring', { tags: { source: 'reliability_asset_scan_signature_freshness' } })

    // `unknown` y no `error`: que la página de operaciones no haya podido
    // preguntar no prueba que el scanner esté mal. Quien sí lo prueba es
    // `open_quarantine`, que se llenaría de veredictos `error` reales.
    return {
      ...base,
      severity: 'unknown',
      summary: aborted
        ? 'El scanner no respondió su health check a tiempo.'
        : 'No se pudo consultar la frescura de las firmas del scanner.',
      observedAt: null,
      evidence: [{ kind: 'metric', label: 'error', value: aborted ? 'health_timeout' : 'health_unreachable' }],
    }
  } finally {
    clearTimeout(timeout)
  }
}
