'use client'

import { useEffect, useMemo, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { ExecutiveMiniStatCard } from '@/components/greenhouse'
import type { AdminGovernanceOverview } from '@/lib/admin/get-admin-view-access-governance'

type Props = {
  data: AdminGovernanceOverview
}

type RoleFilter = 'all' | 'efeonce_internal' | 'client'
type ActiveTab = 'permissions' | 'preview' | 'roadmap'

const SECTION_ACCENT: Record<string, 'primary' | 'info' | 'success' | 'warning' | 'secondary'> = {
  gestion: 'info',
  equipo: 'success',
  finanzas: 'warning',
  ia: 'secondary',
  administracion: 'primary',
  mi_ficha: 'secondary',
  cliente: 'success'
}

const AdminViewAccessGovernanceView = ({ data }: Props) => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ActiveTab>('permissions')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('efeonce_internal')
  const [sectionFilter, setSectionFilter] = useState<string>('all')
  const [previewUserId, setPreviewUserId] = useState<string>(data.users[0]?.userId ?? '')
  const [editableViews, setEditableViews] = useState(data.views)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEditableViews(data.views)
  }, [data.views])

  const isDirty = useMemo(() => {
    return JSON.stringify(editableViews.map(view => view.roleAccess)) !== JSON.stringify(data.views.map(view => view.roleAccess))
  }, [data.views, editableViews])

  const filteredRoles = useMemo(() => {
    if (roleFilter === 'all') return data.roles

    return data.roles.filter(role => role.tenantType === roleFilter)
  }, [data.roles, roleFilter])

  const filteredViews = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return editableViews.filter(view => {
      if (sectionFilter !== 'all' && view.section !== sectionFilter) return false
      if (!normalizedQuery) return true

      return [view.label, view.description, view.routePath, view.viewCode].some(value => value.toLowerCase().includes(normalizedQuery))
    })
  }, [editableViews, query, sectionFilter])

  const visibleSections = useMemo(
    () =>
      data.sections
        .map(section => ({
          ...section,
          views: filteredViews.filter(view => view.section === section.key)
        }))
        .filter(section => section.views.length > 0),
    [data.sections, filteredViews]
  )

  const previewUser = useMemo(
    () => data.users.find(user => user.userId === previewUserId) ?? data.users[0] ?? null,
    [data.users, previewUserId]
  )

  const previewViews = useMemo(() => {
    if (!previewUser) return []

    return editableViews.filter(view => {
      if (previewUser.routeGroups.includes(view.routeGroup)) return true
      if (previewUser.routeGroups.includes('admin')) return ['admin', 'finance', 'hr', 'people', 'ai_tooling', 'internal'].includes(view.routeGroup)
      if (view.routeGroup === 'people') return previewUser.roleCodes.includes('efeonce_operations') || previewUser.roleCodes.includes('hr_payroll')
      if (view.routeGroup === 'internal') return previewUser.routeGroups.includes('internal')

      return false
    })
  }, [editableViews, previewUser])

  const previewSections = useMemo(
    () =>
      data.sections
        .map(section => ({
          ...section,
          views: previewViews.filter(view => view.section === section.key)
        }))
        .filter(section => section.views.length > 0),
    [data.sections, previewViews]
  )

  const toggleRoleAccess = (viewCode: string, roleCode: string) => {
    setSaveError(null)
    setSaveSuccess(null)
    setEditableViews(current =>
      current.map(view =>
        view.viewCode === viewCode
          ? {
              ...view,
              roleAccess: {
                ...view.roleAccess,
                [roleCode]: !view.roleAccess[roleCode]
              },
              roleAccessSource: view.roleAccessSource
                ? {
                    ...view.roleAccessSource,
                    [roleCode]: 'persisted'
                  }
                : view.roleAccessSource
            }
          : view
      )
    )
  }

  const handleReset = () => {
    setEditableViews(data.views)
    setSaveError(null)
    setSaveSuccess(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(null)

    try {
      const assignments = editableViews.flatMap(view =>
        data.roles.map(role => ({
          roleCode: role.roleCode,
          viewCode: view.viewCode,
          granted: Boolean(view.roleAccess[role.roleCode])
        }))
      )

      const response = await fetch('/api/admin/views/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ assignments })
      })

      const payload = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudieron guardar los permisos.')
      }

      setSaveSuccess('La matriz quedó guardada en la configuración persistida de vistas.')
      router.refresh()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudieron guardar los permisos.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack spacing={6}>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent='space-between'>
          <Box>
            <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 1.5 }}>
              <Chip size='small' color='primary' variant='tonal' label='TASK-136' />
              <Chip size='small' variant='outlined' label='Baseline actual + UX slice' />
            </Stack>
            <Typography variant='h4' sx={{ mb: 1 }}>
              Vistas y acceso
            </Typography>
            <Typography color='text.secondary' sx={{ maxWidth: 920 }}>
              Admin Center necesita una capa legible para gobernar qué secciones del portal ve cada perfil. Esta primera
              superficie usa el baseline real actual de roles y route groups para exponer la matriz, probar la lectura del
              módulo y preparar el salto a permisos configurables por vista.
            </Typography>
          </Box>
          <Alert severity={data.persistence?.rolesWithPersistedAssignments ? 'success' : 'info'} variant='outlined' sx={{ maxWidth: 460 }}>
            {data.persistence?.rolesWithPersistedAssignments
              ? `Persistencia activa para ${data.persistence.rolesWithPersistedAssignments} rol(es). Overrides y cutover de sesión siguen pendientes.`
              : 'Esta pantalla ya puede guardar assignments por rol. Overrides, auditoría expandida y cutover de sesión siguen pendientes.'}
          </Alert>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
        }}
      >
        <ExecutiveMiniStatCard title='Vistas registradas' value={String(data.totals.registeredViews)} detail='Mapa inicial de superficies gobernables' icon='tabler-layout-grid' tone='info' />
        <ExecutiveMiniStatCard title='Roles configurados' value={String(data.totals.configuredRoles)} detail='Perfiles visibles en la matrix actual' icon='tabler-shield-lock' tone='info' />
        <ExecutiveMiniStatCard title='Usuarios para preview' value={String(data.totals.previewableUsers)} detail='Base actual para simular navegación' icon='tabler-user-search' tone='success' />
        <ExecutiveMiniStatCard title='Secciones cubiertas' value={String(data.totals.sections)} detail='Gestión, equipo, finanzas y administración' icon='tabler-layout-kanban' tone='warning' />
      </Box>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Tabs
              value={activeTab}
              onChange={(_, value: ActiveTab) => setActiveTab(value)}
              variant='scrollable'
              allowScrollButtonsMobile
            >
              <Tab value='permissions' label='Permisos' />
              <Tab value='preview' label='Preview' />
              <Tab value='roadmap' label='Siguiente slice' />
            </Tabs>

            {activeTab === 'permissions' ? (
              <Stack spacing={3}>
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ lg: 'center' }} justifyContent='space-between'>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap='wrap'>
                    <TextField
                      size='small'
                      label='Buscar vista'
                      placeholder='Nómina, Spaces, finanzas.dashboard...'
                      value={query}
                      onChange={event => setQuery(event.target.value)}
                      sx={{ minWidth: { xs: '100%', md: 320 } }}
                    />
                    <TextField
                      select
                      size='small'
                      label='Sección'
                      value={sectionFilter}
                      onChange={event => setSectionFilter(event.target.value)}
                      sx={{ minWidth: 180 }}
                    >
                      <MenuItem value='all'>Todas</MenuItem>
                      {data.sections.map(section => (
                        <MenuItem key={section.key} value={section.key}>
                          {section.label}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      size='small'
                      label='Roles visibles'
                      value={roleFilter}
                      onChange={event => setRoleFilter(event.target.value as RoleFilter)}
                      sx={{ minWidth: 220 }}
                    >
                      <MenuItem value='efeonce_internal'>Solo internos</MenuItem>
                      <MenuItem value='client'>Solo cliente</MenuItem>
                      <MenuItem value='all'>Todos</MenuItem>
                    </TextField>
                  </Stack>
                  <Stack direction='row' spacing={1} flexWrap='wrap'>
                    <Chip size='small' color='success' variant='tonal' label='Concedido' />
                    <Chip size='small' color='info' variant='outlined' label='Persistido' />
                    <Chip size='small' variant='outlined' label='Fallback hardcoded' />
                  </Stack>
                </Stack>

                {saveError ? <Alert severity='error'>{saveError}</Alert> : null}
                {saveSuccess ? <Alert severity='success'>{saveSuccess}</Alert> : null}

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent='space-between' alignItems={{ md: 'center' }}>
                  <Typography color='text.secondary'>
                    Haz click en una celda para conceder o revocar una vista por rol y luego guarda la matriz completa.
                  </Typography>
                  <Stack direction='row' spacing={1}>
                    <Button variant='outlined' onClick={handleReset} disabled={!isDirty || saving}>
                      Restablecer
                    </Button>
                    <Button variant='contained' onClick={handleSave} disabled={!isDirty || saving}>
                      {saving ? 'Guardando...' : 'Guardar matriz'}
                    </Button>
                  </Stack>
                </Stack>

                {visibleSections.map(section => (
                  <Card key={section.key} variant='outlined'>
                    <CardContent>
                      <Stack spacing={2.5}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }} justifyContent='space-between'>
                          <Box>
                            <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 0.75 }}>
                              <Chip size='small' color={SECTION_ACCENT[section.key] ?? 'primary'} variant='tonal' label={section.label} />
                              <Typography variant='body2' color='text.secondary'>
                                {section.views.length} vistas
                              </Typography>
                            </Stack>
                            <Typography color='text.secondary'>{section.description}</Typography>
                          </Box>
                        </Stack>

                        <Box sx={{ overflowX: 'auto' }}>
                          <Box component='table' sx={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                            <Box component='thead'>
                              <Box component='tr'>
                                <Box
                                  component='th'
                                  sx={{
                                    position: 'sticky',
                                    left: 0,
                                    zIndex: 2,
                                    textAlign: 'left',
                                    bgcolor: 'background.paper',
                                    p: 2,
                                    borderBottom: theme => `1px solid ${theme.palette.divider}`,
                                    minWidth: 280
                                  }}
                                >
                                  Vista
                                </Box>
                                {filteredRoles.map(role => (
                                  <Box
                                    key={role.roleCode}
                                    component='th'
                                    sx={{
                                      minWidth: 140,
                                      textAlign: 'center',
                                      p: 2,
                                      borderBottom: theme => `1px solid ${theme.palette.divider}`
                                    }}
                                  >
                                    <Stack spacing={0.5} alignItems='center'>
                                      <Typography variant='body2' color='text.primary'>
                                        {role.roleName}
                                      </Typography>
                                      <Typography variant='caption' color='text.secondary'>
                                        {role.roleCode}
                                      </Typography>
                                    </Stack>
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                            <Box component='tbody'>
                              {section.views.map(view => (
                                <Box component='tr' key={view.viewCode}>
                                  <Box
                                    component='td'
                                    sx={{
                                      position: 'sticky',
                                      left: 0,
                                      zIndex: 1,
                                      bgcolor: 'background.paper',
                                      p: 2,
                                      borderBottom: theme => `1px solid ${theme.palette.divider}`,
                                      verticalAlign: 'top'
                                    }}
                                  >
                                    <Stack spacing={1}>
                                      <Box>
                                        <Typography color='text.primary' className='font-medium'>
                                          {view.label}
                                        </Typography>
                                        <Typography variant='body2' color='text.secondary'>
                                          {view.description}
                                        </Typography>
                                      </Box>
                                      <Stack direction='row' spacing={1} flexWrap='wrap'>
                                        <Chip size='small' variant='outlined' label={view.routeGroup} />
                                        <Chip size='small' variant='outlined' label={view.routePath} component={Link} clickable href={view.routePath} />
                                      </Stack>
                                    </Stack>
                                  </Box>
                                  {filteredRoles.map(role => {
                                    const granted = view.roleAccess[role.roleCode]
                                    const accessSource = view.roleAccessSource?.[role.roleCode]

                                    return (
                                      <Box
                                        component='td'
                                        key={`${view.viewCode}-${role.roleCode}`}
                                        sx={{
                                          p: 2,
                                          borderBottom: theme => `1px solid ${theme.palette.divider}`,
                                          textAlign: 'center',
                                          verticalAlign: 'middle'
                                        }}
                                      >
                                        <Chip
                                          size='small'
                                          color={granted ? 'success' : 'default'}
                                          variant={granted ? 'tonal' : 'outlined'}
                                          label={granted ? 'Concedido' : 'Sin acceso'}
                                          aria-label={`${view.label} para ${role.roleName}: ${granted ? 'concedido' : 'sin acceso'}`}
                                          onClick={() => toggleRoleAccess(view.viewCode, role.roleCode)}
                                          clickable
                                          sx={{ cursor: 'pointer' }}
                                        />
                                        {accessSource ? (
                                          <Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 0.75 }}>
                                            {accessSource === 'persisted' ? 'Persistido' : 'Fallback'}
                                          </Typography>
                                        ) : null}
                                      </Box>
                                    )
                                  })}
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : null}

            {activeTab === 'preview' ? (
              <Stack spacing={3}>
                <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ lg: 'center' }} justifyContent='space-between'>
                  <Box sx={{ minWidth: { xs: '100%', lg: 380 } }}>
                    <TextField
                      select
                      fullWidth
                      size='small'
                      label='Seleccionar usuario'
                      value={previewUserId}
                      onChange={event => setPreviewUserId(event.target.value)}
                    >
                      {data.users.map(user => (
                        <MenuItem key={user.userId} value={user.userId}>
                          {user.fullName} · {user.email}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>
                  <Alert severity='info' variant='outlined'>
                    El preview usa la resolución actual del portal. Aquí medimos qué vería hoy ese usuario, antes de introducir overrides y asignación por vista.
                  </Alert>
                </Stack>

                {previewUser ? (
                  <Card variant='outlined'>
                    <CardContent>
                      <Stack spacing={3}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent='space-between'>
                          <Stack direction='row' spacing={2} alignItems='center'>
                            <Avatar>{previewUser.fullName.slice(0, 1).toUpperCase()}</Avatar>
                            <Box>
                              <Typography variant='h6'>{previewUser.fullName}</Typography>
                              <Typography color='text.secondary'>{previewUser.email}</Typography>
                            </Box>
                          </Stack>
                          <Stack direction='row' spacing={1} flexWrap='wrap'>
                            <Chip size='small' color='info' variant='tonal' label={previewUser.tenantType} />
                            <Chip size='small' variant='outlined' label={`${previewViews.length} vistas visibles`} />
                          </Stack>
                        </Stack>

                        <Stack spacing={1}>
                          <Typography variant='body2' color='text.secondary'>
                            Roles activos
                          </Typography>
                          <Stack direction='row' spacing={1} flexWrap='wrap'>
                            {previewUser.roleCodes.map(roleCode => (
                              <Chip key={roleCode} size='small' label={roleCode} variant='outlined' />
                            ))}
                          </Stack>
                        </Stack>

                        <Stack spacing={1}>
                          <Typography variant='body2' color='text.secondary'>
                            Route groups actuales
                          </Typography>
                          <Stack direction='row' spacing={1} flexWrap='wrap'>
                            {previewUser.routeGroups.map(routeGroup => (
                              <Chip key={routeGroup} size='small' color='success' variant='tonal' label={routeGroup} />
                            ))}
                          </Stack>
                        </Stack>

                        <Divider />

                        <Box
                          sx={{
                            display: 'grid',
                            gap: 3,
                            gridTemplateColumns: { xs: '1fr', xl: '340px minmax(0, 1fr)' }
                          }}
                        >
                          <Card variant='outlined'>
                            <CardContent>
                              <Stack spacing={2}>
                                <Typography variant='h6'>Sidebar simulada</Typography>
                                <Typography variant='body2' color='text.secondary'>
                                  Lectura resumida de lo que vería este usuario en navegación.
                                </Typography>
                                {previewSections.map(section => (
                                  <Stack key={section.key} spacing={1}>
                                    <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
                                      {section.label}
                                    </Typography>
                                    {section.views.map(view => (
                                      <Box
                                        key={view.viewCode}
                                        sx={{
                                          border: theme => `1px solid ${theme.palette.divider}`,
                                          borderRadius: 1,
                                          px: 1.5,
                                          py: 1
                                        }}
                                      >
                                        <Typography variant='body2'>{view.label}</Typography>
                                      </Box>
                                    ))}
                                  </Stack>
                                ))}
                              </Stack>
                            </CardContent>
                          </Card>

                          <Card variant='outlined'>
                            <CardContent>
                              <Stack spacing={2}>
                                <Typography variant='h6'>Detalle de vistas visibles</Typography>
                                <Typography variant='body2' color='text.secondary'>
                                  Baseline real actual. Cuando llegue la capa configurable, aquí aparecerá además la fuente de acceso: rol, override grant o revoke temporal.
                                </Typography>
                                {previewSections.map(section => (
                                  <Stack key={section.key} spacing={1.25}>
                                    <Stack direction='row' spacing={1} alignItems='center'>
                                      <Chip size='small' color={SECTION_ACCENT[section.key] ?? 'primary'} variant='tonal' label={section.label} />
                                      <Typography variant='body2' color='text.secondary'>
                                        {section.views.length} vistas
                                      </Typography>
                                    </Stack>
                                    {section.views.map(view => (
                                      <Box
                                        key={view.viewCode}
                                        sx={{
                                          border: theme => `1px solid ${theme.palette.divider}`,
                                          borderRadius: 1,
                                          p: 1.5
                                        }}
                                      >
                                        <Stack spacing={0.75}>
                                          <Typography color='text.primary' className='font-medium'>
                                            {view.label}
                                          </Typography>
                                          <Typography variant='body2' color='text.secondary'>
                                            {view.description}
                                          </Typography>
                                          <Stack direction='row' spacing={1} flexWrap='wrap'>
                                            <Chip size='small' variant='outlined' label={view.routePath} />
                                            <Chip size='small' color='success' variant='tonal' label='Baseline actual' />
                                          </Stack>
                                        </Stack>
                                      </Box>
                                    ))}
                                  </Stack>
                                ))}
                              </Stack>
                            </CardContent>
                          </Card>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ) : null}
              </Stack>
            ) : null}

            {activeTab === 'roadmap' ? (
              <Box
                sx={{
                  display: 'grid',
                  gap: 3,
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }
                }}
              >
                <Card variant='outlined'>
                  <CardContent>
                    <Stack spacing={2}>
                      <Chip size='small' color='warning' variant='tonal' label='Siguiente slice' />
                      <Typography variant='h6'>Overrides por usuario</Typography>
                      <Typography color='text.secondary'>
                        Grant o revoke temporal con razón obligatoria, expiración opcional y visibilidad inmediata para el operador.
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
                <Card variant='outlined'>
                  <CardContent>
                    <Stack spacing={2}>
                      <Chip size='small' color='warning' variant='tonal' label='Siguiente slice' />
                      <Typography variant='h6'>Persistencia configurable</Typography>
                      <Typography color='text.secondary'>
                        Reemplazar el mapping hardcoded por `view_registry`, `role_view_assignments` y resolución híbrida con fallback seguro.
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
                <Card variant='outlined'>
                  <CardContent>
                    <Stack spacing={2}>
                      <Chip size='small' color='warning' variant='tonal' label='Siguiente slice' />
                      <Typography variant='h6'>Auditoría y notificación</Typography>
                      <Typography color='text.secondary'>
                        Historial de cambios, outbox `identity.view_access.changed` y aviso al usuario afectado cuando cambie su acceso.
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default AdminViewAccessGovernanceView
