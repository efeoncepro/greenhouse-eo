# TASK-1529 — Globe Media Lifecycle and Orphan Garbage Collection

## Delta 2026-07-24

- Desbloqueada: `TASK-1528` (Media Derivatives + Range Delivery) quedó **complete internal-only**. Ya existen
  derivados persistidos (`media_derivative_records`), su bucket separado `efeonce-globe-media-derivatives` y el
  contrato de identidad exacta que el reconciler de GC necesita para clasificar drift record↔objeto en ambas
  direcciones. El worker de derivados tiene storage get/create **sin delete** a propósito: el delete guarded con
  generation-precondition es de esta task.


<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `cron`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `creative|storage|ops`
- Blocked by: `TASK-1528`
- Branch: `task/TASK-1529-globe-media-lifecycle-orphan-gc`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementar inventario, clasificación, mark-and-sweep y garbage collection gobernado para originales y
derivados privados de Globe. El reconciler cruza autoridad Postgres, generations GCS, retention/holds y estado
de jobs; primero produce plan dry-run auditable y sólo después aplica deletes con preconditions.

## Why This Task Exists

GCS puede contener objetos sin autoridad durable o derivados obsoletos. Borrar por listado, edad o SQL manual
arriesga pérdida irreversible; no borrar crea crecimiento indefinido. ADR-008 exige un lifecycle reconciler
separado, con grace, holds, inventario y generación exacta.

## Goal

- Inventariar objetos y authorities sin derivar ownership desde nombres.
- Marcar candidatos con reason, generation, evidence refs, grace y holds.
- Aplicar lotes allowlisted con generation preconditions y receipts append-only.
- Detectar autoridad sin bytes, bytes sin autoridad y derivados superseded.
- Bloquear el delete si cualquier referencia durable vigente alcanza el objeto, aunque provenga de otro
  subdominio o de una operación en curso.

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_MEDIA_DELIVERY_LIFECYCLE_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`

Reglas obligatorias:

- Inventory → classify → mark → grace/hold → dry-run → apply.
- DB conserva autoridad; GCS conserva bytes y generation, no ownership.
- Apply usa generation precondition; mismatch vuelve a inventario.
- No delete manual, wildcard ni cascada opaca.
- Maker y checker son principals distintos: quien crea/aprueba el plan no puede habilitar ni ejecutar su apply.
- El orden de apply es `derivados verificados → originales elegibles`; nunca se borra un original antes de
  cerrar/cancelar todos sus derivados.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/tasks/in-progress/TASK-1521-globe-commercial-runtime-enablement.md`

## Dependencies & Impact

### Depends on

- `TASK-1467`, `TASK-1520`, `TASK-1528` y ADR-008.

### Blocks / Impacts

- Cierra el gate de orphan GC de `TASK-1521`; no autoriza commercial por sí sola.

### Files owned

- lifecycle/GC contracts, domain y database en `../efeonce-globe/packages/`
- reconciler/job dedicado e IaC en `../efeonce-globe/apps/` e `infra/`
- runbook/evidencia bajo Greenhouse

## Current Repo State

### Already exists

- Originals privados, governance retention intents y Cloud Run Jobs.

### Gap

- No hay inventario cruzado, marks, grace/holds, apply receipts ni señales de orphans.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `../efeonce-globe packages/database/domain + lifecycle Cloud Run Job + GCS`
- Future candidate home: `worker`
- Boundary: `media lifecycle inventory/mark/apply`, consumido por ops/API/CLI
- Server/browser split: completamente server-side; browser no participa
- Build impact: `listado paginado GCS + worker acotado`
- Extraction blocker: autoridad Postgres, generation GCS, retention y holds

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `cron`
- Source of truth afectado: `GC plans/marks/receipts; asset authority permanece existente`
- Consumidores afectados: `worker|ops|API|CLI`
- Runtime target: `Cloud Run Job`

### Contract surface

- Contrato existente a respetar: ADR-008, asset provenance/governance/retention
- Contrato nuevo o modificado: inventory/dry-run/apply readers/commands y job
- Backward compatibility: `compatible`
- Full API parity: operadores usan commands/readers/CLI canónicos; nunca SQL/GCS manual

### Data model and invariants

- Entidades/tablas/views afectadas: lifecycle scans, marks, holds y receipts aditivos
- Invariantes que no se pueden romper:
  - mark fija bucket/object/generation y authority snapshot;
  - hold o nueva referencia cancela elegibilidad;
  - apply con generation distinta no borra;
  - originales activos y derivados vigentes nunca son candidatos.
