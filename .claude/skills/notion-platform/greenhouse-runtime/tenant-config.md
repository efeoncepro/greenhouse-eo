# Greenhouse runtime — legacy tenant config and migration guidance

> **Status**: legacy inventory; do not use this file as the work-management resolver.
> **Last verified**: 2026-07-18
>
> Canonical resolver: `work-space-registry.md`. The registry maps a stable Greenhouse `space_id` to scoped Notion sources, secret references, property IDs and schema fingerprints.

## 1. Estructura canonical multi-tenant

Cada tenant operativo Greenhouse tiene su propio:
- **Notion teamspace** (workspace separation)
- **Tasks/Projects/Sprints data sources** (3 por tenant típicamente)
- **Integration token** (separado per tenant en GCP Secret Manager)
- **Webhook signing secret** (separado per tenant)
- **Webhook endpoint** (mismo Vercel route, pero différentes secrets resolved per tenant_id)

## 2. Historical IDs — diagnostic only

These values are retained only to interpret legacy integrations. A placeholder, a display name or an unverified ID is never a writable destination. Resolve normal work-management operations through the registry.

### Efeonce (productivo)
- Teamspace: `f31929ee-8808-42e1-95eb-0e98964fd81c` `[verificar]`
- Tasks data source: `5126d7d8-bf3f-454c-80f4-be31d1ca38d4` `[verificar Discovery]`
- Projects data source: `[pending Discovery]`
- Sprints data source: `[pending Discovery]`

### Sky Airline (productivo)
- Teamspace: `[pending Discovery — Sky teamspace separado]`
- Tasks data source: `23039c2f-efe7-81f8-af2d-000b67594d18` `[verificar Discovery]`
- Projects data source: `[pending Discovery]`
- Sprints data source: `[pending Discovery]`

### Greenhouse Migration Demo (sandbox TASK-910)
- Teamspace: `36339c2f-efe7-814c-a0f5-0042863dbb5a` ✓ verified live 2026-05-17
- Tasks data source: `36339c2f-efe7-81a6-980c-000b0056bba8` ✓
- Projects data source: `36339c2f-efe7-8116-8c15-000be81c5538` ✓
- Sprints data source: `36339c2f-efe7-81cc-8f2f-000b112ee87c` ✓

### Identity warning

Notion IDs are opaque. Their prefixes do **not** identify a workspace, teamspace, client or environment. Never parse or compare a prefix to authorize a write. Prevent cross-contamination with the resolved `space_id`, scoped integration token, exact data source ID and a current schema fingerprint.

## 3. Secrets canonical en GCP Secret Manager

| Secret name | Purpose | Tenant |
|---|---|---|
| `notion-integration-token-greenhouse-metrics` | TASK-901 writeback integration | All (TBD per-tenant en V2) |
| `notion-integration-token-sync-conformed` | Legacy notion-bq-sync token | All (legacy) |
| `notion-webhook-signing-secret-efeonce` | HMAC verify Efeonce webhook | Efeonce |
| `notion-webhook-signing-secret-sky` | HMAC verify Sky webhook | Sky |
| `notion-webhook-signing-secret-demo` | HMAC verify Demo webhook | Demo (TASK-910) |
| `notion-integration-user-id-greenhouse-metrics` | Bot ID for echo-loop check | All |

Pattern canonical: `notion-<asset-type>-<tenant>` o `notion-<asset-type>-<purpose>`.

⚠️ **NUNCA** compartir signing secret cross-tenant. Per-tenant secrets aíslan blast radius si uno se compromete.

## 4. Legacy webhook routing

Cuando un webhook llega, necesitas identificar qué tenant es:

### Strategy A — Webhook endpoint dedicado per tenant (recomendada)

```
POST /api/webhooks/notion-tasks/efeonce
POST /api/webhooks/notion-tasks/sky
POST /api/webhooks/notion-tasks/demo  ← TASK-910
```

Pros: tenant_id trivial de resolver (en URL path)
Cons: 3+ subscriptions Notion (1 per endpoint)

