import { NextResponse } from 'next/server'

import { generateContractorRunExcel } from '@/lib/contractor-engagements/payables/generate-contractor-run-excel'
import { generateContractorRunPdf } from '@/lib/contractor-engagements/payables/generate-contractor-run-pdf'
import { buildContractorRunReport } from '@/lib/contractor-engagements/payables/run-report-reader'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-980 — descarga del reporte de período "Nómina de Contractors" (PDF | Excel).
 *
 * GET /api/finance/contractor-payables/run-report?periodYear=&periodMonth=&format=pdf|excel
 *
 * Read-only — gated por `finance.contractor_payable:read` (reuso, sin capability
 * nueva). El reader ancla por mes operativo (TASK-978/979) y lee montos verbatim.
 */
const isValidYear = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 2020 && value <= 2100

const isValidMonth = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 12

const slug = (label: string): string =>
  label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!can(tenant, 'finance.contractor_payable', 'read', 'tenant')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const periodYear = Number(url.searchParams.get('periodYear'))
  const periodMonth = Number(url.searchParams.get('periodMonth'))
  const format = url.searchParams.get('format') === 'excel' ? 'excel' : 'pdf'

  if (!isValidYear(periodYear)) {
    return NextResponse.json(
      { error: 'periodYear debe ser un año válido (2020-2100).', code: 'invalid_period_year' },
      { status: 422 }
    )
  }

  if (!isValidMonth(periodMonth)) {
    return NextResponse.json(
      { error: 'periodMonth debe ser un mes válido (1-12).', code: 'invalid_period_month' },
      { status: 422 }
    )
  }

  try {
    const report = await buildContractorRunReport({ periodYear, periodMonth })
    const filenameBase = `nomina-contractors-${slug(report.monthLabel)}`

    if (format === 'excel') {
      const buffer = await generateContractorRunExcel(report)

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filenameBase}.xlsx"`,
          'Cache-Control': 'no-store'
        }
      })
    }

    const buffer = await generateContractorRunPdf(report)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filenameBase}.pdf"`,
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'contractor_run_report_api', stage: format }
    })

    return NextResponse.json({ error: redactErrorForResponse(error) }, { status: 500 })
  }
}
