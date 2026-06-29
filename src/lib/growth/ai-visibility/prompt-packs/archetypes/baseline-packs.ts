/**
 * TASK-1290 Slice 1 — Growth AI Visibility · Baselines deterministas por arquetipo.
 *
 * El fallback determinista del generador de prompts: un pack por `business_model` con el
 * framing de buyer-intent REAL del arquetipo (JTBD + Query Fan-Out), NO el pack agencia
 * traducido. Cierra el núcleo de ISSUE-110: una marca de consumo (SKY) se mide con preguntas
 * de consumidor ("¿cuáles son las mejores aerolíneas?"), no de comprador-de-agencia.
 *
 * Diseño (seo-aeo §04 + commercial JTBD):
 *  - Cobertura de los 4 `fanOutType` (related/comparative/implicit/recent) por las etapas que
 *    aplican al modelo de negocio.
 *  - Balance discovery (`namesBrand=false`, mide visibilidad real a ciegas) vs brand-named
 *    (recall/trust/risk).
 *  - Vocabulario de tags CERRADO (`tag-vocabulary.ts`) — el scorer pondera por `intentStage`.
 *  - Interpolación delimitada ({{brand}}/{{category}}/{{market}}/{{competitor}}/{{year}}); los
 *    prompts con {{competitor}} sin competidor se descartan aguas abajo (resolvePromptInputs).
 *
 * `b2b_service_provider` (agencia) = el pack v1 EXACTO (no-regresión bit-for-bit del lead magnet).
 * El detalle fino por marca (verbos, intents locales) lo refina la autoría LLM (Slice 3); este
 * baseline es archetype-appropriate pero category-noun-based (determinista, sin LLM).
 */

import { type BrandBusinessModel } from '../../brand-intelligence/contracts'
import {
  GROWTH_AI_VISIBILITY_PROMPT_PACK_V1,
  type GrowthAiVisibilityPromptDefinition,
  type GrowthAiVisibilityPromptPack
} from '../prompt-pack-v1'

type Prompt = GrowthAiVisibilityPromptDefinition

// ── Consumo (B2C) — el caso SKY. Comprador N=1, journey emocional+precio. ──────────────
const CONSUMER_B2C_PROMPTS: Prompt[] = [
  { id: 'cb01', family: 'category_discovery', fanOutType: 'related', intentStage: 'awareness', namesBrand: false, text: '¿Cuáles son las mejores {{category}} en {{market}}?' },
  { id: 'cb02', family: 'category_discovery', fanOutType: 'implicit', intentStage: 'consideration', namesBrand: false, text: 'Estoy evaluando opciones de {{category}} en {{market}}. ¿Cuáles me recomiendas?' },
  { id: 'cb03', family: 'product_discovery', fanOutType: 'related', intentStage: 'awareness', namesBrand: false, text: '¿Qué {{category}} tienen mejor reputación en {{market}}?' },
  { id: 'cb04', family: 'comparison', fanOutType: 'comparative', intentStage: 'comparison', namesBrand: true, text: '{{brand}} o {{competitor}}: ¿cuál conviene más?' },
  { id: 'cb05', family: 'comparison', fanOutType: 'comparative', intentStage: 'comparison', namesBrand: false, text: '¿Qué alternativas hay a {{competitor}} en {{category}}?' },
  { id: 'cb06', family: 'trust_reputation', fanOutType: 'implicit', intentStage: 'trust', namesBrand: true, text: '¿Vale la pena {{brand}}? ¿Qué experiencia tienen sus clientes?' },
  { id: 'cb07', family: 'trust_reputation', fanOutType: 'recent', intentStage: 'trust', namesBrand: true, text: '¿Qué opiniones o reseñas hay sobre {{brand}} en {{year}}?' },
  { id: 'cb08', family: 'purchase_readiness', fanOutType: 'implicit', intentStage: 'purchase_intent', namesBrand: false, text: '¿Qué {{category}} conviene elegir por precio y calidad en {{market}}?' },
  { id: 'cb09', family: 'purchase_readiness', fanOutType: 'implicit', intentStage: 'purchase_intent', namesBrand: true, text: '¿Qué debería tener en cuenta antes de elegir {{brand}}?' },
  { id: 'cb10', family: 'risk_reputation', fanOutType: 'comparative', intentStage: 'risk', namesBrand: true, text: 'Problemas, quejas o reclamos frecuentes sobre {{brand}}.' },
  { id: 'cb11', family: 'local_intent', fanOutType: 'related', intentStage: 'local', namesBrand: false, text: 'Mejores {{category}} en {{market}}.' },
  { id: 'cb12', family: 'message_recall', fanOutType: 'related', intentStage: 'message_recall', namesBrand: true, text: '¿Qué es {{brand}} y qué ofrece?' },
  { id: 'cb13', family: 'message_recall', fanOutType: 'implicit', intentStage: 'message_recall', namesBrand: true, text: '¿En qué se destaca {{brand}}?' },
  { id: 'cb14', family: 'comparison', fanOutType: 'recent', intentStage: 'comparison', namesBrand: false, text: '¿Cuáles son las {{category}} líderes en {{market}} en {{year}}?' }
]

