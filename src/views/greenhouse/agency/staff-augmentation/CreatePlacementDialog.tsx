'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

type AssignmentOption = {
  assignmentId: string
  memberLabel: string
  clientLabel: string
  label: string
  assignmentType: string
  placementId: string | null
  placementStatus: string | null
}

type TeamCapacityResponse = {
  members: Array<{
    memberId: string
    displayName: string
    assignments: Array<{
      assignmentId: string
      clientName: string | null
      clientId: string | null
      assignmentType?: string
      placementId?: string | null
      placementStatus?: string | null
    }>
  }>
}

const BUSINESS_UNIT_OPTIONS = [
  { value: 'globe', label: 'Globe' },
  { value: 'efeonce_digital', label: 'Efeonce Digital' },
  { value: 'reach', label: 'Reach' },
  { value: 'wave', label: 'Wave' },
  { value: 'crm_solutions', label: 'CRM Solutions' }
] as const

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (placementId: string) => void
}

const CreatePlacementDialog = ({ open, onClose, onCreated }: Props) => {
  const [loading, setLoading] = useState(false)
  const [metaLoading, setMetaLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState<AssignmentOption[]>([])
  const [assignmentId, setAssignmentId] = useState('')
  const [businessUnit, setBusinessUnit] = useState('reach')
  const [status, setStatus] = useState('pipeline')
  const [billingRateAmount, setBillingRateAmount] = useState('')
  const [billingRateCurrency, setBillingRateCurrency] = useState('USD')
  const [placementNotes, setPlacementNotes] = useState('')

  useEffect(() => {
    if (!open) return

    const load = async () => {
      setMetaLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/team/capacity-breakdown', { cache: 'no-store' })
        const json = (await res.json()) as TeamCapacityResponse

        const flattened = json.members.flatMap(member =>
          (member.assignments || []).map(assignment => ({
            assignmentId: assignment.assignmentId,
            memberLabel: member.displayName,
            clientLabel: assignment.clientName || assignment.clientId || 'Cliente',
            label: `${member.displayName} · ${assignment.clientName || assignment.clientId || 'Cliente'}`,
            assignmentType: assignment.assignmentType || 'internal',
            placementId: assignment.placementId || null,
            placementStatus: assignment.placementStatus || null
          }))
        ).filter(option => !option.placementId)

        setOptions(flattened)
        setAssignmentId(flattened[0]?.assignmentId || '')
      } catch {
        setError('No pudimos cargar assignments activos para crear el placement.')
      } finally {
        setMetaLoading(false)
      }
    }

    load()
  }, [open])

  const selectedAssignment = useMemo(
    () => options.find(option => option.assignmentId === assignmentId) || null,
    [assignmentId, options]
  )

  const handleSubmit = async () => {
    if (!assignmentId) {
      setError('Selecciona un assignment base.')

      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/agency/staff-augmentation/placements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          businessUnit,
          status,
          billingRateAmount: billingRateAmount ? Number(billingRateAmount) : null,
          billingRateCurrency,
          placementNotes
        })
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        setError(typeof json?.error === 'string' ? json.error : 'No pudimos crear el placement.')

        return
      }

      if (typeof json?.placementId === 'string') {
        onCreated(json.placementId)
      }

      onClose()
    } catch {
      setError('No pudimos crear el placement.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>Crear placement</DialogTitle>
      <DialogContent>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 4 }}>
          Staff Aug se monta sobre un assignment existente. Aquí solo definimos la capa comercial y operativa inicial.
        </Typography>

        {error ? <Alert severity='warning' sx={{ mb: 4 }}>{error}</Alert> : null}

        <Grid container spacing={4}>
          <Grid size={{ xs: 12 }}>
            <CustomTextField
              select
              fullWidth
              label='Assignment base'
              value={assignmentId}
              onChange={event => setAssignmentId(event.target.value)}
              disabled={metaLoading || loading}
              helperText={
                selectedAssignment
                  ? `${selectedAssignment.memberLabel} · ${selectedAssignment.clientLabel}`
                  : 'Selecciona una asignación activa sin placement previo.'
              }
            >
              {options.map(option => (
                <MenuItem key={option.assignmentId} value={option.assignmentId}>
                  {option.label}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <CustomTextField
              select
              fullWidth
              label='Business Unit'
              value={businessUnit}
              onChange={event => setBusinessUnit(event.target.value)}
              disabled={loading}
            >
              {BUSINESS_UNIT_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <CustomTextField
              select
              fullWidth
              label='Estado inicial'
              value={status}
              onChange={event => setStatus(event.target.value)}
              disabled={loading}
            >
              <MenuItem value='pipeline'>Pipeline</MenuItem>
              <MenuItem value='onboarding'>Onboarding</MenuItem>
              <MenuItem value='active'>Activo</MenuItem>
            </CustomTextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <CustomTextField
              fullWidth
              label='Billing rate'
              type='number'
              value={billingRateAmount}
              onChange={event => setBillingRateAmount(event.target.value)}
              disabled={loading}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <CustomTextField
              select
              fullWidth
              label='Moneda'
              value={billingRateCurrency}
              onChange={event => setBillingRateCurrency(event.target.value)}
              disabled={loading}
            >
              <MenuItem value='USD'>USD</MenuItem>
              <MenuItem value='CLP'>CLP</MenuItem>
            </CustomTextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <CustomTextField
              fullWidth
              multiline
              minRows={3}
              label='Notas operativas'
              value={placementNotes}
              onChange={event => setPlacementNotes(event.target.value)}
              disabled={loading}
              helperText='Úsalo para capturar el contexto comercial, expectativas del cliente o setup inicial.'
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color='secondary' disabled={loading}>Cancelar</Button>
        <Button onClick={handleSubmit} variant='contained' disabled={loading || metaLoading || !assignmentId}>
          {loading ? 'Creando…' : 'Crear placement'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CreatePlacementDialog
