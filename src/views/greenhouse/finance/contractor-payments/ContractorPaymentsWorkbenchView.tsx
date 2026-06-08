'use client'

// TASK-974 — Finance Contractor Payments Workbench (runtime).
//
// Promotes the approved mockup to real data: fetches the enriched payables list
// (GET /api/finance/contractor-payables?workbench=1), renders KPIs + list +
// detail (gross/withholding/net breakdown + readiness) and wires create
// (from approved submission / off-cycle) + governance (ready / cancel / waive /
// override — relocated here from HR by SoD) to the existing endpoints. Amounts
// are read verbatim from the payable (no recompute). Approved mockup is binding.

import { useCallback, useEffect, useMemo, useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import EmptyState from '@/components/greenhouse/EmptyState'
import DataTableShell from '@/components/greenhouse/data-table/DataTableShell'
import { MetricSummaryCard, OperationalPanel } from '@/components/greenhouse/primitives'
import {
  FINANCE_PAYMENTS_BLOCKER_RESPONSIBLE,
  GH_FINANCE_CONTRACTOR_PAYMENTS as C
} from '@/lib/copy/finance-payments'
import { formatCurrency, type CurrencyCode } from '@/lib/format'
import { AnimatePresence, motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'

export type WorkbenchStatus =
  | 'pending_readiness'
  | 'blocked'
  | 'ready_for_finance'
  | 'obligation_created'
  | 'payment_order_created'
  | 'paid'
  | 'cancelled'

interface ReadinessBlocker {
  code: string
  message: string
}

interface WorkbenchReadiness {
  ready?: boolean
  blockers?: ReadinessBlocker[]
  evaluatedAt?: string
}

export interface WorkbenchPayable {
  contractorPayableId: string
  publicId: string
  contractorName: string
  engagementPublicId: string
  payableSourceKind: string
  grossAmount: number
  withholdingAmount: number
  netPayable: number
  currency: string
  payrollVia: string
  dueDate: string | null
  status: WorkbenchStatus
  readiness: WorkbenchReadiness
}

interface ReadySubmission {
  contractorWorkSubmissionId: string
  publicId: string
  contractorName: string
  engagementPublicId: string
  title: string | null
  servicePeriodStart: string | null
  servicePeriodEnd: string | null
  grossAmount: number | null
  currency: string | null
}

type GovernanceAction = 'ready' | 'cancel' | 'waive' | 'override'

const STATUS_TONE: Record<WorkbenchStatus, 'secondary' | 'warning' | 'error' | 'info' | 'success' | 'primary'> = {
  pending_readiness: 'warning',
  blocked: 'error',
  ready_for_finance: 'success',
  obligation_created: 'info',
  payment_order_created: 'primary',
  paid: 'success',
  cancelled: 'secondary'
}

const STATUS_FILTERS: { value: 'all' | WorkbenchStatus; label: string }[] = [
  { value: 'all', label: C.list.filterAll },
  { value: 'pending_readiness', label: C.status.pending_readiness },
  { value: 'blocked', label: C.status.blocked },
  { value: 'ready_for_finance', label: C.status.ready_for_finance },
  { value: 'obligation_created', label: C.status.obligation_created },
  { value: 'payment_order_created', label: C.status.payment_order_created },
  { value: 'paid', label: C.status.paid }
]

const LIVE_READINESS_STATUSES = new Set<WorkbenchStatus>(['pending_readiness', 'blocked'])

const money = (n: number, currency: string) =>
  formatCurrency(n, currency as CurrencyCode, { currencySymbolSpacing: ' ' }, 'es-CL')

const readySubmissionLabel = (submission: ReadySubmission): string => {
  const period =
    submission.servicePeriodStart && submission.servicePeriodEnd
      ? `${submission.servicePeriodStart} → ${submission.servicePeriodEnd}`
      : submission.servicePeriodStart ?? submission.servicePeriodEnd ?? 'Sin período'

  return `${submission.publicId} · ${period}`
}

const statusLabel = (s: WorkbenchStatus) => C.status[s] ?? s

const ContractorPaymentsWorkbenchView = () => {
  const theme = useTheme()
  const prefersReduced = useReducedMotion()

  const [payables, setPayables] = useState<WorkbenchPayable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | WorkbenchStatus>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [governance, setGovernance] = useState<GovernanceAction | null>(null)
  const [readinessLoadingId, setReadinessLoadingId] = useState<string | null>(null)
  const [readinessErrorId, setReadinessErrorId] = useState<string | null>(null)

  const patchPayable = useCallback((contractorPayableId: string, patch: Partial<WorkbenchPayable>) => {
    setPayables(prev => prev.map(p => (p.contractorPayableId === contractorPayableId ? { ...p, ...patch } : p)))
  }, [])

  const refetch = useCallback(async () => {
    setError(false)

    try {
      const res = await fetch('/api/finance/contractor-payables?workbench=1', { cache: 'no-store' })

      if (!res.ok) {
        setError(true)

        return
      }

      const body = (await res.json().catch(() => null)) as { items?: WorkbenchPayable[] } | null
      const items = body?.items ?? []

      setPayables(items)
      setSelectedId(prev => prev ?? items[0]?.contractorPayableId ?? null)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const visible = useMemo(
    () => (statusFilter === 'all' ? payables : payables.filter(p => p.status === statusFilter)),
    [payables, statusFilter]
  )

  const selected = useMemo(
    () => payables.find(p => p.contractorPayableId === selectedId) ?? null,
    [payables, selectedId]
  )

  const selectedPayableId = selected?.contractorPayableId ?? null
  const selectedStatus = selected?.status ?? null

  useEffect(() => {
    if (!selectedPayableId || !selectedStatus || !LIVE_READINESS_STATUSES.has(selectedStatus)) return

    let alive = true
    const id = selectedPayableId

    const loadReadiness = async () => {
      setReadinessLoadingId(id)
      setReadinessErrorId(null)

      try {
        const res = await fetch(`/api/finance/contractor-payables/${encodeURIComponent(id)}/readiness`, {
          cache: 'no-store'
        })

        const body = (await res.json().catch(() => null)) as { readiness?: WorkbenchReadiness } | null

        if (!alive) return

        if (!res.ok || !body?.readiness) {
          setReadinessErrorId(id)

          return
        }

        patchPayable(id, { readiness: body.readiness })
      } catch {
        if (alive) setReadinessErrorId(id)
      } finally {
        if (alive) setReadinessLoadingId(current => (current === id ? null : current))
      }
    }

    void loadReadiness()

    return () => {
      alive = false
    }
  }, [patchPayable, selectedPayableId, selectedStatus])

  const kpis = useMemo(() => {
    const sum = (list: WorkbenchPayable[]) => list.reduce((acc, p) => acc + p.netPayable, 0)
    const by = (s: WorkbenchStatus) => payables.filter(p => p.status === s)

    return {
      toPrepare: by('pending_readiness'),
      blocked: by('blocked'),
      ready: by('ready_for_finance'),
      paid: by('paid'),
      sum
    }
  }, [payables])

  const entrance = (i: number) => ({
    initial: prefersReduced ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay: prefersReduced ? 0 : i * 0.06, ease: [0.2, 0, 0, 1] as const }
  })

  if (loading) {
    return (
      <Box sx={{ p: 10, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: { xs: 4, md: 6 }, maxWidth: 1440, mx: 'auto' }}>
        <Alert severity='error' role='alert'>
          No pudimos cargar los payables. Reintenta.
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 4, md: 6 }, maxWidth: 1440, mx: 'auto' }}>
      {/* Header */}
      <motion.div {...entrance(0)}>
        <Card elevation={0} sx={{ mb: 6, border: `1px solid ${theme.palette.divider}` }}>
          <CardContent sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant='caption' sx={{ color: 'text.secondary', letterSpacing: '0.08em' }}>
                FINANZAS · TESORERÍA
              </Typography>
              <Typography variant='h4' sx={{ fontWeight: 700, mt: 0.5 }}>
                {C.header.title}
              </Typography>
              <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5, maxWidth: 560 }}>
                {C.header.subtitle}
              </Typography>
            </Box>
            <Stack direction='row' spacing={2} flexWrap='wrap'>
              <ReportDownloadButton />
              <MonthlyRunButton onPrepared={() => void refetch()} />
              <CreateMenu onCreated={() => void refetch()} />
            </Stack>
          </CardContent>
        </Card>
      </motion.div>

      {/* KPIs */}
      <motion.div {...entrance(1)}>
        <Grid container spacing={6} sx={{ mb: 6 }}>
          {[
            { title: C.kpi.toPrepare, sub: C.kpi.toPrepareSub, list: kpis.toPrepare, icon: 'tabler-clipboard-list', color: 'warning' as const },
            { title: C.kpi.blocked, sub: C.kpi.blockedSub, list: kpis.blocked, icon: 'tabler-alert-triangle', color: 'error' as const },
            { title: C.kpi.readyForFinance, sub: C.kpi.readyForFinanceSub, list: kpis.ready, icon: 'tabler-circle-check', color: 'success' as const },
            { title: C.kpi.paid, sub: C.kpi.paidSub, list: kpis.paid, icon: 'tabler-building-bank', color: 'info' as const }
          ].map(k => (
            <Grid key={k.title} size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricSummaryCard
                title={k.title}
                value={
                  <Stack direction='row' spacing={2} alignItems='baseline'>
                    <span>{k.list.length}</span>
                    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                      {money(kpis.sum(k.list), 'CLP')}
                    </Typography>
                  </Stack>
                }
                subtitle={k.sub}
                icon={k.icon}
                iconColor={k.color}
              />
            </Grid>
          ))}
        </Grid>
      </motion.div>

      {/* List + detail */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <motion.div {...entrance(2)}>
            <OperationalPanel
              title={C.list.panelTitle}
              subheader={C.list.panelSubheader}
              icon='tabler-list-details'
              iconColor='primary'
              action={
                <CustomTextField
                  select
                  size='small'
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as 'all' | WorkbenchStatus)}
                  sx={{ minWidth: 180 }}
                  aria-label={C.list.selectStatus}
                >
                  {STATUS_FILTERS.map(f => (
                    <MenuItem key={f.value} value={f.value}>
                      {f.label}
                    </MenuItem>
                  ))}
                </CustomTextField>
              }
            >
              {visible.length === 0 ? (
                <EmptyState icon='tabler-inbox' title={C.list.emptyTitle} description={C.list.emptyDescription} />
              ) : (
                <DataTableShell identifier='contractor-payments-table' ariaLabel={C.list.panelTitle}>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>{C.list.colContractor}</TableCell>
                        <TableCell>{C.list.colKind}</TableCell>
                        <TableCell align='right'>{C.list.colGross}</TableCell>
                        <TableCell align='right'>{C.list.colNet}</TableCell>
                        <TableCell>{C.list.colDue}</TableCell>
                        <TableCell align='center'>{C.list.colStatus}</TableCell>
                        <TableCell align='right'>{C.list.colAction}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visible.map(p => {
                        const isSel = p.contractorPayableId === selectedId

                        return (
                          <TableRow
                            key={p.contractorPayableId}
                            hover
                            onClick={() => setSelectedId(p.contractorPayableId)}
                            sx={{ cursor: 'pointer', bgcolor: isSel ? alpha(theme.palette.primary.main, 0.08) : undefined }}
                          >
                            <TableCell>
                              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                                {p.contractorName}
                              </Typography>
                              <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                                {p.publicId}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                                {p.payableSourceKind === 'off_cycle' ? 'Off-cycle' : 'Envío'}
                              </Typography>
                            </TableCell>
                            <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                              {money(p.grossAmount, p.currency)}
                            </TableCell>
                            <TableCell align='right' sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                              {money(p.netPayable, p.currency)}
                            </TableCell>
                            <TableCell>{p.dueDate ?? '—'}</TableCell>
                            <TableCell align='center'>
                              <CustomChip round='true' size='small' color={STATUS_TONE[p.status]} label={statusLabel(p.status)} />
                            </TableCell>
                            <TableCell align='right'>
                              <Button size='small' variant={isSel ? 'contained' : 'tonal'}>
                                {C.list.open}
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </DataTableShell>
              )}
            </OperationalPanel>
          </motion.div>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <motion.div {...entrance(3)}>
            <AnimatePresence mode='wait'>
              <motion.div
                key={selected?.contractorPayableId ?? 'empty'}
                initial={prefersReduced ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReduced ? undefined : { opacity: 0, x: -12 }}
                transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
              >
                {selected ? (
                  <DetailPanel
                    payable={selected}
                    readinessLoading={
                      readinessLoadingId === selected.contractorPayableId ||
                      (LIVE_READINESS_STATUSES.has(selected.status) &&
                        !selected.readiness.evaluatedAt &&
                        readinessErrorId !== selected.contractorPayableId)
                    }
                    readinessError={readinessErrorId === selected.contractorPayableId}
                    onGovernance={setGovernance}
                  />
                ) : (
                  <OperationalPanel title={C.detail.title} icon='tabler-receipt' iconColor='secondary'>
                    <Alert severity='info' role='status'>
                      {C.list.emptyDescription}
                    </Alert>
                  </OperationalPanel>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </Grid>
      </Grid>

      {selected ? (
        <GovernanceDialog
          action={governance}
          payable={selected}
          onClose={() => setGovernance(null)}
          onPayablePatch={patch => patchPayable(selected.contractorPayableId, patch)}
          onDone={() => {
            setGovernance(null)
            void refetch()
          }}
        />
      ) : null}
    </Box>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────

const DetailPanel = ({
  payable,
  readinessLoading,
  readinessError,
  onGovernance
}: {
  payable: WorkbenchPayable
  readinessLoading: boolean
  readinessError: boolean
  onGovernance: (action: GovernanceAction) => void
}) => {
  const theme = useTheme()
  const blockers = payable.readiness.blockers ?? []
  const hasBlockers = blockers.length > 0
  const isExceeds = blockers.some(b => b.code === 'payment_exceeds_agreed_amount')
  const isProfile = blockers.some(b => b.code === 'payment_profile_unresolved')
  const isActionable = !['paid', 'cancelled', 'payment_order_created', 'obligation_created'].includes(payable.status)

  return (
    <Stack spacing={6}>
      <OperationalPanel
        title={C.detail.title}
        subheader={payable.contractorName}
        icon='tabler-receipt'
        iconColor={hasBlockers ? 'warning' : 'success'}
      >
        <Box
          sx={{
            p: 4,
            mb: 4,
            borderRadius: `${theme.shape.customBorderRadius.md}px`,
            bgcolor: alpha(theme.palette.primary.main, 0.04),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`
          }}
        >
          <Typography variant='overline' sx={{ color: 'text.secondary' }}>
            {C.detail.breakdownTitle}
          </Typography>
          <BreakdownRow label={C.detail.gross} value={money(payable.grossAmount, payable.currency)} />
          <BreakdownRow label={C.detail.withholding} value={`− ${money(payable.withholdingAmount, payable.currency)}`} muted />
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
              {C.detail.net}
            </Typography>
            <Typography
              variant='h5'
              sx={theme => ({ fontWeight: 700, color: theme.greenhouseSemantic.success.tonalText, fontVariantNumeric: 'tabular-nums' })}
            >
              {money(payable.netPayable, payable.currency)}
            </Typography>
          </Box>
          <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
            {C.detail.netNote}
          </Typography>
        </Box>

        <Stack spacing={1.5}>
          <DetailRow label={C.detail.metaEngagement} value={payable.engagementPublicId} />
          <DetailRow label={C.detail.metaCurrency} value={payable.currency} />
          <DetailRow label={C.detail.metaSource} value={payable.payableSourceKind === 'off_cycle' ? 'Off-cycle' : 'Envío'} />
          <DetailRow label={C.detail.metaDue} value={payable.dueDate ?? '—'} />
        </Stack>
      </OperationalPanel>

      <OperationalPanel title={C.detail.readinessTitle} icon='tabler-shield-check' iconColor={hasBlockers ? 'error' : 'success'}>
        {readinessLoading ? (
          <Alert severity='info' icon={<CircularProgress size={18} />}>
            {C.detail.readinessChecking}
          </Alert>
        ) : readinessError ? (
          <Alert severity='warning' icon={<i className='tabler-alert-triangle' />}>
            {C.detail.readinessRefreshFailed}
          </Alert>
        ) : hasBlockers ? (
          <Stack spacing={2}>
            {blockers.map(b => (
              <Box
                key={b.code}
                sx={{
                  p: 3,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                  bgcolor: alpha(theme.palette.error.main, 0.04)
                }}
              >
                <Stack direction='row' spacing={2} justifyContent='space-between' alignItems='flex-start'>
                  <Typography variant='body2'>{C.blocker[b.code as keyof typeof C.blocker] ?? b.message}</Typography>
                  <CustomChip
                    round='true'
                    size='small'
                    variant='tonal'
                    color={FINANCE_PAYMENTS_BLOCKER_RESPONSIBLE[b.code] === 'Finanzas' ? 'warning' : 'secondary'}
                    label={FINANCE_PAYMENTS_BLOCKER_RESPONSIBLE[b.code] ?? 'HR'}
                  />
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : (
          <Alert severity='success' icon={<i className='tabler-circle-check' />}>
            {C.detail.readinessOk}
          </Alert>
        )}

        {isActionable ? (
          <>
            <Divider sx={{ my: 4 }} />
            <Stack direction='row' spacing={2} flexWrap='wrap'>
              <Button
                variant='contained'
                startIcon={<i className='tabler-send' />}
                disabled={readinessLoading || readinessError || hasBlockers}
                onClick={() => onGovernance('ready')}
              >
                {C.actions.sendToFinance}
              </Button>
              {isExceeds ? (
                <Button variant='tonal' color='error' startIcon={<i className='tabler-lock-open' />} onClick={() => onGovernance('override')}>
                  {C.actions.override}
                </Button>
              ) : null}
              {isProfile ? (
                <Button variant='tonal' color='warning' startIcon={<i className='tabler-file-shield' />} onClick={() => onGovernance('waive')}>
                  {C.actions.waive}
                </Button>
              ) : null}
              <Button variant='tonal' color='secondary' startIcon={<i className='tabler-x' />} onClick={() => onGovernance('cancel')}>
                {C.actions.cancel}
              </Button>
            </Stack>
          </>
        ) : null}
      </OperationalPanel>
    </Stack>
  )
}

const BreakdownRow = ({ label, value, muted }: { label: string; value: string; muted?: boolean }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
    <Typography variant='body2' sx={{ color: muted ? 'text.secondary' : 'text.primary' }}>
      {label}
    </Typography>
    <Typography variant='body2' sx={{ color: muted ? 'text.secondary' : 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </Typography>
  </Box>
)

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
      {label}
    </Typography>
    <Typography variant='body2' sx={{ fontWeight: 500 }}>
      {value}
    </Typography>
  </Box>
)

// ── Governance dialog (wired) ─────────────────────────────────────────────────

const GovernanceDialog = ({
  action,
  payable,
  onClose,
  onPayablePatch,
  onDone
}: {
  action: GovernanceAction | null
  payable: WorkbenchPayable
  onClose: () => void
  onPayablePatch: (patch: Partial<WorkbenchPayable>) => void
  onDone: () => void
}) => {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [errBlockers, setErrBlockers] = useState<ReadinessBlocker[]>([])

  useEffect(() => {
    setReason('')
    setErr(null)
    setErrBlockers([])
  }, [action])

  if (!action) return null

  const config = {
    ready: { title: C.governance.readyTitle, intro: C.governance.readyIntro, needsReason: false, color: 'primary' as const, path: 'ready' },
    cancel: { title: C.governance.cancelTitle, intro: C.governance.cancelIntro, needsReason: false, color: 'secondary' as const, path: 'cancel' },
    waive: { title: C.governance.waiveTitle, intro: C.governance.waiveIntro, needsReason: true, color: 'warning' as const, path: 'waive-payment-profile' },
    override: { title: C.governance.overrideTitle, intro: C.governance.overrideIntro, needsReason: true, color: 'error' as const, path: 'override-agreed-amount' }
  }[action]

  const reasonOk = !config.needsReason || reason.trim().length >= 10

  const submit = async () => {
    setSubmitting(true)
    setErr(null)

    try {
      const res = await fetch(`/api/finance/contractor-payables/${encodeURIComponent(payable.contractorPayableId)}/${config.path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.needsReason || action === 'cancel' ? { reason: reason.trim() } : {})
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string
          readiness?: WorkbenchReadiness
          blockers?: ReadinessBlocker[]
        } | null

        const readiness =
          body?.readiness ??
          (body?.blockers
            ? {
                ready: false,
                blockers: body.blockers,
                evaluatedAt: new Date().toISOString()
              }
            : null)

        if (readiness) {
          onPayablePatch({
            readiness,
            ...(action === 'ready' && readiness.ready === false ? { status: 'blocked' as WorkbenchStatus } : {})
          })
          setErrBlockers(readiness.blockers ?? [])
        }

        setErr(body?.error ?? 'No se pudo completar la acción. Intenta de nuevo.')

        return
      }

      toast.success('Acción aplicada.')
      onDone()
    } catch {
      setErr('No se pudo completar la acción. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth='xs' fullWidth aria-labelledby='gov-title'>
      <DialogTitle id='gov-title' sx={{ fontWeight: 600 }}>
        {config.title}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {config.intro}
          </Typography>
          {config.needsReason ? (
            <CustomTextField label={C.governance.reasonLabel} value={reason} onChange={e => setReason(e.target.value)} multiline minRows={3} fullWidth helperText={C.governance.reasonHelper} />
          ) : null}
          {err ? <Alert severity='error'>{err}</Alert> : null}
          {errBlockers.length > 0 ? (
            <Stack spacing={1.5}>
              {errBlockers.map(blocker => (
                <Alert key={blocker.code} severity='warning' icon={<i className='tabler-shield-x' />}>
                  {C.blocker[blocker.code as keyof typeof C.blocker] ?? blocker.message}
                </Alert>
              ))}
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 5 }}>
        <Button variant='tonal' color='secondary' onClick={onClose}>
          {C.governance.cancel}
        </Button>
        <Button variant='contained' color={config.color} disabled={!reasonOk || submitting} onClick={() => void submit()}>
          {C.governance.confirm}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Create menu + dialog (wired) ──────────────────────────────────────────────

const CreateMenu = ({ onCreated }: { onCreated: () => void }) => {
  const [mode, setMode] = useState<'submission' | 'off_cycle' | null>(null)

  return (
    <>
      <Button variant='tonal' startIcon={<i className='tabler-file-import' />} onClick={() => setMode('submission')}>
        {C.header.createFromSubmissionCta}
      </Button>
      <Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => setMode('off_cycle')}>
        {C.header.createOffCycleCta}
      </Button>
      {mode ? (
        <CreateDialog
          mode={mode}
          onClose={() => setMode(null)}
          onCreated={() => {
            setMode(null)
            onCreated()
          }}
        />
      ) : null}
    </>
  )
}

const CreateDialog = ({
  mode,
  onClose,
  onCreated
}: {
  mode: 'submission' | 'off_cycle'
  onClose: () => void
  onCreated: () => void
}) => {
  const [submissionId, setSubmissionId] = useState('')
  const [engagementId, setEngagementId] = useState('')
  const [gross, setGross] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [readySubmissions, setReadySubmissions] = useState<ReadySubmission[]>([])
  const [loadingReadySubmissions, setLoadingReadySubmissions] = useState(false)

  const isOffCycle = mode === 'off_cycle'
  const grossNum = Number(gross.replace(/[^\d]/g, '')) || 0
  const ready = isOffCycle ? engagementId !== '' && grossNum > 0 && reason.trim().length >= 10 : submissionId.trim() !== ''

  useEffect(() => {
    setSubmissionId('')
    setErr(null)

    if (isOffCycle) return

    let alive = true

    const loadReadySubmissions = async () => {
      setLoadingReadySubmissions(true)

      try {
        const res = await fetch('/api/finance/contractor-payables/ready-submissions?limit=100', { cache: 'no-store' })

        if (!res.ok) {
          if (alive) setErr('No pudimos cargar los envíos aprobados.')

          return
        }

        const body = (await res.json().catch(() => null)) as { items?: ReadySubmission[] } | null

        if (alive) setReadySubmissions(body?.items ?? [])
      } catch {
        if (alive) setErr('No pudimos cargar los envíos aprobados.')
      } finally {
        if (alive) setLoadingReadySubmissions(false)
      }
    }

    void loadReadySubmissions()

    return () => {
      alive = false
    }
  }, [isOffCycle])

  const submit = async () => {
    setSubmitting(true)
    setErr(null)

    const payload = isOffCycle
      ? { contractorEngagementId: engagementId, grossAmount: grossNum, reason: reason.trim() }
      : { contractorWorkSubmissionId: submissionId.trim() }

    try {
      const res = await fetch('/api/finance/contractor-payables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null

        setErr(body?.error ?? 'No se pudo crear el payable. Intenta de nuevo.')

        return
      }

      toast.success('Payable creado.')
      onCreated()
    } catch {
      setErr('No se pudo crear el payable. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth='sm' fullWidth aria-labelledby='create-title'>
      <DialogTitle id='create-title' sx={{ fontWeight: 600 }}>
        {isOffCycle ? C.create.offCycleTitle : C.create.fromSubmissionTitle}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={4} sx={{ pt: 1 }}>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {isOffCycle ? C.create.offCycleIntro : C.create.fromSubmissionIntro}
          </Typography>

          {isOffCycle ? (
            <>
              <CustomTextField label={C.create.selectEngagement} value={engagementId} onChange={e => setEngagementId(e.target.value)} fullWidth placeholder='ceng-…' />
              <CustomTextField label={C.create.grossLabel} value={gross} onChange={e => setGross(e.target.value)} fullWidth placeholder='600.000' />
              <CustomTextField label={C.create.reasonLabel} value={reason} onChange={e => setReason(e.target.value)} multiline minRows={2} fullWidth helperText={C.create.reasonHelper} />
            </>
          ) : (
            <CustomTextField
              select
              label={C.create.selectSubmission}
              value={submissionId}
              onChange={e => setSubmissionId(e.target.value)}
              fullWidth
              disabled={loadingReadySubmissions || readySubmissions.length === 0}
              helperText={loadingReadySubmissions ? C.create.loadingSubmissions : readySubmissions.length === 0 ? C.create.emptySubmissions : undefined}
            >
              {readySubmissions.map(submission => (
                <MenuItem key={submission.contractorWorkSubmissionId} value={submission.contractorWorkSubmissionId}>
                  <Stack spacing={0.25}>
                    <Typography variant='body2' sx={{ fontWeight: 600 }}>
                      {submission.contractorName}
                    </Typography>
                    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                      {readySubmissionLabel(submission)}
                    </Typography>
                    <Typography variant='caption' sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                      {submission.grossAmount !== null ? money(submission.grossAmount, submission.currency ?? 'CLP') : 'Monto pendiente'} · {submission.engagementPublicId}
                    </Typography>
                  </Stack>
                </MenuItem>
              ))}
            </CustomTextField>
          )}

          {err ? <Alert severity='error'>{err}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 5 }}>
        <Button variant='tonal' color='secondary' onClick={onClose}>
          {C.create.cancel}
        </Button>
        <Button variant='contained' disabled={!ready || submitting} onClick={() => void submit()}>
          {C.create.confirm}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Monthly run (corrida mensual) ─────────────────────────────────────────────

interface MonthlyRunResult {
  cutoffDate: string
  obligationsSwept: number
  payablesIncluded: number
  totalsByCurrency: Record<string, { payables: number; netTotal: string }>
  alreadyPrepared: boolean
  preparedOrderIds: string[]
}

const MONTH_LABELS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]

const MonthlyRunButton = ({ onPrepared }: { onPrepared: () => void }) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant='tonal' color='primary' startIcon={<i className='tabler-calendar-bolt' />} onClick={() => setOpen(true)}>
        {C.header.monthlyRunCta}
      </Button>
      {open ? <MonthlyRunDialog onClose={() => setOpen(false)} onPrepared={onPrepared} /> : null}
    </>
  )
}

const MonthlyRunDialog = ({ onClose, onPrepared }: { onClose: () => void; onPrepared: () => void }) => {
  const theme = useTheme()
  const nowMonth = useMemo(() => new Date(), [])
  const currentYear = nowMonth.getFullYear()

  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(nowMonth.getMonth() + 1)
  const [preview, setPreview] = useState<MonthlyRunResult | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState<MonthlyRunResult | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const run = useCallback(
    async (dryRun: boolean): Promise<MonthlyRunResult | null> => {
      const res = await fetch('/api/finance/contractor-payables/monthly-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodYear: year, periodMonth: month, dryRun })
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null

        setErr(body?.error ?? C.monthlyRun.error)

        return null
      }

      const body = (await res.json().catch(() => null)) as { run?: MonthlyRunResult } | null

      return body?.run ?? null
    },
    [year, month]
  )

  useEffect(() => {
    if (done) return

    let active = true

    setPreviewing(true)
    setErr(null)
    void run(true).then(result => {
      if (active) {
        setPreview(result)
        setPreviewing(false)
      }
    })

    return () => {
      active = false
    }
  }, [run, done])

  const confirm = async () => {
    setConfirming(true)
    setErr(null)

    const result = await run(false)

    setConfirming(false)

    if (result) {
      setDone(result)
      onPrepared()
    }
  }

  const totals = (result: MonthlyRunResult) => Object.entries(result.totalsByCurrency)
  const canConfirm = !previewing && !confirming && preview !== null && preview.obligationsSwept > 0

  return (
    <Dialog open onClose={onClose} maxWidth='sm' fullWidth aria-labelledby='monthly-run-title'>
      <DialogTitle id='monthly-run-title' sx={{ fontWeight: 600 }}>
        {C.monthlyRun.title}
      </DialogTitle>
      <DialogContent>
        {done ? (
          <Stack spacing={3} sx={{ pt: 1 }}>
            {done.alreadyPrepared ? (
              <Alert severity='info' role='status'>
                {C.monthlyRun.alreadyPrepared}
              </Alert>
            ) : (
              <Alert severity='success' role='status' icon={<i className='tabler-circle-check' />}>
                <strong>{done.preparedOrderIds.length}</strong> {C.monthlyRun.doneOrders} ·{' '}
                <strong>{done.payablesIncluded}</strong> {C.monthlyRun.donePayables}.
              </Alert>
            )}
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {C.monthlyRun.note}
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={4} sx={{ pt: 1 }}>
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {C.monthlyRun.intro}
            </Typography>

            <Stack direction='row' spacing={2}>
              <CustomTextField
                select
                label={C.monthlyRun.monthLabel}
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                fullWidth
              >
                {MONTH_LABELS_ES.map((label, i) => (
                  <MenuItem key={label} value={i + 1}>
                    {label.charAt(0).toUpperCase() + label.slice(1)}
                  </MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select
                label={C.monthlyRun.yearLabel}
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                sx={{ minWidth: 120 }}
              >
                {[currentYear - 1, currentYear].map(y => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Stack>

            <Box
              sx={{
                p: 4,
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`
              }}
            >
              <Typography variant='overline' sx={{ color: 'text.secondary' }}>
                {C.monthlyRun.previewTitle}
              </Typography>

              {previewing ? (
                <Stack direction='row' spacing={2} alignItems='center' sx={{ mt: 2 }}>
                  <CircularProgress size={16} />
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    {C.monthlyRun.previewLoading}
                  </Typography>
                </Stack>
              ) : preview && preview.obligationsSwept > 0 ? (
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  <DetailRow label={C.monthlyRun.cutoffLabel} value={preview.cutoffDate} />
                  <DetailRow label={C.monthlyRun.payablesLabel} value={String(preview.payablesIncluded)} />
                  <Divider sx={{ my: 1 }} />
                  <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                    {C.monthlyRun.totalsLabel}
                  </Typography>
                  {totals(preview).map(([currency, t]) => (
                    <Box key={currency} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant='body2'>
                        {currency} · {t.payables} {t.payables === 1 ? 'pago' : 'pagos'}
                      </Typography>
                      <Typography variant='body2' sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {money(Number(t.netTotal), currency)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Box sx={{ mt: 2 }}>
                  <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                    {C.monthlyRun.nothingTitle}
                  </Typography>
                  <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5 }}>
                    {C.monthlyRun.nothing}
                  </Typography>
                </Box>
              )}
            </Box>

            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {C.monthlyRun.note}
            </Typography>

            {err ? <Alert severity='error'>{err}</Alert> : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 5 }}>
        <Button variant='tonal' color='secondary' onClick={onClose}>
          {done ? C.monthlyRun.close : C.monthlyRun.cancel}
        </Button>
        {done ? null : (
          <Button variant='contained' color='primary' disabled={!canConfirm} onClick={() => void confirm()}>
            {confirming ? C.monthlyRun.preparing : C.monthlyRun.confirm}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

// ── Descargar nómina (reporte de período PDF / Excel) ─────────────────────────

const ReportDownloadButton = () => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant='tonal' color='secondary' startIcon={<i className='tabler-download' />} onClick={() => setOpen(true)}>
        {C.header.reportCta}
      </Button>
      {open ? <ReportDownloadDialog onClose={() => setOpen(false)} /> : null}
    </>
  )
}

const ReportDownloadDialog = ({ onClose }: { onClose: () => void }) => {
  const now = useMemo(() => new Date(), [])
  const currentYear = now.getFullYear()

  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(now.getMonth() + 1)

  const download = (format: 'pdf' | 'excel') => {
    const href = `/api/finance/contractor-payables/run-report?periodYear=${year}&periodMonth=${month}&format=${format}`
    const link = document.createElement('a')

    link.href = href
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
    toast.success('Generando la descarga…')
  }

  return (
    <Dialog open onClose={onClose} maxWidth='xs' fullWidth aria-labelledby='report-download-title'>
      <DialogTitle id='report-download-title' sx={{ fontWeight: 600 }}>
        {C.report.title}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={4} sx={{ pt: 1 }}>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {C.report.intro}
          </Typography>
          <Stack direction='row' spacing={2}>
            <CustomTextField
              select
              label={C.report.monthLabel}
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              fullWidth
            >
              {MONTH_LABELS_ES.map((label, i) => (
                <MenuItem key={label} value={i + 1}>
                  {label.charAt(0).toUpperCase() + label.slice(1)}
                </MenuItem>
              ))}
            </CustomTextField>
            <CustomTextField
              select
              label={C.report.yearLabel}
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              sx={{ minWidth: 120 }}
            >
              {[currentYear - 1, currentYear].map(y => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </CustomTextField>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 5 }}>
        <Button variant='tonal' color='secondary' onClick={onClose}>
          {C.report.close}
        </Button>
        <Button variant='tonal' color='primary' startIcon={<i className='tabler-file-spreadsheet' />} onClick={() => download('excel')}>
          {C.report.downloadExcel}
        </Button>
        <Button variant='contained' color='primary' startIcon={<i className='tabler-file-type-pdf' />} onClick={() => download('pdf')}>
          {C.report.downloadPdf}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ContractorPaymentsWorkbenchView
