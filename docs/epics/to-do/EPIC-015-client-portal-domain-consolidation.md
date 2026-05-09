# EPIC-015 — Client Portal Domain Consolidation

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-015-client-portal-domain`
- GitHub Issue: `optional`

## Summary

Eleva `Client Portal` de "route group + lente de visibilidad" a **dominio compositivo de primer nivel**, paralelo a agency/finance/hr/commercial. Introduce el modelo de **módulos on-demand** con catálogo declarativo, asignación per-cliente time-versioned, resolver canónico, y cascade desde Client Lifecycle V1. Resultado: cualquier módulo del portal cliente es vendible/habilitable selectivamente sin deploy, con audit + reliability + governance.

## Why This Epic Exists

Hoy el portal cliente tiene 3 problemas estructurales:

1. **Sin ownership de dominio**: lógica dispersa en `agency/`, `account-360/`, `ico-engine/`. Cualquier cambio cross-cutting toca 5+ archivos en 3 dominios.
2. **Sin módulos on-demand**: diferenciación per-cliente es binaria (`tenant_type='client'`) o vía `tenant_capabilities.businessLines/serviceModules` hardcoded. Imposible vender addon sin deploy. Imposible pilots/trials. Cliente Globe enterprise vs SMB son idénticos.
3. **Sin cascade comercial→portal**: `engagement_commercial_terms` declara pricing kind pero NO declara qué módulos vienen bundled. Onboarding completion no provisiona automáticamente lo que el cliente compró.

Consecuencias:
- revenue leak: addon no facturado por gap de provisioning
- portal fantasma post-offboarding (acceso no revocado automáticamente)
- imposible diferenciar clientes Globe enterprise vs SMB
- Creative Hub Globe es monolito de 16 cards (no se puede vender Brand Intelligence sin CSC Pipeline)

## Outcome

- `src/lib/client-portal/` carpeta canónica con readers/commands consolidados
- `/api/client-portal/*` namespace API con guards estandarizados
- Schema `greenhouse_client_portal` con 3 tablas (modules, module_assignments, module_assignment_events)
- 10 módulos seed canonizados cubriendo Globe + Wave + CRM Solutions + cross-line
- Resolver canónico `resolveClientPortalModulesForOrganization` como única fuente de verdad para UI/API client-facing
- 7 capabilities granulares + override EFEONCE_ADMIN
- Cascade automático desde `client.lifecycle.case.completed` → assignments materializados
- Subsystem reliability `Client Portal Health` con 6 signals
- Backfill idempotente legacy → modules con dry-run obligatorio
- Sentry domain `client_portal` + outbox events `client.portal.*` v1

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` — spec canónico V1 (creado 2026-05-07)
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` V3.0 — descripción funcional (predecesor, vigente)
- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` — cascade trigger
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — capability platform
- `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` — Globe Creative Hub
- `docs/architecture/GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1.md` — Equipo Asignado
- `docs/architecture/GREENHOUSE_FEATURE_FLAGS_ROLLOUT_PLATFORM_V1.md` — patrón scope precedence

## Child Tasks

- `TASK-822` — Domain Consolidation: `src/lib/client-portal/` + migración readers (Slice 1/8)
- `TASK-823` — API Namespace `/api/client-portal/*` Read Endpoints (Slice 2/8)
- `TASK-824` — DDL Schema `greenhouse_client_portal` + 3 Tablas + 10 Modules Seed (Slice 3/8)
- `TASK-825` — Resolver Canónico + Helpers TS + Cache (Slice 4/8)
- `TASK-826` — Admin Endpoints + 7 Capabilities + Audit + UI Admin (Slice 5/8)
- `TASK-827` — Composition Layer: Menú Dinámico + Page Guards + Empty States (Slice 6/8)
- `TASK-828` — Cascade desde Client Lifecycle V1 (Slice 7/8)
- `TASK-829` — Reliability Signals + Backfill Legacy Idempotente (Slice 8/8)

## Existing Related Work

- TASK-816..821 Client Lifecycle V1 (este epic depende de TASK-820 cascade pattern + TASK-817 outbox extension)
- TASK-535 Commercial Party Lifecycle (organizations.lifecycle_stage, instantiateClientForParty)
- TASK-403 Capabilities Platform
- TASK-136 View Access Governance
- TASK-721 Asset Uploader Canonical
- TASK-771/773 Outbox + Reactive Consumers
- TASK-780 Home Rollout Flag Platform (patrón scope precedence)
- TASK-553 Quick Access Shortcuts (patrón resolver canónico)
- TASK-742 Auth Resilience 7-Layer (defense-in-depth template)

## Exit Criteria

- [ ] Spec V1 canonizado (`GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md`) ✅ existe (2026-05-07)
- [ ] 8 child tasks completadas (TASK-822..829)
- [ ] Schema `greenhouse_client_portal` aplicado en staging y producción
- [ ] 10 módulos seed insertados
- [ ] Resolver canónico tested + cubierto por tests concurrency
- [ ] Toda surface client-facing consume el resolver (lint rule + grep audit)
- [ ] Cascade desde Client Lifecycle V1 funcional E2E (test smoke en staging)
- [ ] Subsystem `Client Portal Health` visible en `/admin/operations` con datos reales
- [ ] Legacy backfill ejecutado en producción con dry-run aprobado
- [ ] Documentación funcional en `docs/documentation/client-portal/` actualizada
- [ ] CLAUDE.md sección "Client Portal Domain (TASK-822..829)" agregada
- [ ] Reliability signal `lifecycle_module_drift` = 0 en producción post-cutover
- [ ] Sentry domain `client_portal` recibe eventos en producción

## Non-goals

- Self-service del cliente para solicitar módulos (V1.1, fuera de este epic)
- Pricing automation: addon → invoice line item (V1.1, requires finance ops alignment)
- Descomposición Creative Hub Globe en 16 módulos atómicos (V2 — V1.0 = bundle único `creative_hub_globe_v1`)
- Trial/pilot de módulo individual desacoplado de engagement_kind (V2)
- Industry benchmark cross-tenant anónimo (V2 — requires legal review)
- Multi-tenant pricing variable per cliente para mismo módulo (V2)
- Bidireccional con Kortex para CRM Solutions transition (V2)
- Cliente self-admin (gestionar sus propios users) (V1.2)
- Multi-org M&A (V2)

## 4-Pilar Score (heredado del spec V1, §15)

- **Safety**: capabilities granulares (3 niveles, override EFEONCE_ADMIN-only); UNIQUE partial previene duplicados; resolver server-only; audit append-only; cross-tenant contamination imposible
- **Robustness**: idempotency via UNIQUE partial; atomic via withTransaction; race protection SELECT FOR UPDATE; 6 CHECK constraints + 4 FK + 2 anti-mutation triggers
- **Resilience**: cascade vía outbox + reactive consumer con dead_letter; recovery script idempotent; legacy backfill re-runable; resolver tolera huérfanos
- **Scalability**: O(log n) hot path; cardinalidad ~10K assignments + ~20K events/year (trivial); cache TTL 60s reduce DB load 10x

## Open Questions (post-V1.0)

1. Pricing automation V1.1: addon → invoice line item — requires finance ops alignment
2. Self-service cliente V1.1: solicitud via UI → outbox → Teams notification → approval workflow
3. Sunset legacy modules (crm_command_legacy cuando Kortex listo) — manual con runbook + 90d notice
4. Granularidad descomposición V2 — decisión comercial (qué se vende standalone vs bundled)
5. Industry benchmark V2 — requires legal review (k-anonymity threshold)
6. Multi-org M&A V2 — depende del modelo legal
