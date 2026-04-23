# TASK-573 — Quote Builder Deal Birth Contract Completion & HubSpot Governance Hardening

## Delta 2026-04-22 — Closure

- Se aplicó la migración `20260423010123303_task-573-deal-birth-contract-completion.sql` para persistir `contact_identity_profile_id`, `hubspot_contact_id`, `deal_type` y `priority` en el create path, además de `hubspot_deal_property_config` como mirror local de property options HubSpot.
- `createDealFromQuoteContext` ahora resuelve owner desde el actor/policy, contacto desde `quotation.contact_identity_profile_id -> person_360`, y bloquea create cuando la governance está incompleta o falta mapping obligatorio.
- `GET /deal-creation-context` expone `readyToCreate`, `blockingIssues`, `dealTypeOptions`, `priorityOptions` y bloquea create desde UI cuando falta `hubspot_company_id`.
- `CreateDealDrawer` muestra el contexto real de asociaciones esperadas, expone `dealType` + `priority`, y evita que el usuario descubra el problema recién al submit.
- Se agregó la lane admin-safe `GET/POST /api/admin/commercial/deal-governance` para summary + refresh de metadata HubSpot.
- `TASK-564` queda **re-scopeada**, no absorbida por completo: el gating duro ya quedó resuelto aquí; el único scope residual es una eventual remediación inline para vincular orgs legacy a una Company HubSpot.

## Delta 2026-04-22 — Discovery correction after audit