// ── B2B producto/SaaS — evaluación de software (integraciones, seguridad, pricing, reviews). ──
const B2B_PRODUCT_SAAS_PROMPTS: Prompt[] = [
  { id: 'sa01', family: 'category_discovery', fanOutType: 'related', intentStage: 'awareness', namesBrand: false, text: '¿Cuáles son las mejores plataformas de {{category}} para empresas en {{market}}?' },
  { id: 'sa02', family: 'category_discovery', fanOutType: 'implicit', intentStage: 'problem_aware', namesBrand: false, text: 'Necesito una herramienta de {{category}} para mi empresa. ¿Qué opciones debería evaluar?' },
  { id: 'sa03', family: 'comparison', fanOutType: 'comparative', intentStage: 'comparison', namesBrand: true, text: '{{brand}} vs {{competitor}}: ¿cuál conviene para {{category}}?' },
  { id: 'sa04', family: 'comparison', fanOutType: 'comparative', intentStage: 'comparison', namesBrand: false, text: '¿Qué alternativas a {{competitor}} existen para {{category}}?' },
  { id: 'sa05', family: 'value_assessment', fanOutType: 'implicit', intentStage: 'consideration', namesBrand: true, text: '¿Qué integraciones y capacidades ofrece {{brand}}?' },
  { id: 'sa06', family: 'trust_reputation', fanOutType: 'recent', intentStage: 'trust', namesBrand: true, text: '¿Qué opiniones o reseñas hay sobre {{brand}} en {{year}}?' },
  { id: 'sa07', family: 'risk_reputation', fanOutType: 'implicit', intentStage: 'risk', namesBrand: true, text: '¿Qué limitaciones o problemas reportan los usuarios de {{brand}}?' },
  { id: 'sa08', family: 'purchase_readiness', fanOutType: 'implicit', intentStage: 'purchase_intent', namesBrand: false, text: '¿Cuánto cuesta una solución de {{category}} para una empresa en {{market}}?' },
  { id: 'sa09', family: 'purchase_readiness', fanOutType: 'implicit', intentStage: 'purchase_intent', namesBrand: true, text: '¿Qué planes y precios tiene {{brand}}?' },
  { id: 'sa10', family: 'enterprise_intent', fanOutType: 'implicit', intentStage: 'enterprise', namesBrand: false, text: '¿Qué plataforma de {{category}} es mejor para una empresa grande en {{market}}?' },
  { id: 'sa11', family: 'message_recall', fanOutType: 'related', intentStage: 'message_recall', namesBrand: true, text: '¿Qué hace {{brand}} y a qué tipo de empresas sirve?' },
  { id: 'sa12', family: 'comparison', fanOutType: 'recent', intentStage: 'comparison', namesBrand: false, text: '¿Quiénes son los líderes de {{category}} en {{market}} en {{year}}?' }
]

