# TASK-813 — HubSpot Services (p_services 0-162) Sync + Legacy Cleanup

## Delta 2026-05-06 (v3 — audit corregido + ajustes verificados)

Mi audit inicial fue incorrecto y llevó a un Delta v2 apresurado que aceptó críticas sin verificar. Tras consultar las 3 tablas relevantes (`core.clients`, `core.organizations`, `core.spaces`), la realidad operacional es:

**Universo HubSpot p_services (0-162)**: 16 services activos.

**Clasificación real por bloqueante**:

| Cliente | Services HubSpot | clients | organizations | spaces | Estado materialización |
| --- | --- | --- | --- | --- | --- |
| ANAM | 2 | ✅ | ✅ | ✅ | Direct |
| BeFUN | 1 | ✅ | ✅ | ✅ | Direct |
| Corp Aldea | 1 | ✅ | ✅ | ✅ | Direct |
| DDSoft | 1 | ✅ | ✅ | ✅ | Direct |
| Ecoriles | 1 | ✅ | ✅ | ✅ | Direct |
| Gobierno RM | 1 | ✅ | ✅ | ✅ | Direct |
| Mun PAC | 1 | ✅ | ✅ | ✅ | Direct |
| Sky Airline | 2 | ✅ | ✅ | ✅ | Direct |
| SSilva | 3 | ✅ | ✅ | ✅ | Direct |
| **Aguas Andinas** | 1 | ✅ | ✅ | ❌ | Bloqueado por space |
| **Motogas SpA** | 1 | ✅ | ✅ | ❌ | Bloqueado por space |
| **Loyal** | 1 | ❌ | ❌ | ❌ | Huérfano real |

**Resumen**: 13 materializables direct, 2 bloqueados por falta de space (fix automatizable), 1 huérfano real.

**Errores de mi audit inicial**:

- Solo consulté `organizations` + `crm.companies`. NO consulté `core.clients` (15 rows). Resultado: reporté 3 huérfanos cuando solo había 1.
- `service-sync.ts:resolveSpaceForCompany` actual joinea via `organizations` solamente. Falla silencioso cuando organization existe pero space no (caso Aguas Andinas + Motogas).

**Ajustes aplicados**:

1. **Diagnóstico corregido**: 1 huérfano real (Loyal). Spec original decía "3 huérfanos (Loyal, Motogas, Aguas Andinas)" — Motogas y Aguas Andinas NO son huérfanos, son clientes con space faltante.

2. **Slice 3 ampliado**: el backfill ahora **crea spaces faltantes automáticamente** para clients con HubSpot link sin space. Pattern: `space_id='space-<client_id>'`, `name=<client_name>`, FK a client + organization. Esto materializa 15/16 services. Loyal (1 huérfano real) queda en queue manual.

3. **Slice 4 — write-back limitado**: hard rule adicional explícita. Greenhouse SOLO escribe `ef_organization_id`, `ef_space_id`, `ef_engagement_kind` a HubSpot 0-162. NUNCA otras propiedades. Cada write-back emite outbox event `commercial.service_engagement.metadata_pushed_v1` con audit. **Write-back default OFF** — opt-in via feature flag `commercial.engagement.metadata_push_enabled`. V1 de la task NO activa write-back; queda preparado.

4. **Mapping unmapped**: si `ef_linea_de_servicio` es NULL, materializar con `hubspot_sync_status='unmapped'` (no inventar default). Downstream consumers filtran por este flag para excluir de P&L hasta resolver. Más robusto que `module_id='unknown'`.

5. **Naming "Bidirectional"**: Codex sugirió cambiar a "Inbound only". Mantengo la palabra eliminada del title (ya no dice bidirectional) pero la task SÍ contempla write-back limitado opt-in. Más honesto.

## Delta 2026-05-06 (post TASK-801 cierre)

Hard dep TASK-801 cerrada en `develop` (migration `20260506200742463_task-801-engagement-primitive-services-extension.sql` aplicada). El column `engagement_kind` ya está disponible con DEFAULT `'regular'` para las 30 filas legacy. Esta task ya puede ejecutarse — Slice 2 (archive script) puede setear `engagement_kind='discovery'` directamente.

