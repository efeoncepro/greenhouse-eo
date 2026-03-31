'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
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
  organizationLabel: string | null
  label: string
  assignmentType: string
  compensation: {
    payRegime: string | null
    contractType: string | null
    costRateAmount: number | null
    costRateCurrency: string | null
  }
}

type PlacementOptionsResponse = {
  items: Array<{
    assignmentId: string
    assignmentType: string
    clientId: string
    clientName: string | null
    memberId: string
    memberName: string | null
    organizationId: string | null
    organizationName: string | null
    label: string
    compensation: {
      payRegime: string | null
      contractType: string | null
      costRateAmount: number | null
      costRateCurrency: string | null
    }
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
  initialAssignmentId?: string | null
}

const CreatePlacementDialog = ({ open, onClose, onCreated, initialAssignmentId }: Props) => {
  const [loading, setLoading] = useState(false)
  const [metaLoading, setMetaLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState<AssignmentOption[]>([])
  const [assignmentId, setAssignmentId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [businessUnit, setBusinessUnit] = useState('reach')
  const [status, setStatus] = useState('pipeline')
  const [billingRateAmount, setBillingRateAmount] = useState('')
  const [billingRateCurrency, setBillingRateCurrency] = useState('USD')
  const [placementNotes, setPlacementNotes] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedAssignment = useMemo(
    () => options.find(option => option.assignmentId === assignmentId) || null,
    [assignmentId, options]
  )

  const loadOptions = useCallback(async (params?: { search?: string; assignmentId?: string | null }) => {
    setMetaLoading(true)
    setError(null)

    try {
      const query = new URLSearchParams({ limit: '20' })

      if (params?.search?.trim()) query.set('search', params.search.trim())
      if (params?.assignmentId?.trim()) query.set('assignmentId', params.assignmentId.trim())

      const res = await fetch(`/api/agency/staff-augmentation/placement-options?${query.toString()}`, { cache: 'no-store' })
      const json = (await res.json()) as PlacementOptionsResponse

      const nextOptions = (json.items || []).map(option => ({
        assignmentId: option.assignmentId,
        memberLabel: option.memberName || option.memberId,
        clientLabel: option.clientName || option.clientId || 'Cliente',
        organizationLabel: option.organizationName || null,
        label: option.label,
        assignmentType: option.assignmentType || 'internal',
        compensation: option.compensation
      }))

      setOptions(nextOptions)

      if (params?.assignmentId) {
        const exactMatch = nextOptions.find(option => option.assignmentId === params.assignmentId) || null

        if (exactMatch) {
          setAssignmentId(exactMatch.assignmentId)
          setSearchQuery(exactMatch.label)
        }
      }
    } catch {
      setError('No pudimos cargar assignments activos para crear el placement.')
    } finally {
      setMetaLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return

    setError(null)
    setOptions([])
    setAssignmentId('')
    setSearchQuery('')

    if (initialAssignmentId) {
      void loadOptions({ assignmentId: initialAssignmentId })
    }
  }, [initialAssignmentId, loadOptions, open])

  useEffect(() => {
    if (!open) return

    const trimmedQuery = searchQuery.trim()
    const selectedLabel = selectedAssignment?.label || ''

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (trimmedQuery.length < 2 || trimmedQuery === selectedLabel) {
      if (!trimmedQuery) setOptions(current => (assignmentId ? current : []))

      return
    }

    debounceRef.current = setTimeout(() => {
      void loadOptions({ search: trimmedQuery })
    }, 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [assignmentId, loadOptions, open, searchQuery, selectedAssignment])

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
            <Autocomplete
              options={options}
              value={selectedAssignment}
              inputValue={searchQuery}
              onInputChange={(_event, value, reason) => {
                setSearchQuery(value)

                if (reason === 'clear') {
                  setAssignmentId('')
                  setOptions([])
                }
              }}
              onChange={(_event, option) => {
                setAssignmentId(option?.assignmentId || '')
                setSearchQuery(option?.label || '')
              }}
              loading={metaLoading}
              disabled={loading}
              noOptionsText={
                searchQuery.trim().length < 2
                  ? 'Escribe al menos 2 caracteres para buscar assignments elegibles.'
                  : 'No encontramos assignments elegibles con ese criterio.'
              }
              getOptionLabel={option => option.label}
              isOptionEqualToValue={(option, value) => option.assignmentId === value.assignmentId}
              renderOption={(props, option) => (
                <li {...props} key={option.assignmentId}>
                  <div>
                    <Typography variant='body2' fontWeight={600}>{option.memberLabel}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {option.clientLabel}{option.organizationLabel ? ` · ${option.organizationLabel}` : ''}
                    </Typography>
                  </div>
                </li>
              )}
              renderInput={params => (
                <CustomTextField
                  {...params}
                  fullWidth
                  label='Buscar assignment'
                  placeholder='Miembro, cliente, organización o ID'
                  helperText={
                    selectedAssignment
                      ? `${selectedAssignment.memberLabel} · ${selectedAssignment.clientLabel}`
                      : 'Busca una asignación activa sin placement previo. No cargamos toda la lista para evitar cuelgues.'
                  }
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {metaLoading ? <CircularProgress size={18} color='inherit' /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    )
                  }}
                />
              )}
            />
          </Grid>
          {selectedAssignment ? (
            <Grid size={{ xs: 12 }}>
              <Alert severity='info' icon={<i className='tabler-briefcase' />}>
                {selectedAssignment.organizationLabel ? `${selectedAssignment.organizationLabel} · ` : ''}
                {selectedAssignment.compensation.contractType || 'Sin contract type'} · {selectedAssignment.compensation.payRegime || 'Sin pay regime'}
                {selectedAssignment.compensation.costRateAmount != null
                  ? ` · costo base ${new Intl.NumberFormat('es-CL', {
                    style: 'currency',
                    currency: selectedAssignment.compensation.costRateCurrency || 'USD',
                    maximumFractionDigits: 0
                  }).format(selectedAssignment.compensation.costRateAmount)}`
                  : ' · sin costo base vigente en Payroll'}
              </Alert>
            </Grid>
          ) : null}
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
