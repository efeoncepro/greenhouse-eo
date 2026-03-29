import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import type {
  NexaFeedbackRequest,
  NexaThreadDetail,
  NexaThreadListItem,
  NexaThreadMessage,
  NexaToolInvocation
} from './nexa-contract'

let readinessPromise: Promise<void> | null = null

const REQUIRED_RELATIONS = [
  'greenhouse_ai.nexa_threads',
  'greenhouse_ai.nexa_messages',
  'greenhouse_ai.nexa_feedback'
]

type ThreadRow = Record<string, unknown> & {
  thread_id: string
  title: string
  message_count: string
  last_message_at: string
  created_at: string
}

type MessageRow = Record<string, unknown> & {
  message_id: string
  role: 'user' | 'assistant'
  content: string
  tool_invocations: unknown
  suggestions: string[] | null
  model_id: string | null
  created_at: string
}

const truncateTitle = (value: string, max = 80) => {
  const normalized = value.replace(/\s+/g, ' ').trim()

  if (normalized.length <= max) {
    return normalized
  }

  return `${normalized.slice(0, max - 1).trimEnd()}…`
}

const toToolInvocations = (value: unknown): NexaToolInvocation[] | undefined => {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined
  }

  return value as NexaToolInvocation[]
}

const toSuggestions = (value: string[] | null | undefined): string[] | undefined => {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined
  }

  return value.filter(Boolean)
}

const toThreadMessage = (row: MessageRow): NexaThreadMessage => ({
  messageId: row.message_id,
  role: row.role,
  content: row.content,
  ...(toToolInvocations(row.tool_invocations) ? { toolInvocations: toToolInvocations(row.tool_invocations) } : {}),
  ...(toSuggestions(row.suggestions) ? { suggestions: toSuggestions(row.suggestions) } : {}),
  ...(row.model_id ? { modelId: row.model_id } : {}),
  createdAt: row.created_at
})

export const assertNexaRuntimeReady = async (): Promise<void> => {
  if (readinessPromise) return readinessPromise

  readinessPromise = (async () => {
    const rows = await runGreenhousePostgresQuery<{ qualified_name: string | null } & Record<string, unknown>>(
      `
        SELECT relname AS qualified_name
        FROM (
          SELECT unnest($1::text[]) AS relname
        ) required
        WHERE to_regclass(relname) IS NULL
      `,
      [REQUIRED_RELATIONS]
    )

    if (rows.length > 0) {
      throw new Error(
        `Nexa runtime tables are missing: ${rows
          .map(row => row.qualified_name)
          .filter(Boolean)
          .join(', ')}. Apply scripts/migrations/add-nexa-ai-tables.sql with migrator credentials.`
      )
    }
  })().catch(error => {
    readinessPromise = null
    throw error
  })

  return readinessPromise.finally(() => {
    readinessPromise = null
  })
}

export const persistNexaFeedback = async (input: {
  userId: string
  clientId: string
  feedback: NexaFeedbackRequest
}) => {
  await assertNexaRuntimeReady()

  await runGreenhousePostgresQuery(
    `
      INSERT INTO greenhouse_ai.nexa_feedback (
        response_id, user_id, client_id, sentiment, comment, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (response_id, user_id) DO UPDATE
      SET sentiment = EXCLUDED.sentiment,
          comment = EXCLUDED.comment,
          updated_at = NOW()
    `,
    [
      input.feedback.responseId,
      input.userId,
      input.clientId,
      input.feedback.sentiment,
      input.feedback.comment?.trim() || null
    ]
  )
}

const createThread = async (client: PoolClient, input: {
  userId: string
  clientId: string
  title: string
}) => {
  const result = await client.query<{ thread_id: string }>(
    `
      INSERT INTO greenhouse_ai.nexa_threads (
        user_id, client_id, title, created_at, last_message_at
      ) VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING thread_id
    `,
    [input.userId, input.clientId, input.title]
  )

  return result.rows[0]?.thread_id
}

