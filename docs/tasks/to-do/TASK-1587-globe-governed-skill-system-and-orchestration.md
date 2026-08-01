# TASK-1587 — Globe Governed Skill System and Orchestration Contract

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `policy`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|ai|creative-studio`
- Blocked by: `none`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Define el sistema mediante el cual Globe registra, compone, orquesta, evalúa y evoluciona Skills de agentes
creativos. La task fija la frontera entre Skill, agente, capability, policy, memoria, plan y evidencia, sin
implementar todavía un runtime paralelo ni un registry duplicado.

## Why This Task Exists

Globe ya tiene una plataforma agentic, un API Contract Spine, capabilities gobernadas, flujos
`propose → approve → execute` y una matriz de adopción de Skills orientada a doctrina y operación. Falta el
contrato que conecte esos elementos dentro del producto: cómo una intención se convierte en un Skill Plan,
quién lo orquesta, qué puede ejecutar, cómo se audita y cómo una versión nueva se evalúa y promueve.

Sin este contrato, cada agente podría resolver composición, memoria, feedback y evolución de forma distinta,
creando lógica duplicada, drift entre UI/MCP/CLI y una superficie de autoridad difícil de auditar.

## Goal

- Definir el modelo conceptual y machine-readable de Skill, Skill Plan, ejecución, evidencia, feedback y promoción.
- Definir el Globe Skill Planner y Skill Execution Coordinator, incluyendo límites de autoridad y composición.
- Producir un ADR/spec canónico y un backlog de implementación ordenado para `efeonce-globe`.
- Separar aprendizaje por workspace de evolución global de Skills, preservando derechos, credits, policies y approvals.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_OPERATING_RESPONSIBILITY_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_VIDEO_EFFECTIVENESS_AGENT_DECISION_V1.md`
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_SKILL_ADOPTION_V1.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`

Reglas obligatorias:

- Globe es dueño del runtime, las Skills de producto, las capabilities, los assets y la evidencia; Greenhouse es
  el control plane documental/operativo y no recibe un runtime creativo paralelo.
- Una Skill aporta método y criterio; no es una capability, policy, memoria, proveedor ni unidad comercial.
- El Orchestrator puede planificar y coordinar, pero no puede otorgarse capabilities, ampliar presupuesto,
  saltar rights/approvals, llamar providers directamente ni modificar una Skill productiva en silencio.
- Planner y Coordinator consumen commands/readers canónicos del API Contract Spine; UI, MCP, CLI y workers no
  obtienen una lógica de negocio alternativa.
- La evolución de una Skill es proposal-driven y eval-gated; el feedback de un workspace no se convierte
  automáticamente en doctrina global.

## Normative Docs

- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1481` — API Contract Spine de Globe y su paridad por surface.
- `TASK-1536` / ADR-011 — Video Effectiveness Agent como primer consumidor agentic especializado.
- `TASK-1493` — Structured Brief Composition + Recipe Registry, como consumidor relacionado y no como segundo
  Skill Registry.
- `TASK-1580` — Project, Session and Reusable Element Contract, para el contexto de producción y reuse.

### Blocks / Impacts

- Bloquea cualquier implementación de un Skill Registry u Orchestrator runtime que pretenda ser source of truth.
- Impacta futuros agentes de Producer, Video Effectiveness, Storyboard, Asset Library y Workbench.
- Impacta futuras capabilities de feedback, evals, promoción y rollback de Skills.

### Files owned

- `docs/architecture/creative-studio/EFEONCE_GLOBE_SKILL_SYSTEM_ARCHITECTURE_V1.md` — nuevo spec canónico.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_SKILL_ORCHESTRATION_DECISION_V1.md` — ADR propuesto/aceptado
  según el resultado de la task.
- `docs/architecture/creative-studio/README.md` — índice y ownership documental.
- `docs/architecture/DECISIONS_INDEX.md` — sólo si el ADR queda aceptado.
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md` — vínculo y estado.
- `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` — registro operativo.

## Current Repo State

### Already exists

- ADR y arquitectura de Globe ya establecen que la plataforma nace agentic, usa Full API Parity y exige
  `propose → reserve → approve → execute` para acciones de coste, acceso restringido, entrega o publicación.
