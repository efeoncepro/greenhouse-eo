'use client'

import { useCallback, useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

interface PayrollEntry {
  entryId: string
  periodId: string
  year: number
  month: number
  currency: string
  grossTotal: number
  netTotal: number
  status: string
}

interface PayrollData {
  payrollHistory: PayrollEntry[]
  compensation: {
    activeAssignmentsCount: number
    payrollEntriesCount: number
  } | null
}

const MONTHS = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const fmt = (amount: number, currency: string) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: currency === 'USD' ? 'USD' : 'CLP', maximumFractionDigits: 0 }).format(amount)

const MyPayrollView = () => {
  const [data, setData] = useState<PayrollData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/my/payroll')

      if (res.ok) setData(await res.json())
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>

  const entries = data?.payrollHistory ?? []
  const latest = entries[0]

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Mi Nómina'
            subheader='Liquidaciones y compensación'
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}><i className='tabler-receipt' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} /></Avatar>}
          />
        </Card>
      </Grid>

      {/* Latest payslip summary */}
      {latest && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <CardHeader title='Último período' subheader={`${MONTHS[latest.month]} ${latest.year}`} />
            <Divider />
            <CardContent sx={{ display: 'flex', gap: 6 }}>
              <Box>
                <Typography variant='caption' color='text.secondary'>Bruto</Typography>
                <Typography variant='h5'>{fmt(latest.grossTotal, latest.currency)}</Typography>
              </Box>
              <Box>
                <Typography variant='caption' color='text.secondary'>Neto</Typography>
                <Typography variant='h5' color='success.main'>{fmt(latest.netTotal, latest.currency)}</Typography>
              </Box>
              <Box>
                <Typography variant='caption' color='text.secondary'>Moneda</Typography>
                <Typography variant='h5'>{latest.currency}</Typography>
              </Box>
              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                <Button
                  variant='tonal'
                  startIcon={<i className='tabler-file-download' />}
                  onClick={() => window.open(`/api/my/payroll/entries/${latest.entryId}/receipt`, '_blank')}
                >
                  Descargar recibo
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* History */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader title='Historial de liquidaciones' />
          <Divider />
          {entries.length === 0 ? (
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant='h6'>Sin liquidaciones registradas</Typography>
              <Typography variant='body2' color='text.secondary'>Las liquidaciones aparecerán aquí cuando estén disponibles.</Typography>
            </CardContent>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Período</TableCell>
                    <TableCell align='right'>Bruto</TableCell>
                    <TableCell align='right'>Neto</TableCell>
                    <TableCell align='center'>Estado</TableCell>
                    <TableCell align='center'>Recibo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries.map(e => (
                    <TableRow key={e.entryId} hover>
                      <TableCell><Typography variant='body2' fontWeight={600}>{MONTHS[e.month]} {e.year}</Typography></TableCell>
                      <TableCell align='right'>{fmt(e.grossTotal, e.currency)}</TableCell>
                      <TableCell align='right'><Typography fontWeight={600}>{fmt(e.netTotal, e.currency)}</Typography></TableCell>
                      <TableCell align='center'>
                        <CustomChip round='true' size='small' variant='tonal' color={e.status === 'exported' ? 'success' : e.status === 'approved' ? 'primary' : 'secondary'} label={e.status === 'exported' ? 'Exportada' : e.status === 'approved' ? 'Aprobada' : e.status} />
                      </TableCell>
                      <TableCell align='center'>
                        <Button
                          size='small'
                          variant='tonal'
                          startIcon={<i className='tabler-file-download' />}
                          onClick={() => window.open(`/api/my/payroll/entries/${e.entryId}/receipt`, '_blank')}
                        >
                          Descargar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Grid>
    </Grid>
  )
}

export default MyPayrollView
