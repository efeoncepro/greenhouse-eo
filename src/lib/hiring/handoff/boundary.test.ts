import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * TASK-356 — Boundary negativo estático (bidireccional, espejo del boundary
 * contractor↔payroll): el dominio del HiringHandoff NUNCA escribe en las tablas de
 * identity/workforce/payroll/finance/contractor. El handoff entrega una solicitud
 * aprobable; la ejecución downstream es de 770/HRIS/Staff Aug/EPIC-013.
 *
 * Complementa los asserts runtime de materialize.test.ts (SQL capturada del mock):
 * este test lee el FUENTE de todo el dominio + el consumer reactivo, así que atrapa
 * también writes que un test unitario no ejercite.
 */

const FORBIDDEN_WRITE_TARGETS = [
  'members',
  'assignments',
  'placements',
  'staff_aug_placements',
  'payroll_entries',
  'payroll_adjustments',
  'compensation_versions',
  'final_settlements',
  'final_settlement_documents',
  'contractor_engagements',
  'providers',
  'expenses',
]

const WRITE_PATTERN = (table: string) =>
  new RegExp(`(INSERT\\s+INTO|UPDATE|DELETE\\s+FROM|TRUNCATE)\\s+(ONLY\\s+)?[\\w."]*\\b${table}\\b`, 'i')

const DOMAIN_FILES = [
  ...readdirSync(join(process.cwd(), 'src/lib/hiring/handoff'))
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
    .map((file) => join('src/lib/hiring/handoff', file)),
  'src/lib/sync/projections/hiring-handoff-materialize.ts',
  'src/lib/staff-augmentation/handoff-bridge.ts',
  'src/app/api/hiring/handoffs/[id]/[action]/route.ts',
]

describe('hiring handoff boundary (negativo)', () => {
  it.each(DOMAIN_FILES)('%s no escribe en tablas prohibidas del boundary', (relativePath) => {
    const source = readFileSync(join(process.cwd(), relativePath), 'utf8')

    for (const table of FORBIDDEN_WRITE_TARGETS) {
      expect(source, `${relativePath} no puede escribir en "${table}"`).not.toMatch(WRITE_PATTERN(table))
    }
  })

  it('el dominio solo escribe en sus propias tablas + outbox', () => {
    const writeTargets = new Set<string>()

    for (const relativePath of DOMAIN_FILES) {
      const source = readFileSync(join(process.cwd(), relativePath), 'utf8')

      for (const match of source.matchAll(/(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+([\w.]+)/gi)) {
        writeTargets.add(match[1])
      }
    }

    const allowed = [
      'greenhouse_hiring.hiring_handoff',
      'greenhouse_hiring.hiring_handoff_audit',

      // publishOutboxEvent (in-tx) es el único write fuera del aggregate.
      'greenhouse_sync.outbox_events',
    ]

    for (const target of writeTargets) {
      expect(allowed, `write target inesperado: ${target}`).toContain(target)
    }
  })
})
