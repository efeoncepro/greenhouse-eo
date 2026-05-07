'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import { buildStatusMap } from '@/lib/copy'
import { formatCurrency as formatGreenhouseCurrency, formatDate as formatGreenhouseDate } from '@/lib/format'

type ContractStatus = 'draft' | 'active' | 'paused' | 'terminated' | 'completed' | 'renewed'

interface ContractListItem {
  contractId: string
  contractNumber: string
  clientName: string | null
  msaId: string | null
  msaNumber: string | null
  msaTitle: string | null
  status: ContractStatus | string
  commercialModel: string | null
  staffingModel: string | null
  startDate: string | null
  endDate: string | null
  autoRenewal: boolean
  mrrClp: number | null
  arrClp: number | null
  linkedDocumentCount: number
  quotesCount: number
}

const STATUS_META: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'secondary' | 'info' | 'primary' }> = {
  ...buildStatusMap({
    draft: { copyKey: 'draft', color: 'secondary' },
    active: { copyKey: 'active', color: 'success' },
    paused: { copyKey: 'paused', color: 'warning' },
    completed: { copyKey: 'completed', color: 'info' }
  }),
  terminated: { label: 'Terminado', color: 'error' },
  renewed: { label: 'Renovado', color: 'primary' }
}

const MODEL_META: Record<string, { label: string; color: 'primary' | 'info' | 'secondary' }> = {
  retainer: { label: 'Retainer', color: 'primary' },
  project: { label: 'Proyecto', color: 'info' },
  one_off: { label: 'One-off', color: 'secondary' }
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? value as Record<string, unknown> : {}

const toStringOrNull = (value: unknown) => {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()

  return normalized.length > 0 ? normalized : null
}

const toNumberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const formatCLP = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return '—'

  return formatGreenhouseCurrency(amount, 'CLP', {
  maximumFractionDigits: 0
}, 'es-CL')
}

const formatDate = (value: string | null) => {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return formatGreenhouseDate(date, {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
}, 'es-CL')
}

const normalizeContract = (value: unknown): ContractListItem => {
  const row = toRecord(value)

  return {
    contractId: String(row.contractId ?? row.contract_id ?? ''),
    contractNumber: String(row.contractNumber ?? row.contract_number ?? row.contract_id ?? '—'),
    clientName: toStringOrNull(row.clientName ?? row.client_name),
    msaId: toStringOrNull(row.msaId ?? row.msa_id),
    msaNumber: toStringOrNull(row.msaNumber ?? row.msa_number),
    msaTitle: toStringOrNull(row.msaTitle ?? row.msa_title),
    status: String(row.status ?? 'draft'),
    commercialModel: toStringOrNull(row.commercialModel ?? row.commercial_model),
    staffingModel: toStringOrNull(row.staffingModel ?? row.staffing_model),
    startDate: toStringOrNull(row.startDate ?? row.start_date),
    endDate: toStringOrNull(row.endDate ?? row.end_date),
    autoRenewal: Boolean(row.autoRenewal ?? row.auto_renewal),
    mrrClp: toNumberOrNull(row.mrrClp ?? row.mrr_clp),
    arrClp: toNumberOrNull(row.arrClp ?? row.arr_clp),
    linkedDocumentCount: Number(row.linkedDocumentCount ?? row.linked_document_count ?? 0),
    quotesCount: Number(row.quotesCount ?? row.quotes_count ?? 0)
  }
}

