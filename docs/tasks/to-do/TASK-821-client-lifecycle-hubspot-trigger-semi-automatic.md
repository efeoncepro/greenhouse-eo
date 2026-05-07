# TASK-821 — Client Lifecycle HubSpot Semi-Automatic Trigger

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `commercial / integrations.hubspot`
- Blocked by: `TASK-820`
- Branch: `task/TASK-821-client-lifecycle-hubspot-trigger`

## Summary

Cierra V1.0 del módulo Client Lifecycle conectando HubSpot deal lifecycle a la creación automática de cases en `status='draft'` (semi-automatic per spec §11). Cuando un deal HubSpot transiciona a `closedwon` → propone onboarding case; cuando `closedlost` o property `lifecyclestage=churned` → propone offboarding case. Operador revisa + activa via UI (TASK-819). Notificación a equipo comercial al crearse el draft.

## Why This Task Exists

Sin trigger automático, cada nuevo cliente HubSpot requiere que el operador comercial recuerde abrir el case manualmente — fricción operativa que regresa el comportamiento al estado pre-V1. La decisión de spec §11 fue **semi-automatic** (no full-automatic) porque misclick de sales en HubSpot deal stage NO debe disparar side-effects irreversibles. Crear en `status='draft'` con notificación es el equilibrio: zero-friction para operador (case ya está iniciado), zero-blast para misclick (nada cascada hasta activación humana).

## Goal

- Webhook handler `hubspot-deals` registrado en `webhook_endpoints` con signature v3 + dedupe
- Subscriptions HubSpot Developer Portal: `deal.creation`, `deal.propertyChange.dealstage`, `deal.propertyChange.closedate`, opcional `company.propertyChange.lifecyclestage`
- Lookup deal → company → organization → invocar `provisionClientLifecycle` o `deprovisionClientLifecycle` con `triggerSource='hubspot_deal'` o `'churn_signal'` y `status='draft'`
- Notificación al equipo comercial via Teams o email (skill `greenhouse-email` o `teams-bot-platform`) cuando draft case creado
- Banner en `/admin/clients/[orgId]` (extiende TASK-819 banner) cuando draft case existe pendiente de activación
- Tests integration de webhook signature + happy path + dedup
- Reliability signal `client.lifecycle.hubspot_trigger.draft_pending_overdue` (drafts > 7 días sin activar)

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` §11 (HubSpot Integration)
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` — webhook canonical pattern
- `CLAUDE.md` sección "HubSpot inbound webhook — companies + contacts auto-sync (TASK-706)"
- `CLAUDE.md` sección "HubSpot inbound webhook — p_services (0-162) auto-sync (TASK-813)"
- `docs/architecture/GREENHOUSE_NOTIFICATION_HUB_V1.md` (si existe; sino, follow-up TASK-716)

Reglas obligatorias:

- Endpoint genérico `/api/webhooks/[endpointKey]/route.ts` + handler `hubspot-deals` (mismo patrón TASK-706/813)
- Validar signature HubSpot v3 (HMAC-SHA256, `HUBSPOT_APP_CLIENT_SECRET`, timestamp expiry < 5 min, timing-safe compare)
- Inbox dedupe via `webhook_inbox_events.event_id` UNIQUE
- HubSpot deal IDs → company → organization lookup vía `clients.hubspot_company_id`; si no existe → emit `client.lifecycle.hubspot_trigger.organization_unresolved` outbox v1 (operador comercial resuelve)
- Crear case con `status='draft'`, NUNCA `in_progress` automático
- `triggerSource='hubspot_deal'` para `closedwon` (onboarding)
- `triggerSource='churn_signal'` para `closedlost` o `lifecyclestage=churned` (offboarding)
- `metadata_json` incluye `hubspot_deal_id`, `hubspot_dealstage`, `hubspot_closedate`
- Errors via `captureWithDomain(err, 'integrations.hubspot', { tags: { source: 'hubspot_deals_webhook' } })`
- Notification: usar `pnpm teams:announce` helper o email canónico — NUNCA POST directo a Teams Connector desde el handler
- Idempotency: si ya existe case activo del mismo kind, NO crear otro (re-call → noop)
- Feature flag para staged rollout: `home_rollout_flags` pattern (TASK-780) — flag `client_lifecycle_hubspot_auto_trigger`