- Existe un Capability Registry y vocabulario de capabilities en el runtime hermano `efeonce-globe`.
- Existe el modelo de adopción de Skills para doctrina comercial y operativa, pero no un contrato equivalente
  para Skills ejecutables dentro de Globe.
- Existe Video Effectiveness Agent con contrato propio y un Producer que conserva la autoridad de ejecución.

### Gap

- No existe una taxonomía canónica que separe Skill, agent profile, capability, policy, memory, plan, run y evidence.
- No existe un Skill Plan durable que conecte intención, composición, approvals, ejecución y aprendizaje.
- No existe lifecycle de Skill con shadow mode, evaluación, promoción, rollback y retiro.
- No existe una regla común para resolver conflictos entre Skills ni para aislar overlays por workspace.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `greenhouse-eo/docs/architecture/creative-studio/` para gobierno documental; implementación futura en `efeonce-globe`
- Future candidate home: `remain-shared`
- Boundary: contrato y ADR en Greenhouse; registry, planner, coordinator y runtime evidence en Globe; Greenhouse no duplica tablas, sesión, secrets ni ejecución creativa
- Server/browser split: `n/a` para esta task; el spec debe exigir que la autoridad y composición ejecutable permanezcan server-side
- Build impact: `none` en esta task; la implementación futura deberá declarar sus paquetes, workers y superficies consumidoras
- Extraction blocker: `none`; la frontera cross-runtime debe quedar explícita antes de implementar

## Scope

### Slice 1 — Taxonomía y fronteras

- Definir Skill, agent profile, capability, tool, workflow, policy, memory, Skill Plan, execution, evidence y feedback.
- Documentar ownership Greenhouse/Globe y las invariantes de workspace, rights, credits, provenance y human gates.

### Slice 2 — Skill Plan y orquestación

- Definir el manifest de Skill y el contrato del Skill Plan.
- Definir Planner y Execution Coordinator, composición, dependencias, conflictos, checkpoints, retries,
  idempotencia, fallbacks y estados de autonomía.
- Fijar que el Planner propone y el Coordinator ejecuta sólo dentro de policies y aprobaciones.

### Slice 3 — Evaluación y evolución

- Definir evidence, feedback, evals objetivas/humanas, métricas, shadow mode, promoción, rollback, deprecation y retiro.
- Separar memoria local de workspace, overlays de marca y evolución global de Skill.
- Definir señales mínimas: aceptación, edición, rechazo, retry, fallback, coste, derechos y tiempo a aprobación.

### Slice 4 — ADR, spec y backlog downstream

- Crear el spec canónico y el ADR correspondiente, o dejar explícitamente documentada la decisión pendiente si
  una cuestión load-bearing requiere una task separada.
- Actualizar el índice de arquitectura si el ADR queda aceptado.
- Derivar tasks de implementación por foundation contract, registry, planner/coordinator, evidence/evals y
  promotion, sin crear código runtime en esta task.

## Out of Scope

- Implementar tablas, commands, readers, APIs, workers o UI del Skill System.
- Crear un segundo task registry, workflow engine, provider router o ledger de créditos.
- Reescribir `.codex/skills/` o `.claude/skills/`; esas Skills siguen siendo tooling/doctrina de agentes.
- Habilitar autonomía comercial, publicación automática, self-service credits o evolución sin aprobación.
- Implementar agentes específicos de Producer, Storyboard o Video Effectiveness.

## Rollout Plan & Risk Matrix

Impact-only: esta task crea contratos documentales y decisiones; no cambia runtime ni requiere rollout. Las tasks
downstream deberán declarar flags, migraciones, cobertura por surface, canarios y rollback antes de implementar.

### Slice ordering hard rule

- Slice 1 debe cerrar antes de Slice 2.
- Slice 2 y Slice 3 pueden avanzar en paralelo sólo después de fijar la taxonomía.
- Slice 4 debe consolidar ambos y precede cualquier task de runtime.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Skill Registry paralelo al Capability Registry | cross-runtime | medium | ADR fija ownership y prohíbe duplicar capabilities/providers | `skill.capability_registry_drift` en diseño downstream |
| Planner obtiene autoridad implícita | identity/policy | high | separar plan, policy y execution; approvals explícitos | plan con capability no declarada o gate omitido |
| Feedback de un cliente contamina Skills globales | tenancy/AI | medium | workspace memory y promoción versionada separados | evidencia cross-workspace o overlay no scopeado |
| Evals técnicas se presentan como aprobación creativa | creative governance | medium | separar verdict objetivo de review humana | `objective_pass` sin estado humano |
| Cambio de Skill rompe reproducibilidad | evidence/runtime | medium | version pin, manifest, changelog y rollback obligatorio | run sin versión de Skill o contexto recuperable |

