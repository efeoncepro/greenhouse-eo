'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { toast } from 'sonner'

import CustomChip from '@core/components/mui/Chip'

import { getMicrocopy } from '@/lib/copy'
import { GH_WORKFORCE_ACTIVATION } from '@/lib/copy/workforce'

import type { PendingIntakeMemberRow } from '@/lib/workforce/intake-queue/list-pending-members'
import type { MatchSignal } from '@/lib/identity/reconciliation/types'

interface ExternalIdentityCandidate {
  sourceObjectId: string
  sourceDisplayName: string | null
  sourceEmail: string | null
  confidence: number
  signals: readonly MatchSignal[]
  alreadyLinkedToMemberId: string | null
  alreadyLinkedToDisplayName: string | null
  status: 'candidate' | 'conflict'
}

interface ExternalIdentityPayload {
  candidates: ExternalIdentityCandidate[]
  unavailable: boolean
  unavailableReason: string | null
}

interface WorkforceExternalIdentityDrawerProps {
  readonly open: boolean
  readonly member: PendingIntakeMemberRow | null
  readonly onClose: () => void
  readonly onResolved: () => Promise<void> | void
}

const WorkforceExternalIdentityDrawer = ({
  open,
  member,
  onClose,
  onResolved
}: WorkforceExternalIdentityDrawerProps) => {
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [payload, setPayload] = useState<ExternalIdentityPayload | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !member) return

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      setPayload(null)
      setNote('')

      try {
        const response = await fetch(`/api/hr/workforce/members/${member.memberId}/external-identity/notion`)
        const data = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(typeof data?.error === 'string' ? data.error : GH_WORKFORCE_ACTIVATION.external_identity_error)
        }

        if (!cancelled) setPayload(data as ExternalIdentityPayload)
      } catch (err) {
        const message = err instanceof Error ? err.message : GH_WORKFORCE_ACTIVATION.external_identity_error

        if (!cancelled) setError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [open, member])

  if (!member) return null

  const decide = async (candidate: ExternalIdentityCandidate, action: 'approve' | 'reject') => {
    setSavingId(candidate.sourceObjectId)
    setError(null)

    try {
      const response = await fetch(`/api/hr/workforce/members/${member.memberId}/external-identity/notion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          sourceObjectId: candidate.sourceObjectId,
          note: note.trim() || undefined
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : GH_WORKFORCE_ACTIVATION.external_identity_error)
      }

      toast.success(GH_WORKFORCE_ACTIVATION.external_identity_saved)
      await onResolved()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : GH_WORKFORCE_ACTIVATION.external_identity_error

      setError(message)
      toast.error(message)
    } finally {
      setSavingId(null)
    }
  }

  const copy = getMicrocopy()

  return (
    <Drawer anchor='right' open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, maxWidth: '100%' } }}>
      <Stack sx={{ minHeight: '100%' }}>
        <Box sx={{ p: 4 }}>
          <Stack direction='row' alignItems='flex-start' justifyContent='space-between' spacing={3}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant='h5'>{GH_WORKFORCE_ACTIVATION.external_identity_title}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {GH_WORKFORCE_ACTIVATION.external_identity_subtitle(member.displayName)}
              </Typography>
            </Box>
            <IconButton onClick={onClose} aria-label={copy.aria.closeDrawer}>
              <i className='tabler-x' />
            </IconButton>
          </Stack>
        </Box>
        <Divider />
        <Box sx={{ p: 4, flex: 1 }}>
          <Stack spacing={3}>
            {loading ? (
              <Stack direction='row' spacing={2} alignItems='center'>
                <CircularProgress size={18} />
                <Typography variant='body2'>{GH_WORKFORCE_ACTIVATION.external_identity_loading}</Typography>
              </Stack>
            ) : null}

            {error ? <Alert severity='error'>{error}</Alert> : null}
            {payload?.unavailable ? <Alert severity='warning'>{GH_WORKFORCE_ACTIVATION.external_identity_unavailable}</Alert> : null}

            <TextField
              fullWidth
              size='small'
              label={GH_WORKFORCE_ACTIVATION.resolver_reason}
              placeholder={GH_WORKFORCE_ACTIVATION.resolver_reason_placeholder}
              value={note}
              onChange={event => setNote(event.target.value)}
            />

            {!loading && payload && payload.candidates.length === 0 ? (
              <Alert severity='info'>{GH_WORKFORCE_ACTIVATION.external_identity_missing}</Alert>
            ) : null}

            {payload?.candidates.map(candidate => (
              <Box
                key={candidate.sourceObjectId}
                sx={{
                  border: theme => `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  p: 3
                }}
              >
                <Stack spacing={2}>
                  <Stack direction='row' justifyContent='space-between' spacing={2}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant='body1' sx={{ fontWeight: 700 }} noWrap>
                        {candidate.sourceDisplayName ?? candidate.sourceObjectId}
                      </Typography>
                      <Typography variant='caption' color='text.secondary' noWrap>
                        {candidate.sourceEmail ?? candidate.sourceObjectId}
                      </Typography>
                    </Box>
                    <CustomChip
                      round='true'
                      size='small'
                      variant='tonal'
                      color={candidate.status === 'conflict' ? 'error' : 'primary'}
                      label={candidate.status === 'conflict' ? GH_WORKFORCE_ACTIVATION.external_identity_conflict : `${Math.round(candidate.confidence * 100)}%`}
                    />
                  </Stack>

                  {candidate.alreadyLinkedToMemberId ? (
                    <Alert severity='error'>
                      {candidate.alreadyLinkedToDisplayName ?? candidate.alreadyLinkedToMemberId}
                    </Alert>
                  ) : null}

                  <Stack direction='row' spacing={2}>
                    <Button
                      size='small'
                      variant='contained'
                      disabled={candidate.status === 'conflict' || savingId === candidate.sourceObjectId}
                      startIcon={savingId === candidate.sourceObjectId ? <CircularProgress size={14} /> : <i className='tabler-link' />}
                      onClick={() => decide(candidate, 'approve')}
                    >
                      {GH_WORKFORCE_ACTIVATION.external_identity_approve}
                    </Button>
                    <Button
                      size='small'
                      variant='tonal'
                      color='secondary'
                      disabled={savingId === candidate.sourceObjectId}
                      onClick={() => decide(candidate, 'reject')}
                    >
                      {GH_WORKFORCE_ACTIVATION.external_identity_reject}
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Drawer>
  )
}

export default WorkforceExternalIdentityDrawer
