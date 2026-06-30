import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const resolveSecretMock = vi.fn()

vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecret: (...args: unknown[]) => resolveSecretMock(...args)
}))

import { isPerplexityConfigured, runPerplexitySearch, PERPLEXITY_DEFAULT_MODEL } from '@/lib/ai/perplexity'

// Fixture del shape REAL devuelto por api.perplexity.ai/chat/completions (Sonar),
// capturado en el smoke de TASK-1249: `choices[0].message.content` + `citations`
// como array de URLs string + `usage`. Si Perplexity cambia el shape, este test rompe.
const realPayloadFixture = {
  choices: [{ finish_reason: 'stop', index: 0, message: { role: 'assistant', content: 'Las mejores agencias en Chile son…' } }],
  citations: ['https://example-a.cl/articulo', 'https://example-b.com/ranking'],
  usage: { prompt_tokens: 1200, completion_tokens: 300, total_tokens: 1500 }
}

const mockFetch = (response: { ok: boolean; status: number; body: unknown }) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: response.ok,
      status: response.status,
      json: async () => response.body,
      text: async () => JSON.stringify(response.body)
    }))
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  resolveSecretMock.mockReset()
})

describe('lib/ai/perplexity — runPerplexitySearch parser', () => {
  it('parsea el payload real: texto + citations (array de URLs) + secretSource', async () => {
    resolveSecretMock.mockResolvedValue({ value: 'pplx-test', source: 'secret_manager' })
    mockFetch({ ok: true, status: 200, body: realPayloadFixture })

    const result = await runPerplexitySearch({ prompt: '¿Cuáles son las mejores agencias en Chile?' })

    expect(result.ok).toBe(true)
    expect(result.httpStatus).toBe(200)
    expect(result.model).toBe(PERPLEXITY_DEFAULT_MODEL)
    expect(result.text).toBe('Las mejores agencias en Chile son…')
    expect(result.citations).toEqual([
      { url: 'https://example-a.cl/articulo', title: null },
      { url: 'https://example-b.com/ranking', title: null }
    ])
    expect(result.secretSource).toBe('secret_manager')
  })

  it('parsea citations en forma objeto desde search_results (fallback)', async () => {
    resolveSecretMock.mockResolvedValue({ value: 'pplx-test', source: 'env' })
    mockFetch({
      ok: true,
      status: 200,
      body: {
        choices: [{ message: { content: 'respuesta' } }],
        search_results: [{ url: 'https://src.cl/x', title: 'Fuente X' }, { title: 'sin url' }]
      }
    })

    const result = await runPerplexitySearch({ prompt: 'p' })

    // Sólo entradas con url válida sobreviven; el resto se descarta.
    expect(result.citations).toEqual([{ url: 'https://src.cl/x', title: 'Fuente X' }])
  })

  it('degrada en HTTP no-ok sin lanzar (ok=false, citations vacías)', async () => {
    resolveSecretMock.mockResolvedValue({ value: 'pplx-test', source: 'secret_manager' })
    mockFetch({ ok: false, status: 401, body: { error: 'unauthorized' } })

    const result = await runPerplexitySearch({ prompt: 'p' })

    expect(result.ok).toBe(false)
    expect(result.httpStatus).toBe(401)
    expect(result.text).toBeNull()
    expect(result.citations).toEqual([])
  })

  it('lanza es-CL cuando no hay secret configurado', async () => {
    resolveSecretMock.mockResolvedValue({ value: null, source: 'none' })

    await expect(runPerplexitySearch({ prompt: 'p' })).rejects.toThrow(/Perplexity no está configurado/)
  })
})

describe('lib/ai/perplexity — isPerplexityConfigured', () => {
  it('true cuando el secret resuelve valor', async () => {
    resolveSecretMock.mockResolvedValue({ value: 'pplx-test', source: 'secret_manager' })
    expect(await isPerplexityConfigured()).toBe(true)
  })

  it('false cuando el secret no resuelve (y no propaga el throw)', async () => {
    resolveSecretMock.mockRejectedValue(new Error('boom'))
    expect(await isPerplexityConfigured()).toBe(false)
  })
})
