/**
 * TASK-1647 — Provisión del consumer + binding del gateway MCP (`efeonce-mcp-gateway`)
 * hacia el lane ecosystem de Greenhouse (aprobada por el operador, 2026-08-05).
 *
 * Crea (idempotente):
 *  1. Consumer sister-platform `efeonce-mcp-gateway` (token `ghspk_*` generado una sola
 *     vez) con `allowedGreenhouseScopeTypes=['internal']`.
 *  2. Binding `internal` (externalScope other/efeonce-mcp-gateway, status active) — el
 *     sujeto máquina con el que el gateway consume `/api/platform/ecosystem/growth/seo/*`.
 *  3. Publica el token en Secret Manager (`efeonce-mcp-gateway-greenhouse-token`) vía
 *     stdin (`printf %s` equivalente — scalar crudo, sin newline). El token NUNCA se
 *     imprime ni persiste en disco.
 *
 * Re-ejecución: si el consumer existe NO rota el token (rotación = decisión explícita).
 *
 * Uso (proxy en 127.0.0.1:15432 + gcloud auth activo):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/api-platform/provision-mcp-gateway-seo-consumer.ts
 */
import { execFileSync } from 'node:child_process'

import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

const PLATFORM_KEY = 'efeonce-mcp-gateway'
const SECRET_ID = 'efeonce-mcp-gateway-greenhouse-token'
const PROJECT = 'efeonce-group'

const main = async () => {
  const { listSisterPlatformConsumers, createSisterPlatformConsumer, generateSisterPlatformConsumerToken } =
    await import('@/lib/sister-platforms/consumers')

  const { createSisterPlatformBinding } = await import('@/lib/sister-platforms/bindings')
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

  // 1. Consumer (idempotente, sin rotación implícita)
  const existing = (await listSisterPlatformConsumers()).filter(
    c => c.sisterPlatformKey === PLATFORM_KEY
  )

  let token: string | null = null

  if (existing.length) {
    console.log('1. consumer ya existe:', existing[0].publicId, '(token NO rotado)')
  } else {
    token = generateSisterPlatformConsumerToken()

    const created = await createSisterPlatformConsumer({
      sisterPlatformKey: PLATFORM_KEY,
      consumerName: 'Efeonce MCP Gateway (provider Greenhouse-SEO, TASK-1647)',
      token,
      allowedGreenhouseScopeTypes: ['internal'],
      notes: 'Service identity del gateway mcp.efeonce.org hacia el lane ecosystem. Read-only. TASK-1647.',
      actorUserId: 'operator-task-1647'
    })

    console.log('1. consumer creado:', created.consumer.publicId)
  }

  // 2. Binding internal activo (idempotente por existencia)
  const bindingRows = await runGreenhousePostgresQuery<{ sister_platform_binding_id: string; binding_status: string }>(
    `SELECT sister_platform_binding_id, binding_status
       FROM greenhouse_core.sister_platform_bindings
      WHERE sister_platform_key = $1 AND greenhouse_scope_type = 'internal'`,
    [PLATFORM_KEY]
  )

  if (bindingRows.length) {
    console.log('2. binding ya existe:', bindingRows[0].sister_platform_binding_id, `(${bindingRows[0].binding_status})`)
  } else {
    await createSisterPlatformBinding({
      input: {
        sisterPlatformKey: PLATFORM_KEY,
        externalScopeType: 'other',
        externalScopeId: PLATFORM_KEY,
        externalDisplayName: 'Efeonce MCP Gateway',
        greenhouseScopeType: 'internal',
        bindingStatus: 'active',
        notes: 'Binding machine-authed del gateway hacia el lane ecosystem (TASK-1647).'
      }
    })
    console.log('2. binding internal creado (active)')
  }

  // 3. Token → Secret Manager (solo si se generó uno nuevo)
  if (token) {
    try {
      execFileSync('gcloud', ['secrets', 'describe', SECRET_ID, `--project=${PROJECT}`], { stdio: 'ignore' })
    } catch {
      execFileSync('gcloud', ['secrets', 'create', SECRET_ID, `--project=${PROJECT}`, '--replication-policy=automatic'], {
        stdio: 'inherit'
      })
    }

    execFileSync('gcloud', ['secrets', 'versions', 'add', SECRET_ID, `--project=${PROJECT}`, '--data-file=-'], {
      input: token
    })
    console.log(`3. token publicado en Secret Manager: ${SECRET_ID} (nueva versión)`)
  } else {
    console.log('3. sin token nuevo — secret intacto')
  }

  console.log('✓ provisión del consumer del gateway completa')
  process.exit(0)
}

void main()