- `docs/architecture/schema-snapshot-baseline.sql` **no** es suficiente como DDL source para este flujo: está atrasado respecto a `TASK-453`, `TASK-539`, `TASK-571` y `TASK-486`. Para esta task, el DDL real de referencia vive en migraciones + runtime actual.
- El bridge más confiable hoy para resolver owner HubSpot desde Greenhouse no está en un resolver user-side listo sobre `identity_profile_source_links`; la pista runtime materializada está principalmente en `greenhouse_core.members.hubspot_owner_id` y readers derivados (`people`, `person_360`).
- `hubspot-greenhouse-integration` ya soporta `hubspotContactId` en `POST /deals`, pero **no** expone todavía metadata endpoints ni contrato extendido para `dealType` / `priority`. Cualquier slice que dependa de esas opciones debe ampliar primero el contrato upstream o declarar fallback explícito y auditado.
- El repo hermano observado localmente durante Discovery es `../hubspot-bigquery-task-563/`; si en la CLI operativa el path real difiere, se debe verificar antes de implementar el slice upstream.
- `deal_type` existe en el mirror comercial, pero el inbound runtime aún lo deja nulo en varios paths; `priority` no existe hoy ni en mirror ni en create path.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Implementado 2026-04-22`
- Rank: `TBD`
- Domain: `crm + finance + integrations + ui`
- Blocked by: `none`
- Branch: `task/TASK-573-quote-builder-deal-birth-contract-completion`
- Legacy ID: `—`
- GitHub Issue: `[optional]`

## Summary

Completar el contrato real de “nacimiento” de deals desde el Quote Builder para que un deal nuevo no nazca con stage avanzada por heurística, sin owner, sin contacto, sin tipo de negocio y sin prioridad. La task endurece el create path end-to-end, formaliza el mirror/governance de metadata HubSpot y agrega surface operativa/admin suficiente para mantenerlo sano sin SQL manual ni fixes ad hoc.

## Why This Task Exists

`TASK-539`, `TASK-571` y `TASK-572` cerraron la primera versión del flujo, pero la validación operativa real destapó que el contrato todavía está incompleto:

1. El create funciona técnicamente, pero puede caer en una etapa avanzada por fallback (`first_open_stage`) cuando el registry local no está bien gobernado.
2. El drawer y el command no resuelven owner desde el actor actual aunque Greenhouse ya modela `hubspot_owner_id` para miembros/usuarios internos.
3. La quote sí guarda `contactIdentityProfileId`, pero el flujo de create no lo traduce a `hubspotContactId`, así que el deal nace sin contacto asociado.
4. `dealType` existe aguas abajo en readers/mirrors, pero no forma parte del contrato inline de creación; `priority` ni siquiera existe en el contrato actual.
5. Los labels, órdenes y defaults de pipeline/stage siguen dependiendo en parte del bootstrap observacional desde deals históricos, no de metadata real de HubSpot.
6. La remediación de orgs locales sin `hubspot_company_id` quedó abierta como gap específico en `TASK-564`; operativamente es parte del mismo problema de create-deal robusto y debe converger en una sola lane.

El resultado actual es un create “demasiado desnudo”: funciona, pero no nace con el contexto comercial mínimo que el negocio espera y no escala sanamente a múltiples pipelines, owners, contactos ni defaults por tenant/business line.

## Goal

- Hacer que todo deal nacido desde Greenhouse salga con `pipeline + stage + owner + contact + dealType + priority` resueltos canónicamente o falle con un error explícito de governance incompleta.
- Separar con claridad `metadata mirror` de HubSpot y `governance defaults` de Greenhouse.
- Eliminar fallbacks inseguros que hoy permiten crear deals en etapas avanzadas o sin metadata suficiente.
- Absorber el gating/link fallback de `TASK-564` dentro del mismo contrato de create para que el flujo completo sea coherente.
- Dejar surface operativa/admin suficiente para refrescar metadata, gobernar defaults y diagnosticar drift sin depender de SQL manual ni memoria tribal.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

Reglas obligatorias:

- HubSpot sigue siendo source of truth de pipelines, stages y options reales de propiedades de deals; Greenhouse gobierna defaults operativos, orden visible, enablement y validación tenant-safe.
- `createDealFromQuoteContext` sigue siendo el único write path legal para deals nacidos en Greenhouse.
- Toda query o lookup de este flujo debe seguir tenant isolation y respetar los anchors canónicos (`organization_id`, `quotation_id`, `space_id` cuando aplique).
- No usar `first_open_stage` ni heurísticas equivalentes cuando haya múltiples pipelines o governance incompleta. Si no existe un `entry stage` válido, el create debe bloquearse.
- Owner debe resolverse por cascada explícita: override del caller → actor Greenhouse con bridge a HubSpot owner → policy tenant/business line/global → error o null explícito según policy. Nunca por accidente silencioso.
- El bridge actor Greenhouse → owner HubSpot debe partir del runtime real disponible (`members.hubspot_owner_id` / readers derivados) y no asumir un resolver user-side ya materializado sobre `identity_profile_source_links`.
- Contacto debe resolverse desde la quote (`quotationId -> contactIdentityProfileId -> hubspotContactId`) o fallar con error accionable si la quote exige contacto HubSpot y no existe mapping.
- No introducir clientes directos a HubSpot desde Greenhouse como workaround. Toda llamada outbound de deals sigue pasando por `hubspot-greenhouse-integration`.
- Reutilizar `query`, `getDb`, `withTransaction` y el stack actual del repo; no crear pools ni clients fuera del contrato existente.
- `dealType` y `priority` no pueden “inventarse” localmente si HubSpot no ofrece metadata verificable. Discovery confirmó que esa metadata **no** está expuesta aún por el contrato upstream actual; por tanto, esta task debe ampliar primero ese contrato o dejar un fallback explícito y auditado antes de persistir esos campos.

## Normative Docs

- `docs/tasks/complete/TASK-539-inline-deal-creation-quote-builder.md`
- `docs/tasks/complete/TASK-571-deal-creation-context-pipeline-stage-governance.md`
- `docs/tasks/complete/TASK-572-hubspot-integration-post-deals-deploy.md`
- `docs/tasks/to-do/TASK-564-quote-builder-deal-creation-hubspot-link-gating.md`
- `docs/documentation/finance/crear-deal-desde-quote-builder.md`

## Dependencies & Impact

### Depends on

- `src/lib/commercial/deals-store.ts`
- `src/lib/commercial/party/commands/create-deal-from-quote-context.ts`
- `src/lib/commercial/party/commands/create-deal-types.ts`
- `src/app/api/commercial/organizations/[id]/deals/route.ts`
- `src/app/api/commercial/organizations/[id]/deal-creation-context/route.ts`
- `src/views/greenhouse/finance/workspace/CreateDealDrawer.tsx`
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx`
- `src/hooks/useCreateDeal.ts`
- `src/hooks/useDealCreationContext.ts`
- `src/lib/integrations/hubspot-greenhouse-service.ts`
- `src/lib/finance/quotation-canonical-store.ts`
- `src/lib/person-360/get-person-profile.ts`
- `src/lib/account-360/sync-organization-hubspot-contacts.ts`
- `migrations/20260418224710163_task-453-commercial-deals-canonical-bridge.sql`
- `migrations/20260421143050333_task-539-deal-create-attempts.sql`
- `migrations/20260422141406517_task-571-deal-creation-context-governance.sql`
- `[verificar path real] ../hubspot-bigquery-task-563/services/hubspot_greenhouse_integration/app.py`
- `[verificar path real] ../hubspot-bigquery-task-563/services/hubspot_greenhouse_integration/hubspot_client.py`
- `[verificar] hubspot-bigquery/tests/test_hubspot_greenhouse_integration_app.py`

