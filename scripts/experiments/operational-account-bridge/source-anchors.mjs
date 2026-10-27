// Read ONLY these local files. These anchors check model provenance, not deployed runtime.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export const anchors = [
  {
    id: 'company-space-without-active-filter',
    path: 'src/lib/services/service-sync.ts',
    snippet: 'WHERE o.hubspot_company_id = $1\n     LIMIT 1'
  },
  {
    id: 'session-client-active-spaces',
    path: 'migrations/20260601194051024_task-987-session-route-groups-lifecycle-fix.sql',
    snippet: 'LEFT JOIN greenhouse_core.spaces spc ON spc.client_id = u.client_id AND spc.active = true'
  },
  {
    id: 'session-first-row',
    path: 'src/lib/tenant/identity-store.ts',
    snippet: 'SELECT * FROM greenhouse_serving.session_360 WHERE user_id = $1 LIMIT 1'
  },
  {
    id: 'notion-source-client-first-row',
    path: 'src/lib/space-notion/space-notion-store.ts',
    snippet: 'WHERE s.client_id = $1 AND s.active = TRUE AND sns.sync_enabled = TRUE\n     LIMIT 1'
  },
  {
    id: 'cache-organization-key',
    path: 'src/lib/account-360/facet-cache.ts',
    snippet: '`account360:${orgId}:${facet}:${RESOLVER_VERSION}`'
  },
  {
    id: 'finance-client-candidates-before-org',
    path: 'src/lib/service-attribution/materialize.ts',
    snippet: '(input.clientId ? indexes.byClientId.get(input.clientId) : null) ||\n    (input.organizationId ? indexes.byOrganizationId.get(input.organizationId) : null)'
  },
  {
    id: 'finance-service-client-from-space',
    path: 'src/lib/service-attribution/materialize.ts',
    snippet: 'sp.client_id,'
  },
  {
    id: 'commercial-instantiation-refuses-second-client',
    path: 'src/lib/commercial/party/commands/instantiate-client-for-party.ts',
    snippet: 'throw new OrganizationAlreadyHasClientError(input.organizationId, existingClientId)'
  },
  {
    id: 'wizard-reuses-oldest-space',
    path: 'src/lib/client-lifecycle/commands/provision-client-from-wizard.ts',
    snippet: 'SELECT space_id FROM greenhouse_core.spaces WHERE client_id = $1 ORDER BY created_at ASC LIMIT 1'
  }
]

export function verifyAnchors(read = path => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8')) {
  return anchors.map(anchor => {
    const contents = read(anchor.path)

    if (!contents.includes(anchor.snippet)) throw new Error(`source_anchor_drift:${anchor.id}`)

    return { id: anchor.id, path: anchor.path, snippet: anchor.snippet,
      fileSha256: createHash('sha256').update(contents).digest('hex'),
      line: contents.slice(0, contents.indexOf(anchor.snippet)).split('\n').length }
  })
}
