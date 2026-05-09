'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { toast } from 'sonner'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTextField from '@core/components/mui/TextField'

import { GH_AGENCY } from '@/lib/copy/agency'
import { formatDateTime } from '@/lib/format'

const COPY = GH_AGENCY.sampleSprints.deadLetter

interface DeadLetterErrorEntry {
  eventKind: string
  occurredAt: string | null
  errorMessage: string | null
}

interface DeadLetterItem {
  serviceId: string
  name: string
  hubspotDealId: string | null
  idempotencyKey: string | null
  engagementKind: string
  organizationId: string | null
  spaceId: string | null
  updatedAt: string | null
  createdAt: string | null
  lastErrors: DeadLetterErrorEntry[]
}

interface ListResponse {
  items: DeadLetterItem[]
  count: number
}

const SampleSprintDeadLetterView = () => {
  const [items, setItems] = useState<DeadLetterItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [retrying, setRetrying] = useState<string | null>(null)
  const [skipping, setSkipping] = useState<string | null>(null)
  const [confirmRetry, setConfirmRetry] = useState<DeadLetterItem | null>(null)
  const [confirmSkip, setConfirmSkip] = useState<DeadLetterItem | null>(null)
  const [skipReason, setSkipReason] = useState('')

  const loadList = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/integrations/hubspot/sample-sprint-dead-letter', {
        credentials: 'same-origin',
        cache: 'no-store'
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)

        setError(errorBody?.error ?? COPY.genericLoadError)
        setItems([])

        return
      }

      const payload = (await response.json()) as ListResponse

      setItems(payload.items)
    } catch {
      setError(COPY.genericLoadError)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadList()
  }, [loadList])

  const filteredItems = useMemo(() => {
    if (!filter.trim()) return items
    const needle = filter.trim().toLowerCase()

    return items.filter(
      item =>
        item.name.toLowerCase().includes(needle) ||
        item.serviceId.toLowerCase().includes(needle)
    )
  }, [items, filter])

  const handleRetryConfirmed = async () => {
    if (!confirmRetry) return
    const serviceId = confirmRetry.serviceId

    setRetrying(serviceId)

    try {
      const response = await fetch(
        `/api/admin/integrations/hubspot/sample-sprint-dead-letter/${encodeURIComponent(serviceId)}/retry`,
        { method: 'POST', credentials: 'same-origin' }
      )

      if (!response.ok) {
        const body = await response.json().catch(() => null)

        toast.error(body?.error ?? COPY.toast.retryError)

        return
      }

      toast.success(COPY.toast.retrySuccess)
      setConfirmRetry(null)
      await loadList()
    } catch {
      toast.error(COPY.toast.retryError)
    } finally {
      setRetrying(null)
    }
  }

  const handleSkipConfirmed = async () => {
    if (!confirmSkip) return
    const reason = skipReason.trim()

    if (reason.length < 5) {
      toast.error(COPY.reasonTooShort)

      return
    }

    const serviceId = confirmSkip.serviceId

    setSkipping(serviceId)

    try {
      const response = await fetch(
        `/api/admin/integrations/hubspot/sample-sprint-dead-letter/${encodeURIComponent(serviceId)}/skip`,
        {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason })
        }
      )

      if (!response.ok) {
        const body = await response.json().catch(() => null)

        toast.error(body?.error ?? COPY.toast.skipError)

        return
      }

      toast.success(COPY.toast.skipSuccess)
      setConfirmSkip(null)
      setSkipReason('')
      await loadList()
    } catch {
      toast.error(COPY.toast.skipError)
    } finally {
      setSkipping(null)
    }
  }

  const counter = items.length

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title={COPY.pageTitle}
          subheader={COPY.pageSubtitle}
          avatar={
            <CustomAvatar skin='light' color='error' variant='rounded'>
              <i className='tabler-cloud-off' aria-hidden='true' />
            </CustomAvatar>
          }
          action={
            counter > 0 ? (
              <Chip
                color='error'
                variant='tonal'
                label={COPY.counterAria(counter)}
                aria-label={COPY.counterAria(counter)}
              />
            ) : null
          }
        />
        <Divider />
        <CardContent>
          <CustomTextField
            fullWidth
            placeholder={COPY.filterPlaceholder}
            value={filter}
            onChange={event => setFilter(event.target.value)}
            sx={{ mb: 4 }}
            slotProps={{
              input: {
                startAdornment: (
                  <i className='tabler-search' style={{ marginRight: 8 }} aria-hidden='true' />
                )
              }
            }}
          />
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress aria-label={COPY.ariaLoadingList} />
            </Box>
          ) : error ? (
            <Alert severity='error' role='alert'>
              {error}
            </Alert>
          ) : items.length === 0 ? (
            <Alert
              severity='success'
              role='status'
              icon={<i className='tabler-cloud-check' aria-hidden='true' />}
              sx={{ alignItems: 'flex-start' }}
            >
              <Typography variant='subtitle2'>{COPY.empty.title}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {COPY.empty.description}
              </Typography>
            </Alert>
          ) : filteredItems.length === 0 ? (
            <Alert severity='info' role='status'>
              {COPY.filterEmpty}
            </Alert>
          ) : (
            <Stack spacing={3}>
              {filteredItems.map(item => (
                <Card
                  key={item.serviceId}
                  elevation={0}
                  sx={{
                    border: theme => `1px solid ${theme.palette.divider}`,
                    borderLeft: '4px solid',
                    borderLeftColor: 'error.main'
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant='subtitle1' noWrap>
                          {item.name}
                        </Typography>
                        <Typography variant='caption' color='text.secondary' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          Service: {item.serviceId} · Deal: {item.hubspotDealId ?? '—'} · Tipo: {item.engagementKind}
                        </Typography>
                      </Box>
                      <Chip
                        size='small'
                        color='error'
                        variant='tonal'
                        label='Dead-letter'
                        icon={<i className='tabler-alert-octagon' aria-hidden='true' />}
                      />
                    </Box>
                    {item.lastErrors.length > 0 ? (
                      <Box sx={{ mb: 3 }}>
                        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                          {COPY.lastErrorLabel}
                        </Typography>
                        <Stack spacing={1}>
                          {item.lastErrors.slice(0, 3).map((err, idx) => (
                            <Box key={idx} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                              <i
                                className='tabler-alert-circle'
                                aria-hidden='true'
                                style={{ marginTop: 4, color: 'var(--mui-palette-error-main)' }}
                              />
                              <Box>
                                <Typography variant='body2'>
                                  {err.errorMessage ?? err.eventKind}
                                </Typography>
                                {err.occurredAt ? (
                                  <Typography variant='caption' color='text.secondary'>
                                    {formatDateTime(err.occurredAt, { locale: 'es-CL' })}
                                  </Typography>
                                ) : null}
                              </Box>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    ) : null}
                    <Stack direction='row' spacing={2} sx={{ flexWrap: 'wrap' }}>
                      <Button
                        variant='contained'
                        color='primary'
                        size='small'
                        onClick={() => setConfirmRetry(item)}
                        disabled={retrying === item.serviceId}
                        startIcon={
                          retrying === item.serviceId ? (
                            <CircularProgress size={16} />
                          ) : (
                            <i className='tabler-refresh' aria-hidden='true' />
                          )
                        }
                        aria-label={`${COPY.actions.retry} ${item.name}`}
                      >
                        {COPY.actions.retry}
                      </Button>
                      <Button
                        variant='outlined'
                        color='warning'
                        size='small'
                        onClick={() => setConfirmSkip(item)}
                        disabled={skipping === item.serviceId}
                        startIcon={<i className='tabler-x' aria-hidden='true' />}
                        aria-label={`${COPY.actions.skip} ${item.name}`}
                      >
                        {COPY.actions.skip}
                      </Button>
                      <Button
                        component='a'
                        href='/docs/operations/runbooks/sample-sprint-outbound-recovery.md'
                        target='_blank'
                        rel='noopener'
                        variant='text'
                        size='small'
                        startIcon={<i className='tabler-book' aria-hidden='true' />}
                      >
                        {COPY.actions.viewRunbook}
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Retry confirmation dialog */}
      <Dialog open={Boolean(confirmRetry)} onClose={() => setConfirmRetry(null)} aria-labelledby='retry-dialog-title'>
        <DialogTitle id='retry-dialog-title'>{COPY.retryConfirm.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{COPY.retryConfirm.body}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRetry(null)}>{COPY.retryConfirm.secondary}</Button>
          <Button
            variant='contained'
            color='primary'
            onClick={handleRetryConfirmed}
            disabled={retrying !== null}
          >
            {COPY.retryConfirm.primary}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Skip confirmation dialog (with reason input) */}
      <Dialog
        open={Boolean(confirmSkip)}
        onClose={() => {
          setConfirmSkip(null)
          setSkipReason('')
        }}
        aria-labelledby='skip-dialog-title'
        fullWidth
        maxWidth='sm'
      >
        <DialogTitle id='skip-dialog-title'>{COPY.skipConfirm.title}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>{COPY.skipConfirm.body}</DialogContentText>
          <CustomTextField
            fullWidth
            multiline
            rows={3}
            label={COPY.skipConfirm.reasonLabel}
            placeholder={COPY.skipConfirm.reasonPlaceholder}
            value={skipReason}
            onChange={event => setSkipReason(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setConfirmSkip(null)
              setSkipReason('')
            }}
          >
            {COPY.skipConfirm.secondary}
          </Button>
          <Button
            variant='contained'
            color='warning'
            onClick={handleSkipConfirmed}
            disabled={skipping !== null || skipReason.trim().length < 5}
          >
            {COPY.skipConfirm.primary}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default SampleSprintDeadLetterView
