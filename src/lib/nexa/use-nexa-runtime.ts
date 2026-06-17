'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'

import { useLocalRuntime } from '@assistant-ui/react'
import type { ChatModelAdapter, ChatModelRunResult } from '@assistant-ui/react'
import type { ReadonlyJSONObject, ReadonlyJSONValue } from 'assistant-stream/utils'

import { DEFAULT_NEXA_MODEL, resolveNexaModel, type NexaModelId, type NexaModelMode } from '@/config/nexa-models'

import type { NexaResponse, NexaThreadMessage } from './nexa-contract'

export const NEXA_MODEL_STORAGE_KEY = 'greenhouse:nexa:model'
export const NEXA_MODEL_MODE_STORAGE_KEY = 'greenhouse:nexa:model-mode'

/**
 * TASK-1134 — valor visible del selector de modelo: `auto` (default real, el runtime decide
 * server-side) o un modelo Gemini concreto (override manual explícito). Claude NUNCA es opción visible.
 */
export type NexaModelSelectorValue = 'auto' | NexaModelId

/**
 * Forma canónica de un mensaje inicial del runtime de assistant-ui. Es la que
 * HomeView y el panel flotante ya pasan a `useLocalRuntime`. Se exporta para que
 * los consumers (rehidratación de thread) compongan `initialMessages` sin acoplar
 * tipos internos del SDK.
 */
export interface NexaInitialTextPart {
  type: 'text'
  text: string
}

export interface NexaInitialToolCallPart {
  type: 'tool-call'
  toolCallId: string
  toolName: string
  args: ReadonlyJSONObject
  argsText: string
  result: ReadonlyJSONValue
}

export interface NexaInitialMessage {
  role: 'user' | 'assistant'
  content: Array<NexaInitialTextPart | NexaInitialToolCallPart>
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
 * del runtime. Rehidrata texto + tool-calls versionados ya persistidos; si un
 * thread antiguo no trae `toolInvocations`, degrada honestamente a texto.
 */
export const mapThreadMessagesToInitial = (messages: NexaThreadMessage[]): NexaInitialMessage[] =>
  messages.map(message => {
    const toolParts: NexaInitialToolCallPart[] =
      message.role === 'assistant'
        ? (message.toolInvocations ?? []).map(invocation => ({
            type: 'tool-call',
            toolCallId: invocation.toolCallId,
            toolName: invocation.toolName,
            args: toJsonValue(invocation.args) as ReadonlyJSONObject,
            argsText: JSON.stringify(invocation.args ?? {}),
            result: toJsonValue(invocation.result)
          }))
        : []

    return {
      role: message.role,
      content: [{ type: 'text' as const, text: message.content ?? '' }, ...toolParts]
    }
  })

type NexaAdapterRefs = {
  selectedModelRef: MutableRefObject<NexaModelId>
  modelModeRef: MutableRefObject<NexaModelMode>
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
          // TASK-1134 — `modelMode` decide server-side: `auto` (default) deja correr el router;
          // `manual` fija el modelo del picker. `model` viaja siempre (el server lo ignora en auto).
          model: refs.selectedModelRef.current,
          modelMode: refs.modelModeRef.current,
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
      content: [{ type: 'text' as const, text: data.content || '' }, ...toolParts]
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
  /** TASK-1134 — valor visible del selector: `auto` (default) o el modelo manual elegido. */
  selectedModel: NexaModelSelectorValue
  handleModelChange: (value: NexaModelSelectorValue) => void
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

  // TASK-1134 — `modelMode` 'auto' es el default real (el runtime decide server-side). El modelo
  // manual solo aplica cuando el operador lo fija explícitamente (override). El valor visible del
  // selector es `auto` o el modelo manual.
  const [modelMode, setModelMode] = useState<NexaModelMode>('auto')
  const [manualModel, setManualModel] = useState<NexaModelId>(DEFAULT_NEXA_MODEL)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [threadId, setThreadId] = useState<string | null>(initialThreadId)

  const selectedModelRef = useRef<NexaModelId>(DEFAULT_NEXA_MODEL)
  const modelModeRef = useRef<NexaModelMode>('auto')
  const threadIdRef = useRef<string | null>(initialThreadId)
  const onThreadIdResolvedRef = useRef(onThreadIdResolved)

  onThreadIdResolvedRef.current = onThreadIdResolved

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedModel = window.localStorage.getItem(NEXA_MODEL_STORAGE_KEY)
    const resolvedModel = resolveNexaModel({ requestedModel: storedModel })

    setManualModel(resolvedModel)
    selectedModelRef.current = resolvedModel

    // Solo `manual` persistido reactiva el override; cualquier otro valor (incl. ausente) = auto.
    const storedMode: NexaModelMode = window.localStorage.getItem(NEXA_MODEL_MODE_STORAGE_KEY) === 'manual' ? 'manual' : 'auto'

    setModelMode(storedMode)
    modelModeRef.current = storedMode
  }, [])

  const handleModelChange = useCallback((value: NexaModelSelectorValue) => {
    if (value === 'auto') {
      setModelMode('auto')
      modelModeRef.current = 'auto'

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(NEXA_MODEL_MODE_STORAGE_KEY, 'auto')
      }

      return
    }

    const resolved = resolveNexaModel({ requestedModel: value })

    setModelMode('manual')
    setManualModel(resolved)
    modelModeRef.current = 'manual'
    selectedModelRef.current = resolved

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(NEXA_MODEL_STORAGE_KEY, resolved)
      window.localStorage.setItem(NEXA_MODEL_MODE_STORAGE_KEY, 'manual')
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
        modelModeRef,
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
    // Valor visible del selector: `auto` salvo override manual explícito.
    selectedModel: modelMode === 'auto' ? 'auto' : manualModel,
    handleModelChange,
    suggestions,
    threadId
  }
}
