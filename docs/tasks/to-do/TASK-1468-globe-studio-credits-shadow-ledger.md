# TASK-1468 — Globe Studio Credits Shadow Ledger

## Delta 2026-07-20 — reconciliar el seam de estimate con TASK-1502 (complete)

TASK-1502 (complete) shippeó un **estimate previewable de PROVEEDOR-COSTO** (`globe.lab.experiment.estimate` +
`LabRunnerPort.estimate({ quote })`): `credits = f(ruta × output-shape)` desde el pricing del adapter (hoy el
`FAKE_CREDITS` por capability; los reales varían por shape), apoyado en el **spend fence de seguridad (1457)**,
NO en este ledger. Es una capa distinta de este kernel: 1468 es el **ledger durable** con **catálogo de rates
INMUTABLE versionado**, allocations, balance, reservations y settlements (`estimateCredits`/`getCreditEstimate`).
**Regla de reconciliación (al construir 1468):** debe haber **UN solo rate autoritativo**. El `estimateCredits`
de este kernel **consume** el estimate de proveedor-costo de 1502 (o el rate catalog pasa a ser la fuente que
1502 lee) — nunca reimplementar un cómputo de crédito paralelo, o el `✨N` del Producer (1502) y el
`estimateCredits` del ledger **divergen**. Migrar la unidad `ruta × output-shape` desde el `FAKE_CREDITS`/adapter
al rate catalog versionado de 1468, con rate pinning. El `withinDayCap` (declarado y NO poblado en 1502) se
puebla desde el fence durable de este kernel. Sin colisión de nombres: `globe.lab.experiment.estimate` (Model
Lab) ≠ `estimateCredits`/`getCreditEstimate` (credits) — son capabilities de capas distintas.

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
- Backend impact: `migration`
- Epic: `EPIC-028`
- Status real: `Diseño gobernado; implementación pendiente`
- Rank: `TBD`
- Domain: `finance|creative|data`
- Blocked by: `TASK-1481, TASK-1465, TASK-1466`
- Branch: `task/TASK-1468-globe-studio-credits-shadow-ledger`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementar el kernel Full API Parity de Studio Credits: catálogo de rates inmutable, allocations shadow,
estimate, balance proyectado, reservations, settlements, releases y ajustes compensatorios auditables, sin
wallet, cobro, top-up ni exposición comercial.

## Why This Task Exists

EPIC-028 exige que integración de modelos, plataforma gobernada y validación comercial avancen en paralelo, pero con gates distintos. Greenhouse gobierna esta task y su evidencia; Efeonce Globe posee el código, datos y runtime creativo.

## Goal

