'use client'

import { useCallback, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

import { toast } from 'sonner'

import EmptyState from '@/components/greenhouse/EmptyState'
import { GH_WORKFORCE_INTAKE } from '@/lib/copy/workforce'

import CompleteIntakeDrawer, {
  type CompleteIntakeDrawerMember
} from './CompleteIntakeDrawer'

import type {
  ListPendingIntakeMembersCursor,
  PendingIntakeMemberRow,
  WorkforceIntakeStatusFilter
} from '@/lib/workforce/intake-queue/list-pending-members'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-873 Slice 4 — Workforce Activation workspace V1 (esqueleto).
 *
 * Renderiza la cola operativa de fichas laborales pendientes en
 * `/admin/workforce/activation`. V1 minimal: table + filter chips + drawer.
 *
 * **Mockup canonical aprobado 2026-05-14 (Codex)**:
 *   `src/views/greenhouse/admin/workforce-activation/mockup/WorkforceActivationMockupView.tsx`
 *
 * El mockup define el target enriquecido que TASK-874 va a materializar
 * in-place sin renombrar ruta ni viewCode: summary cards 4-up (Personas
 * por habilitar / Sin relación activa / Sin compensación / Listos para
 * completar), tabs de filtros por blocker (Todos / Listos / Sin
 * compensación / Sin ingreso / Sin relación legal / Sin pago / Contractors),
 * cola priorizada con readiness % + N blockers + top blocker + age,
 * right rail con readiness lanes detalladas (Identidad y acceso / Relación
 * laboral / Cargo y organización / Compensación / Pago / Onboarding /
 * Engagement) + "Resolver primero" alert + "Completar ficha" CTA + "Ruta
 * de desbloqueo" deep links.
 *
 * V1 (este) entrega:
 *  - Cursor pagination keyset (no offset) via fetch /api/admin/workforce/activation
 *  - Filter chips status (Todos / Pendientes / En revisión) — TASK-874 reemplaza
 *    con filter chips por blocker per mockup
 *  - Click row → abre CompleteIntakeDrawer (shared con PersonView Slice 3)
 *  - Banner condicional cuando reliability signal severity != ok
 *  - Empty state canonical + load-more inline spinner + sonner toast errors
 *
 * Forward-compat con TASK-874: `PendingIntakeMemberRow` ya declara slots
 * opcionales `readinessStatus?`, `blockerCount?`, `topBlockerLane?` que
 * TASK-874 populate; el view puede agregar columnas/badges sin breaking
 * change cuando esos slots emerjan no-undefined.
 */

interface WorkforceActivationViewProps {
  readonly initialItems: PendingIntakeMemberRow[]
  readonly initialCursor: ListPendingIntakeMembersCursor | null
  readonly initialHasMore: boolean
  readonly initialTotalApprox: number | null
  readonly pendingSignal: ReliabilitySignal | null
}

const formatCreatedAt = (iso: string): string => {
  try {
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      timeZone: 'America/Santiago'
    }).format(new Date(iso))
  } catch {
    return '—'
  }
}

const statusChipColor = (status: PendingIntakeMemberRow['workforceIntakeStatus']): 'warning' | 'info' => {
  return status === 'pending_intake' ? 'warning' : 'info'
}

const statusChipLabel = (status: PendingIntakeMemberRow['workforceIntakeStatus']): string => {
  return status === 'pending_intake'
    ? GH_WORKFORCE_INTAKE.badge_pending_intake
    : GH_WORKFORCE_INTAKE.badge_in_review
}

