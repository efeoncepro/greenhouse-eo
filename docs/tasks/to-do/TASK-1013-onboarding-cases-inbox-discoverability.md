# TASK-1013 — Onboarding cases inbox + discoverability (casos de lifecycle visibles y activables)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto` (sin esto, el deal-trigger de onboarding crea casos draft que el operador NO puede encontrar → flujo inutilizable end-to-end)
- Effort: `Medio`
- Type: `implementation` (UI + nav + reachability; backend ya existe)
- Epic: `EPIC-CLIENT-360`
- Domain: `commercial|ui|api|identity`
- Blocked by: `none` (backend `listLifecycleCases` + `/api/admin/clients/lifecycle/cases` ya en prod desde TASK-992)
- Derived from: `TASK-1010` (hallazgo 2026-06-04 durante verificación live post-release), `TASK-992` (orquestador lifecycle), `TASK-982` (reachability governance)
- Creada: 2026-06-04
- Mockup aprobado: 2026-06-05

## Summary

El **deal-trigger de onboarding** (TASK-1010 Slice 3, ya live en prod: deal HubSpot closed-won → `provisionClientLifecycle(triggerSource='hubspot_deal', status='draft')`) crea un `client_lifecycle_cases` en `draft` ligado a la organización del deal. **Pero no hay superficie UI donde el operador lo vea/active.** Hoy el único acceso al caso es el timeline per-organización `/agency/clients/[organizationId]/lifecycle`, y ese timeline **solo está linkeado desde el SuccessScreen del propio wizard** (`ClientOnboardingView.tsx:2604`, justo tras un alta manual). No hay link desde Organizaciones, ni desde Account 360, ni un **inbox de casos pendientes**, ni entry en el manifest de reachability (TASK-982). Resultado: un caso draft creado por el trigger es **invisible** — el operador tendría que saber el `organizationId` y tipear la URL.

## Why

