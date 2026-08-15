import 'server-only'

/**
 * TASK-1290 Slice 3 — Growth AI Visibility · Prompt set authoring (LLM, server-only).
 *
 * El LLM autor PROPONE el Query Fan-Out de buyer-intent de una marca (1×/marca/versión, al
 * autorar — NUNCA por run). Gated por `GROWTH_AI_VISIBILITY_PROMPT_AUTHORING_ENABLED`. Resuelve
 * el primer proveedor CONFIGURADO (gemini → openai → anthropic, cheap-first) vía el cliente LLM
 * canónico (`src/lib/ai/*`, NUNCA instancia un SDK; secret server-side). Degrada honesto: flag
 * OFF / sin proveedor / schema inválido / error → `prompts: null` → el caller cae al baseline
 * determinista del arquetipo (Slice 1), NUNCA prompts rotos. Output ESTRUCTURADO + vocabulario
 * CERRADO + NO-LEADING (el sanitizer corrige el tag namesBrand a la realidad del texto).
 */

import type Anthropic from '@anthropic-ai/sdk'

import { captureWithDomain } from '@/lib/observability/capture'
import { generateStructuredAnthropic, isAnthropicConfigured } from '@/lib/ai/anthropic'
import { generateStructuredGemini, isGeminiConfigured } from '@/lib/ai/google-genai'
import { generateStructuredOpenAI, isOpenAIConfigured } from '@/lib/ai/openai'

import { isPromptAuthoringEnabled } from '../../flags'
import { isPromptFamily, isPromptFanOutType, isPromptIntentStage } from '../tag-vocabulary'
import { type PromptSetPrompt } from '../prompt-set-store'
import {
  AUTHOR_PROMPT_SET_JSON_SCHEMA,
  AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT,
  AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT_VERSION,
  AUTHOR_SYSTEM_PROMPT,
  AUTHOR_SYSTEM_PROMPT_VERSION,
  buildAuthorPromptSetPrompt,
  type AuthorPromptSetInput,
  type AuthorPromptSetRawOutput
} from './author-system-prompt'

const AUTHOR_TOOL_NAME = 'propose_aeo_prompt_set'
const AUTHOR_MAX_OUTPUT_TOKENS = 2200
/** Mínimo de prompts válidos para aceptar el set autorado; debajo → fallback al baseline. */
const MIN_AUTHORED_PROMPTS = 8
const MAX_AUTHORED_PROMPTS = 18

export type AuthorPromptSetStatus = 'ok' | 'disabled' | 'not_configured' | 'schema_invalid' | 'provider_error'

export interface AuthorPromptSetResult {
  /** Prompts autorados (estructurados + tags cerrados), o null ⇒ el caller usa el baseline. */
  prompts: PromptSetPrompt[] | null
  status: AuthorPromptSetStatus
  providerId: string | null
  model: string | null
  systemPromptVersion: string
  groundingSources: string[]
}

const normalizeText = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ')

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export interface SanitizeAuthoredPromptsOptions {
  /**
   * TASK-1666 v2 (auditoría AEO B2) — con la marca declarada, un texto que la nombra LITERAL
   * (sin placeholder) fuerza `namesBrand=true`: el tag refleja la realidad del texto, no lo
   * que el LLM dijo. Sin esto, una marca literal tagueada discovery corrompe la medición a
   * ciegas en silencio.
   */
  brandName?: string
  /**
   * Competidores declarados: un nombre literal en el texto se NORMALIZA a `{{competitor}}`
   * (el smoke v1 materializó "y Comex" literal violando el contrato de placeholders). La
   * normalización mantiene la regla "se descartan si no hay competidor declarado" operante.
   */
  competitors?: string[]
  /**
   * TASK-1666 v2 (auditoría AEO M1) — pisos de distribución para el modo grounded: ≥1 prompt
   * por fanOutType y ≥50% descubrimiento (`namesBrand=false`). Un set degenerado (todo
   * branded, o sin un tipo de fan-out) devuelve null → fallback honesto al baseline.
   */
  enforceDistribution?: boolean
}

/**
 * Valida + sanitiza el output del LLM contra el vocabulario CERRADO + NO-LEADING. Descarta
 * prompts mal formados; asigna ids estables (`llm01`…); dedup por texto; corrige `namesBrand`
 * a la realidad (un prompt con {{brand}} O con la marca literal nombra la marca); normaliza
 * competidores literales a `{{competitor}}`. Devuelve null si quedan muy pocos o si (en modo
 * grounded) la distribución es degenerada.
 */
