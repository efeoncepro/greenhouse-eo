'use client'

/**
 * TASK-1153 — Cockpit de Roadmap. Lee el índice read-only de TASK-1152 y lo
 * presenta como backlog navegable: summary, filtros, board de 7 lanes e
 * inspector. NO edita Markdown (el SSOT sigue siendo el archivo). Recrea el
 * diseño AXIS aprobado con primitives + tokens del repo.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'

import { CompositionShell } from '@/components/greenhouse/primitives'
import { GreenhouseBreadcrumbs } from '@/components/greenhouse/primitives'
import { GH_ROADMAP } from '@/lib/copy/roadmap'
import {
  ROADMAP_LANE_ORDER,
  type RoadmapCockpitData,
  type RoadmapLaneId,
  type RoadmapPriority,
  type RoadmapWorkItemVM
} from '@/lib/roadmap/cockpit/types'
import type { WorkItemHealthLevel } from '@/lib/roadmap/work-item-index/types'

import RoadmapBoard, { type RoadmapLane } from './components/RoadmapBoard'
import RoadmapFilters, { type KindTabKey } from './components/RoadmapFilters'
import RoadmapInspector from './components/RoadmapInspector'
import RoadmapSummary, { type RoadmapSummaryCounts } from './components/RoadmapSummary'
import RoadmapTaskDrawer from './components/RoadmapTaskDrawer'

/** Máximo de cards renderizadas por lane (el header muestra el total real). */
const LANE_CARD_LIMIT = 50

const formatAge = (generatedAt: string): string => {
  const ms = Date.now() - new Date(generatedAt).getTime()
  const minutes = Math.floor(ms / 60000)

  if (minutes < 1) return GH_ROADMAP.syncedNow
  if (minutes < 60) return `hace ${minutes} min`

  const hours = Math.floor(minutes / 60)

  if (hours < 24) return `hace ${hours} h`

  return `hace ${Math.floor(hours / 24)} d`
}

