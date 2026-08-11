import { afterEach, describe, expect, it, vi } from 'vitest'

import { createClamAvHttpScanner } from './clamav-http'

const scanner = createClamAvHttpScanner({ endpoint: 'https://clamav.internal/', timeoutMs: 50 })

const input = { bytes: Buffer.from('%PDF-1.7'), declaredMimeType: 'application/pdf', fileName: 'cv.pdf' }

const mockFetch = (implementation: typeof fetch) => {
  vi.stubGlobal('fetch', vi.fn(implementation))
}

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createClamAvHttpScanner', () => {
  it('emite clean cuando el servicio responde status ok', async () => {
    mockFetch(async () => jsonResponse({ status: 'ok' }))

    const result = await scanner.scan(input)

    expect(result.verdict).toBe('clean')
    expect(result.findings).toEqual([])
  })

  it('emite infected y conserva la firma cuando el servicio la reconoce', async () => {
    mockFetch(async () => jsonResponse({ status: 'found', signature: 'Eicar-Test-Signature' }))

    const result = await scanner.scan(input)

    expect(result.verdict).toBe('infected')
    expect(result.findings[0]?.code).toBe('malware_signature_match')
    expect(result.findings[0]?.detail).toContain('Eicar-Test-Signature')
  })

  it('normaliza el endpoint sin duplicar la barra', async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => jsonResponse({ status: 'ok' }))

    vi.stubGlobal('fetch', fetchSpy)
    await scanner.scan(input)

    expect(fetchSpy.mock.calls[0]?.[0]).toBe('https://clamav.internal/scan')
  })

  describe('fail-closed: un scanner degradado nunca deja pasar bytes', () => {
    it('emite error cuando el servicio responde 5xx', async () => {
      mockFetch(async () => jsonResponse({}, 503))

      const result = await scanner.scan(input)

      expect(result.verdict).toBe('error')
      expect(result.findings[0]?.code).toBe('scanner_http_error')
    })

    it('emite error cuando el servicio es inalcanzable', async () => {
      mockFetch(async () => {
        throw new TypeError('fetch failed')
      })

      const result = await scanner.scan(input)

      expect(result.verdict).toBe('error')
      expect(result.findings[0]?.code).toBe('scanner_unreachable')
    })

    it('emite error cuando el servicio devuelve un estado que no se reconoce', async () => {
      mockFetch(async () => jsonResponse({ status: 'maybe' }))

      const result = await scanner.scan(input)

      expect(result.verdict).toBe('error')
      expect(result.findings[0]?.code).toBe('scanner_unrecognized_response')
    })

    it('emite scanner_timeout cuando el servicio no responde a tiempo', async () => {
      mockFetch(
        async (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              const abortError = new Error('aborted')

              abortError.name = 'AbortError'
              reject(abortError)
            })
          }),
      )

      const result = await scanner.scan(input)

      expect(result.verdict).toBe('error')
      expect(result.findings[0]?.code).toBe('scanner_timeout')
    })
  })

  it('todos los findings del adapter son bloqueantes', async () => {
    mockFetch(async () => jsonResponse({}, 500))

    const result = await scanner.scan(input)

    expect(result.findings.every(finding => finding.severity === 'blocking')).toBe(true)
  })

  // TASK-1378 — El servicio real corre en Cloud Run con --no-allow-unauthenticated.
  describe('autenticación OIDC contra Cloud Run', () => {
    it('manda Authorization: Bearer cuando hay proveedor de token', async () => {
      const fetchSpy = vi.fn<typeof fetch>(async () => jsonResponse({ status: 'ok' }))

      vi.stubGlobal('fetch', fetchSpy)

      const authenticated = createClamAvHttpScanner({
        endpoint: 'https://clamav.internal/',
        timeoutMs: 50,
        getAuthToken: async () => 'id-token-123',
      })

      await authenticated.scan(input)

      const headers = fetchSpy.mock.calls[0]?.[1]?.headers as Record<string, string>

      expect(headers.authorization).toBe('Bearer id-token-123')
    })

    it('no manda Authorization cuando no hay proveedor (dev local sin IAM)', async () => {
      const fetchSpy = vi.fn<typeof fetch>(async () => jsonResponse({ status: 'ok' }))

      vi.stubGlobal('fetch', fetchSpy)
      await scanner.scan(input)

      const headers = fetchSpy.mock.calls[0]?.[1]?.headers as Record<string, string>

      expect(headers.authorization).toBeUndefined()
    })

    it('fail-closed: si no se puede obtener el token emite error, nunca clean', async () => {
      const fetchSpy = vi.fn<typeof fetch>(async () => jsonResponse({ status: 'ok' }))

      vi.stubGlobal('fetch', fetchSpy)

      const broken = createClamAvHttpScanner({
        endpoint: 'https://clamav.internal/',
        timeoutMs: 50,
        getAuthToken: async () => {
          throw new Error('WIF not configured')
        },
      })

      const result = await broken.scan(input)

      expect(result.verdict).toBe('error')
      expect(result.findings[0]?.code).toBe('scanner_auth_failed')
      expect(result.findings[0]?.severity).toBe('blocking')

      // Y no llegó a llamar al servicio: sin credencial no se mandan los bytes.
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('no filtra el detalle técnico del error de credencial', async () => {
      const broken = createClamAvHttpScanner({
        endpoint: 'https://clamav.internal/',
        timeoutMs: 50,
        getAuthToken: async () => {
          throw new Error('service account greenhouse-portal@ lacks roles/run.invoker')
        },
      })

      const result = await broken.scan(input)

      expect(result.findings[0]?.detail).not.toContain('greenhouse-portal@')
      expect(result.findings[0]?.detail).not.toContain('run.invoker')
    })
  })
})
