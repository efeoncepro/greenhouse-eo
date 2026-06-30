'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useSearchParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
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
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import { GoogleSearchConsoleIsotype } from '@/components/greenhouse/brand/BrandIsotypes'
import { GH_SEARCH_CONSOLE as T } from '@/lib/copy/growth'
import { formatRelative } from '@/lib/format'

export interface SearchConsoleConnectionPanelConnection {
  organizationId: string
  siteUrl: string | null
  status: 'active' | 'revoked' | 'expired' | 'pending'
  connectedAt: string | null
  lastVerifiedAt: string | null
  lastErrorCode: string | null
}

interface SearchConsoleConnectionPanelProps {
  organizationId: string
  connection: SearchConsoleConnectionPanelConnection | null
  enabled: boolean
  canConnect: boolean
}

interface PropertyOption {
  siteUrl: string
  permissionLevel: string | null
}

const STATUS_META: Record<
  SearchConsoleConnectionPanelConnection['status'] | 'empty' | 'connecting' | 'locked' | 'error',
  { label: string; color: 'success' | 'warning' | 'error' | 'secondary' | 'info'; icon: string }
> = {
  active: { label: T.status.connected, color: 'success', icon: 'tabler-circle-check-filled' },
  revoked: { label: T.status.revoked, color: 'warning', icon: 'tabler-alert-triangle' },
  expired: { label: T.status.expired, color: 'warning', icon: 'tabler-clock-exclamation' },
  pending: { label: T.status.pending, color: 'info', icon: 'tabler-clock' },
  empty: { label: T.status.notConnected, color: 'secondary', icon: 'tabler-circle' },
  connecting: { label: T.status.connecting, color: 'info', icon: 'tabler-loader-2' },
  locked: { label: T.status.pending, color: 'secondary', icon: 'tabler-lock' },
  error: { label: T.status.error, color: 'error', icon: 'tabler-alert-circle' }
}

const resolveStatusKey = (
  enabled: boolean,
  connecting: boolean,
  connection: SearchConsoleConnectionPanelConnection | null,
  hasError: boolean
): keyof typeof STATUS_META => {
  if (!enabled) return 'locked'
  if (connecting) return 'connecting'
  if (hasError) return 'error'

  return connection?.status ?? 'empty'
}

const buildStartUrl = (organizationId: string): string => {
  const params = new URLSearchParams({ organizationId, returnTo: window.location.pathname })

  return `/api/admin/growth/search-console/oauth/start?${params.toString()}`
}