Soft dep TASK-555 sigue pendiente. Si se ejecuta antes de TASK-555, las capabilities de TASK-813 (`commercial.service_engagement.{sync,resolve_orphan,archive_legacy}`) viven temporalmente en namespace `finanzas.*` con TODO de migración.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-014`
- Status real: `Diseño aprobado por arch-architect 2026-05-06`
- Rank: `TBD`
- Domain: `commercial`
- Blocked by: `TASK-801, TASK-555 (soft)`
- Branch: `task/TASK-813-hubspot-services-bidirectional-sync-phantom-seed-cleanup`

## Summary

Activar el sync bidireccional entre HubSpot custom object `p_services` (0-162) y `greenhouse_core.services` que hoy NUNCA ha corrido (todas las 30 filas tienen `hubspot_service_id IS NULL` y `hubspot_sync_status='pending'` desde 2026-03-16). Cleanup de las 30 filas fantasma seedeadas como cross-product `service_modules × clients`. Resolver los 3 huérfanos en HubSpot que no tienen organization en Greenhouse (Loyal, Motogas, Aguas Andinas).

## Why This Task Exists

Auditoría 2026-05-06 reveló desconexión total entre HubSpot y Greenhouse en la capa engagement instance:

- **HubSpot**: 16 servicios reales en `0-162`, todos con `ef_organization_id`, `ef_space_id`, `ef_linea_de_servicio`, `ef_servicio_especifico` NULL — el operador comercial nunca los mapeó a categorías Greenhouse.
- **Greenhouse**: 30 filas en `core.services`, todas seedeadas el 2026-03-16 con pattern `svc-<uuid>`, sin `created_by`, sin `hubspot_service_id`, sin `hubspot_deal_id`, sin `hubspot_company_id`. Naming `<module> — <client>` revela origen cross-product `service_modules × clients`.
- **Bridge code existe** (`src/lib/services/service-sync.ts`, `services/hubspot_greenhouse_integration/hubspot_client.py:get_service`) pero NUNCA se invoca: ni cron, ni webhook, ni trigger.
- **Result**: Finance attribution, ICO, P&L y dashboards comerciales operan sobre 30 filas fantasma divorciadas de la realidad operacional. Mientras tanto, los 16 servicios reales pagados por clientes son invisibles para Greenhouse.

User hypothesis original ("Greenhouse mapeó contra deals, no contra services") es parcialmente correcta pero incompleta: Greenhouse no mapeó contra **nada**. Los nombres parecen deals porque cross-product produce labels similares.

## Goal

- 16 servicios reales de HubSpot `0-162` materializados en `greenhouse_core.services` con `hubspot_service_id` poblado y FK válidas a `clients` / `organizations` / `spaces` / `service_modules` cuando posible.
- 30 filas fantasma archivadas (NO borradas — audit-preserved) con `active=FALSE`, `status='legacy_seed_archived'`, `engagement_kind='discovery'` (TASK-801 dependency), `commitment_terms_json={ legacy_seed_origin: '2026-03-16-cross-product' }`.
- Webhook HubSpot inbound para `0-162` activado (mismo patrón TASK-706 hubspot-companies).
- Cron diario safety net (HubSpot pull) en ops-worker como fallback.
- 3 huérfanos HubSpot resueltos: o se crean orgs en Greenhouse, o se archivan en HubSpot. Decisión operacional documentada.
- Reliability signals nuevos: `commercial.service_engagement.sync_lag`, `commercial.service_engagement.organization_unresolved`, `commercial.service_engagement.legacy_residual_reads`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — anchor canónico Servicio = `service_modules.module_id` + `client_service_modules.assignment_id`. `core.services` es engagement instance (extiende, no paraleliza).
- `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` — engagement_kind canónico
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md` — engagement instance es Commercial
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` — patrón inbound TASK-706
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — outbox + reactive consumer pattern
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registry de signals

Reglas obligatorias:

- HubSpot es source of truth para engagement instance. Greenhouse NO escribe a `0-162` directo. Solo back-fillea propiedades `ef_*` como contexto.
- UPSERT canónico por `hubspot_service_id` UNIQUE (constraint ya existe).
- NUNCA borrar las 30 filas fantasma — `archived` flag o `active=FALSE` + `status='legacy_seed_archived'`.
- Webhook signature HubSpot v3 + dedupe por `event_id` (patrón TASK-706).
- Sync sincrono dentro del webhook handler debe ser <5s (HubSpot timeout). Si el sync de 1 service tarda más, mover a outbox + reactive.
- Outbox event `commercial.service_engagement.materialized` v1 emitido en la misma tx que el UPSERT.
- Reliability signals integrados al subsystem `Commercial Health` (TASK-807 lo crea, soft dep — usar fallback si no existe aún).
- `captureWithDomain(err, 'commercial', { extra })` para errores. NUNCA `Sentry.captureException` directo.

## Normative Docs

- `docs/operations/manual-de-uso/comercial/servicios-hubspot.md` — crear (no existe)
- `docs/documentation/comercial/servicios-engagement.md` — crear (no existe)
- `services/hubspot_greenhouse_integration/README.md` — actualizar con webhook setup `p_services`

## Dependencies & Impact

### Depends on

- **TASK-801** (engagement_kind column) — hard dep. El cleanup necesita marcar las 30 fantasma con `engagement_kind='discovery'`.
- **TASK-555** (commercial routeGroup) — soft dep. La capability `commercial.service_engagement.sync` vive en namespace `commercial.*` cuando 555 cierra. Si 555 no está, usar transitional `finanzas.*` con TODO.
- **TASK-706** infrastructure (HubSpot webhook handler) — hard dep, ya existe ✅
- **TASK-771/773** (outbox + reactive consumer) — hard dep, ya existe ✅
- HubSpot bridge service `services/hubspot_greenhouse_integration/` — hard dep, ya existe ✅
- Secret `hubspot-app-client-secret` (signature validation) — ya existe ✅

### Blocks / Impacts

- **TASK-802** (commercial terms time-versioned) — usa `service_id` poblado correctamente
- **TASK-803** (phases + outcomes + lineage) — necesita engagement instances reales, no fantasma
- **TASK-806** (gtm_investment_pnl VIEW) — su reclassifier depende de `attribution_intent`, que cuenta con engagement instance correcto
- **TASK-807** (Commercial Health reliability subsystem) — recibe los 3 nuevos signals
- **TASK-557.1** (legacy quotes cleanup) — patrón sibling, comparte template
- **Finance**: `service_attribution_facts` queda alineada con engagements reales (deja de atribuir costo a fantasmas)
- **client_economics** materializer: P&L per client se vuelve real
- **ICO engine**: si mide engagement-level KPIs, ahora tiene base correcta

### Files owned

- `migrations/<timestamp>_task-813-services-archive-legacy-seed.sql` (nuevo)
- `src/lib/services/service-sync.ts` (modificar: agregar listAllHubSpotServices)
- `src/lib/services/hubspot-services-intake.ts` (nuevo: webhook intake handler)
- `src/lib/webhooks/handlers/hubspot-services.ts` (nuevo)
- `src/app/api/webhooks/hubspot-services/route.ts` (nuevo: alias del genérico)
- `services/ops-worker/server.ts` (modificar: cron handler `/services/sync-from-hubspot`)
- `services/ops-worker/deploy.sh` (modificar: Cloud Scheduler job `ops-services-sync-from-hubspot`)
- `src/lib/reliability/queries/services-sync-lag.ts` (nuevo)
- `src/lib/reliability/queries/services-organization-unresolved.ts` (nuevo)
- `src/lib/reliability/queries/services-legacy-residual-reads.ts` (nuevo)
- `src/lib/reliability/registry.ts` (extender — agregar 3 signals)
- `scripts/services/backfill-from-hubspot.ts` (nuevo: idempotente, dry-run)
- `scripts/services/archive-legacy-seed.ts` (nuevo: idempotente, dry-run)
- `services/hubspot_greenhouse_integration/app.py` (extender: endpoint `/services/sync-by-id`)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (Delta: outbox event nuevo `commercial.service_engagement.materialized` v1)

## Current Repo State

### Already exists

- Tabla `greenhouse_core.services` con UNIQUE `hubspot_service_id`, índices, FK a `service_modules` / `clients` / `spaces` (verificado 2026-05-06).
- Helper `syncServicesForCompany` en `src/lib/services/service-sync.ts:114` con UPSERT canónico (sin caller activo).
- Bridge Python `hubspot_client.py:get_service` + `list_company_service_ids`.
- HubSpot webhook handler genérico `/api/webhooks/[endpointKey]/route.ts` (TASK-706).
- HubSpot signature v3 validator (`src/lib/webhooks/handlers/hubspot-companies.ts` reusable).
- Outbox + reactive consumer infrastructure (TASK-771/773).
- Tabla `webhook_endpoints` para registrar el nuevo endpoint key `hubspot-services`.

### Gap

- **Sync nunca corrió**: 30 rows con `hubspot_sync_status='pending'` desde 2026-03-16, todas con bridge fields NULL.
- **No hay webhook configurado en HubSpot Developer Portal** para `0-162` events.
- **No hay cron Cloud Scheduler** para safety-net pull diario.
- **No hay reliability signals** para el subsystem.
- **3 servicios HubSpot huérfanos** sin org Greenhouse: Loyal, Motogas, Aguas Andinas.
- **30 filas fantasma activas** atribuyendo costo en Finance materializers.
- **Operador HubSpot nunca pobló `ef_*` properties**, así que la materialización inicial requerirá heurística + manual queue para los unresolved.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     (Reservada para el agente que toma la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Execution Spec (Roadmap por slices)

### Slice 1 — Migration: archive flag + outbox event schema (DDL puro)

```sql
-- Up Migration

