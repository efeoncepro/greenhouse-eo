# TASK-1887 — Efeonce Marketing Studio: fundación (repo, base, dominio, API v1, import y Vercel)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `db`
- Epic: `EPIC-049`
- Status real: `Completa 2026-09-25: en vivo en https://studio.efeonce.org (Let's Encrypt, noindex, acceso abierto de solo lectura)`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `Greenhouse develop (docs) · efeonce-marketing-studio main (código); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea la plataforma Efeonce Marketing Studio desde cero: repo privado `efeoncepro/efeonce-marketing-studio`
(pnpm monorepo Next.js + paquetes de dominio, contratos y base), bases `marketing_studio` y
`marketing_studio_staging` en la instancia Cloud SQL existente con roles propios, modelo de dominio en el
schema `studio`, API v1 de lectura con OpenAPI, import idempotente del catálogo OneDrive (CMP-001/002 con
assets, copys, anuncios, audiencias, plan y posts; CMP-003…005 como campañas) y deploy en Vercel con
`studio.efeonce.org` en modo de acceso `open`.

## Why This Task Exists

El Campaign Manager aprobado es un HTML autogenerado sin base, sin colaboración y desactualizado (sólo
conoce 2 de 5 campañas). El ADR `EFEONCE_STUDIO_API_FIRST_DECISION_V1` fijó principio y placement; falta el
runtime mínimo sobre el que colgarán login, UI, escrituras, worker y MCP. Sin esta fundación, cada task hija
decidiría por su cuenta repo, conexión, contrato y modelo.

## Goal

- Un repo con las capas separadas (dominio sin framework) y gates locales verdes.
- Base propia con el modelo de dominio aplicado y verificado, y las cinco campañas importadas.
- `studio.efeonce.org` respondiendo `/api/v1/*` y una página de campañas básica, en modo `open` de sólo lectura.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md` (delta 2026-09-25)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` (oficio de migraciones)
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` (perfiles de acceso)

Reglas obligatorias:

- Ningún documento de gobierno en el repo de Studio: `AGENTS.md`/`CLAUDE.md` allá son routers a este repo.
- `packages/domain` no importa `next`, `react`, `@vercel/*` ni SDK MCP.
- Cero grants entre la base de Studio y la de Greenhouse; ningún SQL hacia Greenhouse.
- Sin escrituras HTTP en esta task; el import corre por CLI.
- Migraciones con markers `-- Up Migration` / `-- Down Migration` y bloque `DO … RAISE EXCEPTION`.

## Normative Docs

- `docs/operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md`
- `docs/operations/EFEONCE_PAID_MEDIA_MANIFEST_AND_MCP_HANDOFF_V1.md`
- OneDrive `5. Contenidos/15. Paid Media/01. Recursos/Campaign Manager/LEEME.md` (fuente del import)
- `docs/campaigns/decisions/CDR-008…CDR-011` (metadatos CMP-003…005)

## Dependencies & Impact

### Depends on

- Cloud SQL `efeonce-group:us-east4:greenhouse-pg-dev` (existente).
- Pool WIF `vercel`, provider `greenhouse-eo` (issuer `https://oidc.vercel.com/efeonce-7670142f`, existente).
- Zona DNS de `efeonce.org` (gestión humana fuera de GCP/Vercel [verificar]).

### Blocks / Impacts

- Todas las tasks hijas de `EPIC-049` (login, UI, commands, worker, MCP).
- `docs/operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md` recibirá delta al declarar el corte de autoridad (no en esta task).

### Files owned

- Repo `efeoncepro/efeonce-marketing-studio` completo.
- `docs/architecture/marketing-studio/**`
- `docs/operations/marketing-studio/**`
- `docs/documentation/marketing-studio/**`
- `docs/manual-de-uso/marketing-studio/**`

## Current Repo State

### Already exists

- ADR `docs/architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md` (Accepted principio + placement).
- Arquitectura `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md`.
- Prototipo y catálogo `CATALOGO-DATOS.json` (52 assets, 48 copys, 72 anuncios, 4 audiencias, flight Q4, 3 posts).
- Precedente de repo hermano: `../efeonce-globe` (pnpm workspace `apps/*` + `packages/*`, Node 24).

### Gap

- No existe repo, base, roles, service account, proyecto Vercel ni dominio de Studio.
- No existe modelo de datos ni contrato API.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `repo efeoncepro/efeonce-marketing-studio (nuevo) · Vercel proyecto efeonce-marketing-studio · base marketing_studio en greenhouse-pg-dev`
- Future candidate home: `api`
- Boundary: `packages/domain (commands/readers/policy) consumido por apps/web (páginas + /api/v1), CLI de scripts y futuro adapter MCP; ningún consumer toca tablas directo`
- Server/browser split: `readers y DB sólo server-side (Server Components y route handlers); el browser recibe DTOs del contrato`
- Build impact: `none sobre greenhouse-eo; repo y deployment independientes`
- Extraction blocker: `none — la API puede moverse a Cloud Run sin reescribir el dominio`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `db`
- Source of truth afectado: `base marketing_studio, schema studio (nuevo); OneDrive sigue siendo fuente hasta el corte`
- Consumidores afectados: `apps/web, CLI de import, futuro MCP`
- Runtime target: `production (Vercel + Cloud SQL)`

### Contract surface

- Contrato existente a respetar: `ADR EFEONCE_STUDIO_API_FIRST_DECISION_V1 §Contrato obligatorio`
- Contrato nuevo o modificado: `OpenAPI 3.1 /api/v1 (health, campaigns, campaign detail, assets, copies, ads, plan, posts)`
- Backward compatibility: `not applicable (v1 nueva)`
- Full API parity: `las páginas usan los mismos readers que /api/v1 con el mismo Actor; no hay dato visible sin endpoint`

### Data model and invariants

- Entidades/tablas/views afectadas: `studio.campaign, concept, asset, asset_version, copy_variant, audience, ad_configuration, media_flight, budget_line, scheduled_post, audit_event, import_run, api_client`
- Invariantes que no se pueden romper:
  - Estados creativo / autorización de medios / lanzamiento separados; sin booleano `approved`.
  - `budget_line.kind` distingue `proposed` / `approved` / `actual`; nunca se suman entre sí.
  - Copy almacenado literal.
  - `scheduled_post.provider_status` siempre con `observed_at` y `source`.
  - Import idempotente: reimportar no duplica; versión nueva sólo si cambia sha256.
- Write-target allowlist: `N/A — repo nuevo; el único escritor es el importer`
- Tenant/space boundary: `campaign.organization_id obligatorio; readers filtran por las organizaciones del Actor (modo open = todas las visibles para lectura)`
- Idempotency/concurrency: `import en una transacción con upsert por ID de negocio; import_run registra digest de la fuente`
- Audit/outbox/history: `audit_event append-only por corrida de import; sin outbox en la fundación (no hay efectos externos)`

### Migration, backfill and rollout

- Migration posture: `additive (base nueva)`
- Default state: `enabled; acceso open de sólo lectura por decisión del operador`
- Backfill plan: `import dry-run → apply en staging → apply en prod`
- Rollback path: `revert deploy en Vercel; DROP DATABASE de la base de Studio si hubiera que deshacer (no afecta Greenhouse)`
- External coordination: `DNS de studio.efeonce.org (operador)`

### Security and access

- Auth/access gate: `STUDIO_ACCESS_MODE=open (lecturas) hasta la task de Efeonce ID; api_client con token hasheado para agentes`
- Sensitive data posture: `sin PII de personas; presupuestos propuestos y copys visibles en modo open (riesgo aceptado por el operador)`
- Error contract: `{error, code, actionable} es-CL; sin stack/SQL`
- Abuse/rate-limit posture: `sólo lecturas; noindex; sin rate limit propio en la fundación (Vercel firewall por defecto)`

### Runtime evidence

- Local checks: `pnpm check (typecheck + tests + gates) en el repo de Studio`
- DB/runtime checks: `verificación de objetos post-migración; conteos del import contra el catálogo`
- Integration checks: `curl https://studio.efeonce.org/api/v1/health y /campaigns`
- Reliability signals/logs: `health endpoint; logs de Vercel`
- Production verification sequence: `ver Rollout Plan`

<!-- ZONE 2 — PLAN MODE: lo llena el agente que toma la task. -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Repo y esqueleto

- Repo privado `efeoncepro/efeonce-marketing-studio`; pnpm workspace (`apps/web`, `packages/contracts`, `packages/domain`, `packages/database`), Node 24, TypeScript estricto.
- `AGENTS.md`/`CLAUDE.md` router hacia la documentación de este repo; `README.md` mínimo.
- Gates: `pnpm check` = typecheck + tests + gate de rutas absolutas + gate de imports del dominio.

### Slice 2 — Base, roles y migración inicial

- `CREATE DATABASE marketing_studio` y `marketing_studio_staging`; roles owner/migrator/runtime; service account `marketing-studio-runtime@efeonce-group` con usuario IAM de Cloud SQL.
- Migración inicial del schema `studio` con verificación post-DDL; secreto del migrador en Secret Manager.

### Slice 3 — Dominio y contratos

- Schemas zod de los DTOs y generación de OpenAPI 3.1.
- Readers del dominio (lista, detalle, assets, copys, anuncios, plan, posts) con `Actor` y errores canónicos; tests.

### Slice 4 — Import del catálogo

- CLI `import:catalog` (dry-run por defecto, `--apply`), idempotente, con `import_run` y `audit_event`.
- CMP-003…005 registradas desde sus CDR.
- Aplicado en staging y producción.

### Slice 5 — Web, API v1 y Vercel

- Route handlers `/api/v1/*` + `openapi.json`; página de campañas y detalle mínimos (la UI completa es task hija).
- Conexión Cloud SQL con WIF + IAM auth; `noindex`; `STUDIO_ACCESS_MODE=open`.
- Proyecto Vercel, variables por ambiente, dominio `studio.efeonce.org` y registros DNS entregados al operador.

### Slice 6 — Documentación y cierre

- Runtime handoff, documentación funcional y manual de uso en este repo; Handoff/changelog; lifecycle.

## Out of Scope

- Login con Efeonce ID (task hija).
- UI final de Studio (task hija ui-ux).
- Escrituras HTTP, aprobación, corte de autoridad desde OneDrive.
- Subida de binarios a GCS, miniaturas, worker, Metricool, adapter MCP.

## Detailed Spec

El modelo, el contrato, el acceso y la conexión están especificados en
`docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` §3–§7; no se duplican acá.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5 → Slice 6.
- Slice 4 (import) se aplica en staging y se verifica antes de producción.
- Slice 5 no apunta el dominio hasta que `/api/v1/health` responda verde en la URL `.vercel.app` de producción.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un rol de Studio obtiene acceso a la base de Greenhouse | Cloud SQL / identity | low | `REVOKE CONNECT` explícito + verificación `has_database_privilege` = false | verificación en el runbook |
| Saturación de conexiones de la instancia compartida | Cloud SQL | low | pool `max=3` en Vercel; `CONNECTION LIMIT` por rol | errores `too many connections` en logs |
| Datos de campaña expuestos en modo open | UI / data | medium | sólo lecturas, noindex, riesgo aceptado por el operador; interruptor a `efeonce_id` | n/a |
| Import duplica o pierde filas | data | low | dry-run + conteos contra el catálogo + upsert por ID | conteos del `import_run` |
| WIF otorga más que la SA de Studio | identity | low | binding por subject exacto del proyecto Vercel | verificación de IAM policy |

### Feature flags / cutover

- `STUDIO_ACCESS_MODE` (`open` por defecto en esta task; `efeonce_id` en la task hija). Revert: cambiar variable + redeploy (<5 min).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | archivar repo | minutos | sí |
| Slice 2 | `DROP DATABASE marketing_studio*` + `DROP ROLE` + borrar SA | minutos | sí (no toca Greenhouse) |
| Slice 3 | revert commit | minutos | sí |
| Slice 4 | `TRUNCATE` de tablas `studio` + reimport | minutos | sí |
| Slice 5 | quitar dominio / borrar proyecto Vercel (verify-then-delete por ID) | minutos | sí |
| Slice 6 | revert docs | minutos | sí |

### Production verification sequence

1. Migración en staging y verificación de objetos.
2. Import dry-run y apply en staging; conteos.
3. Migración + import en producción; conteos.
4. Deploy Vercel producción; `curl` a `/api/v1/health` y `/api/v1/campaigns` en `.vercel.app`.
5. Dominio agregado; registros DNS entregados; verificación al propagarse.

### Out-of-band coordination required

- Registros DNS de `studio.efeonce.org` en el proveedor DNS de `efeonce.org` (operador).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Repo `efeoncepro/efeonce-marketing-studio` privado existe con `apps/web`, `packages/contracts`, `packages/domain`, `packages/database` y `pnpm check` verde. — Evidencia: commit `ea32ee6`, `pnpm check` exit 0 y `pnpm build` OK (2026-09-25).
- [x] `packages/domain` no importa `next`, `react`, `@vercel/*` (gate verde). — `domain-boundary-gate: OK`.
- [ ] Bases `marketing_studio` y `marketing_studio_staging` existen; los roles de Studio no tienen `CONNECT` sobre la base de Greenhouse (verificado). — **Parcial:** las bases existen y cada app conecta solo a la suya, pero los roles **sí** pueden conectarse a `greenhouse_app` por el `CONNECT` por defecto de PUBLIC. Verificado: 0 tablas legibles y 0 funciones `SECURITY DEFINER` alcanzables. Cerrarlo del todo requiere un cambio en Greenhouse (queda como hija de EPIC-049).
- [x] Las 13 tablas del schema `studio` existen en ambas bases (verificación post-DDL). — 13 verificadas vía `information_schema` + `asset_rendition` (migración 2), en staging y producción.
- [x] Import en producción: 5 campañas, 52 assets, 48 copys, 72 anuncios, 4 audiencias, 1 flight, 3 posts de CMP-001/002 (o conteos del catálogo vigente, registrados en `import_run`). — Producción: 5 campañas, 21 conceptos, 54 piezas (52 del catálogo + 2 de CMP-003 del registro), 48 copys, 72 anuncios, 4 audiencias, 1 flight, 7 líneas de presupuesto, 6 posts (3 de CMP-001 + 3 de CMP-003).
- [x] Reimportar la misma fuente produce 0 inserciones nuevas. — Staging y producción: segunda corrida con `inserted 0`.
- [x] `GET /api/v1/openapi.json` devuelve OpenAPI 3.1 con las 8 rutas. — OpenAPI 3.1 con 12 rutas: las 8 originales + `attention`, `calendar`, `search`, `renditions/{id}` (test de contrato).
- [x] `GET /api/v1/health` y `/api/v1/campaigns` responden 200 en el deployment de producción. — `vercel curl` al deployment de producción: health `{"status":"ok","database":"reachable"}`, campaigns con 5 campañas, rendition 200 `image/webp`, attention con las 4 decisiones y home 200.
- [x] La respuesta incluye `X-Robots-Tag: noindex`. — Verificado en producción.
- [x] Registros DNS de `studio.efeonce.org` entregados al operador; dominio verificado o marcado pendiente de propagación. — CNAME creado por el operador en HostGator; certificado emitido con `vercel certs issue`. `https://studio.efeonce.org` responde 200 en home, campañas y calendario; health `database: reachable`; OpenAPI con `servers: studio.efeonce.org`; renditions 200.
- [x] Arquitectura, runtime handoff, documentación funcional y manual existen en este repo.

## Verification

- `pnpm check` en `efeonce-marketing-studio`
- Verificación SQL de objetos y privilegios
- `curl` contra el deployment de producción
- `pnpm task:lint --task TASK-1887` y `pnpm docs:closure-check` en este repo

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] EPIC-049 actualizado con el estado de la fundación

## Follow-ups

- Tasks hijas de EPIC-049 (login Efeonce ID, UI, commands, worker, MCP, observabilidad).

## Open Questions

- Proveedor DNS de `efeonce.org` y quién aplica los registros (operador).
