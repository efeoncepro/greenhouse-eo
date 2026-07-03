import 'server-only'

/**
 * LLM-backed ideation for the AI Content Factory (Slice 9).
 *
 * Two verbs over the SAME shared artifact (`GutenbergArticleSpec`, Slice 8):
 *
 * - `ideateArticleSpec(idea, context)` — autonomous production: an idea + context
 *   becomes a full structured spec. Consumers: CLI, Nexa, a cron.
 * - `reviseArticleSpec(spec, instruction)` — co-creation: a human (or agent)
 *   steers an existing spec and the model returns a revised spec. This is the
 *   loop where the operator injects tacit knowledge, adjusts angle/tone, reorders.
 *
 * The spec is the collaborative canvas: producible by an LLM, editable by a human,
 * co-authorable by Claude Code / Codex / Nexa, and deterministically assembled by
 * `authorGutenbergDraft`. This module never writes to WordPress; its output still
 * flows through `validateGeneratedGutenbergDraft` before any write.
 *
 * The model only produces text structure — never media (image/embed require a real
 * WordPress asset, added by a human during co-creation) — so the "never invent
 * media" rule holds by construction.
 */

import type { Anthropic } from '@anthropic-ai/sdk'

import { generateStructuredAnthropic } from '@/lib/ai/anthropic'

import type { GutenbergArticleBlock, GutenbergArticleSection, GutenbergArticleSpec } from './article-authoring'

/** Editorial-quality Claude model; override via env or input. */
export const ARTICLE_IDEATION_ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-4-6'

export const resolveArticleIdeationModel = (override?: string): string =>
  (override || process.env.CONTENT_FACTORY_IDEATION_MODEL || ARTICLE_IDEATION_ANTHROPIC_DEFAULT_MODEL).trim()

export type ArticleIdeationTone = 'thought_leadership' | 'educational' | 'conversion' | 'efeonce_expert'
export type ArticleIdeationLocale = 'es-CL' | 'en-US' | 'pt-BR'

export type ArticleIdeationInput = {
  idea: string
  context?: string
  audience?: string
  primaryKeyword?: string
  secondaryKeywords?: string[]
  tone?: ArticleIdeationTone
  locale?: ArticleIdeationLocale
  model?: string
}

export type ArticleIdeationResult = {
  spec: GutenbergArticleSpec
  model: string
  usage: { inputTokens: number; outputTokens: number }
}

/** Raw structured shape the model emits (mapped to GutenbergArticleSpec). */
type LlmArticleSpec = {
  title: string
  slug?: string
  excerpt: string
  seoTitle: string
  seoDescription: string
  intro: string[]
  sections: Array<{
    heading: string
    level: number
    blocks: Array<{ kind: string; text?: string; items?: string[] }>
  }>
  cta?: string
}

const ARTICLE_SPEC_TOOL_NAME = 'emit_article_spec'

const ARTICLE_SPEC_TOOL_SCHEMA: Anthropic.Messages.Tool.InputSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Post title. WordPress owns the H1; never repeat it inside the body.' },
    slug: { type: 'string', description: 'Optional kebab-case slug; derived from the title if omitted.' },
    excerpt: { type: 'string', description: 'One-sentence editorial excerpt.' },
    seoTitle: {
      type: 'string',
      description: 'SEO title ending with the Yoast variables " %%sep%% %%sitename%%".'
    },
    seoDescription: { type: 'string', description: 'Meta description, 120-155 characters, plain UTF-8.' },
    intro: {
      type: 'array',
      description: '1-3 intro paragraphs that frame the problem and promise, rendered before the TOC.',
      items: { type: 'string' }
    },
    sections: {
      type: 'array',
      description: 'Body sections. At least 3 headings total and at least 2 at level 2.',
      items: {
        type: 'object',
        properties: {
          heading: { type: 'string' },
          level: { type: 'integer', enum: [2, 3], description: '2 for major sections, 3 only nested under a level-2.' },
          blocks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                kind: { type: 'string', enum: ['paragraph', 'list', 'quote', 'pullquote'] },
                text: { type: 'string', description: 'For paragraph/quote/pullquote.' },
                items: { type: 'array', items: { type: 'string' }, description: 'For list.' }
              },
              required: ['kind']
            }
          }
        },
        required: ['heading', 'level', 'blocks']
      }
    },
    cta: { type: 'string', description: 'Optional closing CTA sentence.' }
  },
  required: ['title', 'excerpt', 'seoTitle', 'seoDescription', 'intro', 'sections']
}