-- Reliability metadata para 3 nuevos signals (TASK-807 fallback hasta que cierre)
INSERT INTO greenhouse_reliability.signals (signal_key, kind, severity, steady_value, subsystem, description) VALUES
  ('commercial.service_engagement.sync_lag', 'lag', 'warning', 0,
   'commercial_health', 'Servicios HubSpot 0-162 con last_synced_at > 24h o NULL.'),
  ('commercial.service_engagement.organization_unresolved', 'drift', 'error', 0,
   'commercial_health', 'Servicios HubSpot sin organization Greenhouse resoluble por > 7 dias.'),
  ('commercial.service_engagement.legacy_residual_reads', 'drift', 'error', 0,
   'commercial_health', 'Filas legacy_seed_archived todavia leidas por consumers downstream.')
ON CONFLICT (signal_key) DO NOTHING;

-- (no DDL nuevo en core.services — TASK-801 ya agrego engagement_kind y commitment_terms_json)
```

Acceptance: 3 reliability signals registrados, queryable desde `/admin/operations`.

### Slice 2 — Idempotent backfill script: archivar 30 fantasmas

```bash
pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/services/archive-legacy-seed.ts --dry-run
```

Lógica:
1. SELECT services WHERE `service_id LIKE 'svc-________-____-____-____-____________'` AND `hubspot_service_id IS NULL` AND `created_at::date = '2026-03-16'`.
2. Esperado: 30 rows.
3. UPSERT idempotente:
   ```sql
   UPDATE greenhouse_core.services SET
     active = FALSE,
     status = 'legacy_seed_archived',
     engagement_kind = 'discovery',  -- TASK-801 column
     commitment_terms_json = jsonb_build_object(
       'legacy_seed_origin', '2026-03-16-cross-product',
       'archived_by_task', 'TASK-813',
       'archived_at', NOW()::text,
       'rationale', 'Cross-product service_modules x clients seed sin contraparte HubSpot real'
     ),
     updated_at = NOW()
   WHERE service_id = $1 AND status != 'legacy_seed_archived';
   ```
4. Outbox event per row: `commercial.service_engagement.archived_legacy_seed` v1.
5. Reporte counts pre/post + dry-run mode.

Acceptance: 30 rows con `active=FALSE` + `status='legacy_seed_archived'`. Idempotente (segunda ejecución no muta nada).

### Slice 3 — Materialize services from HubSpot (initial backfill)

Script idempotente:
```bash
pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/services/backfill-from-hubspot.ts --dry-run
```

Lógica:
1. Llamar HubSpot bridge `GET /v3/objects/0-162?limit=100&properties=hs_name,ef_*,hs_pipeline_stage` (paginado).
2. Para cada service:
   - Resolver `space_id` via `organizations.hubspot_company_id`.
   - Si no resuelve y `ef_organization_id` está poblado, usar ese.
   - Si no resuelve, mark como `commercial.service_engagement.organization_unresolved` reliability item (no insert; queue manual).
3. Resolver `module_id` desde `ef_linea_de_servicio` o `ef_servicio_especifico`. Si NULL, default `'unknown'`.
4. UPSERT vía `syncServicesForCompany` existente.
5. Reporte: créated / updated / skipped / unresolved.

Acceptance: 13 de 16 services materializados (los 3 huérfanos quedan en queue manual).

### Slice 4 — HubSpot webhook inbound

1. **HubSpot Developer Portal**: agregar suscripciones `p_services.creation`, `p_services.propertyChange`. Target URL: `https://greenhouse.efeoncepro.com/api/webhooks/hubspot-services`.
2. INSERT en `greenhouse_sync.webhook_endpoints`:
   ```sql
   INSERT INTO greenhouse_sync.webhook_endpoints (endpoint_key, provider, auth_mode, signature_secret_ref, ...)
   VALUES ('hubspot-services', 'hubspot', 'provider_native', 'hubspot-app-client-secret', ...);
   ```
