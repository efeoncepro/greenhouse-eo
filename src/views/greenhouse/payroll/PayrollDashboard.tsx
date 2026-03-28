'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'

import Link from 'next/link'

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
import { getCurrentPayrollPeriod, getNextPayrollPeriodSuggestion } from '@/lib/payroll/current-payroll-period'
import type { CompensationVersion, PayrollCompensationMember, PayrollEntry, PayrollPeriod } from '@/types/payroll'
import PayrollCompensationTab from './PayrollCompensationTab'
import PayrollHistoryTab from './PayrollHistoryTab'
import PayrollPeriodTab from './PayrollPeriodTab'
import PayrollPersonnelExpenseTab from './PayrollPersonnelExpenseTab'
import { buildPayrollCurrencySummary, formatPeriodLabel, periodStatusConfig } from './helpers'

const PayrollDashboard = () => {
  const [tab, setTab] = useState('period')
  const [, startTransition] = useTransition()

  // Data
  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [activePeriod, setActivePeriod] = useState<PayrollPeriod | null>(null)
  const [activeEntries, setActiveEntries] = useState<PayrollEntry[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [selectedEntries, setSelectedEntries] = useState<PayrollEntry[]>([])
  const selectedPeriodIdRef = useRef<string | null>(null)
  const [compensations, setCompensations] = useState<CompensationVersion[]>([])
  const [eligibleMembers, setEligibleMembers] = useState<PayrollCompensationMember[]>([])
  const [compensationMembers, setCompensationMembers] = useState<PayrollCompensationMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // New period dialog
  const [newPeriodOpen, setNewPeriodOpen] = useState(false)
  const [newYear, setNewYear] = useState(new Date().getFullYear())
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1)
  const [newTaxTableVersion, setNewTaxTableVersion] = useState('')

  const createPeriodSuggestion = getNextPayrollPeriodSuggestion(periods)
  const createPeriodLabel = formatPeriodLabel(createPeriodSuggestion.year, createPeriodSuggestion.month)

  const openNewPeriodDialog = useCallback(() => {
    const suggestion = getNextPayrollPeriodSuggestion(periods)

    setNewYear(suggestion.year)
    setNewMonth(suggestion.month)
    setNewPeriodOpen(true)
  }, [periods])

  const fetchAll = useCallback(async () => {
    try {
      const [periodsRes, compRes] = await Promise.all([
        fetch('/api/hr/payroll/periods'),
        fetch('/api/hr/payroll/compensation')
      ])

      const nextErrors: string[] = []

      if (periodsRes.ok) {
        const data = await periodsRes.json()

        const nextPeriods = data.periods || []

        setPeriods(nextPeriods)

        // Auto-select only the latest chronological period if it is still open
        const active = getCurrentPayrollPeriod(nextPeriods)

        const currentSelectedPeriodId = selectedPeriodIdRef.current

        const nextSelectedPeriodId =
          currentSelectedPeriodId && nextPeriods.some((period: PayrollPeriod) => period.periodId === currentSelectedPeriodId)
            ? currentSelectedPeriodId
            : active?.periodId ?? null

        setActivePeriod(active)
        setSelectedPeriodId(nextSelectedPeriodId)

        if (active) {
          const entriesRes = await fetch(`/api/hr/payroll/periods/${active.periodId}/entries`)

          if (entriesRes.ok) {
            const eData = await entriesRes.json()

            setActiveEntries(eData.entries || [])

            if (nextSelectedPeriodId === active.periodId) {
              setSelectedEntries(eData.entries || [])
            }
          }
        } else {
          setActiveEntries([])
          setSelectedEntries([])
        }
      } else {
        const data = await periodsRes.json().catch(() => null)

        nextErrors.push(data?.error || 'No fue posible cargar los períodos de nómina.')
      }

      if (compRes.ok) {
        const data = await compRes.json()

        setCompensations(data.compensations || [])
        setEligibleMembers(data.eligibleMembers || [])
        setCompensationMembers(data.members || [])
      } else {
        const data = await compRes.json().catch(() => null)

        setCompensations([])
        setEligibleMembers([])
        setCompensationMembers([])
        nextErrors.push(data?.error || 'No fue posible cargar las compensaciones de nómina.')
      }

      setError(nextErrors.length > 0 ? nextErrors.join(' ') : null)
    } catch (err: any) {
      setError(err.message || 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  useEffect(() => {
    selectedPeriodIdRef.current = selectedPeriodId
  }, [selectedPeriodId])

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
        taxTableVersion: newTaxTableVersion || null
      })
    })

    if (!res.ok) {
      const data = await res.json()

      setError(data.error || 'Error al crear período')

      return
    }

    setNewTaxTableVersion('')
    setNewPeriodOpen(false)
    handleRefresh()
  }, [newYear, newMonth, newTaxTableVersion, handleRefresh])

  const handleSelectHistoryPeriod = useCallback(
    async (periodId: string) => {
      const period = periods.find(p => p.periodId === periodId)

      if (!period) return
      setSelectedPeriodId(periodId)

      const entriesRes = await fetch(`/api/hr/payroll/periods/${periodId}/entries`)

      if (entriesRes.ok) {
        const data = await entriesRes.json()

        setSelectedEntries(data.entries || [])
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
  const statusConfig = activePeriod ? periodStatusConfig[activePeriod.status] : null
  const needsCompensationSetup = compensations.length === 0
  const hasActivePayrollMembers = compensationMembers.length > 0
  const grossSummary = buildPayrollCurrencySummary(activeEntries, entry => entry.grossTotal)
  const netSummary = buildPayrollCurrencySummary(activeEntries, entry => entry.netTotal)

  const selectedPeriod = selectedPeriodId ? periods.find(period => period.periodId === selectedPeriodId) ?? null : null
  const displayedPeriod = selectedPeriod ?? activePeriod
  const displayedEntries = selectedPeriod?.periodId === activePeriod?.periodId ? activeEntries : selectedEntries
  const isHistoricalSelection = Boolean(displayedPeriod && activePeriod && displayedPeriod.periodId !== activePeriod.periodId)

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
            onClick={openNewPeriodDialog}
          >
            Nuevo período
          </Button>
        </Stack>

        {error && (
          <Alert severity='error' onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {needsCompensationSetup && (
          <Alert
            severity={hasActivePayrollMembers ? 'info' : 'warning'}
            action={
              hasActivePayrollMembers ? (
                <Button color='inherit' size='small' onClick={() => setTab('compensation')}>
                  Configurar salarios
                </Button>
              ) : (
                <Button component={Link} href='/admin/team' color='inherit' size='small'>
                  Gestionar equipo
                </Button>
              )
            }
          >
            {hasActivePayrollMembers
              ? 'Antes de calcular nómina, configura salario base, previsión y bonos desde la pestaña Compensaciones.'
              : 'No hay colaboradores activos disponibles para nómina. Primero debes habilitarlos desde Admin > Equipo.'}
          </Alert>
        )}

        {/* KPI Stats Row */}
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Período actual'
              stats={activePeriod ? formatPeriodLabel(activePeriod.year, activePeriod.month) : '—'}
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
              stats={String(activeEntries.length)}
              avatarIcon='tabler-users'
              avatarColor='info'
              subtitle='Con nómina en este período'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Costo bruto'
              stats={grossSummary.hasMixedCurrency ? 'Mixto' : grossSummary.summaryLabel}
              avatarIcon='tabler-currency-dollar'
              avatarColor='warning'
              subtitle={grossSummary.hasMixedCurrency ? grossSummary.summaryLabel : 'Total bruto del período'}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Neto total'
              stats={netSummary.hasMixedCurrency ? 'Mixto' : netSummary.summaryLabel}
              avatarIcon='tabler-wallet'
              avatarColor='success'
              subtitle={netSummary.hasMixedCurrency ? netSummary.summaryLabel : 'Total neto a pagar'}
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
            <Tab
              value='expense'
              label='Gasto de personal'
              icon={<i className='tabler-report-money' />}
              iconPosition='start'
            />
          </CustomTabList>

          <TabPanel value='period' sx={{ p: 0 }}>
            <PayrollPeriodTab
              period={displayedPeriod}
              entries={displayedEntries}
              onRefresh={handleRefresh}
              onCreatePeriod={openNewPeriodDialog}
              createPeriodLabel={createPeriodLabel}
              isHistoricalSelection={isHistoricalSelection}
            />
          </TabPanel>

          <TabPanel value='compensation' sx={{ p: 0 }}>
            <PayrollCompensationTab
              compensations={compensations}
              eligibleMembers={eligibleMembers}
              members={compensationMembers}
              onRefresh={handleRefresh}
            />
          </TabPanel>

          <TabPanel value='history' sx={{ p: 0 }}>
            <PayrollHistoryTab
              periods={periods}
              selectedPeriodId={selectedPeriodId}
              onSelectPeriod={handleSelectHistoryPeriod}
            />
          </TabPanel>

          <TabPanel value='expense' sx={{ p: 0 }}>
            <PayrollPersonnelExpenseTab />
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
              label='Tabla impuesto Chile'
              placeholder='SII-2026-03'
              value={newTaxTableVersion}
              onChange={e => setNewTaxTableVersion(e.target.value)}
              helperText='Requerida si el período incluye colaboradores Chile.'
            />
            <Alert severity='info'>
              La UF del período se sincroniza automáticamente según el mes imputable. Si el período incluye Chile, define también la tabla tributaria antes de calcular. El salario base, AFP, salud y bonos se configuran en Compensaciones.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant='tonal'
            color='secondary'
            onClick={() => {
              setNewTaxTableVersion('')
              setNewPeriodOpen(false)
            }}
          >
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
