'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Radio from '@mui/material/Radio'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatementRow {
  rowId: string
  transactionDate: string
  description: string
  reference: string | null
  amount: number
  balance: number
  matchStatus: string
  matchedType: string | null
  matchedId: string | null
  matchConfidence: number | null
  notes: string | null
  matchedSettlementLegId?: string | null
}

interface Candidate {
  id: string
  type: 'income' | 'expense'
  matchedRecordId: string | null
  matchedPaymentId: string | null
  matchedSettlementLegId?: string | null
  amount: number
  currency: string
  transactionDate: string | null
  dueDate: string | null
  reference: string | null
  description: string
  partyName: string | null
  status: string | null
  isReconciled: boolean
  legType?: string | null
  instrumentName?: string | null
  settlementMode?: string | null
}

type DialogMode = 'match' | 'unmatch' | 'exclude'

type Props = {
  open: boolean
  periodId: string
  row: StatementRow | null
  initialCandidateId?: string | null
  onClose: () => void
  onActionComplete: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCLP = (amount: number): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—'

  const [year, month, day] = dateStr.split('-')

  return `${day}/${month}/${year}`
}

const MATCH_STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'warning' | 'secondary' | 'error' | 'info' }> = {
  matched: { label: 'Conciliado', color: 'success' },
  manual_matched: { label: 'Conciliado', color: 'success' },
  suggested: { label: 'Sugerido', color: 'warning' },
  excluded: { label: 'Excluido', color: 'error' },
  unmatched: { label: 'Sin match', color: 'info' }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ReconciliationMatchDialog = ({ open, periodId, row, initialCandidateId = null, onClose, onActionComplete }: Props) => {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Exclude mode
  const [mode, setMode] = useState<DialogMode>('match')
  const [excludeNotes, setExcludeNotes] = useState('')

  const isConfirmedMatch = row?.matchStatus === 'matched' || row?.matchStatus === 'manual_matched'
  const isSuggested = row?.matchStatus === 'suggested'
  const isExcluded = row?.matchStatus === 'excluded'

  // Reset state when dialog opens
  useEffect(() => {
    if (open && row) {
      setError(null)
      setSelectedCandidateId(initialCandidateId)
      setSearch('')
      setExcludeNotes('')

      if (isConfirmedMatch) {
        setMode('unmatch')
      } else {
        // suggested, excluded, unmatched all open in match mode
        setMode('match')
      }
    }
  }, [open, row, isConfirmedMatch, initialCandidateId])

  // Fetch candidates when in match mode
  const fetchCandidates = useCallback(async () => {
    if (!periodId || mode !== 'match') return

    setLoadingCandidates(true)

    try {
      const params = new URLSearchParams({
        type: filterType,
        limit: '100',
        windowDays: '45'
      })

      if (search.trim()) {
        params.set('search', search.trim())
      }

      const res = await fetch(`/api/finance/reconciliation/${periodId}/candidates?${params}`)

      if (res.ok) {
        const data = await res.json()

        setCandidates(data.items ?? [])
      }
    } finally {
      setLoadingCandidates(false)
    }
  }, [periodId, filterType, search, mode])

  useEffect(() => {
    if (open && mode === 'match') {
      fetchCandidates()
    }
  }, [open, mode, fetchCandidates])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleMatch = async () => {
    if (!row || !selectedCandidateId) return

    const candidate = candidates.find(c => c.id === selectedCandidateId)

    if (!candidate) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/finance/reconciliation/${periodId}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowId: row.rowId,
          matchedType: candidate.type,
          matchedId: candidate.matchedRecordId ?? candidate.id,
          matchedPaymentId: candidate.matchedPaymentId ?? null,
          matchedSettlementLegId: candidate.matchedSettlementLegId ?? null
        })
      })

      if (res.ok) {
        onActionComplete()
        onClose()
      } else {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'No se pudo conciliar el movimiento.')
      }
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUnmatch = async () => {
    if (!row) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/finance/reconciliation/${periodId}/unmatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowId: row.rowId })
      })

      if (res.ok) {
        onActionComplete()
        onClose()
      } else {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'No se pudo deshacer la conciliacion.')
      }
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleExclude = async () => {
    if (!row) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/finance/reconciliation/${periodId}/exclude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowId: row.rowId,
          ...(excludeNotes.trim() && { notes: excludeNotes.trim() })
        })
      })

      if (res.ok) {
        onActionComplete()
        onClose()
      } else {
        const data = await res.json().catch(() => ({}))

        setError(data.error || 'No se pudo excluir el movimiento.')
      }
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!row) return null

  const isNegative = row.amount < 0

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='md'
      fullWidth
      aria-labelledby='reconciliation-match-dialog-title'
    >
      <DialogTitle id='reconciliation-match-dialog-title' sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
            <i className='tabler-arrows-exchange' style={{ fontSize: 20, color: 'var(--mui-palette-primary-main)' }} />
          </Avatar>
          <Typography variant='h6'>
            {mode === 'unmatch' ? 'Deshacer conciliacion' : mode === 'exclude' ? 'Excluir movimiento' : 'Conciliar movimiento'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size='small' aria-label='Cerrar'>
          <i className='tabler-x' />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 4 }}>
        {error && (
          <Alert severity='error' sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Statement Row Summary */}
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, mb: 4, borderLeft: '4px solid', borderLeftColor: isNegative ? 'error.main' : 'success.main' }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Typography variant='caption' color='text.secondary'>Fecha</Typography>
                <Typography variant='body2' fontWeight={600}>{formatDate(row.transactionDate)}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }}>
                <Typography variant='caption' color='text.secondary'>Descripcion</Typography>
                <Typography variant='body2' fontWeight={600}>{row.description}</Typography>
                {row.reference && (
                  <Typography variant='caption' sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    Ref: {row.reference}
                  </Typography>
                )}
              </Grid>
              <Grid size={{ xs: 12, sm: 2 }}>
                <Typography variant='caption' color='text.secondary'>Monto</Typography>
                <Typography variant='body2' fontWeight={700} color={isNegative ? 'error.main' : 'success.main'}>
                  {formatCLP(row.amount)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 2 }}>
                <Typography variant='caption' color='text.secondary'>Estado</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <CustomChip
                    round='true'
                    size='small'
                    color={(MATCH_STATUS_CONFIG[row.matchStatus] ?? MATCH_STATUS_CONFIG.unmatched).color}
                    label={(MATCH_STATUS_CONFIG[row.matchStatus] ?? MATCH_STATUS_CONFIG.unmatched).label}
                  />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Mode: Unmatch */}
        {mode === 'unmatch' && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant='body1' sx={{ mb: 2 }}>
              Esta fila esta vinculada a un {row.matchedType === 'income' ? 'cobro' : 'pago'}:
            </Typography>
            <Chip
              label={row.matchedId}
              color={row.matchedType === 'income' ? 'success' : 'error'}
              sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
            <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
              Al deshacer, la fila del extracto y la transaccion vuelven a estar disponibles para conciliacion.
            </Typography>
          </Box>
        )}

        {/* Suggested match banner — shown above candidates when row is suggested */}
        {isSuggested && mode === 'match' && row.matchedId && (
          <Alert
            severity='info'
            sx={{ mb: 3 }}
            action={
              <Button color='inherit' size='small' onClick={() => {
                setSelectedCandidateId(row.matchedId)
              }}>
                Confirmar sugerencia
              </Button>
            }
          >
            El sistema sugirió vincular esta fila con {row.matchedType === 'income' ? 'el cobro' : 'el pago'} <strong>{row.matchedId}</strong>. Confirma la sugerencia o selecciona otro candidato.
          </Alert>
        )}

        {/* Mode: Exclude */}
        {mode === 'exclude' && (
          <Stack spacing={3} sx={{ py: 2 }}>
            <Typography variant='body2' color='text.secondary'>
              Al excluir este movimiento, no se considerara para la conciliacion del periodo. Puedes agregar una nota explicativa.
            </Typography>
            <CustomTextField
              fullWidth
              size='small'
              label='Nota (opcional)'
              placeholder='ej. Comision bancaria interna'
              multiline
              rows={2}
              value={excludeNotes}
              onChange={e => setExcludeNotes(e.target.value)}
            />
          </Stack>
        )}

        {/* Mode: Match — candidate list */}
        {mode === 'match' && (
          <>
            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <CustomTextField
                size='small'
                placeholder='Buscar por descripcion o referencia...'
                value={search}
                onChange={e => setSearch(e.target.value)}
                sx={{ flex: 1, minWidth: 200 }}
                InputProps={{
                  startAdornment: <i className='tabler-search' style={{ fontSize: 18, marginRight: 8, color: 'var(--mui-palette-text-secondary)' }} />
                }}
              />
              <CustomTextField
                select
                size='small'
                value={filterType}
                onChange={e => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value='all'>Todos</MenuItem>
                <MenuItem value='income'>Cobros</MenuItem>
                <MenuItem value='expense'>Pagos</MenuItem>
              </CustomTextField>
            </Box>

            {/* Candidate list */}
            <Box sx={{ maxHeight: 360, overflowY: 'auto' }}>
              {loadingCandidates ? (
                <Stack spacing={2}>
                  {[0, 1, 2].map(i => (
                    <Skeleton key={i} variant='rounded' height={72} />
                  ))}
                </Stack>
              ) : candidates.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }} role='status'>
                  <Typography variant='body2' color='text.secondary'>
                    No se encontraron candidatos para conciliar. Ajusta los filtros o verifica que existan registros en el periodo.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {candidates.map(candidate => {
                    const isSelected = selectedCandidateId === candidate.id
                    const amountDiff = Math.abs(Math.abs(row.amount) - Math.abs(candidate.amount))
                    const isExactMatch = amountDiff < 1

                    return (
                      <Card
                        key={candidate.id}
                        elevation={0}
                        onClick={() => setSelectedCandidateId(candidate.id)}
                        sx={{
                          border: t => `1px solid ${isSelected ? t.palette.primary.main : t.palette.divider}`,
                          bgcolor: isSelected ? 'primary.lightOpacity' : 'transparent',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease-in-out',
                          '&:hover': { borderColor: 'primary.main' }
                        }}
                        role='option'
                        aria-selected={isSelected}
                      >
                        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Radio
                              checked={isSelected}
                              size='small'
                              tabIndex={-1}
                              inputProps={{ 'aria-label': `Seleccionar ${candidate.description}` }}
                            />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <CustomChip
                                  round='true'
                                  size='small'
                                  color={candidate.type === 'income' ? 'success' : 'error'}
                                  label={candidate.type === 'income' ? 'Cobro' : 'Pago'}
                                />
                                {isExactMatch && (
                                  <CustomChip round='true' size='small' color='primary' label='Monto exacto' />
                                )}
                                {candidate.reference && (
                                  <Typography variant='caption' sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'text.secondary' }}>
                                    {candidate.reference}
                                  </Typography>
                                )}
                                {candidate.legType && (
                                  <CustomChip round='true' size='small' color='secondary' label={candidate.legType} />
                                )}
                              </Box>
                              <Typography variant='body2' fontWeight={500} noWrap>
                                {candidate.description}
                              </Typography>
                              {candidate.partyName && (
                                <Typography variant='caption' color='text.secondary'>
                                  {candidate.partyName}
                                </Typography>
                              )}
                              {(candidate.instrumentName || candidate.settlementMode) && (
                                <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                                  {[candidate.instrumentName, candidate.settlementMode].filter(Boolean).join(' · ')}
                                </Typography>
                              )}
                            </Box>
                            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                              <Typography variant='body2' fontWeight={700}>
                                {formatCLP(candidate.amount)}
                              </Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {formatDate(candidate.transactionDate)}
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    )
                  })}
                </Stack>
              )}
            </Box>

            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 2 }}>
              {candidates.length > 0 ? `${candidates.length} candidato${candidates.length !== 1 ? 's' : ''} encontrado${candidates.length !== 1 ? 's' : ''}` : ''}
            </Typography>
          </>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 4, py: 3, justifyContent: 'space-between' }}>
        {/* Left side: mode toggles */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {!isExcluded && mode !== 'exclude' && !isConfirmedMatch && !isSuggested && (
            <Button
              size='small'
              color='secondary'
              startIcon={<i className='tabler-ban' />}
              onClick={() => setMode('exclude')}
            >
              Excluir
            </Button>
          )}
          {mode === 'exclude' && (
            <Button
              size='small'
              color='primary'
              startIcon={<i className='tabler-arrows-exchange' />}
              onClick={() => setMode('match')}
            >
              Volver a candidatos
            </Button>
          )}
          {isConfirmedMatch && mode === 'unmatch' && (
            <Button
              size='small'
              color='primary'
              startIcon={<i className='tabler-arrows-exchange' />}
              onClick={() => setMode('match')}
            >
              Reconciliar con otro
            </Button>
          )}
        </Box>

        {/* Right side: primary actions */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant='outlined' color='secondary' onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>

          {mode === 'match' && (
            <Button
              variant='contained'
              color='primary'
              onClick={handleMatch}
              disabled={!selectedCandidateId || submitting}
              startIcon={submitting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-check' />}
            >
              {submitting ? 'Conciliando...' : 'Conciliar'}
            </Button>
          )}

          {mode === 'unmatch' && (
            <Button
              variant='contained'
              color='warning'
              onClick={handleUnmatch}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-unlink' />}
            >
              {submitting ? 'Procesando...' : 'Deshacer conciliacion'}
            </Button>
          )}

          {mode === 'exclude' && (
            <Button
              variant='contained'
              color='error'
              onClick={handleExclude}
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-ban' />}
            >
              {submitting ? 'Excluyendo...' : 'Excluir movimiento'}
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  )
}

export default ReconciliationMatchDialog
