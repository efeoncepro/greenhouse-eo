'use client'

import { useEffect, useRef, useState } from 'react'

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
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
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

const fmtCLP = (n: number | null | undefined) =>
  n != null
    ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
    : '-'

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
  const [hasApv, setHasApv] = useState(ev?.hasApv ?? false)
  const [apvAmount, setApvAmount] = useState(ev?.apvAmount ?? 0)
  const [effectiveFrom, setEffectiveFrom] = useState(ev?.effectiveFrom ?? new Date().toISOString().slice(0, 10))
  const [changeReason, setChangeReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reverse mode state
  const [reverseMode, setReverseMode] = useState(false)
  const [desiredNet, setDesiredNet] = useState(0)
  const [reverseResult, setReverseResult] = useState<ReverseQuoteResult | null>(null)
  const [reverseLoading, setReverseLoading] = useState(false)
  const reverseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveMode = getCompensationSaveMode({
    existingVersion: ev,
    effectiveFrom
  })

  useEffect(() => {
    if (!open) {
      return
    }

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
    setHasApv(ev?.hasApv ?? false)
    setApvAmount(ev?.apvAmount ?? 0)
    setEffectiveFrom(ev?.effectiveFrom ?? new Date().toISOString().slice(0, 10))
    setChangeReason('')
    setSaving(false)
    setError(null)
    setReverseMode(false)
    setDesiredNet(0)
    setReverseResult(null)
    setReverseLoading(false)
  }, [open, ev, memberId])

  // Debounced reverse calculation
  useEffect(() => {
    if (!reverseMode || desiredNet <= 0 || payRegime !== 'chile') {
      return
    }

    if (reverseTimerRef.current) {
      clearTimeout(reverseTimerRef.current)
    }

    reverseTimerRef.current = setTimeout(async () => {
      setReverseLoading(true)

      try {
        const res = await fetch('/api/hr/payroll/compensation/reverse-quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            desiredNetClp: desiredNet,
            periodDate: effectiveFrom,
            remoteAllowance,
            colacionAmount,
            movilizacionAmount,
            fixedBonusAmount,
            gratificacionLegalMode,
            afpName: afpName || null,
            afpRate,
            healthSystem,
            healthPlanUf: healthSystem === 'isapre' ? healthPlanUf : null,
            contractType,
            hasApv,
            apvAmount: hasApv ? apvAmount : 0,
            unemploymentRate
          })
        })

        if (!res.ok) {
          const errorBody = await res.json().catch(() => null)

          setReverseResult(null)
          setError(errorBody?.error || 'Error al calcular')

          return
        }

        const data: ReverseQuoteResult = await res.json()

        setReverseResult(data)

        if (data.converged) {
          setBaseSalary(data.baseSalary)
          setError(null)
        }
      } catch {
        setReverseResult(null)
      } finally {
        setReverseLoading(false)
      }
    }, 600)

    return () => {
      if (reverseTimerRef.current) {
        clearTimeout(reverseTimerRef.current)
      }
    }
  }, [
    reverseMode, desiredNet, payRegime, effectiveFrom,
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
      setReverseMode(false)
      setReverseResult(null)
    }
  }

  const handleContractChange = (ct: ContractType) => {
    setContractType(ct)
    setUnemploymentRate(ct === 'indefinido' ? 0.006 : 0.03)
  }

  const handleSubmit = async () => {
    if (!changeReason.trim()) {
      setError('El motivo del cambio es obligatorio')

      return
    }

    setSaving(true)
    setError(null)

    try {
      const input: CreateCompensationVersionInput = {
        memberId,
        payRegime,
        currency,
        baseSalary,
        remoteAllowance,
        colacionAmount: payRegime === 'chile' ? colacionAmount : 0,
        movilizacionAmount: payRegime === 'chile' ? movilizacionAmount : 0,
        fixedBonusLabel: fixedBonusLabel.trim() || null,
        fixedBonusAmount,
        gratificacionLegalMode: payRegime === 'chile' ? gratificacionLegalMode : 'ninguna',
        bonusOtdMin: 0,
        bonusOtdMax: bonusOtd,
        bonusRpaMin: 0,
        bonusRpaMax: bonusRpa,
        effectiveFrom,
        changeReason: changeReason.trim(),
        ...(payRegime === 'chile' && {
          afpName: afpName || null,
          afpRate,
          healthSystem,
          healthPlanUf: healthSystem === 'isapre' ? healthPlanUf : null,
          unemploymentRate,
          contractType,
          hasApv,
          apvAmount: hasApv ? apvAmount : 0
        })
      }

      await onSave({
        mode: saveMode,
        input,
        versionId: ev?.versionId
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}
    >
      <Stack sx={{ height: '100%' }}>
        {/* Header */}
        <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ p: 3, pb: 2 }}>
          <Box>
            <Typography variant='h6'>{ev ? 'Editar compensación' : 'Nueva compensación'}</Typography>
            <Typography variant='body2' color='text.secondary'>{memberName}</Typography>
          </Box>
          <IconButton onClick={onClose}>
            <i className='tabler-x' />
          </IconButton>
        </Stack>

        <Divider />

        {/* Form */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          <Stack spacing={3}>
            {/* Régimen */}
            <Typography variant='subtitle2' color='text.secondary'>Régimen y salario</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth size='small'>
                  <InputLabel>Régimen</InputLabel>
                  <Select value={payRegime} label='Régimen' onChange={e => handleRegimeChange(e.target.value as PayRegime)}>
                    <MenuItem value='chile'>Chile (CLP)</MenuItem>
                    <MenuItem value='international'>Internacional (USD)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Salario base'
                  type='number'
                  value={baseSalary}
                  onChange={e => setBaseSalary(Number(e.target.value))}
                  disabled={reverseMode}
                  helperText={reverseMode ? 'Calculado desde líquido' : undefined}
                />
              </Grid>
            </Grid>

            {/* Reverse mode toggle — Chile only */}
            {payRegime === 'chile' && (
              <>
                <FormControlLabel
                  control={
                    <Switch
                      checked={reverseMode}
                      onChange={e => {
                        setReverseMode(e.target.checked)

                        if (!e.target.checked) {
                          setReverseResult(null)
                        }
                      }}
                      data-testid='reverse-mode-toggle'
                    />
                  }
                  label='Calcular desde líquido'
                />
                {reverseMode && (
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='Líquido deseado (CLP)'
                    type='number'
                    value={desiredNet || ''}
                    onChange={e => setDesiredNet(Number(e.target.value))}
                    helperText='Neto antes de deducciones voluntarias (Isapre, APV)'
                    data-testid='desired-net-input'
                    slotProps={{
                      input: {
                        endAdornment: reverseLoading ? <CircularProgress size={18} /> : null
                      }
                    }}
                  />
                )}

                {/* Reverse preview */}
                {reverseMode && reverseResult && reverseResult.converged && (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                    data-testid='reverse-preview'
                  >
                    <Typography variant='subtitle2' sx={{ mb: 1 }}>Desglose estimado</Typography>
                    <Stack spacing={0.5}>
                      <Row label='Sueldo base' value={fmtCLP(reverseResult.baseSalary)} bold />
                      {reverseResult.forward.chileGratificacionLegalAmount != null && reverseResult.forward.chileGratificacionLegalAmount > 0 && (
                        <Row label='Gratificación legal' value={fmtCLP(reverseResult.forward.chileGratificacionLegalAmount)} />
                      )}
                      <Row label='Total haberes' value={fmtCLP(reverseResult.forward.grossTotal)} />
                      <Divider sx={{ my: 0.5 }} />
                      <Row label='AFP' value={fmtCLP(reverseResult.forward.chileAfpAmount)} negative />
                      <Row label='Salud' value={fmtCLP(reverseResult.forward.chileHealthAmount)} negative />
                      <Row label='Cesantía' value={fmtCLP(reverseResult.forward.chileUnemploymentAmount)} negative />
                      {reverseResult.taxAmountClp > 0 && (
                        <Row label='Impuesto' value={fmtCLP(reverseResult.taxAmountClp)} negative />
                      )}
                      {reverseResult.forward.chileApvAmount != null && reverseResult.forward.chileApvAmount > 0 && (
                        <Row label='APV' value={fmtCLP(reverseResult.forward.chileApvAmount)} negative />
                      )}
                      <Row label='Total descuentos' value={fmtCLP(reverseResult.forward.chileTotalDeductions)} negative />
                      <Divider sx={{ my: 0.5 }} />
                      <Row label='Líquido deseado' value={fmtCLP(reverseResult.netTotalWithTax)} bold />
                      {reverseResult.isapreExcess != null && reverseResult.isapreExcess > 0 && (
                        <>
                          <Row label='Excedente Isapre' value={fmtCLP(reverseResult.isapreExcess)} negative />
                          <Row label='Líquido a pagar' value={fmtCLP(reverseResult.netAfterIsapre)} bold />
                        </>
                      )}
                      {reverseResult.employerTotalCost != null && reverseResult.employerTotalCost > 0 && (
                        <Row label='Costo empleador' value={fmtCLP(reverseResult.employerTotalCost)} muted />
                      )}
                    </Stack>
                  </Box>
                )}

                {reverseMode && reverseResult && !reverseResult.converged && (
                  <Alert severity='warning' variant='outlined'>
                    No se pudo converger a una solución exacta. Diferencia: {fmtCLP(reverseResult.netDifferenceCLP)}
                  </Alert>
                )}

                {reverseMode && reverseResult && reverseResult.clampedAtFloor && (
                  <Alert severity='info' variant='outlined'>
                    El sueldo base se ajustó al Ingreso Mínimo Mensual ({fmtCLP(reverseResult.immValue)}). El líquido mínimo con esta configuración es {fmtCLP(reverseResult.netTotalWithTax)}.
                  </Alert>
                )}
              </>
            )}

            <CustomTextField
              fullWidth
              size='small'
              label='Bono conectividad'
              type='number'
              value={remoteAllowance}
              onChange={e => setRemoteAllowance(Number(e.target.value))}
              helperText='Monto fijo mensual (ej. $50 USD)'
            />

            {payRegime === 'chile' && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='Colación'
                    type='number'
                    value={colacionAmount}
                    onChange={e => setColacionAmount(Number(e.target.value))}
                    helperText='Haber no imponible mensual'
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='Movilización'
                    type='number'
                    value={movilizacionAmount}
                    onChange={e => setMovilizacionAmount(Number(e.target.value))}
                    helperText='Haber no imponible mensual'
                  />
                </Grid>
              </Grid>
            )}

            <Grid container spacing={2}>
              <Grid size={{ xs: 7 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Nombre bono fijo'
                  value={fixedBonusLabel}
                  onChange={e => setFixedBonusLabel(e.target.value)}
                  helperText='Opcional. Ej. Bono responsabilidad'
                />
              </Grid>
              <Grid size={{ xs: 5 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Monto bono fijo'
                  type='number'
                  value={fixedBonusAmount}
                  onChange={e => setFixedBonusAmount(Number(e.target.value))}
                  helperText='Monto fijo mensual recurrente'
                />
              </Grid>
            </Grid>

            {payRegime === 'chile' && (
              <FormControl fullWidth size='small'>
                <InputLabel>Gratificación legal</InputLabel>
                <Select
                  value={gratificacionLegalMode}
                  label='Gratificación legal'
                  onChange={e => setGratificacionLegalMode(e.target.value as GratificacionLegalMode)}
                >
                  <MenuItem value='mensual_25pct'>Mensual 25%</MenuItem>
                  <MenuItem value='anual_proporcional'>Anual proporcional</MenuItem>
                  <MenuItem value='ninguna'>No aplica</MenuItem>
                </Select>
              </FormControl>
            )}

            {/* Bonos */}
            <Divider />
            <Typography variant='subtitle2' color='text.secondary'>Bonos variables</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <CustomTextField fullWidth size='small' label='Bono On-Time' type='number' value={bonusOtd} onChange={e => setBonusOtd(Number(e.target.value))} helperText='Monto al 100% de cumplimiento' />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <CustomTextField fullWidth size='small' label='Bono RpA' type='number' value={bonusRpa} onChange={e => setBonusRpa(Number(e.target.value))} helperText='Monto al 100% de cumplimiento' />
              </Grid>
            </Grid>

            {/* Chile */}
            {payRegime === 'chile' && (
              <>
                <Divider />
                <Typography variant='subtitle2' color='text.secondary'>Previsión Chile</Typography>
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
                      <Select value={contractType} label='Contrato' onChange={e => handleContractChange(e.target.value as ContractType)}>
                        <MenuItem value='indefinido'>Indefinido</MenuItem>
                        <MenuItem value='plazo_fijo'>Plazo fijo</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <CustomTextField fullWidth size='small' label='Tasa cesantía' type='number' value={unemploymentRate} onChange={e => setUnemploymentRate(Number(e.target.value))} inputProps={{ step: 0.001 }} disabled />
                  </Grid>
                </Grid>
                <FormControlLabel
                  control={<Switch checked={hasApv} onChange={e => setHasApv(e.target.checked)} />}
                  label='APV'
                />
                {hasApv && (
                  <CustomTextField fullWidth size='small' label='Monto APV' type='number' value={apvAmount} onChange={e => setApvAmount(Number(e.target.value))} />
                )}
              </>
            )}

            {/* Vigencia */}
            <Divider />
            <Typography variant='subtitle2' color='text.secondary'>Vigencia</Typography>
            <CustomTextField
              fullWidth
              size='small'
              label='Vigente desde'
              type='date'
              value={effectiveFrom}
              onChange={e => setEffectiveFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              helperText={
                ev
                  ? saveMode === 'update'
                    ? 'Si mantienes esta fecha, actualizarás la compensación vigente.'
                    : 'Si cambias la fecha, se creará una nueva versión desde esa vigencia.'
                  : undefined
              }
            />

            {/* Motivo */}
            <CustomTextField
              fullWidth
              size='small'
              label='Motivo del cambio *'
              multiline
              rows={2}
              value={changeReason}
              onChange={e => setChangeReason(e.target.value)}
              error={error === 'El motivo del cambio es obligatorio'}
              helperText={error === 'El motivo del cambio es obligatorio' ? error : undefined}
            />

            {error && error !== 'El motivo del cambio es obligatorio' && (
              <Typography variant='body2' color='error.main'>{error}</Typography>
            )}
          </Stack>
        </Box>

        {/* Actions */}
        <Divider />
        <Stack direction='row' spacing={2} sx={{ p: 3 }}>
          <Button variant='contained' fullWidth onClick={handleSubmit} disabled={saving}>
            {saving
              ? 'Guardando...'
              : ev
                ? saveMode === 'update'
                  ? 'Guardar cambios'
                  : 'Crear nueva versión'
                : 'Crear compensación'}
          </Button>
          <Button variant='tonal' color='secondary' fullWidth onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  )
}

const Row = ({ label, value, bold, negative, muted }: {
  label: string
  value: string
  bold?: boolean
  negative?: boolean
  muted?: boolean
}) => (
  <Stack direction='row' justifyContent='space-between'>
    <Typography
      variant='body2'
      color={muted ? 'text.disabled' : 'text.secondary'}
      fontWeight={bold ? 600 : 400}
    >
      {label}
    </Typography>
    <Typography
      variant='body2'
      fontWeight={bold ? 600 : 400}
      color={negative ? 'error.main' : muted ? 'text.disabled' : 'text.primary'}
    >
      {negative && value !== '-' ? `−${value.replace('-', '')}` : value}
    </Typography>
  </Stack>
)

export default CompensationDrawer
