'use client'

import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import { BrandLogo, ExecutiveCardShell } from '@/components/greenhouse'
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
    <Stack spacing={2.5}>
      {tools.map(tool => (
        <Box
          key={tool.key}
          sx={{
            p: 2.5,
            borderRadius: 3,
            border: theme => `1px solid ${theme.palette.divider}`,
            display: 'flex',
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: 2,
            flexDirection: { xs: 'column', md: 'row' }
          }}
        >
          <Stack direction='row' spacing={2} alignItems='center'>
            <BrandLogo brand={tool.label} />
            <Stack spacing={0.5}>
              <Typography variant='h6'>{tool.label}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {tool.category}
              </Typography>
            </Stack>
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
  const theme = useTheme()

  return (
    <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: 'repeat(auto-fit, minmax(320px, 1fr))' } }}>
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
      <Box
        sx={{
          gridColumn: { xs: 'auto', xl: '1 / -1' },
          p: 3,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.info.main, 0.14)}`,
          backgroundColor: alpha(theme.palette.info.main, 0.04)
        }}
      >
        <Typography variant='body2' color='text.secondary'>
          El stack visible mezcla defaults por modulo con overrides por cuenta. La meta es que esta capa evolucione a
          tooling operativo real por proyecto y por equipo, no solo a inventario declarativo.
        </Typography>
      </Box>
    </Box>
  )
}

export default ToolingSection
