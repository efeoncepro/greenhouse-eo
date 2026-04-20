'use client'

import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import { GH_PRICING } from '@/config/greenhouse-nomenclature'

export type CostSourceKind =
  | 'member_actual'
  | 'role_blended'
  | 'role_modeled'
  | 'tool_snapshot'
  | 'tool_catalog_fallback'
  | 'manual'

export interface CostSourceChipProps {
  sourceKind: CostSourceKind | string | null | undefined
  compact?: boolean
}

const META: Record<
  CostSourceKind,
  { color: 'primary' | 'info' | 'secondary' | 'success' | 'warning'; icon: string }
> = {
  member_actual: { color: 'primary', icon: 'tabler-user-check' },
  role_blended: { color: 'info', icon: 'tabler-users-group' },
  role_modeled: { color: 'secondary', icon: 'tabler-chart-bar' },
  tool_snapshot: { color: 'success', icon: 'tabler-box' },
  tool_catalog_fallback: { color: 'warning', icon: 'tabler-alert-triangle' },
  manual: { color: 'secondary', icon: 'tabler-hand-stop' }
}

const isKnownSourceKind = (value: unknown): value is CostSourceKind =>
  typeof value === 'string' && value in META

/**
 * CostSourceChip — muestra el source_kind del costo resuelto por el pricing
 * engine v2. Reutiliza el patrón tonal de MarginHealthChip: ícono + label +
 * color semántico + tooltip con shortDescription.
 *
 * Colores deliberados:
 *   member_actual       → primary   (dato concreto de la persona)
 *   role_blended        → info      (agregado estadístico)
 *   role_modeled        → secondary (modelo, no observación directa)
 *   tool_snapshot       → success   (snapshot fresco)
 *   tool_catalog_fallback → warning (fallback — revisable)
 *   manual              → secondary (override manual)
 *
 * Consumers: QuoteLineItemsEditor, QuoteLineCostStack, CostProvenancePopover
 * (TASK-481).
 */
const CostSourceChip = ({ sourceKind, compact }: CostSourceChipProps) => {
  if (!sourceKind || !isKnownSourceKind(sourceKind)) {
    return null
  }

  const meta = META[sourceKind]
  const copy = GH_PRICING.costProvenance.sourceKinds[sourceKind]
  const labelText = copy?.label ?? sourceKind
  const description = copy?.shortDescription ?? ''

  const tooltipTitle = description
    ? `${GH_PRICING.costProvenance.sourceLabel}: ${labelText}. ${description}`
    : `${GH_PRICING.costProvenance.sourceLabel}: ${labelText}`

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
          cursor: 'help',
          transition: theme.transitions.create(['background-color', 'border-color', 'color'], {
            duration: 150,
            easing: 'cubic-bezier(0.2, 0, 0, 1)'
          }),
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
        })}
      >
        <i className={meta.icon} aria-hidden='true' style={{ fontSize: compact ? 12 : 14 }} />
        <Typography
          variant='caption'
          sx={{ fontWeight: 600, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}
        >
          {labelText}
        </Typography>
      </Box>
    </Tooltip>
  )
}

export default CostSourceChip
