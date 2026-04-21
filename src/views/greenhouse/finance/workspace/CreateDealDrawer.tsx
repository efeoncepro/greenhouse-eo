'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  Box,
  Button,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { toast } from 'react-toastify'

import useCreateDeal, { type CreateDealResponse } from '@/hooks/useCreateDeal'

// TASK-539: drawer used from the Quote Builder to create a HubSpot deal
// inline, without bouncing to the CRM. Minimal form on purpose — pipeline +
// stage + owner defaults come from the Cloud Run service (BU-aware). The
// drawer is optimistic but waits for the HTTP 201/202 before closing; the
// caller receives the full response via `onSuccess` so it can refresh the
// deal selector and bind the new `hubspotDealId` to the quote form.

export interface CreateDealDrawerProps {
  open: boolean
  onClose: () => void
  organizationId: string
  organizationName?: string | null
  quotationId?: string | null
  defaultCurrency?: 'CLP' | 'USD' | 'CLF' | 'COP' | 'MXN' | 'PEN' | null
  defaultBusinessLineCode?: string | null
  onSuccess: (response: CreateDealResponse) => void
}

const CURRENCY_OPTIONS = ['CLP', 'USD', 'CLF', 'COP', 'MXN', 'PEN'] as const

type CurrencyOption = (typeof CURRENCY_OPTIONS)[number]