// ── Retail / ecommerce — producto, stock, envío, devoluciones, comparación de tiendas. ──
const RETAIL_ECOMMERCE_PROMPTS: Prompt[] = [
  { id: 're01', family: 'category_discovery', fanOutType: 'related', intentStage: 'awareness', namesBrand: false, text: '¿Cuáles son las mejores tiendas de {{category}} en {{market}}?' },
  { id: 're02', family: 'product_discovery', fanOutType: 'implicit', intentStage: 'consideration', namesBrand: false, text: '¿Dónde conviene comprar {{category}} en {{market}}?' },
  { id: 're03', family: 'comparison', fanOutType: 'comparative', intentStage: 'comparison', namesBrand: true, text: '¿Conviene comprar en {{brand}} o en {{competitor}}?' },
  { id: 're04', family: 'comparison', fanOutType: 'comparative', intentStage: 'comparison', namesBrand: false, text: '¿Qué alternativas a {{competitor}} hay para comprar {{category}}?' },
  { id: 're05', family: 'purchase_readiness', fanOutType: 'implicit', intentStage: 'purchase_intent', namesBrand: false, text: '¿Dónde encuentro {{category}} al mejor precio en {{market}}?' },
  { id: 're06', family: 'support_experience', fanOutType: 'implicit', intentStage: 'trust', namesBrand: true, text: '¿Cómo son los envíos, devoluciones y la atención de {{brand}}?' },
  { id: 're07', family: 'trust_reputation', fanOutType: 'recent', intentStage: 'trust', namesBrand: true, text: '¿Qué opiniones o reseñas hay sobre comprar en {{brand}} en {{year}}?' },
  { id: 're08', family: 'risk_reputation', fanOutType: 'comparative', intentStage: 'risk', namesBrand: true, text: 'Problemas o reclamos frecuentes al comprar en {{brand}}.' },
  { id: 're09', family: 'local_intent', fanOutType: 'related', intentStage: 'local', namesBrand: false, text: 'Mejores tiendas de {{category}} en {{market}}.' },
  { id: 're10', family: 'message_recall', fanOutType: 'related', intentStage: 'message_recall', namesBrand: true, text: '¿Qué vende {{brand}} y a quién?' },
  { id: 're11', family: 'category_discovery', fanOutType: 'recent', intentStage: 'comparison', namesBrand: false, text: '¿Cuáles son las tiendas de {{category}} líderes en {{market}} en {{year}}?' }
]

// ── Marketplace — dos lados; oferta/liquidez, confianza, comisiones. ──────────────────────
const MARKETPLACE_PROMPTS: Prompt[] = [
  { id: 'mk01', family: 'category_discovery', fanOutType: 'related', intentStage: 'awareness', namesBrand: false, text: '¿Cuáles son los mejores marketplaces de {{category}} en {{market}}?' },
  { id: 'mk02', family: 'product_discovery', fanOutType: 'implicit', intentStage: 'consideration', namesBrand: false, text: '¿En qué plataforma conviene comprar o vender {{category}} en {{market}}?' },
  { id: 'mk03', family: 'comparison', fanOutType: 'comparative', intentStage: 'comparison', namesBrand: true, text: '{{brand}} o {{competitor}}: ¿qué marketplace conviene más?' },
  { id: 'mk04', family: 'value_assessment', fanOutType: 'implicit', intentStage: 'consideration', namesBrand: true, text: '¿Qué comisiones y condiciones tiene {{brand}}?' },
  { id: 'mk05', family: 'trust_reputation', fanOutType: 'recent', intentStage: 'trust', namesBrand: true, text: '¿Es seguro y confiable {{brand}}? ¿Qué opinan sus usuarios en {{year}}?' },
  { id: 'mk06', family: 'risk_reputation', fanOutType: 'comparative', intentStage: 'risk', namesBrand: true, text: 'Estafas, problemas o reclamos frecuentes en {{brand}}.' },
  { id: 'mk07', family: 'comparison', fanOutType: 'comparative', intentStage: 'comparison', namesBrand: false, text: '¿Qué alternativas a {{competitor}} hay para {{category}}?' },
  { id: 'mk08', family: 'message_recall', fanOutType: 'related', intentStage: 'message_recall', namesBrand: true, text: '¿Qué es {{brand}} y cómo funciona?' },
  { id: 'mk09', family: 'category_discovery', fanOutType: 'recent', intentStage: 'comparison', namesBrand: false, text: '¿Cuáles son los marketplaces líderes de {{category}} en {{market}} en {{year}}?' }
]

// ── Institución pública — intención = resolver un trámite, no comprar. ──────────────────────
const PUBLIC_INSTITUTION_PROMPTS: Prompt[] = [
  { id: 'pi01', family: 'category_discovery', fanOutType: 'implicit', intentStage: 'awareness', namesBrand: false, text: '¿Qué organismo en {{market}} se encarga de {{category}}?' },
  { id: 'pi02', family: 'support_experience', fanOutType: 'implicit', intentStage: 'consideration', namesBrand: true, text: '¿Cómo hago un trámite en {{brand}}? ¿Qué requisitos y canales hay?' },
  { id: 'pi03', family: 'message_recall', fanOutType: 'related', intentStage: 'message_recall', namesBrand: true, text: '¿Qué es {{brand}} y qué servicios entrega?' },
  { id: 'pi04', family: 'availability_access', fanOutType: 'implicit', intentStage: 'local', namesBrand: true, text: '¿Cómo contacto a {{brand}} y dónde están sus oficinas en {{market}}?' },
  { id: 'pi05', family: 'trust_reputation', fanOutType: 'recent', intentStage: 'trust', namesBrand: true, text: '¿Qué experiencias o reclamos reportan los ciudadanos sobre {{brand}} en {{year}}?' },
  { id: 'pi06', family: 'risk_reputation', fanOutType: 'comparative', intentStage: 'risk', namesBrand: true, text: 'Problemas o demoras frecuentes con {{brand}}.' }
]

