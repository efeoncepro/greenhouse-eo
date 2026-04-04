'use client'

import Link from 'next/link'

import dynamic from 'next/dynamic'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

import type { Space360Detail } from '@/lib/agency/space-360'
import { EmptyState } from '@/components/greenhouse'

import { formatMoney, formatPct } from '../shared'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'), { ssr: false })

type Props = {
  detail: Space360Detail
}

const FinanceTab = ({ detail }: Props) => {
  const theme = useTheme()
  const mode = theme.palette.mode

  // ── Cost composition donut ────────────────────────────────────────────────
  const costEntries = [
    { label: 'Payroll / loaded cost', value: detail.finance.payrollExposureClp, color: theme.palette.primary.main },
    { label: 'Tooling expuesto', value: detail.finance.toolingExposureClp, color: theme.palette.warning.main },
    { label: 'Cuentas por cobrar', value: detail.finance.receivablesClp, color: theme.palette.success.main },
    { label: 'Cuentas por pagar', value: detail.finance.payablesClp, color: theme.palette.error.main }
  ].filter(e => e.value != null && e.value > 0)

  const donutSeries = costEntries.map(e => e.value as number)
  const donutLabels = costEntries.map(e => e.label)
  const donutColors = costEntries.map(e => e.color)
  const donutTotal = donutSeries.reduce((acc, v) => acc + v, 0)

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', toolbar: { show: false }, background: 'transparent' },
    theme: { mode },
    labels: donutLabels,
    colors: donutColors,
    legend: { position: 'bottom', labels: { colors: theme.palette.text.secondary } },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            name: { show: true, fontSize: '14px', color: theme.palette.text.secondary },
            value: {
              show: true,
              fontSize: '18px',
              fontWeight: 700,
              formatter: (val: string) => formatMoney(Number(val))
            },
            total: {
              show: true,
              label: 'Total',
              fontSize: '14px',
              color: theme.palette.text.secondary,
              formatter: () => formatMoney(donutTotal)
            }
          }
        }
      }
    },
    dataLabels: { enabled: false },
    tooltip: {
      theme: mode,
      y: { formatter: (val: number) => formatMoney(val) }
    }
  }

  return (
  <Grid container spacing={6}>
    <Grid size={{ xs: 12 }}>
      <Card variant='outlined'>
        <CardHeader
          title='P&L y exposición financiera'
          subheader='Snapshot económico, cuentas por cobrar/pagar y exposición payroll/tooling.'
          action={
            <Button component={Link} href='/finance' variant='outlined' size='small'>
              Ver finanzas
            </Button>
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
        <CardContent>
          {costEntries.length > 0 ? (
            <figure
              role='img'
              aria-label={`Composición de costo: ${costEntries.map(e => `${e.label} ${formatMoney(e.value)}`).join(', ')}`}
              style={{ margin: 0 }}
            >
              <AppReactApexCharts
                type='donut'
                height={300}
                width='100%'
                series={donutSeries}
                options={donutOptions}
              />
            </figure>
          ) : (
            <Typography variant='body2' color='text.secondary'>Sin costos registrados para este Space.</Typography>
          )}
          {detail.finance.snapshot ? (
            <Typography variant='caption' color='text.secondary' sx={{ mt: 2, display: 'block' }}>
              Snapshot {detail.finance.snapshot.scopeType} · {detail.finance.snapshot.periodYear}-{String(detail.finance.snapshot.periodMonth).padStart(2, '0')}
            </Typography>
          ) : (
            <Typography variant='caption' color='text.secondary' sx={{ mt: 2, display: 'block' }}>
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
              animatedIcon='/animations/empty-chart.json'
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
              animatedIcon='/animations/empty-chart.json'
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
}

export default FinanceTab
