'use client'

import { useCallback, useEffect, useState } from 'react'

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
import GreenhouseFileUploader, { type UploadedFileValue } from '@/components/greenhouse/GreenhouseFileUploader'
import {
  getContactOptionLabel,
  loadFinanceClientContactOptions,
  type FinanceContactOption
} from './financeClientContacts'

const GREENHOUSE_COPY = getMicrocopy()

// ── Types ──

interface ClientOption {
  organizationId: string | null
  clientId: string | null
  clientProfileId: string
  hubspotCompanyId: string | null
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
  c.legalName || c.companyName || c.greenhouseClientName || c.clientId || c.organizationId || c.clientProfileId

const getClientValue = (client: ClientOption) => client.clientId || client.organizationId || client.clientProfileId

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
  const [selectedClientKey, setSelectedClientKey] = useState('')
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
  const [clientContacts, setClientContacts] = useState<FinanceContactOption[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [activePOs, setActivePOs] = useState<ActivePOSummary | null>(null)
  const [contactMode, setContactMode] = useState<'linked' | 'manual'>('linked')
  const [selectedContact, setSelectedContact] = useState<FinanceContactOption | null>(null)
  const [contactsError, setContactsError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const fetchActivePOs = useCallback(async (client: ClientOption | null) => {
    if (!client) {
      setActivePOs(null)

      return
    }

    try {
      const params = new URLSearchParams({ status: 'active' })

      if (client.clientId) params.set('clientId', client.clientId)
      if (client.organizationId) params.set('organizationId', client.organizationId)
      if (client.clientProfileId) params.set('clientProfileId', client.clientProfileId)
      if (client.hubspotCompanyId) params.set('hubspotCompanyId', client.hubspotCompanyId)

      const res = await fetch(`/api/finance/purchase-orders?${params.toString()}`)

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

  const selectedClient = clients.find(client => getClientValue(client) === selectedClientKey)

  useEffect(() => {
    if (!selectedClientKey || !selectedClient) {
      setClientContacts([])
      setLoadingContacts(false)
      setContactMode('linked')
      setSelectedContact(null)
      setContactsError(null)
      setContactName('')
      setContactEmail('')

      return
    }

    let active = true

    const run = async () => {
      setLoadingContacts(true)
      setContactsError(null)
      setClientContacts([])
      setSelectedContact(null)
      setContactName('')
      setContactEmail('')

      try {
        const nextContacts = await loadFinanceClientContactOptions({
          selectedClientKey,
          selectedClient
        })

        if (!active) return

        setClientContacts(nextContacts)
        setContactMode(nextContacts.length > 0 ? 'linked' : 'manual')

        if (nextContacts.length === 0) {
          setContactsError('Este cliente no tiene contactos vinculados todavía. Puedes registrar el contacto manualmente.')
        }
      } catch {
        if (!active) return

        setContactMode('manual')
        setContactsError('No pudimos cargar los contactos vinculados. Puedes registrar el contacto manualmente.')
      } finally {
        if (active) {
          setLoadingContacts(false)
        }
      }
    }

    run()

    return () => {
      active = false
    }
  }, [selectedClient, selectedClientKey])

  const handleClientChange = (value: string) => {
    setSelectedClientKey(value)

    const client = clients.find(c => getClientValue(c) === value) || null

    fetchActivePOs(client)

    if (client?.paymentCurrency && !currency) {
      setCurrency(client.paymentCurrency)
    }
  }

  // ── Form ──

  const resetForm = () => {
    setPoNumber('')
    setSelectedClientKey('')
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
    setClientContacts([])
    setActivePOs(null)
    setLoadingContacts(false)
    setContactMode('linked')
    setSelectedContact(null)
    setContactsError(null)
    setError(null)
  }

  const handleClose = () => { resetForm(); onClose() }

  const handleContactSelect = (_event: unknown, value: FinanceContactOption | null) => {
    setSelectedContact(value)
    setContactName(value?.name ?? '')
    setContactEmail(value?.email ?? '')
  }

  const handleUseManualContact = () => {
    setContactMode('manual')
  }

  const handleUseLinkedContact = () => {
    setContactMode('linked')
    setSelectedContact(null)
    setContactName('')
    setContactEmail('')
  }

  const handleSubmit = async () => {
    if (!poNumber.trim() || !selectedClientKey || !authorizedAmount.trim() || !issueDate) {
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

    try {
      const res = await fetch('/api/finance/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poNumber: poNumber.trim(),
          ...(selectedClient?.clientId && { clientId: selectedClient.clientId }),
          ...(selectedClient?.organizationId && { organizationId: selectedClient.organizationId }),
          ...(selectedClient?.clientProfileId && { clientProfileId: selectedClient.clientProfileId }),
          ...(selectedClient?.hubspotCompanyId && { hubspotCompanyId: selectedClient.hubspotCompanyId }),
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

      toast.success(`OC ${poNumber} registrada para ${getClientLabel(selectedClient!)}`)
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
        <IconButton onClick={handleClose} size='small' aria-label={GREENHOUSE_COPY.actions.close}>
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
              InputProps={{ sx: { fontSize: '0.85rem' } }}
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
          value={selectedClientKey} onChange={e => handleClientChange(e.target.value)}
          disabled={loadingClients}
        >
          <MenuItem value=''>
            {loadingClients ? 'Cargando...' : clients.length === 0 ? 'No hay clientes disponibles para OC' : '— Seleccionar cliente —'}
          </MenuItem>
          {clients.map(c => (
            <MenuItem key={getClientValue(c)} value={getClientValue(c)}>{getClientLabel(c)}</MenuItem>
          ))}
        </CustomTextField>

        {activePOs && activePOs.count > 0 && (
          <Alert severity='info' icon={<i className='tabler-file-check' />}>
            {getClientLabel(clients.find(c => getClientValue(c) === selectedClientKey)!)} tiene {activePOs.count} OC activa{activePOs.count > 1 ? 's' : ''}.
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

        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant='body2' fontWeight={600}>
              Contacto del cliente
            </Typography>
            {selectedClientKey && clientContacts.length > 0 ? (
              <Button
                size='small'
                variant='text'
                onClick={contactMode === 'linked' ? handleUseManualContact : handleUseLinkedContact}
              >
                {contactMode === 'linked' ? 'No encuentro el contacto' : 'Usar contacto vinculado'}
              </Button>
            ) : null}
          </Box>

          {!selectedClientKey ? (
            <Alert severity='info'>
              Selecciona primero el cliente para cargar sus contactos vinculados.
            </Alert>
          ) : null}

          {selectedClientKey && contactsError ? (
            <Alert severity='info'>
              {contactsError}
            </Alert>
          ) : null}

          {contactMode === 'linked' && selectedClientKey ? (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Autocomplete
                  options={clientContacts}
                  value={selectedContact}
                  loading={loadingContacts}
                  onChange={handleContactSelect}
                  getOptionLabel={getContactOptionLabel}
                  isOptionEqualToValue={(option, value) => option.email === value.email && option.name === value.name}
                  noOptionsText='No hay contactos vinculados para este cliente.'
                  loadingText='Cargando contactos...'
                  renderInput={params => (
                    <CustomTextField
                      {...params}
                      fullWidth
                      size='small'
                      label='Seleccionar contacto'
                      placeholder='Busca un contacto vinculado'
                      helperText='El nombre y el email se completan desde el contacto seleccionado.'
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingContacts ? <CircularProgress color='inherit' size={18} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        )
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={`${option.email}:${option.name}`}>
                      <Stack spacing={0.5} sx={{ py: 0.5, width: '100%' }}>
                        <Typography variant='body2' fontWeight={700}>
                          {option.name}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {option.email}
                        </Typography>
                        {option.role ? (
                          <Typography variant='caption' color='text.secondary'>
                            {option.role}
                          </Typography>
                        ) : null}
                      </Stack>
                    </li>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Email contacto'
                  type='email'
                  value={contactEmail}
                  placeholder='Se completará al seleccionar un contacto'
                  InputProps={{ readOnly: true }}
                  helperText={selectedContact ? 'Email completado desde el contacto vinculado.' : 'El email se completará al elegir un contacto.'}
                />
              </Grid>
            </Grid>
          ) : null}

          {contactMode === 'manual' ? (
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
          ) : null}
        </Stack>

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
          ownerClientId={selectedClient?.clientId || undefined}
          metadataLabel={poNumber.trim() || 'purchase-order'}
          disabled={saving || !selectedClientKey}
        />
        <CustomTextField
          fullWidth size='small' label='Notas' multiline rows={2}
          value={notes} onChange={e => setNotes(e.target.value)}
        />
      </Stack>

      <Divider />
      <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
        <Button variant='outlined' color='secondary' onClick={handleClose} fullWidth>{GREENHOUSE_COPY.actions.cancel}</Button>
        <Button variant='contained' color='primary' onClick={handleSubmit} disabled={saving} fullWidth startIcon={<i className='tabler-check' />}>
          {saving ? 'Guardando...' : 'Registrar OC'}
        </Button>
      </Box>
    </Drawer>
  )
}

export default CreatePurchaseOrderDrawer
