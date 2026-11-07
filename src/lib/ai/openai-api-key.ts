import 'server-only'

import { resolveSecret, type SecretResolution } from '@/lib/secrets/secret-manager'

import type { EnvSource } from '@/types/env-source'

// Resolución canónica de la API key de OpenAI, compartida por openai.ts (texto) y
// openai-image.ts (imagen). Sin perfil usa la clave canónica de siempre
// (OPENAI_API_KEY / OPENAI_API_KEY_SECRET_REF → greenhouse-openai-api-key).
//
// Con OPENAI_API_KEY_PROFILE=<perfil> usa un secreto ALTERNO
// greenhouse-openai-api-key-<perfil> (p. ej. `personal`, con crédito propio) sin
// tocar la canónica. Pensado para CLIs locales; los runtimes no lo declaran.
// Si el perfil pedido no resuelve, falla: NUNCA cae en silencio a la canónica,
// porque eso gastaría el crédito equivocado.

export const OPENAI_API_KEY_PROFILE_ENV = 'OPENAI_API_KEY_PROFILE'
export const OPENAI_API_KEY_DEFAULT_PROFILE = 'default'

const CANONICAL_SECRET_ID = 'greenhouse-openai-api-key'
const PROFILE_PATTERN = /^[a-z0-9][a-z0-9-]{0,30}$/

export const openAIApiKeySecretIdForProfile = (profile: string) =>
  profile === OPENAI_API_KEY_DEFAULT_PROFILE ? CANONICAL_SECRET_ID : `${CANONICAL_SECRET_ID}-${profile}`

export const readOpenAIApiKeyProfile = (env: EnvSource = process.env): string => {
  const raw = env[OPENAI_API_KEY_PROFILE_ENV]?.trim().toLowerCase()

  if (!raw) return OPENAI_API_KEY_DEFAULT_PROFILE

  if (!PROFILE_PATTERN.test(raw)) {
    throw new Error(
      `${OPENAI_API_KEY_PROFILE_ENV}="${raw}" no es válido: usa minúsculas, números y guiones (p. ej. "personal").`
    )
  }

  return raw
}

export type OpenAIApiKeyResolution = SecretResolution & { value: string; profile: string }

export const resolveOpenAIApiKeyForProfile = async (
  env: EnvSource = process.env
): Promise<SecretResolution & { profile: string }> => {
  const profile = readOpenAIApiKeyProfile(env)

  if (profile === OPENAI_API_KEY_DEFAULT_PROFILE) {
    return { ...(await resolveSecret({ envVarName: 'OPENAI_API_KEY', env })), profile }
  }

  // Env sintético: conserva el proyecto GCP para normalizar la ref, pero oculta la
  // clave canónica cruda para que no gane por precedencia sobre el perfil pedido.
  const profileEnv: EnvSource = {
    ...env,
    OPENAI_API_KEY: undefined,
    OPENAI_API_KEY_SECRET_REF: openAIApiKeySecretIdForProfile(profile)
  }

  return { ...(await resolveSecret({ envVarName: 'OPENAI_API_KEY', env: profileEnv })), profile }
}

export const resolveOpenAIApiKey = async (
  env: EnvSource = process.env
): Promise<OpenAIApiKeyResolution> => {
  const resolution = await resolveOpenAIApiKeyForProfile(env)

  if (!resolution.value) {
    if (resolution.profile !== OPENAI_API_KEY_DEFAULT_PROFILE) {
      throw new Error(
        `La clave OpenAI del perfil "${resolution.profile}" no está disponible: revisa que exista el secreto ` +
          `${openAIApiKeySecretIdForProfile(resolution.profile)} y tu acceso a él. No se usó la clave canónica.`
      )
    }

    throw new Error(
      'OpenAI no está configurado. Define OPENAI_API_KEY o OPENAI_API_KEY_SECRET_REF (greenhouse-openai-api-key).'
    )
  }

  return { ...resolution, value: resolution.value }
}
