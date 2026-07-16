import 'server-only'

/**
 * Diagnóstico (SEO/AEO) — el chapter-author (TASK-1415 Slice 4): la PRIMERA implementación
 * completa del motor. Enmarca los hechos del mapper (`diagnostico-facts.ts`) en las dos láminas
 * del capítulo de diagnóstico del deck:
 *
 *   `diagnostico` → contentType `one-metric`     (la tesis + los hechos-titular)
 *   `escalera`    → contentType `maturity-ladder` (los 5 peldaños Be Found … Be Intrinsic)
 *
 * El LLM produce SOLO framing (títulos, narrativa, cuerpos): las cifras (`metric`, `score`),
 * los `evidenceRef`, el subject y las anclas de la escalera se inyectan DESDE LOS HECHOS en
 * `toSlides` — nunca pasan por el modelo. El author declara `contentType` + slots, jamás
 * `template` (el selector del catálogo resuelve; `TemplateAuthorityError` si se contradice).
 *
 * El prompt de este author está GATEADO por su eval
 * (`__tests__/diagnostico-chapter-author-eval.test.ts`, golden = las láminas SKY autoradas a
 * mano, run `EO-GRUN-00046`): no se toca prompt/schema sin el eval verde (§5-bis).
 */

import { ProposalInputError } from '../errors'
import {
  visibleTextLength,
  type ChapterAuthor,
  type EvidencedFact
} from './chapter-author'
import type { DiagnosticoFacts, DiagnosticoSource } from './diagnostico-facts'
import { deriveDiagnosticoFacts } from './diagnostico-facts'
import type { ReportLevelId } from '@/components/growth/ai-visibility/report-artifact/model'
import { REPORT_LEVEL_IDS } from '@/components/growth/ai-visibility/report-artifact/model'

// ─────────────────────────────────────────────────────────────────────────────
// Constantes de presentación del capítulo (deterministas — NO las decide el LLM)
// ─────────────────────────────────────────────────────────────────────────────

/** Etiquetas es-CL de los peldaños (el framework de la escalera, ya aprobado en el deck SKY). */
const RUNG_LABELS: Record<ReportLevelId, string> = {
  found: 'Que te encuentre',
  readable: 'Que te entienda',
  correct: 'Que te describa bien',
  actionable: 'Que pueda actuar',
  intrinsic: 'Que te prefiera'
}

/** Visual curado del capítulo (asset del catálogo; la curaduría de assets es humana). */
const DIAGNOSTICO_VISUAL = 'assets/clay3d/clay-ai-visibility.png'

/** Kinds del contrato de goals de la lámina (enum cerrado del slot contract). */
const GOAL_KINDS = ['visibility', 'citability', 'coherence', 'learning', 'growth'] as const

type GoalKind = (typeof GOAL_KINDS)[number]

// ─────────────────────────────────────────────────────────────────────────────
// Framing — lo ÚNICO que produce el LLM
// ─────────────────────────────────────────────────────────────────────────────

export interface DiagnosticoFraming {
  /** Kicker de la lámina de diagnóstico (p. ej. `EL DIAGNÓSTICO`). */
  eyebrow: string
  /** Título de la tesis (rich; sólo `<em>`). */
  title: string
  /** 1–2 párrafos de narrativa (pueden citar hechos y el link del informe — ya allowlisted). */
  narrative: string[]
  outcomesEyebrow: string
  outcomesTitle: string
  /** Cada goal enmarca UN hecho-titular; la cifra y su fuente se inyectan del hecho. */
  goals: Array<{ factId: string; kind: GoalKind; title: string; body: string }>
  /** Lámina de escalera. */
  ladderSectionLabel: string
  ladderTitle: string
  /** Un cuerpo por peldaño (los 5). */
  rungBodies: Array<{ levelId: ReportLevelId; body: string }>
  readout: { title: string; body: string }
}

const DIAGNOSTICO_SCHEMA = {
  type: 'object' as const,
  additionalProperties: false,
  required: [
    'eyebrow',
    'title',
    'narrative',
    'outcomesEyebrow',
    'outcomesTitle',
    'goals',
    'ladderSectionLabel',
    'ladderTitle',
    'rungBodies',
    'readout'
  ],
  properties: {
    eyebrow: { type: 'string' },
    title: { type: 'string' },
    narrative: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 2 },
    outcomesEyebrow: { type: 'string' },
    outcomesTitle: { type: 'string' },
    goals: {
      type: 'array',
      minItems: 3,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['factId', 'kind', 'title', 'body'],
        properties: {
          factId: { type: 'string' },
          kind: { type: 'string', enum: [...GOAL_KINDS] },
          title: { type: 'string' },
          body: { type: 'string' }
        }
      }
    },
    ladderSectionLabel: { type: 'string' },
    ladderTitle: { type: 'string' },
    rungBodies: {
      type: 'array',
      minItems: 5,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['levelId', 'body'],
        properties: {
          levelId: { type: 'string', enum: [...REPORT_LEVEL_IDS] },
          body: { type: 'string' }
        }
      }
    },
    readout: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'body'],
      properties: {
        title: { type: 'string' },
        body: { type: 'string' }
      }
    }
  }
}

