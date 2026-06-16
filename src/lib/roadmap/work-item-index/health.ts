/**
 * TASK-1152 — Work item health + readiness classifier.
 *
 * Espeja (no duplica el binario) la semántica de salud de los linters canónicos:
 * - `task-lint`: `template` vs `legacy` (filename canónico + Status + Lifecycle +
 *   Type + markers ZONE 0-4).
 * - `ops-artifact-lint` (epic/mini): `canonical` vs `legacy` (filename canónico +
 *   Status) + required sections + required Status fields + lifecycle/folder parity.
 * - Issues NO tienen linter: se clasifican por folder (`open|resolved`) + presencia
 *   de las secciones esperadas del README, con health honesto.
 *
 * Un item con findings NO bloquea el índice: degrada a `needs_grooming` / `legacy`.
 * Esta lógica es PURA (testeable sin filesystem). Los tests de paridad la bloquean
 * contra los `requiredSections` / `requiredStatusFields` de `ops-artifact-lint.mjs`.
 */
import type { WorkItemParseSignals } from './parser'
import type {
  WorkItem,
  WorkItemHealth,
  WorkItemHealthLevel,
  WorkItemKind,
  WorkItemReadiness,
  WorkItemTemplateStatus
} from './types'

/**
 * Required sections/status fields canónicas por kind (mirror exacto de
 * `scripts/ci/ops-artifact-lint.mjs` CONFIG). Cambiar el linter ⇒ actualizar acá
 * (tests de paridad lo enforce).
 */
const HEALTH_RULES: Record<
  Exclude<WorkItemKind, 'issue'>,
  { requiredSections: string[]; requiredStatusFields: string[] }
> = {
  epic: {
    requiredSections: [
      'status',
      'summary',
      'why this epic exists',
      'outcome',
      'architecture alignment',
      'child tasks',
      'exit criteria',
      'non-goals'
    ],
    requiredStatusFields: ['lifecycle', 'priority', 'impact', 'effort', 'status real', 'domain', 'owner']
  },
  task: {
    // task-lint no exige una lista de secciones (usa los markers ZONE + filename
    // canónico + Lifecycle + Type). Las secciones clave del template se chequean
    // de forma blanda para grooming.
    requiredSections: ['status', 'summary'],
    requiredStatusFields: ['lifecycle', 'type']
  },
  mini_task: {
    requiredSections: [
      'status',
      'summary',
      'why mini',
      'current state',
      'proposed change',
      'acceptance criteria',
      'verification',
      'notes',
      'follow-ups'
    ],
    requiredStatusFields: ['lifecycle', 'priority', 'impact', 'effort', 'domain', 'type']
  }
}

/** Secciones esperadas de un issue (README canónico, accent-tolerant). */
const ISSUE_EXPECTED_SECTIONS = ['ambiente', 'detectado', 'sintoma', 'causa raiz', 'impacto', 'estado']

const deburr = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const resolveTemplateStatus = (
  kind: WorkItemKind,
  signals: WorkItemParseSignals
): WorkItemTemplateStatus => {
  if (kind === 'issue') return 'unknown'

  if (kind === 'task') {
    const isTemplate =
      signals.hasCanonicalFilename &&
      signals.hasStatus &&
      signals.hasTemplateShape &&
      signals.statusFieldKeys.has('lifecycle') &&
      signals.statusFieldKeys.has('type')

    return isTemplate ? 'template' : 'legacy'
  }

  // epic / mini_task → canonical vs legacy (mirror ops-artifact-lint).
  const isCanonical = signals.hasCanonicalFilename && signals.hasStatus

  return isCanonical ? 'canonical' : 'legacy'
}

const deriveReadiness = (item: Omit<WorkItem, 'health'>, templateStatus: WorkItemTemplateStatus): WorkItemReadiness => {
  if (item.kind === 'issue') {
    return item.lifecycle === 'resolved' ? 'resolved' : 'needs_triage'
  }

  if (item.lifecycle === 'complete') return 'complete'
  if (item.lifecycle === 'in-progress') return 'in_progress'

  // to-do / unknown.
  if (item.blockedBy.length > 0) return 'blocked'
  if (templateStatus === 'legacy' || item.lifecycle === 'unknown') return 'needs_triage'

  return 'ready_to_execute'
}

/**
 * Clasifica salud + readiness de un work item parseado.
 * `findings` son mensajes legibles (sin paths absolutos) que la UI puede mostrar.
 */
export const classifyHealth = (
  item: Omit<WorkItem, 'health'>,
  signals: WorkItemParseSignals
): WorkItemHealth => {
  const findings: string[] = []
  let errors = 0
  let warnings = 0

  const templateStatus = resolveTemplateStatus(item.kind, signals)

  if (item.kind === 'issue') {
    // Issues: sin linter; faltantes de secciones esperadas → warnings (grooming).
    const present = new Set(Array.from(signals.sectionKeys).map(deburr))

    for (const section of ISSUE_EXPECTED_SECTIONS) {
      if (!present.has(section)) {
        warnings += 1
        findings.push(`Falta la sección "## ${section}".`)
      }
    }

    if (item.lifecycle === 'unknown') {
      warnings += 1
      findings.push('El issue no vive en open/ ni resolved/.')
    }
  } else {
    const rules = HEALTH_RULES[item.kind]

    if (templateStatus === 'legacy') {
      // Item legacy: no se exige el contrato completo (mismo skip que el linter),
      // pero se marca para grooming.
      warnings += 1
      findings.push(
        item.kind === 'task'
          ? 'Task legacy: sin forma de template (filename canónico + Status + ZONE 0-4 + Lifecycle/Type).'
          : `${item.kind === 'epic' ? 'Epic' : 'Mini-task'} legacy: sin filename canónico o bloque Status.`
      )
    } else {
      // Canonical/template: aplicar required sections + status fields (errors).
      for (const section of rules.requiredSections) {
        if (!signals.sectionKeys.has(section)) {
          errors += 1
          findings.push(`Falta la sección requerida "## ${section}".`)
        }
      }

      for (const field of rules.requiredStatusFields) {
        if (!signals.statusFieldKeys.has(field)) {
          errors += 1
          findings.push(`Falta el campo Status "${field}".`)
        }
      }
    }

    // Lifecycle ↔ folder parity (warning, mirror del linter).
    if (
      signals.declaredLifecycle &&
      item.lifecycle !== 'unknown' &&
      signals.declaredLifecycle !== item.lifecycle
    ) {
      warnings += 1
      findings.push(`Lifecycle es "${signals.declaredLifecycle}" pero el archivo vive en "${item.lifecycle}".`)
    }

    if (item.lifecycle === 'unknown') {
      warnings += 1
      findings.push('No vive en to-do/, in-progress/ ni complete/.')
    }
  }

  // Parse warnings cuentan como warnings de salud.
  warnings += item.parseWarnings.length
  findings.push(...item.parseWarnings)

  const isLegacy = templateStatus === 'legacy'
  const needsGrooming = isLegacy || errors > 0 || warnings > 0

  const level: WorkItemHealthLevel = isLegacy ? 'legacy' : needsGrooming ? 'needs_grooming' : 'ok'

  return {
    templateStatus,
    lintErrors: errors,
    lintWarnings: warnings,
    needsGrooming,
    level,
    readiness: deriveReadiness(item, templateStatus),
    findings
  }
}
