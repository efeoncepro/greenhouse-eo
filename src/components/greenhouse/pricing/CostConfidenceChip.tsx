'use client'

import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { GH_PRICING } from '@/config/greenhouse-nomenclature'

export type CostConfidenceLabel = 'high' | 'medium' | 'low'

export interface CostConfidenceChipProps {
  confidenceLabel: CostConfidenceLabel | string | null | undefined
  confidenceScore?: number | null
  compact?: boolean
}

const META: Record<CostConfidenceLabel, { color: 'success' | 'warning' | 'error'; icon: string }> = {
  high: { color: 'success', icon: 'tabler-shield-check' },
  medium: { color: 'warning', icon: 'tabler-shield-half' },
  low: { color: 'error', icon: 'tabler-shield-exclamation' }
}

const isKnownBucket = (value: unknown): value is CostConfidenceLabel =>
  typeof value === 'string' && (value === 'high' || value === 'medium' || value === 'low')

const formatScore = (score: number | null | undefined): string | null => {
  if (score === null || score === undefined || !Number.isFinite(score)) return null
  const clamped = Math.max(0, Math.min(1, score))
  return `${Math.round(clamped * 100)}%`
}

/**
 * CostConfidenceChip — visualiza el `confidence_label` del pricing engine v2
 * (high/medium/low) con color semántico + ícono de shield. Opcionalmente
 * muestra el score numérico redondeado a %.
 *
 * La escala es la misma que el cost basis reader materializa desde
 * snapshot tables (TASK-479, TASK-478, TASK-477):
 *   high   → datos recientes + consistentes
 *   medium → datos parciales o con desfase
 *   low    → datos escasos o muy desactualizados
 *
 * Consumers: QuoteLineCostStack, CostProvenancePopover (TASK-481).
 */
const CostConfidenceChip = ({ confidenceLabel, confidenceScore, compact }: CostConfidenceChipProps) => {
  if (!confidenceLabel || !isKnownBucket(confidenceLabel)) {
    return null
  }

  const meta = META[confidenceLabel]
  const copy = GH_PRICING.costProvenance.confidenceBuckets[confidenceLabel]
  const labelText = copy?.label ?? confidenceLabel
  const description = copy?.shortDescription ?? ''
  const scoreText = formatScore(confidenceScore)
  const baseLabel = `${GH_PRICING.costProvenance.confidenceLabel}: ${labelText}${scoreText ? ` (${scoreText})` : ''}`
  const tooltipTitle = description ? `${baseLabel}. ${description}` : baseLabel

  return (
    <Tooltip title={tooltipTitle} arrow placement='top' disableInteractive>
      <Box
        aria-label={tooltipTitle}
        sx={theme => ({
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          px: compact ? 0.75 : 1.25,
          py: compact ? 0.25 : 0.5,
          borderRadius: `${theme.shape.customBorderRadius.sm}px`,
          backgroundColor: alpha(theme.palette[meta.color].main, 0.12),
          color: theme.palette[meta.color].main,
          border: `1px solid ${alpha(theme.palette[meta.color].main, 0.28)}`,
          cursor: 'help'
        })}
      >
        <i className={meta.icon} aria-hidden='true' style={{ fontSize: compact ? 12 : 14 }} />
        <Typography
          variant='caption'
          sx={{ fontWeight: 600, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}
        >
          {labelText}
          {scoreText ? ` · ${scoreText}` : ''}
        </Typography>
      </Box>
    </Tooltip>
  )
}

export default CostConfidenceChip
