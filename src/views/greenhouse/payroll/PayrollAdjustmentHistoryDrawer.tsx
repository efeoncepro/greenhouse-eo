'use client'

// TASK-745 — Drawer con historial completo de adjustments del entry.
// Lista activos, pending_approval, reverted, superseded; permite revertir y aprobar.

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

import { ADJUSTMENT_REASON_LABELS } from '@/lib/payroll/adjustments/reason-codes'
import type { PayrollAdjustment, AdjustmentStatus } from '@/types/payroll-adjustments'

interface Props {
  open: boolean
  onClose: () => void
  entryId: string | null
  memberName: string | null
  canApprove: boolean
}

const STATUS_CHIP: Record<
  AdjustmentStatus,
  { label: string; color: 'success' | 'warning' | 'secondary' | 'error' }
> = {
  active: { label: 'Activo', color: 'success' },
  pending_approval: { label: 'Pendiente aprobacion', color: 'warning' },
  reverted: { label: 'Revertido', color: 'error' },
  superseded: { label: 'Reemplazado', color: 'secondary' }
}

const KIND_LABELS: Record<string, string> = {
  exclude: 'Excluir de la nomina',
  gross_factor: 'Pagar porcentaje',
  gross_factor_per_component: 'Porcentaje por componente',
  fixed_deduction: 'Descuento absoluto',
  manual_override: 'Override de neto'
}

const formatPayloadSummary = (kind: string, payload: Record<string, unknown>): string => {
  if (kind === 'exclude') return ''

  if (kind === 'gross_factor') {
    const f = Number((payload as { factor?: number }).factor)

    return Number.isFinite(f) ? `${(f * 100).toFixed(0)}%` : '—'
  }

  if (kind === 'fixed_deduction') {
    const a = Number((payload as { amount?: number }).amount)

    return Number.isFinite(a) ? `$${a.toLocaleString('es-CL')}` : '—'
  }

  if (kind === 'manual_override') {
    const v = Number((payload as { netClp?: number }).netClp)

    return Number.isFinite(v) ? `Neto $${v.toLocaleString('es-CL')}` : '—'
  }

  return ''
}

