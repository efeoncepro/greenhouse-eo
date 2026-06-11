'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'

import { useLocalRuntime } from '@assistant-ui/react'
import type { ChatModelAdapter, ChatModelRunResult } from '@assistant-ui/react'
import type { ReadonlyJSONObject, ReadonlyJSONValue } from 'assistant-stream/utils'

import { DEFAULT_NEXA_MODEL, resolveNexaModel, type NexaModelId } from '@/config/nexa-models'

import type { NexaResponse, NexaThreadMessage } from './nexa-contract'

export const NEXA_MODEL_STORAGE_KEY = 'greenhouse:nexa:model'

/**
 * Forma canónica de un mensaje inicial del runtime de assistant-ui. Es la que
 * HomeView y el panel flotante ya pasan a `useLocalRuntime`. Se exporta para que
 * los consumers (rehidratación de thread) compongan `initialMessages` sin acoplar
 * tipos internos del SDK.
 */
export interface NexaInitialMessage {
  role: 'user' | 'assistant'
  content: Array<{ type: 'text'; text: string }>
}

export const toJsonValue = (value: unknown): ReadonlyJSONValue => {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(item => toJsonValue(item))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toJsonValue(item)])
    ) as ReadonlyJSONObject
  }

  return null
}

/**
 * Mapea los mensajes persistidos de un thread Nexa a la forma `initialMessages`
 * del runtime. V1 rehidrata SOLO el texto (las tool-cards se re-renderan en turnos
 * vivos); preserva orden y rol. Usado al cambiar de conversación en el rail.
 */
export const mapThreadMessagesToInitial = (messages: NexaThreadMessage[]): NexaInitialMessage[] =>
  messages.map(message => ({
    role: message.role,
    content: [{ type: 'text' as const, text: message.content ?? '' }]
  }))

type NexaAdapterRefs = {
  selectedModelRef: MutableRefObject<NexaModelId>
  threadIdRef: MutableRefObject<string | null>
  onSuggestionsChange: (suggestions: string[]) => void
  onThreadIdChange: (threadId: string) => void
}

/**
 * Adapter canónico de Nexa: manda `threadId` en el body para que el server
 * appendee al thread correcto, captura el `threadId` devuelto (creación) y publica
 * las suggestions. Reemplaza los adapters duplicados de HomeView y del floating.
 */
export const createNexaChatAdapter = (refs: NexaAdapterRefs): ChatModelAdapter => ({
  async run({ messages, abortSignal }): Promise<ChatModelRunResult> {
    const lastMessage = messages[messages.length - 1]

    const prompt = lastMessage?.content
      ?.filter(part => part.type === 'text')
      .map(part => (part as { type: 'text'; text: string }).text)
      .join('') ?? ''

    const history = messages.slice(-10).map(message => ({
      role: message.role as 'user' | 'assistant',
      content: message.content
        ?.filter(part => part.type === 'text')
        .map(part => (part as { type: 'text'; text: string }).text)
        .join('') ?? ''
    }))

    let res: Response

    try {
      res = await fetch('/api/home/nexa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          history,
          model: refs.selectedModelRef.current,
          threadId: refs.threadIdRef.current
        }),
        signal: abortSignal
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err

      throw new Error('No pude conectarme con Nexa. Verifica tu conexión e intenta de nuevo.')
    }

    if (!res.ok) {
      const errorBody = await res.json().catch(() => null)

      throw new Error(errorBody?.error || `Error ${res.status}: no se pudo procesar tu mensaje.`)
    }

    const data = (await res.json()) as NexaResponse

    if (data.threadId) {
      refs.threadIdRef.current = data.threadId
      refs.onThreadIdChange(data.threadId)
    }

    refs.onSuggestionsChange(data.suggestions ?? [])

    const toolParts = (data.toolInvocations || []).map(invocation => ({
      type: 'tool-call' as const,
      toolCallId: invocation.toolCallId,
      toolName: invocation.toolName,
      args: toJsonValue(invocation.args) as ReadonlyJSONObject,
      argsText: JSON.stringify(invocation.args ?? {}),
      result: toJsonValue(invocation.result)
    }))

    return {
      content: [...toolParts, { type: 'text' as const, text: data.content || '' }]
    }
  }
})

export interface UseNexaPersistentRuntimeOptions {
  /** Mensajes con los que se siembra el runtime. Para rehidratar un thread, el
   *  consumer re-monta el hook (key) pasando los mensajes del detalle. */
  initialMessages?: NexaInitialMessage[]
  /** threadId activo al montar (rehidratación). El adapter lo usa en el primer POST. */
  initialThreadId?: string | null
  /** Notificación de threadId resuelto (creación) — útil para refrescar el rail. */
  onThreadIdResolved?: (threadId: string) => void
}

export interface UseNexaPersistentRuntimeResult {
  runtime: ReturnType<typeof useLocalRuntime>
  selectedModel: NexaModelId
  handleModelChange: (model: NexaModelId) => void
  suggestions: string[]
  threadId: string | null
}

/**
 * Runtime persistente compartido de Nexa (Home + panel flotante). Encapsula el
 * adapter canónico, el ref de modelo con persistencia en localStorage, las
 * suggestions y el tracking de threadId. El SWITCH de conversación es del consumer:
 * Home recarga la página; el floating re-monta este hook con `initialMessages` del
 * detalle (keyed remount) — `useLocalRuntime` no resetea mensajes en caliente.
 */
export const useNexaPersistentRuntime = (
  options: UseNexaPersistentRuntimeOptions = {}
): UseNexaPersistentRuntimeResult => {
  const { initialMessages, initialThreadId = null, onThreadIdResolved } = options

  const [selectedModel, setSelectedModel] = useState<NexaModelId>(DEFAULT_NEXA_MODEL)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [threadId, setThreadId] = useState<string | null>(initialThreadId)

  const selectedModelRef = useRef<NexaModelId>(DEFAULT_NEXA_MODEL)
  const threadIdRef = useRef<string | null>(initialThreadId)
  const onThreadIdResolvedRef = useRef(onThreadIdResolved)

  onThreadIdResolvedRef.current = onThreadIdResolved

  useEffect(() => {
    const storedModel = typeof window !== 'undefined' ? window.localStorage.getItem(NEXA_MODEL_STORAGE_KEY) : null

    const resolved = resolveNexaModel({ requestedModel: storedModel })

    setSelectedModel(resolved)
    selectedModelRef.current = resolved
  }, [])

  const handleModelChange = useCallback((model: NexaModelId) => {
    const resolved = resolveNexaModel({ requestedModel: model })

    setSelectedModel(resolved)
    selectedModelRef.current = resolved

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(NEXA_MODEL_STORAGE_KEY, resolved)
    }
  }, [])

  const handleThreadIdChange = useCallback((id: string) => {
    setThreadId(id)
    threadIdRef.current = id
    onThreadIdResolvedRef.current?.(id)
  }, [])

  const adapter = useMemo(
    () =>
      createNexaChatAdapter({
        selectedModelRef,
        threadIdRef,
        onSuggestionsChange: setSuggestions,
        onThreadIdChange: handleThreadIdChange
      }),
    [handleThreadIdChange]
  )

  const runtime = useLocalRuntime(adapter, {
    initialMessages: initialMessages ?? []
  })

  return {
    runtime,
    selectedModel,
    handleModelChange,
    suggestions,
    threadId
  }
}
