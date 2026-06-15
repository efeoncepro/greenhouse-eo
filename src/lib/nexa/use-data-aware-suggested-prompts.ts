'use client'

import { useEffect, useMemo, useState } from 'react'

import { isNexaSuggestedPromptsDataAwareEnabled } from './flags'
import type { NexaSuggestedPrompt, NexaSuggestedPromptsPayload } from './suggested-prompts-contract'
import type { NexaPageContextValue, NexaPromptContext } from './suggested-prompts'

// TASK-1078/1087/1139 — Hook cliente que CAPA los prompts data-aware (Tier 2) sobre los Tier 1/1.5.
// Es puramente ADITIVO: con el flag off, sin `entityId`, fuera del contexto `client`, o si el fetch
// falla / devuelve `template_fallback`, retorna los prompts de plantilla intactos (comportamiento
// previo byte-idéntico). Solo reemplaza por los data-aware cuando el endpoint responde con señales
// reales (`source: 'data_aware'`). Devuelve `{ text, hint? }` para que el panel pinte el `hint`
// (TASK-1139); los prompts de plantilla salen sin `hint`. Consume el contrato PURO (no el composer
// server-only). TASK-1139: envía el `entrypoint` declarado por la página (agency/finance).

export const useDataAwareSuggestedPrompts = (
  promptContext: NexaPromptContext,
  pageContext: NexaPageContextValue | null
): NexaSuggestedPrompt[] => {
  const [dataAwarePrompts, setDataAwarePrompts] = useState<NexaSuggestedPrompt[] | null>(null)

  const contextKey = promptContext.key
  const entityId = pageContext?.entityId
  const entityKind = pageContext?.entityKind
  const entityName = pageContext?.entityName
  const entrypoint = pageContext?.entrypoint

  // Prompts de plantilla (Tier 1/1.5) envueltos en el shape `{ text }` (sin `hint`).
  const templatePrompts = useMemo<NexaSuggestedPrompt[]>(
    () => promptContext.prompts.map(text => ({ text })),
    [promptContext.prompts]
  )

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
    if (entrypoint) params.set('entrypoint', entrypoint)

    fetch(`/api/nexa/suggested-prompts?${params.toString()}`, { signal: controller.signal })
      .then(response => (response.ok ? (response.json() as Promise<NexaSuggestedPromptsPayload>) : null))
      .then(payload => {
        if (!payload || payload.source !== 'data_aware' || payload.prompts.length === 0) return

        setDataAwarePrompts(payload.prompts)
      })
      .catch(() => {
        // Silent — el panel se queda en Tier 1/1.5. Los prompts son un realce, no crítico.
      })

    return () => controller.abort()
  }, [contextKey, entityId, entityKind, entityName, entrypoint])

  return dataAwarePrompts ?? templatePrompts
}
