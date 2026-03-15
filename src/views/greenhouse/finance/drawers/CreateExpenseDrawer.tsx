'use client'

import { useCallback, useEffect, useState } from 'react'

import { toast } from 'react-toastify'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import ListSubheader from '@mui/material/ListSubheader'
import MenuItem from '@mui/material/MenuItem'
import Radio from '@mui/material/Radio'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import CreateSupplierDrawer from '@views/greenhouse/finance/drawers/CreateSupplierDrawer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExpenseType = 'supplier' | 'payroll' | 'social_security' | 'tax' | 'miscellaneous'

interface SupplierOption {
  supplierId: string
  legalName: string
  tradeName: string | null
  paymentCurrency?: string | null
}

interface AccountOption {
  accountId: string
  accountName: string
  currency: string
  accountType: string
}

interface ExpenseMeta {
  suppliers: SupplierOption[]
  accounts: AccountOption[]
  paymentMethods: string[]
  serviceLines: string[]
  socialSecurityTypes: string[]
  socialSecurityInstitutions: string[]
  taxTypes: string[]
}

interface PayrollCandidate {
  payrollEntryId: string
  payrollPeriodId: string
  payrollStatus: string
  approvedAt: string | null
  memberId: string
  memberName: string
  currency: string
  grossTotal: number
  netTotal: number
  linkedExpenseId: string | null
  linkedPaymentStatus: string | null
  isLinked: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXPENSE_TYPE_CONFIG: Record<ExpenseType, { label: string; icon: string }> = {
  supplier: { label: 'Proveedor', icon: 'tabler-building-store' },
  payroll: { label: 'Nomina', icon: 'tabler-users' },
  social_security: { label: 'Prevision', icon: 'tabler-shield-check' },
  tax: { label: 'Impuesto', icon: 'tabler-receipt-tax' },
  miscellaneous: { label: 'Varios', icon: 'tabler-dots' }
}

const CURRENCIES = ['CLP', 'USD']

const SERVICE_LINE_LABELS: Record<string, string> = {
  globe: 'Globe',
  efeonce_digital: 'Efeonce Digital',
  reach: 'Reach',
  wave: 'Wave',
  crm_solutions: 'CRM Solutions'
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  transfer: 'Transferencia',
  credit_card: 'Tarjeta de credito',
  paypal: 'PayPal',
  wise: 'Wise',
  check: 'Cheque',
  cash: 'Efectivo',
  other: 'Otro'
}

const SOCIAL_SECURITY_TYPE_LABELS: Record<string, string> = {
  afp: 'AFP',
  health: 'Salud',
  unemployment: 'Seguro cesantia',
  mutual: 'Mutual',
  caja_compensacion: 'Caja de compensacion'
}

const TAX_TYPE_LABELS: Record<string, string> = {
  iva_mensual: 'IVA mensual',
  ppm: 'PPM',
  renta_anual: 'Renta anual',
  patente: 'Patente',
  contribuciones: 'Contribuciones',
  retencion_honorarios: 'Retencion honorarios',
  other: 'Otro'
}

const ADD_NEW_SUPPLIER = '__ADD_NEW__'

const formatCLP = (amount: number): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)

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

