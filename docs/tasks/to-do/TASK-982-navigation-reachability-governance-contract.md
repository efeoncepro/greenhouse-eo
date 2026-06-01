# TASK-982 — Navigation Reachability Governance + Orphan-Surface Contract

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013` (disparador) + platform-wide governance
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform`
- Blocked by: `none`
- Branch: `task/TASK-982-navigation-reachability-governance`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra el bug class **"superficie huérfana"**: rutas reales de `src/app/(dashboard)/**` que existen pero no son alcanzables por navegación (ni item de menú, ni botón/CTA en su workbench padre, ni link contextual). Disparador concreto: el wizard de onboarding de contractors `/hr/contractors/new` (TASK-976) quedó **sin ninguna puerta de entrada** — solo se llega tecleando la URL. La solución NO es "agregar un botón": es (1) estandarizar el **patrón canónico de acción primaria en header de workbench**, y (2) introducir un **gate de alcanzabilidad** (test/CI) que falle el build si cualquier ruta nueva queda huérfana — espejo de la governance de TASK-827 (`viewCode ↔ migración`), pero para `ruta ↔ nav`.

## Why This Task Exists

Greenhouse organiza el nav **por audiencia/mental-model** (Finanzas paga → Finanzas·Tesorería; HR gobierna → Supervisión; contractor se autogestiona → Mi Greenhouse). Eso es **correcto** y no se toca. El problema real, detectado auditando EPIC-013 con las skills `info-architecture` + `greenhouse-ux`:

1. **Síntoma**: `/hr/contractors/new` (onboarding, TASK-976) no tiene item de menú, ni botón en `ContractorAdminWorkbenchView`, ni link contextual. Viola la regla dura de IA *"toda ruta real debe ser alcanzable"*. Un admin no puede crear un contractor desde la UI.
2. **Causa raíz**: **no existe ningún gate que garantice alcanzabilidad de rutas**. Hoy se puede crear un `page.tsx` y quedar huérfano sin que nada lo detecte. TASK-827 gobierna `viewCode ↔ migración seed`, pero nadie gobierna `ruta ↔ nav`. Mientras eso no exista, cada dominio nuevo del EPIC-013 (TASK-797 closure, TASK-798 ops console) y de cualquier epic futuro va a repetir el huérfano.

Sin el gate (Capa 2), el fix del botón (Capa 1) es un parche local que no evita la recurrencia.

## Goal

- Ninguna ruta real de `(dashboard)` queda huérfana: toda ruta es alcanzable por menú, por padre declarado (CTA), o es un detalle dinámico `[id]`.
- Patrón canónico documentado y aplicado: **acción primaria en header de workbench** para rutas `…/new` (crear).
- Gate mecánico (test/CI) que falla el build ante un huérfano nuevo — anti-recurrencia.
- El onboarding de contractors (`/hr/contractors/new`) alcanzable desde el workbench `/hr/contractors`.
- Doctrina de IA escalable para dominios multi-superficie (hub-por-audiencia + workbench con header actions + tabs locales + drawers por fila + ⌘K como red supplemental), lista para TASK-797/798.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — stack UI, patrones de navegación, VerticalMenu.
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — `routeGroups` + `authorizedViews` + `view_code`.
- TASK-827 "View Registry Governance Pattern" (CLAUDE.md) — el molde de governance a espejar (`viewCode ↔ migración`; señal load-bearing; gate mecánico).
- Skills product design cargadas en el diseño: `info-architecture` (4 sistemas de nav, wayfinding 5, anti-orphan) + `greenhouse-ux` (header primary action, tokens `h4`/`subtitle1`/1 primary contained, DataTableShell, drawers, interaction-cost ≤2 clicks).

Reglas obligatorias:

