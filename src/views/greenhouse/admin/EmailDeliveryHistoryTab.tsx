'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithAvatar from '@components/card-statistics/HorizontalWithAvatar'
import OptionMenu from '@core/components/option-menu'
import TablePaginationComponent from '@/components/TablePaginationComponent'

import EmailDeliveryDetailDrawer from './EmailDeliveryDetailDrawer'

import tableStyles from '@core/styles/table.module.css'

interface EmailDelivery {
  effectiveStatus: string
  deliveryId: string
  batchId: string
  emailType: string
  domain: string
  recipientEmail: string
  recipientName: string | null
  subject: string
  resendId: string | null
  status: string
  hasAttachments: boolean
  sourceEventId: string | null
  sourceEntity: string | null
  actorEmail: string | null
  errorMessage: string | null
  attemptNumber: number
  deliveredAt: string | null
  bouncedAt: string | null
  complainedAt: string | null
  createdAt: string
  updatedAt: string
}

interface Kpis {
  sentToday: number
  failedToday: number
  pendingRetry: number
  deliveryRate: number
}

const EMAIL_STATUS_MAP: Record<string, { label: string; color: 'success' | 'error' | 'warning' | 'secondary' }> = {
  sent: { label: 'Enviado', color: 'success' },
  delivered: { label: 'Entregado', color: 'success' },
  bounced: { label: 'Rebotado', color: 'error' },
  complained: { label: 'Spam', color: 'warning' },
  failed: { label: 'Fallido', color: 'error' },
  pending: { label: 'Pendiente', color: 'warning' },
  skipped: { label: 'Omitido', color: 'secondary' }
}

const EMAIL_TYPE_MAP: Record<string, { label: string; icon: string; color: 'warning' | 'info' | 'primary' | 'success' }> = {
  password_reset: { label: 'Contraseña', icon: 'tabler-key', color: 'warning' },
  invitation: { label: 'Invitación', icon: 'tabler-user-plus', color: 'info' },
  verify_email: { label: 'Verificación', icon: 'tabler-shield-check', color: 'primary' },
  payroll_export: { label: 'Cierre nómina', icon: 'tabler-file-invoice', color: 'success' },
  payroll_receipt: { label: 'Recibo nómina', icon: 'tabler-receipt', color: 'success' },
  notification: { label: 'Notificación', icon: 'tabler-bell', color: 'primary' }
}

const EMAIL_DOMAIN_MAP: Record<string, string> = {
  identity: 'Identidad',
  payroll: 'Nómina',
  finance: 'Finanzas',
  hr: 'Personas',
  delivery: 'Delivery',
  system: 'Sistema'
}

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'ahora'
  if (diffMin < 60) return `hace ${diffMin} min`

  const diffHours = Math.floor(diffMin / 60)

  if (diffHours < 24) return `hace ${diffHours} h`

  const diffDays = Math.floor(diffHours / 24)

  return `hace ${diffDays} d`
}

