'use client'

// ─── TASK-950 Slice 3 — Nexa Insights list page canonical view ─────────────
//
// Render canonical de las 3 ramas del discriminated union del reader
// `listNexaInsightsForPeriod` (TASK-946 honest degradation framework):
//
//   - state='ready'          → Grid de NexaInsightListItemCard.
//   - state='empty-positive' → EmptyState success (estado de SALUD, no error).
//   - state='degraded'       → Alert error con escalation a /admin/operations.
//
// UX spec source: greenhouse-ux + state-design + greenhouse-ux-writing skills
// audit pre-write (2026-05-29). Cero literals JSX — toda copy vive en
// `GH_NEXA` (CLAUDE.md microcopy contract canonical).
//
// Reglas duras heredadas:
//   - Sin tabs V1 (consistente con detail page TASK-947).
//   - Header back link → /home (siempre escape rápido).
//   - Banner contextual (degraded) entre subtitle y grid, NUNCA dentro de cards.
//   - Reuso EmptyState canonical Vuexy + Alert MUI nativo.
//   - Responsive: 1 col mobile, 2 col tablet, 3 col desktop.

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import EmptyState from '@/components/greenhouse/EmptyState'
import { GH_NEXA } from '@/config/greenhouse-nomenclature'

import NexaInsightListItemCard from './NexaInsightListItemCard'

import type { NexaInsightListRenderableResult } from '@/lib/ico-engine/ai/nexa-insight-list-reader'

export type { NexaInsightListRenderableResult }

export interface NexaInsightListViewProps {
  result: NexaInsightListRenderableResult
  homeHref: string
}

const OPERATIONS_HREF = '/admin/operations'

const BackLink = ({ homeHref }: { homeHref: string }) => (
  <Box>
    <Link
      href={homeHref}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'inherit', textDecoration: 'none' }}
    >
      <i className='tabler-arrow-left' style={{ fontSize: 16 }} aria-hidden='true' />
      <Typography variant='caption' color='text.secondary'>
        {GH_NEXA.detail_back_to_home}
      </Typography>
    </Link>
  </Box>
)

const NexaInsightListView = ({ result, homeHref }: NexaInsightListViewProps) => {
  // ─── Branch 1: ready (data presente) ──────────────────────────────────────
  if (result.state === 'ready') {
    return (
      <Stack spacing={6} sx={{ py: 4 }} component='main' role='main'>
        <BackLink homeHref={homeHref} />

        <Stack spacing={1.5}>
          <Typography variant='h4' component='h1'>
            {GH_NEXA.list_page_title}
          </Typography>
          <Typography variant='subtitle1' color='text.secondary'>
            {GH_NEXA.list_page_subtitle(result.periodLabel, result.totalCount)}
          </Typography>
        </Stack>

        <Grid container spacing={4}>
          {result.insights.map(insight => (
            <Grid key={insight.enrichmentId} size={{ xs: 12, sm: 6, md: 4 }}>
              <NexaInsightListItemCard insight={insight} />
            </Grid>
          ))}
        </Grid>
      </Stack>
    )
  }

  // ─── Branch 2: empty-positive (cero anomalías = salud) ────────────────────
  if (result.state === 'empty-positive') {
    return (
      <Stack spacing={6} sx={{ py: 4 }} component='main' role='main'>
        <BackLink homeHref={homeHref} />

        <Stack spacing={1.5}>
          <Typography variant='h4' component='h1'>
            {GH_NEXA.list_page_title}
          </Typography>
          <Typography variant='subtitle1' color='text.secondary'>
            {result.periodLabel}
          </Typography>
        </Stack>

        <EmptyState
          icon='tabler-circle-check'
          title={GH_NEXA.list_empty_positive_title}
          description={GH_NEXA.list_empty_positive_body}
          minHeight={320}
          action={
            <Button
              variant='contained'
              color='primary'
              component={Link}
              href={homeHref}
              startIcon={<i className='tabler-arrow-left' aria-hidden='true' />}
            >
              {GH_NEXA.list_empty_positive_cta}
            </Button>
          }
        />
      </Stack>
    )
  }

  // ─── Branch 3: degraded (honest, accionable) ──────────────────────────────
  return (
    <Stack spacing={6} sx={{ py: 4 }} component='main' role='main'>
      <BackLink homeHref={homeHref} />

      <Stack spacing={1.5}>
        <Typography variant='h4' component='h1'>
          {GH_NEXA.list_page_title}
        </Typography>
      </Stack>

      <Alert
        severity='error'
        variant='outlined'
        role='alert'
        action={
          <Button
            color='inherit'
            size='small'
            component={Link}
            href={OPERATIONS_HREF}
            endIcon={<i className='tabler-external-link' aria-hidden='true' />}
          >
            {GH_NEXA.list_degraded_cta}
          </Button>
        }
      >
        <AlertTitle>{GH_NEXA.list_degraded_title}</AlertTitle>
        {GH_NEXA.list_degraded_body}
      </Alert>
    </Stack>
  )
}

export default NexaInsightListView