export const sanitizeAuthoredPrompts = (
  raw: unknown,
  options: SanitizeAuthoredPromptsOptions = {}
): PromptSetPrompt[] | null => {
  if (typeof raw !== 'object' || raw === null) return null

  const data = raw as { prompts?: unknown }

  if (!Array.isArray(data.prompts)) return null

  const brandPattern =
    options.brandName && options.brandName.trim().length >= 3
      ? new RegExp(`\\b${escapeRegExp(options.brandName.trim())}\\b`, 'i')
      : null

  const competitorPatterns = (options.competitors ?? [])
    .map(name => name.trim())
    .filter(name => name.length >= 3)
    .map(name => new RegExp(`\\b${escapeRegExp(name)}\\b`, 'gi'))

  const seen = new Set<string>()
  const result: PromptSetPrompt[] = []

  for (const draft of data.prompts as unknown[]) {
    if (typeof draft !== 'object' || draft === null) continue

    const d = draft as Record<string, unknown>
    let text = typeof d.text === 'string' ? d.text.trim() : ''

    if (
      text.length === 0 ||
      !isPromptFamily(d.family) ||
      !isPromptFanOutType(d.fanOutType) ||
      !isPromptIntentStage(d.intentStage)
    ) {
      continue
    }

    // Competidor LITERAL → placeholder (el contrato de templates exige {{competitor}}).
    for (const pattern of competitorPatterns) {
      text = text.replace(pattern, '{{competitor}}')
    }

    const key = normalizeText(text)

    if (seen.has(key)) continue
    seen.add(key)

    // NO-LEADING: el tag debe reflejar la realidad — {{brand}} o la marca LITERAL nombran la marca.
    const mentionsBrand = /\{\{brand\}\}/.test(text) || (brandPattern !== null && brandPattern.test(text))
    const namesBrand = mentionsBrand ? true : Boolean(d.namesBrand)

    result.push({
      id: `llm${String(result.length + 1).padStart(2, '0')}`,
      family: d.family,
      fanOutType: d.fanOutType,
      intentStage: d.intentStage,
      namesBrand,
      text,
      rationale: typeof d.rationale === 'string' ? d.rationale.trim().slice(0, 400) : undefined
    })

    if (result.length >= MAX_AUTHORED_PROMPTS) break
  }

  if (result.length < MIN_AUTHORED_PROMPTS) return null

  if (options.enforceDistribution) {
    const discoveryShare = result.filter(prompt => !prompt.namesBrand).length / result.length
    const fanOutTypes = new Set(result.map(prompt => prompt.fanOutType))

    // Piso grounded: los 4 tipos de fan-out presentes y ≥50% descubrimiento. Un set que no
    // los cumple no sirve para MEDIR visibilidad — mejor el baseline honesto que un panel cojo.
    if (discoveryShare < 0.5 || fanOutTypes.size < 4) return null
  }

  return result
}

const resolveGroundingSources = (input: AuthorPromptSetInput): string[] =>
  [
    input.whatTheBrandDoes ? 'brand_intelligence:what_the_brand_does' : null,
    input.fineCategory ? 'brand_intelligence:fine_category' : null,
    `category:${input.categoryLabel}`,
    `business_model:${input.businessModel}`,
    input.competitors.length > 0 ? 'competitors' : null,
    // TASK-1666 — provenance SEO como refs OPACAS (jamás la keyword cruda): las fuentes AEO
    // existentes se conservan y estas se AGREGAN, nunca las sustituyen.
    ...(input.seoContext
      ? [
          `seo.discovery.run:${input.seoContext.runId}`,
          ...input.seoContext.candidates.map(candidate => `seo.discovery.candidate:${candidate.candidateId}`),
          input.seoContext.contextRef
        ]
      : [])
  ].filter((source): source is string => source !== null)

/** TASK-1666 — el cerebro y la versión dependen de si hay contexto SEO (dos artefactos versionados). */
const resolveSystemPrompt = (input: AuthorPromptSetInput): { system: string; version: string } =>
  input.seoContext && input.seoContext.candidates.length > 0
    ? { system: AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT, version: AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT_VERSION }
    : { system: AUTHOR_SYSTEM_PROMPT, version: AUTHOR_SYSTEM_PROMPT_VERSION }

interface AuthorProvider {
  id: 'gemini' | 'openai' | 'anthropic'
  isConfigured: () => Promise<boolean>
  generate: (input: AuthorPromptSetInput, system: string) => Promise<{ data: AuthorPromptSetRawOutput; model: string }>
}

