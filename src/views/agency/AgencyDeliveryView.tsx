'use client'

import { useCallback, useEffect, useState } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import {
  createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import classnames from 'classnames'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import CustomerStats from '@components/card-statistics/CustomerStats'

import tableStyles from '@core/styles/table.module.css'

// ── Types ──

interface SpaceHealth {
  clientId: string
  clientName: string
  rpaAvg: number | null
  otdPct: number | null
  assetsActivos: number
  projectCount: number
}

interface PulseKpis {
  rpaGlobal: number | null
  otdPctGlobal: number | null
  assetsActivos: number
  feedbackPendiente: number
  totalSpaces: number
  totalProjects: number
}

// ── Helpers ──

type SemaphoreColor = 'success' | 'warning' | 'error'

// RPA is a ratio (1.0-3.0+), lower is better. NOT a percentage.
const rpaColor = (v: number | null | undefined): { color: SemaphoreColor; label: string } => {
  if (v == null) return { color: 'secondary' as SemaphoreColor, label: '—' }
  if (v <= 1.5) return { color: 'success', label: 'Óptimo' }
  if (v <= 2.5) return { color: 'warning', label: 'Atención' }

  return { color: 'error', label: 'Crítico' }
}

// OTD/FTR are percentages (0-100), higher is better
const pctSemaphore = (v: number | null | undefined): { color: SemaphoreColor; label: string } => {
  if (v == null) return { color: 'secondary' as SemaphoreColor, label: '—' }
  if (v >= 80) return { color: 'success', label: 'Óptimo' }
  if (v >= 60) return { color: 'warning', label: 'Atención' }

  return { color: 'error', label: 'Crítico' }
}

const fmtRpa = (v: number | null | undefined) => v != null ? v.toFixed(1) : '—'
const fmtPct = (v: number | null | undefined) => v != null ? `${Math.round(v)}%` : '—'

// ── Delivery table columns ──

const spaceColumnHelper = createColumnHelper<SpaceHealth>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const spaceColumns: ColumnDef<SpaceHealth, any>[] = [
  spaceColumnHelper.accessor('clientName', {
    header: 'Space',
    cell: ({ getValue }) => <Typography variant='body2' fontWeight={600}>{getValue()}</Typography>
  }),
  spaceColumnHelper.accessor('rpaAvg', {
    header: 'RPA',
    cell: ({ getValue }) => <CustomChip round='true' size='small' variant='tonal' color={rpaColor(getValue()).color} label={fmtRpa(getValue())} />,
    meta: { align: 'center' }
  }),
  spaceColumnHelper.accessor('otdPct', {
    header: 'OTD',
    cell: ({ getValue }) => <CustomChip round='true' size='small' variant='tonal' color={pctSemaphore(getValue()).color} label={fmtPct(getValue())} />,
    meta: { align: 'center' }
  }),
  spaceColumnHelper.accessor('projectCount', {
    header: 'Proyectos',
    meta: { align: 'right' }
  }),
  spaceColumnHelper.accessor('assetsActivos', {
    header: 'Stuck',
    cell: ({ getValue }) => getValue() > 0
      ? <CustomChip round='true' size='small' variant='tonal' color='error' label={String(getValue())} />
      : '0',
    meta: { align: 'right' }
  }),
  {
    id: 'health',
    header: 'Health',
    accessorFn: (row: SpaceHealth) => row.rpaAvg,
    cell: ({ row }: { row: { original: SpaceHealth } }) => {
      const h = rpaColor(row.original.rpaAvg)

      return <CustomChip round='true' size='small' variant='tonal' color={h.color} label={h.label} />
    },
    meta: { align: 'center' }
  }
]

// ── Component ──

const AgencyDeliveryView = () => {
  const [kpis, setKpis] = useState<PulseKpis | null>(null)
  const [spaces, setSpaces] = useState<SpaceHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [spaceSorting, setSpaceSorting] = useState<SortingState>([{ id: 'rpaAvg', desc: false }])

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const [pulseRes, spacesRes] = await Promise.allSettled([
        fetch('/api/agency/pulse'),
        fetch('/api/agency/spaces')
      ])

      if (pulseRes.status === 'fulfilled' && pulseRes.value.ok) {
        const d = await pulseRes.value.json()

        setKpis(d.kpis ?? null)
      }

      if (spacesRes.status === 'fulfilled' && spacesRes.value.ok) {
        const d = await spacesRes.value.json()

        // Filter out internal spaces for delivery view
        const deliverySpaces = (d.spaces ?? []).filter((s: SpaceHealth & { isInternal?: boolean }) => !s.isInternal)

        setSpaces(deliverySpaces)
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const spaceTable = useReactTable({
    data: spaces,
    columns: spaceColumns,
    state: { sorting: spaceSorting },
    onSortingChange: setSpaceSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  })

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>

  const rpa = kpis?.rpaGlobal ?? null
  const otd = kpis?.otdPctGlobal ?? null
  const stuck = kpis?.assetsActivos ?? 0
  const totalProjects = kpis?.totalProjects ?? 0
  const feedback = kpis?.feedbackPendiente ?? 0
  const rpaS = rpaColor(rpa)
  const otdS = pctSemaphore(otd)

  // Spaces count for display
  const spaceCount = spaces.length

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Delivery'
            subheader='ICO, sprints y producción cross-space'
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'success.lightOpacity' }}><i className='tabler-list-check' style={{ fontSize: 22, color: 'var(--mui-palette-success-main)' }} /></Avatar>}
          />
        </Card>
      </Grid>

      {/* KPI Row 1 */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Proyectos activos' stats={String(totalProjects)} avatarIcon='tabler-folders' avatarColor='success' subtitle={`${spaceCount} Spaces`} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='Feedback pendiente' stats={String(feedback)} avatarIcon='tabler-message-dots' avatarColor='info' subtitle='Revisiones abiertas' />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='RPA promedio' stats={fmtRpa(rpa)} avatarIcon='tabler-chart-line' avatarColor={rpaS.color} subtitle={rpaS.label} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <HorizontalWithSubtitle title='OTD' stats={fmtPct(otd)} avatarIcon='tabler-clock-check' avatarColor={otdS.color} subtitle={otdS.label} />
      </Grid>

      {/* KPI Row 2 */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <HorizontalWithSubtitle title='Stuck assets' stats={String(stuck)} avatarIcon='tabler-alert-triangle' avatarColor={stuck > 0 ? 'error' : 'success'} subtitle={stuck > 0 ? 'Requieren atención' : 'Sin bloqueos'} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <HorizontalWithSubtitle title='Spaces totales' stats={String(spaces.length)} avatarIcon='tabler-building' avatarColor='primary' subtitle='Con delivery activo' />
      </Grid>

      {/* Projects Table + Sprint Status */}
      <Grid size={{ xs: 12, md: 8 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title='Proyectos por Space'
            subheader={`${spaces.length} Spaces con delivery activo`}
            avatar={<Avatar variant='rounded' sx={{ bgcolor: 'primary.lightOpacity' }}><i className='tabler-folder' style={{ fontSize: 22, color: 'var(--mui-palette-primary-main)' }} /></Avatar>}
          />
          <Divider />
          {spaces.length === 0 ? (
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant='body2' color='text.secondary'>Sin datos de delivery</Typography>
            </CardContent>
          ) : (
            <div className='overflow-x-auto'>
              <table className={tableStyles.table}>
                <thead>
                  {spaceTable.getHeaderGroups().map(hg => (
                    <tr key={hg.id}>
                      {hg.headers.map(header => (
                        <th key={header.id} onClick={header.column.getToggleSortingHandler()} className={classnames({ 'cursor-pointer select-none': header.column.getCanSort() })} style={{ textAlign: (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {spaceTable.getRowModel().rows.map(row => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} style={{ textAlign: (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' ? 'right' : (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'center' ? 'center' : 'left' }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <CustomerStats title='Spaces activos' avatarIcon='tabler-building' color='primary' description='Con delivery y proyectos configurados' stats={String(spaces.length)} content='Spaces' />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <CustomerStats title='Feedback pendiente' avatarIcon='tabler-message-dots' color={feedback > 0 ? 'warning' : 'success'} description={feedback > 0 ? 'Revisiones que necesitan respuesta' : 'Todo al día'} stats={String(feedback)} content='items' />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <CustomerStats title='RPA global' avatarIcon='tabler-chart-line' color={rpaS.color} description='Rendimiento promedio de la agencia' chipLabel={rpaS.label} />
          </Grid>
        </Grid>
      </Grid>

      {/* Stuck Assets Alert */}
      {stuck > 0 && (
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}`, borderLeft: '4px solid', borderLeftColor: 'error.main' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <i className='tabler-alert-triangle' style={{ fontSize: 24, color: 'var(--mui-palette-error-main)' }} />
              <Typography variant='body1'>
                <strong>{stuck} assets atascados</strong> requieren atención — revisa los Spaces marcados en rojo
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default AgencyDeliveryView