- **Organizar por mental-model/audiencia, NUNCA por backend.** El scatter actual (Finanzas/Supervisión/Mi Greenhouse) es correcto — no se centraliza el dominio en un grupo de menú nuevo.
- **No inflar el sidebar**: ≤7 items por nivel (Miller). Dominios nuevos NO crean grupo top-level propio; se anclan en la casa de su audiencia.
- **Acción primaria en header**: toda lista/workbench con ruta `…/new` expone esa ruta como **1 botón primary contained** en su header (`tabler-plus` + copy "Nuevo X"). Semánticos reservados para estado, no para CTA.
- **Active state + wayfinding 5** en toda superficie alcanzable.
- **TASK-827 contract intacto**: cualquier `viewCode` nuevo requiere migración seed en el mismo PR. Este task NO crea viewCodes nuevos (las 3 superficies del EPIC ya los tienen: `equipo.contratistas`, `finanzas.contractor_payables`, `mi_ficha.mi_contratacion`).

## Normative Docs

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md` — superficies EPIC-013.
- `docs/tasks/complete/TASK-976-contractor-onboarding-create-engagement.md` — la ruta huérfana `/hr/contractors/new`.
- `docs/tasks/complete/TASK-975-contractor-engagement-detail-lifecycle-classification.md` — el workbench `/hr/contractors` + drawers.

## Dependencies & Impact

### Depends on

- EPIC-013 superficies ya shippeadas (TASK-974/975/976/796) — los `page.tsx` ya existen.
- `src/components/layout/vertical/VerticalMenu.tsx` — fuente actual de anclaje del nav.
- `src/lib/admin/view-access-catalog.ts` (`VIEW_REGISTRY`) — `routePath` por viewCode.

### Blocks / Impacts

- **TASK-797** (Contractor Closure) y **TASK-798** (Contractor Reliability Ops Console): heredan el patrón header-action + el gate de alcanzabilidad. Sin este task, repiten el huérfano.
- Cualquier task futura que cree un `page.tsx` bajo `(dashboard)`: el gate la obliga a declarar su anclaje.

### Files owned

- `src/views/greenhouse/contractors/ContractorAdminWorkbenchView.tsx` (header CTA — Slice 1)
- `scripts/ci/route-reachability-gate.mjs` (gate nuevo — Slice 2)
- `src/lib/navigation/route-reachability-manifest.ts` (manifest de rutas-hijas declaradas — Slice 2)
- `.github/workflows/ci.yml` (wire del gate — Slice 2)
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` (doctrina — Slice 2/3)
- `CLAUDE.md` (invariante "Navigation Reachability" — Slice 2)

## Current Repo State

### Already exists

- 3 superficies EPIC-013 ancladas en el menú: `/finance/contractor-payments` (Finanzas·Tesorería), `/hr/contractors` (Supervisión submenu), `/my/contractor` (Mi Greenhouse, role-gated por `hasActiveContractorEngagement`).
- `VerticalMenu.tsx` filtra items por `canSeeView(viewCode, true)`.
- TASK-827 governance (`viewCode ↔ migración`) + señal `role_view_fallback_used` — el molde a espejar.
- Command palette "Buscar ⌘K" en el header (a auditar en Slice 3).

### Gap

- `/hr/contractors/new` (onboarding, TASK-976): **huérfano** — sin item de menú, sin botón en el workbench (`ContractorAdminWorkbenchView` no tiene CTA a `/new`), sin link contextual. Solo alcanzable por URL.
- **No existe gate de alcanzabilidad ruta↔nav.** Un `page.tsx` nuevo puede quedar huérfano silenciosamente.
- No hay doctrina documentada de "cómo se expone un dominio multi-superficie" → cada dominio improvisa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Header primary-action pattern (cierra el huérfano)

- Agregar botón **primary contained** "Nuevo contractor" (`tabler-plus`) en el header de `ContractorAdminWorkbenchView` → navega a `/hr/contractors/new`. Gated por la misma capability/viewCode del workbench (`equipo.contratistas` + capability de crear).
- Verificar/normalizar que `/finance/contractor-payments` y `/my/contractor` tengan sus entradas correctas (la primera ya tiene "crear payable"; la segunda es role-gated correcta).
- Validar con GVC (`pnpm fe:capture`) el header del workbench + el flujo click → wizard.

