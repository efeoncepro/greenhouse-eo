'use client'

import Link from 'next/link'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { Space360Detail } from '@/lib/agency/space-360'
import { EmptyState } from '@/components/greenhouse'

import { formatMoney, formatPct } from '../shared'

type Props = {
  detail: Space360Detail
}

const FinanceTab = ({ detail }: Props) => (
  <Grid container spacing={6}>
    <Grid size={{ xs: 12 }}>
      <Card variant='outlined'>
        <CardHeader
          title='P&L y exposición financiera'
          subheader='Snapshot económico, cuentas por cobrar/pagar y exposición payroll/tooling.'
          action={
            <Stack direction='row' gap={2}>
              <Button component={Link} href='/finance/intelligence' variant='outlined' size='small'>
                Economía
              </Button>
              <Button component={Link} href='/finance' variant='outlined' size='small'>
                Abrir finanzas
              </Button>
            </Stack>
          }
        />
        <CardContent>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant='caption' color='text.secondary'>Ingresos</Typography>
              <Typography variant='h5'>{formatMoney(detail.kpis.revenueClp)}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant='caption' color='text.secondary'>Costo total</Typography>
              <Typography variant='h5'>{formatMoney(detail.kpis.totalCostClp)}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant='caption' color='text.secondary'>Margen</Typography>
              <Typography variant='h5'>{formatPct(detail.kpis.marginPct)}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant='caption' color='text.secondary'>CxC / CxP</Typography>
              <Typography variant='body2'>{formatMoney(detail.finance.receivablesClp)} · {formatMoney(detail.finance.payablesClp)}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Grid>

    <Grid size={{ xs: 12, lg: 6 }}>
      <Card variant='outlined'>
        <CardHeader title='Composición de costo' subheader='Labor, tooling y costos directos visibles para este Space.' />
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Typography variant='body2'><strong>Payroll / loaded cost:</strong> {formatMoney(detail.finance.payrollExposureClp)}</Typography>
          <Typography variant='body2'><strong>Tooling expuesto:</strong> {formatMoney(detail.finance.toolingExposureClp)}</Typography>
          <Typography variant='body2'><strong>Cuentas por cobrar:</strong> {formatMoney(detail.finance.receivablesClp)}</Typography>
          <Typography variant='body2'><strong>Cuentas por pagar:</strong> {formatMoney(detail.finance.payablesClp)}</Typography>
          {detail.finance.snapshot ? (
            <Typography variant='caption' color='text.secondary'>
              Snapshot {detail.finance.snapshot.scopeType} · {detail.finance.snapshot.periodYear}-{String(detail.finance.snapshot.periodMonth).padStart(2, '0')}
            </Typography>
          ) : (
            <Typography variant='caption' color='text.secondary'>
              Sin snapshot P&L detallado; la vista usa el summary Agency disponible.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Grid>

    <Grid size={{ xs: 12, lg: 6 }}>
      <Card variant='outlined'>
        <CardHeader title='Facturas recientes' subheader='Últimos ingresos observados para el clientId operativo del Space.' />
        <CardContent>
          {detail.finance.recentIncome.length === 0 ? (
            <EmptyState
              icon='tabler-receipt-off'
              title='Sin ingresos recientes'
              description='No encontramos ingresos recientes vinculados a este clientId.'
              action={<Button component={Link} href='/finance/income' variant='contained'>Ir a ingresos</Button>}
              minHeight={180}
            />
          ) : (
            <Stack spacing={2}>
              {detail.finance.recentIncome.map(item => (
                <Card key={item.incomeId} variant='outlined'>
                  <CardContent sx={{ display: 'grid', gap: 1 }}>
                    <Typography variant='body2' fontWeight={600}>{item.invoiceNumber || item.incomeId}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {item.invoiceDate || 'Sin fecha'} · {item.paymentStatus}
                    </Typography>
                    <Typography variant='body2'>{formatMoney(item.totalAmountClp)}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Grid>

    <Grid size={{ xs: 12 }}>
      <Card variant='outlined'>
        <CardHeader title='Egresos recientes' subheader='Cruce directo con gastos observados sobre el mismo clientId.' />
        <CardContent>
          {detail.finance.recentExpenses.length === 0 ? (
            <EmptyState
              icon='tabler-cash-off'
              title='Sin egresos recientes'
              description='No encontramos egresos recientes vinculados a este Space.'
              action={<Button component={Link} href='/finance/expenses' variant='contained'>Ir a egresos</Button>}
              minHeight={180}
            />
          ) : (
            <Stack spacing={2}>
              {detail.finance.recentExpenses.map(item => (
                <Card key={item.expenseId} variant='outlined'>
                  <CardContent sx={{ display: 'grid', gap: 1 }}>
                    <Typography variant='body2' fontWeight={600}>{item.description}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {item.expenseType} · {item.supplierName || item.memberName || 'Sin contraparte'} · {item.paymentStatus}
                    </Typography>
                    <Typography variant='body2'>{formatMoney(item.totalAmountClp)}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Grid>
  </Grid>
)

export default FinanceTab
