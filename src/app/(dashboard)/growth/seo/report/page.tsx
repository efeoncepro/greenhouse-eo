import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'

import EmptyState from '@/components/greenhouse/EmptyState'
import { GreenhouseBreadcrumbs } from '@/components/greenhouse/primitives'
import { modelFromSeoReport } from '@/components/growth/seo/report-artifact/model'
import { SeoReportArtifact, SeoReportPrint } from '@/components/growth/seo/report-artifact'
import { GH_GROWTH_SEO_CLIENT } from '@/lib/copy/growth'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { resolveSeoEntitlement } from '@/lib/growth/seo/entitlement'
import { readSeoClientSurface } from '@/lib/growth/seo/client/read-seo-client-surface'
import { isSeoModuleEnabled } from '@/lib/growth/seo/flags'
import { requireServerSession } from '@/lib/auth/require-server-session'
import { requireClientTenantContext } from '@/lib/tenant/authorization'
import { SeoClientLockedCard } from '@/views/greenhouse/growth/seo/client/SeoClientDashboardView'

export const dynamic = 'force-dynamic'

const StateShell = ({ children, dataCapture }: { children: ReactNode; dataCapture?: string }) => (
  <Box data-capture={dataCapture} sx={{ p: { xs: 3, sm: 4, md: 6 }, maxWidth: 960, mx: 'auto', width: '100%' }}>
    {children}
  </Box>
)

interface PageProps {
  searchParams: Promise<{ print?: string }>
}

export default async function SeoClientReportPage({ searchParams }: PageProps) {
  await requireServerSession()

  if (!isSeoModuleEnabled()) {
    return <SeoClientLockedCard />
  }

  const { tenant } = await requireClientTenantContext()

  if (!tenant || !can(tenant, 'growth.seo.report.read_client', 'read', 'own')) {
    return <SeoClientLockedCard />
  }

  if (!tenant.organizationId) {
    return (
      <StateShell dataCapture='seo-client-report'>
        <EmptyState
          icon='tabler-building-off'
          title={GH_GROWTH_SEO_CLIENT.states.noOrganizationTitle}
          description={GH_GROWTH_SEO_CLIENT.states.noOrganizationDescription}
        />
      </StateShell>
    )
  }

  const organizationId = tenant.organizationId

  try {
    const entitlement = await resolveSeoEntitlement(organizationId)

    if (!entitlement.hasModule) {
      return <SeoClientLockedCard />
    }

    const surface = await readSeoClientSurface(organizationId)

    if (surface.connection.state === 'not_connected') {
      return (
        <StateShell dataCapture='seo-client-report'>
          <EmptyState
            icon='tabler-plug-connected-x'
            title={GH_GROWTH_SEO_CLIENT.states.noGscTitle}
            description={GH_GROWTH_SEO_CLIENT.states.noGscDescription}
          />
        </StateShell>
      )
    }

    if (surface.connection.state === 'no_snapshots') {
      return (
        <StateShell dataCapture='seo-client-report'>
          <EmptyState
            icon='tabler-calendar-stats'
            title={GH_GROWTH_SEO_CLIENT.states.noSnapshotsTitle}
            description={GH_GROWTH_SEO_CLIENT.states.noSnapshotsDescription}
          />
        </StateShell>
      )
    }

    if (surface.rankReaderFailed && surface.gapReaderFailed) {
      return (
        <StateShell dataCapture='seo-client-report'>
          <EmptyState
            icon='tabler-alert-triangle'
            title={GH_GROWTH_SEO_CLIENT.report.errorTitle}
            description={GH_GROWTH_SEO_CLIENT.report.errorDescription}
            action={
              <Button href='/growth/seo/report' variant='outlined'>
                {GH_GROWTH_SEO_CLIENT.states.retry}
              </Button>
            }
          />
        </StateShell>
      )
    }

    if (!surface.seoTargetId || (!surface.rankEvolution?.ok && !surface.gap?.ok)) {
      return (
        <StateShell dataCapture='seo-client-report'>
          <EmptyState
            icon='tabler-file-description'
            title={GH_GROWTH_SEO_CLIENT.report.emptyTitle}
            description={GH_GROWTH_SEO_CLIENT.report.emptyDescription}
          />
        </StateShell>
      )
    }

    const model = modelFromSeoReport(
      {
        organizationName: tenant.organizationName ?? tenant.clientName,
        seoTargetId: surface.seoTargetId,
        asOfDate: surface.connection.dataAsOf,
        rankEvolution: surface.rankEvolution?.ok ? surface.rankEvolution : null,
        gap: surface.gap?.ok ? surface.gap : null
      },
      'clientPortal'
    )

    const params = await searchParams

    if (params.print === '1') {
      return <SeoReportPrint model={model} />
    }

    return (
      <Stack spacing={4} sx={{ p: { xs: 3, sm: 4, md: 6 }, minWidth: 0 }}>
        <GreenhouseBreadcrumbs
          items={[
            { label: GH_GROWTH_SEO_CLIENT.page.breadcrumbRoot, href: '/home' },
            { label: GH_GROWTH_SEO_CLIENT.page.breadcrumbLeaf, href: '/growth/seo' },
            { label: GH_GROWTH_SEO_CLIENT.report.title }
          ]}
        />
        <SeoReportArtifact model={model} />
      </Stack>
    )
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'client_seo_report_page' },
      extra: { organizationId }
    })

    return (
      <StateShell dataCapture='seo-client-report'>
        <EmptyState
          icon='tabler-alert-triangle'
          title={GH_GROWTH_SEO_CLIENT.report.errorTitle}
          description={GH_GROWTH_SEO_CLIENT.report.errorDescription}
          action={
            <Button href='/growth/seo/report' variant='outlined'>
              {GH_GROWTH_SEO_CLIENT.states.retry}
            </Button>
          }
        />
      </StateShell>
    )
  }
}
