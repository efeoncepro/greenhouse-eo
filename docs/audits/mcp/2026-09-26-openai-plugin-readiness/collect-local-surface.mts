/** Read-only local audit. Run with the gateway's installed tsx; never loads .env or calls providers. */
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { writeFileSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const [gatewayArg, outputArg] = process.argv.slice(2)
if (!gatewayArg || !outputArg) throw new Error('Usage: tsx collect-local-surface.mts <gateway-root> <output.json>')
const root = resolve(gatewayArg)
const load = (path: string) => import(pathToFileURL(resolve(root, path)).href)
const { buildMcpServer } = await load('src/mcp.ts')
const { TOOL_AUTHORITY_POLICIES, evaluateToolAuthority } = await load('src/auth/tool-policy.ts')
const { MARKETING_STUDIO_TOOL_MANIFEST } = await load('src/providers/marketing-studio-tool-manifest.generated.ts')
const { z } = createRequire(resolve(root, 'package.json'))('zod')
const provider = new Proxy(
  {},
  {
    get: (_target, property) => () => {
      if (property === 'summary') return { providerId: 'audit-fixture', contractVersion: 'audit', state: 'enabled' }
      if (property === 'candidateReviewEnabled') return true
      throw new Error('Audit must not dispatch provider methods')
    }
  }
)
const server = buildMcpServer({
  globe: provider,
  globeCreditFunding: provider,
  greenhouseSeo: provider,
  greenhouseHiring: provider,
  greenhouseSkills: provider,
  greenhouseInsights: provider,
  greenhouseIdentity: provider,
  greenhouseClientServices: provider,
  marketingStudio: {
    summary: () => ({ providerId: 'audit-fixture', contractVersion: 'audit', state: 'enabled' }),
    tools: () => MARKETING_STUDIO_TOOL_MANIFEST.tools,
    call: () => {
      throw new Error('Audit must not dispatch Studio')
    }
  }
})
const contextId = '11111111-1111-4111-8111-111111111111'
const capability = 'growth.seo.observation.read'
const base = {
  issuerClass: 'native',
  issuer: 'https://auth.efeonce.org',
  subject: 'audit-fixture',
  clientId: 'audit-fixture',
  audience: 'https://mcp.efeonce.org/mcp',
  delegatedScopes: ['efeonce.mcp.read'],
  roles: [],
  expiresAt: 9999999999,
  environmentId: 'audit-fixture',
  grantsVersion: 1,
  authorizationContextId: null,
  authorizationContextVersion: null
}
const membership = {
  bindingId: 'audit-binding',
  organizationId: 'audit-org',
  grantsVersion: 1,
  capabilities: [capability],
  bindingPurpose: 'customer',
  canaryRegistrationId: null,
  expiresAt: null
}
const scenarios = {
  internal_v2_base: {
    authContext: {
      ...base,
      jti: 'abcdefghijklmnopqrstuv',
      authorizationContextId: contextId,
      authorizationContextVersion: 2
    },
    bindingResolution: {
      allowed: true,
      population: 'internal',
      contextVersion: 2,
      authorizationContextId: contextId,
      actor: {
        profileId: 'audit-profile',
        organizationId: 'audit-anchor',
        bindingId: 'audit-binding',
        grantsVersion: 1
      },
      capabilities: [capability],
      nextAfterOrganizationId: null,
      targets: [
        {
          organizationId: 'audit-org',
          organizationName: 'Audit fixture',
          capabilities: [capability],
          authorityRevision: 'a'.repeat(43)
        }
      ]
    }
  },
  external_customer_base: {
    authContext: base,
    bindingResolution: {
      allowed: true,
      population: 'external',
      profileId: 'audit-profile',
      authorizationContextId: null,
      memberships: [membership]
    }
  },
  external_canary_base: {
    authContext: base,
    bindingResolution: {
      allowed: true,
      population: 'external',
      profileId: 'audit-profile',
      authorizationContextId: null,
      memberships: [{ ...membership, bindingPurpose: 'canary', canaryRegistrationId: 'audit-canary' }]
    }
  }
}
const schema = (value: unknown) => (value ? z.toJSONSchema(value, { unrepresentable: 'any' }) : null)
const tools = Object.entries(server._registeredTools)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, value]) => {
    const tool = value as any
    return {
      name,
      title: tool.title,
      description: tool.description,
      annotations: tool.annotations ?? null,
      inputSchema: schema(tool.inputSchema),
      outputSchema: tool.outputSchemaJson ?? schema(tool.outputSchema),
      securitySchemes: tool._meta?.securitySchemes ?? null,
      authorityPolicy: TOOL_AUTHORITY_POLICIES[name],
      policySimulation: Object.fromEntries(
        Object.entries(scenarios).map(([scenario, fixture]) => [
          scenario,
          {
            list: evaluateToolAuthority({ ...fixture, toolName: name, phase: 'list' }),
            ownTarget: evaluateToolAuthority({
              ...fixture,
              toolName: name,
              phase: 'call',
              organizationId: 'audit-org'
            }),
            otherTarget: evaluateToolAuthority({
              ...fixture,
              toolName: name,
              phase: 'call',
              organizationId: 'other-org'
            })
          }
        ])
      )
    }
  })
const summary = {
  tools: tools.length,
  missingHints: tools
    .filter(t =>
      ['readOnlyHint', 'destructiveHint', 'openWorldHint'].some(k => typeof t.annotations?.[k] !== 'boolean')
    )
    .map(t => t.name),
  missingOutputSchema: tools.filter(t => !t.outputSchema).map(t => t.name),
  missingSecuritySchemes: tools.filter(t => !t.securitySchemes).map(t => t.name),
  policyVisible: Object.fromEntries(
    Object.keys(scenarios).map(name => [
      name,
      tools.filter(t => t.policySimulation[name].list.allowed).map(t => t.name)
    ])
  )
}
const git = (...args: string[]) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim()
const output = {
  capturedAt: new Date().toISOString(),
  evidenceClass: 'local-built-server-and-pure-policy-simulation',
  limitations: [
    'All providers enabled only in memory; not the deployed catalog.',
    'Synthetic authority fixtures; no OAuth login, provider dispatch, customer grant, or live entitlement proof.',
    'Annotation presence is not semantic certification.'
  ],
  source: {
    sha: git('rev-parse', 'HEAD'),
    dirty: git('status', '--porcelain').length > 0,
    version: JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version
  },
  summary,
  tools
}
writeFileSync(resolve(outputArg), JSON.stringify(output, null, 2) + '\n')
console.log(JSON.stringify({ source: output.source, summary }, null, 2))
