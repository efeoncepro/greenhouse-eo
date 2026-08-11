import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// El signal resuelve credenciales igual que el puerto de escaneo; acá se stubea
// la credencial, no el veredicto.
const fetchIdToken = vi.hoisted(() => vi.fn(async () => 'test-id-token'))

vi.mock('@/lib/google-credentials', () => ({ fetchGoogleIdTokenForAudience: fetchIdToken }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

import { getAssetScanSignatureFreshnessSignal } from './asset-scan-signature-freshness'

const health = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } })

beforeEach(() => {
  process.env.ASSET_MALWARE_SCAN_ENABLED = 'true'
  process.env.ASSET_MALWARE_SCAN_ENDPOINT = 'https://clamav.internal'
  fetchIdToken.mockReset()
  fetchIdToken.mockResolvedValue('test-id-token')
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.ASSET_MALWARE_SCAN_ENABLED
  delete process.env.ASSET_MALWARE_SCAN_ENDPOINT
})

describe('getAssetScanSignatureFreshnessSignal', () => {
  it('ok cuando las firmas están frescas', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => health({ clamd: 'up', signatureAgeHours: 1.4 })))

    const signal = await getAssetScanSignatureFreshnessSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.summary).toContain('1.4')
  })

  // El caso que justifica el signal: el scanner responde, los veredictos salen
  // `clean`, y nadie se entera de que hace meses no reconoce nada nuevo.
  it('error cuando las firmas pasaron el umbral de vejez', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => health({ clamd: 'up', signatureAgeHours: 240 }, 503)))

    const signal = await getAssetScanSignatureFreshnessSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('falsa confianza')
  })

  it('warning cuando freshclam lleva más de un día sin actualizar', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => health({ clamd: 'up', signatureAgeHours: 30 })))

    const signal = await getAssetScanSignatureFreshnessSignal()

    expect(signal.severity).toBe('warning')
  })

  it('error cuando clamd no responde', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => health({ clamd: 'down', signatureAgeHours: 1 }, 503)))

    const signal = await getAssetScanSignatureFreshnessSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('caído')
  })

  it('error cuando no hay base de firmas cargada', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => health({ clamd: 'up', signatureAgeHours: null }, 503)))

    const signal = await getAssetScanSignatureFreshnessSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('no puede reconocer')
  })

  describe('sin llamar al servicio', () => {
    it('ok y explícito cuando el flag está apagado: no hay firmas que envejecer', async () => {
      delete process.env.ASSET_MALWARE_SCAN_ENABLED

      const fetchSpy = vi.fn()

      vi.stubGlobal('fetch', fetchSpy)

      const signal = await getAssetScanSignatureFreshnessSignal()

      expect(signal.severity).toBe('ok')
      expect(signal.summary).toContain('apagado')
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('error cuando el flag está prendido sin endpoint: todo upload está bloqueado', async () => {
      delete process.env.ASSET_MALWARE_SCAN_ENDPOINT

      const signal = await getAssetScanSignatureFreshnessSignal()

      expect(signal.severity).toBe('error')
      expect(signal.summary).toContain('fail-closed')
    })
  })

  // No poder preguntar NO prueba que el scanner esté mal. Quien prueba eso es
  // `open_quarantine`, que se llenaría de veredictos `error` reales.
  describe('degradación honesta', () => {
    it('unknown, no error, cuando el health check es inalcanzable', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => {
        throw new TypeError('fetch failed')
      }))

      const signal = await getAssetScanSignatureFreshnessSignal()

      expect(signal.severity).toBe('unknown')
      expect(signal.observedAt).toBeNull()
    })

    it('unknown cuando el cuerpo no se puede interpretar', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>502</html>', { status: 502 })))

      const signal = await getAssetScanSignatureFreshnessSignal()

      expect(signal.severity).toBe('unknown')
    })
  })

  it('presenta credencial OIDC cuando el endpoint es https', async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => health({ clamd: 'up', signatureAgeHours: 1 }))

    vi.stubGlobal('fetch', fetchSpy)
    await getAssetScanSignatureFreshnessSignal()

    const headers = fetchSpy.mock.calls[0]?.[1]?.headers as Record<string, string>

    expect(headers.authorization).toBe('Bearer test-id-token')
    expect(fetchIdToken).toHaveBeenCalledWith('https://clamav.internal')
  })
})
