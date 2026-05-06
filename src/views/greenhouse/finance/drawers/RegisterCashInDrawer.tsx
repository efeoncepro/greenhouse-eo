'use client'

import { useCallback, useEffect, useState } from 'react'

import { toast } from 'sonner'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomTextField from '@core/components/mui/TextField'

import PaymentInstrumentChip from '@/components/greenhouse/PaymentInstrumentChip'

const GREENHOUSE_COPY = getMicrocopy()

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  transfer: 'Transferencia',
  credit_card: 'Tarjeta de crédito',
  paypal: 'PayPal',
  wise: 'Wise',
  check: 'Cheque',
  cash: 'Efectivo',
  other: 'Otro'
}

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InvoiceOption {
  incomeId: string
  invoiceNumber: string | null
  clientName: string | null
  currency: string
  totalAmount: number
  paidAmount: number
  pendingAmount: number
}

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (amount: number, currency: string = 'CLP'): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: currency === 'CLP' ? 0 : 2 }).format(amount)

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const RegisterCashInDrawer = ({ open, onClose, onSuccess }: Props) => {
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedIncomeId, setSelectedIncomeId] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [reference, setReference] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Payment instrument selector
  const [instruments, setInstruments] = useState<Array<{ accountId: string; accountName: string; providerSlug: string | null; instrumentCategory: string; currency: string }>>([])
  const [selectedInstrumentId, setSelectedInstrumentId] = useState('')
  const [currentFxRate, setCurrentFxRate] = useState<number | null>(null)
  const [exchangeRateOverride, setExchangeRateOverride] = useState('')
  const [feeAmount, setFeeAmount] = useState('')
  const [feeCurrency, setFeeCurrency] = useState('CLP')

  // Invoice dropdown data
  const [invoices, setInvoices] = useState<InvoiceOption[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [invoicesError, setInvoicesError] = useState<string | null>(null)

  // Derived: unique clients with pending invoices
  const uniqueClients = Array.from(
    new Map(invoices.map(inv => [inv.clientName || 'Sin cliente', inv.clientName || 'Sin cliente'])).keys()
  ).sort((a, b) => a.localeCompare(b))

  // Filtered invoices for selected client
  const filteredInvoices = selectedClient
    ? invoices.filter(inv => (inv.clientName || 'Sin cliente') === selectedClient)
    : []

  // Selected invoice details
  const selectedInvoice = invoices.find(inv => inv.incomeId === selectedIncomeId) ?? null

  const fetchInvoices = useCallback(async () => {
    setLoadingInvoices(true)
    setInvoicesError(null)

    try {
      const res = await fetch('/api/finance/income?pageSize=200&status=pending,partial', { cache: 'no-store' })

      if (res.ok) {
        const data = await res.json()

        const items: InvoiceOption[] = (data.items ?? []).map((item: any) => ({
          incomeId: item.incomeId,
          invoiceNumber: item.invoiceNumber ?? null,
          clientName: item.clientName ?? null,
          currency: item.currency ?? 'CLP',
          totalAmount: Number(item.totalAmount ?? 0),
          paidAmount: Number(item.amountPaid ?? 0),
          pendingAmount: Math.max(0, Number(item.totalAmount ?? 0) - Number(item.amountPaid ?? 0))
        }))

        setInvoices(items)

        return
      }

      const data = await res.json().catch(() => ({}))

      setInvoices([])
      setInvoicesError(data.error || `No pudimos cargar las facturas (${res.status}).`)
    } catch {
      setInvoices([])
      setInvoicesError('No pudimos cargar las facturas. Revisa la conexión o intenta nuevamente.')
    } finally {
      setLoadingInvoices(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchInvoices()

      fetch('/api/finance/accounts', { cache: 'no-store' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.items) {
            setInstruments(data.items.filter((i: any) => i.isActive))
          }
        })
        .catch(() => {})

      fetch('/api/finance/exchange-rates/latest', { cache: 'no-store' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.available && data.rate) {
            setCurrentFxRate(data.rate)
          }
        })
        .catch(() => {})
    }
  }, [open, fetchInvoices])

  const handleClientChange = (value: string) => {
    setSelectedClient(value)
    setSelectedIncomeId('')
    setAmount('')
  }

  const handleInvoiceChange = (value: string) => {
    setSelectedIncomeId(value)

    const invoice = invoices.find(inv => inv.incomeId === value)

    if (invoice) {
      setAmount(String(invoice.pendingAmount))
    } else {
      setAmount('')
    }
  }

  const resetForm = () => {
    setSelectedClient('')
    setSelectedIncomeId('')
    setAmount('')
    setPaymentDate('')
    setReference('')
    setPaymentMethod('')
    setSelectedInstrumentId('')
    setCurrentFxRate(null)
    setExchangeRateOverride('')
    setFeeAmount('')
    setFeeCurrency('CLP')
    setNotes('')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    if (!selectedIncomeId || !amount.trim() || !paymentDate) {
      setError('Todos los campos obligatorios deben completarse.')

      return
    }

    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('El monto debe ser un número mayor a 0.')

      return
    }

    setSaving(true)
    setError(null)

    const body: Record<string, any> = {
      amount: Number(amount),
      paymentDate
    }

    if (reference.trim()) body.reference = reference.trim()
    if (paymentMethod) body.paymentMethod = paymentMethod
    if (notes.trim()) body.notes = notes.trim()
    if (selectedInstrumentId) body.paymentAccountId = selectedInstrumentId
    if (exchangeRateOverride.trim()) body.exchangeRateOverride = Number(exchangeRateOverride)
    if (feeAmount.trim()) body.feeAmount = Number(feeAmount)
    if (feeCurrency) body.feeCurrency = feeCurrency

    try {
      const res = await fetch(`/api/finance/income/${selectedIncomeId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al registrar cobro')
        setSaving(false)

        return
      }

      toast.success('Cobro registrado')
      resetForm()
      onClose()
      onSuccess()
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={handleClose}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 480 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Typography variant='h6'>Registrar cobro</Typography>
        <IconButton onClick={handleClose} size='small' aria-label='Cerrar'>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}
        {invoicesError && <Alert severity='warning' onClose={() => setInvoicesError(null)}>{invoicesError}</Alert>}

        <CustomTextField
          select
          fullWidth
          size='small'
          label='Cliente'
          value={selectedClient}
          onChange={e => handleClientChange(e.target.value)}
          required
          disabled={loadingInvoices}
        >
          <MenuItem value=''>
            {loadingInvoices
              ? 'Cargando...'
              : uniqueClients.length === 0
                ? 'No hay clientes con facturas pendientes'
                : '— Seleccionar cliente —'}
          </MenuItem>
          {uniqueClients.map(client => {
            const count = invoices.filter(inv => (inv.clientName || 'Sin cliente') === client).length

            return (
              <MenuItem key={client} value={client}>
                {client} ({count} {count === 1 ? 'factura' : 'facturas'})
              </MenuItem>
            )
          })}
        </CustomTextField>

        <CustomTextField
          select
          fullWidth
          size='small'
          label='Factura'
          value={selectedIncomeId}
          onChange={e => handleInvoiceChange(e.target.value)}
          required
          disabled={!selectedClient}
        >
          <MenuItem value=''>
            {!selectedClient
              ? 'Selecciona un cliente primero'
              : filteredInvoices.length === 0
                ? 'Sin facturas pendientes'
                : '— Seleccionar factura —'}
          </MenuItem>
          {filteredInvoices.map(inv => (
            <MenuItem key={inv.incomeId} value={inv.incomeId}>
              {inv.invoiceNumber || inv.incomeId} — {formatCurrency(inv.pendingAmount, inv.currency)}
            </MenuItem>
          ))}
        </CustomTextField>

        <CustomTextField
          fullWidth
          size='small'
          label='Monto'
          type='number'
          value={amount}
          onChange={e => setAmount(e.target.value)}
          required
          helperText={
            selectedInvoice
              ? `Saldo pendiente: ${formatCurrency(selectedInvoice.pendingAmount, selectedInvoice.currency)}`
              : undefined
          }
        />

        {selectedInvoice?.currency === 'USD' && currentFxRate && (
          <Box sx={{ p: 1.5, bgcolor: 'info.lightOpacity', borderRadius: 1 }}>
            <Typography variant='caption' color='info.main'>
              Dólar observado: ${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(currentFxRate)} CLP — Equivalente: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(amount || 0) * currentFxRate)}
            </Typography>
          </Box>
        )}

        {selectedInvoice?.currency !== 'CLP' && (
          <CustomTextField
            fullWidth
            size='small'
            label='Tipo de cambio aplicado'
            type='number'
            value={exchangeRateOverride}
            onChange={e => setExchangeRateOverride(e.target.value)}
            placeholder={currentFxRate ? String(currentFxRate) : 'Opcional'}
            helperText='Opcional. Si lo informas, Greenhouse usará este tipo de cambio para CLP y settlement.'
          />
        )}

        <CustomTextField
          fullWidth
          size='small'
          label='Fecha de pago'
          type='date'
          value={paymentDate}
          onChange={e => setPaymentDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          required
        />

        <Divider />
        <Typography variant='subtitle2' color='text.secondary'>Campos opcionales</Typography>

        <CustomTextField
          fullWidth
          size='small'
          label='Referencia'
          value={reference}
          onChange={e => setReference(e.target.value)}
          placeholder='N° de transferencia, comprobante, etc.'
        />

        <CustomTextField
          select
          fullWidth
          size='small'
          label='Método de pago'
          value={paymentMethod}
          onChange={e => setPaymentMethod(e.target.value)}
        >
          <MenuItem value=''>—</MenuItem>
          {PAYMENT_METHODS.map(m => (
            <MenuItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</MenuItem>
          ))}
        </CustomTextField>

        <CustomTextField
          select
          fullWidth
          size='small'
          label='Cuenta de destino'
          value={selectedInstrumentId}
          onChange={e => setSelectedInstrumentId(e.target.value)}
        >
          <MenuItem value=''>— Sin asignar —</MenuItem>
          {instruments.map(inst => (
            <MenuItem key={inst.accountId} value={inst.accountId}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PaymentInstrumentChip
                  providerSlug={inst.providerSlug}
                  instrumentName={inst.accountName}
                  size='sm'
                  showName={false}
                />
                {inst.accountName} ({inst.currency})
              </Box>
            </MenuItem>
          ))}
        </CustomTextField>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 120px' }, gap: 2 }}>
          <CustomTextField
            fullWidth
            size='small'
            label='Fee de recaudación'
            type='number'
            value={feeAmount}
            onChange={e => setFeeAmount(e.target.value)}
            helperText='Opcional. Se registra como settlement leg separado.'
          />
          <CustomTextField
            select
            fullWidth
            size='small'
            label='Moneda fee'
            value={feeCurrency}
            onChange={e => setFeeCurrency(e.target.value)}
          >
            <MenuItem value='CLP'>CLP</MenuItem>
            <MenuItem value='USD'>USD</MenuItem>
            <MenuItem value='EUR'>EUR</MenuItem>
          </CustomTextField>
        </Box>

        <CustomTextField
          fullWidth
          size='small'
          label='Notas'
          multiline
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </Stack>

      <Divider />
      <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
        <Button variant='outlined' color='secondary' onClick={handleClose} fullWidth>{GREENHOUSE_COPY.actions.cancel}</Button>
        <Button variant='contained' color='success' onClick={handleSubmit} disabled={saving} fullWidth>
          {saving ? 'Registrando...' : 'Registrar cobro'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default RegisterCashInDrawer
