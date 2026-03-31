'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'

import { useSession } from 'next-auth/react'
import { toast } from 'react-toastify'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomIconButton from '@core/components/mui/IconButton'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import type { OrganizationDetailData } from './types'
import OrganizationTabs from './OrganizationTabs'
import EditOrganizationDrawer from './drawers/EditOrganizationDrawer'
import AddMembershipDrawer from './drawers/AddMembershipDrawer'

// ── Helpers ──

const COUNTRY_FLAGS: Record<string, string> = {
  CL: '🇨🇱', CO: '🇨🇴', VE: '🇻🇪', MX: '🇲🇽', PE: '🇵🇪', US: '🇺🇸', AR: '🇦🇷', BR: '🇧🇷', EC: '🇪🇨'
}

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'secondary'> = {
  active: 'success', inactive: 'secondary', prospect: 'warning', churned: 'error'
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Activa', inactive: 'Inactiva', prospect: 'Prospecto', churned: 'Churned'
}

const fmtClp = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

// ── Types ──

interface OrgKpis {
  revenueClp: number
  grossMarginPct: number | null
  headcountFte: number | null
  totalCostClp: number
}

type Props = {
  organizationId: string
}

const OrganizationView = ({ organizationId }: Props) => {
  const { data: session } = useSession()
  const isAdmin = session?.user?.roleCodes?.includes('efeonce_admin') ?? false

  const [detail, setDetail] = useState<OrganizationDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [addMembershipOpen, setAddMembershipOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [kpis, setKpis] = useState<OrgKpis | null>(null)

  const loadDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${organizationId}`)

      if (res.ok) {
        const data = await res.json()

        setDetail(data)

        // Fetch KPIs from operational PL
        try {
          const now = new Date()
          const plRes = await fetch(`/api/finance/intelligence/operational-pl?year=${now.getFullYear()}&month=${now.getMonth() + 1}&scope=organization`)

          if (plRes.ok) {
            const plData = await plRes.json()
            const snap = (plData.snapshots ?? []).find((s: Record<string, unknown>) => s.scopeId === data.organizationId)

            if (snap) {
              setKpis({
                revenueClp: Number(snap.revenueClp ?? 0),
                grossMarginPct: snap.grossMarginPct != null ? Number(snap.grossMarginPct) : null,
                headcountFte: snap.headcountFte != null ? Number(snap.headcountFte) : null,
                totalCostClp: Number(snap.totalCostClp ?? 0)
              })
            }
          }
        } catch { /* non-blocking */ }
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  const handleEditSuccess = () => {
    toast.success('Organización actualizada.')
    void loadDetail()
  }

  const handleSyncHubspot = async () => {
    if (!detail) return

    setSyncing(true)

    try {
      const res = await fetch(`/api/organizations/${detail.organizationId}/hubspot-sync`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Error al sincronizar con HubSpot')

        return
      }

      const parts: string[] = []

      if (data.fieldsUpdated?.length > 0) parts.push(`${data.fieldsUpdated.length} campo${data.fieldsUpdated.length !== 1 ? 's' : ''} actualizado${data.fieldsUpdated.length !== 1 ? 's' : ''}`)
      if (data.contactsSynced > 0) parts.push(`${data.contactsSynced} contacto${data.contactsSynced !== 1 ? 's' : ''} vinculado${data.contactsSynced !== 1 ? 's' : ''}`)

      toast.success(parts.length > 0 ? `Sincronizado: ${parts.join(', ')}.` : 'Todo al día con HubSpot.')
      void loadDetail()
    } catch {
      toast.error('Error de conexión con HubSpot')
    } finally {
      setSyncing(false)
    }
  }

  const handleMembershipSuccess = () => {
    toast.success('Persona agregada a la organización.')
    void loadDetail()
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!detail) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography color='text.secondary'>No se encontró esta organización.</Typography>
        <Button component={Link} href='/agency/organizations' variant='tonal' sx={{ mt: 2 }}>
          Volver a organizaciones
        </Button>
      </Box>
    )
  }

  const initial = detail.organizationName.charAt(0).toUpperCase()
  const flag = detail.country ? COUNTRY_FLAGS[detail.country.toUpperCase()] ?? '🌐' : null

  return (
    <>
      <Stack spacing={6}>
        {/* ── Identity Header ── */}
        <Card variant='outlined'>
          <CardContent sx={{ py: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
              {/* Avatar + Identity */}
              <CustomAvatar variant='rounded' skin='light' color='primary' size={56}>
                <Typography variant='h5' sx={{ fontWeight: 700 }}>{initial}</Typography>
              </CustomAvatar>

              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Typography variant='h5' sx={{ fontWeight: 600 }}>{detail.organizationName}</Typography>
                  <CustomChip
                    round='true' size='small' variant='tonal'
                    color={STATUS_COLOR[detail.status] ?? 'secondary'}
                    label={STATUS_LABEL[detail.status] ?? detail.status}
                  />
                  {flag && <Typography variant='body2' color='text.secondary'>{flag} {detail.country}</Typography>}
                </Box>
                {detail.industry && (
                  <Typography variant='body2' color='text.secondary'>{detail.industry}</Typography>
                )}
                {(detail.legalName || detail.taxId) && (
                  <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {detail.legalName}{detail.taxId ? ` · ${detail.taxIdType ? `${detail.taxIdType}: ` : ''}${detail.taxId}` : ''}
                  </Typography>
                )}
              </Box>

              {/* Stats chips */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <CustomChip round='true' size='small' variant='tonal' color='primary' label={`${detail.spaceCount} Space${detail.spaceCount !== 1 ? 's' : ''}`} />
                <CustomChip round='true' size='small' variant='tonal' color='info' label={`${detail.uniquePersonCount} Personas`} />
                {detail.hubspotCompanyId && (
                  <CustomChip
                    round='true' size='small' variant='tonal' color='warning'
                    label='HubSpot'
                    icon={<Box component='img' src='/images/integrations/hubspot.svg' alt='' sx={{ width: 14, height: 14 }} />}
                  />
                )}
              </Box>

              {/* Actions */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                {isAdmin && detail.hubspotCompanyId && (
                  <CustomIconButton
                    variant='tonal' color='warning' size='small'
                    onClick={handleSyncHubspot} disabled={syncing}
                    aria-label='Sincronizar con HubSpot'
                  >
                    {syncing ? <CircularProgress size={18} color='inherit' /> : <i className='tabler-refresh' />}
                  </CustomIconButton>
                )}
                {isAdmin && (
                  <CustomIconButton
                    variant='tonal' color='primary' size='small'
                    onClick={() => setEditDrawerOpen(true)}
                    aria-label='Editar organización'
                  >
                    <i className='tabler-edit' />
                  </CustomIconButton>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* ── Cross-domain KPIs ── */}
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Revenue'
              stats={kpis ? fmtClp(kpis.revenueClp) : '—'}
              subtitle='Ingresos del período'
              avatarIcon='tabler-cash'
              avatarColor='success'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Margen bruto'
              stats={kpis?.grossMarginPct != null ? `${Math.round(kpis.grossMarginPct)}%` : '—'}
              subtitle={kpis ? fmtClp(kpis.revenueClp - kpis.totalCostClp) : 'Sin datos'}
              avatarIcon='tabler-trending-up'
              avatarColor={kpis?.grossMarginPct != null && kpis.grossMarginPct >= 30 ? 'success' : kpis?.grossMarginPct != null && kpis.grossMarginPct >= 15 ? 'warning' : 'error'}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Equipo'
              stats={kpis?.headcountFte != null ? `${kpis.headcountFte} FTE` : '—'}
              subtitle='Personas asignadas'
              avatarIcon='tabler-users'
              avatarColor='info'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Spaces'
              stats={String(detail.spaceCount)}
              subtitle={`${detail.membershipCount} membresías`}
              avatarIcon='tabler-grid-4x4'
              avatarColor='primary'
            />
          </Grid>
        </Grid>

        {/* ── Tabs (full width) ── */}
        <OrganizationTabs
          detail={detail}
          isAdmin={isAdmin}
          onAddMembership={() => setAddMembershipOpen(true)}
        />
      </Stack>

      <EditOrganizationDrawer
        open={editDrawerOpen}
        detail={detail}
        onClose={() => setEditDrawerOpen(false)}
        onSuccess={handleEditSuccess}
      />

      <AddMembershipDrawer
        open={addMembershipOpen}
        organizationId={detail.organizationId}
        spaces={detail.spaces}
        onClose={() => setAddMembershipOpen(false)}
        onSuccess={handleMembershipSuccess}
      />
    </>
  )
}

export default OrganizationView
