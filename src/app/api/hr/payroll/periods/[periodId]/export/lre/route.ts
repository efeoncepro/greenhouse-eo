import { NextResponse } from 'next/server'

import { assertHrEntitlement } from '@/lib/hr-core/shared'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { buildLreLibroArtifact } from '@/lib/payroll/compliance-exports/lre'
import { generateAndRegisterChileComplianceExport } from '@/lib/payroll/compliance-exports/store'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ periodId: string }> }) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    assertHrEntitlement({
      tenant,
      capability: 'hr.payroll.export_lre',
      action: 'export',
      scope: 'tenant'
    })

    const { periodId } = await params

    const { artifact } = await generateAndRegisterChileComplianceExport({
      periodId,
      kind: 'lre',
      generatedBy: tenant.userId,
      spaceId: tenant.spaceId ?? null,
      generate: buildLreLibroArtifact
    })

    return new NextResponse(artifact.text, {
      headers: {
        'Content-Type': artifact.contentType,
        'Content-Disposition': `attachment; filename="${artifact.filename}"`,
        'Cache-Control': 'private, no-store'
      }
    })
  } catch (error) {
    return toPayrollErrorResponse(error, 'Unable to generate LRE export.')
  }
}
