import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * TASK-770 — Boundary negativo estático del bridge hiring→HRIS.
 *
 * El bridge materializa la faceta member (write sancionado, vía member-core) y su propio
 * mapping — NUNCA payroll/compensation/accesos/engagements. La activación real pasa por
 * completeWorkforceMemberIntake (path existente), no por escrituras del bridge.
 */

const FORBIDDEN_WRITE_TARGETS = [
  'payroll_entries',
  'payroll_adjustments',
  'payroll_periods',
  'compensation_versions',
  'final_settlements',
  'final_settlement_documents',
  'contractor_engagements',
  'providers',
  'expenses',
  'placements',
  'staff_aug_placements',
  'user_role_assignments',
  'client_users',
  'assignments',
]

const WRITE_PATTERN = (table: string) =>
  new RegExp(`(INSERT\\s+INTO|UPDATE|DELETE\\s+FROM|TRUNCATE)\\s+(ONLY\\s+)?[\\w."]*\\b${table}\\b`, 'i')

const DOMAIN_FILES = [
  ...readdirSync(join(process.cwd(), 'src/lib/workforce/hiring-activation'))
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
    .map((file) => join('src/lib/workforce/hiring-activation', file)),
  'src/app/api/hr/hiring-activation/route.ts',
  'src/app/api/hr/hiring-activation/[id]/route.ts',
  'src/app/api/hr/hiring-activation/[id]/[action]/route.ts',
]

describe('hiring activation boundary (negativo)', () => {
  it.each(DOMAIN_FILES)('%s no escribe en tablas prohibidas', (relativePath) => {
    const source = readFileSync(join(process.cwd(), relativePath), 'utf8')

    for (const table of FORBIDDEN_WRITE_TARGETS) {
      expect(source, `${relativePath} no puede escribir en "${table}"`).not.toMatch(WRITE_PATTERN(table))
    }
  })

  it('los writes del dominio quedan en members (core sancionado) + mapping propio + outbox', () => {
    const writeTargets = new Set<string>()

    for (const relativePath of DOMAIN_FILES) {
      const source = readFileSync(join(process.cwd(), relativePath), 'utf8')

      for (const match of source.matchAll(/(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+([\w.]+)/gi)) {
        writeTargets.add(match[1])
      }
    }

    const allowed = [
      // Core sancionado: materialización de la faceta member (espejo SCIM).
      'greenhouse_core.members',

      // Mapping + trail propios del bridge.
      'greenhouse_hr.hiring_activation_request',
      'greenhouse_hr.hiring_activation_request_events',

      // publishOutboxEvent in-tx.
      'greenhouse_sync.outbox_events',
    ]

    for (const target of writeTargets) {
      expect(allowed, `write target inesperado: ${target}`).toContain(target)
    }
  })

  it('NUNCA activa por escritura directa: ningún UPDATE de members toca workforce_intake_status=completed', () => {
    for (const relativePath of DOMAIN_FILES) {
      const source = readFileSync(join(process.cwd(), relativePath), 'utf8')

      expect(source, `${relativePath} no puede completar intake por write directo`).not.toMatch(
        /workforce_intake_status\s*=\s*'completed'/,
      )
    }
  })
})
