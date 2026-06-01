'use client'

// TASK-984 — Contractor Closure Drawer (HR operator, runtime).
// Consume el flujo backend canónico de cierre (TASK-797):
//   · GET  /api/hr/contractors/[id]/closure  → { engagement, readiness }
//   · POST /api/hr/contractors/[id]/closure  → action: initiate | execute
// El cierre es un lifecycle propio — NUNCA finiquito (boundary TASK-890). Los
// blockers son acknowledgeable: el operador puede cerrar igual reconociéndolos.

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import { throwIfNotOk } from '@/lib/api/parse-error-response'
import { getMicrocopy } from '@/lib/copy'
import { GH_CONTRACTOR_COMPENSATION as C } from '@/lib/copy/contractor-compensation'
import { CONTRACTOR_CLOSURE_REASONS } from '@/lib/contractor-engagements'
import type {
  ContractorClosureBlockerCode,
  ContractorClosureReadinessResult,
  ContractorClosureReason
} from '@/lib/contractor-engagements'
import type { ContractorEngagement } from '@/lib/contractor-engagements/types'

const aria = getMicrocopy('es-CL').aria

const PROVIDER_OWNED_PAYROLL_VIA = new Set(['deel', 'remote', 'oyster'])

interface Props {
  engagementId: string | null
  open: boolean
  onClose: () => void
  /** Refetch del workbench cuando el cierre se inicia o ejecuta. */
  onClosed: () => void
  canManage: boolean
}

const SectionLabel = ({ text }: { text: string }) => (
  <Typography
    variant='caption'
    sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', mb: 1 }}
  >
    {text}
  </Typography>
)

