'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
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

type MasterAgreementStatus = 'draft' | 'active' | 'expired' | 'terminated' | 'superseded'
type ViewMode = 'table' | 'cards'

interface MasterAgreementListItem {
  msaId: string
  msaNumber: string
  title: string
  counterpartyName: string | null
  organizationId: string
  organizationName: string | null
  clientId: string | null
  clientName: string | null
  status: MasterAgreementStatus | string
  effectiveDate: string
  expirationDate: string | null
  autoRenewal: boolean
  renewalFrequencyMonths: number | null
  renewalNoticeDays: number
  governingLaw: string | null
  jurisdiction: string | null
  paymentTermsDays: number | null
  currency: string | null
  signedDocumentAssetId: string | null
  contractCount: number
  activeClauseCount: number
  updatedAt: string
}

const STATUS_META: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'secondary' | 'info' | 'primary' }> = {
  ...buildStatusMap({
    draft: { copyKey: 'draft', color: 'secondary' },
    active: { copyKey: 'active', color: 'success' },
    expired: { copyKey: 'expired', color: 'warning' }
  }),
  terminated: { label: 'Terminado', color: 'error' },
  superseded: { label: 'Sustituido', color: 'info' }
}

const CATEGORY_SUMMARY = [
  { value: '', label: 'Todos los estados' },
  { value: 'active', label: 'Activos' },
  { value: 'draft', label: 'Borradores' },
  { value: 'expired', label: 'Vencidos' },
  { value: 'terminated', label: 'Terminados' },
  { value: 'superseded', label: 'Sustituidos' }
]

