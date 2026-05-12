# Greenhouse Client Portal Domain Architecture V1

> **Version:** 1.4
> **Created:** 2026-05-07 por Claude (Opus 4.7)
> **Updated:** 2026-05-12 por Claude (Opus 4.7) — V1.1 (§3.1 + §3.2 TASK-822), V1.2 (§5.1 rename TASK-824 verdict), V1.3 (§5.2 + §5.3 type/FK drift post-PG-discovery), V1.4 (§5.5 seed contract: view_codes + capabilities son FORWARD-LOOKING en V1.0; parity strict SOLO para data_sources — view_codes parity y capabilities parity son responsabilidad downstream de TASK-826/827 cuando materialicen los catalogs faltantes)
> **Audience:** Backend engineers, frontend engineers, product owners, comerciales que vendan módulos del portal cliente, agentes que toquen rutas `/api/client-portal/*`, owners de Globe/Wave/CRM Solutions
> **Related:** `GREENHOUSE_360_OBJECT_MODEL_V1.md`, `GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` (V3.0, descriptivo — predecesor), `GREENHOUSE_CLIENT_LIFECYCLE_V1.md`, `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`, `GREENHOUSE_AGENCY_LAYER_V2.md`, `GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1.md`, `GREENHOUSE_FEATURE_FLAGS_ROLLOUT_PLATFORM_V1.md`
> **Supersedes:** este spec NO supersede `GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` V3.0 — coexisten: V3.0 describe la experiencia funcional y los 16 cards Creative Hub; este V1 (Domain) canoniza la **estructura del dominio** y el modelo de módulos on-demand. V3.0 sigue siendo lectura obligatoria para entender qué se compone.

---

## 0. Status

Contrato arquitectónico nuevo desde 2026-05-07.

Estado actual del repo:

- `client` existe como `RouteGroup` canónico desde TASK-535 + roles dedicados (`CLIENT_EXECUTIVE/MANAGER/SPECIALIST`)
- Spec funcional `GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` V3.0 describe Creative Hub Globe (16 cards), CRM Solutions (transición a Kortex), Wave (baja madurez)
- Lógica del portal cliente vive distribuida: `src/lib/agency/`, `src/lib/account-360/`, `src/lib/ico-engine/`, etc.
- NO existe `src/lib/client-portal/` carpeta canónica
- NO existe `/api/client-portal/` namespace
- NO existe schema `greenhouse_client_portal`
- NO existe modelo de módulos on-demand (la diferenciación per-cliente hoy es vía `tenant_capabilities.businessLines/serviceModules` que viene de HubSpot, hardcoded en componentes)

Este spec canoniza **dominio compositivo de primer nivel** + **catálogo declarativo de módulos** + **assignment per-cliente time-versioned** + **resolver canónico** + **cascade desde Client Lifecycle V1**.

---

## 1. Core Thesis

`Client Portal` es un **dominio compositivo, no productor**. Sus tablas owned son catálogo + assignments + audit. NUNCA duplica datos primarios (ICO, invoices, team_assignments, engagement_phases) — esos viven en `agency`, `commercial`, `finance`, `delivery`. El portal cliente es la **vista compuesta + orquestada** sobre esos datos, gateada por entitlements derivados de módulos asignados al cliente.

Por lo tanto:

- `tenant_capabilities` (HubSpot-derived) sigue siendo input legacy para resolver módulos; NO lo reemplazamos en V1.0
- `agency`, `commercial`, `finance`, `delivery` siguen siendo los productores de datos; el portal cliente los consume
- la diferenciación per-cliente vive en `client_portal_module_assignments` (time-versioned)
- el menú, las page guards y los API endpoints client-facing leen del **resolver canónico**, NUNCA de `tenant_type` o `businessLines` directo
- la asignación de módulos cascadea desde `client.lifecycle.case.completed` (kind=onboarding/offboarding/reactivation) — no se gestionan a mano fuera del lifecycle

---

## 2. Problem Statement

Hoy el portal cliente tiene 3 problemas estructurales:

1. **Sin ownership claro de dominio**: la lógica vive distribuida sin carpeta canónica `src/lib/client-portal/`. Cualquier cambio cross-cutting (e.g. "agreguemos un nuevo card al Creative Hub") requiere tocar 5+ archivos en 3 dominios distintos.

2. **Sin modelo de módulos on-demand**: la diferenciación per-cliente es binaria (`tenant_type='client'`) o vía `businessLines[]` que viene de HubSpot. Cliente Globe ve los 16 cards Creative Hub hardcoded; cliente CRM ve otra cosa hardcoded. Si un cliente Globe quiere comprar el `roi_reports` addon, no hay forma operativa de habilitarlo selectivamente sin deploy.

3. **Sin cascade comercial→portal**: el `engagement_commercial_terms` declara qué pricing kind tiene un servicio (TASK-802), pero NO declara qué módulos del portal cliente están bundled. Al completar onboarding, el operador comercial debe configurar el portal a mano (que en la práctica significa: "se activa todo lo que correspondería a la business_line").

Consecuencias del gap actual:

- imposible vender módulos addon sin deploy
- imposible pilots/trials de un módulo individual
- portal de cliente Globe enterprise vs Globe SMB son idénticos (no hay tiering)
- Creative Hub Globe es un monolito de 16 cards — no se puede vender "Brand Intelligence" sin "CSC Pipeline"
- onboarding completion no provisiona automáticamente lo que el cliente compró
- offboarding no de-provisiona — el portal queda accesible aunque el cliente esté `inactive`

---

## 3. Domain Boundary

| Dominio | Authority | Notes |
|---|---|---|
| Identidad organización | `greenhouse_core.organizations` (TASK-535) | Anchor canónico |
| Cliente financiero | `greenhouse_core.clients` (TASK-535) | Estado `active`/`inactive` |
| Servicios + engagement | `services` + `engagement_commercial_terms` (TASK-801/802) | Source of truth de qué compró el cliente |
| Lifecycle del cliente | `client_lifecycle_cases` (TASK-816) | Trigger de cascade a módulos |
| **Catálogo de módulos** | `greenhouse_client_portal.modules` (este spec) | Catálogo declarativo |
| **Asignación per cliente** | `greenhouse_client_portal.module_assignments` (este spec) | Time-versioned |
| **Audit assignment** | `greenhouse_client_portal.module_assignment_events` (este spec) | Append-only |
| Datos productores | `agency.*`, `commercial.*`, `finance.*`, `delivery.*` | NO duplicar — referenciar |
| Authorization fina | Capabilities platform (TASK-403) | Cada módulo declara sus capabilities |
| View governance | `authorized_views` + `view_codes` (TASK-136) | Cada módulo declara sus view_codes |
| Feature flags variantes | `home_rollout_flags` (TASK-780) | Distinto: ese es shell variant; este es product entitlement |

**Ownership**: `client_portal` es dominio nuevo de primer nivel **compositivo (BFF / Anti-Corruption Layer del route group `client`)**. Owner técnico inicial: efeonce-account. Sentry domain: `client_portal`.

---

## 3.1 Module classification: curated vs native (TASK-822)

`src/lib/client-portal/` es un **BFF**. Los readers que expone se clasifican en dos categorías mutuamente excluyentes:

