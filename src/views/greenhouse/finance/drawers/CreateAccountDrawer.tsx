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
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomTextField from '@core/components/mui/TextField'

const GREENHOUSE_COPY = getMicrocopy()

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Cuenta corriente',
  savings: 'Cuenta de ahorro',
  paypal: 'PayPal',
  wise: 'Wise',
  other: 'Otro'
}

const ACCOUNT_TYPES = Object.keys(ACCOUNT_TYPE_LABELS)

const CURRENCIES = ['CLP', 'USD']

const BANKS = [
  'BCI',
  'Banco de Chile',
  'BancoEstado',
  'Santander',
  'Scotiabank',
  'Itaú',
  'BICE',
  'Security',
  'Falabella',
  'Ripley',
  'Otro'
]

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

const CreateAccountDrawer = ({ open, onClose, onSuccess }: Props) => {
  const [accountId, setAccountId] = useState('')
  const [accountName, setAccountName] = useState('')
  const [bankName, setBankName] = useState('')
  const [currency, setCurrency] = useState('CLP')
  const [accountType, setAccountType] = useState('checking')
  const [accountNumber, setAccountNumber] = useState('')
  const [openingBalance, setOpeningBalance] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setAccountId('')
    setAccountName('')
    setBankName('')
    setCurrency('CLP')
    setAccountType('checking')
    setAccountNumber('')
    setOpeningBalance('')
    setNotes('')
    setError(null)
  }

  const generateAccountId = (name: string, cur: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .concat(`-${cur.toLowerCase()}`)
  }

  const handleNameChange = (value: string) => {
    setAccountName(value)

    if (!accountId || accountId === generateAccountId(accountName, currency)) {
      setAccountId(generateAccountId(value, currency))
    }
  }

  const handleSubmit = async () => {
    if (!accountName.trim()) {
      setError('Ingresa un nombre para la cuenta.')

      return
    }

    if (!bankName) {
      setError('Selecciona un banco.')

      return
    }

    if (!accountId.trim()) {
      setError('Ingresa un identificador para la cuenta.')

      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/finance/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: accountId.trim(),
          accountName: accountName.trim(),
          bankName: bankName.trim(),
          currency,
          accountType,
          ...(accountNumber.trim() && { accountNumber: accountNumber.trim() }),
          ...(openingBalance && { openingBalance: Number(openingBalance) }),
          ...(notes.trim() && { notes: notes.trim() })
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al crear la cuenta.')
        setSaving(false)

        return
      }

      toast.success('Cuenta bancaria creada')
      resetForm()
      onClose()
      onSuccess()
    } catch {
      setError('Error de conexion')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 400 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Typography variant='h6'>Registrar cuenta bancaria</Typography>
        <IconButton onClick={onClose} size='small' aria-label='Cerrar'>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Nombre de la cuenta'
              value={accountName}
              onChange={e => handleNameChange(e.target.value)}
              required
              placeholder='ej. BCI Cuenta Corriente CLP'
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Banco'
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              required
            >
              <MenuItem value=''>—</MenuItem>
              {BANKS.map(b => (
                <MenuItem key={b} value={b}>{b}</MenuItem>
              ))}
            </CustomTextField>
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
              select
              fullWidth
              size='small'
              label='Tipo de cuenta'
              value={accountType}
              onChange={e => setAccountType(e.target.value)}
            >
              {ACCOUNT_TYPES.map(t => (
                <MenuItem key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</MenuItem>
              ))}
            </CustomTextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='N° de cuenta'
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Identificador'
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              required
              helperText='Se genera automaticamente. Puedes editarlo.'
              sx={{ '& input': { fontSize: '0.85rem' } }}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Saldo inicial'
              type='number'
              value={openingBalance}
              onChange={e => setOpeningBalance(e.target.value)}
              helperText='Saldo actual o al momento de registrar la cuenta'
            />
          </Grid>

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
      </Stack>

      <Divider />
      <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
        <Button variant='outlined' color='secondary' onClick={onClose} fullWidth>{GREENHOUSE_COPY.actions.cancel}</Button>
        <Button
          variant='contained'
          color='primary'
          onClick={handleSubmit}
          disabled={saving}
          fullWidth
          startIcon={saving ? <CircularProgress size={16} color='inherit' /> : undefined}
        >
          {saving ? 'Creando...' : 'Crear cuenta'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default CreateAccountDrawer
