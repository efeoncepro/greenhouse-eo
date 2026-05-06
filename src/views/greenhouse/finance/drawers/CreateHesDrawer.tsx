'use client'

import { useCallback, useEffect, useState } from 'react'

import { toast } from 'sonner'

import Autocomplete from '@mui/material/Autocomplete'
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
import Link from '@mui/material/Link'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { getMicrocopy } from '@/lib/copy'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
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
}

interface POOption {
  poId: string
  poNumber: string
  authorizedAmountClp: number
  invoicedAmountClp: number
  remainingAmountClp: number
  status: string
  contactName: string | null
  contactEmail: string | null
  attachmentUrl: string | null
}

const getClientLabel = (c: ClientOption) =>
  c.legalName || c.companyName || c.greenhouseClientName || c.clientId || c.organizationId || c.clientProfileId

const getClientValue = (client: ClientOption) => client.clientId || client.organizationId || client.clientProfileId

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

// ── Props ──

type Props = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  editHes?: {
    hesId: string
    hesNumber: string
    status: string
    clientId: string
    purchaseOrderId: string | null
    serviceDescription: string
    servicePeriodStart: string | null
    servicePeriodEnd: string | null
    deliverablesSummary: string | null
    amount: number
    amountClp: number
    clientContactName: string | null
    clientContactEmail: string | null
    notes: string | null
    attachmentUrl: string | null
  } | null
}

