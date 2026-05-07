'use client'

import { useCallback, useEffect, useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import ListSubheader from '@mui/material/ListSubheader'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomTextField from '@core/components/mui/TextField'
import CreateAccountDrawer from '@views/greenhouse/finance/drawers/CreateAccountDrawer'

const GREENHOUSE_COPY = getMicrocopy()

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccountOption {
  accountId: string
  accountName: string
  currency: string
}

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTH_OPTIONS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' }
]

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CreateReconciliationPeriodDrawer = ({ open, onClose, onSuccess }: Props) => {
  const [accountId, setAccountId] = useState('')
  const [year, setYear] = useState(String(currentYear))
  const [month, setMonth] = useState(String(currentMonth))
  const [openingBalance, setOpeningBalance] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false)

  const ADD_NEW_ACCOUNT = '__ADD_NEW__'

  const fetchAccounts = useCallback(async () => {
    setLoadingAccounts(true)

    try {
      const res = await fetch('/api/finance/accounts')

      if (res.ok) {
        const data = await res.json()

        setAccounts(
          (data.items ?? []).map((a: { accountId: string; accountName: string; currency: string }) => ({
            accountId: a.accountId,
            accountName: a.accountName,
            currency: a.currency
          }))
        )
      }
    } finally {
      setLoadingAccounts(false)
    }
  }, [])

  useEffect(() => {
    if (open && accounts.length === 0) {
      fetchAccounts()
    }
  }, [open, accounts.length, fetchAccounts])

  const handleAccountChange = (value: string) => {
    if (value === ADD_NEW_ACCOUNT) {
      setAccountDrawerOpen(true)

      return
    }

    setAccountId(value)
  }

  const handleAccountCreated = () => {
    setAccountDrawerOpen(false)
    setAccounts([])
    fetchAccounts()
  }

  const resetForm = () => {
    setAccountId('')
    setYear(String(currentYear))
    setMonth(String(currentMonth))
    setOpeningBalance('')
    setNotes('')
    setError(null)
  }

  const handleSubmit = async () => {
    if (!accountId) {
      setError('Selecciona una cuenta bancaria.')

      return
    }

    const yearNum = Number(year)
    const monthNum = Number(month)

    if (!yearNum || yearNum < 2020 || yearNum > 2100) {
      setError('Ingresa un año valido.')

      return
    }

    if (!monthNum || monthNum < 1 || monthNum > 12) {
      setError('Selecciona un mes.')

      return
    }

    const balance = Number(openingBalance)

    if (openingBalance && isNaN(balance)) {
      setError('El saldo de apertura debe ser un numero.')

      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/finance/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          year: yearNum,
          month: monthNum,
          openingBalance: openingBalance ? balance : 0,
          ...(notes.trim() && { notes: notes.trim() })
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al crear el periodo de conciliacion.')
        setSaving(false)

        return
      }

      toast.success('Periodo de conciliacion creado')
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
    <>
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 400 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Typography variant='h6'>Nuevo periodo de conciliacion</Typography>
        <IconButton onClick={onClose} size='small' aria-label={GREENHOUSE_COPY.actions.close}>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Cuenta bancaria'
              value={accountId}
              onChange={e => handleAccountChange(e.target.value)}
              required
              disabled={loadingAccounts}
            >
              <MenuItem value=''>{loadingAccounts ? 'Cargando cuentas...' : '— Seleccionar cuenta —'}</MenuItem>
              {accounts.map(acc => (
                <MenuItem key={acc.accountId} value={acc.accountId}>
                  {acc.accountName} ({acc.currency})
                </MenuItem>
              ))}
              <ListSubheader sx={{ p: 0 }}>
                <Divider />
              </ListSubheader>
              <MenuItem value={ADD_NEW_ACCOUNT} sx={{ color: 'primary.main', fontWeight: 600 }}>
                <i className='tabler-plus' style={{ marginRight: 8, fontSize: 18 }} />
                Crear cuenta bancaria
              </MenuItem>
            </CustomTextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Mes'
              value={month}
              onChange={e => setMonth(e.target.value)}
              required
            >
              {MONTH_OPTIONS.map(m => (
                <MenuItem key={m.value} value={String(m.value)}>{m.label}</MenuItem>
              ))}
            </CustomTextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Año'
              type='number'
              value={year}
              onChange={e => setYear(e.target.value)}
              required
              slotProps={{ htmlInput: { min: 2020, max: 2100 } }}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Saldo de apertura'
              type='number'
              value={openingBalance}
              onChange={e => setOpeningBalance(e.target.value)}
              helperText='Saldo del extracto al inicio del periodo'
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
          {saving ? 'Creando...' : 'Crear periodo'}
        </Button>
      </Box>
    </Drawer>

    <CreateAccountDrawer
      open={accountDrawerOpen}
      onClose={() => setAccountDrawerOpen(false)}
      onSuccess={handleAccountCreated}
    />
    </>
  )
}

export default CreateReconciliationPeriodDrawer
