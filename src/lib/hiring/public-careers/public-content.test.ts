// TASK-1740 — Contrato de contenido público estructurado (write + read paths).

import { describe, expect, it } from 'vitest'

import { HiringValidationError } from '../errors'
import {
  normalizePublicOpeningContent,
  parsePublicOpeningContent,
  PUBLIC_OPENING_CONTENT_VERSION,
} from './public-content'

const validInput = {
  version: 1,
  promise: 'Vas a liderar el motor editorial de Efeonce con autonomía real.',
  intro: 'El problema concreto: producir contenido con evidencia, no volumen.',
  outcomes: ['Publicar 8 piezas/mes con QA', 'Subir el tráfico orgánico calificado'],
  workItems: ['Investigar y redactar piezas pillar', 'Operar el calendario editorial'],
  essentials: ['Redacción en español nativo', 'SEO on-page'],
  learnables: ['AEO/GEO', 'Métricas de contenido'],
  evidenceAsk: 'Portafolio con 3 piezas publicadas y su contexto de decisión.',
  remoteModel: '100% remoto, overlap 4 horas con GMT-4, rituales async.',
  processSteps: ['Screening', 'Muestra de trabajo pagada', 'Entrevista final'],
  benefits: ['15 días hábiles de vacaciones', 'Presupuesto anual de formación'],
  compensation: { currency: 'usd', minValue: 1100, maxValue: 1300, unitText: 'month' },
}

describe('parsePublicOpeningContent — write path', () => {
  it('normaliza un bloque válido completo (currency/unitText a mayúsculas, trims)', () => {
    const content = parsePublicOpeningContent(validInput)

    expect(content).not.toBeNull()
    expect(content!.version).toBe(PUBLIC_OPENING_CONTENT_VERSION)
    expect(content!.promise).toContain('motor editorial')
    expect(content!.outcomes).toHaveLength(2)
    expect(content!.compensation).toEqual({ currency: 'USD', minValue: 1100, maxValue: 1300, unitText: 'MONTH' })
  })

  it('devuelve null para input null o bloque sin contenido', () => {
    expect(parsePublicOpeningContent(null)).toBeNull()
    expect(parsePublicOpeningContent({ version: 1, promise: '   ', outcomes: [] })).toBeNull()
  })

  it('rechaza una versión desconocida (nunca reinterpretar)', () => {
    expect(() => parsePublicOpeningContent({ version: 2, promise: 'x' })).toThrow(HiringValidationError)
  })

  it('rechaza tipos inválidos en listas y textos', () => {
    expect(() => parsePublicOpeningContent({ version: 1, outcomes: 'no-es-lista' })).toThrow(HiringValidationError)
    expect(() => parsePublicOpeningContent({ version: 1, outcomes: [42] })).toThrow(HiringValidationError)
    expect(() => parsePublicOpeningContent({ version: 1, promise: 42 })).toThrow(HiringValidationError)
  })

  it('rechaza compensación no estructurada o incoherente', () => {
    expect(() =>
      parsePublicOpeningContent({ version: 1, compensation: 'USD 1.100-1.300 mensuales' }),
    ).toThrow(HiringValidationError)
    expect(() =>
      parsePublicOpeningContent({ version: 1, compensation: { currency: 'USD', minValue: 1300, maxValue: 1100, unitText: 'MONTH' } }),
    ).toThrow(HiringValidationError)
    expect(() =>
      parsePublicOpeningContent({ version: 1, compensation: { currency: 'dólares', minValue: 1, maxValue: 2, unitText: 'MONTH' } }),
    ).toThrow(HiringValidationError)
    expect(() =>
      parsePublicOpeningContent({ version: 1, compensation: { currency: 'USD', minValue: 1, maxValue: 2, unitText: 'SPRINT' } }),
    ).toThrow(HiringValidationError)
  })

  it('rechaza listas sobredimensionadas y textos fuera de límite', () => {
    expect(() =>
      parsePublicOpeningContent({ version: 1, outcomes: Array.from({ length: 13 }, (_, i) => `item ${i}`) }),
    ).toThrow(HiringValidationError)
    expect(() => parsePublicOpeningContent({ version: 1, promise: 'x'.repeat(2001) })).toThrow(HiringValidationError)
  })
})

describe('normalizePublicOpeningContent — read path leniente', () => {
  it('normaliza el JSONB persistido (objeto o string JSON)', () => {
    const fromObject = normalizePublicOpeningContent(validInput)
    const fromString = normalizePublicOpeningContent(JSON.stringify(validInput))

    expect(fromObject?.promise).toBe(fromString?.promise)
    expect(fromString?.compensation?.currency).toBe('USD')
  })

  it('degrada a null ante corrupción o versión desconocida (fallback legacy, nunca crash)', () => {
    expect(normalizePublicOpeningContent('{corrupto')).toBeNull()
    expect(normalizePublicOpeningContent({ version: 99, promise: 'x' })).toBeNull()
    expect(normalizePublicOpeningContent({ version: 1, outcomes: 'no-lista' })).toBeNull()
    expect(normalizePublicOpeningContent(undefined)).toBeNull()
    expect(normalizePublicOpeningContent(null)).toBeNull()
  })
})