const formatDate = (value: string | null) => {
  if (!value) return '—'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const daysUntil = (value: string | null) => {
  if (!value) return null

  const today = new Date()
  const target = new Date(`${value}T00:00:00`)

  if (Number.isNaN(target.getTime())) return null

  const diff = target.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()

  return Math.ceil(diff / (1000 * 60 * 60 * 24))
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

const normalizeAgreement = (value: unknown): MasterAgreementListItem => {
  const row = toRecord(value)

  return {
    msaId: String(row.msaId ?? row.msa_id ?? ''),
    msaNumber: String(row.msaNumber ?? row.msa_number ?? '—'),
    title: String(row.title ?? 'Acuerdo marco'),
    counterpartyName: toStringOrNull(row.counterpartyName ?? row.counterparty_name),
    organizationId: String(row.organizationId ?? row.organization_id ?? ''),
    organizationName: toStringOrNull(row.organizationName ?? row.organization_name),
    clientId: toStringOrNull(row.clientId ?? row.client_id),
    clientName: toStringOrNull(row.clientName ?? row.client_name),
    status: String(row.status ?? 'draft'),
    effectiveDate: String(row.effectiveDate ?? row.effective_date ?? ''),
    expirationDate: toStringOrNull(row.expirationDate ?? row.expiration_date),
    autoRenewal: Boolean(row.autoRenewal ?? row.auto_renewal),
    renewalFrequencyMonths: toNumberOrNull(row.renewalFrequencyMonths ?? row.renewal_frequency_months),
    renewalNoticeDays: Number(row.renewalNoticeDays ?? row.renewal_notice_days ?? 0),
    governingLaw: toStringOrNull(row.governingLaw ?? row.governing_law),
    jurisdiction: toStringOrNull(row.jurisdiction),
    paymentTermsDays: toNumberOrNull(row.paymentTermsDays ?? row.payment_terms_days),
    currency: toStringOrNull(row.currency),
    signedDocumentAssetId: toStringOrNull(row.signedDocumentAssetId ?? row.signed_document_asset_id),
    contractCount: Number(row.contractCount ?? row.contract_count ?? 0),
    activeClauseCount: Number(row.activeClauseCount ?? row.active_clause_count ?? 0),
    updatedAt: String(row.updatedAt ?? row.updated_at ?? '')
  }
}

const MasterAgreementsListView = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [items, setItems] = useState<MasterAgreementListItem[]>([])
  const [count, setCount] = useState(0)

  const fetchAgreements = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      if (statusFilter) params.set('status', statusFilter)

      const response = await fetch(`/api/finance/master-agreements?${params.toString()}`)
      const body = await response.json().catch(() => ({}))

      if (!response.ok) {
        setItems([])
        setCount(0)
        setError(typeof body.error === 'string' ? body.error : 'No pudimos cargar los acuerdos marco.')

        return
      }

      setItems(Array.isArray(body.items) ? body.items.map(normalizeAgreement) : [])
      setCount(Number(body.count ?? (Array.isArray(body.items) ? body.items.length : 0)))
    } catch {
      setItems([])
      setCount(0)
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchAgreements()
  }, [fetchAgreements])

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return items

    return items.filter(item => {
      const haystack = [
        item.msaNumber,
        item.title,
        item.counterpartyName ?? '',
        item.organizationName ?? '',
        item.clientName ?? '',
        item.governingLaw ?? '',
        item.jurisdiction ?? ''
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [items, search])

  const summary = useMemo(() => {
    const expiringSoon = filteredItems.filter(item => {
      const days = daysUntil(item.expirationDate)

      return days !== null && days >= 0 && days <= 90
    }).length

    return {
      active: filteredItems.filter(item => item.status === 'active').length,
      expiringSoon,
      contractCount: filteredItems.reduce((sum, item) => sum + item.contractCount, 0),
      clauseCount: filteredItems.reduce((sum, item) => sum + item.activeClauseCount, 0)
    }
  }, [filteredItems])

  const resetFilters = () => {
    setStatusFilter('')
    setSearch('')
  }

  if (loading && items.length === 0) {
    return (
      <Stack spacing={4}>
        <Skeleton variant='rounded' height={84} />
        <Skeleton variant='rounded' height={54} />
        <Skeleton variant='rounded' height={420} />
      </Stack>
    )
  }

  return (
    <Stack spacing={6}>
      <Box>
        <Typography variant='h4'>Acuerdos marco</Typography>
        <Typography color='text.secondary'>
          MSAs, cláusulas maestras y contratos vinculados por organización.
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
          stats={String(summary.active)}
          subtitle='Acuerdos marco vigentes'
          avatarIcon='tabler-file-certificate'
          avatarColor='success'
        />
        <HorizontalWithSubtitle
          title='Vencen pronto'
          stats={String(summary.expiringSoon)}
          subtitle='Vigencia menor o igual a 90 días'
          avatarIcon='tabler-clock'
          avatarColor='warning'
        />
        <HorizontalWithSubtitle
          title='Cláusulas activas'
          stats={String(summary.clauseCount)}
          subtitle='Cláusulas incluidas en los MSAs visibles'
          avatarIcon='tabler-list-check'
          avatarColor='info'
        />
        <HorizontalWithSubtitle
          title='Contratos vinculados'
          stats={String(summary.contractCount)}
          subtitle='Contratos que ya apuntan al MSA'
          avatarIcon='tabler-link'
          avatarColor='primary'
        />
      </Box>

      <Card>
        <CardHeader
          title='Registro de acuerdos marco'
          subheader={`${count} acuerdo${count === 1 ? '' : 's'} marco visibles`}
          avatar={
            <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
              <i className='tabler-file-certificate' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
            </Avatar>
          }
          action={
            <ButtonGroup size='small' variant='outlined'>
              <Button
                variant={viewMode === 'table' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('table')}
              >
                Tabla
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('cards')}
              >
                Tarjetas
              </Button>
            </ButtonGroup>
          }
        />
        <Divider />
        <CardContent sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
          <CustomTextField
            select
            size='small'
            label='Estado'
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            sx={{ minWidth: 180 }}
          >
            {CATEGORY_SUMMARY.map(option => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </CustomTextField>
          <CustomTextField
            size='small'
            label='Buscar'
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder='MSA, título, organización o contraparte'
            sx={{ minWidth: { xs: '100%', md: 320 }, flex: 1 }}
          />
          {(statusFilter || search) ? (
            <Button variant='text' onClick={resetFilters}>
              Limpiar filtros
            </Button>
          ) : null}
        </CardContent>
        <Divider />

        {filteredItems.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant='h6' sx={{ mb: 1 }}>
              No hay acuerdos marco visibles
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Ajusta los filtros o espera a que el backend exponga acuerdos marco para este tenant.
            </Typography>
          </Box>
        ) : viewMode === 'table' ? (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Acuerdo</TableCell>
                  <TableCell>Organización</TableCell>
                  <TableCell>Vigencia</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Alcance</TableCell>
                  <TableCell>Contratos</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map(item => {
                  const statusMeta = STATUS_META[item.status] ?? { label: item.status, color: 'secondary' as const }
                  const days = daysUntil(item.expirationDate)

                  const windowLabel = item.expirationDate
                    ? days === null
                      ? formatDate(item.expirationDate)
                      : days < 0
                        ? `Vencido hace ${Math.abs(days)} día${Math.abs(days) === 1 ? '' : 's'}`
                        : `Vence en ${days} día${days === 1 ? '' : 's'}`
                    : 'Sin vencimiento'

                  return (
                    <TableRow
                      key={item.msaId}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/finance/master-agreements/${item.msaId}`)}
                    >
                      <TableCell>
                        <Stack spacing={1}>
                          <Stack direction='row' spacing={1.5} alignItems='center'>
                            <Avatar variant='rounded' sx={{ width: 36, height: 36 }}>
                              <i className='tabler-file-certificate' />
                            </Avatar>
                            <Box>
                              <Typography fontWeight={600}>{item.msaNumber}</Typography>
                              <Typography variant='body2' color='text.secondary'>
                                {item.title}
                              </Typography>
                            </Box>
                          </Stack>
                          {item.autoRenewal ? (
                            <CustomChip label='Auto-renovable' color='info' size='small' variant='tonal' />
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography>{item.organizationName ?? 'Sin organización'}</Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {item.clientName ?? item.counterpartyName ?? 'Sin contraparte registrada'}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography>{formatDate(item.effectiveDate)}</Typography>
                        <Typography variant='body2' color='text.secondary'>
                          {windowLabel}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <CustomChip label={statusMeta.label} color={statusMeta.color} size='small' variant='tonal' />
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography>{item.paymentTermsDays ? `${item.paymentTermsDays} días` : 'Sin plazo de pago'}</Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {item.currency ?? 'CLP'}
                            {item.governingLaw ? ` · ${item.governingLaw}` : ''}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography>{item.contractCount} contratos</Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {item.activeClauseCount} cláusulas activas
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, minmax(0, 1fr))'
              }
            }}
          >
            {filteredItems.map(item => {
              const statusMeta = STATUS_META[item.status] ?? { label: item.status, color: 'secondary' as const }
              const days = daysUntil(item.expirationDate)

              return (
                <Card key={item.msaId} variant='outlined' sx={{ height: '100%' }}>
                  <CardActionArea
                    sx={{ height: '100%', alignItems: 'stretch' }}
                    onClick={() => router.push(`/finance/master-agreements/${item.msaId}`)}
                  >
                    <CardContent>
                      <Stack spacing={2}>
                        <Stack direction='row' spacing={2} justifyContent='space-between' alignItems='flex-start'>
                          <Box>
                            <Typography variant='h6'>{item.msaNumber}</Typography>
                            <Typography variant='body2' color='text.secondary'>
                              {item.title}
                            </Typography>
                          </Box>
                          <CustomChip label={statusMeta.label} color={statusMeta.color} size='small' variant='tonal' />
                        </Stack>
                        <Stack spacing={1}>
                          <Typography>
                            <strong>Organización:</strong> {item.organizationName ?? 'Sin organización'}
                          </Typography>
                          <Typography>
                            <strong>Contraparte:</strong> {item.clientName ?? item.counterpartyName ?? '—'}
                          </Typography>
                          <Typography>
                            <strong>Vigencia:</strong> {formatDate(item.effectiveDate)} {item.expirationDate ? `· ${days === null ? formatDate(item.expirationDate) : days < 0 ? `vencido hace ${Math.abs(days)} días` : `vence en ${days} días`}` : '· sin vencimiento'}
                          </Typography>
                          <Typography>
                            <strong>Condiciones:</strong> {item.paymentTermsDays ? `${item.paymentTermsDays} días` : 'Sin plazo'} {item.currency ? `· ${item.currency}` : ''}
                          </Typography>
                        </Stack>
                        <Stack direction='row' spacing={1} flexWrap='wrap'>
                          <CustomChip label={`${item.contractCount} contratos`} color='primary' size='small' variant='tonal' />
                          <CustomChip label={`${item.activeClauseCount} cláusulas`} color='info' size='small' variant='tonal' />
                          {item.autoRenewal ? <CustomChip label='Auto-renovable' color='success' size='small' variant='tonal' /> : null}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              )
            })}
          </Box>
        )}
      </Card>
    </Stack>
  )
}

export default MasterAgreementsListView
