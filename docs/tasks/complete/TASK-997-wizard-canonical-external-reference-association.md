# TASK-997 — Wizard Canonical External-Reference Association & Data-Quality

## Delta 2026-06-03 (b) — anclajes externos de Berel ejercitados LIVE (programa EPIC-CLIENT-360)

**Contexto programa:** esta task aporta el anclaje de referencias externas (Notion teamspace + Teams channel + contactos HubSpot) del wizard de incorporación. Se ejercitó live onboardeando a **Grupo Berel** (primer cliente MXN). Cadena: TASK-990 (MXN) → TASK-991 (SSOT) → **TASK-992/997 (wizard)** → TASK-998 (link) → TASK-1000/1003 (sync).

- ✅ Berel quedó con `notionAnchors` (data_source ids canónicos) + `teamsAnchor` + contactos finanzas anclados vía el wizard.
- 🔴 Nota cross-task: el anclaje Notion quedó correcto, pero el **sync** que consume esos anclajes está bloqueado por el endpoint deprecado (TASK-1003). No es problema del anclaje (esta task) sino del consumidor downstream.
- Evidencia: `docs/audits/notion/NOTION_BQ_SYNC_PER_SPACE_TOKEN_ROLLOUT_AND_DEPRECATED_API_AUDIT_2026-06-03.md`.

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `architecture + implementation`
- Epic: `EPIC-CLIENT-360`
- Derived from: `TASK-992` (puerta única / wizard de alta de cliente)
- Domain: `commercial` (owner) — touches `integrations.hubspot`, `integrations.notion`, `integrations.teams` (Graph/Azure), `finance` (client_profiles), `core` (spaces, organizations), `reliability`.
- Blocked by: `none` (foundation TASK-991/992 ya en `develop`). Slices con integración externa (Notion/Teams) requieren coordinación de credenciales.

## Why This Task Exists

Validando el wizard de TASK-992 en staging (Berel, manual, por el operador), emergieron **3 oportunidades de mejora del mismo patrón canónico** — todas: *"sugerir desde la fuente externa de verdad y asociar a la entidad canónica, en vez de texto libre o crear-a-ciegas"*:

| # | Campo (paso wizard) | Hoy (anti-patrón) | Debe ser |
|---|---|---|---|
| A | **Industria** (Identidad) | texto libre ("Minoristas") | enum de HubSpot `industry` (147 opciones) → store `value` (`RETAIL`) |
| B | **Contacto de finanzas** (Finanzas) | nombre/email/cargo hardcodeados | elegir de los **contactos asociados** de la company en HubSpot → asociar `hubspot_contact_id` |
| C | **Notion Teamspace + canal Teams** (Espacio) | toggles "crear" a ciegas (duplican) | **buscar** el Teamspace/canal existente (Notion API + Graph) → **anclar** `teamspace_id`/`channel_id`; fallback crear |

Caso fuente: Berel tiene industria `RETAIL` en HubSpot pero el wizard mostraba el texto libre "Minoristas"; tiene contactos asociados en HubSpot con nombre/email/cargo reales; y (clientes existentes) suelen tener Teamspace/canal ya creados. Texto libre + crear-ciego = drift de datos + duplicados + pérdida de trazabilidad a la persona/entidad real.

**Directiva del operador (2026-06-03)**: NO parchear campo por campo — diseñar la **primitiva robusta y escalable** con arquitectura + product design.

## Architecture Decision (arch-architect, 4-pillar)

Las 3 mejoras se resuelven con **2 sub-patrones canónicos**, no 3 parches.

### Sub-pattern 1 — Controlled Vocabulary Alignment (Industria)

Campo cuyo valor se alinea a un enum gobernado por una fuente externa.

- **SSOT** `src/config/hubspot-industries.ts` (creado) — espejo verbatim del enum `companies.industry` del portal HubSpot (147 opciones, `value` + `label`). Si HubSpot agrega una custom, se appendea.
- **Persistencia**: `organizations.industry` (columna `text` ya existe) guarda el `value` estable (`RETAIL`).
- **Read/coerción**: `coerceHubspotIndustryValue()` mapea legacy free-text / label → `value` canónico; null si no mapea (operador elige).
- **UI**: Combobox (Autocomplete con type-ahead) sobre el SSOT — `forms-ux`: single-select de set grande con búsqueda. Prefill desde HubSpot muestra "desde HubSpot".
- **Drift signal**: `commercial.organization.industry_noncanonical` (data_quality, steady=0) — cuenta orgs con `industry` no presente en el SSOT (texto libre residual). **Soft** (no CHECK duro: el enum puede crecer).