const formatTimestamp = (iso: string | null): string => {
  if (!iso) return '—'

  try {
    return new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}

const PayrollAdjustmentHistoryDrawer = ({
  open,
  onClose,
  entryId,
  memberName,
  canApprove
}: Props) => {
  const [adjustments, setAdjustments] = useState<PayrollAdjustment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionInFlight, setActionInFlight] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!entryId) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/hr/payroll/entries/${entryId}/adjustments`)

      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()

      setAdjustments(data.adjustments ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar los ajustes.')
    } finally {
      setLoading(false)
    }
  }, [entryId])

  useEffect(() => {
    if (open && entryId) {
      void load()
    } else {
      setAdjustments([])
      setError(null)
    }
  }, [open, entryId, load])

  const handleRevert = async (adjustmentId: string) => {
    if (!entryId) return

    const reason = window.prompt(
      'Indica el motivo de la reversion (queda en el audit, min 5 caracteres):'
    )

    if (!reason || reason.trim().length < 5) return
    setActionInFlight(adjustmentId)

    try {
      const res = await fetch(
        `/api/hr/payroll/entries/${entryId}/adjustments/${adjustmentId}/revert`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ revertedReason: reason.trim() })
        }
      )

      if (!res.ok) {
        const j = await res.json().catch(() => null)

        throw new Error(j?.error || `Error ${res.status}`)
      }

      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible revertir.')
    } finally {
      setActionInFlight(null)
    }
  }

  const handleApprove = async (adjustmentId: string) => {
    if (!entryId) return
    setActionInFlight(adjustmentId)

    try {
      const res = await fetch(
        `/api/hr/payroll/entries/${entryId}/adjustments/${adjustmentId}/approve`,
        { method: 'POST' }
      )

      if (!res.ok) {
        const j = await res.json().catch(() => null)

        throw new Error(j?.error || `Error ${res.status}`)
      }

      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible aprobar.')
    } finally {
      setActionInFlight(null)
    }
  }

  return (
    <Drawer anchor='right' open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}>
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant='h6'>Historial de ajustes</Typography>
        {memberName && (
          <Typography variant='body2' color='text.secondary'>
            {memberName}
          </Typography>
        )}
        <Box sx={{ flex: 1 }} />
        <IconButton onClick={onClose} aria-label='Cerrar'>
          <i className='tabler-x' />
        </IconButton>
      </Box>
      <Divider />
      <Box sx={{ p: 3 }}>
        {loading && (
          <Stack alignItems='center' sx={{ py: 4 }}>
            <CircularProgress size={24} />
          </Stack>
        )}

        {error && <Alert severity='error'>{error}</Alert>}

        {!loading && adjustments.length === 0 && !error && (
          <Typography color='text.secondary'>
            Sin ajustes para este colaborador en este periodo.
          </Typography>
        )}

        <Stack spacing={2}>
          {adjustments.map(a => {
            const statusChip = STATUS_CHIP[a.status]

            return (
              <Box
                key={a.adjustmentId}
                sx={{
                  border: t => `1px solid ${t.palette.divider}`,
                  borderRadius: 1,
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1
                }}
              >
                <Stack direction='row' alignItems='center' spacing={1} flexWrap='wrap'>
                  <Typography variant='body2' fontWeight={600}>
                    {KIND_LABELS[a.kind] ?? a.kind}
                  </Typography>
                  {formatPayloadSummary(a.kind, a.payload) && (
                    <Typography variant='body2' color='text.secondary' sx={{ fontFamily: 'monospace' }}>
                      {formatPayloadSummary(a.kind, a.payload)}
                    </Typography>
                  )}
                  <Box sx={{ flex: 1 }} />
                  <CustomChip
                    round='true'
                    size='small'
                    label={statusChip.label}
                    color={statusChip.color}
                  />
                </Stack>

                <Typography variant='caption' color='text.secondary'>
                  Motivo: {ADJUSTMENT_REASON_LABELS[a.reasonCode] ?? a.reasonCode}
                </Typography>
                <Typography variant='body2' sx={{ fontStyle: 'italic' }}>
                  &ldquo;{a.reasonNote}&rdquo;
                </Typography>

                <Typography variant='caption' color='text.disabled'>
                  Solicitado por {a.requestedBy} · {formatTimestamp(a.requestedAt)}
                </Typography>
                {a.approvedAt && (
                  <Typography variant='caption' color='text.disabled'>
                    Aprobado por {a.approvedBy} · {formatTimestamp(a.approvedAt)}
                  </Typography>
                )}
                {a.revertedAt && (
                  <Typography variant='caption' color='error.main'>
                    Revertido por {a.revertedBy} · {formatTimestamp(a.revertedAt)}: {a.revertedReason}
                  </Typography>
                )}

                {(a.status === 'pending_approval' || a.status === 'active') && (
                  <Stack direction='row' spacing={1} sx={{ mt: 1 }}>
                    {a.status === 'pending_approval' && canApprove && (
                      <Tooltip title='Aprobar este ajuste'>
                        <span>
                          <Button
                            size='small'
                            variant='tonal'
                            color='success'
                            onClick={() => handleApprove(a.adjustmentId)}
                            disabled={actionInFlight === a.adjustmentId}
                          >
                            Aprobar
                          </Button>
                        </span>
                      </Tooltip>
                    )}
                    <Tooltip title='Revertir este ajuste'>
                      <span>
                        <Button
                          size='small'
                          variant='tonal'
                          color='error'
                          onClick={() => handleRevert(a.adjustmentId)}
                          disabled={actionInFlight === a.adjustmentId}
                        >
                          Revertir
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                )}
              </Box>
            )
          })}
        </Stack>
      </Box>
    </Drawer>
  )
}

export default PayrollAdjustmentHistoryDrawer
