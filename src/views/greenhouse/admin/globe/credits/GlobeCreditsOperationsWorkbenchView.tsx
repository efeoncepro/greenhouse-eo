'use client'

import { useMemo, useRef, useState } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import {
  GreenhouseButton,
  GreenhouseChip,
  OperationalSection,
  SignalStrip,
  SurfaceRecipe,
  WorkbenchHeader
} from '@/components/greenhouse/primitives'
import { GH_GLOBE_CREDITS as C } from '@/lib/copy/globe-credits'
import { formatDateTime, formatNumber } from '@/lib/format'
import type { GlobeCreditCapacityStatus } from '@/lib/globe/credit-capacity-status'
import type { GlobeCreditFundingOperation } from '@/lib/globe/credit-funding-operations'

export interface GlobeCreditsWorkbenchModel {
  workspace: Readonly<{ id: string; name: string }>
  status: GlobeCreditCapacityStatus | null
  operations: readonly GlobeCreditFundingOperation[]
  loadError: boolean
  canEnsure: boolean
  canReconcile: boolean
}

const credits = (value: number | undefined) =>
  value === undefined ? '—' : formatNumber(value, { maximumFractionDigits: 0 }, 'es-CL')

const dateTime = (value: string) =>
  formatDateTime(value, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }, 'es-CL')

const stateTone = (state: GlobeCreditCapacityStatus['state']) =>
  state === 'ready' ? 'success' : state === 'limited' ? 'warning' : state === 'blocked' ? 'error' : 'default'

const operationState = (state: string) => C.operationState[state as keyof typeof C.operationState] ?? state

const receiptOutcome = (outcome: string | undefined) =>
  outcome ? C.receiptOutcome[outcome as keyof typeof C.receiptOutcome] ?? outcome : '—'

const blockerLabel = (blocker: string) => C.blocker[blocker as keyof typeof C.blocker] ?? blocker

type FundingFeedback = Readonly<{
  severity: 'success' | 'warning' | 'error'
  message: string
  operationId?: string
}>

const positiveInteger = (value: string) => {
  const parsed = Number(value)

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined
}