const ContractorClosureDrawer = ({ engagementId, open, onClose, onClosed, canManage }: Props) => {
  const theme = useTheme()

  const [engagement, setEngagement] = useState<ContractorEngagement | null>(null)
  const [readiness, setReadiness] = useState<ContractorClosureReadinessResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Form state.
  const [causal, setCausal] = useState<ContractorClosureReason | ''>('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [providerRef, setProviderRef] = useState('')
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const [postClosureInvoicesAllowed, setPostClosureInvoicesAllowed] = useState(false)
  const [acknowledged, setAcknowledged] = useState<Set<ContractorClosureBlockerCode>>(new Set())
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !engagementId) return

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setLoadError(null)
      setActionError(null)
      setTouched(false)
      setAcknowledged(new Set())

      try {
        const response = await fetch(`/api/hr/contractors/${engagementId}/closure`, { cache: 'no-store' })

        await throwIfNotOk(response, C.closure.loadError)

        const payload = (await response.json()) as {
          engagement: ContractorEngagement
          readiness: ContractorClosureReadinessResult
        }

        if (cancelled) return

        setEngagement(payload.engagement)
        setReadiness(payload.readiness)
        setCausal((payload.engagement.closureReason as ContractorClosureReason | null) ?? '')
        setEffectiveDate(payload.engagement.closureEffectiveDate ?? '')
        setProviderRef(payload.engagement.providerTerminationRef ?? '')
        setPostClosureInvoicesAllowed(payload.engagement.postClosureInvoicesAllowed)
        setLoading(false)
      } catch (error) {
        if (cancelled) return

        setEngagement(null)
        setReadiness(null)
        setLoadError(error instanceof Error ? error.message : C.closure.loadError)
        setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [open, engagementId])

  useEffect(() => {
    if (open) return

    setEngagement(null)
    setReadiness(null)
    setReason('')
    setCausal('')
    setEffectiveDate('')
    setProviderRef('')
    setPostClosureInvoicesAllowed(false)
    setAcknowledged(new Set())
    setTouched(false)
    setSaving(false)
    setActionError(null)
    setLoadError(null)
  }, [open])

  const providerOwned = engagement ? PROVIDER_OWNED_PAYROLL_VIA.has(engagement.payrollVia) : false
  const alreadyClosed = engagement?.status === 'ended'

  const reasonValid = reason.trim().length >= 10
  const baseValid = Boolean(causal) && Boolean(effectiveDate) && reasonValid

  const allBlockersAcknowledged = useMemo(
    () => (readiness ? readiness.blockers.every(b => acknowledged.has(b.code)) : true),
    [readiness, acknowledged]
  )

  const canExecute = canManage && baseValid && allBlockersAcknowledged && !saving && !alreadyClosed

  const canInitiate =
    canManage && baseValid && !saving && (engagement?.status === 'active' || engagement?.status === 'paused')

  const toggleAck = (code: ContractorClosureBlockerCode) => {
    setAcknowledged(prev => {
      const next = new Set(prev)

      if (next.has(code)) next.delete(code)
      else next.add(code)

      return next
    })
  }

  const submit = async (action: 'initiate' | 'execute') => {
    if (!engagementId) return

    setTouched(true)

    if (!baseValid) return

    setSaving(true)
    setActionError(null)

    try {
      const response = await fetch(`/api/hr/contractors/${engagementId}/closure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          closureReason: causal,
          closureEffectiveDate: effectiveDate,
          reason: reason.trim(),
          providerTerminationRef: providerRef.trim() || null,
          ...(action === 'execute'
            ? {
                acknowledgedBlockerCodes: Array.from(acknowledged),
                postClosureInvoicesAllowed
              }
            : {})
        })
      })

      await throwIfNotOk(response, C.closure.actionError)

      onClosed()
      onClose()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : C.closure.actionError)
      setSaving(false)
    }
  }

  return (
    <Drawer anchor='right' open={open} onClose={saving ? undefined : onClose} slotProps={{ paper: { sx: { width: { xs: '100vw', sm: 520 } } } }}>
      <Box role='dialog' aria-labelledby='closure-drawer-title' sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: { xs: 5, sm: 6 }, pb: 4 }}>
          <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={3}>
            <Stack spacing={1}>
              <Typography id='closure-drawer-title' variant='h5' sx={{ fontWeight: 700 }}>
                {C.closure.drawerTitle}
              </Typography>
              {engagement ? (
                <CustomChip round='true' size='small' variant='tonal' color='secondary' label={engagement.publicId} />
              ) : null}
            </Stack>
            <IconButton onClick={onClose} aria-label={aria.closeDrawer} disabled={saving}>
              <i className='tabler-x' />
            </IconButton>
          </Stack>
        </Box>

        <Divider />

        <Box sx={{ p: { xs: 5, sm: 6 }, flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <Stack alignItems='center' justifyContent='center' spacing={3} sx={{ py: 12 }} role='status'>
              <CircularProgress />
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                {C.closure.loading}
              </Typography>
            </Stack>
          ) : loadError ? (
            <Alert severity='error' icon={<i className='tabler-alert-triangle' />} role='alert'>
              {loadError}
            </Alert>
          ) : engagement && readiness ? (
            <Stack spacing={6}>
              <Alert severity='info' icon={<i className='tabler-info-circle' />}>
                {C.closure.notFiniquitoNote}
              </Alert>

              {alreadyClosed ? (
                <Alert severity='success' icon={<i className='tabler-circle-check' />} role='status'>
                  {C.closure.closedNote}
                </Alert>
              ) : null}

              {/* Readiness */}
              <Box>
                <SectionLabel text={C.closure.readinessLabel} />
                {readiness.blockers.length === 0 ? (
                  <Stack direction='row' spacing={2} alignItems='center' sx={{ color: 'success.main' }}>
                    <i className='tabler-circle-check' style={{ fontSize: 18 }} aria-hidden />
                    <Typography variant='body2'>{C.closure.noBlockers}</Typography>
                  </Stack>
                ) : (
                  <Stack spacing={3}>
                    {readiness.blockers.map(b => {
                      const ack = acknowledged.has(b.code)

                      return (
                        <Box
                          key={b.code}
                          sx={{
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                            p: 4
                          }}
                        >
                          <Stack direction='row' spacing={3} justifyContent='space-between' alignItems='flex-start'>
                            <Stack direction='row' spacing={2} alignItems='flex-start' sx={{ minWidth: 0 }}>
                              <i
                                className={ack ? 'tabler-circle-check' : 'tabler-alert-triangle'}
                                style={{ fontSize: 18, marginTop: 2, flexShrink: 0, color: ack ? theme.palette.success.main : theme.palette.warning.main }}
                                aria-hidden
                              />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant='subtitle2'>{C.closure.blocker[b.code]}</Typography>
                                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                                  {b.message}
                                </Typography>
                              </Box>
                            </Stack>
                            {ack ? (
                              <CustomChip round='true' size='small' variant='tonal' color='success' label={C.closure.acknowledgedTag} />
                            ) : null}
                          </Stack>
                          <FormControlLabel
                            sx={{ mt: 2 }}
                            control={<Checkbox checked={ack} onChange={() => toggleAck(b.code)} disabled={!canManage} size='small' />}
                            label={<Typography variant='body2'>{C.closure.acknowledgeCta}</Typography>}
                          />
                        </Box>
                      )
                    })}
                  </Stack>
                )}
              </Box>

              {readiness.advisories.length > 0 ? (
                <Box>
                  <SectionLabel text={C.closure.advisoriesLabel} />
                  <Stack spacing={2}>
                    {readiness.advisories.map(a => (
                      <Stack key={a.code} direction='row' spacing={2} alignItems='flex-start' sx={{ color: 'text.secondary' }}>
                        <i className='tabler-info-circle' style={{ fontSize: 18, marginTop: 2, flexShrink: 0 }} aria-hidden />
                        <Box>
                          <Typography variant='body2' sx={{ fontWeight: 500, color: 'text.primary' }}>
                            {C.closure.advisory[a.code]}
                          </Typography>
                          <Typography variant='caption'>{a.message}</Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              ) : null}

              <Divider />

              {/* Closure form */}
              {!alreadyClosed ? (
                <Stack spacing={4}>
                  <CustomTextField
                    select
                    fullWidth
                    label={C.closure.causalLabel}
                    value={causal}
                    onChange={e => setCausal(e.target.value as ContractorClosureReason)}
                    disabled={!canManage}
                    error={touched && !causal}
                  >
                    <MenuItem value='' disabled>
                      {C.closure.causalPlaceholder}
                    </MenuItem>
                    {CONTRACTOR_CLOSURE_REASONS.map(value => (
                      <MenuItem key={value} value={value}>
                        {C.closure.causal[value]}
                      </MenuItem>
                    ))}
                  </CustomTextField>

                  <CustomTextField
                    type='date'
                    fullWidth
                    label={C.closure.effectiveDateLabel}
                    value={effectiveDate}
                    onChange={e => setEffectiveDate(e.target.value)}
                    disabled={!canManage}
                    error={touched && !effectiveDate}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />

                  {providerOwned ? (
                    <CustomTextField
                      fullWidth
                      label={C.closure.providerRefLabel}
                      helperText={C.closure.providerRefHelper}
                      value={providerRef}
                      onChange={e => setProviderRef(e.target.value)}
                      disabled={!canManage}
                    />
                  ) : null}

                  <CustomTextField
                    fullWidth
                    multiline
                    minRows={3}
                    label={C.closure.reasonLabel}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    onBlur={() => setTouched(true)}
                    disabled={!canManage}
                    error={touched && !reasonValid}
                    helperText={touched && !reasonValid ? C.closure.reasonError : C.closure.reasonHelper}
                    slotProps={{ input: { 'aria-invalid': touched && !reasonValid } }}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={postClosureInvoicesAllowed}
                        onChange={e => setPostClosureInvoicesAllowed(e.target.checked)}
                        disabled={!canManage}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant='body2'>{C.closure.postClosureToggle}</Typography>
                        <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                          {C.closure.postClosureHelper}
                        </Typography>
                      </Box>
                    }
                  />
                </Stack>
              ) : null}

              {actionError ? (
                <Alert severity='error' icon={<i className='tabler-alert-triangle' />} role='alert'>
                  {actionError}
                </Alert>
              ) : null}
            </Stack>
          ) : null}
        </Box>

        {engagement && !alreadyClosed ? (
          <>
            <Divider />
            <Box sx={{ p: { xs: 5, sm: 6 } }}>
              <Stack direction='row' spacing={2} justifyContent='flex-end' alignItems='center' flexWrap='wrap' useFlexGap>
                <Button variant='tonal' color='secondary' onClick={() => void submit('initiate')} disabled={!canInitiate}>
                  {C.closure.initiateCta}
                </Button>
                <Button
                  variant='contained'
                  color='primary'
                  startIcon={saving ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-door-exit' />}
                  onClick={() => void submit('execute')}
                  disabled={!canExecute}
                  title={!allBlockersAcknowledged ? C.closure.executeDisabledHint : undefined}
                >
                  {C.closure.executeCta}
                </Button>
              </Stack>
              {!allBlockersAcknowledged ? (
                <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 2, textAlign: 'right' }}>
                  {C.closure.executeDisabledHint}
                </Typography>
              ) : null}
            </Box>
          </>
        ) : null}
      </Box>
    </Drawer>
  )
}

export default ContractorClosureDrawer