3. Handler `src/lib/webhooks/handlers/hubspot-services.ts`:
   - Validar firma v3 (clonar de `hubspot-companies.ts`).
   - Extraer `objectId` per event.
   - Llamar `syncSingleHubSpotService(objectId)` (nuevo helper, reusa `service-sync.ts`).
   - Sentry: `captureWithDomain(err, 'commercial', { tags: { source: 'hubspot_services_webhook' }})`.

Acceptance: crear/editar service en HubSpot manualmente y ver fila aparecer en Greenhouse < 10s.

### Slice 5 — Cloud Scheduler safety net (cron diario)

Cloud Run endpoint `POST /services/sync-from-hubspot` en ops-worker:
- Bajo `wrapCronHandler` canónico (TASK-775).
- Pull all services HubSpot `0-162`, UPSERT idempotente.
- Categoría: `prod_only` (no async-critical, es safety net).
- Cloud Scheduler job: `ops-services-sync-from-hubspot @ 0 6 * * * America/Santiago`.

Acceptance: deploy ops-worker exitoso, scheduler job creado, primera corrida < 30s.

### Slice 6 — Reliability signals readers

3 readers nuevos en `src/lib/reliability/queries/`:

```typescript
// services-sync-lag.ts
export async function getServicesSyncLag(): Promise<ReliabilityResult> {
  const { count } = await runGreenhousePostgresQuery<{ count: number }>(`
    SELECT COUNT(*) AS count
    FROM greenhouse_core.services
    WHERE active = TRUE
      AND hubspot_service_id IS NOT NULL
      AND (hubspot_last_synced_at IS NULL OR hubspot_last_synced_at < NOW() - INTERVAL '24 hours')
  `)
  return { value: count, severity: count > 0 ? 'warning' : 'ok', ... }
}
```

