'use client'

import { useMemo, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomIconButton from '@core/components/mui/IconButton'
import CustomTabList from '@core/components/mui/TabList'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import { GH_ORGANIZATION_WORKSPACE } from '@/lib/copy/agency'
import { formatCurrency as formatGreenhouseCurrency } from '@/lib/format'

import type {
  FacetContentProps,
  OrganizationFacet,
  OrganizationWorkspaceHeader,
  OrganizationWorkspaceKpis,
  OrganizationWorkspaceProjection
} from './types'

/**
 * TASK-612 — Organization Workspace shared shell.
 *
 * Spec: docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md §4.5
 * (Shell vs facet content contract).
 *
 * **Inviolable contract**: shell owns chrome, domain owns facet content.
 *
 * Shell renderiza:
 *  - Header (logo, name, status chip, breadcrumb, action buttons admin-only)
 *  - KPI strip 4 cards (Revenue / Margen bruto / Equipo / Spaces)
 *  - Tab container (consume `projection.visibleTabs` + `activeFacet` controlled)
 *  - Drawer skeleton (slot via render-prop)
 *
 * Shell NO renderiza contenido por facet — ese es responsabilidad del render-prop
 * children (ver `FacetContentRouter`).
 *
 * Degraded mode: cuando `projection.degradedMode=true`, render mensaje honesto
 * en es-CL tuteo, sin tabs ni acciones, sin renderizar el children.
 */

export type OrganizationWorkspaceShellProps = {
  organization: OrganizationWorkspaceHeader
  kpis: OrganizationWorkspaceKpis | null
  projection: OrganizationWorkspaceProjection
  activeFacet: OrganizationFacet | null
  onFacetChange: (facet: OrganizationFacet) => void
  /** Render-prop children: receive activeFacet + ctx, return facet content. */
  children: (facet: OrganizationFacet, ctx: FacetContentProps) => ReactNode
  /** Optional admin actions rendered in header (HubSpot sync, Edit, etc.). */
  adminActions?: ReactNode
  /** Optional drawer slot rendered after shell content (modals/drawers). */
  drawerSlot?: ReactNode
}

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'secondary'> = {
  active: 'success',
  inactive: 'secondary',
  prospect: 'warning',
  churned: 'error'
}

const COUNTRY_FLAGS: Record<string, string> = {
  CL: '🇨🇱', CO: '🇨🇴', VE: '🇻🇪', MX: '🇲🇽', PE: '🇵🇪', US: '🇺🇸', AR: '🇦🇷', BR: '🇧🇷', EC: '🇪🇨'
}

const fmtClp = (n: number | null): string => {
  if (n == null) return '—'

  return formatGreenhouseCurrency(n, 'CLP', { maximumFractionDigits: 0 }, 'es-CL')
}

const resolveStatusLabel = (status: string): string => {
  const copy = GH_ORGANIZATION_WORKSPACE.shell.status

  switch (status) {
    case 'active':
      return copy.active
    case 'inactive':
      return copy.inactive
    case 'prospect':
      return copy.prospect
    case 'churned':
      return copy.churned
    default:
      return copy.unknown
  }
}

const resolveDegradedMessage = (
  reason: OrganizationWorkspaceProjection['degradedReason']
): string => {
  const reasons = GH_ORGANIZATION_WORKSPACE.shell.degraded.reasons

  if (reason === 'relationship_lookup_failed') return reasons.relationship_lookup_failed
  if (reason === 'entitlements_lookup_failed') return reasons.entitlements_lookup_failed
  if (reason === 'no_facets_authorized') return reasons.no_facets_authorized

  return reasons.unknown
}

const OrganizationWorkspaceShell = ({
  organization,
  kpis,
  projection,
  activeFacet,
  onFacetChange,
  children,
  adminActions,
  drawerSlot
}: OrganizationWorkspaceShellProps) => {
  const copy = GH_ORGANIZATION_WORKSPACE.shell

  const statusColor = STATUS_COLOR[organization.status] ?? 'secondary'
  const statusLabel = resolveStatusLabel(organization.status)
  const flag = organization.country ? (COUNTRY_FLAGS[organization.country] ?? '') : ''

  const fieldRedactionsForActiveFacet = useMemo(() => {
    if (!activeFacet) return []

    return projection.fieldRedactions[activeFacet] ?? []
  }, [activeFacet, projection.fieldRedactions])

  // ── Degraded mode (honest, never crash) ──
  if (projection.degradedMode) {
    return (
      <Stack spacing={4}>
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardContent>
            <Stack direction='row' spacing={2} alignItems='center'>
              <CustomAvatar variant='rounded' skin='light' color='warning'>
                <i className='tabler-alert-triangle' />
              </CustomAvatar>
              <Box>
                <Typography variant='h6'>{copy.degraded.title}</Typography>
                <Typography variant='body2' color='text.secondary'>
                  {resolveDegradedMessage(projection.degradedReason)}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
        {drawerSlot}
      </Stack>
    )
  }

  return (
    <>
      <Stack spacing={6}>
        {/* ── Header ── */}
        <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'center' }} justifyContent='space-between'>
              <Stack direction='row' spacing={3} alignItems='center'>
                <CustomAvatar variant='rounded' skin='light' color='primary' size={56}>
                  <i className='tabler-building' style={{ fontSize: '1.75rem' }} />
                </CustomAvatar>
                <Box>
                  <Typography variant='caption' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}>
                    {copy.breadcrumb}
                  </Typography>
                  <Stack direction='row' spacing={2} alignItems='center' sx={{ mt: 0.5 }}>
                    <Typography variant='h4' sx={{ lineHeight: 1.1 }}>
                      {organization.organizationName}
                    </Typography>
                    <CustomChip variant='tonal' size='small' color={statusColor} label={statusLabel} />
                  </Stack>
                  <Stack direction='row' spacing={2} alignItems='center' sx={{ mt: 1 }} flexWrap='wrap'>
                    {flag && (
                      <Typography variant='body2' color='text.secondary'>
                        {flag} {organization.country}
                      </Typography>
                    )}
                    {organization.industry && (
                      <Typography variant='body2' color='text.secondary'>
                        {organization.industry}
                      </Typography>
                    )}
                    {organization.publicId && (
                      <Typography variant='caption' sx={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em', color: 'text.secondary' }}>
                        {organization.publicId}
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </Stack>

              {adminActions && (
                <Stack direction='row' spacing={2} alignItems='center'>
                  {adminActions}
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* ── KPI strip ── */}
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title={copy.kpis.revenue.title}
              stats={fmtClp(kpis?.revenueClp ?? null)}
              subtitle={copy.kpis.revenue.subtitle}
              avatarIcon='tabler-cash'
              avatarColor='success'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title={copy.kpis.grossMargin.title}
              stats={kpis?.grossMarginPct != null ? `${Math.round(kpis.grossMarginPct)}%` : '—'}
              subtitle={
                kpis?.revenueClp != null && kpis?.grossMarginPct != null
                  ? fmtClp(kpis.revenueClp * (kpis.grossMarginPct / 100))
                  : copy.kpis.grossMargin.subtitleEmpty
              }
              avatarIcon='tabler-trending-up'
              avatarColor={
                kpis?.grossMarginPct != null && kpis.grossMarginPct >= 30
                  ? 'success'
                  : kpis?.grossMarginPct != null && kpis.grossMarginPct >= 15
                    ? 'warning'
                    : 'error'
              }
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title={copy.kpis.team.title}
              stats={kpis?.headcountFte != null ? `${kpis.headcountFte} ${copy.kpis.team.unitFte}` : '—'}
              subtitle={copy.kpis.team.subtitle}
              avatarIcon='tabler-users'
              avatarColor='info'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title={copy.kpis.spaces.title}
              stats={String(organization.spaceCount)}
              subtitle={copy.kpis.spaces.membershipsLabel(organization.membershipCount)}
              avatarIcon='tabler-grid-4x4'
              avatarColor='primary'
            />
          </Grid>
        </Grid>

        {/* ── Tab container + facet content slot ── */}
        {projection.visibleTabs.length > 0 && activeFacet ? (
          <TabContext value={activeFacet}>
            <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
              <CustomTabList
                onChange={(_, value) => onFacetChange(value as OrganizationFacet)}
                aria-label={copy.tabs.ariaLabel}
                variant='scrollable'
                scrollButtons='auto'
              >
                {projection.visibleTabs.map(tab => (
                  <Tab key={tab.facet} label={tab.label} value={tab.facet} />
                ))}
              </CustomTabList>
            </Card>

            <Box>
              {children(activeFacet, {
                organizationId: organization.organizationId,
                entrypointContext: projection.entrypointContext,
                relationship: projection.relationship,
                fieldRedactions: fieldRedactionsForActiveFacet,
                projection
              })}
            </Box>
          </TabContext>
        ) : (
          <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
            <CardContent>
              <Typography variant='body2' color='text.secondary'>
                {copy.tabs.empty}
              </Typography>
            </CardContent>
          </Card>
        )}
      </Stack>

      {drawerSlot}
    </>
  )
}

export default OrganizationWorkspaceShell

/**
 * Convenience helper exported for callers that build the admin actions row
 * without re-inventing the style. Optional — admin can pass any ReactNode.
 */
export const OrganizationWorkspaceAdminAction = ({
  ariaLabel,
  icon,
  loading,
  onClick,
  variant = 'icon'
}: {
  ariaLabel: string
  icon: string
  loading?: boolean
  onClick: () => void
  variant?: 'icon' | 'button'
}) => {
  if (variant === 'button') {
    return (
      <Button
        variant='outlined'
        size='small'
        startIcon={loading ? <i className='tabler-loader-2 tabler-animate-spin' /> : <i className={icon} />}
        onClick={onClick}
        disabled={loading}
        aria-label={ariaLabel}
      >
        {ariaLabel}
      </Button>
    )
  }

  return (
    <CustomIconButton variant='outlined' size='small' onClick={onClick} disabled={loading} aria-label={ariaLabel}>
      <i className={loading ? 'tabler-loader-2 tabler-animate-spin' : icon} />
    </CustomIconButton>
  )
}
