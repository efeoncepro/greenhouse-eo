# TASK-572 — Deploy `POST /deals` en el Cloud Run `hubspot-greenhouse-integration`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `—`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `integrations / crm`
- Blocked by: `none` (TASK-539 y TASK-571 ya cerrados)
- Branch: `task/TASK-572-hubspot-integration-post-deals-deploy` (en el repo hermano `hubspot-greenhouse-integration`)
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Desplegar realmente el endpoint `POST /deals` en el Cloud Run hermano `hubspot-greenhouse-integration`. Hoy el servicio responde 404 y Greenhouse registra cada intento como `endpoint_not_deployed`, de modo que el flujo inline del Quote Builder nunca llega a escribir el deal en HubSpot. Esta task cierra ese gap de infra para que la promesa de TASK-539 (eliminar el context-switch a HubSpot) termine de materializarse end-to-end.

## Why This Task Exists

- `TASK-539` entregó comando, endpoint y drawer en `greenhouse-eo` asumiendo que el Cloud Run hermano desplegaría la ruta `/deals`. El deploy nunca aterrizó y quedó declarado como follow-up #1 en `docs/documentation/finance/crear-deal-desde-quote-builder.md`.
- `TASK-571` robusteció la capa local (registry de pipelines/stages, validación fuerte, optimistic update sin hardcode). El feedback operativo 2026-04-22 fue inmediato: el drawer ya no falla, pero al submit aparece el toast “La integración HubSpot /deals aún no está disponible. El intento quedó registrado.” — síntoma directo del 404 del Cloud Run.
- Todos los intentos quedan acumulándose en `greenhouse_commercial.deal_create_attempts` con `status='endpoint_not_deployed'`. Sirve como red de seguridad, no como experiencia operativa.
- Desbloquear esto convierte a Greenhouse en source operativo real de creación de deals (no solo de intento), y habilita la Fase F del programa Commercial Party Lifecycle sin seguir forzando a operaciones a crear deals a mano en HubSpot.

## Goal

