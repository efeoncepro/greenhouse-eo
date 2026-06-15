'use client'

import { memo, useId, useState } from 'react'

import type { ToolCallMessagePartProps } from '@assistant-ui/react'
import { useAssistantToolUI } from '@assistant-ui/react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import { NexaEvidencePanel, NexaProvenanceTrace } from '@/components/greenhouse/primitives'
import type { NexaToolResult } from '@/lib/nexa/nexa-contract'
import {
  evidenceConfidenceLabel,
  evidenceFreshnessLabel,
  nexaToolResultToConversationalEvidence,
  type ConversationalEvidencePacket
} from '@/lib/nexa/conversational-evidence'

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

/* ── Trace card heavy (sigue exportado para el Lab del Design System) ──
   Es el render del CANVAS de Answers (single-answer). En el CHAT NO se usa: el thread
   multi-turno usa la procedencia compacta `NexaKnowledgeProvenance` (abajo). */
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

/* ── Procedencia compacta del CHAT (TASK-1112) ──
   Reemplaza el traceCard pesado siempre-abierto. El grounding asienta la confianza en UNA
   línea (modern-ui: restraint; product UI denso ≠ canvas), clickable como disclosure →
   revela el panel de fuentes/trazabilidad bajo demanda (NexaProvenanceTrace `panel`).
   `feedbackEnabled={false}`: el feedback vive UNA sola vez en el ActionBar del mensaje
   (sin doble dock). Reusa la primitive canónica + el packet del tool (cero fork). */
const confidenceTone = (
  confidence: ConversationalEvidencePacket['confidence']
): 'success' | 'info' | 'warning' =>
  confidence === 'high' ? 'success' : confidence === 'medium' ? 'info' : 'warning'

const NexaKnowledgeProvenance = ({ evidence }: { evidence: ConversationalEvidencePacket }) => {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const panelId = useId()

  const tone = confidenceTone(evidence.confidence)

  const ink =
    tone === 'success'
      ? theme.greenhouseSemantic.success.tonalText
      : tone === 'warning'
        ? theme.greenhouseSemantic.warning.tonalText
        : theme.palette.info.main

  const icon =
    tone === 'success' ? 'tabler-circle-check-filled' : tone === 'warning' ? 'tabler-alert-triangle' : 'tabler-sparkles'

  const count = evidence.citedDocumentCount
  const sourcesLabel = `${count} ${count === 1 ? 'fuente' : 'fuentes'}`
  const detail = `Confianza ${evidenceConfidenceLabel(evidence.confidence)} · ${evidenceFreshnessLabel(evidence.freshness)}`

  return (
    <Box sx={{ mt: 1.25 }} data-capture='nexa-knowledge-provenance'>
      <Box
        component='button'
        type='button'
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
          maxWidth: '100%',
          px: 1.25,
          py: 0.75,
          border: 'none',
          cursor: 'pointer',
          borderRadius: `${theme.shape.customBorderRadius.sm}px`,
          bgcolor: 'transparent',
          textAlign: 'left',
          transition: theme.transitions.create('background-color', { duration: theme.transitions.duration.shorter }),
          '&:hover': { bgcolor: 'action.hover' },
          '&:focus-visible': { outline: `2px solid ${alpha(theme.palette.primary.main, 0.6)}`, outlineOffset: 2 }
        }}
      >
        <Box component='i' className={icon} aria-hidden sx={{ color: ink, fontSize: 16, flex: '0 0 auto' }} />
        <Typography component='span' variant='caption' sx={{ color: ink, fontWeight: 600 }}>
          {sourcesLabel}
        </Typography>
        <Typography component='span' variant='caption' color='text.secondary'>
          · {detail}
        </Typography>
        <Box
          component='i'
          className='tabler-chevron-down'
          aria-hidden
          sx={{
            fontSize: 16,
            flex: '0 0 auto',
            color: 'text.secondary',
            transition: theme.transitions.create('transform', { duration: theme.transitions.duration.shorter }),
            transform: open ? 'rotate(180deg)' : 'none',
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
          }}
        />
      </Box>
      <NexaProvenanceTrace variant='panel' open={open} evidence={evidence} feedbackEnabled={false} sourcesOnly panelId={panelId} />
    </Box>
  )
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

    const evidence = nexaToolResultToConversationalEvidence(result)

    if (!evidence) {
      return <ToolCard toolName='search_knowledge' result={result} />
    }

    return <NexaKnowledgeProvenance evidence={evidence} />
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
