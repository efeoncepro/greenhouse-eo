import { describe, expect, it } from 'vitest'

import {
  BLOCKED_STATUSES,
  EXCLUDED_FROM_METRICS_STATUSES,
  EXCLUDED_STATUSES,
  TASK_STATUS_TO_CSC
} from './metric-registry'

/**
 * TASK-908 Slice 6 + 7 — anti-regresión tests para B.1 (BLOCKED excluido del
 * denominator) + B.2 (Sky canonical CSC mapping ya done via aliases).
 *
 * Spec source: docs/architecture/Contrato_Metricas_ICO_v1.md Delta 2026-05-17
 * sección B + GREENHOUSE_TASK_STATUS_LIFECYCLE_V1.md regla A.4.
 */

describe('TASK-908 Slice 6 — Fix B.1: BLOCKED excluido del denominator', () => {
  it('EXCLUDED_FROM_METRICS_STATUSES incluye Cancelado + Archivado (legacy EXCLUDED)', () => {
    expect(EXCLUDED_FROM_METRICS_STATUSES).toContain('Cancelado')
    expect(EXCLUDED_FROM_METRICS_STATUSES).toContain('Archivado')
  })

  it('EXCLUDED_FROM_METRICS_STATUSES incluye Bloqueado + En pausa (canonical V1) + Detenido (legacy)', () => {
    expect(EXCLUDED_FROM_METRICS_STATUSES).toContain('Bloqueado')
    expect(EXCLUDED_FROM_METRICS_STATUSES).toContain('En pausa')
    expect(EXCLUDED_FROM_METRICS_STATUSES).toContain('Detenido')
  })

  it('EXCLUDED_FROM_METRICS_STATUSES incluye legacy aliases Efeonce gender (Cancelada/Archivada/Archivadas)', () => {
    expect(EXCLUDED_FROM_METRICS_STATUSES).toContain('Cancelada')
    expect(EXCLUDED_FROM_METRICS_STATUSES).toContain('Archivada')
    expect(EXCLUDED_FROM_METRICS_STATUSES).toContain('Archivadas')
  })

  it('EXCLUDED_FROM_METRICS_STATUSES es UNION de EXCLUDED ∪ BLOCKED (sin duplicates en spec)', () => {
    // EXCLUDED y BLOCKED son grupos canonical disjuntos por design.
    const expected = new Set([...EXCLUDED_STATUSES, ...BLOCKED_STATUSES])

    expect(new Set(EXCLUDED_FROM_METRICS_STATUSES)).toEqual(expected)
  })

  it('EXCLUDED_FROM_METRICS_STATUSES NO incluye estados ACTIVE / COMPLETED', () => {
    // Anti-regresión: ningún estado de trabajo activo o completado debe
    // quedar excluido del denominator.
    expect(EXCLUDED_FROM_METRICS_STATUSES).not.toContain('En curso')
    expect(EXCLUDED_FROM_METRICS_STATUSES).not.toContain('Listo para revisión')
    expect(EXCLUDED_FROM_METRICS_STATUSES).not.toContain('Cambios solicitados')
    expect(EXCLUDED_FROM_METRICS_STATUSES).not.toContain('Aprobado')
    expect(EXCLUDED_FROM_METRICS_STATUSES).not.toContain('Sin empezar')
    expect(EXCLUDED_FROM_METRICS_STATUSES).not.toContain('Brief listo')
  })
})

describe('TASK-908 Slice 7 — Fix B.2: Sky canonical CSC mapping (verify ya done via aliases)', () => {
  it('Sky legacy "Tomado" mapea a briefing (alias canonical → Brief listo → briefing)', () => {
    expect(TASK_STATUS_TO_CSC['Tomado']).toBe('briefing')
  })

  it('Sky legacy "En feedback" mapea a cambios_cliente', () => {
    expect(TASK_STATUS_TO_CSC['En feedback']).toBe('cambios_cliente')
  })

  it('Sky legacy "En Feedback" (capital F) mapea a cambios_cliente', () => {
    expect(TASK_STATUS_TO_CSC['En Feedback']).toBe('cambios_cliente')
  })

  it('Sky legacy "Pendiente" mapea a briefing (canonical → Pendiente aprobación interna → briefing)', () => {
    expect(TASK_STATUS_TO_CSC['Pendiente']).toBe('briefing')
  })

  it('Sky canonical post-rename "Cambios solicitados" mapea a cambios_cliente', () => {
    expect(TASK_STATUS_TO_CSC['Cambios solicitados']).toBe('cambios_cliente')
  })

  it('Sky canonical post-rename "Listo para revisión" mapea a revision_interna', () => {
    expect(TASK_STATUS_TO_CSC['Listo para revisión']).toBe('revision_interna')
  })

  it('Efeonce legacy "Listo para diseñar" mapea a briefing (Brief listo)', () => {
    expect(TASK_STATUS_TO_CSC['Listo para diseñar']).toBe('briefing')
  })

  it('Efeonce legacy "Cambios Solicitados" (S mayúscula) mapea a cambios_cliente', () => {
    expect(TASK_STATUS_TO_CSC['Cambios Solicitados']).toBe('cambios_cliente')
  })

  it('Efeonce legacy "Pendiente Dir. Arte" mapea a briefing (Pendiente aprobación interna)', () => {
    expect(TASK_STATUS_TO_CSC['Pendiente Dir. Arte']).toBe('briefing')
  })

  it('Canonical V1 "En curso" mapea a produccion', () => {
    expect(TASK_STATUS_TO_CSC['En curso']).toBe('produccion')
  })

  it('Canonical V1 "Aprobado" + legacy aliases mapean a entrega', () => {
    expect(TASK_STATUS_TO_CSC['Aprobado']).toBe('entrega')
    expect(TASK_STATUS_TO_CSC['Listo']).toBe('entrega') // Efeonce legacy
    expect(TASK_STATUS_TO_CSC['Done']).toBe('entrega') // English variant
    expect(TASK_STATUS_TO_CSC['Finalizado']).toBe('entrega')
    expect(TASK_STATUS_TO_CSC['Completado']).toBe('entrega')
  })

  it('Bloqueado / En pausa / Detenido NO mapean a CSC (quedan en EXCLUDED_FROM_METRICS_STATUSES)', () => {
    expect(TASK_STATUS_TO_CSC['Bloqueado']).toBeUndefined()
    expect(TASK_STATUS_TO_CSC['En pausa']).toBeUndefined()
    expect(TASK_STATUS_TO_CSC['Detenido']).toBeUndefined()
  })

  it('Cancelado / Archivado / Cancelada / Archivadas NO mapean a CSC (quedan en EXCLUDED)', () => {
    expect(TASK_STATUS_TO_CSC['Cancelado']).toBeUndefined()
    expect(TASK_STATUS_TO_CSC['Archivado']).toBeUndefined()
    expect(TASK_STATUS_TO_CSC['Cancelada']).toBeUndefined()
    expect(TASK_STATUS_TO_CSC['Archivadas']).toBeUndefined()
  })
})
