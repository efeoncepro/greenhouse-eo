'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TablePagination from '@mui/material/TablePagination'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTextField from '@core/components/mui/TextField'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import TablePaginationComponent from '@components/TablePaginationComponent'

import { EmptyState } from '@/components/greenhouse'
import { GH_SKILLS_CERTS } from '@/lib/copy/workforce'
import { getInitials } from '@/utils/getInitials'

import tableStyles from '@core/styles/table.module.css'
import { formatDate as formatGreenhouseDate } from '@/lib/format'

// ── Types ────────────────────────────────────────────────────────

interface TalentReviewItem {
  itemType: 'skill' | 'certification' | 'tool'
  itemId: string
  itemName: string
  memberId: string
  memberDisplayName: string
  memberAvatarUrl: string | null
  verificationStatus: 'self_declared' | 'pending_review' | 'verified' | 'rejected'
  rejectionReason: string | null
  verifiedBy: string | null
  verifiedAt: string | null
  expiryDate: string | null
  isExpired: boolean
  isExpiringSoon: boolean
  createdAt: string | null
}

interface TalentReviewSummary {
  pendingReview: number
  selfDeclared: number
  expiringSoon: number
  expired: number
  rejected: number
  verified: number
  total: number
}

interface TalentReviewResponse {
  items: TalentReviewItem[]
  summary: TalentReviewSummary
}

// ── Labels ───────────────────────────────────────────────────────

const LABELS = {
  pageTitle: 'Verificación de talento',
  pageSubtitle: 'Revisa, verifica y gestiona skills, herramientas y certificaciones del equipo',
  filterType: 'Tipo',
  filterStatus: 'Estado',
  filterExpiry: 'Vencimiento',
  filterAll: 'Todos',
  summaryPending: 'Pendientes',
  summaryExpiringSoon: 'Por vencer',
  summaryExpired: 'Vencidas',
  summaryRejected: 'Rechazadas',
  summaryVerified: 'Verificadas',
  emptyState: 'Sin items pendientes de revisión',
  emptyStateDescription: 'Cuando el equipo declare skills, herramientas o certificaciones, aparecerán aquí para su revisión.',
  headerPerson: 'Persona',
  headerType: 'Tipo',
  headerItem: 'Item',
  headerStatus: 'Estado',
  headerExpiry: 'Vencimiento',
  headerActions: 'Acciones',
  typeSkill: 'Skill',
  typeTool: 'Herramienta',
  typeCert: 'Certificación',
  statusSelfDeclared: 'Autodeclarada',
  statusPendingReview: 'Por revisar',
  statusVerified: 'Verificada',
  statusRejected: 'Rechazada',
  expiryExpired: 'Vencida',
  expiryExpiringSoon: 'Por vencer',
  expiryNA: '—',
  rejectDialogTitle: 'Rechazar item',
  rejectDialogBody: 'Indica la razón del rechazo (opcional).',
  rejectDialogPlaceholder: 'Razón del rechazo',
  rejectDialogConfirm: 'Rechazar',
  rejectDialogCancel: 'Cancelar',
  searchPlaceholder: 'Buscar por nombre o item...',
  errorLoading: 'No pudimos cargar la cola de revisión. Intenta de nuevo.',
  errorAction: 'No se pudo completar la acción. Intenta de nuevo.'
} as const

// ── Helpers ──────────────────────────────────────────────────────

const typeIcon = (itemType: TalentReviewItem['itemType']): string => {
  switch (itemType) {
    case 'skill': return 'tabler-star'
    case 'tool': return 'tabler-tool'
    case 'certification': return 'tabler-certificate-2'
  }
}

const typeLabel = (itemType: TalentReviewItem['itemType']): string => {
  switch (itemType) {
    case 'skill': return LABELS.typeSkill
    case 'tool': return LABELS.typeTool
    case 'certification': return LABELS.typeCert
  }
}

const statusLabel = (status: TalentReviewItem['verificationStatus']): string => {
  switch (status) {
    case 'self_declared': return LABELS.statusSelfDeclared
    case 'pending_review': return LABELS.statusPendingReview
    case 'verified': return LABELS.statusVerified
    case 'rejected': return LABELS.statusRejected
  }
}

const statusColor = (status: TalentReviewItem['verificationStatus']): 'default' | 'warning' | 'success' | 'error' => {
  switch (status) {
    case 'self_declared': return 'default'
    case 'pending_review': return 'warning'
    case 'verified': return 'success'
    case 'rejected': return 'error'
  }
}

