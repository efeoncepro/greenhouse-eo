// Harness data for the AI Visibility Report Artifact mockup (TASK-1252).
// The report itself now renders from the REAL contract via the feature-local
// component `AiVisibilityReportArtifact` fed by `report-artifact/fixtures.ts`
// (a GraderReport → public/client DTOs via the real builders). This module only
// holds the mockup harness chrome (variant switcher + state toggles + header
// identity), which is docs-only and never ships to runtime consumers.

import type { ReportArtifactVariant } from '@/components/growth/ai-visibility/report-artifact/model'
import type { ReportHeader } from '@/components/growth/ai-visibility/report-artifact/web/AiVisibilityReportArtifact'

/** Identity/date context (org name + dates) — provided by the consumer, not the report DTO. */
export const MOCK_REPORT_HEADER: ReportHeader = {
  organizationName: 'Globe',
  reportDate: '20 may 2025',
  periodLabel: '5–18 may 2025'
}

export type ArtifactState =
  | 'ready'
  | 'partial'
  | 'noTrend'
  | 'insufficientData'
  | 'reviewRequiredPublic'
  | 'expired'
  | 'renderError'
  | 'denied'

export const VARIANT_OPTIONS: { id: ReportArtifactVariant; label: string; icon: string }[] = [
  { id: 'publicWeb', label: 'publicWeb', icon: 'tabler-world' },
  { id: 'clientPortal', label: 'clientPortal', icon: 'tabler-users' },
  { id: 'attachment', label: 'attachment', icon: 'tabler-paperclip' },
  { id: 'adminPreview', label: 'adminPreview', icon: 'tabler-shield-half' }
]

export const STATE_OPTIONS: { id: ArtifactState; label: string }[] = [
  { id: 'ready', label: 'Listo' },
  { id: 'partial', label: 'Parcial' },
  { id: 'noTrend', label: 'Sin histórico' },
  { id: 'insufficientData', label: 'Datos insuficientes' },
  { id: 'reviewRequiredPublic', label: 'En revisión' },
  { id: 'expired', label: 'Vencido' },
  { id: 'renderError', label: 'Error de carga' },
  { id: 'denied', label: 'Sin acceso' }
]

/** States the consumer (not the artifact) owns — the mockup shows them as a notice. */
export const BLOCKING_STATES: ArtifactState[] = [
  'insufficientData',
  'reviewRequiredPublic',
  'expired',
  'renderError',
  'denied'
]

export const STATE_COPY: Record<ArtifactState, { title: string; body: string }> = {
  ready: { title: 'Informe listo', body: 'El informe ya puede compartirse como vista web o adjunto.' },
  partial: {
    title: 'Reporte parcial',
    body: 'Algunas fuentes no respondieron a tiempo. El puntaje y las conclusiones pueden cambiar cuando se complete la cobertura.'
  },
  noTrend: { title: 'Sin histórico comparable', body: 'Este informe aún no tiene una medición anterior comparable.' },
  insufficientData: {
    title: 'Datos insuficientes',
    body: 'La muestra disponible no alcanza para estimar visibilidad con confianza.'
  },
  reviewRequiredPublic: {
    title: 'Tu reporte se está preparando',
    body: 'Estamos revisando que el informe no incluya datos internos ni señales incompletas.'
  },
  expired: {
    title: 'Este informe ya no está disponible',
    body: 'El enlace o adjunto pertenece a una versión vencida del reporte.'
  },
  renderError: {
    title: 'No pudimos cargar el informe',
    body: 'La información del reporte no respondió a tiempo. Tus datos no se perdieron.'
  },
  denied: {
    title: 'Este informe no está disponible para tu espacio',
    body: 'No encontramos un reporte autorizado para esta organización.'
  }
}

export const HARNESS_COPY = {
  variantLabel: 'Variante del artefacto',
  sharedModelNote: 'Estas variantes comparten el mismo modelo de reporte.',
  stateLabel: 'Estado (mockup)'
}
