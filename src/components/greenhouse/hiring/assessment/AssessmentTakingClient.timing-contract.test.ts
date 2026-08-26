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

    // TASK-1751: la cuenta baja de 3 a 2 A PROPÓSITO, y la asimetría es el contrato, no una excepción.
    // `readonly` NO aplica a `<input type=radio|checkbox>` por spec HTML, así que esos DOS conservan
    // `disabled`. El textarea pasa a `readOnly` porque `disabled` lo saca del tab order y su contenido
    // del árbol de accesibilidad: durante la gracia eso significa que quien usa lector de pantalla no
    // puede releer lo que escribió. Congelar sigue siendo obligatorio; ocultar el texto, no.
    expect(source.match(/disabled=\{!canAnswer\}/g)).toHaveLength(2)
    expect(source).toContain('readOnly={!canAnswer}')

    expect(source).toContain('if (!canAnswer || !currentQuestion) return undefined')
    expect(source).toContain('if (!canAnswer) return')
  })

  it('TASK-1751 — no ofrece enviar cuando el servidor no puede aceptarlo, y preserva el borrador al navegar', () => {
    // El servidor EXIGE la evaluación completa (`public-taking.ts:651-657`). Ofrecer "Enviar" con
    // respuestas faltantes es prometer algo imposible: el CTA no se renderiza en ese caso.
    expect(source).toContain('const canSubmitEverything = questions.length > 0 && savedAnswerCount === questions.length')
    expect(source).toContain("timingPhase === 'submit_grace' && !canSubmitEverything ? null : (")

    // El borrador de la pregunta que se abandona se preserva; antes lo pisaba el valor del servidor.
    expect(source).toContain('draftsRef.current[previousQuestionId] = answerRef.current')

    // La completitud se deriva en cliente: el DTO público tiene allowlists exactos testeados.
    expect(source).not.toContain('savedAnswerCount: ')
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
