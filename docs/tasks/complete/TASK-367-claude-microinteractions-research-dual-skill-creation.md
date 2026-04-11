# TASK-367 — Claude Microinteractions Research & Dual Skill Creation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Complete`
- Rank: `—`
- Domain: `ui / tooling`
- Blocked by: `none`
- Branch: `task/TASK-367-claude-microinteractions-research-skills`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Pedir a Claude que realice su propia investigación externa y actualizada sobre mejores prácticas de microinteracciones UI/UX, audite el stack disponible y cree dos skills equivalentes en su ecosistema: una repo-local especializada en Greenhouse y una global portable para cualquier web app.

La task existe para cerrar el gap multi-agente: Codex ya tiene ambas skills, pero Claude todavía no cuenta con el mismo workflow empaquetado ni con una investigación propia documentada para esta superficie.

## Why This Task Exists

Greenhouse ya dejó materializadas dos skills de Codex para microinteracciones (`greenhouse-microinteractions-auditor` en el repo y `microinteractions-auditor` a nivel global), pero Claude sigue dependiendo de skills más generales de UX y accessibility. Eso deja dos riesgos:

- Claude puede revisar o implementar microinteracciones sin un marco especializado propio.
- El conocimiento queda asimétrico entre agentes, justo en una superficie donde timing, reduced motion, loading states, validation y feedback dinámico son fáciles de degradar por drift.

Además, el usuario pidió explícitamente que Claude haga la misma investigación. Esta task obliga a que Claude no solo copie el resultado de Codex, sino que repita el research con fuentes oficiales y lo transforme en skills invocables dentro de su propio contrato operativo.

## Goal

- Hacer investigación externa independiente y actualizada sobre microinteracciones UI/UX con fuentes canónicas.
- Traducir esa investigación a una skill repo-local de Claude orientada a Greenhouse.
- Crear también una skill global de Claude, portable y no acoplada al portal.
- Dejar documentado el trabajo para continuidad multi-agente sin duplicación excesiva.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`
- `docs/ui/GREENHOUSE_ACCESSIBILITY_GUIDELINES_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Claude debe hacer investigación propia con fuentes oficiales o muy reconocidas; las skills de Codex existentes pueden servir como referencia estructural, pero no como sustituto de la investigación.
- La skill repo-local debe aterrizar sobre primitives y patrones reales de Greenhouse, no inventar una capa paralela.
- La skill global debe mantenerse portable y no depender de nombres, paths o librerías de Greenhouse.
- Si la creación de las skills cambia el contrato operativo multi-agente, Claude debe actualizar `Handoff.md`, `project_context.md` y `changelog.md` con deltas breves.

## Normative Docs

- `AGENTS.md`
- `CLAUDE.md`
- `project_context.md`
- `Handoff.md`
- `.claude/skills/greenhouse-task-planner/skill.md`
- `.claude/skills/greenhouse-secret-hygiene/skill.md`
- `.claude/skills/greenhouse-email/skill.md`
- `~/.claude/skills/greenhouse-ux/SKILL.md`
- `~/.claude/skills/greenhouse-ux-writing/skill.md`

## Dependencies & Impact

### Depends on

- `.codex/skills/greenhouse-microinteractions-auditor/SKILL.md`
- `.codex/skills/greenhouse-microinteractions-auditor/references/microinteraction-playbook.md`
- `~/.codex/skills/microinteractions-auditor/SKILL.md`
- `~/.codex/skills/microinteractions-auditor/references/microinteraction-playbook.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/ui/GREENHOUSE_ACCESSIBILITY_GUIDELINES_V1.md`

### Blocks / Impacts

- Trabajo futuro de Claude sobre motion, reduced motion, loading, empty states, validation, hover/focus, toasts, dialogs y live regions.
- Paridad multi-agente entre Codex y Claude para auditoría e implementación de microinteracciones.

### Files owned

- `docs/tasks/to-do/TASK-367-claude-microinteractions-research-dual-skill-creation.md`
- `.claude/skills/greenhouse-microinteractions-auditor/skill.md`
- `~/.claude/skills/microinteractions-auditor/SKILL.md`
- `Handoff.md`
- `project_context.md`
- `changelog.md`

## Current Repo State

### Already exists

- Codex ya tiene una skill repo-local especializada:
  - `.codex/skills/greenhouse-microinteractions-auditor/SKILL.md`
- Codex ya tiene una skill global portable:
  - `~/.codex/skills/microinteractions-auditor/SKILL.md`
- El repo ya tiene infraestructura runtime relevante para esta superficie:
  - `src/hooks/useReducedMotion.ts`
  - `src/libs/FramerMotion.tsx`
  - `src/libs/Lottie.tsx`
  - `src/components/greenhouse/AnimatedCounter.tsx`
  - `src/components/greenhouse/EmptyState.tsx`
- Claude ya tiene skills adyacentes, pero no una skill dedicada a microinteracciones:
  - `.claude/skills/greenhouse-secret-hygiene/skill.md`
  - `.claude/skills/greenhouse-task-planner/skill.md`
  - `~/.claude/skills/greenhouse-ux/SKILL.md`
  - `~/.claude/skills/greenhouse-ux-writing/skill.md`

### Gap