- `POST https://hubspot-greenhouse-integration-…run.app/deals` responde 200/201 con `{ status: 'created', hubspotDealId, pipelineUsed, stageUsed, ownerUsed }` a partir del contrato que hoy emite `createHubSpotGreenhouseDeal` en `src/lib/integrations/hubspot-greenhouse-service.ts`.
- Greenhouse, sin cambios de cliente, pasa de registrar `endpoint_not_deployed` a `completed` y el mirror queda escrito en `greenhouse_commercial.deals` con pipeline/stage/owner reales.
- La integración respeta `idempotencyKey` y devuelve el mismo `hubspotDealId` en caso de retry — nunca duplica deals en HubSpot.
- Los `deal_create_attempts` previos con `status='endpoint_not_deployed'` tienen un camino documentado para ser replayeados (manual o vía worker — el scope del worker puede quedar como follow-up si se prefiere).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` (contrato del repo hermano)

Reglas obligatorias:

- El servicio Cloud Run sigue siendo owner de toda llamada outbound a HubSpot Deals API. Greenhouse NO debe adquirir un cliente directo a HubSpot como workaround.
- El contrato `POST /deals` debe ser compatible con `HubSpotGreenhouseCreateDealRequest` / `HubSpotGreenhouseCreateDealResponse` — cambiar el contrato en el repo hermano obliga a cambiar el cliente en este repo y revalidar tipos.
- El endpoint debe honrar `idempotencyKey` (header o body) para que retries con la misma key devuelvan el deal ya creado sin llamar a HubSpot dos veces.
- Auth: header `x-greenhouse-integration-key` + Bearer token (patrón existente de `/invoices`, `/products/:id`).
- Errores esperados del servicio → códigos propios, nunca exponer excepciones crudas del SDK HubSpot.
- La capability `commercial.deal.create` sigue enforzándose en Greenhouse. El Cloud Run confía en que el caller ya validó.

## Normative Docs

- `docs/tasks/complete/TASK-539-inline-deal-creation-quote-builder.md`
- `docs/tasks/complete/TASK-571-deal-creation-context-pipeline-stage-governance.md`
- `docs/documentation/finance/crear-deal-desde-quote-builder.md` (v1.1 — ownership HubSpot ↔ Greenhouse)

## Dependencies & Impact

### Depends on

- Repo hermano `hubspot-greenhouse-integration` con acceso de deploy a Cloud Run (`us-east4` o lo que use hoy `hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app` [verificar]).
- HubSpot Private App / API key con permisos `crm.objects.deals.write` + `crm.objects.companies.read` + `crm.associations.write`.
- `greenhouse_commercial.hubspot_deal_pipeline_config` y `hubspot_deal_pipeline_defaults` — ya live en Greenhouse, útiles para reconciliar luego del primer deploy.

### Blocks / Impacts

- Desbloquea la experiencia real del “Crear deal nuevo” en Quote Builder — hoy es una carta de intención.
- Destraba TASK-541 (quote-to-cash atómico) en la medida en que dependa de que los deals existan efectivamente en HubSpot.
- Hace accionable el follow-up #5 de TASK-539 (UI de retry para intentos `endpoint_not_deployed`).
- Reduce la superficie de errores “fantasmas” en producción — cada deal intentado hoy queda como intento fallido silencioso.

### Files owned

(en el repo hermano, no en `greenhouse-eo`)

- `src/routes/deals.ts` o equivalente idiomático del servicio [verificar]
- `src/clients/hubspot.ts` (extensión del client existente) [verificar]
- `src/schemas/deal.ts` (validación de request) [verificar]
- Tests correspondientes del servicio
- Infra: `cloudbuild.yaml` / `deploy.sh` si hace falta tocarlos [verificar]

En este repo (`greenhouse-eo`) la task NO modifica código, solo:

- Cierra el follow-up en `docs/documentation/finance/crear-deal-desde-quote-builder.md`
- Actualiza `Handoff.md` y `changelog.md` con la fecha de go-live

## Current Repo State

### Already exists

- Cliente `createHubSpotGreenhouseDeal` en `src/lib/integrations/hubspot-greenhouse-service.ts:900-932` — request + response contract, auth, timeout, graceful 404.
- Comando `createDealFromQuoteContext` integrando pipeline/stage/owner resueltos (`src/lib/commercial/party/commands/create-deal-from-quote-context.ts`).
- Drawer + optimistic update alimentándose de `pipelineUsed/stageUsed/...` cuando el backend responde con valores reales.
- Tabla `greenhouse_commercial.deal_create_attempts` con 6 estados, `idempotency_key` único, `attempt_id` como fallback de idempotencia al llamar al Cloud Run.

### Gap

- El Cloud Run hermano devuelve 404 en `POST /deals` — NO existe ruta deployada hoy.
- No hay worker automático que procese los intentos marcados `endpoint_not_deployed` cuando el endpoint aterrice (follow-up declarado; esta task puede dejarlo como manual en el primer release).
- No hay panel operativo para ver la cola de intentos `endpoint_not_deployed` / `failed` acumulados hoy.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Endpoint `POST /deals` en el repo hermano

- Implementar route handler en `hubspot-greenhouse-integration` con validación de request contra `HubSpotGreenhouseCreateDealRequest`.
- Auth: reutilizar middleware existente (`x-greenhouse-integration-key` + Bearer).
- Mapear payload → HubSpot Deals API (`POST /crm/v3/objects/deals`):
  - `dealname`, `amount`, `currency`, `pipeline`, `dealstage`, `hubspot_owner_id`, `closedate`
  - `business_line_code` y `gh_deal_origin` como custom properties (si ya existen; si no, crear gh_deal_origin en el portal como parte del deploy).
- Asociar el deal a la `hubspotCompanyId` recibido (Associations v4).
- Si viene `hubspotContactId`, asociarlo también.

### Slice 2 — Idempotencia + manejo de errores

- `idempotencyKey` debe persistirse en el servicio (tabla/KV) o mapearse a una custom property HubSpot (`gh_idempotency_key`) para poder detectar retries.
- Retries con la misma key retornan el deal ya creado sin volver a llamar HubSpot.
- Errores del SDK HubSpot se mapean a códigos estables: `HUBSPOT_AUTH`, `HUBSPOT_RATE_LIMIT`, `HUBSPOT_VALIDATION`, `HUBSPOT_UPSTREAM`. Nunca exponer el stack raw.
- Timeouts honoran el budget del caller (Greenhouse manda `AbortSignal.timeout(4s)`; el servicio debería terminar antes de 3.5s o devolver un código de retry explícito).

### Slice 3 — Echo de `pipelineUsed` / `stageUsed` / `ownerUsed`

- La respuesta debe devolver el pipeline y stage que HubSpot efectivamente aceptó (puede diferir si el portal renombró o reclasificó).
- Incluir `ownerUsed` como hubspot user id final (útil para que Greenhouse persista `deal_owner_hubspot_user_id` sin adivinar).

### Slice 4 — Deploy + smoke

- Deploy Cloud Run con variables de entorno actuales (`HUBSPOT_API_TOKEN`, `GREENHOUSE_INTEGRATION_API_TOKEN`, …).
- Verificar que `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL` en Vercel staging sigue apuntando al servicio correcto.
- Smoke manual desde staging: abrir Quote Builder, crear deal en un sandbox HubSpot, validar el row en `greenhouse_commercial.deals` y la URL del deal en HubSpot.

### Slice 5 — Cierre operativo de intentos históricos

- Query en `greenhouse_commercial.deal_create_attempts` que liste los `status='endpoint_not_deployed'` acumulados pre-deploy.
- Decidir replay manual vía SQL + llamada controlada a `createDealFromQuoteContext` con el mismo `idempotency_key`, o dejarlos como histórico sin replay.
- Documentar la decisión en `Handoff.md` al cerrar.

### Slice 6 — Documentación + follow-ups

- Actualizar `docs/documentation/finance/crear-deal-desde-quote-builder.md` marcando el follow-up #1 como cerrado.
- Registrar en `changelog.md` la fecha de go-live.
- Si queda un worker automático de replay pendiente, extraerlo a una task hija explícita (propuesta: `TASK-###-deal-create-attempts-replay-worker`).