| Classification | Carpeta | Semántica | Ownership canónica | Ejemplos V1.0 |
|---|---|---|---|---|
| `curated` | `readers/curated/` | Re-export puro de un reader que vive en un dominio productor. Firma exacta, cero adaptation. | Permanece en el dominio productor (`account-360`, `agency`, `ico-engine`). Si la firma upstream cambia, este re-export refleja el cambio automáticamente. | `getClientAccountSummary` (owner `account-360`), readers de Creative Hub (owner `agency`), métricas ICO (owner `ico-engine`) |
| `native` | `readers/native/` | Nace en `client-portal` porque no tiene owner previo en otro dominio. Owns su firma. | `client_portal` | `resolveClientPortalModulesForOrganization` (TASK-825), composition helpers, BFF-specific shaping |

**Reglas duras**:

- **NUNCA** mover físicamente un reader de su dominio owner a `readers/curated/`. La curated layer es un puntero, NO una mudanza. Si emerge la tentación de "consolidar el código acá", el reader probablemente NO es client-portal-specific y debe quedarse donde está.
- **NUNCA** clasificar como `curated` un reader que aplica thin adaptation (e.g. agrega un parámetro `clientPortalContext`). Si adapta, es `native` con `ownerDomain` documentando la fuente original.
- **NUNCA** mezclar dimensiones: `classification` (curated/native) y `ownerDomain` son ortogonales. Curated siempre tiene `ownerDomain` no-null; native siempre tiene `ownerDomain` null.
- **SIEMPRE** que un reader native emerja, evaluar primero si pertenece a un dominio productor existente. Default: empujar al dominio productor; native solo cuando el dato NO tiene dominio natural (e.g. el resolver del catálogo de módulos pertenece nativamente a `client_portal` porque el catálogo es owned por `client_portal`).

**Metadata canónica obligatoria** (TASK-822 Slice 1):

```ts
// src/lib/client-portal/dto/reader-meta.ts
export interface ClientPortalReaderMeta {
  readonly key: string                                // identifier estable
  readonly classification: 'curated' | 'native'
  readonly ownerDomain: string | null                 // 'account-360' | 'agency' | ... | null si native
  readonly dataSources: readonly ClientPortalDataSource[]
  readonly clientFacing: boolean
  readonly routeGroup: 'client' | 'agency' | 'admin'
}
```

Cada archivo bajo `readers/{curated,native}/` exporta un `*Meta: ClientPortalReaderMeta` tipado. Esto reemplaza la idea original de JSDoc `@dataSources` tags (JSDoc no es machine-checkable; un export TS sí). Compile-checked, grep-able, consumible por TASK-824 catalog validation (parity test entre `ClientPortalDataSource` type union y `modules.data_sources[]` enum DB).

---

## 3.2 Domain import direction (TASK-822, hoja del DAG)

`client_portal` es **hoja del DAG de dominios**. La dirección de imports está enforced.

**Permitido** (`client_portal` consumidor):

```text
src/lib/client-portal/**  →  src/lib/{account-360,agency,ico-engine,commercial,finance,delivery,identity}/**
```

**Prohibido** (`client_portal` productor — anti-pattern):

```text
src/lib/{account-360,agency,ico-engine,commercial,finance,delivery,identity,hr}/**  →  src/lib/client-portal/**
```

**Enforcement** (defense in depth, 3 capas):

1. **ESLint rule canónica** `greenhouse/no-cross-domain-import-from-client-portal` (modo `error`, TASK-822 Slice 3). Bloquea el commit. Override block en `eslint.config.mjs` exime `src/lib/client-portal/**` (el módulo puede importarse a sí mismo).
2. **Grep negativo** en code review: `rg "from '@/lib/client-portal" src/lib/{agency,finance,hr,account-360,ico-engine,identity,delivery,commercial}/` debe estar vacío. Verificación adicional cuando la lint rule esté en mantenimiento o se modifique.
3. **Doctrina canonizada** en CLAUDE.md (overlay de Greenhouse) cuando emerja el primer dominio adicional con misma forma (e.g. `partner_portal`, `vendor_portal`) — replica el patrón.

**Reglas duras**:

- **NUNCA** crear un import de `@/lib/client-portal/*` desde un dominio productor. La rule lo bloquea; si emerge la necesidad, el reader que se quiere consumir está en el dominio equivocado (mover al dominio productor) o el consumer está en la capa equivocada (mover al BFF si es client-facing).
- **NUNCA** desactivar la rule per-archivo con `// eslint-disable-next-line`. Si emerge un caso legítimo, agregarlo al override block en `eslint.config.mjs` con comentario justificando.
- **NUNCA** introducir un dominio paralelo que importe `client_portal` "indirectamente" (e.g. dominio nuevo que importa lo que client_portal importa). Eso recrea el ciclo bajo otro nombre.
- **SIEMPRE** que un dominio adicional con shape BFF emerja (partner portal, vendor portal, internal admin portal), reusar este patrón: hoja del DAG + lint rule equivalente + classification curated/native + metadata tipada. NO inventar una primitiva nueva.

---

## 4. Decisions (resolved 2026-05-07 con lens 4-pilar)

| # | Question | Decision | Razón |
|---|---|---|---|
| 1 | Schema home | `greenhouse_client_portal` dedicado | Paridad con payroll/finance/hr; grants per-domain; ownership cleaner |
| 2 | Granularidad inicial Creative Hub Globe | Bundle único `creative_hub_globe_v1` en V1.0; descomposición V2 | Zero breaking change para clientes activos; descomposición con datos reales |
| 3 | Catálogo seed inicial | 10 módulos canonizados (ver §5.5) | Cubre 3 business lines actuales sin fragmentar |
| 4 | Migración legacy | Backfill idempotente con dry-run + reliability signal | Re-runable + audit + escalable |
| 5 | Cliente sin módulos | Estado válido + signal `client_active_without_modules` > 14d | Honest degradation; ops detecta limbo |
| 6 | Linkage con `client_lifecycle_case` | Independientes + acopladas via outbox | Case transitional, assignment persistent — boundary limpio |

---

## 5. Data Model

### 5.1 `greenhouse_client_portal.modules`

Catálogo declarativo de módulos. Append-only (versionable via `effective_to`). NUNCA modificar fila existente excepto `effective_to` (deprecación) o `display_label*` (typo fix operacional).

**Delta V1.2 (2026-05-12, arch-architect verdict TASK-824)**:

- Campo `business_line` (V1.0) renombrado a `applicability_scope` (V1.2). Razón: `GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md` declara explícitamente "no existe enum PostgreSQL duplicado del catalogo" — la source of truth canónica del business_line del 360 es `greenhouse_core.service_modules.module_code WHERE module_kind='business_line'`. El campo en `client_portal.modules` mezcla dimensiones ortogonales (business_lines reales `globe`/`wave`/`crm_solutions` + metavalue `cross` "aplicable a múltiples" + service_module `staff_aug` "dentro de cross") — por lo tanto NO es business_line en sentido canónico. Rename clarifica semántica + COMMENT canónico documenta la distinción para evitar futuro drift.
- Campo `default_for_business_lines` (V1.0 reservado dormido) ELIMINADO V1.2. Razón: YAGNI; campos dormidos son drift latente. Si emerge necesidad real en V1.1+, ADD COLUMN nullable migration — cero costo aplazar.
- Whitelist de `data_sources[]`: V1.0 no especificaba enforcement; V1.2 adopta **Option C — parity test live TS↔DB** (mismo patrón TASK-611 `capabilities_registry`). NO se introduce CHECK constraint sobre `data_sources[]` con array literal hardcodeado (drift latente cada vez que `ClientPortalDataSource` TS union se extienda). Si el catalog crece > 30 values en V1.1+, migrar a Option B (registry table dedicada).

