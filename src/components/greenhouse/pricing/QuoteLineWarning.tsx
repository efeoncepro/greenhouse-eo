'use client'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import { GH_PRICING } from '@/config/greenhouse-nomenclature'
import type { PricingWarning } from '@/lib/finance/pricing/contracts'

export interface QuoteLineWarningProps {
  warnings: PricingWarning[]

  /** Index (0-based) de la fila en la tabla de ítems — se refleja en el aria-label */
  rowIndex: number

  /** id del elemento de la fila asociada, usado para ARIA describedby */
  rowElementId?: string
}

const SEVERITY_MAP: Record<PricingWarning['severity'], { color: 'error' | 'warning' | 'info'; icon: string }> = {
  critical: { color: 'error', icon: 'tabler-alert-triangle' },
  warning: { color: 'warning', icon: 'tabler-alert-circle' },
  info: { color: 'info', icon: 'tabler-info-circle' }
}

/**
 * Render inline de warnings del pricing engine anclados a una fila especifica.
 * Reemplaza el panel agregado `QuotePricingWarningsPanel` que vivia al fondo de
 * la sidebar. Se muestra dentro de la misma <tr> de la fila que origino el
 * warning, con `role="alert"` (critical) o `role="status"` (warning/info).
 */
const QuoteLineWarning = ({ warnings, rowIndex, rowElementId }: QuoteLineWarningProps) => {
  if (!warnings || warnings.length === 0) return null

  // Agrupo por severidad para render consistente: critical > warning > info
  const sorted = [...warnings].sort((a, b) => {
    const order: Record<PricingWarning['severity'], number> = { critical: 0, warning: 1, info: 2 }

    return order[a.severity] - order[b.severity]
  })

  return (
    <Stack spacing={0.75} sx={{ mt: 0.5 }} role='group' aria-label={`${GH_PRICING.lineWarning.ariaPrefix} ${rowIndex + 1}`}>
      {sorted.map((warning, idx) => {
        const meta = SEVERITY_MAP[warning.severity]

        return (
          <Alert
            key={`${warning.code}-${idx}`}
            severity={meta.color}
            variant='outlined'
            role={warning.severity === 'critical' ? 'alert' : 'status'}
            icon={<i className={meta.icon} aria-hidden='true' />}
            aria-describedby={rowElementId}
            sx={theme => ({
              py: 0.5,
              px: 1.5,
              alignItems: 'flex-start',
              borderColor: theme.palette[meta.color].main,
              backgroundColor: theme.palette.mode === 'dark'
                ? `${theme.palette[meta.color].main}14`
                : `${theme.palette[meta.color].main}08`,
              '& .MuiAlert-message': { py: 0.25, width: '100%' },
              '& .MuiAlert-icon': { py: 0.25 }
            })}
          >
            <Stack spacing={0.25}>
              <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
                <Typography variant='body2' sx={{ fontWeight: 500, lineHeight: 1.3 }}>
                  {warning.message}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <CustomChip
                  round='true'
                  size='small'
                  variant='outlined'
                  color='secondary'
                  label={warning.code}
                  sx={{ fontFamily: 'monospace', height: 18, fontSize: '0.65rem' }}
                />
              </Stack>
            </Stack>
          </Alert>
        )
      })}
    </Stack>
  )
}

export default QuoteLineWarning
