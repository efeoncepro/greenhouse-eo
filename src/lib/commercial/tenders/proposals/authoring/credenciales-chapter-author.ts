import 'server-only'

/**
 * Credenciales (equipo/track-record) — el SEGUNDO chapter-author, de OTRO servicio
 * (TASK-1415 Slice 3).
 *
 * Su razón de existir es la prueba dura de que el motor es SERVICIO-AGNÓSTICO (test del
 * segundo consumidor): NO lee el Grader ni nada de SEO/AEO — su fuente es una lista de
 * credenciales (cliente + servicio + prueba verificable) que el caller arma desde el dominio
 * que corresponda (muro de clientes, casos, squad blueprint). Implementa la MISMA interface
 * `ChapterAuthor` sin tocarla: si este archivo hubiera obligado a cambiar `chapter-author.ts`
 * o `eval-harness.ts`, la abstracción estaría mal.
 *
 * Es deliberadamente mínimo (un author de PRUEBA, no el productivo de credenciales — ese es
 * follow-up), pero completo: mapper puro, validador fail-closed y ensamble determinista.
 * ContentType `bullet-list` (el selector resuelve la plantilla; el author no la conoce).
 */

import { ProposalInputError } from '../errors'
import {
  visibleTextLength,
  type ChapterAuthor,
  type ChapterFactSheet,
  type EvidencedFact
} from './chapter-author'

// ─────────────────────────────────────────────────────────────────────────────
// Source + Facts
// ─────────────────────────────────────────────────────────────────────────────

export interface CredencialesSource {
  /** Título de marca de la lámina (institucional, lo fija el operador/brief). */
  brandTitle: string
  credentials: Array<{
    clientName: string
    service: string
    /** La prueba verificable (métrica o hito) — con su fuente. */
    proof: string
    evidenceRef: string
  }>
}

export interface CredencialesFacts extends ChapterFactSheet {
  brandTitle: string
}

export const deriveCredencialesFacts = (source: CredencialesSource): CredencialesFacts => {
  if (source.credentials.length < 4 || source.credentials.length > 7) {
    throw new ProposalInputError(
      `La lámina de credenciales compone entre 4 y 7 credenciales (recibió ${source.credentials.length}).`
    )
  }

  const facts: EvidencedFact[] = source.credentials.map((credential, index) => ({
    factId: `credential.${index}`,
    label: `${credential.clientName} — ${credential.service}`,
    value: credential.proof,
    evidenceRef: credential.evidenceRef
  }))

  return { facts, brandTitle: source.brandTitle }
}

// ─────────────────────────────────────────────────────────────────────────────
// Framing (lo único que produce el LLM)
// ─────────────────────────────────────────────────────────────────────────────

export interface CredencialesFraming {
  bullets: Array<{
    /** El hecho que este bullet enmarca — el lead (cliente/servicio) se inyecta del hecho. */
    factId: string
    description: string
  }>
}

const CREDENCIALES_SCHEMA = {
  type: 'object' as const,
  additionalProperties: false,
  required: ['bullets'],
  properties: {
    bullets: {
      type: 'array',
      minItems: 4,
      maxItems: 7,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['factId', 'description'],
        properties: {
          factId: { type: 'string' },
          description: { type: 'string' }
        }
      }
    }
  }
}

const CREDENCIALES_SYSTEM = `Eres el chapter-author de credenciales de Greenhouse (Efeonce). Tu única
salida es el framing ESTRUCTURADO de una lámina de credenciales, derivado EXCLUSIVAMENTE de los
hechos con evidencia provistos. Reglas duras:
- Cada bullet enmarca UN hecho (factId del listado); no inventes clientes, servicios ni cifras.
- La description describe el trabajo y su resultado citando la prueba del hecho, en registro
  institucional formal (es-CL, de usted, cliente en tercera persona).
- No prometas resultados futuros: las credenciales son trabajo YA hecho.
Tú PROPONES; un humano confirma. No des por hecho que tu propuesta se ejecuta.`

// ─────────────────────────────────────────────────────────────────────────────
// El author
// ─────────────────────────────────────────────────────────────────────────────

export const credencialesChapterAuthor: ChapterAuthor<
  CredencialesSource,
  CredencialesFacts,
  CredencialesFraming
> = {
  chapterId: 'credenciales',
  deriveFacts: deriveCredencialesFacts,
  framingSchema: CREDENCIALES_SCHEMA,
  systemPrompt: CREDENCIALES_SYSTEM,
  buildPrompt: (facts, operatorBrief) =>
    JSON.stringify({
      hechos: facts.facts,
      brandTitle: facts.brandTitle,
      briefDelOperador: operatorBrief
    }),
  validate: (framing, facts) => {
    if (visibleTextLength(facts.brandTitle) === 0 || visibleTextLength(facts.brandTitle) > 34) {
      throw new ProposalInputError('brandTitle de credenciales fuera de contrato (1..34 caracteres visibles).')
    }

    if (framing.bullets.length < 4 || framing.bullets.length > 7) {
      throw new ProposalInputError('La lámina de credenciales compone entre 4 y 7 bullets.')
    }

    const known = new Set(facts.facts.map(fact => fact.factId))
    const seen = new Set<string>()

    for (const bullet of framing.bullets) {
      if (!known.has(bullet.factId)) {
        throw new ProposalInputError(
          `El bullet refiere un hecho inexistente: "${bullet.factId}". El author no inventa credenciales.`
        )
      }

      if (seen.has(bullet.factId)) {
        throw new ProposalInputError(`El hecho "${bullet.factId}" aparece en más de un bullet.`)
      }

      seen.add(bullet.factId)

      if (visibleTextLength(bullet.description) === 0) {
        throw new ProposalInputError(`El bullet "${bullet.factId}" no tiene description.`)
      }
    }
  },
  toSlides: (framing, facts) => {
    const factById = new Map(facts.facts.map(fact => [fact.factId, fact]))

    return [
      {
        slideId: 'credenciales',
        contentType: 'bullet-list',
        slots: {
          brandTitle: facts.brandTitle,
          bullets: framing.bullets.map(bullet => {
            // El lead (quién + qué) se inyecta DESDE EL HECHO — el LLM no puede renombrar clientes.
            const fact = factById.get(bullet.factId) as EvidencedFact

            return { lead: fact.label, description: bullet.description }
          })
        }
      }
    ]
  }
}
