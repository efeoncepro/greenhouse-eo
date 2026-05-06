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
// Types
// ---------------------------------------------------------------------------

interface ExpenseOption {
  expenseId: string
  description: string

  // TASK-772 — supplier identity stable + display label.
  supplierKey: string             // estable: supplierId || displayName || legacyName || '__unassigned__'
  supplierLabel: string           // display: displayName || legacyName || 'Sin proveedor'
  supplierId: string | null       // raw supplierId del backend
  supplierName: string | null     // snapshot legacy/auditable

  // TASK-772 — amounts canónicos del backend, NUNCA recomputar inline.
  // Currency original del documento; pendingAmount en moneda original (puede ser null si mix).
  currency: string
  totalAmount: number             // moneda documento
  totalAmountClp: number          // CLP equivalente
  pendingAmount: number | null    // null si mix de monedas heterogéneo
  pendingAmountClp: number        // siempre confiable
  amountPaidIsHomogeneous: boolean
}

const PAYMENT_METHODS = [
  { value: 'transfer', label: 'Transferencia' },
  { value: 'credit_card', label: 'Tarjeta de credito' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'wise', label: 'Wise' },
  { value: 'check', label: 'Cheque' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'other', label: 'Otro' }
]

const SETTLEMENT_MODES = [
  { value: 'direct', label: 'Pago directo' },
  { value: 'via_intermediary', label: 'Vía instrumento intermediario' }
]

const formatAmount = (amount: number, currency = 'CLP'): string =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'CLP' ? 0 : 2
  }).format(amount)

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

