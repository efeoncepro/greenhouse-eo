# TASK-983 — Dashboard Orphan-Route Triage + Promote Reachability Gate to Strict

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none` (platform navigation hygiene)
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform`
- Blocked by: `TASK-982` (gate + manifest deben existir — ya shipped)
- Branch: `task/TASK-983-dashboard-orphan-routes-triage`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Clasifica y resuelve los **19 huérfanos legacy** que el route-reachability gate (TASK-982) marca hoy en modo `--warn`, y luego **promueve el gate a `--strict`** en `ci.yml` para que cualquier huérfano nuevo bloquee el build. Cada ruta se resuelve por una de cuatro vías: (1) agregar el nav link/CTA que falta, (2) declararla como child route en el manifest, (3) confirmar que es alcanzable por nav data-driven que el gate no captura (ajustar el gate o declarar), o (4) borrarla si es ruta muerta.

## Why This Task Exists

TASK-982 shippeó el gate de alcanzabilidad en modo `--warn` porque al activarlo emergieron **19 rutas `(dashboard)` pre-existentes** que nada en `src/` navega por link estático. Mientras el gate siga en `--warn`, NO bloquea huérfanos nuevos — solo los lista. El valor anti-recurrencia del gate (que un `page.tsx` nuevo huérfano falle el build) **solo se materializa en `--strict`**, y para llegar ahí el backlog legacy debe estar en 0. Varias de las 19 son falsos positivos (alcanzables por nav data-driven con keys que el regex del gate no captura — `path:`/`to:`/arrays de config); otras son sub-acciones sin declarar; otras pueden ser rutas muertas. Cada una necesita su clasificación.

## Goal

