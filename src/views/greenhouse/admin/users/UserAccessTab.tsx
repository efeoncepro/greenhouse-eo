'use client'

import { useEffect, useMemo, useState } from 'react'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import type { ThemeColor } from '@core/types'

import { GH_INTERNAL_MESSAGES } from '@/config/greenhouse-nomenclature'
import type {
  EffectiveViewEntry,
  EffectiveViewSource,
  EffectiveViewsResponse,
  UserPermissionSetInfo
} from '@/types/permission-sets'

import { roleColorFor, roleIconFor, toTitleCase } from './helpers'

// ── Types ──

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

interface Props {
  userId: string
}

// ── Source color mapping ──

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
  role_fallback: 'Rol (fallback)',
  permission_set: 'Set de permisos',
  user_override: 'Override'
}

// ── Section: Roles ──

const RolesSection = ({ assignments, loading }: { assignments: RoleAssignment[]; loading: boolean }) => (
  <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
    <CardHeader
      title={GH_INTERNAL_MESSAGES.admin_user_access_roles_title}
      subheader={GH_INTERNAL_MESSAGES.admin_user_access_roles_description}
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

// ── Section: Permission Sets ──

const PermissionSetsSection = ({
  sets,
  loading
}: {
  sets: UserPermissionSetInfo[]
  loading: boolean
}) => (
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
            <Grid key={ps.assignmentId} size={{ xs: 12, sm: 6 }}>
              <Card
                elevation={0}
                sx={{
                  border: theme => `1px solid ${theme.palette.divider}`,
                  borderLeft: '4px solid',
                  borderLeftColor: 'info.main'
                }}
              >
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant='subtitle1' fontWeight={600}>
                      {ps.setName}
                    </Typography>
                    {ps.isSystem && (
                      <Chip size='small' variant='tonal' color='secondary' label='Sistema' />
                    )}
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

// ── Section: Overrides ──

const OverridesSection = ({ overrides }: { overrides: EffectiveViewEntry[] }) => {
  if (overrides.length === 0) return null

  return (
    <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
      <CardHeader
        title={GH_INTERNAL_MESSAGES.admin_user_access_overrides_title}
        subheader={GH_INTERNAL_MESSAGES.admin_user_access_overrides_description}
        avatar={
          <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity', color: 'warning.main' }}>
            <i className='tabler-adjustments' />
          </Avatar>
        }
      />
      <Divider />
      <CardContent>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{GH_INTERNAL_MESSAGES.admin_user_access_col_view_code}</TableCell>
                <TableCell>{GH_INTERNAL_MESSAGES.admin_user_access_col_label}</TableCell>
                <TableCell>{GH_INTERNAL_MESSAGES.admin_user_access_col_source}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {overrides.map(view => (
                <TableRow key={view.viewCode}>
                  <TableCell>
                    <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {view.viewCode}
                    </Typography>
                  </TableCell>
                  <TableCell>{view.label}</TableCell>
                  <TableCell>
                    <Chip
                      size='small'
                      variant='tonal'
                      color='warning'
                      icon={<i className='tabler-adjustments' aria-hidden='true' />}
                      label={SOURCE_LABEL.user_override}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  )
}

// ── Section: Effective Views ──

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
        title={GH_INTERNAL_MESSAGES.admin_user_access_effective_title}
        subheader={GH_INTERNAL_MESSAGES.admin_user_access_effective_description}
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
                <Chip
                  variant='tonal'
                  color='primary'
                  label={`${summary.totalViews} vistas totales`}
                />
                <Chip
                  size='small'
                  variant='outlined'
                  icon={<i className={SOURCE_ICON.role} aria-hidden='true' />}
                  label={`${summary.fromRoles} desde roles`}
                />
                <Chip
                  size='small'
                  variant='outlined'
                  icon={<i className={SOURCE_ICON.role_fallback} aria-hidden='true' />}
                  label={`${summary.fromRoleFallback} fallback`}
                />
                <Chip
                  size='small'
                  variant='outlined'
                  icon={<i className={SOURCE_ICON.permission_set} aria-hidden='true' />}
                  label={`${summary.fromPermissionSets} desde sets`}
                />
                <Chip
                  size='small'
                  variant='outlined'
                  icon={<i className={SOURCE_ICON.user_override} aria-hidden='true' />}
                  label={`${summary.fromOverrides} overrides`}
                />
              </Stack>
            )}

            {grouped.length === 0 ? (
              <Typography color='text.secondary'>{GH_INTERNAL_MESSAGES.admin_user_access_no_views}</Typography>
            ) : (
              grouped.map(([section, sectionViews]) => (
                <Accordion key={section} defaultExpanded={grouped.length <= 5} disableGutters elevation={0}>
                  <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant='subtitle1' fontWeight={600}>
                        {section}
                      </Typography>
                      <Chip size='small' variant='outlined' label={`${sectionViews.length}`} />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={1}>
                      {sectionViews.map(view => (
                        <Box
                          key={view.viewCode}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 2,
                            py: 0.5,
                            px: 1,
                            borderRadius: 1,
                            '&:hover': { bgcolor: 'action.hover' }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                            <Typography variant='body2' noWrap>
                              {view.label}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.disabled'
                              sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                              noWrap
                            >
                              {view.viewCode}
                            </Typography>
                          </Box>
                          <Chip
                            size='small'
                            variant='tonal'
                            color={SOURCE_COLOR[view.source]}
                            icon={<i className={SOURCE_ICON[view.source]} aria-hidden='true' />}
                            label={view.sourceName || SOURCE_LABEL[view.source]}
                            sx={{ flexShrink: 0 }}
                          />
                        </Box>
                      ))}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main Component ──

const UserAccessTab = ({ userId }: Props) => {
  const [roles, setRoles] = useState<RoleAssignment[]>([])
  const [permissionSets, setPermissionSets] = useState<UserPermissionSetInfo[]>([])
  const [effectiveViews, setEffectiveViews] = useState<EffectiveViewEntry[]>([])
  const [summary, setSummary] = useState<EffectiveViewsResponse['summary'] | null>(null)
  const [loadingRoles, setLoadingRoles] = useState(true)
  const [loadingViews, setLoadingViews] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch(`/api/admin/team/roles/${userId}`)

        if (!res.ok) throw new Error('Error al cargar roles')

        const data: RolesResponse = await res.json()

        setRoles(data.currentAssignments)
      } catch {
        setError('No se pudieron cargar los roles del usuario.')
      } finally {
        setLoadingRoles(false)
      }
    }

    const fetchEffectiveViews = async () => {
      try {
        const res = await fetch(`/api/admin/team/roles/${userId}/effective-views`)

        if (!res.ok) throw new Error('Error al cargar vistas efectivas')

        const data: EffectiveViewsResponse = await res.json()

        setEffectiveViews(data.effectiveViews)
        setSummary(data.summary)

        // Derive permission set info from effective views
        const setMap = new Map<string, UserPermissionSetInfo>()

        for (const view of data.effectiveViews) {
          if (view.source === 'permission_set' && view.sourceId && !setMap.has(view.sourceId)) {
            setMap.set(view.sourceId, {
              setId: view.sourceId,
              setName: view.sourceName || view.sourceId,
              description: null,
              section: null,
              viewCodes: [],
              isSystem: false,
              active: true,
              assignmentId: '',
              expiresAt: null,
              reason: null,
              assignedByUserId: null,
              assignedAt: ''
            })
          }

          if (view.source === 'permission_set' && view.sourceId) {
            setMap.get(view.sourceId)?.viewCodes.push(view.viewCode)
          }
        }

        setPermissionSets(Array.from(setMap.values()))
      } catch {
        setError('No se pudieron cargar las vistas efectivas.')
      } finally {
        setLoadingViews(false)
      }
    }

    fetchRoles()
    fetchEffectiveViews()
  }, [userId])

  const overrideViews = useMemo(
    () => effectiveViews.filter(v => v.source === 'user_override'),
    [effectiveViews]
  )

  return (
    <Grid container spacing={6}>
      {error && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error'>{error}</Alert>
        </Grid>
      )}

      <Grid size={{ xs: 12 }}>
        <RolesSection assignments={roles} loading={loadingRoles} />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <PermissionSetsSection sets={permissionSets} loading={loadingViews} />
      </Grid>

      {overrideViews.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <OverridesSection overrides={overrideViews} />
        </Grid>
      )}

      <Grid size={{ xs: 12 }}>
        <EffectiveViewsSection views={effectiveViews} summary={summary} loading={loadingViews} />
      </Grid>
    </Grid>
  )
}

export default UserAccessTab
