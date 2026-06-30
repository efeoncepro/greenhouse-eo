# Search Console Connection UI V1

> **Tipo:** arquitectura de consumer UI
> **Estado:** code complete, rollout pendiente
> **Task:** `TASK-1283`
> **Contrato backend:** `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` §TASK-1282

## Decision

El primer consumer visible de Google Search Console vive en el Account-360 del cliente, ruta `/agency/clients/[organizationId]/lifecycle`, como `SearchConsoleConnectionPanel`.

La UI no implementa negocio OAuth ni lee tablas directamente. Consume:

- `getSearchConsoleConnection(orgId)` para estado.
- `GET /api/admin/growth/search-console/oauth/start` para iniciar OAuth.
- `GET /api/admin/growth/search-console/oauth/callback` para completar OAuth.
- `POST /api/admin/growth/search-console/disconnect` para desconectar.

## Runtime Contract

- El panel está gated por `GROWTH_SEARCH_CONSOLE_ENABLED` y capability `growth.search_console.connect`.
- El operador ingresa la propiedad exacta (`sc-domain:` o URL) antes del redirect.
- El callback conserva JSON por defecto para consumidores programáticos.
- El callback sólo redirige 303 al panel cuando el state trae un `returnTo` interno sanitizado.
- `returnToPath` viaja codificado dentro del raw state y se hashea igual que el state original; no hay schema nuevo.
- Tokens OAuth nunca llegan al cliente ni se guardan en Postgres.

## States

- `No conectado`: input de propiedad + CTA `Conectar`.
- `Conectado`: propiedad visible + última verificación + CTA `Desconectar`.
- `Revocado` / `Expirado`: estado honesto + CTA `Reconectar`.
- `Sin permiso`: estado visible sin acciones.
- Flag OFF: estado locked, sin acciones.
- Error de callback/desconexión: copy es-CL sanitizada, sin raw provider errors.

## Rollout

El código está completo localmente, pero la operación real depende de TASK-1282:

- OAuth client + consent screen Google.
- Secrets OAuth.
- IAM secret-write para `search-console-token-*`.
- Flag ON en staging.
- OAuth round-trip real y GVC de estados connected/revoked/dialog.

Hasta esa evidencia, el cierre correcto es `code complete, rollout pendiente`.
