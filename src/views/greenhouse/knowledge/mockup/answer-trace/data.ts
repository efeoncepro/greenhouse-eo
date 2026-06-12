export type TraceStepState = 'complete' | 'active' | 'pending'
export type ProofTab = 'sources' | 'trace' | 'packet' | 'evals'
export type AnswerMode = 'human' | 'nexa' | 'mcp'
export type StatusTone = 'success' | 'info' | 'warning' | 'error' | 'default' | 'primary'

export interface TraceStep {
  id: string
  label: string
  description: string
  metadata: string
  state: TraceStepState
}

export interface SourceExcerpt {
  id: string
  title: string
  version: string
  freshness: string
  route: string
  quote: string
  anchor: string
  owner: string
  reviewedAt: string
  whySelected: string
}

export interface PacketRow {
  label: string
  value: string
  tone?: StatusTone
}

export interface EvalRow {
  label: string
  value: string
  status: string
  tone: StatusTone
}

export interface LearningPath {
  label: string
  docs: string
  progress: number
  active?: boolean
}

export interface ManualSection {
  id: string
  label: string
  active?: boolean
}

export interface ContextHook {
  title: string
  body: string
  icon: string
}

export const traceSteps: TraceStep[] = [
  {
    id: 'intent',
    label: 'Intento detectado: aprender',
    description: 'Clasificación: guía operativa',
    metadata: 'Dominio: Mi Desempeño',
    state: 'complete'
  },
  {
    id: 'retrieval',
    label: 'Retrieval: 3 chunks incluidos',
    description: 'Confianza del retrieval: 0.93',
    metadata: 'Filtrados por policy: 1',
    state: 'complete'
  },
  {
    id: 'answer',
    label: 'Respuesta con citas',
    description: 'Confianza de respuesta: 0.91',
    metadata: 'Fuentes citadas: 2',
    state: 'active'
  },
  {
    id: 'feedback',
    label: 'Feedback y mejora',
    description: 'Tu feedback mejora la memoria',
    metadata: 'Último feedback: hoy 09:41',
    state: 'pending'
  }
]

export const sourceExcerpts: SourceExcerpt[] = [
  {
    id: 'manual-mi-desempeno',
    title: 'Manual: Cómo usar Mi Desempeño',
    version: 'v4.3',
    freshness: 'Actual',
    route: 'Mi Desempeño > Introducción > Propósito',
    quote: 'Mi Desempeño te permite revisar tus objetivos, ver feedback y dar seguimiento a tu crecimiento profesional.',
    anchor: '#proposito',
    owner: 'People Ops',
    reviewedAt: '07 may 2025',
    whySelected: 'Define el propósito y el acceso'
  },
  {
    id: 'glosario-ico',
    title: 'Glosario: Métricas ICO personales',
    version: 'v2.1',
    freshness: 'Actual',
    route: 'Métricas ICO > Definiciones > Impacto',
    quote: 'Impacto mide la contribución al logro de objetivos clave con foco en resultados.',
    anchor: '#impacto-def',
    owner: 'People Ops',
    reviewedAt: '02 may 2025',
    whySelected: 'Define la métrica y su escala'
  }
]

export const packetRows: PacketRow[] = [
  { label: 'confidence', value: '0.91 (high)', tone: 'success' },
  { label: 'freshness', value: 'current (07 may 2025)', tone: 'success' },
  { label: 'deniedOrFilteredCount', value: '1' },
  { label: 'accessScope', value: 'internal' },
  { label: 'audience', value: 'Colaboradores corporativos' },
  { label: 'sensitivity', value: 'internal' },
  { label: 'agentic_policy', value: 'agent_allowed', tone: 'success' },
  { label: 'chunkIncluded', value: '3' },
  { label: 'chunksFiltered', value: '1' },
  { label: 'mcp_uri', value: 'greenhouse://knowledge/document/mi-desempeno' },
  { label: 'retrieval_id', value: 'kr_2025-05-19_09-41-22_7f3c9a' },
  { label: 'notes', value: 'Secciones con datos personales filtradas.' }
]

export const evalRows: EvalRow[] = [
  { label: 'Golden question match', value: '¿Cómo reviso Mi Desempeño?', status: 'Passed', tone: 'success' },
  { label: 'No-answer guard', value: 'No pregunta sensible detectada.', status: 'OK', tone: 'success' },
  { label: 'Wrong-source guard', value: 'Fuentes alineadas a dominio.', status: 'OK', tone: 'success' },
  { label: 'Coverage', value: '92%', status: 'Stable', tone: 'info' }
]

export const learningPaths: LearningPath[] = [
  { label: 'Primeros pasos', docs: '6 docs', progress: 75 },
  { label: 'Mi Desempeño', docs: '3 docs', progress: 60, active: true },
  { label: 'Nexa para colaboradores', docs: '4 docs', progress: 40 },
  { label: 'Reportes y métricas', docs: '5 docs', progress: 20 }
]

export const manualSections: ManualSection[] = [
  { id: 'purpose', label: '1. Propósito', active: true },
  { id: 'access', label: '2. Acceder' },
  { id: 'sections', label: '3. Secciones principales' },
  { id: 'progress', label: '4. Avances' },
  { id: 'feedback', label: '5. Feedback' },
  { id: 'faq', label: '6. Preguntas frecuentes' }
]

export const contextHooks: ContextHook[] = [
  {
    title: '/my/performance',
    body: 'Acceso desde el portal en la vista principal de Mi Desempeño.',
    icon: 'tabler-layout-dashboard'
  },
  {
    title: 'Estados vacíos',
    body: 'Este contenido se muestra cuando no hay objetivos asignados.',
    icon: 'tabler-help-circle'
  },
  {
    title: 'Respuestas de Nexa',
    body: 'Nexa usa este documento para responder sobre Mi Desempeño.',
    icon: 'tabler-sparkles'
  }
]

export const answerSteps = [
  'Entra a Mi Desempeño desde el menú principal o el acceso rápido de Home.',
  'Revisa tus objetivos activos y los avances por cada métrica ICO.',
  'Usa los filtros por período o estado para ver completados, activos o atrasados.',
  'Colabora con tu líder: deja comentarios y acuerda próximos pasos.'
] as const
