import { describe, expect, it } from 'vitest'

import { runChapterAuthorEval } from '../eval-harness'
import {
  diagnosticoChapterAuthor,
  validateDiagnosticoProposal,
  type DiagnosticoFraming
} from '../diagnostico-chapter-author'
import { deriveDiagnosticoFacts, type DiagnosticoSource } from '../diagnostico-facts'
import { confirmChapter, hashChapterFacts, validateChapterProposal } from '../chapter-author'
import { ProposalInputError } from '../../errors'
import skySnapshot from './fixtures/grader-report-sky-grun-00046.json'
import skyGolden from './fixtures/sky-deck-golden-slides.json'

/**
 * TASK-1415 Slices 3+4 — EVAL BASELINE del chapter-author de diagnóstico.
 *
 * Golden = las láminas `diagnostico` + `escalera` del deck SKY REAL (autoradas a mano, run
 * `EO-GRUN-00046`), congeladas en fixture. Este eval ES el gate para tocar el prompt o el
 * schema del author (§5-bis): mide HECHOS (igualdad exacta de slots contra el golden) y
 * FRAMING (el validador fail-closed rechaza cifra huérfana, link inventado, overflow, tags
 * fuera de contrato). Determinista — sin LLM en CI.
 */

const SOURCE: DiagnosticoSource = {
  runPublicId: 'EO-GRUN-00046',
  brandName: 'SKY Airline',
  publicReportUrl:
    'https://think.efeoncepro.com/brand-visibility/r/grt-9892e5684c394557a63f8171926871c26d3278216daf42a2a8100951ccb5537f',
  report: skySnapshot as unknown as DiagnosticoSource['report'],
  operatorFacts: [
    {
      factId: 'goal.organic-traffic',
      label: 'Visitas orgánicas mensuales del blog',
      value: '~40.000',
      evidenceRef: 'Semrush · database CL · 2026-07-11'
    }
  ]
}

/** El framing golden: EXACTAMENTE lo que un humano autoró a mano en el deck de SKY. */
const GOLDEN_FRAMING: DiagnosticoFraming = {
  eyebrow: 'EL DIAGNÓSTICO',
  title: 'La IA <em>conoce</em> a SKY. Pero su contenido <em>no está</em> en la respuesta',
  narrative: [
    'Medimos la marca antes de escribir esta propuesta, con el mismo instrumento con el que vamos a operar: nuestro AI Visibility Grader, sobre los cinco motores de respuesta, 35 respuestas resueltas.',
    'La conversación sobre viajes la alimentan fuentes de terceros — <strong>la citabilidad del contenido propio es 0%</strong>. El informe está publicado: <a href="https://think.efeoncepro.com/brand-visibility/r/grt-9892e5684c394557a63f8171926871c26d3278216daf42a2a8100951ccb5537f">puede recorrerlo entero</a>.'
  ],
  outcomesEyebrow: 'LO QUE MEDIMOS',
  outcomesTitle: 'Tres hechos, antes de proponer nada',
  goals: [
    {
      factId: 'goal.citability',
      kind: 'citability',
      title: 'Contenido propio citado',
      body: 'De las <strong>254 citas</strong> del estudio, ninguna es contenido editorial de SKY. Responden Trustpilot, Wikipedia e Instagram.'
    },
    {
      factId: 'goal.sov-gap',
      kind: 'growth',
      title: 'LATAM domina la categoría',
      body: 'LATAM se menciona <strong>16 veces</strong> y JetSMART 9. La conversación de categoría tiene dueño, y no es SKY.'
    },
    {
      factId: 'goal.organic-traffic',
      kind: 'visibility',
      title: 'El blog ya trae tráfico',
      body: 'Visitas orgánicas al mes, con páginas <strong>a un paso del top 3</strong>. No partimos de cero: partimos de un activo desaprovechado.'
    }
  ],
  ladderSectionLabel: 'DÓNDE ESTÁ SKY HOY',
  ladderTitle: 'Dos peldaños <em>firmes</em>. Tres por construir.',
  rungBodies: [
    { levelId: 'found', body: 'Aparece en menos de la mitad de las respuestas de descubrimiento de la categoría.' },
    { levelId: 'readable', body: 'La IA sabe quién es SKY y se apoya en fuentes creíbles. Fortaleza a defender.' },
    { levelId: 'correct', body: 'Cuando la IA habla de SKY, no usa su narrativa. Se corrige con contenido propio.' },
    { levelId: 'actionable', body: 'La capa técnica ausente, medida: un agente de IA no puede operar con su sitio.' },
    { levelId: 'intrinsic', body: 'SKY ya es opción por defecto dentro de la categoría. Su otra fortaleza.' }
  ],
  readout: {
    title: 'Por eso el alcance',
    body: 'La escalera es acumulativa: un peldaño no subido bloquea los de arriba. El servicio ataca los tres críticos, empezando por el primero.'
  }
}