const formatAbsoluteTime = (dateString: string) =>
  new Date(dateString).toLocaleString('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

const columnHelper = createColumnHelper<EmailDelivery>()

const EmailDeliveryHistoryTab = () => {
  const [data, setData] = useState<EmailDelivery[]>([])
  const [kpis, setKpis] = useState<Kpis>({ sentToday: 0, failedToday: 0, pendingRetry: 0, deliveryRate: 100 })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [emailType, setEmailType] = useState('')
  const [domain, setDomain] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<EmailDelivery | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)

    const params = new URLSearchParams()

    params.set('page', String(page + 1))
    params.set('pageSize', String(pageSize))

    if (emailType) params.set('emailType', emailType)
    if (domain) params.set('domain', domain)
    if (status) params.set('status', status)
    if (search) params.set('search', search)

    try {
      const res = await fetch(`/api/admin/email-deliveries?${params}`)
      const json = await res.json()

      setData(json.data ?? [])
      setTotal(json.total ?? 0)
      setKpis(json.kpis ?? { sentToday: 0, failedToday: 0, pendingRetry: 0, deliveryRate: 100 })
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, emailType, domain, status, search])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRetry = useCallback(async (delivery: EmailDelivery) => {
    await fetch(`/api/admin/email-deliveries/${delivery.deliveryId}/retry`, { method: 'POST' })
    fetchData()
  }, [fetchData])

  const columns = useMemo(() => [
    columnHelper.accessor('emailType', {
      header: 'Tipo',
      cell: ({ getValue }) => {
        const type = EMAIL_TYPE_MAP[getValue()] ?? { label: getValue(), icon: 'tabler-mail', color: 'secondary' as const }

        return (
          <Tooltip title={type.label}>
            <span>
              <CustomAvatar variant='rounded' skin='light' color={type.color} size={28}>
                <i className={type.icon} style={{ fontSize: '16px' }} />
              </CustomAvatar>
            </span>
          </Tooltip>
        )
      },
      size: 60
    }),
    columnHelper.accessor('recipientEmail', {
      header: 'Destinatario',
      cell: ({ row }) => (
        <Box>
          <Typography variant='body2'>{row.original.recipientEmail}</Typography>
          {row.original.recipientName && (
            <Typography variant='caption' color='text.secondary'>{row.original.recipientName}</Typography>
          )}
        </Box>
      )
    }),
    columnHelper.accessor('subject', {
      header: 'Asunto',
      cell: ({ getValue }) => (
        <Tooltip title={getValue()}>
          <Typography variant='body2' noWrap sx={{ maxWidth: 260 }}>{getValue()}</Typography>
        </Tooltip>
      )
    }),
    columnHelper.accessor('effectiveStatus', {
      header: 'Estado',
      cell: ({ getValue }) => {
        const s = EMAIL_STATUS_MAP[getValue()] ?? { label: getValue(), color: 'secondary' as const }

        return <CustomChip round='true' variant='tonal' size='small' label={s.label} color={s.color} />
      },
      size: 100
    }),
    columnHelper.accessor('attemptNumber', {
      header: 'Int.',
      cell: ({ getValue }) => (
        <Typography variant='body2' sx={getValue() > 1 ? { fontSize: '0.8rem' } : {}}>
          {getValue()}
        </Typography>
      ),
      size: 50
    }),
    columnHelper.accessor('createdAt', {
      header: 'Fecha',
      cell: ({ getValue }) => (
        <Tooltip title={formatAbsoluteTime(getValue())}>
          <Typography variant='body2' color='text.secondary'>{formatRelativeTime(getValue())}</Typography>
        </Tooltip>
      ),
      size: 100
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const d = row.original
        const canRetry = d.status === 'failed' && d.attemptNumber < 3

        return (
          <OptionMenu
            iconButtonProps={{ size: 'small' }}
            options={[
              { text: 'Ver detalle', menuItemProps: { onClick: () => { setSelectedDelivery(d); setDrawerOpen(true) } } },
              ...(canRetry ? [{ text: 'Reintentar envío', menuItemProps: { onClick: () => handleRetry(d) } }] : [])
            ]}
          />
        )
      },
      size: 50
    })
  ], [handleRetry])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize),
    state: { pagination: { pageIndex: page, pageSize } },
    onPaginationChange: updater => {
      const next = typeof updater === 'function' ? updater({ pageIndex: page, pageSize }) : updater

      setPage(next.pageIndex)
      setPageSize(next.pageSize)
    }
  })

  const kpiCards = [
    { title: 'Enviados hoy', stats: String(kpis.sentToday), avatarIcon: 'tabler-send-2', avatarColor: 'info' as const },
    { title: 'Entrega', stats: `${kpis.deliveryRate}%`, avatarIcon: 'tabler-checks', avatarColor: 'success' as const },
    { title: 'Fallidos', stats: String(kpis.failedToday), avatarIcon: 'tabler-alert-circle', avatarColor: 'error' as const },
    { title: 'Pendientes de reintento', stats: String(kpis.pendingRetry), avatarIcon: 'tabler-clock-pause', avatarColor: 'warning' as const }
  ]

  return (
    <>
      <Grid container spacing={6}>
        {kpiCards.map((kpi, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithAvatar {...kpi} avatarSkin='light' avatarVariant='rounded' />
          </Grid>
        ))}

        <Grid size={12}>
          <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
            <CardHeader title='Historial de envíos' />
            <CardContent>
              <Grid container spacing={4} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <CustomTextField
                    select fullWidth size='small' label='Tipo de correo'
                    value={emailType} onChange={e => { setEmailType(e.target.value); setPage(0) }}
                  >
                    <MenuItem value=''>Todos</MenuItem>
                    {Object.entries(EMAIL_TYPE_MAP).map(([key, val]) => (
                      <MenuItem key={key} value={key}>{val.label}</MenuItem>
                    ))}
                  </CustomTextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <CustomTextField
                    select fullWidth size='small' label='Dominio'
                    value={domain} onChange={e => { setDomain(e.target.value); setPage(0) }}
                  >
                    <MenuItem value=''>Todos</MenuItem>
                    {Object.entries(EMAIL_DOMAIN_MAP).map(([key, val]) => (
                      <MenuItem key={key} value={key}>{val}</MenuItem>
                    ))}
                  </CustomTextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <CustomTextField
                    select fullWidth size='small' label='Estado'
                    value={status} onChange={e => { setStatus(e.target.value); setPage(0) }}
                  >
                    <MenuItem value=''>Todos</MenuItem>
                    {Object.entries(EMAIL_STATUS_MAP).map(([key, val]) => (
                      <MenuItem key={key} value={key}>{val.label}</MenuItem>
                    ))}
                  </CustomTextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <CustomTextField
                    fullWidth size='small' label='Buscar' placeholder='Destinatario o asunto...'
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(0) }}
                  />
                </Grid>
              </Grid>
            </CardContent>

            <TableContainer>
              <Table className={tableStyles.table} size='small'>
                <TableHead>
                  {table.getHeaderGroups().map(hg => (
                    <TableRow key={hg.id}>
                      {hg.headers.map(h => (
                        <TableCell key={h.id} sx={{ width: h.getSize() !== 150 ? h.getSize() : undefined }}>
                          {flexRender(h.column.columnDef.header, h.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align='center'>
                        <Typography variant='body2' color='text.secondary' sx={{ py: 8 }}>
                          Cargando historial de envíos...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align='center'>
                        <Typography variant='body2' color='text.secondary' sx={{ py: 8 }}>
                          {search || emailType || domain || status
                            ? 'No hay correos que coincidan con los filtros actuales.'
                            : 'Aún no hay correos registrados.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map(row => (
                      <TableRow key={row.id} hover sx={{ cursor: 'pointer' }} onClick={() => { setSelectedDelivery(row.original); setDrawerOpen(true) }}>
                        {row.getVisibleCells().map(cell => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePaginationComponent table={table as any} />
          </Card>
        </Grid>
      </Grid>

      <EmailDeliveryDetailDrawer
        open={drawerOpen}
        delivery={selectedDelivery}
        onClose={() => { setDrawerOpen(false); setSelectedDelivery(null) }}
        onRetry={delivery => { handleRetry(delivery); setDrawerOpen(false); setSelectedDelivery(null) }}
      />
    </>
  )
}

export default EmailDeliveryHistoryTab
