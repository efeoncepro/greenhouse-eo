'use client'

// TASK-749 — Dialog para crear un nuevo perfil de pago.
// El backend rechaza con codes especificos: validation, conflict, capability.

import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import MenuItem from '@mui/material/MenuItem'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'

import { toast } from 'sonner'

import { getMicrocopy } from '@/lib/copy'

import CustomTextField from '@core/components/mui/TextField'
import type {
  BeneficiaryPaymentProfileBeneficiaryType,
  BeneficiaryPaymentProfileCurrency,
  BeneficiaryPaymentProfilePaymentMethod
} from '@/types/payment-profiles'

const GREENHOUSE_COPY = getMicrocopy()

interface CreateProfileDialogProps {
  open: boolean
  onClose: () => void
  onCreated: () => void | Promise<void>
  /**
   * Cuando se monta dentro de Person 360 / Shareholder 360, el beneficiario
   * ya esta determinado por el contexto. Lockeamos esos campos en lugar de
   * pedirlos al usuario.
   */
  prefillBeneficiary?: {
    beneficiaryType: BeneficiaryPaymentProfileBeneficiaryType
    beneficiaryId: string
    beneficiaryName?: string | null
    countryCode?: string | null
  }
}

// V1: lista hardcodeada. V2: cargar del catalog en API.
const PROVIDER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'bci', label: 'BCI' },
  { value: 'banco-chile', label: 'Banco de Chile' },
  { value: 'santander', label: 'Santander' },
  { value: 'banco-estado', label: 'BancoEstado' },
  { value: 'itau', label: 'Itau' },
  { value: 'scotiabank', label: 'Scotiabank' },
  { value: 'deel', label: 'Deel' },
  { value: 'wise', label: 'Wise' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'mercadopago', label: 'Mercado Pago' },
  { value: 'global66', label: 'Global66' },
  { value: 'other', label: 'Otro' }
]

const PAYMENT_METHODS: Array<{ value: BeneficiaryPaymentProfilePaymentMethod; label: string }> = [
  { value: 'bank_transfer', label: 'Transferencia bancaria' },
  { value: 'wire', label: 'Wire transfer' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'wise', label: 'Wise' },
  { value: 'deel', label: 'Deel' },
  { value: 'global66', label: 'Global66' },
  { value: 'manual_cash', label: 'Efectivo manual' },
  { value: 'check', label: 'Cheque' },
  { value: 'sii_pec', label: 'SII / PEC' },
  { value: 'other', label: 'Otro' }
]

