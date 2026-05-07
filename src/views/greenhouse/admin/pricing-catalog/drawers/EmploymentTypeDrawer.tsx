'use client'

import { useEffect, useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomTextField from '@core/components/mui/TextField'

const GREENHOUSE_COPY = getMicrocopy()

// ── Types ──────────────────────────────────────────────────────────────

export interface EmploymentTypeFormValues {
  employmentTypeCode: string
  labelEs: string
  labelEn: string | null
  paymentCurrency: string
  countryCode: string
  appliesPrevisional: boolean
  previsionalPctDefault: number | null
  feeMonthlyUsdDefault: number
  feePctDefault: number | null
  appliesBonuses: boolean
  sourceOfTruth: string
  active: boolean
  notes: string | null
}

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  initial?: EmploymentTypeFormValues | null
  onClose: () => void
  onSuccess?: () => void
}

const CURRENCY_OPTIONS = ['USD', 'CLP', 'CLF', 'COP', 'MXN', 'PEN'] as const

const KNOWN_SOURCES = [
  { value: 'greenhouse_payroll_chile_rates', label: 'Greenhouse Payroll (Chile)' },
  { value: 'manual', label: 'Manual' },
  { value: 'deel', label: 'Deel' },
  { value: 'eor', label: 'EOR' }
] as const

const SOURCE_OTHER = '__other__'

const emptyForm: EmploymentTypeFormValues = {
  employmentTypeCode: '',
  labelEs: '',
  labelEn: null,
  paymentCurrency: 'USD',
  countryCode: '',
  appliesPrevisional: false,
  previsionalPctDefault: null,
  feeMonthlyUsdDefault: 0,
  feePctDefault: null,
  appliesBonuses: false,
  sourceOfTruth: 'manual',
  active: true,
  notes: null
}

// ── Component ──────────────────────────────────────────────────────────