const RoadmapCockpitView = ({ data }: { data: RoadmapCockpitData }) => {
  const router = useRouter()
  const theme = useTheme()
  const isCompact = useMediaQuery(theme.breakpoints.down('md'))

  const [kind, setKind] = useState<KindTabKey>('all')
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState<RoadmapPriority>(null)
  const [domain, setDomain] = useState('')
  const [health, setHealth] = useState<WorkItemHealthLevel | ''>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [toastOpen, setToastOpen] = useState(false)
  const [ageLabel, setAgeLabel] = useState('')

  const lastTriggerRef = useRef<HTMLElement | null>(null)

  // Relative time client-side (evita hydration mismatch server↔client).
  useEffect(() => {
    setAgeLabel(formatAge(data.generatedAt))
  }, [data.generatedAt])

  const presentIds = useMemo(() => new Set(data.items.map(item => item.id)), [data.items])

  const matches = useCallback(
    (kindKey: KindTabKey, item: RoadmapWorkItemVM) => {
      const query = search.trim().toLowerCase()

      return (
        (kindKey === 'all' || item.kind === kindKey) &&
        (!priority || item.priority === priority) &&
        (!domain || item.domains.includes(domain)) &&
        (!health || item.healthLevel === health) &&
        (!query || `${item.id} ${item.title} ${item.summary ?? ''}`.toLowerCase().includes(query))
      )
    },
    [search, priority, domain, health]
  )

  const visible = useMemo(() => data.items.filter(item => matches(kind, item)), [data.items, matches, kind])

  const lanes: RoadmapLane[] = useMemo(
    () =>
      ROADMAP_LANE_ORDER.map(laneId => {
        const laneItems = visible.filter(item => item.lane === laneId)

        return { id: laneId, items: laneItems.slice(0, LANE_CARD_LIMIT), totalCount: laneItems.length }
      }),
    [visible]
  )

  // Counts totales (sin filtrar) para tiles + pills — el backlog completo.
  const laneTotals = useMemo(() => {
    const totals = {} as Record<RoadmapLaneId, number>

    for (const laneId of ROADMAP_LANE_ORDER) totals[laneId] = 0
    for (const item of data.items) totals[item.lane] += 1

    return totals
  }, [data.items])

  const summaryCounts: RoadmapSummaryCounts = useMemo(
    () => ({
      total: data.items.filter(item => item.lane !== 'done').length,
      programs: laneTotals.programs,
      ready: laneTotals.ready,
      blocked: laneTotals.blocked,
      issues: laneTotals.issues,
      grooming: laneTotals.grooming,
      progress: laneTotals.progress
    }),
    [data.items, laneTotals]
  )

  const kindCounts: Record<KindTabKey, number> = useMemo(
    () => ({
      all: data.items.length,
      epic: data.items.filter(item => item.kind === 'epic').length,
      task: data.items.filter(item => item.kind === 'task').length,
      mini_task: data.items.filter(item => item.kind === 'mini_task').length,
      issue: data.items.filter(item => item.kind === 'issue').length
    }),
    [data.items]
  )

  const anyFilter = kind !== 'all' || Boolean(search) || Boolean(priority) || Boolean(domain) || Boolean(health)
  const hasResults = visible.length > 0

  const selected = useMemo(
    () => (selectedId ? data.items.find(item => item.id === selectedId) ?? null : null),
    [selectedId, data.items]
  )

  const openTaskItem = useMemo(
    () => (openTaskId ? data.items.find(item => item.id === openTaskId) ?? null : null),
    [openTaskId, data.items]
  )

  const handleSelect = useCallback((id: string) => {
    lastTriggerRef.current = (document.activeElement as HTMLElement) ?? null
    setSelectedId(id)
  }, [])

  const handleClose = useCallback(() => {
    setSelectedId(null)
    // Focus restore al elemento que abrió el inspector.
    window.requestAnimationFrame(() => lastTriggerRef.current?.focus())
  }, [])

  const clearFilters = useCallback(() => {
    setKind('all')
    setSearch('')
    setPriority(null)
    setDomain('')
    setHealth('')
  }, [])

  const handleCopy = useCallback((text: string) => {
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {})
    setToastOpen(true)
  }, [])

  const handleOpenTask = useCallback((id: string) => setOpenTaskId(id), [])
  const handleCloseTask = useCallback(() => setOpenTaskId(null), [])

  const primaryContent = hasResults ? (
    <RoadmapBoard lanes={lanes} selectedId={selectedId} onSelect={handleSelect} />
  ) : (
    <Box
      data-capture='roadmap-board'
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        p: t => `${t.spacing(16)} ${t.spacing(5)}`,
        textAlign: 'center',
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: t => `${t.shape.customBorderRadius.md}px`
      }}
    >
      <Box sx={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'action.hover', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'text.disabled' }}>
        <i className='tabler-zoom-cancel' aria-hidden='true' style={{ fontSize: 26 }} />
      </Box>
      <Typography variant='h5' sx={{ fontWeight: 600 }}>
        {GH_ROADMAP.noResultsTitle}
      </Typography>
      <Typography component='div' variant='body1' sx={{ color: 'text.secondary', maxWidth: 360, lineHeight: 1.5 }}>
        {GH_ROADMAP.noResultsBody}
      </Typography>
      <Button variant='outlined' startIcon={<i className='tabler-filter-off' />} onClick={clearFilters}>
        {GH_ROADMAP.noResultsCta}
      </Button>
    </Box>
  )

  const inspectorContent = (
    <RoadmapInspector
      item={selected}
      presentIds={presentIds}
      onClose={handleClose}
      onSelectRelated={handleSelect}
      onCopy={handleCopy}
      onOpenTask={handleOpenTask}
    />
  )

  return (
    <Box data-capture='roadmap-shell' sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
          <GreenhouseBreadcrumbs
            kind='pageHierarchy'
            items={[{ label: GH_ROADMAP.breadcrumbRoot, href: '/home' }, { label: GH_ROADMAP.breadcrumbCurrent }]}
          />
          <Typography variant='h4'>
            {GH_ROADMAP.pageTitle}
          </Typography>
          <Typography component='div' variant='body1' sx={{ color: 'text.secondary', maxWidth: 660, lineHeight: 1.5 }}>
            {GH_ROADMAP.pageSubtitle}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          {ageLabel ? (
            <Typography component='span' variant='caption' sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: 'text.secondary', whiteSpace: 'nowrap' }}>
              <Box component='span' sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: 'success.main' }} />
              {GH_ROADMAP.syncedLabel(ageLabel)}
            </Typography>
          ) : null}
          <Button
            variant='outlined'
            startIcon={<i className='tabler-refresh' />}
            onClick={() => router.refresh()}
            aria-label={GH_ROADMAP.refreshAria}
          >
            {GH_ROADMAP.refreshCta}
          </Button>
        </Box>
      </Box>

      {/* Banner degradado */}
      {data.degradedCount > 0 ? (
        <Alert
          severity='warning'
          variant='standard'
          icon={<i className='tabler-alert-triangle' />}
          sx={{
            alignItems: 'flex-start',
            '& .MuiAlert-icon': { mt: 0.25 },
            '& .MuiAlert-message': { width: '100%', minWidth: 0 }
          }}
        >
          <AlertTitle sx={{ fontWeight: 600, typography: 'body2', mb: 0.5 }}>
            {GH_ROADMAP.degradedTitle(data.degradedCount)}
          </AlertTitle>
          <Typography variant='body2' sx={{ color: 'warning.dark', lineHeight: 1.5 }}>
            {GH_ROADMAP.degradedBody}
          </Typography>
        </Alert>
      ) : null}

      <RoadmapSummary counts={summaryCounts} />

      <RoadmapFilters
        kind={kind}
        onKindChange={setKind}
        kindCounts={kindCounts}
        search={search}
        onSearchChange={setSearch}
        priority={priority}
        onPriorityChange={setPriority}
        domain={domain}
        onDomainChange={setDomain}
        health={health}
        onHealthChange={setHealth}
        domains={data.domains}
        anyFilter={anyFilter}
        onClear={clearFilters}
      />

      {/* Board + inspector — split en desktop, board + drawer en compact */}
      {isCompact ? (
        <>
          {/* En compact el board scrollea horizontal dentro de su contenedor; el
              wrapper con min-width:0 + overflow-x:clip impide que empuje la página
              (red de seguridad de contención canónica TASK-742/ISSUE-015). */}
          <Box sx={{ minWidth: 0, maxWidth: '100%', overflowX: 'clip' }}>{primaryContent}</Box>
          <Drawer
            anchor='right'
            open={Boolean(selected)}
            onClose={handleClose}
            slotProps={{
              paper: {
                sx: {
                  width: { xs: '100vw', sm: 420 },
                  maxWidth: '100vw',
                  overflowX: 'hidden',
                  borderTopLeftRadius: { xs: 0, sm: theme => `${theme.shape.customBorderRadius.lg}px` },
                  borderBottomLeftRadius: { xs: 0, sm: theme => `${theme.shape.customBorderRadius.lg}px` }
                }
              }
            }}
          >
            {inspectorContent}
          </Drawer>
        </>
      ) : (
        <CompositionShell
          composition='split'
          fluidity='baseline'
          instanceId='roadmap-cockpit'
          asideLabel={GH_ROADMAP.inspectorAria}
          regions={{ primary: primaryContent, aside: inspectorContent }}
        />
      )}

      {/* "Abrir task" — drawer ancho con el Markdown renderizado (read-only) */}
      <RoadmapTaskDrawer item={openTaskItem} onClose={handleCloseTask} onCopy={handleCopy} />

      <Snackbar
        open={toastOpen}
        autoHideDuration={1800}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity='success' variant='filled' icon={<i className='tabler-check' />} onClose={() => setToastOpen(false)}>
          {GH_ROADMAP.copiedToast}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default RoadmapCockpitView
