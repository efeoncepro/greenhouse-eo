'use client'

import { useState } from 'react'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import HorizontalWithAvatar from '@components/card-statistics/HorizontalWithAvatar'

import type { PersonDetail } from '@/types/people'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const hasValue = (v: unknown): boolean =>
  v !== null && v !== undefined && v !== '' && v !== '\u2014'

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return ''

  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

const formatRelativeDate = (iso: string | null | undefined): { text: string; muted: boolean } => {
  if (!iso) return { text: 'Nunca', muted: true }

  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) return { text: 'Nunca', muted: true }

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return { text: 'Hoy', muted: false }
  if (diffDays === 1) return { text: 'Ayer', muted: false }
  if (diffDays < 7) return { text: `Hace ${diffDays} dias`, muted: false }
  if (diffDays < 30) return { text: `Hace ${Math.floor(diffDays / 7)} semanas`, muted: false }

  return {
    text: date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }),
    muted: false
  }
}

const formatPayRegime = (regime: string | null | undefined, currency: string | null | undefined): string => {
  if (!regime && !currency) return ''

  const label = regime ? regime.charAt(0).toUpperCase() + regime.slice(1) : ''

  return currency ? `${label} (${currency})`.trim() : label
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type FieldEntry = { label: string; value: string; mono?: boolean }

const FieldGrid = ({ fields }: { fields: FieldEntry[] }) => {
  const visible = fields.filter(f => hasValue(f.value))

  if (visible.length === 0) return null

  return (
    <Grid container spacing={4}>
      {visible.map(({ label, value, mono }) => (
        <Grid key={label} size={{ xs: 12, sm: 6, md: 4 }}>
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ textTransform: 'uppercase', display: 'block', mb: 0.25 }}
          >
            {label}
          </Typography>
          <Typography variant={mono ? 'monoId' : 'body2'} fontWeight={600}>
            {value}
          </Typography>
        </Grid>
      ))}
    </Grid>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  detail: PersonDetail
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PersonProfileTab = ({ detail }: Props) => {
  const { hrContext, identityContext, accessContext, deliveryContext, member } = detail
  const [employmentDialogOpen, setEmploymentDialogOpen] = useState(false)
  const [hireDateDraft, setHireDateDraft] = useState('')
  const [hireDateOverride, setHireDateOverride] = useState<string | null>(null)
  const [savingEmployment, setSavingEmployment] = useState(false)
  const [employmentSaveError, setEmploymentSaveError] = useState<string | null>(null)

  const hasHr = !!hrContext
  const hasIdentityOrAccess = !!identityContext || !!accessContext
  const hasDelivery = !!deliveryContext
  const effectiveHireDate = hireDateOverride ?? hrContext?.hireDate ?? null

  const handleOpenEmploymentDialog = () => {
    setHireDateDraft(effectiveHireDate ?? '')
    setEmploymentSaveError(null)
    setEmploymentDialogOpen(true)
  }

  const handleCloseEmploymentDialog = () => {
    if (savingEmployment) {
      return
    }

    setEmploymentDialogOpen(false)
    setEmploymentSaveError(null)
  }

  const handleSaveEmployment = async () => {
    setSavingEmployment(true)
    setEmploymentSaveError(null)

    try {
      const response = await fetch(`/api/hr/core/members/${member.memberId}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hireDate: hireDateDraft || null
        })
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        const errorMessage =
          typeof payload?.error === 'string'
            ? payload.error
            : typeof payload?.message === 'string'
              ? payload.message
              : 'No se pudo guardar la fecha de ingreso.'

        throw new Error(errorMessage)
      }

      setHireDateOverride(typeof payload?.hireDate === 'string' || payload?.hireDate === null ? payload.hireDate : hireDateDraft || null)
      setEmploymentDialogOpen(false)
    } catch (error) {
      setEmploymentSaveError(error instanceof Error ? error.message : 'No se pudo guardar la fecha de ingreso.')
    } finally {
      setSavingEmployment(false)
    }
  }

  // ── Empty state ──
  if (!hasHr && !hasIdentityOrAccess && !hasDelivery) {
    return (
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardContent sx={{ py: 8, textAlign: 'center' }}>
          <Box role='status'>
            <i
              className='tabler-user-off'
              style={{ fontSize: 48, color: 'var(--mui-palette-text-disabled)' }}
              aria-hidden='true'
            />
            <Typography variant='h6' sx={{ mb: 1, mt: 2 }}>
              Sin datos de perfil
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Este colaborador aun no tiene contexto laboral, identidad ni actividad operativa registrados.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    )
  }

  // ── Build field lists ──

  const hrFields: FieldEntry[] = hrContext
    ? [
        { label: 'Departamento', value: hrContext.departmentName ?? '' },
        { label: 'Nivel de cargo', value: hrContext.jobLevel ?? '' },
        { label: 'Tipo de empleo', value: hrContext.employmentType ?? '' },
        { label: 'Tipo de contrato', value: hrContext.compensation?.contractType ?? '' },
        { label: 'Fecha de ingreso', value: formatDate(effectiveHireDate) },
        { label: 'Fin de contrato', value: formatDate(hrContext.contractEndDate) },
        { label: 'Supervisor', value: hrContext.supervisorName ?? '' },
        {
          label: 'Regimen de pago',
          value: formatPayRegime(hrContext.compensation?.payRegime, hrContext.compensation?.currency)
        }
      ]
    : []

  const identityFields: FieldEntry[] = []

  if (identityContext || accessContext) {
    if (hasValue(member.eoId)) {
      identityFields.push({ label: 'EO-ID', value: member.eoId!, mono: true })
    }

    if (identityContext && hasValue(identityContext.canonicalEmail)) {
      identityFields.push({ label: 'Email canonico', value: identityContext.canonicalEmail! })
    }

    if (accessContext && hasValue(accessContext.authMode)) {
      identityFields.push({ label: 'Auth mode', value: accessContext.authMode! })
    }

    if (accessContext?.lastLoginAt) {
      const rel = formatRelativeDate(accessContext.lastLoginAt)

      identityFields.push({ label: 'Ultimo acceso', value: rel.text })
    }
  }

  const lastLogin = accessContext ? formatRelativeDate(accessContext.lastLoginAt) : null

  return (
    <Grid container spacing={6}>
      {/* ── Section 1: Datos laborales ──────────────────────────────── */}
      {hasHr && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <Accordion defaultExpanded disableGutters elevation={0} aria-label='Datos laborales'>
              <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                <Stack direction='row' spacing={2} alignItems='center'>
                  <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
                    <i
                      className='tabler-briefcase'
                      style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }}
                      aria-hidden='true'
                    />
                  </Avatar>
                  <Box>
                    <Typography variant='h6'>Datos laborales</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Informacion contractual y organizacional
                    </Typography>
                  </Box>
                </Stack>
              </AccordionSummary>
              <Divider />
              <AccordionDetails sx={{ pt: 4 }}>
                <Stack spacing={4}>
                  <Stack direction='row' justifyContent='flex-end'>
                    <Button
                      size='small'
                      variant='tonal'
                      color='primary'
                      startIcon={<i className='tabler-edit' />}
                      onClick={handleOpenEmploymentDialog}
                    >
                      Editar ingreso
                    </Button>
                  </Stack>

                  <FieldGrid fields={hrFields} />
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Card>
        </Grid>
      )}

      {/* ── Section 2: Identidad y acceso ──────────────────────────── */}
      {hasIdentityOrAccess && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <Accordion defaultExpanded={false} disableGutters elevation={0} aria-label='Identidad y acceso'>
              <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                <Stack direction='row' spacing={2} alignItems='center'>
                  <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                    <i
                      className='tabler-fingerprint'
                      style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }}
                      aria-hidden='true'
                    />
                  </Avatar>
                  <Box>
                    <Typography variant='h6'>Identidad y acceso</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Perfil unificado, roles y permisos
                    </Typography>
                  </Box>
                </Stack>
              </AccordionSummary>
              <Divider />
              <AccordionDetails sx={{ pt: 4 }}>
                <Stack spacing={4}>
                  {/* Key-value fields */}
                  <Grid container spacing={4}>
                    {identityFields.map(({ label, value, mono }) => (
                      <Grid key={label} size={{ xs: 12, sm: 6, md: 4 }}>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                          sx={{ textTransform: 'uppercase', display: 'block', mb: 0.25 }}
                        >
                          {label}
                        </Typography>
                        <Typography
                          variant={mono ? 'monoId' : 'body2'}
                          fontWeight={600}
                          color={label === 'Ultimo acceso' && lastLogin?.muted ? 'text.disabled' : 'text.primary'}
                        >
                          {value}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>

                  {/* Roles */}
                  {accessContext && accessContext.roleCodes.length > 0 && (
                    <Box>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ textTransform: 'uppercase', display: 'block', mb: 1 }}
                      >
                        Roles
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                        {accessContext.roleCodes.map(role => (
                          <CustomChip
                            key={role}
                            round='true'
                            size='small'
                            variant='tonal'
                            color='primary'
                            label={role}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Route groups */}
                  {accessContext && accessContext.routeGroups.length > 0 && (
                    <Box>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ textTransform: 'uppercase', display: 'block', mb: 1 }}
                      >
                        Grupos de rutas
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                        {accessContext.routeGroups.map(group => (
                          <CustomChip
                            key={group}
                            round='true'
                            size='small'
                            variant='tonal'
                            color='secondary'
                            label={group}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Facets */}
                  {identityContext && (
                    <Box>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ textTransform: 'uppercase', display: 'block', mb: 1 }}
                      >
                        Facetas
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                        <CustomChip
                          round='true'
                          size='small'
                          variant='tonal'
                          color={identityContext.hasMemberFacet ? 'success' : 'secondary'}
                          icon={<i className='tabler-user' aria-hidden='true' />}
                          label='Miembro'
                        />
                        <CustomChip
                          round='true'
                          size='small'
                          variant='tonal'
                          color={identityContext.hasUserFacet ? 'success' : 'secondary'}
                          icon={<i className='tabler-key' aria-hidden='true' />}
                          label='Usuario'
                        />
                        <CustomChip
                          round='true'
                          size='small'
                          variant='tonal'
                          color={identityContext.hasCrmFacet ? 'success' : 'secondary'}
                          icon={<i className='tabler-address-book' aria-hidden='true' />}
                          label='CRM'
                        />
                      </Box>
                    </Box>
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Card>
        </Grid>
      )}

      {/* ── Section 3: Actividad operativa ─────────────────────────── */}
      {hasDelivery && deliveryContext && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <Accordion defaultExpanded={false} disableGutters elevation={0} aria-label='Actividad operativa'>
              <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                <Stack direction='row' spacing={2} alignItems='center'>
                  <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}>
                    <i
                      className='tabler-chart-dots'
                      style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }}
                      aria-hidden='true'
                    />
                  </Avatar>
                  <Box>
                    <Typography variant='h6'>Actividad operativa</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      Proyectos, tareas y metricas de delivery
                    </Typography>
                  </Box>
                </Stack>
              </AccordionSummary>
              <Divider />
              <AccordionDetails sx={{ pt: 4 }}>
                <Stack spacing={4}>
                  {/* KPI cards */}
                  <Grid container spacing={6}>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <HorizontalWithAvatar
                        stats={String(deliveryContext.projects.activeOwnedCount)}
                        title='Proyectos activos'
                        avatarIcon='tabler-folders'
                        avatarColor='success'
                      />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <HorizontalWithAvatar
                        stats={String(deliveryContext.tasks.active)}
                        title='Tareas activas'
                        avatarIcon='tabler-list-check'
                        avatarColor='info'
                      />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <HorizontalWithAvatar
                        stats={String(deliveryContext.tasks.completed30d)}
                        title='Completadas 30d'
                        avatarIcon='tabler-circle-check'
                        avatarColor='primary'
                      />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <HorizontalWithAvatar
                        stats={String(deliveryContext.tasks.overdue)}
                        title='Vencidas'
                        avatarIcon='tabler-alert-triangle'
                        avatarColor={deliveryContext.tasks.overdue > 0 ? 'error' : 'secondary'}
                      />
                    </Grid>
                  </Grid>

                  {/* Text metrics */}
                  <Grid container spacing={4}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ textTransform: 'uppercase', display: 'block', mb: 0.25 }}
                      >
                        RpA 30d
                      </Typography>
                      <Typography variant='body2' fontWeight={600}>
                        {deliveryContext.tasks.avgRpa30d != null
                          ? deliveryContext.tasks.avgRpa30d.toFixed(1)
                          : '\u2014'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ textTransform: 'uppercase', display: 'block', mb: 0.25 }}
                      >
                        Entrega a tiempo
                      </Typography>
                      <Typography variant='body2' fontWeight={600}>
                        {deliveryContext.tasks.onTimePct30d != null
                          ? `${Math.round(deliveryContext.tasks.onTimePct30d)}%`
                          : '\u2014'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ textTransform: 'uppercase', display: 'block', mb: 0.25 }}
                      >
                        Empresas CRM
                      </Typography>
                      <Typography variant='body2' fontWeight={600}>
                        {deliveryContext.crm.ownedCompanies}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ textTransform: 'uppercase', display: 'block', mb: 0.25 }}
                      >
                        Deals activos
                      </Typography>
                      <Typography variant='body2' fontWeight={600}>
                        {deliveryContext.crm.ownedDeals}
                      </Typography>
                    </Grid>
                  </Grid>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Card>
        </Grid>
      )}

      <Dialog open={employmentDialogOpen} onClose={handleCloseEmploymentDialog} maxWidth='xs' fullWidth>
        <DialogTitle>Editar fecha de ingreso</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Typography variant='body2' color='text.secondary'>
              Este dato se usa como referencia laboral del colaborador y también afecta reglas como vacaciones por antiguedad.
            </Typography>

            <TextField
              fullWidth
              size='small'
              label='Fecha de ingreso'
              type='date'
              value={hireDateDraft}
              onChange={event => setHireDateDraft(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />

            {employmentSaveError && <Alert severity='error'>{employmentSaveError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' onClick={handleCloseEmploymentDialog} disabled={savingEmployment}>
            Cancelar
          </Button>
          <Button variant='contained' onClick={handleSaveEmployment} disabled={savingEmployment}>
            {savingEmployment ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default PersonProfileTab
