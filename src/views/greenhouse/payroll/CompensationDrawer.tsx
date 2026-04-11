'use client'

import { useEffect, useRef, useState } from 'react'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

import type {
  CompensationVersion,
  CreateCompensationVersionInput,
  PayRegime,
  HealthSystem,
  ContractType,
  GratificacionLegalMode
} from '@/types/payroll'
import { getCompensationSaveMode } from '@/lib/payroll/compensation-versioning'
import { CONTRACT_DERIVATIONS, CONTRACT_LABELS, contractAllowsRemoteAllowance } from '@/types/hr-contracts'

export type CompensationSavePayload = {
  mode: 'create' | 'update'
  input: CreateCompensationVersionInput
  versionId?: string
}

type ReverseQuoteResult = {
  converged: boolean
  baseSalary: number
  netTotalWithTax: number
  netDifferenceCLP: number
  taxAmountClp: number
  employerTotalCost: number | null
  isapreExcess: number | null
  netAfterIsapre: number | null
  clampedAtFloor: boolean
  immValue: number | null
  resolvedAfpRate: number | null
  forward: {
    grossTotal: number
    chileGratificacionLegalAmount: number | null
    chileAfpAmount: number | null
    chileHealthAmount: number | null
    chileUnemploymentAmount: number | null
    chileApvAmount: number | null
    chileTotalDeductions: number | null
  }
}

const fmt = (n: number | null | undefined) =>
  n != null
    ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
    : '-'

const sectionSx = {
  p: 2, borderRadius: 1.5,
  border: '1px solid', borderColor: 'divider',
  bgcolor: 'background.paper'
} as const

const accordionSx = {
  border: '1px solid', borderColor: 'divider',
  borderRadius: '8px !important',
  '&::before': { display: 'none' }
} as const

const clpAdornment = <InputAdornment position='start'>$</InputAdornment>

type Props = {
  open: boolean
  onClose: () => void
  existingVersion: CompensationVersion | null
  memberId: string
  memberName: string
  onSave: (payload: CompensationSavePayload) => Promise<void>
}

