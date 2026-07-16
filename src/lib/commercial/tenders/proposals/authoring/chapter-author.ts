import 'server-only'

/**
 * Chapter-Author Engine — el nodo de autoría de §5-ter, SERVICIO-AGNÓSTICO (TASK-1415).
 *
 * La máquina con la que un agente REDACTA el contenido de una lámina de propuesta, en el molde
 * canónico del dominio (`intake-agent.ts` / `render-agent.ts`): **el agente PROPONE; el humano
 * CONFIRMA; el ensamble determinista EMITE los slots.** El LLM jamás muta estado, jamás elige
 * plantilla (declara `contentType` + slots — el selector del catálogo resuelve) y jamás produce
 * una cifra: separación dura dato/framing.
 *
 *   dato    → `deriveFacts` (por-author, PURO): la ÚNICA fuente de cifras, cada una con su
 *             `evidenceRef`. Imposible fabricar un número — el LLM no participa.
 *   framing → `proposeChapter` (compartido): structured output vía el cliente canónico
 *             `src/lib/ai/` sobre ESOS hechos. Validación fail-closed: una cifra del framing
 *             que no exista en los hechos rechaza la propuesta COMPLETA.
 *   slots   → `confirmChapter` (humano `member`) → `toSlides` (por-author, determinista):
 *             las cifras y los `evidenceRef` se inyectan DESDE LOS HECHOS, nunca desde el
 *             output del modelo.
 *
 * INVARIANTE DURO — cero suposición de servicio: esta interface sirve igual a un author de
 * diagnóstico (SEO/AEO), de credenciales, de brief creativo, de plan social o económico. Nada
 * en este archivo puede nombrar una fuente de datos concreta (Grader, cotizador, squad
 * blueprint) ni un concepto de un servicio. La prueba mecánica es el segundo consumidor de
 * otro servicio en `__tests__/` — si un author nuevo obliga a tocar esta interface, la
 * abstracción está mal.
 *
 * Eval: `eval-harness.ts` + `__tests__/*-eval.test.ts` — el gate para tocar prompt/schema de
 * cualquier author (§5-bis: eval baseline obligatorio por agente).
 */

import crypto from 'node:crypto'

import { generateStructuredAnthropic } from '@/lib/ai/anthropic'
import { captureWithDomain } from '@/lib/observability/capture'

import { ProposalInputError } from '../errors'
import type { ProposalActor } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Flag (Vercel-only hoy: el propose corre en el request path del portal/CLI).
// Ledger: docs/operations/FEATURE_FLAG_STATE_LEDGER.md
// ─────────────────────────────────────────────────────────────────────────────

export const isTenderChapterAuthorEnabled = (): boolean =>
  process.env.TENDER_CHAPTER_AUTHOR_ENABLED === 'true'

// ─────────────────────────────────────────────────────────────────────────────
// 1 · El contrato de hechos (la munición del framing)
// ─────────────────────────────────────────────────────────────────────────────

/** Un hecho con evidencia: la ÚNICA fuente de dato que el framing puede citar. */
export interface EvidencedFact {
  /** Id estable del hecho dentro del capítulo (p. ej. `rung.1`, `goal.a`). */
  factId: string
  /** Qué es el hecho, para el prompt y para el humano que confirma. */
  label: string
  /** Valor textual EXACTO tal como puede aparecer en la lámina (`0%`, `16 vs 9`). */
  value: string
  /** Valor numérico cuando aplica (para asserts de igualdad en evals). */
  numericValue?: number
  /** Fuente verificable. SIEMPRE obligatoria — un hecho sin fuente no es un hecho. */
  evidenceRef: string
}

/**
 * Lo que TODO `Facts` de un author expone a la máquina compartida: la hoja plana de hechos
 * contra la que se verifica mecánicamente que el framing no fabrique cifras.
 */
