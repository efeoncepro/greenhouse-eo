# TASK-1452 — Governed Notion Work CLI and Agent Rollout

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-032`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1450, TASK-1451`
- Branch: `task/TASK-1452-governed-notion-work-cli-agent-rollout`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Entrega una CLI estable para delegar y consultar trabajo Notion usando exclusivamente los commands/readers canónicos, y completa adopción por Codex/Claude, documentación, canaries multi-space y rollout operativo.

## Why This Task Exists

Sin una interfaz determinista, los agentes seguirán gastando tokens en discovery y construyendo payloads MCP ad hoc aunque existan primitives correctas. La CLI debe ser un consumer del dominio, no otra implementación de Notion.

## Goal

- Exponer create/update/reparent/status/history con UX humana y JSON estable.
- Permitir inferencia segura de destino y pedir confirmación sólo ante ambigüedad o acciones riesgosas.
- Demostrar operación gobernada en Efeonce y al menos otro space, con rollback y runbook.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_NOTION_WORK_MANAGEMENT_CONTROL_PLANE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`

Reglas obligatorias:

- CLI consume commands/readers de `TASK-1450`/`TASK-1451`; no importa SDK Notion, tokens, DB stores ni construye payloads provider.
- `--space` explícito gana; inferencia sólo con una coincidencia fuerte. Ambigüedad devuelve candidatos y no escribe.
- Salida JSON versionada va por stdout; progreso/diagnóstico por stderr; exit codes son estables y documentados.
- Writes soportan `--dry-run`, idempotency key y confirmación; no mutar producción implícitamente en tests o demos.

## Normative Docs

- `.codex/skills/notion-platform/SKILL.md`
- `.codex/skills/notion-platform/references/cli-contract.md`
- `.codex/skills/notion-platform/references/work-management.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1450` y `TASK-1451` completas con entrypoints programáticos estables.

### Blocks / Impacts

- Adopción operativa de Notion por Codex, Claude, Nexa y automatizaciones futuras.
- Cierre de `EPIC-032`.

### Files owned

- `scripts/notion/`
- `package.json`
- `.codex/skills/notion-platform/`
- `.claude/skills/notion-platform/`
- `docs/manual-de-uso/` y `docs/operations/` para runbook/rollout.

## Current Repo State

### Already exists

- Scripts Notion puntuales bajo `scripts/notion/` y CLIs `pnpm` como convención repo.
- Skill V1.1 con reglas multi-space, jerarquía, Markdown y borrador de contrato CLI.
- Commands/readers quedan provistos por `TASK-1450`/`TASK-1451`.

### Gap

- No existe entrypoint estable de work management ni salida JSON/exit codes gobernados.
- La skill aún necesita usar MCP/manual fallback y no tiene evidencia E2E multi-space de CLI.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/notion/ y package scripts dentro del monolito vigente`
- Future candidate home: `remain-shared`
- Boundary: `CLI adapter fino sobre Notion work commands/readers; contrato JSON versionado para agentes`
- Server/browser split: `tooling Node server-only; ningún bundle browser ni secreto impreso`
- Build impact: `entrypoint tsx/package script, fixtures y E2E; no afecta build web`
- Extraction blocker: `autenticación local/API Platform y disponibilidad de commands/readers compartidos`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `ninguno nuevo; CLI opera contracts canónicos sobre Greenhouse/Notion`
- Consumidores afectados: `Codex, Claude, humanos y automatizaciones shell`
- Runtime target: `external`

### Contract surface

- Contrato existente a respetar: `commands/readers versionados de TASK-1450/TASK-1451`
- Contrato nuevo o modificado: `pnpm notion:work -- <resource> <action> + JSON envelope/exit codes`
- Backward compatibility: `compatible`
- Full API parity: `CLI es uno de varios consumers del mismo primitive; no crea capability propia`

### Data model and invariants

- Entidades/tablas/views afectadas: `none directamente`
- Invariantes que no se pueden romper:
  - `dry-run no muta; retry con igual idempotency key no duplica; JSON no cambia sin version bump`.
  - `space` ambiguo o destination unready bloquea write; stdout nunca mezcla logs.
- Tenant/space boundary: `--space o inferencia única resuelta por registry y capabilities del actor`
- Idempotency/concurrency: `CLI propaga key explícita o genera/retorna una; no implementa locks propios`
- Audit/outbox/history: `propagados por command; invocation metadata sin secretos`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `flag OFF`
- Backfill plan: `none`
- Rollback path: `retirar package entrypoint/skill guidance y desactivar commands por flag`
- External coordination: `owners de spaces aprueban destinations/canaries; distribución de skill mirrors`

### Security and access

