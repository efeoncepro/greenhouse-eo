'use client'

import { useMemo } from 'react'

import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'

import type { HomeBlockEnvelope, HomeSlotKey, HomeSnapshotV1, HomeUiDensity } from '@/lib/home/contract'

import { CommandPalette } from '@/components/greenhouse/CommandPalette'
import { HomeBlockRenderer } from './HomeBlockRenderer'

interface HomeShellV2Props {
  snapshot: HomeSnapshotV1
}

const groupBySlot = (blocks: HomeBlockEnvelope[]): Record<HomeSlotKey, HomeBlockEnvelope[]> => {
  return blocks.reduce(
    (acc, block) => {
      acc[block.slot].push(block)

      return acc
    },
    { hero: [], pulse: [], main: [], aside: [], footer: [] } as Record<HomeSlotKey, HomeBlockEnvelope[]>
  )
}

const densitySpacing = (density: HomeUiDensity): number => {
  switch (density) {
    case 'compact':
      return 4
    case 'comfortable':
      return 6
    case 'cozy':
    default:
      return 5
  }
}

/**
 * Smart Home v2 shell — Linear/Vercel-style 8/4 product UI grid.
 *
 * Hero (full-width) → Pulse Strip (full-width 4 KPI) → Main (8) + Aside (4)
 * for the bottom block stack. NO bento grid (bento is marketing).
 */
export const HomeShellV2 = ({ snapshot }: HomeShellV2Props) => {
  const grouped = useMemo(() => groupBySlot(snapshot.blocks), [snapshot.blocks])

  const spacing = densitySpacing(snapshot.density)

  const heroBlocks = grouped.hero
  const pulseBlocks = grouped.pulse
  const mainBlocks = grouped.main.filter(block => block.outcome !== 'hidden')
  const asideBlocks = grouped.aside.filter(block => block.outcome !== 'hidden')

  return (
    <Stack spacing={spacing} component='main'>
      {/* Top utility row: command palette */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <CommandPalette triggerLabel='Buscar ⌘K' />
      </Box>

      {/* Hero */}
      {heroBlocks.length > 0 ? (
        <Stack spacing={spacing}>
          {heroBlocks.map(envelope => (
            <HomeBlockRenderer key={envelope.blockId} envelope={envelope} />
          ))}
        </Stack>
      ) : null}

      {/* Pulse Strip — full width row */}
      {pulseBlocks.length > 0 ? (
        <Stack spacing={spacing}>
          {pulseBlocks.map(envelope => (
            <HomeBlockRenderer key={envelope.blockId} envelope={envelope} />
          ))}
        </Stack>
      ) : null}

      {/* Main + Aside split */}
      {mainBlocks.length > 0 || asideBlocks.length > 0 ? (
        <Grid container spacing={spacing}>
          {mainBlocks.length > 0 ? (
            <Grid size={{ xs: 12, lg: asideBlocks.length > 0 ? 8 : 12 }}>
              <Stack spacing={spacing}>
                {mainBlocks.map(envelope => (
                  <HomeBlockRenderer key={envelope.blockId} envelope={envelope} />
                ))}
              </Stack>
            </Grid>
          ) : null}
          {asideBlocks.length > 0 ? (
            <Grid size={{ xs: 12, lg: 4 }}>
              <Stack spacing={spacing}>
                {asideBlocks.map(envelope => (
                  <HomeBlockRenderer key={envelope.blockId} envelope={envelope} />
                ))}
              </Stack>
            </Grid>
          ) : null}
        </Grid>
      ) : null}
    </Stack>
  )
}

export default HomeShellV2