- Claude no tiene hoy una skill repo-local para auditar e implementar microinteracciones en Greenhouse.
- Claude tampoco tiene una skill global portable para esa superficie.
- El research ya fue hecho por Codex, pero no existe todavía una investigación independiente de Claude empaquetada en su propio ecosistema.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Investigación externa independiente

- Claude debe navegar fuentes oficiales o muy reconocidas sobre microinteracciones UI/UX.
- Debe cubrir, como mínimo:
  - motion con propósito
  - timing / duration
  - loading and wait UX
  - reduced motion / accessibility
  - inline validation y error recovery
- Debe registrar el resultado en un formato reusable para sus skills, sin depender solo de memoria conversacional.

### Slice 2 — Skill repo-local de Claude para Greenhouse

- Crear `.claude/skills/greenhouse-microinteractions-auditor/skill.md`.
- La skill debe aterrizar el research sobre el stack real de Greenhouse:
  - wrappers y hooks canónicos
  - primitives existentes
  - guardrails de motion, error states, loading, feedback y accessibility
- Debe servir tanto para review como para implementación, no solo para auditoría.

### Slice 3 — Skill global de Claude portable

- Crear `~/.claude/skills/microinteractions-auditor/SKILL.md`.
- La skill global debe contener heurísticas generales, no Greenhouse-specific.
- Debe poder invocarse en cualquier codebase web para review e implementación de microinteracciones.

### Slice 4 — Continuidad y contrato documental

- Si las skills nuevas cambian el contrato multi-agente del repo, actualizar:
  - `Handoff.md`
  - `project_context.md`
  - `changelog.md`
- Dejar explícita la diferencia entre:
  - skill repo-local Greenhouse
  - skill global portable

## Out of Scope

- Implementar cambios de microinteracciones en el portal como parte de esta task.
- Reescribir o reemplazar las skills de Codex existentes.
- Crear una capa nueva de librerías de animación en Greenhouse.
- Sincronizar automáticamente skills entre Codex y Claude.

## Detailed Spec

### Investigación mínima esperada

Claude debe contrastar varias fuentes y no conformarse con una sola guía. Priorizar:

- Apple Human Interface Guidelines / Reduced Motion
- Microsoft Fluent
- IBM Carbon
- Material Design / Android
- W3C / WCAG / WAI
- Baymard cuando aporte findings específicos sobre validación o recovery

### Contrato mínimo de la skill repo-local

La skill repo-local de Claude debe poder:

- auditar una pantalla Greenhouse
- decidir si falta o sobra una microinteracción
- mapear el hallazgo a primitives reales del repo
- implementar cuando el usuario lo pida
- respetar `prefers-reduced-motion`
- distinguir claramente entre:
  - empty state orientador
  - loading state
  - inline feedback
  - blocking error
  - success feedback transitorio vs persistente

### Contrato mínimo de la skill global

La skill global de Claude debe poder:

- auditar motion, feedback, loading, empty, validation y accessibility en cualquier UI web
- recomendar patrones portables y no acoplados a una librería concreta
- servir para implementación además de review

### Reglas de paridad

- Claude no debe copiar textual o ciegamente las skills de Codex; debe producir su propia versión en su formato.
- Sí puede usarlas como referencia estructural para no divergir innecesariamente en intención y cobertura.
- Si Claude detecta una diferencia relevante entre su research y lo ya sintetizado por Codex, debe dejarla documentada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Claude realizó investigación externa independiente con fuentes oficiales o muy reconocidas y la dejó resumida en artefactos reutilizables para sus skills.
- [ ] Existe una skill repo-local de Claude en `.claude/skills/greenhouse-microinteractions-auditor/skill.md`.
- [ ] Existe una skill global de Claude en `~/.claude/skills/microinteractions-auditor/SKILL.md`.
- [ ] Ambas skills dejan explícito que sirven para review e implementación, no solo para auditoría.
- [ ] La skill repo-local aterriza sobre el stack real de Greenhouse y menciona primitives y guardrails existentes.
- [ ] La skill global se mantiene portable y no depende de nombres o paths del portal.
- [ ] La continuidad documental del repo quedó actualizada si el contrato multi-agente cambió.

## Verification

- Revisión manual del research y de las dos skills creadas por Claude
- Validación manual de que los paths citados existen
- Comparación manual contra:
  - `.codex/skills/greenhouse-microinteractions-auditor/SKILL.md`
  - `~/.codex/skills/microinteractions-auditor/SKILL.md`
  - `.claude/skills/greenhouse-secret-hygiene/skill.md`
  - `~/.claude/skills/greenhouse-ux/SKILL.md`
- Verificación manual de invocabilidad en el entorno de Claude

## Closing Protocol

- [ ] Registrar en `Handoff.md` que Claude ya tiene parity skill para microinteracciones a nivel repo y global
- [ ] Documentar cualquier diferencia relevante entre la investigación de Claude y la previa de Codex

## Follow-ups

- Evaluar si conviene una task posterior para sincronización ligera entre skills equivalentes de Codex y Claude cuando cambie la guidance de microinteracciones.
- Evaluar si la lane merece una tercera skill más enfocada a formularios y validation timing si Claude detecta suficiente volumen de trabajo repetido.

