# TASK-472 — Fix `/my/profile` SSR 500 in staging

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo-Medio`
- Type: `bugfix`
- Status real: `Diagnóstico pendiente`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `fix/TASK-472-my-profile-ssr-500` (sugerido)
- Legacy ID: resuelve `ISSUE-054`
- GitHub Issue: `none`

## Summary

Resolver el HTTP 500 que devuelve `/my/profile` en staging cuando se accede con agent headless (y probablemente con sesión humana normal también). El resto de páginas `/my/*` funcionan (payroll, performance, delivery, assignments, goals, leave, organization, evaluations) — el crash está aislado a `/my/profile`.

Detectado 2026-04-19 durante smoke test E2E post-TASK-462. Documentado en `docs/issues/resolved/ISSUE-054-my-profile-500-staging.md`.

## Why This Task Exists

La ficha personal del operador es una pantalla de uso diario:
- Account Leads la usan para ver su perfil 360
- Colaboradores la usan para verificar datos personales
- Admins la visitan para troubleshoot identity issues

Un 500 persistente degrada la experiencia de todos. ISSUE-044 tuvo un síntoma similar global (todo `(dashboard)` daba 500) — ya se resolvió en su mayoría, pero esta página quedó rezagada, probablemente por un issue específico de sus imports o su view.

## Goal

- `/my/profile` responde 200 en staging via agent headless Y sesión humana normal
- El view renderiza con header + tabs (Perfil, Equipos, Proyectos, Conexiones, Seguridad, Skills)
- Zero regresiones en el resto de `/my/*`
- Regression test E2E agregado para detectar futuros rebotes

## Architecture Alignment

- `src/app/(dashboard)/my/profile/page.tsx` — server component entry
- `src/views/greenhouse/my/MyProfileView.tsx` — client view marcado `'use client'`
- `src/views/greenhouse/my/my-profile/*` — sub-tabs (ProfileTab, TeamsTab, ProjectsTab, ConnectionsTab, SecurityTab, SkillsCertificationsTab)
- `@/types/person-complete-360` — types del federated reader (TASK-274)
- `@/lib/person-360/resolve-banner` — helper de banner del header

## Dependencies & Impact

### Depends on

- Person 360 federated layer (TASK-273, TASK-274) activo
- Agent Auth funcional (lo está — verificado 2026-04-19)

### Blocks / Impacts

- UX diaria de operador y colaboradores
- Cierra ISSUE-054

## Scope

### Slice 1 — Diagnóstico (prerequisito)

1. Reproducir localmente con `pnpm build && pnpm start` + acceso agente-session
2. Si el 500 se reproduce local, capturar stack trace exacto. Si no, replicar setup de staging (env vars, build mode)
3. Posibles candidatos del crash:
   - **Import server-only en client bundle**: el repo tuvo un bug similar en TASK-467 phase-2 donde `SELLABLE_ROLE_PRICING_CURRENCIES` importaba de un módulo que usa `node:fs/promises` (seed CSV reader) y rompía Turbopack client bundle. Revisar `MyProfileView` + sub-tabs buscando imports que transitivamente toquen `node:*` o `server-only`.
   - **Endpoint faltante**: `/api/people/profile` devuelve 404 — si `MyProfileView` lo llama y crashea en un `JSON.parse` sin try/catch o en `useEffect` de mount, el SSR pre-render podría bailar. El endpoint canónico es probablemente `/api/person-complete-360?self=true` o similar — verificar.
   - **Type mismatch en runtime**: `PersonComplete360` type vs respuesta real del endpoint federado. Si hay un acceso `data.something.nested` asumido pero `something` llega null, crashea.

### Slice 2 — Fix

Según diagnóstico:
- Si es un import server-only: extraer constants inline o mover a un módulo client-safe
- Si es endpoint faltante: adaptar MyProfileView al endpoint canónico person-360 + error boundary para handling graceful
- Si es type mismatch: schema validation con Zod antes de setState + null checks

### Slice 3 — Regression test

Agregar a la suite E2E:
- Smoke test `pnpm staging:request /my/profile` que valida HTTP 200 + estructura de HTML (presencia de tabs)
- Si hay suite Playwright, agregar un test que abra `/my/profile` con agent-session y verifica render

## Out of Scope

- Redesign del view
- Cambios a person-360 federated layer (solo consumer fix)
- Fix del resto de dashboards que respondían 500 en ISSUE-044 (ya mostly resolved; verificar no regresión)

## Acceptance Criteria

- [ ] `/my/profile` responde 200 en staging via agent headless
- [ ] `/my/profile` renderiza con header + 6 tabs visibles
- [ ] Zero regresiones en `/my/{payroll,performance,delivery,assignments,goals,leave,organization,evaluations}`
- [ ] Regression test añadido

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm test`
- `pnpm build`
- Smoke staging: `pnpm staging:request /my/profile` → HTTP 200

## Closing Protocol

- [ ] `Lifecycle` a `complete`
- [ ] Archivo a `complete/`
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con el fix
- [x] `docs/issues/resolved/ISSUE-054-my-profile-500-staging.md` documenta el cierre y el tracker quedó actualizado
- [ ] Nota en ISSUE-054 del commit que lo resolvió

## Ownership sugerido

**Codex** — el dominio identity/person-360 ha sido principalmente de Codex (TASK-273, TASK-274, fixes previos de MyProfile como ISSUE-027, ISSUE-026). Tiene el contexto más fresco del federated reader.
