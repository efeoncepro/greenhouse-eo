# TASK-368 — Theme Token Audit & Decision Contract

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `research`
- Status real: `Pendiente`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-368-theme-token-audit-decision-contract`
- Legacy ID: —
- GitHub Issue: —
- Parent: `TASK-264` (umbrella)

## Summary

Auditar cada token de `GH_COLORS` y clasificarlo en una de tres categorías: (1) debe migrar al theme canónico MUI/Vuexy, (2) es de dominio y permanece en `GH_COLORS`, (3) es redundante y se elimina. Produce un documento de decisión que alimenta TASK-369 a TASK-372. **No toca código visual ni cambia colores.**

## Why This Task Exists

Hoy `GH_COLORS` tiene ~8 categorías (role, semaphore, semantic, brand, neutral, service, chart, cscPhase) con ~47 tokens. Algunos son claramente de shell global (neutrals, semantic states) y deberían vivir en `theme.palette` o `theme.customColors`. Otros son taxonomías de dominio (roles, services, CSC phases) que tienen sentido fuera del theme. Sin esta clasificación, cualquier migración es una apuesta a ciegas.

## Goal

- Producir un documento `docs/architecture/GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md` con la clasificación token-por-token.
- Responder las Open Questions de TASK-264: qué `primary` institucional usar, qué taxonomías quedan fuera del theme.
- Dejar una tabla de decisión consumible por las tasks hijas (369–372).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- Vuexy docs: extension points para `colorSchemes`, `customColors`, `themeConfig`

## Normative Docs

- `src/config/greenhouse-nomenclature.ts` — definición actual de `GH_COLORS`
- `src/@core/theme/colorSchemes.ts` — paleta MUI/Vuexy actual
- `src/configs/primaryColorConfig.ts` — override de primary (efeonce-core #0375DB)
- `src/components/theme/mergedTheme.ts` — merge de user theme con core

## Dependencies & Impact

### Depends on

- Ninguna — es investigación pura.

### Blocks / Impacts

- `TASK-369` — necesita la clasificación para saber qué hardcoded hex reemplazar y con qué.
- `TASK-370` — necesita saber exactamente qué tokens migrar al theme.
- `TASK-371` — necesita la decisión de primary institucional.
- `TASK-372` — necesita el contrato para documentar qué hereda Kortex.

### Files owned

- `docs/architecture/GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md` (nuevo)
- `docs/tasks/to-do/TASK-368-theme-token-audit-decision-contract.md`

## Current Repo State

### Already exists

- `GH_COLORS` definido en `src/config/greenhouse-nomenclature.ts:1164-1265` con 8 categorías.
- `colorSchemes.ts` con paleta completa light/dark (primary #7367F0 Vuexy default).
- `primaryColorConfig.ts` con override efeonce-core (#0375DB).
- `mergedTheme.ts` aplicando color overrides sobre el core theme.

### Gap

- No existe clasificación formal de qué tokens son "shell global" vs "dominio" vs "redundantes".
- Las Open Questions de TASK-264 siguen sin respuesta.
- No hay documento que formalice la decisión de `primary` institucional.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Inventario de tokens

- Listar todos los tokens de `GH_COLORS` con su hex, uso actual (grep de consumers) y categoría semántica.
- Listar todos los tokens de `colorSchemes.ts` que ya cubren la misma semántica.
- Identificar solapamientos y redundancias.

### Slice 2 — Clasificación y decisión

- Clasificar cada token: `→ theme.palette`, `→ theme.customColors`, `→ permanece GH_COLORS`, `→ eliminar`.
- Decidir el `primary` institucional (propuesta + justificación).
- Decidir qué tokens de chart/role/service son de dominio y no deben migrar al theme.

### Slice 3 — Documento de contrato

- Escribir `docs/architecture/GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md` con:
  - Tabla de clasificación token-por-token
  - Decisión de primary con justificación
  - Reglas de adopción para componentes nuevos
  - Mapa de migración para las tasks hijas

## Out of Scope

- Modificar código (eso es TASK-369 a TASK-371).
- Decidir sobre dark mode (fuera del scope de todo el programa 264).
- Rediseñar la identidad visual de Greenhouse.

## Detailed Spec

El output es un documento de arquitectura, no código. La tabla de clasificación debe tener esta estructura:

| Token | Hex actual | Categoría GH_COLORS | Consumers (count) | Decisión | Destino | Justificación |
|-------|-----------|---------------------|-------------------|----------|---------|---------------|

La sección de primary debe evaluar: `coreBlue` (#0375DB), `greenhouseGreen`, `midnightNavy`, y el default Vuexy (#7367F0), con pros/contras de cada opción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `docs/architecture/GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md` con clasificación completa.
- [ ] Cada token de `GH_COLORS` tiene una decisión explícita con justificación.
- [ ] La decisión de `primary` institucional está documentada con pros/contras.
- [ ] Las reglas de adopción para componentes nuevos están formalizadas.
- [ ] El documento es consumible por TASK-369 a TASK-372 sin ambigüedad.

## Verification

- El documento existe y está completo.
- No hay cambios en archivos `.ts` / `.tsx` — solo documentación.

## Closing Protocol

- [ ] Actualizar `Handoff.md` con la decisión de primary y el link al contrato.
- [ ] Notificar que TASK-369 a TASK-372 están desbloqueadas.

## Follow-ups

- Las 4 tasks hijas (369–372) se desbloquean al cerrar esta.
