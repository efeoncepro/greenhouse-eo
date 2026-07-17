import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'

import EmptyState from '@/components/greenhouse/EmptyState'
import { modelFromClientReport } from '@/components/growth/ai-visibility/report-artifact/model'
import { getOrganizationDetail } from '@/lib/account-360/organization-store'
import { GH_GROWTH_AEO_OPERATOR } from '@/lib/copy/growth'
import { can } from '@/lib/entitlements/runtime'
import { formatDate } from '@/lib/format/date'
import { resolveAeoEntitlement, type AeoEntitlement } from '@/lib/growth/ai-visibility/entitlement'
import { isOperatorSendEnabled } from '@/lib/growth/ai-visibility/flags'
import { getLatestReportTokenForRun } from '@/lib/growth/ai-visibility/hubspot/report-link'
import {
  OperatorGraderReportError,
  readOperatorScopedAeoReport
} from '@/lib/growth/ai-visibility/operator/command'
import { readRecommendationStatuses } from '@/lib/growth/ai-visibility/recommendation-status'
import { getLatestClientGraderRun } from '@/lib/growth/ai-visibility/store'
import { captureWithDomain } from '@/lib/observability/capture'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import AeoOperatorDetailView, {
  type AeoOperatorSendConfig
} from '@/views/greenhouse/growth/ai-visibility/operator/AeoOperatorDetailView'
import type { PlanStatusVM } from '@/views/greenhouse/growth/ai-visibility/plan/PlanStatusSection'

/**
 * TASK-1276 — Detalle operador por-cliente del programa AEO (nodo S9, EPIC-020).
 *
 * Guard de doble puerta: viewCode `gestion.growth_aeo` (surface visible, seed TASK-1276) +
 * capability `growth.ai_visibility.report.read_operator` (TASK-1287). Redirect defensivo para
 * tenants cliente (vista operador, NUNCA `client_*`). El reporte sale del reader operador-scoped
 * (leak-safe `ClientGraderReport` → MISMO `modelFromClientReport` que la vista cliente); los
 * statuses del Plan AEO salen del reader de TASK-1275. Estados honestos: denied / not-found /
 * empty / preparing / error transitorio.
 */

export const metadata: Metadata = { title: 'AEO — Detalle operador | Growth | Greenhouse' }
export const dynamic = 'force-dynamic'

const O = GH_GROWTH_AEO_OPERATOR
const VIEW_CODE = 'gestion.growth_aeo'

const StateShell = ({ children }: { children: React.ReactNode }) => (
  <Box sx={{ p: 6, maxWidth: 720, mx: 'auto' }}>{children}</Box>
)

const tierLabelOf = (entitlement: AeoEntitlement): string => {
  if (!entitlement.hasModule) return O.tier.none
  if (entitlement.tier === 'contracted') return O.tier.contracted
  if (entitlement.tier === 'pilot') return O.tier.pilot

  return O.tier.trial
}

const allowanceLabelOf = (entitlement: AeoEntitlement): string | null => {
  if (!entitlement.hasModule || entitlement.allowanceCap === null) return null

  return O.band.allowanceRuns(entitlement.allowanceUsed ?? 0, entitlement.allowanceCap)
}