const CreateExpenseDrawer = ({ open, onClose, onSuccess }: Props) => {
  // Common fields
  const [expenseType, setExpenseType] = useState<ExpenseType>('supplier')
  const [description, setDescription] = useState('')
  const [currency, setCurrency] = useState('')
  const [exchangeRate, setExchangeRate] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [documentDate, setDocumentDate] = useState('')
  const [serviceLine, setServiceLine] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [notes, setNotes] = useState('')

  // Supplier-specific
  const [supplierId, setSupplierId] = useState('')
  const [supplierDrawerOpen, setSupplierDrawerOpen] = useState(false)

  // Social security-specific
  const [socialSecurityType, setSocialSecurityType] = useState('')
  const [socialSecurityInstitution, setSocialSecurityInstitution] = useState('')
  const [socialSecurityPeriod, setSocialSecurityPeriod] = useState('')

  // Tax-specific
  const [taxType, setTaxType] = useState('')
  const [taxPeriod, setTaxPeriod] = useState('')
  const [taxFormNumber, setTaxFormNumber] = useState('')

  // Payroll-specific
  const [selectedPayrollEntry, setSelectedPayrollEntry] = useState<PayrollCandidate | null>(null)
  const [payrollCandidates, setPayrollCandidates] = useState<PayrollCandidate[]>([])
  const [loadingPayroll, setLoadingPayroll] = useState(false)

  // Meta
  const [meta, setMeta] = useState<ExpenseMeta | null>(null)
  const [loadingMeta, setLoadingMeta] = useState(false)

  // Form state
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchMeta = useCallback(async () => {
    setLoadingMeta(true)

    try {
      const res = await fetch('/api/finance/expenses/meta')

      if (res.ok) {
        const data = await res.json()

        setMeta(data)
      }
    } finally {
      setLoadingMeta(false)
    }
  }, [])

  const fetchPayrollCandidates = useCallback(async () => {
    setLoadingPayroll(true)

    try {
      const res = await fetch('/api/finance/expenses/payroll-candidates?linkStatus=available')

      if (res.ok) {
        const data = await res.json()

        setPayrollCandidates(data.items ?? [])
      }
    } finally {
      setLoadingPayroll(false)
    }
  }, [])

  useEffect(() => {
    if (open && !meta) {
      fetchMeta()
    }
  }, [open, meta, fetchMeta])

  useEffect(() => {
    if (open && expenseType === 'payroll' && payrollCandidates.length === 0) {
      fetchPayrollCandidates()
    }
  }, [open, expenseType, payrollCandidates.length, fetchPayrollCandidates])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const suppliers = meta?.suppliers ?? []

  const handleSupplierChange = (value: string) => {
    if (value === ADD_NEW_SUPPLIER) {
      setSupplierDrawerOpen(true)

      return
    }

    setSupplierId(value)

    const supplier = suppliers.find(s => s.supplierId === value)

    if (supplier?.paymentCurrency && !currency) {
      setCurrency(supplier.paymentCurrency)
    }
  }

  const handleSupplierCreated = () => {
    setSupplierDrawerOpen(false)
    setMeta(null)
    fetchMeta()
  }

  const handlePayrollSelect = (candidate: PayrollCandidate) => {
    setSelectedPayrollEntry(candidate)
    setDescription(`Nomina — ${candidate.memberName}`)
    setCurrency(candidate.currency || 'CLP')
    setTotalAmount(String(candidate.netTotal))
  }

  const handleTypeChange = (_: React.MouseEvent<HTMLElement>, newType: ExpenseType | null) => {
    if (newType) {
      setExpenseType(newType)
      setError(null)
    }
  }

  const resetForm = () => {
    setDescription('')
    setExpenseType('supplier')
    setCurrency('')
    setExchangeRate('')
    setTotalAmount('')
    setPaymentDate('')
    setSupplierId('')
    setDocumentNumber('')
    setDocumentDate('')
    setServiceLine('')
    setPaymentMethod('')
    setNotes('')
    setSocialSecurityType('')
    setSocialSecurityInstitution('')
    setSocialSecurityPeriod('')
    setTaxType('')
    setTaxPeriod('')
    setTaxFormNumber('')
    setSelectedPayrollEntry(null)
    setError(null)
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const handleSubmit = async () => {
    if (!description.trim() || !currency || !totalAmount || !paymentDate) {
      setError('Descripcion, moneda, monto total y fecha de pago son obligatorios.')

      return
    }

    if (currency !== 'CLP' && (!exchangeRate || Number(exchangeRate) <= 0)) {
      setError(`Debes ingresar el tipo de cambio ${currency}/CLP.`)

      return
    }

    const amount = Number(totalAmount)

    if (isNaN(amount) || amount <= 0) {
      setError('El monto total debe ser un numero mayor a 0.')

      return
    }

    if (expenseType === 'payroll' && !selectedPayrollEntry) {
      setError('Selecciona una entrada de nomina.')

      return
    }

    if (expenseType === 'social_security' && !socialSecurityType) {
      setError('Selecciona el tipo de prevision.')

      return
    }

    if (expenseType === 'tax' && !taxType) {
      setError('Selecciona el tipo de impuesto.')

      return
    }

    setSaving(true)
    setError(null)

    const body: Record<string, unknown> = {
      description: description.trim(),
      expenseType,
      currency,
      subtotal: amount,
      totalAmount: amount,
      paymentDate,
      ...(currency !== 'CLP' && exchangeRate && { exchangeRateToClp: Number(exchangeRate) }),
      ...(documentNumber.trim() && { documentNumber: documentNumber.trim() }),
      ...(documentDate && { documentDate }),
      ...(serviceLine && { serviceLine }),
      ...(paymentMethod && { paymentMethod }),
      ...(notes.trim() && { notes: notes.trim() })
    }

    // Type-specific fields
    if (expenseType === 'supplier' && supplierId.trim()) {
      body.supplierId = supplierId.trim()
    }

    if (expenseType === 'payroll' && selectedPayrollEntry) {
      body.payrollEntryId = selectedPayrollEntry.payrollEntryId
      body.payrollPeriodId = selectedPayrollEntry.payrollPeriodId
      body.memberId = selectedPayrollEntry.memberId
      body.memberName = selectedPayrollEntry.memberName
    }

    if (expenseType === 'social_security') {
      body.socialSecurityType = socialSecurityType
      if (socialSecurityInstitution) body.socialSecurityInstitution = socialSecurityInstitution
      if (socialSecurityPeriod) body.socialSecurityPeriod = socialSecurityPeriod
    }

    if (expenseType === 'tax') {
      body.taxType = taxType
      if (taxPeriod) body.taxPeriod = taxPeriod
      if (taxFormNumber.trim()) body.taxFormNumber = taxFormNumber.trim()
    }

    try {
      const res = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al registrar egreso')
        setSaving(false)

        return
      }

      toast.success('Egreso registrado exitosamente')
      resetForm()
      onClose()
      onSuccess()
    } catch {
      setError('Error de conexion')
    } finally {
      setSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderCommonFields = () => (
    <>
      <Grid size={{ xs: 12 }}>
        <CustomTextField
          fullWidth
          size='small'
          label='Descripcion'
          value={description}
          onChange={e => setDescription(e.target.value)}
          required
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
          <MenuItem value=''>—</MenuItem>
          {CURRENCIES.map(c => (
            <MenuItem key={c} value={c}>{c}</MenuItem>
          ))}
        </CustomTextField>
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <CustomTextField
          fullWidth
          size='small'
          label='Monto total'
          type='number'
          value={totalAmount}
          onChange={e => setTotalAmount(e.target.value)}
          required
        />
      </Grid>

      {currency && currency !== 'CLP' && (
        <Grid size={{ xs: 12 }}>
          <CustomTextField
            fullWidth
            size='small'
            label={`Tipo de cambio ${currency}/CLP`}
            type='number'
            value={exchangeRate}
            onChange={e => setExchangeRate(e.target.value)}
            required
            helperText={
              exchangeRate && totalAmount
                ? `Total CLP: $${Math.round(Number(totalAmount) * Number(exchangeRate)).toLocaleString('es-CL')}`
                : `Ingresa el valor de 1 ${currency} en CLP`
            }
          />
        </Grid>
      )}

      <Grid size={{ xs: 12, sm: 6 }}>
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
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <CustomTextField
          select
          fullWidth
          size='small'
          label='Metodo de pago'
          value={paymentMethod}
          onChange={e => setPaymentMethod(e.target.value)}
        >
          <MenuItem value=''>—</MenuItem>
          {(meta?.paymentMethods ?? Object.keys(PAYMENT_METHOD_LABELS)).map(m => (
            <MenuItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m] || m}</MenuItem>
          ))}
        </CustomTextField>
      </Grid>
    </>
  )

  const renderSupplierFields = () => (
    <>
      <Grid size={{ xs: 12 }}>
        <CustomTextField
          select
          fullWidth
          size='small'
          label='Proveedor'
          value={supplierId}
          onChange={e => handleSupplierChange(e.target.value)}
          disabled={loadingMeta}
        >
          <MenuItem value=''>{loadingMeta ? 'Cargando...' : '— Seleccionar proveedor —'}</MenuItem>
          {suppliers.map(s => (
            <MenuItem key={s.supplierId} value={s.supplierId}>
              {s.tradeName || s.legalName}
            </MenuItem>
          ))}
          <ListSubheader sx={{ p: 0 }}>
            <Divider />
          </ListSubheader>
          <MenuItem value={ADD_NEW_SUPPLIER} sx={{ color: 'primary.main', fontWeight: 600 }}>
            <i className='tabler-plus' style={{ marginRight: 8, fontSize: 18 }} />
            Agregar proveedor
          </MenuItem>
        </CustomTextField>
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <CustomTextField
          fullWidth
          size='small'
          label='N° Documento'
          value={documentNumber}
          onChange={e => setDocumentNumber(e.target.value)}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <CustomTextField
          fullWidth
          size='small'
          label='Fecha documento'
          type='date'
          value={documentDate}
          onChange={e => setDocumentDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <CustomTextField
          select
          fullWidth
          size='small'
          label='Linea de servicio'
          value={serviceLine}
          onChange={e => setServiceLine(e.target.value)}
        >
          <MenuItem value=''>—</MenuItem>
          {(meta?.serviceLines ?? Object.keys(SERVICE_LINE_LABELS)).map(s => (
            <MenuItem key={s} value={s}>{SERVICE_LINE_LABELS[s] || s}</MenuItem>
          ))}
        </CustomTextField>
      </Grid>
    </>
  )

  const renderPayrollFields = () => (
    <>
      <Grid size={{ xs: 12 }}>
        <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 1 }}>
          Selecciona una entrada de nomina aprobada
        </Typography>

        {loadingPayroll ? (
          <Stack spacing={1}>
            {[0, 1, 2].map(i => <Skeleton key={i} variant='rounded' height={64} />)}
          </Stack>
        ) : payrollCandidates.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }} role='status'>
            <Typography variant='body2' color='text.secondary'>
              No hay entradas de nomina disponibles para vincular.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 240, overflowY: 'auto' }}>
            <Stack spacing={1}>
              {payrollCandidates.map(candidate => {
                const isSelected = selectedPayrollEntry?.payrollEntryId === candidate.payrollEntryId

                return (
                  <Card
                    key={candidate.payrollEntryId}
                    elevation={0}
                    onClick={() => handlePayrollSelect(candidate)}
                    sx={{
                      border: t => `1px solid ${isSelected ? t.palette.primary.main : t.palette.divider}`,
                      bgcolor: isSelected ? 'primary.lightOpacity' : 'transparent',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                      '&:hover': { borderColor: 'primary.main' }
                    }}
                    role='option'
                    aria-selected={isSelected}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Radio checked={isSelected} size='small' tabIndex={-1} inputProps={{ 'aria-label': `Seleccionar ${candidate.memberName}` }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant='body2' fontWeight={600} noWrap>
                            {candidate.memberName}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant='caption' color='text.secondary'>
                              Periodo: {candidate.payrollPeriodId}
                            </Typography>
                            <CustomChip round='true' size='small' color='success' label={candidate.payrollStatus} />
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                          <Typography variant='body2' fontWeight={700}>
                            {formatCLP(candidate.netTotal)}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            Bruto: {formatCLP(candidate.grossTotal)}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                )
              })}
            </Stack>
          </Box>
        )}
      </Grid>
    </>
  )

  const renderSocialSecurityFields = () => (
    <>
      <Grid size={{ xs: 12, sm: 6 }}>
        <CustomTextField
          select
          fullWidth
          size='small'
          label='Tipo de prevision'
          value={socialSecurityType}
          onChange={e => setSocialSecurityType(e.target.value)}
          required
        >
          <MenuItem value=''>—</MenuItem>
          {(meta?.socialSecurityTypes ?? Object.keys(SOCIAL_SECURITY_TYPE_LABELS)).map(t => (
            <MenuItem key={t} value={t}>{SOCIAL_SECURITY_TYPE_LABELS[t] || t}</MenuItem>
          ))}
        </CustomTextField>
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <CustomTextField
          select
          fullWidth
          size='small'
          label='Institucion'
          value={socialSecurityInstitution}
          onChange={e => setSocialSecurityInstitution(e.target.value)}
        >
          <MenuItem value=''>—</MenuItem>
          {(meta?.socialSecurityInstitutions ?? []).map(inst => (
            <MenuItem key={inst} value={inst}>{inst}</MenuItem>
          ))}
        </CustomTextField>
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <CustomTextField
          fullWidth
          size='small'
          label='Periodo'
          type='month'
          value={socialSecurityPeriod}
          onChange={e => setSocialSecurityPeriod(e.target.value)}
          InputLabelProps={{ shrink: true }}
          helperText='Mes al que corresponde el pago'
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <CustomTextField
          fullWidth
          size='small'
          label='N° Documento'
          value={documentNumber}
          onChange={e => setDocumentNumber(e.target.value)}
        />
      </Grid>
    </>
  )

  const renderTaxFields = () => (
    <>
      <Grid size={{ xs: 12, sm: 6 }}>
        <CustomTextField
          select
          fullWidth
          size='small'
          label='Tipo de impuesto'
          value={taxType}
          onChange={e => setTaxType(e.target.value)}
          required
        >
          <MenuItem value=''>—</MenuItem>
          {(meta?.taxTypes ?? Object.keys(TAX_TYPE_LABELS)).map(t => (
            <MenuItem key={t} value={t}>{TAX_TYPE_LABELS[t] || t}</MenuItem>
          ))}
        </CustomTextField>
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <CustomTextField
          fullWidth
          size='small'
          label='Periodo tributario'
          type='month'
          value={taxPeriod}
          onChange={e => setTaxPeriod(e.target.value)}
          InputLabelProps={{ shrink: true }}
          helperText='Mes al que corresponde la obligacion'
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <CustomTextField
          fullWidth
          size='small'
          label='N° Formulario'
          value={taxFormNumber}
          onChange={e => setTaxFormNumber(e.target.value)}
          helperText='ej. F29, F22'
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <CustomTextField
          fullWidth
          size='small'
          label='N° Documento'
          value={documentNumber}
          onChange={e => setDocumentNumber(e.target.value)}
        />
      </Grid>
    </>
  )

  const renderMiscellaneousFields = () => (
    <>
      <Grid size={{ xs: 12, sm: 6 }}>
        <CustomTextField
          fullWidth
          size='small'
          label='N° Documento'
          value={documentNumber}
          onChange={e => setDocumentNumber(e.target.value)}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <CustomTextField
          fullWidth
          size='small'
          label='Fecha documento'
          type='date'
          value={documentDate}
          onChange={e => setDocumentDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>

      <Grid size={{ xs: 12, sm: 6 }}>
        <CustomTextField
          select
          fullWidth
          size='small'
          label='Linea de servicio'
          value={serviceLine}
          onChange={e => setServiceLine(e.target.value)}
        >
          <MenuItem value=''>—</MenuItem>
          {(meta?.serviceLines ?? Object.keys(SERVICE_LINE_LABELS)).map(s => (
            <MenuItem key={s} value={s}>{SERVICE_LINE_LABELS[s] || s}</MenuItem>
          ))}
        </CustomTextField>
      </Grid>
    </>
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 460 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Typography variant='h6'>Registrar egreso</Typography>
        <IconButton onClick={onClose} size='small' aria-label='Cerrar'>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

        {/* Type selector */}
        <Box>
          <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 1 }}>
            Tipo de egreso
          </Typography>
          <ToggleButtonGroup
            value={expenseType}
            exclusive
            onChange={handleTypeChange}
            size='small'
            fullWidth
            aria-label='Tipo de egreso'
            sx={{
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontSize: '0.8rem',
                py: 1,
                gap: 0.5
              }
            }}
          >
            {(Object.keys(EXPENSE_TYPE_CONFIG) as ExpenseType[]).map(type => (
              <ToggleButton key={type} value={type} aria-label={EXPENSE_TYPE_CONFIG[type].label}>
                <i className={EXPENSE_TYPE_CONFIG[type].icon} style={{ fontSize: 16 }} />
                {EXPENSE_TYPE_CONFIG[type].label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Divider />

        {/* Type-specific fields + common fields */}
        <Grid container spacing={2}>
          {/* Type-specific section */}
          {expenseType === 'payroll' && renderPayrollFields()}
          {expenseType === 'social_security' && renderSocialSecurityFields()}
          {expenseType === 'tax' && renderTaxFields()}

          {/* Common fields (always visible) */}
          {renderCommonFields()}

          {/* Supplier-specific fields (after common, as optional section) */}
          {expenseType === 'supplier' && (
            <>
              <Grid size={{ xs: 12 }}>
                <Divider />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant='subtitle2' color='text.secondary'>Datos del proveedor</Typography>
              </Grid>
              {renderSupplierFields()}
            </>
          )}

          {/* Miscellaneous optional fields */}
          {expenseType === 'miscellaneous' && (
            <>
              <Grid size={{ xs: 12 }}>
                <Divider />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant='subtitle2' color='text.secondary'>Campos adicionales</Typography>
              </Grid>
              {renderMiscellaneousFields()}
            </>
          )}

          {/* Notes (always) */}
          <Grid size={{ xs: 12 }}>
            <Divider />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <CustomTextField
              fullWidth
              size='small'
              label='Notas'
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
        <Button variant='outlined' color='secondary' onClick={onClose} fullWidth>
          Cancelar
        </Button>
        <Button
          variant='contained'
          color='error'
          onClick={handleSubmit}
          disabled={saving}
          fullWidth
          startIcon={saving ? <CircularProgress size={16} color='inherit' /> : undefined}
        >
          {saving ? 'Guardando...' : 'Guardar egreso'}
        </Button>
      </Box>
    </Drawer>

    <CreateSupplierDrawer
      open={supplierDrawerOpen}
      onClose={() => setSupplierDrawerOpen(false)}
      onSuccess={handleSupplierCreated}
    />
    </>
  )
}

export default CreateExpenseDrawer