## Out of Scope

- Editar deals existentes desde Greenhouse (sigue siendo HubSpot → Greenhouse via sync).
- Crear pipelines o stages en HubSpot desde Greenhouse.
- Reescribir el cliente `createHubSpotGreenhouseDeal` (el contrato ya calza; esta task solo levanta el servidor).
- UI de reintentos manuales para `endpoint_not_deployed` / `failed` — sigue siendo follow-up #5 de TASK-539.
- Asociación automática del `hubspotContactId` derivada del contacto seleccionado en la quote (sigue siendo follow-up independiente).

## Detailed Spec

### Contrato de request (ya vigente en Greenhouse)

```ts
interface HubSpotGreenhouseCreateDealRequest {
  idempotencyKey: string
  hubspotCompanyId: string
  dealName: string
  amount?: number | null
  currency?: string | null
  pipelineId?: string | null
  stageId?: string | null
  ownerHubspotUserId?: string | null
  closeDate?: string | null
  businessLineCode?: string | null
  origin: 'greenhouse_quote_builder'
  correlationId?: string
  hubspotContactId?: string | null
}
```

### Contrato de response esperado

```ts
interface HubSpotGreenhouseCreateDealResponse {
  status: 'created' | 'endpoint_not_deployed'
  hubspotDealId: string | null
  pipelineUsed?: string | null
  stageUsed?: string | null
  ownerUsed?: string | null
  message?: string
}
```