### Strategy B — Single endpoint + workspace_id lookup

```
POST /api/webhooks/notion-tasks
  → Parse event.workspace_id
  → Lookup tenant_id WHERE workspace_id = X
```

Pros: 1 sola subscription / endpoint
Cons: extra lookup per request, riesgo cross-tenant mistake si lookup falla

Existing webhook consumers may use Strategy A, but URL routing is not the canonical work-management destination resolver. Every event must still verify its workspace/source binding against the registry before mutation.

## 5. Deprecated static resolver example

Do not extend the following historical pattern with more hardcoded clients:

```typescript
// src/lib/notion-client/tenant-resolver.ts (TBD)
export type NotionTenantId = 'efeonce' | 'sky' | 'demo'

export const resolveNotionTenantSecrets = async (tenantId: NotionTenantId) => {
  const tenantSuffix = { efeonce: 'efeonce', sky: 'sky', demo: 'demo' }[tenantId]

  return {
    signingSecret: await resolveSecret(`notion-webhook-signing-secret-${tenantSuffix}`),
    integrationToken: await resolveSecret(`notion-integration-token-greenhouse-metrics`),
    integrationUserId: await resolveSecret(`notion-integration-user-id-greenhouse-metrics`)
  }
}

export const resolveNotionTenantConfig = (tenantId: NotionTenantId) => {
  const configs = {
    efeonce: {
      teamspaceId: 'f31929ee-...',
      tasksDataSourceId: '5126d7d8-...',
      projectsDataSourceId: '...',
      sprintsDataSourceId: '...'
    },
    sky: { ... },
    demo: {
      teamspaceId: '36339c2f-efe7-814c-a0f5-0042863dbb5a',
      tasksDataSourceId: '36339c2f-efe7-81a6-980c-000b0056bba8',
      projectsDataSourceId: '36339c2f-efe7-8116-8c15-000be81c5538',
      sprintsDataSourceId: '36339c2f-efe7-81cc-8f2f-000b112ee87c'
    }
  }
  return configs[tenantId]
}
```

New consumers resolve `space_id` through the persisted registry and use semantic property bindings. This keeps onboarding data-driven and allows property renames without code changes.

## 6. Hard rules canonical

- **NUNCA** hardcodear IDs Notion en TypeScript fuera de `tenant-resolver.ts` canonical
- **NUNCA** inferir ownership o destino mediante prefijos de ID
- **NUNCA** compartir secrets cross-tenant
- **NUNCA** procesar webhook sin identificar tenant_id primero
- **SIEMPRE** valida que el `workspace_id` del event matchea el tenant esperado (defense in depth)
- **NUNCA** usar PAT del operador en runtime — solo internal integration tokens
- **SIEMPRE** rotación de secrets via runbook canonical (`docs/operations/runbooks/...`)

## 7. Cuándo expandir tenants

Si emerge un cliente nuevo:
1. Operador crea teamspace en Notion + clone template Efeonce
2. Provisiona una integración/token con scope mínimo para ese destino
3. Ejecuta el onboarding de `teamspace-linking-per-client-token.md`
4. Persiste `space_id`, data source IDs, secret ref, property IDs y schema fingerprint en el registry
5. Verifica dry-run de lectura y escritura aislada
6. Configura webhook y ledger si el caso requiere historial

## 8. Cross-refs

- `greenhouse-runtime/demo-teamspace.md` — TASK-910 demo detail
- `greenhouse-runtime/work-space-registry.md` — resolver multi-space canonical
- `greenhouse-runtime/teamspace-linking-per-client-token.md` — onboarding canonical
- `greenhouse-runtime/property-allowlist.md` — INPUT_PROPS canonical
- `greenhouse-runtime/bridge-identity-notion-member.md` (stub) — Notion user → member resolution
- `api-reference/auth-and-tokens.md` — token strategy canonical
- `patterns-canonical/hmac-validation.md` — per-tenant signing secrets
- TASK-910 (Greenhouse) — demo teamspace specifics
- CLAUDE.md § "Secret Manager Hygiene"