- Auth/access gate: `sesión/credencial local gobernada + capability del command/reader`
- Sensitive data posture: `redactar tokens, raw provider errors y contenido sensible en logs/fixtures`
- Error contract: `exit codes para validation, ambiguity, auth, conflict, provider unavailable y partial failure`
- Abuse/rate-limit posture: `propaga budgets/circuit breaker; CLI limita batch y exige confirmación según riesgo`

### Runtime evidence

- Local checks: `CLI contract/golden/snapshot tests y shell exit-code tests`
- DB/runtime checks: `audit lookup por operation/idempotency key`
- Integration checks: `E2E dry-run/read y canary aprobado en Efeonce + un segundo space`
- Reliability signals/logs: `command/reader signals existentes + cli_invocation_failed sanitizado`
- Production verification sequence: `local fixtures -> staging/demo -> Efeonce canary -> segundo space -> skill adoption -> monitor`

### Acceptance criteria additions

- [ ] CLI no contiene lógica de negocio ni provider access y prueba el mismo contract que API.
- [ ] Rollout multi-space tiene evidencia, owner/sign-off y rollback documentado.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — CLI contract and implementation

- Implementar `pnpm notion:work -- project create`, `task create`, `task update`, `task reparent`, `status get` e `history get`.
- Soportar `--space`, `--project`, `--parent`, `--dry-run`, `--idempotency-key`, `--since`, `--json` y stdin/file estructurado.
- Publicar envelope JSON versionado, output humano conciso, exit codes y help/examples.

### Slice 2 — Agent adoption and docs

- Actualizar skill/references Codex y Claude para preferir CLI/API y usar MCP sólo como fallback explícito.
- Documentar naming, project-vs-task, subtasks recursivas, selección de space, resultados y troubleshooting.

### Slice 3 — Multi-space rollout and closure

- Ejecutar contract/E2E, dry-run y canaries aprobados en Efeonce y otro space registrado.
- Validar ambiguity rejection, drift, replay, partial failure, rollback, signals y cierre documental del epic.

## Out of Scope

- UI, MCP server propio, scheduler, bulk migration, prompts específicos por agente o lógica de negocio dentro de la CLI.

## Detailed Spec

El envelope mínimo contiene `contractVersion`, `operationId`, `space`, `resource`, `action`, `dryRun`, `status`, `data`, `warnings` y error canónico. Los títulos siguen la convención de la skill; el body estructurado puede recibirse como Enhanced Markdown. `reparent` y writes de alto riesgo usan propose→confirm→execute.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Contract congelado -> CLI sobre fixtures -> E2E read/dry-run -> docs/skill -> canary Efeonce -> canary segundo space -> adopción general.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Agente escribe en space incorrecto | integration | medium | explicit/unique resolution + confirm | space_ambiguous |
| CLI diverge de API | tooling | medium | shared primitives + contract tests | parity test failed |
| Output rompe automatización | tooling | low | versioned JSON + stdout/stderr split | schema snapshot failed |

### Feature flags / cutover

Package command puede ship con writes deshabilitados; allowlist/flags de commands gobiernan cutover por space. Reads se habilitan primero.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| CLI | revert package entrypoint y volver a MCP/manual fallback | <15 min | sí |
| Skill/docs | revert mirrors y restaurar guidance previa | <15 min | sí |
| Rollout | flag/allowlist off; reparar canary desde audit | <30 min | parcial |

### Production verification sequence

Fixtures y exit codes, staging/demo, read-only en ambos spaces, dry-run diff aprobado, canary explícito Efeonce, replay, canary segundo space, monitor y recién entonces guidance preferente para agentes.

### Out-of-band coordination required

Owners de los dos spaces deben aprobar destination y objeto canary. Cualquier space sin grants/fingerprint válido queda read-only/unready y no bloquea otros spaces.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] CLI cubre create/update/reparent/status/history con human/JSON output y exit codes documentados.
- [ ] CLI usa sólo primitives compartidos y contract tests prueban parity con API.
- [ ] Ambigüedad, schema drift, replay y partial failure fallan de forma segura y observable.
- [ ] Skills Codex/Claude y manual explican convenciones, space selection y fallback.
- [ ] Efeonce y un segundo space tienen evidencia E2E gobernada; rollback fue ensayado.

## Verification

- `pnpm task:lint --task TASK-1452`
- `pnpm lint`
- `pnpm tsc --noEmit`
- CLI contract/E2E + canaries aprobados + `pnpm qa:gates --changed`.

## Closing Protocol

- [ ] Lifecycle/carpeta/README, EPIC-032, manual/runbook, skill mirrors, changelog y Handoff sincronizados.
- [ ] QA release auditor y documentation governor ejecutados; epic sólo cierra con rollout real o declara rollout pendiente.

## Follow-ups

- Cualquier UI, MCP server o automatización autónoma nace como task separada sólo después de evidencia de adopción.
