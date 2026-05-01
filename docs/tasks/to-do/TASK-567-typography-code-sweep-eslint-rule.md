# TASK-567 — Typography Code Sweep + ESLint Governance Rule

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio-alto`
- Effort: `Medio` (~1 día)
- Type: `implementation`
- Epic: `EPIC-004`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui` + `platform`
- Blocked by: `TASK-566`
- Branch: `task/TASK-567-typography-code-sweep`

## Summary

Después de la foundation Inter, hacer el sweep de `fontFamily` hardcodeada, eliminar el uso literal de monospace en componentes y dejar una regla ESLint que bloquee regresiones.

## Why This Task Exists

Aunque `TASK-566` corrija el theme, el repo seguirá drifteando si los componentes continúan usando:

- `sx={{ fontFamily: ... }}`
- `fontFamily: 'monospace'`
- refs heredadas a `DM Sans`, `Geist` o Poppins fuera de `h1-h4`

Además, `TASK-021` fue escrita para el mundo `DM Sans + Poppins`; esta task la supersede parcialmente dentro del nuevo contrato `Poppins + Inter`.

## Goal

- Cero `fontFamily` hardcodeada en componentes productivos salvo excepciones justificadas
- Cero `fontFamily: 'monospace'` en `src/**`
- ESLint rule local activa
- `monoId` / `monoAmount` usados como API semántica cuando aplique

## Architecture Alignment

- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- `docs/tasks/to-do/TASK-021-typography-variant-adoption.md`
- `docs/tasks/to-do/TASK-566-typography-foundation-geist-poppins-theme.md`

## Files Owned

- `eslint.config.mjs`
- `eslint-plugins/greenhouse/**` o ubicación real equivalente para rules locales
- componentes descubiertos por grep en `src/app/**`, `src/views/**`, `src/components/**`
- `docs/tasks/to-do/TASK-021-typography-variant-adoption.md`
- `docs/tasks/README.md`

## Current Repo State

- Existen múltiples overrides de `fontFamily` y monospace en el repo
- `TASK-021` inventarió parte del problema, pero bajo el baseline viejo
- No existe una rule específica que gobierne el contrato tipográfico nuevo

## Scope

### Slice 1 — Discovery exhaustiva

- inventario de `fontFamily:`
- inventario de `fontFamily: 'monospace'`
- categorización:
  - redundante
  - migrable a `monoId` / `monoAmount`
  - excepción justificada

### Slice 2 — Sweep

- remover overrides redundantes
- mover IDs/montos a variants semánticos
- borrar referencias legacy a `DM Sans` o `Geist` en product UI

### Slice 3 — ESLint rule

La rule debe bloquear:

- `fontFamily` hardcodeada en `sx`, `styled`, `StyleSheet.create` o patrones equivalentes dentro de UI productiva
- `fontFamily: 'monospace'`
- referencias directas a `DM Sans` o `Geist` en product UI una vez landed `TASK-566`

Excepciones:

- comentarios explícitos con `eslint-disable-next-line`
- casos de marketing o branding realmente documentados
- cualquier excepción debe dejar justificación legible, no solo el disable

### Slice 4 — Reclasificar TASK-021

- actualizar su nota para dejar explícito que fue absorbida parcialmente por `EPIC-004`

## Out of Scope

- no tocar `layout.tsx` ni `mergedTheme.ts`
- no tocar emails o PDFs
- no correr Figma o Playwright

## Acceptance Criteria

- [ ] grep de `fontFamily:` en UI productiva deja solo casos justificados
- [ ] grep de `fontFamily: 'monospace'` en `src/**` da 0
- [ ] `pnpm lint` falla si alguien agrega `fontFamily: 'monospace'`
- [ ] `TASK-021` queda referenciada como supersedida parcialmente por `TASK-567`
- [ ] La rule deja mensajes de error accionables que indiquen usar variants/tokens en vez de solo fallar genéricamente
- [ ] La task documenta al menos un ejemplo de excepción válida y uno inválido

## Verification

- `pnpm lint`
- `pnpm build`
- grep manual pre/post

## Open Questions

- La rule puede limitarse a `fontFamily` en esta fase. El control de `fontWeight` hardcodeado puede quedar como follow-up si discovery lo justifica.
