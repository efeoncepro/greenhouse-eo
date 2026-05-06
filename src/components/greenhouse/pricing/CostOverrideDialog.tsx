'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormHelperText from '@mui/material/FormHelperText'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import CostDeltaChip from './CostDeltaChip'
import CostSourceChip, { type CostSourceKind } from './CostSourceChip'
import { GH_PRICING } from '@/config/greenhouse-nomenclature'
import { formatDate } from '@/lib/format'
import { computeOverrideDelta } from '@/lib/finance/pricing/override-delta'
import {
  QUOTATION_LINE_COST_OVERRIDE_CATEGORIES,
  type QuotationLineCostOverrideCategory
} from '@/lib/commercial/quotation-line-cost-override-types'

const OVERRIDE_CATEGORIES = QUOTATION_LINE_COST_OVERRIDE_CATEGORIES

const REASON_MAX = 500
const REASON_MIN_OTHER = 30
const REASON_MIN_STANDARD = 15

interface CostOverrideHistoryEntry {
  historyId: string
  overriddenAt: string
  overriddenByUserId: string | null
  category: QuotationLineCostOverrideCategory
  reason: string
  suggestedUnitCostUsd: number | null
  overrideUnitCostUsd: number
  deltaPct: number | null
}

interface CostOverrideHistoryResponse {
  history: CostOverrideHistoryEntry[]
}

export interface CostOverrideDialogSuccessResult {
  lineItemId: string
  quotationId: string
  overrideUnitCostUsd: number
  suggestedUnitCostUsd: number | null
  deltaPct: number | null
  overriddenAt: string
  historyId: string
  category: QuotationLineCostOverrideCategory
  reason: string
}

export interface CostOverrideDialogProps {
  open: boolean
  onClose: () => void
  quotationId: string
  lineItemId: string
  lineLabel: string
  suggestedUnitCostUsd: number | null
  suggestedCostBasisKind?: CostSourceKind | string | null
  canOverride: boolean
  onSuccess: (result: CostOverrideDialogSuccessResult) => void
}

const parseAmount = (raw: string): number | null => {
  if (!raw || !raw.trim()) return null
  const parsed = Number.parseFloat(raw.replace(',', '.'))

  
return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

const formatUsd = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  
return `USD ${value.toFixed(2)}`
}

const formatRelativeDate = (iso: string): string => {
  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) return iso
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000)

  if (diffSec < 60) return 'hace unos segundos'
  if (diffSec < 3600) return `hace ${Math.floor(diffSec / 60)} min`
  if (diffSec < 86400) return `hace ${Math.floor(diffSec / 3600)} h`
  const days = Math.floor(diffSec / 86400)

  if (days < 30) return `hace ${days} día${days === 1 ? '' : 's'}`

  return formatDate(date)
}

/**
 * CostOverrideDialog — modal de override governance para costo por unidad
 * de una línea de cotización (TASK-481, Slice 4).
 *
 * Flujo:
 *   1. Muestra suggested cost read-only con chip de source_kind
 *   2. Input de override (USD)
 *   3. Selector de category (6 valores estructurados)
 *   4. Textarea de reason con minLength adaptativo (15 o 30 chars)
 *   5. Preview live de delta + impact hint
 *   6. Historial (últimos 5) si existe para esta línea
 *   7. Submit → POST /cost-override → emit toast vía onSuccess
 *
 * Capability gate:
 *   El caller decide si `canOverride=true`; si false, el dialog muestra
 *   un banner explicativo y deshabilita el submit (también se protege
 *   backend-side con `canOverrideQuoteCost`).
 */
