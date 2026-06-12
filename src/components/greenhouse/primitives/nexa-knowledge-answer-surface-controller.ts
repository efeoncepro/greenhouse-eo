export type NexaKnowledgeAnswerSurfaceVariant = 'conversationTrace' | 'overviewPanel' | 'toolResult'
export type NexaKnowledgeAnswerSurfaceKind = 'knowledgeAnswerTrace' | 'knowledgeToolResult'

export interface NexaKnowledgeAnswerSurfaceVariantConfig {
  variant: NexaKnowledgeAnswerSurfaceVariant
  proofPlacement: 'sidecar' | 'inline'
  showTrace: boolean
}

export interface NexaKnowledgeAnswerSurfaceKindConfig {
  kind: NexaKnowledgeAnswerSurfaceKind
  variant: NexaKnowledgeAnswerSurfaceVariant
  ariaLabel: string
}

export const NEXA_KNOWLEDGE_ANSWER_SURFACE_VARIANT_CONFIG: Record<
  NexaKnowledgeAnswerSurfaceVariant,
  NexaKnowledgeAnswerSurfaceVariantConfig
> = {
  conversationTrace: {
    variant: 'conversationTrace',
    proofPlacement: 'sidecar',
    showTrace: true
  },
  overviewPanel: {
    variant: 'overviewPanel',
    proofPlacement: 'inline',
    showTrace: false
  },
  toolResult: {
    variant: 'toolResult',
    proofPlacement: 'inline',
    showTrace: false
  }
}

export const NEXA_KNOWLEDGE_ANSWER_SURFACE_KIND_CONFIG: Record<
  NexaKnowledgeAnswerSurfaceKind,
  NexaKnowledgeAnswerSurfaceKindConfig
> = {
  knowledgeAnswerTrace: {
    kind: 'knowledgeAnswerTrace',
    variant: 'conversationTrace',
    ariaLabel: 'Respuesta trazable de Nexa para Knowledge'
  },
  knowledgeToolResult: {
    kind: 'knowledgeToolResult',
    variant: 'toolResult',
    ariaLabel: 'Resultado de herramienta de Nexa con evidencia'
  }
}

export const resolveNexaKnowledgeAnswerSurfaceKind = (
  kind?: NexaKnowledgeAnswerSurfaceKind
): NexaKnowledgeAnswerSurfaceKindConfig => NEXA_KNOWLEDGE_ANSWER_SURFACE_KIND_CONFIG[kind ?? 'knowledgeAnswerTrace']

export const resolveNexaKnowledgeAnswerSurfaceVariant = (
  variant?: NexaKnowledgeAnswerSurfaceVariant,
  kind?: NexaKnowledgeAnswerSurfaceKind
): NexaKnowledgeAnswerSurfaceVariantConfig => {
  const resolvedVariant = variant ?? resolveNexaKnowledgeAnswerSurfaceKind(kind).variant

  return NEXA_KNOWLEDGE_ANSWER_SURFACE_VARIANT_CONFIG[resolvedVariant]
}