```sql
CREATE SCHEMA IF NOT EXISTS greenhouse_client_portal;

CREATE TABLE greenhouse_client_portal.modules (
  module_key         TEXT PRIMARY KEY,
                                    -- 'creative_hub_globe_v1','equipo_asignado','pulse','roi_reports', etc.
  display_label      TEXT NOT NULL,                    -- 'Creative Hub' (es-CL operator-facing)
  display_label_client TEXT NOT NULL,                  -- 'Tu Creative Hub' (cliente-facing, tono cálido)
  description        TEXT,
  applicability_scope TEXT NOT NULL
                     CHECK (applicability_scope IN ('globe','wave','crm_solutions','staff_aug','cross')),
                                    -- V1.2 rename desde 'business_line'. Ver COMMENT más abajo.
  tier               TEXT NOT NULL
                     CHECK (tier IN ('standard','addon','pilot','enterprise','internal')),

  view_codes         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
                                    -- referencias a authorized_views.view_code (TASK-136). Parity test live verifica drift.
  capabilities       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
                                    -- capabilities del entitlements platform (TASK-403). Parity test live verifica drift.
  data_sources       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
                                    -- whitelist de dominios productores: 'agency.ico','commercial.engagements','finance.invoices','delivery.tasks','assigned_team',etc. Parity test live TS↔DB (Option C) verifica drift contra ClientPortalDataSource type union de src/lib/client-portal/dto/reader-meta.ts. NO hay CHECK constraint con array literal hardcodeado (drift latente).

  pricing_kind       TEXT NOT NULL
                     CHECK (pricing_kind IN ('bundled','addon_fixed','addon_usage','pilot_no_cost','pilot_success_fee','enterprise_custom')),

  effective_from     DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to       DATE,
  metadata_json      JSONB DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

COMMENT ON COLUMN greenhouse_client_portal.modules.applicability_scope IS
  'Categoría de aplicabilidad del módulo dentro del dominio client_portal. NO es FK al business_line canónico del 360 (greenhouse_core.service_modules.module_code WHERE module_kind=''business_line''). Mezcla dimensiones ortogonales: business_lines reales (globe, wave, crm_solutions), metavalue cross=aplicable-a-múltiples, y service_module staff_aug=dentro-de-cross. Para resolver el business_line canónico del cliente consumidor, usar greenhouse_core.business_line_metadata. Hard rule canonizada en GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md: NO duplicar enum del catalogo.';

CREATE INDEX modules_applicability_scope ON greenhouse_client_portal.modules (applicability_scope) WHERE effective_to IS NULL;
CREATE INDEX modules_tier ON greenhouse_client_portal.modules (tier) WHERE effective_to IS NULL;

-- Append-only triggers
CREATE OR REPLACE FUNCTION greenhouse_client_portal.modules_no_update_breaking() RETURNS trigger AS $$
BEGIN
  -- Solo se permite UPDATE de effective_to (deprecación) y display_label* (typo fix)
  IF NEW.module_key != OLD.module_key OR NEW.applicability_scope != OLD.applicability_scope
     OR NEW.tier != OLD.tier OR NEW.view_codes != OLD.view_codes
     OR NEW.capabilities != OLD.capabilities OR NEW.data_sources != OLD.data_sources
     OR NEW.pricing_kind != OLD.pricing_kind OR NEW.effective_from != OLD.effective_from THEN
    RAISE EXCEPTION 'modules.* fields are append-only after creation; create new module_key version instead';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER modules_append_only_check
  BEFORE UPDATE ON greenhouse_client_portal.modules
  FOR EACH ROW EXECUTE FUNCTION greenhouse_client_portal.modules_no_update_breaking();
```

**Parity test live canónico (V1.2)**: `src/lib/client-portal/data-sources/parity.{ts,live.test.ts}` — replica shape de TASK-611 `capabilities_registry`. Lee seed DB y compara los 3 arrays (`data_sources` + `view_codes` + `capabilities`) contra TS sources of truth (`ClientPortalDataSource` union + `VIEW_REGISTRY` + `entitlements-catalog`). Falla loud (rompe build) si emerge drift TS↔DB. CI gate corre en lane con PG config; `describe.skipIf(!hasPgConfig)` permite lint-only runs locales.

### 5.2 `greenhouse_client_portal.module_assignments`

Asignación per-cliente time-versioned. Una fila por (organization_id, module_key) activa.

**Delta V1.3 (2026-05-12, PG discovery TASK-824)**: `organization_id` cambia de UUID a TEXT (la tabla `greenhouse_core.organizations.organization_id` es TEXT en runtime, verificado live). FK `approved_by_user_id` apunta a `greenhouse_core.client_users(user_id)` (la tabla canónica de usuarios autenticados; `greenhouse_core.users` no existe).

```sql
CREATE TABLE greenhouse_client_portal.module_assignments (
  assignment_id     TEXT PRIMARY KEY,                  -- 'cpma-{uuid}'
  organization_id   TEXT NOT NULL REFERENCES greenhouse_core.organizations(organization_id),
  module_key        TEXT NOT NULL REFERENCES greenhouse_client_portal.modules(module_key),

  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','active','paused','expired','pilot','churned')),
                                                       -- pilot: trial activo con expiry; pending: enabled pero antes de effective_from; churned: post-offboarding

  source            TEXT NOT NULL
                    CHECK (source IN ('lifecycle_case_provision','commercial_terms_cascade','manual_admin','self_service_request','migration_backfill','default_business_line')),
  source_ref_json   JSONB DEFAULT '{}'::jsonb,         -- { caseId, termsId, actorUserId, ... }

  effective_from    DATE NOT NULL,
  effective_to      DATE,
  expires_at        TIMESTAMPTZ,                       -- para pilot/trial con timeout

  approved_by_user_id TEXT REFERENCES greenhouse_core.client_users(user_id),
  approved_at         TIMESTAMPTZ,

  metadata_json     JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (effective_to IS NULL OR effective_to > effective_from),
  CHECK (status != 'pilot' OR expires_at IS NOT NULL)
);

-- Solo un assignment activo por (org, module)
CREATE UNIQUE INDEX module_assignments_one_active
  ON greenhouse_client_portal.module_assignments (organization_id, module_key)
  WHERE effective_to IS NULL;

CREATE INDEX module_assignments_org ON greenhouse_client_portal.module_assignments (organization_id) WHERE effective_to IS NULL;
CREATE INDEX module_assignments_module ON greenhouse_client_portal.module_assignments (module_key) WHERE effective_to IS NULL;
CREATE INDEX module_assignments_status ON greenhouse_client_portal.module_assignments (status) WHERE effective_to IS NULL AND status NOT IN ('expired','churned');
CREATE INDEX module_assignments_expires_at ON greenhouse_client_portal.module_assignments (expires_at) WHERE expires_at IS NOT NULL AND status = 'pilot';
```

