// @vitest-environment jsdom

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getMicrocopy } from '@/lib/copy'
import type { PublicAssessmentView } from '@/lib/hiring/assessment/public-taking'
import { renderWithTheme } from '@/test/render'

import AssessmentTakingClient from './AssessmentTakingClient'

const copy = getMicrocopy().hiringAssessment

const question = (questionId: string, ordinal: number) => ({
  questionId,
  competencyId: 'cmp-1',
  competencyKey: 'communication',
  competencyName: 'Comunicación',
  competencyCategory: 'attitudinal' as const,
  targetLevel: 'intermedio' as const,
  level: 'intermedio' as const,
  type: 'single_choice' as const,
  prompt: `Pregunta ${ordinal}`,
  options: ['A', 'B'],
  weight: 1,
  ordinal,
})

/** Assessment en fase de gracia. `answeredCount` decide si el envío es siquiera posible. */
const graceAssessment = (answeredCount: number): PublicAssessmentView => ({
  assessment: {
    assessmentId: 'asmt-1',
    publicId: 'EO-ASM-0001',
    applicationPublicId: 'EO-APP-0001',
    status: 'in_progress',
    roleTitle: 'Content Creator',
    templateName: 'Content assessment',
    openingPublicId: 'EO-OPN-0061',
    area: 'Creative',
    seniority: 'Senior',
  },
  timing: {
    baseMinutes: 45,
    extraMinutes: 0,
    effectiveMinutes: 45,
    hasAccommodation: false,
    hasTimeLimit: true,
    databaseNowAt: '2026-08-19T11:00:00.000Z',
    startedAt: '2026-08-19T10:00:00.000Z',
    submittedAt: null,
    answerDeadlineAt: '2026-08-19T10:45:00.000Z',
    closeDeadlineAt: '2026-08-19T11:15:00.000Z',
    phase: 'submit_grace',
    expiresAt: '2026-08-19T11:15:00.000Z',
    remainingSeconds: 900,
  },
  competencies: [],
  questions: [question('qst-1', 1), question('qst-2', 2)],
  responses: Array.from({ length: answeredCount }, (_unused, index) => ({
    responseId: `resp-${index + 1}`,
    questionId: `qst-${index + 1}`,
    competencyId: 'cmp-1',
    answer: { selected: 'A' },
    updatedAt: '2026-08-19T10:30:00.000Z',
  })),
})

const installMatchMedia = () => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

const mockSubmitFailure = (status: number, code: string) => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: false,
    status,
    json: async () => ({ ok: false, code, message: 'No pudimos procesar la solicitud.' }),
  })))
}

describe('TASK-1751 — la rendición dice la verdad sobre lo que pasó', () => {
  beforeEach(installMatchMedia)
  afterEach(() => vi.unstubAllGlobals())

  it('con respuestas faltantes NO ofrece enviar, porque el servidor no puede aceptarlo', () => {
    renderWithTheme(<AssessmentTakingClient copy={copy} initialAssessment={graceAssessment(1)} />)

    // El servidor exige la evaluación completa: ofrecer el CTA sería prometer algo imposible.
    expect(screen.queryByRole('button', { name: copy.taking.submit })).not.toBeInTheDocument()
    expect(screen.getByText(copy.taking.graceBodyIncomplete, { exact: false })).toBeInTheDocument()
  })

  it('con todo guardado sí ofrece enviar y lo declara', () => {
    renderWithTheme(<AssessmentTakingClient copy={copy} initialAssessment={graceAssessment(2)} />)

    expect(screen.getByRole('button', { name: copy.taking.submit })).toBeInTheDocument()
    expect(screen.getByText(copy.taking.graceBodyComplete, { exact: false })).toBeInTheDocument()
  })

  it('declara cuántas respuestas quedaron guardadas', () => {
    renderWithTheme(<AssessmentTakingClient copy={copy} initialAssessment={graceAssessment(1)} />)

    expect(screen.getByText('Guardadas: 1 de 2.', { exact: false })).toBeInTheDocument()
  })

  it('un plazo vencido NO manda a reintentar: nombra la causa y deja copiar el texto', async () => {
    mockSubmitFailure(409, 'assessment_not_open')

    const user = userEvent.setup()

    renderWithTheme(<AssessmentTakingClient copy={copy} initialAssessment={graceAssessment(2)} />)

    await user.click(screen.getByRole('button', { name: copy.taking.submit }))
    await user.click(await screen.findByRole('button', { name: copy.taking.submit, hidden: false }))

    await waitFor(() => expect(screen.getByText(copy.taking.saveClosedBody)).toBeInTheDocument())
    expect(screen.queryByText(copy.taking.errorBody)).not.toBeInTheDocument()
  })

  it('un fallo real de sistema SÍ conserva el mensaje genérico, que es su caso legítimo', async () => {
    mockSubmitFailure(502, 'assessment_public_error')

    const user = userEvent.setup()

    renderWithTheme(<AssessmentTakingClient copy={copy} initialAssessment={graceAssessment(2)} />)

    await user.click(screen.getByRole('button', { name: copy.taking.submit }))
    await user.click(await screen.findByRole('button', { name: copy.taking.submit, hidden: false }))

    await waitFor(() => expect(screen.getByText(copy.taking.errorBody)).toBeInTheDocument())
  })
})
