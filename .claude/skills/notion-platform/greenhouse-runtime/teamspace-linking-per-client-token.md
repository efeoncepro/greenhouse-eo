# Teamspace linking — token POR teamspace (cliente nuevo)

> Canonical desde 2026-06-03 (TASK-998). Validado live con Grupo Berel. Cómo vincular el
> teamspace Notion de un cliente nuevo a Greenhouse sin romper el aislamiento tenant.

## El problema

Onboardear un cliente nuevo (Berel, ANAM, …) = registrar sus 3 DBs canónicas
(Tareas/Proyectos/Sprints) en `greenhouse_core.space_notion_sources`, como están Efeonce + Sky.
La tentación es "buscar el teamspace del cliente con `/v1/search`". **No funciona** — y el por qué
define el patrón correcto.

## Qué NO funciona para enumerar teamspaces (verificado live)

| Vía | Resultado | Por qué |
|---|---|---|
| `GET /v1/teams` | `400 invalid_request_url` | No existe en la API pública (ni en 2026-03-11). |
| `POST /v1/search` (data_source) | DBs con `parent.type='database_id'` | El nombre del teamspace **no está en REST**. El parent es la DB, no el teamspace. |
| Agrupar por prefijo de id | inválido | Las DBs de un teamspace **NO comparten prefijo** (Berel: las 3 core=`35c39c2f`, "Wiki de Berel"=`98239c2f`, "Content Hub"=`35f39c2f`). |
| MCP claude.ai `notion-get-teams` | ✅ enumera por nombre | Pero usa el **OAuth personal interactivo** del operador → **NO runtime-available** (absent en headless/cron). Solo un agente lo usa para obtener IDs. |
| Cloud Run `notion-bq-sync` v3.0.0 `/discover` | config snapshot, no live | Devuelve la config de los spaces ya conectados, no enumera. |

## El gate real NO es discovery — es el ACCESO de la integración

Un token solo ve los teamspaces **compartidos con él** (límite de seguridad de Notion). El token
compartido `notion-token` da `404 object_not_found` en las DBs de Berel porque la integración no
tiene acceso a ese teamspace. **Ninguna vía** (REST, MCP, Cloud Run) puede leer un teamspace no
compartido con su credencial — ni debe.

## El patrón canónico — el token ES el scope

1. **Operador, en Notion** (Settings → Developers → New connection): crea una **integración interna
   scoped SOLO al teamspace del cliente** (capacidades Leer/Actualizar/Insertar contenido) + copia el
   token `ntn_…`. Ej.: conexión "Greenhouse - Berel" sobre `Grupo Berel` (`35c39c2f-…`).
2. **En el checklist de onboarding** (`provision_notion_workspace`, NO el wizard de nacimiento —
   separación de concerns), el operador pega el token. Como el token está acotado, un
   `POST /v1/search` (filter data_source, `Notion-Version: 2026-03-11`) con él devuelve
   **EXCLUSIVAMENTE las DBs de ese cliente** (cero cross-tenant). Auto-clasificar
   Tareas/Proyectos/Sprints por título (tolerante a espacio final / acentos / mayúsculas). El operador
   confirma/ajusta los 3 ids.
3. **Persistencia**: token → GCP Secret Manager (`notion-integration-token-greenhouse-<slug>`, con
   `printf %s "$TOK" | gcloud secrets ...` — sin newline). En PG solo el `*_SECRET_REF`
   (`space_notion_sources.notion_token_secret_ref`). NULL = `notion-token` compartido legacy
   (Efeonce/Sky). **NUNCA el token crudo** en PG/logs/Notion/eventos.

Helper canónico (read-only, no persiste, no loggea el token):
`discoverNotionDatabasesForToken(token)` en `src/lib/client-onboarding/notion-token-connect.ts`
(Greenhouse repo). Devuelve `{ ok, databases[], suggested: {tareas, proyectos, sprints, revisiones} }`.

## Teams (lado del mismo checklist)

El bot Graph (`greenhouse-teams-bot-client-credentials`) **ya** lista teams + canales con los
permisos actuales — `GET /v1.0/teams` + `GET /v1.0/teams/{id}/channels` (verificado: "Berel - Efeonce"
› "Squad Berel"). Sin permisos Azure nuevos. Chats 1:1 (`/v1.0/chats`) requieren `Chat.ReadBasic.All`
(no concedido) → fuera de scope; los canales son el target de `teams_notification_channels`. Reusar
`src/lib/integrations/teams/bot-framework/token-cache.ts`.

## Pendiente para sync end-to-end

El Cloud Run `notion-bq-sync` (repo hermano `efeoncepro/notion-bigquery`) debe **resolver el token POR
space** (`notion_token_secret_ref`) en vez del único `notion-token`. Hasta entonces, registrar un
cliente escribe `space_notion_sources` (válido, additivo) pero el sync no lo drena.

## Hard rules

- **NUNCA** enumerar teamspaces con `/v1/search` crudo + heurística de prefijo. El token scoped = el scope.
- **NUNCA** cablear el MCP claude.ai a un backend (OAuth interactivo, absent en headless).
- **NUNCA** agregar un teamspace de cliente nuevo a la integración compartida `notion-token`.
- **NUNCA** persistir el token crudo. Solo `*_SECRET_REF`; a Secret Manager con `printf %s`.
- **NUNCA** vincular el teamspace en el wizard de nacimiento (vive en el checklist de provisioning).
- **SIEMPRE** que un token se pegue en texto plano (chat/form): tratarlo como expuesto → Secret Manager + recomendar rotación. Form field `type=password`, POST server-side, sin echo.

Spec: `docs/tasks/to-do/TASK-998-notion-teams-teamspace-linking-discover-register.md`.
