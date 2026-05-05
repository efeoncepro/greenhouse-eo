import 'server-only'

import { resolveSecret } from '@/lib/secrets/secret-manager'

import { PersonLegalProfileError } from './errors'

/**
 * TASK-784 — Pepper resolver para hash de normalizacion de PII.
 *
 * Pepper se carga desde GCP Secret Manager `greenhouse-pii-normalization-pepper`
 * (proyecto efeonce-group). En local fallback a `GREENHOUSE_PII_NORMALIZATION_PEPPER`
 * env var. La pepper NUNCA se imprime, loggea ni devuelve via API.
 *
 * El hash final se calcula como SHA-256(pepper || normalized_value). Sin pepper,
 * un hash de 8-9 digitos es trivialmente reversible. Con pepper de 32 bytes
 * random, el atacante necesita brute-force el espacio completo del pepper
 * incluso conociendo el formato del documento.
 */

const ENV_VAR_NAME = 'GREENHOUSE_PII_NORMALIZATION_PEPPER'

let cachedPepper: string | null = null
let cachedAt = 0

const PEPPER_CACHE_TTL_MS = 5 * 60_000

/**
 * Resuelve el pepper. Throws si no esta configurado — operacionalmente la
 * task no puede operar sin pepper. Falla rapido y ruidoso.
 */
export const resolvePiiNormalizationPepper = async (): Promise<string> => {
  const now = Date.now()

  if (cachedPepper && cachedAt + PEPPER_CACHE_TTL_MS > now) {
    return cachedPepper
  }

  const resolution = await resolveSecret({
    envVarName: ENV_VAR_NAME
  })

  if (resolution.source === 'unconfigured' || !resolution.value) {
    throw new PersonLegalProfileError(
      'Person legal profile pepper unavailable. Configure greenhouse-pii-normalization-pepper in GCP Secret Manager or set GREENHOUSE_PII_NORMALIZATION_PEPPER env var.',
      'pepper_unavailable',
      503
    )
  }

  // Validacion de longitud minima: 32 bytes hex (64 chars) — patron canonico
  // openssl rand -hex 32. Pepper mas corto degrada la seguridad del hash.
  if (resolution.value.length < 32) {
    throw new PersonLegalProfileError(
      'Person legal profile pepper too short (minimum 32 chars). Regenerate with `openssl rand -hex 32`.',
      'pepper_unavailable',
      503
    )
  }

  cachedPepper = resolution.value
  cachedAt = now

  return cachedPepper
}

/** Test-only helper para invalidar cache entre runs. */
export const __clearPepperCacheForTesting = () => {
  cachedPepper = null
  cachedAt = 0
}
