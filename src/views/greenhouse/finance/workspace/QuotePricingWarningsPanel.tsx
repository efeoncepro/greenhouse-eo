'use client'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import type { PricingWarning, PricingWarningSeverity } from '@/lib/finance/pricing/contracts'

// Ordering + styling per severity so the user's eye lands on critical first.
const SEVERITY_ORDER: Record<PricingWarningSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2
}

const SEVERITY_META: Record<
  PricingWarningSeverity,
  { label: string; color: 'error' | 'warning' | 'info'; alertSeverity: 'error' | 'warning' | 'info' }
> = {
  critical: { label: 'Crítico', color: 'error', alertSeverity: 'error' },
  warning: { label: 'Atención', color: 'warning', alertSeverity: 'warning' },
  info: { label: 'Info', color: 'info', alertSeverity: 'info' }
}

export interface QuotePricingWarningsPanelProps {
  warnings: PricingWarning[] | null | undefined
}

const QuotePricingWarningsPanel = ({ warnings }: QuotePricingWarningsPanelProps) => {
  if (!warnings || warnings.length === 0) return null

  const sorted = [...warnings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  )

  const criticalCount = sorted.filter(w => w.severity === 'critical').length
  const warningCount = sorted.filter(w => w.severity === 'warning').length
  const infoCount = sorted.filter(w => w.severity === 'info').length

  return (
    <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
      <CardHeader
        title='Avisos del pricing engine'
        titleTypographyProps={{ variant: 'subtitle1' }}
        subheader='Revisa estos puntos antes de enviar la cotización.'
        subheaderTypographyProps={{ variant: 'caption' }}
        action={
          <Stack direction='row' spacing={0.5}>
            {criticalCount > 0 ? (
              <CustomChip round='true' size='small' variant='tonal' color='error' label={String(criticalCount)} />
            ) : null}
            {warningCount > 0 ? (
              <CustomChip round='true' size='small' variant='tonal' color='warning' label={String(warningCount)} />
            ) : null}
            {infoCount > 0 ? (
              <CustomChip round='true' size='small' variant='tonal' color='info' label={String(infoCount)} />
            ) : null}
          </Stack>
        }
      />
      <Divider />
      <CardContent>
        <Stack spacing={1.5} role='list'>
          {sorted.map((w, idx) => {
            const meta = SEVERITY_META[w.severity]

            return (
              <Alert
                key={`${w.code}-${idx}`}
                severity={meta.alertSeverity}
                variant='outlined'
                role='listitem'
                sx={{ py: 0.5 }}
                icon={false}
              >
                <Stack spacing={0.5}>
                  <Stack direction='row' spacing={1} alignItems='center'>
                    <CustomChip round='true' size='small' variant='tonal' color={meta.color} label={meta.label} />
                    <Typography variant='caption' sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                      {w.code}
                    </Typography>
                    {typeof w.lineIndex === 'number' ? (
                      <CustomChip
                        round='true'
                        size='small'
                        variant='outlined'
                        color='secondary'
                        label={`Línea ${w.lineIndex + 1}`}
                      />
                    ) : null}
                  </Stack>
                  <Typography variant='body2'>{w.message}</Typography>
                </Stack>
              </Alert>
            )
          })}
        </Stack>
        <Box sx={{ mt: 2 }}>
          <Typography variant='caption' color='text.secondary'>
            Estos avisos salen del pricing engine v2 cuando hay fallbacks silenciosos (modelo comercial desconocido, factor país ausente, tier sin margin policy, etc.). Corregir en el catálogo elimina el aviso automáticamente.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

export default QuotePricingWarningsPanel
