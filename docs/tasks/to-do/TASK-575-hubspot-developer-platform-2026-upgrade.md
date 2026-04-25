# TASK-575 — Upgrade HubSpot Developer Platform + API calls del bridge a versión 2026.03

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `—`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `integrations / platform`
- Blocked by: `TASK-574` recomendado (ejecutar después de la absorción para que la migración viva en el monorepo)
- Branch: `task/TASK-575-hubspot-developer-platform-2026-upgrade`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Subir la stack HubSpot de Efeonce Greenhouse a versión 2026.03 (la versión `Current` del Spring 2026 Spotlight) en los tres frentes donde aplica: (1) `hsproject.json` del sibling `cesargrowth11/hubspot-bigquery` pasa de `platformVersion: "2025.2"` a `"2026.03"`, (2) todas las llamadas a HubSpot API desde el bridge Cloud Run pasan al formato `/2026-03/` date-based versioning, y (3) adopción selectiva de features 2026.03 que destraban valor real (Serverless Functions / App Functions, Webhooks Journal v4 batched reads, App Settings de la UI Extension unificada). El objetivo declarado del usuario: estar en la superficie más reciente disponible siempre que tenga sentido operativo.

## Why This Task Exists

- El Spring 2026 Spotlight (anuncio 2026-04-14, GA 2026-03-30) mueve el eje de versionado de HubSpot: APIs con `/YYYY-MM/` date-based versioning, Platform Projects con lifecycle Current (6m) / Supported (12m) / Unsupported (18+m), y `2026.03` como la primera versión date-based oficial.
- Estado actual del sibling: `hsproject.json` pinneado a `"platformVersion": "2025.2"`. Esa versión sigue soportada (no tiene EOL anunciado), pero NO tiene acceso a Serverless Functions (reintroducidas en 2026.03), Webhooks Journal v4 batched reads, MCP Auth Apps, ni a las expansiones de UI Extensions (App Pages, Code Sharing via npm workspaces).
- Estado actual del bridge (Cloud Run `hubspot-greenhouse-integration`): `hubspot_client.py` llama a HubSpot API sin versión explícita o con `v3/v4` legacy. El formato legacy sigue disponible pero el Spring Spotlight recomienda pinnear a `/2026-03/` para entrar en la ventana de 18 meses de soporte con semántica inmutable.
- El usuario explicitó 2026-04-23 que quiere estar en la versión más reciente donde aplique. Ese mandato convierte un upgrade opcional en P1 operativo: no queremos quedar un release atrás sin razón técnica.
- El beneficio directo de estar en 2026.03:
  - **Serverless Functions reintroducidas**: habilitan mover lógica stateless del bridge al stack de HubSpot (follow-up por endpoint).
  - **Webhooks Journal v4 batched reads**: hasta 100 eventos por batch + filtros CRM + LIST_MEMBERSHIP subscription → reduce load y latencia del webhook handler actual.
  - **Date-based API pinning**: blindaje de 18 meses contra breaking changes.
  - **Alineación con HubSpot Developer MCP Server**: acceso GA a las 24 tools CLI (`hs mcp setup`) que aceleran development del servicio.
- Sin este upgrade, el bridge queda fuera de la ventana Current y empieza a acumular deuda de features no accesibles.

## Goal

