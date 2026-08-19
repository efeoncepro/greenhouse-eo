// @vitest-environment jsdom

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getMicrocopy } from '@/lib/copy'
import type { PublicAssessmentView } from '@/lib/hiring/assessment/public-taking'
import { renderWithTheme } from '@/test/render'

import AssessmentTakingClient from './AssessmentTakingClient'

const copy = getMicrocopy().hiringAssessment

const assessment: PublicAssessmentView = {
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
  questions: [{
    questionId: 'qst-1',
    competencyId: 'cmp-1',
    competencyKey: 'communication',
    competencyName: 'Comunicación',
    competencyCategory: 'attitudinal',
    targetLevel: 'intermedio',
    level: 'intermedio',
    type: 'single_choice',
    prompt: 'Selecciona una respuesta',
    options: ['A', 'B'],
    weight: 1,
    ordinal: 1,
  }],
  responses: [{
    responseId: 'resp-1',
    questionId: 'qst-1',
    competencyId: 'cmp-1',
    answer: { selected: 'A' },
    updatedAt: '2026-08-19T10:30:00.000Z',
  }],
}

const installMatchMedia = (reducedMotion: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((query: string) => ({
      matches: reducedMotion && query === '(prefers-reduced-motion: reduce)',
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

describe('AssessmentTakingClient submit dialog', () => {
  beforeEach(() => installMatchMedia(false))

  it('usa foco inicial, trap de Tab, Escape y restaura foco al CTA', async () => {
    const user = userEvent.setup()

    renderWithTheme(<AssessmentTakingClient copy={copy} initialAssessment={assessment} />)

    const trigger = screen.getByRole('button', { name: copy.taking.submit })

    await user.click(trigger)

    const dialog = await screen.findByRole('dialog', { name: copy.taking.submitTitle })
    const cancel = within(dialog).getByRole('button', { name: copy.taking.cancel })
    const confirm = within(dialog).getByRole('button', { name: copy.taking.submit })

    await waitFor(() => expect(cancel).toHaveFocus())
    await user.tab()
    expect(confirm).toHaveFocus()
    await user.tab()
    expect(cancel).toHaveFocus()
    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })

  it('desactiva la transición del primitive cuando el usuario prefiere movimiento reducido', async () => {
    installMatchMedia(true)
    const user = userEvent.setup()

    renderWithTheme(<AssessmentTakingClient copy={copy} initialAssessment={assessment} />)

    await user.click(screen.getByRole('button', { name: copy.taking.submit }))
    await screen.findByRole('dialog')

    const backdrop = document.querySelector<HTMLElement>('.MuiBackdrop-root')

    expect(backdrop).not.toBeNull()
    expect(backdrop?.style.transitionDuration).toBe('0ms')
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
  })
})