export const SearchConsoleConnectionPanel = ({
  organizationId,
  connection,
  enabled,
  canConnect
}: SearchConsoleConnectionPanelProps) => {
  const theme = useTheme()
  const searchParams = useSearchParams()
  const disconnectButtonRef = useRef<HTMLButtonElement | null>(null)

  const [localConnection, setLocalConnection] = useState(connection)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [panelError, setPanelError] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  // Property-picker (desplegable post-consentimiento).
  const [sites, setSites] = useState<PropertyOption[] | null>(null)
  const [sitesLoading, setSitesLoading] = useState(false)
  const [sitesError, setSitesError] = useState<string | null>(null)
  const [selectedSite, setSelectedSite] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLocalConnection(connection)
  }, [connection])

  useEffect(() => {
    const result = searchParams.get('searchConsole')

    if (result === 'connected') {
      setAnnouncement(T.feedback.connected)
    } else if (result === 'error') {
      setAnnouncement(T.feedback.connectionFailed)
      setPanelError(T.state.errorBody)
    } else if (result === 'disconnected') {
      setAnnouncement(T.disconnect.success)
    }
  }, [searchParams])

  const isPending = localConnection?.status === 'pending'
  const isConnected = localConnection?.status === 'active'
  const needsReconnect = localConnection?.status === 'revoked' || localConnection?.status === 'expired'
  const canRunActions = enabled && canConnect

  const loadSites = useCallback(async () => {
    setSitesLoading(true)
    setSitesError(null)

    try {
      const res = await fetch(`/api/admin/growth/search-console/sites?organizationId=${encodeURIComponent(organizationId)}`)

      if (!res.ok) {
        throw new Error('sites_failed')
      }

      const body = (await res.json()) as { sites?: PropertyOption[] }

      setSites(body.sites ?? [])
    } catch {
      setSites(null)
      setSitesError(T.feedback.sitesError)
    } finally {
      setSitesLoading(false)
    }
  }, [organizationId])

  // Al quedar `pending` (cuenta conectada, propiedad sin elegir) cargamos el desplegable.
  useEffect(() => {
    if (isPending && canRunActions && sites === null && !sitesLoading && !sitesError) {
      void loadSites()
    }
  }, [isPending, canRunActions, sites, sitesLoading, sitesError, loadSites])

  const verifiedLabel = useMemo(() => {
    if (!localConnection?.lastVerifiedAt) {
      return T.panel.notVerified
    }

    return formatRelative(localConnection.lastVerifiedAt, { fallback: T.panel.notVerified }, 'es-CL')
  }, [localConnection?.lastVerifiedAt])

  const connectedLabel = useMemo(() => {
    if (!localConnection?.connectedAt) {
      return null
    }

    return formatRelative(localConnection.connectedAt, { fallback: '' }, 'es-CL')
  }, [localConnection?.connectedAt])

  const handleConnect = useCallback(() => {
    setPanelError(null)
    setConnecting(true)
    setAnnouncement(T.state.connectingBody)
    window.location.assign(buildStartUrl(organizationId))
  }, [organizationId])

  const handleSelectProperty = useCallback(
    async (siteUrl: string) => {
      setSelectedSite(siteUrl)

      if (!siteUrl) {
        return
      }

      setSaving(true)
      setSitesError(null)

      try {
        const res = await fetch('/api/admin/growth/search-console/select-property', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationId, siteUrl })
        })

        if (!res.ok) {
          throw new Error('select_failed')
        }

        setLocalConnection(current =>
          current ? { ...current, status: 'active', siteUrl, lastErrorCode: null } : current
        )
        setAnnouncement(T.feedback.propertySaved)
      } catch {
        setSitesError(T.feedback.propertyNotAccessible)
        setAnnouncement(T.feedback.propertyNotAccessible)
      } finally {
        setSaving(false)
      }
    },
    [organizationId]
  )

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true)
    setPanelError(null)

    try {
      const res = await fetch('/api/admin/growth/search-console/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId })
      })

      if (!res.ok) {
        throw new Error('disconnect_failed')
      }

      setLocalConnection(current => (current ? { ...current, status: 'revoked', lastErrorCode: null } : current))
      setSites(null)
      setSelectedSite('')
      setAnnouncement(T.disconnect.success)
      setDialogOpen(false)
    } catch {
      setPanelError(T.disconnect.error)
      setAnnouncement(T.disconnect.error)
    } finally {
      setDisconnecting(false)
      disconnectButtonRef.current?.focus()
    }
  }, [organizationId])

  const statusKey = resolveStatusKey(enabled, connecting, localConnection, Boolean(panelError))
  const statusMeta = STATUS_META[statusKey]

  const bodyCopy = !enabled
    ? T.panel.lockedBody
    : panelError
      ? panelError
      : isConnected
        ? T.state.connectedBody
        : isPending
          ? T.state.pendingBody
          : needsReconnect
            ? T.state.revokedBody
            : connecting
              ? T.state.connectingBody
              : T.state.emptyBody

  return (
    <Box
      data-capture='search-console-connect-panel'
      aria-label={T.aria.panel}
      sx={{
        p: 4,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper,
        overflowX: 'clip',
        minWidth: 0
      }}
    >
      <Box role='status' aria-live='polite' sx={visuallyHidden}>
        {announcement}
      </Box>

      <Stack direction='row' spacing={3} alignItems='flex-start' sx={{ minWidth: 0 }}>
        <GoogleSearchConsoleIsotype size={32} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction='row' spacing={2} alignItems='center' useFlexGap flexWrap='wrap'>
            <Typography variant='body1' component='h3' sx={{ fontWeight: 600, lineHeight: 1.2 }}>
              {T.panel.title}
            </Typography>
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color={statusMeta.color}
              icon={<i className={statusMeta.icon} />}
              label={statusMeta.label}
            />
          </Stack>
          <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
            {T.panel.subtitle}
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={3} sx={{ mt: 3, minWidth: 0 }}>
        {!enabled ? (
          <Alert severity='info' variant='outlined' sx={{ borderRadius: `${theme.shape.customBorderRadius.sm}px` }}>
            <AlertTitle sx={{ fontWeight: 600 }}>{T.panel.lockedTitle}</AlertTitle>
            {bodyCopy}
          </Alert>
        ) : !canConnect ? (
          <Alert severity='info' variant='outlined' sx={{ borderRadius: `${theme.shape.customBorderRadius.sm}px` }}>
            <AlertTitle sx={{ fontWeight: 600 }}>{T.panel.deniedTitle}</AlertTitle>
            {T.panel.deniedBody}
          </Alert>
        ) : panelError ? (
          <Alert severity='error' variant='outlined' sx={{ borderRadius: `${theme.shape.customBorderRadius.sm}px` }}>
            <AlertTitle sx={{ fontWeight: 600 }}>{T.state.errorTitle}</AlertTitle>
            {bodyCopy}
          </Alert>
        ) : (
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {bodyCopy}
          </Typography>
        )}

        {isConnected && localConnection?.siteUrl ? (
          <Box
            sx={{
              p: 3,
              borderRadius: `${theme.shape.customBorderRadius.sm}px`,
              bgcolor: alpha(theme.palette.primary.main, 0.04),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
              minWidth: 0
            }}
          >
            <Typography variant='caption' sx={{ color: 'text.disabled', display: 'block', mb: 0.5 }}>
              {T.panel.propertyLabel}
            </Typography>
            <Tooltip title={localConnection.siteUrl} placement='top-start'>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}
              >
                {localConnection.siteUrl}
              </Typography>
            </Tooltip>
            <Stack direction='row' spacing={2} useFlexGap flexWrap='wrap' sx={{ mt: 1 }}>
              <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                {T.panel.lastVerified}: {verifiedLabel}
              </Typography>
              {connectedLabel ? (
                <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                  {T.panel.connectedAt}: {connectedLabel}
                </Typography>
              ) : null}
            </Stack>
          </Box>
        ) : isPending && canRunActions ? (
          <Box sx={{ minWidth: 0 }}>
            {sitesLoading ? (
              <Stack direction='row' spacing={2} alignItems='center'>
                <CircularProgress size={18} />
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  {T.feedback.sitesLoading}
                </Typography>
              </Stack>
            ) : sitesError ? (
              <Alert
                severity='warning'
                variant='outlined'
                sx={{ borderRadius: `${theme.shape.customBorderRadius.sm}px` }}
                action={
                  <Button color='inherit' size='small' onClick={() => void loadSites()}>
                    {T.cta.retry}
                  </Button>
                }
              >
                {sitesError}
              </Alert>
            ) : sites && sites.length === 0 ? (
              <Alert severity='info' variant='outlined' sx={{ borderRadius: `${theme.shape.customBorderRadius.sm}px` }}>
                {T.feedback.sitesEmpty}
              </Alert>
            ) : (
              <CustomTextField
                select
                fullWidth
                label={T.panel.chooseProperty}
                value={selectedSite}
                onChange={event => void handleSelectProperty(event.target.value)}
                helperText={T.panel.chooseHelper}
                disabled={saving}
                slotProps={{ select: { displayEmpty: true, 'aria-label': T.aria.propertySelect } }}
              >
                <MenuItem value='' disabled>
                  {T.panel.chooseProperty}
                </MenuItem>
                {(sites ?? []).map(site => (
                  <MenuItem key={site.siteUrl} value={site.siteUrl}>
                    {site.siteUrl}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          </Box>
        ) : null}

        {canRunActions ? (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{ pr: { xs: 16, sm: 0 } }}
          >
            {isConnected ? (
              <Button
                ref={disconnectButtonRef}
                variant='outlined'
                color='error'
                onClick={() => setDialogOpen(true)}
                startIcon={<i className='tabler-unlink' />}
              >
                {T.cta.disconnect}
              </Button>
            ) : isPending ? null : (
              <Button
                variant='contained'
                onClick={handleConnect}
                disabled={connecting}
                startIcon={connecting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-plug-connected' />}
              >
                {needsReconnect ? T.cta.reconnect : panelError ? T.cta.retry : T.cta.connectAccount}
              </Button>
            )}
          </Stack>
        ) : null}
      </Stack>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        aria-labelledby='search-console-disconnect-title'
        aria-describedby='search-console-disconnect-body'
      >
        <DialogTitle id='search-console-disconnect-title'>{T.disconnect.title}</DialogTitle>
        <DialogContent>
          <DialogContentText id='search-console-disconnect-body'>{T.disconnect.body}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} autoFocus disabled={disconnecting}>
            {T.cta.cancel}
          </Button>
          <Button
            color='error'
            variant='contained'
            onClick={() => void handleDisconnect()}
            disabled={disconnecting}
            startIcon={disconnecting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-unlink' />}
          >
            {T.cta.confirmDisconnect}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
