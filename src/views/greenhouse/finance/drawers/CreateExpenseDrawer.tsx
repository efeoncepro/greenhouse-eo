'use client'

import { useCallback, useEffect, useState } from 'react'

import { toast } from 'sonner'

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
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import {
  DIRECT_OVERHEAD_KINDS,
  PAYMENT_METHODS,
  VALID_CURRENCIES
} from '@/lib/finance/contracts'
import {
  EXPENSE_DRAWER_CATEGORIES,
  EXPENSE_DRAWER_TAB_LABELS,
  EXPENSE_DRAWER_TABS,
  RECURRENCE_FREQUENCIES,
  type ExpenseDrawerCategory,
  type ExpenseDrawerTab
} from '@/lib/finance/expense-taxonomy'
import PaymentInstrumentChip from '@/components/greenhouse/PaymentInstrumentChip'
import CreateSupplierDrawer from '@views/greenhouse/finance/drawers/CreateSupplierDrawer'

type SupplierOption = {
  supplierId: string
  legalName: string
  tradeName: string | null
  paymentCurrency?: string | null
}

type ExpenseMeta = {
  suppliers: SupplierOption[]
  paymentMethods: string[]
  paymentProviders: string[]
  paymentRails: string[]
  recurrenceFrequencies: string[]
  members: Array<{ memberId: string; displayName: string }>
  spaces: Array<{ spaceId: string; spaceName: string; clientId: string | null; organizationId: string | null }>
  supplierToolLinks: Array<{ supplierId: string; toolId: string; toolName: string; providerName: string | null }>
  drawerTabs?: Array<{
    value: ExpenseDrawerTab
    label: string
    categories: ExpenseDrawerCategory[]
  }>
}

const ADD_NEW_SUPPLIER = '__ADD_NEW__'

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  transfer: 'Transferencia',
  credit_card: 'Tarjeta',
  paypal: 'PayPal',
  wise: 'Wise',
  check: 'Cheque',
  cash: 'Efectivo',
  other: 'Otro'
}

const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  bank: 'Banco',
  previred: 'Previred',
  stripe: 'Stripe',
  webpay: 'Webpay',
  paypal: 'PayPal',
  mercadopago: 'Mercado Pago',
  wise: 'Wise',
  other: 'Otro'
}

const PAYMENT_RAIL_LABELS: Record<string, string> = {
  bank_transfer: 'Transferencia bancaria',
  card: 'Tarjeta',
  gateway: 'Gateway',
  wallet: 'Wallet',
  cash: 'Efectivo',
  check: 'Cheque',
  payroll_file: 'Archivo payroll',
  previred: 'Previred',
  other: 'Otro'
}

const DIRECT_OVERHEAD_KIND_LABELS: Record<string, string> = {
  tool_license: 'Licencia',
  tool_usage: 'Consumo',
  equipment: 'Equipamiento',
  reimbursement: 'Reembolso',
  other: 'Otro'
}

const RECURRENCE_LABELS: Record<string, string> = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  annual: 'Anual'
}

const typeInfoByTab: Record<ExpenseDrawerTab, { caption: string; helper: string }> = {
  operational: {
    caption: 'Operacional',
    helper: 'Servicios profesionales, producción externa, oficina, equipamiento y otros gastos operativos.'
  },
  tooling: {
    caption: 'Tooling',
    helper: 'Licencias SaaS, cloud, hosting y activos tecnológicos con bridge a AI Tools/Provider 360.'
  },
  tax: {
    caption: 'Impuesto',
    helper: 'Obligaciones fiscales y tributarias registradas desde Finance.'
  },
  other: {
    caption: 'Otro',
    helper: 'Fees bancarios, costos financieros y casos residuales.'
  }
}