const CreateHesDrawer = ({ open, onClose, onSuccess, editHes = null }: Props) => {
  const isEditing = Boolean(editHes)
  const currentStatus = editHes?.status || 'new'

  const currentStatusLabel =
    currentStatus === 'approved'
      ? 'Validada'
      : currentStatus === 'submitted'
        ? 'Recibida'
        : currentStatus === 'rejected'
          ? 'Observada'
          : 'Borrador'

  // Form fields
  const [hesNumber, setHesNumber] = useState('')
  const [selectedClientKey, setSelectedClientKey] = useState('')
  const [selectedPoId, setSelectedPoId] = useState('')
  const [serviceDescription, setServiceDescription] = useState('')
  const [servicePeriodStart, setServicePeriodStart] = useState('')
  const [servicePeriodEnd, setServicePeriodEnd] = useState('')
  const [deliverablesSummary, setDeliverablesSummary] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('CLP')
  const [clientContactName, setClientContactName] = useState('')
  const [clientContactEmail, setClientContactEmail] = useState('')
  const [notes, setNotes] = useState('')

  // Lifecycle action fields
  const [showApproveField, setShowApproveField] = useState(false)
  const [approvedBy, setApprovedBy] = useState('')
  const [showRejectField, setShowRejectField] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // State
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [activePOs, setActivePOs] = useState<POOption[]>([])
  const [selectedPO, setSelectedPO] = useState<POOption | null>(null)
  const [clientContacts, setClientContacts] = useState<FinanceContactOption[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [contactMode, setContactMode] = useState<'linked' | 'manual'>('linked')
  const [selectedContact, setSelectedContact] = useState<FinanceContactOption | null>(null)
  const [contactsError, setContactsError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedClient = clients.find(client => getClientValue(client) === selectedClientKey) || null
  const resolvedDocumentUrl = selectedPO?.attachmentUrl || editHes?.attachmentUrl || ''

  // ── Populate form when editing ──

  useEffect(() => {
    if (editHes && open) {
      setHesNumber(editHes.hesNumber)
      setSelectedClientKey(editHes.clientId)
      setSelectedPoId(editHes.purchaseOrderId || '')
      setServiceDescription(editHes.serviceDescription)
      setServicePeriodStart(editHes.servicePeriodStart || '')
      setServicePeriodEnd(editHes.servicePeriodEnd || '')
      setDeliverablesSummary(editHes.deliverablesSummary || '')
      setAmount(String(editHes.amount))
      setClientContactName(editHes.clientContactName || '')
      setClientContactEmail(editHes.clientContactEmail || '')
      setNotes(editHes.notes || '')
    }
  }, [editHes, open])

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

  const fetchPOs = useCallback(async (client: Pick<ClientOption, 'clientId' | 'organizationId' | 'clientProfileId' | 'hubspotCompanyId'> | null) => {
    if (!client) {
      setActivePOs([])

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

        setActivePOs(data.items ?? [])
      }
    } catch {
      setActivePOs([])
    }
  }, [])

  const handleClientChange = (value: string) => {
    setSelectedClientKey(value)
    setSelectedPoId('')

    const client = clients.find(item => getClientValue(item) === value) || null

    fetchPOs(client)
  }

  const handlePOChange = (value: string) => {
    setSelectedPoId(value)
  }

  // ── Fetch POs on edit load ──

  useEffect(() => {
    if (editHes?.clientId && open) {
      fetchPOs({
        clientId: editHes.clientId,
        organizationId: null,
        clientProfileId: '',
        hubspotCompanyId: null
      })
    }
  }, [editHes, open, fetchPOs])

  useEffect(() => {
    if (!selectedClientKey || !selectedClient) {
      setClientContacts([])
      setLoadingContacts(false)
      setContactMode('linked')
      setSelectedContact(null)
      setContactsError(null)
      setClientContactName(editHes?.clientContactName || '')
      setClientContactEmail(editHes?.clientContactEmail || '')

      return
    }

    let active = true

    const run = async () => {
      setLoadingContacts(true)
      setContactsError(null)
      setClientContacts([])
      setSelectedContact(null)
      setClientContactName('')
      setClientContactEmail('')

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
  }, [editHes?.clientContactEmail, editHes?.clientContactName, selectedClient, selectedClientKey])

  useEffect(() => {
    if (!selectedPoId) {
      setSelectedPO(null)

      return
    }

    const po = activePOs.find(item => item.poId === selectedPoId) || null

    setSelectedPO(po)
  }, [activePOs, selectedPoId])

  useEffect(() => {
    if (contactMode !== 'linked') {
      return
    }

    const preferredEmail = selectedPO?.contactEmail?.trim() || editHes?.clientContactEmail?.trim() || ''

    if (!preferredEmail || clientContacts.length === 0) {
      return
    }

    const matchedContact = clientContacts.find(contact => contact.email.trim().toLowerCase() === preferredEmail.toLowerCase())

    if (!matchedContact) {
      return
    }

    setSelectedContact(matchedContact)
    setClientContactName(matchedContact.name)
    setClientContactEmail(matchedContact.email)
  }, [clientContacts, contactMode, editHes?.clientContactEmail, selectedPO?.contactEmail])

  // ── Form ──

  const resetForm = () => {
    setHesNumber('')
    setSelectedClientKey('')
    setSelectedPoId('')
    setServiceDescription('')
    setServicePeriodStart('')
    setServicePeriodEnd('')
    setDeliverablesSummary('')
    setAmount('')
    setCurrency('CLP')
    setClientContactName('')
    setClientContactEmail('')
    setNotes('')
    setClientContacts([])
    setLoadingContacts(false)
    setContactMode('linked')
    setSelectedContact(null)
    setContactsError(null)
    setShowApproveField(false)
    setApprovedBy('')
    setShowRejectField(false)
    setRejectReason('')
    setActivePOs([])
    setSelectedPO(null)
    setError(null)
  }

  const handleClose = () => { resetForm(); onClose() }

  const handleContactSelect = (_event: unknown, value: FinanceContactOption | null) => {
    setSelectedContact(value)
    setClientContactName(value?.name ?? '')
    setClientContactEmail(value?.email ?? '')
  }

  const handleUseManualContact = () => {
    setContactMode('manual')
  }

  const handleUseLinkedContact = () => {
    setContactMode('linked')
    setSelectedContact(null)
    setClientContactName('')
    setClientContactEmail('')
  }

  const handleSubmit = async () => {
    if (!hesNumber.trim() || !selectedClientKey || !serviceDescription.trim() || !amount.trim()) {
      setError('N° HES, cliente, descripción del servicio y monto son obligatorios.')

      return
    }

    const amountNum = Number(amount)

    if (isNaN(amountNum) || amountNum <= 0) {
      setError('El monto debe ser mayor a 0.')

      return
    }

    setSaving(true)
    setError(null)

    const selectedClient = clients.find(client => getClientValue(client) === selectedClientKey)

    try {
      const res = await fetch('/api/finance/hes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hesNumber: hesNumber.trim(),
          ...(selectedClient?.clientId && { clientId: selectedClient.clientId }),
          ...(selectedClient?.organizationId && { organizationId: selectedClient.organizationId }),
          ...(selectedClient?.clientProfileId && { clientProfileId: selectedClient.clientProfileId }),
          ...(selectedClient?.hubspotCompanyId && { hubspotCompanyId: selectedClient.hubspotCompanyId }),
          ...(selectedPoId && { purchaseOrderId: selectedPoId }),
          serviceDescription: serviceDescription.trim(),
          amount: amountNum,
          currency,
          ...(servicePeriodStart && { servicePeriodStart }),
          ...(servicePeriodEnd && { servicePeriodEnd }),
          ...(deliverablesSummary.trim() && { deliverablesSummary: deliverablesSummary.trim() }),
          ...(clientContactName.trim() && { clientContactName: clientContactName.trim() }),
          ...(clientContactEmail.trim() && { clientContactEmail: clientContactEmail.trim() }),
          ...(resolvedDocumentUrl && { attachmentUrl: resolvedDocumentUrl }),
          ...(notes.trim() && { notes: notes.trim() })
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al registrar la HES')
        setSaving(false)

        return
      }

      toast.success(`HES ${hesNumber} registrada como recibida`)
      resetForm()
      onClose()
      onSuccess()
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  // ── Lifecycle actions ──

  const handleLifecycleAction = async (action: 'submit' | 'approve' | 'reject') => {
    if (!editHes) return

    if (action === 'approve' && !approvedBy.trim()) {
      setError('Ingresa el nombre de quien valida la HES.')

      return
    }

    if (action === 'reject' && !rejectReason.trim()) {
      setError('Ingresa el motivo de la observación.')

      return
    }

    setSaving(true)
    setError(null)

    try {
      const url = `/api/finance/hes/${editHes.hesId}/${action}`

      const body = action === 'approve'
        ? { approvedBy: approvedBy.trim() }
        : action === 'reject'
          ? { reason: rejectReason.trim() }
          : {}

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || `Error al ${action === 'submit' ? 'marcar como recibida' : action === 'approve' ? 'validar' : 'observar'} la HES`)
        setSaving(false)

        return
      }

      const labels = { submit: 'marcada como recibida', approve: 'validada', reject: 'observada' }

      toast.success(`HES ${editHes.hesNumber} ${labels[action]}`)
      resetForm()
      onClose()
      onSuccess()
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  // ── PO balance card ──

  const poConsumptionPct = selectedPO && selectedPO.authorizedAmountClp > 0
    ? Math.min(100, (selectedPO.invoicedAmountClp / selectedPO.authorizedAmountClp) * 100)
    : 0

  const poProgressColor = poConsumptionPct >= 100 ? 'info' : poConsumptionPct >= 80 ? 'warning' : 'success'

  const isReadOnly = currentStatus === 'approved'

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={handleClose}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 420 } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant='h6'>{isEditing ? `HES #${editHes?.hesNumber}` : 'Registrar HES recibida'}</Typography>
          {isEditing && (
            <CustomChip
              round='true' size='small' variant='tonal'
              color={currentStatus === 'approved' ? 'success' : currentStatus === 'submitted' ? 'info' : currentStatus === 'rejected' ? 'warning' : 'secondary'}
              label={currentStatusLabel}
            />
          )}
        </Box>
        <IconButton onClick={handleClose} size='small' aria-label={GREENHOUSE_COPY.actions.close}>
          <i className='tabler-x' />
        </IconButton>
      </Box>

      <Divider />

      <Stack spacing={3} sx={{ p: 4, overflowY: 'auto', flex: 1 }}>
        {error && <Alert severity='error' onClose={() => setError(null)}>{error}</Alert>}

        {/* Datos de la HES */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth size='small' label='N° de HES' required disabled={isReadOnly}
              value={hesNumber} onChange={e => setHesNumber(e.target.value)}
              InputProps={{ sx: { fontSize: '0.85rem' } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth size='small' label='Monto' type='number' required disabled={isReadOnly}
              value={amount} onChange={e => setAmount(e.target.value)}
            />
          </Grid>
        </Grid>

        <CustomTextField
          select fullWidth size='small' label='Cliente' required disabled={isReadOnly || loadingClients}
          value={selectedClientKey} onChange={e => handleClientChange(e.target.value)}
        >
          <MenuItem value=''>
            {loadingClients ? 'Cargando...' : clients.length === 0 ? 'No hay clientes disponibles para HES' : '— Seleccionar cliente —'}
          </MenuItem>
          {clients.map(c => (
            <MenuItem key={getClientValue(c)} value={getClientValue(c)}>{getClientLabel(c)}</MenuItem>
          ))}
        </CustomTextField>

        {activePOs.length > 0 && (
          <CustomTextField
            select fullWidth size='small' label='OC vinculada (opcional)' disabled={isReadOnly}
            value={selectedPoId} onChange={e => handlePOChange(e.target.value)}
          >
            <MenuItem value=''>Sin OC vinculada</MenuItem>
            {activePOs.map(po => (
              <MenuItem key={po.poId} value={po.poId}>
                OC #{po.poNumber} — Saldo: {formatCLP(po.remainingAmountClp)}
              </MenuItem>
            ))}
          </CustomTextField>
        )}

        {selectedPO && (
          <Card variant='outlined' sx={{ borderLeft: '4px solid', borderLeftColor: 'primary.main' }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant='subtitle2' sx={{ mb: 1 }}>OC #{selectedPO.poNumber}</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant='caption' color='text.secondary'>Autorizado: {formatCLP(selectedPO.authorizedAmountClp)}</Typography>
                <Typography variant='caption' color='text.secondary'>{Math.round(poConsumptionPct)}%</Typography>
              </Box>
              <LinearProgress
                variant='determinate'
                value={poConsumptionPct}
                color={poProgressColor}
                sx={{ height: 6, borderRadius: 3, mb: 1 }}
                aria-label={`Consumo de OC: ${Math.round(poConsumptionPct)}%`}
              />
              <Typography variant='body2' fontWeight={600} color='success.main'>
                Disponible: {formatCLP(selectedPO.remainingAmountClp)}
              </Typography>
            </CardContent>
          </Card>
        )}

        <Divider />
        <Typography variant='subtitle2' color='text.secondary'>Servicio certificado</Typography>

        <CustomTextField
          fullWidth size='small' label='Descripción del servicio' required disabled={isReadOnly}
          multiline rows={3}
          value={serviceDescription} onChange={e => setServiceDescription(e.target.value)}
        />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth size='small' label='Inicio del período' type='date' disabled={isReadOnly}
              value={servicePeriodStart} onChange={e => setServicePeriodStart(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth size='small' label='Fin del período' type='date' disabled={isReadOnly}
              value={servicePeriodEnd} onChange={e => setServicePeriodEnd(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>

        <CustomTextField
          fullWidth size='small' label='Entregables' multiline rows={2} disabled={isReadOnly}
          value={deliverablesSummary} onChange={e => setDeliverablesSummary(e.target.value)}
        />

        <Divider />
        <Typography variant='subtitle2' color='text.secondary'>Contacto y respaldo</Typography>

        {!selectedClientKey ? (
          <Alert severity='info'>Selecciona primero el cliente para cargar sus contactos vinculados.</Alert>
        ) : (
          <Stack spacing={2}>
            {contactsError && <Alert severity='warning'>{contactsError}</Alert>}

            {contactMode === 'linked' ? (
              <>
                <Autocomplete<FinanceContactOption, false, false, false>
                  options={clientContacts}
                  value={selectedContact}
                  onChange={handleContactSelect}
                  getOptionLabel={getContactOptionLabel}
                  isOptionEqualToValue={(option, value) => option.email === value.email}
                  loading={loadingContacts}
                  disabled={isReadOnly || loadingContacts || clientContacts.length === 0}
                  renderInput={params => (
                    <CustomTextField
                      {...params}
                      fullWidth
                      size='small'
                      label='Seleccionar contacto'
                      placeholder={loadingContacts ? 'Cargando contactos...' : 'Elegir contacto del cliente'}
                      helperText='El nombre y el email se completan desde el contacto vinculado.'
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
                />

                <CustomTextField
                  fullWidth
                  size='small'
                  label='Email contacto'
                  type='email'
                  value={clientContactEmail}
                  disabled
                  helperText='Email completado desde el contacto vinculado.'
                />

                {!isReadOnly && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button size='small' variant='text' color='primary' onClick={handleUseManualContact}>
                      No encuentro el contacto
                    </Button>
                  </Box>
                )}
              </>
            ) : (
              <>
                {!isReadOnly && clientContacts.length > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button size='small' variant='text' color='primary' onClick={handleUseLinkedContact}>
                      Usar contacto vinculado
                    </Button>
                  </Box>
                )}

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <CustomTextField
                      fullWidth
                      size='small'
                      label='Contacto del cliente'
                      disabled={isReadOnly}
                      value={clientContactName}
                      onChange={e => setClientContactName(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <CustomTextField
                      fullWidth
                      size='small'
                      label='Email contacto'
                      type='email'
                      disabled={isReadOnly}
                      value={clientContactEmail}
                      onChange={e => setClientContactEmail(e.target.value)}
                    />
                  </Grid>
                </Grid>
              </>
            )}

            {resolvedDocumentUrl ? (
              <Alert severity='info'>
                Esta HES usará el respaldo de la OC vinculada.{' '}
                <Link href={resolvedDocumentUrl} target='_blank' rel='noreferrer'>
                  Abrir documento
                </Link>
              </Alert>
            ) : selectedPO ? (
              <Alert severity='warning'>
                La OC vinculada todavía no tiene respaldo cargado. Súbelo desde Órdenes de compra para que esta HES lo herede.
              </Alert>
            ) : (
              <Alert severity='info'>
                La HES no admite adjuntos propios. Si necesitas respaldo, vincula una OC y carga el documento en esa OC.
              </Alert>
            )}
          </Stack>
        )}

        <CustomTextField
          fullWidth size='small' label='Notas' multiline rows={2} disabled={isReadOnly}
          value={notes} onChange={e => setNotes(e.target.value)}
        />

        {/* Lifecycle actions */}
        {isEditing && currentStatus === 'draft' && (
          <>
            <Divider />
            <Button
              variant='contained' color='info' fullWidth disabled={saving}
              startIcon={<i className='tabler-file-check' />}
              onClick={() => handleLifecycleAction('submit')}
            >
              Marcar como recibida
            </Button>
          </>
        )}

        {isEditing && currentStatus === 'submitted' && (
          <>
            <Divider />
            <Typography variant='subtitle2' color='text.secondary'>Acciones de validación</Typography>

            {!showApproveField && !showRejectField && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Button
                    variant='contained' color='success' fullWidth disabled={saving}
                    startIcon={<i className='tabler-check' />}
                    onClick={() => { setShowApproveField(true); setShowRejectField(false) }}
                  >
                    Validar
                  </Button>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Button
                    variant='contained' color='warning' fullWidth disabled={saving}
                    startIcon={<i className='tabler-x' />}
                    onClick={() => { setShowRejectField(true); setShowApproveField(false) }}
                  >
                    Observar
                  </Button>
                </Grid>
              </Grid>
            )}

            {showApproveField && (
              <Stack spacing={2}>
                <CustomTextField
                  fullWidth size='small' label='Validada por' required autoFocus
                  value={approvedBy} onChange={e => setApprovedBy(e.target.value)}
                  placeholder='Nombre de quien valida la HES'
                />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Button variant='outlined' color='secondary' fullWidth onClick={() => setShowApproveField(false)}>{GREENHOUSE_COPY.actions.cancel}</Button>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Button
                      variant='contained' color='success' fullWidth disabled={saving}
                      onClick={() => handleLifecycleAction('approve')}
                    >
                      Confirmar validación
                    </Button>
                  </Grid>
                </Grid>
              </Stack>
            )}

            {showRejectField && (
              <Stack spacing={2}>
                <CustomTextField
                  fullWidth size='small' label='Motivo de la observación' required autoFocus
                  multiline rows={2}
                  value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Button variant='outlined' color='secondary' fullWidth onClick={() => setShowRejectField(false)}>{GREENHOUSE_COPY.actions.cancel}</Button>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Button
                      variant='contained' color='warning' fullWidth disabled={saving}
                      onClick={() => handleLifecycleAction('reject')}
                    >
                      Confirmar observación
                    </Button>
                  </Grid>
                </Grid>
              </Stack>
            )}
          </>
        )}

        {isEditing && currentStatus === 'rejected' && (
          <>
            <Divider />
            <Button
              variant='contained' color='info' fullWidth disabled={saving}
              startIcon={<i className='tabler-file-check' />}
              onClick={() => handleLifecycleAction('submit')}
            >
              Volver a marcar como recibida
            </Button>
          </>
        )}
      </Stack>

      {!isEditing && (
        <>
          <Divider />
          <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
            <Button variant='outlined' color='secondary' onClick={handleClose} fullWidth>{GREENHOUSE_COPY.actions.cancel}</Button>
            <Button variant='contained' color='primary' onClick={handleSubmit} disabled={saving} fullWidth startIcon={<i className='tabler-check' />}>
              {saving ? 'Guardando...' : 'Registrar HES recibida'}
            </Button>
          </Box>
        </>
      )}
    </Drawer>
  )
}

export default CreateHesDrawer
