'use client'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import { NexaProvenanceTrace } from '@/components/greenhouse/primitives'
import type { NexaProvenanceStep, NexaProvenanceTrustCue } from '@/components/greenhouse/primitives'
import type { ConversationalEvidencePacket } from '@/lib/nexa/conversational-evidence'

const TRUST_CUES: { label: string; cue: NexaProvenanceTrustCue }[] = [
  {
    label: 'success',
    cue: { tone: 'success', label: 'Basado en 3 fuentes actuales', detail: 'Knowledge · confianza alta · 0 filtradas por política' }
  },
  {
    label: 'warning',
    cue: { tone: 'warning', label: 'Respuesta parcial — revisar antes de decidir', detail: 'Finance · 1 fuente desactualizada' }
  },
  {
    label: 'info',
    cue: { tone: 'info', label: 'Promovido desde Nexa Insights', detail: 'Agency · señal EO-AIS detectada en el sprint actual' }
  }
]

const REASONING_STEPS: NexaProvenanceStep[] = [
  { id: 'intent', label: 'Entendiendo la pregunta', status: 'done' },
  { id: 'retrieval', label: 'Leyendo 3 fuentes de Knowledge', status: 'active' },
  { id: 'answer', label: 'Redactando la respuesta', status: 'pending' }
]

const EVIDENCE: ConversationalEvidencePacket = {
  contractVersion: 'nexa-evidence.v1',
  kind: 'knowledge',
  sourceContractVersion: 'knowledge-search.v1',
  query: '¿Cómo se interpreta Impacto dentro de las métricas ICO?',
  confidence: 'high',
  freshness: 'current',
  deniedOrFilteredCount: 0,
  maxScore: 0.92,
  citedDocumentCount: 2,
  primaryFeedbackTarget: { documentId: 'knowledge-doc-ico-metrics', chunkId: 'chunk-impacto-01' },
  sources: [
    {
      id: 'chunk-impacto-01',
      documentId: 'knowledge-doc-ico-metrics',
      title: 'Manual: Métricas ICO',
      citationLabel: '[1]',
      headingPath: ['Métricas ICO', 'Impacto'],
      excerpt: 'Impacto mide el efecto observable de una iniciativa sobre el resultado del cliente o del equipo.',
      humanUrl: '/knowledge/documents/knowledge-doc-ico-metrics',
      score: 0.92,
      freshness: 'current'
    },
    {
      id: 'chunk-calibration-01',
      documentId: 'knowledge-doc-ico-calibration',
      title: 'SOP: Calibración ICO',
      citationLabel: '[3]',
      headingPath: ['Calibración', 'Escala'],
      excerpt: 'Una puntuación alta requiere evidencia de resultado y trazabilidad de la contribución.',
      humanUrl: '/knowledge/documents/knowledge-doc-ico-calibration',
      score: 0.81,
      freshness: 'current'
    }
  ],
  traceSteps: [
    { id: 'intent', label: 'Intención', description: 'Pregunta de lectura conceptual', metadata: 'scope: knowledge', state: 'complete' },
    { id: 'retrieval', label: 'Fuentes', description: '2 fragmentos actuales', metadata: 'maxScore 0.92', state: 'complete' },
    { id: 'answer', label: 'Respuesta', description: 'Síntesis answer-first', metadata: 'trustCue: sourced_current', state: 'active' }
  ]
}

const SpecimenCard = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (
  <Card variant='outlined'>
    <CardContent>
      <Stack spacing={3}>
        <Stack spacing={0.5}>
          <Typography variant='h6'>{title}</Typography>
          <Typography variant='body2' color='text.secondary'>
            {subtitle}
          </Typography>
        </Stack>
        {children}
      </Stack>
    </CardContent>
  </Card>
)

