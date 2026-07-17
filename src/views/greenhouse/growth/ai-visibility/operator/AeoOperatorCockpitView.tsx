'use client'

import { useMemo, useState } from 'react'

import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
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

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTextField from '@core/components/mui/TextField'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'
import EmptyState from '@/components/greenhouse/EmptyState'
import { GreenhouseBreadcrumbs } from '@/components/greenhouse/primitives'
import { GH_GROWTH_AEO_OPERATOR } from '@/lib/copy/growth'
import { formatNumber } from '@/lib/format/number'

/**
 * TASK-1276 Slice 3 — Cockpit cross-cliente del programa AEO (nodo S8, ruta /growth/aeo).
 *
 * Diseño aprobado: mockup Claude Design "AEO Operator View" (KPIs + tabla de clientes con score,
 * tier y último run; fila → detalle). Data = `readOperatorCrossOrgAeoScores` (TASK-1287, honest
 * degradation: score null = "Sin medición", NUNCA 0). Las filas de targets sin AEO + prospectos
 * (cross-sell) llegan con el subject picker (Slice 5) — este cockpit lista orgs CON módulo AEO.
 */

const O = GH_GROWTH_AEO_OPERATOR

export interface AeoCockpitRowVM {
  organizationId: string
  organizationName: string
  tierLabel: string
  /** null = sin run con score (degradación honesta — nunca 0). */
  latestScore: number | null
  /** Fecha formateada del último run reportable; null = sin runs. */
  lastRunLabel: string | null
}

export interface AeoOperatorCockpitViewProps {
  rows: AeoCockpitRowVM[]
}

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

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
      <Typography variant='monoId' sx={{ minWidth: 28, fontWeight: 700, color: `${tone}.main` }}>
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

const AeoOperatorCockpitView = ({ rows }: AeoOperatorCockpitViewProps) => {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    if (!q) return rows

    return rows.filter(r => r.organizationName.toLowerCase().includes(q))
  }, [rows, query])

  const scored = rows.filter(r => r.latestScore !== null)

  const avgScore =
    scored.length > 0 ? Math.round(scored.reduce((sum, r) => sum + (r.latestScore ?? 0), 0) / scored.length) : null

  const openDetail = (organizationId: string) => router.push(`/growth/aeo/${organizationId}`)

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
        <Stack spacing={1}>
          <Typography variant='surfaceHeroTitle' component='h1'>
            {O.page.cockpitTitle}
          </Typography>
          <Typography variant='body1' color='text.secondary' sx={{ maxWidth: '62ch' }}>
            {O.page.cockpitSubtitle}
          </Typography>
        </Stack>
      </Stack>

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <HorizontalWithSubtitle
            title={O.cockpit.kpiClients}
            stats={formatNumber(rows.length)}
            avatarIcon='tabler-building-community'
            avatarColor='primary'
            subtitle={O.cockpit.kpiClientsSub}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <HorizontalWithSubtitle
            title={O.cockpit.kpiAvgScore}
            stats={avgScore === null ? O.cockpit.scoreNoData : formatNumber(avgScore)}
            avatarIcon='tabler-gauge'
            avatarColor='info'
            subtitle={O.cockpit.kpiAvgScoreSub}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <HorizontalWithSubtitle
            title={O.cockpit.kpiWithoutScore}
            stats={formatNumber(rows.length - scored.length)}
            avatarIcon='tabler-radar-2'
            avatarColor='warning'
            subtitle={O.cockpit.kpiWithoutScoreSub}
          />
        </Grid>
      </Grid>

      <Card elevation={0} sx={theme => ({ border: `1px solid ${theme.palette.divider}` })}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={3}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
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
            <CustomTextField
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={O.cockpit.searchPlaceholder}
              slotProps={{ input: { startAdornment: <i className='tabler-search' style={{ marginInlineEnd: 8 }} /> } }}
            />
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
                  <TableCell>{O.cockpit.colLastRun}</TableCell>
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
                        <CustomAvatar skin='light' color='primary' variant='rounded' size={34}>
                          {initialsOf(row.organizationName)}
                        </CustomAvatar>
                        <Typography variant='body2' sx={{ fontWeight: 600 }} color='text.primary'>
                          {row.organizationName}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip size='small' variant='tonal' color='primary' label={row.tierLabel} />
                    </TableCell>
                    <TableCell>
                      <ScoreCell score={row.latestScore} />
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>
                        {row.lastRunLabel ?? O.cockpit.lastRunNever}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <i className='tabler-chevron-right' aria-hidden='true' />
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
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
    </Stack>
  )
}

export default AeoOperatorCockpitView
