'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import AuditDiffViewer from '@/components/greenhouse/pricing/AuditDiffViewer'
import { GH_PRICING_GOVERNANCE } from '@/config/greenhouse-nomenclature'
import { formatDateTime } from '@/lib/format'

interface ApprovalEntry {
  approvalId: string
  entityType: string
  entityId: string
  entitySku: string | null
  proposedChanges: Record<string, unknown>
  proposedByUserId: string
  proposedByName: string
  proposedAt: string
  justification: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reviewedByUserId: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  reviewComment: string | null
  criticality: 'low' | 'medium' | 'high' | 'critical'
}

const CRITICALITY_COLOR: Record<ApprovalEntry['criticality'], 'error' | 'warning' | 'info' | 'secondary'> = {
  critical: 'error',
  high: 'warning',
  medium: 'info',
  low: 'secondary'
}

const CRITICALITY_LABEL: Record<ApprovalEntry['criticality'], string> = {
  critical: GH_PRICING_GOVERNANCE.approvals.criticalityCritical,
  high: GH_PRICING_GOVERNANCE.approvals.criticalityHigh,
  medium: GH_PRICING_GOVERNANCE.approvals.criticalityMedium,
  low: GH_PRICING_GOVERNANCE.approvals.criticalityLow
}

const STATUS_LABEL: Record<ApprovalEntry['status'], string> = {
  pending: GH_PRICING_GOVERNANCE.approvals.statusPending,
  approved: GH_PRICING_GOVERNANCE.approvals.statusApproved,
  rejected: GH_PRICING_GOVERNANCE.approvals.statusRejected,
  cancelled: GH_PRICING_GOVERNANCE.approvals.statusCancelled
}

const STATUS_COLOR: Record<ApprovalEntry['status'], 'warning' | 'success' | 'error' | 'secondary'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  cancelled: 'secondary'
}

