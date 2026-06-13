// GAP A (TASK-1102 frontera) — fixtures del mockup de "composición con host" (Nexa Moment Fabric runtime).
// Datos sintéticos: un host de Knowledge (lista de documentos del corpus) que PERSISTE cuando la
// superficie entra en modo conversacional, + un render plan grounded que el NexaAnswersCanvas pinta
// como bloque protagonista. La respuesta lidera; el host sigue abajo (estilo AI Overviews).

import type {
  NexaAnswersRenderPlan,
  NexaAnswersSurfaceContext
} from '@/components/greenhouse/primitives'
import type { ConversationalEvidencePacket } from '@/lib/nexa/conversational-evidence'

/** Documento del corpus de Knowledge — el contenido del host que NO desaparece en modo conversacional. */
export interface HostKnowledgeDoc {
  id: string
  title: string
  kind: string
  kindTone: 'primary' | 'success' | 'info' | 'warning' | 'default'
  kindIcon: string
  updatedLabel: string
  excerpt: string
}

export const HOST_KNOWLEDGE_DOCS: HostKnowledgeDoc[] = [
  {
    id: 'ico-metrics',
    title: 'Manual: Métricas ICO',
    kind: 'Manual',
    kindTone: 'primary',
    kindIcon: 'tabler-book-2',
    updatedLabel: 'Actualizado hace 3 días',
    excerpt: 'Impacto mide el efecto observable de una iniciativa sobre el resultado del cliente o del equipo, no el volumen de actividad.'
  },
  {
    id: 'ico-collaboration',
    title: 'Guía: Lectura de desempeño',
    kind: 'Guía',
    kindTone: 'info',
    kindIcon: 'tabler-compass',
    updatedLabel: 'Actualizado hace 5 días',
    excerpt: 'Las métricas ICO se leen como señales complementarias: Impacto, Colaboración y Orientación al Cliente se explican mejor juntas.'
  },
  {
    id: 'ico-calibration',
    title: 'SOP: Calibración ICO',
    kind: 'SOP',
    kindTone: 'success',
    kindIcon: 'tabler-adjustments',
    updatedLabel: 'Actualizado hace 8 días',
    excerpt: 'Una puntuación alta requiere evidencia de resultado y trazabilidad de la contribución, sobre todo cuando se usa para decisiones operativas.'
  },
  {
    id: 'ico-onboarding',
    title: 'Onboarding del equipo de delivery',
    kind: 'Runbook',
    kindTone: 'warning',
    kindIcon: 'tabler-route',
    updatedLabel: 'Actualizado hace 12 días',
    excerpt: 'Cómo se introduce el marco ICO a un colaborador nuevo y qué señales se calibran en los primeros ciclos.'
  },
  {
    id: 'ico-glossary',
    title: 'Glosario de métricas operativas',
    kind: 'Glosario',
    kindTone: 'default',
    kindIcon: 'tabler-list-details',
    updatedLabel: 'Actualizado hace 20 días',
    excerpt: 'Definiciones canónicas: RpA, OTD, FTR, Cumplimiento, Impacto, Colaboración y Orientación al Cliente.'
  }
]

export const COMPOSITION_QUESTION = '¿Cómo se interpreta Impacto dentro de las métricas ICO?'

export const COMPOSITION_SURFACE_CONTEXT: NexaAnswersSurfaceContext = {
  surfaceId: 'knowledge.nexa.composition',
  domain: 'knowledge',
  // GAP A: placement de composición-con-host (distinto de `embedded` = takeover). En el mockup se modela
  // con el valor más cercano del enum actual; el contrato agrega `composed` cuando se implemente el runtime.
  placement: 'inline',
  dataReality: 'synthetic',
  sensitivity: 'tenant_internal',
  allowedRenderers: ['answerBubble'],
  allowedActions: ['read', 'explain', 'suggest_followup']
}

