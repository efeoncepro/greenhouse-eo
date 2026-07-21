# TASK-1443 — Glitch Editorial Agent Skill and Evals

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-031`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `TASK-1440`
- Branch: `task/TASK-1443-glitch-editorial-agent-skill-evals`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea una skill editorial Glitch única, portable entre Codex y Claude, con modos Daily/Flash/Weekly, carga progresiva de doctrina, contratos de salida y evals contra golden examples.

## Why This Task Exists

Las tres skills exportadas duplican reglas y mezclan instrucciones editoriales con filesystem/runtime. Sin evals, los aprendizajes quedan como prompt prose y pueden degradarse silenciosamente.

## Goal

- Crear `greenhouse-glitch-editorial-agent` como router editorial compacto.
- Migrar doctrina relevante desde el corpus sin convertirla en estado vivo.
- Gatear calidad con fixtures #14/#15 y casos adversariales.
- Separar outputs internos Daily/Flash del output Weekly y de la propuesta de promoción `glitchFlash`.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GLITCH_AGENTIC_EDITORIAL_PIPELINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_SITE_SKILL_ROUTER_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Skill editorial decide contenido; no persiste, agenda ni publica por sí sola.
- Salidas estructuradas y fallos honestos; no inventar fuentes/claims.
- Copias Codex/Claude sincronizadas y validadas.

## Normative Docs

- `.codex/skills/skill-creator/SKILL.md`
- `.codex/skills/content-marketing-studio/SKILL.md`
- `.codex/skills/content-marketing-studio/efeonce/EFEONCE_OVERLAY.md`
- `/Users/jreye/Documents/glitch-context/00-INDICE-y-Contexto-Glitch.md`

## Dependencies & Impact

### Depends on

- `TASK-1440`; contrato lógico de TASK-1442 para integración final.

### Blocks / Impacts

- `TASK-1444`, `TASK-1445`; content-marketing-studio y public-site router como callers.

### Files owned

- `.codex/skills/greenhouse-glitch-editorial-agent/`
- `.claude/skills/greenhouse-glitch-editorial-agent/`
- `.codex/skills/content-marketing-studio/efeonce/EFEONCE_OVERLAY.md`
- `docs/operations/glitch/evals/`

## Current Repo State

### Already exists

- Tres skills Claude exportadas, guía de voz, arco, playbook, aprendizajes y ediciones #14/#15.

### Gap

- No hay skill Greenhouse canónica, contratos de salida ni eval suite.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `.codex/skills/ y .claude/skills/`
- Future candidate home: `remain-shared`
- Boundary: `juicio editorial y outputs; runtime/persistencia quedan fuera`
- Server/browser split: `n/a; skill declarativa sin secretos`
- Build impact: `lint/tests de skills y fixtures versionados`
- Extraction blocker: `paridad de namespaces Codex/Claude`

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Skill router and doctrine

- Diseñar SKILL.md compacto con routing Daily/Flash/Weekly.
- Organizar referencias de voz, arco, selección, glosa, dedupe y audience modulation.

### Slice 2 — Contracts and evals

- Definir candidate/edition outputs compatibles con TASK-1442.
- Crear golden/adversarial evals y drift check entre mirrors.

## Out of Scope

- DB/API, Notion, WordPress, scheduler, media generation o publicación.

## Detailed Spec

Los evals deben cubrir como mínimo: forecast tratado como release; misma noticia repetida; dependencia de una sola empresa; ausencia de fuente primaria; glosa genérica; CTA inventado; Daily/Flash intentando escribir WordPress; `glitchFlash` consumiendo número; ocho historias sin arco; y cita real convertida erróneamente en `glitch-drop`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Skill-creator -> router -> references -> output schemas -> golden evals -> mirrors -> integration contract.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Skill monolítica/truncada | tooling | medium | router compacto + carga progresiva | size/drift check |
| Slop pasa como edición | editorial | medium | evals golden/adversariales | eval regression |

### Feature flags / cutover

Sin flag runtime; la skill no se usa en scheduler hasta TASK-1445.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Skill/evals | revert commit y mantener starter histórico | <30 min | sí |

### Production verification sequence

N/A — tooling repo-only; validar con fixtures y una shadow run sin writes.

### Out-of-band coordination required

Revisión editorial del operador sobre golden examples y reglas aprendidas.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Una skill única enruta Daily, Flash y Weekly sin duplicar doctrina.
- [ ] Outputs estructurados no incluyen persistencia ni publicación directa.
- [ ] Golden #14/#15 y casos adversariales pasan con umbrales documentados.
- [ ] Mirrors Codex/Claude no presentan drift.
- [ ] El overlay Content Marketing explica cuándo delegar en la skill Glitch.

## Verification

- `pnpm task:lint --task TASK-1443`
- Validador de skills vigente descubierto durante ejecución.
- Eval suite Glitch + shadow run sin writes.

## Closing Protocol

- [ ] Lifecycle/carpeta/README, Handoff y changelog sincronizados.
- [ ] Documentation governor ejecutado por cambio de skill local.

## Follow-ups

- `TASK-1444`, `TASK-1445`.