const DIAGNOSTICO_SYSTEM = `Eres el chapter-author de diagnóstico (SEO/AEO) de Greenhouse (Efeonce).
Tu única salida es el framing ESTRUCTURADO de las dos láminas de diagnóstico de una propuesta
comercial, derivado EXCLUSIVAMENTE de los hechos con evidencia provistos. Reglas duras:
- NUNCA introduzcas una cifra que no esté en los hechos. Tu trabajo es ENMARCAR los hechos,
  no producir datos. Una cifra huérfana rechaza tu propuesta completa.
- NUNCA inventes URLs: el único link permitido es el que venga como hecho (el informe público).
- Cada goal enmarca UN hecho-titular (factId del listado de goals). No escribas la cifra en el
  campo metric — eso lo hace el sistema desde el hecho; tu body puede citarla textualmente.
- Cada peldaño de la escalera (los 5 levelId) lleva UN body que interpreta su score sin
  repetirlo mecánicamente: qué significa ese nivel para la marca, en una frase.
- Registro institucional formal es-CL: la propuesta se dirige al comité DE USTED y habla del
  cliente en tercera persona. Sin tuteo al comité, sin modismos.
- Sé sobrio: es un documento contractual que evalúa un comité, no una pieza publicitaria.
- Respeta los límites de largo declarados en el brief (el sistema rechaza overflow).
Tú PROPONES; un humano confirma. No des por hecho que tu propuesta se ejecuta.`

// ─────────────────────────────────────────────────────────────────────────────
// Validación fail-closed por-author (espejo de validateProposalIntakeProposal)
// ─────────────────────────────────────────────────────────────────────────────

const assertLength = (field: string, value: string, max: number): void => {
  const length = visibleTextLength(value)

  if (length === 0) {
    throw new ProposalInputError(`El framing de diagnóstico dejó "${field}" vacío.`)
  }

  if (length > max) {
    throw new ProposalInputError(
      `"${field}" excede el contrato de la lámina (${length} > ${max} caracteres visibles): overflow se rechaza, nunca se trunca.`
    )
  }
}

const assertAllowedTags = (field: string, value: string, allowed: string[]): void => {
  for (const match of value.matchAll(/<\/?([a-z]+)[^>]*>/gi)) {
    if (!allowed.includes(match[1].toLowerCase())) {
      throw new ProposalInputError(
        `"${field}" usa un tag fuera del contrato de la lámina: <${match[1]}> (permitidos: ${allowed.join(', ') || 'ninguno'}).`
      )
    }
  }
}

