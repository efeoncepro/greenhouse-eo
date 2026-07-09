export class HiringClientError extends Error {
  readonly code: string

  constructor(message: string, code = 'hiring_request_failed') {
    super(message)
    this.name = 'HiringClientError'
    this.code = code
  }
}

export const hiringRequest = async <T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  const payload = (await response.json().catch(() => null)) as ({ error?: string; code?: string } & T) | null

  if (!response.ok) {
    throw new HiringClientError(
      payload?.error ?? 'No se pudo completar la operación de Hiring.',
      payload?.code,
    )
  }

  return payload as T
}
