'use client'

import { useCallback, useEffect, useState } from 'react'

import { toast } from 'react-toastify'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'
import GreenhouseFileUploader, { type UploadedFileValue } from '@/components/greenhouse/GreenhouseFileUploader'

// ── Types ──

interface ClientOption {
  clientId: string | null
  clientProfileId: string
  companyName: string | null
  greenhouseClientName: string | null
  legalName: string | null
  paymentCurrency: string
}

interface ActivePOSummary {
  count: number
  totalAuthorized: number
  totalRemaining: number
}

const getClientLabel = (c: ClientOption) =>
  c.legalName || c.companyName || c.greenhouseClientName || c.clientId || c.clientProfileId

const CURRENCIES = ['CLP', 'USD']

// ── Props ──

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const CreatePurchaseOrderDrawer = ({ open, onClose, onSuccess }: Props) => {
  // Form fields
  const [poNumber, setPoNumber] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [authorizedAmount, setAuthorizedAmount] = useState('')
  const [currency, setCurrency] = useState('CLP')
  const [exchangeRate, setExchangeRate] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [serviceScope, setServiceScope] = useState('')
  const [description, setDescription] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [attachmentAsset, setAttachmentAsset] = useState<UploadedFileValue | null>(null)
  const [notes, setNotes] = useState('')

  // State
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [activePOs, setActivePOs] = useState<ActivePOSummary | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectableClients = clients.filter((client): client is ClientOption & { clientId: string } => Boolean(client.clientId))

  // ── Fetch clients ──

  const fetchClients = useCallback(async () => {
    setLoadingClients(true)

    try {
      const res = await fetch('/api/finance/clients', { cache: 'no-store' })

      if (res.ok) {
        const data = await res.json()

        setClients(data.items ?? [])
      }
    } finally {
      setLoadingClients(false)
    }
  }, [])

  useEffect(() => {
    if (open) fetchClients()
  }, [open, fetchClients])

  // ── Fetch active POs for client ──

  const fetchActivePOs = useCallback(async (clientId: string) => {
    if (!clientId) {
      setActivePOs(null)

      return
    }

    try {
      const res = await fetch(`/api/finance/purchase-orders?clientId=${clientId}&status=active`)

      if (res.ok) {
        const data = await res.json()
        const items = data.items ?? []

        setActivePOs({
          count: items.length,
          totalAuthorized: items.reduce((s: number, i: { authorizedAmountClp: number }) => s + i.authorizedAmountClp, 0),
          totalRemaining: items.reduce((s: number, i: { remainingAmountClp: number }) => s + i.remainingAmountClp, 0)
        })
      }
    } catch {
      setActivePOs(null)
    }
  }, [])

  const handleClientChange = (value: string) => {
    setSelectedClientId(value)
    fetchActivePOs(value)

    const client = selectableClients.find(c => c.clientId === value)

    if (client?.paymentCurrency && !currency) {
      setCurrency(client.paymentCurrency)
    }
  }

  // ── Form ──

  const resetForm = () => {
    setPoNumber('')
    setSelectedClientId('')
    setAuthorizedAmount('')
    setCurrency('CLP')
    setExchangeRate('')
    setIssueDate('')
    setExpiryDate('')
    setServiceScope('')
    setDescription('')
    setContactName('')
    setContactEmail('')
    setAttachmentAsset(null)
    setNotes('')
    setActivePOs(null)
    setError(null)
  }

  const handleClose = () => { resetForm(); onClose() }

  const handleSubmit = async () => {
    if (!poNumber.trim() || !selectedClientId || !authorizedAmount.trim() || !issueDate) {
      setError('N° de OC, cliente, monto y fecha de emisión son obligatorios.')

      return
    }

    const amount = Number(authorizedAmount)

    if (isNaN(amount) || amount <= 0) {
      setError('El monto autorizado debe ser mayor a 0.')

      return
    }

    setSaving(true)
    setError(null)

    const client = selectableClients.find(c => c.clientId === selectedClientId)

    try {
      const res = await fetch('/api/finance/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poNumber: poNumber.trim(),
          clientId: selectedClientId,
          organizationId: null,
          authorizedAmount: amount,
          currency,
          ...(currency !== 'CLP' && exchangeRate && { exchangeRateToClp: Number(exchangeRate) }),
          issueDate,
          ...(expiryDate && { expiryDate }),
          ...(serviceScope.trim() && { serviceScope: serviceScope.trim() }),
          ...(description.trim() && { description: description.trim() }),
          ...(contactName.trim() && { contactName: contactName.trim() }),
          ...(contactEmail.trim() && { contactEmail: contactEmail.trim() }),
          ...(attachmentAsset?.assetId && { attachmentAssetId: attachmentAsset.assetId }),
          ...(notes.trim() && { notes: notes.trim() })
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al registrar la OC')
        setSaving(false)

        return
      }

      toast.success(`OC ${poNumber} registrada para ${getClientLabel(client!)}`)
      resetForm()
      onClose()
      onSuccess()
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const formatCLP = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={handleClose}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 400 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Typography variant='h6'>Registrar orden de compra</Typography>
        <IconButton onClick={handleClose} size='small' aria-label='Cerrar'>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

        {/* Datos de la OC */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth size='small' label='N° de OC' required
              value={poNumber} onChange={e => setPoNumber(e.target.value)}
              InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth size='small' label='Monto autorizado' type='number' required
              value={authorizedAmount} onChange={e => setAuthorizedAmount(e.target.value)}
            />
          </Grid>
        </Grid>

        <CustomTextField
          select fullWidth size='small' label='Cliente' required
          value={selectedClientId} onChange={e => handleClientChange(e.target.value)}
          disabled={loadingClients}
        >
          <MenuItem value=''>
            {loadingClients ? 'Cargando...' : selectableClients.length === 0 ? 'No hay clientes disponibles para OC' : '— Seleccionar cliente —'}
          </MenuItem>
          {selectableClients.map(c => (
            <MenuItem key={c.clientId} value={c.clientId}>{getClientLabel(c)}</MenuItem>
          ))}
        </CustomTextField>

        {activePOs && activePOs.count > 0 && (
          <Alert severity='info' icon={<i className='tabler-file-check' />}>
            {getClientLabel(selectableClients.find(c => c.clientId === selectedClientId)!)} tiene {activePOs.count} OC activa{activePOs.count > 1 ? 's' : ''}.
            Saldo disponible: {formatCLP(activePOs.totalRemaining)}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth size='small' label='Fecha de emisión' type='date' required
              value={issueDate} onChange={e => setIssueDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth size='small' label='Fecha de vencimiento' type='date'
              value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              select fullWidth size='small' label='Moneda'
              value={currency} onChange={e => setCurrency(e.target.value)}
            >
              {CURRENCIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </CustomTextField>
          </Grid>
          {currency !== 'CLP' && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomTextField
                fullWidth size='small' label='Tipo de cambio a CLP' type='number'
                value={exchangeRate} onChange={e => setExchangeRate(e.target.value)}
              />
            </Grid>
          )}
        </Grid>

        <Divider />
        <Typography variant='subtitle2' color='text.secondary'>Alcance y contacto</Typography>

        <CustomTextField
          fullWidth size='small' label='Servicios cubiertos' multiline rows={2}
          value={serviceScope} onChange={e => setServiceScope(e.target.value)}
        />
        <CustomTextField
          fullWidth size='small' label='Descripción' multiline rows={2}
          value={description} onChange={e => setDescription(e.target.value)}
        />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth size='small' label='Nombre contacto'
              value={contactName} onChange={e => setContactName(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth size='small' label='Email contacto' type='email'
              value={contactEmail} onChange={e => setContactEmail(e.target.value)}
            />
          </Grid>
        </Grid>

        <Divider />
        <Typography variant='subtitle2' color='text.secondary'>Adjunto y notas</Typography>

        <GreenhouseFileUploader
          contextType='purchase_order_draft'
          title='Documento de respaldo'
          helperText='Sube la orden de compra o su respaldo en PDF o imagen. Quedará gobernado por el registry shared de assets.'
          emptyTitle='Arrastra la OC aquí'
          emptyDescription='Acepta PDF, JPG, PNG y WEBP hasta 10 MB.'
          browseCta='Seleccionar documento'
          replaceCta='Reemplazar documento'
          value={attachmentAsset}
          onChange={setAttachmentAsset}
          ownerClientId={selectedClientId || undefined}
          metadataLabel={poNumber.trim() || 'purchase-order'}
          disabled={saving || !selectedClientId}
        />
        <CustomTextField
          fullWidth size='small' label='Notas' multiline rows={2}
          value={notes} onChange={e => setNotes(e.target.value)}
        />
      </Stack>

      <Divider />
      <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
        <Button variant='outlined' color='secondary' onClick={handleClose} fullWidth>Cancelar</Button>
        <Button variant='contained' color='primary' onClick={handleSubmit} disabled={saving} fullWidth startIcon={<i className='tabler-check' />}>
          {saving ? 'Guardando...' : 'Registrar OC'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default CreatePurchaseOrderDrawer
