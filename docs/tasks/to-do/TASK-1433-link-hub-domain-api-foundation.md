# TASK-1433 — Link Hub domain and API foundation

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-030`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|data|platform`
- Blocked by: `none`
- Branch: `task/TASK-1433-link-hub-domain-api-foundation`
- Legacy ID: `none`
- GitHub Issue: `n/a`

## Summary

Materializa el aggregate `growth.link_hub`: schema multi-tenant, contratos browser-safe, commands/readers, lifecycle draft/published versionado, rollback, proyección pública allowlisted y API gobernada. Es la foundation que evita que el renderer o el cockpit inventen lógica de negocio, tablas o permisos propios.

## Why This Task Exists

No existe un source of truth para una página de enlaces multi-marca. Construir primero la UI o una ruta pública produciría un CMS implícito, drafts mutables servidos en vivo y lógica duplicada por consumer. La foundation debe resolver identidad/binding real, versionado, autorización, concurrencia, validación de destinos, audit y Full API Parity antes de exponer una superficie.

## Goal

- Definir una sola entidad/contract para Efeonce y clientes, sin código por marca.
- Servir sólo versiones publicadas inmutables y mantener rollback seguro.
- Hacer que UI, renderer, Nexa, API/MCP, CLI y E2E consuman los mismos primitives.
- Entregar una proyección pública mínima, cacheable y sin datos internos.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_LINK_HUB_CONTROL_PLANE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- `LinkHubPage` se vincula a primitives reales de organization/space/brand; no crea identidad paralela.
- Publicar crea una versión inmutable; editar nunca muta el contenido que ya está live.
- Sólo schemes/block kinds allowlisted cruzan a la proyección pública; no HTML/JS arbitrario.
- La tenant boundary se deriva server-side; `organization_id`/`space_id` del payload no otorga acceso.
- Los adapters UI/HTTP/Nexa/MCP delegan en commands/readers canónicos.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/context/03_ecosistema-producto.md`
- `docs/context/10_experiencia-cliente.md`

## Dependencies & Impact

### Depends on

- `src/lib/growth/forms/**` para referenciar Growth Forms sin duplicar su definición/submission.
- `src/lib/api-platform/**` y `src/app/api/platform/**` para programmatic lanes.
- stores/migrations/capabilities existentes bajo `greenhouse_growth` y `greenhouse_core`.

### Blocks / Impacts

- Bloquea `TASK-1434`, `TASK-1435`, `TASK-1436` y `TASK-1437`.
- Define la frontera que consumen los pilotos `TASK-1438/1439`.

### Files owned

- `src/lib/growth/link-hubs/**`
- `src/app/api/growth/link-hubs/**`
- `src/app/api/public/growth/link-hubs/**`
- `src/app/api/platform/ecosystem/growth/link-hubs/**`
- `migrations/**link_hub**`
- `docs/api/**`

## Current Repo State

### Already exists

- Schema y dominio `greenhouse_growth` con patterns de definitions, lifecycle, event evidence y adapters.
- Growth Forms y CTA con contratos públicos allowlisted y separación server/browser.
- Capability registry, API Platform, audit/outbox, assets y guards tenant-scoped.

### Gap

- No existen `LinkHubPage`, versiones, blocks, projection ni commands/readers.
- No existe resolución estable slug/host hacia una publicación.
- No hay capabilities ni API parity para authoring/publish/rollback.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/link-hubs/**`, rutas Next.js existentes y migrations del monolito modular.
- Future candidate home: `domain-package`
- Boundary: contratos `LinkHubPage`, `LinkHubPublishedProjection`, readers y commands; portal/public/API/Nexa/MCP son consumers.
- Server/browser split: `*-contract.ts`/DTOs sin DB/secrets; stores, auth, assets y outbox en módulos `server-only`.
- Build impact: `none`; no SDK pesado ni filesystem input nuevo.
- Extraction blocker: transacción de versionado/publicación, auth/capabilities, binding organization/space y cache invalidation pública.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration`
- Source of truth afectado: nuevas tablas `greenhouse_growth.link_hub_*` y primitives `src/lib/growth/link-hubs/**`.
- Consumidores afectados: UI, public renderer, Product API, API Platform/MCP, Nexa, E2E y dominios/analytics child tasks.
- Runtime target: `local|staging|production`

### Contract surface

- Contrato existente a respetar: ADR Link Hub, API Platform, Growth Forms y capability/audit patterns.
- Contrato nuevo o modificado: page/version/block/domain-reference DTO, create/update/reorder/publish/rollback/pause commands, list/detail/preview/public-projection readers y canonical errors.
- Backward compatibility: `compatible`; capability nueva detrás de rollout gate.
- Full API parity: Product API y ecosystem read path llaman los mismos primitives; writes son aptos para `propose -> confirm -> execute`.

### Data model and invariants

- Entidades/tablas/views afectadas: nuevas `link_hub_pages`, `link_hub_versions`, `link_hub_blocks`, `link_hub_audit` bajo `greenhouse_growth`; naming final sujeto a migration review, no a UI.
- Invariantes que no se pueden romper:
  - una página tiene como máximo una versión published vigente y la versión es immutable;
  - slug/host bindings activos son únicos y nunca resuelven cross-tenant;
  - un block publicado pertenece a una versión y sólo contiene kind/payload allowlisted;
  - rollback crea/promueve una versión auditable, no reescribe historia.
- Tenant/space boundary: resolver binding por organization/space/brand canónico y capability; lectura pública sólo por published lookup.
- Idempotency/concurrency: command IDs + optimistic version/revision; publish/rollback en transacción y lock por `page_id`.
- Audit/outbox/history: append-only para lifecycle/publish/rollback; outbox `growth.link_hub.published|paused|rolled_back`.

### Migration, backfill and rollout

- Migration posture: `additive`.
- Default state: `flag OFF`; cero páginas y cero tráfico.
- Backfill plan: `none`; el piloto se crea por command.
- Rollback path: flag OFF, conservar tablas/versiones; revert de código/migration sólo antes de datos reales.
- External coordination: ninguna hasta dominios/piloto.

### Security and access

- Auth/access gate: capabilities `growth.link_hub.read|write|publish|domain.manage|analytics.read` con grants reales; public projection anónima separada.
- Sensitive data posture: configuración de marca sin PII; URLs/copy pueden ser customer content y requieren sanitización.
- Error contract: `not_found|denied|invalid_block|invalid_destination|revision_conflict|publish_blocked|projection_unavailable`, sin raw errors.
- Abuse/rate-limit posture: public read cache/rate guard; writes session/capability; preview token efímero y revocable.

### Runtime evidence

- Local checks: tests de state machine, URL sanitizer, projection redaction, tenant isolation, concurrency e idempotency.
- DB/runtime checks: migration up, grants/parity y SQL smoke con dos tenants y dos versions.
- Integration checks: Product API + ecosystem/public contract smoke.
- Reliability signals/logs: `growth.link_hub.publish_failed`, `growth.link_hub.projection_stale`.
- Production verification sequence: migrate staging -> commands fixture -> public projection -> rollback -> tenant anti-leak -> prod migrate flag OFF.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths/objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit and tested.
- [ ] Migration/backfill/rollback posture is explicit and proportional.
- [ ] DB/runtime and API contract evidence exists.
- [ ] Errors/audit/signals are canonical and sanitized.

## Capability Definition of Done — Full API Parity gate

- [ ] Business logic lives in `src/lib/growth/link-hubs/**`, never UI/routes.
- [ ] Aggregate/resources/commands are modeled independently from buttons.
- [ ] Reads/writes have authz, idempotency, audit/outbox, errors and observability.
- [ ] Capabilities and grants ship with coverage.
- [ ] Product API + ecosystem/MCP/Nexa path is declared and contract-tested.
- [ ] Writes are compatible with `propose -> confirm -> execute`.
- [ ] UI/public/E2E use the same projection/primitives.
- [ ] Parity check passes at capability level.

<!-- ZONE 2 — PLAN MODE intentionally empty -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Domain contract and migration

- Confirm binding real de organization/space/brand; create additive schema, constraints, grants and browser-safe Zod/types.
- Implement URL/block/theme validation and canonical error taxonomy.

### Slice 2 — Commands, readers and history

- Implement create/update/reorder/publish/pause/rollback with optimistic concurrency, audit/outbox and idempotency.
- Implement tenant-scoped list/detail/preview and version history readers.

### Slice 3 — Public projection and API parity

- Build allowlisted published projection and slug/host lookup seam, without domain-provider logic.
- Add thin Product/public/ecosystem adapters, capabilities/grants, contract tests and reliability signals.

## Out of Scope

- Render visual, cockpit, DNS/TLS adapter, click analytics, profile cutover o primer cliente.
- HTML/JS arbitrario, commerce, authentication del visitante o indexación SEO.
- Nuevo deployable/package/repo.

## Detailed Spec

Block kinds V1: `featured_link`, `link`, `social`, `contact`, `meeting`, `growth_form`. Cada kind tiene schema propio; un payload desconocido bloquea publish. `published_projection_version` debe permitir evolución backward-compatible y cache key por `page_id + version_id`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3. Ningún consumer visible inicia antes de projection/commands testeados.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| fuga cross-tenant | data/API | medium | server-derived scope + two-tenant tests | access violation/error domain |
| draft mutable servido live | public | medium | immutable published version | `projection_stale` |
| publish concurrente pisa cambios | DB | medium | revision + lock/transaction | `revision_conflict` |
| URL maliciosa | public/security | medium | scheme/kind sanitizer fail-closed | `invalid_destination` count |

### Feature flags / cutover

- Registrar `GROWTH_LINK_HUB_ENABLED` default `false`; public lookup devuelve not-found/fallback seguro mientras está OFF.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert código; conservar schema aditivo | <1 h | sí |
| 2 | flag OFF + revert commands | <15 min | sí |
| 3 | flag OFF/public route disable; published data intacta | <15 min | sí |

### Production verification sequence

1. Migration/grants staging.
2. Fixture de dos tenants; publish/rollback/retry.
3. Anti-leak and redaction contract smoke.
4. Production migration con flag OFF.
5. Handoff a TASK-1434/1435; no activar público aún.

### Out-of-band coordination required

- No requiere DNS ni cambios de perfiles sociales. La migración productiva ocurre con el flag OFF, después de backup/compatibility check; si falla, se revierte código/commands y se conserva el schema aditivo sin exponer rutas públicas.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Given dos tenants, When se lista/edita/publica una página, Then ningún ID/payload del otro tenant se revela.
- [ ] Given una versión publicada, When el draft cambia, Then el public projection permanece byte-stable hasta nuevo publish.
- [ ] Given publish/rollback reintentado, When usa la misma idempotency key, Then no duplica versiones/outbox.
- [ ] Given un scheme/block desconocido, When se valida, Then publish falla con error canónico.
- [ ] Given la UI/Nexa/MCP/E2E, When consumen la capability, Then delegan al mismo command/reader.
- [ ] Migration, grants, capabilities y API contract tests pasan.

## Verification

- `pnpm task:lint --task TASK-1433`
- tests focales de `src/lib/growth/link-hubs/**`
- migration/grant/parity smoke contra PostgreSQL staging
- Product/public/ecosystem API contract smoke
- `pnpm qa:gates --changed`

## Closing Protocol

- [ ] Lifecycle/carpeta/README/registry sincronizados.
- [ ] Handoff/changelog/ADR/docs funcionales actualizados.
- [ ] `pnpm docs:closure-check` ejecutado.
- [ ] Runtime permanece flag OFF hasta consumer/piloto aprobado.

## Follow-ups

- `TASK-1434…1439`.

## Open Questions

- Discovery debe elegir el binding brand real (organization asset/space) y documentar por qué, sin crear `brand_id` paralelo.
