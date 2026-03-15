'use client'

import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
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

import type { CompensationVersion, CreateCompensationVersionInput, PayRegime, HealthSystem, ContractType } from '@/types/payroll'

type Props = {
  open: boolean
  onClose: () => void
  existingVersion: CompensationVersion | null
  memberId: string
  memberName: string
  onSave: (input: CreateCompensationVersionInput) => Promise<void>
}

const CompensationDrawer = ({ open, onClose, existingVersion, memberId, memberName, onSave }: Props) => {
  const ev = existingVersion

  const [payRegime, setPayRegime] = useState<PayRegime>(ev?.payRegime ?? 'chile')
  const [currency, setCurrency] = useState(ev?.currency ?? 'CLP')
  const [baseSalary, setBaseSalary] = useState(ev?.baseSalary ?? 0)
  const [remoteAllowance, setRemoteAllowance] = useState(ev?.remoteAllowance ?? 0)
  const [bonusOtdMin, setBonusOtdMin] = useState(ev?.bonusOtdMin ?? 0)
  const [bonusOtdMax, setBonusOtdMax] = useState(ev?.bonusOtdMax ?? 0)
  const [bonusRpaMin, setBonusRpaMin] = useState(ev?.bonusRpaMin ?? 0)
  const [bonusRpaMax, setBonusRpaMax] = useState(ev?.bonusRpaMax ?? 0)
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

  useEffect(() => {
    if (!open) {
      return
    }

    setPayRegime(ev?.payRegime ?? 'chile')
    setCurrency(ev?.currency ?? 'CLP')
    setBaseSalary(ev?.baseSalary ?? 0)
    setRemoteAllowance(ev?.remoteAllowance ?? 0)
    setBonusOtdMin(ev?.bonusOtdMin ?? 0)
    setBonusOtdMax(ev?.bonusOtdMax ?? 0)
    setBonusRpaMin(ev?.bonusRpaMin ?? 0)
    setBonusRpaMax(ev?.bonusRpaMax ?? 0)
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
  }, [open, ev, memberId])

  const handleRegimeChange = (regime: PayRegime) => {
    setPayRegime(regime)
    setCurrency(regime === 'chile' ? 'CLP' : 'USD')

    if (regime === 'chile') {
      setUnemploymentRate(contractType === 'indefinido' ? 0.006 : 0.03)
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
        bonusOtdMin,
        bonusOtdMax,
        bonusRpaMin,
        bonusRpaMax,
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

      await onSave(input)
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
                />
              </Grid>
            </Grid>

            <CustomTextField
              fullWidth
              size='small'
              label='Asignación teletrabajo'
              type='number'
              value={remoteAllowance}
              onChange={e => setRemoteAllowance(Number(e.target.value))}
            />

            {/* Bonos */}
            <Divider />
            <Typography variant='subtitle2' color='text.secondary'>Bonos variables</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <CustomTextField fullWidth size='small' label='Bono OTD mín' type='number' value={bonusOtdMin} onChange={e => setBonusOtdMin(Number(e.target.value))} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <CustomTextField fullWidth size='small' label='Bono OTD máx' type='number' value={bonusOtdMax} onChange={e => setBonusOtdMax(Number(e.target.value))} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <CustomTextField fullWidth size='small' label='Bono RpA mín' type='number' value={bonusRpaMin} onChange={e => setBonusRpaMin(Number(e.target.value))} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <CustomTextField fullWidth size='small' label='Bono RpA máx' type='number' value={bonusRpaMax} onChange={e => setBonusRpaMax(Number(e.target.value))} />
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
            {saving ? 'Guardando...' : ev ? 'Crear nueva versión' : 'Crear compensación'}
          </Button>
          <Button variant='tonal' color='secondary' fullWidth onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  )
}

export default CompensationDrawer
