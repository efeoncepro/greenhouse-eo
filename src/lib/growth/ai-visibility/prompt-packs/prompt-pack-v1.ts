/**
 * TASK-1226 — Growth AI Visibility Grader · Prompt pack V1 (promovido de TASK-1228).
 *
 * Espejo tipado de `docs/architecture/growth/ai-visibility/prompt-pack.v1.json`
 * (artefacto durable del spike). Los valores de marca/categoría se interpolan
 * como DATO delimitado (anti prompt-injection); NUNCA PII. Prompt pack activo es
 * inmutable: cambios → versión nueva (v2…).
 */

import {
  type PromptFamily,
  type PromptFanOutType,
  type PromptIntentStage
} from './tag-vocabulary'

export const GROWTH_AI_VISIBILITY_PROMPT_PACK_VERSION = 'prompt-pack.v1'

export interface GrowthAiVisibilityPromptDefinition {
  id: string
  family: PromptFamily
  fanOutType: PromptFanOutType
  intentStage: PromptIntentStage
  namesBrand: boolean
  text: string
}

export interface GrowthAiVisibilityPromptPack {
  version: string
  locale: string
  market: string
  prompts: GrowthAiVisibilityPromptDefinition[]
}

export const GROWTH_AI_VISIBILITY_PROMPT_PACK_V1: GrowthAiVisibilityPromptPack = {
  version: GROWTH_AI_VISIBILITY_PROMPT_PACK_VERSION,
  locale: 'es-CL',
  market: 'CL',
  prompts: [
    { id: 'p01', family: 'category_discovery', fanOutType: 'related', intentStage: 'awareness', namesBrand: false, text: '¿Qué agencias de {{category}} ayudan a empresas en {{market}}?' },
    { id: 'p02', family: 'category_discovery', fanOutType: 'implicit', intentStage: 'problem_aware', namesBrand: false, text: 'Necesito mejorar {{painPoint}} en mi empresa. ¿Qué tipo de agencia o servicio debería buscar en {{market}}?' },
    { id: 'p03', family: 'provider_recommendation', fanOutType: 'related', intentStage: 'consideration', namesBrand: false, text: '¿Cuáles son las mejores agencias de {{category}} en {{market}}?' },
    { id: 'p04', family: 'provider_recommendation', fanOutType: 'implicit', intentStage: 'consideration', namesBrand: false, text: 'Recomiéndame proveedores confiables de {{category}} para una empresa enterprise en {{market}}.' },
    { id: 'p05', family: 'comparison', fanOutType: 'comparative', intentStage: 'comparison', namesBrand: true, text: '{{brand}} frente a {{competitor}}: ¿cuál conviene para {{category}}?' },
    { id: 'p06', family: 'comparison', fanOutType: 'comparative', intentStage: 'comparison', namesBrand: false, text: '¿Qué alternativas hay a {{competitor}} para {{category}} en {{market}}?' },
    { id: 'p07', family: 'trust_reputation', fanOutType: 'implicit', intentStage: 'trust', namesBrand: true, text: '¿Es {{brand}} una agencia confiable para {{category}}?' },
    { id: 'p08', family: 'trust_reputation', fanOutType: 'recent', intentStage: 'trust', namesBrand: true, text: '¿Qué opiniones o reseñas hay sobre {{brand}} en {{year}}?' },
    { id: 'p09', family: 'purchase_readiness', fanOutType: 'implicit', intentStage: 'purchase_intent', namesBrand: false, text: '¿Cuánto cuesta contratar servicios de {{category}} con una agencia en {{market}}?' },
    { id: 'p10', family: 'purchase_readiness', fanOutType: 'implicit', intentStage: 'purchase_intent', namesBrand: true, text: '¿Qué debería considerar antes de contratar a {{brand}} para {{category}}?' },
    { id: 'p11', family: 'local_intent', fanOutType: 'related', intentStage: 'local', namesBrand: false, text: 'Mejor agencia de {{category}} en Santiago de Chile.' },
    { id: 'p12', family: 'enterprise_intent', fanOutType: 'implicit', intentStage: 'enterprise', namesBrand: false, text: 'Agencia enterprise de {{category}} para una marca grande (aerolínea o banca) en {{market}}.' },
    { id: 'p13', family: 'risk_reputation', fanOutType: 'comparative', intentStage: 'risk', namesBrand: true, text: 'Problemas, quejas o críticas frecuentes sobre {{brand}}.' },
    { id: 'p14', family: 'message_recall', fanOutType: 'related', intentStage: 'message_recall', namesBrand: true, text: '¿Qué hace {{brand}} y a quién atiende?' },
    { id: 'p15', family: 'message_recall', fanOutType: 'implicit', intentStage: 'message_recall', namesBrand: true, text: '¿En qué se especializa {{brand}}?' },
    { id: 'p16', family: 'comparison', fanOutType: 'recent', intentStage: 'comparison', namesBrand: false, text: '¿Quiénes son los líderes de {{category}} en {{market}} en {{year}}?' }
  ]
}
