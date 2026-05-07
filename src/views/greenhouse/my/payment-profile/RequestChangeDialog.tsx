'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { Theme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

const TASK407_ARIA_IDENTIDAD_LEGAL_VERIFICADA = "Identidad legal verificada"


type Regime = 'chile_dependent' | 'honorarios_chile' | 'international' | 'unset'

interface ContextDto {
  regime: Regime
  countryCode: string | null
  countryName: string | null
  currency: 'CLP' | 'USD' | null
  legalFullName: string | null
  legalDocumentMasked: string | null
  legalDocumentType: string | null
  legalDocumentVerificationStatus: string | null
  unsetReason: string | null
}

const CL_BANKS = [
  'Banco de Chile',
  'BCI',
  'Santander Chile',
  'BancoEstado',
  'Scotiabank',
  'Itaú',
  'Banco Falabella',
  'Banco Security',
  'Banco Bice',
  'Banco Internacional',
  'Banco Consorcio',
  'Banco Ripley',
  'Coopeuch',
  'Otro'
]

const CL_ACCOUNT_TYPES: { value: 'cuenta_corriente' | 'cuenta_vista' | 'cuenta_rut' | 'chequera_electronica'; label: string }[] = [
  { value: 'cuenta_corriente', label: 'Cuenta corriente' },
  { value: 'cuenta_vista', label: 'Cuenta vista' },
  { value: 'cuenta_rut', label: 'Cuenta RUT' },
  { value: 'chequera_electronica', label: 'Chequera electrónica' }
]

const COUNTRY_OPTIONS: { code: string; label: string; flag: string }[] = [
  { code: 'CO', label: 'Colombia', flag: '🇨🇴' },
  { code: 'MX', label: 'México', flag: '🇲🇽' },
  { code: 'PE', label: 'Perú', flag: '🇵🇪' },
  { code: 'AR', label: 'Argentina', flag: '🇦🇷' },
  { code: 'BR', label: 'Brasil', flag: '🇧🇷' },
  { code: 'EC', label: 'Ecuador', flag: '🇪🇨' },
  { code: 'UY', label: 'Uruguay', flag: '🇺🇾' },
  { code: 'BO', label: 'Bolivia', flag: '🇧🇴' },
  { code: 'PY', label: 'Paraguay', flag: '🇵🇾' },
  { code: 'VE', label: 'Venezuela', flag: '🇻🇪' },
  { code: 'CR', label: 'Costa Rica', flag: '🇨🇷' },
  { code: 'GT', label: 'Guatemala', flag: '🇬🇹' },
  { code: 'HN', label: 'Honduras', flag: '🇭🇳' },
  { code: 'NI', label: 'Nicaragua', flag: '🇳🇮' },
  { code: 'PA', label: 'Panamá', flag: '🇵🇦' },
  { code: 'DO', label: 'República Dominicana', flag: '🇩🇴' },
  { code: 'SV', label: 'El Salvador', flag: '🇸🇻' },
  { code: 'CU', label: 'Cuba', flag: '🇨🇺' },
  { code: 'PR', label: 'Puerto Rico', flag: '🇵🇷' },
  { code: 'ES', label: 'España', flag: '🇪🇸' },
  { code: 'US', label: 'Estados Unidos', flag: '🇺🇸' }
]

const REGIME_LABELS: Record<Regime, string> = {
  chile_dependent: 'Chile dependiente (CLP)',
  honorarios_chile: 'Honorarios Chile (CLP)',
  international: 'Internacional (USD)',
  unset: 'Sin determinar'
}

// ──────────────────────────────────────────────────────────────────────────────
// Format helpers (mirror del server-side `self-service-validators.ts`)
// ──────────────────────────────────────────────────────────────────────────────

const formatRut = (raw: string): string => {
  if (!raw) return raw
  const cleaned = raw.replace(/\./g, '').replace(/-/g, '').toUpperCase().trim()

  if (!/^\d+[0-9K]?$/.test(cleaned)) return raw
  const body = cleaned.length > 1 ? cleaned.slice(0, -1) : cleaned
  const dv = cleaned.length > 1 ? cleaned.slice(-1) : ''
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return dv ? `${formatted}-${dv}` : formatted
}

const isValidRut = (raw: string): boolean => {
  if (!raw) return false
  const cleaned = raw.replace(/\./g, '').replace(/-/g, '').toUpperCase().trim()

  if (cleaned.length < 2 || !/^\d+[0-9K]$/.test(cleaned)) return false
  const body = cleaned.slice(0, -1)
  const dv = cleaned.slice(-1)

  let sum = 0
  let mult = 2

  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * mult
    mult = mult === 7 ? 2 : mult + 1
  }

  const r = 11 - (sum % 11)
  const expected = r === 11 ? '0' : r === 10 ? 'K' : String(r)

  return dv === expected
}