## Normative Docs

- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` §11
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `services/hubspot_greenhouse_integration/hubspot-app/.../webhooks-hsmeta.json`

## Dependencies & Impact

### Depends on

- TASK-820 (cascade consumers funcionando — el flow completo end-to-end)
- TASK-817 (`provisionClientLifecycle` / `deprovisionClientLifecycle`)
- HubSpot webhook infrastructure (TASK-706 generic endpoint + handler pattern) ✅ existe
- HubSpot App Developer Portal (build via `hs project upload`) ✅ existe
- `HUBSPOT_APP_CLIENT_SECRET` en GCP Secret Manager ✅ existe
- Teams announce helper o email canónico ✅ existe
- Feature flag platform (TASK-780) ✅ existe

### Blocks / Impacts

- Cierre V1.0 del módulo
- Métricas de adopción HubSpot (post-V1.0)

### Files owned

- `src/lib/webhooks/handlers/hubspot-deals.ts`
- `src/lib/webhooks/handlers/__tests__/hubspot-deals.test.ts`
- `src/lib/client-lifecycle/hubspot/lookup-organization.ts`
- `src/lib/client-lifecycle/hubspot/notify-comercial-team.ts`
- `src/lib/reliability/queries/client-lifecycle-hubspot-draft-pending-overdue.ts`
- `services/hubspot_greenhouse_integration/hubspot-app/.../webhooks-hsmeta.json` (extender subscriptions)
- `migrations/<ts>_task-821-webhook-endpoint-hubspot-deals.sql` (INSERT en `webhook_endpoints` + flag default)
- `src/views/greenhouse/admin/clients/lifecycle/components/HubspotDraftBanner.tsx`

## Current Repo State

### Already exists

- Webhook generic endpoint `/api/webhooks/[endpointKey]/route.ts`
- Handler pattern (TASK-706 hubspot-companies, TASK-813 hubspot-services)
- HubSpot signature v3 validator
- HubSpot App + subscriptions canonical (companies + p_services)
- `provisionClientLifecycle` / `deprovisionClientLifecycle` (TASK-817)
- Teams announce helper / email infrastructure
- Feature flag platform (`home_rollout_flags` o `client_lifecycle_*` extension)
- Lookup `clients.hubspot_company_id`

### Gap

- No existe handler `hubspot-deals`
- HubSpot App no suscribe `deal.*` events (solo `company.*`, `contact.*`, `p_services.*` actualmente)
- No hay notification flow al equipo comercial cuando draft case creado
- No hay banner UI específico para draft pendiente de activación

## Scope

### Slice 1 — Migration: webhook endpoint + feature flag

- Crear migration:
  - INSERT en `greenhouse_sync.webhook_endpoints` row para `hubspot-deals` con `signature_method='v3'`, `auth_mode='provider_native'`
  - INSERT en `greenhouse_serving.home_rollout_flags` (o equivalente) flag `client_lifecycle_hubspot_auto_trigger` scope=global, enabled=FALSE
- Verify post-migration

### Slice 2 — HubSpot App subscription update

- Editar `services/hubspot_greenhouse_integration/hubspot-app/.../webhooks-hsmeta.json` agregando subscriptions:
  - `object.creation` → deal
  - `object.propertyChange` → deal `[dealstage, closedate]`
  - (opcional) `object.propertyChange` → company `[lifecyclestage]` (para detección de churn cuando lifecycle flippea sin cerrar deal)
- Deploy via `hs project upload` (documentar en runbook)

### Slice 3 — Handler `hubspot-deals`

- `src/lib/webhooks/handlers/hubspot-deals.ts`:
  - Validate signature v3 + timestamp + timing-safe (mismo pattern TASK-706)
  - Inbox dedupe por `event_id`
  - Para cada event:
    - Si `subscriptionType='deal.propertyChange.dealstage'` y `propertyValue='closedwon'`:
      - Lookup deal → company via HubSpot API + `fetchAssociations`
      - Lookup organization via `clients.hubspot_company_id`
      - Si org no encontrada → emit outbox `client.lifecycle.hubspot_trigger.organization_unresolved` v1 (operador resuelve)
      - Si flag `client_lifecycle_hubspot_auto_trigger` enabled → invoke `provisionClientLifecycle({caseKind:'onboarding', triggerSource:'hubspot_deal', status:'draft', metadata:{hubspot_deal_id, hubspot_dealstage, hubspot_closedate}})`
      - Notify comercial team
    - Si `subscriptionType='deal.propertyChange.dealstage'` y `propertyValue='closedlost'`:
      - Same lookup
      - Invoke `deprovisionClientLifecycle({triggerSource:'churn_signal', reason:'HubSpot deal closedlost'})`
      - Notify comercial team
    - (opcional) Si `subscriptionType='company.propertyChange.lifecyclestage'` y `propertyValue='churned'`:
      - Same offboarding flow

### Slice 4 — Lookup helper + notification

- `lookupOrganizationFromHubspotDeal(dealId)` — encadena: deal → company associations → `clients.hubspot_company_id` → `organization_id`
- `notifyComercialTeamDraftCaseCreated(caseId, organizationId, kind)` — usa `pnpm teams:announce` helper o email a canal comercial; copy via skill `greenhouse-ux-writing`

### Slice 5 — UI banner draft pendiente

- `<HubspotDraftBanner>` component en `/admin/clients/[orgId]/lifecycle` y página principal del cliente:
  - Si existe case con `status='draft'` y `triggerSource='hubspot_deal'`:
    - Severity: info
    - Mensaje: "HubSpot detectó un cambio de stage en el deal. Hay un onboarding (u offboarding) en draft pendiente de tu activación."
    - CTA: "Revisar y activar" → drawer
- Microcopy via `client-lifecycle.ts` dictionary (extender)

### Slice 6 — Reliability signal nuevo

- `client.lifecycle.hubspot_trigger.draft_pending_overdue` — `kind=drift, severity=warning, steady=0`
  - Query: cases con `status='draft' AND triggerSource='hubspot_deal' AND created_at < now() - INTERVAL '7 days'`
- Wire-up en subsystem `Commercial Health`

### Slice 7 — Tests + staged rollout

- Test signature reject (bad HMAC)
- Test timestamp expiry
- Test dedup
- Test happy path closedwon → draft case onboarding created + notification dispatched
- Test happy path closedlost → draft case offboarding created
- Test idempotency: re-deliver event → noop
- Test feature flag OFF: handler valida pero NO crea case (solo logs intent)
- Staged rollout plan documentado en `Handoff.md`:
  - Fase 1: flag enabled SOLO para tenant `efeonce_internal` (smoke en staging)
  - Fase 2: enable para 1 tenant Globe piloto
  - Fase 3: enable global

## Out of Scope

- Bidireccional HubSpot (escribir property `greenhouse_lifecycle_case_status` a HubSpot deal) — V1.1
- Auto-activation del case (sigue siendo manual por design decision spec §11)
- Notifications via WhatsApp / SMS
- Reglas custom per-tenant para mapping deal stage → case kind (V1.2 si emerge)
- Soporte para deal pipelines no-default

## Detailed Spec

Ver `GREENHOUSE_CLIENT_LIFECYCLE_V1.md` §11 para detalle. Patrón replica TASK-706/813 webhook handler.

Subscription canónica (extracto webhooks-hsmeta.json):

```json
{
  "subscriptions": [
    {"object": "deal", "events": ["object.creation"]},
    {"object": "deal", "events": ["object.propertyChange"], "properties": ["dealstage", "closedate"]}
  ]
}
```

Handler signature flow:

```ts
export async function handleHubspotDealsWebhook(req: Request, body: string) {
  const signature = req.headers.get('x-hubspot-signature-v3')
  const timestamp = req.headers.get('x-hubspot-request-timestamp')
  const valid = await validateHubspotSignatureV3({signature, timestamp, body, secret: HUBSPOT_APP_CLIENT_SECRET})
  if (!valid) throw new SignatureValidationError()

  const events = JSON.parse(body) as HubspotEvent[]
  const flagEnabled = await isFeatureFlagEnabled('client_lifecycle_hubspot_auto_trigger')

  for (const event of events) {
    if (event.subscriptionType === 'deal.propertyChange' && event.propertyName === 'dealstage') {
      const deal = await fetchDealWithAssociations(event.objectId)
      const orgId = await lookupOrganizationFromHubspotDeal(deal.id)
      if (!orgId) {
        await publishOutboxEvent('client.lifecycle.hubspot_trigger.organization_unresolved', {...})
        continue
      }

      if (event.propertyValue === 'closedwon' && flagEnabled) {
        const result = await provisionClientLifecycle({
          organizationId: orgId,
          caseKind: 'onboarding',
          triggerSource: 'hubspot_deal',
          // status='draft' implícito por triggerSource='hubspot_deal' (NO activar)
          ...
        })
        await notifyComercialTeamDraftCaseCreated(result.caseId, orgId, 'onboarding')
      }
      // ... idem closedlost
    }
  }
}
```

## Acceptance Criteria

- [ ] Migration crea `webhook_endpoints` row + flag default OFF
- [ ] HubSpot App subscriptions actualizadas vía `hs project upload` (build documentado en runbook)
- [ ] Handler valida signature v3 (rechaza bad HMAC, expired timestamp)
- [ ] Inbox dedupe por `event_id` previene re-process
- [ ] Lookup organization funciona con/sin company asociada en HubSpot
- [ ] `closedwon` → draft onboarding case + notification dispatched
- [ ] `closedlost` → draft offboarding case + notification dispatched
- [ ] Si org no encontrada → outbox `organization_unresolved` v1 (operador comercial resuelve)
- [ ] Feature flag OFF: handler valida pero NO crea case (logs intent only)
- [ ] Banner UI muestra cuando draft case `triggerSource='hubspot_deal'` existe
- [ ] Reliability signal `draft_pending_overdue` reporta count (steady=0)
- [ ] Tests cubren 6 casos (signature, timestamp, dedup, happy-path × 2, flag OFF)
- [ ] Smoke en staging: rotar deal stage en HubSpot tenant test → verificar case draft creado en < 30s
- [ ] Notifications tono cálido es-CL (skill `greenhouse-ux-writing` validó)
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test src/lib/webhooks/handlers/hubspot-deals` verde

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/webhooks/handlers/hubspot-deals`
- Smoke en staging: HubSpot test deal → cambiar stage a `closedwon` → verificar `webhook_inbox_events` row + case draft + notification recibida
- `pnpm staging:request /admin/operations` → verificar signal `client.lifecycle.hubspot_trigger.draft_pending_overdue` visible

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta (`to-do/` → `in-progress/` → `complete/`)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con plan de staged rollout
- [ ] `changelog.md` actualizado
- [ ] Chequeo cruzado: V1.0 del módulo Client Lifecycle cerrado
- [ ] HubSpot App build version + commit hash documentado en spec
- [ ] Flag rollout staged ejecutado (al menos Fase 1 efeonce_internal)
- [ ] Notification canal documentado (Teams channel ID o email destinatarios)

## Follow-ups

- V1.1: Bidireccional HubSpot — escribir `greenhouse_lifecycle_case_status` a HubSpot deal cuando case avanza
- V1.1: Notion archive automation cuando offboarding completed
- V1.2: Reglas custom per-tenant para mapping deal stage → case kind
- TASK-716 Notification Hub integration cuando esté listo
- Métricas de adopción: % de cases creados por HubSpot trigger vs manual

## Open Questions

- ¿La notificación al equipo comercial va a un Teams channel único, o per-tenant routing? Recomendación V1.0: channel único `EO Team` (existente, TASK-716 trabaja routing); V1.1 routing per-tenant.
- ¿Detectar churn solo via `deal.closedlost` o también via `company.lifecyclestage=churned`? Recomendación: AMBOS (deal es señal accionable + company es respaldo); dedupe via UNIQUE partial active per kind ya cubre.
- ¿Hay deal pipelines no-default a considerar? Verificar con sales: si tenant Globe X usa pipeline custom, el `dealstage` value puede no ser `closedwon` literal. Mapping table podría ser V1.1.
- ¿Auto-create de organization si HubSpot company existe pero clients.hubspot_company_id no? Recomendación: NO V1.0 (operador resuelve); evita race con TASK-706 sync.
