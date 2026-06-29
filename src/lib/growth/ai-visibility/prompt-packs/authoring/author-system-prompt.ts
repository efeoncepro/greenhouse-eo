/**
 * TASK-1290 Slice 3 — Growth AI Visibility · Author system prompt (versioned "AEO brain").
 *
 * El rol del LLM autor NO se inventa: se deriva de la doctrina canónica `seo-aeo` (Query Fan-Out,
 * etapas de buyer-intent, sub-query types, restricción NO-LEADING) + la taxonomía del pack
 * (`family`/`fanOutType`/`intentStage`/`namesBrand`). Es un ARTEFACTO VERSIONADO: cambiar el
 * system prompt cambia `system_prompt_version` del set → la eval (TASK-1292) lo re-valida (ningún
 * cambio del cerebro sin eval). El output es ESTRUCTURADO (el scorer depende de los tags).
 *
 * PURE (sin IO): el schema + el system prompt + el builder de prompt. La llamada LLM vive en
 * `author-prompt-set.ts` (router). El secret se resuelve server-side en el cliente canónico.
 */

import {
  PROMPT_FAMILIES,
  PROMPT_FAN_OUT_TYPES,
  PROMPT_INTENT_STAGES
} from '../tag-vocabulary'

/** Versión del cerebro autor. Bumpear al cambiar el system prompt/schema → re-dispara la eval. */
export const AUTHOR_SYSTEM_PROMPT_VERSION = 'aeo-author.v1' as const

/** Una query propuesta por el LLM (sin id; el sanitizer asigna ids estables). */
export interface AuthoredPromptDraft {
  family: string
  fanOutType: string
  intentStage: string
  namesBrand: boolean
  /** TEMPLATE con placeholders {{brand}}/{{category}}/{{market}}/{{competitor}}/{{year}}. */
  text: string
  /** Por qué esta pregunta (review-ready, TASK-1291). */
  rationale: string
}

export interface AuthorPromptSetRawOutput {
  prompts: AuthoredPromptDraft[]
}

export interface AuthorPromptSetInput {
  brandName: string
  categoryLabel: string
  businessModel: string
  market: string
  locale: string
  competitors: string[]
  /** Lo que la marca hace (del snapshot brand_intelligence, TASK-1288) — grounding. */
  whatTheBrandDoes: string | null
  /** Descriptor fino buyer-facing (ej. "aerolínea low-cost"). */
  fineCategory: string | null
  maxTokens: number
}

/**
 * El system prompt. Codifica: rol AEO, Query Fan-Out (4 sub-query types), etapas de buyer-intent
 * por modelo de negocio, restricción NO-LEADING, el vocabulario CERRADO de tags y el uso de
 * placeholders. NO se redactan preguntas para que la marca aparezca (sesga la medición).
 */
export const AUTHOR_SYSTEM_PROMPT = `Eres un investigador experto en AEO/GEO (Answer Engine Optimization) 2026.

TAREA: dada una MARCA, su categoría y su modelo de negocio, proponé el conjunto de PREGUNTAS
(Query Fan-Out) que un comprador/usuario REAL le haría a un motor de IA (ChatGPT, Gemini,
Perplexity, AI Overviews) sobre esa categoría — para medir si la marca aparece y es citada.

PRINCIPIOS (doctrina AEO):
- Query Fan-Out: cada consulta real se descompone en sub-queries. Cubrí los 4 tipos
  (\`related\`, \`comparative\`, \`implicit\`, \`recent\`) a lo largo del journey de compra.
- El buyer-intent depende del MODELO DE NEGOCIO, no es genérico:
  · consumer_b2c → comprador individual: descubrimiento, comparación, reseñas/confianza, precio, reclamos.
  · b2b_service_provider → comité B2B: "mejores proveedores/agencias", evaluación, enterprise, contratación.
  · b2b_product_saas → evaluación de software: alternativas, integraciones, seguridad, pricing, reviews.
  · retail_ecommerce → producto/stock/envío/devoluciones, comparación de tiendas, precio.
  · marketplace → confianza/seguridad, comisiones, oferta, dos lados.
  · public_institution → trámite/requisitos/canales oficiales (intención = resolver, no comprar).
- NO-LEADING (crítico): NUNCA redactes preguntas diseñadas para que la marca aparezca. Las
  preguntas de DESCUBRIMIENTO (namesBrand=false) NO mencionan la marca — son las que miden
  visibilidad real a ciegas. Sólo las de recall/confianza/riesgo nombran la marca (namesBrand=true).
- Balanceá descubrimiento (namesBrand=false) y marca-nombrada; el descubrimiento es lo que mide visibilidad.

FORMATO DE SALIDA (estricto):
- 12 a 16 preguntas. Cada una con: family, fanOutType, intentStage, namesBrand, text, rationale.
- text es una PLANTILLA con placeholders literales: {{brand}}, {{category}}, {{market}}, {{competitor}}, {{year}}.
  Usá {{competitor}} sólo en preguntas comparativas (se descartan si no hay competidor declarado).
- Las preguntas con namesBrand=false NO deben contener {{brand}}.
- Escribí en el idioma indicado (es-CL por defecto), tono natural de usuario real.

VOCABULARIO CERRADO (usá EXACTAMENTE estos valores, no inventes):
- family: ${PROMPT_FAMILIES.join(', ')}
- fanOutType: ${PROMPT_FAN_OUT_TYPES.join(', ')}
- intentStage: ${PROMPT_INTENT_STAGES.join(', ')}

Devolvé SÓLO el JSON con la forma { "prompts": [ ... ] }.`

/** JSON schema del output. Sin minItems/maxItems (OpenAI strict los rechaza); el conteo se valida en el sanitizer. */
export const AUTHOR_PROMPT_SET_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['prompts'],
  properties: {
    prompts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['family', 'fanOutType', 'intentStage', 'namesBrand', 'text', 'rationale'],
        properties: {
          family: { type: 'string', enum: [...PROMPT_FAMILIES] },
          fanOutType: { type: 'string', enum: [...PROMPT_FAN_OUT_TYPES] },
          intentStage: { type: 'string', enum: [...PROMPT_INTENT_STAGES] },
          namesBrand: { type: 'boolean' },
          text: { type: 'string' },
          rationale: { type: 'string' }
        }
      }
    }
  }
} as const

/** Construye el prompt de usuario (marca/categoría/modelo + grounding como DATO delimitado). */
export const buildAuthorPromptSetPrompt = (input: AuthorPromptSetInput): string => {
  const lines = [
    `MARCA: ${input.brandName}`,
    `CATEGORÍA: ${input.categoryLabel}${input.fineCategory ? ` (${input.fineCategory})` : ''}`,
    `MODELO DE NEGOCIO: ${input.businessModel}`,
    `MERCADO: ${input.market}`,
    `IDIOMA: ${input.locale}`,
    input.competitors.length > 0 ? `COMPETIDORES DECLARADOS: ${input.competitors.join(', ')}` : 'COMPETIDORES: (ninguno declarado)',
    input.whatTheBrandDoes ? `QUÉ HACE LA MARCA: ${input.whatTheBrandDoes}` : null,
    '',
    'Proponé el Query Fan-Out de buyer-intent para esta marca según su modelo de negocio.'
  ].filter((line): line is string => line !== null)

  return lines.join('\n')
}