const isValidSwift = (raw: string): boolean => /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(raw.toUpperCase().trim())

const last4 = (raw: string): string => {
  const cleaned = raw.replace(/\s/g, '')

  if (cleaned.length <= 4) return cleaned

  return `•••• ${cleaned.slice(-4)}`
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

interface FormState {
  // Common
  bankName: string
  accountHolderName: string
  notes: string

  // CL
  accountTypeCl: '' | 'cuenta_corriente' | 'cuenta_vista' | 'cuenta_rut' | 'chequera_electronica'
  accountNumberFull: string
  rut: string

  // International
  countryCode: string
  swiftBic: string
  ibanOrAccount: string
}

const buildInitial = (ctx: ContextDto | null): FormState => ({
  bankName: '',
  accountHolderName: ctx?.legalFullName ?? '',
  notes: '',
  accountTypeCl: '',
  accountNumberFull: '',
  rut: '',
  countryCode: ctx?.countryCode && ctx.regime === 'international' ? ctx.countryCode : '',
  swiftBic: '',
  ibanOrAccount: ''
})

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
}

const cardSx = (t: Theme) => ({
  border: `1px solid ${t.palette.divider}`,
  borderRadius: 1.5,
  bgcolor: 'background.default',
  p: 1.5
})

const RequestChangeDialog = ({ open, onClose, onSubmit }: Props) => {
  const [context, setContext] = useState<ContextDto | null>(null)
  const [contextLoading, setContextLoading] = useState(false)
  const [contextError, setContextError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>(buildInitial(null))
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Load regime-aware context when dialog opens
  useEffect(() => {
    if (!open) return

    let cancelled = false

    const load = async () => {
      setContextLoading(true)
      setContextError(null)

      try {
        const res = await fetch('/api/my/payment-profile/context')

        if (!res.ok) {
          throw new Error('No pudimos cargar tu contexto. Intenta de nuevo.')
        }

        const data = (await res.json()) as ContextDto

        if (cancelled) return

        setContext(data)
        setForm(buildInitial(data))
        setTouched({})
        setSubmitError(null)
      } catch (err) {
        if (cancelled) return
        setContextError(err instanceof Error ? err.message : 'Error al cargar contexto.')
      } finally {
        if (!cancelled) setContextLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [open])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const blur = (key: keyof FormState) => setTouched(prev => ({ ...prev, [key]: true }))

  const handleClose = () => {
    if (submitting) return
    onClose()
  }

  // Per-field error (only after blur). Mirror del server validator.
  const errors = useMemo(() => {
    if (!context) return {} as Record<string, string>

    const e: Record<string, string> = {}

    if (context.regime === 'chile_dependent' || context.regime === 'honorarios_chile') {
      if (touched.bankName && !form.bankName.trim()) e.bankName = 'Selecciona el banco.'
      if (touched.accountTypeCl && !form.accountTypeCl) e.accountTypeCl = 'Selecciona el tipo.'

      if (touched.accountNumberFull && !/^\d{6,20}$/.test(form.accountNumberFull.replace(/\s/g, ''))) {
        e.accountNumberFull = 'Solo números, entre 6 y 20 dígitos.'
      }

      if (touched.rut && !isValidRut(form.rut)) e.rut = 'RUT inválido. Revisa el dígito verificador.'

      if (touched.accountHolderName && form.accountHolderName.trim().length < 3) {
        e.accountHolderName = 'Nombre del titular requerido.'
      }
    } else if (context.regime === 'international') {
      if (touched.countryCode && !form.countryCode) e.countryCode = 'Selecciona el país.'
      if (touched.bankName && !form.bankName.trim()) e.bankName = 'Ingresa el nombre del banco.'

      if (touched.swiftBic && !isValidSwift(form.swiftBic)) {
        e.swiftBic = 'SWIFT/BIC inválido. 8 u 11 caracteres alfanuméricos.'
      }

      if (touched.ibanOrAccount && form.ibanOrAccount.replace(/\s/g, '').length < 4) {
        e.ibanOrAccount = 'Ingresa el IBAN o número de cuenta.'
      }

      if (touched.accountHolderName && form.accountHolderName.trim().length < 3) {
        e.accountHolderName = 'Nombre legal del titular requerido.'
      }
    }

    return e
  }, [context, form, touched])

  const handleSubmit = async () => {
    if (!context) return

    // Mark all relevant touched to surface errors
    const allTouched: Record<string, boolean> = {}

    if (context.regime === 'international') {
      ;['countryCode', 'bankName', 'swiftBic', 'ibanOrAccount', 'accountHolderName'].forEach(f => (allTouched[f] = true))
    } else {
      ;['bankName', 'accountTypeCl', 'accountNumberFull', 'rut', 'accountHolderName'].forEach(f => (allTouched[f] = true))
    }

    setTouched(allTouched)

    // Re-evaluate (use a tick — but easier: reuse logic inline)
    const hasErrors = Object.keys(errors).length > 0

    if (hasErrors) {
      setSubmitError('Revisa los campos marcados antes de enviar.')

      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const payload: Record<string, unknown> = {
        bankName: form.bankName.trim() || null,
        accountHolderName: form.accountHolderName.trim() || null,
        notes: form.notes.trim() || null
      }

      if (context.regime === 'international') {
        payload.countryCode = form.countryCode || null
        payload.swiftBic = form.swiftBic.trim() || null
        payload.ibanOrAccount = form.ibanOrAccount.trim() || null
        payload.currency = 'USD'
      } else {
        payload.accountTypeCl = form.accountTypeCl || null
        payload.accountNumberFull = form.accountNumberFull.replace(/\s/g, '') || null
        payload.rut = form.rut || null
        payload.currency = 'CLP'
        payload.countryCode = 'CL'
      }

      await onSubmit(payload)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'No pudimos registrar tu solicitud.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Render states ─────────────────────────────────────────────────────────

  const renderHeader = () => (
    <DialogTitle sx={{ pb: 0.5 }}>
      <Typography variant='h6'>Solicitar cambio de cuenta de pago</Typography>
      <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 0.5 }}>
        Declara los datos de tu cuenta. Finance valida y elige el medio de envío.
      </Typography>
    </DialogTitle>
  )

  const renderRegimeBanner = () => {
    if (!context) return null

    if (context.regime === 'unset') {
      return (
        <Alert
          severity='warning'
          icon={<i className='tabler-alert-triangle' />}
          sx={{ mb: 2 }}
        >
          <Typography variant='body2' fontWeight={600}>Aún no podemos identificar tu régimen</Typography>
          <Typography variant='caption' display='block' sx={{ mt: 0.5 }}>
            {context.unsetReason ?? 'Falta información en tu identidad. Contacta a finance.'}
          </Typography>
        </Alert>
      )
    }

    return (
      <Alert
        severity='info'
        icon={<i className='tabler-info-circle' />}
        action={
          <CustomChip round='true' size='small' variant='tonal' color='info' label='Auto' />
        }
        sx={{ mb: 2 }}
      >
        <Typography variant='body2' fontWeight={600}>
          Régimen detectado: {REGIME_LABELS[context.regime]}{context.countryName && context.regime === 'international' ? ` · ${context.countryName}` : ''}
        </Typography>
        <Typography variant='caption' display='block' sx={{ mt: 0.5 }}>
          Inferido de tu contrato y país. Si es incorrecto, contacta a finance antes de enviar.
        </Typography>
      </Alert>
    )
  }

  const renderIdentityCard = () => {
    if (!context) return null
    if (!context.legalDocumentMasked) return null

    return (
      <Box sx={cardSx} aria-label={TASK407_ARIA_IDENTIDAD_LEGAL_VERIFICADA}>
        <Stack direction='row' alignItems='center' spacing={1.5}>
          <i className='tabler-id' style={{ fontSize: 20, color: 'var(--mui-palette-text-secondary)' }} aria-hidden />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, fontSize: '0.7rem' }}>
              Documento {context.legalDocumentVerificationStatus === 'verified' ? 'verificado' : 'pendiente de verificación'}
            </Typography>
            <Typography variant='monoId' sx={{ display: 'block' }}>
              {context.legalDocumentType ?? 'Documento'} {context.legalDocumentMasked}
            </Typography>
          </Box>
          <Button
            size='small'
            variant='text'
            href='/my/profile'
            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
          >
            Editar en Datos legales
          </Button>
        </Stack>
      </Box>
    )
  }

  const renderChileForm = () => (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          fullWidth
          size='small'
          label='Banco'
          required
          value={form.bankName}
          onChange={e => set('bankName', e.target.value)}
          onBlur={() => blur('bankName')}
          error={Boolean(errors.bankName)}
          helperText={errors.bankName ?? ' '}
          disabled={submitting}
        >
          <MenuItem value=''>
            <em>Selecciona…</em>
          </MenuItem>
          {CL_BANKS.map(b => (
            <MenuItem key={b} value={b}>{b}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          fullWidth
          size='small'
          label='Tipo de cuenta'
          required
          value={form.accountTypeCl}
          onChange={e => set('accountTypeCl', e.target.value as FormState['accountTypeCl'])}
          onBlur={() => blur('accountTypeCl')}
          error={Boolean(errors.accountTypeCl)}
          helperText={errors.accountTypeCl ?? ' '}
          disabled={submitting}
        >
          <MenuItem value=''>
            <em>Selecciona…</em>
          </MenuItem>
          {CL_ACCOUNT_TYPES.map(t => (
            <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
          ))}
        </TextField>
      </Stack>

      <Box>
        <TextField
          fullWidth
          size='small'
          label='Número de cuenta'
          required
          inputMode='numeric'
          value={form.accountNumberFull}
          onChange={e => set('accountNumberFull', e.target.value.replace(/\D/g, ''))}
          onBlur={() => blur('accountNumberFull')}
          error={Boolean(errors.accountNumberFull)}
          helperText={
            errors.accountNumberFull ??
            'Solo se mostrarán los últimos 4 dígitos en la app. El número completo nunca se muestra después.'
          }
          placeholder='Solo números'
          disabled={submitting}
        />
        {form.accountNumberFull.length >= 4 && !errors.accountNumberFull && (
          <Typography variant='caption' color='text.disabled' sx={{ display: 'block', mt: 0.5 }}>
            Vista previa: <Typography component='span' variant='monoId'>{last4(form.accountNumberFull)}</Typography>
          </Typography>
        )}
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          fullWidth
          size='small'
          label='RUT del titular'
          required
          value={form.rut}
          onChange={e => set('rut', formatRut(e.target.value))}
          onBlur={() => blur('rut')}
          error={Boolean(errors.rut)}
          helperText={errors.rut ?? 'RUT del titular. Debe coincidir con tu identidad legal.'}
          placeholder='12.345.678-9'
          disabled={submitting}
        />

        <TextField
          fullWidth
          size='small'
          label='Nombre del titular'
          required
          value={form.accountHolderName}
          onChange={e => set('accountHolderName', e.target.value)}
          onBlur={() => blur('accountHolderName')}
          error={Boolean(errors.accountHolderName)}
          helperText={errors.accountHolderName ?? 'Pre-llenado con tu identidad legal. Editable.'}
          disabled={submitting}
        />
      </Stack>

      {renderIdentityCard()}

      <TextField
        fullWidth
        size='small'
        multiline
        rows={2}
        label='Comentario (opcional)'
        value={form.notes}
        onChange={e => set('notes', e.target.value)}
        placeholder='¿Algo que finance debería saber?'
        disabled={submitting}
        inputProps={{ maxLength: 280 }}
      />
    </Stack>
  )

  const renderInternationalForm = () => (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          fullWidth
          size='small'
          label='País del banco'
          required
          value={form.countryCode}
          onChange={e => set('countryCode', e.target.value)}
          onBlur={() => blur('countryCode')}
          error={Boolean(errors.countryCode)}
          helperText={errors.countryCode ?? ' '}
          disabled={submitting}
        >
          <MenuItem value=''>
            <em>Selecciona…</em>
          </MenuItem>
          {COUNTRY_OPTIONS.map(c => (
            <MenuItem key={c.code} value={c.code}>
              {c.flag} {c.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          fullWidth
          size='small'
          label='Banco'
          required
          value={form.bankName}
          onChange={e => set('bankName', e.target.value)}
          onBlur={() => blur('bankName')}
          error={Boolean(errors.bankName)}
          helperText={errors.bankName ?? ' '}
          placeholder='Ej. Bancolombia'
          disabled={submitting}
        />
      </Stack>

      <TextField
        fullWidth
        size='small'
        label='SWIFT/BIC'
        required
        value={form.swiftBic}
        onChange={e => set('swiftBic', e.target.value.toUpperCase())}
        onBlur={() => blur('swiftBic')}
        error={Boolean(errors.swiftBic)}
        helperText={errors.swiftBic ?? 'Código BIC/SWIFT del banco. 8 u 11 caracteres alfanuméricos.'}
        placeholder='COLOCOBM'
        disabled={submitting}
        inputProps={{ style: { textTransform: 'uppercase' } }}
      />

      <Box>
        <TextField
          fullWidth
          size='small'
          label='IBAN o número de cuenta'
          required
          value={form.ibanOrAccount}
          onChange={e => set('ibanOrAccount', e.target.value)}
          onBlur={() => blur('ibanOrAccount')}
          error={Boolean(errors.ibanOrAccount)}
          helperText={errors.ibanOrAccount ?? 'IBAN completo o número de cuenta del banco.'}
          placeholder='Solo el número o IBAN'
          disabled={submitting}
        />
        {form.ibanOrAccount.length >= 4 && !errors.ibanOrAccount && (
          <Typography variant='caption' color='text.disabled' sx={{ display: 'block', mt: 0.5 }}>
            Vista previa: <Typography component='span' variant='monoId'>{last4(form.ibanOrAccount)}</Typography>
          </Typography>
        )}
      </Box>

      <TextField
        fullWidth
        size='small'
        label='Nombre legal del titular'
        required
        value={form.accountHolderName}
        onChange={e => set('accountHolderName', e.target.value)}
        onBlur={() => blur('accountHolderName')}
        error={Boolean(errors.accountHolderName)}
        helperText={errors.accountHolderName ?? 'Pre-llenado con tu identidad legal. Debe coincidir exactamente con el banco.'}
        disabled={submitting}
      />

      {renderIdentityCard()}

      <TextField
        fullWidth
        size='small'
        multiline
        rows={2}
        label='Comentario (opcional)'
        value={form.notes}
        onChange={e => set('notes', e.target.value)}
        placeholder='¿Algo que finance debería saber? (ej. cuenta intermediaria)'
        disabled={submitting}
        inputProps={{ maxLength: 280 }}
      />
    </Stack>
  )

  const renderUnsetState = () => (
    <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
      <Box
        sx={{
          width: 56, height: 56, borderRadius: '50%',
          bgcolor: 'warning.lightOpacity',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          mb: 1.5
        }}
      >
        <i className='tabler-shield-x' style={{ fontSize: 28, color: 'var(--mui-palette-warning-main)' }} aria-hidden />
      </Box>
      <Typography variant='h6' sx={{ mb: 0.5 }}>Aún no podemos identificar tu régimen</Typography>
      <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
        {context?.unsetReason ?? 'Falta información en tu identidad legal y/o contrato laboral. Finance la completará primero, y luego podrás declarar tu cuenta de pago.'}
      </Typography>
      <Button
        variant='contained'
        startIcon={<i className='tabler-mail' />}
        href='mailto:finance@efeonce.org?subject=Regimen%20laboral%20pendiente'
      >
        Contactar finance
      </Button>
    </Box>
  )

  const renderBody = () => {
    if (contextLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      )
    }

    if (contextError) {
      return <Alert severity='error'>{contextError}</Alert>
    }

    if (!context) return null

    return (
      <>
        {renderRegimeBanner()}

        {context.regime === 'unset' ? (
          renderUnsetState()
        ) : context.regime === 'international' ? (
          renderInternationalForm()
        ) : (
          renderChileForm()
        )}

        {context.regime !== 'unset' && (
          <>
            <Divider sx={{ my: 2 }} />

            <Alert severity='info' icon={<i className='tabler-shield-lock' />} sx={{ '& .MuiAlert-message': { fontSize: '0.78rem' } }}>
              <Typography variant='caption' fontWeight={600} sx={{ display: 'block' }}>
                Esta solicitud entra como pendiente de revisión.
              </Typography>
              <Typography variant='caption' sx={{ display: 'block', mt: 0.5 }}>
                Finance valida los datos y elige el medio de envío más eficiente para tu régimen. Te avisamos por email cuando quede activa. Por seguridad, nunca podrás aprobar tu propio cambio.
              </Typography>
            </Alert>

            {submitError && (
              <Alert severity='error' sx={{ mt: 2 }}>
                {submitError}
              </Alert>
            )}
          </>
        )}
      </>
    )
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      {renderHeader()}
      <DialogContent dividers>{renderBody()}</DialogContent>
      <DialogActions>
        <Button variant='tonal' color='secondary' onClick={handleClose} disabled={submitting}>
          {context?.regime === 'unset' ? 'Cerrar' : 'Cancelar'}
        </Button>
        {context?.regime !== 'unset' && (
          <Button variant='contained' onClick={() => void handleSubmit()} disabled={submitting || contextLoading || !context}>
            {submitting ? 'Enviando…' : 'Enviar solicitud'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default RequestChangeDialog