### 5.3 `greenhouse_client_portal.module_assignment_events`

Audit append-only. Anti-UPDATE/DELETE triggers.

**Delta V1.3 (2026-05-12, PG discovery TASK-824)**: FK `actor_user_id` apunta a `greenhouse_core.client_users(user_id)` — misma corrección del §5.2.

```sql
CREATE TABLE greenhouse_client_portal.module_assignment_events (
  event_id         TEXT PRIMARY KEY,                   -- 'cpmae-{uuid}'
  assignment_id    TEXT NOT NULL REFERENCES greenhouse_client_portal.module_assignments(assignment_id),
  event_kind       TEXT NOT NULL,
                    -- 'enabled','status_changed','expired','paused','resumed','churned','reason_updated','migrated'
  from_status      TEXT,
  to_status        TEXT,
  payload_json     JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id    TEXT NOT NULL REFERENCES greenhouse_core.client_users(user_id),
  occurred_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX module_assignment_events_assignment ON greenhouse_client_portal.module_assignment_events (assignment_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION greenhouse_client_portal.assignment_events_no_update() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'module_assignment_events is append-only'; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_update_on_assignment_events BEFORE UPDATE ON greenhouse_client_portal.module_assignment_events FOR EACH ROW EXECUTE FUNCTION greenhouse_client_portal.assignment_events_no_update();
CREATE TRIGGER prevent_delete_on_assignment_events BEFORE DELETE ON greenhouse_client_portal.module_assignment_events FOR EACH ROW EXECUTE FUNCTION greenhouse_client_portal.assignment_events_no_update();
```

### 5.4 Extension a `engagement_commercial_terms` (TASK-802 extend)

Para que el commercial terms declare qué módulos vienen bundled con el servicio:

```sql
ALTER TABLE greenhouse_commercial.engagement_commercial_terms
  ADD COLUMN bundled_modules TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN greenhouse_commercial.engagement_commercial_terms.bundled_modules IS
  'Module keys del catálogo greenhouse_client_portal.modules que están incluidos en este pricing. Cascade al completar onboarding case (TASK-828). FK lógica vía outbox (NO physical FK por boundary cross-schema).';
```

### 5.5 Seed inicial — 10 módulos canónicos V1.0

NOTA V1.2: la columna `business_line` fue renombrada a `applicability_scope` (ver §5.1 Delta V1.2). Los valores siguen idénticos (rename puro, no cambio semántico de los seeds).

**Delta V1.4 (2026-05-12, post-PG-discovery TASK-824)**: los `view_codes[]` y `capabilities[]` declarados en los 10 seeds son **forward-looking**. Verificación live 2026-05-12:

- De los 16 `view_codes` referenciados, solo 4 existen hoy en `VIEW_REGISTRY` (`cliente.pulse`, `cliente.proyectos`, `cliente.equipo`, `cliente.campanas`). Los 11 restantes (`cliente.creative_hub`, `cliente.reviews`, `cliente.roi_reports`, `cliente.exports`, `cliente.cvr_quarterly`, `cliente.staff_aug`, `cliente.brand_intelligence`, `cliente.csc_pipeline`, `cliente.crm_command`, `cliente.web_delivery`, `cliente.home`) los materializa TASK-827 (UI composition layer).
- De los 12 `capabilities` referenciados, solo `client_portal.workspace` existe hoy en `entitlements-catalog`. Los 11 restantes (`client_portal.creative_hub.read`, `client_portal.csc_pipeline.read`, `client_portal.brand_intelligence.read`, `client_portal.cvr.read`, `client_portal.cvr.export`, `client_portal.roi.read`, `client_portal.exports.generate`, `client_portal.assigned_team.read`, `client_portal.pulse.read`, `client_portal.staff_aug.read`, `client_portal.crm_command.read`, `client_portal.web_delivery.read`) los materializa TASK-826 (admin endpoints + capabilities granulares).

Contract canónico de parity tests:

- **`data_sources[]` strict parity (TASK-824, esta task)**: el TS union `ClientPortalDataSource` de TASK-822 es source of truth; parity test live rompe build si seed DB ↔ TS union diverge.
- **`view_codes[]` strict parity (TASK-827)**: cuando TASK-827 materialice los view_codes faltantes en `VIEW_REGISTRY`, agrega SU propio parity test que valida que los seeds de TASK-824 sean consumidos correctamente.
- **`capabilities[]` strict parity (TASK-826)**: cuando TASK-826 materialice las capabilities faltantes en `entitlements-catalog`, agrega SU propio parity test análogo.

Cada task posee la parity de SU catalog. Sin chicken-and-egg blocking.

```sql
-- Globe (3)
INSERT INTO greenhouse_client_portal.modules (module_key, display_label, display_label_client, applicability_scope, tier, view_codes, capabilities, data_sources, pricing_kind) VALUES
('creative_hub_globe_v1', 'Creative Hub Globe (Bundle)', 'Tu Creative Hub', 'globe', 'standard',
  ARRAY['cliente.pulse','cliente.proyectos','cliente.campanas','cliente.creative_hub','cliente.equipo','cliente.reviews'],
  ARRAY['client_portal.creative_hub.read','client_portal.csc_pipeline.read','client_portal.brand_intelligence.read','client_portal.cvr.read'],
  ARRAY['agency.ico','commercial.engagements','delivery.tasks','agency.csc','agency.brand_intelligence'],
  'bundled'),
('roi_reports', 'ROI Reports + Exports', 'Reportes de impacto + exports', 'globe', 'enterprise',
  ARRAY['cliente.roi_reports','cliente.exports'],
  ARRAY['client_portal.roi.read','client_portal.exports.generate'],
  ARRAY['agency.revenue_enabled','finance.invoices','commercial.engagements'],
  'addon_fixed'),
('cvr_quarterly', 'Creative Velocity Review trimestral', 'Tu CVR trimestral', 'globe', 'addon',
  ARRAY['cliente.cvr_quarterly'],
  ARRAY['client_portal.cvr.read','client_portal.cvr.export'],
  ARRAY['agency.ico','agency.csc','agency.brand_intelligence'],
  'addon_fixed');

-- Cross-line (3)
INSERT INTO greenhouse_client_portal.modules (module_key, display_label, display_label_client, applicability_scope, tier, view_codes, capabilities, data_sources, pricing_kind) VALUES
('equipo_asignado', 'Equipo Asignado', 'Tu equipo', 'cross', 'standard',
  ARRAY['cliente.equipo'],
  ARRAY['client_portal.assigned_team.read'],
  ARRAY['assigned_team','agency.ico'],
  'bundled'),
('pulse', 'Pulse (landing)', 'Pulse', 'cross', 'standard',
  ARRAY['cliente.pulse','cliente.home'],
  ARRAY['client_portal.pulse.read'],
  ARRAY['agency.ico','commercial.engagements'],
  'bundled'),
('staff_aug_visibility', 'Staff Augmentation Visibility', 'Tu Staff Augmentation', 'staff_aug', 'standard',
  ARRAY['cliente.staff_aug'],
  ARRAY['client_portal.staff_aug.read'],
  ARRAY['staff_aug.placements','assigned_team'],
  'bundled');

-- Globe addons (2)
INSERT INTO greenhouse_client_portal.modules (module_key, display_label, display_label_client, applicability_scope, tier, view_codes, capabilities, data_sources, pricing_kind) VALUES
('brand_intelligence', 'Brand Intelligence (RpA + First-Time Right)', 'Tu Brand Intelligence', 'globe', 'addon',
  ARRAY['cliente.brand_intelligence'],
  ARRAY['client_portal.brand_intelligence.read'],
  ARRAY['agency.brand_intelligence'],
  'addon_fixed'),
('csc_pipeline', 'Creative Supply Chain Pipeline', 'Tu CSC Pipeline', 'globe', 'addon',
  ARRAY['cliente.csc_pipeline'],
  ARRAY['client_portal.csc_pipeline.read'],
  ARRAY['agency.csc'],
  'addon_fixed');

-- Otros applicability_scope (2)
INSERT INTO greenhouse_client_portal.modules (module_key, display_label, display_label_client, applicability_scope, tier, view_codes, capabilities, data_sources, pricing_kind) VALUES
('crm_command_legacy', 'CRM Command (legacy, transición a Kortex)', 'Tu CRM Command', 'crm_solutions', 'standard',
  ARRAY['cliente.crm_command'],
  ARRAY['client_portal.crm_command.read'],
  ARRAY['commercial.engagements','crm.deals'],
  'bundled'),
('web_delivery', 'Web Delivery (Wave)', 'Tu Web Delivery', 'wave', 'standard',
  ARRAY['cliente.web_delivery'],
  ARRAY['client_portal.web_delivery.read'],
  ARRAY['delivery.tasks','commercial.engagements'],
  'bundled');
```

