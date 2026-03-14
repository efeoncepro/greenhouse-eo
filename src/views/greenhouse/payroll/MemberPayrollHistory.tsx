'use client'

import { useEffect, useState } from 'react'

import dynamic from 'next/dynamic'
import Link from 'next/link'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
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

import type { MemberPayrollHistory as MemberHistory } from '@/types/payroll'
import { getInitials } from '@/utils/getInitials'
import { formatCurrency, formatPeriodIdLabel, regimeLabel, regimeColor } from './helpers'

const AppReactApexCharts = dynamic(() => import('@/libs/styles/AppReactApexCharts'))

type Props = {
  memberId: string
}

const MemberPayrollHistory = ({ memberId }: Props) => {
  const theme = useTheme()
  const [data, setData] = useState<MemberHistory | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/hr/payroll/members/${memberId}/history`)

      if (res.ok) {
        const json = await res.json()

        setData(json)
      }

      setLoading(false)
    }

    load()
  }, [memberId])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!data || data.entries.length === 0) {
    return (
      <Card>
        <CardContent sx={{ py: 8, textAlign: 'center' }}>
          <Typography color='text.secondary'>No hay historial de nómina para este colaborador.</Typography>
          <Button component={Link} href='/hr/payroll' variant='tonal' sx={{ mt: 2 }}>
            Volver a Nómina
          </Button>
        </CardContent>
      </Card>
    )
  }

  const firstEntry = data.entries[0]
  const sortedEntries = [...data.entries].sort((a, b) => a.periodId.localeCompare(b.periodId))
  const currency = firstEntry.currency

  // Chart data
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
    <Stack spacing={4}>
      {/* Header */}
      <Stack direction='row' spacing={2} alignItems='center'>
        <Button component={Link} href='/hr/payroll' variant='tonal' color='secondary' size='small'>
          <i className='tabler-arrow-left' />
        </Button>
        <Avatar
          src={firstEntry.memberAvatarUrl || undefined}
          sx={{ width: 48, height: 48 }}
        >
          {getInitials(firstEntry.memberName)}
        </Avatar>
        <Box>
          <Typography variant='h5'>{firstEntry.memberName}</Typography>
          <Chip
            size='small'
            label={regimeLabel[firstEntry.payRegime]}
            color={regimeColor[firstEntry.payRegime]}
            variant='tonal'
          />
        </Box>
      </Stack>

      {/* Net evolution chart */}
      <Card>
        <CardHeader title='Evolución neto' subheader='Neto a pagar por período' />
        <CardContent>
          <AppReactApexCharts
            type='line'
            height={280}
            options={chartOptions}
            series={[{ name: 'Neto', data: chartNetSeries }]}
          />
        </CardContent>
      </Card>

      {/* Entries table */}
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
                {sortedEntries.map(entry => (
                  <TableRow key={entry.entryId} hover>
                    <TableCell>
                      <Typography variant='body2' fontWeight={500}>
                        {formatPeriodIdLabel(entry.periodId)}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                        {formatCurrency(entry.baseSalary, entry.currency)}
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

      {/* Compensation versions */}
      {data.compensationHistory.length > 0 && (
        <Card>
          <CardHeader title='Historial de compensación' subheader={`${data.compensationHistory.length} versión${data.compensationHistory.length !== 1 ? 'es' : ''}`} />
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
                        <Chip
                          size='small'
                          label={`v${cv.version}`}
                          color={cv.isCurrent ? 'primary' : 'default'}
                          variant='tonal'
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
    </Stack>
  )
}

export default MemberPayrollHistory
