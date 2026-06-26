import 'server-only'

/**
 * TASK-1243 — Client Portal BFF · curated re-export del reader client-scoped del AI Visibility
 * Grader (EPIC-020 E). El client portal es hoja del DAG: el reader vive en el producer domain
 * `growth` (`@/lib/growth/ai-visibility/client/command`) y el portal lo consume SÓLO por acá —
 * la dirección permitida es client-portal → growth (la inversa la bloquea el lint
 * `greenhouse/no-cross-domain-import-from-client-portal`). Re-export con firma exacta del
 * upstream (sin shape custom); re-classify a `native` si el portal necesita una forma propia.
 */

export {
  readClientGraderReport,
  ClientGraderReportError,
  type ReadClientGraderReportInput,
  type ClientGraderReportResult
} from '@/lib/growth/ai-visibility/client/command'
