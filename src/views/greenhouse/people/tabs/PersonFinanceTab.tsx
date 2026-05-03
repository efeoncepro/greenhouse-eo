'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import CustomChip from '@core/components/mui/Chip'

import type { PersonFinanceOverview } from '@/types/people'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_SHORT = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const formatCLP = (amount: number): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)

const closureColor = (status: string | null, periodClosed: boolean): 'success' | 'warning' | 'info' | 'secondary' => {
  if (status === 'closed' || periodClosed) return 'success'
  if (status === 'ready') return 'info'
  if (status === 'reopened') return 'warning'

  return 'secondary'
}

const closureLabel = (status: string | null, periodClosed: boolean) => {
  if (status === 'closed' || periodClosed) return 'Cerrado'
  if (status === 'ready') return 'Listo para cierre'
  if (status === 'reopened') return 'Reabierto'

  return 'Provisional'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = {
  memberId: string
}

const PersonFinanceTab = ({ memberId }: Props) => {
  const [data, setData] = useState<PersonFinanceOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/people/${memberId}/finance`)

        if (res.ok) {
          const json = await res.json()

          setData(json)
        }
      } catch {
        // Non-blocking
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [memberId])

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent sx={{ py: 8, textAlign: 'center' }}>
          <Typography color='text.secondary'>No se pudo cargar la información financiera.</Typography>
        </CardContent>
      </Card>
    )
  }

  const { summary, costAttribution, payrollHistory, latestCostSnapshot } = data

  // Derive total attributed cost from most recent period
  const latestPeriodKey = costAttribution && costAttribution.length > 0
    ? Math.max(...costAttribution.map(c => c.periodYear * 12 + c.periodMonth))
    : 0

  const latestPeriodItems = costAttribution?.filter(c => c.periodYear * 12 + c.periodMonth === latestPeriodKey) ?? []
  const totalAttributedCost = latestPeriodItems.reduce((sum, c) => sum + c.attributedCostClp, 0)

  // Payroll: show last 6 entries
  const recentPayroll = payrollHistory
    ? [...payrollHistory].sort((a, b) => {
        const ka = `${a.year}-${String(a.month).padStart(2, '0')}`
        const kb = `${b.year}-${String(b.month).padStart(2, '0')}`

        return kb.localeCompare(ka)
      }).slice(0, 6)
    : []

  return (
    <Grid container spacing={6}>
      {/* ROW 0 — KPI cards */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Spaces asignados'
          stats={String(summary.activeAssignmentsCount)}
          subtitle='con dedicación activa'
          avatarIcon='tabler-building-store'
          avatarColor='info'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Costo laboral total'
          stats={latestCostSnapshot?.loadedCostTarget ? formatCLP(latestCostSnapshot.loadedCostTarget) : totalAttributedCost > 0 ? formatCLP(totalAttributedCost) : '—'}
          subtitle={latestCostSnapshot ? `${MONTH_SHORT[latestCostSnapshot.periodMonth]} ${latestCostSnapshot.periodYear}` : 'del período más reciente'}
          avatarIcon='tabler-wallet'
          avatarColor='primary'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Nóminas procesadas'
          stats={String(summary.payrollEntriesCount)}
          subtitle='períodos registrados'
          avatarIcon='tabler-receipt-2'
          avatarColor='success'
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle
          title='Gastos asociados'
          stats={String(summary.expenseCount)}
          subtitle={summary.totalExpensesClp > 0 ? formatCLP(summary.totalExpensesClp) : 'sin gastos'}
          avatarIcon='tabler-file-invoice'
          avatarColor='warning'
        />
      </Grid>

      {/* ROW 1 — Cost attribution table */}
      <Grid size={{ xs: 12 }}>
        {latestCostSnapshot && (
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader
              title='Costo total del período'
              subheader={`${MONTH_SHORT[latestCostSnapshot.periodMonth]} ${latestCostSnapshot.periodYear}`}
              avatar={
                <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                  <i className='tabler-currency-dollar' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
                </Avatar>
              }
              action={
                <CustomChip
                  round='true'
                  size='small'
                  variant='tonal'
                  color={closureColor(latestCostSnapshot.closureStatus, latestCostSnapshot.periodClosed)}
                  label={closureLabel(latestCostSnapshot.closureStatus, latestCostSnapshot.periodClosed)}
                />
              }
            />
            <Divider />
            <CardContent>
              <Grid container spacing={4}>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <HorizontalWithSubtitle
                    title='Loaded cost'
                    stats={formatCLP(latestCostSnapshot.loadedCostTarget)}
                    subtitle='snapshot canónico'
                    avatarIcon='tabler-coins'
                    avatarColor='primary'
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <HorizontalWithSubtitle
                    title='Costo laboral'
                    stats={formatCLP(latestCostSnapshot.laborCostTarget)}
                    subtitle='payroll + compensación'
                    avatarIcon='tabler-receipt-2'
                    avatarColor='success'
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <HorizontalWithSubtitle
                    title='Overhead directo'
                    stats={formatCLP(latestCostSnapshot.directOverheadTarget)}
                    subtitle='tools y costos asignados'
                    avatarIcon='tabler-tool'
                    avatarColor='warning'
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <HorizontalWithSubtitle
                    title='Overhead compartido'
                    stats={formatCLP(latestCostSnapshot.sharedOverheadTarget)}
                    subtitle='pool distribuido'
                    avatarIcon='tabler-building-bank'
                    avatarColor='info'
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Distribución de costo laboral'
            subheader='Cómo se distribuye el costo de esta persona entre los Spaces asignados'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
                <i className='tabler-arrows-split-2' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
              </Avatar>
            }
          />
          <Divider />
          {!costAttribution || costAttribution.length === 0 ? (
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 4 }} role='status'>
                <Typography variant='h6' sx={{ mb: 1 }}>Sin atribución de costos</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Cuando esta persona tenga nómina procesada y asignaciones activas, verás cómo se distribuye su costo entre Spaces.
                </Typography>
              </Box>
            </CardContent>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Space</TableCell>
                    <TableCell>Organización</TableCell>
                    <TableCell>Dedicación</TableCell>
                    <TableCell align='right'>Costo atribuido</TableCell>
                    <TableCell align='right'>Período</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {costAttribution.map((row, i) => (
                    <TableRow key={`${row.clientId}-${row.periodYear}-${row.periodMonth}-${i}`} hover>
                      <TableCell>
                        <Typography variant='body2' fontWeight={600}>{row.clientName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption' color='text.secondary'>{row.organizationName || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 120 }}>
                          <LinearProgress
                            variant='determinate'
                            value={Math.min(row.fteAllocation * 100, 100)}
                            sx={{ width: 60, height: 6, borderRadius: 3 }}
                            aria-label={`Dedicación: ${(row.fteAllocation * 100).toFixed(0)}%`}
                          />
                          <Typography variant='body2' color='text.secondary'>
                            {(row.fteAllocation * 100).toFixed(0)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2'>
                          {formatCLP(row.attributedCostClp)}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <CustomChip
                          round='true'
                          size='small'
                          variant='tonal'
                          color='secondary'
                          label={`${MONTH_SHORT[row.periodMonth]} ${row.periodYear}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Grid>

      {/* ROW 2 — Payroll summary (compact) */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Historial de nómina reciente'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}>
                <i className='tabler-history' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} />
              </Avatar>
            }
          />
          <Divider />
          {recentPayroll.length === 0 ? (
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 4 }} role='status'>
                <Typography variant='body2' color='text.secondary'>
                  No hay registros de nómina para esta persona.
                </Typography>
              </Box>
            </CardContent>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Período</TableCell>
                    <TableCell align='right'>Bruto</TableCell>
                    <TableCell align='right' sx={{ fontWeight: 700 }}>Neto</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentPayroll.map(entry => (
                    <TableRow key={entry.entryId} hover>
                      <TableCell>
                        <Typography variant='body2' fontWeight={500}>
                          {MONTH_SHORT[entry.month]} {entry.year}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2'>
                          {formatCLP(entry.grossTotal)}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
                          {formatCLP(entry.netTotal)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button
            component={Link}
            href='/finance'
            variant='tonal'
            size='small'
            color='secondary'
            startIcon={<i className='tabler-external-link' aria-hidden='true' />}
            aria-label='Ir al módulo de finanzas'
          >
            Ver en módulo de finanzas
          </Button>
        </Box>
      </Grid>
    </Grid>
  )
}

export default PersonFinanceTab
