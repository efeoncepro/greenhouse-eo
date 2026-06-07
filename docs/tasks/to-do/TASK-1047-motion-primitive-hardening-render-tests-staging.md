# TASK-1047 — Motion Primitive hardening (render-test harness + full suite + staging)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo-Medio`
- Type: `hardening`
- Epic: `none`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui|platform|design-system|motion`
- Blocked by: `none` (TASK-1045 ya en `develop`)
- Branch: `develop (local-first)`

## Summary

Cierra los gaps de robustez de la Motion Primitive (TASK-1045) que se difirieron a otra sesión: un **harness de render-test** para `<Motion>`/variants (hoy solo testeado a nivel builder con `gsap` mockeado + cubierto visualmente por GVC), correr la **full `pnpm test` suite** y **verificar la página en staging** tras el deploy de `develop`.

## Why This Task Exists

TASK-1045 dejó la primitiva sólida y enforced (boundary lint rule + reduced-motion horneado + drift-guard + 22 tests de módulo + build verde), pero con 2 gaps honestos antes de llamarla *bulletproof*:
1. **No hay render-test de integración** del componente `<Motion>` ni del path completo `componente + useGreenhouseGSAP + gsap.matchMedia` rendereado — los builders se testean con `gsap` mockeado; el render real solo está cubierto por GVC (visual, sin regresión automática). Es el gap principal.
2. La **full `pnpm test` suite** no se corrió en el cierre de TASK-1045 (focal + `pnpm build` verdes; cambio aditivo → sorpresa improbable, pero no verificado), y la **verificación en staging** de `/admin/design-system/motion` quedó pendiente del deploy automático de `develop`.

## Goal

- Render-test harness para `<Motion>` + las 4 variants (jsdom + `matchMedia` stub) que verifique: monta sin throw, aplica el builder correcto por `variant`/`kind`, respeta `disabled`, y degrada bajo reduced-motion. Cubrir `scrollReveal`/`timeline` (las menos ejercitadas).
- Full `pnpm test` suite verde con la primitiva integrada.
- Verificación en staging de `/admin/design-system/motion` (deploy de develop) — render + reduced-motion + GVC contra el deployment activo.
- Si todo verde, mover TASK-1045 a estado operacionalmente cerrado (hoy `complete` en code; este cierra el rollout gate).

## Architecture Alignment

- `docs/architecture/GREENHOUSE_MOTION_PRIMITIVE_V1.md` (la primitiva).
- `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — si emerge un signal (no esperado para UI primitive).
- Runtime Rollout Completion Gate (CLAUDE.md): code-complete ≠ operationally-complete hasta verificar en runtime real.

## Current Repo State

### Already exists (TASK-1045)
- `src/components/greenhouse/motion/**` (núcleo + `<Motion>` + variants + kinds).
- Tests: `core/*.test.ts` (12) + `variants.test.ts`/`kinds.test.ts` (10) — builders con `gsap` mockeado, NO render del componente.
- GVC scenario `design-system-motion` + página `/admin/design-system/motion`.

### Gap
- Sin render-test del componente `<Motion>` (jsdom + matchMedia stub).
- Full suite + staging no verificados.

## Scope

### Slice 0 — Render-test harness
- `Motion.test.tsx` (jsdom + `matchMedia` stub): monta cada variant/kind, asserta builder invocado + scope ref + `disabled` no-op + reduced-motion path. Reusar el patrón de stub de `reduced-motion.test.ts`.
- Considerar un helper de test que stubee `gsap.matchMedia` para deterministic reduced/no-preference.

### Slice 1 — Full suite + staging
- `pnpm test` (full) + `pnpm build` verdes.
- `pnpm fe:capture design-system-motion --env=staging` (o `staging:request`) contra el deployment activo de develop; verificar render + reduced-motion.
- Mover TASK-1045 a operationally-complete; nota de cierre.

## Out of Scope
- Variants nuevas (counter/splitText/parallax/pointer → TASK-1046 / V1.1 del ADR).
- Consolidación framer-motion ↔ GSAP (follow-up del ADR).
- e2e Playwright dedicado (GVC + render-test cubren V1).

## Acceptance Criteria
- [ ] `Motion.test.tsx` cubre las 4 variants + reduced-motion + disabled, verde.
- [ ] `pnpm test` (full) + `pnpm build` verdes con la primitiva.
- [ ] Staging `/admin/design-system/motion` verificado (render + reduced-motion + GVC).
- [ ] TASK-1045 marcada operationally-complete.

## Verification
- `pnpm test`
- `pnpm build`
- `pnpm fe:capture design-system-motion --env=staging`