const WorkforceActivationView = ({
  initialItems,
  initialCursor,
  initialHasMore,
  initialTotalApprox,
  pendingSignal
}: WorkforceActivationViewProps) => {
  const [items, setItems] = useState<PendingIntakeMemberRow[]>(initialItems)
  const [cursor, setCursor] = useState<ListPendingIntakeMembersCursor | null>(initialCursor)
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore)
  const [totalApprox, setTotalApprox] = useState<number | null>(initialTotalApprox)
  const [loadingMore, setLoadingMore] = useState(false)
  const [statusFilter, setStatusFilter] = useState<WorkforceIntakeStatusFilter>('all')
  const [filterLoading, setFilterLoading] = useState(false)
  const [selected, setSelected] = useState<PendingIntakeMemberRow | null>(null)

  const drawerMember = useMemo<CompleteIntakeDrawerMember | null>(() => {
    if (!selected) return null

    return {
      memberId: selected.memberId,
      displayName: selected.displayName,
      primaryEmail: selected.primaryEmail,
      workforceIntakeStatus: selected.workforceIntakeStatus,
      identityProfileId: selected.identityProfileId,
      createdAt: selected.createdAt,
      ageDays: selected.ageDays
    }
  }, [selected])

  const handleRowClick = useCallback((row: PendingIntakeMemberRow) => {
    setSelected(row)
  }, [])

  const handleDrawerClose = useCallback(() => {
    setSelected(null)
  }, [])

  const fetchPage = useCallback(
    async (nextCursor: ListPendingIntakeMembersCursor | null, filter: WorkforceIntakeStatusFilter) => {
      const params = new URLSearchParams()

      params.set('statusFilter', filter)

      if (nextCursor) {
        params.set('cursor', encodeURIComponent(JSON.stringify(nextCursor)))
      }

      const response = await fetch(`/api/admin/workforce/activation?${params.toString()}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return (await response.json()) as {
        items: PendingIntakeMemberRow[]
        nextCursor: ListPendingIntakeMembersCursor | null
        hasMore: boolean
        totalApprox: number | null
      }
    },
    []
  )

  const handleLoadMore = useCallback(async () => {
    if (!cursor || loadingMore) return

    setLoadingMore(true)

    try {
      const data = await fetchPage(cursor, statusFilter)

      setItems(prev => [...prev, ...data.items])
      setCursor(data.nextCursor)
      setHasMore(data.hasMore)
    } catch {
      toast.error(GH_WORKFORCE_INTAKE.queue_load_error)
    } finally {
      setLoadingMore(false)
    }
  }, [cursor, loadingMore, statusFilter, fetchPage])

  const handleFilterChange = useCallback(
    async (_event: React.MouseEvent<HTMLElement>, newFilter: WorkforceIntakeStatusFilter | null) => {
      if (!newFilter || newFilter === statusFilter) return

      setStatusFilter(newFilter)
      setFilterLoading(true)

      try {
        const data = await fetchPage(null, newFilter)

        setItems(data.items)
        setCursor(data.nextCursor)
        setHasMore(data.hasMore)
        setTotalApprox(data.totalApprox)
      } catch {
        toast.error(GH_WORKFORCE_INTAKE.queue_load_error)
      } finally {
        setFilterLoading(false)
      }
    },
    [statusFilter, fetchPage]
  )

  const handleCompletedFromDrawer = useCallback(async () => {
    // Refresh tabla post-submit: refetch desde primera página manteniendo filter.
    setFilterLoading(true)

    try {
      const data = await fetchPage(null, statusFilter)

      setItems(data.items)
      setCursor(data.nextCursor)
      setHasMore(data.hasMore)
      setTotalApprox(data.totalApprox)
    } catch {
      // Soft fail — el toast.success ya disparó desde el drawer.
    } finally {
      setFilterLoading(false)
    }
  }, [statusFilter, fetchPage])

  const showBanner =
    pendingSignal !== null &&
    (pendingSignal.severity === 'error' || pendingSignal.severity === 'warning')

  return (
    <Box sx={{ p: { xs: 4, md: 6 } }}>
      <Stack spacing={1} sx={{ mb: 5 }}>
        <Typography variant='h4'>{GH_WORKFORCE_INTAKE.queue_page_title}</Typography>
        <Typography variant='subtitle1' color='text.secondary'>
          {GH_WORKFORCE_INTAKE.queue_page_subtitle}
        </Typography>
        {totalApprox !== null ? (
          <Typography variant='caption' color='text.secondary'>
            {totalApprox} pendiente{totalApprox === 1 ? '' : 's'}
          </Typography>
        ) : null}
      </Stack>

      {showBanner ? (
        <Alert
          severity={pendingSignal!.severity === 'error' ? 'error' : 'warning'}
          icon={<i className='tabler-alert-triangle' />}
          sx={{ mb: 4 }}
        >
          <AlertTitle>{pendingSignal!.label}</AlertTitle>
          {pendingSignal!.summary}
        </Alert>
      ) : null}

      <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 3 }}>
        <ToggleButtonGroup
          exclusive
          value={statusFilter}
          onChange={handleFilterChange}
          size='small'
          aria-label={GH_WORKFORCE_INTAKE.queue_filter_aria}
        >
          <ToggleButton value='all'>{GH_WORKFORCE_INTAKE.queue_filter_all}</ToggleButton>
          <ToggleButton value='pending_intake'>
            {GH_WORKFORCE_INTAKE.queue_filter_pending}
          </ToggleButton>
          <ToggleButton value='in_review'>
            {GH_WORKFORCE_INTAKE.queue_filter_in_review}
          </ToggleButton>
        </ToggleButtonGroup>
        {filterLoading ? <CircularProgress size={20} /> : null}
      </Stack>

      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        {items.length === 0 && !filterLoading ? (
          <Box sx={{ p: 6 }}>
            <EmptyState
              icon='tabler-clipboard-check'
              title={GH_WORKFORCE_INTAKE.queue_empty_title}
              description={GH_WORKFORCE_INTAKE.queue_empty_body}
            />
          </Box>
        ) : (
          <TableContainer>
            <Table aria-label={GH_WORKFORCE_INTAKE.queue_page_title}>
              <TableHead>
                <TableRow>
                  <TableCell>{GH_WORKFORCE_INTAKE.queue_column_name}</TableCell>
                  <TableCell>{GH_WORKFORCE_INTAKE.queue_column_email}</TableCell>
                  <TableCell>{GH_WORKFORCE_INTAKE.queue_column_status}</TableCell>
                  <TableCell>{GH_WORKFORCE_INTAKE.queue_column_created}</TableCell>
                  <TableCell>{GH_WORKFORCE_INTAKE.queue_column_age}</TableCell>
                  <TableCell align='right'>
                    {GH_WORKFORCE_INTAKE.queue_column_actions}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map(row => (
                  <TableRow
                    key={row.memberId}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleRowClick(row)}
                  >
                    <TableCell>
                      <Typography variant='body2' fontWeight={500}>
                        {row.displayName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>
                        {row.primaryEmail ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        variant='tonal'
                        color={statusChipColor(row.workforceIntakeStatus)}
                        label={statusChipLabel(row.workforceIntakeStatus)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>{formatCreatedAt(row.createdAt)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>
                        {row.ageDays} día{row.ageDays === 1 ? '' : 's'}
                      </Typography>
                    </TableCell>
                    <TableCell align='right' onClick={e => e.stopPropagation()}>
                      <Button
                        variant='tonal'
                        color='warning'
                        size='small'
                        startIcon={<i className='tabler-check' />}
                        onClick={() => handleRowClick(row)}
                        aria-label={GH_WORKFORCE_INTAKE.button_complete_intake_aria}
                      >
                        {GH_WORKFORCE_INTAKE.button_complete_intake}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {hasMore ? (
          <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant='tonal'
              color='secondary'
              onClick={handleLoadMore}
              disabled={loadingMore}
              startIcon={loadingMore ? <CircularProgress size={16} /> : null}
            >
              {loadingMore ? GH_WORKFORCE_INTAKE.queue_loading : GH_WORKFORCE_INTAKE.queue_load_more}
            </Button>
          </Box>
        ) : null}
      </Card>

      <CompleteIntakeDrawer
        open={selected !== null}
        member={drawerMember}
        onClose={handleDrawerClose}
        onCompleted={handleCompletedFromDrawer}
      />
    </Box>
  )
}

export default WorkforceActivationView