const CompensationDrawer = ({ open, onClose, existingVersion, memberId, memberName, onSave }: Props) => {
  const ev = existingVersion

  const [payRegime, setPayRegime] = useState<PayRegime>(ev?.payRegime ?? 'chile')
  const [currency, setCurrency] = useState(ev?.currency ?? 'CLP')
  const [baseSalary, setBaseSalary] = useState(ev?.baseSalary ?? 0)
  const [remoteAllowance, setRemoteAllowance] = useState(ev?.remoteAllowance ?? 0)
  const [colacionAmount, setColacionAmount] = useState(ev?.colacionAmount ?? 0)
  const [movilizacionAmount, setMovilizacionAmount] = useState(ev?.movilizacionAmount ?? 0)
  const [fixedBonusLabel, setFixedBonusLabel] = useState(ev?.fixedBonusLabel ?? '')
  const [fixedBonusAmount, setFixedBonusAmount] = useState(ev?.fixedBonusAmount ?? 0)

  const [gratificacionLegalMode, setGratificacionLegalMode] = useState<GratificacionLegalMode>(
    ev?.gratificacionLegalMode ?? (ev?.payRegime === 'chile' ? 'mensual_25pct' : 'ninguna')
  )

  const [bonusOtd, setBonusOtd] = useState(ev?.bonusOtdMax ?? 0)
  const [bonusRpa, setBonusRpa] = useState(ev?.bonusRpaMax ?? 0)
  const [afpName, setAfpName] = useState(ev?.afpName ?? '')
  const [afpRate, setAfpRate] = useState(ev?.afpRate ?? 0.1144)
  const [healthSystem, setHealthSystem] = useState<HealthSystem>(ev?.healthSystem ?? 'fonasa')
  const [healthPlanUf, setHealthPlanUf] = useState(ev?.healthPlanUf ?? 0)
  const [unemploymentRate, setUnemploymentRate] = useState(ev?.unemploymentRate ?? 0.006)
  const [contractType, setContractType] = useState<ContractType>(ev?.contractType ?? 'indefinido')
  const [deelContractId, setDeelContractId] = useState(ev?.deelContractId ?? '')
  const [hasApv, setHasApv] = useState(ev?.hasApv ?? false)
  const [apvAmount, setApvAmount] = useState(ev?.apvAmount ?? 0)
  const [effectiveFrom, setEffectiveFrom] = useState(ev?.effectiveFrom ?? new Date().toISOString().slice(0, 10))
  const [changeReason, setChangeReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [desiredNet, setDesiredNet] = useState(0)
  const [reverseResult, setReverseResult] = useState<ReverseQuoteResult | null>(null)
  const [reverseLoading, setReverseLoading] = useState(false)
  const reverseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const payrollVia = CONTRACT_DERIVATIONS[contractType].payrollVia
  const isChile = payRegime === 'chile'
  const isChileEmployee = payRegime === 'chile' && contractType !== 'honorarios'
  const isHonorarios = contractType === 'honorarios'
  const isDeel = payrollVia === 'deel'
  const supportsRemoteAllowance = contractAllowsRemoteAllowance(contractType)
  const saveMode = getCompensationSaveMode({ existingVersion: ev, effectiveFrom })

  useEffect(() => {
    if (!open) return

    setPayRegime(ev?.payRegime ?? 'chile')
    setCurrency(ev?.currency ?? 'CLP')
    setBaseSalary(ev?.baseSalary ?? 0)
    setRemoteAllowance(ev?.remoteAllowance ?? 0)
    setColacionAmount(ev?.colacionAmount ?? 0)
    setMovilizacionAmount(ev?.movilizacionAmount ?? 0)
    setFixedBonusLabel(ev?.fixedBonusLabel ?? '')
    setFixedBonusAmount(ev?.fixedBonusAmount ?? 0)
    setGratificacionLegalMode(ev?.gratificacionLegalMode ?? (ev?.payRegime === 'chile' ? 'mensual_25pct' : 'ninguna'))
    setBonusOtd(ev?.bonusOtdMax ?? 0)
    setBonusRpa(ev?.bonusRpaMax ?? 0)
    setAfpName(ev?.afpName ?? '')
    setAfpRate(ev?.afpRate ?? 0.1144)
    setHealthSystem(ev?.healthSystem ?? 'fonasa')
    setHealthPlanUf(ev?.healthPlanUf ?? 0)
    setUnemploymentRate(ev?.unemploymentRate ?? 0.006)
    setContractType(ev?.contractType ?? 'indefinido')
    setDeelContractId(ev?.deelContractId ?? '')
    setHasApv(ev?.hasApv ?? false)
    setApvAmount(ev?.apvAmount ?? 0)
    setEffectiveFrom(ev?.effectiveFrom ?? new Date().toISOString().slice(0, 10))
    setChangeReason('')
    setSaving(false)
    setError(null)
    setDesiredNet(ev?.desiredNetClp ?? 0)
    setReverseResult(null)
    setReverseLoading(false)
  }, [open, ev, memberId])

  useEffect(() => {
    if (!isChileEmployee || desiredNet <= 0) return

    if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current)

    reverseTimerRef.current = setTimeout(async () => {
      setReverseLoading(true)

      try {
        const res = await fetch('/api/hr/payroll/compensation/reverse-quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            desiredNetClp: desiredNet, periodDate: effectiveFrom,
            remoteAllowance, colacionAmount, movilizacionAmount, fixedBonusAmount,
            gratificacionLegalMode, afpName: afpName || null, afpRate,
            healthSystem, healthPlanUf: healthSystem === 'isapre' ? healthPlanUf : null,
            contractType, hasApv, apvAmount: hasApv ? apvAmount : 0, unemploymentRate
          })
        })

        if (!res.ok) {
          setReverseResult(null)
          setError((await res.json().catch(() => null))?.error || 'Error al calcular')

          return
        }

        const data: ReverseQuoteResult = await res.json()

        setReverseResult(data)

        if (data.converged) {
          setBaseSalary(data.baseSalary)
          setError(null)

          if (data.resolvedAfpRate != null && data.resolvedAfpRate > 0) setAfpRate(data.resolvedAfpRate)
        }
      } catch {
        setReverseResult(null)
      } finally {
        setReverseLoading(false)
      }
    }, 600)

    return () => { if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current) }
  }, [
    isChileEmployee, desiredNet, effectiveFrom,
    remoteAllowance, colacionAmount, movilizacionAmount, fixedBonusAmount,
    gratificacionLegalMode, afpName, afpRate,
    healthSystem, healthPlanUf, contractType,
    hasApv, apvAmount, unemploymentRate
  ])

  const handleRegimeChange = (regime: PayRegime) => {
    setPayRegime(regime)
    setCurrency(regime === 'chile' ? 'CLP' : 'USD')

    if (regime === 'chile') {
      setUnemploymentRate(contractType === 'indefinido' ? 0.006 : 0.03)
      setGratificacionLegalMode(ev?.gratificacionLegalMode ?? 'mensual_25pct')
    } else {
      setGratificacionLegalMode('ninguna')
      setReverseResult(null)
      setDesiredNet(0)
    }
  }

  const handleContractChange = (ct: ContractType) => {
    setContractType(ct)
    const derivation = CONTRACT_DERIVATIONS[ct]

    setPayRegime(derivation.payRegime)
    setCurrency(derivation.payRegime === 'chile' ? 'CLP' : 'USD')
    setDesiredNet(0)
    setReverseResult(null)

    if (ct === 'indefinido') {
      setUnemploymentRate(0.006)
      setGratificacionLegalMode('mensual_25pct')
    } else if (ct === 'plazo_fijo') {
      setUnemploymentRate(0.03)
      setGratificacionLegalMode('mensual_25pct')
    } else {
      setUnemploymentRate(0)
      setGratificacionLegalMode('ninguna')
      setColacionAmount(0)
      setMovilizacionAmount(0)
      setHasApv(false)
      setApvAmount(0)
    }

    if (!contractAllowsRemoteAllowance(ct)) {
      setRemoteAllowance(0)
    }
  }

  const handleSubmit = async () => {
    if (!changeReason.trim()) {
      setError('El motivo del cambio es obligatorio')

      return
    }

    setSaving(true)
    setError(null)

    try {
      const resolvedChangeReason = isChileEmployee && desiredNet > 0 && !changeReason.includes('líquido')
        ? `${changeReason.trim()} [Líquido deseado: $${desiredNet.toLocaleString('es-CL')}]`
        : changeReason.trim()

      const input: CreateCompensationVersionInput = {
        memberId, payRegime, currency, baseSalary,
        desiredNetClp: isChileEmployee && desiredNet > 0 ? desiredNet : null,
        remoteAllowance: supportsRemoteAllowance ? remoteAllowance : 0,
        colacionAmount: isChileEmployee ? colacionAmount : 0,
        movilizacionAmount: isChileEmployee ? movilizacionAmount : 0,
        fixedBonusLabel: fixedBonusLabel.trim() || null, fixedBonusAmount,
        gratificacionLegalMode: isChileEmployee ? gratificacionLegalMode : 'ninguna',
        bonusOtdMin: 0, bonusOtdMax: bonusOtd,
        bonusRpaMin: 0, bonusRpaMax: bonusRpa,
        contractType,
        deelContractId: isDeel ? deelContractId.trim() || null : null,
        effectiveFrom, changeReason: resolvedChangeReason,
        ...(isChileEmployee && {
          afpName: afpName || null, afpRate, healthSystem,
          healthPlanUf: healthSystem === 'isapre' ? healthPlanUf : null,
          unemploymentRate, hasApv,
          apvAmount: hasApv ? apvAmount : 0
        })
      }

      await onSave({ mode: saveMode, input, versionId: ev?.versionId })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const r = reverseResult
  const previewReady = isChileEmployee && r && r.converged

  const previsionSummary = [
    afpName ? `AFP ${afpName}` : null,
    healthSystem === 'isapre' ? 'Isapre' : 'Fonasa',
    CONTRACT_LABELS[contractType].label
  ].filter(Boolean).join(' · ')

  return (
    <Drawer anchor='right' open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 440 } } }}>
      <Stack sx={{ height: '100%' }}>
        {/* Header */}
        <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ p: 3, pb: 2 }}>
          <Box>
            <Typography variant='h6' fontWeight={600}>{ev ? 'Editar compensación' : 'Nueva compensación'}</Typography>
            <Typography variant='body2' color='text.secondary'>{memberName}</Typography>
          </Box>
          <IconButton onClick={onClose} size='small' aria-label='Cerrar'>
            <i className='tabler-x' />
          </IconButton>
        </Stack>
        <Divider />

        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          <Stack spacing={2.5}>

            <FormControl fullWidth size='small'>
              <InputLabel>Contrato</InputLabel>
              <Select value={contractType} label='Contrato' onChange={e => handleContractChange(e.target.value as ContractType)}>
                <MenuItem value='indefinido'>Indefinido</MenuItem>
                <MenuItem value='plazo_fijo'>Plazo fijo</MenuItem>
                <MenuItem value='honorarios'>Honorarios</MenuItem>
                <MenuItem value='contractor'>Contractor (Deel)</MenuItem>
                <MenuItem value='eor'>EOR (Deel)</MenuItem>
              </Select>
            </FormControl>

            {/* ── Régimen ── */}
            <FormControl fullWidth size='small'>
              <InputLabel>Régimen</InputLabel>
              <Select value={payRegime} label='Régimen' onChange={e => handleRegimeChange(e.target.value as PayRegime)} disabled>
                <MenuItem value='chile'>Chile (CLP)</MenuItem>
                <MenuItem value='international'>Internacional (USD)</MenuItem>
              </Select>
            </FormControl>

            {isDeel && (
              <CustomTextField
                fullWidth
                size='small'
                label='Contrato Deel'
                value={deelContractId}
                onChange={e => setDeelContractId(e.target.value)}
                helperText='Referencia manual del contrato gestionado en Deel'
              />
            )}

            {/* ── Input: líquido deseado (Chile) or salary base (internacional) ── */}
            {isChileEmployee ? (
              <CustomTextField
                fullWidth size='small'
                label='Líquido deseado (CLP)'
                type='number'
                value={desiredNet || ''}
                onChange={e => setDesiredNet(Number(e.target.value))}
                helperText='Neto contractual antes de Isapre y APV'
                data-testid='desired-net-input'
                slotProps={{
                  input: {
                    startAdornment: clpAdornment,
                    endAdornment: reverseLoading ? <CircularProgress size={18} /> : null
                  }
                }}
              />
            ) : (
              <CustomTextField
                fullWidth size='small' label='Salario base' type='number'
                value={baseSalary || ''} onChange={e => setBaseSalary(Number(e.target.value))}
                slotProps={{ input: { startAdornment: isChile ? clpAdornment : undefined } }}
              />
            )}

            {/* ── Preview (with skeleton while loading) ── */}
            {isChileEmployee && reverseLoading && !previewReady && desiredNet > 0 && (
              <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ p: 2 }}>
                  <Skeleton variant='text' width='40%' height={16} sx={{ mb: 1 }} />
                  <Stack spacing={0.5}>
                    <Skeleton variant='text' width='100%' height={14} />
                    <Skeleton variant='text' width='100%' height={14} />
                    <Skeleton variant='text' width='100%' height={14} />
                    <Skeleton variant='text' width='60%' height={14} />
                  </Stack>
                </Box>
                <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Skeleton variant='text' width='100%' height={14} />
                  <Skeleton variant='text' width='100%' height={14} />
                  <Skeleton variant='text' width='80%' height={14} />
                </Box>
              </Box>
            )}

            {previewReady && (
              <Box data-testid='reverse-preview' sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ px: 2, py: 1.25, bgcolor: 'action.hover' }}>
                  <Typography variant='overline' color='text.secondary' fontSize={10}>Haberes</Typography>
                  <Stack spacing={0.15} sx={{ mt: 0.25 }}>
                    <Row label='Sueldo base' amount={r.baseSalary} bold />
                    {r.forward.chileGratificacionLegalAmount != null && r.forward.chileGratificacionLegalAmount > 0 && (
                      <Row label='Gratificación legal' amount={r.forward.chileGratificacionLegalAmount} />
                    )}
                    {colacionAmount > 0 && <Row label='Colación' amount={colacionAmount} />}
                    {movilizacionAmount > 0 && <Row label='Movilización' amount={movilizacionAmount} />}
                    <Row label='Total haberes' amount={r.forward.grossTotal} bold />
                  </Stack>
                </Box>
                <Box sx={{ px: 2, py: 1.25, bgcolor: 'var(--mui-palette-error-lighterOpacity)', borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant='overline' color='text.secondary' fontSize={10}>Descuentos legales</Typography>
                  <Stack spacing={0.15} sx={{ mt: 0.25 }}>
                    <Row label='AFP' amount={r.forward.chileAfpAmount} negative />
                    <Row label='Salud (7%)' amount={r.forward.chileHealthAmount} negative />
                    <Row label='Cesantía' amount={r.forward.chileUnemploymentAmount} negative />
                    {r.taxAmountClp > 0 && <Row label='Impuesto' amount={r.taxAmountClp} negative />}
                    <Row label='Total descuentos' amount={r.forward.chileTotalDeductions} negative bold />
                  </Stack>
                </Box>
                <Box sx={{ px: 2, py: 1.25, bgcolor: 'var(--mui-palette-primary-lighterOpacity)', borderTop: '1px solid', borderColor: 'divider' }}>
                  <Stack spacing={0.15}>
                    <Row label='Líquido deseado' amount={r.netTotalWithTax} bold primary />
                    {r.isapreExcess != null && r.isapreExcess > 0 && (
                      <>
                        <Row label='Excedente Isapre' amount={r.isapreExcess} negative />
                        <Row label='Líquido a pagar' amount={r.netAfterIsapre} bold />
                      </>
                    )}
                  </Stack>
                </Box>
                {r.employerTotalCost != null && r.employerTotalCost > 0 && (
                  <Box sx={{ px: 2, py: 0.75, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Row label='Costo empleador' amount={r.employerTotalCost} muted />
                  </Box>
                )}
              </Box>
            )}

            {isChileEmployee && r && !r.converged && (
              <Alert severity='warning' variant='outlined' sx={{ py: 0.5 }}>No convergió. Diferencia: {fmt(r.netDifferenceCLP)}</Alert>
            )}
            {isChileEmployee && r && r.clampedAtFloor && (
              <Alert severity='info' variant='outlined' sx={{ py: 0.5 }}>Base ajustada al IMM ({fmt(r.immValue)}). Líquido mínimo: {fmt(r.netTotalWithTax)}.</Alert>
            )}

            {/* ── Haberes no imponibles (Chile) ── */}
            {isChileEmployee && (
              <Box sx={sectionSx}>
                <Typography variant='overline' color='text.secondary' fontSize={10}>Haberes no imponibles</Typography>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid size={{ xs: 6 }}>
                    <CustomTextField fullWidth size='small' label='Colación' type='number' value={colacionAmount || ''} onChange={e => setColacionAmount(Number(e.target.value))} slotProps={{ input: { startAdornment: clpAdornment } }} />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <CustomTextField fullWidth size='small' label='Movilización' type='number' value={movilizacionAmount || ''} onChange={e => setMovilizacionAmount(Number(e.target.value))} slotProps={{ input: { startAdornment: clpAdornment } }} />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* ── Bonos y haberes ── */}
            <Box sx={sectionSx}>
              <Typography variant='overline' color='text.secondary' fontSize={10}>Bonos y haberes</Typography>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {(isHonorarios || isDeel) && (
                  <Alert severity='info' variant='outlined' sx={{ py: 0.5 }}>
                    {isHonorarios
                      ? 'Para honorarios los bonos KPI son discrecionales y parten en $0.'
                      : 'Para Deel Greenhouse registra conectividad y calcula los bonos KPI desde OTD y RpA; Deel sigue gestionando compliance y pago final.'}
                  </Alert>
                )}
                {supportsRemoteAllowance && (
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='Bono conectividad'
                    type='number'
                    value={remoteAllowance || ''}
                    onChange={e => setRemoteAllowance(Number(e.target.value))}
                    helperText={
                      isDeel ? 'Se registra como haber recurrente y se suma al bruto referencial de Greenhouse.' : undefined
                    }
                    slotProps={{ input: { startAdornment: isChile ? clpAdornment : undefined } }}
                  />
                )}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 7 }}>
                    <CustomTextField fullWidth size='small' label='Nombre bono fijo' value={fixedBonusLabel} onChange={e => setFixedBonusLabel(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 5 }}>
                    <CustomTextField fullWidth size='small' label='Monto' type='number' value={fixedBonusAmount || ''} onChange={e => setFixedBonusAmount(Number(e.target.value))} slotProps={{ input: { startAdornment: isChile ? clpAdornment : undefined } }} />
                  </Grid>
                </Grid>
                {isChileEmployee && (
                  <FormControl fullWidth size='small'>
                    <InputLabel>Gratificación legal</InputLabel>
                    <Select value={gratificacionLegalMode} label='Gratificación legal' onChange={e => setGratificacionLegalMode(e.target.value as GratificacionLegalMode)}>
                      <MenuItem value='mensual_25pct'>Mensual 25%</MenuItem>
                      <MenuItem value='anual_proporcional'>Anual proporcional</MenuItem>
                      <MenuItem value='ninguna'>No aplica</MenuItem>
                    </Select>
                  </FormControl>
                )}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <CustomTextField fullWidth size='small' label='Bono OTD' type='number' value={bonusOtd || ''} onChange={e => setBonusOtd(Number(e.target.value))} slotProps={{ input: { startAdornment: isChile ? clpAdornment : undefined } }} />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <CustomTextField fullWidth size='small' label='Bono RpA' type='number' value={bonusRpa || ''} onChange={e => setBonusRpa(Number(e.target.value))} slotProps={{ input: { startAdornment: isChile ? clpAdornment : undefined } }} />
                  </Grid>
                </Grid>
              </Stack>
            </Box>

            {/* ── Previsión Chile (accordion) ── */}
            {isChileEmployee && (
              <Accordion disableGutters elevation={0} sx={accordionSx}>
                <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                  <Stack>
                    <Typography variant='body2' fontWeight={500}>Previsión Chile</Typography>
                    <Typography variant='caption' color='text.secondary'>{previsionSummary}</Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <CustomTextField fullWidth size='small' label='AFP' value={afpName} onChange={e => setAfpName(e.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <CustomTextField fullWidth size='small' label='Tasa AFP' type='number' value={afpRate} onChange={e => setAfpRate(Number(e.target.value))} inputProps={{ step: 0.0001 }} />
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <FormControl fullWidth size='small'>
                          <InputLabel>Salud</InputLabel>
                          <Select value={healthSystem} label='Salud' onChange={e => setHealthSystem(e.target.value as HealthSystem)}>
                            <MenuItem value='fonasa'>Fonasa</MenuItem>
                            <MenuItem value='isapre'>Isapre</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      {healthSystem === 'isapre' && (
                        <Grid size={{ xs: 6 }}>
                          <CustomTextField fullWidth size='small' label='Plan Isapre (UF)' type='number' value={healthPlanUf} onChange={e => setHealthPlanUf(Number(e.target.value))} inputProps={{ step: 0.01 }} />
                        </Grid>
                      )}
                      <Grid size={{ xs: 6 }}>
                        <FormControl fullWidth size='small'>
                          <InputLabel>Contrato</InputLabel>
                          <Select value={contractType} label='Contrato' disabled>
                            <MenuItem value={contractType}>{CONTRACT_LABELS[contractType].label}</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <CustomTextField fullWidth size='small' label='Cesantía' type='number' value={unemploymentRate} inputProps={{ step: 0.001 }} disabled />
                      </Grid>
                    </Grid>
                    <FormControlLabel
                      control={<Switch checked={hasApv} onChange={e => setHasApv(e.target.checked)} size='small' />}
                      label={<Typography variant='body2'>APV</Typography>}
                    />
                    {hasApv && (
                      <CustomTextField fullWidth size='small' label='Monto APV' type='number' value={apvAmount || ''} onChange={e => setApvAmount(Number(e.target.value))} slotProps={{ input: { startAdornment: clpAdornment } }} />
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )}

            {/* ── Vigencia ── */}
            <Box sx={sectionSx}>
              <Typography variant='overline' color='text.secondary' fontSize={10}>Vigencia</Typography>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <CustomTextField
                  fullWidth size='small' label='Vigente desde' type='date'
                  value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  helperText={ev ? (saveMode === 'update' ? 'Misma fecha = actualiza vigente' : 'Nueva fecha = nueva versión') : undefined}
                />
                <CustomTextField
                  fullWidth size='small' label='Motivo del cambio *' multiline rows={2}
                  value={changeReason} onChange={e => setChangeReason(e.target.value)}
                  error={error === 'El motivo del cambio es obligatorio'}
                  helperText={error === 'El motivo del cambio es obligatorio' ? error : undefined}
                />
              </Stack>
            </Box>

          </Stack>
        </Box>

        {/* Actions */}
        <Divider />
        <Stack spacing={1.5} sx={{ p: 3 }}>
          {error && (
            <Alert severity='error' variant='outlined' sx={{ py: 0.5 }}>{error}</Alert>
          )}
          <Stack direction='row' spacing={2}>
            <Button variant='contained' fullWidth onClick={handleSubmit} disabled={saving}>
              {saving ? 'Guardando...' : ev ? (saveMode === 'update' ? 'Guardar cambios' : 'Crear nueva versión') : 'Crear compensación'}
            </Button>
            <Button variant='tonal' color='secondary' fullWidth onClick={onClose} disabled={saving}>Cancelar</Button>
          </Stack>
        </Stack>
      </Stack>
    </Drawer>
  )
}

const Row = ({ label, amount, bold, negative, primary, muted }: {
  label: string
  amount: number | null | undefined
  bold?: boolean
  negative?: boolean
  primary?: boolean
  muted?: boolean
}) => (
  <Stack direction='row' justifyContent='space-between' alignItems='baseline'>
    <Typography variant='body2' color={muted ? 'text.disabled' : 'text.secondary'} fontWeight={bold ? 600 : 400} fontSize={13}>
      {label}
    </Typography>
    <Typography fontFamily='monospace' fontSize={13} fontWeight={bold ? 700 : 500} color={primary ? 'primary.main' : negative ? 'error.main' : muted ? 'text.disabled' : 'text.primary'}>
      {negative && amount != null && amount > 0 ? `−${fmt(amount)}` : fmt(amount)}
    </Typography>
  </Stack>
)

export default CompensationDrawer