(idem para los otros 2)

Wire-up en `getReliabilityOverview` registry.

Acceptance: 3 signals visibles en `/admin/operations`. Steady = 0 post-Slice 3.

### Slice 7 — Manual queue + admin endpoint para huérfanos

UI en `/admin/integrations/hubspot/orphan-services`:
- Lista los 3+ services HubSpot sin organization en Greenhouse.
- Per row: CTA "Crear org en Greenhouse" + CTA "Marcar como ignorar (archive en HubSpot)".
- Capability: `commercial.service_engagement.resolve_orphan` (FINANCE_ADMIN + EFEONCE_ADMIN).

Acceptance: operador comercial resuelve los 3 huérfanos vía UI sin escribir SQL.

### Slice 8 — Documentation + runbook

- `docs/documentation/comercial/servicios-engagement.md` (funcional, lenguaje simple, analogía restaurante).
- `docs/manual-de-uso/comercial/sincronizacion-hubspot-servicios.md` (operador-facing).
- Update `services/hubspot_greenhouse_integration/README.md`.
- Delta en `GREENHOUSE_EVENT_CATALOG_V1.md` con el outbox event nuevo.

Acceptance: contenido en lenguaje simple, sin jerga técnica, operador puede operar sin leer código.

## Acceptance Criteria (global)

