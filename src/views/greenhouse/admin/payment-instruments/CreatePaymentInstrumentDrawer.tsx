'use client'

import { useMemo, useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import { GH_COLORS } from '@/config/greenhouse-nomenclature'
import {
  INSTRUMENT_CATEGORIES,
  INSTRUMENT_CATEGORY_COLORS,
  INSTRUMENT_CATEGORY_ICONS,
  INSTRUMENT_CATEGORY_LABELS,
  getProvidersByCategory,
  type InstrumentCategory
} from '@/config/payment-instruments'

const GREENHOUSE_COPY = getMicrocopy()

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const CURRENCIES = ['CLP', 'USD']

const BANK_ACCOUNT_TYPES: Record<string, string> = {
  corriente: 'Cuenta corriente',
  ahorro: 'Cuenta de ahorro'
}

const initialForm = {
  instrumentName: '',
  currency: 'CLP',
  openingBalance: '',
  notes: '',
  bankProvider: '',
  bankAccountType: 'corriente',
  bankAccountNumber: '',
  cardNetwork: '',
  cardIssuerType: 'bank' as 'bank' | 'fintech',
  cardIssuerSlug: '',
  cardLast4: '',
  cardLimitClp: '',
  cardLimitUsd: '',
  fintechProvider: '',
  fintechAccountId: '',
  platformProvider: '',
  platformMerchantId: '',
  payrollProvider: '',
  payrollRut: ''
}

const generateAccountId = (name: string, currency: string) =>
  `${name}-${currency}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const providerLogo = (logo: string | null | undefined) =>
  logo ? <Box component='img' src={logo} alt='' aria-hidden sx={{ height: 18, width: 'auto' }} /> : <i className='tabler-building-bank' aria-hidden />

type ProviderOption = ReturnType<typeof getProvidersByCategory>[number]

type ProviderAutocompleteProps = {
  label: string
  placeholder: string
  providers: ProviderOption[]
  value: string
  onChange: (value: string) => void
}

const ProviderAutocomplete = ({ label, placeholder, providers, value, onChange }: ProviderAutocompleteProps) => {
  const selectedProvider = providers.find(provider => provider.slug === value) ?? null

  return (
    <Autocomplete
      fullWidth
      size='small'
      options={providers}
      value={selectedProvider}
      getOptionLabel={option => option.name}
      isOptionEqualToValue={(option, selected) => option.slug === selected.slug}
      noOptionsText='Sin proveedores disponibles'
      clearText='Limpiar seleccion'
      openText={`Abrir ${label.toLowerCase()}`}
      closeText={`Cerrar ${label.toLowerCase()}`}
      onChange={(_, provider) => onChange(provider?.slug ?? '')}
      renderOption={(props, provider) => (
        <Box component='li' {...props} key={provider.slug} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {providerLogo(provider.logo)}
          {provider.name}
        </Box>
      )}
      renderInput={params => (
        <CustomTextField
          {...params}
          label={label}
          placeholder={placeholder}
          InputProps={{
            ...params.InputProps,
            startAdornment: selectedProvider ? (
              <>
                {providerLogo(selectedProvider.logo)}
                {params.InputProps.startAdornment}
              </>
            ) : (
              params.InputProps.startAdornment
            )
          }}
        />
      )}
      slotProps={{
        paper: {
          elevation: 8,
          sx: { mt: 0.5 }
        }
      }}
    />
  )
}

const CreatePaymentInstrumentDrawer = ({ open, onClose, onSuccess }: Props) => {
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedCategory, setSelectedCategory] = useState<InstrumentCategory | null>(null)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const bankProviders = getProvidersByCategory('bank_account')
  const fintechProviders = getProvidersByCategory('fintech')
  const platformProviders = getProvidersByCategory('payment_platform')
  const payrollProviders = getProvidersByCategory('payroll_processor')
  const cardNetworkProviders = getProvidersByCategory('credit_card')

  const providerSlug = useMemo(() => {
    if (selectedCategory === 'bank_account') return form.bankProvider || null
    if (selectedCategory === 'credit_card') return form.cardNetwork || null
    if (selectedCategory === 'fintech') return form.fintechProvider || null
    if (selectedCategory === 'payment_platform') return form.platformProvider || null
    if (selectedCategory === 'payroll_processor') return form.payrollProvider || null

    return null
  }, [form.bankProvider, form.cardNetwork, form.fintechProvider, form.platformProvider, form.payrollProvider, selectedCategory])

  const readinessWarnings = useMemo(() => {
    const warnings: string[] = []

    if (!form.instrumentName.trim()) warnings.push('Falta nombre visible.')
    if (!providerSlug && selectedCategory !== 'cash') warnings.push('Falta proveedor.')
    if (selectedCategory === 'bank_account' && !form.bankAccountNumber.trim()) warnings.push('La cuenta bancaria quedara sin identificador visible.')
    if (selectedCategory === 'credit_card' && form.cardLast4 && !/^\d{4}$/.test(form.cardLast4)) warnings.push('Los ultimos 4 digitos deben ser numericos.')
    if (selectedCategory === 'payment_platform' && !form.platformMerchantId.trim()) warnings.push('La plataforma quedara sin Merchant ID.')

    return warnings
  }, [form, providerSlug, selectedCategory])

  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(current => ({ ...current, [key]: value }))
    setError(null)
  }

  const resetForm = () => {
    setStep(1)
    setSelectedCategory(null)
    setForm(initialForm)
    setSaving(false)
    setError(null)
    setConfirmOpen(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const submitCreate = async () => {
    if (!selectedCategory) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/payment-instruments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: generateAccountId(form.instrumentName.trim(), form.currency),
          instrumentName: form.instrumentName.trim(),
          instrumentCategory: selectedCategory,
          providerSlug,
          currency: form.currency,
          ...(form.openingBalance && { openingBalance: Number(form.openingBalance) }),
          ...(form.notes.trim() && { notes: form.notes.trim() }),
          onboardingSource: 'admin_workspace',
          readinessWarnings,
          ...(selectedCategory === 'bank_account' && {
            bankAccountType: form.bankAccountType,
            ...(form.bankAccountNumber.trim() && { bankAccountNumber: form.bankAccountNumber.trim() })
          }),
          ...(selectedCategory === 'credit_card' && {
            ...(form.cardNetwork && { cardNetwork: form.cardNetwork }),
            ...(form.cardIssuerSlug && { cardIssuer: form.cardIssuerSlug }),
            ...(form.cardLast4.trim() && { cardLast4: form.cardLast4.trim() }),
            ...(form.cardLimitClp && { creditLimit: Number(form.cardLimitClp) }),
            metadataJson: {
              ...(form.cardLimitClp && { creditLimitClp: Number(form.cardLimitClp) }),
              ...(form.cardLimitUsd && { creditLimitUsd: Number(form.cardLimitUsd) }),
              ...(form.cardIssuerSlug && { issuerSlug: form.cardIssuerSlug, issuerType: form.cardIssuerType })
            }
          }),
          ...(selectedCategory === 'fintech' && {
            ...(form.fintechAccountId.trim() && { fintechAccountId: form.fintechAccountId.trim() })
          }),
          ...(selectedCategory === 'payment_platform' && {
            ...(form.platformMerchantId.trim() && { merchantId: form.platformMerchantId.trim() })
          }),
          ...(selectedCategory === 'payroll_processor' && {
            ...(form.payrollRut.trim() && { rutEmpresa: form.payrollRut.trim() })
          })
        })
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))

        throw new Error(payload.error ?? `No pudimos crear el instrumento (HTTP ${response.status}).`)
      }

      toast.success('Instrumento creado. Revisa readiness antes de usarlo como default.')
      resetForm()
      onClose()
      onSuccess()
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'No pudimos crear el instrumento.'

      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
      setConfirmOpen(false)
    }
  }

  const requestSubmit = () => {
    if (!form.instrumentName.trim()) {
      setError('Ingresa un nombre visible para crear el instrumento.')

      return
    }

    if (selectedCategory === 'credit_card' && form.cardLast4 && !/^\d{4}$/.test(form.cardLast4)) {
      setError('Los ultimos 4 digitos de la tarjeta deben ser numericos.')

      return
    }

    setConfirmOpen(true)
  }

  return (
    <>
      <Drawer
        anchor='right'
        open={open}
        onClose={handleClose}
        PaperProps={{ sx: { width: { xs: '100%', sm: 560 }, display: 'flex' } }}
      >
        {saving ? <LinearProgress aria-label='Creando instrumento de pago' /> : null}

        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', p: 4, gap: 3 }}>
          <Box>
            <Typography variant='h6'>{step === 1 ? 'Agregar instrumento' : INSTRUMENT_CATEGORY_LABELS[selectedCategory!]}</Typography>
            <Typography variant='body2' color='text.secondary'>
              Registra solo la identidad operativa necesaria. El detalle sensible se administra con reveal auditado.
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size='small' aria-label='Cerrar drawer de instrumento'>
            <i className='tabler-x' />
          </IconButton>
        </Box>

        <Divider />

        <Stack spacing={4} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
          {error ? (
            <Alert severity='error' onClose={() => setError(null)}>
              {error}
            </Alert>
          ) : null}

          {step === 1 ? (
            <>
              <Alert severity='info'>
                Elige la categoria por el rol financiero del instrumento. Podras ajustar readiness y ruteo desde el workspace de detalle.
              </Alert>
              <Grid container spacing={2.5}>
                {INSTRUMENT_CATEGORIES.map(category => (
                  <Grid key={category} size={{ xs: 12, sm: 6 }}>
                    <Button
                      variant='outlined'
                      fullWidth
                      onClick={() => {
                        setSelectedCategory(category)
                        setStep(2)
                      }}
                      sx={{
                        minHeight: 108,
                        p: 2.5,
                        justifyContent: 'flex-start',
                        color: 'text.primary',
                        borderColor: 'divider',
                        textTransform: 'none',
                        '&:hover, &:focus-visible': {
                          borderColor: `${INSTRUMENT_CATEGORY_COLORS[category]}.main`,
                          bgcolor: `${INSTRUMENT_CATEGORY_COLORS[category]}.lightOpacity`
                        }
                      }}
                    >
                      <Stack direction='row' spacing={2} alignItems='center' sx={{ width: '100%' }}>
                        <CustomAvatar skin='light' color={INSTRUMENT_CATEGORY_COLORS[category] ?? 'primary'} size={42} variant='rounded'>
                          <i className={INSTRUMENT_CATEGORY_ICONS[category]} />
                        </CustomAvatar>
                        <Box sx={{ textAlign: 'left', minWidth: 0 }}>
                          <Typography variant='body2' sx={{ fontWeight: 700 }}>
                            {INSTRUMENT_CATEGORY_LABELS[category]}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            Configuracion especifica y readiness
                          </Typography>
                        </Box>
                      </Stack>
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </>
          ) : null}

          {step === 2 && selectedCategory ? (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <Stack direction='row' spacing={1.5} useFlexGap flexWrap='wrap'>
                  <CustomChip round='true' size='small' variant='tonal' color={INSTRUMENT_CATEGORY_COLORS[selectedCategory] ?? 'primary'} label={INSTRUMENT_CATEGORY_LABELS[selectedCategory]} />
                  <CustomChip round='true' size='small' variant='tonal' color={readinessWarnings.length ? 'warning' : 'success'} label={readinessWarnings.length ? 'Readiness pendiente' : 'Listo para crear'} />
                </Stack>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Nombre visible'
                  value={form.instrumentName}
                  onChange={event => updateForm('instrumentName', event.target.value)}
                  required
                  placeholder='Ej. Santander Cuenta Corriente CLP'
                  helperText='Debe ser claro para Banco, Cobros, Pagos y Conciliacion.'
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField select fullWidth size='small' label='Moneda' value={form.currency} onChange={event => updateForm('currency', event.target.value)}>
                  {CURRENCIES.map(currency => (
                    <MenuItem key={currency} value={currency}>
                      {currency}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Saldo de apertura'
                  type='number'
                  value={form.openingBalance}
                  onChange={event => updateForm('openingBalance', event.target.value)}
                  helperText='Opcional. No reemplaza saldos treasury.'
                />
              </Grid>

              {selectedCategory === 'bank_account' ? (
                <>
                  <Grid size={{ xs: 12 }}>
                    <ProviderAutocomplete
                      label='Banco'
                      placeholder='Seleccionar banco'
                      providers={bankProviders}
                      value={form.bankProvider}
                      onChange={value => updateForm('bankProvider', value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <CustomTextField select fullWidth size='small' label='Tipo de cuenta' value={form.bankAccountType} onChange={event => updateForm('bankAccountType', event.target.value)}>
                      {Object.entries(BANK_ACCOUNT_TYPES).map(([value, label]) => (
                        <MenuItem key={value} value={value}>
                          {label}
                        </MenuItem>
                      ))}
                    </CustomTextField>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <CustomTextField
                      fullWidth
                      size='small'
                      label='Numero de cuenta'
                      value={form.bankAccountNumber}
                      onChange={event => updateForm('bankAccountNumber', event.target.value)}
                      helperText='Se enviara al contrato backend; la vista de detalle lo mostrara enmascarado.'
                    />
                  </Grid>
                </>
              ) : null}

              {selectedCategory === 'credit_card' ? (
                <>
                  <Grid size={{ xs: 12 }}>
                    <ProviderAutocomplete
                      label='Red'
                      placeholder='Seleccionar red'
                      providers={cardNetworkProviders}
                      value={form.cardNetwork}
                      onChange={value => updateForm('cardNetwork', value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>
                      Tipo de emisor
                    </Typography>
                    <ToggleButtonGroup
                      exclusive
                      fullWidth
                      color='primary'
                      value={form.cardIssuerType}
                      onChange={(_, value: 'bank' | 'fintech' | null) => {
                        if (value) setForm(current => ({ ...current, cardIssuerType: value, cardIssuerSlug: '' }))
                      }}
                      sx={{ '& .MuiToggleButton-root': { textTransform: 'none', py: 0.75 } }}
                    >
                      <ToggleButton value='bank'>Banco</ToggleButton>
                      <ToggleButton value='fintech'>Fintech</ToggleButton>
                    </ToggleButtonGroup>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <ProviderAutocomplete
                      label='Emisor'
                      placeholder='Seleccionar emisor'
                      providers={form.cardIssuerType === 'bank' ? bankProviders : fintechProviders}
                      value={form.cardIssuerSlug}
                      onChange={value => updateForm('cardIssuerSlug', value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <CustomTextField
                      fullWidth
                      size='small'
                      label='Ultimos 4 digitos'
                      value={form.cardLast4}
                      onChange={event => updateForm('cardLast4', event.target.value.replace(/\D/g, '').slice(0, 4))}
                      error={Boolean(form.cardLast4) && !/^\d{4}$/.test(form.cardLast4)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <CustomTextField fullWidth size='small' label='Limite CLP' type='number' value={form.cardLimitClp} onChange={event => updateForm('cardLimitClp', event.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <CustomTextField fullWidth size='small' label='Limite USD' type='number' value={form.cardLimitUsd} onChange={event => updateForm('cardLimitUsd', event.target.value)} />
                  </Grid>
                </>
              ) : null}

              {selectedCategory === 'fintech' ? (
                <>
                  <Grid size={{ xs: 12 }}>
                    <ProviderAutocomplete
                      label='Proveedor'
                      placeholder='Seleccionar fintech'
                      providers={fintechProviders}
                      value={form.fintechProvider}
                      onChange={value => updateForm('fintechProvider', value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField fullWidth size='small' label='Email o ID de cuenta' value={form.fintechAccountId} onChange={event => updateForm('fintechAccountId', event.target.value)} />
                  </Grid>
                </>
              ) : null}

              {selectedCategory === 'payment_platform' ? (
                <>
                  <Grid size={{ xs: 12 }}>
                    <ProviderAutocomplete
                      label='Proveedor'
                      placeholder='Seleccionar plataforma'
                      providers={platformProviders}
                      value={form.platformProvider}
                      onChange={value => updateForm('platformProvider', value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField fullWidth size='small' label='Workspace / Merchant ID' value={form.platformMerchantId} onChange={event => updateForm('platformMerchantId', event.target.value)} />
                  </Grid>
                </>
              ) : null}

              {selectedCategory === 'payroll_processor' ? (
                <>
                  <Grid size={{ xs: 12 }}>
                    <ProviderAutocomplete
                      label='Proveedor'
                      placeholder='Seleccionar proveedor'
                      providers={payrollProviders}
                      value={form.payrollProvider}
                      onChange={value => updateForm('payrollProvider', value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <CustomTextField fullWidth size='small' label='RUT empresa' value={form.payrollRut} onChange={event => updateForm('payrollRut', event.target.value)} />
                  </Grid>
                </>
              ) : null}

              <Grid size={{ xs: 12 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Notas administrativas'
                  multiline
                  rows={2}
                  value={form.notes}
                  onChange={event => updateForm('notes', event.target.value)}
                  helperText='No pegues numeros completos, tokens ni credenciales.'
                />
              </Grid>

              {readinessWarnings.length ? (
                <Grid size={{ xs: 12 }}>
                  <Alert severity='warning'>
                    {readinessWarnings.join(' ')} Puedes crear el instrumento y completar readiness desde el detalle.
                  </Alert>
                </Grid>
              ) : (
                <Grid size={{ xs: 12 }}>
                  <Alert severity='success'>El instrumento tiene los datos minimos para entrar al workspace admin.</Alert>
                </Grid>
              )}
            </Grid>
          ) : null}
        </Stack>

        <Divider />
        <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
          {step === 2 ? (
            <Button variant='outlined' color='secondary' onClick={() => setStep(1)} disabled={saving}>
              Cambiar categoria
            </Button>
          ) : null}
          <Button variant='outlined' color='secondary' onClick={handleClose} fullWidth disabled={saving}>{GREENHOUSE_COPY.actions.cancel}</Button>
          {step === 2 ? (
            <Button
              variant='contained'
              color='primary'
              onClick={requestSubmit}
              disabled={saving}
              fullWidth
              startIcon={saving ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-shield-plus' />}
            >
              Revisar y crear
            </Button>
          ) : null}
        </Box>
      </Drawer>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Confirmar creacion del instrumento</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Alert severity={readinessWarnings.length ? 'warning' : 'info'}>
              {readinessWarnings.length
                ? 'El instrumento se creara con readiness pendiente. No lo marques como default hasta completar la configuracion.'
                : 'El instrumento se creara como activo y quedara disponible para administracion.'}
            </Alert>
            <Box sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 1, p: 3 }}>
              <Typography variant='subtitle2'>{form.instrumentName}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {selectedCategory ? INSTRUMENT_CATEGORY_LABELS[selectedCategory] : 'Categoria no seleccionada'} · {form.currency}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                ID propuesto: {generateAccountId(form.instrumentName.trim(), form.currency)}
              </Typography>
            </Box>
            {readinessWarnings.length ? (
              <Stack spacing={1}>
                {readinessWarnings.map(warning => (
                  <Typography key={warning} variant='body2' color={GH_COLORS.semaphore.yellow.text}>
                    {warning}
                  </Typography>
                ))}
              </Stack>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color='secondary' onClick={() => setConfirmOpen(false)} disabled={saving}>
            Seguir editando
          </Button>
          <Button
            variant='contained'
            onClick={() => void submitCreate()}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-check' />}
          >
            Crear instrumento
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default CreatePaymentInstrumentDrawer
