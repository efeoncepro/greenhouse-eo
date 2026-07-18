'use client'

import { useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import EmptyState from '@/components/greenhouse/EmptyState'
import { GreenhouseBreadcrumbs } from '@/components/greenhouse/primitives'
import { GH_GROWTH_AEO_OPERATOR } from '@/lib/copy/growth'
import { formatNumber } from '@/lib/format/number'
import AeoOperatorRunPicker, { type AeoRunTargetVM } from './AeoOperatorRunPicker'
import OrgLogoAvatar from './OrgLogoAvatar'

/**
 * TASK-1276 Slice 3 + polish 2026-07-17 — Cockpit cross-cliente del programa AEO (nodo S8).
 *
 * Diseño aprobado: mockup Claude Design "AEO Operator View" (Región 1). Fidelidad aplicada tras el
 * feedback del operador en producción: logos reales de las orgs (resolver canónico server-side),
 * columnas del mockup (Cliente+publicId · Tier · Score+barra · Tendencia sparkline · Plan AEO ·
 * chevron), filtros segmentados en contenedor, y 4 KPIs con data real (clientes, score promedio,
 * focos en curso, runs del mes con atribución a ventas). Honest siempre: score null = "Sin
 * medición"; sin histórico = "—"; plan sin filas = "Sin seguimiento aún".
 */

const O = GH_GROWTH_AEO_OPERATOR

export interface AeoCockpitRowVM {
  organizationId: string
  organizationName: string
  organizationPublicId: string | null
  logoUrl: string | null
  tierLabel: string
  /** null = sin run con score (degradación honesta — nunca 0). */
  latestScore: number | null
  /** Últimos scores (asc) para el sparkline; [] o 1 punto = sin tendencia. */
  scoreHistory: number[]
  planInProgress: number
  planDone: number
  planTracked: number
  /** Fecha formateada del último run reportable; null = sin runs. */
  lastRunLabel: string | null
}

export interface AeoCockpitKpisVM {
  clientsWithAeo: number
  avgScore: number | null
  planInProgressTotal: number
  runsThisMonth: number
  salesRunsThisMonth: number
}

export interface AeoOperatorCockpitViewProps {
  rows: AeoCockpitRowVM[]
  kpis: AeoCockpitKpisVM
  /** Targets de cross-sell (clientes sin AEO = expansión; prospectos HubSpot = new business). */
  targets: AeoRunTargetVM[]
}

// Filtros del cockpit (pills del mockup): todos / por grupo.
type CockpitFilter = 'all' | 'aeo' | 'expansion' | 'new_business'

// Semáforo del score (espejo del severity mapping del report): >=70 óptimo, >=50 atención, <50 crítico.
const scoreTone = (score: number): 'success' | 'warning' | 'error' =>
  score >= 70 ? 'success' : score >= 50 ? 'warning' : 'error'

const ScoreCell = ({ score }: { score: number | null }) => {
  if (score === null) {
    return (
      <Typography variant='body2' color='text.secondary'>
        {O.cockpit.scoreNoData}
      </Typography>
    )
  }

  const tone = scoreTone(score)

  return (
    <Stack direction='row' spacing={3} alignItems='center' sx={{ minWidth: 140 }}>
      <Typography variant='monoId' sx={{ minWidth: 30, fontWeight: 700, color: `${tone}.main` }}>
        {formatNumber(score)}
      </Typography>
      <Box
        aria-hidden='true'
        sx={theme => ({
          flex: 1,
          height: 6,
          borderRadius: '9999px',
          bgcolor: theme.palette.action.hover,
          overflow: 'hidden'
        })}
      >
        <Box
          sx={theme => ({
            width: `${Math.max(0, Math.min(100, score))}%`,
            height: '100%',
            borderRadius: 'inherit',
            bgcolor: theme.palette[tone].main
          })}
        />
      </Box>
    </Stack>
  )
}

// Sparkline honesto (mockup): línea de los últimos scores; <2 puntos = "—" (sin tendencia fabricada).
const ScoreSparkline = ({ history, name, score }: { history: number[]; name: string; score: number | null }) => {
  const theme = useTheme()

  if (history.length < 2) {
    return (
      <Typography variant='body2' color='text.disabled'>
        —
      </Typography>
    )
  }

  const tone = score === null ? 'warning' : scoreTone(score)
  const color = theme.palette[tone].main
  const w = 70
  const h = 22
  const max = 100
  const lo = Math.max(0, Math.min(...history) - 10)
  const x = (i: number) => (i / (history.length - 1)) * w
  const y = (v: number) => h - ((v - lo) / (max - lo)) * h
  const points = history.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const last = history[history.length - 1]

  return (
    <Box role='img' aria-label={`${O.cockpit.trendAria(name)}: ${history.map(v => formatNumber(v)).join(' → ')}`}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
        <polyline
          points={points}
          fill='none'
          stroke={color}
          strokeWidth={2}
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <circle cx={x(history.length - 1)} cy={y(last)} r={2.5} fill={color} />
      </svg>
    </Box>
  )
}

// Plan AEO honesto: conteos reales del write de TASK-1275 (nunca un % contra un total desconocido).
const PlanCell = ({ row }: { row: AeoCockpitRowVM }) => {
  if (row.planTracked === 0) {
    return (
      <Typography variant='body2' color='text.disabled'>
        {O.cockpit.planUntracked}
      </Typography>
    )
  }

  const parts: string[] = []

  if (row.planInProgress > 0) parts.push(O.cockpit.planInProgressLabel(row.planInProgress))
  if (row.planDone > 0) parts.push(O.cockpit.planDoneLabel(row.planDone))
  if (parts.length === 0) parts.push(O.cockpit.planUntracked)

  return (
    <Typography variant='body2' color='text.secondary' sx={{ whiteSpace: 'nowrap' }}>
      {parts.join(' · ')}
    </Typography>
  )
}

const AeoOperatorCockpitView = ({ rows, kpis, targets }: AeoOperatorCockpitViewProps) => {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<CockpitFilter>('all')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerPreselectedId, setPickerPreselectedId] = useState<string | null>(null)

  const openPicker = (preselectedId: string | null) => {
    setPickerPreselectedId(preselectedId)
    setPickerOpen(true)
  }

  // Targets del picker: los clientes con AEO también son target válido de un run operador.
  const pickerTargets = useMemo<AeoRunTargetVM[]>(
    () => [
      ...rows.map(r => ({
        organizationId: r.organizationId,
        organizationName: r.organizationName,
        motion: 'aeo' as const,
        subtitle: r.tierLabel,
        logoUrl: r.logoUrl
      })),
      ...targets
    ],
    [rows, targets]
  )

  const q = query.trim().toLowerCase()

  const filtered = useMemo(() => {
    const base = filter === 'all' || filter === 'aeo' ? rows : []

    if (!q) return base

    return base.filter(r => r.organizationName.toLowerCase().includes(q))
  }, [rows, q, filter])

  // Los targets de cross-sell NO inundan la vista default (pueden ser cientos de orgs sincronizadas):
  // aparecen solo bajo su pill (Expansión / Prospecto) o cuando hay búsqueda activa en "Todos".
  const filteredTargets = useMemo(() => {
    if (filter === 'all' && !q) return []

    const base = filter === 'all' ? targets : filter === 'aeo' ? [] : targets.filter(t => t.motion === filter)

    if (!q) return base

    return base.filter(t => t.organizationName.toLowerCase().includes(q))
  }, [targets, q, filter])

  const filterPills: Array<{ key: CockpitFilter; label: string }> = [
    { key: 'all', label: O.cockpit.filterAll },
    { key: 'aeo', label: O.picker.groupAeo },
    { key: 'expansion', label: O.picker.groupExpansion },
    { key: 'new_business', label: O.picker.groupProspects }
  ]

  const openDetail = (organizationId: string) => router.push(`/growth/aeo/${organizationId}`)

  const kpiCards = [
    {
      title: O.cockpit.kpiClients,
      stats: formatNumber(kpis.clientsWithAeo),
      avatarIcon: 'tabler-building-community',
      avatarColor: 'primary' as const,
      subtitle: O.cockpit.kpiClientsSub
    },
    {
      title: O.cockpit.kpiAvgScore,
      stats: kpis.avgScore === null ? O.cockpit.scoreNoData : formatNumber(kpis.avgScore),
      avatarIcon: 'tabler-gauge',
      avatarColor: 'info' as const,
      subtitle: O.cockpit.kpiAvgScoreSub
    },
    {
      title: O.cockpit.kpiPlanInProgress,
      stats: formatNumber(kpis.planInProgressTotal),
      avatarIcon: 'tabler-list-check',
      avatarColor: 'success' as const,
      subtitle: O.cockpit.kpiPlanInProgressSub
    },
    {
      title: O.cockpit.kpiRunsMonth,
      stats: formatNumber(kpis.runsThisMonth),
      avatarIcon: 'tabler-player-play',
      avatarColor: 'warning' as const,
      subtitle: O.cockpit.kpiRunsMonthSub(kpis.salesRunsThisMonth)
    }
  ]

  return (
    <Stack spacing={6} sx={{ p: { xs: 4, md: 6 }, minWidth: 0 }} data-capture='aeo-operator-cockpit'>
      <Stack spacing={3}>
        <GreenhouseBreadcrumbs
          items={[
            { label: O.page.breadcrumbRoot, href: '/home' },
            { label: O.page.breadcrumbGrowth },
            { label: O.page.breadcrumbLeaf }
          ]}
        />
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent='space-between'
        >
          <Stack spacing={1}>
            <Typography variant='surfaceHeroTitle' component='h1'>
              {O.page.cockpitTitle}
            </Typography>
            <Typography variant='body1' color='text.secondary' sx={{ maxWidth: '62ch' }}>
              {O.page.cockpitSubtitle}
            </Typography>
          </Stack>
          <Button
            variant='contained'
            data-capture='aeo-run-header-cta'
            startIcon={<i className='tabler-player-play-filled' />}
            onClick={() => openPicker(null)}
            sx={{ flexShrink: 0 }}
          >
            {O.cockpit.headerRunCta}
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={6}>
        {kpiCards.map(card => (
          <Grid key={card.title} size={{ xs: 12, sm: 6, lg: 3 }}>
            <HorizontalWithSubtitle {...card} />
          </Grid>
        ))}
      </Grid>

      <Card elevation={0} sx={theme => ({ border: `1px solid ${theme.palette.divider}` })}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            spacing={3}
            alignItems={{ xs: 'flex-start', lg: 'center' }}
            justifyContent='space-between'
          >
            <Stack spacing={0.5}>
              <Typography variant='h5' component='h2'>
                {O.cockpit.tableTitle}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {O.cockpit.tableSubtitle}
              </Typography>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', sm: 'center' }}>
              {/* Segmented control del mockup: contenedor neutro, pill activa resaltada */}
              <Box
                role='group'
                aria-label={O.cockpit.tableTitle}
                sx={theme => ({
                  display: 'flex',
                  gap: 1,
                  p: 1,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: theme.palette.action.hover,
                  flexWrap: 'wrap'
                })}
              >
                {filterPills.map(pill => {
                  const active = filter === pill.key

                  return (
                    <Button
                      key={pill.key}
                      size='small'
                      disableElevation
                      onClick={() => setFilter(pill.key)}
                      aria-pressed={active}
                      sx={theme => ({
                        px: 3,
                        py: 1,
                        minWidth: 0,
                        borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                        fontWeight: 600,
                        color: active ? theme.palette.primary.contrastText : theme.palette.text.secondary,
                        backgroundColor: active ? theme.palette.primary.main : 'transparent',
                        '&:hover': {
                          backgroundColor: active ? theme.palette.primary.dark : theme.palette.action.selected
                        }
                      })}
                    >
                      {pill.label}
                    </Button>
                  )
                })}
              </Box>
              <CustomTextField
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={O.cockpit.searchPlaceholder}
                slotProps={{ input: { startAdornment: <i className='tabler-search' style={{ marginInlineEnd: 8 }} /> } }}
              />
            </Stack>
          </Stack>
        </CardContent>
        <Divider />
        {rows.length === 0 ? (
          <CardContent>
            <EmptyState icon='tabler-radar-2' title={O.cockpit.emptyTitle} description={O.cockpit.emptyBody} />
          </CardContent>
        ) : (
          <TableContainer>
            <Table size='small' aria-label={O.cockpit.tableTitle}>
              <TableHead>
                <TableRow>
                  <TableCell>{O.cockpit.colClient}</TableCell>
                  <TableCell>{O.cockpit.colTier}</TableCell>
                  <TableCell sx={{ minWidth: 180 }}>{O.cockpit.colScore}</TableCell>
                  <TableCell>{O.cockpit.colTrend}</TableCell>
                  <TableCell>{O.cockpit.colPlan}</TableCell>
                  <TableCell align='right' />
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(row => (
                  <TableRow
                    key={row.organizationId}
                    hover
                    tabIndex={0}
                    role='link'
                    aria-label={`${O.cockpit.openDetailAria}: ${row.organizationName}`}
                    onClick={() => openDetail(row.organizationId)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openDetail(row.organizationId)
                      }
                    }}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Stack direction='row' spacing={3} alignItems='center'>
                        <OrgLogoAvatar name={row.organizationName} logoUrl={row.logoUrl} size={34} />
                        <Stack sx={{ minWidth: 0 }}>
                          <Typography variant='body2' sx={{ fontWeight: 600 }} color='text.primary' noWrap>
                            {row.organizationName}
                          </Typography>
                          {row.organizationPublicId ? (
                            <Typography variant='monoId' color='text.disabled'>
                              {row.organizationPublicId}
                            </Typography>
                          ) : null}
                        </Stack>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip size='small' variant='tonal' color='primary' label={row.tierLabel} />
                    </TableCell>
                    <TableCell>
                      <ScoreCell score={row.latestScore} />
                    </TableCell>
                    <TableCell>
                      <ScoreSparkline history={row.scoreHistory} name={row.organizationName} score={row.latestScore} />
                    </TableCell>
                    <TableCell>
                      <PlanCell row={row} />
                    </TableCell>
                    <TableCell align='right'>
                      <i className='tabler-chevron-right' aria-hidden='true' />
                    </TableCell>
                  </TableRow>
                ))}
                {/* Targets de cross-sell (sin AEO): motion hint + CTA "Correr AEO" → picker preseleccionado */}
                {filteredTargets.map(target => (
                  <TableRow
                    key={target.organizationId}
                    hover
                    tabIndex={0}
                    role='button'
                    aria-label={`${O.cockpit.runCtaAria}: ${target.organizationName}`}
                    onClick={() => openPicker(target.organizationId)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openPicker(target.organizationId)
                      }
                    }}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Stack direction='row' spacing={3} alignItems='center'>
                        <OrgLogoAvatar
                          name={target.organizationName}
                          logoUrl={target.logoUrl}
                          size={34}
                          color={target.motion === 'expansion' ? 'info' : 'warning'}
                        />
                        <Typography variant='body2' sx={{ fontWeight: 600 }} color='text.primary'>
                          {target.organizationName}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        variant='outlined'
                        icon={<i className='tabler-circle-dashed' />}
                        label={O.cockpit.noAeoLabel}
                      />
                    </TableCell>
                    <TableCell colSpan={2}>
                      <Typography variant='body2' color='text.secondary'>
                        {target.motion === 'expansion' ? O.cockpit.motionExpansionHint : O.cockpit.motionProspectHint}
                      </Typography>
                    </TableCell>
                    <TableCell colSpan={2} align='right'>
                      <Chip
                        size='small'
                        variant='tonal'
                        color='primary'
                        icon={<i className='tabler-player-play-filled' />}
                        label={O.cockpit.runCta}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && filteredTargets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant='body2' color='text.secondary' sx={{ py: 4, textAlign: 'center' }}>
                        {O.cockpit.searchEmpty(query)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <AeoOperatorRunPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        targets={pickerTargets}
        preselectedId={pickerPreselectedId}
      />
    </Stack>
  )
}

export default AeoOperatorCockpitView
