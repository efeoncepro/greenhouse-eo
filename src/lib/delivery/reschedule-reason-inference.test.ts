import { describe, expect, it } from 'vitest'

import {
  inferRescheduleReason,
  notionReasonOptionToCode,
  NOTION_RESCHEDULE_REASON_OPTION_TO_CODE,
  RESCHEDULE_REASON_CODE_TO_NOTION_OPTION,
  RESCHEDULE_REASON_CODES
} from './reschedule-reason-inference'

describe('inferRescheduleReason (TASK-921)', () => {
  it('estado Bloqueado al cambio → external_blocker (high)', () => {
    expect(
      inferRescheduleReason({ statusAtChange: 'Bloqueado', recentTransitions: [], daysDelta: 5 })
    ).toEqual({ reasonCode: 'external_blocker', reasonConfidence: 'high' })
  })

  it('transición reciente a Bloqueado → external_blocker (medium)', () => {
    expect(
      inferRescheduleReason({
        statusAtChange: 'En curso',
        recentTransitions: [{ toStatus: 'Bloqueado', transitionedAt: '2026-05-20T10:00:00Z' }],
        daysDelta: 3
      })
    ).toEqual({ reasonCode: 'external_blocker', reasonConfidence: 'medium' })
  })

  it('transición reciente a Cambios solicitados → client_requested (medium)', () => {
    expect(
      inferRescheduleReason({
        statusAtChange: 'En curso',
        recentTransitions: [{ toStatus: 'Cambios solicitados', transitionedAt: '2026-05-21T09:00:00Z' }],
        daysDelta: 4
      })
    ).toEqual({ reasonCode: 'client_requested', reasonConfidence: 'medium' })
  })

  it('Bloqueado gana sobre Cambios solicitados (prioridad de señal)', () => {
    expect(
      inferRescheduleReason({
        statusAtChange: 'Bloqueado',
        recentTransitions: [{ toStatus: 'Cambios solicitados', transitionedAt: '2026-05-21T09:00:00Z' }],
        daysDelta: 4
      })
    ).toEqual({ reasonCode: 'external_blocker', reasonConfidence: 'high' })
  })

  it('estado En pausa → internal_not_prioritized (medium)', () => {
    expect(
      inferRescheduleReason({ statusAtChange: 'En pausa', recentTransitions: [], daysDelta: 7 })
    ).toEqual({ reasonCode: 'internal_not_prioritized', reasonConfidence: 'medium' })
  })

  it('estado Sin empezar → internal_not_prioritized (low)', () => {
    expect(
      inferRescheduleReason({ statusAtChange: 'Sin empezar', recentTransitions: [], daysDelta: 2 })
    ).toEqual({ reasonCode: 'internal_not_prioritized', reasonConfidence: 'low' })
  })

  it('sin señal → unspecified (low, conservador)', () => {
    expect(
      inferRescheduleReason({ statusAtChange: 'En curso', recentTransitions: [], daysDelta: 1 })
    ).toEqual({ reasonCode: 'unspecified', reasonConfidence: 'low' })
  })

  it('status null + sin transiciones → unspecified (low)', () => {
    expect(
      inferRescheduleReason({ statusAtChange: null, recentTransitions: [], daysDelta: null })
    ).toEqual({ reasonCode: 'unspecified', reasonConfidence: 'low' })
  })

  it('NUNCA infiere scope_change (solo operador lo confirma)', () => {
    const inputs = [
      { statusAtChange: 'Bloqueado', recentTransitions: [], daysDelta: 5 },
      { statusAtChange: 'En curso', recentTransitions: [{ toStatus: 'Cambios solicitados', transitionedAt: 'x' }], daysDelta: 3 },
      { statusAtChange: 'En pausa', recentTransitions: [], daysDelta: 2 },
      { statusAtChange: null, recentTransitions: [], daysDelta: null }
    ]

    for (const input of inputs) {
      expect(inferRescheduleReason(input).reasonCode).not.toBe('scope_change')
    }
  })

  it('daysDelta negativo (fecha adelantada) no rompe — usa la misma lógica', () => {
    expect(
      inferRescheduleReason({ statusAtChange: 'En curso', recentTransitions: [], daysDelta: -3 })
    ).toEqual({ reasonCode: 'unspecified', reasonConfidence: 'low' })
  })
})

describe('notionReasonOptionToCode (TASK-921)', () => {
  it('mapea cada label es-CL a su código canonical', () => {
    expect(notionReasonOptionToCode('Solicitud del cliente')).toBe('client_requested')
    expect(notionReasonOptionToCode('Cambio de alcance')).toBe('scope_change')
    expect(notionReasonOptionToCode('Bloqueo externo')).toBe('external_blocker')
    expect(notionReasonOptionToCode('No priorizado (interno)')).toBe('internal_not_prioritized')
  })

  it('trim del label antes de mapear', () => {
    expect(notionReasonOptionToCode('  Solicitud del cliente  ')).toBe('client_requested')
  })

  it('label fuera del vocabulario / vacío / null → null (sin confirmación)', () => {
    expect(notionReasonOptionToCode('Otra cosa')).toBeNull()
    expect(notionReasonOptionToCode('')).toBeNull()
    expect(notionReasonOptionToCode(null)).toBeNull()
    expect(notionReasonOptionToCode(undefined)).toBeNull()
  })
})

describe('vocabulario reason (paridad maps ↔ enum)', () => {
  it('cada option-to-code resuelve a un código canonical válido', () => {
    for (const code of Object.values(NOTION_RESCHEDULE_REASON_OPTION_TO_CODE)) {
      expect(RESCHEDULE_REASON_CODES).toContain(code)
    }
  })

  it('code-to-option es el inverso exacto de option-to-code (sin unspecified)', () => {
    for (const [code, option] of Object.entries(RESCHEDULE_REASON_CODE_TO_NOTION_OPTION)) {
      expect(NOTION_RESCHEDULE_REASON_OPTION_TO_CODE[option]).toBe(code)
    }
  })

  it('unspecified NO tiene option Notion (ausencia = unspecified)', () => {
    expect(Object.values(NOTION_RESCHEDULE_REASON_OPTION_TO_CODE)).not.toContain('unspecified')
  })
})
