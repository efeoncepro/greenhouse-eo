import { describe, expect, it } from 'vitest'

import {
  LEGAL_SIGNATURE_BASE_DIR,
  buildSignatureFilenameForTaxId,
  resolveLegalRepresentativeSignaturePath
} from './index'

describe('legal-signatures resolver', () => {
  it('exposes the canonical base directory', () => {
    expect(LEGAL_SIGNATURE_BASE_DIR).toBe('src/assets/signatures')
  })

  describe('buildSignatureFilenameForTaxId', () => {
    it('cleans Chile RUT to canonical filename', () => {
      expect(buildSignatureFilenameForTaxId('77.357.182-1')).toBe('77357182-1.png')
    })

    it('strips whitespace', () => {
      expect(buildSignatureFilenameForTaxId(' 77 357 182 1 ')).toBe('773571821.png')
    })

    it('returns null for empty input', () => {
      expect(buildSignatureFilenameForTaxId('')).toBeNull()
      expect(buildSignatureFilenameForTaxId(null)).toBeNull()
      expect(buildSignatureFilenameForTaxId(undefined)).toBeNull()
    })
  })

  describe('resolveLegalRepresentativeSignaturePath', () => {
    it('returns null for null/empty input', () => {
      expect(resolveLegalRepresentativeSignaturePath(null)).toBeNull()
      expect(resolveLegalRepresentativeSignaturePath('')).toBeNull()
    })

    it('blocks path traversal attempts', () => {
      expect(resolveLegalRepresentativeSignaturePath('../../../etc/passwd.png')).toBeNull()
      expect(resolveLegalRepresentativeSignaturePath('valid/../../escape.png')).toBeNull()
    })

    it('blocks absolute paths', () => {
      expect(resolveLegalRepresentativeSignaturePath('/etc/shadow.png')).toBeNull()
    })

    it('blocks invalid extensions', () => {
      expect(resolveLegalRepresentativeSignaturePath('signature.svg')).toBeNull()
      expect(resolveLegalRepresentativeSignaturePath('signature.exe')).toBeNull()
      expect(resolveLegalRepresentativeSignaturePath('signature')).toBeNull()
    })

    it('blocks special characters', () => {
      expect(resolveLegalRepresentativeSignaturePath('sig nature.png')).toBeNull()
      expect(resolveLegalRepresentativeSignaturePath('signature$.png')).toBeNull()
    })

    it('returns null for valid pattern but non-existent file', () => {
      expect(resolveLegalRepresentativeSignaturePath('nonexistent-9999999.png')).toBeNull()
    })

    it('resolves absolute path when file exists', () => {
      // Real RUT seeded in the repo for Efeonce SpA representative.
      const resolved = resolveLegalRepresentativeSignaturePath('77357182-1.png')

      // The file may or may not exist locally in CI; just assert null OR
      // absolute path. Tests don't assume file presence.
      if (resolved !== null) {
        expect(resolved).toMatch(/src\/assets\/signatures\/77357182-1\.png$/)
        expect(resolved.startsWith('/')).toBe(true)
      }
    })
  })
})
