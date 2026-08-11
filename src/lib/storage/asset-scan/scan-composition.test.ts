import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { scanAssetBytes } from './index'

// TASK-1378 — El servicio real está detrás de IAM en Cloud Run, así que la
// composición pide un ID token OIDC antes de mandar los bytes. Acá se stubea la
// credencial, no el veredicto: lo que se sigue ejercitando es la composición.
const fetchIdToken = vi.hoisted(() => vi.fn(async () => 'test-id-token'))

vi.mock('@/lib/google-credentials', () => ({
  fetchGoogleIdTokenForAudience: fetchIdToken,
}))

const pdf = Buffer.from('%PDF-1.7\ncurriculum\n%%EOF', 'latin1')
const windowsExecutable = Buffer.from([0x4d, 0x5a, 0x90, 0x00])

const input = (bytes: Buffer) => ({ bytes, declaredMimeType: 'application/pdf', fileName: 'cv.pdf' })

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } })

beforeEach(() => {
  delete process.env.ASSET_MALWARE_SCAN_ENABLED
  delete process.env.ASSET_MALWARE_SCAN_ENDPOINT
  fetchIdToken.mockReset()
  fetchIdToken.mockResolvedValue('test-id-token')
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.ASSET_MALWARE_SCAN_ENABLED
  delete process.env.ASSET_MALWARE_SCAN_ENDPOINT
})

describe('scanAssetBytes', () => {
  describe('con el flag apagado (default en todos los runtimes)', () => {
    it('corre sólo el scanner estructural y no toca la red', async () => {
      const fetchSpy = vi.fn()

      vi.stubGlobal('fetch', fetchSpy)

      const result = await scanAssetBytes(input(pdf))

      expect(result.verdict).toBe('clean')
      expect(result.scanner).toBe('structural')
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('igual bloquea un binario disfrazado: el structural no depende de infra', async () => {
      const result = await scanAssetBytes(input(windowsExecutable))

      expect(result.verdict).toBe('suspicious')
    })
  })

  describe('con el flag prendido', () => {
    beforeEach(() => {
      process.env.ASSET_MALWARE_SCAN_ENABLED = 'true'
      process.env.ASSET_MALWARE_SCAN_ENDPOINT = 'https://clamav.internal'
    })

    it('compone ambos scanners y reporta la identidad de los dos', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ status: 'ok' })))

      const result = await scanAssetBytes(input(pdf))

      expect(result.verdict).toBe('clean')
      expect(result.scanner).toBe('structural+clamav-http')
    })

    it('el peor veredicto gana: clamav infected sobre structural clean', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ status: 'found', signature: 'X' })))

      const result = await scanAssetBytes(input(pdf))

      expect(result.verdict).toBe('infected')
    })

    it('un clamav clean NO revierte un structural suspicious', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ status: 'ok' })))

      const result = await scanAssetBytes(input(windowsExecutable))

      expect(result.verdict).toBe('suspicious')
    })

    it('acumula los findings de ambos scanners', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ status: 'found', signature: 'X' })))

      const result = await scanAssetBytes(input(windowsExecutable))

      const codes = result.findings.map(finding => finding.code)

      expect(codes).toContain('hostile_magic_bytes')
      expect(codes).toContain('malware_signature_match')
    })

    it('fail-closed ante mala configuración: flag prendido sin endpoint es error, no "sin antivirus"', async () => {
      delete process.env.ASSET_MALWARE_SCAN_ENDPOINT

      const result = await scanAssetBytes(input(pdf))

      expect(result.verdict).toBe('error')
      expect(result.findings.map(finding => finding.code)).toContain('scanner_misconfigured')
    })

    // TASK-1378 — El modo de falla más probable en producción no es que ClamAV
    // se caiga: es que el portal pierda permiso de invocarlo (SA sin
    // roles/run.invoker, WIF mal configurado tras una rotación).
    it('fail-closed ante credencial rota: sin token es error, no clean', async () => {
      fetchIdToken.mockRejectedValue(new Error('WIF not configured'))

      const fetchSpy = vi.fn(async () => jsonResponse({ status: 'ok' }))

      vi.stubGlobal('fetch', fetchSpy)

      const result = await scanAssetBytes(input(pdf))

      expect(result.verdict).toBe('error')
      expect(result.findings.map(finding => finding.code)).toContain('scanner_auth_failed')
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('pide el token con la audiencia derivada del endpoint (origin, sin path)', async () => {
      process.env.ASSET_MALWARE_SCAN_ENDPOINT = 'https://clamav-abc.us-east4.run.app/'
      vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ status: 'ok' })))

      await scanAssetBytes(input(pdf))

      expect(fetchIdToken).toHaveBeenCalledWith('https://clamav-abc.us-east4.run.app')
    })
  })

  // TASK-1378 — Dev local puede correr ClamAV en http://localhost sin IAM. Ahí
  // no hay Cloud Run que valide audiencia y pedir un token sólo rompería.
  describe('endpoint http local (dev, sin IAM)', () => {
    it('no pide token ni manda Authorization', async () => {
      process.env.ASSET_MALWARE_SCAN_ENABLED = 'true'
      process.env.ASSET_MALWARE_SCAN_ENDPOINT = 'http://localhost:8080'

      const fetchSpy = vi.fn(async () => jsonResponse({ status: 'ok' }))

      vi.stubGlobal('fetch', fetchSpy)

      const result = await scanAssetBytes(input(pdf))

      expect(result.verdict).toBe('clean')
      expect(fetchIdToken).not.toHaveBeenCalled()
    })
  })
})

/**
 * TASK-1378 — El SDK de auth no puede volver al grafo estático.
 *
 * Regresión real: importar `@/lib/google-credentials` de forma estática acá metía
 * `google-auth-library` en el grafo de TODO archivo que toca el path de uploads.
 * En CI eso empujó la memoria del runner hasta matarlo en un render de react-pdf
 * (run 31492463069) — con el step Test muriendo sin imprimir resumen, que es el
 * peor síntoma posible: no dice qué falló.
 *
 * Con el flag OFF (default en todos los runtimes) no hay razón para pagar ese
 * costo, así que la resolución del token vive detrás de un `import()` diferido.
 */
describe('presupuesto del grafo de módulos', () => {
  it('no importa el SDK de credenciales de forma estática', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')

    const source = readFileSync(resolve(process.cwd(), 'src/lib/storage/asset-scan/index.ts'), 'utf8')

    // El needle se compone en runtime a propósito: escribir el patrón perseguido
    // como literal haría que este archivo se delate a sí mismo ante un grep.
    const staticImport = new RegExp(`^\\s*import\\s[^\\n]*from\\s+['"]@/lib/${'google'}-credentials['"]`, 'm')

    expect(source).not.toMatch(staticImport)
    expect(source).toContain('await import(')
  })
})