// ── Genérico — fallback honesto cuando el modelo es `unknown` (sin sesgo de agencia). ──────
const GENERIC_PROMPTS: Prompt[] = [
  { id: 'gn01', family: 'category_discovery', fanOutType: 'related', intentStage: 'awareness', namesBrand: false, text: '¿Cuáles son las mejores opciones de {{category}} en {{market}}?' },
  { id: 'gn02', family: 'category_discovery', fanOutType: 'implicit', intentStage: 'consideration', namesBrand: false, text: 'Estoy buscando {{category}} en {{market}}. ¿Qué me recomiendas?' },
  { id: 'gn03', family: 'comparison', fanOutType: 'comparative', intentStage: 'comparison', namesBrand: false, text: '¿Qué alternativas hay a {{competitor}} para {{category}}?' },
  { id: 'gn04', family: 'trust_reputation', fanOutType: 'recent', intentStage: 'trust', namesBrand: true, text: '¿Qué opiniones o reseñas hay sobre {{brand}} en {{year}}?' },
  { id: 'gn05', family: 'risk_reputation', fanOutType: 'comparative', intentStage: 'risk', namesBrand: true, text: 'Problemas o quejas frecuentes sobre {{brand}}.' },
  { id: 'gn06', family: 'message_recall', fanOutType: 'related', intentStage: 'message_recall', namesBrand: true, text: '¿Qué es {{brand}} y a quién atiende?' },
  { id: 'gn07', family: 'comparison', fanOutType: 'recent', intentStage: 'comparison', namesBrand: false, text: '¿Quiénes son los líderes de {{category}} en {{market}} en {{year}}?' }
]

const pack = (version: string, prompts: Prompt[]): GrowthAiVisibilityPromptPack => ({
  version,
  locale: 'es-CL',
  market: 'CL',
  prompts
})

export const ARCHETYPE_BASELINE_PACK_BY_MODEL: Record<BrandBusinessModel, GrowthAiVisibilityPromptPack> = {
  // Agencia = el pack v1 EXACTO (no-regresión bit-for-bit; misma version, mismos ids/tags).
  b2b_service_provider: GROWTH_AI_VISIBILITY_PROMPT_PACK_V1,
  consumer_b2c: pack('archetype-consumer_b2c.v1', CONSUMER_B2C_PROMPTS),
  b2b_product_saas: pack('archetype-b2b_product_saas.v1', B2B_PRODUCT_SAAS_PROMPTS),
  retail_ecommerce: pack('archetype-retail_ecommerce.v1', RETAIL_ECOMMERCE_PROMPTS),
  marketplace: pack('archetype-marketplace.v1', MARKETPLACE_PROMPTS),
  public_institution: pack('archetype-public_institution.v1', PUBLIC_INSTITUTION_PROMPTS),
  // unknown → genérico neutral (NUNCA el pack agencia: eso re-introduce ISSUE-110). El gate
  // de TASK-1291 bloquea correr sobre prospecto con modelo `unknown` sin confirmar.
  unknown: pack('archetype-generic.v1', GENERIC_PROMPTS)
}

/**
 * Resuelve el baseline determinista del arquetipo para un modelo de negocio. `null`/desconocido
 * → genérico neutral (honesto, sin sesgo de agencia). Es el fallback; el set congelado autorado
 * por LLM (Slice 2/3) tiene prioridad cuando existe y está `active`.
 */
export const resolveArchetypeBaselinePack = (
  businessModel: string | null | undefined
): GrowthAiVisibilityPromptPack => {
  const key = (businessModel ?? 'unknown') as BrandBusinessModel

  return ARCHETYPE_BASELINE_PACK_BY_MODEL[key] ?? ARCHETYPE_BASELINE_PACK_BY_MODEL.unknown
}