const EmploymentTypeDrawer = ({ open, mode, initial, onClose, onSuccess }: Props) => {
  const [employmentTypeCode, setEmploymentTypeCode] = useState('')
  const [labelEs, setLabelEs] = useState('')
  const [labelEn, setLabelEn] = useState('')
  const [paymentCurrency, setPaymentCurrency] = useState<string>('USD')
  const [countryCode, setCountryCode] = useState('')
  const [appliesPrevisional, setAppliesPrevisional] = useState(false)
  const [previsionalPctDefault, setPrevisionalPctDefault] = useState('')
  const [feeMonthlyUsdDefault, setFeeMonthlyUsdDefault] = useState('')
  const [feePctDefault, setFeePctDefault] = useState('')
  const [appliesBonuses, setAppliesBonuses] = useState(false)
  const [sourceSelect, setSourceSelect] = useState<string>('manual')
  const [sourceCustom, setSourceCustom] = useState('')
  const [active, setActive] = useState(true)
  const [notes, setNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = (values: EmploymentTypeFormValues) => {
    setEmploymentTypeCode(values.employmentTypeCode ?? '')
    setLabelEs(values.labelEs ?? '')
    setLabelEn(values.labelEn ?? '')
    setPaymentCurrency(values.paymentCurrency || 'USD')
    setCountryCode(values.countryCode ?? '')
    setAppliesPrevisional(Boolean(values.appliesPrevisional))
    setPrevisionalPctDefault(
      values.previsionalPctDefault !== null && values.previsionalPctDefault !== undefined
        ? String(values.previsionalPctDefault)
        : ''
    )
    setFeeMonthlyUsdDefault(
      values.feeMonthlyUsdDefault !== null && values.feeMonthlyUsdDefault !== undefined
        ? String(values.feeMonthlyUsdDefault)
        : ''
    )
    setFeePctDefault(
      values.feePctDefault !== null && values.feePctDefault !== undefined
        ? String(values.feePctDefault)
        : ''
    )
    setAppliesBonuses(Boolean(values.appliesBonuses))

    const knownSource = KNOWN_SOURCES.find(s => s.value === values.sourceOfTruth)

    if (knownSource) {
      setSourceSelect(values.sourceOfTruth)
      setSourceCustom('')
    } else if (values.sourceOfTruth) {
      setSourceSelect(SOURCE_OTHER)
      setSourceCustom(values.sourceOfTruth)
    } else {
      setSourceSelect('manual')
      setSourceCustom('')
    }

    setActive(values.active !== false)
    setNotes(values.notes ?? '')
    setError(null)
  }

  useEffect(() => {
    if (open) {
      resetForm(initial ?? emptyForm)
    }
  }, [open, initial])

  const handleClose = () => {
    if (saving) return
    onClose()
  }

  const resolvedSource = sourceSelect === SOURCE_OTHER ? sourceCustom.trim() : sourceSelect

  const handleSubmit = async () => {
    setError(null)

    if (!employmentTypeCode.trim()) {
      setError('Ingresa un código para la modalidad.')

      return
    }

    if (!labelEs.trim()) {
      setError('Ingresa un nombre en español.')

      return
    }

    if (!countryCode.trim()) {
      setError('Ingresa el código de país (ej. CL, CO, MX).')

      return
    }

    if (!resolvedSource) {
      setError('Selecciona una fuente de verdad o especifica una.')

      return
    }

    const payload: Record<string, unknown> = {
      employmentTypeCode: employmentTypeCode.trim(),
      labelEs: labelEs.trim(),
      labelEn: labelEn.trim() || null,
      paymentCurrency,
      countryCode: countryCode.trim().toUpperCase(),
      appliesPrevisional,
      previsionalPctDefault:
        appliesPrevisional && previsionalPctDefault ? Number(previsionalPctDefault) : null,
      feeMonthlyUsdDefault: feeMonthlyUsdDefault ? Number(feeMonthlyUsdDefault) : 0,
      feePctDefault: feePctDefault ? Number(feePctDefault) : null,
      appliesBonuses,
      sourceOfTruth: resolvedSource,
      active,
      notes: notes.trim() || null
    }

    setSaving(true)

    try {
      const res = await fetch('/api/admin/pricing-catalog/governance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'employment_type', payload })
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))

        setError(body.error || 'No pudimos guardar la modalidad. Revisa los campos e intenta de nuevo.')
        setSaving(false)

        return
      }

      toast.success(
        mode === 'create'
          ? `Modalidad ${employmentTypeCode.trim()} creada`
          : `${labelEs.trim()} actualizada`
      )
      onClose()
      onSuccess?.()
    } catch {
      setError('No se pudo conectar al servidor. Verifica tu conexión.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={handleClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 560 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Typography variant='h6'>
          {mode === 'create' ? 'Nueva modalidad de contrato' : 'Editar modalidad de contrato'}
        </Typography>
        <IconButton onClick={handleClose} size='small' aria-label={GREENHOUSE_COPY.actions.close}>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error && (
          <Alert severity='error' onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Typography variant='body2' color='text.secondary'>
          Las modalidades definen cómo se contrata a las personas asignadas a un rol vendible:
          moneda, reglas previsionales y fees.
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Código'
              value={employmentTypeCode}
              onChange={e => setEmploymentTypeCode(e.target.value)}
              required
              disabled={mode === 'edit'}
              placeholder='ej. chile_indefinido'
              helperText={
                mode === 'edit' ? 'El código no puede modificarse' : 'Usa minúsculas con guiones bajos'
              }
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='País'
              value={countryCode}
              onChange={e => setCountryCode(e.target.value.toUpperCase())}
              required
              placeholder='ej. CL'
              inputProps={{ maxLength: 2, style: { textTransform: 'uppercase' } }}
              helperText='Código ISO de 2 letras'
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Nombre en español'
              value={labelEs}
              onChange={e => setLabelEs(e.target.value)}
              required
              placeholder='ej. Chile — Contrato indefinido'
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Nombre en inglés (opcional)'
              value={labelEn}
              onChange={e => setLabelEn(e.target.value)}
              placeholder='ej. Chile — Permanent employment'
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Moneda de pago'
              value={paymentCurrency}
              onChange={e => setPaymentCurrency(e.target.value)}
              required
            >
              {CURRENCY_OPTIONS.map(c => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Fuente de verdad'
              value={sourceSelect}
              onChange={e => setSourceSelect(e.target.value)}
              required
            >
              {KNOWN_SOURCES.map(s => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
              <MenuItem value={SOURCE_OTHER}>Otra (especificar)</MenuItem>
            </CustomTextField>
          </Grid>

          {sourceSelect === SOURCE_OTHER && (
            <Grid size={{ xs: 12 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='Fuente personalizada'
                value={sourceCustom}
                onChange={e => setSourceCustom(e.target.value)}
                required
                placeholder='ej. integration_x'
              />
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={appliesPrevisional}
                  onChange={(_, checked) => setAppliesPrevisional(checked)}
                />
              }
              label='Aplica cargas previsionales'
            />
          </Grid>

          {appliesPrevisional && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='% previsional por defecto'
                type='number'
                value={previsionalPctDefault}
                onChange={e => setPrevisionalPctDefault(e.target.value)}
                placeholder='ej. 20'
                helperText='Porcentaje aplicado sobre el salario base'
              />
            </Grid>
          )}

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Fee mensual USD (opcional)'
              type='number'
              value={feeMonthlyUsdDefault}
              onChange={e => setFeeMonthlyUsdDefault(e.target.value)}
              placeholder='ej. 599'
              helperText='Fee plano por mes (Deel, EOR, etc.)'
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Fee % (opcional)'
              type='number'
              value={feePctDefault}
              onChange={e => setFeePctDefault(e.target.value)}
              placeholder='ej. 8'
              helperText='Fee porcentual sobre el salario'
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={appliesBonuses}
                  onChange={(_, checked) => setAppliesBonuses(checked)}
                />
              }
              label='Aplica bonos (JIT, RPA, AR, sobrecumplimiento)'
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={<Switch checked={active} onChange={(_, checked) => setActive(checked)} />}
              label='Activa — disponible en nuevas cotizaciones'
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Notas internas (opcional)'
              multiline
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder='Contexto, reglas especiales o referencias internas'
            />
          </Grid>
        </Grid>
      </Stack>

      <Divider />
      <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
        <Button variant='outlined' color='secondary' onClick={handleClose} fullWidth disabled={saving}>{GREENHOUSE_COPY.actions.cancel}</Button>
        <Button
          variant='contained'
          color='primary'
          onClick={handleSubmit}
          disabled={saving}
          fullWidth
          startIcon={saving ? <CircularProgress size={16} color='inherit' /> : undefined}
        >
          {saving
            ? mode === 'create'
              ? 'Creando...'
              : 'Guardando...'
            : mode === 'create'
              ? 'Crear modalidad'
              : 'Guardar cambios'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default EmploymentTypeDrawer
