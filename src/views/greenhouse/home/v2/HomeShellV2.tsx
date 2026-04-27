'use client'

import { useMemo } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'

import type { HomeBlockEnvelope, HomeSlotKey, HomeSnapshotV1, HomeUiDensity } from '@/lib/home/contract'

import { CommandPalette } from '@/components/greenhouse/CommandPalette'
import { HomeBlockRenderer } from './HomeBlockRenderer'

interface HomeShellV2Props {
  snapshot: HomeSnapshotV1
}

const SLOT_RENDER_ORDER: HomeSlotKey[] = ['hero', 'pulse', 'main', 'aside', 'footer']

const groupBySlot = (blocks: HomeBlockEnvelope[]): Record<HomeSlotKey, HomeBlockEnvelope[]> => {
  return blocks.reduce(
    (acc, block) => {
      acc[block.slot].push(block)

      return acc
    },
    { hero: [], pulse: [], main: [], aside: [], footer: [] } as Record<HomeSlotKey, HomeBlockEnvelope[]>
  )
}

const densityScale = (density: HomeUiDensity): number => {
  switch (density) {
    case 'compact':
      return 0.92
    case 'comfortable':
      return 1.04
    case 'cozy':
    default:
      return 1
  }
}

export const HomeShellV2 = ({ snapshot }: HomeShellV2Props) => {
  const grouped = useMemo(() => groupBySlot(snapshot.blocks), [snapshot.blocks])

  const scale = densityScale(snapshot.density)

  return (
    <Box
      component='main'
      sx={{
        '--gh-density-scale': scale,
        '--gh-section-gap': `calc(${scale} * 24px)`,
        display: 'grid',
        gap: 'var(--gh-section-gap)',
        gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(280px, 1fr)' },
        gridTemplateAreas: {
          xs: `'hero' 'pulse' 'main' 'aside' 'footer'`,
          lg: `'hero hero' 'pulse pulse' 'main aside' 'footer footer'`
        },
        position: 'relative'
      }}
    >
      <Box sx={{ gridArea: 'hero', display: 'flex', justifyContent: 'flex-end', mb: -2 }}>
        <CommandPalette triggerLabel='Buscar ⌘K' />
      </Box>
      {SLOT_RENDER_ORDER.map(slot => {
        const items = grouped[slot]

        if (items.length === 0) return null

        return (
          <Stack
            key={slot}
            spacing={3}
            sx={{
              gridArea: slot,
              minWidth: 0
            }}
          >
            {items
              .sort((a, b) => (a.fetchedAtMs ?? 0) - (b.fetchedAtMs ?? 0))
              .map(envelope => (
                <HomeBlockRenderer key={envelope.blockId} envelope={envelope} />
              ))}
          </Stack>
        )
      })}
    </Box>
  )
}

export default HomeShellV2
