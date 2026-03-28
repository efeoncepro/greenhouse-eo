'use client'

import { useCallback, useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

import CustomIconButton from '@core/components/mui/IconButton'
import CustomTextField from '@core/components/mui/TextField'

interface Subscription {
  subscriptionId: string
  emailType: string
  recipientEmail: string
  recipientName: string | null
  active: boolean
  createdAt: string
}

const EMAIL_TYPE_LABELS: Record<string, string> = {
  password_reset: 'Contraseña',
  invitation: 'Invitación',
  verify_email: 'Verificación',
  payroll_export: 'Cierre nómina',
  payroll_receipt: 'Recibo nómina',
  notification: 'Notificación'
}

const ALL_EMAIL_TYPES = Object.keys(EMAIL_TYPE_LABELS)

const EmailDeliverySubscriptionsTab = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addEmailType, setAddEmailType] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addName, setAddName] = useState('')
  const [removeTarget, setRemoveTarget] = useState<Subscription | null>(null)

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/admin/email-subscriptions')
      const json = await res.json()

      setSubscriptions(json.data ?? [])
    } catch {
      setSubscriptions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSubscriptions() }, [fetchSubscriptions])

  const grouped = ALL_EMAIL_TYPES.reduce<Record<string, Subscription[]>>((acc, type) => {
    acc[type] = subscriptions.filter(s => s.emailType === type)

    return acc
  }, {})

  const handleAdd = async () => {
    if (!addEmailType || !addEmail) return

    await fetch('/api/admin/email-subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailType: addEmailType, recipientEmail: addEmail, recipientName: addName || undefined })
    })

    setAddDialogOpen(false)
    setAddEmailType('')
    setAddEmail('')
    setAddName('')
    fetchSubscriptions()
  }

  const handleRemove = async () => {
    if (!removeTarget) return

    await fetch('/api/admin/email-subscriptions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionId: removeTarget.subscriptionId })
    })

    setRemoveTarget(null)
    fetchSubscriptions()
  }

  return (
    <>
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title='Suscripciones por tipo'
          subheader='Define quién recibe cada tipo de correo'
        />
        <Divider />
        <CardContent>
          {loading ? (
            <Typography variant='body2' color='text.secondary' sx={{ py: 4, textAlign: 'center' }}>
              Cargando suscripciones...
            </Typography>
          ) : (
            <Grid container spacing={4}>
              {Object.entries(grouped).map(([type, subs]) => (
                <Grid key={type} size={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 4, height: 20, bgcolor: 'primary.main', borderRadius: 1 }} />
                      <Typography variant='subtitle2' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {EMAIL_TYPE_LABELS[type] ?? type}
                      </Typography>
                      <Typography variant='caption' color='text.disabled'>({type})</Typography>
                    </Box>
                    <Button
                      size='small'
                      variant='text'
                      startIcon={<i className='tabler-plus' />}
                      onClick={() => { setAddEmailType(type); setAddDialogOpen(true) }}
                    >
                      Agregar
                    </Button>
                  </Box>

                  {subs.length === 0 ? (
                    <Card elevation={0} sx={{ bgcolor: 'action.hover', p: 2 }}>
                      <Typography variant='body2' color='text.secondary'>
                        Sin suscriptores configurados. Los correos de este tipo se envían directamente a quien los solicita.
                      </Typography>
                    </Card>
                  ) : (
                    <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
                      {subs.map((sub, i) => (
                        <Box key={sub.subscriptionId}>
                          {i > 0 && <Divider />}
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 1.5 }}>
                            <Box>
                              <Typography variant='body2'>{sub.recipientName ?? sub.recipientEmail}</Typography>
                              {sub.recipientName && (
                                <Typography variant='caption' color='text.secondary'>{sub.recipientEmail}</Typography>
                              )}
                            </Box>
                            <CustomIconButton
                              variant='tonal'
                              color='error'
                              size='small'
                              onClick={() => setRemoveTarget(sub)}
                              aria-label={`Quitar a ${sub.recipientName ?? sub.recipientEmail} de ${EMAIL_TYPE_LABELS[type] ?? type}`}
                            >
                              <i className='tabler-x' style={{ fontSize: '16px' }} />
                            </CustomIconButton>
                          </Box>
                        </Box>
                      ))}
                    </Card>
                  )}
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Add subscriber dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>Agregar suscriptor</DialogTitle>
        <DialogContent>
          <Grid container spacing={4} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <CustomTextField
                select fullWidth label='Tipo de correo' value={addEmailType}
                onChange={e => setAddEmailType(e.target.value)}
              >
                {Object.entries(EMAIL_TYPE_LABELS).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </CustomTextField>
            </Grid>
            <Grid size={12}>
              <CustomTextField
                fullWidth label='Correo electrónico' placeholder='ej. nombre@empresa.com'
                value={addEmail} onChange={e => setAddEmail(e.target.value)}
              />
            </Grid>
            <Grid size={12}>
              <CustomTextField
                fullWidth label='Nombre (opcional)' placeholder='ej. Finanzas | Efeonce'
                value={addName} onChange={e => setAddName(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
          <Button variant='contained' onClick={handleAdd} disabled={!addEmailType || !addEmail.includes('@')}>
            Agregar suscriptor
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove subscriber dialog */}
      <Dialog open={Boolean(removeTarget)} onClose={() => setRemoveTarget(null)} maxWidth='xs' fullWidth>
        <DialogTitle>Quitar suscriptor?</DialogTitle>
        <DialogContent>
          <Typography variant='body2'>
            <strong>{removeTarget?.recipientName ?? removeTarget?.recipientEmail}</strong> dejará de recibir correos
            de tipo <strong>{EMAIL_TYPE_LABELS[removeTarget?.emailType ?? ''] ?? removeTarget?.emailType}</strong>.
            Puedes agregarlo de nuevo en cualquier momento.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveTarget(null)}>Cancelar</Button>
          <Button variant='contained' color='error' onClick={handleRemove}>
            Quitar suscriptor
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default EmailDeliverySubscriptionsTab