const ContractsListView = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [items, setItems] = useState<ContractListItem[]>([])

  const fetchContracts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      if (statusFilter) params.set('status', statusFilter)

      const response = await fetch(`/api/finance/contracts?${params.toString()}`)
      const body = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(typeof body.error === 'string' ? body.error : 'No pudimos cargar los contratos.')
        setItems([])

        return
      }

      setItems(Array.isArray(body.items) ? body.items.map(normalizeContract) : [])
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchContracts()
  }, [fetchContracts])

  const summary = useMemo(() => ({
    activeContracts: items.filter(item => item.status === 'active').length,
    activeMrrClp: items.reduce((sum, item) => sum + (item.status === 'active' ? (item.mrrClp ?? 0) : 0), 0),
    activeArrClp: items.reduce((sum, item) => sum + (item.status === 'active' ? (item.arrClp ?? 0) : 0), 0),
    renewalsRunning: items.filter(item => item.autoRenewal).length
  }), [items])

  return (
    <Stack spacing={6}>
      <Box>
        <Typography variant='h4'>Contratos</Typography>
        <Typography color='text.secondary'>
          SOWs, renovaciones y ejecución comercial activa por contrato.
        </Typography>
      </Box>

      {error ? <Alert severity='error'>{error}</Alert> : null}

      <Box
        sx={{
          display: 'grid',
          gap: 4,
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(4, minmax(0, 1fr))'
          }
        }}
      >
        <HorizontalWithSubtitle
          title='Activos'
          stats={String(summary.activeContracts)}
          subtitle='Contratos vigentes'
          avatarIcon='tabler-file-contract'
          avatarColor='success'
        />
        <HorizontalWithSubtitle
          title='MRR activo'
          stats={formatCLP(summary.activeMrrClp)}
          subtitle='Ingreso recurrente mensual'
          avatarIcon='tabler-cash'
          avatarColor='primary'
        />
        <HorizontalWithSubtitle
          title='ARR activo'
          stats={formatCLP(summary.activeArrClp)}
          subtitle='Run-rate anual'
          avatarIcon='tabler-chart-line'
          avatarColor='info'
        />
        <HorizontalWithSubtitle
          title='Auto-renovables'
          stats={String(summary.renewalsRunning)}
          subtitle='Contratos sin término fijo'
          avatarIcon='tabler-repeat'
          avatarColor='warning'
        />
      </Box>

      <Card>
        <CardHeader title='Cartera contractual' subheader='Solo contratos visibles para tu tenant' />
        <CardContent>
          <Stack spacing={4}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              <CustomTextField
                select
                label='Estado'
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value)}
                sx={{ minWidth: 240 }}
              >
                <MenuItem value=''>Todos los estados</MenuItem>
                <MenuItem value='active'>Activos</MenuItem>
                <MenuItem value='renewed'>Renovados</MenuItem>
                <MenuItem value='paused'>Pausados</MenuItem>
                <MenuItem value='completed'>Completados</MenuItem>
                <MenuItem value='terminated'>Terminados</MenuItem>
                <MenuItem value='draft'>Borradores</MenuItem>
              </CustomTextField>
            </Stack>

            {loading ? (
              <Stack spacing={3}>
                <Skeleton variant='rounded' height={56} />
                <Skeleton variant='rounded' height={56} />
                <Skeleton variant='rounded' height={56} />
              </Stack>
            ) : items.length === 0 ? (
              <Alert severity='info'>
                No hay contratos para este scope todavía. Cuando una cotización se promueva a contrato aparecerá aquí.
              </Alert>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Contrato</TableCell>
                      <TableCell>Cliente</TableCell>
                      <TableCell>Modelo</TableCell>
                      <TableCell>Vigencia</TableCell>
                      <TableCell>MRR</TableCell>
                      <TableCell>Relaciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map(item => {
                      const statusMeta = STATUS_META[item.status] ?? { label: item.status, color: 'secondary' as const }

                      const modelMeta = item.commercialModel
                        ? (MODEL_META[item.commercialModel] ?? { label: item.commercialModel, color: 'secondary' as const })
                        : null

                      return (
                        <TableRow
                          key={item.contractId}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => router.push(`/finance/contracts/${item.contractId}`)}
                        >
                          <TableCell>
                            <Stack spacing={1}>
                              <Stack direction='row' spacing={2} alignItems='center'>
                                <Avatar variant='rounded' sx={{ width: 36, height: 36 }}>
                                  <i className='tabler-file-contract' />
                                </Avatar>
                                <Box>
                                  <Typography fontWeight={600}>{item.contractNumber}</Typography>
                                  <Typography variant='body2' color='text.secondary'>
                                    {item.staffingModel ? `Modelo de staffing ${item.staffingModel.replace(/_/g, ' ')}` : 'Sin modelo de staffing'}
                                  </Typography>
                                  {item.msaId && item.msaNumber ? (
                                    <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
                                      <Link href={`/finance/master-agreements/${item.msaId}`} style={{ textDecoration: 'none' }}>
                                        <CustomChip
                                          label={`MSA ${item.msaNumber}`}
                                          color='info'
                                          size='small'
                                          variant='tonal'
                                        />
                                      </Link>
                                      {item.msaTitle ? (
                                        <Typography variant='caption' color='text.secondary'>
                                          {item.msaTitle}
                                        </Typography>
                                      ) : null}
                                    </Stack>
                                  ) : null}
                                </Box>
                              </Stack>
                            <CustomChip label={statusMeta.label} color={statusMeta.color} size='small' variant='tonal' />
                            </Stack>
                          </TableCell>
                          <TableCell>{item.clientName ?? 'Sin cliente'}</TableCell>
                          <TableCell>
                            {modelMeta ? (
                              <Stack spacing={1}>
                                <CustomChip label={modelMeta.label} color={modelMeta.color} size='small' variant='tonal' />
                                {item.autoRenewal ? (
                                  <Typography variant='caption' color='text.secondary'>Auto-renovable</Typography>
                                ) : null}
                              </Stack>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            <Typography>{formatDate(item.startDate)}</Typography>
                            <Typography variant='body2' color='text.secondary'>
                              {item.endDate ? `Hasta ${formatDate(item.endDate)}` : 'Sin término definido'}
                            </Typography>
                          </TableCell>
                          <TableCell>{formatCLP(item.mrrClp)}</TableCell>
                          <TableCell>
                            <Typography>{item.quotesCount} quote(s)</Typography>
                            <Typography variant='body2' color='text.secondary'>
                              {item.linkedDocumentCount} documento(s)
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default ContractsListView
