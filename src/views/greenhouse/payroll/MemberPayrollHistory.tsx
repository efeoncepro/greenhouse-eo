'use client'

import { useEffect, useState } from 'react'

import dynamic from 'next/dynamic'
import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
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

import CustomChip from '@core/components/mui/Chip'

import { HorizontalWithSubtitle, StatsWithAreaChart } from '@/components/card-statistics'
import type { MemberPayrollHistory as MemberHistory } from '@/types/payroll'
import { getInitials } from '@/utils/getInitials'
import { formatCurrency, formatPeriodIdLabel, formatAttendanceRatio, formatFactor, regimeLabel, regimeColor } from './helpers'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type Props = {
  memberId: string
}

const MemberPayrollHistory = ({ memberId }: Props) => {
  const theme = useTheme()
  const [data, setData] = useState<MemberHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/hr/payroll/members/${memberId}/history`)

      if (res.ok) {
        const json = await res.json()

        setData(json)
      } else {
        setError(true)
      }

      setLoading(false)
    }

    load()
  }, [memberId])

  if (loading) {
    return (
      <Stack spacing={6}>
        <Skeleton variant='rounded' height={60} />
        <Grid container spacing={6}>
          {[0, 1, 2, 3].map(i => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant='rounded' height={120} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant='rounded' height={300} />
      </Stack>
    )
  }

  if (error || !data) {
    return (
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardContent sx={{ py: 8, textAlign: 'center' }}>
          <Stack alignItems='center' spacing={2}>
            <i className='tabler-alert-triangle' style={{ fontSize: 40, color: 'var(--mui-palette-error-main)' }} />
            <Alert severity='error'>No se pudo cargar la información del colaborador.</Alert>
            <Button component={Link} href='/hr/payroll' variant='tonal'>
              Volver a Nómina
            </Button>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  const hasEntries = data.entries.length > 0
  const hasCompensation = data.compensationHistory.length > 0
  const member = data.member

  const memberName = member?.memberName || (hasEntries ? data.entries[0].memberName : 'Colaborador')
  const memberAvatar = member?.memberAvatarUrl || (hasEntries ? data.entries[0].memberAvatarUrl : null)
  const firstEntry = hasEntries ? data.entries[0] : null

  const sortedEntries = hasEntries ? [...data.entries].sort((a, b) => a.periodId.localeCompare(b.periodId)) : []
  const currency = firstEntry?.currency ?? (hasCompensation ? data.compensationHistory[0].currency : 'CLP')

  // KPI summary values
  const latestNet = hasEntries ? sortedEntries[sortedEntries.length - 1].netTotal : null
  const avgNet = hasEntries ? Math.round(sortedEntries.reduce((s, e) => s + e.netTotal, 0) / sortedEntries.length) : null
  const currentBase = hasCompensation ? data.compensationHistory.find(cv => cv.isCurrent)?.baseSalary ?? data.compensationHistory[0].baseSalary : null
  const totalVersions = hasCompensation ? data.compensationHistory.length : 0

  // Chart data (only if entries exist)
  const chartCategories = sortedEntries.map(e => formatPeriodIdLabel(e.periodId))
  const chartNetSeries = sortedEntries.map(e => e.netTotal)

  const chartOptions: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    dataLabels: { enabled: false },
    stroke: { width: 3, curve: 'smooth' },
    grid: {
      borderColor: 'var(--mui-palette-divider)',
      padding: { top: -10, bottom: -5 }
    },
    xaxis: {
      categories: chartCategories,
      labels: { style: { colors: 'var(--mui-palette-text-secondary)', fontSize: '11px' } }
    },
    yaxis: {
      labels: {
        style: { colors: 'var(--mui-palette-text-secondary)' },
        formatter: v => formatCurrency(v, currency)
      }
    },
    colors: [theme.palette.success.main],
    tooltip: {
      y: { formatter: v => formatCurrency(v, currency) }
    }
  }

  return (
    <Stack spacing={6}>
      {/* Header */}
      <Stack direction='row' spacing={2} alignItems='center'>
        <Button component={Link} href='/hr/payroll' variant='tonal' color='secondary' size='small'>
          <i className='tabler-arrow-left' />
        </Button>
        <Avatar
          src={memberAvatar || undefined}
          sx={{ width: 48, height: 48 }}
        >
          {getInitials(memberName)}
        </Avatar>
        <Box>
          <Typography variant='h5'>{memberName}</Typography>
          {firstEntry && (
            <CustomChip
              round='true'
              size='small'
              label={regimeLabel[firstEntry.payRegime]}
              color={regimeColor[firstEntry.payRegime]}
            />
          )}
          {!firstEntry && hasCompensation && (
            <CustomChip
              round='true'
              size='small'
              label={regimeLabel[data.compensationHistory[0].payRegime]}
              color={regimeColor[data.compensationHistory[0].payRegime]}
            />
          )}
        </Box>
      </Stack>

      {/* KPI summary row */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          {hasEntries && chartNetSeries.length >= 2 ? (
            <StatsWithAreaChart
              title='Evolución neto'
              stats={latestNet != null ? formatCurrency(latestNet, currency) : '—'}
              avatarIcon='tabler-wallet'
              avatarColor='success'
              avatarSkin='light'
              chartColor='success'
              chartSeries={[{ data: chartNetSeries }]}
            />
          ) : (
            <HorizontalWithSubtitle
              title='Último neto'
              stats={latestNet != null ? formatCurrency(latestNet, currency) : '—'}
              avatarIcon='tabler-wallet'
              avatarColor='success'
              subtitle={hasEntries ? formatPeriodIdLabel(sortedEntries[sortedEntries.length - 1].periodId) : 'Sin nóminas'}
            />
          )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Neto promedio'
            stats={avgNet != null ? formatCurrency(avgNet, currency) : '—'}
            avatarIcon='tabler-chart-line'
            avatarColor='info'
            subtitle={hasEntries ? `${sortedEntries.length} período${sortedEntries.length !== 1 ? 's' : ''}` : 'Sin datos'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Base actual'
            stats={currentBase != null ? formatCurrency(currentBase, currency) : '—'}
            avatarIcon='tabler-currency-dollar'
            avatarColor='primary'
            subtitle={hasCompensation ? 'Compensación vigente' : 'Sin compensación'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Versiones'
            stats={String(totalVersions)}
            avatarIcon='tabler-history'
            avatarColor='warning'
            subtitle='Historial de compensación'
          />
        </Grid>
      </Grid>

      {/* Net evolution chart (only with entries) */}
      {hasEntries && (
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Evolución neto'
            subheader='Neto a pagar por período'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}>
                <i className='tabler-chart-line' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} />
              </Avatar>
            }
          />
          <Divider />
          <CardContent>
            <AppReactApexCharts
              type='line'
              height={280}
              options={chartOptions}
              series={[{ name: 'Neto', data: chartNetSeries }]}
            />
          </CardContent>
        </Card>
      )}

      {/* Entries table (only with entries) */}
      {hasEntries && (
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Detalle por período'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                <i className='tabler-table' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
              </Avatar>
            }
          />
          <Divider />
          <CardContent>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Período</TableCell>
                    <TableCell align='center'>Asistencia</TableCell>
                    <TableCell align='right'>Base</TableCell>
                    <TableCell align='center'>OTD</TableCell>
                    <TableCell align='center'>RpA</TableCell>
                    <TableCell align='right'>Bonos</TableCell>
                    <TableCell align='right'>Bruto</TableCell>
                    <TableCell align='right'>Descuentos</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700 }}>Neto</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedEntries.map(entry => (
                    <TableRow key={entry.entryId} hover>
                      <TableCell>
                        <Typography variant='body2' fontWeight={500}>
                          {formatPeriodIdLabel(entry.periodId)}
                        </Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                          {formatAttendanceRatio(entry.daysPresent, entry.workingDaysInPeriod)}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                          {formatCurrency(entry.adjustedBaseSalary ?? entry.baseSalary, entry.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                          {formatFactor(entry.bonusOtdProrationFactor)}
                        </Typography>
                      </TableCell>
                      <TableCell align='center'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                          {formatFactor(entry.bonusRpaProrationFactor)}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                          {formatCurrency(entry.bonusOtdAmount + entry.bonusRpaAmount + entry.bonusOtherAmount, entry.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                          {formatCurrency(entry.grossTotal, entry.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' color='error.main' sx={{ fontFamily: 'monospace' }}>
                          {entry.chileTotalDeductions ? `- ${formatCurrency(entry.chileTotalDeductions, 'CLP')}` : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='subtitle2' sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {formatCurrency(entry.netTotal, entry.currency)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Empty state for entries only */}
      {!hasEntries && (
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardContent sx={{ py: 6, textAlign: 'center' }}>
            <Stack alignItems='center' spacing={1}>
              <i className='tabler-receipt-off' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
              <Typography color='text.secondary'>
                Aún no hay nóminas cerradas para este colaborador.
              </Typography>
              <Typography variant='caption' color='text.disabled'>
                Las nóminas aparecerán aquí una vez que se calculen y aprueben períodos que incluyan a este colaborador.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Compensation versions (always show if available) */}
      {hasCompensation && (
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Historial de compensación'
            subheader={`${data.compensationHistory.length} versión${data.compensationHistory.length !== 1 ? 'es' : ''}`}
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
                <i className='tabler-history' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
              </Avatar>
            }
          />
          <Divider />
          <CardContent>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Versión</TableCell>
                    <TableCell align='right'>Base</TableCell>
                    <TableCell>Vigente desde</TableCell>
                    <TableCell>Vigente hasta</TableCell>
                    <TableCell>Motivo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.compensationHistory.map(cv => (
                    <TableRow key={cv.versionId} hover>
                      <TableCell>
                        <CustomChip
                          round='true'
                          size='small'
                          label={`v${cv.version}`}
                          color={cv.isCurrent ? 'primary' : 'default'}
                          sx={{ height: 20 }}
                        />
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                          {formatCurrency(cv.baseSalary, cv.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>{cv.effectiveFrom}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>
                          {cv.effectiveTo ?? 'Vigente'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cv.changeReason ?? '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Fully empty state — no entries and no compensation */}
      {!hasEntries && !hasCompensation && (
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardContent sx={{ py: 6, textAlign: 'center' }}>
            <Stack alignItems='center' spacing={2}>
              <i className='tabler-user-off' style={{ fontSize: 40, color: 'var(--mui-palette-text-disabled)' }} />
              <Typography color='text.secondary'>
                No hay información de nómina ni compensación para este colaborador.
              </Typography>
              <Button component={Link} href='/hr/payroll' variant='tonal'>
                Volver a Nómina
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  )
}

export default MemberPayrollHistory
