import { describe, expect, it } from 'vitest'

import type { CandidateDocumentFile, CandidateDocuments } from './types'
import { buildCandidateDocumentsViewModel } from './view-model'

const file = (overrides: Partial<CandidateDocumentFile> = {}): CandidateDocumentFile => ({
  assetId: 'asset-1',
  publicId: 'pub-1',
  kind: 'cv',
  fileName: 'cv.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 240_000,
  applicationId: 'happ-1',
  uploadedAt: '2026-08-12T10:00:00.000Z',
  status: 'available',
  scan: null,
  downloadUrl: '/api/assets/private/asset-1',
  ...overrides,
})

const documents = (overrides: Partial<CandidateDocuments> = {}): CandidateDocuments => ({
  candidateFacetId: 'cndf-1',
  identityProfileId: 'identity-1',
  files: [],
  links: [],
  identityDocuments: [],
  quarantinedCount: 0,
  ...overrides,
})

describe('buildCandidateDocumentsViewModel', () => {
  describe('el CV se abre — no se revela', () => {
    it('deriva el visor inline y la descarga desde la ruta estable del asset', () => {
      const vm = buildCandidateDocumentsViewModel(documents({ files: [file()] }))

      expect(vm.files[0]).toMatchObject({
        openHref: '/api/assets/private/asset-1?inline=1',
        downloadHref: '/api/assets/private/asset-1',
        status: 'available',
      })
    })

    it('un archivo legacy_unscanned SIGUE siendo legible', () => {
      const vm = buildCandidateDocumentsViewModel(
        documents({ files: [file({ status: 'legacy_unscanned' })] }),
      )

      expect(vm.files[0]!.openHref).toBe('/api/assets/private/asset-1?inline=1')
    })
  })

  describe('los cuatro estados NO se aplastan en uno', () => {
    it.each([
      ['quarantined', 'quarantined'],
      ['pending', 'pending'],
    ] as const)('%s pierde la acción pero conserva su estado propio', (_label, status) => {
      const vm = buildCandidateDocumentsViewModel(
        documents({ files: [file({ status, downloadUrl: null })] }),
      )

      expect(vm.files[0]).toMatchObject({ status, openHref: null, downloadHref: null })
    })

    it('la ausencia de CV es una fila con estado `missing`, no una sección vacía', () => {
      const vm = buildCandidateDocumentsViewModel(documents())

      // La sección NO desaparece: "no hay CV" es información que el reclutador
      // necesita ver, no un hueco del que deba deducirla.
      expect(vm.files).toHaveLength(1)
      expect(vm.files[0]).toMatchObject({ kind: 'cv', status: 'missing', openHref: null })
    })

    it('un CV en cuarentena NO genera además una fila `missing` (no son lo mismo)', () => {
      const vm = buildCandidateDocumentsViewModel(
        documents({ files: [file({ status: 'quarantined', downloadUrl: null })], quarantinedCount: 1 }),
      )

      expect(vm.files).toHaveLength(1)
      expect(vm.files[0]!.status).toBe('quarantined')
      expect(vm.quarantinedCount).toBe(1)
    })
  })

  describe('orden de las filas', () => {
    it('agrupa por tipo (CV antes que portafolio) y dentro del tipo por fecha descendente', () => {
      const vm = buildCandidateDocumentsViewModel(
        documents({
          files: [
            file({ assetId: 'a-portfolio', kind: 'portfolio_file', downloadUrl: '/api/assets/private/a-portfolio' }),
            file({ assetId: 'a-cv-viejo', uploadedAt: '2026-01-01T00:00:00.000Z' }),
            file({ assetId: 'a-cv-nuevo', uploadedAt: '2026-08-14T00:00:00.000Z' }),
          ],
        }),
      )

      expect(vm.files.map(row => row.rowKey)).toEqual(['a-cv-nuevo', 'a-cv-viejo', 'a-portfolio'])
    })

    it('ordena cuando PG entrega Date y no string (regresión: localeCompare is not a function)', () => {
      // El tipo dice `string | null`, pero el driver de PG entrega `Date` para las
      // columnas timestamp. El fixture de string pasaba el test mientras la página
      // reventaba en runtime — por eso el fixture acá es deliberadamente un Date.
      const vm = buildCandidateDocumentsViewModel(
        documents({
          files: [
            file({ assetId: 'a-viejo', uploadedAt: new Date('2026-01-01T00:00:00.000Z') as unknown as string }),
            file({ assetId: 'a-nuevo', uploadedAt: new Date('2026-08-14T00:00:00.000Z') as unknown as string }),
          ],
        }),
      )

      expect(vm.files.map(row => row.rowKey)).toEqual(['a-nuevo', 'a-viejo'])
      // Y cruza al Client Component como ISO serializable, no como Date.
      expect(vm.files[0]!.uploadedAt).toBe('2026-08-14T00:00:00.000Z')
    })

    it('tolera uploadedAt nulo sin romper el orden', () => {
      const vm = buildCandidateDocumentsViewModel(
        documents({
          files: [
            file({ assetId: 'a-sin-fecha', uploadedAt: null }),
            file({ assetId: 'a-con-fecha', uploadedAt: '2026-08-14T00:00:00.000Z' }),
          ],
        }),
      )

      expect(vm.files.map(row => row.rowKey)).toEqual(['a-con-fecha', 'a-sin-fecha'])
    })

    it('no oculta los CV de postulaciones anteriores: son evidencia del proceso', () => {
      const vm = buildCandidateDocumentsViewModel(
        documents({
          files: [
            file({ assetId: 'a-1', uploadedAt: '2026-01-01T00:00:00.000Z' }),
            file({ assetId: 'a-2', uploadedAt: '2026-08-14T00:00:00.000Z' }),
          ],
        }),
      )

      expect(vm.files).toHaveLength(2)
    })
  })

  describe('identidad', () => {
    it('propaga la máscara y NUNCA un valor completo', () => {
      const vm = buildCandidateDocumentsViewModel(
        documents({
          identityDocuments: [
            {
              documentId: 'doc-1',
              documentType: 'CL_RUT',
              countryCode: 'CL',
              displayMask: '12.345.•••-•',
              verificationStatus: 'verified',
              evidenceAssetId: null,
            },
          ],
        }),
      )

      expect(vm.identityDocuments[0]).toEqual({
        documentId: 'doc-1',
        documentType: 'CL_RUT',
        countryCode: 'CL',
        displayMask: '12.345.•••-•',
        verificationStatus: 'verified',
      })

      expect(JSON.stringify(vm)).not.toContain('valueFull')
    })

    it('sin documento capturado el arreglo queda vacío (estado normal pre-decisión)', () => {
      expect(buildCandidateDocumentsViewModel(documents()).identityDocuments).toEqual([])
    })
  })

  it('propaga los enlaces del candidato tal como los saneó el intake', () => {
    const vm = buildCandidateDocumentsViewModel(
      documents({
        links: [
          { kind: 'portfolio', url: 'https://behance.net/luisina' },
          { kind: 'linkedin', url: 'https://linkedin.com/in/luisina' },
        ],
      }),
    )

    expect(vm.links).toEqual([
      { kind: 'portfolio', url: 'https://behance.net/luisina' },
      { kind: 'linkedin', url: 'https://linkedin.com/in/luisina' },
    ])
  })
})
