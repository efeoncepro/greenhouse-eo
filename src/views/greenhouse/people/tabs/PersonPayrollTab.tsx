'use client'

import { useCallback, useEffect, useState } from 'react'

import dynamic from 'next/dynamic'
import Link from 'next/link'

import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import type { ApexOptions } from 'apexcharts'

import CustomChip from '@core/components/mui/Chip'


import type { PayrollEntry } from '@/types/payroll'
import { downloadPayrollReceiptPdf } from '@/lib/payroll/download-payroll-receipt'
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
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/hr/payroll/members/${memberId}/history`)

      if (!res.ok) {
        const data = await res.json().catch(() => null)

        throw new Error(data?.error || 'No fue posible cargar el historial de nómina.')
      }

      const data = await res.json()

      setEntries(data.entries ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar el historial de nómina.')
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    if (initialEntries) return

    void loadHistory()
  }, [initialEntries, loadHistory])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert
        severity='error'
        action={(
          <Button color='inherit' size='small' onClick={() => void loadHistory()}>
            Reintentar
          </Button>
        )}
      >
        {error}
      </Alert>
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

  const sorted = [...entries].sort((a, b) => b.periodId.localeCompare(a.periodId))
  const currency = sorted[0].currency as 'CLP' | 'USD'
  const chartEntries = [...entries].sort((a, b) => a.periodId.localeCompare(b.periodId))

  const handleDownloadReceipt = async (entry: PayrollEntry) => {
    try {
      await downloadPayrollReceiptPdf({
        route: `/api/hr/payroll/entries/${entry.entryId}/receipt`,
        entryId: entry.entryId,
        periodId: entry.periodId,
        memberId: entry.memberId,
        memberName: entry.memberName,
        payRegime: entry.payRegime,
        currency: entry.currency
      })
    } catch (error) {
      console.error('Unable to download payroll receipt.', error)
    }
  }

  const chartOptions: ApexOptions = {
    chart: { parentHeightOffset: 0, toolbar: { show: false } },
    dataLabels: { enabled: false },
    stroke: { width: 3, curve: 'smooth' },
    grid: {
      borderColor: 'var(--mui-palette-divider)',
      padding: { top: -10, bottom: -5 }
    },
    xaxis: {
      categories: chartEntries.map(e => formatPeriodIdLabel(e.periodId)),
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
              series={[{ name: 'Neto', data: chartEntries.map(e => e.netTotal) }]}
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
                    <TableCell align='center'>Recibo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sorted.map(entry => {
                    // TASK-745d — derivado del entry: si net != netCalculated o
                    // hay manualOverride explicito, es senal de adjustments
                    // activos. Conservador: solo muestra el chip; el detalle
                    // exacto vive en el PDF / dialog Ajustar pago.
                    const hasAdjustment =
                      entry.manualOverride ||
                      (entry.netTotalCalculated != null &&
                        Math.abs((entry.netTotalCalculated ?? 0) - entry.netTotal) > 0.01)

                    return (
                    <TableRow key={entry.entryId} hover>
                      <TableCell>
                        <Stack direction='row' spacing={1} alignItems='center'>
                          <Typography variant='body2' fontWeight={500}>
                            {formatPeriodIdLabel(entry.periodId)}
                          </Typography>
                          {hasAdjustment && (
                            <Tooltip title='Este período tiene ajustes de pago aplicados. Ver recibo para detalle.'>
                              <Box>
                                <CustomChip
                                  round='true'
                                  size='small'
                                  color='warning'
                                  label='Ajustado'
                                  sx={{ height: 18, fontSize: '0.65rem' }}
                                />
                              </Box>
                            </Tooltip>
                          )}
                        </Stack>
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
                      <TableCell align='center'>
                        <Button
                          size='small'
                          variant='tonal'
                          startIcon={<i className='tabler-file-download' />}
                          onClick={() => { void handleDownloadReceipt(entry) }}
                          aria-label={`Descargar recibo PDF de ${formatPeriodIdLabel(entry.periodId)}`}
                        >
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button
            component={Link}
            href='/hr/payroll'
            variant='tonal'
            size='small'
            color='secondary'
            startIcon={<i className='tabler-external-link' aria-hidden='true' />}
            aria-label='Ir al módulo de nómina'
          >
            Ver en módulo de nómina
          </Button>
        </Box>
      </Grid>
    </Grid>
  )
}

export default PersonPayrollTab
