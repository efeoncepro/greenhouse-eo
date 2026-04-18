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
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import type { ThemeColor } from '@core/types'

import { ExecutiveMiniStatCard } from '@/components/greenhouse'
import { GH_INTERNAL_MESSAGES } from '@/config/greenhouse-nomenclature'
import { GOVERNANCE_SECTIONS } from '@/lib/admin/view-access-catalog'
import type {
  EffectiveEntitlementRecord,
  EntitlementCatalogEntry,
  UserEntitlementOverrideRecord,
  UserEntitlementsAccessSummary
} from '@/lib/admin/entitlements-governance'
import type {
  EffectiveViewEntry,
  EffectiveViewSource,
  EffectiveViewsResponse,
  PermissionSetSummary,
  UserPermissionSetInfo
} from '@/types/permission-sets'

import { roleColorFor, roleIconFor, toTitleCase } from './helpers'

const SECTION_LABEL_MAP = new Map<string, string>(GOVERNANCE_SECTIONS.map(section => [section.key, section.label]))

const SOURCE_COLOR: Record<EffectiveViewSource, ThemeColor> = {
  role: 'primary',
  role_fallback: 'secondary',
  permission_set: 'info',
  user_override: 'warning'
}

const SOURCE_ICON: Record<EffectiveViewSource, string> = {
  role: 'tabler-shield-check',
  role_fallback: 'tabler-shield',
  permission_set: 'tabler-stack-2',
  user_override: 'tabler-adjustments'
}

const SOURCE_LABEL: Record<EffectiveViewSource, string> = {
  role: 'Rol',
  role_fallback: 'Rol por defecto',
  permission_set: 'Set de permisos',
  user_override: 'Ajuste manual'
}

const ENTITLEMENT_ORIGIN_COLOR: Record<EffectiveEntitlementRecord['originType'], ThemeColor> = {
  runtime_base: 'primary',
  role_default: 'info',
  user_override: 'warning'
}

const HOME_POLICY_OPTIONS = [
  { value: '', label: 'Usar política global' },
  { value: '/home', label: 'Home /home' },
  { value: '/finance', label: 'Finance /finance' },
  { value: '/hr/payroll', label: 'HR /hr/payroll' },
  { value: '/my', label: 'My /my' }
] as const

interface RoleAssignment {
  assignmentId: string
  roleCode: string
  roleName: string
  roleFamily: string | null
  active: boolean
  routeGroupScope: string[]
}

interface RolesResponse {
  userId: string
  currentAssignments: RoleAssignment[]
}

type Props = {
  userId: string
}

type UserEntitlementsResponse = UserEntitlementsAccessSummary

const RolesSection = ({ assignments, loading }: { assignments: RoleAssignment[]; loading: boolean }) => (
  <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
    <CardHeader
      title='Roles base'
      subheader='Revisa el rol asignado y los route groups que sostienen la herencia primaria.'
      avatar={
        <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity', color: 'primary.main' }}>
          <i className='tabler-shield-check' />
        </Avatar>
      }
    />
    <Divider />
    <CardContent>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : assignments.length === 0 ? (
        <Typography color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_user_access_no_roles}</Typography>
      ) : (
        <Stack spacing={3}>
          {assignments.map(assignment => (
            <Box key={assignment.assignmentId} sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                variant='tonal'
                color={roleColorFor(assignment.roleCode)}
                icon={<i className={roleIconFor(assignment.roleCode)} aria-hidden='true' />}
                label={assignment.roleName}
              />
              {assignment.routeGroupScope.map(group => (
                <Chip key={group} size='small' variant='outlined' label={toTitleCase(group)} />
              ))}
            </Box>
          ))}
        </Stack>
      )}
    </CardContent>
  </Card>
)

