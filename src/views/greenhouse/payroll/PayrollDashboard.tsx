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
import {
  getActivePayrollPeriods,
  getNextPayrollPeriodSuggestion,
  type ActivePayrollPeriodEntry
} from '@/lib/payroll/current-payroll-period'
import { buildPayrollTaxTableVersion } from '@/lib/payroll/tax-table-version-format'
import type { CompensationVersion, PayrollCompensationMember, PayrollEntry, PayrollPeriod } from '@/types/payroll'
import PayrollCompensationTab from './PayrollCompensationTab'
import PayrollHistoryTab from './PayrollHistoryTab'
import PayrollPeriodTab from './PayrollPeriodTab'
import PayrollPersonnelExpenseTab from './PayrollPersonnelExpenseTab'
import { buildPayrollCurrencySummary, formatCurrency, formatPeriodLabel, periodStatusConfig } from './helpers'

const PayrollDashboard = () => {
  const [tab, setTab] = useState('period')
  const [, startTransition] = useTransition()

  // Data
  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [activePeriod, setActivePeriod] = useState<PayrollPeriod | null>(null)
  const [activePayrollEntries, setActivePayrollEntries] = useState<ActivePayrollPeriodEntry[]>([])
  const [activeEntries, setActiveEntries] = useState<PayrollEntry[]>([])

  const [currencyEquivalents, setCurrencyEquivalents] = useState<{
    clpEquivalent: { grossClp: number; netClp: number; fxRate: number } | null
    usdEquivalent: { grossUsd: number; netUsd: number; fxRate: number } | null
  }>({ clpEquivalent: null, usdEquivalent: null })

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
  const expectedTaxTableVersion = buildPayrollTaxTableVersion(newYear, newMonth)

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

        // TASK-409 — multi-period awareness. Compute all periods that
        // demand attention (reopened, current operational month, approved
        // pending export, future drafts) and use the top-priority entry
        // as the default active selection. The full list is surfaced in
        // the UI as secondary cards when more than one period is active.
        const activeEntries = getActivePayrollPeriods(nextPeriods)
        const active = activeEntries[0]?.period ?? null

        const currentSelectedPeriodId = selectedPeriodIdRef.current

        const nextSelectedPeriodId =
          currentSelectedPeriodId && nextPeriods.some((period: PayrollPeriod) => period.periodId === currentSelectedPeriodId)
            ? currentSelectedPeriodId
            : active?.periodId ?? null

        setActivePayrollEntries(activeEntries)
        setActivePeriod(active)
        setSelectedPeriodId(nextSelectedPeriodId)

        // Fetch entries for the period to display in KPIs: active period, or last period as fallback
        const kpiTargetPeriod = active ?? (nextPeriods.length > 0
          ? nextPeriods.reduce((latest: PayrollPeriod, p: PayrollPeriod) => (p.periodId > latest.periodId ? p : latest), nextPeriods[0])
          : null)

        if (kpiTargetPeriod) {
          const entriesRes = await fetch(`/api/hr/payroll/periods/${kpiTargetPeriod.periodId}/entries`)

          if (entriesRes.ok) {
            const eData = await entriesRes.json()

            setActiveEntries(eData.entries || [])
            setCurrencyEquivalents({
              clpEquivalent: eData.summary?.clpEquivalent ?? null,
              usdEquivalent: eData.summary?.usdEquivalent ?? null
            })

            if (nextSelectedPeriodId === kpiTargetPeriod.periodId) {
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
        month: newMonth
      })
    })

    if (!res.ok) {
      const data = await res.json()

      setError(data.error || 'Error al crear período')

      return
    }

    setNewPeriodOpen(false)
    handleRefresh()
  }, [newYear, newMonth, handleRefresh])

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

  // Stats — show active period, or last period as fallback for KPI context
  const lastPeriod = periods.length > 0
    ? periods.reduce((latest, p) => (p.periodId > latest.periodId ? p : latest), periods[0])
    : null

  const kpiPeriod = activePeriod ?? lastPeriod
  const kpiEntries = activeEntries
  const isKpiFallback = !activePeriod && lastPeriod !== null
  const statusConfig = kpiPeriod ? periodStatusConfig[kpiPeriod.status] : null
  const needsCompensationSetup = compensations.length === 0
  const hasActivePayrollMembers = compensationMembers.length > 0
  const grossSummary = buildPayrollCurrencySummary(kpiEntries, entry => entry.grossTotal)
  const netSummary = buildPayrollCurrencySummary(kpiEntries, entry => entry.netTotal)

  // TASK-409 — multi-period awareness. When more than one period is active
  // (e.g. Marzo reopened + Abril draft), surface a secondary entries list
  // so the operator can jump between them without the "Historial" tab. The
  // primary period (index 0) is already rendered in the main area.
  const secondaryActivePeriods = activePayrollEntries.slice(1)

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

        {/* TASK-409 — multi-period awareness banner. Renders only when more
            than one period is in an active state simultaneously (e.g. a
            prior month reopened for reliquidación while the current
            operational month is in draft). Lets the operator jump between
            them without leaving the "Período actual" tab. */}
        {secondaryActivePeriods.length > 0 && (
          <Alert
            severity='info'
            action={
              <Stack direction='row' spacing={1}>
                {secondaryActivePeriods.map(entry => (
                  <Button
                    key={entry.period.periodId}
                    color='inherit'
                    size='small'
                    variant='outlined'
                    onClick={() => {
                      setSelectedPeriodId(entry.period.periodId)
                      setTab('period')
                    }}
                  >
                    {formatPeriodLabel(entry.period.year, entry.period.month)}
                  </Button>
                ))}
              </Stack>
            }
          >
            Hay {activePayrollEntries.length} períodos de nómina que requieren atención. El más urgente se muestra debajo.
          </Alert>
        )}

        {/* KPI Stats Row */}
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title={isKpiFallback ? 'Último período' : 'Período actual'}
              stats={kpiPeriod ? formatPeriodLabel(kpiPeriod.year, kpiPeriod.month) : '—'}
              avatarIcon='tabler-calendar'
              avatarColor={isKpiFallback ? 'secondary' : 'primary'}
              subtitle={isKpiFallback ? 'No hay período abierto' : (statusConfig?.label ?? 'Sin período')}
              statusLabel={statusConfig?.label}
              statusColor={statusConfig?.color}
              statusIcon={statusConfig?.icon}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Colaboradores'
              stats={String(kpiEntries.length)}
              avatarIcon='tabler-users'
              avatarColor='info'
              subtitle={isKpiFallback ? `Último: ${kpiPeriod ? formatPeriodLabel(kpiPeriod.year, kpiPeriod.month) : '—'}` : 'Con nómina en este período'}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Costo bruto'
              stats={
                currencyEquivalents.clpEquivalent
                  ? formatCurrency(currencyEquivalents.clpEquivalent.grossClp, 'CLP')
                  : grossSummary.summaryLabel
              }
              avatarIcon='tabler-currency-dollar'
              avatarColor='warning'
              subtitle={
                currencyEquivalents.usdEquivalent
                  ? `USD ${formatCurrency(currencyEquivalents.usdEquivalent.grossUsd, 'USD')}`
                  : 'Total bruto del período'
              }
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Neto total'
              stats={
                currencyEquivalents.clpEquivalent
                  ? formatCurrency(currencyEquivalents.clpEquivalent.netClp, 'CLP')
                  : netSummary.summaryLabel
              }
              avatarIcon='tabler-wallet'
              avatarColor='success'
              subtitle={
                currencyEquivalents.usdEquivalent
                  ? `USD ${formatCurrency(currencyEquivalents.usdEquivalent.netUsd, 'USD')}`
                  : 'Total neto a pagar'
              }
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
              currencyEquivalents={!isHistoricalSelection ? currencyEquivalents : undefined}
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
              label='Versión tributaria Chile esperada'
              value={expectedTaxTableVersion}
              slotProps={{
                input: {
                  readOnly: true
                }
              }}
              helperText='Greenhouse intenta resolverla automáticamente al crear el período si ya existe una tabla tributaria sincronizada para ese mes.'
            />
            <Alert severity='info'>
              La UF del período se sincroniza automáticamente según el mes imputable. Si este período incluye Chile, Greenhouse usará la tabla tributaria sincronizada del mes cuando esté disponible. Si aún falta sincronización, podrás crear el borrador igual y el sistema te avisará antes de calcular.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant='tonal'
            color='secondary'
            onClick={() => {
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