### Slice 2 — Route reachability gate (anti-recurrencia, lo escalable)

- `src/lib/navigation/route-reachability-manifest.ts`: declara las **rutas-hijas** (sub-acciones) con su padre + cómo se alcanzan (ej. `{ route: '/hr/contractors/new', parent: '/hr/contractors', via: 'header-cta' }`). Single source of truth.
- `scripts/ci/route-reachability-gate.mjs`: recorre `src/app/(dashboard)/**/page.tsx`; por cada ruta real exige que sea alcanzable por una de tres vías: (a) href en `VerticalMenu.tsx`, (b) ruta-hija declarada en el manifest, (c) detalle dinámico `[id]`. Excluye `**/mockup/**`. Falla con lista de huérfanos. Modo `--warn` durante adopción → promueve a `error` (mirror TASK-775/827).
- Wire en `.github/workflows/ci.yml` (después de Lint).
- Invariante en CLAUDE.md "Navigation Reachability Governance (TASK-982)".

### Slice 3 — Discovery + doctrina escalable (opcional / parcial)

- Auditar que el command palette ⌘K indexe **rutas hijas** (onboarding incluido) — red supplemental de descubrimiento.
- Documentar en `GREENHOUSE_UI_PLATFORM_V1.md` la doctrina de dominio multi-superficie: hub-por-audiencia + header actions + tabs locales cuando el workbench crezca + drawers por fila + ⌘K. Referencia para TASK-797/798.
- (Si el workbench HR crece) tabs locales `Engagements | Envíos | Clasif. pendiente`.

## Out of Scope

- NO se centraliza el dominio contractor en un grupo de menú nuevo (el scatter por audiencia es correcto).
- NO se crean viewCodes nuevos (las 3 superficies ya los tienen).
- NO se rediseñan los drawers existentes (detalle/lifecycle/classification/compensation) — funcionan.
- NO se toca el patrón de detalle dinámico `[id]` (alcanzable por click de fila).

## Detailed Spec

### Capa 1 — Patrón canónico header action (wireframe)

```
┌──────────────────────────────────────────────────────────────┐
│  Contratistas                          [+ Nuevo contractor] ◄─┤ primary contained, tabler-plus
│  Engagements, envíos y revisión                               │ h4 título / subtitle1 text.secondary
├──────────────────────────────────────────────────────────────┤
│  [Tab: Engagements] [Tab: Envíos] [Tab: Clasif.]  (cuando crezca)
├──────────────────────────────────────────────────────────────┤
│  DataTableShell …  (click fila → drawer detalle/lifecycle)    │
└──────────────────────────────────────────────────────────────┘
```

Tokens: `h4` título, `subtitle1`+`text.secondary` subtítulo, 1 primary contained CTA. Interaction-cost: 1 click → wizard. A11y: CTA con label explícito, target ≥24×24, focus ring 2px/3:1.

### Capa 2 — Contrato de alcanzabilidad (regla)

> Toda ruta real bajo `src/app/(dashboard)/**/page.tsx` (excluye `**/mockup/**` y dynamic `[id]`) DEBE ser alcanzable por: (a) item en `VerticalMenu.tsx`, (b) ruta-hija declarada en el manifest con su padre + vía de acceso, o (c) detalle dinámico. Un `page.tsx` que no cumpla → gate falla el build.

Esto es el espejo navegacional de TASK-827: ahí la señal `role_view_fallback_used` detecta drift `viewCode↔DB`; acá el gate detecta drift `ruta↔nav`.

### Capa 3 — IA escalable (los 4 sistemas de nav, Rosenfeld)