- Referencias bloqueantes mínimas: asset authority, derivative intent/record/attempt, feed projection, share/export,
  active viewer/media ticket, review/proposal/canary evidence, run/attempt/output, retention/legal hold, GC
  rollback/restore receipt y cualquier job no terminal.
- Tenant/space boundary: authority por workspace; inventory global sólo service principal
- Idempotency/concurrency: scan/plan/apply ids, leases y generation preconditions
- Audit/outbox/history: marks/cancelaciones/deletes append-only

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `dry-run`
- Backfill plan: inventario paginado; allowlist piloto; batch/cooldown
- Rollback path: detener apply; marks expiran/cancelan; restore rehearsal antes de delete
- External coordination: bucket retention/IAM, backup/restore y legal holds

### Security and access

- Auth/access gate: service principal dedicado + maker-checker con capabilities separadas para plan, approval y apply
- Sensitive data posture: object refs/digests; no bytes ni secrets en logs
- Error contract: códigos sanitizados por drift/hold/precondition
- Abuse/rate-limit posture: batch caps, cooldown, kill switch y quota

### Runtime evidence

- Local checks: classifier, holds, replay y generation mismatch
- DB/runtime checks: scan/mark/apply receipts
- Integration checks: objetos fixture y restore rehearsal
- Reliability signals/logs: orphan counts/age, authority_without_bytes, apply failure
- Production verification sequence: inventory → dry-run → review → fixture apply → restore → allowlist

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Inventory/dry-run/apply son reader/commands gobernados.
- [ ] Apply requiere capability/grant separado y receipt.
- [ ] CLI/API/worker usan la misma primitive.

<!-- ZONE 2 — PLAN MODE -->

## Scope

### Slice 1 — Inventory and classifier

- Snapshot paginado DB/GCS, grafo completo de referencias y clasificación exacta. La cobertura del inventario
  queda registrada por cursor/rango/bucket y no se infiere de un listado parcial.

### Slice 2 — Marks, grace and holds

- Persistencia, cancelación y policies.

### Slice 3 — Apply and recovery

- Apply maker-checker; delete primero de derivados y luego originales, ambos con generation preconditions,
  receipts, retry, cooldown y kill switch. Conflictos de integridad escalan y nunca se reinterpretan como éxito.

### Slice 4 — Rehearsal and rollout

- Fixture apply/restore, dry-run completo y allowlist.

## Out of Scope

- Transforms/Range (`TASK-1528`), feed/UI (`TASK-1525`/`TASK-1526`) y lifecycle comercial global.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

`inventory → marks/holds → apply disabled → restore rehearsal → allowlist`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| borrar objeto vigente | storage | low | generation+authority+grace+hold | apply precondition failure |
| inventario incompleto | worker | medium | cursor/checkpoint | scan coverage |
| costo/listado excesivo | storage | medium | pagination/caps | scan cost/latency |

### Feature flags / cutover

Apply default OFF; dry-run independiente; kill switch explícito.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| 1–2 | detener jobs; cancelar marks | inmediato | sí |
| 3–4 | kill switch; restore según rehearsal | variable | parcial |

### Production verification sequence

1. Tests/migration.
2. Inventory y dry-run.
3. Review humana del plan.
4. Apply sólo fixtures y restore.
5. Allowlist acotada, cooldown y señales.

### Out-of-band coordination required

Legal/retention/hold policy, IAM de delete y restore rehearsal.

## Acceptance Criteria

- [ ] Dry-run lista reason, authority, generation, grace y hold para cada candidato.
- [ ] Dry-run prueba cobertura de todas las referencias bloqueantes y del inventario completo de su scope.
- [ ] Apply no borra ante generation mismatch, metadata/hash drift, nueva referencia, ticket activo o hold.
- [ ] Maker, checker y service principal de apply son distintos y sus capabilities no se solapan.
- [ ] Derivados se eliminan y verifican antes que el original; un fallo detiene esa rama del plan.
- [ ] Un retry no duplica receipts ni amplía allowlist.
- [ ] Fixture delete/restore se ensaya antes de objetos reales.
- [ ] Orphans y authority-without-bytes son observables.

## Verification

- `pnpm check`
- `pnpm build`
- tests DB/job/storage
- dry-run, fixture apply y restore rehearsal

## Closing Protocol

- [ ] Lifecycle/registry/README/handoff sincronizados.
- [ ] ADR-008 recibe evidencia runtime.
- [ ] QA/docs gates verdes.