const CostOverrideDialog = ({
  open,
  onClose,
  quotationId,
  lineItemId,
  lineLabel,
  suggestedUnitCostUsd,
  suggestedCostBasisKind,
  canOverride,
  onSuccess
}: CostOverrideDialogProps) => {
  const [category, setCategory] = useState<QuotationLineCostOverrideCategory | ''>('')
  const [overrideRaw, setOverrideRaw] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [history, setHistory] = useState<CostOverrideHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setCategory('')
    setOverrideRaw('')
    setReason('')
    setSubmitError(null)
  }, [])

  useEffect(() => {
    if (!open) {
      resetForm()
      
return
    }

    let cancelled = false

    const loadHistory = async () => {
      setHistoryLoading(true)
      setHistoryError(null)

      try {
        const response = await fetch(
          `/api/finance/quotes/${encodeURIComponent(quotationId)}/lines/${encodeURIComponent(lineItemId)}/cost-override?limit=5`,
          { credentials: 'same-origin' }
        )

        if (!response.ok) {
          throw new Error(`Unexpected status ${response.status}`)
        }

        const data = (await response.json()) as CostOverrideHistoryResponse

        if (!cancelled) {
          setHistory(Array.isArray(data.history) ? data.history : [])
        }
      } catch {
        if (!cancelled) {
          setHistoryError(GH_PRICING.costOverride.historyLoadError)
          setHistory([])
        }
      } finally {
        if (!cancelled) setHistoryLoading(false)
      }
    }

    void loadHistory()

    return () => {
      cancelled = true
    }
  }, [open, quotationId, lineItemId, resetForm])

  const overrideValue = useMemo(() => parseAmount(overrideRaw), [overrideRaw])

  const delta = useMemo(
    () =>
      computeOverrideDelta({
        suggestedUnitCost: suggestedUnitCostUsd,
        overrideUnitCost: overrideValue
      }),
    [suggestedUnitCostUsd, overrideValue]
  )

  const reasonTrimmed = reason.trim()
  const reasonMin = category === 'other' ? REASON_MIN_OTHER : REASON_MIN_STANDARD

  const reasonHelper =
    category === 'other'
      ? GH_PRICING.costOverride.reasonHelperOther
      : GH_PRICING.costOverride.reasonHelperShort

  const categoryMissing = !category
  const reasonTooShort = reasonTrimmed.length > 0 && reasonTrimmed.length < reasonMin
  const overrideInvalid = overrideRaw.trim().length > 0 && overrideValue === null

  const canSubmit =
    canOverride &&
    !submitting &&
    !categoryMissing &&
    !overrideInvalid &&
    overrideValue !== null &&
    reasonTrimmed.length >= reasonMin &&
    reasonTrimmed.length <= REASON_MAX

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || overrideValue === null || !category) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch(
        `/api/finance/quotes/${encodeURIComponent(quotationId)}/lines/${encodeURIComponent(lineItemId)}/cost-override`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category,
            reason: reasonTrimmed,
            overrideUnitCostUsd: overrideValue
          })
        }
      )

      if (response.status === 403) {
        setSubmitError(GH_PRICING.costOverride.errorToastForbidden)
        
return
      }

      if (response.status === 404) {
        setSubmitError(GH_PRICING.costOverride.errorToastNotFound)
        
return
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '')

        setSubmitError(text || GH_PRICING.costOverride.errorToastGeneric)
        