- **Global** (sidebar): un workbench por (dominio × audiencia), anclado en la casa de la audiencia.
- **Local** (tabs/header): header con acción primaria + tabs cuando el workbench tenga >1 vista.
- **Contextual** (drawers/links por fila): detalle/lifecycle/edit por-entidad.
- **Supplemental** (⌘K): indexa TODO (incl. rutas hijas) — atrapa lo que el browse no cubre.

Pattern para TASK-798 ops console = hub de confiabilidad del dominio (agrega las ~10 señales), anclado en Operaciones/Admin.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (header CTA) y Slice 2 (gate) son independientes; pueden ir en paralelo. **Recomendado: Slice 1 + Slice 2 juntos** — sin el gate, el fix no evita recurrencia.
- Slice 2 gate arranca en modo `--warn` (no rompe build durante adopción) → promueve a `error` una vez que el repo está limpio de huérfanos.
- Slice 3 (doctrina + ⌘K + tabs) puede ir después, no bloquea.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Gate produce falsos positivos (rutas legítimamente sin nav) | CI | medium | Manifest de excepciones declaradas + modo `--warn` durante adopción | gate output en CI |
| CTA visible para rol sin permiso de crear | UI/auth | low | Gate de capability server-side en `/hr/contractors/new` (ya existe) + CTA condicionado al mismo viewCode | n/a (page guard) |
| Gate no cubre rutas dinámicas anidadas | CI | low | Excluir `[id]` explícito + tests del propio gate | gate self-test |

### Feature flags / cutover

- Sin flag — Slice 1 es UI additive (nuevo botón), immediate cutover. Slice 2 gate arranca `--warn` (no bloquea) y se promueve a `error` por PR cuando el repo esté limpio.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (botón UI) | <5 min | sí |
| Slice 2 | bajar gate a `--warn` o revert del workflow wire | <5 min | sí |
| Slice 3 | doc-only / revert | <5 min | sí |

### Production verification sequence

1. Slice 1: `pnpm dev` local + GVC del header `/hr/contractors` → click "Nuevo contractor" → wizard `/hr/contractors/new` carga. Verify en staging post-deploy.
2. Slice 2: correr `node scripts/ci/route-reachability-gate.mjs` local → 0 huérfanos (tras Slice 1). Verify CI corre el gate en el PR.
3. Promover gate a `error` en PR separado una vez confirmado repo limpio.

### Out-of-band coordination required

- N/A — repo-only change. Sin coordinación externa (Azure/GCP/HubSpot/secrets).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `/hr/contractors` tiene botón primary "Nuevo contractor" → `/hr/contractors/new`, gated por capability/viewCode.
- [ ] `node scripts/ci/route-reachability-gate.mjs` reporta 0 huérfanos en `(dashboard)`.
- [ ] El gate corre en CI y falla (modo error, post-adopción) ante un `page.tsx` huérfano nuevo.
- [ ] Manifest de rutas-hijas declara `/hr/contractors/new` → parent `/hr/contractors` (via header-cta).
- [ ] Doctrina de dominio multi-superficie documentada en `GREENHOUSE_UI_PLATFORM_V1.md` + invariante en CLAUDE.md.
- [ ] GVC del header del workbench + flujo onboarding capturado.
- [ ] Boundary: cero cambios a payroll/finanzas/finiquito; `pnpm vitest run src/lib/payroll` verde.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test` (incluye self-test del gate)
- `node scripts/ci/route-reachability-gate.mjs`
- `pnpm design:lint`
- GVC: `pnpm fe:capture --route=/hr/contractors --env=staging`
- `pnpm build`

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-797/798 heredan el patrón — anotar delta)
- [ ] CLAUDE.md invariante "Navigation Reachability Governance (TASK-982)" agregado

## Follow-ups

- TASK-797 (closure) y TASK-798 (ops console) consumen el patrón header-action + el gate desde el día 1.
- Evaluar tabs locales en el workbench HR si crece (`Engagements | Envíos | Clasif. pendiente`).
- Auditar otros `(dashboard)` legacy que el gate marque como huérfanos al activarse (backlog de remediación separado si emergen varios).
