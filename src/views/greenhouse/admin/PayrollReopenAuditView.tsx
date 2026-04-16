'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import type { PeriodStatus } from '@/types/payroll'

// TASK-412 — admin audit view for payroll period reopen events.
// Shows every reapertura with fecha, período, operador, motivo, detalle y
// estado previo. Filters by mes operativo y operador.

interface ReopenAuditRow {
  auditId: string
  periodId: string
  periodYear: number | null
  periodMonth: number | null
  periodLabel: string | null
  reopenedByUserId: string
  reopenedByName: string | null
  reopenedByEmail: string | null
  reopenedAt: string
  reason: string
  reasonDetail: string | null
  previredDeclaredCheck: boolean
  operationalMonth: string
  previousStatus: PeriodStatus
  lockedAt: string | null
}

interface AuditResponse {
  rows: ReopenAuditRow[]
  count: number
  filters: {
    month: string | null
    actorUserId: string | null
    limit: number
  }
}

const REASON_LABELS: Record<string, string> = {
  error_calculo: 'Error de cálculo',
  bono_retroactivo: 'Bono retroactivo',
  correccion_contractual: 'Corrección contractual',
  otro: 'Otro motivo'
}

const PREVIOUS_STATUS_LABELS: Record<PeriodStatus, string> = {
  draft: 'Borrador',
  calculated: 'Calculado',
  approved: 'Aprobado',
  exported: 'Exportado',
  reopened: 'Reabierto'
}

const formatDateTime = (value: string | null) => {
  if (!value) return '—'

  try {
    return new Date(value).toLocaleString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return value
  }
}

const formatMonthLabel = (row: ReopenAuditRow) => {
  if (row.periodLabel) return row.periodLabel

  return row.periodId
}

const PayrollReopenAuditView = () => {
  const [rows, setRows] = useState<ReopenAuditRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [monthFilter, setMonthFilter] = useState('')
  const [actorFilter, setActorFilter] = useState('')

  const fetchAudit = useCallback(async (month: string, actor: string) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      if (month.trim()) params.set('month', month.trim())
      if (actor.trim()) params.set('actorUserId', actor.trim())

      const qs = params.toString()
      const url = `/api/admin/payroll/reopen-audit${qs ? `?${qs}` : ''}`
      const res = await fetch(url)

      if (!res.ok) {
        const body = await res.json().catch(() => null)

        throw new Error(body?.error || 'No se pudo cargar la auditoría de reaperturas.')
      }

      const data = (await res.json()) as AuditResponse

      setRows(data.rows)
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'No se pudo cargar la auditoría de reaperturas.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    void fetchAudit('', '')
  }, [fetchAudit])

  const handleApplyFilters = useCallback(() => {
    void fetchAudit(monthFilter, actorFilter)
  }, [fetchAudit, monthFilter, actorFilter])

  const handleClearFilters = useCallback(() => {
    setMonthFilter('')
    setActorFilter('')
    void fetchAudit('', '')
  }, [fetchAudit])

  const isFiltered = useMemo(
    () => monthFilter.trim().length > 0 || actorFilter.trim().length > 0,
    [monthFilter, actorFilter]
  )

  return (
    <Stack spacing={4}>
      <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardHeader
          title='Auditoría de reaperturas de nómina'
          subheader='Historial completo de períodos reabiertos para reliquidación.'
        />
        <Divider />
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems='flex-end' sx={{ mb: 3 }}>
            <CustomTextField
              label='Mes operativo'
              placeholder='YYYY-MM'
              value={monthFilter}
              onChange={event => setMonthFilter(event.target.value)}
              size='small'
              sx={{ minWidth: 180 }}
              helperText='Ej. 2026-04'
            />
            <CustomTextField
              label='Operador (user ID)'
              placeholder='user-...'
              value={actorFilter}
              onChange={event => setActorFilter(event.target.value)}
              size='small'
              sx={{ minWidth: 240 }}
              helperText='ID del usuario que reabrió el período'
            />
            <Stack direction='row' spacing={1}>
              <button
                type='button'
                onClick={handleApplyFilters}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'var(--mui-palette-primary-main)',
                  color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 500
                }}
              >
                Aplicar filtros
              </button>
              {isFiltered && (
                <button
                  type='button'
                  onClick={handleClearFilters}
                  disabled={loading}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid var(--mui-palette-divider)',
                    background: 'transparent',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  Limpiar
                </button>
              )}
            </Stack>
          </Stack>

          {error && (
            <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {loading && (
            <Stack direction='row' spacing={2} alignItems='center' sx={{ py: 4 }}>
              <CircularProgress size={18} />
              <Typography variant='body2' color='text.secondary'>
                Cargando auditoría…
              </Typography>
            </Stack>
          )}

          {!loading && rows.length === 0 && !error && (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant='body2' color='text.secondary'>
                No hay eventos de reapertura registrados para los filtros actuales.
              </Typography>
            </Box>
          )}

          {!loading && rows.length > 0 && (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Período</TableCell>
                    <TableCell>Operador</TableCell>
                    <TableCell>Motivo</TableCell>
                    <TableCell>Detalle</TableCell>
                    <TableCell>Estado previo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map(row => (
                    <TableRow key={row.auditId} hover>
                      <TableCell>
                        <Typography variant='body2'>{formatDateTime(row.reopenedAt)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {formatMonthLabel(row)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack>
                          <Typography variant='body2'>
                            {row.reopenedByName || row.reopenedByEmail || row.reopenedByUserId}
                          </Typography>
                          {row.reopenedByEmail && row.reopenedByName && (
                            <Typography variant='caption' color='text.secondary'>
                              {row.reopenedByEmail}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <CustomChip
                          round='true'
                          size='small'
                          color='warning'
                          variant='tonal'
                          label={REASON_LABELS[row.reason] ?? row.reason}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>
                        <Typography variant='body2' color='text.secondary'>
                          {row.reasonDetail || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <CustomChip
                          round='true'
                          size='small'
                          variant='outlined'
                          color='secondary'
                          label={PREVIOUS_STATUS_LABELS[row.previousStatus] ?? row.previousStatus}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}

export default PayrollReopenAuditView
