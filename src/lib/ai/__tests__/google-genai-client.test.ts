import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const constructed: Array<{ apiVersion?: string; vertexai?: boolean }> = []

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor(options: { apiVersion?: string; vertexai?: boolean }) {
      constructed.push(options)
    }
  }
}))

vi.mock('@/lib/google-credentials', () => ({
  getGoogleProjectId: () => 'efeonce-group',
  getGoogleAuthOptions: () => ({})
}))

vi.mock('@/config/nexa-models', () => ({
  resolveNexaModel: () => 'gemini-2.5-flash'
}))

describe('getGoogleGenAIClient — versión de API', () => {
  it('usa v1 por defecto, crea una instancia por versión y reutiliza la de cada una', async () => {
    const { getGoogleGenAIClient } = await import('../google-genai')

    const stable = await getGoogleGenAIClient()
    const stableAgain = await getGoogleGenAIClient({ apiVersion: 'v1' })
    const beta = await getGoogleGenAIClient({ apiVersion: 'v1beta1' })
    const betaAgain = await getGoogleGenAIClient({ apiVersion: 'v1beta1' })

    expect(stable).toBe(stableAgain)
    expect(beta).toBe(betaAgain)
    expect(beta).not.toBe(stable)
    expect(constructed.map(options => options.apiVersion)).toEqual(['v1', 'v1beta1'])
    expect(constructed.every(options => options.vertexai)).toBe(true)
  })
})
