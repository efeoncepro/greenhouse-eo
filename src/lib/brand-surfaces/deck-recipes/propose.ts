import 'server-only'

/**
 * `proposeDeckPlan(context)`: un agente propone el plan de un deck de «La órbita» eligiendo RECETAS del catálogo por
 * id (TASK-1929). Es el paso `propose` del ciclo propose → confirm → execute: no escribe nada, no rellena contenido y
 * no llama a nada más que al cliente canónico de `src/lib/ai/`.
 *
 * Falla cerrado: la salida estructurada pasa por `validateDeckPlan`; si trae errores, se reintenta UNA vez con los
 * issues como retroalimentación; si persisten, devuelve `{ ok: false, issues }` y el plan rechazado sólo como
 * diagnóstico. Un plan con errores nunca sale como bueno. La confirmación humana y el camino por API, Nexa y MCP son
 * de TASK-1932.
 */

import { generateStructuredAnthropic } from '@/lib/ai/anthropic'

import { listDeckRecipes, roleOf } from './catalog'
import { DECK_DOCUMENT_KINDS, type DeckDocumentKind, type DeckPlan, type DeckPlanIssue } from './types'
import { validateDeckPlan } from './validate'

export const DECK_PLAN_MODEL = 'claude-sonnet-5'

/** Intentos del modelo por propuesta: el primero y un reintento con los issues. */
export const DECK_PLAN_MAX_ATTEMPTS = 2

/**
 * El contexto que el agente puede ver: forma del documento, nunca datos. Sin ids de organización, montos, costos ni
 * datos personales; los hechos llegan sólo por NOMBRE (ya autorizados por el consumer).
 */
export interface DeckPlanContext {
  document: DeckDocumentKind
  /** `room`: se presenta en sala; `reading`: se lee sin presentador. */
  audience?: 'room' | 'reading'
  line?: string
  diagnosisDone?: boolean
  /** El esqueleto deseado: los temas en orden (por ejemplo «qué hacemos», «cómo trabajamos», «cuánto cuesta»). */
  sections: string[]
  /** Nombres de hechos disponibles (por ejemplo «caso Sky publicado», «cotización»), sin valores. */
  availableFacts?: string[]
  /** Una línea de intención del operador. */
  brief?: string
}

export interface DeckPlanUsage {
  inputTokens: number
  outputTokens: number
}

export type DeckPlanProposal =
  | { ok: true; plan: DeckPlan; issues: DeckPlanIssue[]; rationale: string; model: string; attempts: number; usage: DeckPlanUsage }
  | { ok: false; issues: DeckPlanIssue[]; rejectedPlan: DeckPlan | null; model: string; attempts: number; usage: DeckPlanUsage }

const CONTEXT_KEYS = ['document', 'audience', 'line', 'diagnosisDone', 'sections', 'availableFacts', 'brief'] as const
const MAX_SECTIONS = 20
const MAX_TEXT = 200
const MAX_SLIDES = 40

export class DeckPlanContextError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DeckPlanContextError'
  }
}

const shortText = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim() === '') throw new DeckPlanContextError(`\`${field}\` es un texto no vacío.`)
  if (value.length > MAX_TEXT) throw new DeckPlanContextError(`\`${field}\` admite hasta ${MAX_TEXT} caracteres.`)

  return value.trim()
}

/** El contexto por la allowlist: cualquier otra clave (un id de organización, un monto) lo rechaza. */
export const normalizeDeckPlanContext = (raw: unknown): DeckPlanContext => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new DeckPlanContextError('El contexto es un objeto.')

  const input = raw as Record<string, unknown>
  const extra = Object.keys(input).filter(key => !(CONTEXT_KEYS as readonly string[]).includes(key))

  if (extra.length > 0) throw new DeckPlanContextError(`El contexto no admite ${extra.map(key => `\`${key}\``).join(', ')}: sólo ${CONTEXT_KEYS.join(', ')}.`)
  if (!(DECK_DOCUMENT_KINDS as readonly string[]).includes(String(input.document))) throw new DeckPlanContextError(`\`document\` es uno de ${DECK_DOCUMENT_KINDS.join(', ')}.`)
  if (input.audience !== undefined && input.audience !== 'room' && input.audience !== 'reading') throw new DeckPlanContextError('`audience` es `room` o `reading`.')
  if (input.diagnosisDone !== undefined && typeof input.diagnosisDone !== 'boolean') throw new DeckPlanContextError('`diagnosisDone` es booleano.')
  if (!Array.isArray(input.sections) || input.sections.length === 0 || input.sections.length > MAX_SECTIONS) throw new DeckPlanContextError(`\`sections\` lista entre 1 y ${MAX_SECTIONS} temas.`)
  if (input.availableFacts !== undefined && (!Array.isArray(input.availableFacts) || input.availableFacts.length > MAX_SECTIONS)) throw new DeckPlanContextError(`\`availableFacts\` lista hasta ${MAX_SECTIONS} nombres.`)

  return {
    document: input.document as DeckDocumentKind,
    ...(input.audience ? { audience: input.audience as 'room' | 'reading' } : {}),
    ...(input.line !== undefined ? { line: shortText(input.line, 'line') } : {}),
    ...(input.diagnosisDone !== undefined ? { diagnosisDone: input.diagnosisDone as boolean } : {}),
    sections: (input.sections as unknown[]).map((section, index) => shortText(section, `sections[${index}]`)),
    ...(input.availableFacts ? { availableFacts: (input.availableFacts as unknown[]).map((fact, index) => shortText(fact, `availableFacts[${index}]`)) } : {}),
    ...(input.brief !== undefined ? { brief: shortText(input.brief, 'brief') } : {})
  }
}