const PROVIDERS: AuthorProvider[] = [
  {
    id: 'gemini',
    isConfigured: async () => isGeminiConfigured(),
    generate: async (input, system) => {
      const r = await generateStructuredGemini<AuthorPromptSetRawOutput>({
        model: process.env.GROWTH_AI_VISIBILITY_PROMPT_AUTHORING_MODEL_GEMINI?.trim() || undefined,
        system,
        prompt: buildAuthorPromptSetPrompt(input),
        jsonSchema: AUTHOR_PROMPT_SET_JSON_SCHEMA as unknown as Record<string, unknown>,
        maxOutputTokens: input.maxTokens,
        temperature: 0.2
      })

      return { data: r.data, model: r.model }
    }
  },
  {
    id: 'openai',
    isConfigured: () => isOpenAIConfigured(),
    generate: async (input, system) => {
      const r = await generateStructuredOpenAI<AuthorPromptSetRawOutput>({
        model: process.env.GROWTH_AI_VISIBILITY_PROMPT_AUTHORING_MODEL_OPENAI?.trim() || undefined,
        system,
        prompt: buildAuthorPromptSetPrompt(input),
        schemaName: AUTHOR_TOOL_NAME,
        jsonSchema: AUTHOR_PROMPT_SET_JSON_SCHEMA as unknown as Record<string, unknown>,
        maxOutputTokens: input.maxTokens,
        temperature: 0.2
      })

      return { data: r.data, model: r.model }
    }
  },
  {
    id: 'anthropic',
    isConfigured: () => isAnthropicConfigured(),
    generate: async (input, system) => {
      const r = await generateStructuredAnthropic<AuthorPromptSetRawOutput>({
        model: process.env.GROWTH_AI_VISIBILITY_PROMPT_AUTHORING_MODEL_ANTHROPIC?.trim() || 'claude-haiku-4-5-20251001',
        system,
        prompt: buildAuthorPromptSetPrompt(input),
        toolName: AUTHOR_TOOL_NAME,
        toolDescription: 'Propone el Query Fan-Out de buyer-intent de una marca para medición AEO.',
        inputSchema: AUTHOR_PROMPT_SET_JSON_SCHEMA as unknown as Anthropic.Messages.Tool.InputSchema,
        maxTokens: input.maxTokens,
        temperature: 0.2
      })

      return { data: r.data, model: r.model }
    }
  }
]

const result = (
  prompts: PromptSetPrompt[] | null,
  status: AuthorPromptSetStatus,
  providerId: string | null,
  model: string | null,
  systemPromptVersion: string,
  groundingSources: string[]
): AuthorPromptSetResult => ({
  prompts,
  status,
  providerId,
  model,
  systemPromptVersion,
  groundingSources
})

/**
 * Autora un set de prompts para una marca. NUNCA lanza: degrada honesto a `prompts: null`
 * (el caller usa el baseline). `provider` fuerza un proveedor (eval) sin tocar el flag.
 */
export const authorPromptSet = async (
  input: AuthorPromptSetInput,
  options?: { provider?: AuthorProvider['id']; telemetry?: Record<string, string | null> }
): Promise<AuthorPromptSetResult> => {
  const grounding = resolveGroundingSources(input)
  const { system, version } = resolveSystemPrompt(input)

  if (!isPromptAuthoringEnabled()) {
    return result(null, 'disabled', null, null, version, grounding)
  }

  const ordered = options?.provider
    ? [...PROVIDERS].sort((a, b) => (a.id === options.provider ? -1 : b.id === options.provider ? 1 : 0))
    : PROVIDERS

  let provider: AuthorProvider | null = null

  for (const candidate of ordered) {
    const configured = await candidate.isConfigured().catch(() => false)

    if (configured) {
      provider = candidate
      break
    }
  }

  if (!provider) {
    return result(null, 'not_configured', options?.provider ?? null, null, version, grounding)
  }

  try {
    const { data, model } = await provider.generate(input, system)

    const prompts = sanitizeAuthoredPrompts(data, {
      brandName: input.brandName,
      competitors: input.competitors,
      // Los pisos de distribución aplican SOLO al modo grounded (v2): el authoring base v1
      // conserva su contrato original sin cambios de comportamiento.
      enforceDistribution: Boolean(input.seoContext && input.seoContext.candidates.length > 0)
    })

    if (!prompts) {
      return result(null, 'schema_invalid', provider.id, model, version, grounding)
    }

    return result(prompts, 'ok', provider.id, model, version, grounding)
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_ai_visibility_prompt_authoring', provider: provider.id },
      extra: { ...options?.telemetry }
    })

    return result(null, 'provider_error', provider.id, null, version, grounding)
  }
}

export const AUTHOR_PROMPT_SET_MAX_OUTPUT_TOKENS = AUTHOR_MAX_OUTPUT_TOKENS
