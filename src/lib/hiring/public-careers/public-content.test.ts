// TASK-1740 — Contrato canónico v2 de contenido público (write + read paths).

import { describe, expect, it } from 'vitest'

import { HiringValidationError } from '../errors'
import {
  normalizePublicOpeningContent,
  parsePublicOpeningContent,
  parseRemoteEligibleCountries,
  PUBLIC_OPENING_CONTENT_VERSION
} from './public-content'

const validInput = {
  version: 2,
  promise: 'Vas a liderar el motor editorial de Efeonce con autonomía real.',
  intro: 'El problema concreto: producir contenido con evidencia, no volumen.',
  outcomes: ['Publicar 8 piezas/mes con QA', 'Subir el tráfico orgánico calificado', 'Dejar un playbook reusable'],
  workItems: [
    'Investigar y redactar piezas pillar',
    'Operar el calendario editorial',
    'Colaborar con SEO/AEO',
    'Documentar decisiones'
  ],
  essentials: ['Redacción en español nativo', 'SEO on-page', 'Research verificable', 'Criterio editorial'],
  preferred: ['Experiencia en agencia'],
  learnables: ['AEO/GEO', 'Métricas de contenido'],
  evidenceAsk: 'Portafolio con 3 piezas publicadas y su contexto de decisión.',
  workModel: '100% remoto, overlap 4 horas con GMT-4, rituales async.',
  collaboration: {
    team: 'Content, SEO/AEO y cuentas',
    reportsTo: 'Content Lead',
    language: 'Español e inglés profesional',
    timezoneOverlap: '4 horas con GMT-4',
    workingRhythm: 'Asíncrono con una sincronización semanal'
  },
  process: {
    steps: [
      { title: 'Screening', body: 'Revisamos experiencia y evidencia.' },
      { title: 'Muestra pagada', body: 'Resolvemos un brief acotado.' },
      { title: 'Entrevista final', body: 'Profundizamos en decisiones y expectativas.' }
    ],
    expectedTiming: 'Entre 2 y 3 semanas.',
    responseCommitment: 'Comunicamos la decisión final.',
    accommodationPath: 'Puedes solicitar adaptaciones en cualquier etapa.'
  },
  benefits: ['Encuentro presencial anual del equipo, sujeto a planificación.'],
  compensation: { currency: 'usd', minValue: 1100, maxValue: 1300, unitText: 'month' },
  additionalSections: [
    {
      title: 'Primeros 90 días',
      format: 'milestones',
      intro: 'Autonomía progresiva.',
      items: ['Conocer el sistema', 'Publicar con acompañamiento']
    }
  ]
}