const statusIcon = (status: TalentReviewItem['verificationStatus']): string => {
  switch (status) {
    case 'self_declared': return 'tabler-circle-dot'
    case 'pending_review': return 'tabler-clock'
    case 'verified': return 'tabler-circle-check'
    case 'rejected': return 'tabler-circle-x'
  }
}

const formatDate = (value: string | null): string => {
  if (!value) return '—'

  try {
    return formatGreenhouseDate(new Date(value), {
  dateStyle: 'medium',
  timeZone: 'America/Santiago'
}, 'es-CL')
  } catch {
    return value
  }
}

const buildVerifyUrl = (item: TalentReviewItem): string => {
  const base = `/api/hr/core/members/${item.memberId}`

  switch (item.itemType) {
    case 'skill': return `${base}/skills/${item.itemId}/verify`
    case 'certification': return `${base}/certifications/${item.itemId}/verify`
    case 'tool': return `${base}/tools/${item.itemId}/verify`
  }
}

// ── Column helper ────────────────────────────────────────────────

const columnHelper = createColumnHelper<TalentReviewItem>()

// ── Component ────────────────────────────────────────────────────

const TalentReviewQueueView = () => {
  // ── State ────────────────────────────────────────────────────
  const [data, setData] = useState<TalentReviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null) // itemType:memberId:itemId

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expiryFilter, setExpiryFilter] = useState<string>('all')
  const [searchValue, setSearchValue] = useState('')

  // Table
  const [sorting, setSorting] = useState<SortingState>([])

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<TalentReviewItem | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // ── Fetch ────────────────────────────────────────────────────
  const fetchQueue = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      if (typeFilter !== 'all') params.set('itemType', typeFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (expiryFilter === 'expiring_soon') params.set('expiryFilter', 'expiring_soon')
      if (expiryFilter === 'expired') params.set('expiryFilter', 'expired')

      const qs = params.toString()
      const url = `/api/hr/core/talent-review${qs ? `?${qs}` : ''}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const json: TalentReviewResponse = await response.json()

      setData(json)
    } catch {
      setError(LABELS.errorLoading)
    } finally {
      setLoading(false)
    }
  }, [typeFilter, statusFilter, expiryFilter])

  useEffect(() => {
    fetchQueue()
  }, [fetchQueue])

  // ── Actions ──────────────────────────────────────────────────
  const handleAction = async (item: TalentReviewItem, action: 'verify' | 'unverify' | 'reject', rejectionReason?: string) => {
    const key = `${item.itemType}:${item.memberId}:${item.itemId}`

    setActionLoading(key)
    setActionError(null)

    try {
      const body: Record<string, string> = { action }

      if (rejectionReason) {
        body.rejectionReason = rejectionReason
      }

      const response = await fetch(buildVerifyUrl(item), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const json = await response.json().catch(() => null)

        throw new Error(json?.error || `HTTP ${response.status}`)
      }

      // Refetch queue after successful action
      await fetchQueue()
    } catch {
      setActionError(LABELS.errorAction)
    } finally {
      setActionLoading(null)
    }
  }

  const handleVerify = (item: TalentReviewItem) => handleAction(item, 'verify')
  const handleUnverify = (item: TalentReviewItem) => handleAction(item, 'unverify')

  const handleRejectOpen = (item: TalentReviewItem) => {
    setRejectTarget(item)
    setRejectReason('')
  }

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return
    await handleAction(rejectTarget, 'reject', rejectReason.trim() || undefined)
    setRejectTarget(null)
    setRejectReason('')
  }

  const handleRejectCancel = () => {
    setRejectTarget(null)
    setRejectReason('')
  }

  // ── Local filter (search) ────────────────────────────────────
  const filteredItems = useMemo(() => {
    if (!data) return []

    const query = searchValue.trim().toLowerCase()

    if (!query) return data.items

    return data.items.filter(item =>
      [item.memberDisplayName, item.itemName, typeLabel(item.itemType)]
        .join(' ')
        .toLowerCase()
        .includes(query)
    )
  }, [data, searchValue])

  // ── Summary KPI cards ────────────────────────────────────────
  const summary = data?.summary

  const kpis = summary
    ? [
        {
          title: LABELS.summaryPending,
          stats: String(summary.pendingReview + summary.selfDeclared),
          avatarIcon: 'tabler-clock',
          avatarColor: 'warning' as const,
          subtitle: `${summary.pendingReview} por revisar, ${summary.selfDeclared} autodeclaradas`
        },
        {
          title: LABELS.summaryExpiringSoon,
          stats: String(summary.expiringSoon),
          avatarIcon: 'tabler-alert-triangle',
          avatarColor: 'warning' as const,
          subtitle: 'Vencen en los próximos 90 días'
        },
        {
          title: LABELS.summaryExpired,
          stats: String(summary.expired),
          avatarIcon: 'tabler-calendar-x',
          avatarColor: 'error' as const,
          subtitle: 'Requieren renovación'
        },
        {
          title: LABELS.summaryRejected,
          stats: String(summary.rejected),
          avatarIcon: 'tabler-x',
          avatarColor: 'error' as const,
          subtitle: 'Items rechazados por un admin'
        },
        {
          title: LABELS.summaryVerified,
          stats: String(summary.verified),
          avatarIcon: 'tabler-rosette-discount-check',
          avatarColor: 'success' as const,
          subtitle: `De un total de ${summary.total}`
        }
      ]
    : []

  // ── Table columns ────────────────────────────────────────────
   
  const columns = useMemo<ColumnDef<TalentReviewItem, any>[]>(
    () => [
      columnHelper.accessor('memberDisplayName', {
        header: LABELS.headerPerson,
        cell: ({ row }) => {
          const item = row.original
          const avatarSrc = item.memberAvatarUrl || undefined

          return (
            <div className='flex items-center gap-3'>
              <CustomAvatar
                src={avatarSrc}
                size={34}
                skin={avatarSrc ? undefined : 'light'}
                color='info'
              >
                {!avatarSrc ? getInitials(item.memberDisplayName) : null}
              </CustomAvatar>
              <Typography variant='body2' fontWeight={500}>
                {item.memberDisplayName}
              </Typography>
            </div>
          )
        }
      }),
      columnHelper.accessor('itemType', {
        header: LABELS.headerType,
        cell: ({ row }) => (
          <div className='flex items-center gap-2'>
            <i className={typeIcon(row.original.itemType)} style={{ fontSize: 18 }} aria-hidden='true' />
            <Typography variant='body2'>{typeLabel(row.original.itemType)}</Typography>
          </div>
        )
      }),
      columnHelper.accessor('itemName', {
        header: LABELS.headerItem,
        cell: ({ row }) => (
          <Typography variant='body2' fontWeight={500}>
            {row.original.itemName}
          </Typography>
        )
      }),
      columnHelper.accessor('verificationStatus', {
        header: LABELS.headerStatus,
        cell: ({ row }) => {
          const item = row.original

          return (
            <Tooltip title={item.rejectionReason ? `Razón: ${item.rejectionReason}` : ''} arrow>
              <Chip
                size='small'
                variant='tonal'
                color={statusColor(item.verificationStatus)}
                icon={<i className={statusIcon(item.verificationStatus)} style={{ fontSize: 16 }} />}
                label={statusLabel(item.verificationStatus)}
              />
            </Tooltip>
          )
        }
      }),
      columnHelper.accessor('expiryDate', {
        header: LABELS.headerExpiry,
        cell: ({ row }) => {
          const item = row.original

          if (item.itemType !== 'certification' || !item.expiryDate) {
            return <Typography variant='body2' color='text.secondary'>{LABELS.expiryNA}</Typography>
          }

          return (
            <Stack direction='row' alignItems='center' spacing={1}>
              <Typography variant='body2'>{formatDate(item.expiryDate)}</Typography>
              {item.isExpired && (
                <Chip
                  size='small'
                  variant='tonal'
                  color='error'
                  icon={<i className='tabler-alert-circle' style={{ fontSize: 14 }} />}
                  label={LABELS.expiryExpired}
                />
              )}
              {!item.isExpired && item.isExpiringSoon && (
                <Chip
                  size='small'
                  variant='tonal'
                  color='warning'
                  icon={<i className='tabler-alert-triangle' style={{ fontSize: 14 }} />}
                  label={LABELS.expiryExpiringSoon}
                />
              )}
            </Stack>
          )
        }
      }),
      columnHelper.display({
        id: 'actions',
        header: LABELS.headerActions,
        enableSorting: false,
        cell: ({ row }) => {
          const item = row.original
          const key = `${item.itemType}:${item.memberId}:${item.itemId}`
          const isLoading = actionLoading === key
          const isVerified = item.verificationStatus === 'verified'

          if (isLoading) {
            return <CircularProgress size={20} />
          }

          return (
            <Stack direction='row' spacing={0.5}>
              {!isVerified && (
                <Tooltip title={GH_SKILLS_CERTS.verify_action} arrow>
                  <IconButton
                    size='small'
                    color='success'
                    onClick={() => handleVerify(item)}
                    aria-label={`${GH_SKILLS_CERTS.verify_action} ${item.itemName} de ${item.memberDisplayName}`}
                  >
                    <i className='tabler-check' />
                  </IconButton>
                </Tooltip>
              )}
              {isVerified && (
                <Tooltip title={GH_SKILLS_CERTS.unverify_action} arrow>
                  <IconButton
                    size='small'
                    color='secondary'
                    onClick={() => handleUnverify(item)}
                    aria-label={`${GH_SKILLS_CERTS.unverify_action} ${item.itemName} de ${item.memberDisplayName}`}
                  >
                    <i className='tabler-circle-minus' />
                  </IconButton>
                </Tooltip>
              )}
              {item.verificationStatus !== 'rejected' && (
                <Tooltip title={GH_SKILLS_CERTS.reject_action} arrow>
                  <IconButton
                    size='small'
                    color='error'
                    onClick={() => handleRejectOpen(item)}
                    aria-label={`${GH_SKILLS_CERTS.reject_action} ${item.itemName} de ${item.memberDisplayName}`}
                  >
                    <i className='tabler-x' />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          )
        }
      })
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actionLoading]
  )

  // ── Table instance ───────────────────────────────────────────
  const table = useReactTable({
    data: filteredItems,
    columns,
    state: { sorting },
    initialState: { pagination: { pageSize: 15 } },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  // ── Render ───────────────────────────────────────────────────
  return (
    <Grid container spacing={6}>
      {/* Page header */}
      <Grid size={12}>
        <Typography variant='h4'>{LABELS.pageTitle}</Typography>
        <Typography variant='body1' color='text.secondary'>
          {LABELS.pageSubtitle}
        </Typography>
      </Grid>

      {/* Action error alert */}
      {actionError && (
        <Grid size={12}>
          <Alert severity='error' onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        </Grid>
      )}

      {/* Summary KPI cards */}
      {!loading && summary && kpis.map((kpi, i) => (
        <Grid key={i} size={{ xs: 12, sm: 6, md: 2.4 }}>
          <HorizontalWithSubtitle {...kpi} />
        </Grid>
      ))}

      {/* Filters + Table card */}
      <Grid size={12}>
        <Card>
          <CardHeader
            title={LABELS.pageTitle}
            subheader={summary ? `${summary.total} items en total` : undefined}
          />

          {/* Filter row */}
          <div className='p-6 border-bs'>
            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4'>
              <CustomTextField
                select
                fullWidth
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                label={LABELS.filterType}
              >
                <MenuItem value='all'>{LABELS.filterAll}</MenuItem>
                <MenuItem value='skill'>{LABELS.typeSkill}</MenuItem>
                <MenuItem value='tool'>{LABELS.typeTool}</MenuItem>
                <MenuItem value='certification'>{LABELS.typeCert}</MenuItem>
              </CustomTextField>

              <CustomTextField
                select
                fullWidth
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                label={LABELS.filterStatus}
              >
                <MenuItem value='all'>{LABELS.filterAll}</MenuItem>
                <MenuItem value='self_declared'>{LABELS.statusSelfDeclared}</MenuItem>
                <MenuItem value='pending_review'>{LABELS.statusPendingReview}</MenuItem>
                <MenuItem value='verified'>{LABELS.statusVerified}</MenuItem>
                <MenuItem value='rejected'>{LABELS.statusRejected}</MenuItem>
              </CustomTextField>

              <CustomTextField
                select
                fullWidth
                value={expiryFilter}
                onChange={e => setExpiryFilter(e.target.value)}
                label={LABELS.filterExpiry}
              >
                <MenuItem value='all'>{LABELS.filterAll}</MenuItem>
                <MenuItem value='expiring_soon'>{LABELS.expiryExpiringSoon}</MenuItem>
                <MenuItem value='expired'>{LABELS.expiryExpired}</MenuItem>
              </CustomTextField>

              <CustomTextField
                fullWidth
                value={searchValue}
                onChange={e => {
                  setSearchValue(e.target.value)
                  table.setPageIndex(0)
                }}
                placeholder={LABELS.searchPlaceholder}
                label='Buscar'
                InputProps={{
                  startAdornment: <i className='tabler-search' style={{ fontSize: 18, marginRight: 8 }} />
                }}
              />
            </div>
          </div>

          {/* Page size + count row */}
          <div className='flex justify-between flex-col items-start md:flex-row md:items-center p-6 border-bs gap-4'>
            <CustomTextField
              select
              value={table.getState().pagination.pageSize}
              onChange={e => table.setPageSize(Number(e.target.value))}
              className='max-sm:is-full sm:is-[88px]'
            >
              <MenuItem value='10'>10</MenuItem>
              <MenuItem value='15'>15</MenuItem>
              <MenuItem value='25'>25</MenuItem>
              <MenuItem value='50'>50</MenuItem>
            </CustomTextField>
            <Typography variant='body2' color='text.secondary'>
              {`Mostrando ${filteredItems.length} de ${data?.summary.total ?? 0} items`}
            </Typography>
          </div>

          {/* Loading state */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
              <Stack spacing={2} alignItems='center'>
                <CircularProgress />
                <Typography variant='body2' color='text.secondary'>
                  Cargando cola de revisión...
                </Typography>
              </Stack>
            </Box>
          )}

          {/* Error state */}
          {!loading && error && (
            <Box sx={{ p: 6 }}>
              <Alert
                severity='error'
                action={
                  <Button color='inherit' size='small' onClick={fetchQueue}>
                    Reintentar
                  </Button>
                }
              >
                {error}
              </Alert>
            </Box>
          )}

          {/* Empty state */}
          {!loading && !error && filteredItems.length === 0 && (
            <Box sx={{ p: 6 }}>
              <EmptyState
                icon='tabler-rosette-discount-check'
                title={LABELS.emptyState}
                description={LABELS.emptyStateDescription}
              />
            </Box>
          )}

          {/* Data table */}
          {!loading && !error && filteredItems.length > 0 && (
            <>
              <div className='overflow-x-auto'>
                <table className={tableStyles.table}>
                  <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                          <th key={header.id}>
                            {header.isPlaceholder ? null : (
                              <div
                                className={classnames({
                                  'flex items-center gap-2': header.column.getIsSorted(),
                                  'cursor-pointer select-none': header.column.getCanSort()
                                })}
                                onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {{
                                  asc: <i className='tabler-chevron-up text-xl' />,
                                  desc: <i className='tabler-chevron-down text-xl' />
                                }[header.column.getIsSorted() as 'asc' | 'desc'] ?? null}
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map(row => (
                      <tr key={row.id}>
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination
                component={() => <TablePaginationComponent table={table} />}
                count={table.getFilteredRowModel().rows.length}
                rowsPerPage={table.getState().pagination.pageSize}
                page={table.getState().pagination.pageIndex}
                onPageChange={(_, page) => {
                  table.setPageIndex(page)
                }}
              />
            </>
          )}
        </Card>
      </Grid>

      {/* Reject confirmation dialog */}
      <Dialog
        open={Boolean(rejectTarget)}
        onClose={handleRejectCancel}
        maxWidth='sm'
        fullWidth
        aria-labelledby='reject-dialog-title'
      >
        <DialogTitle id='reject-dialog-title'>
          {LABELS.rejectDialogTitle}
        </DialogTitle>
        <DialogContent>
          <Typography variant='body2' sx={{ mb: 3 }}>
            {rejectTarget
              ? `${rejectTarget.itemName} de ${rejectTarget.memberDisplayName}`
              : ''}
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
            {LABELS.rejectDialogBody}
          </Typography>
          <CustomTextField
            fullWidth
            multiline
            rows={3}
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder={LABELS.rejectDialogPlaceholder}
            label={LABELS.rejectDialogPlaceholder}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRejectCancel} color='secondary'>
            {LABELS.rejectDialogCancel}
          </Button>
          <Button onClick={handleRejectConfirm} color='error' variant='contained'>
            {LABELS.rejectDialogConfirm}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default TalentReviewQueueView
