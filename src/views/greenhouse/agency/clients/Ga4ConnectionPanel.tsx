'use client'

import { useCallback, useEffect, useState } from 'react'

import { useSearchParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import { GH_GA4_CONNECTION as T } from '@/lib/copy/growth'

export interface Ga4ConnectionPanelData {
  organizationId: string
  propertyId: string | null
  propertyName: string | null
  status: 'active' | 'pending' | 'revoked' | 'expired'
}

interface Props {
  organizationId: string
  connection: Ga4ConnectionPanelData | null
  enabled: boolean
  canConnect: boolean
}

interface PropertyOption {
  propertyId: string
  displayName: string
  accountName: string
}

export const Ga4ConnectionPanel = ({ organizationId, connection, enabled, canConnect }: Props) => {
  const theme = useTheme()
  const searchParams = useSearchParams()
  const [current, setCurrent] = useState(connection)
  const [properties, setProperties] = useState<PropertyOption[] | null>(null)
  const [selectedProperty, setSelectedProperty] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => { setCurrent(connection) }, [connection])

  useEffect(() => {
    if (searchParams.get('ga4') === 'connected') setAnnouncement(T.connectedFeedback)
    if (searchParams.get('ga4') === 'error') setError(T.connectError)
  }, [searchParams])

  const loadProperties = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/growth/analytics-ga4/properties?organizationId=${encodeURIComponent(organizationId)}`)

      if (!response.ok) throw new Error('properties_unavailable')

      const body = await response.json() as { properties?: PropertyOption[] }

      setProperties(body.properties ?? [])
    } catch {
      setError(T.loadError)
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    if (enabled && canConnect && current?.status === 'pending' && properties === null && !loading && !error) {
      void loadProperties()
    }
  }, [enabled, canConnect, current?.status, properties, loading, error, loadProperties])

  const selectProperty = async (propertyId: string) => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/growth/analytics-ga4/select-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, propertyId })
      })

      if (!response.ok) throw new Error('selection_failed')

      const selected = properties?.find(property => property.propertyId === propertyId)

      setCurrent({ organizationId, propertyId, propertyName: selected?.displayName ?? propertyId, status: 'active' })
      setAnnouncement(T.propertyFeedback)
    } catch {
      setError(T.saveError)
      setSelectedProperty('')
    } finally {
      setSaving(false)
    }
  }

  const disconnect = async () => {
    setDisconnecting(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/growth/analytics-ga4/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId })
      })

      if (!response.ok) throw new Error('disconnect_failed')

      setCurrent(null)
      setProperties(null)
      setSelectedProperty('')
      setConfirmOpen(false)
      setAnnouncement(T.disconnectedFeedback)
    } catch {
      setError(T.disconnectError)
    } finally {
      setDisconnecting(false)
    }
  }

  const active = current?.status === 'active'
  const pending = current?.status === 'pending'
  const revoked = current?.status === 'revoked' || current?.status === 'expired'
  const state = !enabled ? T.unavailable : !canConnect ? T.denied : active ? '' : pending ? T.pending : revoked ? T.revoked : T.disconnected

  return (
    <Box
      data-capture='ga4-connect-panel'
      aria-label={T.ariaPanel}
      sx={{ p: 4, borderRadius: `${theme.shape.customBorderRadius.md}px`, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper', minWidth: 0 }}
    >
      <Typography role='status' aria-live='polite' sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {announcement}
      </Typography>
      <Stack direction='row' spacing={3} alignItems='flex-start'>
        <i className='tabler-chart-bar' aria-hidden='true' />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction='row' spacing={2} alignItems='center' useFlexGap flexWrap='wrap'>
            <Typography variant='body1' component='h3' sx={{ fontWeight: 600 }}>{T.title}</Typography>
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color={active ? 'success' : revoked ? 'warning' : 'secondary'}
              label={active ? T.connected : pending ? T.pendingStatus : revoked ? T.revokedStatus : T.notConnected}
            />
          </Stack>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>{T.subtitle}</Typography>
        </Box>
      </Stack>

      {state ? <Typography variant='body2' sx={{ color: 'text.secondary', mt: 3 }}>{state}</Typography> : null}
      {error ? <Alert severity='warning' sx={{ mt: 3 }}>{error}</Alert> : null}

      {active && current?.propertyId ? (
        <Box sx={{ mt: 3, p: 3, borderRadius: `${theme.shape.customBorderRadius.sm}px`, bgcolor: 'action.hover' }}>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>{T.property}</Typography>
          <Typography variant='body2' sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
            {current.propertyName} · {current.propertyId}
          </Typography>
        </Box>
      ) : null}

      {pending && enabled && canConnect ? (
        <Box sx={{ mt: 3 }}>
          {loading ? <Stack direction='row' spacing={2} alignItems='center'><CircularProgress size={18} /><Typography variant='body2'>{T.loading}</Typography></Stack> : null}
          {error ? <Button size='small' onClick={() => void loadProperties()}>{T.retry}</Button> : null}
          {properties?.length === 0 ? <Alert severity='info'>{T.noProperties}</Alert> : null}
          {properties && properties.length > 0 ? (
            <CustomTextField
              select
              fullWidth
              label={T.chooseProperty}
              value={selectedProperty}
              helperText={T.chooseHelper}
              disabled={saving}
              onChange={event => {
                setSelectedProperty(event.target.value)
                void selectProperty(event.target.value)
              }}
              slotProps={{ select: { 'aria-label': T.chooseProperty } }}
            >
              <MenuItem value='' disabled>{T.chooseProperty}</MenuItem>
              {properties.map(property => (
                <MenuItem key={property.propertyId} value={property.propertyId}>
                  {property.displayName} · {property.accountName} ({property.propertyId})
                </MenuItem>
              ))}
            </CustomTextField>
          ) : null}
        </Box>
      ) : null}

      {enabled && canConnect ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
          {active ? (
            <Button variant='outlined' color='error' startIcon={<i className='tabler-unlink' />} onClick={() => setConfirmOpen(true)}>{T.disconnect}</Button>
          ) : pending ? null : (
            <Button
              variant='contained'
              disabled={connecting}
              startIcon={connecting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-plug-connected' />}
              onClick={() => {
                setConnecting(true)
                window.location.assign(`/api/admin/growth/analytics-ga4/oauth/start?organizationId=${encodeURIComponent(organizationId)}`)
              }}
            >
              {revoked ? T.reconnect : T.connect}
            </Button>
          )}
        </Stack>
      ) : null}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} aria-labelledby='ga4-disconnect-title' aria-describedby='ga4-disconnect-body'>
        <DialogTitle id='ga4-disconnect-title'>{T.disconnectTitle}</DialogTitle>
        <DialogContent><DialogContentText id='ga4-disconnect-body'>{T.disconnectBody}</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={disconnecting}>{T.cancel}</Button>
          <Button color='error' variant='contained' onClick={() => void disconnect()} disabled={disconnecting}>{T.confirmDisconnect}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