### 5.6 Future-proof reserved module keys (no materializar V1.0)

Lista canónica reservada para próximas iteraciones. NO crear filas hasta que comercial confirme:

- `creative_hub_globe_v2_atomic` — descomposición de V1 en 16 módulos atómicos (V2)
- `industry_benchmark_globe` — datos cross-tenant sectoriales (V2, requires data anonymization platform)
- `pulse_premium` — addon Pulse con KPIs avanzados
- `executive_quarterly_summary` — auto-generated QBR
- `client_self_service_admin` — cliente gestiona sus propios users (V1.2)

---

## 6. Resolver Canonical (the most important contract)

```ts
// src/lib/client-portal/modules/resolver.ts

export interface ResolvedClientPortalModule {
  moduleKey: string
  displayLabel: string
  displayLabelClient: string
  businessLine: string
  tier: string
  viewCodes: string[]
  capabilities: string[]
  dataSources: string[]
  status: 'active' | 'pilot' | 'paused' | 'pending'
  source: AssignmentSource
  expiresAt: string | null
}

export async function resolveClientPortalModulesForOrganization(
  organizationId: string,
  options?: { includePending?: boolean; asOf?: Date }
): Promise<ResolvedClientPortalModule[]>
```

Comportamiento canónico:

1. Lee `module_assignments` con `effective_to IS NULL OR effective_to > asOf`
2. Filtra por `status IN ('active','pilot')` (default) o incluye `pending` si flag opt-in
3. JOIN con `modules` activos (`effective_to IS NULL`)
4. Dedupe por `module_key` (UNIQUE partial garantiza un activo, pero defensive)
5. Cache TTL 60s in-process per organization_id (TTL configurable)
6. Cero side-effects; pura lectura

**Toda surface client-facing consume el resolver. NUNCA lee `tenant_capabilities`, `business_line`, ni `tenant_type` directo para decidir visibilidad.**

Helpers derivados:

```ts
hasModuleAccess(orgId, moduleKey): Promise<boolean>
hasViewCodeAccess(orgId, viewCode): Promise<boolean>
hasCapabilityViaModule(orgId, capability): Promise<boolean>
```

---

## 7. Canonical Commands

```ts
// src/lib/client-portal/commands/

enableClientPortalModule({
  organizationId, moduleKey, status,
  source, sourceRefJson?, effectiveFrom, expiresAt?,
  approvedByUserId, reason?
}, client?): Promise<{ assignmentId, status }>

pauseClientPortalModule({ assignmentId, reason, actorUserId }): Promise<...>
resumeClientPortalModule({ assignmentId, reason, actorUserId }): Promise<...>
expireClientPortalModule({ assignmentId, reason, actorUserId, effectiveTo }): Promise<...>
churnClientPortalModule({ assignmentId, reason, actorUserId }): Promise<...>

migrateClientPortalAssignmentsFromLegacy({
  dryRun: boolean,
  organizationIds?: string[]
}): Promise<{ proposedAssignments[], driftDetected[] }>
```

Reglas canónicas:

- Atomic via `withTransaction`
- Idempotency: si existe assignment activo con mismo `(orgId, moduleKey)` y mismo `status`, devolver el existente (no error)
- Audit append-only en cada cambio de status
- Outbox event v1 en cada transición
- Reason redacted via `redactSensitive` antes de logs
- `migrateClientPortalAssignmentsFromLegacy` con `dryRun=true` por default; producción requiere flag explícito + EFEONCE_ADMIN

---

## 8. Capabilities (granulares)

| Capability | Module | Action | Scope | Allowed |
|---|---|---|---|---|
| `client_portal.module.read_assignment` | client_portal | read | tenant | commercial, finance, operations, EFEONCE_ADMIN |
| `client_portal.module.enable` | client_portal | create | tenant | commercial_admin, EFEONCE_ADMIN |
| `client_portal.module.disable` | client_portal | update | tenant | commercial_admin, EFEONCE_ADMIN |
| `client_portal.module.pause` | client_portal | update | tenant | commercial, finance_admin, EFEONCE_ADMIN |
| `client_portal.module.override_business_line_default` | client_portal | override | tenant | EFEONCE_ADMIN solo |
| `client_portal.catalog.manage` | client_portal | manage | global | EFEONCE_ADMIN solo |
| `client_portal.assignment.migrate_legacy` | client_portal | migrate | global | EFEONCE_ADMIN solo |

Por **módulo asignado**, las capabilities declaradas en `modules.capabilities[]` se grant-ean implícitamente al cliente (CLIENT_EXECUTIVE/MANAGER/SPECIALIST) — el resolver compone el set efectivo.

---

## 9. API Surface

```
GET    /api/client-portal/modules
       → resolver para session.user.organization_id (cliente self-service)

GET    /api/admin/client-portal/organizations/[orgId]/modules
       → lista assignments + history (admin lane)

POST   /api/admin/client-portal/organizations/[orgId]/modules
       → enable módulo (capability client_portal.module.enable)

PATCH  /api/admin/client-portal/assignments/[assignmentId]
       → pause/resume/expire (capability per status target)

DELETE /api/admin/client-portal/assignments/[assignmentId]
       → churn (capability client_portal.module.disable; sets effective_to)

GET    /api/admin/client-portal/catalog
POST   /api/admin/client-portal/catalog
       → catalog management (EFEONCE_ADMIN solo)

POST   /api/admin/client-portal/migration/backfill
       → migrateClientPortalAssignmentsFromLegacy (dry-run default)

GET    /api/admin/client-portal/health
       → contract platform-health.v1 extension
```