### Blocks / Impacts

- Absorbe funcionalmente el scope narrow de `TASK-564`; ese task no debería implementarse en paralelo sin re-scope explícito.
- Impacta el Quote Builder, el mirror `greenhouse_commercial.deals`, el contrato del Cloud Run `POST /deals`, la gobernanza comercial y la documentación funcional del flujo.
- Cierra follow-ups declarados en `TASK-539`, `TASK-571` y `docs/documentation/finance/crear-deal-desde-quote-builder.md`.
- Puede abrir tasks hijas si el volumen final obliga a separar replay worker, admin UI avanzada o metadata endpoints nuevos en el repo hermano.

### Files owned

- `src/lib/commercial/deals-store.ts`
- `src/lib/commercial/party/commands/create-deal-from-quote-context.ts`
- `src/lib/commercial/party/commands/create-deal-types.ts`
- `src/lib/commercial/deal-events.ts`
- `src/lib/integrations/hubspot-greenhouse-service.ts`
- `src/lib/finance/quotation-canonical-store.ts`
- `src/lib/person-360/get-person-profile.ts`
- `src/app/api/commercial/organizations/[id]/deals/route.ts`
- `src/app/api/commercial/organizations/[id]/deal-creation-context/route.ts`
- `src/views/greenhouse/finance/workspace/CreateDealDrawer.tsx`
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx`
- `src/hooks/useCreateDeal.ts`
- `src/hooks/useDealCreationContext.ts`
- `docs/documentation/finance/crear-deal-desde-quote-builder.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md`
- `[verificar] hubspot-bigquery/services/hubspot_greenhouse_integration/app.py`
- `[verificar] hubspot-bigquery/services/hubspot_greenhouse_integration/hubspot_client.py`

## Current Repo State

### Already exists

- El Quote Builder persiste el anchor canónico de contacto en la quote (`contact_identity_profile_id`) y lo rehidrata al editar:
  - `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx`
  - `src/lib/finance/quotation-canonical-store.ts`
- `person_360` ya expone `hubspot_contact_id`, por lo que existe una vía canónica para traducir persona/contacto local a HubSpot:
  - `src/lib/person-360/get-person-profile.ts`
- El servicio outbound de deals ya soporta `ownerHubspotUserId` y `hubspotContactId` en el contrato TS:
  - `src/lib/integrations/hubspot-greenhouse-service.ts`
- `createDealFromQuoteContext` ya resuelve `pipelineId`, `stageId` y `ownerHubspotUserId`, registra attempts y persiste el deal local:
  - `src/lib/commercial/party/commands/create-deal-from-quote-context.ts`
- `getDealCreationContext` y `CreateDealDrawer` ya existen, pero hoy solo cubren pipeline/stage/owner de forma parcial:
  - `src/lib/commercial/deals-store.ts`
  - `src/views/greenhouse/finance/workspace/CreateDealDrawer.tsx`
- `deal_type` ya existe en readers/mirrors aguas abajo, aunque no participa en el create inline:
  - `src/lib/commercial/deals-store.ts`
  - `src/lib/commercial-intelligence/intelligence-store.ts`
- El bridge runtime más usable para owner HubSpot hoy está materializado en `greenhouse_core.members.hubspot_owner_id` y readers derivados, no en una capa user-side dedicada:
  - `docs/architecture/schema-snapshot-baseline.sql`
  - `src/lib/people/get-person-detail.ts`
- El gap de orgs sin `hubspot_company_id` ya está formalizado como task separada:
  - `docs/tasks/to-do/TASK-564-quote-builder-deal-creation-hubspot-link-gating.md`

### Gap

- El create todavía puede resolver una etapa avanzada por fallback cuando el registry local está mal sembrado o incompleto.
- El flujo no resuelve owner desde el actor actual (`tenant.userId -> hubspot_owner_id`) aunque Greenhouse ya modela ese bridge en otras capas.
- El flujo no traduce `quotationId/contactIdentityProfileId` a `hubspotContactId`, por lo que el deal nace sin contacto aunque la quote sí lo tenga.
- `dealType` no forma parte del contrato de create y `priority` no existe aún como parte del path inline.
- El registry local de pipelines/stages no es una fuente confiable de labels, orden y entry stage porque nace en parte de observación histórica, no de metadata real de HubSpot.
- No existe una surface operativa/admin suficiente para refrescar metadata, gobernar defaults y detectar drift antes de que el drawer empiece a crear deals mal clasificados.
- El snapshot base de schema/documentación no refleja todavía el DDL real de este flujo; cualquier cambio de modelado debe validar contra migraciones y runtime actual, no solo contra `schema-snapshot-baseline.sql`.
- El contrato upstream actual de `hubspot-greenhouse-integration` todavía no expone metadata de pipelines/properties ni soporta `dealType` / `priority`; este task debe tomar ownership de esa expansión o dejar un corte explícito y documentado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — HubSpot metadata mirror + governance split

- Formalizar la separación entre:
  - metadata mirror de HubSpot (pipelines, stages, labels, display order, property options relevantes)
  - governance Greenhouse (pipeline habilitado, entry stage, owner fallback, defaults tenant/business line/global)
- Ampliar el modelo local para que labels y orden ya no dependan de deals históricos observados.
- Definir y materializar el carril canónico de refresh/sync de metadata HubSpot para deals.
- Si el repo hermano necesita exponer metadata endpoints nuevos para pipelines/properties, declararlo y cablearlo aquí o dejar follow-up explícito con files `[verificar]`.

### Slice 2 — Resolución canónica de owner, contact, dealType y priority

- Crear helpers backend reutilizables para resolver:
  - owner desde el actor actual y su bridge a HubSpot owner
  - contacto desde `quotationId -> contactIdentityProfileId -> hubspotContactId`
  - `dealType` y `priority` desde metadata/properties HubSpot + policy Greenhouse
- Documentar y codificar la cascada exacta de precedencia.
- Si falta mapping para owner o contacto, devolver errores explícitos o warnings gobernados; no degradar silenciosamente a “sin propietario” o “sin contacto” cuando el caso requiere uno.

### Slice 3 — Expansión del contrato de create deal

- Extender el contrato de:
  - `useCreateDeal`
  - `POST /api/commercial/organizations/[id]/deals`
  - `CreateDealFromQuoteContextInput`
  - `HubSpotGreenhouseCreateDealRequest/Response`
- Incorporar `hubspotContactId`, `dealType`, `priority` y cualquier campo adicional mínimo requerido para trazabilidad (`ownerSource`, `contactSource`, etc. si aplica).
- Persistir resolución efectiva en:
  - `deal_create_attempts`
  - `greenhouse_commercial.deals`
  - `source_payload` / metadata
  - eventos outbox

### Slice 4 — Hardening del create path

- Eliminar fallbacks inseguros de stage/pipeline cuando haya múltiples opciones o governance incompleta.
- Introducir errores canónicos de governance incompleta / metadata faltante / mapping faltante.
- Asegurar que el upsert local refresque owner, type y priority correctamente incluso ante `ON CONFLICT`.
- Converger el gating/link fallback de `TASK-564` en este flujo para orgs sin `hubspot_company_id`, evitando que el usuario descubra el problema recién al submit.

### Slice 5 — Drawer UI y optimistic update veraces

- `CreateDealDrawer` debe mostrar el contexto real de nacimiento del deal:
  - pipeline
  - etapa inicial
  - owner resuelto
  - contacto que se asociará
  - tipo de negocio
  - prioridad
- Los defaults visibles deben indicar cuándo vienen de policy y cuándo son elegidos por el usuario.
- El optimistic update y el selector de deals deben reflejar el resultado real del backend, no placeholders ni hardcodes.
- Incluir link directo al deal de HubSpot al crear o al menos el `hubspotDealId` en una surface visible para reducir confusión operativa.

### Slice 6 — Surface operativa / admin de governance

- Agregar una surface suficiente para gobernar y auditar:
  - pipelines habilitados para create
  - entry stage por pipeline
  - defaults por tenant / business line / global
  - owner fallback por policy
  - freshness del mirror de metadata
- Si el scope no alcanza para una UI full admin, entregar como mínimo routes/helpers admin-safe + documentación/runbook explícitos. La decisión debe quedar explícita en Discovery.

### Slice 7 — Drift handling, docs y cierre cruzado

- Detectar y exponer drift cuando HubSpot cambie pipelines/stages/properties y Greenhouse quede stale.
- Actualizar arquitectura y documentación funcional para que el contrato final quede explícito.
- Sincronizar `TASK-564` como absorbida o re-scopeada una vez que este task tome ownership de ese problema.

## Out of Scope

- Reemplazar `greenhouse_commercial.deals` por un modelo nuevo paralelo.
- Mover toda la operación comercial a otro dominio o rehacer el Quote Builder fuera de este flujo.
- Editar deals existentes en Greenhouse más allá del nacimiento y el optimistic surfacing inicial.
- Crear métricas inline de forecast o revenue pipeline en este task.
- Resolver aquí un replay worker completo para `deal_create_attempts` históricos salvo que aparezca como dependencia obligatoria del nuevo contrato.

## Detailed Spec

### Contrato objetivo del create

El happy path final debe comportarse así:

1. El usuario abre el drawer y ve metadata real de HubSpot ya espejada/localmente gobernada.
2. El sistema resuelve o solicita explícitamente:
   - `pipelineId`
   - `stageId`
   - `ownerHubspotUserId`
   - `hubspotContactId`
   - `dealType`
   - `priority`
3. `createDealFromQuoteContext` valida coherencia completa antes de llamar al Cloud Run.
4. El Cloud Run crea el deal y responde con los valores efectivos usados.
5. Greenhouse persiste el mirror local con esos mismos valores y los devuelve a UI.

### Cascada mínima de owner

```text
explicit owner selected in UI/request
-> actor current user mapped to hubspot owner
-> tenant/business_line/global governance default
-> explicit null allowed only if policy lo permite
-> otherwise DEAL_CREATE_OWNER_UNRESOLVED
```

### Cascada mínima de contacto

```text
explicit hubspotContactId in request
-> quotationId -> quote.contactIdentityProfileId
-> person_360.crmFacet.hubspotContactId
-> if required and missing: DEAL_CREATE_CONTACT_UNRESOLVED
```

### Invariante de governance

- Si existen múltiples pipelines activos y no hay pipeline default explícito válido, el create debe bloquearse.
- Si el pipeline elegido no tiene `entry stage` explícita ni un único caso inequívoco gobernado, el create debe bloquearse.
- “Bloquear” significa error accionable, no fallback silencioso.

### Integración con TASK-564

- El problema “org sin `hubspot_company_id`” debe resolverse aquí como parte del contrato de create robusto.
- Al cerrar este task:
  - `TASK-564` debe quedar absorbida o re-scopeada
  - no deben coexistir dos implementaciones distintas del gating/link fallback

### DDL / persistencia esperada

El agente debe evaluar en Discovery si basta con ampliar:

- `greenhouse_commercial.hubspot_deal_pipeline_config`
- `greenhouse_commercial.hubspot_deal_pipeline_defaults`
- `greenhouse_commercial.deal_create_attempts`
- `greenhouse_commercial.deals`

o si se necesita una tabla adicional para:

- metadata de property options (`deal_type`, `priority`)
- freshness / sync state del mirror HubSpot

Si se crea tabla nueva, debe quedar explícita la razón de no reutilizar las existentes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Un deal creado desde una quote con contacto seleccionado queda asociado al `hubspotContactId` correspondiente o falla con error explícito y accionable.
- [x] Un usuario Greenhouse con mapping válido a HubSpot owner crea deals asignados a su owner HubSpot por default cuando no selecciona otro owner.
- [x] Greenhouse ya no crea deals en una etapa avanzada por fallback inseguro; si la governance está incompleta, el create se bloquea.
- [x] `dealType` y `priority` forman parte del contrato inline de create o quedan explícitamente gobernados con fallback documentado y verificado.
- [x] El drawer y el optimistic update muestran pipeline/stage/owner/contact/type/priority reales, no placeholders ni labels contaminados.
- [x] Existe un carril explícito para refrescar metadata HubSpot y detectar drift antes de que el create use información stale.
- [x] El scope funcional de `TASK-564` quedó absorbido o re-scopeado sin duplicar implementación.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec vitest run src/lib/commercial/__tests__/deal-creation-context.test.ts src/lib/commercial/party/commands/__tests__/create-deal-from-quote-context.test.ts`
- `pnpm build`
- `pnpm pg:connect:migrate` (aplica migración + regenera `src/types/db.d.ts`)
- `rg "new Pool\\(" src` → solo `src/lib/postgres/client.ts`

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] `docs/documentation/finance/crear-deal-desde-quote-builder.md` quedo alineado al contrato final
- [x] `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` y `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` quedaron alineados
- [x] `TASK-564` quedo absorbida, bloqueada o re-scopeada de manera explícita

## Follow-ups

- Replay/worker para `deal_create_attempts` históricos si el nuevo contrato lo vuelve necesario.
- Admin UI avanzada si el cierre de este task entrega solo helpers/routes operativas y no una surface completa.
- Cualquier endpoint nuevo en el repo hermano para metadata de deals si no entra sanamente en este task.

## Open Questions

- `[verificar]` Nombre y contrato exacto de las properties HubSpot para `deal type` y `priority` en el portal target.
- `[verificar]` Si el bridge de owner debe resolverse contra `team_members.hubspot_owner_id`, otra projection local, o una metadata live del repo hermano.
- `[verificar]` Si la surface operativa mínima debe vivir en Admin Center o si basta con route + runbook en esta iteración.
