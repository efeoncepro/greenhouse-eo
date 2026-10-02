/** Synthetic local report proof, never published or sent. */
import { mkdir, writeFile } from 'node:fs/promises'

import { SAMPLE_PUBLIC_REPORT } from '../../src/components/growth/ai-visibility/report-artifact/fixtures'
import { modelFromPublicReport } from '../../src/components/growth/ai-visibility/report-artifact/model'
import { renderAiVisibilityReportPdf } from '../../src/components/growth/ai-visibility/report-artifact/pdf/render-ai-visibility-report-pdf'

async function main() {
  const report = structuredClone(SAMPLE_PUBLIC_REPORT)

  report.provenance.providersRequested = ['openai', 'anthropic', 'perplexity', 'gemini', 'google_ai_overview']
  report.provenance.providersResponded = ['openai', 'anthropic', 'perplexity', 'gemini']

  const buffer = await renderAiVisibilityReportPdf({
    model: modelFromPublicReport(report, 'attachment'),
    header: {
      organizationName: 'Prueba local · México',
      reportDate: '28 sep 2026',
      periodLabel: 'Verificación de cobertura parcial'
    }
  })

  await mkdir('.captures/task-1863-report-proof', { recursive: true })
  await writeFile('.captures/task-1863-report-proof/report.pdf', buffer)
  console.log(
    JSON.stringify({ synthetic: true, path: '.captures/task-1863-report-proof/report.pdf', bytes: buffer.length })
  )
}

main().catch(() => {
  console.error('report_proof_failed')
  process.exitCode = 1
})