const SYSTEM = `Eres el planificador de decks de «La órbita», la línea gráfica de Efeonce. Tu única salida es un PLAN
ESTRUCTURADO: la lista ordenada de láminas de un deck, cada una una RECETA del catálogo aprobado, elegida por su id.
Reglas duras:
- SOLO usas ids del catálogo que recibes; nunca nombres de plantillas ni contentType, nunca un id inventado.
- Una portada al inicio y un cierre al final, y el cierre es pareja aprobada de la portada (campo coverClose).
- Portada y cierre alternan foto y sin foto; el eslogan va sólo en el cierre.
- Dos variantes de la misma lámina (campo variant) no van seguidas; un plate no se repite en el deck.
- No escribes contenido ni cifras: eliges láminas y dices para qué está cada una.
Tú PROPONES; una persona confirma.`

/** El catálogo del documento, en la forma más corta que le sirve al modelo para elegir. */
const catalogFor = (document: DeckDocumentKind) =>
  listDeckRecipes(document).map(recipe => ({
    id: recipe.id,
    name: recipe.name,
    family: recipe.family,
    role: roleOf(recipe),
    photo: recipe.photo.uses,
    plate: recipe.photo.plate,
    coverClose: recipe.pairs.coverClose,
    variant: recipe.pairs.variant
  }))

const schemaFor = (ids: string[]) => ({
  type: 'object' as const,
  additionalProperties: false,
  required: ['slides', 'rationale'],
  properties: {
    rationale: { type: 'string', description: 'Por qué este orden y estas láminas, en dos o tres frases.' },
    slides: {
      type: 'array',
      description: 'Las láminas en orden.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['recipeId', 'purpose'],
        properties: {
          recipeId: { type: 'string', enum: ids },
          purpose: { type: 'string', description: 'Para qué está esta lámina en el deck.' }
        }
      }
    }
  }
})

interface ProposedPlan {
  rationale?: unknown
  slides?: unknown
}

const toPlan = (context: DeckPlanContext, data: ProposedPlan): DeckPlan => ({
  document: context.document,
  ...(context.line ? { line: context.line } : {}),
  ...(context.diagnosisDone !== undefined ? { diagnosisDone: context.diagnosisDone } : {}),
  slides: (Array.isArray(data.slides) ? data.slides : []).slice(0, MAX_SLIDES).map(slide => {
    const entry = (slide ?? {}) as { recipeId?: unknown; purpose?: unknown }

    return { recipeId: String(entry.recipeId ?? ''), ...(typeof entry.purpose === 'string' ? { purpose: entry.purpose } : {}) }
  })
})

const errorsOf = (issues: DeckPlanIssue[]) => issues.filter(issue => issue.severity === 'error')

export const proposeDeckPlan = async (rawContext: unknown): Promise<DeckPlanProposal> => {
  const context = normalizeDeckPlanContext(rawContext)
  const catalog = catalogFor(context.document)
  const schema = schemaFor(catalog.map(recipe => recipe.id))
  const usage: DeckPlanUsage = { inputTokens: 0, outputTokens: 0 }
  let feedback: DeckPlanIssue[] = []
  let last: DeckPlan | null = null
  let model = DECK_PLAN_MODEL

  for (let attempt = 1; attempt <= DECK_PLAN_MAX_ATTEMPTS; attempt += 1) {
    let result: Awaited<ReturnType<typeof generateStructuredAnthropic<ProposedPlan>>>

    try {
      result = await generateStructuredAnthropic<ProposedPlan>({
        model: DECK_PLAN_MODEL,
        system: SYSTEM,
        prompt: JSON.stringify({
          context,
          catalog,
          ...(feedback.length > 0
            ? { previousPlan: last, fixTheseIssues: feedback.map(issue => ({ code: issue.code, slideIndex: issue.slideIndex, detail: issue.detail })) }
            : {})
        }),
        toolName: 'propose_deck_plan',
        toolDescription: 'Propone el plan del deck: láminas del catálogo en orden, cada una con su propósito.',
        inputSchema: schema as never,
        maxTokens: 4096
      })
    } catch {
      // Falla cerrado sin filtrar el error del proveedor: el consumer decide si reintenta más tarde.
      return {
        ok: false,
        issues: [{ code: 'proposal-unavailable', severity: 'error', source: 'agent', detail: 'El modelo no respondió con un plan; no hay propuesta.' }],
        rejectedPlan: last,
        model,
        attempts: attempt,
        usage
      }
    }

    model = result.model
    usage.inputTokens += result.usage.inputTokens
    usage.outputTokens += result.usage.outputTokens
    last = toPlan(context, result.data)

    const validation = validateDeckPlan(last)

    if (validation.ok) {
      return {
        ok: true,
        plan: last,
        issues: validation.issues,
        rationale: typeof result.data.rationale === 'string' ? result.data.rationale : '',
        model,
        attempts: attempt,
        usage
      }
    }

    feedback = errorsOf(validation.issues)
  }

  return { ok: false, issues: feedback, rejectedPlan: last, model, attempts: DECK_PLAN_MAX_ATTEMPTS, usage }
}
