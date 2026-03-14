'use client'

import { useEffect, useState } from 'react'

import dynamic from 'next/dynamic'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import type { ApexOptions } from 'apexcharts'

import type { PayrollEntry } from '@/types/payroll'
import { formatCurrency, formatPeriodIdLabel } from '@views/greenhouse/payroll/helpers'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type Props = {
  entries?: PayrollEntry[]
  memberId: string
}

const PersonPayrollTab = ({ entries: initialEntries, memberId }: Props) => {
  const theme = useTheme()
  const [entries, setEntries] = useState<PayrollEntry[] | null>(initialEntries ?? null)
  const [loading, setLoading] = useState(!initialEntries)

  useEffect(() => {
    if (initialEntries) return

    const load = async () => {
      const res = await fetch(`/api/hr/payroll/members/${memberId}/history`)

      if (res.ok) {
        const data = await res.json()

        setEntries(data.entries ?? [])
      }

      setLoading(false)
    }

    load()
  }, [memberId, initialEntries])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!entries || entries.length === 0) {
    return (
      <Card>
        <CardContent sx={{ py: 8, textAlign: 'center' }}>
          <Typography color='text.secondary'>No hay nóminas procesadas para esta persona.</Typography>
        </CardContent>
      </Card>
    )
  }

  const sorted = [...entries].sort((a, b) => a.periodId.localeCompare(b.periodId))
  const currency = sorted[0].currency as 'CLP' | 'USD'

  const chartOptions: ApexOptions = {
    chart: { parentHeightOffset: 0, toolbar: { show: false } },
    dataLabels: { enabled: false },
    stroke: { width: 3, curve: 'smooth' },
    grid: {
      borderColor: 'var(--mui-palette-divider)',
      padding: { top: -10, bottom: -5 }
    },
    xaxis: {
      categories: sorted.map(e => formatPeriodIdLabel(e.periodId)),
      labels: { style: { colors: 'var(--mui-palette-text-secondary)', fontSize: '11px' } }
    },
    yaxis: {
      labels: {
        style: { colors: 'var(--mui-palette-text-secondary)' },
        formatter: v => formatCurrency(v, currency)
      }
    },
    colors: [theme.palette.success.main],
    tooltip: { y: { formatter: v => formatCurrency(v, currency) } }
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Evolución neto' subheader='Neto a pagar por período' />
          <CardContent>
            <AppReactApexCharts
              type='line'
              height={260}
              options={chartOptions}
              series={[{ name: 'Neto', data: sorted.map(e => e.netTotal) }]}
            />
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Detalle por período' />
          <CardContent>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Período</TableCell>
                    <TableCell align='right'>Base</TableCell>
                    <TableCell align='right'>Bonos</TableCell>
                    <TableCell align='right'>Bruto</TableCell>
                    <TableCell align='right'>Descuentos</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700 }}>Neto</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sorted.map(entry => (
                    <TableRow key={entry.entryId} hover>
                      <TableCell>
                        <Typography variant='body2' fontWeight={500}>
                          {formatPeriodIdLabel(entry.periodId)}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                          {formatCurrency(entry.baseSalary, currency)}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                          {formatCurrency(entry.bonusOtdAmount + entry.bonusRpaAmount + entry.bonusOtherAmount, currency)}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                          {formatCurrency(entry.grossTotal, currency)}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' color='error.main' sx={{ fontFamily: 'monospace' }}>
                          {entry.chileTotalDeductions ? `- ${formatCurrency(entry.chileTotalDeductions, 'CLP')}` : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='subtitle2' sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {formatCurrency(entry.netTotal, currency)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default PersonPayrollTab