const stripProtocol = (url: string | null): string | null =>
  url ? url.replace(/^https?:\/\//, '').replace(/\/$/, '') : null

export default async function AeoOperatorDetailPage({
  params
}: {
  params: Promise<{ organizationId: string }>
}) {
  const { organizationId } = await params

  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')

  // Redirect defensivo: vista operador — un tenant cliente jamás la ve, aunque tuviera el viewCode.
  if (tenant.tenantType === 'client') redirect('/401')

  const hasAccess =
    hasAuthorizedViewCode({
      tenant,
      viewCode: VIEW_CODE,
      fallback: tenant.routeGroups.includes('internal') || tenant.routeGroups.includes('admin')
    }) && can(tenant, 'growth.ai_visibility.report.read_operator', 'read', 'tenant')

  if (!hasAccess) redirect('/401')

  const organization = await getOrganizationDetail(organizationId)

  if (!organization) {
    return (
      <StateShell>
        <EmptyState icon='tabler-building-off' title={O.states.notFoundTitle} description={O.states.notFoundBody} />
      </StateShell>
    )
  }

  const canSetStatus = can(tenant, 'growth.ai_visibility.recommendation.set_status', 'execute', 'tenant')

  // Entitlement (tier + allowance) para la banda; si el resolver falla degradamos la banda, no la página.
  let entitlement: AeoEntitlement | null = null

  try {
    entitlement = await resolveAeoEntitlement(organizationId)
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'aeo_operator_detail_entitlement' },
      extra: { organizationId }
    })
  }

  const band = {
    organizationId,
    organizationName: organization.organizationName,
    logoUrl: organization.logoUrl,
    publicId: organization.publicId ?? null,
    domain: stripProtocol(organization.websiteUrl),
    tierLabel: entitlement ? tierLabelOf(entitlement) : O.tier.none,
    allowanceLabel: entitlement ? allowanceLabelOf(entitlement) : null,
    lastRunLabel: null as string | null,
    account360Href: `/agency/organizations/${organizationId}`
  }

  try {
    const [{ report }, statusRecords] = await Promise.all([
      readOperatorScopedAeoReport({ subject: tenant, organizationId }),
      readRecommendationStatuses(organizationId)
    ])

    const model = modelFromClientReport(report)

    const initialStatuses: Partial<Record<string, PlanStatusVM>> = {}

    for (const record of statusRecords) {
      initialStatuses[record.recommendationKey] = {
        status: record.status,
        reason: record.reason,
        updatedBy: null,
        updatedAt: null
      }
    }

    // Slice 6 — envío + Lead (TASK-1279): solo con la capability lead.open. El runId es el interno
    // del último run reportable; "publicado" = existe snapshot público (gate que el server re-valida).
    let send: AeoOperatorSendConfig | undefined

    if (can(tenant, 'growth.ai_visibility.lead.open', 'execute', 'tenant')) {
      let runId: string | null = null
      let reportPublished = false

      try {
        const latestRun = await getLatestClientGraderRun(organizationId)

        runId = latestRun?.runId ?? null
        reportPublished = runId !== null && Boolean(await getLatestReportTokenForRun(runId))
      } catch (error) {
        captureWithDomain(error, 'growth', {
          tags: { source: 'aeo_operator_detail_send_config' },
          extra: { organizationId }
        })
      }

      const isClientOrg = organization.organizationType === 'client' || organization.organizationType === 'both'

      send = {
        runId,
        motion: isClientOrg ? 'expansion' : 'new_business',
        reportPublished,
        enabled: isOperatorSendEnabled()
      }
    }

    // asOfDate viaja como ISO string (contrato normalizado en el store) → label legible es-CL.
    const asOfLabel = report.provenance.asOfDate ? formatDate(report.provenance.asOfDate) : null

    return (
      <AeoOperatorDetailView
        band={{ ...band, lastRunLabel: asOfLabel }}
        model={model}
        asOfLabel={asOfLabel}
        initialStatuses={initialStatuses}
        canSetStatus={canSetStatus}
        send={send}
      />
    )
  } catch (error) {
    if (error instanceof OperatorGraderReportError) {
      if (error.code === 'forbidden') {
        return (
          <StateShell>
            <EmptyState icon='tabler-lock' title={O.states.deniedTitle} description={O.states.deniedBody} />
          </StateShell>
        )
      }

      if (error.code === 'not_found') {
        return (
          <StateShell>
            <EmptyState icon='tabler-radar-2' title={O.states.emptyTitle} description={O.states.emptyBody} />
          </StateShell>
        )
      }

      // report_unavailable → hay run pero sin score aún: "preparando" honesto, sin razón interna.
      return (
        <StateShell>
          <EmptyState
            icon='tabler-clock-hour-4'
            title={O.states.preparingTitle}
            description={O.states.preparingBody}
          />
        </StateShell>
      )
    }

    captureWithDomain(error, 'growth', {
      tags: { source: 'aeo_operator_detail_page' },
      extra: { organizationId }
    })

    return (
      <StateShell>
        <EmptyState
          icon='tabler-alert-triangle'
          title={O.states.errorTitle}
          description={O.states.errorBody}
          action={
            <Button variant='tonal' href={`/growth/aeo/${organizationId}`}>
              {O.states.retry}
            </Button>
          }
        />
      </StateShell>
    )
  }
}