const LOCALE_VOICE: Record<ArticleIdeationLocale, string> = {
  'es-CL': 'Español neutro latinoamericano, tuteo (tú), claro y profesional. Evita voseo y modismos.',
  'en-US': 'US English, clear and professional, active voice.',
  'pt-BR': 'Português do Brasil, claro e profissional.'
}

export const buildArticleIdeationSystemPrompt = (input: {
  tone: ArticleIdeationTone
  locale: ArticleIdeationLocale
}): string =>
  [
    'Eres editor de contenido de Efeonce, agencia de marketing e inbound/Loop Marketing.',
    `Voz: ${LOCALE_VOICE[input.locale]} Tono editorial: ${input.tone}.`,
    'Produces un blogpost estructurado para el blog público efeoncepro.com, no prosa suelta.',
    'Reglas de estructura obligatorias:',
    '- El título es el H1 (lo pone WordPress); NUNCA generes H1 en el cuerpo.',
    '- Intro: 1 a 3 párrafos que enmarquen el problema y la promesa.',
    '- Al menos 3 secciones con heading; al menos 2 en nivel 2. Los nivel 3 van anidados bajo un nivel 2 (sin saltos H2→H4).',
    '- Cada sección: un heading + 1 a 4 bloques. Usa al menos un bloque de enriquecimiento (list, quote o pullquote) en el artículo.',
    '- Párrafos para el cuerpo; listas para pasos/evidencia/comparaciones; quote para un principio; pullquote para una frase de alto impacto.',
    'Reglas de contenido:',
    '- Solo datos públicos. NUNCA inventes cifras, estadísticas, fuentes ni datos internos o de clientes. Si no tienes un dato verificable, habla cualitativamente.',
    '- No incluyas imágenes ni videos: los agrega un humano con un asset real después.',
    '- SEO title debe terminar con " %%sep%% %%sitename%%" (variables Yoast). Meta description entre 120 y 155 caracteres.',
    'Devuelve el resultado llamando a la herramienta emit_article_spec con el esquema exacto.'
  ].join('\n')

const normalizeBlock = (raw: { kind: string; text?: string; items?: string[] }): GutenbergArticleBlock | null => {
  switch (raw.kind) {
    case 'paragraph':
      return raw.text?.trim() ? { kind: 'paragraph', text: raw.text.trim() } : null
    case 'quote':
      return raw.text?.trim() ? { kind: 'quote', text: raw.text.trim() } : null
    case 'pullquote':
      return raw.text?.trim() ? { kind: 'pullquote', text: raw.text.trim() } : null

    case 'list': {
      const items = (raw.items ?? []).map(item => item.trim()).filter(Boolean)

      return items.length ? { kind: 'list', items } : null
    }

    default:
      return null
  }
}

const normalizeSection = (raw: LlmArticleSpec['sections'][number]): GutenbergArticleSection | null => {
  const level = raw.level === 3 ? 3 : 2
  const blocks = raw.blocks.map(normalizeBlock).filter((block): block is GutenbergArticleBlock => block !== null)

  if (!raw.heading?.trim() || !blocks.length) return null

  return { heading: raw.heading.trim(), level, blocks }
}