const GlobeCreditsOperationsWorkbenchView = ({ model }: { model: GlobeCreditsWorkbenchModel }) => {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(model.operations[0]?.operationId ?? null)
  const [fundingOpen, setFundingOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reconcilingId, setReconcilingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FundingFeedback | null>(null)
  const operationKeyRef = useRef<string | null>(null)

  const [targetAvailableCredits, setTargetAvailableCredits] = useState(() =>
    String(Math.max(model.status?.effectiveAvailable ?? 0, 1))
  )

  const [maxGrantCredits, setMaxGrantCredits] = useState(() =>
    String(Math.max(model.status?.eligibleFunding ?? 0, 1))
  )

  const [maxResultingCapCredits, setMaxResultingCapCredits] = useState(() =>
    String(Math.max(model.status?.monthly?.cap ?? 0, model.status?.effectiveAvailable ?? 0, 1))
  )

  const selected = useMemo(
    () => model.operations.find(operation => operation.operationId === selectedId) ?? null,
    [model.operations, selectedId]
  )

  const status = model.status
  const target = positiveInteger(targetAvailableCredits)
  const maxGrant = positiveInteger(maxGrantCredits)
  const maxCap = positiveInteger(maxResultingCapCredits)
  const fundingInputValid = Boolean(target && maxGrant && maxCap && target <= maxCap)
  const canOpenFunding = model.canEnsure && Boolean(status) && status?.state !== 'unknown'

  const reconcileOperation = async (operation: GlobeCreditFundingOperation) => {
    setReconcilingId(operation.operationId)
    setFeedback(null)

    try {
      const response = await fetch(
        `/api/admin/globe/credits/funding/operations/${encodeURIComponent(operation.operationId)}/reconcile?workspaceId=${encodeURIComponent(model.workspace.id)}`,
        {
          method: 'POST',
          headers: { 'idempotency-key': `gh-ui-reconcile:${operation.operationId}` }
        }
      )

      const payload = (await response.json().catch(() => null)) as
        | { operation?: GlobeCreditFundingOperation; error?: string; code?: string }
        | null

      if (!response.ok || !payload?.operation) {
        setFeedback({
          severity: 'error',
          message: payload?.error ? `${payload.error}${payload.code ? ` (${payload.code})` : ''}` : C.recovery.failed
        })

        return
      }

      const stillUnknown = payload.operation.state === 'outcome_unknown' || payload.operation.receipt?.outcome === 'outcome_unknown'

      setFeedback({
        severity: stillUnknown ? 'warning' : 'success',
        message: stillUnknown ? C.recovery.stillUnknown : C.recovery.completed,
        operationId: payload.operation.operationId
      })
      router.refresh()
    } catch {
      setFeedback({ severity: 'error', message: C.recovery.failed, operationId: operation.operationId })
    } finally {
      setReconcilingId(null)
    }
  }

  const submitFunding = async () => {
    if (!status || !target || !maxGrant || !maxCap || target > maxCap) {
      setFeedback({ severity: 'error', message: C.funding.invalid })

      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const periodKey = status.period.start.slice(0, 7)

      const operationKey =
        operationKeyRef.current ?? `gh-ui:${model.workspace.id}:${periodKey}:${globalThis.crypto.randomUUID()}`

      operationKeyRef.current = operationKey

      const response = await fetch('/api/admin/globe/credits/funding/ensure', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': operationKey
        },
        body: JSON.stringify({
          globeWorkspaceId: model.workspace.id,
          periodKey,
          periodStart: status.period.start,
          periodEnd: status.period.end,
          targetAvailableCredits: target,
          maxGrantCredits: maxGrant,
          maxResultingCapCredits: maxCap,
          evidenceRef: `greenhouse-ui:globe-credits:${model.workspace.id}:${periodKey}`
        })
      })

      const payload = (await response.json().catch(() => null)) as
        | { funding?: { outcome?: string; operationId?: string }; error?: string; code?: string }
        | null

      if (!response.ok || !payload?.funding?.outcome) {
        setFeedback({
          severity: 'error',
          message: payload?.error ? `${payload.error}${payload.code ? ` (${payload.code})` : ''}` : C.funding.failed
        })

        return
      }

      const outcome = payload.funding.outcome

      setFeedback({
        severity: outcome === 'outcome_unknown' ? 'warning' : 'success',
        message:
          outcome === 'completed'
            ? C.funding.completed
            : outcome === 'no_effect'
              ? C.funding.noEffect
              : C.funding.outcomeUnknown,
        ...(payload.funding.operationId ? { operationId: payload.funding.operationId } : {})
      })

      if (outcome !== 'outcome_unknown') {
        operationKeyRef.current = null
        setFundingOpen(false)
      }

      router.refresh()
    } catch {
      setFeedback({ severity: 'error', message: C.funding.failed })
    } finally {
      setSubmitting(false)
    }
  }

  const signals = [
    { id: 'effective', label: C.signals.effective, value: credits(status?.effectiveAvailable), tone: 'primary' as const },
    { id: 'monthly', label: C.signals.monthly, value: credits(status?.monthly?.remaining), tone: 'success' as const },
    { id: 'funding', label: C.signals.funding, value: credits(status?.eligibleFunding), tone: 'info' as const }
  ]

  const header = (
    <WorkbenchHeader
      kind='workbench'
      eyebrow={C.eyebrow}
      title={C.title}
      description={C.description}
      statusLabel={status ? C.status[status.state] : C.status.unknown}
      statusTone={status ? stateTone(status.state) : 'default'}
      meta={<Box component='span' sx={{ color: 'primary.contrastText', opacity: 0.76, typography: 'caption' }}>{model.workspace.name}</Box>}
      primaryAction={
        <GreenhouseButton
          kind='primaryAction'
          leadingIconClassName='tabler-bolt'
          disabled={!canOpenFunding}
          title={!canOpenFunding ? C.actionUnavailable : undefined}
          data-capture='globe-credit-funding-open'
          onClick={() => {
            operationKeyRef.current = null
            setFundingOpen(true)
          }}
        >
          {C.action}
        </GreenhouseButton>
      }
      supporting={<SignalStrip ariaLabel='Señales de capacidad Globe' signals={signals} variant='integrated' />}
      dataCapture='globe-credits-header'
    />
  )

  const navigator = (
    <OperationalSection title={C.operations.title} description={C.operations.description} variant='open'>
      <Stack spacing={1.5}>
        {model.operations.length === 0 ? (
          <Typography color='text.secondary' variant='body2'>{C.operations.empty}</Typography>
        ) : model.operations.map(operation => {
          const selectedRow = operation.operationId === selectedId

          return (
            <Box
              key={operation.operationId}
              component='button'
              type='button'
              onClick={() => setSelectedId(operation.operationId)}
              aria-pressed={selectedRow}
              data-capture={`globe-credit-operation-${operation.operationId}`}
              sx={theme => ({
                inlineSize: '100%',
                border: '1px solid',
                borderColor: selectedRow ? 'primary.main' : 'divider',
                borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                bgcolor: selectedRow ? 'primary.lightOpacity' : 'background.paper',
                color: 'text.primary',
                p: 3,
                textAlign: 'start',
                cursor: 'pointer',
                '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 }
              })}
            >
              <Stack spacing={1}>
                <Stack direction='row' justifyContent='space-between' spacing={2} alignItems='center'>
                  <Typography variant='subtitle2' noWrap>{operation.operationId}</Typography>
                  <GreenhouseChip label={operationState(operation.state)} kind='status' variant='label' size='small' />
                </Stack>
                <Typography variant='caption' color='text.secondary'>{dateTime(operation.updatedAt)}</Typography>
                <Typography variant='body2'>{credits(operation.plan.grantCredits)} créditos</Typography>
              </Stack>
            </Box>
          )
        })}
      </Stack>
    </OperationalSection>
  )

  const detail = (
    <Stack spacing={4}>
      {feedback ? (
        <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>
          {feedback.message}{' '}
          {feedback.operationId ? C.funding.operation.replace('{operationId}', feedback.operationId) : null}
        </Alert>
      ) : null}
      {model.loadError ? <Alert severity='warning'>{C.loadError}</Alert> : null}
      <OperationalSection
        eyebrow={C.runway.eyebrow}
        title={C.runway.title}
        description={C.runway.description}
        variant='emphasized'
      >
        {status?.monthly ? (
          <Stack spacing={3}>
            <Stack direction={{ xs: 'column', sm: 'row' }} divider={<Divider flexItem orientation='vertical' />} spacing={3}>
              {[
                [C.runway.spent, status.monthly.spent],
                [C.runway.held, status.monthly.held],
                [C.runway.remaining, status.monthly.remaining]
              ].map(([label, value]) => (
                <Box key={String(label)} sx={{ flex: 1 }}>
                  <Typography variant='caption' sx={{ opacity: 0.76 }}>{label}</Typography>
                  <Typography variant='h4' sx={{ fontVariantNumeric: 'tabular-nums' }}>{credits(value as number)}</Typography>
                </Box>
              ))}
            </Stack>
            <Typography variant='caption'>
              {C.runway.freshness.replace('{seconds}', String(status.freshnessSeconds))}
            </Typography>
          </Stack>
        ) : <Typography variant='body2'>{C.risks.unavailable}</Typography>}
      </OperationalSection>

      <OperationalSection title={C.risks.title} description={C.risks.description} variant='band'>
        {status?.blockers.length ? (
          <Stack direction='row' gap={1} flexWrap='wrap'>
            {status.blockers.map(blocker => <GreenhouseChip key={blocker} label={blockerLabel(blocker)} kind='status' tone='warning' />)}
          </Stack>
        ) : <Typography variant='body2'>{status ? C.risks.none : C.risks.unavailable}</Typography>}
      </OperationalSection>

      <OperationalSection title={C.operations.detail} variant='open'>
        <Box data-capture='globe-credits-operation-detail'>
        {selected ? (
          <Stack spacing={2}>
            {[
              [C.operations.grant, credits(selected.plan.grantCredits)],
              [C.operations.capBefore, credits(selected.plan.monthlyCapBefore)],
              [C.operations.capAfter, credits(selected.plan.monthlyCapAfter)],
              [C.operations.policyBefore, credits(selected.plan.policyAvailableBefore)],
              [C.operations.policyAfter, credits(selected.plan.policyAvailableAfter)],
              [C.operations.pool, selected.plan.poolId ?? '—'],
              [C.operations.receipt, receiptOutcome(selected.receipt?.outcome)],
              [C.operations.expires, dateTime(selected.expiresAt)]
            ].map(([label, value]) => (
              <Stack key={label} direction='row' justifyContent='space-between' spacing={3}>
                <Typography variant='body2' color='text.secondary'>{label}</Typography>
                <Typography variant='body2' sx={{ textAlign: 'end', overflowWrap: 'anywhere' }}>{value}</Typography>
              </Stack>
            ))}
            {selected.state === 'outcome_unknown' && model.canReconcile ? (
              <GreenhouseButton
                kind='secondaryAction'
                leadingIconClassName='tabler-refresh'
                onClick={() => reconcileOperation(selected)}
                disabled={reconcilingId === selected.operationId}
              >
                {reconcilingId === selected.operationId ? C.recovery.running : C.recovery.action}
              </GreenhouseButton>
            ) : null}
          </Stack>
        ) : <Typography variant='body2' color='text.secondary'>{C.operations.select}</Typography>}
        </Box>
      </OperationalSection>
    </Stack>
  )

  return (
    <>
      <SurfaceRecipe
        kind='operationalWorkbench'
        instanceId='globe-credits-operations'
        header={header}
        asideLabel={C.operations.title}
        detailLabel={C.operations.detail}
        drawerCloseLabel='Cerrar detalle'
        regions={{ aside: navigator, primary: detail }}
        dataCapture='globe-credits-operations-workbench'
        telemetrySource='TASK-1483'
      />

      <Dialog
        open={fundingOpen}
        onClose={submitting ? undefined : () => setFundingOpen(false)}
        fullWidth
        maxWidth='sm'
        aria-labelledby='globe-credit-funding-title'
        data-capture='globe-credit-funding-dialog'
      >
        <DialogTitle id='globe-credit-funding-title'>{C.funding.title}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            <Typography variant='body2' color='text.secondary'>{C.funding.description}</Typography>
            <Alert severity='info'>
              {C.funding.period}: {status ? `${dateTime(status.period.start)} — ${dateTime(status.period.end)}` : '—'}
            </Alert>
            <TextField
              label={C.funding.target}
              helperText={C.funding.targetHelp}
              value={targetAvailableCredits}
              onChange={event => {
                operationKeyRef.current = null
                setTargetAvailableCredits(event.target.value)
              }}
              type='number'
              inputProps={{ min: 1, step: 1 }}
              disabled={submitting}
              required
              fullWidth
            />
            <TextField
              label={C.funding.maxGrant}
              helperText={C.funding.maxGrantHelp}
              value={maxGrantCredits}
              onChange={event => {
                operationKeyRef.current = null
                setMaxGrantCredits(event.target.value)
              }}
              type='number'
              inputProps={{ min: 1, step: 1 }}
              disabled={submitting}
              required
              fullWidth
            />
            <TextField
              label={C.funding.maxCap}
              helperText={C.funding.maxCapHelp}
              value={maxResultingCapCredits}
              onChange={event => {
                operationKeyRef.current = null
                setMaxResultingCapCredits(event.target.value)
              }}
              type='number'
              inputProps={{ min: 1, step: 1 }}
              disabled={submitting}
              error={Boolean(target && maxCap && target > maxCap)}
              required
              fullWidth
            />
            {!fundingInputValid ? <Alert severity='warning'>{C.funding.invalid}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <GreenhouseButton kind='secondaryAction' onClick={() => setFundingOpen(false)} disabled={submitting}>
            {C.funding.cancel}
          </GreenhouseButton>
          <GreenhouseButton
            kind='primaryAction'
            leadingIconClassName='tabler-shield-check'
            onClick={submitFunding}
            disabled={submitting || !fundingInputValid}
          >
            {submitting ? C.funding.submitting : C.funding.confirm}
          </GreenhouseButton>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default GlobeCreditsOperationsWorkbenchView