const RegisterCashOutDrawer = ({ open, onClose, onSuccess }: Props) => {
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [selectedExpenseId, setSelectedExpenseId] = useState('')
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
  const [settlementMode, setSettlementMode] = useState<'direct' | 'via_intermediary'>('direct')
  const [fundingInstrumentId, setFundingInstrumentId] = useState('')
  const [feeAmount, setFeeAmount] = useState('')
  const [feeCurrency, setFeeCurrency] = useState('CLP')

  // Expense dropdown data
  const [expenses, setExpenses] = useState<ExpenseOption[]>([])
  const [loadingExpenses, setLoadingExpenses] = useState(false)
  const [expensesError, setExpensesError] = useState<string | null>(null)

  // TASK-772 — Derived: unique suppliers with pending expenses, agrupados por
  // supplierKey estable (supplierId || displayName || legacyName). Antes
  // agrupaba por `supplierName || 'Sin proveedor'` lo que escondía obligaciones
  // con supplierId válido pero supplierName=null bajo "Sin proveedor"
  // (root cause del bug Figma EXP-202604-008 visto en Cash-Out drawer).
  const uniqueSuppliers = Array.from(
    expenses.reduce((acc, e) => {
      if (!acc.has(e.supplierKey)) acc.set(e.supplierKey, e.supplierLabel)

      return acc
    }, new Map<string, string>()).entries()
  )
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label))

  // Filtered expenses for selected supplier (matched by supplierKey, no por label)
  const filteredExpenses = selectedSupplier
    ? expenses.filter(e => e.supplierKey === selectedSupplier)
    : []

  // Selected expense for pending balance display
  const selectedExpense = expenses.find(e => e.expenseId === selectedExpenseId) ?? null

  const fetchExpenses = useCallback(async () => {
    setLoadingExpenses(true)
    setExpensesError(null)

    try {
      const res = await fetch('/api/finance/expenses?pageSize=200&status=pending,partial', { cache: 'no-store' })

      if (res.ok) {
        const data = await res.json()

        // TASK-772 — consume el contract canónico TASK-772 Slice 1:
        // supplierDisplayName + pendingAmount (moneda original) + pendingAmountClp.
        // Fallback chain por compatibilidad con BQ-fallback path (sin enrichment).
        // NUNCA recomputar pendingAmount = totalAmountClp - amountPaid (mezclaba CLP con
        // currency original — root cause del display USD inflado a CLP en este drawer).
        const items: ExpenseOption[] = (data.items ?? []).map((e: any) => {
          const supplierId: string | null = e.supplierId ?? null
          const supplierName: string | null = e.supplierName ?? null
          const supplierDisplayName: string | null = e.supplierDisplayName ?? null
          const supplierLabel = supplierDisplayName || supplierName || 'Sin proveedor'
          const supplierKey = supplierId || supplierDisplayName || supplierName || '__unassigned__'

          const currency = e.currency ?? 'CLP'
          const totalAmount = Number(e.totalAmount ?? 0)
          const totalAmountClp = Number(e.totalAmountClp ?? totalAmount)
          const pendingAmountClp = Number(e.pendingAmountClp ?? Math.max(0, totalAmountClp - Number(e.amountPaidClp ?? 0)))
          const pendingAmountFromContract = e.pendingAmount

          // Si el backend declara pendingAmount=null (mix de monedas) lo respetamos.
          // Si lo emite como número, lo usamos. Si no viene (BQ-fallback), derivamos
          // best-effort: para CLP es trivial; para non-CLP lo dejamos como
          // totalAmount cuando amountPaid no es resoluble.
          const pendingAmount: number | null =
            pendingAmountFromContract === null
              ? null
              : pendingAmountFromContract !== undefined
                ? Number(pendingAmountFromContract)
                : currency === 'CLP'
                  ? pendingAmountClp
                  : totalAmount

          return {
            expenseId: e.expenseId,
            description: e.description ?? '',
            supplierKey,
            supplierLabel,
            supplierId,
            supplierName,
            currency,
            totalAmount,
            totalAmountClp,
            pendingAmount,
            pendingAmountClp,
            amountPaidIsHomogeneous: Boolean(e.amountPaidIsHomogeneous ?? true)
          }
        })

        setExpenses(items)

        return
      }

      const data = await res.json().catch(() => ({}))

      setExpenses([])
      setExpensesError(data.error || `No pudimos cargar los documentos de compra (${res.status}).`)
    } catch {
      setExpenses([])
      setExpensesError('No pudimos cargar los documentos de compra. Revisa la conexion o intenta nuevamente.')
    } finally {
      setLoadingExpenses(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchExpenses()

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
  }, [open, fetchExpenses])

  const handleSupplierChange = (value: string) => {
    setSelectedSupplier(value)
    setSelectedExpenseId('')
    setAmount('')
  }

  const handleExpenseChange = (value: string) => {
    setSelectedExpenseId(value)

    const expense = expenses.find(e => e.expenseId === value)

    if (expense) {
      // TASK-772 — preferir pendingAmount (moneda original) cuando es resoluble.
      // Si es null (mix de monedas heterogéneo), caer a pendingAmountClp como
      // best-effort — el operador puede ajustar manualmente y agregar
      // exchangeRateOverride en el form. NUNCA mostrar pendingAmountClp con
      // currency != 'CLP' en el input de monto (root cause del display USD inflado).
      const initialAmount = expense.pendingAmount ?? expense.pendingAmountClp

      setAmount(String(initialAmount))
    } else {
      setAmount('')
    }
  }

  const resetForm = () => {
    setSelectedSupplier('')
    setSelectedExpenseId('')
    setAmount('')
    setPaymentDate('')
    setReference('')
    setPaymentMethod('')
    setSelectedInstrumentId('')
    setCurrentFxRate(null)
    setExchangeRateOverride('')
    setSettlementMode('direct')
    setFundingInstrumentId('')
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
    if (!selectedExpenseId || !amount.trim() || !paymentDate) {
      setError('Todos los campos obligatorios deben completarse.')

      return
    }

    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('El monto debe ser un numero mayor a 0.')

      return
    }

    // TASK-772 — comparar contra pendingAmount en moneda del documento. Si es
    // null (mix de monedas), validamos contra pendingAmountClp pero advertimos.
    if (selectedExpense) {
      const cap = selectedExpense.pendingAmount ?? selectedExpense.pendingAmountClp
      const capCurrency = selectedExpense.pendingAmount !== null ? selectedExpense.currency : 'CLP'

      if (Number(amount) > cap) {
        setError(`El monto no puede superar el saldo pendiente (${formatAmount(cap, capCurrency)}).`)

        return
      }
    }

    setSaving(true)
    setError(null)

    const body: Record<string, unknown> = {
      amount: Number(amount),
      paymentDate
    }

    if (reference.trim()) body.reference = reference.trim()
    if (paymentMethod) body.paymentMethod = paymentMethod
    if (notes.trim()) body.notes = notes.trim()
    if (selectedInstrumentId) body.paymentAccountId = selectedInstrumentId
    if (exchangeRateOverride.trim()) body.exchangeRateOverride = Number(exchangeRateOverride)
    if (settlementMode) body.settlementMode = settlementMode
    if (settlementMode === 'via_intermediary' && fundingInstrumentId) body.fundingInstrumentId = fundingInstrumentId
    if (feeAmount.trim()) body.feeAmount = Number(feeAmount)
    if (feeCurrency) body.feeCurrency = feeCurrency

    try {
      const res = await fetch(`/api/finance/expenses/${selectedExpenseId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al registrar pago')
        setSaving(false)

        return
      }

      toast.success('Pago registrado')
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
      onClose={handleClose}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 480 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Typography variant='h6'>Registrar pago</Typography>
        <IconButton onClick={handleClose} size='small' aria-label='Cerrar'>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}
        {expensesError && <Alert severity='warning' onClose={() => setExpensesError(null)}>{expensesError}</Alert>}

        <CustomTextField
          select
          fullWidth
          size='small'
          label='Proveedor'
          value={selectedSupplier}
          onChange={e => handleSupplierChange(e.target.value)}
          required
          disabled={loadingExpenses}
        >
          <MenuItem value=''>
            {loadingExpenses
              ? 'Cargando...'
              : uniqueSuppliers.length === 0
                ? 'No hay proveedores con documentos pendientes'
                : '— Seleccionar proveedor —'}
          </MenuItem>
          {uniqueSuppliers.map(supplier => {
            // TASK-772 — count via supplierKey estable (NO via supplierName que puede ser null).
            const count = expenses.filter(e => e.supplierKey === supplier.key).length

            return (
              <MenuItem key={supplier.key} value={supplier.key}>
                {supplier.label} ({count} {count === 1 ? 'documento' : 'documentos'})
              </MenuItem>
            )
          })}
        </CustomTextField>

        <CustomTextField
          select
          fullWidth
          size='small'
          label='Documento de compra'
          value={selectedExpenseId}
          onChange={e => handleExpenseChange(e.target.value)}
          required
          disabled={!selectedSupplier}
        >
          <MenuItem value=''>
            {!selectedSupplier
              ? 'Selecciona un proveedor primero'
              : filteredExpenses.length === 0
                ? 'Sin documentos pendientes'
                : '— Seleccionar documento —'}
          </MenuItem>
          {filteredExpenses.map(e => {
            // TASK-772 — display monto pendiente en moneda original cuando es resoluble.
            // Si es null (mix de monedas), mostramos pendingAmountClp con label CLP +
            // disclaimer "(equiv)" para no engañar al operador.
            const displayAmount = e.pendingAmount ?? e.pendingAmountClp
            const displayCurrency = e.pendingAmount !== null ? e.currency : 'CLP'
            const heteroSuffix = e.pendingAmount === null ? ' (equiv. CLP)' : ''

            return (
              <MenuItem key={e.expenseId} value={e.expenseId}>
                {e.description} — {formatAmount(displayAmount, displayCurrency)}{heteroSuffix}
              </MenuItem>
            )
          })}
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
            selectedExpense
              ? (() => {
                  // TASK-772 — mostrar pendiente en moneda original + equivalente CLP separado.
                  // Si la moneda es CLP, no mostrar equivalente. Si es non-CLP, agregar
                  // sub-info CLP. Si pendingAmount=null (mix), solo CLP con disclaimer.
                  if (selectedExpense.pendingAmount === null) {
                    return `Saldo pendiente (equivalente CLP): ${formatAmount(selectedExpense.pendingAmountClp, 'CLP')}`
                  }

                  const main = `Saldo pendiente: ${formatAmount(selectedExpense.pendingAmount, selectedExpense.currency)}`

                  if (selectedExpense.currency === 'CLP') return main

                  const equiv = `Equivalente CLP: ${formatAmount(selectedExpense.pendingAmountClp, 'CLP')}`

                  return `${main} · ${equiv}`
                })()
              : undefined
          }
        />

        {selectedExpense?.currency === 'USD' && currentFxRate && (
          <Box sx={{ p: 1.5, bgcolor: 'info.lightOpacity', borderRadius: 1 }}>
            <Typography variant='caption' color='info.main'>
              Dólar observado: ${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(currentFxRate)} CLP — Equivalente: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(amount || 0) * currentFxRate)}
            </Typography>
          </Box>
        )}

        {selectedExpense?.currency !== 'CLP' && (
          <CustomTextField
            fullWidth
            size='small'
            label='Tipo de cambio aplicado'
            type='number'
            value={exchangeRateOverride}
            onChange={e => setExchangeRateOverride(e.target.value)}
            placeholder={currentFxRate ? String(currentFxRate) : 'Opcional'}
            helperText='Opcional. Si lo informas, Greenhouse usará este tipo de cambio para CLP, FX y settlement.'
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
          placeholder='N de transferencia, comprobante, etc.'
        />

        <CustomTextField
          select
          fullWidth
          size='small'
          label='Metodo de pago'
          value={paymentMethod}
          onChange={e => setPaymentMethod(e.target.value)}
        >
          <MenuItem value=''>—</MenuItem>
          {PAYMENT_METHODS.map(pm => (
            <MenuItem key={pm.value} value={pm.value}>{pm.label}</MenuItem>
          ))}
        </CustomTextField>

        <CustomTextField
          select
          fullWidth
          size='small'
          label='Pagado desde'
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

        <CustomTextField
          select
          fullWidth
          size='small'
          label='Liquidación'
          value={settlementMode}
          onChange={e => setSettlementMode(e.target.value as 'direct' | 'via_intermediary')}
          helperText='Usa pago directo para Swift/banco. Usa intermediario para flujos tipo Santander -> Global66 -> beneficiario.'
        >
          {SETTLEMENT_MODES.map(mode => (
            <MenuItem key={mode.value} value={mode.value}>{mode.label}</MenuItem>
          ))}
        </CustomTextField>

        {settlementMode === 'via_intermediary' && (
          <CustomTextField
            select
            fullWidth
            size='small'
            label='Fondeado desde'
            value={fundingInstrumentId}
            onChange={e => setFundingInstrumentId(e.target.value)}
            helperText='Instrumento origen del funding. No liquida la obligación; Greenhouse lo modela como leg separado.'
          >
            <MenuItem value=''>— Seleccionar instrumento origen —</MenuItem>
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
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 120px' }, gap: 2 }}>
          <CustomTextField
            fullWidth
            size='small'
            label='Fee de liquidación'
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
          {saving ? 'Registrando...' : 'Registrar pago'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default RegisterCashOutDrawer