const CreateProfileDialog = ({
  open,
  onClose,
  onCreated,
  prefillBeneficiary
}: CreateProfileDialogProps) => {
  const [beneficiaryType, setBeneficiaryType] =
    useState<BeneficiaryPaymentProfileBeneficiaryType>(prefillBeneficiary?.beneficiaryType ?? 'member')

  const [beneficiaryId, setBeneficiaryId] = useState(prefillBeneficiary?.beneficiaryId ?? '')
  const [beneficiaryName, setBeneficiaryName] = useState(prefillBeneficiary?.beneficiaryName ?? '')
  const [currency, setCurrency] = useState<BeneficiaryPaymentProfileCurrency>('CLP')
  const [countryCode, setCountryCode] = useState('')
  const [providerSlug, setProviderSlug] = useState('')

  const [paymentMethod, setPaymentMethod] =
    useState<BeneficiaryPaymentProfilePaymentMethod>('bank_transfer')

  const [accountHolderName, setAccountHolderName] = useState('')
  const [accountNumberFull, setAccountNumberFull] = useState('')
  const [bankName, setBankName] = useState('')
  const [routingReference, setRoutingReference] = useState('')
  const [notes, setNotes] = useState('')
  const [requireApproval, setRequireApproval] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setBeneficiaryType(prefillBeneficiary?.beneficiaryType ?? 'member')
      setBeneficiaryId(prefillBeneficiary?.beneficiaryId ?? '')
      setBeneficiaryName(prefillBeneficiary?.beneficiaryName ?? '')
      setCurrency('CLP')
      setCountryCode(prefillBeneficiary?.countryCode ?? '')
      setProviderSlug('')
      setPaymentMethod('bank_transfer')
      setAccountHolderName(prefillBeneficiary?.beneficiaryName ?? '')
      setAccountNumberFull('')
      setBankName('')
      setRoutingReference('')
      setNotes('')
      setRequireApproval(true)
    }
  }, [open, prefillBeneficiary])

  const handleSubmit = async () => {
    if (!beneficiaryId.trim()) {
      toast.error('Ingresa el ID del beneficiario para continuar')

      return
    }

    if (!providerSlug) {
      toast.error('Selecciona un provider para continuar')

      return
    }

    setSubmitting(true)

    try {
      const r = await fetch('/api/admin/finance/payment-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beneficiaryType,
          beneficiaryId: beneficiaryId.trim(),
          beneficiaryName: beneficiaryName.trim() || undefined,
          currency,
          countryCode: countryCode.trim() ? countryCode.trim().toUpperCase() : undefined,
          providerSlug,
          paymentMethod,
          accountHolderName: accountHolderName.trim() || undefined,
          accountNumberFull: accountNumberFull.trim() || undefined,
          bankName: bankName.trim() || undefined,
          routingReference: routingReference.trim() || undefined,
          notes: notes.trim() || undefined,
          requireApproval
        })
      })

      const json = await r.json().catch(() => ({}))

      if (!r.ok) {
        toast.error(json.error ?? 'No fue posible crear el perfil')

        return
      }

      await onCreated()
    } catch (e) {
      console.error(e)
      toast.error('Error de red al crear el perfil')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Crear perfil de pago</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={4}>
          {prefillBeneficiary ? (
            <Stack
              spacing={1}
              sx={theme => ({
                p: 2,
                borderRadius: 1,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.action.hover
              })}
            >
              <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Beneficiario
              </Typography>
              <Typography variant='subtitle2'>
                {prefillBeneficiary.beneficiaryName ?? prefillBeneficiary.beneficiaryId}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {prefillBeneficiary.beneficiaryType === 'member' ? 'Colaborador' : 'Accionista'} · {prefillBeneficiary.beneficiaryId}
              </Typography>
            </Stack>
          ) : (
            <>
              <FormControl>
                <FormLabel id='beneficiary-type-label'>Tipo de beneficiario</FormLabel>
                <RadioGroup
                  row
                  aria-labelledby='beneficiary-type-label'
                  value={beneficiaryType}
                  onChange={e =>
                    setBeneficiaryType(e.target.value as BeneficiaryPaymentProfileBeneficiaryType)
                  }
                >
                  <FormControlLabel value='member' control={<Radio />} label='Colaborador' />
                  <FormControlLabel value='shareholder' control={<Radio />} label='Accionista' />
                </RadioGroup>
              </FormControl>

              <CustomTextField
                label='ID del beneficiario'
                fullWidth
                required
                value={beneficiaryId}
                onChange={e => setBeneficiaryId(e.target.value)}
                helperText='ID del miembro o identity_profile (autocompletado disponible en una proxima version)'
              />

              <CustomTextField
                label='Nombre del beneficiario'
                fullWidth
                value={beneficiaryName}
                onChange={e => setBeneficiaryName(e.target.value)}
                helperText='Opcional. Se rellena automaticamente desde el directorio si esta disponible.'
              />
            </>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
            <FormControl sx={{ flex: 1 }}>
              <FormLabel id='currency-label'>Moneda</FormLabel>
              <RadioGroup
                row
                aria-labelledby='currency-label'
                value={currency}
                onChange={e => setCurrency(e.target.value as BeneficiaryPaymentProfileCurrency)}
              >
                <FormControlLabel value='CLP' control={<Radio />} label='CLP' />
                <FormControlLabel value='USD' control={<Radio />} label='USD' />
              </RadioGroup>
            </FormControl>

            <CustomTextField
              label='Pais (codigo de 2 letras)'
              value={countryCode}
              onChange={e => setCountryCode(e.target.value.slice(0, 2))}
              helperText='Opcional. Ej: CL, US, AR.'
              sx={{ flex: 1 }}
              inputProps={{ maxLength: 2, style: { textTransform: 'uppercase' } }}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
            <CustomTextField
              select
              label='Provider'
              fullWidth
              required
              value={providerSlug}
              onChange={e => setProviderSlug(e.target.value)}
              helperText='Banco o procesador que opera el pago'
            >
              <MenuItem value=''>
                <Typography variant='body2' color='text.secondary'>
                  Selecciona un provider
                </Typography>
              </MenuItem>
              {PROVIDER_OPTIONS.map(p => (
                <MenuItem key={p.value} value={p.value}>
                  {p.label}
                </MenuItem>
              ))}
            </CustomTextField>

            <CustomTextField
              select
              label='Metodo de pago'
              fullWidth
              value={paymentMethod}
              onChange={e =>
                setPaymentMethod(e.target.value as BeneficiaryPaymentProfilePaymentMethod)
              }
            >
              {PAYMENT_METHODS.map(m => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </CustomTextField>
          </Stack>

          <CustomTextField
            label='Titular de la cuenta'
            fullWidth
            value={accountHolderName}
            onChange={e => setAccountHolderName(e.target.value)}
            helperText='Opcional. Nombre que figura como titular en la cuenta destino.'
          />

          <CustomTextField
            label='Numero de cuenta'
            fullWidth
            value={accountNumberFull}
            onChange={e => setAccountNumberFull(e.target.value)}
            helperText='Se enmascara al guardar. Solo visible con permiso de revelar datos sensibles.'
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
            <CustomTextField
              label='Banco'
              fullWidth
              value={bankName}
              onChange={e => setBankName(e.target.value)}
            />
            <CustomTextField
              label='Referencia de routing'
              fullWidth
              value={routingReference}
              onChange={e => setRoutingReference(e.target.value)}
              helperText='Opcional. SWIFT, ABA, IBAN o equivalente.'
            />
          </Stack>

          <CustomTextField
            label='Notas'
            fullWidth
            multiline
            minRows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />

          <FormControlLabel
            control={
              <Switch
                checked={requireApproval}
                onChange={e => setRequireApproval(e.target.checked)}
              />
            }
            label={
              <Stack spacing={0.25}>
                <Typography variant='body2'>Requiere aprobacion (maker-checker)</Typography>
                <Typography variant='caption' color='text.secondary'>
                  Recomendado: dejalo activo para auditar cambios sensibles.
                </Typography>
              </Stack>
            }
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>{GREENHOUSE_COPY.actions.cancel}</Button>
        <Button variant='contained' onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Creando…' : 'Crear perfil'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CreateProfileDialog
