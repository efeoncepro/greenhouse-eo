'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'

import { toast } from 'sonner'

import Box from '@mui/material/Box'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import type { OrganizationDetailData, OrganizationSpace } from '@/views/greenhouse/organizations/types'

const TASK407_ARIA_NAVEGACION_DE_CUENTA = "Navegacion de cuenta"


const GREENHOUSE_COPY = getMicrocopy()

// ── Helpers ──────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'secondary'> = {
  active: 'success',
  inactive: 'secondary',
  prospect: 'warning',
  churned: 'error'
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Activa',
  inactive: 'Inactiva',
  prospect: 'Prospecto',
  churned: 'Churned'
}

const COUNTRY_FLAGS: Record<string, string> = {
  CL: '\u{1F1E8}\u{1F1F1}',
  CO: '\u{1F1E8}\u{1F1F4}',
  VE: '\u{1F1FB}\u{1F1EA}',
  MX: '\u{1F1F2}\u{1F1FD}',
  PE: '\u{1F1F5}\u{1F1EA}',
  US: '\u{1F1FA}\u{1F1F8}',
  AR: '\u{1F1E6}\u{1F1F7}',
  BR: '\u{1F1E7}\u{1F1F7}',
  EC: '\u{1F1EA}\u{1F1E8}'
}

const SPACE_TYPE_LABEL: Record<string, string> = {
  client_space: 'Space cliente',
  internal_space: 'Space interno'
}

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Santiago'
})

const formatDate = (iso: string | null) => {
  if (!iso) return null

  try {
    return dateFormatter.format(new Date(iso))
  } catch {
    return '\u2014'
  }
}

// ── Space info enriched with Notion mapping data ──

interface SpaceInfo {
  spaceId: string
  spaceName: string
  clientId: string | null
  clientName: string | null
  organizationId: string | null
  spaceType: string
  status: string
  hasNotionMapping: boolean
  syncEnabled: boolean | null
  lastSyncedAt: string | null
  createdAt: string | null
}

// ── Component ────────────────────────────────────────────────────────────

type Props = {
  organizationId: string
}

