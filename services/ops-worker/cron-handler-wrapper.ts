/**
 * TASK-775 Slice 1 — Helper canónico para migrar Vercel crons a ops-worker.
 *
 * Wraps el patrón típico de un handler Cloud Run: parse body → run logic →
 * audit start/end → JSON response. Centraliza captureWithDomain + sanitización
 * de error + logging consistente.
 *
 * USO: para crons "1-step" (loadear lógica, ejecutar, devolver result). Crons
 * multi-step (ej. nubox-sync con 3 fases) deben usar pattern handler ad-hoc
 * con orquestación inline (ver handleNotionConformedSync en server.ts).
 *
 * ENTRYPOINT canónico esperado en handler:
 *
 *   const handleEmailDeliverabilityMonitor = wrapCronHandler({
 *     name: 'email-deliverability-monitor',
 *     domain: 'sync',
 *     run: async (body) => emailDeliverabilityMonitorLogic(body)
 *   })
 *
 *   if (method === 'POST' && path === '/email/deliverability-monitor') {
 *     await handleEmailDeliverabilityMonitor(req, res)
 *     return
 *   }
 *
 * Spec: docs/architecture/GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md
 *       docs/tasks/in-progress/TASK-775-vercel-cron-async-critical-migration-platform.md (Slice 1)
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'

import { captureWithDomain, type CaptureDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'

/**
 * Body parser idéntico al de server.ts (no podemos importarlo porque es local).
 * Soft-fail: cualquier error de parsing → {}.
 */
const readBody = (req: IncomingMessage): Promise<Record<string, unknown>> =>
  new Promise(resolve => {
    const chunks: Buffer[] = []

    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8').trim()

        resolve(text ? (JSON.parse(text) as Record<string, unknown>) : {})
      } catch {
        resolve({})
      }
    })
    req.on('error', () => resolve({}))
  })

const writeJson = (res: ServerResponse, status: number, data: unknown) => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

export interface WrapCronHandlerOptions<TResult> {
  /**
   * Identifier canónico del cron, sin prefijo "ops-". Se usa en logs y como
   * tag.source en captureWithDomain. Ej: 'email-deliverability-monitor'.
   */
  name: string

  /**
   * Domain canónico para captureWithDomain. Determina el subsystem rollup
   * en /admin/operations cuando el handler emita errores a Sentry.
   */
  domain: CaptureDomain

  /**
   * La lógica del cron. Recibe el body parseado (objeto vacío si no hay body
   * o JSON inválido). Retorna result que se incluye en el response 200 OK.
   * Si throw, el wrapper captura, sanitiza, emite Sentry y devuelve 502.
   */
  run: (body: Record<string, unknown>) => Promise<TResult>
}

/**
 * Builder de handler ops-worker con audit + sanitización canónica.
 *
 * Output handler tiene la signatura `(req, res) => Promise<void>` que el
 * dispatcher de server.ts puede invocar directamente.
 */
export const wrapCronHandler = <TResult extends Record<string, unknown> | void = void>(
  options: WrapCronHandlerOptions<TResult>
) => {
  const { name, domain, run } = options

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const runId = `${name}-${randomUUID()}`
    const startedAt = Date.now()

    let body: Record<string, unknown> = {}

    try {
      body = await readBody(req)
    } catch {
      body = {}
    }

    console.log(`[ops-worker] POST /<${name}> — runId=${runId} bodyKeys=${Object.keys(body).join(',') || '(none)'}`)

    try {
      const result = await run(body)
      const durationMs = Date.now() - startedAt

      console.log(`[ops-worker] /<${name}> done — runId=${runId} ${durationMs}ms`)

      writeJson(res, 200, {
        ok: true,
        runId,
        durationMs,
        ...(result ?? {})
      })
    } catch (error) {
      const durationMs = Date.now() - startedAt
      const sanitized = redactErrorForResponse(error)

      captureWithDomain(error, domain, {
        tags: { source: `ops_worker_cron_${name.replace(/-/g, '_')}` },
        extra: { runId, durationMs }
      })

      console.error(`[ops-worker] /<${name}> failed — runId=${runId} ${durationMs}ms: ${sanitized}`)

      writeJson(res, 502, {
        ok: false,
        runId,
        durationMs,
        error: sanitized
      })
    }
  }
}
