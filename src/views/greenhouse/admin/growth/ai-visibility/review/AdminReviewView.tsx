'use client'

/**
 * TASK-1247 — Admin Review UI del AEO Grader · VIEW RUNTIME (data real).
 *
 * Gate humano pre-publicación (EPIC-020 F). Consume los contratos gobernados de TASK-1244:
 *  - Cola: `GET /api/admin/growth/ai-visibility/reviews` (reader enriquecido TASK-1247).
 *  - Evidencia: `GET .../runs/[runId]/report` → `{ report, publicReport }` (on-demand al abrir drawer).
 *  - Acción gobernada: `POST .../review/{approve,reject}` (el humano confirma; el LLM nunca aprueba).
 *
 * Reusa la presentación severity-driven de `shared.tsx` + adapters puros de `adapters.ts` — mismo
 * rendering que el mockup, sin drift. Estados honestos (loading/empty/error + drawer loading/error).
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Divider from '@mui/material/Divider'
import Grow from '@mui/material/Grow'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha, type Theme } from '@mui/material/styles'

import {
  AdaptiveSidecarLayout,
  CompositionShell,
  GreenhouseBreadcrumbs,
  GreenhouseButton,
  GreenhouseChip
} from '@/components/greenhouse/primitives'
import { throwIfNotOk } from '@/lib/api/parse-error-response'
import { formatRelative } from '@/lib/format/relative'
import { type GraderReport, type PublicGraderReport } from '@/lib/growth/ai-visibility/report/contracts'
import { type PendingReportReview } from '@/lib/growth/ai-visibility/review/queries'
import { GH_GROWTH_AI_VISIBILITY_ADMIN_REVIEW as C } from '@/lib/copy/growth'

import {
  buildReportDetailVM,
  type EnginePresenceVM,
  type InternalReasonVM,
  type ReportDetailVM
} from './adapters'
import {
  cardSx,
  QueueSkeleton,
  RetryButton,
  ScoreBadge,
  ScoreRing,
  Section,
  severityBarColor,
  severityChipTone,
  severityColor,
  severityColorToken,
  severityRiskLabel,
  StateBlock,
  SummaryStat
} from './shared'

// ─── Endpoints (Full API parity: la UI es cliente de los contratos, no dueña de la lógica) ──

const REVIEWS_URL = '/api/admin/growth/ai-visibility/reviews'
const reportUrl = (runId: string) => `/api/admin/growth/ai-visibility/runs/${encodeURIComponent(runId)}/report`
const approveUrl = (runId: string) => `${reportUrl(runId).replace('/report', '')}/review/approve`
const rejectUrl = (runId: string) => `${reportUrl(runId).replace('/report', '')}/review/reject`

const relativeLabel = (iso: string | null, fallback: string): string =>
  iso ? formatRelative(iso, {}, 'es-CL') : fallback

// ─── Cola ───────────────────────────────────────────────────────────────────────────

const reasonSummary = (reasons: string[]): string => {
  if (reasons.length === 0) return '—'
  if (reasons.length === 1) return reasons[0]!

  return `${reasons[0]} (+${reasons.length - 1})`
}

const QueueTable = ({
  rows,
  selectedRunId,
  onSelect
}: {
  rows: PendingReportReview[]
  selectedRunId: string | null
  onSelect: (row: PendingReportReview) => void
}) => (
  <Box data-capture='admin-review-queue' sx={{ minWidth: 0 }}>
    <Typography variant='h5' sx={{ mb: 3 }}>
      {C.queue.title}
    </Typography>
    <Box sx={{ overflowX: 'auto' }}>
      <Table size='small' sx={{ minWidth: 720 }}>
        <TableHead>
          <TableRow>
            <TableCell>{C.queue.colBrand}</TableCell>
            <TableCell>{C.queue.colStatus}</TableCell>
            <TableCell align='center'>{C.queue.colScore}</TableCell>
            <TableCell>{C.queue.colRisk}</TableCell>
            <TableCell>{C.queue.colAge}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(row => {
            const selected = row.runId === selectedRunId

            return (
              <TableRow
                key={row.runId}
                hover
                selected={selected}
                tabIndex={0}
                onClick={() => onSelect(row)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(row)
                  }
                }}
                sx={{
                  cursor: 'pointer',
                  transition: 'box-shadow 150ms ease, background-color 150ms ease',
                  '& td:first-of-type': { boxShadow: 'inset 3px 0 0 transparent', transition: 'box-shadow 150ms ease' },
                  '&:hover td:first-of-type': { boxShadow: (t: Theme) => `inset 3px 0 0 ${t.palette.primary.main}` },
                  '&:focus-visible': {
                    outline: (t: Theme) => `2px solid ${t.palette.primary.main}`,
                    outlineOffset: '-2px'
                  },
                  ...(selected && {
                    bgcolor: (t: Theme) => alpha(t.palette.primary.main, 0.06),
                    '& td:first-of-type': { boxShadow: (t: Theme) => `inset 3px 0 0 ${t.palette.primary.main}` }
                  })
                }}
              >
                <TableCell>
                  <Typography variant='body2' sx={{ fontWeight: 600 }}>
                    {row.brandName}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {row.websiteUrl ?? row.market}
                    {row.websiteUrl && ` · ${row.market}`}
                  </Typography>
                </TableCell>
                <TableCell>
                  <GreenhouseChip kind='status' size='small' variant='label' tone='warning' label='review_required' />
                </TableCell>
                <TableCell align='center'>
                  <Box sx={{ display: 'inline-flex' }}>
                    <ScoreBadge score={row.overallScore} severity={row.overallSeverity} />
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant='body2'>{severityRiskLabel[row.overallSeverity]}</Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {reasonSummary(row.reviewReasons)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant='body2' color='text.secondary'>
                    {relativeLabel(row.finishedAt, relativeLabel(row.createdAt, '—'))}
                  </Typography>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Box>
  </Box>
)

// ─── Detalle (drawer) ───────────────────────────────────────────────────────────────

const PerEngineRow = ({ e }: { e: EnginePresenceVM }) => (
  <Stack direction='row' alignItems='center' spacing={3} sx={{ py: 1.5 }}>
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        flexShrink: 0,
        bgcolor: (t: Theme) => (e.present ? t.palette.success.main : alpha(t.palette.text.disabled, 0.5))
      }}
    />
    <Box sx={{ minWidth: 140 }}>
      <Typography variant='body2' sx={{ fontWeight: 600 }}>
        {e.label}
      </Typography>
      <Typography variant='caption' color={e.present ? 'success.main' : 'text.secondary'}>
        {e.present ? C.detail.present : C.detail.absent}
      </Typography>
    </Box>
    <Box sx={{ flex: 1 }} />
    <Typography variant='caption' color='text.secondary'>
      {e.resolved} {C.detail.responsesEvaluated}
    </Typography>
  </Stack>
)

const InternalReasonCard = ({ r, index }: { r: InternalReasonVM; index: number }) => (
  <Grow in timeout={320} style={{ transitionDelay: `${index * 55}ms` }}>
    <Card
      elevation={0}
      sx={t => ({ ...cardSx(t), borderLeft: `3px solid ${severityColor(t, r.severity)}`, p: 3 })}
    >
      <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={2}>
        <Typography variant='body2' sx={{ fontWeight: 600 }}>
          {r.title}
        </Typography>
        <GreenhouseChip
          kind='status'
          size='small'
          variant='label'
          tone={severityChipTone(r.severity)}
          label={severityRiskLabel[r.severity]}
        />
      </Stack>
      <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
        {r.detail}
      </Typography>
      {r.evidenceCount !== null && (
        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 2 }}>
          {C.detail.evidence}: {r.evidenceCount}
        </Typography>
      )}
    </Card>
  </Grow>
)

const DetailSkeleton = () => (
  <Box role='status' aria-busy='true' aria-label={C.detail.loadingReport} sx={{ p: 4 }}>
    <Skeleton variant='text' width='55%' height={30} />
    <Skeleton variant='text' width='35%' height={18} sx={{ mb: 3 }} />
    <Skeleton variant='rounded' height={90} sx={{ mb: 3 }} />
    <Skeleton variant='rounded' height={160} sx={{ mb: 3 }} />
    <Skeleton variant='rounded' height={200} />
  </Box>
)

const ReportDetailPanel = ({
  vm,
  actionState,
  actionError,
  rejectReason,
  rejectReasonError,
  onRejectReasonChange,
  onClose,
  onApprove,
  onReject
}: {
  vm: ReportDetailVM
  actionState: ActionState
  actionError: string | null
  rejectReason: string
  rejectReasonError: boolean
  onRejectReasonChange: (v: string) => void
  onClose: () => void
  onApprove: () => void
  onReject: () => void
}) => {
  const busy = actionState !== 'idle'

  return (
    <Box
      data-capture='admin-review-detail'
      sx={{ height: '100%', maxHeight: '100vh', display: 'flex', flexDirection: 'column', minWidth: 0, bgcolor: 'background.paper' }}
    >
      {/* Header fijo */}
      <Stack
        direction='row'
        alignItems='flex-start'
        justifyContent='space-between'
        sx={{ px: 4, pt: 4, pb: 3, borderBottom: (t: Theme) => `1px solid ${t.palette.divider}` }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant='h5'>
            {vm.brand}{' '}
            {vm.domain && (
              <Typography component='span' variant='body2' color='text.secondary'>
                {vm.domain}
              </Typography>
            )}
          </Typography>
          <Stack direction='row' spacing={4} sx={{ mt: 1 }} flexWrap='wrap'>
            <Typography variant='caption' color='text.secondary'>
              {C.detail.market} · {vm.market}
            </Typography>
            {vm.categoryLabel && (
              <Typography variant='caption' color='text.secondary'>
                {C.detail.category} · {vm.categoryLabel}
              </Typography>
            )}
            {vm.asOfDate && (
              <Typography variant='caption' color='text.secondary'>
                {C.detail.provenanceAsOf} {vm.asOfDate}
              </Typography>
            )}
          </Stack>
        </Box>
        <IconButton size='small' onClick={onClose} aria-label={C.detail.close}>
          <i className='tabler-x' aria-hidden='true' />
        </IconButton>
      </Stack>

      {/* Contenido scrollable */}
      <Box sx={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0, px: 4, py: 4 }}>
        <Stack spacing={4}>
          {/* HERO: score + severidad + razón del gate */}
          <Card
            elevation={0}
            sx={(t: Theme) => ({
              ...cardSx(t),
              borderLeft: `3px solid ${severityColor(t, vm.severity)}`,
              bgcolor: alpha(severityColor(t, vm.severity), 0.04),
              p: 3
            })}
          >
            <Stack direction='row' alignItems='center' spacing={4}>
              <ScoreRing score={vm.score} severity={vm.severity} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction='row' alignItems='center' spacing={2} flexWrap='wrap'>
                  <GreenhouseChip
                    kind='status'
                    size='small'
                    variant='label'
                    tone={severityChipTone(vm.severity)}
                    label={`${C.detail.riskLabel} ${severityRiskLabel[vm.severity].toLowerCase()}`}
                  />
                  <Typography variant='body2' sx={{ fontWeight: 600 }}>
                    {vm.gateReason}
                  </Typography>
                </Stack>
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
                  {vm.gateNextAction || C.detail.consequenceBody}
                </Typography>
              </Box>
            </Stack>
          </Card>

          {/* Estado de evidencia (abstención / incompleta) */}
          {vm.abstained ? (
            <Box
              sx={{
                p: 3,
                borderRadius: (t: Theme) => `${t.shape.customBorderRadius.md}px`,
                bgcolor: (t: Theme) => alpha(t.palette.error.main, 0.06),
                display: 'flex',
                gap: 2
              }}
            >
              <i className='tabler-alert-octagon' aria-hidden='true' style={{ color: 'var(--mui-palette-error-main)' }} />
              <Box>
                <Typography variant='body2' sx={{ fontWeight: 600 }} color='error.main'>
                  {C.evidence.abstainedTitle}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {C.evidence.abstainedBody}
                </Typography>
              </Box>
            </Box>
          ) : vm.evidenceIncomplete ? (
            <Box
              sx={{
                p: 3,
                borderRadius: (t: Theme) => `${t.shape.customBorderRadius.md}px`,
                bgcolor: (t: Theme) => alpha(t.palette.warning.main, 0.08),
                display: 'flex',
                gap: 2
              }}
            >
              <i className='tabler-alert-triangle' aria-hidden='true' style={{ color: 'var(--mui-palette-warning-main)' }} />
              <Box>
                <Typography variant='body2' sx={{ fontWeight: 600 }} color='warning.main'>
                  {C.evidence.incompleteTitle}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {C.evidence.incompleteBody}
                </Typography>
              </Box>
            </Box>
          ) : null}

          {/* Presencia por motor (capa-2 anti-falso-0) */}
          <Section title={C.detail.perEngineTitle} hint={C.detail.perEngineHint}>
            <Card elevation={0} sx={t => ({ ...cardSx(t), px: 3, py: 1 })}>
              {vm.perEngine.map((e, i) => (
                <Box key={e.provider} sx={i > 0 ? { borderTop: (t: Theme) => `1px solid ${t.palette.divider}` } : undefined}>
                  <PerEngineRow e={e} />
                </Box>
              ))}
            </Card>
          </Section>

          {/* Vista pública exacta (WYSIWYG) */}
          <Section
            title={C.detail.publicViewTitle}
            action={<GreenhouseChip kind='metric' size='small' variant='label' tone='info' label={C.detail.publicViewHint} />}
          >
            <Card elevation={0} sx={t => ({ ...cardSx(t), p: 3 })}>
              <Stack direction='row' justifyContent='space-between' alignItems='baseline'>
                <Typography variant='h4'>{vm.brand}</Typography>
                <Typography variant='kpiValue' color={severityColorToken(vm.severity)}>
                  {vm.score === null ? C.detail.noScore : vm.score}
                  {vm.score !== null && (
                    <Typography component='span' variant='body2' color='text.secondary'>
                      /100
                    </Typography>
                  )}
                </Typography>
              </Stack>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                {vm.publicSummary}
              </Typography>
              <Divider sx={{ my: 3 }} />
              <Stack spacing={2}>
                {vm.publicDimensions.map(d => (
                  <Box key={d.label}>
                    <Stack direction='row' justifyContent='space-between' sx={{ mb: 0.5 }}>
                      <Typography variant='caption'>{d.label}</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {d.score === null ? C.detail.noScore : `${d.score}/100`}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant='determinate'
                      value={d.score ?? 0}
                      color={severityBarColor(d.severity)}
                      sx={{ height: 6, borderRadius: 3, opacity: d.score === null ? 0.35 : 1 }}
                    />
                  </Box>
                ))}
              </Stack>
            </Card>
          </Section>

          {/* Razones internas (no públicas) — evidencia decisoria */}
          {vm.internalReasons.length > 0 && (
            <Section title={C.detail.internalReasonsTitle}>
              <Stack spacing={2}>
                {vm.internalReasons.map((r, i) => (
                  <InternalReasonCard key={r.id} r={r} index={i} />
                ))}
              </Stack>
            </Section>
          )}
        </Stack>
      </Box>

      {/* Footer de decisión fijo (acción de consecuencia siempre visible) */}
      <Box
        data-capture='admin-review-actions'
        sx={{ flexShrink: 0, px: 4, py: 3, borderTop: (t: Theme) => `1px solid ${t.palette.divider}`, bgcolor: 'background.paper' }}
      >
        <TextField
          fullWidth
          multiline
          minRows={1}
          size='small'
          value={rejectReason}
          onChange={e => onRejectReasonChange(e.target.value)}
          disabled={busy}
          error={rejectReasonError}
          label={C.decision.rejectReasonLabel}
          placeholder={C.decision.rejectReasonPlaceholder}
          helperText={rejectReasonError ? C.decision.rejectReasonRequired : ' '}
          sx={{ mb: 2 }}
        />
        {actionError && (
          <Typography variant='caption' color='error.main' sx={{ display: 'block', mb: 2 }}>
            {actionError}
          </Typography>
        )}
        <Stack direction='row' spacing={2}>
          <GreenhouseButton
            variant='outlined'
            kind='custom'
            tone='error'
            disabled={busy}
            onClick={onReject}
            leadingIcon={<i className='tabler-x' aria-hidden='true' />}
          >
            {actionState === 'rejecting' ? C.decision.rejecting : C.decision.reject}
          </GreenhouseButton>
          <Box sx={{ flex: 1 }} />
          <GreenhouseButton
            variant='outlined'
            kind='custom'
            tone='success'
            disabled={busy}
            onClick={onApprove}
            leadingIcon={<i className='tabler-check' aria-hidden='true' />}
          >
            {actionState === 'approving' ? C.decision.approving : C.decision.approve}
          </GreenhouseButton>
        </Stack>
      </Box>
    </Box>
  )
}

