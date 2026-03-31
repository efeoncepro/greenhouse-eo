'use client'

import { useCallback, useEffect, useState } from 'react'

import dynamic from 'next/dynamic'
import Link from 'next/link'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import type { ApexOptions } from 'apexcharts'

import type { PersonDetail } from '@/types/people'
import type { PayrollEntry } from '@/types/payroll'
import { formatCurrency, regimeLabel, formatPeriodIdLabel } from '@views/greenhouse/payroll/helpers'
import { downloadPayrollReceiptPdf } from '@/lib/payroll/download-payroll-receipt'
import PersonFinanceTab from './PersonFinanceTab'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  detail: PersonDetail
  onEditCompensation?: () => void
}

// ---------------------------------------------------------------------------
// Small helper
// ---------------------------------------------------------------------------

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
    <Typography variant='body2' color='text.secondary'>{label}</Typography>
    <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{value}</Typography>
  </Box>
)

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PersonEconomyTab = ({ detail, onEditCompensation }: Props) => {
  const theme = useTheme()
  const compensation = detail.currentCompensation ?? null
  const memberId = detail.member.memberId

  // ── Payroll state ──────────────────────────────────────────────────
  const [entries, setEntries] = useState<PayrollEntry[] | null>(detail.recentPayroll ?? null)
  const [payrollLoading, setPayrollLoading] = useState(!detail.recentPayroll)
  const [payrollError, setPayrollError] = useState<string | null>(null)

  const loadPayrollHistory = useCallback(async () => {
    setPayrollLoading(true)
    setPayrollError(null)

    try {
      const res = await fetch(`/api/hr/payroll/members/${memberId}/history`)

      if (!res.ok) {
        const data = await res.json().catch(() => null)

        throw new Error(data?.error || 'No fue posible cargar el historial de nomina.')
      }

      const data = await res.json()

      setEntries(data.entries ?? [])
    } catch (err) {
      setPayrollError(err instanceof Error ? err.message : 'No fue posible cargar el historial de nomina.')
    } finally {
      setPayrollLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    if (detail.recentPayroll) return

    void loadPayrollHistory()
  }, [detail.recentPayroll, loadPayrollHistory])

  // ── Derived payroll data ───────────────────────────────────────────
  const sorted = entries ? [...entries].sort((a, b) => b.periodId.localeCompare(a.periodId)) : []
  const payrollCurrency = sorted.length > 0 ? (sorted[0].currency as 'CLP' | 'USD') : 'CLP'
  const chartEntries = entries ? [...entries].sort((a, b) => a.periodId.localeCompare(b.periodId)) : []

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
        formatter: v => formatCurrency(v, payrollCurrency)
      }
    },
    colors: [theme.palette.success.main],
    tooltip: { y: { formatter: v => formatCurrency(v, payrollCurrency) } }
  }

  // ── Compensation section helpers ───────────────────────────────────
  const currency = compensation ? (compensation.currency as 'CLP' | 'USD') : 'CLP'

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <Grid container spacing={6}>
      {/* ────────────────────────────────────────────────────────────── */}
      {/* Section 1: Compensation Card (always visible, accent border) */}
      {/* ────────────────────────────────────────────────────────────── */}
      <Grid size={{ xs: 12 }}>
        <Card
          elevation={0}
          sx={{
            border: t => `1px solid ${t.palette.divider}`,
            borderLeft: '4px solid',
            borderLeftColor: 'primary.main'
          }}
        >
          <CardHeader
            title='Compensacion vigente'
            subheader={compensation ? `Desde ${compensation.effectiveFrom}` : undefined}
            action={
              onEditCompensation
                ? (
                    <Button
                      size='small'
                      variant='tonal'
                      startIcon={<i className='tabler-edit' />}
                      onClick={onEditCompensation}
                    >
                      Editar
                    </Button>
                  )
                : undefined
            }
          />
          <Divider />
          <CardContent>
            {!compensation ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color='text.secondary' sx={{ mb: 2 }}>
                  No hay compensacion configurada para este colaborador.
                </Typography>
                {onEditCompensation && (
                  <Button
                    variant='contained'
                    size='small'
                    startIcon={<i className='tabler-plus' />}
                    onClick={onEditCompensation}
                  >
                    Configurar compensacion
                  </Button>
                )}
              </Box>
            ) : (
              <>
                <DetailRow label='Salario base' value={formatCurrency(compensation.baseSalary, currency)} />
                <DetailRow label='Bono conectividad' value={formatCurrency(compensation.remoteAllowance, currency)} />
                <DetailRow label='Regimen' value={`${regimeLabel[compensation.payRegime]} (${currency})`} />
                <DetailRow label='Bono OTD max.' value={formatCurrency(compensation.bonusOtdMax, currency)} />
                <DetailRow label='Bono RpA max.' value={formatCurrency(compensation.bonusRpaMax, currency)} />
              </>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* Section 2: Payroll History (Accordion, defaultExpanded)       */}
      {/* ────────────────────────────────────────────────────────────── */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <Accordion defaultExpanded disableGutters elevation={0}>
            <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
              <Stack direction='row' spacing={2} alignItems='center'>
                <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}>
                  <i className='tabler-receipt-2' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} />
                </Avatar>
                <Box>
                  <Typography variant='h6'>Historial de nomina</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Detalle de neto, bonos y recibos por periodo
                  </Typography>
                </Box>
              </Stack>
            </AccordionSummary>
            <Divider />
            <AccordionDetails sx={{ pt: 4 }}>
              {payrollLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress />
                </Box>
              )}

              {payrollError && (
                <Alert
                  severity='error'
                  action={
                    <Button color='inherit' size='small' onClick={() => void loadPayrollHistory()}>
                      Reintentar
                    </Button>
                  }
                >
                  {payrollError}
                </Alert>
              )}

              {!payrollLoading && !payrollError && sorted.length === 0 && (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography color='text.secondary'>
                    No hay nominas procesadas para esta persona.
                  </Typography>
                </Box>
              )}

              {!payrollLoading && !payrollError && sorted.length > 0 && (
                <Grid container spacing={6}>
                  {/* Net evolution chart */}
                  <Grid size={{ xs: 12 }}>
                    <Typography variant='subtitle2' sx={{ mb: 2 }}>Evolucion neto</Typography>
                    <AppReactApexCharts
                      type='line'
                      height={260}
                      options={chartOptions}
                      series={[{ name: 'Neto', data: chartEntries.map(e => e.netTotal) }]}
                    />
                  </Grid>

                  {/* Payroll table */}
                  <Grid size={{ xs: 12 }}>
                    <TableContainer>
                      <Table size='small'>
                        <TableHead>
                          <TableRow>
                            <TableCell>Periodo</TableCell>
                            <TableCell align='right'>Base</TableCell>
                            <TableCell align='right'>Bonos</TableCell>
                            <TableCell align='right'>Bruto</TableCell>
                            <TableCell align='right'>Descuentos</TableCell>
                            <TableCell align='right' sx={{ fontWeight: 700 }}>Neto</TableCell>
                            <TableCell align='center'>Recibo</TableCell>
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
                                  {formatCurrency(entry.baseSalary, payrollCurrency)}
                                </Typography>
                              </TableCell>
                              <TableCell align='right'>
                                <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                                  {formatCurrency(entry.bonusOtdAmount + entry.bonusRpaAmount + entry.bonusOtherAmount, payrollCurrency)}
                                </Typography>
                              </TableCell>
                              <TableCell align='right'>
                                <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                                  {formatCurrency(entry.grossTotal, payrollCurrency)}
                                </Typography>
                              </TableCell>
                              <TableCell align='right'>
                                <Typography variant='body2' color='error.main' sx={{ fontFamily: 'monospace' }}>
                                  {entry.chileTotalDeductions ? `- ${formatCurrency(entry.chileTotalDeductions, 'CLP')}` : '\u2014'}
                                </Typography>
                              </TableCell>
                              <TableCell align='right'>
                                <Typography variant='subtitle2' sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                  {formatCurrency(entry.netTotal, payrollCurrency)}
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
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                      <Button
                        component={Link}
                        href='/hr/payroll'
                        variant='tonal'
                        size='small'
                        color='secondary'
                        startIcon={<i className='tabler-external-link' aria-hidden='true' />}
                        aria-label='Ir al modulo de nomina'
                      >
                        Ver en modulo de nomina
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              )}
            </AccordionDetails>
          </Accordion>
        </Card>
      </Grid>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* Section 3: Operational Costs (Accordion, collapsed)           */}
      {/* ────────────────────────────────────────────────────────────── */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <Accordion defaultExpanded={false} disableGutters elevation={0}>
            <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
              <Stack direction='row' spacing={2} alignItems='center'>
                <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
                  <i className='tabler-report-money' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
                </Avatar>
                <Box>
                  <Typography variant='h6'>Costos operativos</Typography>
                  <Typography variant='body2' color='text.secondary'>
                    Atribucion de costos, gastos y resumen financiero
                  </Typography>
                </Box>
              </Stack>
            </AccordionSummary>
            <Divider />
            <AccordionDetails sx={{ pt: 4 }}>
              <PersonFinanceTab memberId={memberId} />
            </AccordionDetails>
          </Accordion>
        </Card>
      </Grid>
    </Grid>
  )
}

export default PersonEconomyTab