const getTabCategories = (meta: ExpenseMeta | null, tab: ExpenseDrawerTab) => {
  const fromMeta = meta?.drawerTabs?.find(item => item.value === tab)?.categories

  return fromMeta && fromMeta.length > 0 ? fromMeta : EXPENSE_DRAWER_CATEGORIES[tab]
}

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const CreateExpenseDrawer = ({ open, onClose, onSuccess }: Props) => {
  const [meta, setMeta] = useState<ExpenseMeta | null>(null)
  const [loadingMeta, setLoadingMeta] = useState(false)

  const [drawerTab, setDrawerTab] = useState<ExpenseDrawerTab>('operational')
  const [category, setCategory] = useState(EXPENSE_DRAWER_CATEGORIES.operational[0]?.value || '')
  const [description, setDescription] = useState('')
  const [currency, setCurrency] = useState<'CLP' | 'USD' | ''>('CLP')
  const [exchangeRate, setExchangeRate] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentProvider, setPaymentProvider] = useState('')
  const [paymentRail, setPaymentRail] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [documentDate, setDocumentDate] = useState('')
  const [imputationScope, setImputationScope] = useState<'shared' | 'member' | 'space'>('shared')
  const [memberId, setMemberId] = useState('')
  const [spaceId, setSpaceId] = useState('')
  const [directOverheadKind, setDirectOverheadKind] = useState('')
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supplierDrawerOpen, setSupplierDrawerOpen] = useState(false)

  // Payment instrument selector
  const [instruments, setInstruments] = useState<Array<{ accountId: string; accountName: string; providerSlug: string | null; instrumentCategory: string; currency: string }>>([])
  const [selectedInstrumentId, setSelectedInstrumentId] = useState('')

  const fetchMeta = useCallback(async () => {
    setLoadingMeta(true)

    try {
      const res = await fetch('/api/finance/expenses/meta')

      if (!res.ok) {
        return
      }

      const data = await res.json()

      setMeta(data)
    } finally {
      setLoadingMeta(false)
    }
  }, [])

  useEffect(() => {
    if (open && !meta) {
      fetchMeta()
    }

    if (open) {
      fetch('/api/finance/accounts', { cache: 'no-store' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.items) {
            setInstruments(data.items.filter((i: any) => i.isActive))
          }
        })
        .catch(() => {})
    }
  }, [fetchMeta, meta, open])

  const resetForm = useCallback(() => {
    setDrawerTab('operational')
    setCategory(EXPENSE_DRAWER_CATEGORIES.operational[0]?.value || '')
    setDescription('')
    setCurrency('CLP')
    setExchangeRate('')
    setTotalAmount('')
    setPaymentDate('')
    setPaymentMethod('')
    setPaymentProvider('')
    setPaymentRail('')
    setSelectedInstrumentId('')
    setSupplierId('')
    setDocumentNumber('')
    setDocumentDate('')
    setImputationScope('shared')
    setMemberId('')
    setSpaceId('')
    setDirectOverheadKind('')
    setRecurrenceFrequency('')
    setNotes('')
    setError(null)
  }, [])

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSupplierCreated = () => {
    setSupplierDrawerOpen(false)
    setMeta(null)
    fetchMeta()
  }

  const currentCategories = getTabCategories(meta, drawerTab)
  const selectedCategory = currentCategories.find(item => item.value === category) || currentCategories[0] || null
  const suppliers = meta?.suppliers ?? []
  const members = meta?.members ?? []
  const spaces = meta?.spaces ?? []
  const selectedSpace = spaces.find(item => item.spaceId === spaceId) || null

  const selectedToolLink = supplierId
    ? (meta?.supplierToolLinks ?? []).find(item => item.supplierId === supplierId) || null
    : null

  useEffect(() => {
    const nextCategories = getTabCategories(meta, drawerTab)

    if (!nextCategories.some(item => item.value === category)) {
      setCategory(nextCategories[0]?.value || '')
    }
  }, [category, drawerTab, meta])

  useEffect(() => {
    if (selectedToolLink && !directOverheadKind) {
      setDirectOverheadKind('tool_license')
    }
  }, [directOverheadKind, selectedToolLink])

  const handleDrawerTabChange = (_event: React.MouseEvent<HTMLElement>, nextTab: ExpenseDrawerTab | null) => {
    if (!nextTab) return

    setDrawerTab(nextTab)
    setError(null)
  }

  const handleSupplierChange = (value: string) => {
    if (value === ADD_NEW_SUPPLIER) {
      setSupplierDrawerOpen(true)

      return
    }

    setSupplierId(value)

    const supplier = suppliers.find(item => item.supplierId === value)

    if (supplier?.paymentCurrency && VALID_CURRENCIES.includes(supplier.paymentCurrency as 'CLP' | 'USD')) {
      setCurrency(supplier.paymentCurrency as 'CLP' | 'USD')
    }
  }

  const resolveExpenseType = () => selectedCategory?.expenseType || 'supplier'

  const resolveCostCategory = () => selectedCategory?.costCategory || 'operational'

  const resolveDirectOverheadKind = () =>
    directOverheadKind || selectedToolLink ? (directOverheadKind || selectedCategory?.directOverheadKind || 'tool_license') : (selectedCategory?.directOverheadKind || null)

  const handleSubmit = async () => {
    if (!selectedCategory) {
      setError('Selecciona una categoria de gasto.')

      return
    }

    if (!description.trim() || !currency || !totalAmount || !paymentDate) {
      setError('Descripcion, moneda, monto total y fecha de pago son obligatorios.')

      return
    }

    if (currency !== 'CLP' && (!exchangeRate || Number(exchangeRate) <= 0)) {
      setError(`Debes ingresar el tipo de cambio ${currency}/CLP.`)

      return
    }

    if (imputationScope === 'member' && !memberId) {
      setError('Selecciona la persona a la que imputas el costo.')

      return
    }

    if (imputationScope === 'space' && !selectedSpace) {
      setError('Selecciona el espacio/cliente al que imputas el costo.')

      return
    }

    const amount = Number(totalAmount)

    if (Number.isNaN(amount) || amount <= 0) {
      setError('El monto total debe ser un numero mayor a 0.')

      return
    }

    const expenseType = resolveExpenseType()
    const selectedMember = members.find(item => item.memberId === memberId) || null
    const resolvedOverheadKind = resolveDirectOverheadKind()

    const body: Record<string, unknown> = {
      description: description.trim(),
      expenseType,
      sourceType: 'manual',
      currency,
      subtotal: amount,
      totalAmount: amount,
      paymentDate,
      paymentMethod: paymentMethod || null,
      paymentProvider: paymentProvider || null,
      paymentRail: paymentRail || null,
      costCategory: resolveCostCategory(),
      costIsDirect: imputationScope !== 'shared',
      directOverheadScope: imputationScope === 'member' ? 'member_direct' : imputationScope === 'shared' ? 'shared' : 'none',
      directOverheadKind: resolvedOverheadKind,
      isRecurring: Boolean(recurrenceFrequency),
      recurrenceFrequency: recurrenceFrequency || null,
      miscellaneousCategory: drawerTab === 'other' ? selectedCategory.value : null,
      notes: notes.trim() || null,
      ...(currency !== 'CLP' && exchangeRate && { exchangeRateToClp: Number(exchangeRate) }),
      ...(selectedInstrumentId && { paymentAccountId: selectedInstrumentId }),
      ...(supplierId && { supplierId }),
      ...(documentNumber.trim() && { documentNumber: documentNumber.trim() }),
      ...(documentDate && { documentDate })
    }

    if (drawerTab === 'tax') {
      body.taxType = selectedCategory.value
      body.taxPeriod = paymentDate.slice(0, 7) || null
    }

    if (imputationScope === 'member' && selectedMember) {
      body.memberId = selectedMember.memberId
      body.memberName = selectedMember.displayName
      body.directOverheadMemberId = selectedMember.memberId
    }

    if (imputationScope === 'space' && selectedSpace) {
      body.spaceId = selectedSpace.spaceId
      body.organizationId = selectedSpace.organizationId
      body.allocatedClientId = selectedSpace.clientId

      if (selectedSpace.clientId) {
        body.clientId = selectedSpace.clientId
      }
    }

    setSaving(true)
    setError(null)

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

  return (
    <>
      <Drawer
        anchor='right'
        open={open}
        onClose={handleClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: 720 }
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 5, pb: 3 }}>
          <Box>
            <Typography variant='h5'>Registrar egreso</Typography>
            <Typography variant='body2' color='text.secondary'>
              Finance ledger canónico con imputación, recurrencia y bridge cross-module.
            </Typography>
          </Box>
          <IconButton size='small' onClick={handleClose}>
            <i className='tabler-x' />
          </IconButton>
        </Box>

        <Divider />

        <Box sx={{ p: 5, pt: 4, overflowY: 'auto' }}>
          <Stack spacing={4}>
            <Card variant='outlined'>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2.5}>
                  <Box>
                    <Typography variant='overline' sx={{ letterSpacing: 1.1, color: 'text.secondary' }}>
                      Tipo de egreso
                    </Typography>
                    <ToggleButtonGroup
                      exclusive
                      fullWidth
                      color='primary'
                      value={drawerTab}
                      onChange={handleDrawerTabChange}
                      sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' } }}
                    >
                      {EXPENSE_DRAWER_TABS.map(tab => (
                        <ToggleButton key={tab} value={tab} sx={{ textTransform: 'none' }}>
                          {EXPENSE_DRAWER_TAB_LABELS[tab]}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  </Box>

                  <Alert severity='info' variant='outlined'>
                    <strong>{typeInfoByTab[drawerTab].caption}:</strong> {typeInfoByTab[drawerTab].helper}
                  </Alert>

                  <Alert severity='warning' variant='outlined'>
                    Nómina y Previred no se registran manualmente en este drawer. Esa materialización queda reactiva desde Payroll al exportar el período.
                  </Alert>
                </Stack>
              </CardContent>
            </Card>

            {error && <Alert severity='error'>{error}</Alert>}

            <Card variant='outlined'>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2.5}>
                  <Typography variant='subtitle1'>Datos del egreso</Typography>

                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <CustomTextField
                        select
                        fullWidth
                        size='small'
                        label='Categoria de gasto'
                        value={category}
                        onChange={event => setCategory(event.target.value)}
                        required
                      >
                        {currentCategories.map(item => (
                          <MenuItem key={item.value} value={item.value}>
                            {item.label}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <CustomTextField
                        select
                        fullWidth
                        size='small'
                        label='Frecuencia'
                        value={recurrenceFrequency}
                        onChange={event => setRecurrenceFrequency(event.target.value)}
                        helperText='Deja vacío si es un gasto puntual'
                      >
                        <MenuItem value=''>No recurrente</MenuItem>
                        {(meta?.recurrenceFrequencies ?? RECURRENCE_FREQUENCIES).map(item => (
                          <MenuItem key={item} value={item}>
                            {RECURRENCE_LABELS[item] || item}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <CustomTextField
                        fullWidth
                        size='small'
                        label='Descripcion'
                        value={description}
                        onChange={event => setDescription(event.target.value)}
                        required
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <CustomTextField
                        select
                        fullWidth
                        size='small'
                        label='Moneda'
                        value={currency}
                        onChange={event => setCurrency(event.target.value as 'CLP' | 'USD' | '')}
                        required
                      >
                        {VALID_CURRENCIES.map(item => (
                          <MenuItem key={item} value={item}>
                            {item}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <CustomTextField
                        fullWidth
                        size='small'
                        label='Monto total'
                        type='number'
                        value={totalAmount}
                        onChange={event => setTotalAmount(event.target.value)}
                        required
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <CustomTextField
                        fullWidth
                        size='small'
                        label='Fecha de pago'
                        type='date'
                        value={paymentDate}
                        onChange={event => setPaymentDate(event.target.value)}
                        InputLabelProps={{ shrink: true }}
                        required
                      />
                    </Grid>

                    {currency === 'USD' && (
                      <Grid size={{ xs: 12 }}>
                        <CustomTextField
                          fullWidth
                          size='small'
                          label='Tipo de cambio USD/CLP'
                          type='number'
                          value={exchangeRate}
                          onChange={event => setExchangeRate(event.target.value)}
                        />
                      </Grid>
                    )}

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <CustomTextField
                        select
                        fullWidth
                        size='small'
                        label='Metodo de pago'
                        value={paymentMethod}
                        onChange={event => setPaymentMethod(event.target.value)}
                      >
                        <MenuItem value=''>—</MenuItem>
                        {(meta?.paymentMethods ?? PAYMENT_METHODS).map(item => (
                          <MenuItem key={item} value={item}>
                            {PAYMENT_METHOD_LABELS[item] || item}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <CustomTextField
                        select
                        fullWidth
                        size='small'
                        label='Proveedor de pago'
                        value={paymentProvider}
                        onChange={event => setPaymentProvider(event.target.value)}
                      >
                        <MenuItem value=''>—</MenuItem>
                        {(meta?.paymentProviders ?? []).map(item => (
                          <MenuItem key={item} value={item}>
                            {PAYMENT_PROVIDER_LABELS[item] || item}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <CustomTextField
                        select
                        fullWidth
                        size='small'
                        label='Rail'
                        value={paymentRail}
                        onChange={event => setPaymentRail(event.target.value)}
                      >
                        <MenuItem value=''>—</MenuItem>
                        {(meta?.paymentRails ?? []).map(item => (
                          <MenuItem key={item} value={item}>
                            {PAYMENT_RAIL_LABELS[item] || item}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <CustomTextField
                        select
                        fullWidth
                        size='small'
                        label='Pagado desde'
                        value={selectedInstrumentId}
                        onChange={event => setSelectedInstrumentId(event.target.value)}
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
                    </Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </Card>

            <Card variant='outlined'>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2.5}>
                  <Typography variant='subtitle1'>Proveedor y documento</Typography>

                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12 }}>
                      <CustomTextField
                        select
                        fullWidth
                        size='small'
                        label='Proveedor'
                        value={supplierId}
                        onChange={event => handleSupplierChange(event.target.value)}
                        disabled={loadingMeta}
                      >
                        <MenuItem value=''>{loadingMeta ? 'Cargando...' : '— Seleccionar proveedor —'}</MenuItem>
                        {suppliers.map(item => (
                          <MenuItem key={item.supplierId} value={item.supplierId}>
                            {item.tradeName || item.legalName}
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

                    {selectedToolLink && (
                      <Grid size={{ xs: 12 }}>
                        <Alert severity='success' variant='outlined'>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                            <span>Herramienta vinculada:</span>
                            <CustomChip round='true' size='small' variant='tonal' color='success' label={selectedToolLink.toolName} />
                            {selectedToolLink.providerName && (
                              <Typography variant='caption' color='text.secondary'>
                                Provider: {selectedToolLink.providerName}
                              </Typography>
                            )}
                          </Stack>
                        </Alert>
                      </Grid>
                    )}

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <CustomTextField
                        fullWidth
                        size='small'
                        label='N° Documento'
                        value={documentNumber}
                        onChange={event => setDocumentNumber(event.target.value)}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <CustomTextField
                        fullWidth
                        size='small'
                        label='Fecha documento'
                        type='date'
                        value={documentDate}
                        onChange={event => setDocumentDate(event.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </Card>

            <Card variant='outlined'>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2.5}>
                  <Typography variant='subtitle1'>Imputacion</Typography>

                  <ToggleButtonGroup
                    exclusive
                    color='primary'
                    value={imputationScope}
                    onChange={(_event, value: 'shared' | 'member' | 'space' | null) => value && setImputationScope(value)}
                    sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}
                  >
                    <ToggleButton value='shared'>Compartido</ToggleButton>
                    <ToggleButton value='member'>Directo a persona</ToggleButton>
                    <ToggleButton value='space'>Directo a space</ToggleButton>
                  </ToggleButtonGroup>

                  <Grid container spacing={3}>
                    {imputationScope === 'member' && (
                      <Grid size={{ xs: 12 }}>
                        <CustomTextField
                          select
                          fullWidth
                          size='small'
                          label='Persona'
                          value={memberId}
                          onChange={event => setMemberId(event.target.value)}
                        >
                          <MenuItem value=''>—</MenuItem>
                          {members.map(item => (
                            <MenuItem key={item.memberId} value={item.memberId}>
                              {item.displayName}
                            </MenuItem>
                          ))}
                        </CustomTextField>
                      </Grid>
                    )}

                    {imputationScope === 'space' && (
                      <Grid size={{ xs: 12 }}>
                        <CustomTextField
                          select
                          fullWidth
                          size='small'
                          label='Space / cliente'
                          value={spaceId}
                          onChange={event => setSpaceId(event.target.value)}
                        >
                          <MenuItem value=''>—</MenuItem>
                          {spaces.map(item => (
                            <MenuItem key={item.spaceId} value={item.spaceId}>
                              {item.spaceName}
                            </MenuItem>
                          ))}
                        </CustomTextField>
                      </Grid>
                    )}

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <CustomTextField
                        select
                        fullWidth
                        size='small'
                        label='Tipo overhead'
                        value={directOverheadKind}
                        onChange={event => setDirectOverheadKind(event.target.value)}
                        helperText='Sugerido automáticamente para tooling cuando existe bridge supplier → tool'
                      >
                        <MenuItem value=''>—</MenuItem>
                        {DIRECT_OVERHEAD_KINDS.map(item => (
                          <MenuItem key={item} value={item}>
                            {DIRECT_OVERHEAD_KIND_LABELS[item] || item}
                          </MenuItem>
                        ))}
                      </CustomTextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <CustomTextField
                        fullWidth
                        size='small'
                        label='Notas'
                        value={notes}
                        onChange={event => setNotes(event.target.value)}
                      />
                    </Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </Card>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button color='secondary' variant='tonal' onClick={handleClose} disabled={saving}>
                Cancelar
              </Button>
              <Button variant='contained' onClick={handleSubmit} disabled={saving || loadingMeta}>
                {saving ? <CircularProgress size={20} color='inherit' /> : 'Guardar egreso'}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Drawer>

      <CreateSupplierDrawer open={supplierDrawerOpen} onClose={() => setSupplierDrawerOpen(false)} onSuccess={handleSupplierCreated} />
    </>
  )
}

export default CreateExpenseDrawer
