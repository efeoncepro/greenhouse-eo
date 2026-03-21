'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { CompensationVersion } from '@/types/payroll'
import { formatCurrency, regimeLabel } from '@views/greenhouse/payroll/helpers'

type Props = {
  compensation?: CompensationVersion | null
  onEdit?: () => void
}

const DetailRow = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
    <Typography variant='body2' color='text.secondary'>{label}</Typography>
    <Typography variant='body2' sx={{ fontFamily: 'monospace', color: color ?? 'text.primary' }}>{value}</Typography>
  </Box>
)

const PersonCompensationTab = ({ compensation, onEdit }: Props) => {
  if (!compensation) {
    return (
      <Card>
        <CardContent sx={{ py: 8, textAlign: 'center' }}>
          <Typography color='text.secondary' sx={{ mb: 2 }}>No hay compensación configurada para este colaborador.</Typography>
          {onEdit && (
            <Button variant='contained' size='small' startIcon={<i className='tabler-plus' />} onClick={onEdit}>
              Configurar compensación
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const c = compensation
  const currency = c.currency as 'CLP' | 'USD'

  return (
    <Card>
      <CardHeader
        title='Compensación vigente'
        subheader={`Desde ${c.effectiveFrom}`}
        action={
          <Stack direction='row' spacing={1} alignItems='center'>
            <Chip
              size='small'
              label={`v${c.version}`}
              color='primary'
              variant='tonal'
            />
            {onEdit && (
              <IconButton size='small' onClick={onEdit} title='Editar compensación'>
                <i className='tabler-edit' style={{ fontSize: 18 }} />
              </IconButton>
            )}
          </Stack>
        }
      />
      <CardContent>
        <DetailRow label='Salario base' value={formatCurrency(c.baseSalary, currency)} />
        <DetailRow label='Bono conectividad' value={formatCurrency(c.remoteAllowance, currency)} />
        <DetailRow label='Régimen' value={`${regimeLabel[c.payRegime]} (${currency})`} />

        <Divider sx={{ my: 2 }} />
        <Typography variant='subtitle2' sx={{ mb: 1 }}>Bonos variables</Typography>
        <DetailRow label='Bono On-Time' value={formatCurrency(c.bonusOtdMax, currency)} />
        <DetailRow label='Bono RpA' value={formatCurrency(c.bonusRpaMax, currency)} />

        {c.payRegime === 'chile' && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant='subtitle2' sx={{ mb: 1 }}>Previsión Chile</Typography>
            {c.afpName && (
              <DetailRow label='AFP' value={`${c.afpName} (${((c.afpRate ?? 0) * 100).toFixed(2)}%)`} />
            )}
            <DetailRow
              label='Salud'
              value={c.healthSystem === 'fonasa' ? 'Fonasa (7%)' : `Isapre (${c.healthPlanUf ?? '—'} UF)`}
            />
            <DetailRow
              label='Contrato'
              value={c.contractType === 'indefinido' ? 'Indefinido' : 'Plazo fijo'}
            />
            <DetailRow
              label='Cesantía'
              value={`${((c.unemploymentRate ?? 0) * 100).toFixed(1)}%`}
            />
            {c.hasApv && (
              <DetailRow label='APV' value='Sí' />
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default PersonCompensationTab