- El deal-trigger ya está **live en prod** (flag `CLIENT_LIFECYCLE_HUBSPOT_DEAL_TRIGGER_ENABLED=true`, subscription Build #26, código en main). En cuanto un deal real pase a closed-won, se creará un caso draft que **nadie verá**. El trigger es server-side-correcto pero operacionalmente incompleto sin la superficie.
- El onboarding **manual** (wizard) sí está completo (alta → SuccessScreen → timeline). El gap es exclusivo de los casos que nacen **fuera** del wizard (deal-trigger; futuros triggers).
- Es además una **ruta huérfana** según TASK-982 (la lifecycle timeline solo se alcanza desde el SuccessScreen).

## Goal

1. El operador VE los casos de onboarding en vuelo (especialmente `draft` pendientes de activación) en una superficie discoverable, sin tipear URLs.
2. Desde ahí puede abrir el timeline del caso y **activarlo** (`draft → in_progress` vía el resolve/advance ya existente).
3. La ruta del timeline queda enlazada desde Organizaciones/Account 360 cuando la org tiene un caso activo, y declarada en el reachability manifest.

## Mockup aprobado — regla dura de implementación

**Aprobado por el operador el 2026-06-05. No rediseñar.** La dirección visual y de interacción aprobada es el mockup **Inbox + Timeline Preview**:

- Ruta mockup: `/agency/clients/onboarding/mockup`
- View mockup: `src/views/greenhouse/agency/clients/mockup/onboarding-cases/OnboardingCasesInboxMockupView.tsx`
- Scenario GVC: `scripts/frontend/scenarios/onboarding-cases-inbox-mockup.scenario.ts`
- Evidencia GVC aprobada: `.captures/2026-06-05T00-33-42_onboarding-cases-inbox-mockup` (desktop + mobile, dossier `review-dossier.md`)

Reglas duras para el agente que implemente TASK-1013:

- **NO sustituir ni rediseñar el wizard** `/agency/clients/new`. El cockpit lo complementa: hace visibles los casos en vuelo y su CTA primario `Nuevo cliente` sigue entrando al wizard existente.
- **NO inventar otra IA/layout/nav para esta task.** La ruta runtime debe cablear el patrón aprobado: header + aviso explícito de que no reemplaza el wizard + KPIs + inbox seleccionable + preview de timeline + rail de acción.
- **NO convertir el inbox en una tabla apretada.** La dirección aprobada es lista/inbox compacta a la izquierda, preview de checklist/timeline al centro y acciones/fuente/SLA a la derecha en desktop; en mobile debe apilar sin perder CTAs.
- **Sí cablear datos reales** reemplazando mock data con readers/API existentes: `listLifecycleCases`, enriquecimiento de organización, checklist del caso, links al timeline y acciones ya existentes.
- **Sí conservar copy/aria en capa canónica** (`src/lib/copy/client-onboarding.ts` o el namespace correspondiente), estados honestos y GVC en loop antes de declarar listo.

## Current Repo State

**Ya existe (backend completo — NO reconstruir):**
- `listLifecycleCases(...)` — `src/lib/client-lifecycle/store.ts:263` (lista con filtros status/caseKind/overdue + cursor/pageSize).
- `listCasesForOrganization(...)` — `store.ts:310`; `getActiveCaseForOrganization(...)` — `store.ts:138`.
- `GET /api/admin/clients/lifecycle/cases?status=&caseKind=&overdue=&cursor=&pageSize=` — `src/app/api/admin/clients/lifecycle/cases/route.ts` (gated `client.lifecycle.case.read`).
- Timeline page `/agency/clients/[organizationId]/lifecycle/page.tsx` (consume `getActiveCaseForOrganization` + `getChecklistItems` + degradación honesta).
- Componente `LifecycleTimeline.tsx` + mockup `LifecycleTimelineMockup.tsx` (referencia visual aprobada).
- Activación/avance: comandos en `src/lib/client-lifecycle/commands/` + `/api/admin/clients/lifecycle/cases/[caseId]/{resolve,items/[itemCode]}`.

**Gap (lo que falta — UI/nav/reachability):**
- Ninguna vista consume `GET /api/admin/clients/lifecycle/cases` (verificado: solo los route.ts lo referencian).
- `/agency/clients/[organizationId]/lifecycle` solo linkeado desde el SuccessScreen del wizard.
- No está en `src/lib/navigation/route-reachability-manifest.ts`.
- Organizaciones/Account 360 no muestran estado de caso ni link al onboarding.

## Scope (slices)

### Slice 1 — Inbox de casos de onboarding (vista lista)
- Vista nueva que consume `GET /api/admin/clients/lifecycle/cases` con filtros (status default destacando `draft` + `in_progress` + `blocked`; `overdue`). Debe seguir el mockup aprobado: lista/inbox seleccionable, no tabla densa apretada; preview del checklist/timeline del caso seleccionado; rail de acciones con "Abrir timeline" y "Activar caso" cuando aplique.
- **Decisión IA cerrada y aprobada**: el ítem de nav "Alta de cliente" pasa a apuntar al **cockpit de onboarding** `/agency/clients/onboarding`, que muestra el inbox de casos en vuelo + un CTA primary "Nuevo cliente" → `/agency/clients/new` (wizard). Así el wizard sigue siendo la puerta, pero los casos en vuelo (incluido el deal-trigger draft) son visibles.
- Loop de diseño obligatorio (CLAUDE.md UI hook): `greenhouse-ux` + `state-design` (loading/empty/degraded honestos) + `greenhouse-ux-writing` (es-CL) + GVC en loop. Empty state honesto cuando no hay casos.

### Slice 2 — Discoverability cruzada (Organizaciones / Account 360)
- Donde se lista/ve una organización, mostrar un indicador cuando tiene un caso de onboarding activo (chip "Onboarding en curso" / "Borrador pendiente") + link al timeline `/agency/clients/[organizationId]/lifecycle`.
- Reusar `getActiveCaseForOrganization` (no recomputar).

### Slice 3 — Reachability governance (TASK-982)
- Declarar `/agency/clients/[organizationId]/lifecycle` + la ruta del inbox en `src/lib/navigation/route-reachability-manifest.ts` (parent + via + reason), o como link estático desde el inbox/Organizaciones. Correr `pnpm route-reachability-gate`.

### Slice 4 (opcional V1.1) — Notificación al aparecer un caso draft por trigger
- Cuando el deal-trigger crea un caso draft, emitir una señal/notificación (Home/Nexa o Teams) para que el operador sepa que hay un alta esperando activación. Evaluar reuso de Notification Hub. Diferible si V1 (inbox visible) ya cubre el caso operativo.

## Out of Scope

- Reconstruir el backend de lifecycle (existe completo).
- Cambiar el wizard de alta (`/agency/clients/new`) — funciona y está live.
- Cambiar el modelo de estados del caso (`client_lifecycle_cases`).
- La activación del caso en sí (comandos ya existen) — solo se cablea el CTA.

## Acceptance Criteria

- [ ] Existe una superficie discoverable (en nav) que lista los casos de onboarding en vuelo, con los `draft` destacados.
- [ ] Un caso draft creado por el deal-trigger aparece en esa lista sin tipear URLs.
- [ ] Desde la lista, "Abrir" lleva al timeline del caso; desde ahí se puede activar (`draft → in_progress`).
- [ ] Organizaciones/Account 360 muestran indicador + link cuando la org tiene caso activo.
- [ ] `/agency/clients/[organizationId]/lifecycle` (y la ruta del inbox) declaradas en el reachability manifest; `pnpm route-reachability-gate` verde.
- [ ] Estados honestos (loading/empty/degraded) verificados con GVC; copy es-CL validado con `greenhouse-ux-writing`.

## Rollout Plan & Risk Matrix

- **Riesgo**: bajo. Es UI + nav + reachability sobre backend existente. Sin migraciones, sin cambios de schema, sin flags nuevos (la capability `client.lifecycle.case.read` ya existe + está grant-eada).
- **Flags/cutover**: ninguno nuevo. La superficie aparece para roles con `client.lifecycle.case.read`.
- **Rollback**: revert PR + redeploy.
- **Verificación prod**: tras release, confirmar que un caso draft (real o de prueba rollback-safe) aparece en el inbox + se puede abrir/activar.

## Follow-ups

- Si emerge otro trigger que cree casos (quote-accepted, manual-import), el inbox ya los cubre (consume `listLifecycleCases` genérico).
