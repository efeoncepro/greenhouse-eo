# GREENHOUSE_REPO_ECOSYSTEM_V1.md

## Delta 2026-04-24 — `notion-bigquery` queda como repo hermano; dependencia sí, absorción no todavía

- Fuente canónica nueva:
  - `docs/architecture/GREENHOUSE_NOTION_BIGQUERY_ABSORPTION_DECISION_V1.md`
- Decisión vigente:
  - `greenhouse-eo` sí depende operativamente de `notion-bq-sync`
  - esa dependencia no obliga todavía a absorber `cesargrowth11/notion-bigquery` al monorepo
  - primero se debe endurecer costo/auth/identidad del servicio actual y recién después reevaluar ownership

## Delta 2026-04-11 — Sister platforms contract now governs cross-repo integration posture

- La relación entre `greenhouse-eo` y plataformas hermanas del ecosistema ya no debe inferirse solo desde esta lista operativa.
- Fuente canónica nueva:
  - `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- Primer anexo activo:
  - `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- Regla operativa nueva:
  - los repos hermanos tipo plataforma deben tratarse como `peer systems`
  - la lista de este documento sigue definiendo `quién consulta a quién`
  - el contrato arquitectónico nuevo define `cómo se integran`

## Objetivo

Dejar explicito que `greenhouse-eo` no vive aislado: depende de un ecosistema pequeño de repos hermanos que cubren pipelines, notificaciones e inteligencia adyacente, y de un upstream de referencia para la base Vuexy.

Este documento existe para que cualquier agente sepa:

- que repo consultar primero segun el dominio
- que repo parece ser source of truth operativo de cada integracion
- cuando no corresponde implementar algo dentro de `greenhouse-eo`

## Regla base

- `greenhouse-eo` es el portal y la capa de experiencia Greenhouse.
- Los repos hermanos no deben tratarse como anexos casuales: cada uno tiene ownership funcional propio.
- Si un cambio depende de una integracion o pipeline que runtimea fuera de este repo, revisar primero el repo hermano correspondiente.
- Si el cambio cruza dos o mas repos, documentar explicitamente en `Handoff.md` que parte quedo implementada aqui y que parte queda aguas afuera.

## Repos hermanos canonicos

Nota:

- Esta lista incluye repos operativos hermanos y un upstream de referencia del starter/theme cuando ese upstream afecta decisiones reales de implementacion.

### 1. Portal Greenhouse

- Repo: `efeoncepro/greenhouse-eo`
- Rol: portal principal sobre Next.js + Vuexy + MUI
- Source of truth para:
  - rutas, layouts y UX del portal
  - auth del portal
  - modulos transaccionales Greenhouse (`People`, `HR/Payroll`, `Finance`, `Admin`, `Agency`)
  - contratos API expuestos por el portal
- Tomar desde aqui cuando el cambio afecte:
  - UI o navegacion
  - rutas App Router
  - permisos y route groups
  - runtime Postgres-first / BigQuery fallback del portal

### 2. Notion -> BigQuery delivery pipeline

- Repo: `cesargrowth11/notion-bigquery`
- Rol: Cloud Function que sincroniza Notion hacia BigQuery (`notion_ops`) y genera tablas operativas/staging para analitica
- Source of truth para:
  - extraccion de bases de Notion (`tareas`, `proyectos`, `sprints`, `revisiones`)
  - shape operativo de `notion_ops.*`
  - logica de sync y refresh del pipeline Notion
- Tomar desde aqui cuando el cambio afecte:
  - schema o columnas de `notion_ops`
  - mapeo de propiedades de Notion
  - materializacion/sync de delivery desde Notion a BigQuery
- No asumir que `greenhouse-eo` puede corregir por si solo un gap del pipeline si la columna o la logica nace en esta Cloud Function.

### 3. HubSpot -> BigQuery CRM pipeline (SIBLING)