---

## 10. Outbox Events (versionados v1)

| Event | Trigger | Payload | Consumers |
|---|---|---|---|
| `client.portal.module.assignment.created` | enableClientPortalModule | `{assignmentId, organizationId, moduleKey, status, source, effectiveFrom, expiresAt?}` | UI cliente refresh, BQ projection, audit |
| `client.portal.module.assignment.status_changed` | pause/resume/expire | `{assignmentId, fromStatus, toStatus, reason}` | UI, BQ |
| `client.portal.module.assignment.churned` | churn | `{assignmentId, organizationId, moduleKey, churnedReason}` | UI, BQ, downstream cleanup |
| `client.portal.catalog.module.declared` | catalog INSERT | `{moduleKey, businessLine, tier, viewCodes, capabilities}` | UI catalog refresh |
| `client.portal.catalog.module.deprecated` | catalog effective_to set | `{moduleKey, deprecatedAt}` | reliability signal |
| `client.portal.migration.legacy_backfill.completed` | migration command | `{dryRun, proposedCount, appliedCount, driftCount}` | audit, reliability |

---

## 11. Cascade desde Client Lifecycle V1 (TASK-828)

Reactive consumer registrado en projection registry:

```ts
registerProjection({
  name: 'client_portal_modules_from_lifecycle',
  triggerEvents: ['client.lifecycle.case.completed'],
  domain: 'client_portal',
  refresh: async (event) => {
    const caseRow = await getClientLifecycleCase(event.payload.caseId)
    if (!caseRow) return { status: 'skip' }

    if (caseRow.case_kind === 'onboarding') {
      // Read engagement_commercial_terms.bundled_modules for active services of this org
      const bundledModules = await getBundledModulesForOrganization(caseRow.organization_id)
      for (const moduleKey of bundledModules) {
        await enableClientPortalModule({
          organizationId: caseRow.organization_id,
          moduleKey,
          source: 'lifecycle_case_provision',
          sourceRefJson: { caseId: caseRow.case_id },
          effectiveFrom: caseRow.effective_date,
          approvedByUserId: caseRow.triggered_by_user_id,
          status: 'active',
        })
      }
    }

    if (caseRow.case_kind === 'offboarding') {
      // Churn all active assignments
      const active = await listActiveAssignments(caseRow.organization_id)
      for (const a of active) {
        await churnClientPortalModule({
          assignmentId: a.assignment_id,
          reason: `Offboarding case completed: ${caseRow.case_id}`,
          actorUserId: caseRow.triggered_by_user_id,
        })
      }
    }

    if (caseRow.case_kind === 'reactivation') {
      // V1.0: re-trigger onboarding flow (operator-driven via reactivation checklist)
      // V1.1: smart restore from previous_case_id
      const bundledModules = await getBundledModulesForOrganization(caseRow.organization_id)
      for (const moduleKey of bundledModules) {
        await enableClientPortalModule({
          organizationId: caseRow.organization_id,
          moduleKey,
          source: 'lifecycle_case_provision',
          sourceRefJson: { caseId: caseRow.case_id, previousCaseId: caseRow.previous_case_id },
          effectiveFrom: caseRow.effective_date,
          approvedByUserId: caseRow.triggered_by_user_id,
          status: 'active',
        })
      }
    }
    return { status: 'completed' }
  },
  maxRetries: 5,
})
```

---

## 12. UI Composition Layer

### 12.1 Menú dinámico cliente

`ClientPortalNavigation` component lee resolver y compone menú con view_codes activos. NUNCA hardcodea menu items per business_line.

```ts
const modules = await resolveClientPortalModulesForOrganization(session.user.organizationId)
const navItems = modules.flatMap(m => m.viewCodes.map(vc => buildNavItemFromViewCode(vc)))
// Dedup, sort, group
```

### 12.2 Page guards

Cada page client-facing valida:

```ts
const allowed = await hasViewCodeAccess(session.user.organizationId, 'cliente.brand_intelligence')
if (!allowed) redirect('/home') // o renderiza empty state honesto
```

### 12.3 Empty states honestos

Cuando un cliente intenta acceder un módulo no asignado:

> "Este módulo (Brand Intelligence) no está activado para tu cuenta. Si quieres conocer más, contacta a tu account manager."
> CTA: "Solicitar acceso" → V1.1 self-service

### 12.4 Admin UI

`/admin/client-portal/organizations/[orgId]/modules` — vista per cliente con: assignments activos, history, CTA enable/pause/expire. Catálogo en `/admin/client-portal/catalog`.

---

## 13. Reliability Signals

Subsystem nuevo: `Client Portal Health` (registrado en `RELIABILITY_REGISTRY`).

| Signal | Kind | Severity | Steady | Detecta |
|---|---|---|---|---|
| `client_portal.assignment.orphan_module_key` | data_quality | error | 0 | assignments con `module_key` no presente en `modules` activos |
| `client_portal.assignment.lifecycle_module_drift` | drift | warning | 0 | clientes con `lifecycle_stage='active_client'` pero zero assignments activos > 14 días |
| `client_portal.cascade.dead_letter` | dead_letter | error | 0 | outbox events `client.portal.*` en dead_letter |
| `client_portal.assignment.business_line_mismatch` | drift | warning | 0 | assignments cuyo módulo declara `applicability_scope` distinto al business_line canónico de la organización (excepto cuando `applicability_scope='cross'` que es aplicable a múltiples) |
| `client_portal.assignment.pilot_expired_not_actioned` | drift | warning | 0 | pilots con `expires_at < now()` y `status='pilot'` (no transitioned a active/churned) |
| `client_portal.assignment.churned_with_active_session` | drift | error | 0 | client_users con session activa cuya org tiene `lifecycle_stage='inactive'/'churned'` y assignments con `status != 'churned'` |

---

## 14. Defense in Depth (7 layers)

| Layer | Mechanism |
|---|---|
| 1. DB constraints | CHECK status enum, CHECK source enum, CHECK pilot requires expires_at, UNIQUE partial active per (org,module), FK integrity, append-only triggers |
| 2. Application guard | Capability checks server-side, idempotency via UNIQUE partial, redaction de reasons |
| 3. UI affordance | Botones desactivados según status, tooltip explica, evidence opt-in para reasons sensibles |
| 4. Reliability signals | 6 signals listed §13 |
| 5. Audit log | `module_assignment_events` append-only con anti-UPDATE/DELETE triggers |
| 6. Approval workflow | `override_business_line_default` capability EFEONCE_ADMIN-only + reason ≥ 20 chars |
| 7. Outbox events v1 | Cascade async con dead_letter; consumers idempotentes |

---

## 15. 4-Pilar Score

