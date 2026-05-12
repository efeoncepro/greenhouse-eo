import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * TASK-863 V1.5.2 — Anti-regression invariant.
 *
 * Cada transición fuera del estado inicial `rendered` debe invocar
 * `regenerateDocumentPdfForStatus(...)` para mantener el invariante
 * "PDF persistido refleja documentStatus actual de DB".
 *
 * El bug class detectado pre-V1.5.2: las transitions in_review / approved /
 * voided / rejected / superseded NO regeneraban el PDF; solo issued y
 * signed_or_ratified lo hacían. Operador descargaba el doc aprobado pero
 * lo veía como "Borrador HR" + watermark "PROYECTO".
 *
 * Defense-in-depth: si un agente futuro agrega una transition nueva al
 * state machine y olvida llamar al helper, este test rompe build.
 */
describe('document-store transition regen invariant — TASK-863 V1.5.2', () => {
  const storeSource = readFileSync(
    resolve(__dirname, 'document-store.ts'),
    'utf8'
  )

  /**
   * Set canónico de transitions que regeneran PDF.
   * Excluye `rendered` (estado inicial al crear el draft via
   * `storeSystemGeneratedPrivateAsset` con `documentStatusAtRender: 'rendered'`).
   */
  const REGEN_REQUIRED_STATUSES = [
    'in_review',
    'approved',
    'issued',
    'signed_or_ratified',
    'voided',
    'rejected',
    'superseded'
  ] as const

  it.each(REGEN_REQUIRED_STATUSES)(
    'transition to %s invokes regenerateDocumentPdfForStatus',
    status => {
      // Tolera espacios + line breaks + arguments arbitrarios entre el helper
      // call y el status literal. Lo único que importa es que el literal del
      // status aparezca como argumento del helper.
      const pattern = new RegExp(
        `regenerateDocumentPdfForStatus\\s*\\(\\s*client[^)]*?'${status}'`,
        's'
      )

      expect(
        storeSource,
        `Transition to '${status}' must invoke regenerateDocumentPdfForStatus(client, document, '${status}', actorUserId).` +
          ` Without it, the PDF asset stays baked-in with the previous status and operators see the wrong badge/watermark.`
      ).toMatch(pattern)
    }
  )

  it('initial draft creation persists metadata.documentStatusAtRender = rendered', () => {
    // El draft inicial NO pasa por regenerateDocumentPdfForStatus (es la primera
    // creación, no una transición). Pero igual debe persistir la metadata key
    // canónica para que el reliability signal detecte drift correctamente.
    expect(storeSource).toMatch(/documentStatusAtRender:\s*'rendered'/)
  })

  it('every SET document_status statement has a corresponding regen call', () => {
    // Defense-in-depth secundario: contar las SET document_status statements
    // (UPDATE clauses) y verificar que para cada status no-inicial hay al menos
    // un callsite del helper canónico.
    const setStatusMatches = storeSource.matchAll(
      /SET document_status\s*=\s*'([a-z_]+)'/g
    )

    const distinctStatuses = new Set<string>()

    for (const match of setStatusMatches) {
      const status = match[1]

      if (status && status !== 'rendered') {
        distinctStatuses.add(status)
      }
    }

    for (const status of distinctStatuses) {
      const helperPattern = new RegExp(
        `regenerateDocumentPdfForStatus\\s*\\(\\s*client[^)]*?'${status}'`,
        's'
      )

      expect(
        storeSource,
        `SET document_status = '${status}' has no matching regenerateDocumentPdfForStatus call. ` +
          `Either add the helper invocation or document why this transition should NOT regenerate.`
      ).toMatch(helperPattern)
    }
  })
})
