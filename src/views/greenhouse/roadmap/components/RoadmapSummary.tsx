'use client'

/**
 * TASK-1153 — Summary band: 7 KPI tiles del backlog (grid responsivo auto-fit).
 * Cada número va con su label + contexto (regla "nunca un número sin contexto").
 */
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import { GH_ROADMAP } from '@/lib/copy/roadmap'

import { SUMMARY_TILES, toneSx } from '../cockpit-tokens'

export interface RoadmapSummaryCounts {
  total: number
  programs: number
  ready: number
  blocked: number
  issues: number
  grooming: number
  progress: number
}

const RoadmapSummary = ({ counts }: { counts: RoadmapSummaryCounts }) => (
  <Box
    data-capture='roadmap-summary'
    sx={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: 3,
      '& > *': { minWidth: 0 }
    }}
  >
    {SUMMARY_TILES.map(tile => {
      const copy = GH_ROADMAP.tiles[tile.key]

      return (
        <Box
          key={tile.key}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            p: 3.5,
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: theme => `${theme.shape.customBorderRadius.md}px`
          }}
        >
          <Box
            sx={[
              toneSx(tile.tone),
              {
                width: 30,
                height: 30,
                borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }
            ]}
          >
            <i className={tile.icon} aria-hidden='true' style={{ fontSize: 16, lineHeight: 0 }} />
          </Box>
          <Typography
            component='span'
            variant='kpiValue'
            sx={{ lineHeight: 1, fontFeatureSettings: "'tnum' 1", color: 'text.primary' }}
          >
            {counts[tile.key]}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <Typography component='span' variant='body2' sx={{ fontWeight: 600, color: 'text.primary' }}>
              {copy.label}
            </Typography>
            <Typography component='span' variant='caption' sx={{ color: 'text.secondary' }}>
              {copy.context}
            </Typography>
          </Box>
        </Box>
      )
    })}
  </Box>
)

export default RoadmapSummary