return
      }

      const data = (await response.json()) as { override: CostOverrideDialogSuccessResult }

      onSuccess(data.override)
      onClose()
    } catch {
      setSubmitError(GH_PRICING.costOverride.errorToastGeneric)
    } finally {
      setSubmitting(false)
    }
  }, [canSubmit, category, lineItemId, onClose, onSuccess, overrideValue, quotationId, reasonTrimmed])

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth='sm'
      fullWidth
      aria-label={GH_PRICING.costOverride.dialogAriaLabel}
    >
      <DialogTitle>
        <Stack spacing={0.5}>
          <Typography variant='h6' sx={{ fontWeight: 700 }}>
            {GH_PRICING.costOverride.dialogTitle}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {GH_PRICING.costOverride.dialogSubtitle}
          </Typography>
          <Typography variant='caption' color='text.secondary' sx={{ fontStyle: 'italic' }}>
            {lineLabel}
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>
          {!canOverride ? (
            <Alert severity='warning' variant='outlined'>
              {GH_PRICING.costOverride.noPermissionBanner}
            </Alert>
          ) : null}

          <Box>
            <Typography
              variant='caption'
              sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}
            >
              {GH_PRICING.costOverride.suggestedLabel}
            </Typography>
            <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mt: 0.5 }}>
              <Typography
                variant='body1'
                sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
              >
                {suggestedUnitCostUsd === null || suggestedUnitCostUsd === undefined
                  ? GH_PRICING.costOverride.suggestedMissing
                  : formatUsd(suggestedUnitCostUsd)}
              </Typography>
              <CostSourceChip sourceKind={suggestedCostBasisKind ?? null} compact />
            </Stack>
          </Box>

          <TextField
            label={GH_PRICING.costOverride.overrideLabel}
            placeholder={GH_PRICING.costOverride.overridePlaceholder}
            helperText={overrideInvalid ? GH_PRICING.costOverride.overrideInvalidError : GH_PRICING.costOverride.overrideHelper}
            error={overrideInvalid}
            value={overrideRaw}
            onChange={event => setOverrideRaw(event.target.value)}
            inputMode='decimal'
            size='small'
            fullWidth
            disabled={!canOverride || submitting}
            InputProps={{
              startAdornment: <InputAdornment position='start'>USD</InputAdornment>
            }}
          />

          <TextField
            select
            label={GH_PRICING.costOverride.categoryLabel}
            helperText={GH_PRICING.costOverride.categoryAriaDescription}
            value={category}
            onChange={event => setCategory(event.target.value as QuotationLineCostOverrideCategory | '')}
            size='small'
            fullWidth
            disabled={!canOverride || submitting}
          >
            <MenuItem value=''>
              <em>{GH_PRICING.costOverride.categoryPlaceholder}</em>
            </MenuItem>
            {OVERRIDE_CATEGORIES.map(key => {
              const meta = GH_PRICING.costOverride.categories[key]

              
return (
                <MenuItem key={key} value={key}>
                  <Stack spacing={0.25}>
                    <Typography variant='body2' sx={{ fontWeight: 600 }}>
                      {meta?.label ?? key}
                    </Typography>
                    {meta?.shortDescription ? (
                      <Typography variant='caption' color='text.secondary'>
                        {meta.shortDescription}
                      </Typography>
                    ) : null}
                  </Stack>
                </MenuItem>
              )
            })}
          </TextField>

          <TextField
            label={GH_PRICING.costOverride.reasonLabel}
            placeholder={GH_PRICING.costOverride.reasonPlaceholder}
            value={reason}
            onChange={event => setReason(event.target.value.slice(0, REASON_MAX))}
            multiline
            minRows={3}
            maxRows={6}
            size='small'
            fullWidth
            disabled={!canOverride || submitting}
            error={reasonTooShort}
            helperText={
              reasonTooShort
                ? GH_PRICING.costOverride.reasonTooShortError(reasonMin, reasonTrimmed.length)
                : `${reasonHelper} · ${GH_PRICING.costOverride.reasonCounter(reasonTrimmed.length, REASON_MAX)}`
            }
          />

          <Box>
            <Typography
              variant='caption'
              sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}
            >
              {GH_PRICING.costOverride.deltaLabel}
            </Typography>
            <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mt: 0.5 }}>
              <CostDeltaChip deltaPct={delta.deltaPct} direction={delta.direction} />
              {delta.direction === 'above' ? (
                <Typography variant='caption' color='text.secondary'>
                  {GH_PRICING.costOverride.impactMarginHintAbove}
                </Typography>
              ) : null}
              {delta.direction === 'below' ? (
                <Typography variant='caption' color='text.secondary'>
                  {GH_PRICING.costOverride.impactMarginHintBelow}
                </Typography>
              ) : null}
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography
              variant='caption'
              sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}
            >
              {GH_PRICING.costOverride.historyTitle}
            </Typography>
            {historyLoading ? (
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
                {GH_PRICING.costOverride.historyLoadingLabel}
              </Typography>
            ) : historyError ? (
              <Typography variant='caption' color='error' sx={{ display: 'block', mt: 0.5 }}>
                {historyError}
              </Typography>
            ) : history.length === 0 ? (
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
                {GH_PRICING.costOverride.historyEmpty}
              </Typography>
            ) : (
              <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                <Typography variant='caption' color='text.secondary'>
                  {history.length === 1
                    ? GH_PRICING.costOverride.historyCountOne
                    : GH_PRICING.costOverride.historyCountMany(history.length)}
                </Typography>
                {history.map(entry => {
                  const actorLabel =
                    entry.overriddenByUserId ?? GH_PRICING.costOverride.historyEntryActorFallback

                  const dateLabel = formatRelativeDate(entry.overriddenAt)
                  const entryHeader = GH_PRICING.costOverride.historyEntryByActor(actorLabel, dateLabel)
                  const categoryLabel = GH_PRICING.costOverride.categories[entry.category]?.label ?? entry.category

                  
return (
                    <Box
                      key={entry.historyId}
                      sx={theme => ({
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                        padding: 1
                      })}
                    >
                      <Typography variant='caption' sx={{ fontWeight: 600, display: 'block' }}>
                        {entryHeader} · {categoryLabel}
                      </Typography>
                      <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                        {entry.reason}
                      </Typography>
                    </Box>
                  )
                })}
              </Stack>
            )}
          </Box>

          {submitError ? <Alert severity='error'>{submitError}</Alert> : null}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={submitting} variant='text'>
          {GH_PRICING.costOverride.cancelCta}
        </Button>
        <Button
          onClick={() => {
            void handleSubmit()
          }}
          disabled={!canSubmit}
          variant='contained'
          startIcon={submitting ? <CircularProgress size={16} color='inherit' /> : null}
        >
          {submitting ? GH_PRICING.costOverride.submittingCta : GH_PRICING.costOverride.submitCta}
        </Button>
      </DialogActions>
      {submitError && !canOverride ? (
        <FormHelperText sx={{ px: 3, pb: 2 }} error>
          {submitError}
        </FormHelperText>
      ) : null}
    </Dialog>
  )
}

export default CostOverrideDialog
