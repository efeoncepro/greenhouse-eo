'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Link from 'next/link'

import { toast } from 'sonner'

import Autocomplete from '@mui/material/Autocomplete'
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
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomTextField from '@core/components/mui/TextField'

import type { ShareholderAccountSummary, ShareholderMovementSourceSummary, ShareholderMovementSourceType } from './types'
import {
  formatDate,
  formatMoney,
  getBalanceMeta,
  getShareholderMovementSourceStatusMeta,
  getShareholderMovementSourceTypeMeta,
  normalizeShareholderMovementSource,
  SHAREHOLDER_MOVEMENT_SEARCHABLE_SOURCE_TYPES,
  SHAREHOLDER_MOVEMENT_SOURCE_TYPE_OPTIONS
} from './utils'

const GREENHOUSE_COPY = getMicrocopy()

type Props = {
  open: boolean
  accounts: ShareholderAccountSummary[]
  account: ShareholderAccountSummary | null
  initialSourceType?: ShareholderMovementSourceType | null
  initialSourceId?: string | null
  onClose: () => void
  onSuccess: () => void
}

const DIRECTION_OPTIONS = [
  { value: 'credit', label: 'Crédito', helper: 'La empresa le debe al accionista' },
  { value: 'debit', label: 'Débito', helper: 'El accionista le debe a la empresa' }
]

const MOVEMENT_TYPE_OPTIONS = [
  { value: 'expense_paid_by_shareholder', label: 'Gasto pagado por el accionista' },
  { value: 'personal_withdrawal', label: 'Retiro personal' },
  { value: 'reimbursement', label: 'Reembolso de la empresa' },
  { value: 'return_to_company', label: 'Devolución a la empresa' },
  { value: 'salary_advance', label: 'Adelanto de sueldo' },
  { value: 'capital_contribution', label: 'Aporte de capital' },
  { value: 'other', label: 'Otro' }
]

const CURRENCY_OPTIONS = ['CLP', 'USD']
const DEFAULT_SOURCE_TYPE: ShareholderMovementSourceType = 'manual'
const SOURCE_TYPE_OPTIONS = SHAREHOLDER_MOVEMENT_SOURCE_TYPE_OPTIONS.filter(option => option.value !== 'settlement_group')

