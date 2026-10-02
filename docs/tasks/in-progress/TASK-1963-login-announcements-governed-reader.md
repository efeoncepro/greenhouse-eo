# TASK-1963 — Novedades del login: tabla, reader gobernado y API

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `none`
- Status real: `Code complete local (2026-10-02). Migración 20261002200000000 aplicada en la instancia Cloud SQL compartida (dev/staging) con autorización del operador: SELECT confirma lgan-seed-ai-visibility-report (engine, prioridad 20) y lgan-seed-globe-studio (brand, 10) published, y login_announcements.manage activa (create/update, tenant). Tests 10/10, typecheck y lint de los archivos verdes; la página /login local lee el reader. Pendiente: smoke de la API pública en staging tras el deploy, commit/push y cierre documental.`pnpm pg:connect:migrate`) y la evidencia del SELECT.`
- Rank: `TBD`
- Domain: `platform|content`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El login V4 aprobado por el operador el 2026-10-02 (canvas «Login Greenhouse · La órbita») muestra sobre la foto un carrusel de novedades para clientes — productos nuevos, funciones de Greenhouse y cross selling por línea de servicio. Esta task crea la fuente de verdad de esas novedades: la tabla `greenhouse_core.login_announcements`, el reader canónico que entrega las vigentes al login, la API pública de lectura y los commands de administración gateados por capability, para que marketing, la UI y Nexa operen el mismo contrato.

## Why This Task Exists

Hoy el login no tiene ningún slot de contenido: el panel de marca usa copy fijo en `src/lib/copy/client-portal.ts` (`login_vp_*`). El operador decidió (2026-10-02) que las novedades salgan de un reader gobernado con tabla y no de una lista en el repo, para que se puedan administrar sin deploy y para cumplir Full API Parity: lo que la pantalla muestra debe poder crearse, publicarse y archivarse por API (y por lo tanto por Nexa) con autorización fina.

## Goal

