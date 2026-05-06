'use client'

import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { Theme } from '@mui/material/styles'

import { getMicrocopy } from '@/lib/copy'

import CustomChip from '@core/components/mui/Chip'

const GREENHOUSE_COPY = getMicrocopy()

const cardBorderSx = { border: (theme: Theme) => `1px solid ${theme.palette.divider}` }

type RoleTitleSource = 'unset' | 'entra' | 'hr_manual' | 'migration' | 'self_declared_pending'

type DriftDecision = 'accept_entra' | 'keep_hr' | 'dismissed'

interface GovernanceDto {
  memberId: string
  current: {
    roleTitle: string | null
    source: RoleTitleSource
    updatedAt: string | null
    updatedByUserId: string | null
    lastHumanUpdateAt: string | null
  }
  entra: { jobTitle: string | null }
  drift: {
    hasDriftWithEntra: boolean
    pendingProposalId: string | null
    pendingProposalProposedRoleTitle: string | null
    pendingProposalFirstDetectedAt: string | null
    pendingProposalLastDetectedAt: string | null
    pendingProposalOccurrenceCount: number | null
  }
  capabilities: {
    canUpdate: boolean
    canResolveDrift: boolean
  }
}

const SOURCE_LABEL: Record<RoleTitleSource, string> = {
  unset: 'Sin definir',
  entra: 'Microsoft Entra',
  hr_manual: 'HR Greenhouse',
  migration: 'Migración',
  self_declared_pending: 'Auto-declarado'
}

const SOURCE_COLOR: Record<RoleTitleSource, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
  unset: 'secondary',
  entra: 'info',
  hr_manual: 'primary',
  migration: 'secondary',
  self_declared_pending: 'warning'
}

