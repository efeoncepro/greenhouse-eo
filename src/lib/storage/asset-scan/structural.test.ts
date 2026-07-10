import { describe, expect, it } from 'vitest'

import { structuralAssetScanner } from './structural'

const scan = (bytes: Buffer, declaredMimeType = 'application/pdf', fileName = 'cv.pdf') =>
  structuralAssetScanner.scan({ bytes, declaredMimeType, fileName })

const pdf = (body = 'contenido del curriculum') => Buffer.from(`%PDF-1.7\n${body}\n%%EOF`, 'latin1')

const codes = (findings: { code: string }[]) => findings.map(finding => finding.code)

describe('structuralAssetScanner', () => {
  it('acepta un PDF real declarado como PDF', async () => {
    const result = await scan(pdf())

    expect(result.verdict).toBe('clean')
    expect(result.detectedMimeType).toBe('application/pdf')
    expect(result.findings).toEqual([])
  })

  describe('suplantación de tipo — el agujero que esta task cierra', () => {
    // El bug real: `validatePublicCareersCvUpload` sólo miraba `file.type`, que
    // lo declara el cliente. Cada uno de estos casos entraba al bucket privado y
    // quedaba `attached` antes de TASK-1362.
    const hostilePayloads: ReadonlyArray<[string, Buffer]> = [
      ['ejecutable Windows (MZ)', Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03])],
      ['ejecutable Linux (ELF)', Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02])],
      ['binario Mach-O', Buffer.from([0xcf, 0xfa, 0xed, 0xfe, 0x07])],
      ['zip / docx / jar', Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14])],
      ['archivo gzip', Buffer.from([0x1f, 0x8b, 0x08, 0x00])],
      ['script de shell', Buffer.from('#!/bin/sh\nrm -rf /\n')],
    ]

    it.each(hostilePayloads)('pone en cuarentena un %s declarado como application/pdf', async (_label, bytes) => {
      const result = await scan(bytes)

      expect(result.verdict).toBe('suspicious')
      expect(codes(result.findings)).toContain('hostile_magic_bytes')
    })

    it('pone en cuarentena un payload HTML/script disfrazado de PDF', async () => {
      const result = await scan(Buffer.from('<!DOCTYPE html><script>alert(1)</script>'))

      expect(result.verdict).toBe('suspicious')
      expect(codes(result.findings)).toContain('markup_payload')
    })

    it('pone en cuarentena una imagen PNG real declarada como PDF (mismatch)', async () => {
      const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('idat')])
      const result = await scan(png)

      expect(result.verdict).toBe('suspicious')
      expect(codes(result.findings)).toContain('mime_type_mismatch')
      expect(result.detectedMimeType).toBe('image/png')
    })

    it('pone en cuarentena bytes que no corresponden a ningún tipo permitido', async () => {
      const result = await scan(Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]))

      expect(result.verdict).toBe('suspicious')
      expect(codes(result.findings)).toContain('unrecognized_magic_bytes')
      expect(result.detectedMimeType).toBeNull()
    })

    it('rechaza un archivo vacío', async () => {
      const result = await scan(Buffer.alloc(0))

      expect(result.verdict).toBe('suspicious')
      expect(codes(result.findings)).toEqual(['empty_file'])
    })
  })

  describe('contenido activo en PDF', () => {
    it('bloquea un PDF con acción /Launch', async () => {
      const result = await scan(pdf('/Launch (/bin/sh)'))

      expect(result.verdict).toBe('suspicious')
      expect(codes(result.findings)).toContain('pdf_launch_action')
    })

    it('bloquea un PDF con archivo embebido', async () => {
      const result = await scan(pdf('/EmbeddedFile 12 0 R'))

      expect(result.verdict).toBe('suspicious')
      expect(codes(result.findings)).toContain('pdf_embedded_file')
    })

    it.each(['/RichMedia', '/XFA'])('bloquea un PDF con %s', async marker => {
      const result = await scan(pdf(`${marker} 3 0 R`))

      expect(result.verdict).toBe('suspicious')
    })

    it('NO bloquea /JavaScript ni /OpenAction: los emiten exportadores legítimos', async () => {
      // Rechazarlos rechazaría currículums reales exportados desde Word o LaTeX.
      // Se registran como advisory para que queden visibles en la auditoría.
      const result = await scan(pdf('/OpenAction 5 0 R /JavaScript (app.alert)'))

      expect(result.verdict).toBe('clean')
      expect(codes(result.findings).sort()).toEqual(['pdf_javascript', 'pdf_open_action'])
      expect(result.findings.every(finding => finding.severity === 'advisory')).toBe(true)
    })
  })

  describe('tipos permitidos declarados correctamente', () => {
    it('acepta un JPEG declarado como JPEG', async () => {
      const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('JFIF')])
      const result = await scan(jpeg, 'image/jpeg', 'foto.jpg')

      expect(result.verdict).toBe('clean')
      expect(result.detectedMimeType).toBe('image/jpeg')
    })

    it('acepta un WEBP real (RIFF + WEBP) y no confunde un WAV con él', async () => {
      const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBPVP8 ')])
      const wav = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WAVEfmt ')])

      expect((await scan(webp, 'image/webp', 'a.webp')).verdict).toBe('clean')

      const wavResult = await scan(wav, 'image/webp', 'a.webp')

      expect(wavResult.detectedMimeType).toBeNull()
      expect(wavResult.verdict).toBe('suspicious')
    })
  })

  it('nunca filtra contenido del archivo en el detalle del finding', async () => {
    const secret = 'RUT-12345678-9-DATO-SENSIBLE'
    const result = await scan(Buffer.from(`#!/bin/sh\necho ${secret}`))

    for (const finding of result.findings) {
      expect(finding.detail).not.toContain(secret)
    }
  })
})