### Feature flags / cutover

Sin flag — cambio documental y de diseño, sin comportamiento runtime.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| Slice 1 | Revertir el spec/ADR propuesto y corregir el task; no hay runtime afectado | inmediato | sí |
| Slice 2 | Revertir el contrato documental antes de derivar tasks de implementación | inmediato | sí |
| Slice 3 | Revertir el modelo de promoción/evals; no se promueve ninguna versión runtime | inmediato | sí |
| Slice 4 | Revertir enlaces/indexación documental; mantener downstream sin tomar | inmediato | sí |

### Production verification sequence

1. Validar enlaces, ownership y precedencia contra las ADR/arquitecturas vigentes.
2. Ejecutar `pnpm task:lint --changed`, `pnpm ops:lint --changed` y `pnpm docs:closure-check`.
3. Confirmar que no se creó código runtime, schema, flag, capability ni surface como parte de esta task.

### Out-of-band coordination required

N/A para esta task. La eventual aceptación del ADR requiere revisión de Efeonce Creative Technology/Product y,
si el contrato altera economics, rights o approvals, revisión proporcional de Finance/Legal.

## Acceptance Criteria

- [ ] La taxonomía Skill/agente/capability/policy/memory/plan/run/evidence queda definida sin solapamientos load-bearing.
- [ ] Existe un `SkillManifestV1` y un `SkillPlanV1` documentados con inputs, outputs, capabilities, policies,
  human gates, autonomy, cost/rights posture, versioning y evidence.
- [ ] El Planner y el Execution Coordinator tienen responsabilidades separadas y límites de autoridad explícitos.
- [ ] El ciclo `intent → plan → policy → approval → execute → evidence → eval → feedback → promotion` queda
  conectado y mapeado al API Contract Spine.
- [ ] La composición, resolución de conflictos, workspace isolation, overlays, memoria y reproducibilidad quedan
  especificadas.
- [ ] El lifecycle `draft → shadow → governed → commercial → deprecated/retired` y rollback quedan definidos.
- [ ] Las evals separan checks objetivos de review creativa humana y no permiten autoaprobar un output creativo.
- [ ] Se derivan tasks downstream con ownership claro y sin implementar runtime prematuramente.
- [ ] `pnpm task:lint --changed`, `pnpm ops:lint --changed` y `pnpm docs:closure-check` pasan, o dejan fallos
  preexistentes identificados.

## Verification

- `pnpm task:lint --changed`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- revisión manual de links y precedencia contra ADR-011, API Contract Spine, Credit Model y EPIC-028

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real.
- [ ] El archivo vive en `docs/tasks/to-do/` mientras no se ejecute.
- [ ] `docs/tasks/README.md` quedó sincronizado.
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` quedó sincronizado.
- [ ] `EPIC-028` referencia esta task y su gate documental.
- [ ] `Handoff.md` se actualiza si la task se toma o si deja una decisión/bloqueo operativo.
- [ ] Se ejecutó chequeo de impacto cruzado sobre tasks 1493, 1536–1541 y 1580–1583.

## Follow-ups

- Derivar tasks de implementación en `efeonce-globe` sólo después de aceptar el ADR/spec.
- Evaluar si `TASK-1493` debe consumir el Skill Plan o conservarse como Recipe Registry especializado.
- Definir el primer vertical de validación: `brief → treatment → production recipe` o Video Effectiveness.

## Open Questions

- Si el Skill Registry runtime vive como proyección del Capability Registry o como registry especializado con
  referencias explícitas a capabilities.
- Qué parte del Planner puede ser probabilística y qué parte debe ser determinista/validada por schema.
- Si la promoción comercial requiere un segundo aprobador o basta con policy por workspace en el primer rollout.
