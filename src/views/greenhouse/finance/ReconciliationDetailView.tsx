'use client'

import { useCallback, useEffect, useState } from 'react'

import { useParams, useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import ReconciliationMatchDialog from '@views/greenhouse/finance/dialogs/ReconciliationMatchDialog'
import ImportStatementDrawer from '@views/greenhouse/finance/drawers/ImportStatementDrawer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReconciliationPeriod {
  periodId: string
  accountId: string
  year: number
  month: number
  openingBalance: number
  closingBalanceBank: number
  closingBalanceSystem: number
  difference: number
  status: string
  statementImported: boolean
  statementRowCount: number
  reconciledBy: string | null
  reconciledAt: string | null
  notes: string | null
}

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
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'secondary' | 'primary' }> = {
  open: { label: 'Abierto', color: 'info' },
  in_progress: { label: 'En proceso', color: 'warning' },
  reconciled: { label: 'Conciliado', color: 'success' },
  closed: { label: 'Cerrado', color: 'secondary' }
}

const MATCH_STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'warning' | 'secondary' | 'error' }> = {
  matched: { label: 'Conciliado', color: 'success' },
  manual_matched: { label: 'Conciliado', color: 'success' },
  suggested: { label: 'Sugerido', color: 'warning' },
  unmatched: { label: 'Sin match', color: 'secondary' },
  excluded: { label: 'Excluido', color: 'error' }
}

const MONTH_NAMES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCLP = (amount: number): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)

const formatDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-')

  return `${day}/${month}/${year}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ReconciliationDetailView = () => {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<ReconciliationPeriod | null>(null)
  const [statementRows, setStatementRows] = useState<StatementRow[]>([])
  const [autoMatchLoading, setAutoMatchLoading] = useState(false)
  const [selectedRow, setSelectedRow] = useState<StatementRow | null>(null)
  const [matchDialogOpen, setMatchDialogOpen] = useState(false)
  const [importDrawerOpen, setImportDrawerOpen] = useState(false)

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info'
  })

  const fetchData = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch(`/api/finance/reconciliation/${id}`)

      if (res.ok) {
        const data = await res.json()

        setPeriod(data.period ?? null)
        setStatementRows(data.statements ?? [])
      } else {
        setSnackbar({ open: true, message: 'No pudimos cargar el periodo de conciliacion.', severity: 'error' })
      }
    } catch {
      setSnackbar({ open: true, message: 'Error de conexion al cargar conciliacion.', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      fetchData()
    }
  }, [id, fetchData])

  const handleAutoMatch = async () => {
    setAutoMatchLoading(true)

    try {
      const res = await fetch(`/api/finance/reconciliation/${id}/auto-match`, { method: 'POST' })

      if (res.ok) {
        const data = await res.json()
        const matchedTotal = data.matched ?? 0
        const suggestedTotal = data.suggested ?? 0

        setSnackbar({
          open: true,
          message: `Auto-match completado: ${matchedTotal} conciliadas, ${suggestedTotal} sugeridas`,
          severity: 'success'
        })

        // Refresh data after auto-match
        fetchData()
      } else {
        setSnackbar({
          open: true,
          message: 'Error al ejecutar auto-match',
          severity: 'error'
        })
      }
    } catch {
      setSnackbar({
        open: true,
        message: 'Error al ejecutar auto-match',
        severity: 'error'
      })
    } finally {
      setAutoMatchLoading(false)
    }
  }

  const handleRowClick = (row: StatementRow) => {
    setSelectedRow(row)
    setMatchDialogOpen(true)
  }

  const handleMatchActionComplete = () => {
    setSnackbar({
      open: true,
      message: 'Conciliacion actualizada correctamente',
      severity: 'success'
    })

    fetchData()
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading && !period) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Skeleton variant='circular' width={40} height={40} />
          <Skeleton variant='text' width={300} height={40} />
        </Box>
        <Grid container spacing={6}>
          {[0, 1, 2, 3].map(i => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant='rounded' height={120} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant='rounded' height={400} />
      </Box>
    )
  }

  if (!period) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, py: 10 }}>
        <Typography variant='h6' color='text.secondary'>
          Período de conciliación no encontrado
        </Typography>
        <Button variant='outlined' onClick={() => router.push('/finance/reconciliation')}>
          Volver a conciliación
        </Button>
      </Box>
    )
  }

  const statusConf = STATUS_CONFIG[period.status] || STATUS_CONFIG.open

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => router.push('/finance/reconciliation')}>
            <i className='tabler-arrow-left' />
          </IconButton>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant='h4' sx={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}>
                Conciliación {MONTH_NAMES[period.month]} {period.year}
              </Typography>
              <CustomChip
                round='true'
                size='small'
                color={statusConf.color}
                label={statusConf.label}
              />
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant='outlined' startIcon={<i className='tabler-file-import' />} onClick={() => setImportDrawerOpen(true)}>
            Importar extracto
          </Button>
          <Button
            variant='contained'
            color='primary'
            startIcon={<i className='tabler-arrows-exchange' />}
            onClick={handleAutoMatch}
            disabled={autoMatchLoading}
          >
            {autoMatchLoading ? 'Procesando...' : 'Auto-match'}
          </Button>
        </Box>
      </Box>

      {/* KPIs */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Saldo apertura'
            stats={formatCLP(period.openingBalance)}
            subtitle='Inicio del período'
            avatarIcon='tabler-wallet'
            avatarColor='primary'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Saldo banco'
            stats={formatCLP(period.closingBalanceBank)}
            subtitle='Extracto bancario'
            avatarIcon='tabler-building-bank'
            avatarColor='info'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Saldo sistema'
            stats={formatCLP(period.closingBalanceSystem)}
            subtitle='Registros internos'
            avatarIcon='tabler-calculator'
            avatarColor='warning'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <HorizontalWithSubtitle
            title='Diferencia'
            stats={formatCLP(period.difference)}
            subtitle='Pendiente de conciliar'
            avatarIcon='tabler-alert-triangle'
            avatarColor={period.difference !== 0 ? 'error' : 'success'}
          />
        </Grid>
      </Grid>

      {/* Statement Rows Table */}
      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <CardHeader
          title='Movimientos del extracto'
          subheader={`${statementRows.length} transacciones`}
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}>
              <i className='tabler-list-details' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} />
            </Avatar>
          }
        />
        <Divider />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Referencia</TableCell>
                <TableCell align='right'>Monto</TableCell>
                <TableCell align='right'>Saldo</TableCell>
                <TableCell>Estado match</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Entidad</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {statementRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align='center' sx={{ py: 6 }}>
                    <Typography variant='body2' color='text.secondary'>
                      No hay movimientos en el extracto. Importe un extracto bancario para comenzar la conciliación.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                statementRows.map(row => {
                  const matchConf = MATCH_STATUS_CONFIG[row.matchStatus] || MATCH_STATUS_CONFIG.unmatched
                  const isNegative = row.amount < 0

                  return (
                    <TableRow
                      key={row.rowId}
                      hover
                      onClick={() => handleRowClick(row)}
                      sx={{ cursor: 'pointer' }}
                      role='button'
                      tabIndex={0}
                      aria-label={`${row.description}, ${formatCLP(row.amount)}, ${matchConf.label}`}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowClick(row) } }}
                    >
                      <TableCell>
                        <Typography variant='body2'>
                          {formatDate(row.transactionDate)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>
                          {row.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {row.reference || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography
                          variant='body2'
                          color={isNegative ? 'error.main' : 'success.main'}
                          fontWeight={600}
                        >
                          {formatCLP(row.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <Typography variant='body2'>
                          {formatCLP(row.balance)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <CustomChip
                          round='true'
                          size='small'
                          color={matchConf.color}
                          label={matchConf.label}
                        />
                      </TableCell>
                      <TableCell>
                        {row.matchedType ? (
                          <CustomChip
                            round='true'
                            size='small'
                            color={row.matchedType === 'income' ? 'success' : 'error'}
                            label={row.matchedType === 'income' ? 'Ingreso' : 'Egreso'}
                          />
                        ) : (
                          <Typography variant='body2' color='text.secondary'>—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.matchedId ? (
                          <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {row.matchedId}
                          </Typography>
                        ) : (
                          <Typography variant='body2' color='text.secondary'>
                            —
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Import Statement Drawer */}
      <ImportStatementDrawer
        open={importDrawerOpen}
        periodId={id}
        onClose={() => setImportDrawerOpen(false)}
        onSuccess={() => {
          setImportDrawerOpen(false)
          setSnackbar({ open: true, message: 'Extracto importado correctamente', severity: 'success' })
          fetchData()
        }}
      />

      {/* Match Dialog */}
      <ReconciliationMatchDialog
        open={matchDialogOpen}
        periodId={id}
        row={selectedRow}
        onClose={() => setMatchDialogOpen(false)}
        onActionComplete={handleMatchActionComplete}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant='filled'
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default ReconciliationDetailView
