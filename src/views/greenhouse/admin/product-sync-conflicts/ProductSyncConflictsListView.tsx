'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import { ExecutiveMiniStatCard } from '@/components/greenhouse'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'
import tableStyles from '@core/styles/table.module.css'

import { getConflictDisplayName } from './action-support'
import { formatDateTime, formatRelativeAge } from './formatters'
import type {
  ProductSyncConflictListItem,
  ProductSyncConflictListResponse,
  ProductSyncConflictResolution,
  ProductSyncConflictType
} from './types'
import {
  PRODUCT_SOURCE_KIND_LABELS,
  PRODUCT_SYNC_CONFLICT_RESOLUTION_LABELS,
  PRODUCT_SYNC_CONFLICT_TYPE_LABELS
} from './types'

type StatusFilter = 'all' | ProductSyncConflictResolution
type TypeFilter = 'all' | ProductSyncConflictType

type Props = {
  initialQuery?: string
  initialType?: TypeFilter
  initialStatus?: StatusFilter
}

const STATUS_TONES: Record<ProductSyncConflictResolution, 'error' | 'success' | 'warning' | 'secondary'> = {
  pending: 'error',
  resolved_greenhouse_wins: 'success',
  resolved_hubspot_wins: 'warning',
  ignored: 'secondary'
}

const TYPE_TONES: Record<ProductSyncConflictType, 'warning' | 'info' | 'error' | 'secondary'> = {
  orphan_in_hubspot: 'warning',
  orphan_in_greenhouse: 'info',
  field_drift: 'warning',
  sku_collision: 'error',
  archive_mismatch: 'secondary'
}

const DEFAULT_PAGE_SIZE = 25

const buildRequestUrl = ({
  query,
  type,
  status,
  limit,
  offset
}: {
  query: string
  type: TypeFilter
  status: StatusFilter
  limit: number
  offset: number
}) => {
  const params = new URLSearchParams()

  if (query.trim()) params.set('q', query.trim())
  if (type !== 'all') params.set('type', type)
  if (status !== 'all') params.set('status', status)
  params.set('limit', String(limit))
  params.set('offset', String(offset))

  return `/api/admin/commercial/product-sync-conflicts?${params.toString()}`
}

