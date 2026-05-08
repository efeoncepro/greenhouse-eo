'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useRouter, useSearchParams } from 'next/navigation'

import { useSession } from 'next-auth/react'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { ROLE_CODES } from '@/config/role-codes'
import { GH_ORGANIZATION_WORKSPACE } from '@/lib/copy/agency'
import { ORGANIZATION_FACETS } from '@/lib/organization-workspace/facet-capability-mapping'

import OrganizationWorkspaceShell, {
  OrganizationWorkspaceAdminAction
} from '@/components/greenhouse/organization-workspace/OrganizationWorkspaceShell'
import FacetContentRouter from '@/components/greenhouse/organization-workspace/FacetContentRouter'

import EditOrganizationDrawer from '@/views/greenhouse/organizations/drawers/EditOrganizationDrawer'

import type {
  OrganizationFacet,
  OrganizationWorkspaceProjection
} from '@/components/greenhouse/organization-workspace/types'

import type { OrganizationDetailData } from '@/views/greenhouse/organizations/types'

/**
 * TASK-613 Slice 2 — Finance entrypoint client wrapper for the Organization Workspace.
 *
 * Mirror of `AgencyOrganizationWorkspaceClient` (TASK-612 Slice 5) but tailored to
 * the Finance entrypoint: defaultFacet='finance', context='finance', rich tab
 * content driven by `FinanceClientsContent` via the FacetContentRouter dispatch.
 *
 * Responsibilities:
 *  - Track activeFacet (sync with URL ?facet= deep-link)
 *  - Fetch organization detail + KPIs (mirror Agency pattern; the FinanceFacet
 *    self-fetches its own /api/finance/clients/[id] payload separately)
 *  - AdminActions slot (HubSpot sync, Edit org)
 *  - EditOrganizationDrawer wiring
 *
 * Server-side (page.tsx) already resolves the projection via `resolveOrganizationWorkspaceProjection`
 * with `entrypointContext='finance'`. The wrapper does NOT compute projection.
 */

interface OrgKpis {
  revenueClp: number
  grossMarginPct: number | null
  headcountFte: number | null
  totalCostClp: number
}

type Props = {
  organizationId: string
  projection: OrganizationWorkspaceProjection
}

const FACET_QUERY_PARAM = 'facet'

const isOrganizationFacet = (value: string): value is OrganizationFacet =>
  (ORGANIZATION_FACETS as readonly string[]).includes(value)

const FinanceClientsOrganizationWorkspaceClient = ({ organizationId, projection }: Props) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  const isAdmin = session?.user?.roleCodes?.includes(ROLE_CODES.EFEONCE_ADMIN) ?? false

  const [detail, setDetail] = useState<OrganizationDetailData | null>(null)
  const [kpis, setKpis] = useState<OrgKpis | null>(null)
  const [loading, setLoading] = useState(true)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const initialFacet = useMemo<OrganizationFacet | null>(() => {
    const fromUrl = searchParams.get(FACET_QUERY_PARAM)

    if (fromUrl && isOrganizationFacet(fromUrl) && projection.visibleFacets.includes(fromUrl)) {
      return fromUrl
    }

    return projection.defaultFacet
  }, [searchParams, projection.defaultFacet, projection.visibleFacets])

  const [activeFacet, setActiveFacet] = useState<OrganizationFacet | null>(initialFacet)

  const handleFacetChange = useCallback(
    (facet: OrganizationFacet) => {
      setActiveFacet(facet)

      const params = new URLSearchParams(searchParams.toString())

      params.set(FACET_QUERY_PARAM, facet)
      router.replace(`?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  const loadDetail = useCallback(async () => {
    setLoading(true)

    try {
      const today = new Date()
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
      const asOf = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-${String(lastMonth.getDate()).padStart(2, '0')}`

      const [detailRes, res360] = await Promise.all([
        fetch(`/api/organizations/${organizationId}`),
        fetch(`/api/organization/${organizationId}/360?facets=identity,economics,team,delivery&asOf=${asOf}`)
      ])

      if (detailRes.ok) {
        const data = (await detailRes.json()) as OrganizationDetailData

        setDetail(data)
      }

      if (res360.ok) {
        const data360 = await res360.json()
        const econ = data360.economics

        if (econ) {
          const current = econ.currentPeriod ?? econ

          setKpis({
            revenueClp: Number(current?.revenueClp ?? 0),
            grossMarginPct: current?.grossMarginPct ?? null,
            headcountFte: current?.headcountFte ?? null,
            totalCostClp: Number(current?.totalCostClp ?? 0)
          })
        }
      }
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  const handleSyncHubspot = useCallback(async () => {
    if (!detail?.hubspotCompanyId) return

    setSyncing(true)

    try {
      await fetch(`/api/organizations/${organizationId}/sync-hubspot`, { method: 'POST' })
      await loadDetail()
    } finally {
      setSyncing(false)
    }
  }, [detail?.hubspotCompanyId, organizationId, loadDetail])

  if (loading || !detail) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Stack direction='row' spacing={2} alignItems='center' justifyContent='center'>
          <CircularProgress size={20} />
          <Typography variant='body2' color='text.secondary'>
            {GH_ORGANIZATION_WORKSPACE.facets.loading}
          </Typography>
        </Stack>
      </Box>
    )
  }

  const adminActions = isAdmin ? (
    <>
      {detail.hubspotCompanyId && (
        <OrganizationWorkspaceAdminAction
          ariaLabel={GH_ORGANIZATION_WORKSPACE.shell.actions.syncHubspot}
          icon='tabler-refresh'
          loading={syncing}
          onClick={handleSyncHubspot}
        />
      )}
      <OrganizationWorkspaceAdminAction
        ariaLabel={GH_ORGANIZATION_WORKSPACE.shell.actions.edit}
        icon='tabler-edit'
        onClick={() => setEditDrawerOpen(true)}
      />
    </>
  ) : undefined

  return (
    <OrganizationWorkspaceShell
      organization={{
        organizationId: detail.organizationId,
        organizationName: detail.organizationName,
        publicId: detail.publicId,
        industry: detail.industry,
        country: detail.country,
        status: detail.status,
        active: detail.active,
        hubspotCompanyId: detail.hubspotCompanyId,
        spaceCount: detail.spaceCount,
        membershipCount: detail.membershipCount
      }}
      kpis={
        kpis
          ? {
              revenueClp: kpis.revenueClp,
              grossMarginPct: kpis.grossMarginPct,
              headcountFte: kpis.headcountFte
            }
          : null
      }
      projection={projection}
      activeFacet={activeFacet}
      onFacetChange={handleFacetChange}
      adminActions={adminActions}
      drawerSlot={
        <EditOrganizationDrawer
          open={editDrawerOpen}
          detail={detail}
          onClose={() => setEditDrawerOpen(false)}
          onSuccess={() => {
            setEditDrawerOpen(false)
            loadDetail()
          }}
        />
      }
    >
      {(facet, ctx) => <FacetContentRouter facet={facet} {...ctx} />}
    </OrganizationWorkspaceShell>
  )
}

export default FinanceClientsOrganizationWorkspaceClient