- Repo: `cesargrowth11/hubspot-bigquery`
- Rol (tras **TASK-574**, 2026-04-24): Cloud Function `hubspot-bq-sync` que sincroniza HubSpot hacia BigQuery (`hubspot_crm`) + app HubSpot Developer Platform (`hsproject.json`, `src/app/`) + scripts ops contra el portal HubSpot y Secret Manager.
- Source of truth para:
  - ingestion CRM desde HubSpot (Cloud Function `main.py`)
  - shape de `hubspot_crm.*`
  - app scopes HubSpot + configuracion de webhooks
  - `greenhouse_bridge.py` (bridge de capabilities batch dentro del BQ sync — no confundir con el write bridge HTTP)
- Tomar desde aqui cuando el cambio afecte:
  - contacts, companies, deals, tickets, services u otros objetos CRM en BigQuery
  - scopes de la app HubSpot o propiedades que impactan la ingestion
  - jobs ops contra el portal HubSpot (creacion de properties, backfill de capabilities)
- **YA NO vive aqui** (post TASK-574): el write bridge HTTP + webhook handler — ver 3.1.

### 3.1. HubSpot write bridge + webhooks (MONOREPO, post TASK-574)

- Repo: **`efeoncepro/greenhouse-eo`** — `services/hubspot_greenhouse_integration/`
- Rol: Cloud Run Python/Flask que expone 23 rutas HTTP de lectura/escritura contra HubSpot CRM + recibe webhooks HubSpot inbound (HMAC-validated) y los propaga al runtime Next.js via `GreenhouseClient`.
- URL publica (inalterada por el cutover): `https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app` (region `us-central1`)
- Source of truth para:
  - contrato HTTP `/deals`, `/companies/*`, `/products/*`, `/quotes/*`, `/services/*`, `/owners/*`, `/webhooks/hubspot`
  - deploy via `.github/workflows/hubspot-greenhouse-integration-deploy.yml` (WIF, primer CI que este codigo tiene)
  - tests pytest `services/hubspot_greenhouse_integration/tests/test_app.py`
  - skill operativa `.claude/skills/hubspot-greenhouse-bridge/` + `.codex/skills/hubspot-greenhouse-bridge/`
- Tomar desde aqui cuando el cambio afecte:
  - cualquier route HTTP del bridge (request shape, response shape, auth, idempotency)
  - validacion del webhook signature (`HUBSPOT_APP_CLIENT_SECRET`)
  - deploy pipeline, Dockerfile, dependencies Python
  - rotacion del token `GREENHOUSE_INTEGRATION_API_TOKEN` (coordinada con Vercel)

### 4. Notion -> Teams notifier

- Repo: `cesargrowth11/notion-teams`
- Rol: Cloud Function que recibe eventos/cambios de Notion y publica notificaciones hacia Microsoft Teams
- Source of truth para:
  - webhook `/notify`
  - ruteo de chats por proyecto
  - integracion Notion -> Teams / Microsoft Graph del notificador
- Tomar desde aqui cuando el cambio afecte:
  - mensajes o notificaciones enviadas a Teams por eventos Notion
  - configuracion de chat por defecto o por proyecto
  - health/admin panel del notificador

### 5. Notion <-> Frame.io review sync

- Repo: `cesargrowth11/notion-frame-io`
- Rol: Cloud Function que sincroniza estado y senales de revision entre Notion y Frame.io V4
- Source of truth para:
  - webhook Notion -> Frame.io
  - webhook Frame.io -> Notion
  - conteos de versiones/comentarios y senales de revision asociadas a tareas
- Tomar desde aqui cuando el cambio afecte:
  - propiedades de Notion relacionadas con Frame.io
  - eventos `file.created`, `file.versioned`, `comment.*`
  - rounds de cambio y metadata de revision

### 6. Kortex

- Repo: `efeoncepro/kortex`
- Rol: plataforma separada con frontend Next.js + runtime Python para agentes, despliegues y analitica sobre BigQuery
- Source of truth para:
  - agent orchestration propia de Kortex
  - MCP / tooling asociado a HubSpot o flujos de inteligencia de Kortex
  - runtime Python y jobs que no pertenecen al portal Greenhouse
