import { describe, expect, it } from 'vitest'

import {
  assertQuantifiedClaimsAreEvidenced,
  collectStringLeaves,
  confirmChapter,
  hashChapterFacts,
  proposeChapter,
  validateChapterProposal,
  type ChapterAuthor,
  type ChapterFactSheet,
  type ChapterProposal
} from '../chapter-author'
import { ProposalInputError } from '../../errors'

/**
 * TASK-1415 Slice 1 — contrato de la máquina compartida del chapter-author.
 *
 * El author de prueba es DELIBERADAMENTE sintético (ningún servicio real): la máquina no puede
 * saber de servicios, y este test lo ejercita sin ninguno.
 */

interface TestFraming {
  title: string
  bodies: string[]
}

const FACTS: ChapterFactSheet = {
  facts: [
    { factId: 'metric.a', label: 'Métrica A', value: '254', numericValue: 254, evidenceRef: 'Fuente X · 2026-07' },
    { factId: 'metric.b', label: 'Métrica B', value: '0%', numericValue: 0, evidenceRef: 'Fuente X · 2026-07' }
  ]
}

const testAuthor: ChapterAuthor<ChapterFactSheet, ChapterFactSheet, TestFraming> = {
  chapterId: 'test-chapter',
  deriveFacts: source => source,
  framingSchema: { type: 'object' },
  systemPrompt: 'test',
  buildPrompt: () => 'test',
  validate: framing => {
    if (framing.title.trim().length === 0) {
      throw new ProposalInputError('El título no puede ser vacío.')
    }
  },
  toSlides: (framing, facts) => [
    {
      slideId: 'test',
      contentType: 'narrative',
      slots: { title: framing.title, metric: facts.facts[0].value }
    }
  ]
}

const GOLDEN: ChapterProposal<ChapterFactSheet, TestFraming> = {
  chapterId: 'test-chapter',
  facts: FACTS,
  framing: { title: 'Las 254 citas del estudio', bodies: ['La citabilidad es 0%.'] }
}

const TRACE = { factsHash: hashChapterFacts(FACTS), model: 'test', proposedAt: '2026-07-16T00:00:00Z' }
const MEMBER = { kind: 'member' as const, memberId: 'member-1' }

describe('chapter-author engine (máquina compartida, servicio-agnóstica)', () => {
  it('collectStringLeaves junta todas las hojas string de un framing anidado', () => {
    expect(collectStringLeaves({ a: 'x', b: ['y', { c: 'z', n: 3 }] }).sort()).toEqual(['x', 'y', 'z'])
  })

  it('una cifra respaldada por un hecho pasa el guard', () => {
    expect(() =>
      assertQuantifiedClaimsAreEvidenced({ t: 'De las 254 citas, 0% propias' }, FACTS.facts)
    ).not.toThrow()
  })

  it('una cifra huérfana RECHAZA la propuesta completa (anti-fabricación mecanizada)', () => {
    expect(() =>
      assertQuantifiedClaimsAreEvidenced({ t: 'Crecimos 87% este año' }, FACTS.facts)
    ).toThrow(ProposalInputError)
  })

  it('un dígito suelto de prosa queda fuera del guard mecánico (lo cubre el author + humano)', () => {
    expect(() => assertQuantifiedClaimsAreEvidenced({ t: 'las 3 fases del plan' }, FACTS.facts)).not.toThrow()
  })

  it('un hecho sin evidenceRef RECHAZA aunque el framing sea limpio', () => {
    const sinEvidencia: ChapterFactSheet = {
      facts: [{ factId: 'x', label: 'X', value: '10', evidenceRef: '' }]
    }

    expect(() => validateChapterProposal(testAuthor, { title: 'ok', bodies: [] }, sinEvidencia)).toThrow(
      ProposalInputError
    )
  })

  it('la validación compartida delega también en el validador del author', () => {
    expect(() => validateChapterProposal(testAuthor, { title: '  ', bodies: [] }, FACTS)).toThrow(
      ProposalInputError
    )
  })

  it('confirmChapter exige actor member (el agente NUNCA confirma)', () => {
    expect(() =>
      confirmChapter(testAuthor, {
        proposal: GOLDEN,
        trace: TRACE,
        actor: { kind: 'service' as never, memberId: undefined as never }
      })
    ).toThrow(ProposalInputError)
  })

  it('confirmChapter emite las slides deterministas + idempotencyKey estable', () => {
    const first = confirmChapter(testAuthor, { proposal: GOLDEN, trace: TRACE, actor: MEMBER })
    const second = confirmChapter(testAuthor, { proposal: GOLDEN, trace: TRACE, actor: MEMBER })

    expect(first.slides).toEqual([
      { slideId: 'test', contentType: 'narrative', slots: { title: GOLDEN.framing.title, metric: '254' } }
    ])
    expect(first.idempotencyKey).toBe(second.idempotencyKey)
    expect(first.idempotencyKey).toMatch(/^chapter-author-[0-9a-f]{32}$/)
  })

  it('confirmChapter rechaza una propuesta de otro capítulo', () => {
    expect(() =>
      confirmChapter(testAuthor, {
        proposal: { ...GOLDEN, chapterId: 'otro' },
        trace: TRACE,
        actor: MEMBER
      })
    ).toThrow(ProposalInputError)
  })

  it('proposeChapter con flag OFF rechaza sin tocar el LLM (default OFF)', async () => {
    delete process.env.TENDER_CHAPTER_AUTHOR_ENABLED

    await expect(
      proposeChapter(testAuthor, { source: FACTS, operatorBrief: 'test' })
    ).rejects.toThrow(ProposalInputError)
  })

  it('el hash de hechos es determinista (la traza es reproducible)', () => {
    expect(hashChapterFacts(FACTS)).toBe(hashChapterFacts({ ...FACTS }))
    expect(hashChapterFacts(FACTS)).toMatch(/^[0-9a-f]{64}$/)
  })
})