describe('parsePublicOpeningContent — write path v2', () => {
  it('normaliza el contrato completo', () => {
    const content = parsePublicOpeningContent(validInput)

    expect(content?.version).toBe(PUBLIC_OPENING_CONTENT_VERSION)
    expect(content?.outcomes).toHaveLength(3)
    expect(content?.additionalSections).toHaveLength(1)
    expect(content?.compensation).toEqual({ currency: 'USD', minValue: 1100, maxValue: 1300, unitText: 'MONTH' })
  })

  it('devuelve null sólo para input null y rechaza un bloque incompleto', () => {
    expect(parsePublicOpeningContent(null)).toBeNull()
    expect(() => parsePublicOpeningContent({ version: 2, promise: '   ', outcomes: [] })).toThrow(HiringValidationError)
  })

  it('rechaza v1 en writes y cualquier versión desconocida', () => {
    expect(() => parsePublicOpeningContent({ version: 1, promise: 'x' })).toThrow(HiringValidationError)
    expect(() => parsePublicOpeningContent({ version: 99, promise: 'x' })).toThrow(HiringValidationError)
  })

  it('rechaza tipos, cardinalidades y textos inválidos', () => {
    expect(() => parsePublicOpeningContent({ ...validInput, outcomes: 'no-es-lista' })).toThrow(HiringValidationError)
    expect(() => parsePublicOpeningContent({ ...validInput, outcomes: [42] })).toThrow(HiringValidationError)
    expect(() => parsePublicOpeningContent({ ...validInput, outcomes: ['Uno', 'Dos'] })).toThrow(HiringValidationError)
    expect(() => parsePublicOpeningContent({ ...validInput, workItems: ['Uno', 'Dos', 'Tres'] })).toThrow(
      HiringValidationError
    )
    expect(() => parsePublicOpeningContent({ ...validInput, promise: 'x'.repeat(2001) })).toThrow(HiringValidationError)
  })

  it('rechaza compensación no estructurada o incoherente', () => {
    expect(() => parsePublicOpeningContent({ ...validInput, compensation: 'USD 1.100-1.300 mensuales' })).toThrow(
      HiringValidationError
    )

    for (const compensation of [
      { currency: 'USD', minValue: 1300, maxValue: 1100, unitText: 'MONTH' },
      { currency: 'dólares', minValue: 1, maxValue: 2, unitText: 'MONTH' },
      { currency: 'USD', minValue: 1, maxValue: 2, unitText: 'SPRINT' },
      { currency: 'ZZZ', minValue: 1, maxValue: 2, unitText: 'MONTH' },
      { currency: 'USD', minValue: true, maxValue: [2], unitText: 'MONTH' }
    ]) {
      expect(() => parsePublicOpeningContent({ ...validInput, compensation })).toThrow(HiringValidationError)
    }
  })

  it('limita extensiones a tres bloques y a formatos seguros', () => {
    const section = { title: 'Contexto', format: 'bullets', intro: null, items: ['Uno'] }

    expect(() =>
      parsePublicOpeningContent({ ...validInput, additionalSections: [section, section, section, section] })
    ).toThrow(HiringValidationError)
    expect(() =>
      parsePublicOpeningContent({ ...validInput, additionalSections: [{ ...section, format: 'html' }] })
    ).toThrow(HiringValidationError)
    expect(() =>
      parsePublicOpeningContent({
        ...validInput,
        additionalSections: [{ title: 'Vacío', format: 'narrative', intro: null, items: [] }]
      })
    ).toThrow(HiringValidationError)
  })
})

describe('normalizePublicOpeningContent — read path leniente', () => {
  it('normaliza v2 persistido desde objeto o JSON', () => {
    const fromObject = normalizePublicOpeningContent(validInput)
    const fromString = normalizePublicOpeningContent(JSON.stringify(validInput))

    expect(fromObject?.promise).toBe(fromString?.promise)
    expect(fromString?.compensation?.currency).toBe('USD')
  })

  it('normaliza v1 sólo para lectura y mapea campos al shape vigente', () => {
    const legacy = normalizePublicOpeningContent({
      version: 1,
      promise: 'Promesa legacy',
      remoteModel: 'Remoto con overlap.',
      processSteps: ['Screening', 'Entrevista']
    })

    expect(legacy?.version).toBe(1)
    expect(legacy?.workModel).toBe('Remoto con overlap.')
    expect(legacy?.process?.steps.map(step => step.title)).toEqual(['Screening', 'Entrevista'])
    expect(legacy?.additionalSections).toEqual([])
  })

  it('degrada a null ante corrupción o versión desconocida', () => {
    expect(normalizePublicOpeningContent('{corrupto')).toBeNull()
    expect(normalizePublicOpeningContent({ version: 99, promise: 'x' })).toBeNull()
    expect(normalizePublicOpeningContent({ version: 1, outcomes: 'no-lista' })).toBeNull()
    expect(normalizePublicOpeningContent(undefined)).toBeNull()
    expect(normalizePublicOpeningContent(null)).toBeNull()
  })
})

describe('parseRemoteEligibleCountries — elegibilidad remota', () => {
  it('normaliza a mayúsculas, deduplica y acepta ISO alpha-2 reales', () => {
    expect(parseRemoteEligibleCountries(['cl', 'CO', 'cl'])).toEqual(['CL', 'CO'])
    expect(parseRemoteEligibleCountries(null)).toEqual([])
  })

  it('rechaza regiones libres y códigos inválidos', () => {
    expect(() => parseRemoteEligibleCountries(['LATAM'])).toThrow(HiringValidationError)
    expect(() => parseRemoteEligibleCountries(['Global'])).toThrow(HiringValidationError)
    expect(() => parseRemoteEligibleCountries(['XX'])).toThrow(HiringValidationError)
    expect(() => parseRemoteEligibleCountries('CL')).toThrow(HiringValidationError)
  })
})
