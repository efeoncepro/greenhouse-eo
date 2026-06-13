import { describe, expect, it } from 'vitest'

import type { NexaThreadMessage } from './nexa-contract'
import { mapThreadMessagesToInitial } from './use-nexa-runtime'

describe('mapThreadMessagesToInitial', () => {
  it('rehydrates persisted tool calls without re-running tools', () => {
    const messages: NexaThreadMessage[] = [
      {
        messageId: 'msg-user',
        role: 'user',
        content: '¿Qué significa Impacto?',
        createdAt: '2026-06-12T10:00:00.000Z'
      },
      {
        messageId: 'msg-assistant',
        role: 'assistant',
        content: 'Impacto mide contribución a objetivos clave [1].',
        createdAt: '2026-06-12T10:00:01.000Z',
        toolInvocations: [
          {
            toolCallId: 'tool-1',
            toolName: 'search_knowledge',
            args: { query: 'Impacto' },
            result: {
              available: true,
              summary: '2 fuentes recuperadas',
              source: 'postgres',
              scopeLabel: 'Base de conocimientos',
              generatedAt: '2026-06-12T10:00:01.000Z',
              metrics: [],
              raw: {
                packet: {
                  contractVersion: 'knowledge-search.v1',
                  chunks: []
                }
              }
            }
          }
        ]
      }
    ]

    const initial = mapThreadMessagesToInitial(messages)
    const assistantContent = initial[1]?.content ?? []

    expect(initial[0]?.content).toEqual([{ type: 'text', text: '¿Qué significa Impacto?' }])
    expect(assistantContent[0]).toEqual({ type: 'text', text: 'Impacto mide contribución a objetivos clave [1].' })
    expect(assistantContent[1]).toMatchObject({
      type: 'tool-call',
      toolCallId: 'tool-1',
      toolName: 'search_knowledge',
      args: { query: 'Impacto' }
    })
  })

  it('keeps historical text-only threads readable when evidence is missing', () => {
    const initial = mapThreadMessagesToInitial([
      {
        messageId: 'msg-old',
        role: 'assistant',
        content: 'Respuesta anterior sin payload de fuentes.',
        createdAt: '2026-06-11T10:00:00.000Z'
      }
    ])

    expect(initial).toEqual([
      {
        role: 'assistant',
        content: [{ type: 'text', text: 'Respuesta anterior sin payload de fuentes.' }]
      }
    ])
  })
})
