import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'

import EmptyState from '@/components/greenhouse/EmptyState'
import { getOrganizationList } from '@/lib/account-360/organization-store'
import { GH_GROWTH_AEO_OPERATOR } from '@/lib/copy/growth'
import { can } from '@/lib/entitlements/runtime'
import { formatDate } from '@/lib/format/date'
import {
  readOperatorAeoRunActivity,
  readOperatorCrossOrgAeoScores
} from '@/lib/growth/ai-visibility/operator/command'
import { captureWithDomain } from '@/lib/observability/capture'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import AeoOperatorCockpitView, {
  type AeoCockpitKpisVM,
  type AeoCockpitRowVM
} from '@/views/greenhouse/growth/ai-visibility/operator/AeoOperatorCockpitView'
import type { AeoRunTargetVM } from '@/views/greenhouse/growth/ai-visibility/operator/AeoOperatorRunPicker'

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
    const [scores, activity] = await Promise.all([
      readOperatorCrossOrgAeoScores({ subject: tenant }),
      readOperatorAeoRunActivity({ subject: tenant })
    ])

    const rows: AeoCockpitRowVM[] = scores.map(row => ({
      organizationId: row.organizationId,
      organizationName: row.organizationName,
      organizationPublicId: row.organizationPublicId,
      logoUrl: row.logoUrl,
      tierLabel: tierLabel(row.aeoTier, row.assignmentStatus),
      latestScore: row.latestScore,
      scoreHistory: row.scoreHistory,
      planInProgress: row.planInProgress,
      planDone: row.planDone,
      planTracked: row.planTracked,
      lastRunLabel: row.latestRunAt ? formatDate(row.latestRunAt) : null
    }))

    const scored = rows.filter(r => r.latestScore !== null)

    const kpis: AeoCockpitKpisVM = {
      clientsWithAeo: rows.length,
      avgScore:
        scored.length > 0
          ? Math.round(scored.reduce((sum, r) => sum + (r.latestScore ?? 0), 0) / scored.length)
          : null,
      planInProgressTotal: rows.reduce((sum, r) => sum + r.planInProgress, 0),
      runsThisMonth: activity.runsThisMonth,
      salesRunsThisMonth: activity.salesRunsThisMonth
    }

    // Targets de cross-sell (Slice 5): orgs activas SIN módulo AEO — clientes (Expansión) y
    // prospectos HubSpot org-sincronizados (New Business, TASK-706). Degradación honesta: si el
    // listado falla, el cockpit igual renderiza (targets = []).
    const aeoIds = new Set(rows.map(r => r.organizationId))
    let targets: AeoRunTargetVM[] = []

    try {
      const orgList = await getOrganizationList({ page: 1, pageSize: 200 })

      targets = orgList.items
        .filter(org => org.active && !org.isOperatingEntity && !aeoIds.has(org.organizationId))
        .flatMap((org): AeoRunTargetVM[] => {
          if (org.organizationType === 'client' || org.organizationType === 'both') {
            return [
              {
                organizationId: org.organizationId,
                organizationName: org.organizationName,
                motion: 'expansion',
                subtitle: org.publicId,
                logoUrl: org.logoUrl
              }
            ]
          }

          // Prospectos: SOLO orgs HubSpot-sincronizadas CON sitio web — sin sitio el motor no puede
          // medir (grader_profile requiere website), y así se filtra la basura del CRM (feedback
          // del operador 2026-07-17).
          if (org.organizationType === 'other' && org.hubspotCompanyId && org.websiteUrl) {
            return [
              {
                organizationId: org.organizationId,
                organizationName: org.organizationName,
                motion: 'new_business',
                subtitle: org.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''),
                logoUrl: org.logoUrl
              }
            ]
          }

          return []
        })
    } catch (error) {
      captureWithDomain(error, 'growth', { tags: { source: 'aeo_operator_cockpit_targets' } })
    }

    return <AeoOperatorCockpitView rows={rows} kpis={kpis} targets={targets} />
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