### Safety
- **Qué puede salir mal**: enable módulo addon a cliente que no lo compró → revenue leak; disable accidental → cliente pierde acceso a feature pagada; cliente ve datos de otro tenant
- **Gates**: capability granular (3 niveles), audit append-only, capability scope tenant, override restricted EFEONCE_ADMIN, resolver server-only no client-side, UNIQUE partial previene duplicados
- **Blast radius**: un cliente. Cross-tenant contamination imposible (organization_id en todas las queries)
- **Verificado por**: tests capability scoping, anomaly signal sobre overrides, redaction de reasons
- **Riesgo residual**: legacy backfill puede inferir incorrectamente para edge cases multi-business-line. Mitigado: dry-run obligatorio + reliability signal post-cutover + audit completo

### Robustness
- **Idempotencia**: UNIQUE partial `(organization_id, module_key) WHERE effective_to IS NULL`; commands re-llamables; resolver puro
- **Atomicidad**: assignment + audit + outbox en una tx
- **Race protection**: SELECT FOR UPDATE en transitions; UNIQUE partial garantiza un activo
- **Constraint coverage**: 6 CHECK + 4 FK + 1 UNIQUE partial + 2 anti-UPDATE/DELETE triggers + 1 catalog append-only trigger
- **Verificado por**: tests doble-enable concurrente, tests transición ilegal, tests append-only catalog

### Resilience
- **Retry**: cascade vía outbox + reactive consumer con backoff (TASK-771/773)
- **Dead letter**: signal `client_portal.cascade.dead_letter`
- **Audit**: `module_assignment_events` + `module.declared/deprecated` outbox
- **Recovery**: script `pnpm tsx scripts/client-portal/replay-assignment-events.ts` idempotent; legacy backfill re-runable
- **Degradación honesta**: resolver tolera assignment huérfano (filtra + signal); UI muestra empty state explícito

### Scalability
- **Hot path Big-O**: O(log n) por composite indexes
- **Cardinalidad**: ~50 modules × ~200 clientes = 10K assignments en steady state. Audit log 50-100 events/year/cliente = ~20K rows/year. Trivial.
- **Async paths**: cascade lifecycle → modules vía outbox; legacy backfill batch
- **Cost a 10x**: lineal trivial; partitioning audit log si > 1M rows (futuro)
- **Pagination**: cursor-based en admin listing; resolver retorna full set (volume bajo)
- **Cache**: resolver TTL 60s in-process per org → reduce DB load 10x bajo tráfico cliente

---

## 16. Hard Rules (anti-regression)

- **NUNCA** branchear UI client-side por `tenant_type`, `business_line` o `tenant_capabilities` directo. Toda diferenciación pasa por el resolver.
- **NUNCA** duplicar datos primarios en `greenhouse_client_portal.*`. Solo catálogo + assignments. Datos viven en dominios productores.
- **NUNCA** habilitar un módulo manualmente sin pasar por `enableClientPortalModule()`. CHECK constraint + capability + audit.
- **NUNCA** modificar `modules.*` campos críticos in-place (applicability_scope, tier, view_codes, capabilities, data_sources, pricing_kind, effective_from). Versionar via `effective_to` + nueva fila con `module_key` distinto. Append-only trigger enforced.
- **NUNCA** UPDATE/DELETE sobre `module_assignment_events`. Triggers append-only.
- **NUNCA** loggear `reason`, `cancellation_reason`, `override_reason` raw — `redactSensitive` antes.
- **NUNCA** invocar `enableClientPortalModule` directo desde UI client-facing. Solo desde admin endpoint o reactive consumer.
- **NUNCA** omitir `outbox event v1` en una transición de assignment. Consumers downstream dependen.
- **NUNCA** `Sentry.captureException` directo en code paths client_portal. Usar `captureWithDomain(err, 'client_portal', ...)`.
- **NUNCA** ejecutar `migrateClientPortalAssignmentsFromLegacy` en producción sin `dryRun=true` previo + revisión humana del proposedAssignments[].
- **NUNCA** declarar un módulo con `data_sources[]` referenciando un dominio que no existe. Lint rule + tests.
- **SIEMPRE** declarar `data_sources[]` en cada módulo — sirve como contrato downstream + protect contra acoplamientos no declarados.
- **SIEMPRE** consumir el resolver desde menú, page guards y APIs client-facing — single source of truth.
- **SIEMPRE** auditar con `actor_user_id` + `reason` cuando aplica. Sin contexto operativo, blast radius opaco.
- **SIEMPRE** emit `client.portal.module.*` outbox v1 en cada transición.

---

## 17. Dependencies & Impact

### Depende de
- TASK-535 organizations + clients + lifecycle_stage ✅
- TASK-816..821 Client Lifecycle V1 (cascade trigger) — TASK-828 depende
- TASK-721 evidence uploader (para evidence opcional en assignment) ✅
- TASK-771/773 outbox + reactive consumer ✅
- TASK-403 capabilities platform ✅
- TASK-136 view_access governance ✅
- TASK-742 redaction + capture ✅
- `engagement_commercial_terms` (TASK-802) — extender con `bundled_modules[]`

### Impacta a
- Toda surface client-facing del portal (menu, page guards, APIs filtered by org)
- TASK-820 cascade (extender consumer para modules)
- HubSpot sync — `tenant_capabilities.serviceModules` es input legacy al backfill, no canonical
- Reliability platform — nuevo subsystem `Client Portal Health`
- Downstream BQ projections (revenue per module, adoption metrics)

### Out of scope V1.0
- Self-service del cliente para solicitar módulos (V1.1)
- Pricing automation: addon → línea de invoice automática (V1.1, depende de finance ops)
- Trial/pilot de módulo individual independiente del engagement_kind (V2)
- Descomposición Creative Hub Globe en 16 módulos atómicos (V2 — V1.0 = bundle único)
- Multi-tenant pricing variable per cliente para mismo módulo (V2)
- Módulos cross-tenant compartidos (industry benchmarks anónimos, V2)
- Cliente con múltiples organizations (M&A) (V2)
- Cliente self-admin (gestionar sus propios users) (V1.2)
- Bidireccional con Kortex (cliente CRM Solutions transition) (V2)

---

## 18. Roadmap by Slices (8 slices V1.0)

| Slice | TASK | Alcance | Estimación |
|---|---|---|---|
| 1 | TASK-822 | Domain consolidation: `src/lib/client-portal/` + migración readers desde agency/account-360 sin cambio de comportamiento | Medio |
| 2 | TASK-823 | API namespace `/api/client-portal/*` consolidado + read endpoints | Bajo |
| 3 | TASK-824 | DDL schema `greenhouse_client_portal` + 3 tablas + 10 modules seed + extension `engagement_commercial_terms.bundled_modules[]` | Bajo |
| 4 | TASK-825 | Resolver canónico + helpers TS + cache + tests concurrencia | Medio |
| 5 | TASK-826 | Admin endpoints + 7 capabilities granulares + audit + UI admin (assignments + catalog) | Medio |
| 6 | TASK-827 | Composition layer: menú dinámico cliente + page guards + empty states + UI tokens + microcopy | Alto |
| 7 | TASK-828 | Cascade desde Client Lifecycle V1: extension TASK-820 reactive consumer + reliability + tests E2E | Medio |
| 8 | TASK-829 | Reliability signals (6) + subsystem `Client Portal Health` + legacy backfill script idempotente con dry-run | Medio |

