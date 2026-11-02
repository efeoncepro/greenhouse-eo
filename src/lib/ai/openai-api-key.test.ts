import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const resolveSecretMock = vi.fn()

vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecret: (...args: unknown[]) => resolveSecretMock(...args)
}))

import {
  openAIApiKeySecretIdForProfile,
  readOpenAIApiKeyProfile,
  resolveOpenAIApiKey
} from './openai-api-key'

describe('openai-api-key profiles', () => {
  beforeEach(() => {
    resolveSecretMock.mockReset()
  })

  it('sin perfil usa la clave canónica con el entorno tal cual', async () => {
    const env = ({ OPENAI_API_KEY_SECRET_REF: 'greenhouse-openai-api-key' })

    resolveSecretMock.mockResolvedValue({ source: 'secret_manager', value: 'canon' })

    const result = await resolveOpenAIApiKey(env)

    expect(result).toMatchObject({ value: 'canon', profile: 'default' })
    expect(resolveSecretMock).toHaveBeenCalledWith({ envVarName: 'OPENAI_API_KEY', env })
  })

  it('con perfil apunta al secreto alterno y oculta la clave canónica cruda', async () => {
    resolveSecretMock.mockResolvedValue({ source: 'secret_manager', value: 'personal-key' })

    const result = await resolveOpenAIApiKey(
      ({
        OPENAI_API_KEY_PROFILE: 'Personal',
        OPENAI_API_KEY: 'raw-canon',
        OPENAI_API_KEY_SECRET_REF: 'greenhouse-openai-api-key',
        GCP_PROJECT: 'efeonce-group'
      })
    )

    expect(result).toMatchObject({ value: 'personal-key', profile: 'personal' })

    const { env } = resolveSecretMock.mock.calls[0][0]

    expect(env.OPENAI_API_KEY).toBeUndefined()
    expect(env.OPENAI_API_KEY_SECRET_REF).toBe('greenhouse-openai-api-key-personal')
    expect(env.GCP_PROJECT).toBe('efeonce-group')
  })

  it('si el perfil no resuelve falla y no cae a la canónica', async () => {
    resolveSecretMock.mockResolvedValue({ source: 'unconfigured', value: null })

    await expect(resolveOpenAIApiKey(({ OPENAI_API_KEY_PROFILE: 'personal' }))).rejects.toThrow(
      /perfil "personal".*greenhouse-openai-api-key-personal/
    )
    expect(resolveSecretMock).toHaveBeenCalledTimes(1)
  })

  it('rechaza nombres de perfil inválidos y trata "default" como la canónica', () => {
    expect(() => readOpenAIApiKeyProfile(({ OPENAI_API_KEY_PROFILE: '../otro' }))).toThrow(/no es válido/)
    expect(readOpenAIApiKeyProfile(({ OPENAI_API_KEY_PROFILE: 'default' }))).toBe('default')
    expect(openAIApiKeySecretIdForProfile('default')).toBe('greenhouse-openai-api-key')
  })
})