const ProductSyncConflictsListView = ({
  initialQuery = '',
  initialType = 'all',
  initialStatus = 'all'
}: Props) => {
  const [query, setQuery] = useState(initialQuery)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(initialType)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE)
  const [reloadToken, setReloadToken] = useState(0)
  const [data, setData] = useState<ProductSyncConflictListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    setPage(0)
  }, [deferredQuery, typeFilter, statusFilter])

  useEffect(() => {
    const controller = new AbortController()

    const requestUrl = buildRequestUrl({
      query: deferredQuery,
      type: typeFilter,
      status: statusFilter,
      limit: rowsPerPage,
      offset: page * rowsPerPage
    })

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(requestUrl, {
          signal: controller.signal,
          cache: 'no-store'
        })

        const payload = (await response.json().catch(() => null)) as
          | ProductSyncConflictListResponse
          | { error?: string | null }
          | null

        if (!response.ok) {
          setError(payload && 'error' in payload ? payload.error ?? 'No se pudo cargar la lista.' : 'No se pudo cargar la lista.')

          return
        }

        setData(payload as ProductSyncConflictListResponse)
      } catch (fetchError) {
        if (controller.signal.aborted) return

        setError(fetchError instanceof Error ? fetchError.message : 'No se pudo cargar la lista.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => controller.abort()
  }, [deferredQuery, page, reloadToken, rowsPerPage, statusFilter, typeFilter])

  const firstPendingConflict = useMemo(
    () => data?.items.find(item => item.resolutionStatus === 'pending') ?? data?.items[0] ?? null,
    [data]
  )

  const unresolvedTotal = data?.summary.totalUnresolved ?? 0

  const orphanTotal =
    (data?.summary.byType.orphan_in_hubspot ?? 0) + (data?.summary.byType.orphan_in_greenhouse ?? 0)

  const fieldDriftTotal = data?.summary.byType.field_drift ?? 0
  const skuCollisionTotal = data?.summary.byType.sku_collision ?? 0
  const archiveMismatchTotal = data?.summary.byType.archive_mismatch ?? 0
  const summaryLoading = loading && data == null

  const renderTable = (items: ProductSyncConflictListItem[]) => {
    if (items.length === 0) {
      return (
        <Alert severity='info' variant='outlined'>
          No hay conflictos que coincidan con los filtros actuales.
        </Alert>
      )
    }

    return (
      <>
        <TableContainer>
          <Table className={tableStyles.table}>
            <TableHead>
              <TableRow>
                <TableCell>Conflicto</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell>Operacion</TableCell>
                <TableCell align='right'>Detectado</TableCell>
                <TableCell align='right'>Detalle</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.conflictId} hover>
                  <TableCell>
                    <Stack direction='row' spacing={2} alignItems='center'>
                      <CustomAvatar skin='light' color={TYPE_TONES[item.conflictType]} size={38}>
                        <i className='tabler-alert-circle' />
                      </CustomAvatar>
                      <Stack spacing={0.5}>
                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                          {getConflictDisplayName(item)}
                        </Typography>
                        <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                          <CustomChip
                            label={PRODUCT_SYNC_CONFLICT_TYPE_LABELS[item.conflictType]}
                            color={TYPE_TONES[item.conflictType]}
                            size='small'
                            variant='tonal'
                            round='true'
                          />
                          {item.autoHealEligible ? (
                            <CustomChip label='Auto-heal elegible' color='info' size='small' variant='outlined' round='true' />
                          ) : null}
                        </Stack>
                      </Stack>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={1}>
                      <CustomChip
                        label={PRODUCT_SYNC_CONFLICT_RESOLUTION_LABELS[item.resolutionStatus]}
                        color={STATUS_TONES[item.resolutionStatus]}
                        size='small'
                        variant={item.resolutionStatus === 'pending' ? 'tonal' : 'outlined'}
                        round='true'
                        sx={{ width: 'fit-content' }}
                      />
                      <Typography variant='caption' color='text.secondary'>
                        {item.resolutionStatus === 'pending'
                          ? 'Sin resolucion aplicada'
                          : item.resolutionAppliedAt
                            ? `Aplicado ${formatDateTime(item.resolutionAppliedAt)}`
                            : 'Resolucion registrada'}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography variant='body2'>{item.productCode ?? item.hubspotProductId ?? 'Sin ancla'}</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {item.productId ?? 'Sin product_id local'}
                      </Typography>
                      {item.hubspotProductId ? (
                        <Typography variant='caption' color='text.secondary'>
                          HubSpot: {item.hubspotProductId}
                        </Typography>
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.75}>
                      {item.sourceKind ? (
                        <CustomChip
                          label={PRODUCT_SOURCE_KIND_LABELS[item.sourceKind] ?? item.sourceKind}
                          color='secondary'
                          size='small'
                          variant='outlined'
                          round='true'
                          sx={{ width: 'fit-content' }}
                        />
                      ) : (
                        <Typography variant='caption' color='text.secondary'>
                          Sin source kind
                        </Typography>
                      )}
                      <Typography variant='caption' color='text.secondary'>
                        {item.hubspotSyncStatus ? `Sync: ${item.hubspotSyncStatus}` : 'Sin estado outbound'}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {item.isArchived == null ? 'Archivado no informado' : item.isArchived ? 'Archivado localmente' : 'Activo localmente'}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align='right'>
                    <Stack spacing={0.5} alignItems='flex-end'>
                      <Typography variant='body2'>{formatDateTime(item.detectedAt)}</Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {formatRelativeAge(item.detectedAt)}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align='right'>
                    <Button component={Link} href={`/admin/commercial/product-sync-conflicts/${item.conflictId}`} size='small'>
                      Abrir detalle
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component='div'
          count={data?.total ?? 0}
          page={page}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={event => {
            setRowsPerPage(Number(event.target.value))
            setPage(0)
          }}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage='Filas'
        />
      </>
    )
  }

  return (
    <Stack spacing={6}>
      <Card sx={{ overflow: 'hidden' }}>
        <CardContent
          sx={{
            p: { xs: 4, md: 6 },
            background:
              'linear-gradient(135deg, rgba(245,158,11,0.16) 0%, rgba(59,130,246,0.12) 42%, rgba(15,23,42,0) 100%)'
          }}
        >
          <Stack spacing={2.5}>
            <CustomChip label='Admin Center / Comercial' color='warning' variant='outlined' round='true' sx={{ width: 'fit-content' }} />
            <Typography variant='h3'>Product sync conflicts</Typography>
            <Typography color='text.secondary' sx={{ maxWidth: 980 }}>
              Surface operativa para vigilar drift entre Greenhouse y HubSpot Products, priorizar los casos que
              requieren intervencion humana y abrir una resolucion auditable por conflicto.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                component={Link}
                href={firstPendingConflict ? `/admin/commercial/product-sync-conflicts/${firstPendingConflict.conflictId}` : '/admin'}
                variant='contained'
              >
                {firstPendingConflict ? 'Abrir conflicto prioritario' : 'Volver a Admin Center'}
              </Button>
              <Button component='a' href='#product-sync-conflicts-list' variant='outlined'>
                Ir a la tabla operativa
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
        }}
      >
        <ExecutiveMiniStatCard
          title='Pendientes'
          value={summaryLoading ? '...' : String(unresolvedTotal)}
          detail={
            summaryLoading
              ? 'Cargando resumen operativo...'
              : 'Conflictos todavia abiertos para resolucion manual o seguimiento.'
          }
          tone={summaryLoading ? 'info' : unresolvedTotal > 0 ? 'error' : 'success'}
        />
        <ExecutiveMiniStatCard
          title='Field drift'
          value={summaryLoading ? '...' : String(fieldDriftTotal)}
          detail={
            summaryLoading
              ? 'Esperando el corte actual...'
              : 'Casos donde HubSpot y Greenhouse difieren en campos Greenhouse-owned.'
          }
          tone={summaryLoading ? 'info' : fieldDriftTotal > 0 ? 'warning' : 'success'}
        />
        <ExecutiveMiniStatCard
          title='Orphans'
          value={summaryLoading ? '...' : String(orphanTotal)}
          detail={
            summaryLoading ? 'Evaluando anclas remotas y locales...' : 'Suma de huellas no emparejadas en HubSpot o en Greenhouse.'
          }
          tone={summaryLoading ? 'info' : orphanTotal > 0 ? 'warning' : 'success'}
        />
        <ExecutiveMiniStatCard
          title='Riesgo estructural'
          value={summaryLoading ? '...' : String(skuCollisionTotal)}
          detail={
            summaryLoading
              ? 'Cargando mismatch estructurales...'
              : `${archiveMismatchTotal} archive mismatch y ${skuCollisionTotal} colision(es) de SKU.`
          }
          tone={summaryLoading ? 'info' : skuCollisionTotal > 0 ? 'error' : archiveMismatchTotal > 0 ? 'warning' : 'success'}
        />
      </Box>

      <Alert severity={unresolvedTotal > 0 ? 'warning' : 'success'} variant='outlined'>
        {unresolvedTotal > 0
          ? `El primer corte muestra ${unresolvedTotal} conflicto(s) pendiente(s). Prioriza primero colisiones de SKU y orphans con impacto comercial antes de aceptar overrides remotos.`
          : 'No hay conflictos pendientes en el corte actual. Igual puedes revisar historico resuelto o ignorado desde los filtros.'}
      </Alert>

      <Card id='product-sync-conflicts-list'>
        <CardHeader
          title='Lista operativa de conflictos'
          subheader='Filtra por texto, tipo y estado de resolucion para abrir el caso correcto sin salir del Admin Center.'
        />
        <CardContent>
          <Stack spacing={3}>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 2fr) repeat(2, minmax(0, 1fr))' }
              }}
            >
              <CustomTextField
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder='Buscar por producto, SKU, HubSpot product o conflict id'
                fullWidth
              />
              <CustomTextField
                select
                value={typeFilter}
                onChange={event => setTypeFilter(event.target.value as TypeFilter)}
                fullWidth
              >
                <MenuItem value='all'>Todos los tipos</MenuItem>
                {Object.entries(PRODUCT_SYNC_CONFLICT_TYPE_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </CustomTextField>
              <CustomTextField
                select
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value as StatusFilter)}
                fullWidth
              >
                <MenuItem value='all'>Todos los estados</MenuItem>
                {Object.entries(PRODUCT_SYNC_CONFLICT_RESOLUTION_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Box>

            <Divider />

            {loading ? (
              <Card variant='outlined'>
                <CardContent>
                  <Stack direction='row' spacing={2} alignItems='center'>
                    <CircularProgress size={20} />
                    <Typography variant='body2' color='text.secondary'>
                      Cargando conflictos y resumen operativo...
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            ) : error ? (
              <Alert
                severity='error'
                variant='outlined'
                action={
                  <Button color='inherit' size='small' onClick={() => setReloadToken(current => current + 1)}>
                    Reintentar
                  </Button>
                }
              >
                {error}
              </Alert>
            ) : (
              renderTable(data?.items ?? [])
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default ProductSyncConflictsListView
