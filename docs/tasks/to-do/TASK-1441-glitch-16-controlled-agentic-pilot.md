# TASK-1441 — Glitch #16 Controlled Agentic Pilot

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
- Backend impact: `integration`
- Epic: `EPIC-031`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `TASK-1440`
- Branch: `task/TASK-1441-glitch-16-controlled-agentic-pilot`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Ejecuta la edición #16 con el nuevo proceso en modo humano-supervisado usando los contratos existentes, sin esperar la automatización completa ni publicar automáticamente.

## Why This Task Exists

La #16 debe redactarse el lunes 2026-07-20 para su fecha editorial del martes 2026-07-21. El piloto protege la cadencia y genera evidencia real para diseñar foundation, skill y adapters.

## Goal

- Completar la ficha Notion #16 con investigación, top 8, edición y derivados definidos.
- Crear exactamente un draft WordPress `private` mediante Content Factory.
- Conservar snapshots, QA, revisión humana y retrospectiva estructurada.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_GLITCH_AGENTIC_EDITORIAL_PIPELINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_SITE_SKILL_ROUTER_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Cero publicación pública sin autorización humana explícita.
- La #16 usa la ficha existente; no crea una edición paralela.
- Todos los claims y enlaces se verifican antes del draft privado.

## Normative Docs

- `docs/operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md`
- `docs/documentation/public-site/glitch-drop-gutenberg-block.md`
- `/Users/jreye/Documents/glitch-context/Glitch-15-Jul7-13-2026.md`
- `/Users/jreye/Documents/glitch-context/Glitch-Playbook-Produccion-Editorial-v1.md`

## Dependencies & Impact

### Depends on

- `TASK-1440`; Content Factory TASK-1123 y bloque TASK-1337 existentes.

### Blocks / Impacts

- Provee evidencia y retrospectiva a TASK-1442–1446.

### Files owned

- `docs/operations/glitch/pilots/GLITCH-016-PILOT-2026-07-20.md`
- `docs/operations/public-site-content-factory/`

## Current Repo State

### Already exists

- Ficha #16 vacía en calendario Q3, Content Factory gobernado y baseline #15 público.

### Gap

- No existe una ejecución #16 trazada bajo el nuevo contrato.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `tooling Content Factory + Notion/WordPress externos`
- Future candidate home: `worker`
- Boundary: `manifest de piloto y adapters existentes; sin primitive permanente nueva`
- Server/browser split: `writes y credenciales sólo server-side; browser sólo QA anónima`
- Build impact: `none`
- Extraction blocker: `autenticación Notion y WordPress/Kinsta`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `ficha Notion #16 + manifest Content Factory + post WordPress private`
- Consumidores afectados: `equipo editorial, Content Factory, WordPress`
- Runtime target: `external`

### Contract surface

- Contrato existente a respetar: `AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md`
- Contrato nuevo o modificado: `manifest de piloto Glitch #16`
- Backward compatibility: `not applicable`
- Full API parity: `usa herramientas/commands existentes; no escribe tablas o UI ad hoc`

### Data model and invariants

- Entidades/tablas/views afectadas: `Notion page 3c9b3db1-cd3e-4f6b-ac67-d0c0d14b5dae; WordPress post private`
- Invariantes: una #16; ocho historias; fuentes verificadas; cero publish automático.
- Tenant/space boundary: `teamspace Efeonce y sitio efeoncepro.com`
- Idempotency/concurrency: `manifest edition=16 + Notion page id + WordPress post id; re-run actualiza el mismo draft`
- Audit/outbox/history: `retrospectiva y snapshots del piloto`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `shadow`
- Backfill plan: `none`
- Rollback path: `restaurar snapshot Notion; eliminar/privatizar draft según runbook`
- External coordination: `sign-off editorial y autorización separada para publish`

### Security and access

- Auth/access gate: `sesiones/CLIs autenticados y guardrails public-site`
- Sensitive data posture: `contenido público; credenciales nunca en artefactos`
- Error contract: `fallo honesto por etapa; sin raw provider errors en Notion`
- Abuse/rate-limit posture: `presupuesto y límites manuales del piloto`

### Runtime evidence

- Local checks: `Content Factory validate + deep inspection`
- DB/runtime checks: `N/A — sin DB nueva`
- Integration checks: `readback Notion y WordPress private`
- Reliability signals/logs: `timeline de piloto y findings`
- Production verification sequence: `private draft -> deep inspect -> QA desktop/mobile -> aprobación humana`

### Acceptance criteria additions

- [ ] Source of truth, invariantes, idempotencia, rollback y evidencia quedan registrados.
- [ ] Ningún secreto ni error crudo aparece en artefactos.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Research and edition

- Ejecutar discovery anti-anclaje y producir Top 8 con claim ledger.
- Redactar edición y artefactos derivados requeridos por la ficha.

### Slice 2 — Governed writes and QA

- Actualizar la ficha #16 y crear un único draft privado.
- Ejecutar inspección, QA y retrospectiva; detenerse antes de publish.

## Out of Scope

- Schema/API/cron permanente, nueva skill productiva o publicación pública automática.

## Detailed Spec

El manifest del piloto fija `editionNumber=16`, la página Notion existente, la ventana 2026-07-13/19 y un solo mapping de post privado; cada historia conserva claim, fuente, fecha y glosa.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Research verificado -> revisión editorial -> Notion -> draft private -> QA -> aprobación humana separada.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Claim incorrecto | editorial | medium | fuente primaria + revisión | finding de factcheck |
| Draft duplicado | WordPress | medium | manifest idempotente | más de un post #16 |
| Publicación accidental | WordPress | low | status private y stop gate | status distinto de private |

### Feature flags / cutover

Sin flag nuevo: operación manual controlada con write privado existente.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Research/Notion | restaurar snapshot | <30 min | sí |
| Draft private | restaurar snapshot o retirar draft | <30 min | sí |

### Production verification sequence

1. Verificar ficha #16 y fecha.
2. Validar spec/manifest local.
3. Escribir Notion y draft `private`.
4. Readback + deep inspection + QA desktop/mobile.
5. Esperar autorización humana para cualquier publish.

### Out-of-band coordination required

Revisión editorial y autorización pública del operador.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] La ficha #16 correcta queda completa sin crear otra página.
- [ ] Existe exactamente un post #16 y permanece `private` al cierre de la task.
- [ ] La edición contiene ocho historias, glosas y enlaces verificables.
- [ ] Content Factory validation y deep inspection pasan o documentan findings bloqueantes.
- [ ] Retrospectiva identifica cambios concretos para TASK-1442–1445.

## Verification

- `pnpm task:lint --task TASK-1441`
- `pnpm public-website:ssh-check`
- Content Factory validate/deep-inspect según runbook.
- QA anónima desktop y 390px.

## Closing Protocol

- [ ] Lifecycle/carpeta/README sincronizados.
- [ ] Handoff, changelog y retrospectiva sincronizados.
- [ ] Publicación queda pendiente de autorización explícita.

## Follow-ups

- Hallazgos alimentan TASK-1442–1445.