export interface ChapterFactSheet {
  facts: EvidencedFact[]
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 · La interface ChapterAuthor (por-servicio) + los tipos compartidos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Una lámina autorada: INTENCIÓN (`contentType` + slots), NUNCA `template` — el selector del
 * catálogo resuelve la plantilla (autoridad de presentación; `TemplateAuthorityError` si un
 * plan la contradice).
 */
export interface AuthoredSlide {
  slideId: string
  contentType: string
  slots: Record<string, unknown>
}

/**
 * El contrato que implementa cada author de servicio. `Source` es SU fuente (un reader del
 * dominio que corresponda, resuelto por el caller con el scope de la sesión — la fuente entra
 * como DATO, nunca como id que el agente pueda elegir).
 */
export interface ChapterAuthor<Source, Facts extends ChapterFactSheet, Framing> {
  /** Id estable del capítulo que produce (p. ej. `diagnostico`, `credenciales`). */
  chapterId: string
  /** PURO y determinista: `Source → Facts`. La única fábrica de cifras del capítulo. */
  deriveFacts(source: Source): Facts
  /** JSON-Schema-literal del structured output (patrón `INTAKE_SCHEMA`, NO Zod). */
  framingSchema: Record<string, unknown>
  /** System prompt del author (es-CL institucional; el eval lo gatea). */
  systemPrompt: string
  /** Construye el user prompt desde los hechos + el brief del operador. */
  buildPrompt(facts: Facts, operatorBrief: string): string
  /**
   * Validación fail-closed POR AUTHOR (además de la mecánica compartida): constraints de sus
   * slots (longitudes/overflow), coherencia semántica, campos obligatorios. Lanza
   * `ProposalInputError` — un fallo rechaza la propuesta completa.
   */
  validate(framing: Framing, facts: Facts): void
  /**
   * Ensamble determinista `hechos + framing → slots`. Las cifras (`metric`, `score`) y los
   * `evidenceRef` se toman DE LOS HECHOS — el framing sólo aporta el texto que los enmarca.
   */
  toSlides(framing: Framing, facts: Facts): AuthoredSlide[]
}

export interface ChapterProposal<Facts extends ChapterFactSheet, Framing> {
  chapterId: string
  facts: Facts
  framing: Framing
}

export interface ChapterAuthorTrace {
  factsHash: string
  model: string
  proposedAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 · Guard mecánico compartido: una cifra sin hecho rechaza la propuesta
// ─────────────────────────────────────────────────────────────────────────────

/** Recorre el framing (JSON puro) y junta todas las hojas string. */
export const collectStringLeaves = (value: unknown, acc: string[] = []): string[] => {
  if (typeof value === 'string') {
    acc.push(value)
  } else if (Array.isArray(value)) {
    for (const item of value) collectStringLeaves(item, acc)
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStringLeaves(item, acc)
  }

  return acc
}

/**
 * Tokens numéricos que el guard EXIGE respaldados: multi-dígito o con `%`/separadores
 * (`254`, `40.000`, `0%`, `16`). Un dígito suelto en prosa (`top 3`, `2 rondas`) queda fuera
 * del guard mecánico — lo cubren el validador por-author y el humano que confirma (defensa en
 * profundidad; el objetivo de ESTE guard es que una MÉTRICA fabricada no sobreviva).
 */
const QUANTIFIED_TOKEN = /\d[\d.,]*%?/g

const isEnforcedToken = (token: string): boolean => token.length >= 2

const URL_TOKEN = /https?:\/\/[^\s"'<)]+/g

/**
 * FAIL-CLOSED: todo link (`href` o URL cruda) del framing debe calzar EXACTAMENTE con el valor
 * de algún hecho. Un LLM no inventa URLs en un documento contractual — el link al informe/fuente
 * entra como hecho (allowlist), o no entra.
 */
export const assertLinksAreEvidenced = (framing: unknown, facts: EvidencedFact[]): void => {
  const factValues = new Set(facts.map(fact => fact.value))

  for (const leaf of collectStringLeaves(framing)) {
    for (const url of leaf.match(URL_TOKEN) ?? []) {
      if (!factValues.has(url)) {
        throw new ProposalInputError(
          `El framing introduce un link sin hecho que lo respalde: "${url}". ` +
            'Las URLs entran como hechos con evidencia (allowlist), nunca desde el modelo.'
        )
      }
    }
  }
}

/**
 * FAIL-CLOSED: toda cifra del framing debe existir textualmente dentro del valor de algún
 * hecho. El LLM enmarca hechos; no introduce números. Las URLs (ya allowlisted por
 * `assertLinksAreEvidenced`) se excluyen del scan — sus tokens no son cifras del argumento.
 */
export const assertQuantifiedClaimsAreEvidenced = (framing: unknown, facts: EvidencedFact[]): void => {
  const factValues = facts.map(fact => fact.value)

  for (const leaf of collectStringLeaves(framing)) {
    const scannable = leaf.replace(URL_TOKEN, '')

    for (const token of scannable.match(QUANTIFIED_TOKEN) ?? []) {
      if (!isEnforcedToken(token)) continue

      if (!factValues.some(value => value.includes(token))) {
        throw new ProposalInputError(
          `El framing introduce una cifra sin hecho que la respalde: "${token}" (en "${leaf.slice(0, 80)}…"). ` +
            'El chapter-author sólo enmarca hechos con evidencia; una cifra huérfana rechaza la propuesta completa.'
        )
      }
    }
  }
}

/**
 * Largo del texto VISIBLE de un rich-string (sin markup): la vara con la que un author chequea
 * sus constraints de longitud — el juez final sigue siendo el layout real del composer.
 */
export const visibleTextLength = (value: string): number => value.replace(/<[^>]+>/g, '').length

/** Validación completa de una propuesta: el guard mecánico compartido + el validador del author. */
export const validateChapterProposal = <Source, Facts extends ChapterFactSheet, Framing>(
  author: ChapterAuthor<Source, Facts, Framing>,
  framing: Framing,
  facts: Facts
): void => {
  for (const fact of facts.facts) {
    if (!fact.evidenceRef || fact.evidenceRef.trim().length === 0) {
      throw new ProposalInputError(
        `El hecho "${fact.factId}" no tiene evidenceRef: un hecho sin fuente no compone una lámina.`
      )
    }
  }

  assertLinksAreEvidenced(framing, facts.facts)
  assertQuantifiedClaimsAreEvidenced(framing, facts.facts)
  author.validate(framing, facts)
}

export const hashChapterFacts = (facts: ChapterFactSheet): string =>
  crypto.createHash('sha256').update(JSON.stringify(facts)).digest('hex')

// ─────────────────────────────────────────────────────────────────────────────
// 4 · propose (compartido) — structured output sobre los hechos, fail-closed
// ─────────────────────────────────────────────────────────────────────────────

const CHAPTER_AUTHOR_MODEL = 'claude-sonnet-5'

export const proposeChapter = async <Source, Facts extends ChapterFactSheet, Framing>(
  author: ChapterAuthor<Source, Facts, Framing>,
  input: {
    source: Source
    /** Brief del operador (INPUT citado en el prompt, no fuente de cifras). */
    operatorBrief: string
  }
): Promise<{ proposal: ChapterProposal<Facts, Framing>; trace: ChapterAuthorTrace }> => {
  if (!isTenderChapterAuthorEnabled()) {
    throw new ProposalInputError(
      'El chapter-author está apagado (TENDER_CHAPTER_AUTHOR_ENABLED). El deck-plan manual sigue disponible.'
    )
  }

  const facts = author.deriveFacts(input.source)

  let framing: Framing

  try {
    const result = await generateStructuredAnthropic<Framing>({
      model: CHAPTER_AUTHOR_MODEL,
      system: author.systemPrompt,
      prompt: author.buildPrompt(facts, input.operatorBrief),
      toolName: `propose_chapter_${author.chapterId}`,
      toolDescription:
        'Framing estructurado del capítulo, derivado EXCLUSIVAMENTE de los hechos con evidencia provistos.',
      inputSchema: author.framingSchema as Parameters<
        typeof generateStructuredAnthropic
      >[0]['inputSchema']
    })

    framing = result.data
  } catch (error) {
    // Degradación honesta: si el LLM falla, NO se propone nada (jamás un framing inventado).
    captureWithDomain(error, 'commercial', {
      tags: { source: 'tender_chapter_author', chapter: author.chapterId }
    })
    throw error
  }

  // Fail-closed: cifra huérfana o violación del contrato del author rechazan la propuesta.
  validateChapterProposal(author, framing, facts)

  return {
    proposal: { chapterId: author.chapterId, facts, framing },
    trace: {
      factsHash: hashChapterFacts(facts),
      model: CHAPTER_AUTHOR_MODEL,
      proposedAt: new Date().toISOString()
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5 · confirm (humano) → ensamble determinista de slots
// ─────────────────────────────────────────────────────────────────────────────

export const confirmChapter = <Source, Facts extends ChapterFactSheet, Framing>(
  author: ChapterAuthor<Source, Facts, Framing>,
  input: {
    proposal: ChapterProposal<Facts, Framing>
    trace: ChapterAuthorTrace
    /** El humano que confirma — resuelto por la capa de autorización, jamás por el modelo. */
    actor: ProposalActor
  }
): { slides: AuthoredSlide[]; idempotencyKey: string } => {
  if (input.actor.kind !== 'member' || !input.actor.memberId) {
    throw new ProposalInputError('La confirmación del capítulo es HUMANA: exige un actor member.')
  }

  if (input.proposal.chapterId !== author.chapterId) {
    throw new ProposalInputError(
      `La propuesta pertenece a otro capítulo ("${input.proposal.chapterId}" ≠ "${author.chapterId}").`
    )
  }

  // Re-validar en la confirmación: la propuesta pudo viajar/editarse entre propose y confirm.
  validateChapterProposal(author, input.proposal.framing, input.proposal.facts)

  // Idempotencia derivada de la propuesta confirmada: re-confirmar el MISMO capítulo no duplica.
  const idempotencyKey = `chapter-author-${crypto
    .createHash('sha256')
    .update(JSON.stringify({ proposal: input.proposal, factsHash: input.trace.factsHash }))
    .digest('hex')
    .slice(0, 32)}`

  return {
    slides: author.toSlides(input.proposal.framing, input.proposal.facts),
    idempotencyKey
  }
}
