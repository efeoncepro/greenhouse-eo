# TASK-1444 — Glitch Notion and Content Factory Adapters

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-031`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `TASK-1442, TASK-1443`
- Branch: `task/TASK-1444-glitch-notion-content-factory-adapters`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementa adapters idempotentes desde el dominio Glitch hacia el calendario Notion y el Content Factory/WordPress, preservando una ficha numerada y un único draft privado por edición.

## Why This Task Exists

El starter escribe archivos y WordPress directamente. La operación real necesita resolver Q3/Q4, validar placeholders, traducir contratos editoriales a Gutenberg y reconciliar writes parciales sin duplicados.

## Goal

- Resolver y actualizar la ficha correcta de Notion por edición/fecha.
- Convertir `GlitchEditionSpec` a Content Factory sin bypasses.
- Crear/actualizar exactamente un post WordPress `private` y registrar mappings/readback.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GLITCH_AGENTIC_EDITORIAL_PIPELINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_SITE_SKILL_ROUTER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Notion/WordPress adapters consumen primitives TASK-1442.
- WordPress write sólo vía Content Factory y siempre `private` en V1.
- Ninguna táctica Glitch consume placeholder numerado.

## Normative Docs

- `.codex/skills/efeonce-public-site-wordpress/references/content-factory-gutenberg.md`
- `docs/operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md`
- `docs/documentation/public-site/glitch-drop-gutenberg-block.md`

## Dependencies & Impact

### Depends on

- `TASK-1442`, `TASK-1443`, TASK-1123 y TASK-1337.

### Blocks / Impacts

- `TASK-1445`, `TASK-1446`; Notion Q3/Q4 y WordPress categoría Glitch.

### Files owned

- `src/lib/content/glitch/integrations/`
- `scripts/public-website/`
- `docs/operations/glitch/GLITCH_INTEGRATION_RUNBOOK_V1.md`

## Current Repo State

### Already exists

- Content Factory commands/validators, WordPress bridge y calendarios Notion Q3/Q4.

### Gap

- No hay adapters Glitch ni reconciliación idempotente cross-system.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/content/glitch/integrations/ + scripts/public-website/`
- Future candidate home: `worker`
- Boundary: `adapters Notion/Content Factory consumiendo commands/readers Glitch`
- Server/browser split: `tokens, WP-CLI y writes server-only; browser sólo QA anónima`
- Build impact: `SDK/provider adapters y fixtures; evitar imports browser`
- Extraction blocker: `credenciales Notion/Kinsta y Content Factory local`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `mappings externos registrados por TASK-1442; Notion/WordPress como projections`
- Consumidores afectados: `worker, CLI, equipo editorial, WordPress`
- Runtime target: `external`

### Contract surface

- Contrato existente a respetar: `commands/readers TASK-1442 + Content Factory Gutenberg spec`
- Contrato nuevo o modificado: `resolveNotionEdition/writeNotionEdition/writePrivateGlitchDraft/reconcile adapters; nombres finales en plan`
- Backward compatibility: `compatible`
- Full API parity: `CLI/worker/agente llaman adapters server-side compartidos; no scripts con lógica paralela`

### Data model and invariants

- Entidades/tablas/views afectadas: `external mappings/audit definidos por TASK-1442`
- Invariantes: Q3 #16–26; Q4 #27–39; una página y un post por edición; `private`; ocho drops; TOC/SEO/media válidos.
- Tenant/space boundary: `Efeonce teamspace y efeoncepro.com explícitos`
- Idempotency/concurrency: `provider mapping unique + expected-version write + lock por edition`
- Audit/outbox/history: `request/result redacted, provider IDs, checksum y reconciliation outcome`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `flag OFF`
- Backfill plan: `read-only discovery #12–#15; no historical writes`
- Rollback path: `flag off; restaurar snapshots; mantener draft private`
- External coordination: `Notion auth, Kinsta SSH/WP-CLI check y sign-off editorial`

### Security and access

- Auth/access gate: `service credentials/CLI autenticado + capability mutante`
- Sensitive data posture: `secret refs server-only; contenido público`
- Error contract: `placeholder_missing/conflict/provider_unavailable/validation_failed/private_write_failed`
- Abuse/rate-limit posture: `rate cap, retries con jitter, circuit breaker y replay guard`

### Runtime evidence

- Local checks: `adapter contract tests + Content Factory validate`
- DB/runtime checks: `mapping/audit readback`
- Integration checks: `Notion sandbox/shadow + WordPress private canary`
- Reliability signals/logs: `notion mismatch, duplicate mapping, private draft validation failure`
- Production verification sequence: `read-only resolve -> shadow render -> Notion controlled write -> private WP canary -> reconcile`

### Acceptance criteria additions

- [ ] Source of truth y provider mappings son explícitos y auditables.
- [ ] Idempotencia, rollback, errores y runtime evidence cubren ambos providers.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Notion adapter

- Resolver data source por fecha/trimestre y validar número/fecha/status.
- Implementar write/readback/reconciliation sin crear páginas implícitamente.

### Slice 2 — Content Factory adapter

- Traducir edition spec a Gutenberg con `efeoncepro/glitch-drop`.
- Implementar private upsert, deep inspection y mapping/checksum.

## Out of Scope

- Scheduler, publicación pública, rediseño de categoría, migración histórica y UI.

## Detailed Spec

El resolver selecciona data source por fecha/trimestre, valida número+fecha y falla cerrado. El adapter Gutenberg genera ocho secciones/drop blocks, TOC, metadata, media y checksum antes del private upsert.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Foundation+skill -> read-only discovery -> Notion shadow -> WP render local -> writes privados controlados -> reconciliation.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Página equivocada | Notion | medium | number+date invariant | placeholder mismatch |
| Post duplicado/publicado | WordPress | medium | unique mapping + private assertion | duplicate/status signal |
| Write parcial | cross-runtime | medium | reconcile command | mapping incomplete |

### Feature flags / cutover

Flags separados para Notion write y WordPress private write, ambos default OFF.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Notion | flag off + snapshot restore | <30 min | sí |
| WordPress | flag off + snapshot/privatize | <30 min | sí |

### Production verification sequence

Read-only Q3/Q4, shadow #16 fixture, canary privado, deep inspection/readback, retries/reconcile sembrados, cooldown antes de scheduler.

### Out-of-band coordination required

Credenciales Notion y acceso Kinsta ya autenticados deben validarse; publish humano fuera de esta task.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Resolver #16–#39 es determinista por número/fecha y falla cerrado ante mismatch.
- [ ] Re-run no crea otra página ni otro post.
- [ ] WordPress queda `private` y usa Content Factory + bloque Glitch canónico.
- [ ] Reconciliation recupera writes parciales sin duplicar.
- [ ] Snapshots, checksums, audit redacted y smoke externo quedan documentados.

## Verification

- `pnpm task:lint --task TASK-1444`
- Tests focales adapters.
- `pnpm public-website:ssh-check`
- Content Factory validation/deep inspection + Notion readback.
- `pnpm qa:gates --changed`.

## Closing Protocol

- [ ] Lifecycle/carpeta/README, runbook, ADR, changelog y Handoff sincronizados.
- [ ] QA release auditor y documentation governor ejecutados.

## Follow-ups

- `TASK-1445`, `TASK-1446`.