export const validateDiagnosticoProposal = (framing: DiagnosticoFraming, facts: DiagnosticoFacts): void => {
  // Lámina diagnostico (contrato stat-split: eyebrow 32 · title 106 · narrative 2×220 · outcomesTitle 74)
  assertLength('eyebrow', framing.eyebrow, 32)
  assertLength('title', framing.title, 106)
  assertAllowedTags('title', framing.title, ['em'])
  assertLength('outcomesEyebrow', framing.outcomesEyebrow, 32)
  assertLength('outcomesTitle', framing.outcomesTitle, 74)

  if (framing.narrative.length < 1 || framing.narrative.length > 2) {
    throw new ProposalInputError('La narrativa de diagnóstico lleva 1 o 2 párrafos.')
  }

  framing.narrative.forEach((paragraph, index) => {
    assertLength(`narrative[${index}]`, paragraph, 220)
    assertAllowedTags(`narrative[${index}]`, paragraph, ['strong', 'em', 'a'])
  })

  if (framing.goals.length < 3 || framing.goals.length > 5) {
    throw new ProposalInputError('La lámina de diagnóstico compone entre 3 y 5 goals.')
  }

  const goalFacts = new Map(facts.goals.map(goal => [goal.factId, goal]))
  const seenGoals = new Set<string>()

  for (const goal of framing.goals) {
    if (!goalFacts.has(goal.factId)) {
      throw new ProposalInputError(
        `El goal refiere un hecho-titular inexistente: "${goal.factId}". El author no inventa métricas.`
      )
    }

    if (seenGoals.has(goal.factId)) {
      throw new ProposalInputError(`El hecho "${goal.factId}" aparece en más de un goal.`)
    }

    seenGoals.add(goal.factId)

    if (!GOAL_KINDS.includes(goal.kind)) {
      throw new ProposalInputError(`kind de goal fuera del enum del contrato: "${goal.kind}".`)
    }

    assertLength(`goal(${goal.factId}).title`, goal.title, 40)
    assertLength(`goal(${goal.factId}).body`, goal.body, 220)
    assertAllowedTags(`goal(${goal.factId}).body`, goal.body, ['strong', 'em', 'a'])
  }

  // Lámina escalera (contrato maturity-ladder: sectionLabel 48 · title 76 · 5 rungs · readout)
  assertLength('ladderSectionLabel', framing.ladderSectionLabel, 48)
  assertLength('ladderTitle', framing.ladderTitle, 76)
  assertAllowedTags('ladderTitle', framing.ladderTitle, ['em'])

  const bodiesByLevel = new Map(framing.rungBodies.map(rung => [rung.levelId, rung.body]))

  for (const rung of facts.rungs) {
    const body = bodiesByLevel.get(rung.levelId)

    if (!body || visibleTextLength(body) === 0) {
      throw new ProposalInputError(
        `Falta el body del peldaño "${rung.anchor}": los 5 peldaños se enmarcan, ninguno queda mudo.`
      )
    }

    assertLength(`rung(${rung.levelId}).body`, body, 120)
    assertAllowedTags(`rung(${rung.levelId}).body`, body, [])
  }

  assertLength('readout.title', framing.readout.title, 40)
  assertLength('readout.body', framing.readout.body, 220)
}

// ─────────────────────────────────────────────────────────────────────────────
// El author
// ─────────────────────────────────────────────────────────────────────────────

export const diagnosticoChapterAuthor: ChapterAuthor<DiagnosticoSource, DiagnosticoFacts, DiagnosticoFraming> = {
  chapterId: 'diagnostico',
  deriveFacts: deriveDiagnosticoFacts,
  framingSchema: DIAGNOSTICO_SCHEMA,
  systemPrompt: DIAGNOSTICO_SYSTEM,
  buildPrompt: (facts, operatorBrief) =>
    JSON.stringify({
      marca: facts.subjectName,
      contextoDelEstudio: facts.subjectContext,
      peldanos: facts.rungs.map(rung => ({
        levelId: rung.levelId,
        anchor: rung.anchor,
        score: rung.numericValue,
        evidenceRef: rung.evidenceRef
      })),
      hechosTitular: facts.goals,
      municionDeContexto: facts.context,
      limites: {
        eyebrow: 32,
        title: 106,
        narrativeParrafo: 220,
        outcomesTitle: 74,
        goalTitle: 40,
        goalBody: 220,
        ladderSectionLabel: 48,
        ladderTitle: 76,
        rungBody: 120,
        readoutBody: 220
      },
      briefDelOperador: operatorBrief
    }),
  validate: validateDiagnosticoProposal,
  toSlides: (framing, facts) => {
    const goalFacts = new Map(facts.goals.map(goal => [goal.factId, goal]))
    const bodiesByLevel = new Map(framing.rungBodies.map(rung => [rung.levelId, rung.body]))

    return [
      {
        slideId: 'diagnostico',
        contentType: 'one-metric',
        slots: {
          eyebrow: framing.eyebrow,
          leftVisual: { src: DIAGNOSTICO_VISUAL },
          title: framing.title,
          narrative: framing.narrative,
          outcomesEyebrow: framing.outcomesEyebrow,
          outcomesTitle: framing.outcomesTitle,
          goals: framing.goals.map(goal => {
            // La cifra y su fuente se inyectan DESDE EL HECHO — jamás desde el output del modelo.
            const fact = goalFacts.get(goal.factId) as EvidencedFact

            return {
              kind: goal.kind,
              title: goal.title,
              metric: fact.value,
              body: goal.body,
              evidenceRef: fact.evidenceRef
            }
          })
        }
      },
      {
        slideId: 'escalera',
        contentType: 'maturity-ladder',
        slots: {
          sectionLabel: framing.ladderSectionLabel,
          title: framing.ladderTitle,
          subject: { name: facts.subjectName, context: facts.subjectContext },
          rungs: facts.rungs.map(rung => ({
            label: RUNG_LABELS[rung.levelId],
            anchor: rung.anchor,
            score: rung.numericValue,
            body: bodiesByLevel.get(rung.levelId),
            evidenceRef: rung.evidenceRef
          })),
          readout: { title: framing.readout.title, body: framing.readout.body }
        }
      }
    ]
  }
}
