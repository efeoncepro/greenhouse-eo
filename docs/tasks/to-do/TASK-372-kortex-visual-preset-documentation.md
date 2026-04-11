# TASK-372 — Kortex Visual Preset Documentation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `documentation`
- Status real: `Pendiente`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-370`
- Branch: `task/TASK-372-kortex-visual-preset-documentation`
- Legacy ID: —
- GitHub Issue: —
- Parent: `TASK-264` (umbrella)

## Summary

Documentar el contrato visual reutilizable para que el repo `efeoncepro/kortex` pueda adoptar el estilo institucional Greenhouse sin copiar componentes. Formaliza qué hereda Kortex (semántica visual, tokens, densidad) y qué NO hereda (navegación, nomenclatura, assets de producto). **Solo documentación — no toca código.**

## Why This Task Exists

Kortex es una plataforma hermana que necesita compartir identidad visual institucional con Greenhouse sin acoplar UX ni producto. Hoy no existe un contrato formal que defina qué es compartible y qué no, lo que lleva a copiar tokens ad hoc y divergencia progresiva.

## Goal

- Producir `docs/architecture/GREENHOUSE_KORTEX_VISUAL_PRESET_V1.md` con el contrato completo.
- Definir explícitamente qué tokens, colores y reglas hereda Kortex.
- Definir explícitamente qué NO hereda Kortex.
- Dejar un ejemplo de consumo para que Kortex pueda implementar el preset en su propio repo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md` (producido por TASK-368)
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` (relación Greenhouse ↔ Kortex)

## Normative Docs

- Contrato de tokens de TASK-368.
- Theme canónico resultante de TASK-370.
- `src/@core/theme/colorSchemes.ts` post-migración.

## Dependencies & Impact

### Depends on

- `TASK-368` — el contrato de tokens define qué es compartible.
- `TASK-370` — el theme convergido es la base del preset.
- `TASK-371` — si se ejecutó, el primary institucional es parte del preset. Si no, documentar el default actual.

### Blocks / Impacts

- Roadmap de Kortex — podrá consumir el preset en vez de copiar tokens.
- Futuras tasks de Kortex en `efeoncepro/kortex`.

### Files owned

- `docs/architecture/GREENHOUSE_KORTEX_VISUAL_PRESET_V1.md` (nuevo)
- `docs/tasks/to-do/TASK-372-kortex-visual-preset-documentation.md`

## Current Repo State

### Already exists

- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` ya registra Kortex como repo hermano.
- El theme canónico post-TASK-370 es la fuente de verdad.

### Gap

- No existe contrato formal Greenhouse → Kortex para estilo visual.
- Kortex hoy copia tokens ad hoc sin guía de qué es institucional vs producto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrato visual compartido

- Documentar qué hereda Kortex:
  - Palette institucional (primary, secondary, semantic states)
  - Typography stack (Public Sans, tamaños, pesos)
  - Spacing y shape (border-radius, density)
  - Shadow system
  - Reglas de contraste y accesibilidad
- Documentar qué NO hereda Kortex:
  - Navegación y menú del portal Greenhouse
  - `GH_COLORS` de dominio (roles, services, CSC phases)
  - Assets de marca Greenhouse (logo, wordmarks, illustrations)
  - Nomenclatura y microcopy del portal

### Slice 2 — Ejemplo de consumo

- Proveer un ejemplo de cómo Kortex crearía su theme basándose en el contrato:
  - Snippet de `colorSchemes` reutilizando tokens institucionales
  - Snippet de `themeConfig` adaptado a Kortex
  - Qué archivos copiar vs cuáles son Greenhouse-only

### Slice 3 — Governance

- Documentar reglas de drift:
  - Quién actualiza el contrato cuando Greenhouse cambia tokens
  - Cómo Kortex detecta que su preset está desactualizado
  - Cuándo conviene un package compartido vs documentación manual

## Out of Scope

- Modificar el repo `efeoncepro/kortex`.
- Crear un package npm compartido (evaluable como follow-up).
- Cambiar el theme de Greenhouse para acomodar a Kortex.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `docs/architecture/GREENHOUSE_KORTEX_VISUAL_PRESET_V1.md`.
- [ ] El contrato define explícitamente qué hereda y qué no hereda Kortex.
- [ ] Incluye ejemplo de consumo con snippets funcionales.
- [ ] Incluye reglas de governance para mantener el preset alineado.
- [ ] Es consistente con el theme canónico post-TASK-370.

## Verification

- No hay cambios en archivos `.ts` / `.tsx` — solo documentación.
- El documento referencia tokens y archivos que existen en el repo.

## Closing Protocol

- [ ] Actualizar `Handoff.md` con link al contrato Kortex.
- [ ] Actualizar `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` con referencia al preset.
- [ ] Crear task espejo en backlog de Kortex para adoptar el preset.

## Follow-ups

- Task en `efeoncepro/kortex` para implementar el preset.
- Evaluar si conviene un package compartido interno cuando ambos repos estén estabilizados.
- TASK-265 (nomenclatura y contrato verbal) complementa este contrato visual.
