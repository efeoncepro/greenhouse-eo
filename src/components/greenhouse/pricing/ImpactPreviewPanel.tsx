'use client'

import { useCallback, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { GH_PRICING_GOVERNANCE } from '@/config/greenhouse-nomenclature'

export interface ImpactPreviewSample {
  quotationId: string
  quotationNumber: string
  clientName: string | null
  totalAmountClp: number
  status: string
}

export interface ImpactPreviewResult {
  affectedQuotes: {
    count: number
    totalAmountClp: number
    sample: ImpactPreviewSample[]
  }
  affectedDeals: {
    count: number
    totalPipelineClp: number
  }
  warnings: string[]
}

export type ImpactPreviewEntityType = 'sellable_role' | 'tool_catalog' | 'overhead_addon'

export interface ImpactPreviewPanelProps {
  entityType: ImpactPreviewEntityType
  entityId: string
  changeset?: Record<string, unknown>
  requireHighImpactConfirmation?: boolean
  onConfirmationChange?: (confirmed: boolean) => void
}

const formatClp = (value: number): string => {
  if (!Number.isFinite(value) || value === 0) return '$0'

  try {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(value)
  } catch {
    return `$${Math.round(value).toLocaleString('es-CL')}`
  }
}

const HIGH_IMPACT_QUOTES_THRESHOLD = 20
const HIGH_IMPACT_CLP_THRESHOLD = 100_000_000

const entityPathMap: Record<ImpactPreviewEntityType, string> = {
  sellable_role: 'roles',
  tool_catalog: 'tools',
  overhead_addon: 'overheads'
}

/**
 * ImpactPreviewPanel — UI que llama a `POST /preview-impact` del TASK-470 y
 * muestra el resultado visual (TASK-471 slice 4).
 *
 * Comportamiento:
 *   - Botón "Ver impacto" → spinner → panel con counts + sample + warnings
 *   - Si impacto es alto (>20 quotes o >$100M CLP), muestra checkbox
 *     obligatorio "Entiendo el impacto" — caller lee `onConfirmationChange`
 *     para gatear su propio CTA de Guardar
 *   - Reintento vía botón "Recalcular" cuando hay error
 *
 * Uso: integrado en los 3 Edit drawers (roles, tools, overheads) después
 * de que el formulario tenga cambios dirty pero antes del submit.
 */
const ImpactPreviewPanel = ({
  entityType,
  entityId,
  changeset,
  requireHighImpactConfirmation = true,
  onConfirmationChange
}: ImpactPreviewPanelProps) => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImpactPreviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const handleLoad = useCallback(async () => {
    setLoading(true)
    setError(null)
    setConfirmed(false)
    onConfirmationChange?.(false)

    try {
      const pathSegment = entityPathMap[entityType]

      const response = await fetch(
        `/api/admin/pricing-catalog/${pathSegment}/${encodeURIComponent(entityId)}/preview-impact`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ changeset: changeset ?? {}, sampleLimit: 5 })
        }
      )

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }

        setError(payload.error || GH_PRICING_GOVERNANCE.impactPreview.errorLoadingLabel)
        setResult(null)

        return
      }

      const data = (await response.json()) as ImpactPreviewResult

      setResult(data)
    } catch {
      setError(GH_PRICING_GOVERNANCE.impactPreview.errorLoadingLabel)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId, changeset, onConfirmationChange])

  const isHighImpact = Boolean(
    result &&
      (result.affectedQuotes.count >= HIGH_IMPACT_QUOTES_THRESHOLD ||
        result.affectedQuotes.totalAmountClp >= HIGH_IMPACT_CLP_THRESHOLD)
  )

  const handleConfirm = (value: boolean) => {
    setConfirmed(value)
    onConfirmationChange?.(value)
  }

  if (!result && !loading && !error) {
    return (
      <Button
        size='small'
        variant='outlined'
        startIcon={<i className='tabler-target' />}
        onClick={() => void handleLoad()}
      >
        {GH_PRICING_GOVERNANCE.impactPreview.triggerLabel}
      </Button>
    )
  }

  if (loading) {
    return (
      <Stack direction='row' spacing={1} alignItems='center'>
        <CircularProgress size={16} />
        <Typography variant='caption' color='text.secondary'>
          {GH_PRICING_GOVERNANCE.impactPreview.triggerLoadingLabel}
        </Typography>
      </Stack>
    )
  }

  if (error) {
    return (
      <Alert
        severity='error'
        action={
          <Button size='small' onClick={() => void handleLoad()}>
            {GH_PRICING_GOVERNANCE.impactPreview.refreshLabel}
          </Button>
        }
      >
        {error}
      </Alert>
    )
  }

  if (!result) return null

  const hasNoImpact = result.affectedQuotes.count === 0 && result.affectedDeals.count === 0

  return (
    <Box
      sx={theme => ({
        p: 2,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: isHighImpact
          ? alpha(theme.palette.warning.main, 0.06)
          : alpha(theme.palette.info.main, 0.04)
      })}
    >
      <Stack spacing={1.5}>
        <Stack direction='row' justifyContent='space-between' alignItems='center'>
          <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
            {GH_PRICING_GOVERNANCE.impactPreview.panelTitle}
          </Typography>
          <Button size='small' variant='text' onClick={() => void handleLoad()}>
            {GH_PRICING_GOVERNANCE.impactPreview.refreshLabel}
          </Button>
        </Stack>

        {hasNoImpact ? (
          <Typography variant='body2' color='text.secondary'>
            {GH_PRICING_GOVERNANCE.impactPreview.noImpactLabel}
          </Typography>
        ) : (
          <>
            <Stack direction='row' spacing={3}>
              <Box>
                <Typography
                  variant='caption'
                  sx={{
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'text.secondary',
                    display: 'block'
                  }}
                >
                  {GH_PRICING_GOVERNANCE.impactPreview.affectedQuotesLabel}
                </Typography>
                <Typography variant='h6' sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {GH_PRICING_GOVERNANCE.impactPreview.affectedQuotesCountLabel(result.affectedQuotes.count)}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {GH_PRICING_GOVERNANCE.impactPreview.affectedQuotesPipelineLabel}:{' '}
                  {formatClp(result.affectedQuotes.totalAmountClp)}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant='caption'
                  sx={{
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'text.secondary',
                    display: 'block'
                  }}
                >
                  {GH_PRICING_GOVERNANCE.impactPreview.affectedDealsLabel}
                </Typography>
                <Typography variant='h6' sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {GH_PRICING_GOVERNANCE.impactPreview.affectedDealsCountLabel(result.affectedDeals.count)}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {formatClp(result.affectedDeals.totalPipelineClp)}
                </Typography>
              </Box>
            </Stack>

            {result.affectedQuotes.sample.length > 0 ? (
              <>
                <Divider />
                <Box>
                  <Typography
                    variant='caption'
                    sx={{
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: 'text.secondary',
                      display: 'block',
                      mb: 0.5
                    }}
                  >
                    {GH_PRICING_GOVERNANCE.impactPreview.sampleQuotesLabel}
                  </Typography>
                  <Stack spacing={0.5}>
                    {result.affectedQuotes.sample.map(quote => (
                      <Typography key={quote.quotationId} variant='caption' sx={{ fontFamily: 'monospace' }}>
                        {quote.quotationNumber} · {quote.clientName ?? '—'} ·{' '}
                        {formatClp(quote.totalAmountClp)} · {quote.status}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              </>
            ) : null}
          </>
        )}

        {result.warnings.length > 0 ? (
          <>
            <Divider />
            <Box>
              <Typography
                variant='caption'
                sx={{
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'warning.main',
                  display: 'block',
                  mb: 0.5
                }}
              >
                {GH_PRICING_GOVERNANCE.impactPreview.warningsLabel}
              </Typography>
              {result.warnings.map((warning, idx) => (
                <Typography key={idx} variant='caption' color='warning.main' sx={{ display: 'block' }}>
                  • {warning}
                </Typography>
              ))}
            </Box>
          </>
        ) : null}

        {isHighImpact && requireHighImpactConfirmation ? (
          <>
            <Divider />
            <Alert severity='warning' variant='outlined'>
              <Typography variant='caption' sx={{ fontWeight: 600, display: 'block' }}>
                {GH_PRICING_GOVERNANCE.impactPreview.highImpactLabel}
              </Typography>
              <FormControlLabel
                sx={{ mt: 0.5 }}
                control={
                  <Checkbox
                    size='small'
                    checked={confirmed}
                    onChange={(_, checked) => handleConfirm(checked)}
                  />
                }
                label={
                  <Typography variant='caption'>
                    {GH_PRICING_GOVERNANCE.impactPreview.highImpactCheckboxLabel}
                  </Typography>
                }
              />
            </Alert>
          </>
        ) : null}
      </Stack>
    </Box>
  )
}

export default ImpactPreviewPanel
