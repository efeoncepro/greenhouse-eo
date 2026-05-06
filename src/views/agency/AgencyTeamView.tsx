'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
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
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import { getMicrocopy } from '@/lib/copy'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import TablePaginationComponent from '@components/TablePaginationComponent'
import { fuzzyFilter } from '@/components/tableUtils'

import EditAssignmentDrawer from './drawers/EditAssignmentDrawer'
import AssignMemberDrawer from './drawers/AssignMemberDrawer'
import type { AssignmentToEdit } from './drawers/EditAssignmentDrawer'

import tableStyles from '@core/styles/table.module.css'

const GREENHOUSE_COPY = getMicrocopy()

// ── Types ──

interface MemberAssignment {
  assignmentId: string
  clientId: string | null
  clientName: string | null
  fteAllocation: number
  hoursPerMonth: number
  startDate: string | null
  assignmentType?: string
  placementId?: string | null
  placementStatus?: string | null
}

interface CapacityBreakdown {
  contractedHoursMonth: number
  assignedHoursMonth: number
  usedHoursMonth: number | null
  availableHoursMonth: number
  commercialAvailabilityHours?: number
  operationalAvailabilityHours?: number | null
  overcommitted: boolean
}

interface TeamMember {
  memberId: string
  displayName: string
  roleTitle: string | null
  assignable?: boolean
  fteAllocation: number
  usageKind: 'none' | 'hours' | 'percent' | string
  usagePercent: number | null
  capacityHealth: string
  capacity: CapacityBreakdown
  assignments?: MemberAssignment[]
  intelligence?: {
    costPerHour: number | null
    suggestedBillRate: number | null
    targetCurrency: string | null
  } | null
}

interface TeamData {
  team: CapacityBreakdown & {
    usageKind?: 'none' | 'hours' | 'percent' | string
    usagePercent?: number | null
  }
  members: TeamMember[]
  excludedMembers?: TeamMember[]
  memberCount: number
  excludedCount?: number
  hasOperationalMetrics: boolean
  overcommittedCount: number
  overcommittedMembers: Array<{ displayName: string; deficit: number }>
}

// ── Constants ──

const HEALTH_COLORS: Record<string, 'secondary' | 'success' | 'warning' | 'error'> = {
  idle: 'secondary', balanced: 'success', high: 'warning', overloaded: 'error'
}

const HEALTH_LABELS: Record<string, string> = {
  idle: 'Disponible', balanced: 'Balanceado', high: 'Dedicación completa', overloaded: 'Sobrecomprometido'
}

const PLACEMENT_STATUS_LABELS: Record<string, string> = {
  pipeline: 'Pipeline',
  onboarding: 'Onboarding',
  active: 'Activo',
  renewal_pending: 'Renovación',
  renewed: 'Renovado',
  ended: 'Cerrado'
}

const PLACEMENT_STATUS_COLORS: Record<string, 'secondary' | 'info' | 'success' | 'warning' | 'primary' | 'error'> = {
  pipeline: 'secondary',
  onboarding: 'info',
  active: 'success',
  renewal_pending: 'warning',
  renewed: 'primary',
  ended: 'error'
}

const formatHours = (value: number | null) => (value === null ? '—' : `${value}h`)

const formatUsage = (usageKind: string | undefined, usedHours: number | null, usagePercent: number | null) => {
  if (usageKind === 'hours') return formatHours(usedHours)
  if (usageKind === 'percent' && usagePercent !== null) return `${usagePercent}%`

  return '—'
}

const getUsageSubtitle = (usageKind: string | undefined, hasOperationalMetrics: boolean) => {
  if (!hasOperationalMetrics || usageKind === 'none') return 'Sin métricas operativas'
  if (usageKind === 'hours') return 'Horas efectivas'
  if (usageKind === 'percent') return 'Índice operativo'

  return 'Uso operativo'
}

// ── Component ──