export const normalizeLlmArticleSpec = (raw: LlmArticleSpec, input: ArticleIdeationInput): GutenbergArticleSpec => {
  const sections = raw.sections
    .map(normalizeSection)
    .filter((section): section is GutenbergArticleSection => section !== null)

  return {
    title: raw.title.trim(),
    slug: raw.slug?.trim() || undefined,
    excerpt: raw.excerpt.trim(),
    seo: {
      title: raw.seoTitle.trim(),
      description: raw.seoDescription.trim(),
      indexPolicy: 'index'
    },
    intro: raw.intro.map(paragraph => paragraph.trim()).filter(Boolean),
    sections,
    cta: raw.cta?.trim() ? { text: raw.cta.trim() } : undefined,
    intent: 'create',
    attribution: input.primaryKeyword ? { utm: { utm_term: input.primaryKeyword } } : {}
  }
}

const buildIdeationPrompt = (input: ArticleIdeationInput): string =>
  [
    `Idea del artículo: ${input.idea}`,
    input.context ? `Contexto adicional: ${input.context}` : '',
    input.audience ? `Audiencia objetivo: ${input.audience}` : '',
    input.primaryKeyword ? `Keyword primaria: ${input.primaryKeyword}` : '',
    input.secondaryKeywords?.length ? `Keywords secundarias: ${input.secondaryKeywords.join(', ')}` : '',
    'Redacta el blogpost completo respetando todas las reglas y devuélvelo con emit_article_spec.'
  ]
    .filter(Boolean)
    .join('\n')

/**
 * Autonomous production: idea + context → a full structured article spec.
 * The returned spec must still pass `authorGutenbergDraft` + validation before write.
 */
export const ideateArticleSpec = async (input: ArticleIdeationInput): Promise<ArticleIdeationResult> => {
  if (!input.idea?.trim()) throw new Error('content_factory_ideation_idea_required')

  const model = resolveArticleIdeationModel(input.model)
  const tone = input.tone ?? 'thought_leadership'
  const locale = input.locale ?? 'es-CL'

  const result = await generateStructuredAnthropic<LlmArticleSpec>({
    model,
    system: buildArticleIdeationSystemPrompt({ tone, locale }),
    prompt: buildIdeationPrompt(input),
    toolName: ARTICLE_SPEC_TOOL_NAME,
    toolDescription: 'Emit the structured Efeonce blogpost spec.',
    inputSchema: ARTICLE_SPEC_TOOL_SCHEMA,
    maxTokens: 8192,
    temperature: 0.6
  })

  return {
    spec: normalizeLlmArticleSpec(result.data, input),
    model: result.model,
    usage: result.usage
  }
}

export type ArticleRevisionInput = {
  spec: GutenbergArticleSpec
  instruction: string
  locale?: ArticleIdeationLocale
  tone?: ArticleIdeationTone
  model?: string
}

/**
 * Co-creation: steer an existing spec with a human instruction and return a
 * revised spec. The operator injects tacit knowledge; the model rewrites within
 * the same structural rules. Preserves everything the instruction does not touch.
 */
export const reviseArticleSpec = async (input: ArticleRevisionInput): Promise<ArticleIdeationResult> => {
  if (!input.instruction?.trim()) throw new Error('content_factory_revision_instruction_required')

  const model = resolveArticleIdeationModel(input.model)
  const tone = input.tone ?? 'thought_leadership'
  const locale = input.locale ?? 'es-CL'

  const prompt = [
    'Este es el spec actual del artículo (JSON):',
    JSON.stringify(input.spec, null, 2),
    '',
    `Instrucción del operador: ${input.instruction}`,
    '',
    'Aplica SOLO lo que pide la instrucción; preserva el resto. Devuelve el spec completo revisado con emit_article_spec.'
  ].join('\n')

  const result = await generateStructuredAnthropic<LlmArticleSpec>({
    model,
    system: buildArticleIdeationSystemPrompt({ tone, locale }),
    prompt,
    toolName: ARTICLE_SPEC_TOOL_NAME,
    toolDescription: 'Emit the revised Efeonce blogpost spec.',
    inputSchema: ARTICLE_SPEC_TOOL_SCHEMA,
    maxTokens: 8192,
    temperature: 0.4
  })

  return {
    spec: normalizeLlmArticleSpec(result.data, { idea: input.instruction, primaryKeyword: undefined }),
    model: result.model,
    usage: result.usage
  }
}
