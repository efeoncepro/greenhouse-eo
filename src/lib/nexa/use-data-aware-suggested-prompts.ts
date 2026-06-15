'use client'

import { useEffect, useState } from 'react'

import { isNexaSuggestedPromptsDataAwareEnabled } from './flags'
import type { NexaSuggestedPromptsPayload } from './suggested-prompts-contract'
import type { NexaPageContextValue, NexaPromptContext } from './suggested-prompts'

// TASK-1087 — Hook cliente que CAPA los prompts data-aware (Tier 2) sobre los Tier 1/1.5. Es
// puramente ADITIVO: con el flag off, sin `entityId`, fuera del contexto `client`, o si el fetch
// falla / devuelve `template_fallback`, retorna los prompts de plantilla intactos (comportamiento
// previo byte-idéntico). Solo reemplaza por los data-aware cuando el endpoint responde con señales
// reales (`source: 'data_aware'`). Consume el contrato PURO (no el composer server-only).

export const useDataAwareSuggestedPrompts = (
  promptContext: NexaPromptContext,
  pageContext: NexaPageContextValue | null
): string[] => {
  const [dataAwarePrompts, setDataAwarePrompts] = useState<string[] | null>(null)

  const contextKey = promptContext.key
  const entityId = pageContext?.entityId
  const entityKind = pageContext?.entityKind
  const entityName = pageContext?.entityName

  useEffect(() => {
    // Resetear al cambiar de entidad/contexto → nunca mostrar prompts de otra entidad.
    setDataAwarePrompts(null)

    if (!isNexaSuggestedPromptsDataAwareEnabled()) return
    if (!entityId || entityKind !== 'organization') return
    // V1: solo el contexto `client` (org workspace) es data-aware.
    if (contextKey !== 'client') return

    const controller = new AbortController()
    const params = new URLSearchParams({ context: contextKey, entityId })

    if (entityName) params.set('entityName', entityName)

    fetch(`/api/nexa/suggested-prompts?${params.toString()}`, { signal: controller.signal })
      .then(response => (response.ok ? (response.json() as Promise<NexaSuggestedPromptsPayload>) : null))
      .then(payload => {
        if (!payload || payload.source !== 'data_aware' || payload.prompts.length === 0) return

        setDataAwarePrompts(payload.prompts.map(prompt => prompt.text))
      })
      .catch(() => {
        // Silent — el panel se queda en Tier 1/1.5. Los prompts son un realce, no crítico.
      })

    return () => controller.abort()
  }, [contextKey, entityId, entityKind, entityName])

  return dataAwarePrompts ?? promptContext.prompts
}
