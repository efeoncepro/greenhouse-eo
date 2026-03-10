'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { ExecutiveCardShell } from '@/components/greenhouse'
import type { GreenhouseDashboardData, GreenhouseDashboardTool } from '@/types/greenhouse-dashboard'

type ToolingSectionProps = {
  data: GreenhouseDashboardData
}

type ToolGroupProps = {
  title: string
  description: string
  tools: GreenhouseDashboardTool[]
}

const ToolGroup = ({ title, description, tools }: ToolGroupProps) => (
  <ExecutiveCardShell title={title} subtitle={description}>
    <Stack spacing={2}>
      {tools.map(tool => (
        <Box
          key={tool.key}
          sx={{
            p: 3,
            borderRadius: 3,
            border: theme => `1px solid ${theme.palette.divider}`,
            display: 'flex',
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: 2,
            flexDirection: { xs: 'column', md: 'row' }
          }}
        >
          <Stack spacing={0.5}>
            <Typography variant='h6'>{tool.label}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {tool.category}
            </Typography>
          </Stack>
          <Chip
            variant={tool.source === 'override' ? 'tonal' : 'outlined'}
            color={tool.source === 'override' ? 'warning' : 'info'}
            label={tool.source === 'override' ? 'Definido para la cuenta' : 'Default por modulo'}
          />
        </Box>
      ))}
    </Stack>
  </ExecutiveCardShell>
)

const ToolingSection = ({ data }: ToolingSectionProps) => {
  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' } }}>
      <ToolGroup
        title='Herramientas tecnologicas'
        description='Inventario reusable por cuenta derivado desde modulos activos y complementado con overrides controlados.'
        tools={data.tooling.technologyTools}
      />
      <ToolGroup
        title='Herramientas AI'
        description='Capa inicial de IA aplicada al servicio para hacer visible el stack operativo del cliente.'
        tools={data.tooling.aiTools}
      />
    </Box>
  )
}

export default ToolingSection