Medir y controlar operaciones generativas gobernadas mediante un ledger reproducible que pueda operar UI,
SDK, MCP, CLI, workers y harnesses sin que ningún consumer calcule o mute saldos por su cuenta.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — principio heredado/adaptado por Globe.
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `docs/architecture/creative-studio/PLATFORM_FOUNDATION_V1.md`
- `docs/operations/creative-studio/EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md`

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-1481` para trusted context, private API/SDK, coverage y conformance harness.
- `TASK-1465` para workspace/tenancy, persistence, commands y audit.
- `TASK-1466` para operating mode, responsibility y budget approver efectivos.

### Blocks / Impacts

- Las tasks downstream declaradas en el grafo de EPIC-028 y el execution plan de Globe.
- No habilita producción ni clientes externos por sí sola.

### Files owned

- `../efeonce-globe/packages/database/`
- `../efeonce-globe/packages/domain/`
- `../efeonce-globe/packages/contracts/`
- `../efeonce-globe/packages/sdk/`

### Cross-task ownership boundary

- `TASK-1481` posee el spine genérico; esta task lo extiende con schemas/primitives de credits y no crea otro
  dispatcher, envelope, auth path o coverage format.
- `TASK-1469` coordina approval y ejecución de runs; consume `estimate/reserve/settle/release` y no escribe
  tablas de credits directamente.
- `TASK-1474` sólo presenta balance, estimate e historial mediante readers/commands canónicos.
- La administración de pools/grants/budgets y su cockpit pertenecen a `TASK-1482`/`TASK-1483`; esta task
  soporta la allocation shadow mínima y el seam transaccional que esos consumers necesitan.

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
- Boundary: `Globe Studio Credits Shadow Ledger`
- Server/browser split: `secrets, providers y writes server-only; contratos serializables y consumidores explícitos`
- Build impact: `Globe valida su runtime; Greenhouse valida task, docs, integraciones y proyecciones en scope`
- Extraction blocker: `ninguno: el runtime ya nace fuera del monolito Greenhouse`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: `Globe para runtime creativo; Greenhouse conserva sólo gobierno TASK/EPIC y proyecciones explícitas`
- Consumidores afectados: `Globe UI, creative runner, SDK/MCP y Greenhouse sólo cuando exista contrato versionado`
- Runtime target: `sibling-service`

### Contract surface

- Contrato existente a respetar: `EPIC-028, arquitectura agentic de Globe y provider contracts versionados`
- Contrato nuevo o modificado:
  - commands `allocateCredits`, `estimateCredits`, `reserveCredits`, `settleCredits`,
    `releaseCreditReservation`, `postCreditAdjustment` y `expireCreditReservation`;
  - readers `getCreditBalance`, `getCreditEstimate`, `getCreditReservation`, `listCreditLedgerEntries`,
    `getCreditRateCatalog` y `getCreditUsageSummary`;
  - DTOs/result/error schemas versionados, private HTTP/SDK adapters y capability coverage.
- Backward compatibility: `gated`
- Full API parity: `cada command/reader extiende TASK-1481; UI/MCP/SDK/CLI/worker llaman el mismo primitive,
  actor/workspace se derivan server-side y ninguna surface calcula o muta balance localmente`

### Data model and invariants

- Entidades/tablas/views afectadas: `credit rate versions, allocations/grants shadow, ledger entries,
  reservations, settlements/adjustments y balance/usage projections; ledger y reservations conservan
  source_ref, pool_id/grant_id opcionales, funding breakdown y budget_policy_version`
- Invariantes que no se pueden romper:
  - `el ledger append-only es source of truth; balance es proyección y nunca contador mutable independiente`;
  - `allocation crea derecho de uso y no es consumo; estimate no mueve balance`;
  - `reservation inmoviliza saldo con rate version, run, scope y expiración; settlement/release son idempotentes`;
  - `refund/corrección se registra como adjustment compensatorio; ninguna fila histórica se edita o elimina`;
  - `un workspace no puede leer, reservar, transferir o ajustar saldo de otro`;
  - `provider/model/version propuestos y ejecutados quedan como evidencia, no como unidad del crédito`;
  - `pool/sub-budget no es un segundo saldo: su check corre en la misma transacción de reserveCredits y la
    fuente de fondos queda pinneada en la reservation`;
  - `una allocation originada por grant usa source_type/source_id únicos y no puede postearse dos veces`;
  - `el mismo idempotency key + fingerprint devuelve el mismo resultado; payload diferente produce conflict`;
  - `no hay saldo negativo salvo policy futura explícita, versionada y aprobada`.
- Tenant/space boundary: `studio_workspace_id derivado de identidad autorizada; nunca aceptado ciegamente desde el cliente`
- Idempotency/concurrency: `claim/fingerprint durable y transacción/locking que impide over-reservation,
  double-settlement, double-release y replay con payload distinto; BudgetPolicyPort fail-closed permite a
  TASK-1482 evaluar pool/project caps atómicamente, nunca mediante un pre-check TOCTOU`
- Audit/outbox/history: `actor trusted, workspace, project/run, command, reason code, rate version, proposed and
  actual route, correlation, before/after projection y error sanitizado; costo vendor/margen se redactan por audience`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `internal-only y flag/allowlist OFF para clientes externos`
- Backfill plan: `ninguno; el shadow ledger comienza vacío y sólo recibe allocations por command canónico`
- Rollback path: `deshabilitar nuevos writes, liberar holds seguros y reconstruir projections desde el ledger;
  nunca borrar entries ni recalcular settlements históricos con una rate version nueva`
- External coordination: `owner de GCP/provider y, cuando aplique, Legal/Finance/Security`

### Security and access

- Auth/access gate: `capabilities separadas para read, estimate, allocate, reserve, settle/release y adjust;
  actor/workspace/budget authority derivados del trusted context de TASK-1481`
- Sensitive data posture: `assets privados, logs redacted y secretos sólo server-side`
- Error contract: `errores tipados y sanitizados; raw provider/cloud/database errors no cruzan la frontera`
- Abuse/rate-limit posture: `hard budget, sufficient-balance check, per-run/daily cap, rate limit, concurrency
  fence, reservation TTL y global/workspace kill switch`

### Runtime evidence

- Local checks: `rate calculation, projection rebuild, reason taxonomy, negative balance, expiry, redaction,
  contract, spoofing-negative, idempotency and concurrency tests`
- DB/runtime checks: `migration/readback, cross-workspace denial, concurrent reserve/settle, projection rebuild
  equality y ledger reconciliation`
- Integration checks: `private API + SDK conformance para allocate/estimate/reserve/settle/release/adjust/read;
  MCP/UI pueden permanecer policy-blocked pero nunca missing`
- Reliability signals/logs: `low balance, expired/stuck hold, duplicate settlement attempt, estimate/actual
  deviation, retry storm y projection drift; correlation sin secretos`
- Production verification sequence: `local -> sandbox -> internal allowlist -> staging/canary -> promoción explícita`

### Acceptance criteria additions

- [ ] El contrato programático existe antes que cualquier UI específica.
- [ ] Auth, tenant isolation, idempotencia, observabilidad y rollback tienen evidencia proporcional al riesgo.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Contract, rates and allocation

- Extender el spine de `TASK-1481` con schemas, errors, capability descriptors y coverage de credits.
- Definir catálogo de rates versionado, allocation shadow por workspace/período y estimate determinista que
  conserve capability/banda y ruta provider/modelo/version propuesta sin convertirla en unidad económica.
- Entregar `allocateCredits`, `estimateCredits`, `getCreditRateCatalog`, `getCreditEstimate` y
  `getCreditBalance` como primitives + private API/SDK.
- Mantener `allocateCredits` como primitive kernel/internal: grants llaman este seam con source ref idempotente
  y no exponen un bypass genérico a UI/MCP.

### Slice 2 — Transactional ledger lifecycle

- Persistir ledger, reservations, settlements y adjustments append-only con rate pinning, TTL, reason taxonomy
  y projections reconstruibles.
- Implementar reserve, settle, release, expire y adjust con idempotency/concurrency fences y saldo no negativo.
- Registrar ruta realmente ejecutada y fallback por attempt sin exponer costo vendor o margen a audiencias no autorizadas.

### Slice 3 — Readers, reconciliation and parity evidence

- Publicar balance/history/reservation/usage readers y sus adapters SDK/private API.
- Implementar expiry/reconciliation sobre primitives canónicos; worker/CLI no escriben DB directo.
- Extender coverage/conformance para replay, concurrencia, redaction, projection rebuild y reporting shadow.

## Out of Scope

- Producción pública, clientes externos, pricing/wallet self-serve o permisos más amplios que los aprobados expresamente.
- Descuentos comerciales sobre precio, facturación, impuestos, reconocimiento de ingreso, top-ups, checkout,
  rollover/expiración comercial o transferencias entre tenants.
- Un cockpit administrativo completo de pools/grants/policies; V1 sólo incluye la allocation shadow mínima y
  sus contratos para calibración interna.
- Mover runtime creativo, datos, provider secrets o lógica de Globe a Greenhouse.
- Crear un segundo harness o namespace de tasks dentro de Globe.

## Detailed Spec

La ejecución comienza desde Greenhouse con `pnpm codex:task-hook TASK-1468 --develop` cuando el operador apruebe su goal. El plan puede modificar el repositorio hermano en los paths owned, pero lifecycle, checkpoints, QA y cierre permanecen en esta spec canónica.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Contrato y guardrails -> implementación local -> pruebas negativas -> canary internal-only -> evidencia -> promoción explícita si corresponde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Doble contabilización o semántica financiera engañosa | Globe/Greenhouse | medium | gate binario, allowlist, audit y rollback antes de ampliar | balance cambia sin ledger entry |
| Consumer calcula o muta saldo fuera del primitive | API/credits | medium | Full API Parity coverage + conformance | UI, worker o script escribe tabla/proyección directo |
| Over-reservation por concurrencia | credits/DB | medium | transaction/lock + invariant tests | disponible cae bajo cero o dos holds consumen el mismo saldo |
| Rate version reescribe historia | credits/economics | low | pin inmutable por reservation/settlement | run histórico cambia al publicar rate nueva |
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

- [ ] Studio Credit no equivale a token, pieza, hora, moneda ni derecho.
- [ ] Allocation shadow, estimate, balance, reservation, settlement, release, expiry y adjustment existen como
      commands/readers canónicos y no como writes directos de fixtures, workers o UI.
- [ ] Balance disponible/reservado/consumido/ajustado se reconstruye exactamente desde el ledger append-only.
- [ ] Estimate conserva rate version y ruta propuesta; settlement conserva ruta real y fallbacks por attempt.
- [ ] Retry, replay, fallback y concurrencia no duplican allocation, reserva, settlement, release ni adjustment.
- [ ] Source refs de grant/pool son únicos y el funding breakdown queda pinneado; concurrencia/replay no crea
      dos allocations para un mismo grant.
- [ ] `reserveCredits` revalida atómicamente el BudgetPolicyPort; pool pausado, agotado o project-capped
      rechaza la reserva aunque el balance agregado sea suficiente.
- [ ] Una reservation expirada libera saldo mediante command idempotente y deja audit/reason; no se borra.
- [ ] Actor/workspace/budget authority se derivan del trusted context; spoofing y cross-tenant access fallan cerrado.
- [ ] El ledger distingue ruta propuesta de ruta ejecutada y conserva fallback/model version por attempt.
- [ ] API/SDK/conformance prueban todos los commands/readers; surfaces aún no habilitadas figuran
      `policy-blocked|not-applicable`, nunca `missing`.
- [ ] Costos vendor y margen sólo aparecen en readers de audiencia autorizada; client-facing recibe credits,
      modelo/ruta transparente y razones legibles sin secretos ni economía confidencial.
- [ ] Reliability detecta holds vencidos/stuck, duplicados, projection drift, saldo bajo y desviación estimate/actual.
- [ ] Greenhouse conserva lifecycle, audit, plan, QA, changelog y handoff; Globe conserva runtime/evidencia técnica.
- [ ] No se habilitan producción ni clientes externos sin una task/gate posterior explícito.

## Verification

- `pnpm task:lint --task TASK-1468`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `cd ../efeonce-globe && pnpm check && pnpm build` cuando exista cambio de runtime.

## Closing Protocol

- [ ] Lifecycle/carpeta, `docs/tasks/README.md`, registry, EPIC-028, changelog y Handoff sincronizados.
- [ ] QA release auditor y documentation governor ejecutados.
- [ ] Evidencia faltante queda declarada como `code complete, rollout pendiente` o bloqueo operativo.

## Follow-ups

- Las dependencias sucesoras se leen desde EPIC-028 y `docs/tasks/README.md`.