- [ ] 30 filas legacy con `active=FALSE` + `status='legacy_seed_archived'`. Verificado via SQL.
- [ ] Mínimo 13 servicios HubSpot materializados con `hubspot_service_id` poblado y FK válidas.
- [ ] Webhook HubSpot configurado en Developer Portal y eventos llegando.
- [ ] Cloud Scheduler job activo, corrió ≥ 1 vez exitoso.
- [ ] 3 reliability signals registrados, visibles en `/admin/operations`, en steady state.
- [ ] 3 huérfanos resueltos: o creados en Greenhouse o archivados en HubSpot. Decisión documentada.
- [ ] Tests unit + integration: `src/lib/webhooks/handlers/hubspot-services.test.ts` (signature, idempotency, partial failures).
- [ ] Doc funcional + runbook publicados.
- [ ] CLAUDE.md actualizado con regla canónica "HubSpot es source of truth para engagement instance".
- [ ] Outbox event v1 documentado en EVENT_CATALOG.

## 4-Pillar Score

### Safety
- **Qué puede salir mal**: webhook spoofing → fila falsa creada en `core.services`.
- **Gates**: HMAC-SHA256 v3 signature validation con `HUBSPOT_APP_CLIENT_SECRET`; timestamp expiry < 5 min; capability `commercial.service_engagement.sync` (server-only).
- **Blast radius si falla**: cross-tenant — `service_attribution_facts` agrega P&L por servicio.
- **Verified by**: signature test cases (valid, expired, wrong secret); audit log per UPSERT.
- **Riesgo residual**: durante Slice 3 backfill, los 3 huérfanos quedan no-materializados → mitigación: reliability signal alerta y queue manual los hace visibles operacionalmente.

### Robustness
- **Idempotencia**: UPSERT por UNIQUE `hubspot_service_id`. Webhook event_id en `webhook_inbox_events`.
- **Atomicity**: UPSERT + outbox event en una sola tx.
- **Race protection**: UNIQUE constraint; advisory lock per `hubspot_service_id` durante sync sincrono.
- **Constraint coverage**: CHECK `active <=> archived_at IS NULL` (si se agrega columna), CHECK `engagement_kind` (TASK-801), FK `space_id`/`module_id`.
- **Verified by**: tests concurrencia 2-writers; tests partial-failure HubSpot 5xx.

### Resilience
- **Retry**: webhook intake via outbox state machine (TASK-773). Backoff exponential 5 retries.
- **Dead letter**: `webhook_inbox_events` con status='failed' → dead-letter después de N retries.
- **Reliability signals**: 3 nuevos, steady=0, subsystem `commercial_health`.
- **Audit trail**: outbox events `commercial.service_engagement.materialized` v1 + `archived_legacy_seed` v1, append-only.
- **Recovery procedure**: backfill scripts idempotentes con --dry-run; runbook documentado.

### Scalability
- **Hot path Big-O**: read O(log n) via UNIQUE index `hubspot_service_id`; write O(log n) UPSERT.
- **Cardinalidad**: 50-200 engagements platform-wide a 12 meses. Tabla pequeña.
- **Async paths**: webhook → outbox → reactive (no bloquea request); Cloud Scheduler diario.
- **Costo a 10x**: lineal. Sync de 16 services tarda ~3-5s, 160 tardarían ~30s — sigue cabiendo en cron job.
- **Pagination**: HubSpot list con `?limit=100&after=<cursor>` paginado.