const assertThreadOwnership = async (client: PoolClient, input: {
  threadId: string
  userId: string
  clientId: string
}) => {
  const result = await client.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM greenhouse_ai.nexa_threads
        WHERE thread_id = $1
          AND user_id = $2
          AND client_id = $3
      ) AS exists
    `,
    [input.threadId, input.userId, input.clientId]
  )

  return Boolean(result.rows[0]?.exists)
}

const insertMessage = async (client: PoolClient, input: {
  messageId: string
  threadId: string
  role: 'user' | 'assistant'
  content: string
  toolInvocations?: NexaToolInvocation[]
  suggestions?: string[]
  modelId?: string
}) => {
  await client.query(
    `
      INSERT INTO greenhouse_ai.nexa_messages (
        message_id, thread_id, role, content, tool_invocations, suggestions, model_id, created_at
      ) VALUES (
        $1, $2, $3, $4, $5::jsonb, $6::text[], $7, NOW()
      )
      ON CONFLICT (message_id) DO NOTHING
    `,
    [
      input.messageId,
      input.threadId,
      input.role,
      input.content,
      input.toolInvocations ? JSON.stringify(input.toolInvocations) : null,
      input.suggestions?.length ? input.suggestions : [],
      input.modelId ?? null
    ]
  )
}

export const persistNexaConversation = async (input: {
  userId: string
  clientId: string
  threadId?: string | null
  prompt: { messageId: string; content: string }
  response: {
    messageId: string
    content: string
    suggestions?: string[]
    toolInvocations?: NexaToolInvocation[]
    modelId?: string
  }
}) => {
  await assertNexaRuntimeReady()

  return withGreenhousePostgresTransaction(async client => {
    let threadId = input.threadId?.trim() || ''

    if (threadId) {
      const ownsThread = await assertThreadOwnership(client, {
        threadId,
        userId: input.userId,
        clientId: input.clientId
      })

      if (!ownsThread) {
        throw new Error('Thread not found')
      }
    } else {
      const createdThreadId = await createThread(client, {
        userId: input.userId,
        clientId: input.clientId,
        title: truncateTitle(input.prompt.content)
      })

      if (!createdThreadId) {
        throw new Error('Failed to create Nexa thread')
      }

      threadId = createdThreadId
    }

    await insertMessage(client, {
      messageId: input.prompt.messageId,
      threadId,
      role: 'user',
      content: input.prompt.content
    })

    await insertMessage(client, {
      messageId: input.response.messageId,
      threadId,
      role: 'assistant',
      content: input.response.content,
      toolInvocations: input.response.toolInvocations,
      suggestions: input.response.suggestions,
      modelId: input.response.modelId
    })

    await client.query(
      `
        UPDATE greenhouse_ai.nexa_threads
        SET title = CASE
              WHEN COALESCE(title, '') = '' THEN $2
              ELSE title
            END,
            last_message_at = NOW()
        WHERE thread_id = $1
      `,
      [threadId, truncateTitle(input.prompt.content)]
    )

    return threadId
  })
}

export const listNexaThreads = async (input: {
  userId: string
  clientId: string
  limit?: number
}): Promise<NexaThreadListItem[]> => {
  await assertNexaRuntimeReady()

  const rows = await runGreenhousePostgresQuery<ThreadRow>(
    `
      SELECT
        t.thread_id,
        t.title,
        COUNT(m.message_id)::text AS message_count,
        t.last_message_at::text,
        t.created_at::text
      FROM greenhouse_ai.nexa_threads t
      LEFT JOIN greenhouse_ai.nexa_messages m
        ON m.thread_id = t.thread_id
      WHERE t.user_id = $1
        AND t.client_id = $2
      GROUP BY t.thread_id, t.title, t.last_message_at, t.created_at
      ORDER BY t.last_message_at DESC
      LIMIT $3
    `,
    [input.userId, input.clientId, Math.min(50, Math.max(1, input.limit ?? 20))]
  )

  return rows.map(row => ({
    threadId: row.thread_id,
    title: row.title,
    messageCount: Number(row.message_count || 0),
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at
  }))
}

export const getNexaThreadDetail = async (input: {
  threadId: string
  userId: string
  clientId: string
}): Promise<NexaThreadDetail | null> => {
  await assertNexaRuntimeReady()

  const threadRows = await runGreenhousePostgresQuery<{ thread_id: string } & Record<string, unknown>>(
    `
      SELECT thread_id
      FROM greenhouse_ai.nexa_threads
      WHERE thread_id = $1
        AND user_id = $2
        AND client_id = $3
      LIMIT 1
    `,
    [input.threadId, input.userId, input.clientId]
  )

  if (threadRows.length === 0) {
    return null
  }

  const messageRows = await runGreenhousePostgresQuery<MessageRow>(
    `
      SELECT
        message_id,
        role,
        content,
        tool_invocations,
        suggestions,
        model_id,
        created_at::text
      FROM greenhouse_ai.nexa_messages
      WHERE thread_id = $1
      ORDER BY created_at ASC, message_id ASC
    `,
    [input.threadId]
  )

  return {
    threadId: input.threadId,
    messages: messageRows.map(toThreadMessage)
  }
}
