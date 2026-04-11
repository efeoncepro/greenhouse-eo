# GREENHOUSE_REPO_ECOSYSTEM_V1.md

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

## Delta 2026-04-11 — TASK-377 deja cerrado el primer handoff Greenhouse -> Kortex

- El primer bridge Kortex ya no debe interpretarse como “hacer todo el carril en un solo repo”.
- Split bilateral explícito:
  - `greenhouse-eo` owns:
    - binding canónico
    - consumer auth
    - read lane endurecido
    - payloads operativos read-only
  - `kortex` owns:
    - consumer implementation
    - operator console composition
    - CRM reasoning
    - lifecycle propio de HubSpot / agentes / despliegues
- Prioridad de payload para el primer bridge:
  - `delivery / ICO`
  - `project health`
  - `organization / space summaries`
  - `sprints` como segunda ola
  - `assigned team / capacity` como resumen posterior

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

### 3. HubSpot -> BigQuery CRM pipeline

- Repo: `cesargrowth11/hubspot-bigquery`
- Rol: Cloud Function que sincroniza HubSpot hacia BigQuery (`hubspot_crm`) y opera el bridge con Greenhouse para catalogo/capabilities y lecturas salientes
- Source of truth para:
  - ingestion CRM desde HubSpot
  - shape de `hubspot_crm.*`
  - bridge operativo entre HubSpot y Greenhouse
- Tomar desde aqui cuando el cambio afecte:
  - contacts, companies, deals, tickets, services u otros objetos CRM en BigQuery
  - custom properties o asociaciones de HubSpot
  - bridges de capabilities / tenant pulls entre HubSpot y Greenhouse

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
- Regla del primer bridge:
  - Greenhouse expone el contexto operativo read-only
  - Kortex consume ese contexto y decide como integrarlo a su UX y runtime
  - no se debe abrir una surface Kortex-specific en Greenhouse si el lane sister-platform reusable ya cubre el contrato

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
| UX, rutas, permisos, modulos del portal     | `greenhouse-eo`               |
| Layout base, shell o tema Vuexy             | `vuexy-nextjs-admin-template` |
| Notion -> BigQuery operativo (`notion_ops`) | `notion-bigquery`             |
| HubSpot -> BigQuery / bridge CRM            | `hubspot-bigquery`            |
| Notificaciones Notion -> Teams              | `notion-teams`                |
| Sync de revision Notion <-> Frame.io        | `notion-frame-io`             |
| Agentes/Kortex/MCP fuera del portal         | `kortex`                      |

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
- Cuando un task diga `Greenhouse -> Kortex`:
  - el provider-side va en `greenhouse-eo`
  - el consumer-side va en `kortex`
  - si el contrato aún no existe, primero se cierra aquí y recién después se implementa aguas afuera

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
