'use client'

import Link from 'next/link'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import HorizontalWithAvatar from '@components/card-statistics/HorizontalWithAvatar'

import type { PersonAccessContext, PersonIdentityContext } from '@/types/people'
import type { PersonDeliveryContext } from '@/lib/person-360/get-person-delivery'
import type { PersonHrContext } from '@/lib/person-360/get-person-hr'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (iso: string | null): string => {
  if (!iso) return '—'

  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

const formatLastLogin = (iso: string | null): { text: string; muted: boolean } => {
  if (!iso) return { text: 'Nunca', muted: true }

  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) return { text: 'Nunca', muted: true }

  return { text: date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }), muted: false }
}

const formatPayRegime = (regime: string | null, currency: string | null): string => {
  if (!regime && !currency) return '—'

  const label = regime ? regime.charAt(0).toUpperCase() + regime.slice(1) : ''

  return currency ? `${label} (${currency})`.trim() : label
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const KeyValue = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Grid size={{ xs: 12, sm: 6 }}>
    <Typography variant='body2' color='text.secondary' sx={{ mb: 0.5 }}>
      {label}
    </Typography>
    {children}
  </Grid>
)

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
    {children}
  </Typography>
)

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  identityContext: PersonIdentityContext | null
  accessContext: PersonAccessContext | null
  eoId: string | null
  hrContext?: PersonHrContext | null
  deliveryContext?: PersonDeliveryContext | null
  memberId?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PersonIdentityTab = ({ identityContext, accessContext, eoId, hrContext, deliveryContext, memberId }: Props) => {
  // Empty state — no context available at all
  if (!identityContext && !accessContext && !hrContext && !deliveryContext) {
    return (
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardContent sx={{ py: 8, textAlign: 'center' }}>
          <Box role='status'>
            <i
              className='tabler-fingerprint-off'
              style={{ fontSize: 48, color: 'var(--mui-palette-text-disabled)' }}
              aria-hidden='true'
            />
            <Typography variant='h6' sx={{ mb: 1, mt: 2 }}>
              Sin contexto de identidad
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Este colaborador aún no tiene un perfil unificado en Person 360.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    )
  }

  const lastLogin = accessContext ? formatLastLogin(accessContext.lastLoginAt) : null

  return (
    <Grid container spacing={6}>
      {/* ── Card 1 — Identidad ────────────────────────────────────────── */}
      {identityContext && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Identidad'
              subheader='Perfil unificado del colaborador'
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                  <i className='tabler-fingerprint' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} aria-hidden='true' />
                </Avatar>
              }
            />
            <Divider />
            <CardContent>
              <Grid container spacing={4}>
                {/* Key-value pairs */}
                <KeyValue label='EO-ID'>
                  <Typography variant='body1' fontWeight={600}>
                    {identityContext.eoId ?? '—'}
                  </Typography>
                </KeyValue>

                <KeyValue label='Email canónico'>
                  <Typography variant='body1' fontWeight={600}>
                    {identityContext.canonicalEmail ?? '—'}
                  </Typography>
                </KeyValue>

                <KeyValue label='Sistema primario'>
                  <Typography variant='body1' fontWeight={600}>
                    {identityContext.primarySourceSystem ?? '—'}
                  </Typography>
                </KeyValue>

                <KeyValue label='Modo de autenticación'>
                  <Typography variant='body1' fontWeight={600}>
                    {identityContext.defaultAuthMode ?? '—'}
                  </Typography>
                </KeyValue>

                <KeyValue label='Vínculos de origen'>
                  <Typography variant='body1' fontWeight={600}>
                    {identityContext.sourceLinkCount}
                  </Typography>
                </KeyValue>

                <KeyValue label='Usuarios vinculados'>
                  <Typography variant='body1' fontWeight={600}>
                    {identityContext.userCount}
                  </Typography>
                </KeyValue>

                {/* Facetas */}
                <Grid size={{ xs: 12 }}>
                  <SectionLabel>Facetas</SectionLabel>
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
                </Grid>

                {/* Sistemas vinculados */}
                {identityContext.linkedSystems.length > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <SectionLabel>Sistemas vinculados</SectionLabel>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                      {identityContext.linkedSystems.map(system => (
                        <CustomChip
                          key={system}
                          round='true'
                          size='small'
                          variant='tonal'
                          color='info'
                          label={system}
                        />
                      ))}
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* ── Card 2 — Acceso al portal ─────────────────────────────────── */}
      {accessContext && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Acceso al portal'
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                  <i className='tabler-shield-lock' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} aria-hidden='true' />
                </Avatar>
              }
              action={
                accessContext.canOpenAdminUser && eoId ? (
                  <Button
                    component={Link}
                    href={`/admin/users/${eoId}`}
                    variant='tonal'
                    size='small'
                    color='primary'
                    startIcon={<i className='tabler-external-link' aria-hidden='true' />}
                  >
                    Administrar usuario
                  </Button>
                ) : undefined
              }
            />
            <Divider />
            <CardContent>
              <Grid container spacing={4}>
                <KeyValue label='Estado'>
                  <Box>
                    <CustomChip
                      round='true'
                      size='small'
                      variant='tonal'
                      color={accessContext.active ? 'success' : 'error'}
                      label={accessContext.active ? 'Activo' : 'Inactivo'}
                    />
                  </Box>
                </KeyValue>

                <KeyValue label='Autenticación'>
                  <Typography variant='body1' fontWeight={600}>
                    {accessContext.authMode ?? '—'}
                  </Typography>
                </KeyValue>

                <KeyValue label='Último acceso'>
                  <Typography
                    variant='body1'
                    fontWeight={600}
                    color={lastLogin?.muted ? 'text.disabled' : 'text.primary'}
                  >
                    {lastLogin?.text}
                  </Typography>
                </KeyValue>

                <KeyValue label='Ruta de inicio'>
                  <Typography variant='body1' fontWeight={600}>
                    {accessContext.defaultPortalHomePath ?? '—'}
                  </Typography>
                </KeyValue>

                {/* Roles */}
                {accessContext.roleCodes.length > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <SectionLabel>Roles</SectionLabel>
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
                  </Grid>
                )}

                {/* Grupos de rutas */}
                {accessContext.routeGroups.length > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <SectionLabel>Grupos de rutas</SectionLabel>
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
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* ── Card 3 — Perfil laboral ──────────────────────────────────── */}
      {hrContext && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Perfil laboral'
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
                  <i className='tabler-briefcase' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} aria-hidden='true' />
                </Avatar>
              }
              action={
                memberId ? (
                  <Button
                    component={Link}
                    href={`?tab=hr-profile`}
                    variant='tonal'
                    size='small'
                    color='secondary'
                    startIcon={<i className='tabler-arrow-right' aria-hidden='true' />}
                  >
                    Ver perfil HR
                  </Button>
                ) : undefined
              }
            />
            <Divider />
            <CardContent>
              <Grid container spacing={4}>
                <KeyValue label='Departamento'>
                  <Typography variant='body1' fontWeight={600}>
                    {hrContext.departmentName ?? '—'}
                  </Typography>
                </KeyValue>

                <KeyValue label='Nivel de cargo'>
                  <Typography variant='body1' fontWeight={600}>
                    {hrContext.jobLevel ?? '—'}
                  </Typography>
                </KeyValue>

                <KeyValue label='Tipo de empleo'>
                  <Typography variant='body1' fontWeight={600}>
                    {hrContext.employmentType ?? '—'}
                  </Typography>
                </KeyValue>

                <KeyValue label='Tipo de contrato'>
                  <Typography variant='body1' fontWeight={600}>
                    {hrContext.compensation?.contractType ?? '—'}
                  </Typography>
                </KeyValue>

                <KeyValue label='Fecha de ingreso'>
                  <Typography variant='body1' fontWeight={600}>
                    {formatDate(hrContext.hireDate)}
                  </Typography>
                </KeyValue>

                <KeyValue label='Fin de contrato'>
                  <Typography variant='body1' fontWeight={600}>
                    {formatDate(hrContext.contractEndDate)}
                  </Typography>
                </KeyValue>

                <KeyValue label='Supervisor'>
                  <Typography variant='body1' fontWeight={600}>
                    {hrContext.supervisorName ?? '—'}
                  </Typography>
                </KeyValue>

                <KeyValue label='Régimen de pago'>
                  <Typography variant='body1' fontWeight={600}>
                    {formatPayRegime(hrContext.compensation?.payRegime ?? null, hrContext.compensation?.currency ?? null)}
                  </Typography>
                </KeyValue>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* ── Card 4 — Actividad operativa ─────────────────────────────── */}
      {deliveryContext && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Actividad operativa'
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}>
                  <i className='tabler-chart-dots' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} aria-hidden='true' />
                </Avatar>
              }
            />
            <Divider />
            <CardContent>
              <Grid container spacing={6}>
                {/* KPI row */}
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

                {/* Performance + CRM row */}
                <KeyValue label='RpA promedio 30d'>
                  <Typography variant='body1' fontWeight={600}>
                    {deliveryContext.tasks.avgRpa30d != null ? deliveryContext.tasks.avgRpa30d.toFixed(1) : '—'}
                  </Typography>
                </KeyValue>

                <KeyValue label='Entrega a tiempo 30d'>
                  <Typography variant='body1' fontWeight={600}>
                    {deliveryContext.tasks.onTimePct30d != null ? `${Math.round(deliveryContext.tasks.onTimePct30d)}%` : '—'}
                  </Typography>
                </KeyValue>

                <KeyValue label='Empresas CRM'>
                  <Typography variant='body1' fontWeight={600}>
                    {deliveryContext.crm.ownedCompanies}
                  </Typography>
                </KeyValue>

                <KeyValue label='Deals activos'>
                  <Typography variant='body1' fontWeight={600}>
                    {deliveryContext.crm.ownedDeals}
                  </Typography>
                </KeyValue>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default PersonIdentityTab