- Tomar desde aqui cuando el cambio afecte:
  - patrones o runtime de agentes fuera del portal
  - inteligencia CRM y tooling que viva en la plataforma Kortex
  - flujos B2B SaaS o despliegues propios de Kortex
- Regla importante:
  - `kortex` es repo hermano, no submodulo ni package interno de `greenhouse-eo`
  - usarlo como referencia de ownership funcional o integracion, no como source of truth de UX del portal Greenhouse

### 7. Vuexy Next.js Admin Template

- Repo: `pixinvent/vuexy-nextjs-admin-template`
- Rol: upstream de referencia del starter/theme Vuexy sobre Next.js que Greenhouse adapta en este portal
- Source of truth para:
  - patrones base de layout, shell y navegacion heredados de Vuexy
  - ejemplos originales del starter, wiring del tema y convenciones base de la plantilla
  - contraste entre el template upstream y las referencias locales (`starter-kit` / `full-version`) cuando haya duda sobre comportamiento base
- Tomar desde aqui cuando el cambio afecte:
  - layout global, navegacion base, settings o shell heredado de Vuexy
  - componentes o patrones de la plantilla que Greenhouse este adaptando
  - dudas sobre si un comportamiento viene del template original o de una customizacion Greenhouse
- Guardrail:
  - no tratar este repo como source of truth funcional del producto
  - no copiar componentes o flujos a ciegas; toda integracion debe adaptarse al contexto Greenhouse

## Regla de seleccion rapida

| Si el cambio toca...                        | Consultar primero             |
| ------------------------------------------- | ----------------------------- |
| UX, rutas, permisos, modulos del portal                                   | `greenhouse-eo`               |
| Layout base, shell o tema Vuexy                                           | `vuexy-nextjs-admin-template` |
| Notion -> BigQuery operativo (`notion_ops`)                               | `notion-bigquery`             |
| **HubSpot write bridge + webhooks** (rutas Cloud Run, 23 endpoints)       | **`greenhouse-eo`** (`services/hubspot_greenhouse_integration/`, post TASK-574) |
| HubSpot -> BigQuery ingestion CRM + app config HubSpot Developer Platform | `hubspot-bigquery`            |
| Notificaciones Notion -> Teams                                            | `notion-teams`                |
| Sync de revision Notion <-> Frame.io                                      | `notion-frame-io`             |
| Agentes/Kortex/MCP fuera del portal                                       | `kortex`                      |

## Guardrails para agentes

- No reimplementar dentro de `greenhouse-eo` una logica cuyo ownership ya vive en un repo hermano.
- Si desde `greenhouse-eo` solo se consume una tabla o efecto externo, tratar el repo hermano como upstream.
- Si una task del portal depende de un cambio aguas arriba, dejarlo explicitado en la task y en `Handoff.md`.
- Cuando haya duda entre `notion-bigquery` y `notion-frame-io`:
  - `notion-bigquery` owns la carga analitica de Notion hacia BigQuery
  - `notion-frame-io` owns la sincronizacion operativa de estados/senales de revision con Frame.io
- Cuando haya duda entre `greenhouse-eo` y `kortex`:
  - `greenhouse-eo` owns la experiencia Greenhouse
  - `kortex` owns su propia plataforma y runtime de agentes

## Estado actual validado

- Repos verificados por GitHub CLI en esta sesion:
  - `efeoncepro/greenhouse-eo`
  - `cesargrowth11/notion-bigquery`
  - `cesargrowth11/hubspot-bigquery`
  - `cesargrowth11/notion-teams`
  - `cesargrowth11/notion-frame-io`
  - `efeoncepro/kortex`
  - `pixinvent/vuexy-nextjs-admin-template`
- Esta lista debe mantenerse corta y util. Si aparece otro repo realmente operativo para Greenhouse, agregarlo aqui y dejar solo un delta breve en `project_context.md` y `Handoff.md`.
