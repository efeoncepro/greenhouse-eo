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

## Terreno verificado (2026-06-03) — qué funciona y qué no

Probado en vivo con Grupo Berel:

| Vía | ¿Enumera/lista? | Runtime-available | Veredicto |
|---|---|---|---|
| Notion REST `/v1/search` | ❌ no enumera teamspaces (devuelve DBs por título; "Tareas" se repite) | sí | inservible para descubrir teamspaces |
| **Notion MCP claude.ai** (`notion-get-teams`) | ✅ enumera por nombre (encontró "Grupo Berel" + 3 DBs) | **❌ NO** (conector interactivo de claude.ai) | sirve para que un agente obtenga IDs hoy, NO para el runtime |
| **Cloud Run `notion-bq-sync` v3.0.0** `/discover` | ❌ devuelve **config snapshot** (los 2 spaces ya conectados), no enumeración en vivo. `/discover/{id}/sample` también devuelve config | sí (token integración) | **necesita upgrade** para enumerar en vivo |
| **Teams bot Graph** `/v1.0/teams` + `/teams/{id}/channels` | ✅ **funciona HOY** con los permisos actuales (vio "Berel - Efeonce" › "Squad Berel") | ✅ sí (`greenhouse-teams-bot-client-credentials` en Secret Manager) | **self-serve viable ya, sin permisos nuevos** |
| Teams Graph `/v1.0/chats` | ❌ 403 (falta `Chat.ReadBasic.All`) | — | chats 1:1 fuera de scope; los canales sí |

**IDs de Berel obtenidos (vía MCP, para seed)**: teamspace `35c39c2f-efe7-8161-9727-0042ecf02b95`; Tareas `35c39c2f-efe7-80c9-bc37-e811a7b95a7c`; Proyectos `35c39c2f-efe7-8085-8fe7-ec8f4360a61e`; Sprints `35c39c2f-efe7-80ef-bf33-d63d6910eed0`. Canal Teams: "Squad Berel" `19:k20iVrjyr7rkB2mfHulI8tUSvqS…@thread.tacv2`.

**Asimetría clave**: Teams es self-serve hoy (Graph runtime-available funciona). Notion NO tiene discovery en vivo runtime-available (REST no enumera; MCP no es del runtime; Cloud Run devuelve config) → requiere upgrade del Cloud Run + que el operador conecte la integración al teamspace en Notion (settings → Connections, one-time por cliente).

### El bloqueo real NO es discovery — es el ACCESO de la integración (probado)

`GET /v1/databases/{berel-tareas}` con el token `notion-token` → **404 object_not_found** en las 3 DBs de Berel. La integración NO tiene acceso al teamspace de Berel. El MCP las vio porque usa el **OAuth personal de claude.ai** (dueño del workspace, ve todo) — un token de backend nunca tiene ese alcance (límite de seguridad correcto).

Conclusión: **ningún** camino programático (MCP, REST, Cloud Run upgrade) puede leer Berel hasta que el operador **conecte la integración Greenhouse al teamspace** en Notion (Settings → Connections). Es exactamente como se conectaron Efeonce + Sky. "Agregar el MCP al discover" no resuelve esto (a) el MCP es OAuth interactivo, no cableble a un backend headless (CLAUDE.md), y (b) aunque se pudiera, el gate es el sharing, no el discovery.

### Plan canónico decidido (2026-06-03)

**A) Conectar Berel + ANAM (operativo, desbloquea ahora):**
- **A1 (operador, 1 vez por cliente — sólo el operador puede)**: en Notion conectar la integración Greenhouse al teamspace del cliente (Grupo Berel `35c39c2f-…`, ANAM `32539c2f-…`). Settings → Connections → add. Sin esto nada lee al cliente.
- **A2 (runtime, apenas A1 esté)**: con los IDs ya conocidos, registrar las 3 DBs en `space_notion_sources` (`/register`) + el canal "Squad Berel" en `teams_notification_channels`. Berel queda igual que Efeonce/Sky.