const evidencePacket: ConversationalEvidencePacket = {
  contractVersion: 'nexa-evidence.v1',
  kind: 'knowledge',
  sourceContractVersion: 'knowledge-search.v1',
  query: COMPOSITION_QUESTION,
  generatedAt: '2026-06-13T12:00:00.000Z',
  confidence: 'high',
  freshness: 'current',
  deniedOrFilteredCount: 0,
  maxScore: 0.92,
  citedDocumentCount: 3,
  primaryFeedbackTarget: { documentId: 'ico-metrics', chunkId: 'chunk-impacto-01' },
  sources: [
    {
      id: 'chunk-impacto-01',
      documentId: 'ico-metrics',
      documentVersionId: 'v4',
      title: 'Manual: Métricas ICO',
      citationLabel: '[1]',
      headingPath: ['Métricas ICO', 'Impacto'],
      excerpt: 'Impacto mide el efecto observable de una iniciativa sobre el resultado del cliente o del equipo, no la cantidad de actividad realizada.',
      humanUrl: '/knowledge/documents/ico-metrics',
      sourceUrl: 'greenhouse://knowledge/document/ico-metrics',
      score: 0.92,
      freshness: 'current',
      updatedAt: '2026-06-10T14:30:00.000Z',
      sensitivity: 'internal'
    },
    {
      id: 'chunk-colaboracion-01',
      documentId: 'ico-collaboration',
      documentVersionId: 'v2',
      title: 'Guía: Lectura de desempeño',
      citationLabel: '[2]',
      headingPath: ['Lectura de desempeño', 'ICO'],
      excerpt: 'Las métricas ICO deben leerse como señales complementarias que se explican mejor juntas.',
      humanUrl: '/knowledge/documents/ico-collaboration',
      sourceUrl: 'greenhouse://knowledge/document/ico-collaboration',
      score: 0.86,
      freshness: 'current',
      updatedAt: '2026-06-08T09:10:00.000Z',
      sensitivity: 'internal'
    },
    {
      id: 'chunk-calibration-01',
      documentId: 'ico-calibration',
      documentVersionId: 'v1',
      title: 'SOP: Calibración ICO',
      citationLabel: '[3]',
      headingPath: ['Calibración', 'Escala'],
      excerpt: 'Una puntuación alta requiere evidencia de resultado y trazabilidad de la contribución.',
      humanUrl: '/knowledge/documents/ico-calibration',
      sourceUrl: 'greenhouse://knowledge/document/ico-calibration',
      score: 0.81,
      freshness: 'current',
      updatedAt: '2026-06-05T16:25:00.000Z',
      sensitivity: 'internal'
    }
  ],
  traceSteps: [
    { id: 'intent', label: 'Intención', description: 'Lectura conceptual sobre Knowledge', metadata: 'scope: knowledge · action: explain', state: 'complete' },
    { id: 'retrieval', label: 'Fuentes', description: '3 fragmentos actuales seleccionados', metadata: 'maxScore 0.92 · filtered 0', state: 'complete' },
    { id: 'answer', label: 'Respuesta', description: 'Síntesis answer-first con citas', metadata: 'trustCue: sourced_current', state: 'active' }
  ]
}

export const COMPOSITION_RENDER_PLAN: NexaAnswersRenderPlan = {
  id: 'knowledge-composition-answer',
  version: 'nexa-answer-render-plan.v1',
  intent: 'explain',
  autonomyTier: 'observeOnly',
  primaryBlockId: 'composition-answer',
  trustCue: { tone: 'success', label: 'Respuesta con respaldo', detail: '3 fuentes citadas · vigentes' },
  actions: [],
  proof: {
    id: 'knowledge-composition-proof',
    label: 'Cómo lo sé',
    collapsedLabel: 'Ver fuentes y traza',
    expandedLabel: 'Ocultar fuentes y traza',
    evidence: evidencePacket
  },
  blocks: [
    {
      id: 'composition-answer',
      renderer: 'answerBubble',
      rendererVersion: 'v1',
      variant: 'explanation',
      kind: 'knowledgeExplanationAnswer',
      title: [{ text: 'Impacto se lee por su resultado, no por el volumen de actividad.' }],
      body: [
        { text: 'La lectura útil mira el efecto observable sobre el cliente o el equipo' },
        {
          type: 'citation',
          source: {
            id: 'chunk-impacto-01',
            label: '1',
            title: 'Manual: Métricas ICO',
            headingPath: ['Métricas ICO', 'Impacto'],
            excerpt: 'Impacto mide el efecto observable de una iniciativa sobre el resultado, no la cantidad de actividad.',
            score: 0.92,
            freshness: 'current',
            href: '/knowledge/documents/ico-metrics'
          }
        },
        { text: ', y se interpreta junto a Colaboración y Orientación al Cliente' },
        {
          type: 'citation',
          source: {
            id: 'chunk-colaboracion-01',
            label: '2',
            title: 'Guía: Lectura de desempeño',
            headingPath: ['Lectura de desempeño', 'ICO'],
            excerpt: 'Las métricas ICO se explican mejor juntas.',
            score: 0.86,
            freshness: 'current',
            href: '/knowledge/documents/ico-collaboration'
          }
        },
        { text: '.' }
      ],
      metaLabel: [{ text: '3 fuentes · vigentes' }],
      points: [
        {
          title: [{ text: 'Resultado, no actividad', style: 'strong' }],
          body: [{ text: 'Impacto mide el efecto observable sobre el resultado del cliente o del equipo. ' }, { type: 'citation', source: { id: 'chunk-impacto-01', label: '1', title: 'Manual: Métricas ICO', excerpt: 'Impacto mide el efecto observable sobre el resultado.', score: 0.92, freshness: 'current', href: '/knowledge/documents/ico-metrics' } }]
        },
        {
          title: [{ text: 'Se lee con sus señales hermanas', style: 'strong' }],
          body: [{ text: 'Colaboración y Orientación al Cliente lo contextualizan; aisladas pierden sentido. ' }, { type: 'citation', source: { id: 'chunk-colaboracion-01', label: '2', title: 'Guía: Lectura de desempeño', excerpt: 'Las métricas ICO se explican mejor juntas.', score: 0.86, freshness: 'current', href: '/knowledge/documents/ico-collaboration' } }]
        },
        {
          title: [{ text: 'Alta puntuación = evidencia + trazabilidad', style: 'strong' }],
          body: [{ text: 'Para decisiones operativas, una puntuación alta exige resultado demostrable y traza de la contribución. ' }, { type: 'citation', source: { id: 'chunk-calibration-01', label: '3', title: 'SOP: Calibración ICO', excerpt: 'Una puntuación alta requiere evidencia de resultado y trazabilidad.', score: 0.81, freshness: 'current', href: '/knowledge/documents/ico-calibration' } }]
        }
      ],
      trustCue: { tone: 'success', label: 'Respuesta con respaldo', detail: '3 fuentes citadas · vigentes' }
    }
  ]
}
