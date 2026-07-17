import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'

import EmptyState from '@/components/greenhouse/EmptyState'
import { GH_GROWTH_AEO_OPERATOR } from '@/lib/copy/growth'
import { can } from '@/lib/entitlements/runtime'
import { formatDate } from '@/lib/format/date'
import { readOperatorCrossOrgAeoScores } from '@/lib/growth/ai-visibility/operator/command'
import { captureWithDomain } from '@/lib/observability/capture'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import AeoOperatorCockpitView, {
  type AeoCockpitRowVM
} from '@/views/greenhouse/growth/ai-visibility/operator/AeoOperatorCockpitView'

/**
 * TASK-1276 — Cockpit operador del programa AEO (nodo S8, EPIC-020). Ruta `internal` en la sección
 * Growth del nav (NO /admin). Guard de doble puerta: viewCode `gestion.growth_aeo` + capability
 * `growth.ai_visibility.report.read_operator` (TASK-1287). Data = agregado cross-org del reader
 * gobernado (honest degradation: score null ≠ 0). Redirect defensivo para tenants cliente.
 */

export const metadata: Metadata = { title: 'AEO — Cockpit operador | Growth | Greenhouse' }
export const dynamic = 'force-dynamic'

const O = GH_GROWTH_AEO_OPERATOR
const VIEW_CODE = 'gestion.growth_aeo'

const tierLabel = (aeoTier: string | null, assignmentStatus: string): string => {
  if (aeoTier === 'contracted') return O.tier.contracted
  if (aeoTier === 'pilot') return O.tier.pilot
  if (aeoTier === 'trial') return O.tier.trial

  // Fallback conservador (espejo de resolveAeoEntitlement): status pilot → Piloto; sino Trial.
  return assignmentStatus === 'pilot' ? O.tier.pilot : O.tier.trial
}

export default async function AeoOperatorCockpitPage() {
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')

  if (tenant.tenantType === 'client') redirect('/401')

  const hasAccess =
    hasAuthorizedViewCode({
      tenant,
      viewCode: VIEW_CODE,
      fallback: tenant.routeGroups.includes('internal') || tenant.routeGroups.includes('admin')
    }) && can(tenant, 'growth.ai_visibility.report.read_operator', 'read', 'tenant')

  if (!hasAccess) redirect('/401')

  try {
    const scores = await readOperatorCrossOrgAeoScores({ subject: tenant })

    const rows: AeoCockpitRowVM[] = scores.map(row => ({
      organizationId: row.organizationId,
      organizationName: row.organizationName,
      tierLabel: tierLabel(row.aeoTier, row.assignmentStatus),
      latestScore: row.latestScore,
      lastRunLabel: row.latestRunAt ? formatDate(row.latestRunAt) : null
    }))

    return <AeoOperatorCockpitView rows={rows} />
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'aeo_operator_cockpit_page' } })

    return (
      <Box sx={{ p: 6, maxWidth: 720, mx: 'auto' }}>
        <EmptyState
          icon='tabler-alert-triangle'
          title={O.cockpit.errorTitle}
          description={O.cockpit.errorBody}
          action={
            <Button variant='tonal' href='/growth/aeo'>
              {O.cockpit.retry}
            </Button>
          }
        />
      </Box>
    )
  }
}
