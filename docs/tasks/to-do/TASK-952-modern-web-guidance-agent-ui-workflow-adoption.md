# TASK-952 — Modern Web Guidance Agent UI Workflow Adoption

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `policy`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform|ops|documentation`
- Blocked by: `none`
- Branch: `task/TASK-952-modern-web-guidance-agent-ui-workflow`
- Legacy ID: `optional`
- GitHub Issue: `optional`

## Summary

Formalizar como workflow de agentes el uso consultivo de Chrome Modern Web Guidance para trabajo UI/frontend en Greenhouse. La adopcion debe ayudar a elegir APIs web modernas, Baseline support y fallbacks sin convertir el paquete en dependencia runtime ni desplazar `DESIGN.md`, Vuexy/MUI, primitives Greenhouse o las skills locales del portal.

## Why This Task Exists

La investigacion del 2026-05-30 mostro que Modern Web Guidance es util para agentes de codigo que necesitan guidance actualizado sobre plataforma web moderna, CSS, performance, seguridad y compatibilidad de navegadores. El riesgo es incorporarlo de forma informal: agentes podrian tratarlo como nuevo sistema visual, instalar dependencias innecesarias, ignorar Vuexy/MUI o gastar telemetria/red sin guardrails. Esta task convierte el hallazgo en un contrato operativo acotado y repetible.

## Goal

- Documentar cuando un agente Greenhouse debe consultar Modern Web Guidance antes de implementar UI/frontend.
- Definir el comando canonico con telemetria deshabilitada y timeout local macOS.
- Dejar claro que Modern Web Guidance es advisory input, no source of truth visual ni dependencia runtime.
- Sincronizar el contrato con la capa de UI, agentes y handoff sin duplicar reglas largas.

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
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- `docs/architecture/GREENHOUSE_SPEC_DRIVEN_DEVELOPMENT_V1.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`
- `docs/ui/GREENHOUSE_VISUAL_VALIDATION_METHOD_V1.md`
- `DESIGN.md`

Reglas obligatorias:

- Modern Web Guidance es una fuente consultiva para APIs y practicas web modernas; no reemplaza `DESIGN.md`, `GREENHOUSE_UI_PLATFORM_V1`, Vuexy/MUI, `src/components/greenhouse/*` ni las skills locales Greenhouse.
- No agregar `modern-web-guidance` como dependencia runtime ni build dependency del portal salvo ADR separado. El uso esperado V1 es via `npx -y modern-web-guidance@latest search|retrieve`.
- Usar telemetria deshabilitada por defecto en recetas de agentes: `DISABLE_TELEMETRY=1`.
- En macOS usar `gtimeout`, no `timeout` crudo, en comandos que llamen CLIs externas.
- Las recomendaciones de Baseline/browser support deben aterrizar como fallbacks, progressive enhancement o out-of-scope explicito antes de escribir JSX/CSS.
- Si la guidance contradice constraints de MUI/Vuexy, accesibilidad Greenhouse o performance local, prevalece el contrato Greenhouse y se documenta el tradeoff.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/operations/CODEX_EXECUTION_PROMPT_V1.md`
- `AGENTS.md`
- `project_context.md`
- `Handoff.md`

Referencias externas revisadas al crear la task:

- `https://developer.chrome.com/docs/modern-web-guidance?hl=es-419`
- `https://github.com/GoogleChrome/modern-web-guidance-src`

## Dependencies & Impact

### Depends on

- Contrato visual vigente en `DESIGN.md`.
- Workflow UI vigente en `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`.
- Workflow local-first y visual validation vigentes:
  - `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
  - `docs/ui/GREENHOUSE_VISUAL_VALIDATION_METHOD_V1.md`
- Skills locales actuales:
  - `.codex/skills/greenhouse-portal-ui-implementer/SKILL.md`
  - `.codex/skills/greenhouse-product-ui-architect/SKILL.md`
  - `.codex/skills/greenhouse-vuexy-ui-expert/SKILL.md`
  - `.codex/skills/greenhouse-ui-enterprise-review/SKILL.md`

### Blocks / Impacts

- Impacta futuras tasks de UI visible, responsive, microinteractions, CSS layout, dialogs/popovers/tooltips, performance frontend, CSP/passkeys/WebAuthn y modernizacion de legacy UI.
- Puede complementar `pnpm fe:capture`/`fe:capture:review`, pero no los reemplaza.
- Puede informar futuras rules/specs L0->L2 si una recomendacion se vuelve recurrente y verificable.

### Files owned

- `docs/tasks/to-do/TASK-952-modern-web-guidance-agent-ui-workflow-adoption.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/tasks/README.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`
- `docs/ui/GREENHOUSE_VISUAL_VALIDATION_METHOD_V1.md`
- `DESIGN.md`
- `AGENTS.md`
- `project_context.md`
- `Handoff.md`
- `.codex/skills/greenhouse-portal-ui-implementer/SKILL.md`
- `.codex/skills/greenhouse-product-ui-architect/SKILL.md`
- `.codex/skills/greenhouse-vuexy-ui-expert/SKILL.md`
- `.codex/skills/greenhouse-ui-enterprise-review/SKILL.md`

## Current Repo State

### Already exists

- Greenhouse ya tiene contrato visual agent-facing en `DESIGN.md`.
- La plataforma UI canonical vive en `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` y `docs/ui/*`.
- El workflow UI ya exige skills Greenhouse, Vuexy/MUI, primitives compartidas y evidencia visual con `pnpm fe:capture`.
- `project_context.md` ya declara `gtimeout` como timeout canonico local en macOS.

### Gap

- Modern Web Guidance no esta documentado como input operativo para agentes.
- No hay receta canonica para consultar `modern-web-guidance` con `DISABLE_TELEMETRY=1` y timeout.
- Las skills UI Greenhouse no dicen cuando consultar guidance externa para APIs web modernas ni como subordinarla al contrato visual del portal.
- No existe criterio escrito para convertir una recomendacion Modern Web Guidance en regla Greenhouse L0/L1/L2.

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

### Slice 1 — Policy Placement

- Elegir una unica fuente canonica para el contrato Modern Web Guidance dentro de `docs/ui/` o `docs/operations/`.
- Agregar una seccion corta que defina triggers de uso:
  - CSS/layout moderno: container queries, anchor positioning, popover/dialog, view transitions.
  - Performance frontend: INP, LCP, preload/prefetch, long tasks.
  - Seguridad/browser platform: CSP, passkeys/WebAuthn, permission-sensitive APIs.
  - Modernizacion de UI legacy donde exista riesgo de usar patrones browser obsoletos.
- Declarar non-goals: no sistema visual paralelo, no dependencia runtime, no reemplazo de Vuexy/MUI, no bypass de `fe:capture`.

### Slice 2 — Agent Contract Sync

- Actualizar `AGENTS.md`, `project_context.md` y las skills UI locales relevantes con una referencia corta al contrato canonico.
- Incluir la receta segura:
  - `DISABLE_TELEMETRY=1 gtimeout 60s npx -y modern-web-guidance@latest search "<query>"`
  - `DISABLE_TELEMETRY=1 gtimeout 60s npx -y modern-web-guidance@latest retrieve "<guide-id>"`
- Evitar copiar listas largas de guides; enlazar la fuente canonica y documentar solo el patron de uso.

### Slice 3 — Spec-Driven Guardrail

- Definir como una recomendacion de Modern Web Guidance se promueve:
  - L0: nota en plan/task.
  - L1: regla revisada en `DESIGN.md` o `docs/ui/*`.
  - L2: check ejecutable solo si el drift es recurrente, barato de verificar y de alto costo si se rompe.
- Documentar que la promocion L2 debe seguir `GREENHOUSE_SPEC_DRIVEN_DEVELOPMENT_V1.md`, no crear lint rules por reflejo.

## Out of Scope

- Instalar o versionar `modern-web-guidance` como dependencia de `package.json`.
- Ejecutar migraciones, tocar runtime Next.js, cambiar rutas, componentes o copy visible.
- Cambiar el sistema visual, tokens, paleta, tipografia o componentes base.
- Reemplazar `greenhouse-portal-ui-implementer`, `greenhouse-product-ui-architect`, `greenhouse-vuexy-ui-expert`, `greenhouse-ui-enterprise-review` o `pnpm fe:capture`.
- Adoptar Webwright como runtime o herramienta oficial de Greenhouse.

## Detailed Spec

El contrato final debe decir, en lenguaje operativo para agentes:

- Antes de implementar una UI que dependa de capacidades browser modernas, consultar Modern Web Guidance con un query especifico y registrar en el plan:
  - guide consultada,
  - recomendacion aplicable,
  - soporte/fallback,
  - decision Greenhouse.
- Si la guidance solo confirma un patron ya soportado por MUI/Vuexy/Greenhouse, no agregar abstraccion nueva.
- Si la guidance propone una API no Baseline o con soporte desigual, usar progressive enhancement o mantener el patron MUI/Vuexy existente.
- Si se usa `npx`, no persistir artifacts, caches o archivos generados salvo que el agente explique por que pertenecen al repo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (fuente canonica) -> Slice 2 (sync agentes/skills) -> Slice 3 (SDD guardrail).
- No actualizar skills antes de que exista la fuente canonica breve; evita drift por redacciones distintas.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Agentes tratan Modern Web Guidance como reemplazo de `DESIGN.md` o Vuexy/MUI | UI | medium | Non-goals explicitos + skills apuntan al contrato Greenhouse primero | No signal — aparece en PR review/design:lint/visual review |
| Se agrega dependencia runtime innecesaria | build | low | Regla explicita "npx consultivo only" + revisar `package.json` en PR | `pnpm build` / diff review |
| Guidance externa cambia y deja docs stale | documentation | medium | Referenciar fuente externa y mantener contrato Greenhouse estable; no copiar listas largas | docs review |
| Telemetria/red inesperada desde CLI externa | ops | medium | `DISABLE_TELEMETRY=1` + `gtimeout 60s` en recetas | logs locales / comando colgado |

### Feature flags / cutover

Sin flags — cambio documental/policy aditivo, sin impacto runtime.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir el delta documental canonico | <5 min | si |
| Slice 2 | Revertir referencias en `AGENTS.md`, `project_context.md` y skills | <10 min | si |
| Slice 3 | Revertir seccion SDD guardrail | <5 min | si |

### Production verification sequence

N/A — policy/doc-only. Verificar consistencia documental y task lint.

### Out-of-band coordination required

N/A — repo-only change. Si se decide instalar una skill/plugin de Modern Web Guidance en una herramienta especifica de agente, hacerlo como operacion separada y documentada, no dentro del runtime del portal.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una fuente canonica breve que define cuando y como usar Modern Web Guidance en trabajo UI/frontend Greenhouse.
- [ ] `AGENTS.md`, `project_context.md` y las skills UI locales relevantes enlazan esa fuente sin duplicar reglas largas.
- [ ] El contrato declara `DISABLE_TELEMETRY=1` y `gtimeout 60s` en los comandos recomendados.
- [ ] El contrato declara que Modern Web Guidance no reemplaza `DESIGN.md`, Vuexy/MUI, primitives Greenhouse ni `pnpm fe:capture`.
- [ ] La promocion de recomendaciones a reglas ejecutables queda alineada a `GREENHOUSE_SPEC_DRIVEN_DEVELOPMENT_V1.md`.
- [ ] `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` quedan sincronizados al cerrar.

## Verification

- `pnpm task:lint --task TASK-952`
- `pnpm docs:context-check`
- `pnpm design:lint` si se modifica `DESIGN.md`
- Revisión manual de que `package.json` no agregó `modern-web-guidance` como dependencia runtime.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] El archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre.
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` quedo sincronizado con el cierre si cambia lifecycle.
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible.
- [ ] Se ejecuto chequeo de impacto cruzado sobre otras tasks o docs UI afectadas.
- [ ] Se registro en `Handoff.md` si se decide instalar una skill/plugin de Modern Web Guidance fuera del repo runtime.

## Follow-ups

- Evaluar wrapper `pnpm` solo si el uso repetido de `npx` genera friccion real; V1 debe partir como receta documental, no como dependencia.
- Evaluar una mini-auditoria post-adopcion si tres o mas PRs UI usan Modern Web Guidance y emergen reglas repetibles.