const goldenSlides = (skyGolden as { slides: Array<{ slideId: string; contentType: string; slots: Record<string, unknown> }> })
  .slides

describe('diagnostico chapter-author eval baseline (golden = láminas SKY reales)', () => {
  it('el golden framing + el run real reproducen EXACTAMENTE las láminas autoradas a mano', () => {
    const result = runChapterAuthorEval(diagnosticoChapterAuthor, [
      {
        name: 'SKY EO-GRUN-00046',
        source: SOURCE,
        goldenFraming: GOLDEN_FRAMING,
        expectedSlides: goldenSlides
      }
    ])

    expect(result.findings).toEqual([])
    expect(result.ok).toBe(true)
  })

  it('una cifra huérfana en la narrativa RECHAZA la propuesta completa', () => {
    const facts = deriveDiagnosticoFacts(SOURCE)

    const framing: DiagnosticoFraming = {
      ...GOLDEN_FRAMING,
      narrative: ['El estudio resolvió 480 respuestas en total.', GOLDEN_FRAMING.narrative[1]]
    }

    expect(() => validateChapterProposal(diagnosticoChapterAuthor, framing, facts)).toThrow(ProposalInputError)
  })

  it('un link inventado RECHAZA (las URLs entran como hechos, nunca desde el modelo)', () => {
    const facts = deriveDiagnosticoFacts(SOURCE)

    const framing: DiagnosticoFraming = {
      ...GOLDEN_FRAMING,
      narrative: [
        GOLDEN_FRAMING.narrative[0],
        'El informe vive en <a href="https://ejemplo-inventado.com/reporte">este link</a>.'
      ]
    }

    expect(() => validateChapterProposal(diagnosticoChapterAuthor, framing, facts)).toThrow(ProposalInputError)
  })

  it('un goal que refiere un hecho-titular inexistente RECHAZA', () => {
    const facts = deriveDiagnosticoFacts(SOURCE)

    const framing: DiagnosticoFraming = {
      ...GOLDEN_FRAMING,
      goals: [{ ...GOLDEN_FRAMING.goals[0], factId: 'goal.fantasma' }, ...GOLDEN_FRAMING.goals.slice(1)]
    }

    expect(() => validateDiagnosticoProposal(framing, facts)).toThrow(ProposalInputError)
  })

  it('un peldaño sin body RECHAZA (los 5 se enmarcan, ninguno queda mudo)', () => {
    const facts = deriveDiagnosticoFacts(SOURCE)
    const framing: DiagnosticoFraming = { ...GOLDEN_FRAMING, rungBodies: GOLDEN_FRAMING.rungBodies.slice(0, 4) }

    expect(() => validateDiagnosticoProposal(framing, facts)).toThrow(ProposalInputError)
  })

  it('overflow RECHAZA, nunca se trunca (título > 106 visibles)', () => {
    const facts = deriveDiagnosticoFacts(SOURCE)
    const framing: DiagnosticoFraming = { ...GOLDEN_FRAMING, title: 'x'.repeat(107) }

    expect(() => validateDiagnosticoProposal(framing, facts)).toThrow(ProposalInputError)
  })

  it('un tag fuera del contrato RECHAZA (title sólo admite <em>)', () => {
    const facts = deriveDiagnosticoFacts(SOURCE)
    const framing: DiagnosticoFraming = { ...GOLDEN_FRAMING, title: 'La IA <strong>conoce</strong> a SKY' }

    expect(() => validateDiagnosticoProposal(framing, facts)).toThrow(ProposalInputError)
  })

  it('el confirm exige actor member y re-valida (el agente NUNCA confirma)', () => {
    const facts = deriveDiagnosticoFacts(SOURCE)
    const proposal = { chapterId: 'diagnostico', facts, framing: GOLDEN_FRAMING }
    const trace = { factsHash: hashChapterFacts(facts), model: 'eval', proposedAt: '2026-07-16T00:00:00Z' }

    expect(() =>
      confirmChapter(diagnosticoChapterAuthor, {
        proposal,
        trace,
        actor: { kind: 'agent' as never, memberId: undefined as never }
      })
    ).toThrow(ProposalInputError)

    const confirmed = confirmChapter(diagnosticoChapterAuthor, {
      proposal,
      trace,
      actor: { kind: 'member', memberId: 'member-eval' }
    })

    expect(confirmed.slides).toEqual(goldenSlides)
    expect(confirmed.idempotencyKey).toMatch(/^chapter-author-[0-9a-f]{32}$/)
  })
})
