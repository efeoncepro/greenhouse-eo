'use client'

// ─── TASK-950 — Nexa Insights list page canonical view ──────────────────────
//
// PLACEHOLDER SLICE 2 — el render canonical (3 branches TASK-946 framework)
// se implementa en Slice 3 post `greenhouse-ux` + `state-design` +
// `greenhouse-ux-writing` skills audit + UX Specification canonical.
//
// El placeholder garantiza:
//   - tsc + lint + build verde end-to-end con el page Slice 2.
//   - Contract types declarados para que el page importe sin errores.
//   - Cero render productivo hasta Slice 3 (placeholder Typography).

import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { NexaInsightListRenderableResult } from '@/lib/ico-engine/ai/nexa-insight-list-reader'

export interface NexaInsightListViewProps {
  result: NexaInsightListRenderableResult
  homeHref: string
}

const NexaInsightListView = ({ result }: NexaInsightListViewProps) => {
  return (
    <Stack spacing={4} sx={{ py: 4 }} component='main' role='main'>
      <Typography variant='h4'>Nexa Insights</Typography>
      <Typography variant='caption' color='text.secondary'>
        Estado: {result.state}
      </Typography>
    </Stack>
  )
}

export default NexaInsightListView