V1.1 (post-V1.0):
| Slice | Alcance |
|---|---|
| 9 | Client self-service "Solicitar módulo X" + approval workflow operator-side |
| 10 | Pricing engine integration (addon → invoice line item) |
| 11 | Bidireccional con Kortex para CRM Solutions tenants |

V2:
| Slice | Alcance |
|---|---|
| 12 | Descomposición Creative Hub Globe en 16 módulos atómicos |
| 13 | Industry benchmark cross-tenant anónimo |
| 14 | Trial/pilot de módulo individual desacoplado de engagement_kind |
| 15 | Multi-org organizations (M&A) |

---

## 19. Migration Strategy (TASK-829 detail)

Backfill idempotente con dry-run obligatorio:

```ts
async function migrateClientPortalAssignmentsFromLegacy({ dryRun, organizationIds }: ...) {
  const orgs = organizationIds ?? await listAllActiveClientOrganizations()
  const proposedAssignments = []
  const driftDetected = []

  for (const org of orgs) {
    // Read legacy signals: tenant_capabilities.businessLines + serviceModules
    const businessLines = org.tenant_capabilities?.businessLines ?? []
    const serviceModules = org.tenant_capabilities?.serviceModules ?? []

    // Map legacy → modules canonical
    const inferred = inferModulesFromLegacySignals(businessLines, serviceModules)
    proposedAssignments.push({ orgId: org.id, modules: inferred })

    // Detect drift: assignments existentes que no matchean inferred
    const existing = await listActiveAssignments(org.id)
    const drift = computeDrift(existing, inferred)
    if (drift.length > 0) driftDetected.push({ orgId: org.id, drift })
  }

  if (dryRun) return { proposedAssignments, driftDetected }

  // Apply: enableClientPortalModule for each proposed (idempotent)
  for (const { orgId, modules } of proposedAssignments) {
    for (const moduleKey of modules) {
      await enableClientPortalModule({
        organizationId: orgId,
        moduleKey,
        source: 'migration_backfill',
        ...
      })
    }
  }

  return { proposedAssignments, driftDetected, applied: true }
}
```

Fases:
1. **Fase A (TASK-829)**: dry-run en staging para todos los clientes activos. Revisar `driftDetected[]` con stakeholders comerciales.
2. **Fase B**: aplicar en staging post-aprobación. Verificar `client_portal.assignment.lifecycle_module_drift` signal = 0.
3. **Fase C**: aplicar en producción (EFEONCE_ADMIN trigger manual via admin endpoint).
4. **Fase D**: deprecar lectura de `tenant_capabilities` legacy del path client-portal (V1.1).

---

## 20. Open Questions (post-V1.0)

1. **Pricing automation V1.1**: cuando un módulo addon se enable, ¿se crea automáticamente una invoice line item en finance? ¿O queda sync con `engagement_commercial_terms.bundled_modules` que ya tienen su propio billing? Recomendación: V1.1 con finance ops alignment.
2. **Self-service del cliente V1.1**: ¿el cliente puede solicitar módulo addon directamente desde portal o requiere account manager? Recomendación V1.1: solicitud via UI → outbox event → Teams notification al account manager → approval workflow.
3. **Sunset de módulos legacy**: cuando deprecamos `crm_command_legacy` (cuando Kortex esté listo), ¿migration manual o automática? Recomendación: manual con runbook + 90 días notice + double-write transition.
4. **Granularidad Creative Hub Globe descomposición V2**: ¿Brand Intelligence se vende standalone o requiere CSC Pipeline? ¿RpA es addon de Brand Intelligence o standalone? Decisión comercial, no técnica.
5. **Industry benchmark cross-tenant V2**: ¿qué nivel de anonimization (k-anonymity threshold)? ¿opt-in o opt-out? Requires legal review.
6. **Multi-org M&A V2**: ¿cliente compra empresa A; mergea con empresa B; los assignments se mergan o se mantienen separados? Decisión depende del modelo legal.

---

## 21. Glossary

| Término | Definición |
|---|---|
| **Module** | Bundle declarativo (catálogo) de view_codes + capabilities + data_sources que define una surface vendible del portal cliente |
| **Assignment** | Relación time-versioned entre organization y module con status, source y effective dates |
| **Resolver** | Helper TS canónico (`resolveClientPortalModulesForOrganization`) que computa los módulos visibles per cliente — única fuente de verdad para UI/API client-facing |
| **Cascade** | Materialización automática de assignments al completar `client_lifecycle_case` (onboarding/offboarding/reactivation) |
| **Bundle** | Conjunto de módulos incluidos en un `engagement_commercial_terms` (vía `bundled_modules[]`) |
| **Addon** | Módulo `tier='addon'` no incluido en bundle base; requires explicit enable |
| **Pilot/Trial** | Assignment con `status='pilot'` y `expires_at` set; transitions a `active` o `churned` al expirar |
| **Drift** | Discrepancia entre assignments y signals legacy (`tenant_capabilities`); detected por reliability signal |
| **Override** | Acción excepcional de habilitar un módulo cuyo `applicability_scope` no matchea el business_line canónico de la organización; restringido a EFEONCE_ADMIN + audit |
| **Applicability scope** | Campo `modules.applicability_scope` del dominio client_portal (V1.2 rename desde `business_line`). Mezcla dimensiones ortogonales: business_lines reales (`globe`/`wave`/`crm_solutions`), metavalue `cross` (aplicable a múltiples) y service_module `staff_aug` (dentro de cross). **NO es FK al business_line canónico del 360** (`greenhouse_core.service_modules.module_code WHERE module_kind='business_line'`). Para resolver el business_line canónico del cliente consumidor, usar `greenhouse_core.business_line_metadata`. Hard rule: NO duplicar enum del catalogo (per `GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md`). |
| **Business line (canónico)** | Identidad del 360 — fila en `greenhouse_core.service_modules` con `module_kind='business_line'`. Source of truth para `globe`, `wave`, `crm_solutions`. NO confundir con `modules.applicability_scope` del client_portal (que es ortogonal). |
| **Parity test (client_portal)** | Test live `src/lib/client-portal/data-sources/parity.live.test.ts` que verifica drift TS↔DB de los 3 arrays de `modules` (data_sources + view_codes + capabilities). Replica shape de TASK-611 `capabilities_registry`. `describe.skipIf(!hasPgConfig)` para lint-only runs. |

---

## 22. References

- `GREENHOUSE_360_OBJECT_MODEL_V1.md` — canonical 360 anchor (organizations, clients)
- `GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` V3.0 — descripción funcional (predecesor; sigue vigente)
- `GREENHOUSE_CLIENT_LIFECYCLE_V1.md` — cascade trigger
- `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — capabilities platform
- `GREENHOUSE_AGENCY_LAYER_V2.md` — Globe Creative Hub spec
- `GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1.md` — Equipo Asignado capability
- `GREENHOUSE_FEATURE_FLAGS_ROLLOUT_PLATFORM_V1.md` — TASK-780 patrón scope precedence reusado
- `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registry + subsystem rollup
- `GREENHOUSE_EVENT_CATALOG_V1.md` — outbox events catalog (este spec agrega 6 nuevos v1)
- `CLAUDE.md` — convenciones operativas (capability platform, outbox, redaction, captureWithDomain)
