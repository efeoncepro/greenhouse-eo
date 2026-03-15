'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'

import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import CustomTabList from '@core/components/mui/TabList'
import CustomTextField from '@core/components/mui/TextField'

import { HorizontalWithSubtitle } from '@/components/card-statistics'
import type { CompensationVersion, PayrollCompensationMember, PayrollEntry, PayrollPeriod } from '@/types/payroll'
import PayrollCompensationTab from './PayrollCompensationTab'
import PayrollHistoryTab from './PayrollHistoryTab'
import PayrollPeriodTab from './PayrollPeriodTab'
import { formatCurrency, formatPeriodLabel, periodStatusConfig } from './helpers'

const PayrollDashboard = () => {
  const [tab, setTab] = useState('period')
  const [, startTransition] = useTransition()

  // Data
  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod | null>(null)
  const [entries, setEntries] = useState<PayrollEntry[]>([])
  const [compensations, setCompensations] = useState<CompensationVersion[]>([])
  const [eligibleMembers, setEligibleMembers] = useState<PayrollCompensationMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // New period dialog
  const [newPeriodOpen, setNewPeriodOpen] = useState(false)
  const [newYear, setNewYear] = useState(new Date().getFullYear())
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1)
  const [newUf, setNewUf] = useState<number | ''>('')

  const fetchAll = useCallback(async () => {
    try {
      const [periodsRes, compRes] = await Promise.all([
        fetch('/api/hr/payroll/periods'),
        fetch('/api/hr/payroll/compensation')
      ])

      if (periodsRes.ok) {
        const data = await periodsRes.json()

        setPeriods(data.periods || [])

        // Auto-select the most recent non-exported period, or the first one
        const active = (data.periods || []).find(
          (p: PayrollPeriod) => p.status !== 'exported'
        ) || (data.periods || [])[0] || null

        if (active) {
          setCurrentPeriod(active)
          const entriesRes = await fetch(`/api/hr/payroll/periods/${active.periodId}/entries`)

          if (entriesRes.ok) {
            const eData = await entriesRes.json()

            setEntries(eData.entries || [])
          }
        }
      }

      if (compRes.ok) {
        const data = await compRes.json()

        setCompensations(data.compensations || [])
        setEligibleMembers(data.eligibleMembers || [])
      }
    } catch (err: any) {
      setError(err.message || 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleRefresh = useCallback(() => {
    startTransition(() => {
      fetchAll()
    })
  }, [fetchAll])

  const handleCreatePeriod = useCallback(async () => {
    const res = await fetch('/api/hr/payroll/periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year: newYear,
        month: newMonth,
        ...(newUf !== '' && { ufValue: newUf })
      })
    })

    if (!res.ok) {
      const data = await res.json()

      setError(data.error || 'Error al crear período')

      return
    }

    setNewPeriodOpen(false)
    setNewUf('')
    handleRefresh()
  }, [newYear, newMonth, newUf, handleRefresh])

  const handleSelectHistoryPeriod = useCallback(
    async (periodId: string) => {
      const period = periods.find(p => p.periodId === periodId)

      if (!period) return
      setCurrentPeriod(period)

      const entriesRes = await fetch(`/api/hr/payroll/periods/${periodId}/entries`)

      if (entriesRes.ok) {
        const data = await entriesRes.json()

        setEntries(data.entries || [])
      }

      setTab('period')
    },
    [periods]
  )

  if (loading) {
    return (
      <Stack spacing={6}>
        <Skeleton variant='rounded' height={48} />
        <Grid container spacing={6}>
          {[0, 1, 2, 3].map(i => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant='rounded' height={120} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant='rounded' height={400} />
      </Stack>
    )
  }

  // Stats
  const totalGross = entries.reduce((s, e) => s + e.grossTotal, 0)
  const totalNet = entries.reduce((s, e) => s + e.netTotal, 0)
  const statusConfig = currentPeriod ? periodStatusConfig[currentPeriod.status] : null
  const primaryCurrency = entries[0]?.currency ?? 'CLP'

  return (
    <>
      <Stack spacing={6}>
        {/* Header */}
        <Stack direction='row' justifyContent='space-between' alignItems='flex-start'>
          <Box>
            <Typography variant='h4'>Nómina</Typography>
            <Typography variant='body2' color='text.secondary'>
              Gestión de compensaciones y cálculo de nómina mensual
            </Typography>
          </Box>
          <Button
            variant='contained'
            startIcon={<i className='tabler-plus' />}
            onClick={() => setNewPeriodOpen(true)}
          >
            Nuevo período
          </Button>
        </Stack>

        {error && (
          <Alert severity='error' onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* KPI Stats Row */}
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Período actual'
              stats={currentPeriod ? formatPeriodLabel(currentPeriod.year, currentPeriod.month) : '—'}
              avatarIcon='tabler-calendar'
              avatarColor='primary'
              subtitle={statusConfig?.label ?? 'Sin período'}
              statusLabel={statusConfig?.label}
              statusColor={statusConfig?.color}
              statusIcon={statusConfig?.icon}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Colaboradores'
              stats={String(entries.length)}
              avatarIcon='tabler-users'
              avatarColor='info'
              subtitle='Con nómina en este período'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Costo bruto'
              stats={formatCurrency(totalGross, primaryCurrency)}
              avatarIcon='tabler-currency-dollar'
              avatarColor='warning'
              subtitle='Total bruto del período'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Neto total'
              stats={formatCurrency(totalNet, primaryCurrency)}
              avatarIcon='tabler-wallet'
              avatarColor='success'
              subtitle='Total neto a pagar'
            />
          </Grid>
        </Grid>

        {/* Tabs */}
        <TabContext value={tab}>
          <CustomTabList onChange={(_, v) => setTab(v)} variant='scrollable'>
            <Tab
              value='period'
              label='Período actual'
              icon={<i className='tabler-receipt-2' />}
              iconPosition='start'
            />
            <Tab
              value='compensation'
              label='Compensaciones'
              icon={<i className='tabler-adjustments-dollar' />}
              iconPosition='start'
            />
            <Tab
              value='history'
              label='Historial'
              icon={<i className='tabler-history' />}
              iconPosition='start'
            />
          </CustomTabList>

          <TabPanel value='period' sx={{ p: 0 }}>
            <PayrollPeriodTab
              period={currentPeriod}
              entries={entries}
              onRefresh={handleRefresh}
            />
          </TabPanel>

          <TabPanel value='compensation' sx={{ p: 0 }}>
            <PayrollCompensationTab
              compensations={compensations}
              eligibleMembers={eligibleMembers}
              onRefresh={handleRefresh}
            />
          </TabPanel>

          <TabPanel value='history' sx={{ p: 0 }}>
            <PayrollHistoryTab
              periods={periods}
              onSelectPeriod={handleSelectHistoryPeriod}
            />
          </TabPanel>
        </TabContext>
      </Stack>

      {/* New Period Dialog */}
      <Dialog
        open={newPeriodOpen}
        onClose={() => setNewPeriodOpen(false)}
        maxWidth='xs'
        fullWidth
        closeAfterTransition={false}
      >
        <DialogTitle>Nuevo período de nómina</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Año'
                  type='number'
                  value={newYear}
                  onChange={e => setNewYear(Number(e.target.value))}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Mes'
                  type='number'
                  value={newMonth}
                  onChange={e => setNewMonth(Number(e.target.value))}
                  inputProps={{ min: 1, max: 12 }}
                />
              </Grid>
            </Grid>
            <CustomTextField
              fullWidth
              size='small'
              label='Valor UF (opcional)'
              type='number'
              value={newUf}
              onChange={e => setNewUf(e.target.value === '' ? '' : Number(e.target.value))}
              helperText='Necesario para calcular Isapre. Puede ingresarse después.'
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' onClick={() => setNewPeriodOpen(false)}>
            Cancelar
          </Button>
          <Button variant='contained' onClick={handleCreatePeriod}>
            Crear
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default PayrollDashboard
