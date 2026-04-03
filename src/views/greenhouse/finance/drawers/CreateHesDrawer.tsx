'use client'

import { useCallback, useEffect, useState } from 'react'

import { toast } from 'react-toastify'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

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
  const [attachmentUrl, setAttachmentUrl] = useState('')
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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      setAttachmentUrl(editHes.attachmentUrl || '')
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
    setSelectedPO(null)

    const client = clients.find(item => getClientValue(item) === value) || null

    fetchPOs(client)
  }

  const handlePOChange = (value: string) => {
    setSelectedPoId(value)

    const po = activePOs.find(p => p.poId === value)

    setSelectedPO(po || null)
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
    setAttachmentUrl('')
    setNotes('')
    setShowApproveField(false)
    setApprovedBy('')
    setShowRejectField(false)
    setRejectReason('')
    setActivePOs([])
    setSelectedPO(null)
    setError(null)
  }

  const handleClose = () => { resetForm(); onClose() }

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
          ...(attachmentUrl.trim() && { attachmentUrl: attachmentUrl.trim() }),
          ...(notes.trim() && { notes: notes.trim() })
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'Error al registrar la HES')
        setSaving(false)

        return
      }

      toast.success(`HES ${hesNumber} registrada`)
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
      setError('Ingrese el nombre de quien aprueba.')

      return
    }

    if (action === 'reject' && !rejectReason.trim()) {
      setError('Ingrese el motivo del rechazo.')

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

        setError(data.error || `Error al ${action === 'submit' ? 'enviar' : action === 'approve' ? 'aprobar' : 'rechazar'} la HES`)
        setSaving(false)

        return
      }

      const labels = { submit: 'enviada al cliente', approve: 'aprobada', reject: 'rechazada' }

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
          <Typography variant='h6'>{isEditing ? `HES #${editHes?.hesNumber}` : 'Registrar HES'}</Typography>
          {isEditing && (
            <CustomChip
              round='true' size='small' variant='tonal'
              color={currentStatus === 'approved' ? 'success' : currentStatus === 'submitted' ? 'info' : currentStatus === 'rejected' ? 'error' : 'secondary'}
              label={currentStatus === 'approved' ? 'Aprobada' : currentStatus === 'submitted' ? 'Enviada' : currentStatus === 'rejected' ? 'Rechazada' : 'Borrador'}
            />
          )}
        </Box>
        <IconButton onClick={handleClose} size='small' aria-label='Cerrar'>
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
              InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
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
        <Typography variant='subtitle2' color='text.secondary'>Contacto y adjunto</Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth size='small' label='Contacto del cliente' disabled={isReadOnly}
              value={clientContactName} onChange={e => setClientContactName(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField
              fullWidth size='small' label='Email contacto' type='email' disabled={isReadOnly}
              value={clientContactEmail} onChange={e => setClientContactEmail(e.target.value)}
            />
          </Grid>
        </Grid>

        <CustomTextField
          fullWidth size='small' label='URL del documento (PDF)' disabled={isReadOnly}
          value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)}
        />
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
              startIcon={<i className='tabler-send' />}
              onClick={() => handleLifecycleAction('submit')}
            >
              Enviar al cliente
            </Button>
          </>
        )}

        {isEditing && currentStatus === 'submitted' && (
          <>
            <Divider />
            <Typography variant='subtitle2' color='text.secondary'>Acciones de aprobación</Typography>

            {!showApproveField && !showRejectField && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Button
                    variant='contained' color='success' fullWidth disabled={saving}
                    startIcon={<i className='tabler-check' />}
                    onClick={() => { setShowApproveField(true); setShowRejectField(false) }}
                  >
                    Aprobar
                  </Button>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Button
                    variant='contained' color='error' fullWidth disabled={saving}
                    startIcon={<i className='tabler-x' />}
                    onClick={() => { setShowRejectField(true); setShowApproveField(false) }}
                  >
                    Rechazar
                  </Button>
                </Grid>
              </Grid>
            )}

            {showApproveField && (
              <Stack spacing={2}>
                <CustomTextField
                  fullWidth size='small' label='Aprobada por' required autoFocus
                  value={approvedBy} onChange={e => setApprovedBy(e.target.value)}
                  placeholder='Nombre del aprobador en el cliente'
                />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Button variant='outlined' color='secondary' fullWidth onClick={() => setShowApproveField(false)}>
                      Cancelar
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Button
                      variant='contained' color='success' fullWidth disabled={saving}
                      onClick={() => handleLifecycleAction('approve')}
                    >
                      Confirmar aprobación
                    </Button>
                  </Grid>
                </Grid>
              </Stack>
            )}

            {showRejectField && (
              <Stack spacing={2}>
                <CustomTextField
                  fullWidth size='small' label='Motivo del rechazo' required autoFocus
                  multiline rows={2}
                  value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Button variant='outlined' color='secondary' fullWidth onClick={() => setShowRejectField(false)}>
                      Cancelar
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Button
                      variant='contained' color='error' fullWidth disabled={saving}
                      onClick={() => handleLifecycleAction('reject')}
                    >
                      Confirmar rechazo
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
              startIcon={<i className='tabler-send' />}
              onClick={() => handleLifecycleAction('submit')}
            >
              Re-enviar al cliente
            </Button>
          </>
        )}
      </Stack>

      {!isEditing && (
        <>
          <Divider />
          <Box sx={{ display: 'flex', gap: 2, p: 4 }}>
            <Button variant='outlined' color='secondary' onClick={handleClose} fullWidth>Cancelar</Button>
            <Button variant='contained' color='primary' onClick={handleSubmit} disabled={saving} fullWidth startIcon={<i className='tabler-check' />}>
              {saving ? 'Guardando...' : 'Registrar HES'}
            </Button>
          </Box>
        </>
      )}
    </Drawer>
  )
}

export default CreateHesDrawer