- Las 19 rutas clasificadas y resueltas (link / manifest / gate-fix / delete).
- `route-reachability-gate.mjs` reporta **0 huérfanos**.
- Gate promovido a `--strict` en `ci.yml` (bloquea huérfanos nuevos).
- Sin romper acceso a ninguna superficie viva.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- CLAUDE.md "Navigation Reachability Governance (TASK-982)" — el contrato a satisfacer.
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` (v1.10) — doctrina IA.
- Skill `info-architecture` (orphan/dupe/gap audit — Lane B) + `greenhouse-ux`.

Reglas obligatorias:

- Resolver por mental-model/audiencia (NUNCA centralizar en un grupo de menú nuevo).
- NUNCA borrar una ruta sin confirmar que está muerta (sin link, sin uso, sin valor forward-looking). Ante duda, declararla o lincarla, no borrarla.
- Si el huérfano es falso-positivo por nav data-driven, **preferir mejorar el gate** (agregar el pattern `path:`/`to:`/`href` en arrays de config) sobre declarar manualmente — el gate más preciso escala mejor.
- Mockup-like routes en `(dashboard)` que NO están bajo `**/mockup/**` (ej. `/cliente-portal-mockup`) → decidir si mover a `/mockup/` o borrar.

## Normative Docs

- `docs/tasks/complete/TASK-982-navigation-reachability-governance-contract.md` — el gate + manifest + lista de los 19.

## Dependencies & Impact

### Depends on

- TASK-982 (gate `scripts/ci/route-reachability-gate.mjs` + manifest `src/lib/navigation/route-reachability-manifest.ts` + CI wire) — ya shipped.

### Blocks / Impacts

- Una vez en `--strict`, TODA task futura que cree un `page.tsx` huérfano falla CI (efecto deseado).

### Files owned

- `src/lib/navigation/route-reachability-manifest.ts` (declaraciones nuevas)
- `scripts/ci/route-reachability-gate.mjs` (si se mejora el scan para nav data-driven)
- `.github/workflows/ci.yml` (promoción a `--strict`)
- VerticalMenu / views que necesiten link/CTA nuevo
- rutas a borrar (si las hay)

## Current Repo State

### Already exists

- Gate en `--warn`, manifest SSOT, test anti-regresión, doctrina (TASK-982).

### Gap

- 19 huérfanos legacy sin clasificar; gate no bloquea huérfanos nuevos hasta `--strict`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Triage + clasificación de las 19

Por cada ruta: determinar la categoría y la resolución. Las 19 (output del gate al 2026-06-01):

| # | Ruta | Hipótesis inicial (a confirmar) |
|---|---|---|
| 1 | `/admin/client-portal/catalog` | admin sub-page — ¿link desde admin index data-driven? |
| 2 | `/admin/commercial` | admin index — ¿card en /admin? |
| 3 | `/admin/identity/drift-reconciliation` | deep-link desde signal (TASK-891) — declarar child o link |
| 4 | `/admin/integrations/hubspot/sample-sprint-dead-letter` | deep-link desde signal — declarar child |
| 5 | `/admin/pricing-catalog/import-excel` | sub-acción del pricing catalog — header CTA / declarar |
| 6 | `/admin/releases` | admin surface (TASK-854) — ¿link admin? |
| 7 | `/admin/responsibilities` | admin surface — ¿link admin? |
| 8 | `/admin/scim-tenant-mappings` | admin surface — ¿link admin? |
| 9 | `/admin/workforce/activation` | admin variant (TASK-873) — ¿link admin? |
| 10 | `/agency/capacity` | ¿link desde agency? |
| 11 | `/agency/sample-sprints/new` | sub-acción create — header CTA / declarar child |
| 12 | `/campaigns` | ¿ruta viva o legacy? |
| 13 | `/cliente-portal-mockup` | mockup fuera de `/mockup/` — mover o borrar |
| 14 | `/dashboard` | landing alterno — ¿redirect target? declarar |
| 15 | `/finance/economics` | ¿link finance? |
| 16 | `/finance/external-signals` | ¿link finance? |
| 17 | `/finance/quotes/share-dashboard` | sub-surface quotes — link/declarar |
| 18 | `/internal/dashboard` | landing interno — redirect target / declarar |
| 19 | `/notifications/preferences` | sub-page settings — link/declarar |

Producto: tabla resuelta (categoría + acción) para cada una.

### Slice 2 — Resolver (link / manifest / gate-fix / delete)

- Aplicar la resolución de cada ruta. Para falsos-positivos sistemáticos (admin index data-driven), **mejorar el gate** para reconocer el pattern de nav usado (ej. arrays `{ href }` ya cubiertos; `{ path }`/`{ to }` no).
- Declarar en el manifest las sub-acciones legítimas (con parent + via + reason).
- Borrar rutas muertas confirmadas (con verificación de cero uso).
- GVC de cualquier link/CTA nuevo agregado.

### Slice 3 — Promover el gate a `--strict`

- `route-reachability-gate.mjs` reporta 0 huérfanos.
- Cambiar `ci.yml` `pnpm route-reachability-gate` → `pnpm route-reachability-gate --strict`.
- Verificar que CI bloquea un huérfano sintético (smoke).
- Actualizar el comentario en `ci.yml` + el invariante CLAUDE.md (gate ahora strict).

## Triage Result + Resolution Doctrine (2026-06-01)

**Doctrina (veredicto arch-architect + info-architecture + greenhouse-ux):** hacer la ruta **genuinamente alcanzable en la superficie de nav canónica** (link real) **> declarar en manifest > borrar**. El manifest es la excepción (sub-acciones intencionales), no el default. Gate-improvement por regex fuzzy (`path:`/`to:`) RECHAZADO (riesgo de falso negativo = esconder huérfanos). Única mejora de gate aceptada: leer formas de nav **determinísticas** (template-literal hrefs).

**Mejora de gate aplicada (commit de este task):** el gate ahora matchea **template-literal hrefs** (`` href={`/ruta?x=${id}`} ``) extrayendo el prefijo estático. Determinístico, no heurístico. Bajó huérfanos **19 → 16** correctamente (cleared: `/admin/identity/drift-reconciliation` [reached desde offboarding closure CTA], `/dashboard`, +1).

**16 restantes — clasificación evidence-backed + acción canónica:**

| Categoría | Rutas | Acción canónica | ¿Necesita decisión del operador? |
|---|---|---|---|
| **Admin tools vivos sin card** (8) | `/admin/{commercial,releases,responsibilities,scim-tenant-mappings,workforce/activation,pricing-catalog/import-excel,client-portal/catalog,integrations/hubspot/sample-sprint-dead-letter}` | Agregar card en `AdminCenterView` (índice admin canónico) — tienen view+API vivos | **Sí — IA**: ¿van todos al índice admin? (recomendado sí) |
| **Create sub-action** (1) | `/agency/sample-sprints/new` | Header CTA "Nuevo sample sprint" en `/agency/sample-sprints` + declarar child en manifest (mirror onboarding contractors) | No — mecánico |
| **Settings sin link** (1) | `/notifications/preferences` | Agregar link en `UserDropdown`/perfil | No — mecánico |
| **Mockup mal ubicado** (1) | `/cliente-portal-mockup` | Mover bajo `**/mockup/**` o borrar (0 refs) | **Sí — borrar vs mover** |
| **Posiblemente muertas** (5) | `/agency/capacity`, `/finance/{economics,external-signals,quotes/share-dashboard}`, `/internal/dashboard` (`LEGACY_INTERNAL_DASHBOARD_PATH`) | Confirmar dead-or-alive → link si viva, borrar si muerta | **Sí — producto**: dead-or-alive |

**Por qué no se resolvieron las 16 automáticamente:** borrar una superficie viva o decidir su lugar en el índice admin son decisiones del operador (no se papelean en el manifest ni se borran sin confirmar cero-uso — regla dura del overlay arch + de este task). El gate queda en `--warn` hasta resolverlas; promover a `--strict` (Slice 3) es el último paso una vez en 0.

## Out of Scope

- NO rediseñar las superficies legacy (solo hacerlas alcanzables).
- NO mover superficies vivas de su audiencia (mismo principio TASK-982).

## Rollout Plan & Risk Matrix

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| Borrar una ruta que sí se usaba | UI | low | Verificar cero uso (grep + nav data-driven + product confirm) antes de delete; preferir declarar/lincar | gate + manual |
| `--strict` bloquea CI por un huérfano no detectado en triage | CI | low | Correr el gate `--strict` local antes de promover; solo promover con 0 huérfanos | gate local |
| Gate-fix introduce falsos negativos (deja pasar huérfanos reales) | CI | medium | Tests del gate + revisar el delta de huérfanos detectados antes/después del fix | gate self-test |

### Feature flags / cutover

- Sin flag. La promoción a `--strict` es el cutover (revert = volver a `--warn`).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | doc-only | <5 min | sí |
| 2 | revert links/manifest/deletes (PR) | <10 min | sí |
| 3 | `ci.yml` `--strict` → warn | <5 min | sí |

### Production verification sequence

1. `node scripts/ci/route-reachability-gate.mjs --strict` local → 0 huérfanos antes de promover.
2. Smoke: crear un `page.tsx` huérfano dummy → gate `--strict` falla → borrar dummy.
3. CI verde post-promoción.

### Out-of-band coordination required

- N/A — repo-only. (Si alguna ruta legacy se borra y tenía valor de negocio, confirmar con el operador antes.)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Las 19 rutas clasificadas con categoría + resolución documentada.
- [ ] `node scripts/ci/route-reachability-gate.mjs` → 0 huérfanos.
- [ ] Gate en `--strict` en `ci.yml`; smoke confirma que bloquea un huérfano.
- [ ] Ninguna superficie viva perdió acceso.
- [ ] Invariante CLAUDE.md actualizado (gate strict).

## Verification

- `pnpm route-reachability-gate --strict`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm build`

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] chequeo de impacto cruzado

## Delta de ejecución (2026-06-01) — SHIPPED, gate en --strict

Huérfanos **19 → 0**, gate promovido a `--strict` (bloquea huérfanos nuevos). Resolución por categoría:

- **Gate mejorado (determinístico):** ahora reconoce (2) template-literal hrefs (`` `/ruta?x=${id}` ``) y (3) `routes: [...]` arrays (registry data-driven de AdminCenterView). Limpió correctamente las falsamente-marcadas. NO se agregó heurística fuzzy `path:`/`to:`.
- **8 admin tools** → agregados a los `routes:` de la card best-fit en `AdminCenterView` (identity-access: scim-tenant-mappings + responsibilities + workforce/activation; view-access: client-portal/catalog; ops-health: releases; commercial-parties: commercial + pricing-catalog/import-excel; integration-governance: hubspot/sample-sprint-dead-letter). El gate los reconoce vía el registry `routes:`.
- **2 redirect-alias** (`/agency/capacity`, `/internal/dashboard`) → declarados en el manifest (redirect-only legacy).
- **1 mockup** (`/cliente-portal-mockup`) → movido a `(dashboard)/mockup/cliente-portal-legacy/` (gate lo excluye).
- **1 duplicado** (`/finance/economics`) → **borrado** (renderizaba `AgencyEconomicsView`, canónico = menú Economía).
- **3 sub-surfaces** (`/finance/quotes/share-dashboard`, `/agency/sample-sprints/new`, `/finance/external-signals`, `/notifications/preferences`) → declaradas en el manifest con parent + via honestos. Las 3 que merecen link real quedan como follow-up (abajo).
- **Gate `--strict`** en `ci.yml` + test anti-regresión (`--strict` exit 0; un huérfano nuevo lo rompe).

## Follow-ups

- **Polish de link real (3)** — declaradas en manifest pero merecen acceso real:
  - `/agency/sample-sprints/new`: wire un CTA "Nuevo sample sprint" en `SampleSprintsWorkspace` (mirror contractor onboarding).
  - `/notifications/preferences`: agregar link en `UserDropdown`/settings.
  - `/finance/external-signals`: agregar item de menú Finanzas + viewCode (requiere migración TASK-827).
- **Per-route click-through en admin cards**: los 8 admin routes quedan declarados en `routes:` (registry) — evaluar si cada uno merece click-through dedicado desde su card o una card propia.
- **`.next-local` no está gitignored** (deuda menor detectada al cerrar): build output sin ignorar; agregar a `.gitignore`.

- Si el triage revela un patrón de nav data-driven común (admin index), considerar un helper canónico de "admin nav registry" para que esas rutas se auto-declaren.
