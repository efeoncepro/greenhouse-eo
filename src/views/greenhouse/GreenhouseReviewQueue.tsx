'use client'

import { useCallback, useEffect, useState } from 'react'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

// ── Types ──

interface ReviewItem {
  taskId: string
  taskName: string
  projectId: string
  projectName: string
  status: string
  phase: string
  assigneeName: string | null
  assigneeRole: string | null
  rpa: number | null
  daysWaiting: number
  urgency: 'normal' | 'attention' | 'critical'
  pageUrl: string | null
}

interface ReviewHistory {
  taskId: string
  taskName: string
  rpa: number | null
}

interface ReviewData {
  pending: ReviewItem[]
  history: ReviewHistory[]
  stats: { total: number; urgent48h: number; critical96h: number }
}

// ── Helpers ──

const PHASE_LABELS: Record<string, string> = {
  cambios_cliente: 'Cambios solicitados',
  revision_interna: 'Revisión interna'
}

const urgencyColor = (u: string): 'secondary' | 'warning' | 'error' => {
  if (u === 'critical') return 'error'
  if (u === 'attention') return 'warning'

  return 'secondary'
}

// ── Component ──

const GreenhouseReviewQueue = () => {
  const [data, setData] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'review' | 'changes'>('all')

  const fetchData = useCallback(async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/reviews/queue?history=true')

      if (res.ok) setData(await res.json())
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchData() }, [fetchData])

  const filtered = data?.pending.filter(r => {
    if (filter === 'review') return r.phase === 'revision_interna' || r.status.includes('revis')
    if (filter === 'changes') return r.phase === 'cambios_cliente'

    return true
  }) ?? []

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Revisiones'
            subheader='Items que necesitan tu aprobación o feedback'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'warning.lightOpacity' }}>
                <i className='tabler-clipboard-check' style={{ fontSize: 22, color: 'var(--mui-palette-warning-main)' }} />
              </Avatar>
            }
          />
        </Card>
      </Grid>

      {/* Urgency banners */}
      {data && data.stats.critical96h > 0 && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='error' variant='filled'>
            <strong>{data.stats.critical96h} item{data.stats.critical96h !== 1 ? 's' : ''}</strong> lleva{data.stats.critical96h !== 1 ? 'n' : ''} más de 96h esperando revisión
          </Alert>
        </Grid>
      )}
      {data && data.stats.urgent48h > 0 && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='warning' variant='outlined'>
            {data.stats.urgent48h} item{data.stats.urgent48h !== 1 ? 's' : ''} lleva{data.stats.urgent48h !== 1 ? 'n' : ''} más de 48h esperando
          </Alert>
        </Grid>
      )}

      {/* Filter chips */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <CustomChip
            label={`Todas (${data?.stats.total ?? 0})`}
            variant={filter === 'all' ? 'filled' : 'tonal'}
            color='primary'
            onClick={() => setFilter('all')}
            sx={{ cursor: 'pointer' }}
          />
          <CustomChip
            label='Revisión abierta'
            variant={filter === 'review' ? 'filled' : 'tonal'}
            color='info'
            onClick={() => setFilter('review')}
            sx={{ cursor: 'pointer' }}
          />
          <CustomChip
            label='Cambios solicitados'
            variant={filter === 'changes' ? 'filled' : 'tonal'}
            color='warning'
            onClick={() => setFilter('changes')}
            sx={{ cursor: 'pointer' }}
          />
        </Box>
      </Grid>

      {/* Review table */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : filtered.length === 0 ? (
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-checks' style={{ fontSize: 48, color: 'var(--mui-palette-success-main)' }} />
                <Typography variant='h6' sx={{ mt: 2 }}>Sin items pendientes de revisión</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Todas las entregas están al día.
                </Typography>
              </Box>
            </CardContent>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Asset</TableCell>
                    <TableCell>Proyecto</TableCell>
                    <TableCell>Asignado</TableCell>
                    <TableCell align='center'>Estado</TableCell>
                    <TableCell align='center'>Esperando</TableCell>
                    <TableCell align='center'>Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.taskId} hover>
                      <TableCell>
                        <Typography variant='body2' fontWeight={600}>{r.taskName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption' color='text.secondary'>{r.projectName}</Typography>
                      </TableCell>
                      <TableCell>
                        {r.assigneeName ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant='body2'>{r.assigneeName}</Typography>
                            {r.assigneeRole && (
                              <Typography variant='caption' color='text.disabled'>{r.assigneeRole}</Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant='caption' color='text.disabled'>—</Typography>
                        )}
                      </TableCell>
                      <TableCell align='center'>
                        <CustomChip
                          round='true'
                          size='small'
                          variant='tonal'
                          color={r.phase === 'cambios_cliente' ? 'warning' : 'info'}
                          label={PHASE_LABELS[r.phase] || r.status}
                        />
                      </TableCell>
                      <TableCell align='center'>
                        <CustomChip
                          round='true'
                          size='small'
                          variant='tonal'
                          color={urgencyColor(r.urgency)}
                          label={r.urgency === 'critical' ? `${r.daysWaiting}d — 96h+` : r.urgency === 'attention' ? `${r.daysWaiting}d — 48h+` : `${r.daysWaiting}d`}
                        />
                      </TableCell>
                      <TableCell align='center'>
                        {r.pageUrl ? (
                          <Button size='small' variant='tonal' href={r.pageUrl} target='_blank' rel='noopener'>
                            Ver
                          </Button>
                        ) : (
                          <Typography variant='caption' color='text.disabled'>—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Grid>

      {/* Review history */}
      {data && data.history.length > 0 && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
            <Accordion>
              <AccordionSummary expandIcon={<i className='tabler-chevron-down' />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity', width: 32, height: 32 }}>
                    <i className='tabler-history' style={{ fontSize: 18, color: 'var(--mui-palette-success-main)' }} />
                  </Avatar>
                  <Typography variant='subtitle1'>Historial reciente ({data.history.length})</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <Divider />
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Asset</TableCell>
                        <TableCell align='right'>RPA</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.history.map(h => (
                        <TableRow key={h.taskId} hover>
                          <TableCell>{h.taskName}</TableCell>
                          <TableCell align='right'>
                            {h.rpa != null ? (
                              <CustomChip
                                round='true'
                                size='small'
                                variant='tonal'
                                color={h.rpa <= 1.5 ? 'success' : h.rpa <= 2.5 ? 'warning' : 'error'}
                                label={h.rpa.toFixed(1)}
                              />
                            ) : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default GreenhouseReviewQueue