**B) Self-serve futuro (escalable, en el checklist):**
- **B-Teams (sin bloqueos, construible ya)**: reader runtime con el bot Graph (`token-cache` + `/v1.0/teams` + `/teams/{id}/channels`) → checklist item `provision_communication_channels`: el operador elige team+canal → register `teams_notification_channels`. Los permisos del bot ya alcanzan.
- **B-Notion (necesita upgrade del Cloud Run `notion-bq-sync`, vive en el repo hermano `efeoncepro/notion-bigquery`)**: `/discover` que enumere en vivo por REST (`POST /v1/search` filter data_source → clasificar por título tareas/proyectos/sprints → agrupar por prefijo de id de teamspace) → checklist muestra los teamspaces **conectados a la integración** → confirmar → `/register`. Precondición por cliente: A1.

**Por qué REST y NO MCP para B-Notion**: no hay `/v1/teams` (400). El `parent` de un data_source es `database_id`, no teamspace → el nombre del teamspace no está en REST. Pero agrupar por **prefijo de id** (cada teamspace comparte el segmento alto del UUID: Efeonce `5126d7d8`, Sky `23039c2f`, Berel `35c39c2f`, Demo `36339c2f`) + clasificar por título da grupos funcionales por teamspace, runtime-available, sin el MCP.

### Modelo de token: 1 token POR teamspace (DECIDIDO — arch-architect 4-pillar)

El operador planteó: ¿un token Notion por teamspace, scoped sólo a ese teamspace, pedido al conectar? **Sí. Es el modelo correcto** (no es minimizar). Veredicto:

- **Safety** ✅ — token filtrado = blast radius de 1 cliente, no todos. Hoy `notion-token` (BigQuery Sync) ve Efeonce+Sky+onboarding+wiki juntos = riesgo cross-tenant latente (mismo ISSUE que el demo compartido con BQ Sync). Greenhouse YA hace token-por-propósito para el demo (`notion-integration-token-greenhouse-metrics-demo`, restringido al teamspace demo). Token-por-cliente extiende ese precedente.
- **Robustness** ✅ — discovery con token scoped devuelve EXACTAMENTE las DBs de ese teamspace → cero ambigüedad de agrupación (no hace falta el heurístico de prefijo). "Al conectarse ve todas las DBs de ese teamspace" = contrato limpio. El token ES la conexión (elimina el gate "¿está compartido con la integración compartida?").
- **Resilience** ✅ — token por cliente en Secret Manager vía `resolveSecretByRef` canónico; expiración/rotación de uno no rompe a otros.
- **Scalability** ✅ — N clientes = N secrets, manejado por el secret resolution canónico.

**Implementación canónica (Secret Manager hygiene + `*_SECRET_REF`)**:
1. `space_notion_sources.notion_token_secret_ref TEXT NULL` (columna nueva). NULL = usar el `notion-token` legacy compartido (Efeonce/Sky no se migran, back-compat). Non-NULL = token por cliente.
2. Checklist `provision_notion_workspace`: el operador (a) en Notion crea una integración interna scoped al teamspace del cliente + copia el token; (b) en Greenhouse pega el token. El server lo escribe a GCP Secret Manager (`notion-integration-token-<client-slug>`) y guarda SOLO el `_SECRET_REF` en `space_notion_sources`. **NUNCA** el token crudo en PG/logs/Notion. Campo password, POST directo a Secret Manager server-side.
3. `/discover` y el sync pipeline resuelven el token POR space (si `notion_token_secret_ref` non-NULL → ese; si NULL → `notion-token` legacy). Cambio en el repo hermano `notion-bigquery`.
4. Con el token scoped, `/discover` = `POST /v1/search` con ESE token → devuelve sólo las DBs del teamspace → clasificar por título → register. Sin heurístico de prefijo, sin A1 (la conexión ES el token).

**Trade-off**: el operador crea 1 integración Notion + pega 1 token por cliente al onboardear (vs 1 clic de "connect" en el modelo compartido). A cambio: aislamiento duro + discovery trivial. Greenhouse prioriza aislamiento (precedente demo). Modelo elegido: **token-por-teamspace para clientes nuevos**; `notion-token` compartido se mantiene sólo para Efeonce/Sky legacy.

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