const AdminAccountDetailView = ({ organizationId }: Props) => {
  const [detail, setDetail] = useState<OrganizationDetailData | null>(null)
  const [spacesInfo, setSpacesInfo] = useState<SpaceInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState('')
  const [newSpaceType, setNewSpaceType] = useState<'client_space' | 'internal_space'>('client_space')

  // ── Data fetching ──

  const loadData = useCallback(async () => {
    try {
      const [orgRes, spacesRes] = await Promise.all([
        fetch(`/api/organizations/${organizationId}`),
        fetch('/api/admin/spaces')
      ])

      if (orgRes.ok) {
        const orgData: OrganizationDetailData = await orgRes.json()

        setDetail(orgData)

        // Default space name to org name for create dialog
        setNewSpaceName(orgData.organizationName)

        // Enrich org spaces with Notion mapping info from admin spaces API
        if (spacesRes.ok) {
          const { spaces: allSpaces }: { spaces: SpaceInfo[] } = await spacesRes.json()

          const orgSpaceIds = new Set(
            (orgData.spaces ?? []).map((s: OrganizationSpace) => s.spaceId)
          )

          setSpacesInfo(allSpaces.filter(s => orgSpaceIds.has(s.spaceId)))
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // ── Create space handler ──

  const resolveClientId = (): string | null => {
    // Use the first clientId found in existing spaces of this org
    if (!detail?.spaces) return null

    for (const space of detail.spaces) {
      if (space.clientId) return space.clientId
    }

    return null
  }

  const handleCreateSpace = async () => {
    const trimmed = newSpaceName.trim()

    if (!trimmed) return

    const clientId = resolveClientId()

    if (!clientId) {
      toast.error('Esta organizacion no tiene un client ID asociado. Crea un space desde la Torre de Control.')

      return
    }

    setCreating(true)

    try {
      const res = await fetch('/api/admin/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceName: trimmed,
          clientId,
          spaceType: newSpaceType
        })
      })

      if (res.ok) {
        toast.success('Space creado.')
        setCreateDialogOpen(false)
        setNewSpaceName(detail?.organizationName ?? '')
        void loadData()
      } else {
        const body = await res.json()

        toast.error(body.error ?? 'No se pudo crear el space.')
      }
    } catch {
      toast.error('Error de conexion. Intenta de nuevo.')
    } finally {
      setCreating(false)
    }
  }

  // ── Loading state ──

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress />
      </Box>
    )
  }

  // ── Not found ──

  if (!detail) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography color='text.secondary'>No se encontro esta organizacion.</Typography>
        <Button component={Link} href='/admin/accounts' variant='tonal' sx={{ mt: 2 }}>
          Volver a cuentas
        </Button>
      </Box>
    )
  }

  // ── Derived values ──

  const initial = detail.organizationName.charAt(0).toUpperCase()
  const flag = detail.country ? COUNTRY_FLAGS[detail.country.toUpperCase()] ?? '\u{1F310}' : null
  const canCreateSpace = resolveClientId() !== null

  // ── Sidebar ────────────────────────────────────────────────────────────

  const sidebar = (
    <Card>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, pt: 6 }}>
        <CustomAvatar variant='rounded' skin='light' color='primary' size={80}>
          <Typography variant='h3' sx={{ fontWeight: 700 }}>{initial}</Typography>
        </CustomAvatar>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant='h5'>{detail.organizationName}</Typography>
          <Typography variant='caption' color='text.secondary' sx={{ fontSize: '0.75rem' }}>
            {detail.publicId}
          </Typography>
        </Box>

        <CustomChip
          round='true'
          size='small'
          variant='tonal'
          color={STATUS_COLOR[detail.status] ?? 'secondary'}
          label={STATUS_LABEL[detail.status] ?? detail.status}
        />

        {/* Country + Industry */}
        {(flag || detail.industry) && (
          <Stack spacing={0.5} alignItems='center'>
            {flag && detail.country && (
              <Typography variant='body2' color='text.secondary'>
                {flag} {detail.country}
              </Typography>
            )}
            {detail.industry && (
              <Typography variant='body2' color='text.secondary'>
                {detail.industry}
              </Typography>
            )}
          </Stack>
        )}

        {/* Mini stats */}
        <Box sx={{ display: 'flex', gap: 6, width: '100%', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant='h6'>{detail.spaceCount}</Typography>
            <Typography variant='caption' color='text.secondary'>Spaces</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant='h6'>{detail.uniquePersonCount}</Typography>
            <Typography variant='caption' color='text.secondary'>Personas</Typography>
          </Box>
        </Box>
      </CardContent>

      {/* Identifiers */}
      {(detail.hubspotCompanyId || detail.taxId) && (
        <>
          <Divider />
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant='overline' color='text.secondary'>Identificadores</Typography>
            {detail.hubspotCompanyId && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  component='img'
                  src='/images/integrations/hubspot.svg'
                  alt='HubSpot'
                  sx={{ width: 16, height: 16, objectFit: 'contain' }}
                />
                <Typography variant='body2' sx={{ fontSize: '0.8rem' }}>
                  HubSpot: {detail.hubspotCompanyId}
                </Typography>
              </Box>
            )}
            {detail.taxId && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <i className='tabler-receipt' style={{ fontSize: 16, color: 'var(--mui-palette-text-secondary)' }} />
                <Typography variant='body2' sx={{ fontSize: '0.8rem' }}>
                  {detail.taxIdType ? `${detail.taxIdType}: ` : ''}{detail.taxId}
                </Typography>
              </Box>
            )}
          </CardContent>
        </>
      )}

      {/* Legal name */}
      {detail.legalName && (
        <>
          <Divider />
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant='overline' color='text.secondary'>Razon social</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <i className='tabler-file-text' style={{ fontSize: 16, color: 'var(--mui-palette-text-secondary)' }} />
              <Typography variant='body2'>{detail.legalName}</Typography>
            </Box>
          </CardContent>
        </>
      )}

      {/* Notes */}
      {detail.notes && (
        <>
          <Divider />
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant='overline' color='text.secondary'>Notas</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ whiteSpace: 'pre-wrap' }}>
              {detail.notes}
            </Typography>
          </CardContent>
        </>
      )}

      {/* Actions */}
      <Divider />
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant='overline' color='text.secondary'>Acciones</Typography>
        <Button
          component={Link}
          href={`/agency/organizations/${organizationId}`}
          variant='tonal'
          color='secondary'
          fullWidth
          startIcon={<i className='tabler-building-community' />}
        >
          Ver en Agencia
        </Button>
      </CardContent>
    </Card>
  )

  // ── Spaces content ─────────────────────────────────────────────────────

  const content = (
    <Stack spacing={6}>
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title='Spaces de esta cuenta'
          subheader={
            spacesInfo.length > 0
              ? `${spacesInfo.length} space${spacesInfo.length !== 1 ? 's' : ''} registrado${spacesInfo.length !== 1 ? 's' : ''}`
              : undefined
          }
          avatar={
            <CustomAvatar variant='rounded' skin='light' color='primary' size={36}>
              <i className='tabler-layout-grid text-lg' />
            </CustomAvatar>
          }
          action={
            <Button
              variant='tonal'
              size='small'
              startIcon={<i className='tabler-plus' />}
              onClick={() => setCreateDialogOpen(true)}
              disabled={!canCreateSpace}
            >
              Crear space
            </Button>
          }
          titleTypographyProps={{ variant: 'h6' }}
        />
        <Divider />
        <CardContent>
          {spacesInfo.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }} role='status'>
              <CustomAvatar variant='rounded' skin='light' color='secondary' size={48} sx={{ mx: 'auto', mb: 2 }}>
                <i className='tabler-layout-grid-add' style={{ fontSize: 24 }} />
              </CustomAvatar>
              <Typography variant='h6' sx={{ mb: 1 }}>
                Esta cuenta aun no tiene spaces
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                Los spaces representan unidades operativas de la organizacion. Crea uno para iniciar el onboarding.
              </Typography>
              {canCreateSpace && (
                <Button
                  variant='contained'
                  startIcon={<i className='tabler-plus' />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Crear primer space
                </Button>
              )}
              {!canCreateSpace && (
                <Typography variant='caption' color='text.secondary'>
                  No se puede crear un space porque no hay un client ID asociado a esta organizacion.
                </Typography>
              )}
            </Box>
          ) : (
            <Stack spacing={4}>
              {spacesInfo.map(space => {
                const orgSpace = detail.spaces?.find(s => s.spaceId === space.spaceId)
                const spaceStatus = orgSpace?.status ?? space.status

                return (
                  <Card
                    key={space.spaceId}
                    elevation={0}
                    sx={{
                      borderLeft: '4px solid',
                      borderLeftColor: spaceStatus === 'active' ? 'primary.main' : 'grey.400',
                      border: theme => `1px solid ${theme.palette.divider}`,
                      borderLeftWidth: '4px',
                      '&:hover': { boxShadow: theme => theme.shadows[4] },
                      transition: 'box-shadow 0.2s ease-in-out'
                    }}
                  >
                    <CardContent sx={{ py: 3, '&:last-child': { pb: 3 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                        {/* Left: Space identity */}
                        <Box sx={{ flex: 1, minWidth: 200 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                            <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                              {space.spaceName}
                            </Typography>
                            <CustomChip
                              round='true'
                              size='small'
                              variant='tonal'
                              color={STATUS_COLOR[spaceStatus] ?? 'secondary'}
                              label={STATUS_LABEL[spaceStatus] ?? spaceStatus}
                            />
                          </Box>
                          <Typography variant='caption' color='text.secondary' sx={{ fontSize: '0.75rem' }}>
                            {orgSpace?.publicId ?? space.spaceId}
                          </Typography>

                          {/* Readiness chips */}
                          <Stack direction='row' spacing={1} sx={{ mt: 1.5 }} flexWrap='wrap'>
                            <CustomChip
                              round='true'
                              size='small'
                              variant='tonal'
                              color='secondary'
                              label={SPACE_TYPE_LABEL[space.spaceType] ?? space.spaceType}
                              icon={<i className='tabler-tag' style={{ fontSize: 14 }} />}
                            />
                            {space.hasNotionMapping ? (
                              <CustomChip
                                round='true'
                                size='small'
                                variant='tonal'
                                color='success'
                                label='Notion vinculado'
                                icon={<i className='tabler-brand-notion' style={{ fontSize: 14 }} />}
                              />
                            ) : (
                              <CustomChip
                                round='true'
                                size='small'
                                variant='tonal'
                                color='secondary'
                                label='Sin Notion'
                                icon={<i className='tabler-brand-notion' style={{ fontSize: 14 }} />}
                              />
                            )}
                            {space.syncEnabled && space.lastSyncedAt && (
                              <CustomChip
                                round='true'
                                size='small'
                                variant='tonal'
                                color='info'
                                label={`Sync: ${formatDate(space.lastSyncedAt)}`}
                                icon={<i className='tabler-refresh' style={{ fontSize: 14 }} />}
                              />
                            )}
                          </Stack>
                        </Box>

                        {/* Right: Actions */}
                        <Stack direction='row' spacing={2} sx={{ flexShrink: 0 }}>
                          <Button
                            component={Link}
                            href={`/agency/spaces/${space.spaceId}`}
                            variant='outlined'
                            size='small'
                            startIcon={<i className='tabler-external-link' />}
                          >
                            Abrir Space 360
                          </Button>
                        </Stack>
                      </Box>
                    </CardContent>
                  </Card>
                )
              })}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  )

  // ── Create Space dialog ────────────────────────────────────────────────

  const createDialog = (
    <Dialog
      open={createDialogOpen}
      onClose={() => setCreateDialogOpen(false)}
      maxWidth='sm'
      fullWidth
      aria-labelledby='create-space-title'
    >
      <DialogTitle id='create-space-title'>Crear space</DialogTitle>
      <DialogContent>
        <Stack spacing={4} sx={{ mt: 1 }}>
          <CustomTextField
            label='Nombre del space'
            value={newSpaceName}
            onChange={e => setNewSpaceName(e.target.value)}
            fullWidth
            autoFocus
            placeholder='ej. Acme Corp'
          />
          <CustomTextField
            label='Tipo de space'
            value={newSpaceType}
            onChange={e => setNewSpaceType(e.target.value as 'client_space' | 'internal_space')}
            select
            fullWidth
          >
            <MenuItem value='client_space'>Space cliente</MenuItem>
            <MenuItem value='internal_space'>Space interno</MenuItem>
          </CustomTextField>
          {!canCreateSpace && (
            <Typography variant='body2' color='warning.main'>
              Esta organizacion no tiene un client ID asociado. No es posible crear un space desde esta superficie.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateDialogOpen(false)} color='secondary'>{GREENHOUSE_COPY.actions.cancel}</Button>
        <Button
          variant='contained'
          onClick={handleCreateSpace}
          disabled={creating || !newSpaceName.trim() || !canCreateSpace}
          startIcon={creating ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-plus' />}
        >
          {creating ? 'Creando...' : 'Crear space'}
        </Button>
      </DialogActions>
    </Dialog>
  )

  // ── Root layout ────────────────────────────────────────────────────────

  return (
    <>
      <Grid container spacing={6}>
        {/* Breadcrumbs */}
        <Grid size={{ xs: 12 }}>
          <Breadcrumbs aria-label={TASK407_ARIA_NAVEGACION_DE_CUENTA}>
            <Typography
              component={Link}
              href='/admin'
              variant='body2'
              color='text.secondary'
              sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Admin
            </Typography>
            <Typography
              component={Link}
              href='/admin/accounts'
              variant='body2'
              color='text.secondary'
              sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Cuentas
            </Typography>
            <Typography variant='body2' color='text.primary'>
              {detail.organizationName}
            </Typography>
          </Breadcrumbs>
        </Grid>

        {/* Sidebar */}
        <Grid size={{ xs: 12, md: 5, lg: 4 }}>
          {sidebar}
        </Grid>

        {/* Content */}
        <Grid size={{ xs: 12, md: 7, lg: 8 }}>
          {content}
        </Grid>
      </Grid>

      {createDialog}
    </>
  )
}

export default AdminAccountDetailView
