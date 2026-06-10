'use client'

// TASK-1075 — the diagnosis module: ICO causal chain in the COLLABORATOR lens
// (lo que controlas → tu ritmo → tu foco). Never the revenue/client lens.
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import PerfPanel from './PerfPanel'
import PerfSectionLabel from './PerfSectionLabel'
import { toneColor } from './tone'
import type { CausalNode } from '../data'

const CausalNodeBlock = ({ node }: { node: CausalNode }) => {
  const theme = useTheme()
  const accent = toneColor(theme, node.tone)

  return (
    <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
      <Stack direction='row' alignItems='center' spacing={1}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: accent }} />
        <PerfSectionLabel>{node.stage}</PerfSectionLabel>
      </Stack>
      <Typography variant='subtitle1' sx={{ fontWeight: 700, color: node.isFocus ? 'primary.main' : 'text.primary' }}>
        {node.headline}
      </Typography>
      {node.figure && (
        <Stack direction='row' alignItems='baseline' spacing={1}>
          <Typography variant='h5' sx={{ color: accent, fontVariantNumeric: 'tabular-nums' }}>
            {node.figure}
          </Typography>
          {node.figureDelta && (
            <Typography variant='caption' sx={{ color: accent }}>
              {node.figureDelta}
            </Typography>
          )}
        </Stack>
      )}
      <Typography variant='body2' sx={{ color: 'text.secondary' }}>
        {node.detail}
      </Typography>
    </Stack>
  )
}

const CausalChainPanel = ({ nodes }: { nodes: CausalNode[] }) => (
  <PerfPanel label='Cadena de impacto · causa → efecto → foco'>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'stretch' }}>
      {nodes.map((node, i) => (
        <Stack key={node.stage} direction='row' spacing={3} sx={{ flex: 1, minWidth: 0 }}>
          <CausalNodeBlock node={node} />
          {i < nodes.length - 1 && (
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', color: 'text.disabled' }}>
              <i className='tabler-arrow-right' style={{ fontSize: 22 }} aria-hidden='true' />
            </Box>
          )}
        </Stack>
      ))}
    </Stack>
  </PerfPanel>
)

export default CausalChainPanel
