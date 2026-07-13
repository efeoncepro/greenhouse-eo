import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Audit 2026-07-10 — Boundary negativo DOMAIN-WIDE de Hiring/ATS (recursivo).
 *
 * Complementa los boundary tests focales (handoff/, hiring-activation/): recorre TODO
 * `src/lib/hiring/**` y valida que cada write SQL apunte solo a tablas del allowlist del
 * dominio. Atrapa writes nuevos que los tests focales (listas fijas de archivos) no cubren.
 */

const ROOT = join(process.cwd(), 'src/lib/hiring')

const collectSourceFiles = (dir: string): string[] => {
  const out: string[] = []

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)

    if (statSync(full).isDirectory()) out.push(...collectSourceFiles(full))
    else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) out.push(full)
  }

  return out
}

/** Tablas donde el dominio hiring PUEDE escribir (SoT del boundary; extender con criterio). */
const ALLOWED_WRITE_TARGETS = new Set([
  // Aggregates propios del dominio (TASK-353/355/356/1360/1361).
  'greenhouse_hiring.talent_demand',
  'greenhouse_hiring.hiring_opening',
  'greenhouse_hiring.candidate_facet',
  'greenhouse_hiring.hiring_application',
  'greenhouse_hiring.hiring_application_intake_events',
  'greenhouse_hiring.hiring_handoff',
  'greenhouse_hiring.hiring_handoff_audit',
  'greenhouse_hiring.hiring_competency',
  'greenhouse_hiring.hiring_question',
  'greenhouse_hiring.hiring_assessment_template',
  'greenhouse_hiring.hiring_assessment_template_module',
  'greenhouse_hiring.hiring_assessment',
  'greenhouse_hiring.hiring_assessment_response',
  'greenhouse_hiring.hiring_competency_result',
  'greenhouse_hiring.hiring_assessment_ai_proposal',
  // TASK-1365 — self-ID sensitive source + append-only audit, physically separate from decision.
  'greenhouse_hiring.hiring_demographic_selfid',
  'greenhouse_hiring.hiring_demographic_selfid_audit',

  // Evidencia AI-Act (TASK-1364/1365; append-only, greenhouse_hr por gobernanza HR).
  'greenhouse_hr.assessment_validity_evidence',
  'greenhouse_hr.assessment_fairness_evidence',

  // Plataforma compartida (uploads de candidato, TASK-1362 — writes vía helpers de assets).
  'greenhouse_core.assets',
  'greenhouse_core.asset_scan_results',
  'greenhouse_core.person_identity_documents',

  // Outbox transaccional.
  'greenhouse_sync.outbox_events',
])

describe('hiring domain-wide boundary (audit 2026-07-10)', () => {
  const files = collectSourceFiles(ROOT)

  it('recorre un set no trivial de archivos del dominio', () => {
    expect(files.length).toBeGreaterThan(15)
  })

  it.each(files.map((f) => [f.replace(process.cwd() + '/', '')] as const))(
    '%s solo escribe en tablas del allowlist del dominio',
    (relativePath) => {
      const source = readFileSync(join(process.cwd(), relativePath), 'utf8')

      for (const match of source.matchAll(/(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+([a-z_]+\.[a-z_]+)/gi)) {
        expect(
          ALLOWED_WRITE_TARGETS.has(match[1]),
          `${relativePath} escribe en "${match[1]}" — fuera del allowlist del dominio hiring`,
        ).toBe(true)
      }
    },
  )
})
