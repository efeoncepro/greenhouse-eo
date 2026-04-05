# ISSUE-013 — Staging deploy failures: proyecto duplicado, variables faltantes y bypass secret incorrecto

## Ambiente

staging + preview + GitHub (deploy status)

## Detectado

2026-04-05, revisión manual tras reportes constantes de failures en GitHub por cada push a `develop`.

## Síntoma

1. **GitHub mostraba failures constantes** en cada push — un deploy siempre fallaba con `NEXTAUTH_SECRET is not set`.
2. **Agent Auth no funcionaba en staging** — `POST /api/auth/agent-session` devolvía 404 (endpoint invisible por falta de `AGENT_AUTH_SECRET`).
3. **Bypass de SSO no funcionaba** — requests programáticas a staging con `x-vercel-protection-bypass` header eran bloqueadas por Vercel Authentication.

## Causa raíz

**Tres problemas independientes:**

### 1. Proyecto Vercel duplicado

Existía un segundo proyecto Vercel (`prj_5zqdjJOz6OUQy7hiPh8xHZJj8tA8`) en scope personal (`julioreyes-4376's projects`) vinculado al mismo repositorio GitHub. Este proyecto tenía:

- 0 variables de entorno
- Sin framework preset configurado
- Cada push a GitHub disparaba builds en AMBOS proyectos — el duplicado siempre fallaba

### 2. Variables de Agent Auth no configuradas en Vercel

`AGENT_AUTH_SECRET` y `AGENT_AUTH_EMAIL` existían en `.env.local` pero nunca se habían agregado a los entornos de Vercel. Sin `AGENT_AUTH_SECRET`, el endpoint responde 404 por diseño.

### 3. VERCEL_AUTOMATION_BYPASS_SECRET manual con valor incorrecto

Otro agente había creado manualmente la variable `VERCEL_AUTOMATION_BYPASS_SECRET` en staging y preview(develop) con valor `c2f708b52fa4d2d9af8d6bd2fa981896fceadae26422adc4ce47e5b39598284c`. Este valor NO correspondía al secret real del sistema (`gNYWFfHSlny2FXL7CO7IBnZuuJaEkIPJ`, visible en `protectionBypass` del proyecto via API).

La variable manual sombreaba la auto-gestionada por Vercel, rompiendo silenciosamente el bypass de SSO.

## Impacto

- GitHub mostraba failure en cada push, dificultando ver el estado real de los deploys.
- Agentes AI y tests E2E no podían autenticarse en staging ni en preview.
- Cualquier acceso programático a staging era bloqueado por SSO sin posibilidad de bypass.

## Solución

1. **Eliminado proyecto duplicado** via Vercel API (`DELETE /v9/projects/prj_5zqdjJOz6OUQy7hiPh8xHZJj8tA8`).
2. **Agregadas variables** `AGENT_AUTH_SECRET` y `AGENT_AUTH_EMAIL` a Staging + Preview(develop) via `vercel env add`.
3. **Eliminadas variables manuales** `VERCEL_AUTOMATION_BYPASS_SECRET` de staging y preview(develop) via `vercel env rm`.

## Verificación

- `POST /api/auth/agent-session` en staging con bypass header → HTTP 200, JWT válido para `user-agent-e2e-001`
- GitHub deploy status: sin failures adicionales tras eliminar proyecto duplicado
- Vercel dashboard: solo el proyecto canónico `greenhouse-eo` existe para el team `efeonce-7670142f`

## Estado

resolved

## Relacionado

- Sección "Vercel Deployment Protection (SSO)" en `AGENTS.md`
- Sección "Proyecto Vercel único" en `AGENTS.md`
- Delta "Vercel Deployment Protection, bypass SSO y proyecto único" en `project_context.md`
- Sección "Agent Auth" en `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `src/app/api/auth/agent-session/route.ts`