- En el happy path: `status='created'`, `hubspotDealId` requerido, `pipelineUsed/stageUsed/ownerUsed` con los valores definitivos.
- Ante auth invalida → 401 con `{ code: 'HUBSPOT_AUTH' }`.
- Ante pipeline/stage invalidos para HubSpot → 422 con `{ code: 'HUBSPOT_VALIDATION', details }`. Greenhouse mapeará esto a `DealCreateSelectionInvalidError` en un follow-up si hace falta.
- Ante rate limit de HubSpot → 429 con `Retry-After`.

### Asociaciones HubSpot

- Deal ↔ Company: obligatoria. Usar Associations v4 (`deal_to_company`).
- Deal ↔ Contact: opcional. Solo si `hubspotContactId` viene en el request.

### Custom properties requeridas en el portal

- `gh_deal_origin` (string): valor `'greenhouse_quote_builder'` en cada deal creado. Si aún no existe en el portal, crearla como parte del deploy.
- `gh_idempotency_key` (string, opcional): para detectar retries sin tabla externa [verificar viabilidad].

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `POST /deals` responde 200/201 con el response shape declarado en HubSpot sandbox y production.
- [ ] Deals creados quedan asociados a la `hubspotCompanyId` enviada.
- [ ] Retries con el mismo `idempotencyKey` devuelven el mismo `hubspotDealId` sin crear duplicados.
- [ ] `pipelineUsed`, `stageUsed` y `ownerUsed` vienen pobladas y matchean con lo que HubSpot efectivamente guardó.
- [ ] Greenhouse Quote Builder crea un deal end-to-end en staging contra HubSpot sandbox sin toast de warning.
- [ ] `greenhouse_commercial.deals` refleja el deal nuevo con `pipeline_name`, `dealstage_label` y `deal_owner_hubspot_user_id` correctos.
- [ ] `greenhouse_commercial.deal_create_attempts.status` pasa a `completed` para nuevos intentos.
- [ ] La documentación `crear-deal-desde-quote-builder.md` deja el follow-up #1 cerrado y marca la fecha de go-live.

## Verification

- Smoke manual: `pnpm staging:request POST /api/commercial/organizations/<id>/deals '{ "dealName":"Smoke TASK-572","pipelineId":"…","stageId":"…" }'` retorna `status='completed'` y `hubspotDealId` no nulo.
- Validación visual en HubSpot sandbox del deal creado, pipeline, stage, owner y asociación con company.
- Validación en Greenhouse del row en `greenhouse_commercial.deals`.
- Retry del mismo request con identico `idempotencyKey` → debe devolver el mismo `hubspotDealId` y no crear un segundo deal.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] El archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre.
- [ ] `Handoff.md` documenta el go-live, el replay decidido para intentos históricos y cualquier residuo.
- [ ] `changelog.md` anota la fecha y el efecto operativo.
- [ ] Se ejecutó chequeo de impacto cruzado sobre `TASK-539`, `TASK-571`, y `TASK-564`.
- [ ] Documentado si sale follow-up de worker automático de replay como task hija.

## Follow-ups

- Worker reactivo que procese `deal_create_attempts.status='endpoint_not_deployed'` cuando cambian a replayable.
- Admin Center surface para listar `deal_create_attempts` en `failed` / `endpoint_not_deployed` con botón de retry manual.
- Asociación automática del `hubspotContactId` derivada del contacto seleccionado en la quote.
- Mapear errores `HUBSPOT_VALIDATION` (422) del Cloud Run a `DealCreateSelectionInvalidError` en Greenhouse para feedback UI preciso.

## Open Questions

- ¿Idempotencia via custom property HubSpot (`gh_idempotency_key`) o via KV/tabla interna del servicio? Ambos sirven; la decisión pide weighting entre ops simplicity y cost/quota de HubSpot.
- ¿El deploy incluye la creación de `gh_deal_origin` en production portal o eso ya fue cubierto por TASK-563 u otra task de props? [verificar]
- ¿Vamos a replayar los intentos históricos `endpoint_not_deployed` (pueden estar stale) o quedan como cementerio auditivo?
