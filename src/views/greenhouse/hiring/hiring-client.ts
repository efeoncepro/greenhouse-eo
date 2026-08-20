export class HiringClientError extends Error {
  readonly code: string

  /**
   * Hint binario del contrato canónico de errores: `false` cuando la causa es estructural
   * (permiso, sesión, propuesta inexistente, corrupción de estado) y reintentar NO resuelve.
   *
   * Descartarlo obliga a cada pantalla a recetar "intenta de nuevo" a ciegas, que es justo lo
   * que `CLAUDE.md` prohíbe: un reintento ofrecido sobre una causa estructural esconde la acción
   * real. Default `true` sólo cuando el endpoint no lo declara.
   */
  readonly actionable: boolean

  constructor(message: string, code = 'hiring_request_failed', actionable = true) {
    super(message)
    this.name = 'HiringClientError'
    this.code = code
    this.actionable = actionable
  }
}

export const hiringRequest = async <T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  const payload = (await response.json().catch(() => null)) as
    | ({ error?: string; code?: string; actionable?: boolean } & T)
    | null

  if (!response.ok) {
    throw new HiringClientError(
      payload?.error ?? 'No se pudo completar la operación de Hiring.',
      payload?.code,
      payload?.actionable,
    )
  }

  return payload as T
}

/**
 * Semáforo canónico de scores de hiring (0–100) → tono semántico Greenhouse.
 * Única fuente para chips/etiquetas de score en Application 360 y el Expediente
 * (TASK-1737): no duplicar umbrales por pantalla.
 */
export const scoreTone = (score: number | null): 'success' | 'warning' | 'error' | 'info' => {
  if (score == null) return 'info'
  if (score >= 75) return 'success'
  if (score >= 60) return 'warning'

  return 'error'
}
