# TASK-1044 — Vista canónica de Tipografía (submenú Design System) + branding AXIS en superficies DS

## Status

- Lifecycle: `complete`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `none`
- Status real: `Complete — vista canónica + AXIS branding mode-aware en las 4 superficies DS`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `develop` (local-first)
- Legacy ID: `none`

## Summary

Construye la **versión canónica** de la referencia de tipografía (NO el mockup) como submenú de Design System: `/admin/design-system/typography`. Alto detalle, renderizado vivo desde el SoT — familias, escala de roles (specimen + spec por token), aplicaciones en componentes reales, bridge contrato↔runtime, unidades y gobernanza. Es el espacio canónico autoritativo (el mockup queda como registro del rediseño AS-IS↔TO-BE). Además, por pedido del operador, **todas las superficies del Design System llevan branding AXIS** mode-aware (positivo en light, negativo en dark).

## Why This Task Exists

El mockup (`/typography/mockup`) se construyó durante el rediseño como doc de exploración (AS-IS↔TO-BE + records de decisión). Faltaba la **referencia canónica limpia del estado actual** — el espacio autoritativo donde un agente/diseñador consulta el sistema vigente. Y el branding AXIS (la marca del Design System) no estaba consistente en todas las superficies DS.

## Goal

- Vista canónica `/admin/design-system/typography` (alto detalle, vivo desde el SoT, estado actual).
- Submenú descubrible desde `/admin/design-system` (card + link).
- Branding AXIS mode-aware en las 4 superficies DS (DesignSystemView, canónica, mockup, LoadingLab).

## Architecture Alignment

- `DESIGN.md` §Typography + V1 §3 (las reglas viven ahí; la vista las renderiza, no las define)
- `CLAUDE.md` "Typography System" + "AXIS branding" (AxisWordmark solo en superficies DS, nunca producto/login/email/PDF/cliente)
- Gating: viewCode `administracion.design_system` (mismo que `/admin/design-system` + mockup)
- Skills: greenhouse-ux + modern-ui (GVC loop) + info-architecture (submenú)

Reglas:

- La vista RENDERIZA el SoT vivo; cero valores hardcodeados (deriva de `typographyScale`).
- AXIS solo en superficies DS internas (NUNCA producto/login/email/PDF/cliente).
- AXIS mode-aware: `full` (positivo) en light, `negative` en dark.

## Files owned

- `src/views/greenhouse/admin/design-system/typography/CanonicalTypographyView.tsx` (nuevo)
- `src/app/(dashboard)/admin/design-system/typography/page.tsx` (nuevo, gateado)
- `src/components/greenhouse/brand/AxisWordmark.tsx` (+ variante `auto` mode-aware, default)
- `src/views/greenhouse/admin/design-system/DesignSystemView.tsx` (card link + AXIS `auto`)
- `src/views/greenhouse/admin/design-system/LoadingLabView.tsx` (AXIS)
- `src/views/greenhouse/admin/design-system/typography/mockup/TypographyReferenceMockupView.tsx` (AXIS)
- `scripts/frontend/scenarios/typography-canonical.scenario.ts` (GVC)
- `eslint.config.mjs` (off-block copy/fontSize para vistas de referencia DS)

## Scope (entregado)

### Slice 1 — Vista canónica + ruta + nav

- `CanonicalTypographyView` (6 secciones: familias, escala de roles, aplicaciones, bridge, unidades, gobernanza) renderizado vivo desde el SoT.
- Ruta gateada (viewCode design_system + redirect cliente).
- Card descubrible en DesignSystemView ("Ver tipografía").
- GVC: header + escala + aplicaciones — enterprise, sin breakage.

### Slice 2 — Branding AXIS mode-aware en superficies DS

- `AxisWordmark` gana variante `auto` (default): `full` en light, `negative` en dark vía `theme.applyStyles('dark')`. SSR-safe, sin mode hook.
- Aplicado en DesignSystemView, canónica, mockup, LoadingLab.

## Out of Scope

- AXIS en producto/login/email/PDF/cliente (prohibido por contrato de marca).
- El mockup queda como está (registro del rediseño) + su branding.

## Rollout Plan & Risk Matrix

N/A — additive (vista nueva + branding). Gating reusa el viewCode existente. Rollback: revertir el commit.

## Acceptance Criteria

- [x] Vista canónica renderiza vivo desde el SoT (cero hardcode).
- [x] Ruta gateada + descubrible desde Design System.
- [x] AXIS mode-aware en las 4 superficies DS.
- [x] tsc 0, lint clean, GVC enterprise sin breakage.

## Verification

- GVC `/admin/design-system/typography` (header + escala + aplicaciones)
- `pnpm exec tsc --noEmit` + `pnpm lint` + route-reachability-gate

## Closing Protocol

- [x] `Lifecycle` complete + carpeta complete/
- [ ] `docs/tasks/README.md` + registry sincronizados
- [ ] `Handoff.md` / `changelog.md`

## Follow-ups

- TASK-1043 (adapters PDF/email) sigue su curso.
