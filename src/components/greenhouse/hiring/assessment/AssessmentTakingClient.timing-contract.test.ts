import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const source = readFileSync(join(
  process.cwd(),
  'src/components/greenhouse/hiring/assessment/AssessmentTakingClient.tsx',
), 'utf8')

describe('TASK-1746 AssessmentTakingClient timing contract', () => {
  it('freezes every answer control outside answering phase and cancels autosave eligibility', () => {
    expect(source).toContain("const canAnswer = Boolean(started && timingPhase === 'answering' && !submitted)")
    expect(source.match(/disabled=\{!canAnswer\}/g)).toHaveLength(3)
    expect(source).toContain('if (!canAnswer || !currentQuestion) return undefined')
    expect(source).toContain('if (!canAnswer) return')
  })

  it('keeps submit reachable during grace and closes only at closeDeadline', () => {
    expect(source).toContain("if (timingPhase === 'submit_grace')")
    expect(source).toContain("timingPhase === 'submit_grace' || step === questions.length - 1")
    expect(source).toContain("timingPhase === 'closed'")
    expect(source).toContain('assessment?.timing.closeDeadlineAt')
    expect(source).toContain('copy.taking.submitGraceNotice')
    expect(source).toContain('copy.taking.timeToSubmit')
    expect(source).toContain('copy.taking.timeToAnswer')
    expect(source).not.toContain('setNow(Date.now())')
  })
})
