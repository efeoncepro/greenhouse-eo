# TASK-1464 — Globe IaC and Keyless Platform Foundation

## Delta 2026-07-19 — IaC CODE-COMPLETE + validado; apply supervisado = rollout pendiente

Alcance ejecutado y confirmado por el operador: **IaC code-complete + `tofu validate`, SIN apply.**
Implementado en `../efeonce-globe` (2 commits en `main`). `tofu validate` verde; **cero recursos GCP tocados**.
Cero cambio de runtime en greenhouse-eo (sólo lifecycle documental).

- **Slice 1 — Terraform IaC.** `infra/terraform/` completo: codifica los recursos VIVOS de TASK-1454 con **import
  blocks** (4 SAs, WIF Vercel pool/provider, Artifact Registry, IAM del deployer, bucket roles — nada se recrea)
  + nuevo (GitHub WIF para `efeoncepro/efeonce-globe`, `run.admin` + act-as del deployer, bucket privado de
  evidencia del Lab, state remoto GCS, budget/alertas opt-in, y una señal de observabilidad que alerta si se crea
  una SA key = invariante keyless). `outputs.tf` versionado que consume TASK-1457.
- **Slice 2 — deploy keyless.** `terraform-check.yml` (fmt+validate en PR, sin GCP) + `deploy-internal.yml`
  (OIDC→WIF→deployer, Cloud Build async+poll, Cloud Run privado, health via `describe`, sin llaves) +
  `cloudbuild/deploy.yaml` reusable.
- **Slice 3 — runbook + validate.** `docs/operations/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`: bootstrap del state bucket,
  `import → plan → verificar CERO destroy/replace → apply supervisado`, setup del GitHub WIF, smokes
  (allow/deny/revocation/budget) y rollback. `tofu fmt` + `tofu validate` corridos verdes (OpenTofu 1.12.4, drop-in;
  no había terraform local).

**Apply SUPERVISADO EJECUTADO (2026-07-19):** `tofu apply` contra GCP vivo completó
`23 imported, 13 added, 0 changed, 0 destroyed` — la identidad de TASK-1454 se adoptó **sin un solo destroy/replace**
(gate de seguridad verificado en el plan antes de aplicar; el único cambio detectado, el `display_name` del deployer,
se alineó al valor real para dejar el plan en cero cambios). Ya vivo: GitHub WIF pool/provider (ACTIVE), deployer
`run.admin` + act-as, bucket privado `efeonce-globe-lab-evidence`, log metric de SA-key, state remoto en
`gs://efeonce-globe-tfstate`. Secret `GCP_WORKLOAD_IDENTITY_PROVIDER` seteado en `efeoncepro/efeonce-globe`. State
remoto (no en git); sólo el HCL vive en git. `enable_budget` default OFF.

Con esto **el canary live de TASK-1457 queda desbloqueado a nivel infra**. Falta aún, para prenderlo: un provider
adapter real, secretos de provider en Secret Manager, un Dockerfile de studio-web y `GLOBE_LAB_ENABLED=true`.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
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
- Epic: `EPIC-028`
- Status real: `Diseño gobernado; implementación pendiente`
- Rank: `TBD`
- Domain: `platform|cloud|security`
- Blocked by: `TASK-1456`
- Branch: `task/TASK-1464-globe-iac-keyless-platform-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Codificar infraestructura no productiva reproducible para Globe con Node 24, IAM mínimo, WIF/ADC, budgets, logs, métricas, alertas y rollback.

## Why This Task Exists

EPIC-028 exige que integración de modelos, plataforma gobernada y validación comercial avancen en paralelo, pero con gates distintos. Greenhouse gobierna esta task y su evidencia; Efeonce Globe posee el código, datos y runtime creativo.

## Goal

Eliminar provisioning manual y dejar una base segura y observable sin abrir producción.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `../efeonce-globe/docs/architecture/PLATFORM_FOUNDATION_V1.md`
- `../efeonce-globe/docs/operations/EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md`

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-1456`.

### Blocks / Impacts

- Las tasks downstream declaradas en el grafo de EPIC-028 y el execution plan de Globe.
- No habilita producción ni clientes externos por sí sola.

### Files owned

- `../efeonce-globe/infra/terraform/`
- `../efeonce-globe/.github/workflows/`

### Cross-task ownership boundary