const getToday = () => {
  const now = new Date()

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const buildSourceLabel = (source: ShareholderMovementSourceSummary | null) => {
  if (!source) {
    return ''
  }

  return source.sourceType === 'manual'
    ? source.label
    : `${source.label}${source.subtitle ? ` · ${source.subtitle}` : ''}`
}

const RegisterShareholderMovementDrawer = ({
  open,
  accounts,
  account,
  initialSourceType = null,
  initialSourceId = null,
  onClose,
  onSuccess
}: Props) => {
  const [selectedAccountId, setSelectedAccountId] = useState(account?.accountId ?? '')
  const [direction, setDirection] = useState<'credit' | 'debit'>('credit')
  const [movementType, setMovementType] = useState('expense_paid_by_shareholder')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('CLP')
  const [movementDate, setMovementDate] = useState(getToday())
  const [description, setDescription] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [sourceType, setSourceType] = useState<ShareholderMovementSourceType>(DEFAULT_SOURCE_TYPE)
  const [sourceQuery, setSourceQuery] = useState('')
  const [sourceOptions, setSourceOptions] = useState<ShareholderMovementSourceSummary[]>([])
  const [selectedSource, setSelectedSource] = useState<ShareholderMovementSourceSummary | null>(null)
  const [prefilledSourceId, setPrefilledSourceId] = useState<string | null>(null)
  const [sourceLoading, setSourceLoading] = useState(false)
  const [sourceLookupError, setSourceLookupError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedAccount = useMemo(
    () => account || accounts.find(item => item.accountId === selectedAccountId) || null,
    [account, accounts, selectedAccountId]
  )

  const sourceTypeMeta = useMemo(() => getShareholderMovementSourceTypeMeta(sourceType), [sourceType])

  const selectedSourceMeta = useMemo(
    () => getShareholderMovementSourceTypeMeta(selectedSource?.sourceType ?? sourceType),
    [selectedSource?.sourceType, sourceType]
  )

  useEffect(() => {
    if (open) {
      setSelectedAccountId(account?.accountId ?? '')
      setDirection('credit')
      setMovementType('expense_paid_by_shareholder')
      setAmount('')
      setCurrency(account?.currency ?? 'CLP')
      setMovementDate(getToday())
      setDescription('')
      setEvidenceUrl('')
      setSourceType(initialSourceType ?? DEFAULT_SOURCE_TYPE)
      setSourceQuery('')
      setSourceOptions([])
      setSelectedSource(null)
      setPrefilledSourceId(initialSourceType && initialSourceType !== 'manual' ? initialSourceId ?? null : null)
      setSourceLoading(false)
      setSourceLookupError(null)
      setError(null)
      setSaving(false)

      return
    }

    setSelectedAccountId('')
    setDirection('credit')
    setMovementType('expense_paid_by_shareholder')
    setAmount('')
    setCurrency('CLP')
    setMovementDate(getToday())
    setDescription('')
    setEvidenceUrl('')
    setSourceType(DEFAULT_SOURCE_TYPE)
    setSourceQuery('')
    setSourceOptions([])
    setSelectedSource(null)
    setPrefilledSourceId(null)
    setSourceLoading(false)
    setSourceLookupError(null)
    setError(null)
    setSaving(false)
  }, [account?.accountId, account?.currency, initialSourceId, initialSourceType, open])

  useEffect(() => {
    if (!open || sourceType === 'manual') {
      return
    }

    if (!initialSourceId || initialSourceType !== sourceType) {
      setSelectedSource(null)
      setSourceQuery('')
      setSourceOptions([])
      setSourceLoading(false)
      setSourceLookupError(null)

      return
    }

    const controller = new AbortController()

    const resolveSource = async () => {
      setSourceLoading(true)
      setSourceLookupError(null)
      setPrefilledSourceId(initialSourceId)

      try {
        const params = new URLSearchParams({
          sourceType,
          sourceId: initialSourceId
        })

        const res = await fetch(`/api/finance/shareholder-account/lookups/sources?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))

          setPrefilledSourceId(null)
          setSourceLookupError(body.error || 'No pudimos resolver el origen.')

          return
        }

        const body = await res.json().catch(() => ({}))

        if (body?.item && typeof body.item === 'object' && !Array.isArray(body.item)) {
          const resolved = normalizeShareholderMovementSource(body.item as Record<string, unknown>)

          setSelectedSource(resolved)
          setSourceQuery(buildSourceLabel(resolved))
          setSourceOptions([resolved])
          setPrefilledSourceId(resolved.sourceId)
        }
      } catch {
        if (!controller.signal.aborted) {
          setPrefilledSourceId(null)
          setSourceLookupError('No pudimos resolver el origen.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setSourceLoading(false)
        }
      }
    }

    void resolveSource()

    return () => controller.abort()
  }, [initialSourceId, initialSourceType, open, sourceType])

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    if (!open || !SHAREHOLDER_MOVEMENT_SEARCHABLE_SOURCE_TYPES.has(sourceType)) {
      setSelectedSource(null)
      setSourceQuery('')
      setSourceOptions([])
      setSourceLoading(false)
      setSourceLookupError(null)

      return
    }

    const query = sourceQuery.trim()

    if (query.length < 2) {
      setSourceOptions(selectedSource ? [selectedSource] : [])
      setSourceLoading(false)
      setSourceLookupError(null)

      return
    }

    if (selectedSource && query === buildSourceLabel(selectedSource)) {
      setSourceOptions([selectedSource])
      setSourceLoading(false)
      setSourceLookupError(null)

      return
    }

    const controller = new AbortController()

    debounceRef.current = setTimeout(async () => {
      setSourceLoading(true)
      setSourceLookupError(null)

      try {
        const params = new URLSearchParams({
          sourceType,
          q: query
        })

        const res = await fetch(`/api/finance/shareholder-account/lookups/sources?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))

          setSourceLookupError(body.error || 'No pudimos buscar orígenes.')
          setSourceOptions([])

          return
        }

        const body = await res.json().catch(() => ({}))

        const items = Array.isArray(body.items)
          ? body.items
              .filter((item: unknown): item is Record<string, unknown> => typeof item === 'object' && item !== null && !Array.isArray(item))
              .map((item: Record<string, unknown>) => normalizeShareholderMovementSource(item))
          : []

        setSourceOptions(items)
      } catch {
        if (!controller.signal.aborted) {
          setSourceLookupError('No pudimos buscar orígenes.')
          setSourceOptions([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setSourceLoading(false)
        }
      }
    }, 300)

    return () => {
      controller.abort()

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [open, selectedSource, sourceQuery, sourceType])

  useEffect(() => () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
  }, [])

  const handleSourceTypeChange = useCallback((nextSourceType: ShareholderMovementSourceType) => {
    setSourceType(nextSourceType)
    setSelectedSource(null)
    setPrefilledSourceId(null)
    setSourceQuery('')
    setSourceOptions([])
    setSourceLookupError(null)
  }, [])

  const handleSourceSelect = useCallback((source: ShareholderMovementSourceSummary | null) => {
    setSelectedSource(source)
    setPrefilledSourceId(source?.sourceId ?? null)
    setSourceQuery(source ? buildSourceLabel(source) : '')
    setSourceOptions(source ? [source] : [])
    setSourceLookupError(null)
  }, [])

  const handleSubmit = async () => {
    if (!selectedAccountId) {
      setError('Selecciona una cuenta corriente.')

      return
    }

    if (!amount.trim() || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setError('Ingresa un monto mayor a cero.')

      return
    }

    if (!movementDate) {
      setError('Selecciona una fecha para el movimiento.')

      return
    }

    if (sourceType !== 'manual' && !selectedSource?.sourceId && !prefilledSourceId) {
      setError('Selecciona un origen canónico para continuar.')

      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/finance/shareholder-account/${selectedAccountId}/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction,
          movementType,
          amount: Number(amount),
          currency,
          movementDate,
          description: description.trim() || null,
          evidenceUrl: evidenceUrl.trim() || null,
          sourceType,
          sourceId: selectedSource?.sourceId || prefilledSourceId || null
        })
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))

        setError(body.error || 'No pudimos registrar el movimiento.')

        return
      }

      toast.success('Movimiento registrado.')
      onSuccess()
      onClose()
    } catch {
      setError('No pudimos conectar con Finance. Intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  const balanceMeta = selectedAccount ? getBalanceMeta(selectedAccount.balanceClp) : null

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 520 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Box>
          <Typography variant='h6'>Registrar movimiento</Typography>
          <Typography variant='body2' color='text.secondary'>
            Carga un cargo o abono bilateral sobre la cuenta corriente accionista.
          </Typography>
        </Box>
        <IconButton size='small' onClick={onClose} aria-label='Cerrar'>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error ? <Alert severity='error'>{error}</Alert> : null}

        {selectedAccount ? (
          <Alert severity='info'>
            <strong>{selectedAccount.accountName}</strong> · {selectedAccount.shareholderName} · {balanceMeta?.label.toLowerCase()}{' '}
            {formatMoney(selectedAccount.balanceClp, selectedAccount.currency)}
          </Alert>
        ) : (
          <Alert severity='warning'>
            Selecciona una cuenta para registrar el movimiento.
          </Alert>
        )}

        {!account ? (
          <CustomTextField
            select
            fullWidth
            label='Cuenta corriente'
            value={selectedAccountId}
            onChange={event => setSelectedAccountId(event.target.value)}
          >
            {accounts.map(option => (
              <MenuItem key={option.accountId} value={option.accountId}>
                {option.accountName} · {option.shareholderName}
              </MenuItem>
            ))}
          </CustomTextField>
        ) : null}

        <Stack spacing={1.5}>
          <CustomTextField
            select
            fullWidth
            label='Origen canónico'
            value={sourceType}
            onChange={event => handleSourceTypeChange(event.target.value as ShareholderMovementSourceType)}
          >
            {SOURCE_TYPE_OPTIONS.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </CustomTextField>
          <Typography variant='caption' color='text.secondary'>
            {sourceType === 'manual'
              ? 'Movimiento sin documento de origen. Úsalo solo cuando no exista una trazabilidad canónica.'
              : `Busca el ${sourceTypeMeta.label.toLowerCase()} real antes de registrar el movimiento.`}
          </Typography>
        </Stack>

        {sourceType !== 'manual' ? (
          <Stack spacing={1.5}>
            <Autocomplete
              options={sourceOptions}
              value={selectedSource}
              inputValue={sourceQuery}
              loading={sourceLoading}
              onChange={(_event, value) => handleSourceSelect(value)}
              onInputChange={(_event, value, reason) => {
                if (reason === 'input') {
                  setSourceQuery(value)

                  if (selectedSource?.label !== value) {
                    setSelectedSource(null)
                    setPrefilledSourceId(null)
                  }
                }
              }}
              getOptionLabel={option => option.label}
              isOptionEqualToValue={(option, value) => option.sourceType === value.sourceType && option.sourceId === value.sourceId}
              noOptionsText={sourceQuery.trim().length < 2 ? 'Escribe al menos 2 caracteres para buscar.' : 'Sin resultados.'}
              loadingText='Buscando orígenes...'
              renderInput={params => (
                <CustomTextField
                  {...params}
                  fullWidth
                  label='Buscar origen'
                  placeholder='ID, referencia, cliente, proveedor...'
                  helperText={sourceTypeMeta.helper}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {sourceLoading ? <CircularProgress color='inherit' size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    )
                  }}
                />
              )}
              renderOption={(props, option) => {
                const typeMeta = getShareholderMovementSourceTypeMeta(option.sourceType)
                const statusMeta = getShareholderMovementSourceStatusMeta(option.status)

                return (
                  <li {...props} key={`${option.sourceType}:${option.sourceId ?? option.label}`}>
                    <Stack spacing={0.5} sx={{ py: 0.5, width: '100%' }}>
                      <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
                        <Typography variant='body2' fontWeight={700}>
                          {option.label}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {typeMeta.label}
                        </Typography>
                      </Stack>
                      {option.subtitle ? (
                        <Typography variant='caption' color='text.secondary'>
                          {option.subtitle}
                        </Typography>
                      ) : null}
                      <Stack direction='row' spacing={1} flexWrap='wrap' alignItems='center'>
                        {option.amount !== null && option.currency ? (
                          <Typography variant='caption' color='text.secondary'>
                            {formatMoney(option.amount, option.currency)}
                          </Typography>
                        ) : null}
                        {option.date ? (
                          <Typography variant='caption' color='text.secondary'>
                            {formatDate(option.date)}
                          </Typography>
                        ) : null}
                        {option.status ? (
                          <Typography variant='caption' color='text.secondary'>
                            {statusMeta.label}
                          </Typography>
                        ) : null}
                      </Stack>
                    </Stack>
                  </li>
                )
              }}
            />

            {sourceLookupError ? <Alert severity='warning'>{sourceLookupError}</Alert> : null}

            <Box
              sx={{
                border: theme => `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                p: 3,
                bgcolor: 'background.paper'
              }}
            >
              <Stack spacing={1.25}>
                <Typography variant='subtitle2'>Origen seleccionado</Typography>
                {selectedSource ? (
                  <>
                    <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
                      <Typography variant='body2' fontWeight={700}>
                        {selectedSource.label}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {selectedSourceMeta.label}
                      </Typography>
                    </Stack>
                    {selectedSource.subtitle ? (
                      <Typography variant='body2' color='text.secondary'>
                        {selectedSource.subtitle}
                      </Typography>
                    ) : null}
                    <Stack direction='row' spacing={2} flexWrap='wrap'>
                      {selectedSource.amount !== null && selectedSource.currency ? (
                        <Typography variant='caption' color='text.secondary'>
                          {formatMoney(selectedSource.amount, selectedSource.currency)}
                        </Typography>
                      ) : null}
                      {selectedSource.date ? (
                        <Typography variant='caption' color='text.secondary'>
                          {formatDate(selectedSource.date)}
                        </Typography>
                      ) : null}
                      {selectedSource.status ? (
                        <Typography variant='caption' color='text.secondary'>
                          {getShareholderMovementSourceStatusMeta(selectedSource.status).label}
                        </Typography>
                      ) : null}
                    </Stack>
                    {selectedSource.href ? (
                      <Button
                        component={Link}
                        href={selectedSource.href}
                        size='small'
                        variant='text'
                        sx={{ alignSelf: 'flex-start', px: 0 }}
                      >
                        Abrir origen
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <Typography variant='body2' color='text.secondary'>
                    Elige un origen para dejar la trazabilidad lista antes de guardar.
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>
        ) : (
          <Alert severity='info'>
            El movimiento quedará como manual. Usa esta vía solo cuando no exista un documento de origen que enlazar.
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              label='Dirección'
              value={direction}
              onChange={event => setDirection(event.target.value as 'credit' | 'debit')}
            >
              {DIRECTION_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              label='Tipo de movimiento'
              value={movementType}
              onChange={event => setMovementType(event.target.value)}
            >
              {MOVEMENT_TYPE_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              label='Monto'
              value={amount}
              onChange={event => setAmount(event.target.value)}
              placeholder='0'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              label='Moneda'
              value={currency}
              onChange={event => setCurrency(event.target.value)}
            >
              {CURRENCY_OPTIONS.map(option => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
        </Grid>

        <CustomTextField
          fullWidth
          type='date'
          label='Fecha del movimiento'
          value={movementDate}
          onChange={event => setMovementDate(event.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <CustomTextField
          fullWidth
          multiline
          minRows={3}
          label='Descripción'
          value={description}
          onChange={event => setDescription(event.target.value)}
          placeholder='Explica el origen o la razón del movimiento'
        />

        <CustomTextField
          fullWidth
          label='URL de evidencia'
          value={evidenceUrl}
          onChange={event => setEvidenceUrl(event.target.value)}
          placeholder='https://...'
        />

        <Stack direction='row' spacing={3} justifyContent='flex-end'>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={saving}>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button variant='contained' onClick={handleSubmit} disabled={saving || !accounts.length}>
            {saving ? 'Guardando...' : 'Registrar movimiento'}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  )
}

export default RegisterShareholderMovementDrawer
