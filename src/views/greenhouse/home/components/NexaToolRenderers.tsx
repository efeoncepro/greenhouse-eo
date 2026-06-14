'use client'

import { memo } from 'react'

import type { ToolCallMessagePartProps } from '@assistant-ui/react'
import { useAssistantToolUI } from '@assistant-ui/react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { NexaEvidencePanel } from '@/components/greenhouse/primitives'
import type { NexaToolResult } from '@/lib/nexa/nexa-contract'
import { nexaToolResultToConversationalEvidence } from '@/lib/nexa/conversational-evidence'

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
    sx={theme => ({
      mt: 1.25,
      border: 1,
      borderColor: 'divider',
      borderRadius: `${theme.shape.customBorderRadius.md}px`,
      bgcolor: 'action.hover',
      px: 2,
      py: 1.5
    })}
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

    {!result.available ? (
      <Alert severity='warning' sx={{ mb: 1.25 }}>
        {result.summary}
      </Alert>
    ) : null}

    {result.available ? (
      <>
        <Typography variant='body2' sx={{ color: 'text.primary', mb: result.metrics.length > 0 ? 1.25 : 0 }}>
          {result.summary}
        </Typography>

        {result.metrics.length > 0 ? (
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
        ) : null}
      </>
    ) : null}
  </Box>
)

export const NexaKnowledgeToolTraceCard = ({
  result,
  feedbackEnabled = true
}: {
  result: NexaToolResult
  feedbackEnabled?: boolean
}) => {
  const evidence = nexaToolResultToConversationalEvidence(result)

  if (!evidence) {
    return <ToolCard toolName='search_knowledge' result={result} />
  }

  return <NexaEvidencePanel evidence={evidence} variant='traceCard' feedbackEnabled={feedbackEnabled} />
}

/* ── Renderers ESTABLES por tool (TASK-1113) ──
   `useAssistantToolUI` re-registra la tool UI cuando cambia la identidad de `render`
   (dep `tool.render` del effect). Si el render se recrea en cada render del componente,
   durante el revelado del texto (que re-renderiza el árbol por tick) el card de la tool
   se desmonta+re-monta en cada tick → parpadeo visible justo cuando la respuesta usa
   una tool. Por eso cada renderer vive a nivel de módulo (identidad estable) + memo, y
   el effect de registro corre UNA sola vez por montaje. */
const createToolRenderer = (toolName: string) => {
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

  return memo(Renderer)
}

const CheckPayrollRenderer = createToolRenderer('check_payroll')
const GetOtdRenderer = createToolRenderer('get_otd')
const CheckEmailsRenderer = createToolRenderer('check_emails')
const GetCapacityRenderer = createToolRenderer('get_capacity')
const PendingInvoicesRenderer = createToolRenderer('pending_invoices')

const SearchKnowledgeRenderer = memo(
  ({ result }: ToolCallMessagePartProps<Record<string, unknown>, NexaToolResult>) => {
    if (!result) {
      return (
        <Alert severity='info' sx={{ mt: 1.25 }}>
          Consultando Knowledge...
        </Alert>
      )
    }

    return <NexaKnowledgeToolTraceCard result={result} />
  }
)

SearchKnowledgeRenderer.displayName = 'NexaToolRenderer(search_knowledge)'

const NexaToolRenderers = () => {
  useAssistantToolUI({ toolName: 'check_payroll', render: CheckPayrollRenderer })
  useAssistantToolUI({ toolName: 'get_otd', render: GetOtdRenderer })
  useAssistantToolUI({ toolName: 'check_emails', render: CheckEmailsRenderer })
  useAssistantToolUI({ toolName: 'get_capacity', render: GetCapacityRenderer })
  useAssistantToolUI({ toolName: 'pending_invoices', render: PendingInvoicesRenderer })
  useAssistantToolUI({ toolName: 'search_knowledge', render: SearchKnowledgeRenderer })

  return null
}

export default NexaToolRenderers
