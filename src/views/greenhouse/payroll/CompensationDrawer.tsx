'use client'

import { useEffect, useRef, useState } from 'react'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
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
  p: 2,
  borderRadius: 1.5,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper'
} as const

const accordionSx = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: '8px !important',
  '&::before': { display: 'none' }
} as const

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

  const [reverseMode, setReverseMode] = useState(false)
  const [desiredNet, setDesiredNet] = useState(0)
  const [reverseResult, setReverseResult] = useState<ReverseQuoteResult | null>(null)
  const [reverseLoading, setReverseLoading] = useState(false)
  const reverseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isChile = payRegime === 'chile'
  const isChileReverse = reverseMode && isChile

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

  useEffect(() => {
    if (!reverseMode || desiredNet <= 0 || !isChile) return

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
    reverseMode, desiredNet, isChile, effectiveFrom,
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
      const resolvedChangeReason = reverseMode && desiredNet > 0 && !changeReason.includes('líquido')
        ? `${changeReason.trim()} [Calculado desde líquido deseado: $${desiredNet.toLocaleString('es-CL')}]`
        : changeReason.trim()

      const input: CreateCompensationVersionInput = {
        memberId, payRegime, currency, baseSalary,
        desiredNetClp: reverseMode && desiredNet > 0 ? desiredNet : null,
        remoteAllowance,
        colacionAmount: isChile ? colacionAmount : 0,
        movilizacionAmount: isChile ? movilizacionAmount : 0,
        fixedBonusLabel: fixedBonusLabel.trim() || null,
        fixedBonusAmount,
        gratificacionLegalMode: isChile ? gratificacionLegalMode : 'ninguna',
        bonusOtdMin: 0, bonusOtdMax: bonusOtd,
        bonusRpaMin: 0, bonusRpaMax: bonusRpa,
        effectiveFrom, changeReason: resolvedChangeReason,
        ...(isChile && {
          afpName: afpName || null, afpRate, healthSystem,
          healthPlanUf: healthSystem === 'isapre' ? healthPlanUf : null,
          unemploymentRate, contractType, hasApv,
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
  const previewReady = isChileReverse && r && r.converged

  const previsionSummary = [
    afpName ? `AFP ${afpName}` : null,
    healthSystem === 'isapre' ? 'Isapre' : 'Fonasa',
    contractType === 'indefinido' ? 'Indefinido' : 'Plazo fijo'
  ].filter(Boolean).join(' · ')

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 440 } } }}
    >
      <Stack sx={{ height: '100%' }}>
        {/* Header */}
        <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ p: 3, pb: 2 }}>
          <Box>
            <Typography variant='h6' fontWeight={600}>
              {ev ? 'Editar compensación' : 'Nueva compensación'}
            </Typography>
            <Typography variant='body2' color='text.secondary'>{memberName}</Typography>
          </Box>
          <IconButton onClick={onClose} size='small'>
            <i className='tabler-x' />
          </IconButton>
        </Stack>

        <Divider />

        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          <Stack spacing={2.5}>

            {/* ── Section: Régimen y salario ── */}
            <Box sx={sectionSx}>
              <Typography variant='overline' color='text.secondary' fontSize={10}>Régimen y salario</Typography>
              <Stack spacing={2} sx={{ mt: 1 }}>
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
                    {isChileReverse ? (
                      <Box>
                        <Typography variant='caption' color='text.secondary'>Base calculado</Typography>
                        <Stack direction='row' alignItems='center' spacing={0.5}>
                          <Typography fontWeight={700} fontFamily='monospace' fontSize={15}>{fmt(baseSalary)}</Typography>
                          <Chip label='Reverse' size='small' color='primary' variant='tonal' sx={{ height: 18, fontSize: 10 }} />
                        </Stack>
                      </Box>
                    ) : (
                      <CustomTextField fullWidth size='small' label='Salario base' type='number' value={baseSalary || ''} onChange={e => setBaseSalary(Number(e.target.value))} />
                    )}
                  </Grid>
                </Grid>

                {isChile && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={reverseMode}
                        size='small'
                        onChange={e => {
                          setReverseMode(e.target.checked)

                          if (!e.target.checked) { setReverseResult(null); setDesiredNet(0) }
                        }}
                        data-testid='reverse-mode-toggle'
                      />
                    }
                    label={<Typography variant='body2' fontWeight={500}>Calcular desde líquido</Typography>}
                    sx={{ ml: 0, mt: -0.5 }}
                  />
                )}

                {isChileReverse && (
                  <CustomTextField
                    fullWidth size='small'
                    label='Líquido deseado (CLP)'
                    type='number'
                    value={desiredNet || ''}
                    onChange={e => setDesiredNet(Number(e.target.value))}
                    helperText='Neto contractual antes de Isapre y APV'
                    data-testid='desired-net-input'
                    slotProps={{ input: { endAdornment: reverseLoading ? <CircularProgress size={18} /> : null } }}
                  />
                )}
              </Stack>
            </Box>

            {/* ── Reverse preview ── */}
            {previewReady && (
              <Box data-testid='reverse-preview' sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ px: 2, py: 1.5, bgcolor: 'action.hover' }}>
                  <Typography variant='overline' color='text.secondary' fontSize={10}>Haberes</Typography>
                  <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                    <Row label='Sueldo base' amount={r.baseSalary} bold />
                    {r.forward.chileGratificacionLegalAmount != null && r.forward.chileGratificacionLegalAmount > 0 && (
                      <Row label='Gratificación legal' amount={r.forward.chileGratificacionLegalAmount} />
                    )}
                    {colacionAmount > 0 && <Row label='Colación' amount={colacionAmount} />}
                    {movilizacionAmount > 0 && <Row label='Movilización' amount={movilizacionAmount} />}
                    <Row label='Total haberes' amount={r.forward.grossTotal} bold />
                  </Stack>
                </Box>
                <Box sx={{ px: 2, py: 1.5, bgcolor: 'error.lighter', borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant='overline' color='text.secondary' fontSize={10}>Descuentos legales</Typography>
                  <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                    <Row label='AFP' amount={r.forward.chileAfpAmount} negative />
                    <Row label='Salud (7%)' amount={r.forward.chileHealthAmount} negative />
                    <Row label='Cesantía' amount={r.forward.chileUnemploymentAmount} negative />
                    {r.taxAmountClp > 0 && <Row label='Impuesto' amount={r.taxAmountClp} negative />}
                    <Row label='Total descuentos' amount={r.forward.chileTotalDeductions} negative bold />
                  </Stack>
                </Box>
                <Box sx={{ px: 2, py: 1.5, bgcolor: 'primary.lighter', borderTop: '1px solid', borderColor: 'divider' }}>
                  <Stack spacing={0.25}>
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
                  <Box sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Row label='Costo empleador' amount={r.employerTotalCost} muted />
                  </Box>
                )}
              </Box>
            )}

            {isChileReverse && r && !r.converged && (
              <Alert severity='warning' variant='outlined' sx={{ py: 0.5 }}>No convergió. Diferencia: {fmt(r.netDifferenceCLP)}</Alert>
            )}

            {isChileReverse && r && r.clampedAtFloor && (
              <Alert severity='info' variant='outlined' sx={{ py: 0.5 }}>Base ajustada al IMM ({fmt(r.immValue)}). Líquido mínimo: {fmt(r.netTotalWithTax)}.</Alert>
            )}

            {/* ── Section: Haberes no imponibles (Chile) ── */}
            {isChile && (
              <Box sx={sectionSx}>
                <Typography variant='overline' color='text.secondary' fontSize={10}>Haberes no imponibles</Typography>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid size={{ xs: 6 }}>
                    <CustomTextField fullWidth size='small' label='Colación' type='number' value={colacionAmount || ''} onChange={e => setColacionAmount(Number(e.target.value))} />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <CustomTextField fullWidth size='small' label='Movilización' type='number' value={movilizacionAmount || ''} onChange={e => setMovilizacionAmount(Number(e.target.value))} />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* ── Section: Bonos y haberes adicionales ── */}
            <Box sx={sectionSx}>
              <Typography variant='overline' color='text.secondary' fontSize={10}>Bonos y haberes</Typography>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <CustomTextField fullWidth size='small' label='Bono conectividad' type='number' value={remoteAllowance || ''} onChange={e => setRemoteAllowance(Number(e.target.value))} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 7 }}>
                    <CustomTextField fullWidth size='small' label='Nombre bono fijo' value={fixedBonusLabel} onChange={e => setFixedBonusLabel(e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 5 }}>
                    <CustomTextField fullWidth size='small' label='Monto' type='number' value={fixedBonusAmount || ''} onChange={e => setFixedBonusAmount(Number(e.target.value))} />
                  </Grid>
                </Grid>

                {isChile && (
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
                    <CustomTextField fullWidth size='small' label='Bono OTD' type='number' value={bonusOtd || ''} onChange={e => setBonusOtd(Number(e.target.value))} />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <CustomTextField fullWidth size='small' label='Bono RpA' type='number' value={bonusRpa || ''} onChange={e => setBonusRpa(Number(e.target.value))} />
                  </Grid>
                </Grid>
              </Stack>
            </Box>

            {/* ── Section: Previsión Chile (accordion, collapsed by default) ── */}
            {isChile && (
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
                          <Select value={contractType} label='Contrato' onChange={e => handleContractChange(e.target.value as ContractType)}>
                            <MenuItem value='indefinido'>Indefinido</MenuItem>
                            <MenuItem value='plazo_fijo'>Plazo fijo</MenuItem>
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
                      <CustomTextField fullWidth size='small' label='Monto APV' type='number' value={apvAmount || ''} onChange={e => setApvAmount(Number(e.target.value))} />
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )}

            {/* ── Section: Vigencia ── */}
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

            {error && error !== 'El motivo del cambio es obligatorio' && (
              <Typography variant='body2' color='error.main'>{error}</Typography>
            )}
          </Stack>
        </Box>

        {/* Actions */}
        <Divider />
        <Stack direction='row' spacing={2} sx={{ p: 3 }}>
          <Button variant='contained' fullWidth onClick={handleSubmit} disabled={saving}>
            {saving ? 'Guardando...' : ev ? (saveMode === 'update' ? 'Guardar cambios' : 'Crear nueva versión') : 'Crear compensación'}
          </Button>
          <Button variant='tonal' color='secondary' fullWidth onClick={onClose} disabled={saving}>Cancelar</Button>
        </Stack>
      </Stack>
    </Drawer>
  )
}

/* ---------- Row ---------- */

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
