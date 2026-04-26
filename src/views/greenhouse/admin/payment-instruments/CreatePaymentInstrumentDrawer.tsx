'use client'

import { useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

import {
  INSTRUMENT_CATEGORIES,
  INSTRUMENT_CATEGORY_LABELS,
  INSTRUMENT_CATEGORY_ICONS,
  INSTRUMENT_CATEGORY_COLORS,
  getProvidersByCategory,
  type InstrumentCategory
} from '@/config/payment-instruments'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CURRENCIES = ['CLP', 'USD']

const BANK_ACCOUNT_TYPES: Record<string, string> = {
  corriente: 'Cuenta corriente',
  ahorro: 'Cuenta de ahorro'
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CreatePaymentInstrumentDrawer = ({ open, onClose, onSuccess }: Props) => {
  // Step state
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedCategory, setSelectedCategory] = useState<InstrumentCategory | null>(null)

  // Common fields
  const [instrumentName, setInstrumentName] = useState('')
  const [currency, setCurrency] = useState('CLP')
  const [openingBalance, setOpeningBalance] = useState('')
  const [notes, setNotes] = useState('')

  // bank_account fields
  const [bankProvider, setBankProvider] = useState('')
  const [bankAccountType, setBankAccountType] = useState('corriente')
  const [bankAccountNumber, setBankAccountNumber] = useState('')

  // credit_card fields
  const [cardNetwork, setCardNetwork] = useState('')
  const [cardIssuerType, setCardIssuerType] = useState<'bank' | 'fintech'>('bank')
  const [cardIssuerSlug, setCardIssuerSlug] = useState('')
  const [cardLast4, setCardLast4] = useState('')
  const [cardLimitClp, setCardLimitClp] = useState('')
  const [cardLimitUsd, setCardLimitUsd] = useState('')

  // fintech fields
  const [fintechProvider, setFintechProvider] = useState('')
  const [fintechAccountId, setFintechAccountId] = useState('')

  // payment_platform fields
  const [platformProvider, setPlatformProvider] = useState('')
  const [platformMerchantId, setPlatformMerchantId] = useState('')

  // payroll_processor fields
  const [payrollProvider, setPayrollProvider] = useState('')
  const [payrollRut, setPayrollRut] = useState('')

  // UI state
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setStep(1)
    setSelectedCategory(null)
    setInstrumentName('')
    setCurrency('CLP')
    setOpeningBalance('')
    setNotes('')
    setBankProvider('')
    setBankAccountType('corriente')
    setBankAccountNumber('')
    setCardNetwork('')
    setCardIssuerType('bank')
    setCardIssuerSlug('')
    setCardLast4('')
    setCardLimitClp('')
    setCardLimitUsd('')
    setFintechProvider('')
    setFintechAccountId('')
    setPlatformProvider('')
    setPlatformMerchantId('')
    setPayrollProvider('')
    setPayrollRut('')
    setError(null)
  }

  const generateAccountId = (name: string) =>
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  const handleSelectCategory = (cat: InstrumentCategory) => {
    setSelectedCategory(cat)
    setStep(2)
  }

  const handleBack = () => {
    setStep(1)
    setError(null)
  }

  const handleSubmit = async () => {
    if (!instrumentName.trim()) {
      setError('Ingresa un nombre para el instrumento.')

      return
    }

    if (!selectedCategory) return

    setSaving(true)
    setError(null)

    // Build provider slug based on category
    let providerSlug: string | null = null

    if (selectedCategory === 'bank_account') providerSlug = bankProvider || null
    else if (selectedCategory === 'credit_card') providerSlug = cardNetwork || null
    else if (selectedCategory === 'fintech') providerSlug = fintechProvider || null
    else if (selectedCategory === 'payment_platform') providerSlug = platformProvider || null
    else if (selectedCategory === 'payroll_processor') providerSlug = payrollProvider || null

    try {
      const res = await fetch('/api/admin/payment-instruments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: generateAccountId(instrumentName),
          instrumentName: instrumentName.trim(),
          instrumentCategory: selectedCategory,
          providerSlug,
          currency,
          ...(openingBalance && { openingBalance: Number(openingBalance) }),
          ...(notes.trim() && { notes: notes.trim() }),

          // Category-specific fields
          ...(selectedCategory === 'bank_account' && {
            bankAccountType,
            ...(bankAccountNumber.trim() && { bankAccountNumber: bankAccountNumber.trim() })
          }),
          ...(selectedCategory === 'credit_card' && {
            ...(cardIssuerSlug && { cardIssuer: cardIssuerSlug }),
            ...(cardLast4.trim() && { cardLast4: cardLast4.trim() }),
            ...(cardLimitClp && { creditLimit: Number(cardLimitClp) }),
            metadataJson: {
              ...(cardLimitClp && { creditLimitClp: Number(cardLimitClp) }),
              ...(cardLimitUsd && { creditLimitUsd: Number(cardLimitUsd) }),
              ...(cardIssuerSlug && { issuerSlug: cardIssuerSlug, issuerType: cardIssuerType })
            }
          }),
          ...(selectedCategory === 'fintech' && {
            ...(fintechAccountId.trim() && { fintechAccountId: fintechAccountId.trim() })
          }),
          ...(selectedCategory === 'payment_platform' && {
            ...(platformMerchantId.trim() && { merchantId: platformMerchantId.trim() })
          }),
          ...(selectedCategory === 'payroll_processor' && {
            ...(payrollRut.trim() && { rutEmpresa: payrollRut.trim() })
          })
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al crear el instrumento de pago.')
        setSaving(false)

        return
      }

      toast.success('Instrumento de pago creado')
      resetForm()
      onClose()
      onSuccess()
    } catch {
      setError('Error de conexion')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  // Provider options for selects
  const bankProviders = getProvidersByCategory('bank_account')
  const fintechProviders = getProvidersByCategory('fintech')
  const platformProviders = getProvidersByCategory('payment_platform')
  const payrollProviders = getProvidersByCategory('payroll_processor')
  const cardNetworkProviders = getProvidersByCategory('credit_card')

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={handleClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 520 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Typography variant='h6'>
          {step === 1 ? 'Nuevo instrumento de pago' : `Nuevo: ${INSTRUMENT_CATEGORY_LABELS[selectedCategory!]}`}
        </Typography>
        <IconButton onClick={handleClose} size='small' aria-label='Cerrar'>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

        {/* Step 1: Category selection */}
        {step === 1 && (
          <>
            <Typography variant='body2' color='text.secondary'>
              Selecciona el tipo de instrumento que deseas registrar.
            </Typography>
            <Grid container spacing={2}>
              {INSTRUMENT_CATEGORIES.map(cat => (
                <Grid key={cat} size={{ xs: 6 }}>
                  <Button
                    variant='outlined'
                    fullWidth
                    onClick={() => handleSelectCategory(cat)}
                    sx={{
                      py: 2.5,
                      px: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                      textTransform: 'none',
                      borderColor: 'divider',
                      color: 'text.primary',
                      '&:hover': {
                        borderColor: `${INSTRUMENT_CATEGORY_COLORS[cat]}.main`,
                        bgcolor: `${INSTRUMENT_CATEGORY_COLORS[cat]}.lightOpacity`
                      }
                    }}
                  >
                    <i className={INSTRUMENT_CATEGORY_ICONS[cat]} style={{ fontSize: 28 }} />
                    <Typography variant='body2' sx={{ fontWeight: 500, lineHeight: 1.2, textAlign: 'center' }}>
                      {INSTRUMENT_CATEGORY_LABELS[cat]}
                    </Typography>
                  </Button>
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {/* Step 2: Form fields */}
        {step === 2 && selectedCategory && (
          <Grid container spacing={2}>
            {/* Common fields */}
            <Grid size={{ xs: 12 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='Nombre del instrumento'
                value={instrumentName}
                onChange={e => setInstrumentName(e.target.value)}
                required
                placeholder='ej. BCI Cuenta Corriente CLP'
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                select
                fullWidth
                size='small'
                label='Moneda'
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                required
              >
                {CURRENCIES.map(c => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </CustomTextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='Saldo de apertura'
                type='number'
                value={openingBalance}
                onChange={e => setOpeningBalance(e.target.value)}
              />
            </Grid>

            {/* bank_account specific */}
            {selectedCategory === 'bank_account' && (
              <>
                <Grid size={{ xs: 12 }}>
                  <CustomTextField
                    select
                    fullWidth
                    size='small'
                    label='Banco'
                    value={bankProvider}
                    onChange={e => setBankProvider(e.target.value)}
                  >
                    <MenuItem value=''>-- Seleccionar --</MenuItem>
                    {bankProviders.map(p => (
                      <MenuItem key={p.slug} value={p.slug}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {p.logo && (
                            <Box component='img' src={p.logo} alt={p.name} sx={{ height: 18, width: 'auto' }} />
                          )}
                          {p.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </CustomTextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CustomTextField
                    select
                    fullWidth
                    size='small'
                    label='Tipo de cuenta'
                    value={bankAccountType}
                    onChange={e => setBankAccountType(e.target.value)}
                  >
                    {Object.entries(BANK_ACCOUNT_TYPES).map(([k, v]) => (
                      <MenuItem key={k} value={k}>{v}</MenuItem>
                    ))}
                  </CustomTextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='Numero de cuenta'
                    value={bankAccountNumber}
                    onChange={e => setBankAccountNumber(e.target.value)}
                  />
                </Grid>
              </>
            )}

            {/* credit_card specific */}
            {selectedCategory === 'credit_card' && (
              <>
                <Grid size={{ xs: 12 }}>
                  <CustomTextField
                    select
                    fullWidth
                    size='small'
                    label='Red'
                    value={cardNetwork}
                    onChange={e => setCardNetwork(e.target.value)}
                  >
                    <MenuItem value=''>-- Seleccionar --</MenuItem>
                    {cardNetworkProviders.map(p => (
                      <MenuItem key={p.slug} value={p.slug}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {p.logo && (
                            <Box component='img' src={p.logo} alt={p.name} sx={{ height: 18, width: 'auto' }} />
                          )}
                          {p.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </CustomTextField>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant='caption' color='text.secondary' sx={{ mb: 0.5, display: 'block' }}>
                    Tipo de emisor
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    fullWidth
                    color='primary'
                    value={cardIssuerType}
                    onChange={(_, v: 'bank' | 'fintech' | null) => { if (v) { setCardIssuerType(v); setCardIssuerSlug('') } }}
                    sx={{ '& .MuiToggleButton-root': { textTransform: 'none', py: 0.75 } }}
                  >
                    <ToggleButton value='bank'>Banco</ToggleButton>
                    <ToggleButton value='fintech'>Fintech</ToggleButton>
                  </ToggleButtonGroup>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <CustomTextField
                    select
                    fullWidth
                    size='small'
                    label='Emisor'
                    value={cardIssuerSlug}
                    onChange={e => setCardIssuerSlug(e.target.value)}
                  >
                    <MenuItem value=''>-- Seleccionar emisor --</MenuItem>
                    {(cardIssuerType === 'bank' ? bankProviders : fintechProviders).map(p => (
                      <MenuItem key={p.slug} value={p.slug}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {p.logo && (
                            <Box component='img' src={p.logo} alt={p.name} sx={{ height: 18, width: 'auto' }} />
                          )}
                          {p.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </CustomTextField>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='Ultimos 4 digitos'
                    value={cardLast4}
                    onChange={e => setCardLast4(e.target.value)}
                    slotProps={{ htmlInput: { maxLength: 4 } }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='Limite CLP'
                    type='number'
                    value={cardLimitClp}
                    onChange={e => setCardLimitClp(e.target.value)}
                    placeholder='ej. 5000000'
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='Limite USD'
                    type='number'
                    value={cardLimitUsd}
                    onChange={e => setCardLimitUsd(e.target.value)}
                    placeholder='ej. 3000'
                  />
                </Grid>
              </>
            )}

            {/* fintech specific */}
            {selectedCategory === 'fintech' && (
              <>
                <Grid size={{ xs: 12 }}>
                  <CustomTextField
                    select
                    fullWidth
                    size='small'
                    label='Proveedor'
                    value={fintechProvider}
                    onChange={e => setFintechProvider(e.target.value)}
                  >
                    <MenuItem value=''>-- Seleccionar --</MenuItem>
                    {fintechProviders.map(p => (
                      <MenuItem key={p.slug} value={p.slug}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {p.logo && (
                            <Box component='img' src={p.logo} alt={p.name} sx={{ height: 18, width: 'auto' }} />
                          )}
                          {p.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </CustomTextField>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='Email o ID de cuenta'
                    value={fintechAccountId}
                    onChange={e => setFintechAccountId(e.target.value)}
                  />
                </Grid>
              </>
            )}

            {/* payment_platform specific */}
            {selectedCategory === 'payment_platform' && (
              <>
                <Grid size={{ xs: 12 }}>
                  <CustomTextField
                    select
                    fullWidth
                    size='small'
                    label='Proveedor'
                    value={platformProvider}
                    onChange={e => setPlatformProvider(e.target.value)}
                  >
                    <MenuItem value=''>-- Seleccionar --</MenuItem>
                    {platformProviders.map(p => (
                      <MenuItem key={p.slug} value={p.slug}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {p.logo && (
                            <Box component='img' src={p.logo} alt={p.name} sx={{ height: 18, width: 'auto' }} />
                          )}
                          {p.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </CustomTextField>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='Workspace / Merchant ID'
                    value={platformMerchantId}
                    onChange={e => setPlatformMerchantId(e.target.value)}
                  />
                </Grid>
              </>
            )}

            {/* payroll_processor specific */}
            {selectedCategory === 'payroll_processor' && (
              <>
                <Grid size={{ xs: 12 }}>
                  <CustomTextField
                    select
                    fullWidth
                    size='small'
                    label='Proveedor'
                    value={payrollProvider}
                    onChange={e => setPayrollProvider(e.target.value)}
                  >
                    <MenuItem value=''>-- Seleccionar --</MenuItem>
                    {payrollProviders.map(p => (
                      <MenuItem key={p.slug} value={p.slug}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {p.logo && (
                            <Box component='img' src={p.logo} alt={p.name} sx={{ height: 18, width: 'auto' }} />
                          )}
                          {p.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </CustomTextField>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <CustomTextField
                    fullWidth
                    size='small'
                    label='RUT empresa'
                    value={payrollRut}
                    onChange={e => setPayrollRut(e.target.value)}
                  />
                </Grid>
              </>
            )}

            {/* cash has no extra fields */}

            {/* Notes (all categories) */}
            <Grid size={{ xs: 12 }}>
              <CustomTextField
                fullWidth
                size='small'
                label='Notas (opcional)'
                multiline
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </Grid>
          </Grid>
        )}
      </Stack>

      <Divider />
      <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
        {step === 2 && (
          <Button variant='outlined' color='secondary' onClick={handleBack}>
            Atras
          </Button>
        )}
        <Button variant='outlined' color='secondary' onClick={handleClose} fullWidth>
          Cancelar
        </Button>
        {step === 2 && (
          <Button
            variant='contained'
            color='primary'
            onClick={handleSubmit}
            disabled={saving}
            fullWidth
            startIcon={saving ? <CircularProgress size={16} color='inherit' /> : undefined}
          >
            {saving ? 'Creando...' : 'Crear instrumento'}
          </Button>
        )}
      </Box>
    </Drawer>
  )
}

export default CreatePaymentInstrumentDrawer