const parseAmountInput = (raw: string): number | null => {
  if (!raw.trim()) return null
  const normalized = raw.replace(/\./g, '').replace(',', '.').trim()
  const parsed = Number(normalized)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

const estimateAmountClp = (amount: number | null, currency: CurrencyOption): number | null => {
  if (amount === null) return null
  if (currency === 'CLP') return Math.round(amount)

  // Approximation only — the Cloud Run service re-fetches FX on its side
  // before persisting. This keeps the UI responsive while typing.
  const approxRates: Record<Exclude<CurrencyOption, 'CLP'>, number> = {
    USD: 950,
    CLF: 38_000,
    COP: 0.22,
    MXN: 55,
    PEN: 250
  }

  const rate = approxRates[currency as Exclude<CurrencyOption, 'CLP'>]

  return rate ? Math.round(amount * rate) : null
}

const CreateDealDrawer = ({
  open,
  onClose,
  organizationId,
  organizationName,
  quotationId,
  defaultCurrency,
  onSuccess
}: CreateDealDrawerProps) => {
  const { create, loading, error, reset } = useCreateDeal()

  const [dealName, setDealName] = useState('')
  const [amount, setAmount] = useState('')

  const [currency, setCurrency] = useState<CurrencyOption>(
    (defaultCurrency as CurrencyOption | undefined) ?? 'CLP'
  )

  // Rehydrate defaults when the drawer reopens.
  useEffect(() => {
    if (open) {
      setDealName(organizationName ? `${organizationName} — Nuevo deal` : '')
      setAmount('')
      setCurrency((defaultCurrency as CurrencyOption | undefined) ?? 'CLP')
      reset()
    }
  }, [open, organizationName, defaultCurrency, reset])

  const parsedAmount = useMemo(() => parseAmountInput(amount), [amount])
  const parsedAmountClp = useMemo(() => estimateAmountClp(parsedAmount, currency), [parsedAmount, currency])

  const exceedsApprovalThreshold = parsedAmountClp !== null && parsedAmountClp > 50_000_000

  const disableSubmit = loading || dealName.trim().length === 0

  const handleSubmit = async () => {
    if (disableSubmit) return

    const response = await create({
      organizationId,
      dealName: dealName.trim(),
      amount: parsedAmount,
      amountClp: parsedAmountClp,
      currency,
      quotationId: quotationId ?? null
    })

    if (!response) {
      // Error state already captured by the hook; surface via toast.
      toast.error(error?.message ?? 'No se pudo crear el deal.')

      return
    }

    if (response.status === 'completed') {
      toast.success(
        response.organizationPromoted
          ? 'Deal creado. Organización promovida a oportunidad.'
          : 'Deal creado en HubSpot.'
      )
      onSuccess(response)
      onClose()

      return
    }

    if (response.status === 'pending_approval') {
      toast.info('Deal sobre umbral: solicitud de aprobación creada.')
      onSuccess(response)
      onClose()

      return
    }

    if (response.status === 'endpoint_not_deployed') {
      toast.warning(
        'La integración HubSpot /deals aún no está disponible. El intento quedó registrado.'
      )
      onSuccess(response)
      onClose()

      return
    }

    toast.info(`Intento registrado (${response.status}). Ver consola de soporte.`)
    onSuccess(response)
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={() => (loading ? undefined : onClose())}
      PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ px: 4, py: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant='h6'>Crear deal nuevo</Typography>
            <Typography variant='caption' color='text.secondary'>
              Vincúlalo a {organizationName ?? 'esta organización'} sin salir del cotizador.
            </Typography>
          </Box>
          <IconButton
            onClick={() => (loading ? undefined : onClose())}
            aria-label='Cerrar'
            size='small'
          >
            <i className='tabler-x' />
          </IconButton>
        </Box>

        <Divider />

        <Box sx={{ p: 4, flex: 1, overflowY: 'auto' }}>
          <Stack spacing={3}>
            <TextField
              label='Nombre del deal'
              placeholder='Ej: Campaña Q3 2026'
              value={dealName}
              onChange={event => setDealName(event.target.value)}
              required
              fullWidth
              autoFocus
              helperText='El nombre aparece en HubSpot y en el pipeline comercial.'
            />

            <Stack direction='row' spacing={2}>
              <TextField
                label='Monto estimado'
                placeholder='0'
                value={amount}
                onChange={event => setAmount(event.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position='start'>$</InputAdornment>
                }}
                helperText={
                  parsedAmountClp !== null && currency !== 'CLP'
                    ? `≈ CLP ${parsedAmountClp.toLocaleString('es-CL')}`
                    : 'Opcional. Ajustable luego en HubSpot.'
                }
              />
              <FormControl sx={{ minWidth: 110 }}>
                <TextField
                  select
                  label='Moneda'
                  value={currency}
                  onChange={event => setCurrency(event.target.value as CurrencyOption)}
                >
                  {CURRENCY_OPTIONS.map(option => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </FormControl>
            </Stack>

            {exceedsApprovalThreshold ? (
              <Box
                sx={{
                  borderRadius: 1,
                  border: theme => `1px solid ${theme.palette.warning.main}`,
                  bgcolor: 'warning.lighter',
                  color: 'warning.darker',
                  px: 2.5,
                  py: 1.5
                }}
              >
                <Typography variant='subtitle2' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <i className='tabler-alert-triangle' />
                  Este deal requiere aprobación
                </Typography>
                <Typography variant='caption'>
                  Supera los CLP 50.000.000. Al enviar se crea una solicitud de aprobación en vez
                  del deal directo.
                </Typography>
              </Box>
            ) : null}

            {error ? (
              <Box
                sx={{
                  borderRadius: 1,
                  border: theme => `1px solid ${theme.palette.error.main}`,
                  bgcolor: 'error.lighter',
                  color: 'error.darker',
                  px: 2.5,
                  py: 1.5
                }}
              >
                <Typography variant='subtitle2'>{error.message}</Typography>
                {error.retryAfterSeconds ? (
                  <Typography variant='caption'>
                    Reintenta en {error.retryAfterSeconds} segundos.
                  </Typography>
                ) : null}
              </Box>
            ) : null}
          </Stack>
        </Box>

        <Divider />

        <Box sx={{ px: 4, py: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant='outlined' color='secondary' disabled={loading} onClick={() => onClose()}>
            Cancelar
          </Button>
          <Button
            variant='contained'
            color='primary'
            disabled={disableSubmit}
            onClick={handleSubmit}
            startIcon={loading ? <i className='tabler-loader-2 tabler-spin' /> : <i className='tabler-briefcase-2' />}
          >
            {loading ? 'Creando…' : exceedsApprovalThreshold ? 'Solicitar aprobación' : 'Crear deal y asociar'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}

export default CreateDealDrawer
