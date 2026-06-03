# TASK-998 — Notion/Teams Teamspace Linking via Discover + Register (canonical)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio-Alto`
- Type: `architecture + implementation`
- Epic: `EPIC-CLIENT-360`
- Derived from: `TASK-992` / `TASK-997` (validación Berel live 2026-06-03)
- Domain: `commercial` (owner) · `integrations.notion` · `integrations.teams` · `core` (spaces, space_notion_sources) · `reliability`
- Blocked by: revisión del estado actual del pipeline `notion-bq-sync /discover` (hoy responde config, no groups).

## Why This Task Exists (validación Berel, 2026-06-03)

Validando el wizard de TASK-997 con Berel real, el operador detectó que el paso "Espacio"
**no resolvía bien** el vínculo de Notion/Teams: buscaba *bases* (Tareas/Proyectos/Sprints
que se repiten en todos los teamspaces) y Teams degradaba (permisos Graph). Análisis a
fondo (arch-architect + product-design + notion-platform):

- **La API REST de Notion NO puede enumerar/nombrar teamspaces.** Verificado 3 formas:
  `/v1/search` devuelve filas/databases por título (Tareas se repite); el `parent` de los
  databases es `block_id`/`workspace` sin nombre de teamspace; 0 páginas top-level
  (parent=workspace). La búsqueda fuzzy es arquitectónicamente imposible de hacer bien.
- **Realidad confirmada por el operador**: cada cliente (Grupo Berel, ANAM, Sky) tiene su
  **propio teamspace** en el workspace Notion de Efeonce, con sus Tareas/Proyectos/Sprints.
- **Efeonce y Sky funcionan** porque sus 3 DB ids están registrados en
  `greenhouse_core.space_notion_sources` (SSOT). Berel/ANAM **no están registrados**.

**Decisión (TASK-997 cleanup, ya aplicado)**: se quitó la búsqueda fuzzy del wizard; el paso
"Espacio" quedó honesto ("crear nuevo" default + nota apuntando al checklist). El **vínculo
real** se hace acá, con la primitiva canónica que ya conectó a Efeonce + Sky.

## Architecture Decision

El vínculo de un teamspace existente = **registrar sus 3 databases en `space_notion_sources`**
vía la primitiva canónica **`discover` + `register`** que ya existe:

- **`GET /api/integrations/notion/discover`** (proxy al Cloud Run `notion-bq-sync /discover`):
  devuelve databases **agrupadas por teamspace** (`groups[]` con `groupLabel`/`parentName` +
  cada DB **clasificada** como `tareas`/`proyectos`/`sprints`/`revisiones`). Este es el
  agrupamiento + clasificación por teamspace que el wizard intentaba (mal) hacer a mano.
- **`POST /api/integrations/notion/register`**: persiste `{ spaceId, notionDbTareas,
  notionDbProyectos, notionDbSprints?, notionDbRevisiones? }` en `space_notion_sources`
  (PG SSOT + replica BQ) + `refreshSpaceNotionGovernance`. Verifica acceso a cada DB.

**Dónde vive**: en el **detalle del checklist de onboarding** (TASK-992), en el ítem
`provision_notion_workspace`. NO en el wizard de nacimiento (separación de concerns:
nacimiento ≠ provisioning de tooling).

**Flujo UX (greenhouse-ux + forms-ux + state-design)**:
1. En el ítem `provision_notion_workspace` del checklist: botón "Vincular teamspace existente".
2. Abre un selector que llama `/discover` → muestra los **teamspaces** (grupos) con sus 3
   DBs ya clasificadas. El operador elige el teamspace del cliente (ej. "Grupo Berel").
3. Confirma → `/register` con el `spaceId` del cliente + los 3 DB ids clasificados.
4. Estado honesto: loading / ready / empty (sin teamspaces sin registrar) / degraded
   (pipeline caído → "registrá manualmente con los ids").
5. "Crear teamspace nuevo": el provisioning crea el teamspace + 3 DBs con el template L1
   (TASK-910) + registra en `space_notion_sources`.

**Teams**: análogo con el registry `teams_notification_channels`. Sin pipeline de discovery
equivalente → el vínculo del canal es por selección/confirmación del canal del cliente
(resolver el mecanismo: Graph con permiso `Group.Read.All` concedido, o registro deliberado).

### 4-Pillar Score

- **Safety**: el wizard no escribe en Notion; el register valida acceso a cada DB; capability-gated (`requireAdminTenantContext`). Blast radius: un Space.
- **Robustness**: lee/escribe el SSOT (`space_notion_sources`), no depende de la búsqueda frágil de la API de Notion; verify-before-register; idempotente (UPSERT por space_id).
- **Resilience**: degradación honesta si el pipeline `/discover` cae (registro manual por ids); governance refresh post-register.
- **Scalability**: el registry escala a N clientes; el discover agrupa server-side (Cloud Run).

### Alternatives rejected

- **Búsqueda fuzzy `/v1/search`** (lo que tenía TASK-997) → rechazado: la API no enumera teamspaces; devuelve ruido/repetidos. **Es el bug que disparó esta task.**
- **Pegar el link del teamspace** → rechazado por el operador (no enterprise).
- **Auto-discovery por diff al conectar la integración** → frágil (depende de timing/permisos).

## Scope (Slices)

- **Slice 0 — Verificar el pipeline `/discover`**: hoy responde config (2 spaces configured), no `groups[]`. Confirmar/arreglar el endpoint del Cloud Run `notion-bq-sync` para que `/discover` devuelva los grupos por teamspace con clasificación (o documentar el contrato real).
- **Slice 1 — Reader canónico** `discoverNotionTeamspaces()` (proxy `/discover`, agrupado + clasificado) + `registerSpaceNotionSources()` (wrap del `/register`).
- **Slice 2 — UI en el checklist** (`provision_notion_workspace`): selector de teamspace (grupos del discover) + confirmar → register. Estados honestos. greenhouse-ux + GVC.
- **Slice 3 — Teams** (`provision_communication_channels`): vínculo de canal vía `teams_notification_channels` (resolver mecanismo Graph/registro).
- **Slice 4 — Crear nuevo** (template L1, TASK-910) + registro automático en `space_notion_sources`.

## Hard Rules (anti-regression)

- **NUNCA** buscar teamspaces de Notion con `/v1/search` crudo. La API no los enumera. Usar `discover` (agrupado + clasificado) + `register` → `space_notion_sources`.
- **NUNCA** vincular un teamspace en el wizard de nacimiento. El vínculo vive en el checklist de provisioning (separación de concerns).
- **NUNCA** escribir `space_notion_sources` sin pasar por `/register` (verify-before-register + governance refresh + replica BQ).
- **SIEMPRE** clasificar las DBs (tareas/proyectos/sprints) — el pipeline `/discover` ya lo hace; no re-clasificar a mano.

## References

- SSOT: `greenhouse_core.space_notion_sources` (`notion_workspace_id`, `notion_db_tareas/proyectos/sprints/revisiones`, `space_id`).
- Endpoints canónicos: `src/app/api/integrations/notion/discover/route.ts` + `register/route.ts`.
- Pipeline: `notion-bq-sync` Cloud Run (`NOTION_PIPELINE_URL`).
- Template L1: TASK-910 (demo teamspace creation).
- Cleanup que disparó esta task: TASK-997 (búsqueda fuzzy removida del wizard).
