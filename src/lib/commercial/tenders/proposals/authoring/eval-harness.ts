import 'server-only'

/**
 * Chapter-Author Eval Harness — DOMAIN-FREE (TASK-1415).
 *
 * Dado `{ author, source, goldenFraming, expectedSlides }` corre el pipeline determinista
 * completo (deriveFacts → validate → toSlides) y compara contra el golden. Es el patrón
 * eval-fixture-como-gate del dominio (`intake-agent-eval.test.ts`): DETERMINISTA, sin LLM en
 * CI — lo que se gatea es el CONTRATO que cualquier output del modelo debe atravesar en
 * runtime, más el ensamble exacto de slots.
 *
 * INVARIANTE DURO: este harness no sabe de servicios. Nada acá puede nombrar una fuente
 * (Grader, cotizador, squad) ni un concepto de servicio (escalera, dimensión, credencial).
 * El eval de CADA author aporta su source/golden; el harness sólo ejecuta y compara.
 */

import { validateChapterProposal, type ChapterAuthor, type ChapterFactSheet, type AuthoredSlide } from './chapter-author'

export interface ChapterAuthorEvalCase<Source, Framing> {
  name: string
  /** La fuente de datos del author (fixture o snapshot de un run real). */
  source: Source
  /** El framing golden — representa el output esperado del modelo. */
  goldenFraming: Framing
  /** Las láminas golden (slots EXACTOS, cifras incluidas). */
  expectedSlides: AuthoredSlide[]
}

export interface ChapterAuthorEvalFinding {
  caseName: string
  code: 'validation_rejected' | 'slides_mismatch'
  detail: string
}

export interface ChapterAuthorEvalResult {
  ok: boolean
  findings: ChapterAuthorEvalFinding[]
}

const diffPointer = (expected: unknown, actual: unknown, path = '$'): string | null => {
  if (Object.is(expected, actual)) return null

  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) {
      return `${path}.length (esperado ${expected.length}, actual ${actual.length})`
    }

    for (let index = 0; index < expected.length; index += 1) {
      const inner = diffPointer(expected[index], actual[index], `${path}[${index}]`)

      if (inner) return inner
    }

    return null
  }

  if (
    expected !== null &&
    actual !== null &&
    typeof expected === 'object' &&
    typeof actual === 'object' &&
    !Array.isArray(expected) &&
    !Array.isArray(actual)
  ) {
    const keys = new Set([...Object.keys(expected), ...Object.keys(actual)])

    for (const key of keys) {
      const inner = diffPointer(
        (expected as Record<string, unknown>)[key],
        (actual as Record<string, unknown>)[key],
        `${path}.${key}`
      )

      if (inner) return inner
    }

    return null
  }

  return `${path} (esperado ${JSON.stringify(expected)}, actual ${JSON.stringify(actual)})`
}

/**
 * Corre el pipeline determinista del author sobre cada caso y compara contra el golden.
 * Un caso falla si (a) el golden framing NO pasa la validación fail-closed, o (b) el ensamble
 * de slots difiere del esperado. El resultado nunca lanza: reporta findings (el test decide).
 */
export const runChapterAuthorEval = <Source, Facts extends ChapterFactSheet, Framing>(
  author: ChapterAuthor<Source, Facts, Framing>,
  cases: Array<ChapterAuthorEvalCase<Source, Framing>>
): ChapterAuthorEvalResult => {
  const findings: ChapterAuthorEvalFinding[] = []

  for (const evalCase of cases) {
    const facts = author.deriveFacts(evalCase.source)

    try {
      validateChapterProposal(author, evalCase.goldenFraming, facts)
    } catch (error) {
      findings.push({
        caseName: evalCase.name,
        code: 'validation_rejected',
        detail: error instanceof Error ? error.message : String(error)
      })
      continue
    }

    const slides = author.toSlides(evalCase.goldenFraming, facts)
    const diff = diffPointer(evalCase.expectedSlides, slides)

    if (diff) {
      findings.push({ caseName: evalCase.name, code: 'slides_mismatch', detail: diff })
    }
  }

  return { ok: findings.length === 0, findings }
}
