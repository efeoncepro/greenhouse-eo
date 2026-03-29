'use client'

import type { ToolCallMessagePartProps } from '@assistant-ui/react'
import { useAssistantToolUI } from '@assistant-ui/react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { NexaToolResult } from '@/lib/nexa/nexa-contract'

const toneToColor = (tone?: string): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  switch (tone) {
    case 'success':
    case 'warning':
    case 'error':
    case 'info':
      return tone
    default:
      return 'default'
  }
}

const ToolCard = ({ toolName, result }: { toolName: string; result: NexaToolResult }) => (
  <Box
    sx={{
      mt: 1.25,
      border: 1,
      borderColor: 'divider',
      borderRadius: 3,
      bgcolor: 'action.hover',
      px: 2,
      py: 1.5
    }}
  >
    <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 1 }}>
      <Chip
        size='small'
        label={toolName}
        color={result.available ? 'primary' : 'default'}
        variant={result.available ? 'filled' : 'outlined'}
      />
      <Typography variant='caption' color='text.secondary'>
        {result.scopeLabel}
      </Typography>
    </Stack>

    {!result.available && (
      <Alert severity='warning' sx={{ mb: 1.25 }}>
        {result.summary}
      </Alert>
    )}

    {result.available && (
      <>
        <Typography variant='body2' sx={{ color: 'text.primary', mb: result.metrics.length > 0 ? 1.25 : 0 }}>
          {result.summary}
        </Typography>

        {result.metrics.length > 0 && (
          <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap'>
            {result.metrics.map(metric => (
              <Chip
                key={`${toolName}-${metric.label}`}
                size='small'
                variant='outlined'
                color={toneToColor(metric.tone)}
                label={`${metric.label}: ${metric.value}`}
              />
            ))}
          </Stack>
        )}
      </>
    )}
  </Box>
)

const createRenderer = (toolName: string) => {
  const Renderer = ({ result }: ToolCallMessagePartProps<Record<string, unknown>, NexaToolResult>) => {
    if (!result) {
      return (
        <Alert severity='info' sx={{ mt: 1.25 }}>
          Ejecutando {toolName}...
        </Alert>
      )
    }

    return <ToolCard toolName={toolName} result={result} />
  }

  Renderer.displayName = `NexaToolRenderer(${toolName})`

  return Renderer
}

const NexaToolRenderers = () => {
  useAssistantToolUI({
    toolName: 'check_payroll',
    render: createRenderer('check_payroll')
  })
  useAssistantToolUI({
    toolName: 'get_otd',
    render: createRenderer('get_otd')
  })
  useAssistantToolUI({
    toolName: 'check_emails',
    render: createRenderer('check_emails')
  })
  useAssistantToolUI({
    toolName: 'get_capacity',
    render: createRenderer('get_capacity')
  })
  useAssistantToolUI({
    toolName: 'pending_invoices',
    render: createRenderer('pending_invoices')
  })

  return null
}

export default NexaToolRenderers
