import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'

import EmptyState from '@/components/greenhouse/EmptyState'
import { GH_GROWTH_SEO_CLIENT } from '@/lib/copy/growth'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { resolveSeoEntitlement } from '@/lib/growth/seo/entitlement'
import { readSeoClientSurface } from '@/lib/growth/seo/client/read-seo-client-surface'
import { requireServerSession } from '@/lib/auth/require-server-session'
import { requireClientTenantContext } from '@/lib/tenant/authorization'
import { isSeoModuleEnabled } from '@/lib/growth/seo/flags'
import SeoClientDashboardView, { SeoClientLockedCard } from '@/views/greenhouse/growth/seo/client/SeoClientDashboardView'

export const dynamic = 'force-dynamic'

const StateShell = ({ children, dataCapture }: { children: ReactNode; dataCapture?: string }) => (
  <Box data-capture={dataCapture} sx={{ p: { xs: 3, sm: 4, md: 6 }, maxWidth: 900, mx: 'auto', width: '100%' }}>
    {children}
  </Box>
)

export default async function SeoClientDashboardPage() {
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
      <StateShell dataCapture='seo-client-dashboard'>
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
        <StateShell dataCapture='seo-client-dashboard'>
          <EmptyState
            icon='tabler-plug-connected-x'
            title={GH_GROWTH_SEO_CLIENT.states.noGscTitle}
            description={GH_GROWTH_SEO_CLIENT.states.noGscDescription}
            action={
              <Button component='a' href='mailto:hola@efeonce.com' variant='contained' size='small'>
                {GH_GROWTH_SEO_CLIENT.states.noGscCta}
              </Button>
            }
          />
        </StateShell>
      )
    }

    if (surface.connection.state === 'no_snapshots') {
      return (
        <StateShell dataCapture='seo-client-dashboard'>
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
        <StateShell dataCapture='seo-client-dashboard'>
          <EmptyState
            icon='tabler-alert-triangle'
            title={GH_GROWTH_SEO_CLIENT.states.errorTitle}
            description={GH_GROWTH_SEO_CLIENT.states.errorDescription}
            action={
              <Button variant='outlined' href='/growth/seo'>
                {GH_GROWTH_SEO_CLIENT.states.retry}
              </Button>
            }
          />
        </StateShell>
      )
    }

    return (
      <SeoClientDashboardView
        organizationName={tenant.organizationName ?? tenant.clientName}
        surface={surface}
      />
    )
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'client_seo_dashboard_page' },
      extra: { organizationId }
    })

    return (
      <StateShell dataCapture='seo-client-dashboard'>
        <EmptyState
          icon='tabler-alert-triangle'
          title={GH_GROWTH_SEO_CLIENT.states.errorTitle}
          description={GH_GROWTH_SEO_CLIENT.states.errorDescription}
          action={
            <Button variant='outlined' href='/growth/seo'>
              {GH_GROWTH_SEO_CLIENT.states.retry}
            </Button>
          }
        />
      </StateShell>
    )
  }
}
