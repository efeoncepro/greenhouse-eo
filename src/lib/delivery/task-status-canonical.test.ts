import { describe, expect, it } from 'vitest'

import {
  ALL_CANONICAL_STATUSES,
  allVariantsForCanonical,
  buildTaskStatusToCscPhaseSql,
  isCanonicalStatus,
  isCanonicalStatusInGroup,
  normalizeTaskStatus,
  TASK_STATUS_ALIASES,
  TASK_STATUS_CANONICAL,
  TASK_STATUS_GROUPS,
  taskStatusGroupSql,
  taskStatusSql
} from './task-status-canonical'

describe('task-status-canonical', () => {
  describe('TASK_STATUS_CANONICAL — 11 canonical V1', () => {
    it('exposes exactly 11 canonical statuses', () => {
      expect(ALL_CANONICAL_STATUSES).toHaveLength(11)
    })

    it('exact V1 names', () => {
      expect(ALL_CANONICAL_STATUSES).toEqual([
        'Sin empezar',
        'Brief listo',
        'Pendiente aprobación interna',
        'En pausa',
        'Bloqueado',
        'En curso',
        'Listo para revisión',
        'Cambios solicitados',
        'Aprobado',
        'Cancelado',
        'Archivado'
      ])
    })
  })

  describe('normalizeTaskStatus — canonical pass-through', () => {
    it.each(ALL_CANONICAL_STATUSES)('canonical "%s" returns itself', canonical => {
      expect(normalizeTaskStatus(canonical)).toBe(canonical)
    })
  })

  describe('normalizeTaskStatus — Efeonce legacy mapping', () => {
    it('"Cambios Solicitados" (S mayúscula) → "Cambios solicitados"', () => {
      expect(normalizeTaskStatus('Cambios Solicitados')).toBe('Cambios solicitados')
    })

    it('"Listo para diseñar" → "Brief listo"', () => {
      expect(normalizeTaskStatus('Listo para diseñar')).toBe('Brief listo')
    })

    it('"Pendiente Dir. Arte" → "Pendiente aprobación interna"', () => {
      expect(normalizeTaskStatus('Pendiente Dir. Arte')).toBe('Pendiente aprobación interna')
    })

    it('"Detenido" → "En pausa"', () => {
      expect(normalizeTaskStatus('Detenido')).toBe('En pausa')
    })

    it('"Listo" → "Aprobado"', () => {
      expect(normalizeTaskStatus('Listo')).toBe('Aprobado')
    })

    it('"Cancelada" → "Cancelado"', () => {
      expect(normalizeTaskStatus('Cancelada')).toBe('Cancelado')
    })

    it('"Archivadas" → "Archivado"', () => {
      expect(normalizeTaskStatus('Archivadas')).toBe('Archivado')
    })
  })

  describe('normalizeTaskStatus — Sky legacy mapping', () => {
    it('"Tomado" → "Brief listo"', () => {
      expect(normalizeTaskStatus('Tomado')).toBe('Brief listo')
    })

    it('"En feedback" → "Cambios solicitados"', () => {
      expect(normalizeTaskStatus('En feedback')).toBe('Cambios solicitados')
    })

    it('"Pendiente" (Sky legacy) → "Pendiente aprobación interna"', () => {
      expect(normalizeTaskStatus('Pendiente')).toBe('Pendiente aprobación interna')
    })
  })

  describe('normalizeTaskStatus — English / accent variants', () => {
    it.each([
      ['Done', 'Aprobado'],
      ['Finalizado', 'Aprobado'],
      ['Completado', 'Aprobado'],
      ['Cancelled', 'Cancelado'],
      ['Canceled', 'Cancelado'],
      ['Listo para revision', 'Listo para revisión'],
      ['En Curso', 'En curso'],
      ['Listo para Revision', 'Listo para revisión'],
      ['Archivada', 'Archivado'],
      ['Backlog', 'Sin empezar']
    ])('"%s" → "%s"', (raw, expected) => {
      expect(normalizeTaskStatus(raw)).toBe(expected)
    })
  })

  describe('normalizeTaskStatus — edge cases', () => {
    it('null returns null', () => {
      expect(normalizeTaskStatus(null)).toBeNull()
    })

    it('undefined returns null', () => {
      expect(normalizeTaskStatus(undefined)).toBeNull()
    })

    it('empty string returns null', () => {
      expect(normalizeTaskStatus('')).toBeNull()
    })

    it('whitespace-only returns null', () => {
      expect(normalizeTaskStatus('   ')).toBeNull()
    })

    it('trims surrounding whitespace before matching', () => {
      expect(normalizeTaskStatus('  Aprobado  ')).toBe('Aprobado')
      expect(normalizeTaskStatus('  Listo  ')).toBe('Aprobado')
    })

    it('unknown string returns null (caller decides exclusion vs alert)', () => {
      expect(normalizeTaskStatus('Estado Inventado')).toBeNull()
      expect(normalizeTaskStatus('Klingon Status')).toBeNull()
    })

    it('case-sensitive (canonical Notion case is meaningful)', () => {
      // "cambios solicitados" (all lowercase) is NOT in the alias map — only
      // canonical "Cambios solicitados" (capital C, lowercase s) is.
      expect(normalizeTaskStatus('cambios solicitados')).toBeNull()
    })
  })

  describe('isCanonicalStatus — predicate', () => {
    it('matches canonical against canonical', () => {
      expect(isCanonicalStatus('Aprobado', TASK_STATUS_CANONICAL.APROBADO)).toBe(true)
    })

    it('matches legacy against canonical', () => {
      expect(isCanonicalStatus('Listo', TASK_STATUS_CANONICAL.APROBADO)).toBe(true)
    })

    it('matches case-mismatch legacy', () => {
      expect(isCanonicalStatus('Cambios Solicitados', TASK_STATUS_CANONICAL.CAMBIOS_SOLICITADOS)).toBe(true)
    })

    it('returns false for null', () => {
      expect(isCanonicalStatus(null, TASK_STATUS_CANONICAL.APROBADO)).toBe(false)
    })

    it('returns false for unknown', () => {
      expect(isCanonicalStatus('Klingon', TASK_STATUS_CANONICAL.APROBADO)).toBe(false)
    })
  })

  describe('isCanonicalStatusInGroup — group matching', () => {
    it('"Detenido" matches BLOCKED group', () => {
      expect(isCanonicalStatusInGroup('Detenido', TASK_STATUS_GROUPS.BLOCKED)).toBe(true)
    })

    it('"Bloqueado" matches BLOCKED group', () => {
      expect(isCanonicalStatusInGroup('Bloqueado', TASK_STATUS_GROUPS.BLOCKED)).toBe(true)
    })

    it('"En curso" does NOT match BLOCKED group', () => {
      expect(isCanonicalStatusInGroup('En curso', TASK_STATUS_GROUPS.BLOCKED)).toBe(false)
    })

    it('"Listo" matches COMPLETED group (legacy alias)', () => {
      expect(isCanonicalStatusInGroup('Listo', TASK_STATUS_GROUPS.COMPLETED)).toBe(true)
    })

    it('"Aprobado" matches COMPLETED group (canonical)', () => {
      expect(isCanonicalStatusInGroup('Aprobado', TASK_STATUS_GROUPS.COMPLETED)).toBe(true)
    })

    it('"Cambios Solicitados" (S mayúscula) matches CLIENT_CHANGES group', () => {
      expect(isCanonicalStatusInGroup('Cambios Solicitados', TASK_STATUS_GROUPS.CLIENT_CHANGES)).toBe(true)
    })

    it('"En feedback" (Sky legacy) matches CLIENT_CHANGES group', () => {
      expect(isCanonicalStatusInGroup('En feedback', TASK_STATUS_GROUPS.CLIENT_CHANGES)).toBe(true)
    })

    it('null does NOT match any group', () => {
      expect(isCanonicalStatusInGroup(null, TASK_STATUS_GROUPS.ACTIVE)).toBe(false)
    })

    it('unknown status does NOT match', () => {
      expect(isCanonicalStatusInGroup('Klingon', TASK_STATUS_GROUPS.ACTIVE)).toBe(false)
    })
  })

  describe('allVariantsForCanonical — variant expansion', () => {
    it('"Aprobado" returns all known variants including Efeonce + English', () => {
      const variants = allVariantsForCanonical(TASK_STATUS_CANONICAL.APROBADO)

      expect(variants).toEqual(expect.arrayContaining(['Aprobado', 'Listo', 'Done', 'Finalizado', 'Completado']))
    })

    it('"Cambios solicitados" returns capital-S variant + Sky legacy', () => {
      const variants = allVariantsForCanonical(TASK_STATUS_CANONICAL.CAMBIOS_SOLICITADOS)

      expect(variants).toEqual(
        expect.arrayContaining(['Cambios solicitados', 'Cambios Solicitados', 'En feedback', 'En Feedback'])
      )
    })

    it('canonical "Brief listo" returns Efeonce + Sky legacy variants', () => {
      const variants = allVariantsForCanonical(TASK_STATUS_CANONICAL.BRIEF_LISTO)

      expect(variants).toEqual(expect.arrayContaining(['Brief listo', 'Listo para diseñar', 'Tomado']))
    })
  })

  describe('taskStatusSql / taskStatusGroupSql — SQL safety', () => {
    it('generates a SQL-IN-clause safe string with single quotes', () => {
      const sql = taskStatusSql(TASK_STATUS_CANONICAL.APROBADO)

      expect(sql).toContain("'Aprobado'")
      expect(sql).toContain("'Listo'")
      expect(sql).toContain("'Done'")
      expect(sql.split(',').every(v => v.startsWith("'") && v.endsWith("'"))).toBe(true)
    })

    it('group SQL includes ALL variants for ALL canonicals in the group', () => {
      const sql = taskStatusGroupSql(TASK_STATUS_GROUPS.EXCLUDED)

      expect(sql).toContain("'Cancelado'")
      expect(sql).toContain("'Cancelada'") // Efeonce legacy
      expect(sql).toContain("'Cancelled'") // English
      expect(sql).toContain("'Archivado'")
      expect(sql).toContain("'Archivadas'") // Efeonce legacy
    })

    it('CLIENT_CHANGES group includes capital-S Efeonce legacy + Sky En feedback', () => {
      const sql = taskStatusGroupSql(TASK_STATUS_GROUPS.CLIENT_CHANGES)

      expect(sql).toContain("'Cambios solicitados'")
      expect(sql).toContain("'Cambios Solicitados'")
      expect(sql).toContain("'En feedback'")
    })

    it('BLOCKED group includes Detenido (Efeonce legacy) + En pausa (canonical)', () => {
      const sql = taskStatusGroupSql(TASK_STATUS_GROUPS.BLOCKED)

      expect(sql).toContain("'Bloqueado'")
      expect(sql).toContain("'Detenido'")
      expect(sql).toContain("'En pausa'")
    })

    it('no embedded quote injection (constants only — single-quote escaped)', () => {
      // Sanity: the helper escapes single quotes via '' replacement. Since all
      // aliases are constants with no quotes, the output should have exactly
      // 2 quotes per variant (the wrapping ones) and no doubled quotes.
      const sql = taskStatusGroupSql(TASK_STATUS_GROUPS.ACTIVE)
      const doubleQuoteCount = (sql.match(/''/g) || []).length

      expect(doubleQuoteCount).toBe(0)
    })
  })

  describe('buildTaskStatusToCscPhaseSql — CSC phase mapping', () => {
    it('produces a CASE WHEN with all 7 phase buckets', () => {
      const sql = buildTaskStatusToCscPhaseSql('task_status')

      expect(sql).toContain("THEN 'briefing'")
      expect(sql).toContain("THEN 'en_ejecucion'")
      expect(sql).toContain("THEN 'revision_interna'")
      expect(sql).toContain("THEN 'cambios_cliente'")
      expect(sql).toContain("THEN 'aprobado'")
      expect(sql).toContain("THEN 'bloqueado'")
      expect(sql).toContain("THEN 'excluido'")
      expect(sql).toContain("ELSE 'unknown'")
    })

    it('uses the column name passed (parametric)', () => {
      const sql = buildTaskStatusToCscPhaseSql('dt.task_status')

      expect(sql).toContain('dt.task_status IN')
    })

    it('includes legacy + canonical variants in each phase', () => {
      const sql = buildTaskStatusToCscPhaseSql('estado')

      // Briefing includes Efeonce + Sky legacy variants
      expect(sql).toMatch(/'Sin empezar'/)
      expect(sql).toMatch(/'Brief listo'/)
      expect(sql).toMatch(/'Listo para diseñar'/)
      expect(sql).toMatch(/'Tomado'/)
      expect(sql).toMatch(/'Backlog'/)

      // Cambios cliente includes capital-S Efeonce + Sky En feedback
      expect(sql).toMatch(/'Cambios solicitados'/)
      expect(sql).toMatch(/'Cambios Solicitados'/)
      expect(sql).toMatch(/'En feedback'/)
    })
  })

  describe('TASK_STATUS_ALIASES — invariants', () => {
    it('every canonical V1 is self-mapped (idempotent normalization)', () => {
      for (const canonical of ALL_CANONICAL_STATUSES) {
        expect(TASK_STATUS_ALIASES[canonical]).toBe(canonical)
      }
    })

    it('every alias value is a valid canonical V1', () => {
      for (const target of Object.values(TASK_STATUS_ALIASES)) {
        expect(ALL_CANONICAL_STATUSES).toContain(target)
      }
    })

    it('is frozen at runtime (immutable canonical contract)', () => {
      expect(Object.isFrozen(TASK_STATUS_ALIASES)).toBe(true)
    })
  })
})