- `hsproject.json` del sibling declara `"platformVersion": "2026.03"`.
- `src/app/*-hsmeta.json` (app config + webhooks config) compatibles con el esquema 2026.03.
- Todas las llamadas HubSpot API del bridge absorbido (o en sibling si TASK-574 aún no ejecutó) pinneadas a `/2026-03/` cuando exista endpoint date-based; legacy `/v3/` o `/v4/` solo si el endpoint no tiene variante 2026-03 aún.
- Reintroducidas las Serverless Functions donde aplique (scope acotado: al menos declarar el slot + migrar una ruta piloto si el ROI es directo).
- Webhooks Journal batched read consumption activo donde mejora throughput (hoy el webhook handler recibe uno por uno).
- `hs project migrate` ejecutado limpio, smoke post-migration passing.
- Documentación actualizada: `docs/documentation/finance/crear-deal-desde-quote-builder.md`, `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`, `AGENTS.md`, `CLAUDE.md` y equivalentes Codex reflejan la nueva versión.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- HubSpot Spring 2026 Spotlight (https://developers.hubspot.com/changelog/spring-2026-spotlight)
- HubSpot Platform Versioning Guide (https://developers.hubspot.com/docs/developer-tooling/platform/versioning)
- HubSpot Migration Paths to 2026.03 (https://developers.hubspot.com/docs/apps/developer-platform/build-apps/migrate-an-app/overview)
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` (ubicación actual del hsproject)
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` (si las serverless functions cambian topología)

Reglas obligatorias:

- **Sin regresiones en el contrato público del bridge**: las 17 rutas del Cloud Run siguen respondiendo idéntico shape. Si 2026.03 cambia la forma del payload HubSpot upstream, el bridge absorbe la diferencia y mantiene el contrato interno estable para `greenhouse-eo`.
- **Migration via CLI oficial**: usar `hs project migrate` + CLI version ≥ 8.3.0. No editar `hsproject.json` a mano salvo para resolver merge conflicts.
- **Un feature nuevo por PR**: el upgrade base (`platformVersion` → 2026.03) va en un PR; cada feature nueva adoptada (Serverless Functions, Webhooks Journal batched, etc.) en PR separado con smoke propio. Evitar big-bang PR.
- **Rollback documentado**: cada sub-upgrade tiene camino de rollback claro (revertir `hsproject.json`, redeploy revision anterior, restore del workflow viejo).
- **Compatibilidad con TASK-574**: si TASK-574 ya cerró, el trabajo ocurre en `greenhouse-eo/services/hubspot_greenhouse_integration/`. Si no cerró aún, ocurre en `cesargrowth11/hubspot-bigquery/services/hubspot_greenhouse_integration/`. El plan declara ambas variantes.
- **Secret Manager sin cambios salvo que sea necesario**: `HUBSPOT_ACCESS_TOKEN` sigue siendo el mismo a menos que 2026.03 exija re-issuance.

## Normative Docs

- `docs/tasks/to-do/TASK-574-absorb-hubspot-greenhouse-integration-service.md` (contexto de la absorción)
- `docs/tasks/to-do/TASK-576-hubspot-quote-publish-contract-completion.md` (contrato quote publish-ready que el upgrade no debe romper y, si toca `/quotes`, debe dejar contemplado)
- `docs/tasks/complete/TASK-572-hubspot-integration-post-deals-deploy.md` (contrato del bridge live)
- `docs/tasks/complete/TASK-573-quote-builder-deal-birth-contract-completion.md` (governance del create deal)
- HubSpot Developer Changelog entries:
  - Spring 2026 Spotlight
  - March 2026 Rollup
  - [Upcoming Deprecation] v2025.1 August 1 2026 (referencia — NO aplica a v2025.2 pero define el tono del ciclo)

## Dependencies & Impact

### Depends on

- **Recomendado**: `TASK-574` completado primero — el upgrade es más limpio con el código en el monorepo (historial git + CI propia + review unificado).
- Acceso read/write a `cesargrowth11/hubspot-bigquery` si TASK-574 no cerró aún.
- HubSpot CLI ≥ 8.3.0 instalado local y en CI.
- Developer Test Account de HubSpot (si no existe, crear uno para smoke de la migración).
- Acceso admin al portal HubSpot production para activar features 2026.03 que lo requieran (ej. Webhooks Journal v4 subscriptions).
- Si `TASK-576` ya está en ejecución o ya definió contrato de `/quotes`, el upgrade debe incorporarlo como baseline de compatibilidad y smoke.

### Blocks / Impacts

- Desbloquea acceso a Serverless Functions en el stack HubSpot — hoy toda lógica stateless del bridge corre en Cloud Run. Con 2026.03 hay opción de migrar (follow-up por endpoint).
- Desbloquea Webhooks Journal v4 batched reads → reducción inmediata de costo/latencia del webhook handler cuando el volumen crece.
- Desbloquea MCP Auth Apps → habilita integraciones AI nativas sin pasar por el bridge para ciertos read paths (follow-up separado si se adopta).
- Extiende la ventana de soporte 18 meses hasta ~Q3 2027 (vs v2025.2 sin EOL pero eventualmente Supported).
- **No rompe contrato con `greenhouse-eo` Vercel**: el bridge absorbe cualquier diferencia upstream en sus modelos internos; el contrato HTTP público queda estable.
- Si el upgrade toca rutas, payloads o tests de `/quotes`, debe considerar desde el diseño el objetivo de `TASK-576`: quote create/update publish-ready, catálogo-first, con sender, empresa emisora, SKU/ref, billing frequency, billing start y tax contract completos.

### Files owned

Si TASK-574 cerró primero (escenario recomendado):

- `services/hubspot_greenhouse_integration/hsproject.json` (solo si se mueve también — decidir en Discovery)
- `services/hubspot_greenhouse_integration/hubspot_client.py` (date-based API pinning)
- `services/hubspot_greenhouse_integration/app.py` (si se adoptan Serverless Functions para rutas piloto)
- `services/hubspot_greenhouse_integration/webhooks.py` (adopción de Journal batched reads si aplica)
- `services/hubspot_greenhouse_integration/requirements.txt` (bump de deps HubSpot SDK si aplica)
- `src/lib/integrations/hubspot-greenhouse-service.ts` (si el contrato público evolucionó; sin cambios esperados)
- `.github/workflows/hubspot-greenhouse-integration-deploy.yml` (smoke checks actualizados)

Si TASK-574 no cerró aún:

- `cesargrowth11/hubspot-bigquery/hsproject.json`
- `cesargrowth11/hubspot-bigquery/services/hubspot_greenhouse_integration/*.py`
- `cesargrowth11/hubspot-bigquery/src/app/*-hsmeta.json`

En ambos escenarios:

- `docs/documentation/finance/crear-deal-desde-quote-builder.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- `AGENTS.md`, `project_context.md`, `CLAUDE.md`
- `Handoff.md`, `changelog.md`

## Current Repo State

### Already exists

- `hsproject.json` del sibling: `{"name": "hubspot-bigquery", "srcDir": "src", "platformVersion": "2025.2"}`.
- `src/app/app-hsmeta.json` + `src/app/webhooks/webhooks-hsmeta.json` con esquema v2025.2.
- HubSpot app live en el portal `efeonce-hub-platform` (Developer Platform project: `Efeonce Data Platform`, auth type `static`).
- Bridge Cloud Run llamando a HubSpot API sin version pinning explícito (default legacy paths `/crm/v3/*`, `/crm/v4/*`, `/contacts/v1/*`).
- Webhook handler (`POST /webhooks/hubspot`) validando firmas v1 + v3 pero procesando eventos one-by-one (no batched).

### Gap

- Platform Version 1 release atrás (2025.2 vs 2026.03 Current).
- Serverless Functions: inaccesibles hasta estar en 2026.03. Hoy toda lógica stateless corre en Cloud Run.
- Webhooks Journal v4: batched reads + CRM filtering + LIST_MEMBERSHIP subscriptions no disponibles.
- API calls sin date-based versioning → quedan expuestas a breaking changes sin ventana de 18 meses.
- CLI baseline: desconocida si la versión local de cada dev está en ≥ 8.3.0.
- Developer MCP Server local (`hs mcp setup`, 24 tools) no configurado — pierde productividad de desarrollo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Discovery + baseline

- Confirmar CLI version: `hs --version` ≥ 8.3.0 local y en CI. Upgrade si no.
- `hs project fetch <project-name>` sobre el proyecto live para snapshot pre-migración.
- Inventariar endpoints HubSpot API consumidos por `hubspot_client.py`: grep `HUBSPOT_API` y paths `/crm/v3/`, `/crm/v4/`, `/contacts/v1/`. Tabla: endpoint legacy → variante `/2026-03/` existente (si la hay).
- Inventariar propiedades custom del portal HubSpot: asegurar que `gh_deal_origin`, `gh_idempotency_key`, `linea_de_servicio`, `servicios_especificos` sobrevivan la migración sin cambios de schema.
- Developer Test Account: crear uno si no existe. Target del smoke de la migración.
- Dump del estado actual de la app en el portal HubSpot (settings, webhooks subscriptions, permisos) — snapshot para rollback.

### Slice 2 — Platform upgrade a 2026.03

- Rama: `task/TASK-575-hubspot-developer-platform-2026-upgrade`.
- Correr `hs project migrate` sobre el hsproject local del sibling (o del monorepo si TASK-574 cerró).
- Aceptar los prompts del CLI (formato `-hsmeta.json` per function, estructura `src/app/functions/`, etc.).
- Commit del migration result: `chore(hsproject): migrate to platformVersion 2026.03`.
- Deploy a Developer Test Account: `hs project upload --env=dev`. Smoke de webhooks + settings.
- Si smoke pasa: merge PR, deploy a production, smoke production.

### Slice 3 — Date-based API pinning

- Refactor `hubspot_client.py` para aceptar versión como config (default `2026-03`).
- Reemplazar paths hardcodeados `/crm/v3/*` por paths `/2026-03/crm/*` (o equivalente según doc oficial).
- Mantener fallback a `/v3/` o `/v4/` solo para endpoints que aún no tengan versión `2026-03` (documentar cada excepción).
- Tests del client deben cubrir:
  - llamada exitosa con version 2026-03
  - fallback a legacy version cuando el endpoint no existe en 2026-03
  - manejo de breaking change si HubSpot rechaza el path (response code claro, no silencioso)
- Deploy en Developer Test Account; smoke en production post-approve.

### Slice 4 — Webhooks Journal v4 batched reads (optional pero recomendado)

- Evaluar si el volumen de webhooks justifica el cambio (Fase 1 Discovery lo cuantifica).
- Si justifica: adoptar `POST /webhooks/v4/journal/batch/read` en lugar del handler uno-por-uno actual.
- Migrar subscriptions a LIST_MEMBERSHIP type donde aplique (hoy hay polling de lists en otra parte).
- Filtros CRM-style en subscriptions para reducir noise.
- Tests del webhook handler actualizados.

### Slice 5 — Serverless Functions piloto (optional, follow-up friendly)

- Identificar una ruta del bridge que sea candidata clara: stateless, bajo riesgo, no crítica para billing.
  - Candidatas probables: `GET /health`, `GET /contract`, `GET /deals/metadata`.
- Crear el slot de Serverless Function en `src/app/functions/` siguiendo el formato `-hsmeta.json` 2026.03.
- Migrar UNA ruta piloto como proof of concept.
- Documentar lecciones aprendidas antes de considerar migrar más rutas (follow-up por ruta).

### Slice 6 — Developer MCP Server local setup

- Documentar `hs mcp setup` como paso standard para devs del bridge.
- Agregar al `README.md` del servicio: cómo usar MCP tools (`hs project`, `hs project logs`, `hs project test`).
- Actualizar skill `hubspot-greenhouse-bridge` (creada en TASK-574) con MCP usage examples.

### Slice 7 — Docs + Handoff + changelog

- `docs/documentation/finance/crear-deal-desde-quote-builder.md` → nota de versión platform + API.
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` → sección 3 refleja platform 2026.03.
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` → si hay serverless functions piloto, diagrama actualizado.
- `AGENTS.md` + `CLAUDE.md` + `.codex/` equivalentes → declaran que el stack HubSpot vive en 2026.03.
- `Handoff.md` con fecha de cutover + revisión deployada + smoke ejecutado.
- `changelog.md` con el efecto operativo.

## Out of Scope

- Adopción de todas las rutas del bridge como Serverless Functions. Solo una piloto; lo demás queda como follow-up por ruta.
- Adopción de App Pages o Code Sharing via npm workspaces (no hay UI extensions activas hoy en el sibling/monorepo).
- Migración de integraciones MCP Auth Apps — tema separado, requiere diseño propio.
- Tocar el BQ sync (`main.py` + `greenhouse_bridge.py`) salvo que el upgrade de platform lo rompa. Si rompe, se fixea en este task pero sin rediseño.
- Reescritura del signature validation de webhooks — sigue igual salvo que 2026.03 introduzca signature v4 (no anunciado al 2026-04-23).

## Detailed Spec

### hsproject.json target

```json
{
  "name": "hubspot-bigquery",
  "srcDir": "src",
  "platformVersion": "2026.03"
}
```

### Date-based API endpoint mapping (ejemplos, no exhaustivo)

| Legacy | 2026-03 (target) | Notas |
|---|---|---|
| `/crm/v3/objects/deals` | `/2026-03/crm/objects/deals` | Usado por `POST /deals` del bridge |
| `/crm/v3/objects/companies` | `/2026-03/crm/objects/companies` | Usado por `/companies/*` |
| `/crm/v3/objects/products` | `/2026-03/crm/objects/products` | Usado por `/products/*` |
| `/crm/v4/associations` | `/2026-03/crm/associations` | Usado al asociar deal↔company |
| `/crm/v3/properties/{object}` | `/2026-03/crm/properties/{object}` | Usado por `/deals/metadata` |
| `/webhooks/v3/*` | `/2026-03/webhooks/*` | Si aplica — verificar en docs |

El mapping exacto se completa en Slice 1 Discovery con referencia a https://developers.hubspot.com/docs.

### Serverless Function hsmeta format (2026.03)

```
src/app/functions/
  health-hsmeta.json     # metadata de la function
  health.js              # handler
  contract-hsmeta.json
  contract.js
  ...
```

Formato de `-hsmeta.json` definido en la migration guide oficial.

### Webhooks Journal v4 batch consumption

```python
# En lugar de procesar request uno-por-uno
for event in events:
    process(event)

# Consumer batch:
response = requests.post(
    "https://api.hubapi.com/2026-03/webhooks/v4/journal/batch/read",
    json={"subscriptionIds": [...], "maxEvents": 100},
    headers=auth_headers,
)
for event in response.json()["events"]:
    process(event)
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `hsproject.json` declara `"platformVersion": "2026.03"`.
- [ ] `hs project upload --env=dev` contra Developer Test Account sale clean.
- [ ] Deploy production del Cloud Run post-migración responde las 17 rutas sin regresión.
- [ ] `POST /deals` smoke contra HubSpot sandbox crea deal real con response shape idéntico al pre-upgrade.
- [ ] `hubspot_client.py` llama a APIs `/2026-03/*` donde existe variante; cualquier excepción legacy está documentada inline con `# 2026-03 not available for <endpoint>`.
- [ ] Webhook handler: smoke post-upgrade con firma válida sigue sincronizando capabilities a `greenhouse-eo` sin regresión.
- [ ] Si Slice 4 ejecutada: batched read consumo ≥1 evento real desde production HubSpot.
- [ ] Si Slice 5 ejecutada: 1 ruta piloto migrada a Serverless Function responde desde el stack HubSpot en lugar de Cloud Run.
- [ ] `README.md` del servicio documenta cómo setup `hs mcp setup` + MCP tools.
- [ ] Skill `hubspot-greenhouse-bridge` actualizada con MCP workflow examples.
- [ ] Docs funcionales reflejan platform 2026.03.
- [ ] No hay breaking change para el consumer `greenhouse-eo` (`src/lib/integrations/hubspot-greenhouse-service.ts` sin cambios).

## Verification

- `hs --version` ≥ 8.3.0.
- `hs project list` muestra platformVersion 2026.03 post-migration.
- `gcloud run services describe hubspot-greenhouse-integration --region us-central1` muestra revisión nueva con image tag incluyendo commit de este task.
- Smoke manual: `pnpm staging:request POST /api/commercial/organizations/<id>/deals '{...}'` → `status=completed`.
- Webhook smoke: emitir webhook HubSpot sandbox con firma válida, confirmar que `sync_capabilities` llega a `greenhouse-eo`.
- Contract tests del bridge (si existen) pasan contra endpoints /2026-03/*.

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real
- [ ] Archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` documenta el upgrade (fecha, revisión, smoke, lecciones)
- [ ] `changelog.md` registra el salto de versión + efectos operativos
- [ ] Chequeo cruzado sobre `TASK-574` (quita el `[ ]` del acceptance criteria de "Follow-up TASK creada para migrar hsproject")
- [ ] Si se adoptó Serverless Function piloto, follow-ups declarados por cada ruta adicional que se quiera migrar
- [ ] `AGENTS.md` / `CLAUDE.md` / `.codex/` dejaron de mencionar v2025.2

## Follow-ups

- Si `TASK-576` termina antes o en paralelo, reusar su smoke de quotes como regression suite obligatoria para validar que 2026.03 no degradó el carril quote publish.
- Migrar rutas adicionales del bridge a Serverless Functions caso por caso (cada una con su task si el ROI justifica).
- Adoptar MCP Auth Apps si aparecen casos de uso para AI connectors sobre HubSpot (agentes Kortex, por ejemplo).
- Evaluar App Pages cuando se quiera exponer surface de Greenhouse dentro del portal HubSpot (no hay demanda hoy).
- Si el volumen de webhooks escala, migrar el webhook handler completo a Journal batched (hoy se deja como piloto en Slice 4).
- Crear skill `.claude/skills/hubspot-platform-2026/` con playbook de migración para futuros bumps de versión.

## Open Questions

- ¿Se adopta Serverless Function piloto (Slice 5) en este task o se defiere completo? Mi inclinación: UNA ruta como POC para validar la plataforma, el resto como follow-ups.
- ¿Migrar webhook handler a batched reads (Slice 4) en este task o como follow-up? Depende del volumen actual medido en Slice 1 Discovery.
- ¿El Developer Test Account existe o hay que crearlo? Bloqueante suave para el smoke de la migración.
- ¿Queda algún consumidor de HubSpot API directo (no pasando por el bridge) en `greenhouse-eo`? Si sí, requiere consideración para coordinar el upgrade de versión.
