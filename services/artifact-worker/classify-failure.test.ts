import os from 'node:os'
import path from 'node:path'
import { mkdtemp, rm } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

import { composeArtifact } from '@/lib/artifact-composer'
import { insightsReportCatalog } from '@/lib/artifact-composer/catalogs/insights-report'
import { INSIGHT_NON_RETRYABLE_FAILURES } from '@/lib/efeonce-insights/render/contracts'

import { classifyFailure } from './classify-failure'

/**
 * El manifest de una salida encolada ANTES de TASK-1889: la portada v1 con sus slots de entonces.
 * El reintento compone este input sellado contra el catálogo actual, que ya no los declara.
 */
const v1SealedInput = {
  tenderId: 'insed-v1',
  slides: [
    {
      slideId: 'page-01',
      contentType: 'report-cover',
      slots: {
        editionId: 'EO-INS-000022 · v1',
        reportTitle: 'Informe de entrega',
        periodLabel: 'Agosto de 2026',
        versionLabel: 'v1',
        issuedLabel: '2026-09-03',
        pageFolio: '1'
      }
    }
  ]
}

describe('clasificación de fallos del artifact-worker', () => {
  it('un manifest sellado con plantillas que el catálogo ya no tiene se rechaza SIN reintento (TASK-1889)', async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), 'classify-v1-'))

    try {
      const error = await composeArtifact(insightsReportCatalog, v1SealedInput as never, outDir).then(
        () => null,
        (e: unknown) => e
      )

      expect(error).not.toBeNull()

      const { code, detail } = classifyFailure(error)

      expect(code).toBe('semantic_rejected')
      expect(detail).toMatch(/editionId/)
      expect(INSIGHT_NON_RETRYABLE_FAILURES.has(code as never)).toBe(true)
    } finally {
      await rm(outDir, { recursive: true, force: true })
    }
  })

  it('un error desconocido sigue siendo render_error (reintentable)', () => {
    expect(classifyFailure(new Error('ECONNRESET'))).toEqual({ code: 'render_error', detail: 'ECONNRESET' })
    expect(INSIGHT_NON_RETRYABLE_FAILURES.has('render_error')).toBe(false)
  })
})
