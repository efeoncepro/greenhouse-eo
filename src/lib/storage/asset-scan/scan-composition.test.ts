import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { scanAssetBytes } from './index'

const pdf = Buffer.from('%PDF-1.7\ncurriculum\n%%EOF', 'latin1')
const windowsExecutable = Buffer.from([0x4d, 0x5a, 0x90, 0x00])

const input = (bytes: Buffer) => ({ bytes, declaredMimeType: 'application/pdf', fileName: 'cv.pdf' })

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } })

beforeEach(() => {
  delete process.env.ASSET_MALWARE_SCAN_ENABLED
  delete process.env.ASSET_MALWARE_SCAN_ENDPOINT
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
  })
})
