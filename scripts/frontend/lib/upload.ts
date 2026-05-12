/**
 * GCS upload helper (opt-in via --upload=<bucket>).
 *
 * Implementación: delega a `gcloud storage cp` subprocess (zero new
 * deps — el repo ya tiene gcloud autenticado vía ADC para muchos otros
 * scripts).
 *
 * Estrategia:
 * - Upload del directorio entero del run (recursive)
 * - Genera signed URL del manifest.json (validez 7 días default)
 * - NO sube .auth/ ni audit.jsonl (privacidad)
 *
 * Por qué no @google-cloud/storage SDK:
 * - Evitamos agregar dep nueva
 * - gcloud CLI ya está autenticada localmente
 * - subprocess es boring tech, robusto contra changes de SDK
 *
 * Bucket convencional: `gs://greenhouse-frontend-captures-{env}/` (dev pueden
 * usar su propio bucket personal pasando `--upload=<bucket-name>`).
 */

import { spawnSync } from 'node:child_process'
import { basename } from 'node:path'

export interface UploadResult {
  bucketPath: string
  signedUrl: string | null
  warning?: string
}

const isGcloudAvailable = (): boolean => {
  const result = spawnSync('which', ['gcloud'], { encoding: 'utf8' })

  return result.status === 0 && Boolean(result.stdout?.trim())
}

export const uploadCaptureToGcs = (
  localDir: string,
  bucketName: string
): UploadResult => {
  if (!isGcloudAvailable()) {
    return {
      bucketPath: '',
      signedUrl: null,
      warning: 'gcloud CLI no disponible — upload saltado. Captura local intacta.'
    }
  }

  const runName = basename(localDir)
  const bucketPath = `gs://${bucketName}/${runName}/`

  // Recursive copy. NO incluye .auth (gitignored fuera de this dir).
  const upload = spawnSync(
    'gcloud',
    ['storage', 'cp', '--recursive', '--quiet', `${localDir}/`, bucketPath],
    { encoding: 'utf8' }
  )

  if (upload.status !== 0) {
    return {
      bucketPath,
      signedUrl: null,
      warning: `gcloud storage cp falló: ${upload.stderr?.slice(0, 300)}`
    }
  }

  // Signed URL for manifest.json (operator-facing entry point)
  const manifestPath = `${bucketPath}manifest.json`

  const signed = spawnSync(
    'gcloud',
    ['storage', 'sign-url', manifestPath, '--duration=7d', '--format=value(signed_url)'],
    { encoding: 'utf8' }
  )

  if (signed.status !== 0) {
    return {
      bucketPath,
      signedUrl: null,
      warning: `Upload OK, signed URL falló: ${signed.stderr?.slice(0, 200)}`
    }
  }

  return {
    bucketPath,
    signedUrl: signed.stdout?.trim() || null
  }
}
