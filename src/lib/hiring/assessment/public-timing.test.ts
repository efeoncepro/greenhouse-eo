import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import type { Assessment } from '@/types/hiring-assessment'

import { resolveAssessmentTiming } from './public-taking'

const STARTED_MS = Date.parse('2026-08-19T10:00:00.000Z')

const assessment = (timeLimitMinutes: number | null): Assessment => ({
  assessmentId: 'asmt-1', publicId: 'EO-ASM-1', applicationId: 'app-1', templateId: 'tpl-1',
  method: 'candidate_test', evaluatorUserId: null, status: 'in_progress', timeLimitMinutes,
  accommodations: {}, startedAt: new Date(STARTED_MS).toISOString(), submittedAt: null,
  createdBy: null, createdAt: new Date(STARTED_MS).toISOString(), updatedAt: new Date(STARTED_MS).toISOString(),
})

describe('TASK-1746 public timing phases', () => {
  it('freezes answers at answer+0 but keeps submit open until close-1', () => {
    const answerMs = STARTED_MS + 45 * 60_000
    const closeMs = answerMs + 30 * 60_000

    expect(resolveAssessmentTiming(assessment(45), answerMs)).toMatchObject({
      hasTimeLimit: true,
      phase: 'submit_grace',
      remainingSeconds: 30 * 60,
    })
    expect(resolveAssessmentTiming(assessment(45), closeMs - 1)).toMatchObject({
      phase: 'submit_grace',
      remainingSeconds: 1,
    })
    expect(resolveAssessmentTiming(assessment(45), closeMs)).toMatchObject({
      phase: 'closed',
      remainingSeconds: 0,
    })
  })

  it('gives no-limit assessments a real 24-hour close and never fabricates answer expiry', () => {
    const timing = resolveAssessmentTiming(assessment(null), STARTED_MS + 23 * 60 * 60_000)

    expect(timing).toMatchObject({
      hasTimeLimit: false,
      answerDeadlineAt: null,
      closeDeadlineAt: '2026-08-20T10:00:00.000Z',
      phase: 'answering',
      remainingSeconds: 60 * 60,
    })
  })
})
