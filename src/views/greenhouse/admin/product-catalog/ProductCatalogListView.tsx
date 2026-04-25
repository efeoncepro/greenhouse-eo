'use client'

import { useMemo, useState } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'

import type { ProductCatalogListData, ProductCatalogListItem } from './data'

// ─────────────────────────────────────────────────────────────
// TASK-605 Fase E — Admin list view for product catalog.
//
// Mirrors the commercial-parties list pattern: MUI Table with
// client-side search + filters (in-memory over the full set, since
// we have only ~74 products). For larger catalogs we'd switch to
// server-driven filters + pagination.
// ─────────────────────────────────────────────────────────────

const formatCurrency = (price: number | null, currency: string): string => {
  if (price === null) return '—'

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: currency || 'CLP',
    maximumFractionDigits: 2
  }).format(price)
}

const formatDate = (iso: string | null): string => {
  if (!iso) return '—'
  const d = new Date(iso)

  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('es-CL') : '—'
}

const ProductCatalogListView = ({ data }: { data: ProductCatalogListData }) => {
  const [search, setSearch] = useState('')
  const [sourceKindFilter, setSourceKindFilter] = useState<string>('all')
  const [archivedFilter, setArchivedFilter] = useState<string>('active')
  const [driftFilter, setDriftFilter] = useState<string>('all')

  const uniqueSourceKinds = useMemo(() => {
    const set = new Set<string>()

    for (const item of data.items) {
      if (item.sourceKind) set.add(item.sourceKind)
    }

    return Array.from(set).sort()
  }, [data.items])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    return data.items.filter(item => {
      if (q && !`${item.productCode} ${item.productName}`.toLowerCase().includes(q)) return false
      if (sourceKindFilter !== 'all' && item.sourceKind !== sourceKindFilter) return false
      if (archivedFilter === 'active' && item.isArchived) return false
      if (archivedFilter === 'archived' && !item.isArchived) return false
      if (driftFilter === 'has_drift' && item.driftedFieldsCount === 0) return false
      if (driftFilter === 'no_drift' && item.driftedFieldsCount > 0) return false

      return true
    })
  }, [data.items, search, sourceKindFilter, archivedFilter, driftFilter])

  const renderDriftChip = (item: ProductCatalogListItem) => {
    if (item.driftedFieldsCount === 0) {
      return <Chip label='Sin drift' size='small' variant='outlined' color='success' />
    }

    return (
      <Chip
        label={`${item.driftedFieldsCount} drift`}
        size='small'
        color='warning'
        title={item.lastDriftScannedAt ? `Escaneado ${formatDate(item.lastDriftScannedAt)}` : undefined}
      />
    )
  }

  return (
    <Box>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant='h4'>Catálogo de productos</Typography>
          <Typography variant='body2' color='text.secondary'>
            {data.total} productos. Edición, precios multi-moneda y sincronización manual con HubSpot.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            size='small'
            label='Buscar por SKU o nombre'
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ minWidth: 260 }}
          />

          <TextField
            size='small'
            select
            label='Tipo de fuente'
            value={sourceKindFilter}
            onChange={e => setSourceKindFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value='all'>Todos</MenuItem>
            {uniqueSourceKinds.map(kind => (
              <MenuItem key={kind} value={kind}>
                {kind}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            size='small'
            select
            label='Estado'
            value={archivedFilter}
            onChange={e => setArchivedFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value='active'>Activos</MenuItem>
            <MenuItem value='archived'>Archivados</MenuItem>
            <MenuItem value='all'>Todos</MenuItem>
          </TextField>

          <TextField
            size='small'
            select
            label='Drift'
            value={driftFilter}
            onChange={e => setDriftFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value='all'>Todos</MenuItem>
            <MenuItem value='has_drift'>Con drift</MenuItem>
            <MenuItem value='no_drift'>Sin drift</MenuItem>
          </TextField>
        </Stack>
      </Stack>

      <TableContainer component={Paper} variant='outlined'>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Business Line</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align='right'>Precio default</TableCell>
              <TableCell>Estado sync</TableCell>
              <TableCell>Drift</TableCell>
              <TableCell>Último sync</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align='center'>
                  <Typography variant='body2' color='text.secondary' sx={{ py: 4 }}>
                    Sin productos que coincidan con los filtros.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(item => (
                <TableRow
                  key={item.productId}
                  hover
                  sx={{ '& td': { verticalAlign: 'middle' } }}
                >
                  <TableCell>
                    <Link
                      href={`/admin/commercial/product-catalog/${encodeURIComponent(item.productId)}`}
                      style={{ textDecoration: 'none', color: 'inherit', fontWeight: 600 }}
                    >
                      {item.productCode}
                    </Link>
                    {item.isArchived && (
                      <Chip label='Archivado' size='small' sx={{ ml: 1 }} variant='outlined' />
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/commercial/product-catalog/${encodeURIComponent(item.productId)}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      {item.productName}
                    </Link>
                  </TableCell>
                  <TableCell>{item.businessLineCode ?? '—'}</TableCell>
                  <TableCell>{item.productType}</TableCell>
                  <TableCell align='right'>
                    {formatCurrency(item.defaultUnitPrice, item.defaultCurrency)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.syncStatus}
                      size='small'
                      variant='outlined'
                      color={item.syncStatus === 'synced' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{renderDriftChip(item)}</TableCell>
                  <TableCell>{formatDate(item.lastOutboundSyncAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default ProductCatalogListView
