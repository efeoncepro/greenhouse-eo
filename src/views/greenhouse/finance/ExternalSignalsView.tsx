'use client'

import { useEffect, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { toast } from 'sonner'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import EmptyState from '@/components/greenhouse/EmptyState'

import type {
  ExternalCashSignal,
  ExternalCashSignalResolutionStatus,
  ListSignalsResult
} from '@/lib/finance/external-cash-signals'

interface SignalRow extends ExternalCashSignal {
  matchedRuleId: string | null
  resolutionOutcome: 'resolved' | 'ambiguous' | 'no_match' | null
}

interface AccountOption {
  accountId: string
  accountName: string
  currency: string
  instrumentCategory: string
}

interface Props {
  initial: ListSignalsResult
}

const STATUS_FILTERS: Array<{ value: ExternalCashSignalResolutionStatus | 'all'; label: string }> = [
  { value: 'unresolved', label: 'Sin resolver' },
  { value: 'resolved_high_confidence', label: 'En revisión' },
  { value: 'resolved_low_confidence', label: 'Revisar manual' },
  { value: 'adopted', label: 'Adoptadas' },
  { value: 'dismissed', label: 'Descartadas' },
  { value: 'all', label: 'Todas' }
]

const SOURCE_FILTERS = [
  { value: '', label: 'Todos los orígenes' },
  { value: 'nubox', label: 'Nubox' },
  { value: 'previred', label: 'Previred' },
  { value: 'bank_file', label: 'Archivos bancarios' },
  { value: 'manual_admin', label: 'Manual' }
]

const STATUS_CHIP: Record<
  ExternalCashSignalResolutionStatus,
  { label: string; color: 'warning' | 'info' | 'success' | 'secondary' | 'error'; icon: string }
> = {
  unresolved: { label: 'Sin resolver', color: 'warning', icon: 'tabler-circle-dashed' },
  resolved_high_confidence: { label: 'En revisión', color: 'info', icon: 'tabler-eye' },
  resolved_low_confidence: { label: 'Revisar manual', color: 'warning', icon: 'tabler-alert-triangle' },
  adopted: { label: 'Adoptada', color: 'success', icon: 'tabler-check' },
  superseded: { label: 'Reemplazada', color: 'secondary', icon: 'tabler-history' },
  dismissed: { label: 'Descartada', color: 'secondary', icon: 'tabler-x' }
}

const SOURCE_LABEL: Record<string, string> = {
  nubox: 'Nubox',
  previred: 'Previred',
  bank_file: 'Archivos bancarios',
  manual_admin: 'Manual',
  hubspot: 'HubSpot'
}

const formatAmount = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString('es-CL')}`
  }
}

const formatDate = (raw: string) => {
  if (!raw) return '—'

  try {
    return new Date(raw).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return raw
  }
}

const ExternalSignalsView = ({ initial }: Props) => {
  const [data, setData] = useState<ListSignalsResult>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<ExternalCashSignalResolutionStatus | 'all'>('unresolved')
  const [sourceFilter, setSourceFilter] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [adoptDialog, setAdoptDialog] = useState<SignalRow | null>(null)
  const [dismissDialog, setDismissDialog] = useState<SignalRow | null>(null)

  const refresh = async (overrides?: {
    status?: ExternalCashSignalResolutionStatus | 'all'
    sourceSystem?: string
    search?: string
  }) => {
    setLoading(true)
    setError(null)

    const status = overrides?.status ?? statusFilter
    const source = overrides?.sourceSystem ?? sourceFilter
    const q = overrides?.search ?? search

    const params = new URLSearchParams({ status })

    if (source) params.set('sourceSystem', source)
    if (q) params.set('search', q)

    try {
      const res = await fetch(`/api/admin/finance/external-signals?${params.toString()}`, {
        cache: 'no-store'
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))

        throw new Error(body.error || `Error ${res.status}`)
      }

      const json = (await res.json()) as ListSignalsResult

      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar las señales.')
    } finally {
      setLoading(false)
    }
  }

  const items = data.items as SignalRow[]
  const counts = data.counts

  // Search debounce
  useEffect(() => {
    if (debouncedSearchRef.current) clearTimeout(debouncedSearchRef.current)
    debouncedSearchRef.current = setTimeout(() => {
      void refresh({ search })
    }, 400)

    return () => {
      if (debouncedSearchRef.current) clearTimeout(debouncedSearchRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return (
    <Stack spacing={6}>
      <Box>
        <Typography variant='h4'>Señales externas de caja</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
          Cola para resolver pagos detectados por sync (Nubox, Previred, archivos bancarios) sin cuenta canónica
          Greenhouse. Adoptar promueve la señal a un pago real; descartar documenta que no hay cash correspondiente.
        </Typography>
      </Box>

      {/* KPI row */}
      <Grid container spacing={6} role='status' aria-live='polite'>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Sin resolver'
            stats={<AnimatedCounter value={counts.unresolved} format='integer' />}
            subtitle='Esperando adopción manual'
            avatarIcon='tabler-circle-dashed'
            avatarColor='warning'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='En revisión'
            stats={<AnimatedCounter value={counts.inReview} format='integer' />}
            subtitle='Cuenta inferida — revisar'
            avatarIcon='tabler-eye'
            avatarColor='info'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Adoptadas hoy'
            stats={<AnimatedCounter value={counts.adoptedToday} format='integer' />}
            subtitle='Promovidas a pago canónico'
            avatarIcon='tabler-check'
            avatarColor='success'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Tooltip title='Canary D4: cualquier valor mayor a 0 indica violación de invariante cruzada signal ↔ payment. Escalar inmediatamente.'>
            <Box>
              <HorizontalWithSubtitle
                title='Invariante D4'
                stats={<AnimatedCounter value={counts.invariantViolations} format='integer' />}
                subtitle={counts.invariantViolations === 0 ? 'Canary verde' : 'Bug crítico — escalar'}
                avatarIcon='tabler-shield-check'
                avatarColor={counts.invariantViolations === 0 ? 'success' : 'error'}
              />
            </Box>
          </Tooltip>
        </Grid>
      </Grid>

      {/* Filters + Table card */}
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title='Cola de señales'
          avatar={
            <CustomAvatar variant='rounded' skin='light' color='primary'>
              <i className='tabler-radar' />
            </CustomAvatar>
          }
          subheader='Pulse · operación canónica de cash externa'
        />
        <Divider />
        {loading && <LinearProgress aria-label='Cargando señales' />}
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 4 }}>
            <CustomTextField
              select
              label='Estado'
              value={statusFilter}
              onChange={e => {
                const v = e.target.value as ExternalCashSignalResolutionStatus | 'all'

                setStatusFilter(v)
                void refresh({ status: v })
              }}
              sx={{ minWidth: 220 }}
            >
              {STATUS_FILTERS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </CustomTextField>

            <CustomTextField
              select
              label='Origen'
              value={sourceFilter}
              onChange={e => {
                const v = e.target.value

                setSourceFilter(v)
                void refresh({ sourceSystem: v })
              }}
              sx={{ minWidth: 220 }}
            >
              {SOURCE_FILTERS.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </CustomTextField>

            <CustomTextField
              label='Buscar'
              placeholder='Documento, referencia o monto...'
              value={search}
              onChange={e => setSearch(e.target.value)}
              fullWidth
            />
          </Stack>

          {error && (
            <Alert severity='error' sx={{ mb: 4 }} role='alert'>
              {error}
            </Alert>
          )}

          {loading && items.length === 0 ? (
            <Stack spacing={1}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant='rectangular' height={48} />
              ))}
            </Stack>
          ) : items.length === 0 ? (
            <EmptyState
              icon={statusFilter === 'unresolved' ? 'tabler-circle-check' : 'tabler-search'}
              title={statusFilter === 'unresolved' ? 'Cola al día' : 'Sin coincidencias'}
              description={
                statusFilter === 'unresolved'
                  ? 'No hay señales pendientes. Todo el cash externo está alineado con el ledger Greenhouse.'
                  : 'No encontramos señales con esos filtros. Prueba con otros valores.'
              }
            />
          ) : (
            <TableContainer>
              <Table size='small' aria-label='Cola de señales externas de caja'>
                <caption style={{ position: 'absolute', left: -9999, top: -9999 }}>
                  Lista de {data.total} señales externas pendientes de resolución
                </caption>
                <TableHead>
                  <TableRow>
                    <TableCell scope='col'>Fecha</TableCell>
                    <TableCell scope='col'>Origen</TableCell>
                    <TableCell scope='col'>Documento</TableCell>
                    <TableCell scope='col' align='right'>
                      Monto
                    </TableCell>
                    <TableCell scope='col'>Estado</TableCell>
                    <TableCell scope='col'>Regla</TableCell>
                    <TableCell scope='col' align='right'>
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map(row => {
                    const status = STATUS_CHIP[row.accountResolutionStatus]

                    const canAct =
                      row.accountResolutionStatus === 'unresolved' ||
                      row.accountResolutionStatus === 'resolved_high_confidence' ||
                      row.accountResolutionStatus === 'resolved_low_confidence'

                    return (
                      <TableRow
                        key={row.signalId}
                        hover
                        sx={{ '&:hover': { bgcolor: 'action.hover' }, transition: 'background-color 150ms ease-out' }}
                      >
                        <TableCell>{formatDate(row.signalDate)}</TableCell>
                        <TableCell>
                          <CustomChip
                            round='true'
                            label={SOURCE_LABEL[row.sourceSystem] || row.sourceSystem}
                            size='small'
                            variant='tonal'
                            color='primary'
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title={`Signal: ${row.signalId} · Source event: ${row.sourceEventId}`}>
                            <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                              {row.documentId || row.sourceEventId.replace(/^.*-/, '')}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell align='right'>
                          <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatAmount(row.amount, row.currency)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <CustomChip
                            round='true'
                            label={status.label}
                            size='small'
                            color={status.color}
                            variant='tonal'
                            icon={<i className={status.icon} aria-hidden />}
                          />
                        </TableCell>
                        <TableCell>
                          {row.matchedRuleId ? (
                            <Tooltip title={`Outcome: ${row.resolutionOutcome ?? 'n/a'}`}>
                              <Typography variant='caption' sx={{ fontSize: '0.75rem' }}>
                                {row.matchedRuleId}
                              </Typography>
                            </Tooltip>
                          ) : (
                            <Typography variant='caption' color='text.secondary'>
                              {row.resolutionOutcome === 'ambiguous' ? 'Ambigua' : '—'}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align='right'>
                          <Stack direction='row' spacing={0.5} justifyContent='flex-end'>
                            <Tooltip title={canAct ? 'Adoptar como pago canónico' : 'No disponible para este estado'}>
                              <span>
                                <IconButton
                                  size='small'
                                  color='success'
                                  disabled={!canAct}
                                  onClick={() => setAdoptDialog(row)}
                                  aria-label={`Adoptar señal ${row.signalId}`}
                                >
                                  <i className='tabler-check' style={{ fontSize: 18 }} aria-hidden />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title={canAct ? 'Descartar señal' : 'No disponible para este estado'}>
                              <span>
                                <IconButton
                                  size='small'
                                  color='secondary'
                                  disabled={!canAct}
                                  onClick={() => setDismissDialog(row)}
                                  aria-label={`Descartar señal ${row.signalId}`}
                                >
                                  <i className='tabler-x' style={{ fontSize: 18 }} aria-hidden />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {adoptDialog && (
        <AdoptDialog
          signal={adoptDialog}
          onClose={() => setAdoptDialog(null)}
          onSuccess={() => {
            toast.success('Señal adoptada. Pago canónico creado.')
            setAdoptDialog(null)
            void refresh()
          }}
        />
      )}

      {dismissDialog && (
        <DismissDialog
          signal={dismissDialog}
          onClose={() => setDismissDialog(null)}
          onSuccess={() => {
            toast.success('Señal descartada.')
            setDismissDialog(null)
            void refresh()
          }}
        />
      )}
    </Stack>
  )
}

interface AdoptDialogProps {
  signal: SignalRow
  onClose: () => void
  onSuccess: () => void
}

const AdoptDialog = ({ signal, onClose, onSuccess }: AdoptDialogProps) => {
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [accountId, setAccountId] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingAccounts, setLoadingAccounts] = useState(true)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const res = await fetch(
          `/api/admin/finance/external-signals/accounts?currency=${encodeURIComponent(signal.currency)}`,
          { cache: 'no-store' }
        )

        if (!res.ok) throw new Error('No pudimos cargar las cuentas.')

        const json = (await res.json()) as { items: AccountOption[] }

        if (!cancelled) {
          setAccounts(json.items)

          if (json.items.length === 1) setAccountId(json.items[0]!.accountId)
        }
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Error al cargar cuentas.')
      } finally {
        if (!cancelled) setLoadingAccounts(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [signal.currency])

  const handleSubmit = async () => {
    if (!accountId) return
    setSubmitting(true)

    try {
      const res = await fetch(`/api/admin/finance/external-signals/${signal.signalId}/adopt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, notes: notes || undefined })
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))

        throw new Error(body.error || `Error ${res.status}`)
      }

      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No pudimos adoptar la señal.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth='sm' fullWidth aria-labelledby='adopt-dialog-title'>
      <DialogTitle id='adopt-dialog-title'>Adoptar señal como pago</DialogTitle>
      <DialogContent dividers>
        <DialogContentText sx={{ mb: 3 }}>
          Esta acción crea un pago canónico Greenhouse a partir de la señal. La cuenta no podrá modificarse
          después.
        </DialogContentText>

        <Stack spacing={3}>
          <Box>
            <Typography variant='caption' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Origen · Documento · Monto
            </Typography>
            <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', mt: 0.5 }}>
              {SOURCE_LABEL[signal.sourceSystem] || signal.sourceSystem} · {signal.documentId || '—'} ·{' '}
              {formatAmount(signal.amount, signal.currency)}
            </Typography>
          </Box>

          <CustomTextField
            select
            label='Cuenta de cash'
            helperText='Cuenta donde el dinero realmente entró o salió'
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
            disabled={loadingAccounts}
            fullWidth
            required
          >
            {loadingAccounts ? (
              <MenuItem value=''>Cargando cuentas...</MenuItem>
            ) : accounts.length === 0 ? (
              <MenuItem value='' disabled>
                No hay cuentas activas en {signal.currency}
              </MenuItem>
            ) : (
              accounts.map(acc => (
                <MenuItem key={acc.accountId} value={acc.accountId}>
                  {acc.accountName} · {acc.currency}
                </MenuItem>
              ))
            )}
          </CustomTextField>

          <CustomTextField
            label='Notas (opcional)'
            helperText='Contexto para auditoría: por qué esta cuenta, qué evidencia tienes'
            value={notes}
            onChange={e => setNotes(e.target.value)}
            multiline
            rows={3}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} variant='contained' disabled={!accountId || submitting} startIcon={<i className='tabler-check' aria-hidden />}>
          {submitting ? 'Adoptando...' : 'Adoptar y crear pago'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

interface DismissDialogProps {
  signal: SignalRow
  onClose: () => void
  onSuccess: () => void
}

const DismissDialog = ({ signal, onClose, onSuccess }: DismissDialogProps) => {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reasonValid = reason.trim().length >= 8

  const handleSubmit = async () => {
    if (!reasonValid) return
    setSubmitting(true)

    try {
      const res = await fetch(`/api/admin/finance/external-signals/${signal.signalId}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() })
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))

        throw new Error(body.error || `Error ${res.status}`)
      }

      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No pudimos descartar la señal.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth='sm' fullWidth aria-labelledby='dismiss-dialog-title'>
      <DialogTitle id='dismiss-dialog-title'>¿Descartar esta señal?</DialogTitle>
      <DialogContent dividers>
        <DialogContentText sx={{ mb: 3 }}>
          Marcar la señal como descartada documenta que no hay cash real correspondiente. La fila se preserva
          para auditoría pero deja de aparecer en la cola.
        </DialogContentText>

        <CustomTextField
          label='Razón'
          helperText='Explica por qué no hay pago real (mínimo 8 caracteres)'
          value={reason}
          onChange={e => setReason(e.target.value)}
          multiline
          rows={3}
          fullWidth
          required
          error={reason.length > 0 && !reasonValid}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} variant='contained' color='error' disabled={!reasonValid || submitting}>
          {submitting ? 'Descartando...' : 'Descartar señal'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ExternalSignalsView