const NexaProvenanceLabView = () => (
  <Stack spacing={5} data-capture='nexa-provenance-lab'>
    <Stack spacing={1.5}>
      <CustomChip size='small' variant='tonal' color='primary' label='Primitive · NexaProvenanceTrace' />
      <Typography variant='surfaceHeroTitle'>Nexa Provenance Trace</Typography>
      <Typography variant='body2' color='text.secondary' sx={{ maxInlineSize: 820 }}>
        Grounding canónico de Nexa (SoT del &quot;por qué confiar&quot;). 3 variants — <strong>inline</strong> (trust cue),{' '}
        <strong>expandable</strong> (razonamiento), <strong>panel</strong> (evidencia bajo demanda). Transversal: el mismo
        contrato lo consumen Knowledge, Finance, Agency, Personas y Commercial; el <code>kind</code> resuelve a un variant.
      </Typography>
    </Stack>

    <SpecimenCard title='Variant · inline' subtitle='Trust cue compacto: asienta la confianza en una línea, sin robar protagonismo. Tonos success / warning / info.'>
      <Stack spacing={2.5} divider={<Box sx={theme => ({ borderTop: `1px solid ${theme.palette.divider}` })} />}>
        {TRUST_CUES.map(({ label, cue }) => (
          <Stack key={label} spacing={1}>
            <Typography variant='caption' color='text.disabled'>
              {label}
            </Typography>
            <NexaProvenanceTrace variant='inline' trustCue={cue} />
          </Stack>
        ))}
      </Stack>
    </SpecimenCard>

    <SpecimenCard title='Variant · expandable' subtitle='Traza de razonamiento progresiva (estilo AI Overview): pasos done ✓ / active (beat) / pending + shimmer opcional del footprint.'>
      <Box sx={theme => ({ p: 4, borderRadius: `${theme.shape.customBorderRadius.md}px`, backgroundColor: alpha(theme.palette.primary.main, 0.02) })}>
        <NexaProvenanceTrace variant='expandable' steps={REASONING_STEPS} showFootprint />
      </Box>
    </SpecimenCard>

    <SpecimenCard title='Variant · panel' subtitle='Evidencia bajo demanda: compone NexaEvidencePanel (read-only). Es el proof colapsable del answer-first.'>
      <NexaProvenanceTrace variant='panel' evidence={EVIDENCE} open />
    </SpecimenCard>

    <SpecimenCard
      title='Variant · panel (tabbed)'
      subtitle='El panel puede ser tabbed. Los built-ins son TRANSVERSALES (packet-driven): Fuentes/Razonamiento componen NexaEvidencePanel, Packet muestra los campos crudos del nexa-evidence.v1. Un tab de dominio entra por content slot (la primitive queda neutral; los labels y qué tabs los pasa el consumer).'
    >
      <NexaProvenanceTrace
        variant='panel'
        open
        evidence={EVIDENCE}
        panelTitle='Base'
        tabsAriaLabel='Pestañas de evidencia'
        feedbackEnabled
        tabs={[
          { id: 'sources', label: 'Fuentes', builtin: 'sources' },
          { id: 'trace', label: 'Razonamiento', builtin: 'trace' },
          { id: 'packet', label: 'Packet', builtin: 'packet' },
          {
            id: 'domain-evals',
            label: 'Evals',
            content: (
              <Alert severity='success' variant='outlined'>
                Slot de dominio: el consumer (p.ej. Knowledge) llena este tab con su proof específico — aquí
                viviría el eval-harness real. La primitive no conoce este contenido.
              </Alert>
            )
          }
        ]}
      />
    </SpecimenCard>

    <SpecimenCard title='Kinds → variant' subtitle='El kind semántico resuelve a un variant funcional. Ningún dominio tiene chrome especial (transversal).'>
      <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
        <CustomChip size='small' variant='tonal' color='success' label='knowledgeGrounded → panel' />
        <CustomChip size='small' variant='tonal' color='info' label='signalPromoted → inline' />
        <CustomChip size='small' variant='tonal' color='secondary' label='computed → inline' />
      </Stack>
    </SpecimenCard>
  </Stack>
)

export default NexaProvenanceLabView