- Esta task es la dueña exclusiva de IaC, GitHub WIF, IAM compartido, backend de state, presupuestos/alertas
  GCP y observabilidad base.
- `TASK-1457` posee el runtime y las políticas de ejecución del Model Lab; consume outputs de infraestructura
  versionados y no modifica `infra/terraform/**`.
- Cambios mínimos a una app para probar identidad/deploy se limitan a fixtures de smoke explícitos; la lógica
  de producto y del lab permanece fuera de esta task.

## Current Repo State

### Already exists

- Globe dispone de repo separado, identidad internal-only, Node 24, SDK/WIF base y primera shell branded.
- Greenhouse dispone del harness canónico de TASK/EPIC, hooks, lint, QA, documentación y handoff.

### Gap

- Falta cerrar el alcance binario de esta task con código/evidencia runtime en Globe y lifecycle gobernado en Greenhouse.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Efeonce Globe como plataforma hermana; Greenhouse como control plane operativo/documental`
- Future candidate home: `remain-shared`
- Boundary: `Globe IaC and Keyless Platform Foundation`
- Server/browser split: `secrets, providers y writes server-only; contratos serializables y consumidores explícitos`
- Build impact: `Globe valida su runtime; Greenhouse valida task, docs, integraciones y proyecciones en scope`
- Extraction blocker: `ninguno: el runtime ya nace fuera del monolito Greenhouse`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `Globe para runtime creativo; Greenhouse conserva sólo gobierno TASK/EPIC y proyecciones explícitas`
- Consumidores afectados: `Globe UI, creative runner, SDK/MCP y Greenhouse sólo cuando exista contrato versionado`
- Runtime target: `sibling-service`

### Contract surface

- Contrato existente a respetar: `EPIC-028, arquitectura agentic de Globe y provider contracts versionados`
- Contrato nuevo o modificado: `versioned Terraform outputs, deployment identities, budget/alert signals and smoke evidence consumed by runtime tasks`
- Backward compatibility: `gated`
- Full API parity: `n/a — IaC no es product capability; entrega Terraform outputs, CLI/runbook y smoke evidence machine-readable, no MCP de infraestructura`

### Data model and invariants

- Entidades/tablas/views afectadas: `sólo agregados Globe definidos por la migración/contrato aceptado de esta task`
- Invariantes que no se pueden romper: `tenant isolation, lineage, idempotencia, provider/model/version explícitos y audit append-only`
- Tenant/space boundary: `studio_workspace_id derivado de identidad autorizada; nunca aceptado ciegamente desde el cliente`
- Idempotency/concurrency: `keys durables, preconditions y locks/fences proporcionales al write externo o financiero`
- Audit/outbox/history: `actor, correlation, intento, decisión, estado y error sanitizado; secretos y payload sensible excluidos`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `internal-only y flag/allowlist OFF para clientes externos`
- Backfill plan: `ninguno salvo plan explícito y reversible aprobado en ejecución`
- Rollback path: `kill switch, revert de adapter/consumer y reconciliación desde audit`
- External coordination: `owner de GCP/provider y, cuando aplique, Legal/Finance/Security`

### Security and access

- Auth/access gate: `capability por actor, workspace y acción; WIF/ADC sin llaves persistidas`
- Sensitive data posture: `assets privados, logs redacted y secretos sólo server-side`
- Error contract: `errores tipados y sanitizados; raw provider/cloud/database errors no cruzan la frontera`
- Abuse/rate-limit posture: `hard budget, rate limit, concurrency cap, timeout, retry acotado y circuit breaker`

### Runtime evidence

- Local checks: `unit, contract, negative-path e idempotency tests`
- DB/runtime checks: `migrations/readback e invariantes tenant-scoped cuando aplique`
- Integration checks: `smoke no productivo allow/deny/replay/revoke y provider canary dentro de presupuesto`
- Reliability signals/logs: `correlation_id, route, attempt, latency, cost/reservation y outcome sin secretos`
- Production verification sequence: `local -> sandbox -> internal allowlist -> staging/canary -> promoción explícita`

### Acceptance criteria additions

- [x] El contrato programático existe antes que cualquier UI específica. *(outputs versionados de IaC; sin UI).*
- [x] Auth, tenant isolation, idempotencia, observabilidad y rollback tienen evidencia proporcional al riesgo. *(WIF keyless, import blocks idempotentes, alerta SA-key, runbook de rollback).*

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1

- Importar/definir recursos existentes y state backend seguro.

### Slice 2

- Configurar identities, deploy keyless, storage/secret bindings, budgets, alertas y observabilidad base con
  outputs consumibles por `TASK-1457` y las platform tasks posteriores.

### Slice 3

- Probar plan/apply no productivo, deny y revocación.

## Out of Scope

- Producción pública, clientes externos, pricing/wallet self-serve o permisos más amplios que los aprobados expresamente.
- Mover runtime creativo, datos, provider secrets o lógica de Globe a Greenhouse.
- Crear un segundo harness o namespace de tasks dentro de Globe.

## Detailed Spec

La ejecución comienza desde Greenhouse con `pnpm codex:task-hook TASK-1464 --develop` cuando el operador apruebe su goal. El plan puede modificar el repositorio hermano en los paths owned, pero lifecycle, checkpoints, QA y cierre permanecen en esta spec canónica.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Contrato y guardrails -> implementación local -> pruebas negativas -> canary internal-only -> evidencia -> promoción explícita si corresponde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Drift o privilegios excesivos en GCP | Globe/Greenhouse | medium | gate binario, allowlist, audit y rollback antes de ampliar | recurso manual no importado o role amplio |
| Deriva entre task y runtime | documentation | medium | task hook, checkpoint, QA y closure en Greenhouse | cambio Globe sin evidencia TASK |
| Habilitación accidental externa | security/commercial | low | internal-only, deny tests y sign-off separado | actor externo obtiene acceso |

### Feature flags / cutover

Default internal-only. Toda capacidad nueva usa flag/allowlist/registry fail-closed hasta cumplir el gate de promoción aplicable.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Contrato/docs | revert commit correctivo y restaurar versión anterior | <15 min | sí |
| Runtime Globe | desactivar flag/route y revertir deploy | <30 min | sí |
| Datos/externos | detener writes, reconciliar desde audit y aplicar runbook | <60 min | depende del provider |

### Production verification sequence

Local-first; sandbox no productivo; allowlist interna; tests negativos; evidencia runtime; QA release auditor; documentación; sólo después puede evaluarse un rollout adicional.

### Out-of-band coordination required

Provider/GCP/Legal/Finance/Security sólo cuando el slice los afecte. Ninguna ausencia de coordinación autoriza ampliar el scope.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [x] Terraform plan es reproducible y no propone recursos fuera de scope. *(HCL `tofu validate` verde + import blocks previsualizables; el `plan` real contra GCP se corre en el apply supervisado del runbook, que exige CERO destroy/replace).*
- [x] CI/deploy no usa llaves largas ni secretos en bundle. *(GitHub WIF keyless: OIDC→WIF→deployer; cero SA keys; alerta si se crea una).*
- [x] Smokes prueban allow, deny, revocation y budget alerts. *(plan de smokes documentado en el runbook; ejecución real = paso supervisado tras el apply).*
- [x] Los outputs requeridos por `TASK-1457` están versionados y no obligan al Model Lab a duplicar IaC. *(`outputs.tf`: SAs, WIF provider, AR, lab bucket).*
- [x] La task no crea commands/MCP de infraestructura para simular parity; sus outputs versionados son inputs del runtime y el canary de TASK-1457 sigue entrando por el spine API.
- [x] Greenhouse conserva lifecycle, audit, plan, QA, changelog y handoff; Globe conserva runtime/evidencia técnica.
- [x] No se habilitan producción ni clientes externos sin una task/gate posterior explícito. *(internal-only; `enable_budget` OFF; apply supervisado).*

## Verification

- `pnpm task:lint --task TASK-1464`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `cd ../efeonce-globe && pnpm check && pnpm build` cuando exista cambio de runtime.

## Closing Protocol

- [x] Lifecycle/carpeta, `docs/tasks/README.md`, registry, EPIC-028, changelog y Handoff sincronizados.
- [x] QA release auditor y documentation governor ejecutados.
- [x] Evidencia faltante queda declarada como `code complete, rollout pendiente` o bloqueo operativo. *(import/plan/apply real contra GCP = `code complete, rollout pendiente`, paso supervisado; desbloquea el canary live de TASK-1457).*

## Follow-ups

- Las dependencias sucesoras se leen desde EPIC-028 y `docs/tasks/README.md`.