## Open Questions

1. ¿Las 3 huérfanas (Loyal, Motogas, Aguas Andinas) son clientes reales o errores en HubSpot? Decisión operacional pendiente con sales owner.
2. ¿Cómo se resuelve `module_id` cuando el operador HubSpot dejó `ef_linea_de_servicio` NULL? Heurística por nombre o queue manual?
3. ¿`organizations.hubspot_company_id` está poblado para los 13 services resolubles? Verificar en Slice 3 dry-run.
4. ¿TASK-806 (gtm_investment_pnl VIEW) requiere consume orden específico de `engagement_kind` antes de poder reclasificar? Coordinar.

## Hard Rules (post-implementación)

- **NUNCA** crear fila en `core.services` con `hubspot_service_id IS NULL` y `engagement_kind != 'discovery'`. Sólo discovery legítimo + legacy_seed pueden carecer del bridge.
- **NUNCA** sincronizar Greenhouse → HubSpot `0-162`. Solo back-fill de propiedades `ef_*`.
- **NUNCA** matchear servicios por nombre (colisión real demostrada: SSilva tiene 3 services HubSpot y 4 services GH con naming diferente).
- **NUNCA** borrar las 30 filas legacy. Solo archivar.
- **NUNCA** invocar `Sentry.captureException` directo en code path commercial. Usar `captureWithDomain(err, 'commercial', ...)`.
- **SIEMPRE** que un consumer Finance/Delivery necesite "el servicio del cliente X período Y", filtrar `WHERE active=TRUE AND status != 'legacy_seed_archived'`. O mejor: crear VIEW `services_active_v1` y consumir solo de ahí.

## Lessons / Pattern Reuse

- TASK-706 (HubSpot companies inbound) — clonar handler structure literal.
- TASK-557.1 (legacy quotes cleanup) — clonar template "audit + 3 categorías" para script archive.
- TASK-771/773 (outbox + reactive consumer) — patrón async-critical.
- TASK-742 (defense-in-depth 7-layer) — aplicar al webhook write path.
- TASK-768 (economic_category dimension separada) — patrón "no mezclar dimensiones ortogonales" (engagement_kind ≠ commercial_terms ≠ outcome).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSURE
     ═══════════════════════════════════════════════════════════ -->

## Verification

- `pnpm migrate:up` aplicado sin errores (Slice 1).
- `pnpm tsx scripts/services/archive-legacy-seed.ts --dry-run` reporta 30 candidatos.
- `pnpm tsx scripts/services/archive-legacy-seed.ts` aplica, segunda ejecución reporta 0 cambios (idempotencia).
- `pnpm tsx scripts/services/backfill-from-hubspot.ts --dry-run` reporta ≥ 13 candidatos.
- HubSpot test: editar nombre de un service en HubSpot UI → < 10s aparece en `core.services` con UPDATE.
- `gcloud scheduler jobs run ops-services-sync-from-hubspot --location=us-east4` exitoso.
- `/admin/operations` muestra 3 nuevos signals con steady=0.
- Test `pnpm test src/lib/webhooks/handlers/hubspot-services` pasa.
- `pnpm build` + `pnpm lint` + `pnpm tsc --noEmit` limpios.

## Closure Checklist

- [ ] Lifecycle → `complete` y mover archivo a `docs/tasks/complete/`
- [ ] Update `docs/tasks/README.md`
- [ ] Update `docs/tasks/TASK_ID_REGISTRY.md`
- [ ] Update `Handoff.md`
- [ ] Update `changelog.md`
- [ ] Cross-impact scan en `docs/tasks/to-do/` (TASK-801, TASK-802, TASK-806, TASK-807)
- [ ] Delta en `GREENHOUSE_EVENT_CATALOG_V1.md`
- [ ] Delta en CLAUDE.md (sección "HubSpot inbound webhook" — agregar p_services)
- [ ] PR mergeado con `[downstream-verified: services-sync]` en commit message