const ApprovalsQueueView = () => {
  const [items, setItems] = useState<ApprovalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [decisionTarget, setDecisionTarget] = useState<
    { entry: ApprovalEntry; decision: 'approved' | 'rejected' | 'cancelled' } | null
  >(null)

  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/pricing-catalog/approvals?status=pending', {
        credentials: 'same-origin'
      })

      if (!response.ok) {
        setError('No pudimos cargar las aprobaciones.')

        return
      }

      const data = (await response.json()) as { items: ApprovalEntry[] }

      setItems(data.items)
    } catch {
      setError('No pudimos cargar las aprobaciones.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleSubmit = useCallback(async () => {
    if (!decisionTarget) return

    const commentTrimmed = comment.trim()

    if (commentTrimmed.length < 15) {
      setError(GH_PRICING_GOVERNANCE.approvals.commentTooShortError(15))

      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(
        `/api/admin/pricing-catalog/approvals/${encodeURIComponent(decisionTarget.entry.approvalId)}`,
        {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision: decisionTarget.decision, comment: commentTrimmed })
        }
      )

      if (response.status === 403) {
        setError(GH_PRICING_GOVERNANCE.approvals.errorSelfApprove)

        return
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }

        setError(payload.error || GH_PRICING_GOVERNANCE.approvals.errorGenericToast)

        return
      }

      setDecisionTarget(null)
      setComment('')
      await loadData()
    } catch {
      setError(GH_PRICING_GOVERNANCE.approvals.errorGenericToast)
    } finally {
      setSubmitting(false)
    }
  }, [comment, decisionTarget, loadData])

  const grouped = useMemo(() => {
    return items.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 }

      return order[a.criticality] - order[b.criticality]
    })
  }, [items])

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4' sx={{ fontWeight: 600, mb: 1 }}>
          {GH_PRICING_GOVERNANCE.approvals.pageTitle}
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          {GH_PRICING_GOVERNANCE.approvals.pageSubtitle}
        </Typography>
      </Grid>

      {error ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error'>{error}</Alert>
        </Grid>
      ) : null}

      <Grid size={{ xs: 12 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : grouped.length === 0 ? (
          <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant='h6' sx={{ mb: 1 }}>
                  {GH_PRICING_GOVERNANCE.approvals.emptyStateTitle}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {GH_PRICING_GOVERNANCE.approvals.emptyStateSubtitle}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            {grouped.map(entry => (
              <Card
                key={entry.approvalId}
                elevation={0}
                sx={{ border: theme => `1px solid ${theme.palette.divider}` }}
              >
                <CardHeader
                  title={
                    <Stack direction='row' spacing={1} alignItems='center'>
                      <CustomChip
                        size='small'
                        round='true'
                        variant='tonal'
                        color={CRITICALITY_COLOR[entry.criticality]}
                        label={CRITICALITY_LABEL[entry.criticality]}
                      />
                      <CustomChip
                        size='small'
                        round='true'
                        variant='tonal'
                        color={STATUS_COLOR[entry.status]}
                        label={STATUS_LABEL[entry.status]}
                      />
                      <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                        {entry.entityType} · {entry.entitySku ?? entry.entityId}
                      </Typography>
                    </Stack>
                  }
                  subheader={
                    <Typography variant='caption' color='text.secondary'>
                      {GH_PRICING_GOVERNANCE.approvals.proposerLabel}: {entry.proposedByName} ·{' '}
                      {formatDateTime(entry.proposedAt, { fallback: entry.proposedAt })}
                    </Typography>
                  }
                />
                <Divider />
                <CardContent>
                  <Stack spacing={2}>
                    {entry.justification ? (
                      <Box>
                        <Typography
                          variant='caption'
                          sx={{
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            color: 'text.secondary',
                            display: 'block'
                          }}
                        >
                          {GH_PRICING_GOVERNANCE.approvals.justificationLabel}
                        </Typography>
                        <Typography variant='body2'>{entry.justification}</Typography>
                      </Box>
                    ) : null}

                    <Box>
                      <Typography
                        variant='caption'
                        sx={{
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: 'text.secondary',
                          display: 'block',
                          mb: 1
                        }}
                      >
                        {GH_PRICING_GOVERNANCE.approvals.diffPreviewLabel}
                      </Typography>
                      <AuditDiffViewer
                        action='updated'
                        changeSummary={{ new_values: entry.proposedChanges, previous_values: {} }}
                      />
                    </Box>

                    <Stack direction='row' spacing={1}>
                      <Button
                        variant='contained'
                        color='success'
                        size='small'
                        onClick={() => {
                          setDecisionTarget({ entry, decision: 'approved' })
                          setComment('')
                        }}
                      >
                        {GH_PRICING_GOVERNANCE.approvals.approveCta}
                      </Button>
                      <Button
                        variant='outlined'
                        color='error'
                        size='small'
                        onClick={() => {
                          setDecisionTarget({ entry, decision: 'rejected' })
                          setComment('')
                        }}
                      >
                        {GH_PRICING_GOVERNANCE.approvals.rejectCta}
                      </Button>
                      <Button
                        variant='text'
                        size='small'
                        onClick={() => {
                          setDecisionTarget({ entry, decision: 'cancelled' })
                          setComment('')
                        }}
                      >
                        {GH_PRICING_GOVERNANCE.approvals.cancelCta}
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Grid>

      {decisionTarget ? (
        <Dialog
          open
          onClose={submitting ? undefined : () => setDecisionTarget(null)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>
            {decisionTarget.decision === 'approved'
              ? GH_PRICING_GOVERNANCE.approvals.approveCta
              : decisionTarget.decision === 'rejected'
                ? GH_PRICING_GOVERNANCE.approvals.rejectCta
                : GH_PRICING_GOVERNANCE.approvals.cancelCta}
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                label={GH_PRICING_GOVERNANCE.approvals.commentLabel}
                placeholder={GH_PRICING_GOVERNANCE.approvals.commentPlaceholder}
                value={comment}
                onChange={e => setComment(e.target.value.slice(0, 500))}
                multiline
                minRows={3}
                maxRows={6}
                fullWidth
                size='small'
                disabled={submitting}
                helperText={
                  comment.trim().length > 0 && comment.trim().length < 15
                    ? GH_PRICING_GOVERNANCE.approvals.commentTooShortError(15)
                    : undefined
                }
                error={comment.trim().length > 0 && comment.trim().length < 15}
              />
              {error ? <Alert severity='error'>{error}</Alert> : null}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDecisionTarget(null)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              variant='contained'
              onClick={() => void handleSubmit()}
              disabled={submitting || comment.trim().length < 15}
              startIcon={submitting ? <CircularProgress size={16} color='inherit' /> : null}
            >
              {submitting ? 'Aplicando…' : 'Confirmar'}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </Grid>
  )
}

export default ApprovalsQueueView