- Una tabla aditiva con las novedades (texto o banner), su línea de servicio, vigencia, prioridad y estado.
- Un reader server-side que devuelve como máximo tres novedades publicadas y vigentes, ordenadas, sin depender de sesión.
- API pública de lectura y commands de escritura con capability `login_announcements.manage` concedida a roles reales.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` (líneas de servicio y acento)

Reglas obligatorias:

- Full API Parity: la UI del login consume el reader; las escrituras viven en commands de `src/lib/login-announcements/**`, nunca en un componente.
- Errores al cliente sólo con `canonicalErrorResponse`; observabilidad con `captureWithDomain(…, 'platform')`.
- Capability + grant + catálogo TS en el mismo cambio (patrón TASK-1894).
- Migración aditiva con marcador anti pre-up y `Down` reversible.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`

## Dependencies & Impact

### Depends on

- `greenhouse_core.capabilities_registry` (seed de la capability)
- `src/config/entitlements-catalog.ts`, `src/lib/entitlements/runtime.ts`
- `src/lib/db.ts` (`query`), `src/lib/api/canonical-error-response.ts`, `src/lib/tenant/authorization.ts` (`requireAdminTenantContext`)

### Blocks / Impacts

- `TASK-1964` (login V4 y transición de acceso) consume el reader.
- `TASK-1834` (login convergente con Efeonce ID): la pantalla del issuer puede reutilizar este reader.

### Files owned

- `migrations/*_task-1963-login-announcements.sql`
- `src/lib/login-announcements/**`
- `src/app/api/public/login-announcements/route.ts`
- `src/app/api/admin/login-announcements/route.ts`
- `src/app/api/admin/login-announcements/[announcementId]/route.ts`
- `src/config/entitlements-catalog.ts` (entrada nueva)
- `src/lib/entitlements/runtime.ts` (grant nuevo)

## Current Repo State

### Already exists

- Copy fijo del panel de marca en `src/lib/copy/client-portal.ts` (`login_hero_*`, `login_vp_*`) consumido por `src/views/login/GreenhouseBrandPanel.tsx`.
- Patrón de capability + grant en el commit de TASK-1894 (`migrations/20261002185625608_task-1894-marketing-studio-write-capabilities.sql`).

### Gap

- No existe tabla, reader, API ni capability para novedades del login.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/login-announcements/**` + rutas en `src/app/api/{public,admin}/login-announcements/**`
- Future candidate home: `domain-package`
- Boundary: reader `listActiveLoginAnnouncements` y commands `createLoginAnnouncement`/`updateLoginAnnouncement`/`setLoginAnnouncementStatus`; consumers autorizados: página `/login`, API pública, API admin, Nexa vía API.
- Server/browser split: el reader y los commands son `server-only`; el cliente recibe DTOs serializables.
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_core.login_announcements`
- Consumidores afectados: `UI (/login), API pública, API admin, Nexa vía API`
- Runtime target: `local|staging|production`

### Contract surface

- Contrato existente a respetar: `canonicalErrorResponse`, `can(subject, capability, action, scope)`, `requireAdminTenantContext`
- Contrato nuevo o modificado: `GET /api/public/login-announcements`, `GET|POST /api/admin/login-announcements`, `PATCH /api/admin/login-announcements/{id}`; reader `listActiveLoginAnnouncements`; commands de creación, edición y cambio de estado.
- Backward compatibility: `compatible`
- Full API parity: la pantalla lee el mismo reader que expone la API pública; crear, editar, publicar y archivar sólo ocurre por los commands, expuestos por la API admin (apta para `propose → confirm → execute` de Nexa).

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.login_announcements`
- Invariantes que no se pueden romper:
  - `kind = 'text'` exige `title`; `kind = 'banner'` exige `image_path` e `image_alt`.
  - Toda novedad con imagen exige `image_alt` (accesibilidad).
  - `ends_at`, si existe, es posterior a `starts_at`.
  - Las coordenadas de la lente (`lens_x`, `lens_y` en porcentaje 0–100, `lens_radius_ratio` 0–1) van juntas o no van.
  - `cta_url` es una ruta relativa (`/…`) o `https://`; nunca `javascript:` ni otro esquema.
  - El reader devuelve como máximo 3 novedades `published` y vigentes, por `priority` descendente y luego `starts_at` descendente.
- Write-target allowlist: `N/A — el dominio no tiene boundary test de destinos de escritura`
- Tenant/space boundary: las novedades son globales del portal (audiencia `all`); la segmentación por organización queda fuera de alcance.
- Idempotency/concurrency: creación con `announcement_id` generado; edición por id con `updated_at`; el cambio de estado es idempotente (repetir el mismo estado no falla).
- Audit/outbox/history: `created_by`/`updated_by` + timestamps en la fila; sin outbox porque ningún consumidor reacciona a eventos.

### Migration, backfill and rollout

- Migration posture: `additive` + `seed` (dos novedades iniciales del prototipo: AI Visibility Report y Globe Studio)
- Default state: `enabled with rationale` — la lectura es pública y sólo muestra lo publicado; sin filas vigentes, el login muestra su foto por defecto.
- Backfill plan: sin backfill.
- Rollback path: `Down` de la migración elimina tabla y capability; revert del PR.
- External coordination: aplicar la migración en la instancia compartida requiere confirmación del operador.

### Security and access

- Auth/access gate: lectura pública sin sesión (sólo campos de presentación); escritura con sesión de administrador y capability `login_announcements.manage` (`create`, `update`).
- Sensitive data posture: sin datos sensibles; contenido de marketing público.
- Error contract: `invalid_request`, `forbidden`, `unauthorized`, `internal_error` por `canonicalErrorResponse`; errores de dominio `LoginAnnouncementError` mapeados.
- Abuse/rate-limit posture: la API pública responde con `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`; no acepta parámetros.

### Runtime evidence

- Local checks: tests unitarios de validación de commands y de selección del reader (`src/lib/login-announcements/*.test.ts`).
- DB/runtime checks: `pnpm migrate:up` en staging + `SELECT` de las filas seed.
- Integration checks: `GET /api/public/login-announcements` devuelve las dos novedades seed.
- Reliability signals/logs: `captureWithDomain` con `domain=platform`, tag `surface=login-announcements`.
- Production verification sequence: migración en staging → smoke API pública → login staging muestra novedades → producción con el release.

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — Migración y capability

- Tabla `greenhouse_core.login_announcements` con checks de invariantes e índice de vigencia.
- Seed de dos novedades publicadas y de la capability `login_announcements.manage` en `capabilities_registry`.
- Catálogo TS y grant a `efeonce_admin`, `efeonce_account` y `efeonce_operations`.

### Slice 2 — Reader y commands

- `src/lib/login-announcements/types.ts`, `validation.ts`, `reader.ts`, `commands.ts` con tests.

### Slice 3 — API

- Ruta pública de lectura y rutas admin de listado, creación y edición/cambio de estado.

## Out of Scope

- La UI del login (TASK-1964).
- Segmentación por organización, idioma o rol; métricas de clics.
- Subida de imágenes: `image_path` referencia un asset ya publicado en `public/` o un asset gobernado.
- Una pantalla de administración de novedades (follow-up).

## Detailed Spec

```sql
CREATE TABLE greenhouse_core.login_announcements (
  announcement_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('text','banner')),
  service_line text NOT NULL CHECK (service_line IN ('growth','brand','engine','voice','revenue-hubspot','revenue-salesforce','greenhouse')),
  tab_label text NOT NULL,
  kicker text, title text, body text,
  cta_label text, cta_url text,
  image_path text, image_alt text,
  lens_x numeric(5,2), lens_y numeric(5,2), lens_radius_ratio numeric(4,3),
  priority integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  starts_at timestamptz NOT NULL DEFAULT now(), ends_at timestamptz,
  created_by text NOT NULL, updated_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
```

DTO público: `{ id, kind, serviceLine, tabLabel, kicker, title, body, cta: { label, url } | null, image: { path, alt } | null, lens: { x, y, radiusRatio } | null }`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3. El reader no se publica en la UI (TASK-1964) hasta que la migración esté aplicada en el ambiente; si la tabla no existe, el reader devuelve lista vacía y registra el error.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Login falla si la consulta falla | UI | low | el reader captura el error y devuelve `[]`; el login nunca depende de las novedades | `captureWithDomain platform surface=login-announcements` |
| Novedad con enlace inseguro | UI | low | validación de `cta_url` (relativa o https) en command y check en DB | test de validación |
| Contenido no aprobado publicado | content | medium | estado `draft` por defecto; publicar exige capability | revisión del operador |

### Feature flags / cutover

- Sin flag — additive: la tabla y la API no cambian ningún comportamiento existente hasta que TASK-1964 consume el reader; sin filas vigentes el login muestra su foto por defecto.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `pnpm migrate:down` (elimina tabla y depreca capability) + revert | < 10 min | sí |
| Slice 2 | revert PR | < 10 min | sí |
| Slice 3 | revert PR | < 10 min | sí |

### Production verification sequence

1. `pnpm migrate:up` en staging y `SELECT` de las filas seed.
2. `GET /api/public/login-announcements` en staging devuelve dos novedades.
3. Login de staging muestra el carrusel (TASK-1964).
4. Repetir en producción con el release.

### Out-of-band coordination required

- Confirmación del operador para aplicar la migración en la instancia compartida; reemplazo de las fotos de referencia por fotos producidas antes de producción (bloqueo de release compartido con TASK-1964).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La migración crea `greenhouse_core.login_announcements` con los checks de invariantes, siembra dos novedades y la capability, y su `Down` revierte ambas. (Up verificado con SELECT el 2026-10-02; el `Down` no se ejecutó.)
- [ ] `listActiveLoginAnnouncements` devuelve como máximo 3 novedades `published` y vigentes, ordenadas por prioridad, y `[]` ante error de base de datos.
- [ ] `GET /api/public/login-announcements` responde sin sesión con el DTO público y cabeceras de caché.
- [ ] Crear/editar/cambiar estado exige `login_announcements.manage` y responde `forbidden` sin ella.
- [ ] La capability está en el catálogo TS, en el registry y concedida a `efeonce_admin`, `efeonce_account` y `efeonce_operations`.
- [x] Tests de validación y selección pasan.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test src/lib/login-announcements`
- `pnpm migrate:up` en staging + smoke de la API pública

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Migración aplicada en staging con evidencia del `SELECT`.

## Follow-ups

- Pantalla de administración de novedades en el portal (consumer de la API admin).
- Segmentación por organización/servicio contratado para cross selling dirigido.
- Métrica de clics por novedad.

## Open Questions

- ¿Qué roles, además de administración, cuentas y operaciones, deben poder publicar novedades (por ejemplo marketing)?
