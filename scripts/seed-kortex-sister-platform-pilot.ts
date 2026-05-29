import { createRequire } from 'node:module'

import type {
  CreateSisterPlatformBindingInput,
  SisterPlatformBindingRecord,
  SisterPlatformBindingStatus,
  SisterPlatformGreenhouseScopeType
} from '@/lib/sister-platforms/types'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const require = createRequire(import.meta.url)

const stubServerOnlyForScripts = () => {
  const serverOnlyPath = require.resolve('server-only')

  require.cache[serverOnlyPath] = {
    exports: {}
  } as NodeJS.Module
}

type ScopeInput = {
  greenhouseScopeType: SisterPlatformGreenhouseScopeType
  organizationId: string | null
  clientId: string | null
  spaceId: string | null
}

const readEnv = (key: string) => {
  const value = process.env[key]?.trim()

  return value ? value : null
}

const readPositiveInt = (key: string, fallback: number) => {
  const raw = readEnv(key)

  if (!raw) {
    return fallback
  }

  const value = Number(raw)

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${key} debe ser un numero positivo.`)
  }

  return Math.trunc(value)
}

const readCsvScopes = (key: string, fallback: SisterPlatformGreenhouseScopeType[]) => {
  const raw = readEnv(key)

  if (!raw) {
    return fallback
  }

  const values = raw
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .filter(
      (item): item is SisterPlatformGreenhouseScopeType =>
        item === 'organization' || item === 'client' || item === 'space' || item === 'internal'
    )

  if (values.length === 0) {
    throw new Error(`${key} debe incluir al menos un scope valido.`)
  }

  return Array.from(new Set(values))
}

const readCsvText = (key: string, fallback: string[]) => {
  const raw = readEnv(key)

  if (!raw) {
    return fallback
  }

  const values = raw
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)

  if (values.length === 0) {
    throw new Error(`${key} debe incluir al menos un valor.`)
  }

  return Array.from(new Set(values))
}

const readBindingStatus = () => {
  const status = readEnv('KORTEX_BINDING_STATUS') ?? 'draft'

  if (status !== 'draft' && status !== 'active' && status !== 'suspended' && status !== 'deprecated') {
    throw new Error('KORTEX_BINDING_STATUS debe ser draft, active, suspended o deprecated.')
  }

  return status as SisterPlatformBindingStatus
}

const readOAuthClientStatus = () => {
  const status = readEnv('KORTEX_OAUTH_CLIENT_STATUS') ?? 'active'

  if (status !== 'draft' && status !== 'active' && status !== 'suspended' && status !== 'deprecated') {
    throw new Error('KORTEX_OAUTH_CLIENT_STATUS debe ser draft, active, suspended o deprecated.')
  }

  return status
}

const readScopeInput = (): ScopeInput => {
  const greenhouseScopeType = (readEnv('KORTEX_GREENHOUSE_SCOPE_TYPE') ?? 'client') as SisterPlatformGreenhouseScopeType
  const organizationId = readEnv('KORTEX_GREENHOUSE_ORGANIZATION_ID')
  const clientId = readEnv('KORTEX_GREENHOUSE_CLIENT_ID')
  const spaceId = readEnv('KORTEX_GREENHOUSE_SPACE_ID')

  if (
    greenhouseScopeType !== 'organization' &&
    greenhouseScopeType !== 'client' &&
    greenhouseScopeType !== 'space' &&
    greenhouseScopeType !== 'internal'
  ) {
    throw new Error('KORTEX_GREENHOUSE_SCOPE_TYPE debe ser organization, client, space o internal.')
  }

  if (greenhouseScopeType === 'internal') {
    if (organizationId || clientId || spaceId) {
      throw new Error('Scope internal no acepta organization/client/space ids.')
    }

    return {
      greenhouseScopeType,
      organizationId: null,
      clientId: null,
      spaceId: null
    }
  }

  if (!organizationId) {
    throw new Error('KORTEX_GREENHOUSE_ORGANIZATION_ID es requerido para organization/client/space.')
  }

  if (greenhouseScopeType === 'organization') {
    return {
      greenhouseScopeType,
      organizationId,
      clientId: null,
      spaceId: null
    }
  }

  if (!clientId) {
    throw new Error('KORTEX_GREENHOUSE_CLIENT_ID es requerido para client/space.')
  }

  if (greenhouseScopeType === 'client') {
    return {
      greenhouseScopeType,
      organizationId,
      clientId,
      spaceId: null
    }
  }

  if (!spaceId) {
    throw new Error('KORTEX_GREENHOUSE_SPACE_ID es requerido para space.')
  }

  return {
    greenhouseScopeType,
    organizationId,
    clientId,
    spaceId
  }
}

const resolveExistingBinding = async (externalScopeId: string) => {
  const { listSisterPlatformBindings } = await import('@/lib/sister-platforms/bindings')

  const bindings = await listSisterPlatformBindings({
    sisterPlatformKey: 'kortex',
    limit: 200
  })

  return (
    bindings.find(
      binding =>
        binding.externalScopeType === 'portal' &&
        binding.externalScopeId === externalScopeId &&
        binding.bindingRole === 'primary'
    ) ?? null
  )
}

const upsertKortexBinding = async (input: CreateSisterPlatformBindingInput) => {
  const { createSisterPlatformBinding, updateSisterPlatformBinding } = await import('@/lib/sister-platforms/bindings')
  const existingBinding = await resolveExistingBinding(input.externalScopeId)

  if (!existingBinding) {
    const createdBinding = await createSisterPlatformBinding({ input })

    return {
      binding: createdBinding,
      created: true
    }
  }

  const updatedBinding = await updateSisterPlatformBinding({
    bindingId: existingBinding.bindingId,
    input: {
      externalScopeParentId: input.externalScopeParentId ?? null,
      externalDisplayName: input.externalDisplayName ?? null,
      greenhouseScopeType: input.greenhouseScopeType,
      organizationId: input.organizationId ?? null,
      clientId: input.clientId ?? null,
      spaceId: input.spaceId ?? null,
      bindingStatus: input.bindingStatus,
      notes: input.notes ?? null,
      metadata: input.metadata ?? {},
      lastVerifiedAt: input.lastVerifiedAt ?? null
    }
  })

  return {
    binding: updatedBinding,
    created: false
  }
}

const printBindingSummary = (binding: SisterPlatformBindingRecord) => {
  console.log('')
  console.log('Binding listo:')
  console.log(`- publicId: ${binding.publicId}`)
  console.log(`- status: ${binding.bindingStatus}`)
  console.log(`- external: ${binding.externalScopeType}:${binding.externalScopeId}`)
  console.log(
    `- greenhouseScope: ${binding.greenhouseScopeType} (org=${binding.organizationId ?? '-'}, client=${binding.clientId ?? '-'}, space=${binding.spaceId ?? '-'})`
  )
}

async function main() {
  stubServerOnlyForScripts()
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')

  const { upsertSisterPlatformConsumer } = await import('@/lib/sister-platforms/consumers')

  const externalScopeId = readEnv('KORTEX_EXTERNAL_SCOPE_ID')
  const externalDisplayName = readEnv('KORTEX_EXTERNAL_DISPLAY_NAME')
  const externalScopeParentId = readEnv('KORTEX_EXTERNAL_SCOPE_PARENT_ID')
  const installationId = readEnv('KORTEX_INSTALLATION_ID')
  const actorUserId = readEnv('KORTEX_ACTOR_USER_ID') ?? 'system'
  const rotateToken = readEnv('KORTEX_ROTATE_CONSUMER_TOKEN') === 'true'
  const providedToken = readEnv('KORTEX_CONSUMER_TOKEN')
  const bindingStatus = readBindingStatus()
  const oauthClientStatus = readOAuthClientStatus()
  const allowedGreenhouseScopeTypes = readCsvScopes('KORTEX_ALLOWED_GREENHOUSE_SCOPE_TYPES', ['client', 'space'])

  const oauthRedirectUris = readCsvText('KORTEX_OAUTH_REDIRECT_URIS', [
    'https://kortex-kappa.vercel.app/api/auth/callback/greenhouse',
    'https://kortex.efeoncepro.com/api/auth/callback/greenhouse',
    'http://localhost:3000/api/auth/callback/greenhouse',
    'http://localhost:3001/api/auth/callback/greenhouse'
  ])

  const oauthAllowedScopes = readCsvText('KORTEX_OAUTH_ALLOWED_SCOPES', [
    'openid',
    'profile',
    'email',
    'kortex.operator_console.access'
  ])

  const scope = readScopeInput()

  if (!externalScopeId) {
    throw new Error('KORTEX_EXTERNAL_SCOPE_ID es requerido. Usa el portal_id o hubspot_portal_id canonico.')
  }

  const consumerResult = await upsertSisterPlatformConsumer({
    sisterPlatformKey: 'kortex',
    consumerName: readEnv('KORTEX_CONSUMER_NAME') ?? 'Kortex Operator Console',
    consumerType: 'sister_platform',
    credentialStatus: readEnv('KORTEX_CONSUMER_STATUS') === 'draft' ? 'draft' : 'active',
    token: providedToken ?? undefined,
    rotateToken,
    allowedGreenhouseScopeTypes,
    rateLimitPerMinute: readPositiveInt('KORTEX_RATE_LIMIT_PER_MINUTE', 60),
    rateLimitPerHour: readPositiveInt('KORTEX_RATE_LIMIT_PER_HOUR', 1000),
    notes: readEnv('KORTEX_NOTES') ?? 'Seed operativo del piloto Kortex desde Greenhouse.',
    metadata: {
      source: 'scripts/seed-kortex-sister-platform-pilot.ts',
      installationId,
      externalScopeType: 'portal',
      externalScopeId,
      taskId: 'TASK-377'
    },
    actorUserId
  })

  const bindingResult = await upsertKortexBinding({
    sisterPlatformKey: 'kortex',
    externalScopeType: 'portal',
    externalScopeId,
    externalScopeParentId,
    externalDisplayName,
    greenhouseScopeType: scope.greenhouseScopeType,
    organizationId: scope.organizationId,
    clientId: scope.clientId,
    spaceId: scope.spaceId,
    bindingRole: 'primary',
    bindingStatus,
    notes: readEnv('KORTEX_BINDING_NOTES') ?? 'Binding piloto Kortex -> Greenhouse.',
    metadata: {
      source: 'scripts/seed-kortex-sister-platform-pilot.ts',
      installationId,
      externalScopeType: 'portal',
      externalScopeId,
      taskId: 'TASK-377'
    },
    lastVerifiedAt: new Date().toISOString()
  })

  const { upsertSisterPlatformOAuthClient } = await import('@/lib/sister-platforms/oauth-broker')

  const oauthClient = await upsertSisterPlatformOAuthClient({
    sisterPlatformConsumerId: consumerResult.consumer.consumerId,
    clientId: readEnv('KORTEX_OAUTH_CLIENT_ID') ?? 'kortex',
    clientName: readEnv('KORTEX_OAUTH_CLIENT_NAME') ?? 'Kortex Operator Console',
    clientStatus: oauthClientStatus,
    redirectUris: oauthRedirectUris,
    allowedScopes: oauthAllowedScopes,
    codeTtlSeconds: readPositiveInt('KORTEX_OAUTH_CODE_TTL_SECONDS', 300),
    accessTokenTtlSeconds: readPositiveInt('KORTEX_OAUTH_ACCESS_TOKEN_TTL_SECONDS', 300),
    requirePkce: true,
    issueIdentityInline: true,
    metadata: {
      source: 'scripts/seed-kortex-sister-platform-pilot.ts',
      installationId,
      taskId: 'TASK-948',
      previousTaskId: 'TASK-377'
    },
    actorUserId
  })

  console.log('Kortex pilot seed completado.')
  console.log('')
  console.log('Consumer listo:')
  console.log(`- publicId: ${consumerResult.consumer.publicId}`)
  console.log(`- status: ${consumerResult.consumer.credentialStatus}`)
  console.log(`- tokenPrefix: ${consumerResult.consumer.tokenPrefix}`)
  console.log(`- allowedScopes: ${consumerResult.consumer.allowedGreenhouseScopeTypes.join(', ')}`)
  console.log(`- mode: ${consumerResult.created ? 'created' : 'updated'}${consumerResult.rotated ? ' + token rotated' : ''}`)

  if (consumerResult.plainToken) {
    console.log('')
    console.log('Token nuevo/rotado (guardalo en el runtime de Kortex):')
    console.log(consumerResult.plainToken)
  } else {
    console.log('')
    console.log('Token no rotado. Se reutilizo la credencial existente.')
  }

  printBindingSummary(bindingResult.binding)

  console.log('')
  console.log('OAuth client listo:')
  console.log(`- clientId: ${oauthClient.clientId}`)
  console.log(`- status: ${oauthClient.clientStatus}`)
  console.log(`- consumerPublicId: ${consumerResult.consumer.publicId}`)
  console.log(`- redirectUris: ${oauthClient.redirectUris.join(', ')}`)
  console.log(`- allowedScopes: ${oauthClient.allowedScopes.join(' ')}`)
  console.log(`- ttl: code=${oauthClient.codeTtlSeconds}s accessToken=${oauthClient.accessTokenTtlSeconds}s`)

  console.log('')
  console.log('Smoke call sugerido:')
  console.log(
    `curl \"$GREENHOUSE_BASE_URL/api/integrations/v1/sister-platforms/context?externalScopeType=portal&externalScopeId=${encodeURIComponent(externalScopeId)}\" -H \"x-greenhouse-sister-platform-key: <TOKEN_KORTEX>\"`
  )
  console.log('')
  console.log('Kortex env sugeridas para SSO:')
  console.log(`KORTEX_GREENHOUSE_SSO_ENABLED=true`)
  console.log(`GREENHOUSE_OAUTH_CLIENT_ID=${oauthClient.clientId}`)
  console.log(`GREENHOUSE_OAUTH_CLIENT_SECRET=<TOKEN_KORTEX>`)
  console.log(`GREENHOUSE_OAUTH_ISSUER=$GREENHOUSE_BASE_URL`)
}

main()
  .catch(error => {
    console.error('Kortex pilot seed fallo.')
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    const { closeGreenhousePostgres } = await import('@/lib/db')

    await closeGreenhousePostgres().catch(() => {})
  })
