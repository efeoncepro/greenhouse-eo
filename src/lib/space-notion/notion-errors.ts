export const NOTION_TERMINAL_ARCHIVED_BLOCK_ERROR_PREFIX = '[terminal:notion_archived_block]'

export class NotionApiError extends Error {
  readonly status: number | null
  readonly code: string | null
  readonly notionMessage: string | null
  readonly requestId: string | null
  readonly retryable: boolean
  readonly path: string | null
  readonly method: string | null

  constructor(
    message: string,
    options?: {
      status?: number | null
      code?: string | null
      notionMessage?: string | null
      requestId?: string | null
      retryable?: boolean
      path?: string | null
      method?: string | null
      cause?: unknown
    }
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined)
    this.name = 'NotionApiError'
    this.status = options?.status ?? null
    this.code = options?.code ?? null
    this.notionMessage = options?.notionMessage ?? null
    this.requestId = options?.requestId ?? null
    this.retryable = options?.retryable ?? false
    this.path = options?.path ?? null
    this.method = options?.method ?? null
  }
}

const RETRYABLE_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504])

const asErrorLike = (error: unknown): { name?: unknown; message?: unknown; status?: unknown; code?: unknown } =>
  typeof error === 'object' && error !== null ? error : {}

export const isAbortTimeoutError = (error: unknown): boolean => {
  const err = asErrorLike(error)
  const name = typeof err.name === 'string' ? err.name : ''
  const message = typeof err.message === 'string' ? err.message : ''

  return name === 'TimeoutError' || /aborted due to timeout|operation was aborted.*timeout/i.test(message)
}

export const isRetryableNotionError = (error: unknown): boolean => {
  if (error instanceof NotionApiError) {
    return error.retryable
  }

  if (isAbortTimeoutError(error)) {
    return true
  }

  const err = asErrorLike(error)
  const status = typeof err.status === 'number' ? err.status : null
  const code = typeof err.code === 'string' ? err.code : null
  const message = typeof err.message === 'string' ? err.message : ''

  return Boolean(
    (status !== null && RETRYABLE_STATUSES.has(status)) ||
      code === 'rate_limited' ||
      /notion api (get|patch|post).* (429|500|502|503|504)\b/i.test(message) ||
      /\b(408|409|425|429|500|502|503|504)\b/.test(message) ||
      /rate limit|too many requests|etimedout|econnreset|socket hang up/i.test(message)
  )
}

export const isNotionArchivedBlockError = (error: unknown): boolean => {
  const err = asErrorLike(error)
  const code = error instanceof NotionApiError ? error.code : typeof err.code === 'string' ? err.code : null

  const message =
    error instanceof NotionApiError
      ? `${error.message} ${error.notionMessage ?? ''}`
      : typeof err.message === 'string'
        ? err.message
        : String(error)

  const statusFromMessage = /\b(?:notion api\s+\w+\s+)?(400)\b/i.exec(message)?.[1]

  const status =
    error instanceof NotionApiError
      ? error.status
      : typeof err.status === 'number'
        ? err.status
        : statusFromMessage
          ? Number(statusFromMessage)
          : null

  return Boolean(
    status === 400 &&
      (!code || code === 'validation_error') &&
      /can't edit block that is archived|must unarchive the block before editing|archived block/i.test(message)
  )
}

export const formatTerminalNotionWritebackError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error)

  return message.startsWith(NOTION_TERMINAL_ARCHIVED_BLOCK_ERROR_PREFIX)
    ? message
    : `${NOTION_TERMINAL_ARCHIVED_BLOCK_ERROR_PREFIX} ${message}`
}

export const isTerminalNotionWritebackErrorMessage = (message: string | null | undefined): boolean =>
  Boolean(message?.startsWith(NOTION_TERMINAL_ARCHIVED_BLOCK_ERROR_PREFIX))

const parseNotionErrorBody = (text: string): {
  code: string | null
  notionMessage: string | null
  requestId: string | null
} => {
  try {
    const parsed = JSON.parse(text) as {
      code?: unknown
      message?: unknown
      request_id?: unknown
    }

    return {
      code: typeof parsed.code === 'string' ? parsed.code : null,
      notionMessage: typeof parsed.message === 'string' ? parsed.message : null,
      requestId: typeof parsed.request_id === 'string' ? parsed.request_id : null
    }
  } catch {
    return { code: null, notionMessage: text.trim() || null, requestId: null }
  }
}

export const buildNotionApiErrorFromResponse = async (
  response: Response,
  context: { method: string; path: string }
): Promise<NotionApiError> => {
  const text = await response.text().catch(() => '')
  const parsed = parseNotionErrorBody(text)
  const detail = parsed.notionMessage ?? text.trim()

  const message = detail
    ? `Notion API ${context.method} ${response.status}: ${detail}`
    : `Notion API ${context.method} ${response.status}`

  return new NotionApiError(message, {
    status: response.status,
    code: parsed.code,
    notionMessage: parsed.notionMessage,
    requestId: parsed.requestId,
    retryable: RETRYABLE_STATUSES.has(response.status) || parsed.code === 'rate_limited',
    method: context.method,
    path: context.path
  })
}

export const buildNotionFetchError = (
  error: unknown,
  context: { method: string; path: string; timeoutMs: number }
): NotionApiError => {
  if (error instanceof NotionApiError) {
    return error
  }

  if (isAbortTimeoutError(error)) {
    return new NotionApiError(
      `Notion API ${context.method} timed out after ${context.timeoutMs}ms for ${context.path}`,
      {
        status: null,
        code: 'timeout',
        retryable: true,
        method: context.method,
        path: context.path,
        cause: error
      }
    )
  }

  const message = error instanceof Error ? error.message : String(error)

  return new NotionApiError(`Notion API ${context.method} request failed for ${context.path}: ${message}`, {
    status: null,
    code: 'network_error',
    retryable: isRetryableNotionError(error),
    method: context.method,
    path: context.path,
    cause: error
  })
}
