'use client'

// TASK-974 — Finance Contractor Payments Workbench (mockup).
//
// Surface for the Finance operator that PREPARES contractor payouts before they
// enter the payment-orders pipeline: list by status + KPIs + detail with the
// gross/withholding/net breakdown + readiness panel (13 blockers) + create
// (from approved submission / off-cycle) + governance dialogs (ready / cancel /
// waive / override — the override relocated here from the HR workbench by SoD).
// Real Vuexy/MUI primitives + framer-motion microinteractions, reduced-motion aware.

import { useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
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
import { alpha, useTheme, type Theme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
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

import {
  buildMockKpis,
  MOCK_APPROVED_SUBMISSIONS,
  MOCK_ENGAGEMENTS,
  MOCK_PAYABLES,
  MOCK_SII_RATE_2026,
  STATUS_TONE,
  type MockPayable,
  type MockPayableStatus
} from './contractor-payments-data'

type GovernanceAction = 'ready' | 'cancel' | 'waive' | 'override'
type CreateMode = 'submission' | 'off_cycle' | null

const STATUS_FILTERS: { value: 'all' | MockPayableStatus; label: string }[] = [
  { value: 'all', label: C.list.filterAll },
  { value: 'pending_readiness', label: C.status.pending_readiness },
  { value: 'blocked', label: C.status.blocked },
  { value: 'ready_for_finance', label: C.status.ready_for_finance },
  { value: 'obligation_created', label: C.status.obligation_created },
  { value: 'payment_order_created', label: C.status.payment_order_created },
  { value: 'paid', label: C.status.paid }
]

const money = (n: number, currency: string) =>
  formatCurrency(n, currency as CurrencyCode, { currencySymbolSpacing: ' ' }, 'es-CL')

const ContractorPaymentsMockupView = () => {
  const theme = useTheme()
  const prefersReduced = useReducedMotion()

  const [payables] = useState<MockPayable[]>(MOCK_PAYABLES)
  const [statusFilter, setStatusFilter] = useState<'all' | MockPayableStatus>('all')
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_PAYABLES[0]?.contractorPayableId ?? null)
  const [governance, setGovernance] = useState<GovernanceAction | null>(null)
  const [reason, setReason] = useState('')
  const [createMode, setCreateMode] = useState<CreateMode>(null)
  const [offCycleGross, setOffCycleGross] = useState('')

  const kpis = useMemo(() => buildMockKpis(payables), [payables])

  const visible = useMemo(
    () => (statusFilter === 'all' ? payables : payables.filter(p => p.status === statusFilter)),
    [payables, statusFilter]
  )

  const selected = useMemo(
    () => payables.find(p => p.contractorPayableId === selectedId) ?? null,
    [payables, selectedId]
  )

  const entrance = (i: number) => ({
    initial: prefersReduced ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay: prefersReduced ? 0 : i * 0.06, ease: [0.2, 0, 0, 1] as const }
  })

  const offCycleNet = useMemo(() => {
    const gross = Number(offCycleGross.replace(/[^\d]/g, '')) || 0

    return Math.round(gross * (1 - MOCK_SII_RATE_2026))
  }, [offCycleGross])

  return (
    <Box sx={{ p: { xs: 4, md: 6 }, maxWidth: 1440, mx: 'auto' }}>
      {/* Header */}
      <motion.div {...entrance(0)}>
        <Card elevation={0} sx={{ mb: 6, border: `1px solid ${theme.palette.divider}` }}>
          <CardContent
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
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
              <Button
                variant='tonal'
                startIcon={<i className='tabler-file-import' />}
                onClick={() => setCreateMode('submission')}
              >
                {C.header.createFromSubmissionCta}
              </Button>
              <Button
                variant='contained'
                startIcon={<i className='tabler-plus' />}
                onClick={() => setCreateMode('off_cycle')}
              >
                {C.header.createOffCycleCta}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </motion.div>

      {/* KPI row */}
      <motion.div {...entrance(1)}>
        <Grid container spacing={6} sx={{ mb: 6 }}>
          {[
            { title: C.kpi.toPrepare, sub: C.kpi.toPrepareSub, count: kpis.toPrepareCount, net: kpis.toPrepareNet, icon: 'tabler-clipboard-list', color: 'warning' as const },
            { title: C.kpi.blocked, sub: C.kpi.blockedSub, count: kpis.blockedCount, net: kpis.blockedNet, icon: 'tabler-alert-triangle', color: 'error' as const },
            { title: C.kpi.readyForFinance, sub: C.kpi.readyForFinanceSub, count: kpis.readyCount, net: kpis.readyNet, icon: 'tabler-circle-check', color: 'success' as const },
            { title: C.kpi.paid, sub: C.kpi.paidSub, count: kpis.paidCount, net: kpis.paidNet, icon: 'tabler-building-bank', color: 'info' as const }
          ].map(k => (
            <Grid key={k.title} size={{ xs: 12, sm: 6, md: 3 }}>
              <MetricSummaryCard
                title={k.title}
                value={
                  <Stack direction='row' spacing={2} alignItems='baseline'>
                    <AnimatedCounter value={k.count} format='integer' duration={prefersReduced ? 0 : 0.6} />
                    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                      {money(k.net, 'CLP')}
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

      {/* Main: list + detail */}
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
                  onChange={e => setStatusFilter(e.target.value as 'all' | MockPayableStatus)}
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
                            sx={{
                              cursor: 'pointer',
                              bgcolor: isSel ? alpha(theme.palette.primary.main, 0.08) : undefined
                            }}
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
                              <CustomChip round='true' size='small' color={STATUS_TONE[p.status]} label={C.status[p.status]} />
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

        {/* Detail + readiness */}
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
                    onGovernance={action => {
                      setReason('')
                      setGovernance(action)
                    }}
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

      {/* Governance dialogs */}
      <GovernanceDialog
        action={governance}
        payable={selected}
        reason={reason}
        onReason={setReason}
        onClose={() => setGovernance(null)}
      />

      {/* Create dialogs */}
      <CreateDialog
        mode={createMode}
        offCycleGross={offCycleGross}
        offCycleNet={offCycleNet}
        onOffCycleGross={setOffCycleGross}
        onClose={() => {
          setCreateMode(null)
          setOffCycleGross('')
        }}
      />
    </Box>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────

const DetailPanel = ({
  payable,
  onGovernance
}: {
  payable: MockPayable
  onGovernance: (action: GovernanceAction) => void
}) => {
  const theme = useTheme()
  const hasBlockers = payable.blockers.length > 0
  const isExceeds = payable.blockers.some(b => b.code === 'payment_exceeds_agreed_amount')
  const isProfile = payable.blockers.some(b => b.code === 'payment_profile_unresolved')

  return (
    <Stack spacing={6}>
      <OperationalPanel
        title={C.detail.title}
        subheader={payable.contractorName}
        icon='tabler-receipt'
        iconColor={hasBlockers ? 'warning' : 'success'}
      >
        {/* Breakdown */}
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
            <Typography variant='h5' sx={{ fontWeight: 700, color: '#2E7D32', fontVariantNumeric: 'tabular-nums' }}>
              {money(payable.netPayable, payable.currency)}
            </Typography>
          </Box>
          <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
            {C.detail.netNote}
          </Typography>
        </Box>

        {/* Meta */}
        <Stack spacing={1.5}>
          <DetailRow label={C.detail.metaEngagement} value={payable.engagementPublicId} />
          <DetailRow label={C.detail.metaCurrency} value={payable.currency} />
          <DetailRow label={C.detail.metaSource} value={payable.payableSourceKind === 'off_cycle' ? 'Off-cycle' : 'Envío'} />
          <DetailRow label={C.detail.metaDue} value={payable.dueDate ?? '—'} />
        </Stack>
      </OperationalPanel>

      {/* Readiness */}
      <OperationalPanel
        title={C.detail.readinessTitle}
        icon='tabler-shield-check'
        iconColor={hasBlockers ? 'error' : 'success'}
      >
        {hasBlockers ? (
          <Stack spacing={2}>
            {payable.blockers.map(b => (
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
                  <Typography variant='body2'>{b.message}</Typography>
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

        <Divider sx={{ my: 4 }} />

        {/* Governance actions */}
        <Stack direction='row' spacing={2} flexWrap='wrap'>
          <Button
            variant='contained'
            startIcon={<i className='tabler-send' />}
            disabled={hasBlockers && !isProfile}
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

// ── Governance dialog ─────────────────────────────────────────────────────────

const GovernanceDialog = ({
  action,
  payable,
  reason,
  onReason,
  onClose
}: {
  action: GovernanceAction | null
  payable: MockPayable | null
  reason: string
  onReason: (v: string) => void
  onClose: () => void
}) => {
  if (!action || !payable) return null

  const config = {
    ready: { title: C.governance.readyTitle, intro: C.governance.readyIntro, needsReason: false, color: 'primary' as const },
    cancel: { title: C.governance.cancelTitle, intro: C.governance.cancelIntro, needsReason: false, color: 'secondary' as const },
    waive: { title: C.governance.waiveTitle, intro: C.governance.waiveIntro, needsReason: true, color: 'warning' as const },
    override: { title: C.governance.overrideTitle, intro: C.governance.overrideIntro, needsReason: true, color: 'error' as const }
  }[action]

  const reasonOk = !config.needsReason || reason.trim().length >= 10

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
            <CustomTextField
              label={C.governance.reasonLabel}
              value={reason}
              onChange={e => onReason(e.target.value)}
              multiline
              minRows={3}
              fullWidth
              helperText={C.governance.reasonHelper}
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 5 }}>
        <Button variant='tonal' color='secondary' onClick={onClose}>
          {C.governance.cancel}
        </Button>
        <Button variant='contained' color={config.color} disabled={!reasonOk} onClick={onClose}>
          {C.governance.confirm}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Create dialog ─────────────────────────────────────────────────────────────

const CreateDialog = ({
  mode,
  offCycleGross,
  offCycleNet,
  onOffCycleGross,
  onClose
}: {
  mode: CreateMode
  offCycleGross: string
  offCycleNet: number
  onOffCycleGross: (v: string) => void
  onClose: () => void
}) => {
  const theme = useTheme()
  const [submissionId, setSubmissionId] = useState('')
  const [engagementId, setEngagementId] = useState('')
  const [reason, setReason] = useState('')

  if (!mode) return null

  const isOffCycle = mode === 'off_cycle'
  const reasonOk = !isOffCycle || reason.trim().length >= 10
  const submissionOk = isOffCycle || submissionId !== ''
  const selectedSub = MOCK_APPROVED_SUBMISSIONS.find(s => s.id === submissionId)
  const subNet = selectedSub ? Math.round(selectedSub.gross * (1 - MOCK_SII_RATE_2026)) : 0

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
              <CustomTextField
                select
                label={C.create.selectEngagement}
                value={engagementId}
                onChange={e => setEngagementId(e.target.value)}
                fullWidth
              >
                {MOCK_ENGAGEMENTS.map(e => (
                  <MenuItem key={e.id} value={e.id}>
                    {e.contractorName} · {e.publicId}
                  </MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                label={C.create.grossLabel}
                value={offCycleGross}
                onChange={e => onOffCycleGross(e.target.value)}
                fullWidth
                placeholder='600.000'
              />
              <CustomTextField
                label={C.create.reasonLabel}
                value={reason}
                onChange={e => setReason(e.target.value)}
                multiline
                minRows={2}
                fullWidth
                helperText={C.create.reasonHelper}
              />
              <NetPreview label={C.create.previewNet} value={offCycleNet} theme={theme} />
            </>
          ) : (
            <>
              <CustomTextField
                select
                label={C.create.selectSubmission}
                value={submissionId}
                onChange={e => setSubmissionId(e.target.value)}
                fullWidth
              >
                {MOCK_APPROVED_SUBMISSIONS.map(s => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.contractorName} · {s.period} · {money(s.gross, s.currency)}
                  </MenuItem>
                ))}
              </CustomTextField>
              {selectedSub ? <NetPreview label={C.create.previewNet} value={subNet} theme={theme} /> : null}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 6, pb: 5 }}>
        <Button variant='tonal' color='secondary' onClick={onClose}>
          {C.create.cancel}
        </Button>
        <Button variant='contained' disabled={!reasonOk || !submissionOk} onClick={onClose}>
          {C.create.confirm}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const NetPreview = ({ label, value, theme }: { label: string; value: number; theme: Theme }) => (
  <Box
    sx={{
      p: 3,
      borderRadius: `${theme.shape.customBorderRadius.md}px`,
      bgcolor: alpha(theme.palette.success.main, 0.06),
      border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline'
    }}
  >
    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
      {label}
    </Typography>
    <Typography variant='h6' sx={{ fontWeight: 700, color: '#2E7D32', fontVariantNumeric: 'tabular-nums' }}>
      {money(value, 'CLP')}
    </Typography>
  </Box>
)

export default ContractorPaymentsMockupView