const PermissionSetsSection = ({ sets, loading }: { sets: UserPermissionSetInfo[]; loading: boolean }) => (
  <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
    <CardHeader
      title={GH_INTERNAL_MESSAGES.admin_user_access_sets_title}
      subheader={GH_INTERNAL_MESSAGES.admin_user_access_sets_description}
      avatar={
        <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity', color: 'info.main' }}>
          <i className='tabler-stack-2' />
        </Avatar>
      }
    />
    <Divider />
    <CardContent>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : sets.length === 0 ? (
        <Typography color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_user_access_no_sets}</Typography>
      ) : (
        <Grid container spacing={3}>
          {sets.map(ps => (
            <Grid key={ps.assignmentId} size={{ xs: 12, md: 6 }}>
              <Card
                elevation={0}
                sx={{
                  border: theme => `1px solid ${theme.palette.divider}`,
                  borderLeft: '4px solid',
                  borderLeftColor: 'info.main'
                }}
              >
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant='subtitle1' fontWeight={600}>
                      {ps.setName}
                    </Typography>
                    {ps.isSystem && <Chip size='small' variant='tonal' color='secondary' label='Sistema' />}
                  </Box>
                  {ps.description && (
                    <Typography variant='body2' color='text.secondary'>
                      {ps.description}
                    </Typography>
                  )}
                  <Typography variant='caption' color='text.disabled'>
                    {ps.viewCodes.length} {ps.viewCodes.length === 1 ? 'vista' : 'vistas'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </CardContent>
  </Card>
)

const EffectiveViewsSection = ({
  views,
  summary,
  loading
}: {
  views: EffectiveViewEntry[]
  summary: EffectiveViewsResponse['summary'] | null
  loading: boolean
}) => {
  const grouped = useMemo(() => {
    const map = new Map<string, EffectiveViewEntry[]>()

    for (const view of views) {
      const section = view.section || 'Otros'
      const list = map.get(section) ?? []

      list.push(view)
      map.set(section, list)
    }

    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'es'))
  }, [views])

  return (
    <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
      <CardHeader
        title='Vistas derivadas'
        subheader='Muestra qué vistas están activas hoy y desde dónde llegaron.'
        avatar={
          <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity', color: 'success.main' }}>
            <i className='tabler-eye-check' />
          </Avatar>
        }
      />
      <Divider />
      <CardContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Stack spacing={4}>
            {summary && (
              <Stack direction='row' gap={2} flexWrap='wrap'>
                <Chip variant='tonal' color='primary' label={`${summary.totalViews} vistas activas`} />
                <Chip size='small' variant='outlined' icon={<i className={SOURCE_ICON.role} aria-hidden='true' />} label={`${summary.fromRoles} desde roles`} />
                <Chip size='small' variant='outlined' icon={<i className={SOURCE_ICON.role_fallback} aria-hidden='true' />} label={`${summary.fromRoleFallback} heredadas`} />
                <Chip size='small' variant='outlined' icon={<i className={SOURCE_ICON.permission_set} aria-hidden='true' />} label={`${summary.fromPermissionSets} desde sets`} />
                <Chip size='small' variant='outlined' icon={<i className={SOURCE_ICON.user_override} aria-hidden='true' />} label={`${summary.fromOverrides} manuales`} />
              </Stack>
            )}

            {grouped.length === 0 ? (
              <Typography color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_user_access_no_views}</Typography>
            ) : (
              <Stack spacing={2.5}>
                {grouped.map(([section, sectionViews]) => (
                  <Box key={section}>
                    <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 1.5 }}>
                      <Typography variant='subtitle1' fontWeight={600}>
                        {SECTION_LABEL_MAP.get(section) ?? section}
                      </Typography>
                      <Chip size='small' variant='outlined' label={`${sectionViews.length}`} />
                    </Stack>
                    <Stack spacing={1}>
                      {sectionViews.map(view => (
                        <Box
                          key={view.viewCode}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 2,
                            py: 1,
                            px: 1.5,
                            borderRadius: 1,
                            border: theme => `1px solid ${theme.palette.divider}`
                          }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant='body2'>{view.label}</Typography>
                            <Typography variant='caption' color='text.disabled' sx={{ fontFamily: 'monospace' }}>
                              {view.viewCode}
                            </Typography>
                          </Box>
                          <Chip
                            size='small'
                            variant='tonal'
                            color={SOURCE_COLOR[view.source]}
                            icon={<i className={SOURCE_ICON[view.source]} aria-hidden='true' />}
                            label={view.sourceName || SOURCE_LABEL[view.source]}
                          />
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}

const EffectiveEntitlementsSection = ({
  rows,
  loading
}: {
  rows: EffectiveEntitlementRecord[]
  loading: boolean
}) => (
  <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
    <CardHeader
      title='Permisos efectivos'
      subheader='Explica capabilities, acciones, scope y origen operativo del acceso real.'
      avatar={
        <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity', color: 'info.main' }}>
          <i className='tabler-keyframe' />
        </Avatar>
      }
    />
    <Divider />
    <CardContent>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : rows.length === 0 ? (
        <Alert severity='info' variant='outlined'>
          No hay permisos efectivos resueltos para este usuario.
        </Alert>
      ) : (
        <TableContainer>
          <Table size='small' aria-label='Permisos efectivos del usuario'>
            <TableHead>
              <TableRow>
                <TableCell>Módulo</TableCell>
                <TableCell>Capability</TableCell>
                <TableCell>Acción</TableCell>
                <TableCell>Scope</TableCell>
                <TableCell>Origen</TableCell>
                <TableCell>Vigencia</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(row => (
                <TableRow key={`${row.capability}:${row.action}:${row.scope}`}>
                  <TableCell>{toTitleCase(row.module.replace('_', ' '))}</TableCell>
                  <TableCell>
                    <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {row.capability}
                    </Typography>
                  </TableCell>
                  <TableCell>{toTitleCase(row.action)}</TableCell>
                  <TableCell>{toTitleCase(row.scope)}</TableCell>
                  <TableCell>
                    <Chip size='small' variant='tonal' color={ENTITLEMENT_ORIGIN_COLOR[row.originType]} label={row.originLabel} />
                  </TableCell>
                  <TableCell>{row.expiresAt ? `Vence ${String(row.expiresAt).slice(0, 10)}` : 'Sin vencimiento'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </CardContent>
  </Card>
)

const OverridesSection = ({
  catalog,
  overrides,
  loading,
  saveError,
  saveSuccess,
  saving,
  selectedCapability,
  onCapabilityChange,
  selectedAction,
  onActionChange,
  selectedScope,
  onScopeChange,
  selectedEffect,
  onEffectChange,
  draftReason,
  onReasonChange,
  draftExpiresAt,
  onExpiresAtChange,
  onAddOverride,
  onRemoveOverride,
  onSave
}: {
  catalog: EntitlementCatalogEntry[]
  overrides: UserEntitlementOverrideRecord[]
  loading: boolean
  saveError: string | null
  saveSuccess: string | null
  saving: boolean
  selectedCapability: string
  onCapabilityChange: (value: string) => void
  selectedAction: string
  onActionChange: (value: string) => void
  selectedScope: string
  onScopeChange: (value: string) => void
  selectedEffect: 'grant' | 'revoke'
  onEffectChange: (value: 'grant' | 'revoke') => void
  draftReason: string
  onReasonChange: (value: string) => void
  draftExpiresAt: string
  onExpiresAtChange: (value: string) => void
  onAddOverride: () => void
  onRemoveOverride: (overrideId: string) => void
  onSave: () => void
}) => {
  const selectedDefinition = catalog.find(item => item.capability === selectedCapability) ?? null

  return (
    <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
      <CardHeader
        title='Overrides'
        subheader='Administra grants o revokes manuales con motivo y vencimiento.'
        avatar={
          <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity', color: 'warning.main' }}>
            <i className='tabler-adjustments' />
          </Avatar>
        }
      />
      <Divider />
      <CardContent>
        <Stack spacing={3}>
          {saveError && <Alert severity='error'>{saveError}</Alert>}
          {saveSuccess && <Alert severity='success'>{saveSuccess}</Alert>}

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label='Capability' value={selectedCapability} onChange={event => onCapabilityChange(event.target.value)}>
                {catalog.map(item => (
                  <MenuItem key={item.capability} value={item.capability}>
                    {item.capability}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField select fullWidth label='Acción' value={selectedAction} onChange={event => onActionChange(event.target.value)}>
                {(selectedDefinition?.actions ?? []).map(action => (
                  <MenuItem key={action} value={action}>
                    {toTitleCase(action)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField select fullWidth label='Scope' value={selectedScope} onChange={event => onScopeChange(event.target.value)}>
                <MenuItem value={selectedDefinition?.defaultScope ?? 'tenant'}>
                  {toTitleCase(selectedDefinition?.defaultScope ?? 'tenant')}
                </MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField select fullWidth label='Efecto' value={selectedEffect} onChange={event => onEffectChange(event.target.value as 'grant' | 'revoke')}>
                <MenuItem value='grant'>Grant</MenuItem>
                <MenuItem value='revoke'>Revoke</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField fullWidth label='Vence' type='datetime-local' value={draftExpiresAt} onChange={event => onExpiresAtChange(event.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, md: 9 }}>
              <TextField
                fullWidth
                label='Motivo'
                value={draftReason}
                onChange={event => onReasonChange(event.target.value)}
                helperText='Describe por qué esta excepción existe.'
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Button fullWidth variant='contained' onClick={onAddOverride}>
                Agregar excepción
              </Button>
            </Grid>
          </Grid>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : overrides.length === 0 ? (
            <Alert severity='info' variant='outlined'>
              No hay excepciones activas. Este usuario hereda el acceso desde su rol base.
            </Alert>
          ) : (
            <TableContainer>
              <Table size='small' aria-label='Overrides de entitlements'>
                <TableHead>
                  <TableRow>
                    <TableCell>Capability</TableCell>
                    <TableCell>Acción</TableCell>
                    <TableCell>Scope</TableCell>
                    <TableCell>Efecto</TableCell>
                    <TableCell>Motivo</TableCell>
                    <TableCell>Vigencia</TableCell>
                    <TableCell align='right'>Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {overrides.map(override => (
                    <TableRow key={override.overrideId}>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {override.capability}
                        </Typography>
                      </TableCell>
                      <TableCell>{toTitleCase(override.action)}</TableCell>
                      <TableCell>{toTitleCase(override.scope)}</TableCell>
                      <TableCell>
                        <Chip size='small' variant='tonal' color={override.effect === 'grant' ? 'success' : 'warning'} label={override.effect === 'grant' ? 'Grant' : 'Revoke'} />
                      </TableCell>
                      <TableCell>{override.reason}</TableCell>
                      <TableCell>{override.expiresAt ? `Vence ${String(override.expiresAt).slice(0, 10)}` : 'Sin vencimiento'}</TableCell>
                      <TableCell align='right'>
                        <IconButton aria-label='Quitar excepción' onClick={() => onRemoveOverride(override.overrideId)}>
                          <i className='tabler-trash' />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant='contained' onClick={onSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

const StartupPolicySection = ({
  data,
  saveError,
  saveSuccess,
  saving,
  draftPath,
  draftReason,
  onPathChange,
  onReasonChange,
  onSave
}: {
  data: UserEntitlementsResponse['startupPolicy'] | null
  saveError: string | null
  saveSuccess: string | null
  saving: boolean
  draftPath: string
  draftReason: string
  onPathChange: (value: string) => void
  onReasonChange: (value: string) => void
  onSave: () => void
}) => (
  <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
    <CardHeader
      title='Home de inicio'
      subheader='Conecta el resultado real con la política global y permite una excepción individual cuando haga falta.'
      avatar={
        <Avatar variant='rounded' sx={{ bgcolor: 'secondary.lightOpacity', color: 'secondary.main' }}>
          <i className='tabler-home' />
        </Avatar>
      }
    />
    <Divider />
    <CardContent>
      {!data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Stack spacing={3}>
          {saveError && <Alert severity='error'>{saveError}</Alert>}
          {saveSuccess && <Alert severity='success'>{saveSuccess}</Alert>}

          <Stack direction='row' spacing={1.5} flexWrap='wrap'>
            <Chip variant='tonal' color='primary' label={data.label} />
            <Chip size='small' variant='outlined' label={`Path efectivo: ${data.effectivePath}`} />
            <Chip
              size='small'
              variant='outlined'
              color={data.usesGlobalPolicy ? 'success' : 'warning'}
              label={data.usesGlobalPolicy ? 'Usa política global' : 'Tiene excepción individual'}
            />
          </Stack>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField select fullWidth label='Política de inicio' value={draftPath} onChange={event => onPathChange(event.target.value)}>
                {HOME_POLICY_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                label='Motivo del cambio'
                value={draftReason}
                onChange={event => onReasonChange(event.target.value)}
                helperText={data.usesGlobalPolicy ? 'Usa la política global de inicio.' : 'Tiene una excepción individual de inicio.'}
              />
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant='contained' onClick={onSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Cambiar política de inicio'}
            </Button>
          </Box>
        </Stack>
      )}
    </CardContent>
  </Card>
)

const UserAccessTab = ({ userId }: Props) => {
  const router = useRouter()
  const [roles, setRoles] = useState<RoleAssignment[]>([])
  const [permissionSets, setPermissionSets] = useState<UserPermissionSetInfo[]>([])
  const [effectiveViews, setEffectiveViews] = useState<EffectiveViewEntry[]>([])
  const [viewsSummary, setViewsSummary] = useState<EffectiveViewsResponse['summary'] | null>(null)
  const [entitlements, setEntitlements] = useState<UserEntitlementsResponse | null>(null)
  const [loadingRoles, setLoadingRoles] = useState(true)
  const [loadingViews, setLoadingViews] = useState(true)
  const [loadingEntitlements, setLoadingEntitlements] = useState(true)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [viewsError, setViewsError] = useState<string | null>(null)
  const [entitlementsError, setEntitlementsError] = useState<string | null>(null)
  const [overrideDrafts, setOverrideDrafts] = useState<UserEntitlementOverrideRecord[]>([])
  const [overrideCapability, setOverrideCapability] = useState('')
  const [overrideAction, setOverrideAction] = useState('')
  const [overrideScope, setOverrideScope] = useState('tenant')
  const [overrideEffect, setOverrideEffect] = useState<'grant' | 'revoke'>('grant')
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideExpiresAt, setOverrideExpiresAt] = useState('')
  const [overrideSaveError, setOverrideSaveError] = useState<string | null>(null)
  const [overrideSaveSuccess, setOverrideSaveSuccess] = useState<string | null>(null)
  const [savingOverrides, setSavingOverrides] = useState(false)
  const [startupPath, setStartupPath] = useState('')
  const [startupReason, setStartupReason] = useState('')
  const [startupSaveError, setStartupSaveError] = useState<string | null>(null)
  const [startupSaveSuccess, setStartupSaveSuccess] = useState<string | null>(null)
  const [savingStartupPolicy, setSavingStartupPolicy] = useState(false)

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await fetch(`/api/admin/team/roles/${userId}`)

        if (!response.ok) throw new Error('Error al cargar roles')

        const data: RolesResponse = await response.json()

        setRoles(data.currentAssignments)
      } catch {
        setRolesError('No se pudieron cargar los roles del usuario.')
      } finally {
        setLoadingRoles(false)
      }
    }

    const fetchViews = async () => {
      try {
        const [viewsResponse, setsResponse] = await Promise.all([
          fetch(`/api/admin/team/roles/${userId}/effective-views`),
          fetch('/api/admin/views/sets')
        ])

        if (!viewsResponse.ok) throw new Error('Error al cargar vistas efectivas')

        const viewsData: EffectiveViewsResponse = await viewsResponse.json()

        setEffectiveViews(viewsData.effectiveViews)
        setViewsSummary(viewsData.summary)

        const userSetIds = new Set(
          viewsData.effectiveViews
            .filter(view => view.source === 'permission_set' && view.sourceId)
            .map(view => view.sourceId!)
        )

        if (setsResponse.ok && userSetIds.size > 0) {
          const setsData: { sets: PermissionSetSummary[] } = await setsResponse.json()

          const userSets: UserPermissionSetInfo[] = (setsData.sets || [])
            .filter(set => userSetIds.has(set.setId))
            .map(set => ({
              setId: set.setId,
              setName: set.setName,
              description: set.description,
              section: set.section,
              viewCodes: set.viewCodes,
              isSystem: set.isSystem,
              active: set.active,
              assignmentId: set.setId,
              expiresAt: null,
              reason: null,
              assignedByUserId: null,
              assignedAt: set.createdAt
            }))

          setPermissionSets(userSets)
        } else {
          setPermissionSets([])
        }
      } catch {
        setViewsError('No se pudieron cargar las vistas efectivas.')
      } finally {
        setLoadingViews(false)
      }
    }

    const fetchEntitlements = async () => {
      try {
        const response = await fetch(`/api/admin/entitlements/users/${userId}`)

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null

          throw new Error(payload?.error || 'No se pudo cargar el acceso efectivo.')
        }

        const data: UserEntitlementsResponse = await response.json()

        setEntitlements(data)
        setOverrideDrafts(data.overrides)
        setStartupPath(data.startupPolicy.configuredPath || '')
      } catch (error) {
        setEntitlementsError(error instanceof Error ? error.message : 'No se pudo cargar el acceso efectivo.')
      } finally {
        setLoadingEntitlements(false)
      }
    }

    fetchRoles()
    fetchViews()
    fetchEntitlements()
  }, [userId])

  useEffect(() => {
    const firstCapability = entitlements?.catalog[0]

    if (!firstCapability) return

    setOverrideCapability(current => current || firstCapability.capability)
    setOverrideAction(current => current || firstCapability.actions[0] || 'read')
    setOverrideScope(current => current || firstCapability.defaultScope)
  }, [entitlements?.catalog])

  const activeCapabilityDefinition = useMemo(
    () => entitlements?.catalog.find(item => item.capability === overrideCapability) ?? entitlements?.catalog[0] ?? null,
    [entitlements?.catalog, overrideCapability]
  )

  useEffect(() => {
    if (!activeCapabilityDefinition) return

    if (!activeCapabilityDefinition.actions.includes(overrideAction as EntitlementCatalogEntry['actions'][number])) {
      setOverrideAction(activeCapabilityDefinition.actions[0] || 'read')
    }

    setOverrideScope(activeCapabilityDefinition.defaultScope)
  }, [activeCapabilityDefinition, overrideAction])

  const topRoleLabel = roles[0]?.roleName ?? 'Sin rol'

  const handleAddOverride = () => {
    if (!overrideCapability || !overrideAction || !overrideReason.trim()) {
      setOverrideSaveError('Completa capability, acción y motivo antes de agregar una excepción.')

      return
    }

    setOverrideSaveError(null)
    setOverrideSaveSuccess(null)

    const existingIndex = overrideDrafts.findIndex(
      override =>
        override.capability === overrideCapability &&
        override.action === overrideAction &&
        override.scope === overrideScope
    )

    const nextOverride: UserEntitlementOverrideRecord = {
      overrideId: existingIndex >= 0 ? overrideDrafts[existingIndex].overrideId : `draft:${overrideCapability}:${overrideAction}:${overrideScope}`,
      userId,
      capability: overrideCapability as UserEntitlementOverrideRecord['capability'],
      module: activeCapabilityDefinition?.module ?? 'admin',
      action: overrideAction as UserEntitlementOverrideRecord['action'],
      scope: overrideScope as UserEntitlementOverrideRecord['scope'],
      effect: overrideEffect,
      reason: overrideReason.trim(),
      expiresAt: overrideExpiresAt || null,
      updatedAt: new Date().toISOString()
    }

    setOverrideDrafts(current => {
      if (existingIndex >= 0) {
        return current.map((override, index) => (index === existingIndex ? nextOverride : override))
      }

      return [...current, nextOverride]
    })

    setOverrideReason('')
    setOverrideExpiresAt('')
  }

  const handleRemoveOverride = (overrideId: string) => {
    setOverrideDrafts(current => current.filter(override => override.overrideId !== overrideId))
    setOverrideSaveError(null)
    setOverrideSaveSuccess(null)
  }

  const handleSaveOverrides = async () => {
    setSavingOverrides(true)
    setOverrideSaveError(null)
    setOverrideSaveSuccess(null)

    try {
      const response = await fetch(`/api/admin/entitlements/users/${userId}/overrides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          overrides: overrideDrafts.map(override => ({
            capability: override.capability,
            action: override.action,
            scope: override.scope,
            effect: override.effect,
            reason: override.reason,
            expiresAt: override.expiresAt
          }))
        })
      })

      const payload = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudieron guardar las excepciones.')
      }

      setOverrideSaveSuccess('Las excepciones quedaron guardadas.')
      router.refresh()
    } catch (error) {
      setOverrideSaveError(error instanceof Error ? error.message : 'No se pudieron guardar las excepciones.')
    } finally {
      setSavingOverrides(false)
    }
  }

  const handleSaveStartupPolicy = async () => {
    if (!startupReason.trim()) {
      setStartupSaveError('Debes registrar una razón breve para cambiar la política de inicio.')

      return
    }

    setSavingStartupPolicy(true)
    setStartupSaveError(null)
    setStartupSaveSuccess(null)

    try {
      const response = await fetch(`/api/admin/entitlements/users/${userId}/startup-policy`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          portalHomePath: startupPath || null,
          reason: startupReason.trim()
        })
      })

      const payload = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo guardar la política de inicio.')
      }

      setStartupSaveSuccess(startupPath ? 'La excepción individual de inicio quedó guardada.' : 'La política volvió al modo global.')
      setStartupReason('')
      router.refresh()
    } catch (error) {
      setStartupSaveError(error instanceof Error ? error.message : 'No se pudo guardar la política de inicio.')
    } finally {
      setSavingStartupPolicy(false)
    }
  }

  return (
    <Grid container spacing={6}>
      {(rolesError || viewsError || entitlementsError) && (
        <Grid size={{ xs: 12 }}>
          <Stack spacing={2}>
            {rolesError && <Alert severity='error'>{rolesError}</Alert>}
            {viewsError && <Alert severity='error'>{viewsError}</Alert>}
            {entitlementsError && <Alert severity='error'>{entitlementsError}</Alert>}
          </Stack>
        </Grid>
      )}

      <Grid size={{ xs: 12 }}>
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
          }}
        >
          <ExecutiveMiniStatCard title='Rol base' value={topRoleLabel} detail='Rol que sostiene la herencia primaria del usuario' icon='tabler-shield-check' tone='info' />
          <ExecutiveMiniStatCard title='Módulos activos' value={String(entitlements?.summary.modulesActive ?? 0)} detail='Capabilities efectivas distribuidas por módulo' icon='tabler-layout-grid' tone='success' />
          <ExecutiveMiniStatCard title='Excepciones activas' value={String(overrideDrafts.length)} detail={overrideDrafts.length > 0 ? 'Hay grants o revokes manuales vigentes' : 'No hay excepciones activas'} icon='tabler-adjustments-horizontal' tone='warning' />
          <ExecutiveMiniStatCard title='Home de inicio' value={entitlements?.startupPolicy.effectivePath ?? '/home'} detail={entitlements?.startupPolicy.usesGlobalPolicy ? 'Usa política global' : 'Tiene excepción individual'} icon='tabler-home' tone='info' />
        </Box>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Alert severity='info' variant='outlined'>
          Revisa roles, vistas, permisos efectivos y excepciones activas. Desde aquí puedes explicar qué ve el usuario hoy y operar cambios puntuales sin tocar la política base global.
        </Alert>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <RolesSection assignments={roles} loading={loadingRoles} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <EffectiveViewsSection views={effectiveViews} summary={viewsSummary} loading={loadingViews} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <EffectiveEntitlementsSection rows={entitlements?.effectiveEntitlements ?? []} loading={loadingEntitlements} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <OverridesSection
          catalog={entitlements?.catalog ?? []}
          overrides={overrideDrafts}
          loading={loadingEntitlements}
          saveError={overrideSaveError}
          saveSuccess={overrideSaveSuccess}
          saving={savingOverrides}
          selectedCapability={overrideCapability}
          onCapabilityChange={setOverrideCapability}
          selectedAction={overrideAction}
          onActionChange={setOverrideAction}
          selectedScope={overrideScope}
          onScopeChange={setOverrideScope}
          selectedEffect={overrideEffect}
          onEffectChange={setOverrideEffect}
          draftReason={overrideReason}
          onReasonChange={setOverrideReason}
          draftExpiresAt={overrideExpiresAt}
          onExpiresAtChange={setOverrideExpiresAt}
          onAddOverride={handleAddOverride}
          onRemoveOverride={handleRemoveOverride}
          onSave={handleSaveOverrides}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <StartupPolicySection
          data={entitlements?.startupPolicy ?? null}
          saveError={startupSaveError}
          saveSuccess={startupSaveSuccess}
          saving={savingStartupPolicy}
          draftPath={startupPath}
          draftReason={startupReason}
          onPathChange={setStartupPath}
          onReasonChange={setStartupReason}
          onSave={handleSaveStartupPolicy}
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <PermissionSetsSection sets={permissionSets} loading={loadingViews} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Button component={Link} href='/admin/views' variant='text' size='small' endIcon={<i className='tabler-external-link' aria-hidden='true' />}>
            Ver política base
          </Button>
          <Typography variant='body2' color='text.secondary'>
            Si modificas el rol base, esta vista cambia antes que las excepciones individuales.
          </Typography>
        </Box>
      </Grid>
    </Grid>
  )
}

export default UserAccessTab