const formatDate = (iso: string | null): string => {
  if (!iso) return '—'

  try {
    return new Date(iso).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

interface Props {
  memberId: string
}

const MemberRoleTitleSection = ({ memberId }: Props) => {
  const [data, setData] = useState<GovernanceDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [editReason, setEditReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Drift resolve dialog
  const [resolveOpen, setResolveOpen] = useState(false)
  const [resolveDecision, setResolveDecision] = useState<DriftDecision>('keep_hr')
  const [resolveNote, setResolveNote] = useState('')
  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)

  const reload = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/hr/workforce/members/${memberId}/role-title`)

      if (!res.ok) {
        const payload = await res.json().catch(() => null)

        throw new Error(typeof payload?.error === 'string' ? payload.error : 'No se pudo cargar el cargo.')
      }

      const json = (await res.json()) as GovernanceDto

      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId])

  const openEdit = () => {
    setEditValue(data?.current.roleTitle ?? '')
    setEditReason('')
    setEditError(null)
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (editReason.trim().length < 10) {
      setEditError('La razón debe tener al menos 10 caracteres.')

      return
    }

    setSaving(true)
    setEditError(null)

    try {
      const res = await fetch(`/api/admin/team/members/${memberId}/role-title`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newRoleTitle: editValue.trim() === '' ? null : editValue.trim(),
          reason: editReason.trim()
        })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)

        throw new Error(typeof payload?.error === 'string' ? payload.error : 'No se pudo guardar.')
      }

      setEditOpen(false)
      await reload()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  const openResolve = () => {
    setResolveDecision('keep_hr')
    setResolveNote('')
    setResolveError(null)
    setResolveOpen(true)
  }

  const handleResolve = async () => {
    if (resolveNote.trim().length < 10) {
      setResolveError('La nota debe tener al menos 10 caracteres.')

      return
    }

    if (!data?.drift.pendingProposalId) {
      setResolveError('No hay propuesta pendiente para resolver.')

      return
    }

    setResolving(true)
    setResolveError(null)

    try {
      const res = await fetch(`/api/hr/workforce/role-title-drift/${data.drift.pendingProposalId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: resolveDecision,
          resolutionNote: resolveNote.trim()
        })
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)

        throw new Error(typeof payload?.error === 'string' ? payload.error : 'No se pudo resolver.')
      }

      setResolveOpen(false)
      await reload()
    } catch (err) {
      setResolveError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setResolving(false)
    }
  }

  if (loading && !data) {
    return (
      <Card elevation={0} sx={cardBorderSx}>
        <CardContent>
          <Stack spacing={1.5}>
            <Skeleton variant='text' width='30%' />
            <Skeleton variant='text' width='60%' />
            <Skeleton variant='rounded' height={32} width={120} />
          </Stack>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card elevation={0} sx={cardBorderSx}>
        <CardContent>
          <Alert severity='error'>{error}</Alert>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const hasDrift = data.drift.hasDriftWithEntra || data.drift.pendingProposalId !== null
  const sourceLabel = SOURCE_LABEL[data.current.source]
  const sourceColor = SOURCE_COLOR[data.current.source]

  return (
    <Card elevation={0} sx={cardBorderSx}>
      <CardContent sx={{ pb: 2 }}>
        <Stack direction='row' spacing={2} alignItems='center' sx={{ mb: 1 }}>
          <i className='tabler-briefcase-2' style={{ fontSize: 20, color: 'var(--mui-palette-text-secondary)' }} />
          <Typography variant='subtitle1' fontWeight={600}>Cargo laboral</Typography>
          <Box sx={{ flexGrow: 1 }} />
          {data.capabilities.canUpdate && (
            <Button
              size='small'
              variant='tonal'
              color='primary'
              startIcon={<i className='tabler-edit' />}
              onClick={openEdit}
            >{GREENHOUSE_COPY.actions.edit}</Button>
          )}
        </Stack>

        <Typography variant='caption' color='text.secondary'>
          Cargo formal del colaborador en Greenhouse. HR es la fuente de verdad; Entra propone valores que HR puede aceptar o ignorar.
        </Typography>
      </CardContent>

      <Divider />

      <CardContent>
        <Stack spacing={2}>
          {/* Cargo actual + source */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography variant='caption' color='text.secondary'>Cargo actual</Typography>
              <Typography variant='h6' sx={{ mt: 0.5 }}>
                {data.current.roleTitle ?? <Box component='span' sx={{ color: 'text.disabled', fontStyle: 'italic' }}>Sin definir</Box>}
              </Typography>
              {data.current.lastHumanUpdateAt && (
                <Typography variant='caption' color='text.disabled' sx={{ display: 'block', mt: 0.5 }}>
                  Última edición HR: {formatDate(data.current.lastHumanUpdateAt)}
                </Typography>
              )}
            </Box>
            <CustomChip round='true' size='small' variant='tonal' color={sourceColor} label={sourceLabel} />
          </Box>

          <Divider sx={{ my: 0.5 }} />

          {/* Entra value */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography variant='caption' color='text.secondary'>Microsoft Entra (sincronización)</Typography>
              <Typography variant='body2' sx={{ mt: 0.5 }}>
                {data.entra.jobTitle ?? <Box component='span' sx={{ color: 'text.disabled', fontStyle: 'italic' }}>Sin valor</Box>}
              </Typography>
            </Box>
            {hasDrift && (
              <CustomChip round='true' size='small' color='warning' label='Drift detectado' />
            )}
          </Box>

          {/* Drift banner */}
          {hasDrift && (
            <Alert
              severity='warning'
              action={
                data.capabilities.canResolveDrift && data.drift.pendingProposalId ? (
                  <Button color='warning' size='small' onClick={openResolve}>
                    Resolver
                  </Button>
                ) : null
              }
            >
              <Typography variant='body2' fontWeight={600}>
                Diferencia entre HR y Entra
              </Typography>
              <Typography variant='caption' display='block' sx={{ mt: 0.5 }}>
                HR mantiene <strong>{data.current.roleTitle ?? '—'}</strong>. Entra propone{' '}
                <strong>{data.drift.pendingProposalProposedRoleTitle ?? data.entra.jobTitle ?? '—'}</strong>.
                {data.drift.pendingProposalOccurrenceCount && data.drift.pendingProposalOccurrenceCount > 1
                  ? ` (${data.drift.pendingProposalOccurrenceCount} detecciones desde ${formatDate(data.drift.pendingProposalFirstDetectedAt)})`
                  : ''}
              </Typography>
            </Alert>
          )}
        </Stack>
      </CardContent>

      {/* Edit dialog */}
      <Dialog open={editOpen} onClose={() => !saving && setEditOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Editar cargo laboral</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Typography variant='body2' color='text.secondary'>
              Este cambio queda en audit log y deja a HR como fuente de verdad. Entra no podrá sobrescribirlo automáticamente.
            </Typography>
            <TextField
              label='Cargo'
              fullWidth
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              placeholder='Ej. Senior Designer'
              disabled={saving}
            />
            <TextField
              label='Razón del cambio (mínimo 10 caracteres)'
              fullWidth
              multiline
              rows={3}
              value={editReason}
              onChange={e => setEditReason(e.target.value)}
              disabled={saving}
              required
            />
            {editError && <Alert severity='error'>{editError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' onClick={() => setEditOpen(false)} disabled={saving}>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button variant='contained' onClick={handleSaveEdit} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resolve dialog */}
      <Dialog open={resolveOpen} onClose={() => !resolving && setResolveOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Resolver diferencia con Entra</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Typography variant='body2' color='text.secondary'>
              HR: <strong>{data.current.roleTitle ?? '—'}</strong> · Entra:{' '}
              <strong>{data.drift.pendingProposalProposedRoleTitle ?? data.entra.jobTitle ?? '—'}</strong>
            </Typography>

            <TextField
              select
              label='Decisión'
              fullWidth
              value={resolveDecision}
              onChange={e => setResolveDecision(e.target.value as DriftDecision)}
              disabled={resolving}
              SelectProps={{ native: true }}
            >
              <option value='keep_hr'>Mantener valor HR</option>
              <option value='accept_entra'>Aceptar valor de Entra</option>
              <option value='dismissed'>Descartar (sin cambios)</option>
            </TextField>

            <TextField
              label='Nota (mínimo 10 caracteres)'
              fullWidth
              multiline
              rows={3}
              value={resolveNote}
              onChange={e => setResolveNote(e.target.value)}
              disabled={resolving}
              required
            />

            {resolveError && <Alert severity='error'>{resolveError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' onClick={() => setResolveOpen(false)} disabled={resolving}>{GREENHOUSE_COPY.actions.cancel}</Button>
          <Button variant='contained' onClick={handleResolve} disabled={resolving}>
            {resolving ? 'Resolviendo...' : 'Resolver'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}

export default MemberRoleTitleSection