// ─── View principal ─────────────────────────────────────────────────────────────────

type QueueState = 'loading' | 'ready' | 'error'
type DetailState = 'idle' | 'loading' | 'ready' | 'error'
type ActionState = 'idle' | 'approving' | 'rejecting'

const DetailErrorBlock = ({ onRetry, onClose }: { onRetry: () => void; onClose: () => void }) => (
  <Box sx={{ p: 4 }}>
    <Stack direction='row' justifyContent='flex-end'>
      <IconButton size='small' onClick={onClose} aria-label={C.detail.close}>
        <i className='tabler-x' aria-hidden='true' />
      </IconButton>
    </Stack>
    <StateBlock
      capture='admin-review-detail-error'
      icon='tabler-alert-triangle'
      tone='warning'
      title={C.states.errorTitle}
      body={C.detail.reportError}
      action={<RetryButton label={C.states.retry} onClick={onRetry} />}
    />
  </Box>
)

const AdminReviewView = () => {
  const [queueState, setQueueState] = useState<QueueState>('loading')
  const [queue, setQueue] = useState<PendingReportReview[]>([])
  const [selectedRow, setSelectedRow] = useState<PendingReportReview | null>(null)
  const [detailState, setDetailState] = useState<DetailState>('idle')
  const [detailVM, setDetailVM] = useState<ReportDetailVM | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectReasonError, setRejectReasonError] = useState(false)
  const [actionState, setActionState] = useState<ActionState>('idle')
  const [actionError, setActionError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const loadQueue = useCallback(async () => {
    setQueueState('loading')

    try {
      const res = await fetch(REVIEWS_URL, { cache: 'no-store' })

      await throwIfNotOk(res, C.states.errorBody)
      const data = (await res.json()) as { items: PendingReportReview[] }

      setQueue(data.items ?? [])
      setQueueState('ready')
    } catch {
      setQueueState('error')
    }
  }, [])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  const closeDrawer = useCallback(() => {
    setSelectedRow(null)
    setDetailState('idle')
    setDetailVM(null)
    setRejectReason('')
    setRejectReasonError(false)
    setActionError(null)
  }, [])

  const openDetail = useCallback(async (row: PendingReportReview) => {
    setSelectedRow(row)
    setDetailState('loading')
    setDetailVM(null)
    setRejectReason('')
    setRejectReasonError(false)
    setActionError(null)

    try {
      const res = await fetch(reportUrl(row.runId), { cache: 'no-store' })

      await throwIfNotOk(res, C.detail.reportError)
      const data = (await res.json()) as { report: GraderReport; publicReport: PublicGraderReport }

      setDetailVM(buildReportDetailVM(data.report, data.publicReport, row))
      setDetailState('ready')
    } catch {
      setDetailState('error')
    }
  }, [])

  const afterDecision = useCallback(
    (message: string) => {
      setFeedback(message)
      closeDrawer()
      void loadQueue()
    },
    [closeDrawer, loadQueue]
  )

  const approve = useCallback(async () => {
    if (!selectedRow) return
    setActionState('approving')
    setActionError(null)

    try {
      const res = await fetch(approveUrl(selectedRow.runId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rejectReason.trim() ? { reason: rejectReason.trim() } : {})
      })

      await throwIfNotOk(res, C.decision.actionError)
      afterDecision(C.decision.approvedFeedback)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : C.decision.actionError)
      void loadQueue()
    } finally {
      setActionState('idle')
    }
  }, [selectedRow, rejectReason, afterDecision, loadQueue])

  const reject = useCallback(async () => {
    if (!selectedRow) return

    if (!rejectReason.trim()) {
      setRejectReasonError(true)

      return
    }

    setRejectReasonError(false)
    setActionState('rejecting')
    setActionError(null)

    try {
      const res = await fetch(rejectUrl(selectedRow.runId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() })
      })

      await throwIfNotOk(res, C.decision.actionError)
      afterDecision(C.decision.rejectedFeedback)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : C.decision.actionError)
      void loadQueue()
    } finally {
      setActionState('idle')
    }
  }, [selectedRow, rejectReason, afterDecision, loadQueue])

  const highRisk = queue.filter(r => r.overallSeverity === 'critico').length

  let sidecar: ReactNode = null

  if (selectedRow) {
    if (detailState === 'loading') {
      sidecar = <DetailSkeleton />
    } else if (detailState === 'error') {
      sidecar = <DetailErrorBlock onRetry={() => void openDetail(selectedRow)} onClose={closeDrawer} />
    } else if (detailVM) {
      sidecar = (
        <ReportDetailPanel
          vm={detailVM}
          actionState={actionState}
          actionError={actionError}
          rejectReason={rejectReason}
          rejectReasonError={rejectReasonError}
          onRejectReasonChange={v => {
            setRejectReason(v)

            if (v.trim()) setRejectReasonError(false)
          }}
          onClose={closeDrawer}
          onApprove={() => void approve()}
          onReject={() => void reject()}
        />
      )
    }
  }

  return (
    <Box sx={{ p: { xs: 4, md: 6 } }}>
      <GreenhouseBreadcrumbs
        items={[
          { label: C.breadcrumb.admin },
          { label: C.breadcrumb.growth },
          { label: C.breadcrumb.grader },
          { label: C.breadcrumb.review }
        ]}
      />
      <Box sx={{ mt: 2, mb: 4 }}>
        <Typography variant='h4'>{C.pageTitle}</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
          {C.pageSubtitle}
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 4 }}>
        <SummaryStat label={C.summary.pending} value={queueState === 'ready' ? String(queue.length) : '—'} severity='atencion' />
        <SummaryStat label={C.summary.highRisk} value={queueState === 'ready' ? String(highRisk) : '—'} severity='critico' />
      </Stack>

      <CompositionShell
        composition='single'
        fluidity='rich'
        instanceId='growth-ai-visibility-admin-review'
        regions={{
          primary: (
            <AdaptiveSidecarLayout
              open={selectedRow !== null}
              onOpenChange={open => {
                if (!open) closeDrawer()
              }}
              kind='reconciler'
              preferredMode='temporary'
              sidecar={sidecar}
              sidecarWidth={680}
              sidecarMinWidth={520}
              sidecarMaxWidth={820}
              mainMinWidth={320}
              panelEntrance='slide'
              dataCapture='growth-ai-visibility-admin-review-sidecar'
              source='task-1247-admin-review'
            >
              {queueState === 'loading' ? (
                <QueueSkeleton label={C.states.loading} />
              ) : queueState === 'error' ? (
                <StateBlock
                  capture='admin-review-error'
                  icon='tabler-alert-triangle'
                  tone='warning'
                  title={C.states.errorTitle}
                  body={C.states.errorBody}
                  action={<RetryButton label={C.states.retry} onClick={() => void loadQueue()} />}
                />
              ) : queue.length === 0 ? (
                <StateBlock
                  capture='admin-review-empty'
                  icon='tabler-checks'
                  tone='success'
                  title={C.states.emptyTitle}
                  body={C.states.emptyBody}
                />
              ) : (
                <QueueTable rows={queue} selectedRunId={selectedRow?.runId ?? null} onSelect={openDetail} />
              )}
            </AdaptiveSidecarLayout>
          )
        }}
      />

      <Snackbar
        open={feedback !== null}
        autoHideDuration={5000}
        onClose={() => setFeedback(null)}
        message={feedback ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}

export default AdminReviewView
