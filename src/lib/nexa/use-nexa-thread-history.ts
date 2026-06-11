'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { formatDate as formatGreenhouseDate } from '@/lib/format'

import type { NexaThreadListItem } from './nexa-contract'

export interface NexaThreadGroup {
  label: string
  items: NexaThreadListItem[]
}

const formatRelative = (dateStr: string): string => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000)

  if (diffDays <= 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return 'Esta semana'

  return formatGreenhouseDate(date, { day: 'numeric', month: 'short' }, 'es-CL')
}

const groupByDate = (threads: NexaThreadListItem[]): NexaThreadGroup[] => {
  const groups: NexaThreadGroup[] = []
  let currentLabel = ''

  for (const thread of threads) {
    const label = formatRelative(thread.lastMessageAt)

    if (label !== currentLabel) {
      currentLabel = label
      groups.push({ label, items: [thread] })
    } else {
      groups[groups.length - 1].items.push(thread)
    }
  }

  return groups
}

export interface UseNexaThreadHistoryResult {
  threads: NexaThreadListItem[]
  groups: NexaThreadGroup[]
  loading: boolean
  error: boolean
  refetch: () => Promise<void>
  rename: (threadId: string, title: string) => Promise<boolean>
  remove: (threadId: string) => Promise<boolean>
}

/**
 * Historial de conversaciones de Nexa para el rail del panel flotante. Lee la lista
 * canónica (`/api/home/nexa/threads`), la agrupa por fecha relativa (mismo criterio
 * que el sidebar del Home) y expone rename/delete (PATCH/DELETE) con refetch
 * optimista. Scoping (user/client) lo aplica el server desde la sesión.
 */
export const useNexaThreadHistory = (options: { enabled?: boolean } = {}): UseNexaThreadHistoryResult => {
  const { enabled = true } = options

  const [threads, setThreads] = useState<NexaThreadListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(false)

    try {
      const res = await fetch('/api/home/nexa/threads')

      if (!res.ok) throw new Error(`Error ${res.status}`)

      const data = await res.json()

      setThreads(Array.isArray(data) ? data : (data.threads ?? []))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (enabled) void refetch()
  }, [enabled, refetch])

  const rename = useCallback(async (threadId: string, title: string): Promise<boolean> => {
    const trimmed = title.trim()

    if (!trimmed) return false

    try {
      const res = await fetch(`/api/home/nexa/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed })
      })

      if (!res.ok) return false

      setThreads(prev => prev.map(thread => (thread.threadId === threadId ? { ...thread, title: trimmed } : thread)))

      return true
    } catch {
      return false
    }
  }, [])

  const remove = useCallback(async (threadId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/home/nexa/threads/${threadId}`, { method: 'DELETE' })

      if (!res.ok) return false

      setThreads(prev => prev.filter(thread => thread.threadId !== threadId))

      return true
    } catch {
      return false
    }
  }, [])

  const groups = useMemo(() => groupByDate(threads), [threads])

  return { threads, groups, loading, error, refetch, rename, remove }
}