NO es parche: es el patrón canónico SSOT (overlay #8) + VIEW/helper/signal (overlay #4).

### Sub-pattern 2 — External Reference Association (Contactos, Notion, Teams)

Primitiva **reusable**: una entidad canónica referencia una entidad externa, con trazabilidad, en vez de free-text/crear-ciego.

**Tipo canónico** `ExternalReference`:
```ts
interface ExternalReference {
  source: 'hubspot' | 'notion' | 'teams'
  kind: 'contact' | 'teamspace' | 'channel'
  externalId: string
  label: string            // snapshot legible (nombre del contacto / teamspace / canal)
  mode: 'suggested' | 'manual' | 'created'
  associatedAt: string
  associatedByUserId: string | null
}
```

**Read API (suggest) — CQRS-lite, separado del write** (overlay #5): un *suggest reader* por fuente que devuelve candidatos `{ externalId, label, secondary, raw }`. Optimizado para shape/latencia.
- **Contactos HubSpot** → lee `greenhouse_crm.contacts` (proyección ya sincronizada) por `hubspot_primary_company_id` / `= ANY(hubspot_associated_company_ids)`. **Sin llamada externa runtime** (usa la proyección → robusto + rápido).
- **Notion Teamspace** → Notion API search (o proyección si existe). Llamada externa → **readiness contract** + degradación honesta.
- **Teams channel** → Microsoft Graph (`/teams`, `/channels`) vía credenciales Azure. Llamada externa → readiness + degradación.

**Write API (associate) — EXTENDER registries canónicos, NO columnas nuevas en `spaces`** (overlay #1, "extender canónico"):
- Contactos → `client_profiles.finance_contacts` (JSONB array; cada item con `hubspotContactId`).
- **Notion Teamspace + sus DBs (Tareas/Proyectos/Sprints)** → `greenhouse_core.space_notion_sources` (registry **ya existente** del sync conformed: `space_id`, `source_database_id` por DB, `sync_enabled` gated). Asociar = registrar los `source_database_id` (data sources) del teamspace para ese `space_id`. **NO** una columna `notion_teamspace_id` suelta — eso paralizaría el registry canónico.
- **Canal Teams** → `teams_notification_channels` (registry **ya existente**: `space_id`/`recipient_chat_id`/`provisioning_status`). Asociar = fila con `provisioning_status='ready'` apuntando al `channel_id`/`chat_id`.

**Notion — cómo (notion-platform skill, Notion-Version `2026-03-11`)**:
- **Buscar (suggest)**: `POST /v1/search` con el token **Greenhouse PRD** (registry de integraciones; scoped a teamspaces conectados). Para los DBs del teamspace, listar data sources (`/v1/data_sources/...`, NO el endpoint `databases` legacy). **Readiness**: la integración solo ve teamspaces conectados → si el del cliente nuevo no está conectado, suggest vacío → operador lo conecta en Notion **o** se crea.
- **Re-fetch antes de asociar** (Pillar 1): no confiar el payload de búsqueda como verdad; re-fetch el data source antes de persistir su id.
- **Rate limit**: ~3 req/s; búsquedas debounced (`forms-ux` 200–300ms); sin escrituras batched aquí (la asociación es 1-3 rows).
- **NUNCA** conectar la integración *BigQuery Sync* (`notion-token`) a teamspaces nuevos — usar **Greenhouse PRD** (registro de integraciones Notion, CLAUDE.md).

**Readiness + fallback**: cada fuente declara ready/degraded. Degraded → suggest vacío + UI cae a **manual** (siempre funciona). **"Crear nuevo" teamspace+DBs** → aprovisionamiento **async vía outbox + checklist** (`provision_notion_workspace` de TASK-992 §5.5); enforce la **plantilla L1 canónica** (vocabulario de status `task-status-canonical.ts`); teamspace = operator-driven en Notion (no es operación API estándar), DBs Tareas/Proyectos/Sprints = API (`POST /v1/databases` / MCP `notion-create-database`) sobre el teamspace + registro en `space_notion_sources` con `sync_enabled` gateado. **Workers en beta → NO para el commit del wizard.** NUNCA crear inline a ciegas.

**UI** (`state-design` + `forms-ux`): selector de sugeridos (combobox) con estados loading/empty/degraded honestos + opción manual + "crear nuevo". Provenance visible ("asociado desde HubSpot/Notion/Teams").

### 4-Pillar Score

- **Safety**: las asociaciones son referencias (no create destructivo inline); "crear nuevo" es async vía outbox + gateado por el checklist del lifecycle; reads capability-gated. Blast radius: un cliente.
- **Robustness**: contactos leen de proyección (sin dependencia externa runtime); associate idempotente; provenance + snapshot; **el fallback manual siempre funciona** ante cualquier degradación.
- **Resilience**: readiness contract + degradación honesta por fuente; reliability signal de referencias huérfanas (entidad externa borrada); el checklist del lifecycle ya trackea el provisioning async.
- **Scalability**: agregar una fuente nueva = un suggest reader nuevo; el tipo `ExternalReference` es genérico; los reads son proyecciones indexadas. Sin rediseño a 10x.

### Alternatives rejected

- **Parchar cada campo a su manera** (text→select aislado por campo) → rechazado: duplica lógica, no escala, drift entre campos. (Directiva explícita del operador.)
- **Fetch externo inline en cada keystroke** → rechazado: latencia + acoplamiento + falla cuando la fuente cae. Se usa proyección (contactos) o debounced + readiness (Notion/Teams).
- **Crear Notion/Teams inline en el commit** → rechazado: destructivo + rate-limited + bloquea el alta. Async vía outbox + checklist (overlay #3).

## Scope (Slices)

- **Slice 1 — Industria (Controlled Vocabulary)**: SSOT (hecho) + Combobox runtime + **actualizar mockup** (paridad) + persistir `organizations.industry` vía `upsertCanonicalOrganization` + composer + prefill + drift signal. GVC parity. *Liviano, sin integración externa nueva.*
- **Slice 2 — Contactos finanzas (External Reference, fuente proyección)**: suggest reader desde `greenhouse_crm.contacts` + endpoint + selector UI + persistencia `finance_contacts` con `hubspot_contact_id` + manual fallback + mockup + GVC. *Sin llamada externa runtime.*
- **Slice 3 — Notion Teamspace + DBs (External Reference, fuente Notion API)**: suggest vía `POST /v1/search` (token Greenhouse PRD, Notion-Version `2026-03-11`) + listar data sources (Tareas/Proyectos/Sprints) + readiness (integración conectada al teamspace) + re-fetch antes de asociar + association en `greenhouse_core.space_notion_sources` (`sync_enabled` gated) + fallback crear async (checklist `provision_notion_workspace`, plantilla L1) + mockup + GVC. *Coordinación: integración Notion conectada al teamspace del cliente.*
- **Slice 4 — Teams channel (External Reference, fuente Graph)**: suggest vía Microsoft Graph (`/teams`, `/channels`) + readiness/degradación + association en `teams_notification_channels` (`provisioning_status`) + fallback async + mockup + GVC. *Coordinación: credenciales Azure/Graph.*
- **Copy fix**: "Crear workspace de Notion" → "Teamspace de Notion" (terminología correcta).

Cada slice: skills `forms-ux` + `state-design` + (`modern-ui`/`greenhouse-ux`) para los controles; **actualizar mockup + runtime juntos** (regla de paridad TASK-992); GVC `fe:capture:diff`.

## Delta 2026-06-03 — Slices 1-4 + prefill + enterprise pass SHIPPED (develop)

Las 4 slices + el follow-up de prefill + un pase visual enterprise están en `develop`
(flag de TASK-992 OFF — el wizard se habilita con `NEXT_PUBLIC_CLIENT_LIFECYCLE_ONBOARDING_ENABLED`).
Cada slice: diseño con skills (arch-architect 4-pilar + forms-ux + state-design +
notion-platform + greenhouse-ux + greenhouse-ux-writing), copy-and-patch runtime↔mockup,
verificación **GVC local**, tsc 0 / lint 0 / tests focales verdes.

- **Slice 1 — Industria (Controlled Vocabulary)** ✓ — combobox `CustomAutocomplete` sobre
  SSOT `hubspot-industries.ts` (147) + persistencia `organizations.industry` (writer SSOT)
  + coerción legacy + drift signal `commercial.organization.industry_noncanonical` + 4 tests.
  - **prefill** desde la org/HubSpot (org-search `industry`) → GVC: "Retail" precargado para Berel.
- **Slice 2 — Contacto finanzas (External Reference, HubSpot)** ✓ — suggest reader sobre
  `greenhouse_crm.contacts` + endpoint degradado + persistencia `client_profiles.finance_contacts`
  (JSONB con provenance) + UI estados honestos (loading/ready/empty/degraded) + chips→filas
  enterprise (avatar/nombre·cargo/email + Agregar/Agregado) + chip provenance HubSpot + 2 tests.
- **Slice 3 — Notion teamspace+DBs (External Reference)** ✓ — `/v1/search` (Notion-Version
  `2026-03-11`, token Greenhouse PRD) + endpoint degradado + `CustomAutocomplete` multiple async
  (debounced) + captura en case metadata `notionAnchors` (consume el checklist async
  `provision_notion_workspace` → `space_notion_sources`) + copy "workspace"→"Teamspace" + 3 tests.
- **Slice 4 — Teams channel (External Reference, Graph)** ✓ — Graph `/v1.0/groups` (Teams=M365
  groups) reusando `acquireGraphToken`+`readBotFrameworkSecret` + endpoint degradado + búsqueda
  async + captura `teamsAnchor` (consume async → `teams_notification_channels`) + 4 tests.

**Pendiente (no bloquea el wizard; cada uno su propia coordinación):**
- Consumers async del checklist que materializan `space_notion_sources` / `teams_notification_channels`
  desde el case metadata (`provision_notion_workspace` / `provision_communication_channels`).
- Readiness real: conectar la integración **Greenhouse PRD** al teamspace del cliente + permisos
  Graph `Group.Read.All` (sin eso, ambos search degradan a "crear nuevo" — comportamiento correcto).
- Channel-level selection en Teams (V1 ancla el equipo; el canal General lo resuelve el async).
- Validación Berel end-to-end por el operador + gate `pnpm test` full antes de mover a `complete`.

## Hard Rules (anti-regression)

- **NUNCA** texto libre para un campo que tiene fuente de verdad externa (industria, contacto, teamspace, channel). Combobox sobre SSOT / suggest reader.
- **NUNCA** crear Notion/Teams inline a ciegas en el commit del wizard. Buscar+asociar el existente; crear nuevo = async vía outbox + checklist.
- **NUNCA** guardar el contacto/teamspace/channel como string suelto. Guardar `ExternalReference` con `externalId` + provenance + snapshot.
- **NUNCA** acoplar el suggest reader (read) con el associate (write). CQRS-lite.
- **NUNCA** romper el flujo si la fuente externa cae. Readiness + degradación honesta + fallback manual.
- **SIEMPRE** que emerja un campo nuevo del wizard con fuente externa, reusar uno de los 2 sub-patrones (no inventar un tercero).

## Open Questions

- **RESUELTO** (notion-platform skill): la asociación Notion NO va en columna suelta de `spaces` → extiende `greenhouse_core.space_notion_sources` (registry del sync). La asociación Teams → `teams_notification_channels`. Cero columnas nuevas en `spaces`.
- ¿El `industry` se prellena desde el `organizations.industry` sincronizado por HubSpot, o requiere fetch de la company? (Slice 1: usar lo persistido; el sync HubSpot debería poblar industry.)
- ¿Multi-contacto financiero (lista) o uno principal? TASK-992 lo dejó multi → mantener multi, cada uno con su `ExternalReference`.
- ¿La integración **Greenhouse PRD** se conecta al teamspace de cada cliente nuevo como paso de onboarding (operador) antes de que el suggest funcione? Sí — es el gate de readiness; documentar en el manual.

## References

- Deriva de `docs/tasks/in-progress/TASK-992-client-lifecycle-orchestrator-single-front-door.md`.
- SSOT industria: `src/config/hubspot-industries.ts`.
- Proyección contactos: `greenhouse_crm.contacts` (`hubspot_primary_company_id`, `hubspot_associated_company_ids`).
- Notion: registry `notion-platform` skill + secrets canónicos (CLAUDE.md "Notion Integrations Registry").
- Teams/Graph: CLAUDE.md "Teams Bot" + Azure CLI.
- Patrones: overlay arch-architect #4 (VIEW+helper+signal), #5 (read/write separation), #8 (SSOT), #3 (outbox async).


## Cierre 2026-06-04 — núcleo COMPLETE (opción A: pendientes externos → TASK-1010)

✅ **Núcleo cerrado:** los 4 slices del anclaje de referencias externas del wizard (industria, contactos de finanzas, teamspace Notion, canal Teams) como **External Reference con provenance** (combobox/suggest sobre SSOT, NO texto libre). `pnpm test` full verde (5963, sesión 2026-06-04).
📄 **Docs:** sección "Anclaje de referencias externas" en `docs/documentation/agency/alta-de-cliente.md` + manual.
📌 **Diferido a TASK-1010** (split aprobado por operador): consumers async del checklist que materializan `space_notion_sources`/`teams_notification_channels`; readiness real (integración Greenhouse PRD conectada al teamspace + permiso Graph `Group.Read.All`); selección channel-level en Teams. Todos requieren coordinación externa, no bloquean el núcleo del wizard.