const AgencyTeamView = () => {
  const [data, setData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'displayName', desc: false }])

  // Drawer state
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [editMemberName, setEditMemberName] = useState('')
  const [editAssignment, setEditAssignment] = useState<AssignmentToEdit | null>(null)
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false)

  // Unassign confirmation dialog
  const [unassignTarget, setUnassignTarget] = useState<{ assignmentId: string; memberName: string; clientName: string } | null>(null)
  const [unassigning, setUnassigning] = useState(false)

  // Excluded members section
  const [showExcluded, setShowExcluded] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/agency/team', {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000)
      })

      if (res.ok) setData(await res.json())
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const toggleAssignable = useCallback(async (memberId: string, assignable: boolean) => {
    try {
      await fetch(`/api/admin/team/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignable })
      })

      void load()
    } catch {
      // silent
    }
  }, [load])

  const members = useMemo(() => data?.members ?? [], [data])

  const handleEditAssignment = useCallback((member: TeamMember, assignment: MemberAssignment) => {
    setEditMemberName(member.displayName)
    setEditAssignment({
      assignmentId: assignment.assignmentId,
      clientId: assignment.clientId,
      clientName: assignment.clientName,
      fteAllocation: assignment.fteAllocation,
      hoursPerMonth: assignment.hoursPerMonth,
      startDate: assignment.startDate
    })
    setEditDrawerOpen(true)
  }, [])

  const handleUnassign = async () => {
    if (!unassignTarget) return

    setUnassigning(true)

    try {
      await fetch(`/api/admin/team/assignments/${unassignTarget.assignmentId}`, { method: 'DELETE' })
    } finally {
      setUnassigning(false)
      setUnassignTarget(null)
      void load()
    }
  }

  const existingMembersForDrawer = useMemo(() =>
    members.map(m => ({
      memberId: m.memberId,
      displayName: m.displayName,
      roleTitle: m.roleTitle,
      contractedHours: m.capacity.contractedHoursMonth,
      assignedHours: m.capacity.assignedHoursMonth,
      availableHours: m.capacity.availableHoursMonth
    })), [members])

  // ── Table columns ──

  const columnHelper = createColumnHelper<TeamMember>()

   
  const columns: ColumnDef<TeamMember, any>[] = useMemo(() => [
    columnHelper.display({
      id: 'expander',
      header: '',
      cell: ({ row }) => {
        const hasMultiple = (row.original.assignments?.length ?? 0) > 0

        return hasMultiple ? (
          <IconButton size='small' onClick={row.getToggleExpandedHandler()} sx={{ p: 0.5 }}>
            <i className={row.getIsExpanded() ? 'tabler-chevron-down' : 'tabler-chevron-right'} style={{ fontSize: 16 }} />
          </IconButton>
        ) : null
      },
      size: 36
    }),
    columnHelper.accessor('displayName', {
      header: 'Nombre',
      cell: ({ getValue }) => <Typography variant='body2' fontWeight={600}>{getValue()}</Typography>
    }),
    columnHelper.accessor('roleTitle', {
      header: 'Rol',
      cell: ({ getValue }) => <Typography variant='caption' color='text.secondary'>{getValue() || '—'}</Typography>
    }),
    columnHelper.accessor('fteAllocation', {
      header: 'FTE',
      cell: ({ getValue }) => getValue().toFixed(1),
      meta: { align: 'right' }
    }),
    columnHelper.accessor(row => row.capacity.contractedHoursMonth, {
      id: 'contracted',
      header: 'Contratadas',
      cell: ({ getValue }) => `${getValue()}h`,
      meta: { align: 'right' }
    }),
    columnHelper.accessor(row => row.capacity.assignedHoursMonth, {
      id: 'assigned',
      header: 'Asignadas',
      cell: ({ getValue }) => `${getValue()}h`,
      meta: { align: 'right' }
    }),
    columnHelper.accessor(row => row.capacity.usedHoursMonth, {
      id: 'used',
      header: 'Uso operativo',
      cell: ({ row }) => formatUsage(row.original.usageKind, row.original.capacity.usedHoursMonth, row.original.usagePercent),
      meta: { align: 'right' }
    }),
    columnHelper.accessor(row => row.capacity.availableHoursMonth, {
      id: 'available',
      header: 'Disponibles',
      cell: ({ getValue }) => {
        const v = getValue() as number

        return <Typography color={v < 0 ? 'error.main' : 'text.primary'}>{v}h</Typography>
      },
      meta: { align: 'right' }
    }),
    columnHelper.accessor('capacityHealth', {
      header: 'Estado',
      cell: ({ getValue }) => {
        const h = getValue()

        return <CustomChip round='true' size='small' variant='tonal' color={HEALTH_COLORS[h] || 'secondary'} label={HEALTH_LABELS[h] || h} />
      },
      meta: { align: 'center' }
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const m = row.original
        const primaryAssignment = m.assignments?.[0]

        return (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
            {primaryAssignment && (
              <>
                <Tooltip title='Editar asignación'>
                  <IconButton size='small' onClick={() => handleEditAssignment(m, primaryAssignment)}>
                    <i className='tabler-edit' style={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title='Desasignar'>
                  <IconButton
                    size='small'
                    color='error'
                    onClick={() => setUnassignTarget({
                      assignmentId: primaryAssignment.assignmentId,
                  memberName: m.displayName,
                  clientName: primaryAssignment.clientName || 'cliente'
                })}
              >
                <i className='tabler-user-minus' style={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
              </>
            )}
            <Tooltip title='Excluir del equipo'>
              <IconButton size='small' onClick={() => toggleAssignable(m.memberId, false)}>
                <i className='tabler-eye-off' style={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )
      },
      size: 120,
      meta: { align: 'right' }
    })
  ], [columnHelper, handleEditAssignment, setUnassignTarget, toggleAssignable])

  const table = useReactTable({
    data: members,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: fuzzyFilter,
    getRowCanExpand: row => (row.original.assignments?.length ?? 0) > 1,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel()
  })

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>

  if (!data) return <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}><Box sx={{ textAlign: 'center', py: 6 }}><Typography variant='h6'>Sin datos de capacidad</Typography></Box></Card>

  const healthCounts = data.members.reduce((acc, m) => { acc[m.capacityHealth] = (acc[m.capacityHealth] || 0) + 1;

return acc }, {} as Record<string, number>)

  const colCount = columns.length

  return (
    <>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader title='Equipo' subheader={`${data.memberCount} personas · Capacidad y dedicación`} avatar={<Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}><i className='tabler-users-group' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} /></Avatar>} />
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle title='Contratadas' stats={`${data.team.contractedHoursMonth}h`} avatarIcon='tabler-file-certificate' avatarColor='primary' subtitle='Horas contrato/mes' />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle title='Asignadas' stats={`${data.team.assignedHoursMonth}h`} avatarIcon='tabler-clock' avatarColor='info' subtitle='Carga cliente comprometida' />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Uso operativo'
            stats={formatUsage(data.team.usageKind, data.team.usedHoursMonth, data.team.usagePercent ?? null)}
            avatarIcon='tabler-bolt'
            avatarColor='warning'
            subtitle={getUsageSubtitle(data.team.usageKind, data.hasOperationalMetrics)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Disponible comercial'
            stats={`${data.team.availableHoursMonth}h`}
            avatarIcon='tabler-calendar-stats'
            avatarColor={data.team.availableHoursMonth < 0 ? 'error' : 'success'}
            subtitle={data.team.overcommitted ? 'Sobrecomprometido' : 'Capacidad libre'}
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {['idle', 'balanced', 'high', 'overloaded'].map(h => (
              <CustomChip key={h} round='true' variant='tonal' color={HEALTH_COLORS[h]} label={`${HEALTH_LABELS[h]}: ${healthCounts[h] || 0}`} />
            ))}
          </Box>
        </Grid>

        {data.overcommittedCount > 0 && (
          <Grid size={{ xs: 12 }}>
            <Alert severity='error' variant='outlined'>
              <strong>{data.overcommittedCount} sobrecargado{data.overcommittedCount !== 1 ? 's' : ''}:</strong>{' '}
              {data.overcommittedMembers.map(m => `${m.displayName} (${m.deficit}h)`).join(', ')}
            </Alert>
          </Grid>
        )}

        {!data.hasOperationalMetrics && (
          <Grid size={{ xs: 12 }}>
            <Alert severity='info' variant='outlined'>
              El uso operativo aún no tiene una fuente horaria defendible en este entorno. La carga comprometida excluye Efeonce interno y no reemplaza producción efectiva.
            </Alert>
          </Grid>
        )}

        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Detalle por persona'
              action={
                <Button
                  variant='contained'
                  size='small'
                  startIcon={<i className='tabler-user-plus' style={{ fontSize: 18 }} />}
                  onClick={() => setAssignDrawerOpen(true)}
                >
                  Asignar miembro
                </Button>
              }
            />
            <Divider />
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
              <CustomTextField
                value={globalFilter}
                onChange={e => setGlobalFilter(e.target.value)}
                placeholder='Buscar por nombre o rol…'
                sx={{ minWidth: 250 }}
              />
              <Typography variant='caption' color='text.secondary' sx={{ alignSelf: 'center' }}>
                {table.getFilteredRowModel().rows.length} de {data.memberCount} miembros
              </Typography>
            </CardContent>
            <div className='overflow-x-auto'>
              <table className={tableStyles.table}>
                <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th
                          key={header.id}
                          onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                          className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })}
                          style={{
                            textAlign: (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left',
                            width: header.column.getSize() !== 150 ? header.column.getSize() : undefined
                          }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: ' ↑',
                            desc: ' ↓'
                          }[header.column.getIsSorted() as string] ?? null}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={colCount} style={{ textAlign: 'center', padding: '2rem' }}>
                        <Typography variant='body2' color='text.secondary'>Sin resultados</Typography>
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map(row => (
                      <Fragment key={row.id}>
                        <tr className={classnames({ 'hover:bg-actionHover': true })}>
                          {row.getVisibleCells().map(cell => (
                            <td
                              key={cell.id}
                              style={{ textAlign: (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                        {row.getIsExpanded() && (row.original.assignments?.length ?? 0) > 1 && (
                          <tr>
                            <td colSpan={colCount} style={{ padding: 0 }}>
                              <Box sx={{ bgcolor: 'action.hover', px: 6, py: 2 }}>
                                <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 1, display: 'block' }}>
                                  Asignaciones de {row.original.displayName}
                                </Typography>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr>
                                      <th style={{ textAlign: 'left', padding: '4px 8px', fontSize: '0.75rem', color: 'var(--mui-palette-text-secondary)' }}>Cliente</th>
                                      <th style={{ textAlign: 'right', padding: '4px 8px', fontSize: '0.75rem', color: 'var(--mui-palette-text-secondary)' }}>FTE</th>
                                      <th style={{ textAlign: 'right', padding: '4px 8px', fontSize: '0.75rem', color: 'var(--mui-palette-text-secondary)' }}>Horas</th>
                                      <th style={{ textAlign: 'left', padding: '4px 8px', fontSize: '0.75rem', color: 'var(--mui-palette-text-secondary)' }}>Desde</th>
                                      <th style={{ textAlign: 'right', padding: '4px 8px', fontSize: '0.75rem' }}></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.original.assignments?.map((a: MemberAssignment) => (
                                      <tr key={a.assignmentId}>
                                        <td style={{ padding: '4px 8px' }}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                            <Typography variant='body2'>{a.clientName || a.clientId}</Typography>
                                            {a.assignmentType === 'staff_augmentation' ? (
                                              <CustomChip
                                                round='true'
                                                size='small'
                                                variant='tonal'
                                                color={PLACEMENT_STATUS_COLORS[a.placementStatus || 'pipeline'] || 'secondary'}
                                                label={a.placementStatus ? `Staff Aug · ${PLACEMENT_STATUS_LABELS[a.placementStatus] || a.placementStatus}` : 'Staff Aug'}
                                              />
                                            ) : null}
                                          </Box>
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '4px 8px' }}>
                                          <Typography variant='body2'>{a.fteAllocation.toFixed(2)}</Typography>
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '4px 8px' }}>
                                          <Typography variant='body2'>{a.hoursPerMonth}h</Typography>
                                        </td>
                                        <td style={{ padding: '4px 8px' }}>
                                          <Typography variant='caption' color='text.secondary'>{a.startDate || '—'}</Typography>
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '4px 8px' }}>
                                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                            {a.placementId ? (
                                              <Tooltip title='Abrir placement'>
                                                <IconButton
                                                  size='small'
                                                  component='a'
                                                  href={`/agency/staff-augmentation/${a.placementId}`}
                                                >
                                                  <i className='tabler-briefcase-2' style={{ fontSize: 16 }} />
                                                </IconButton>
                                              </Tooltip>
                                            ) : null}
                                            <Tooltip title='Editar'>
                                              <IconButton size='small' onClick={() => handleEditAssignment(row.original, a)}>
                                                <i className='tabler-edit' style={{ fontSize: 16 }} />
                                              </IconButton>
                                            </Tooltip>
                                            <Tooltip title='Desasignar'>
                                              <IconButton
                                                size='small'
                                                color='error'
                                                onClick={() => setUnassignTarget({
                                                  assignmentId: a.assignmentId,
                                                  memberName: row.original.displayName,
                                                  clientName: a.clientName || 'cliente'
                                                })}
                                              >
                                                <i className='tabler-user-minus' style={{ fontSize: 16 }} />
                                              </IconButton>
                                            </Tooltip>
                                          </Box>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </Box>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <TablePaginationComponent table={table as ReturnType<typeof useReactTable>} />
          </Card>
        </Grid>

        {/* Excluded members section */}
        {(data.excludedMembers?.length ?? 0) > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, opacity: 0.8 }}>
              <CardHeader
                title={`Excluidos (${data.excludedCount ?? 0})`}
                subheader='Miembros excluidos del equipo asignable'
                avatar={<Avatar variant='rounded' sx={{ bgcolor: 'secondary.lightOpacity' }}><i className='tabler-eye-off' style={{ fontSize: 20, color: 'var(--mui-palette-secondary-main)' }} /></Avatar>}
                action={
                  <Button variant='tonal' size='small' color='secondary' onClick={() => setShowExcluded(!showExcluded)}>
                    {showExcluded ? 'Ocultar' : 'Mostrar'}
                  </Button>
                }
              />
              {showExcluded && (
                <>
                  <Divider />
                  <CardContent sx={{ p: 0 }}>
                    <table className={tableStyles.table}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left' }}>Nombre</th>
                          <th style={{ textAlign: 'left' }}>Rol</th>
                          <th style={{ textAlign: 'right' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.excludedMembers?.map(m => (
                          <tr key={m.memberId}>
                            <td><Typography variant='body2'>{m.displayName}</Typography></td>
                            <td><Typography variant='caption' color='text.secondary'>{m.roleTitle || '—'}</Typography></td>
                            <td style={{ textAlign: 'right' }}>
                              <Button
                                variant='tonal'
                                size='small'
                                color='info'
                                startIcon={<i className='tabler-eye' style={{ fontSize: 16 }} />}
                                onClick={() => toggleAssignable(m.memberId, true)}
                              >
                                Incluir
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </>
              )}
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Edit Assignment Drawer */}
      <EditAssignmentDrawer
        open={editDrawerOpen}
        memberName={editMemberName}
        assignment={editAssignment}
        onClose={() => setEditDrawerOpen(false)}
        onSuccess={load}
      />

      {/* Assign Member Drawer */}
      <AssignMemberDrawer
        open={assignDrawerOpen}
        existingMembers={existingMembersForDrawer}
        onClose={() => setAssignDrawerOpen(false)}
        onSuccess={load}
      />

      {/* Unassign Confirmation Dialog */}
      <Dialog open={!!unassignTarget} onClose={() => setUnassignTarget(null)} maxWidth='xs' fullWidth>
        <DialogTitle>Desasignar miembro</DialogTitle>
        <DialogContent>
          <Typography variant='body2'>
            ¿Desasignar a <strong>{unassignTarget?.memberName}</strong> de <strong>{unassignTarget?.clientName}</strong>?
            Esta acción desactivará la asignación y actualizará la capacidad disponible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnassignTarget(null)} disabled={unassigning}>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button variant='contained' color='error' onClick={handleUnassign} disabled={unassigning}>
            {unassigning ? 'Desasignando…' : 'Desasignar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default AgencyTeamView
