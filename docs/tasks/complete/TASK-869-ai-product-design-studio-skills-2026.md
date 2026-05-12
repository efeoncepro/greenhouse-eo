# TASK-869 — AI Product Design Studio Skills 2026

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Cerrada`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Crear una suite de skills globales y overlays Greenhouse para elevar el diseño de producto asistido por agentes a una barra comparable o superior a Lovable/Stitch: intención → dirección visual → UX → microinteracciones → implementación frontend → screenshots → gate enterprise.

## Why This Task Exists

Las skills UI/UX actuales ayudan, pero son livianas: no fuerzan generación de alternativas, Product UI ADR, self-critique, screenshot loop, ni gate enterprise. Greenhouse necesita un sistema reusable para que los agentes no entreguen UI que compila pero se siente junior, inconsistente o poco operable.

## Goal

- Crear skills globales de diseño de producto 2026 con metodología, artefactos y checklists.
- Crear overlays repo-specific para Greenhouse que traduzcan esas decisiones a Vuexy/MUI, `DESIGN.md`, copy canonical y Playwright.
- Documentar el proceso operativo para UI visible y dejarlo consumible por futuros agentes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `AGENTS.md`
- `DESIGN.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `.codex/skills/software-architect-2026/SKILL.md`

Reglas obligatorias:

- Mantener skills concisas con progressive disclosure: `SKILL.md` lean + `references/`, `templates/`, `checklists/` solo cuando agregan valor real.
- No reemplazar `DESIGN.md`; los overlays Greenhouse deben consumirlo como contrato, no duplicarlo.
- No modificar skills o carpetas no relacionadas, especialmente cambios locales no trackeados de `.claude/skills/*`.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_TEMPLATE.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/tasks/README.md`

## Dependencies & Impact

### Depends on

- Skills existentes globales:
  - `/Users/jreye/.codex/skills/ui-product-design-orchestrator/SKILL.md`
  - `/Users/jreye/.codex/skills/ux-content-accessibility/SKILL.md`
  - `/Users/jreye/.codex/skills/microinteractions-auditor/SKILL.md`
- Skills existentes repo:
  - `.agents/skills/greenhouse-ui-review/SKILL.md`
  - `.codex/skills/greenhouse-ui-orchestrator/SKILL.md`
  - `.codex/skills/greenhouse-mockup-builder/SKILL.md`

### Blocks / Impacts

- Futuras tasks UI visibles, mockups, rediseños y surfaces enterprise.
- Operativa de agentes al pedir experiencias tipo Lovable/Stitch dentro del repo real.

### Files owned

- `/Users/jreye/.codex/skills/product-design-architect-2026/**`
- `/Users/jreye/.codex/skills/ai-ui-generation-director/**`
- `/Users/jreye/.codex/skills/microinteraction-systems-architect/**`
- `/Users/jreye/.codex/skills/frontend-product-implementation-reviewer/**`
- `/Users/jreye/.codex/skills/visual-regression-product-critic/**`
- `.codex/skills/greenhouse-product-ui-architect/**`
- `.codex/skills/greenhouse-ai-design-studio/**`
- `.codex/skills/greenhouse-ui-enterprise-review/**`
- `docs/architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_UI_DELIVERY_LOOP_V1.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/tasks/README.md`
- `Handoff.md`

## Current Repo State

### Already exists

- `software-architect-2026` define un modelo robusto con research, ADR, self-critique, checklists y overlay Efeonce.
- `greenhouse-ui-review` funciona como gate de tokens/estructura, pero no cubre estrategia de producto ni iteración visual tipo Studio.
- `greenhouse-mockup-builder` ya fija la regla de mockups como rutas reales del portal.

### Gap

- Falta una suite comparable a Lovable/Stitch pero repo-safe: generación de alternativas, crítica, screenshots, gates y handoff a implementación real.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- Plan Mode lo ejecuta el agente que toma la task. -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Global Product Design Studio skills

- Crear `product-design-architect-2026`.
- Crear `ai-ui-generation-director`.
- Crear `microinteraction-systems-architect`.
- Crear `frontend-product-implementation-reviewer`.
- Crear `visual-regression-product-critic`.

### Slice 2 — Greenhouse overlays and gates

- Crear `greenhouse-product-ui-architect`.
- Crear `greenhouse-ai-design-studio`.
- Crear `greenhouse-ui-enterprise-review`.

### Slice 3 — Living docs and task bookkeeping

- Documentar `GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1`.
- Documentar `GREENHOUSE_UI_DELIVERY_LOOP_V1`.
- Registrar task en ID registry e index.
- Actualizar `Handoff.md`.

## Out of Scope

- No implementar una app/canvas visual propia.
- No reemplazar Lovable/Stitch ni integrar sus APIs.
- No modificar runtime UI existente salvo documentación/skills.
- No tocar las carpetas `.claude/skills/*` no trackeadas existentes.

## Detailed Spec

La suite debe cubrir el flujo:

`intent intake → design architecture → AI UI direction generation → UX state/content model → microinteraction system → frontend implementation review → visual screenshot critic → Greenhouse enterprise gate`.

Cada skill debe ser autocontenida, accionable y corta en `SKILL.md`, delegando detalles a referencias/templates/checklists.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existen las 5 skills globales con `SKILL.md` y recursos mínimos.
- [x] Existen los 3 overlays/gates Greenhouse versionados en el repo.
- [x] Existe documentación viva para el operating model y delivery loop.
- [x] `docs/tasks/TASK_ID_REGISTRY.md` y `docs/tasks/README.md` registran `TASK-869`.
- [x] Las nuevas skills explican cuándo usar Lovable/Stitch-like generation, cuándo implementar y cuándo bloquear.

## Verification

- `find /Users/jreye/.codex/skills -maxdepth 2 -name SKILL.md | rg 'product-design|ai-ui|microinteraction|frontend-product|visual-regression'` — OK.
- `find .codex/skills -maxdepth 2 -name SKILL.md | rg 'greenhouse-product-ui|greenhouse-ai-design|greenhouse-ui-enterprise'` — OK.
- `git diff --check` — OK.
- Revisión manual de `SKILL.md` para frontmatter válido — complete.

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real.
- [x] el archivo vive en la carpeta correcta.
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre.
- [x] `Handoff.md` quedo actualizado.
- [x] `changelog.md` quedo actualizado si se considera cambio operativo visible para agentes.
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas.

## Close Notes

- Las 5 skills globales quedaron instaladas localmente bajo `/Users/jreye/.codex/skills/*`; son deliberadamente globales y no viajan en git.
- Los overlays/gates repo-safe quedaron versionados bajo `.codex/skills/*`, incluyendo el gate enterprise para que futuros agentes lo puedan invocar desde el repo.
- No se modificaron runtime UI, schemas, rutas, permisos ni componentes productivos.

## Follow-ups

- Crear ejemplos calibrados por tipo de surface si las primeras ejecuciones muestran ambigüedad.
- Evaluar scripts de screenshot scoring semiautomatizado después de 2-3 usos manuales.
