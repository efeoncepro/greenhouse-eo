'use client'

import { useCallback, useState } from 'react'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import { toast } from 'sonner'

import { GH_RELEASE_ADMIN } from '@/lib/copy/release-admin'
import EmptyState from '@/components/greenhouse/EmptyState'
import type { ReleaseManifest } from '@/lib/release/manifest-store'
import type { ReliabilitySignal } from '@/types/reliability'

import { releaseColumns } from './columns'
import ReleaseDrawer from './ReleaseDrawer'

/**
 * TASK-854 Slice 1 — Client view del dashboard /admin/releases.
 *
 * Recibe initial data SSR-fetched + handles cursor pagination + drawer.
 *
 * Layout per UX plan:
 *  1. Header (h4 page title + subtitle)
 *  2. Banner Alert si lastStatusSignal severity = error/warning
 *  3. Card outlined con tabla TanStack
 *  4. Footer "Cargar más" si hasMore
 *  5. Drawer manifest viewer al click row
 *  6. Empty state si zero releases
 */

interface AdminReleasesViewProps {
  initialReleases: ReleaseManifest[]
  initialCursor: string | null
  initialHasMore: boolean
  lastStatusSignal: ReliabilitySignal | null
}

const AdminReleasesView = ({
  initialReleases,
  initialCursor,
  initialHasMore,
  lastStatusSignal
}: AdminReleasesViewProps) => {
  const [releases, setReleases] = useState<ReleaseManifest[]>(initialReleases)
  const [cursor, setCursor] = useState<string | null>(initialCursor)
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore)
  const [loadingMore, setLoadingMore] = useState<boolean>(false)
  const [selected, setSelected] = useState<ReleaseManifest | null>(null)

  const table = useReactTable({
    data: releases,
    columns: releaseColumns,
    getCoreRowModel: getCoreRowModel()
  })

  const handleRowClick = useCallback((release: ReleaseManifest) => {
    setSelected(release)
  }, [])

  const handleDrawerClose = useCallback(() => {
    setSelected(null)
  }, [])

  const handleLoadMore = useCallback(async () => {
    if (!cursor || loadingMore) return
    setLoadingMore(true)

    try {
      const response = await fetch(
        `/api/admin/releases?cursor=${encodeURIComponent(cursor)}`,
        { method: 'GET' }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = (await response.json()) as {
        releases: ReleaseManifest[]
        nextCursor: string | null
        hasMore: boolean
      }

      setReleases(prev => [...prev, ...data.releases])
      setCursor(data.nextCursor)
      setHasMore(data.hasMore)
    } catch {
      toast.error('No fue posible cargar más releases. Intenta de nuevo.')
    } finally {
      setLoadingMore(false)
    }
  }, [cursor, loadingMore])

  const showBanner =
    lastStatusSignal &&
    (lastStatusSignal.severity === 'error' || lastStatusSignal.severity === 'warning')

  return (
    <Box sx={{ p: { xs: 4, md: 6 } }}>
      <Stack spacing={1} sx={{ mb: 6 }}>
        <Typography variant='h4'>{GH_RELEASE_ADMIN.page_title}</Typography>
        <Typography variant='subtitle1' color='text.secondary'>
          {GH_RELEASE_ADMIN.page_subtitle}
        </Typography>
      </Stack>

      {showBanner ? (
        <Alert
          severity={lastStatusSignal.severity === 'error' ? 'error' : 'warning'}
          sx={{ mb: 4 }}
          icon={<i className='tabler-alert-triangle' aria-hidden='true' />}
        >
          <AlertTitle>
            {lastStatusSignal.severity === 'error' ? 'Atención inmediata' : 'Atención'}
          </AlertTitle>
          {lastStatusSignal.summary}
        </Alert>
      ) : null}

      <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
        <TableContainer>
          <Table aria-label={GH_RELEASE_ADMIN.page_title}>
            <caption className='sr-only'>{GH_RELEASE_ADMIN.page_subtitle}</caption>
            <TableHead>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <TableCell key={header.id} scope='col'>
                      <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 600 }}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableHead>

            <TableBody>
              {releases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={releaseColumns.length} sx={{ py: 8, border: 0 }}>
                    <EmptyState
                      icon='tabler-rocket'
                      title={GH_RELEASE_ADMIN.empty_title}
                      description={GH_RELEASE_ADMIN.empty_body}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map(row => (
                  <TableRow
                    key={row.id}
                    hover
                    onClick={() => handleRowClick(row.original)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        handleRowClick(row.original)
                      }
                    }}
                    tabIndex={0}
                    sx={{ cursor: 'pointer' }}
                  >
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

        {hasMore ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3, borderTop: t => `1px solid ${t.palette.divider}` }}>
            <Button
              variant='tonal'
              color='primary'
              size='small'
              disabled={loadingMore}
              startIcon={
                loadingMore ? (
                  <CircularProgress size={14} color='inherit' />
                ) : (
                  <i className='tabler-chevron-down' aria-hidden='true' />
                )
              }
              onClick={handleLoadMore}
            >
              {GH_RELEASE_ADMIN.load_more}
            </Button>
          </Box>
        ) : null}
      </Card>

      <ReleaseDrawer release={selected} open={selected !== null} onClose={handleDrawerClose} />
    </Box>
  )
}

export default AdminReleasesView

// Skeleton placeholder for loading state — exported for potential reuse.
export const AdminReleasesSkeleton = () => (
  <Box sx={{ p: { xs: 4, md: 6 } }}>
    <Skeleton variant='text' width={240} height={36} />
    <Skeleton variant='text' width={320} height={20} sx={{ mb: 4 }} />
    <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
      {[...Array(5)].map((_, idx) => (
        <Skeleton key={idx} variant='rectangular' height={56} sx={{ mb: idx < 4 ? 0.5 : 0 }} />
      ))}
    </Card>
  </Box>
)
