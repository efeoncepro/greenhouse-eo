# TASK-1511 — Globe Workspace / Members / Grants Persisted Tenancy

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
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
- Status real: `Completa y verificada internal-only en shadow; enforcement continuo queda como rollout posterior`
- Rank: `TBD`
- Domain: `platform|data|identity`
- Blocked by: `none`
- Branch: `task/TASK-1511-globe-workspace-members-grants-tenancy`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir el modelo **rico de tenancy persistido** de Globe — la entidad `workspace` de primera clase + `members` + `grants` (role/capability assignments) — sobre el datastore durable que dejó `TASK-1465`, reemplazando el `workspaceId` string derivado del broker (`greenhouse-org:<clientId>`) por un agregado persistido, **sin crear una identidad paralela a la de Greenhouse** (que sigue siendo el broker de identidad de ecosistema y de los workspace/client bindings).

## Checkpoint 2026-07-23 — shadow live, enforcement aún no elegible

- `GLOBE_TENANCY_MODE=shadow` quedó gobernado en Git y aplicado a API/Studio; la migración y los contracts
  tenant-safe están vivos sin habilitar clientes externos.
- El smoke humano BFF sigue verde, pero el runtime emitió `globe_tenancy_shadow_drift`: el broker aún no ha
  reconciliado la proyección durable del workspace interno.
- Por ello `enforced` permanece bloqueado. Promoverlo ahora negaría el piloto o incentivaría una identidad
  paralela; no se creó bypass ni grant local que contradiga al broker.

## Why This Task Exists

`TASK-1465` entregó la persistencia durable de Globe (Cloud SQL keyless, el patrón de stores durables, audit append-only) pero **difirió explícitamente el modelo rico de workspace/members/grants**. Hoy (verificado en `efeonce-globe`):

- El `workspaceId` es un string sintetizado por request desde el broker: `internalWorkspaceId(orgClientId)` → `greenhouse-org:<clientId>` (`apps/studio-web/src/app.ts`), hilado vía `workspaceBindings` → `deriveTrustedContext` → `TrustedCommandContextV1.workspaceId`. **No existe** una entidad workspace con id de respaldo, ni una lista de members, ni grants persistidos.
- Los grants de capability viajan en el principal efímero del broker (`parseGlobeCapabilities`), no hay un registro Globe-side que ligue un member a un workspace con un rol/grant almacenado.

Esto es suficiente para el piloto interno de un solo tenant, pero es el prerequisito para: workspaces multi-member gobernados, grants finos por member sobre capabilities creativas (quién puede operar qué en Globe), y los modos de operación `client-operated`/`co-operated`/`efeonce-managed` que EPIC-028 requiere. Ahora que la persistencia durable existe, esta capa se puede construir encima.

## Goal

- Un **agregado `workspace` persistido** (id-bearing) + `members` + `grants` en el datastore durable de Globe, tenant-scoped y auditado.
- Commands/readers transport-neutral sobre el API Contract Spine (Full API Parity by birth), consumibles por UI/MCP/SDK por construcción.
- **Reconciliación explícita con el broker de identidad de Greenhouse** (el binding workspace/client sigue siendo de Greenhouse): el modelo Globe **extiende/proyecta** esa identidad + agrega grants runtime propios de Globe, NUNCA la reemplaza ni crea una identidad paralela.
- Sin habilitar producción ni clientes externos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md` (SPEC-007 — la base durable que esta task extiende: Cloud SQL, `globe_owner`, el patrón de stores durables, audit)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` (SPEC-001 — trusted context, `deriveTrustedContext`, `workspaceBindings`, capability registry)
- `docs/architecture/creative-studio/GREENHOUSE_CONNECTIVITY_V1.md` (ADR-001 — federación de identidad; Greenhouse es el broker)
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`

Reglas obligatorias (boundary Globe↔Greenhouse):

- Greenhouse es dueño de la **identidad de ecosistema, el desired access state y los workspace/client bindings**. Globe recibe esa identidad como **broker**, NUNCA la reemplaza. Esta task NO crea una identidad paralela.
- El modelo Globe persiste la **proyección runtime de tenancy** + grants propios de Globe (operación de capabilities creativas), reconciliados con el desired-access-state del broker. Un grant Globe-side nunca contradice ni sobre-otorga respecto al broker.
- Tenant isolation dura: toda fila y operación ligada a `workspace_id`; ningún body/header/query elige otro workspace ni eleva grants (el `workspaceSelection` sólo elige entre los `workspaceBindings` del principal).
- No compartir DB, sesión, secreto ni rol admin con Greenhouse (la DB de Globe es propia).
- No habilitar producción ni clientes externos sin una task/gate posterior explícito (`TASK-1480`).

## Normative Docs

- `docs/tasks/complete/TASK-1465-globe-workspace-tenancy-persistence-audit.md` (la base durable + lo que difirió)
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1465` (completa) — el datastore durable de Globe (`packages/database`, Cloud SQL `globe-pg`, `globe_owner`, migration runner, el patrón de stores durables + audit).
- `TASK-1481` (spine) — trusted context + capability registry + `deriveTrustedContext`.
- `TASK-1454` — el bridge de identidad federada Greenhouse↔Globe (el broker que hoy provee el workspace binding).
- **Requiere una decisión de boundary aceptada (ADR) antes de implementar** — ver Open Questions.

### Blocks / Impacts

- Habilita workspaces multi-member gobernados + grants finos por capability creativa; prerequisito de los modos `client-operated`/`co-operated`/`efeonce-managed` de EPIC-028.
- Impacta `deriveTrustedContext` / `workspaceBindings` (hoy string del broker) — el cambio debe ser aditivo/compatible, no romper el path actual.
- No habilita producción ni clientes externos (sigue tras `TASK-1480`).

### Files owned

- `../efeonce-globe/packages/database/migrations/` (nueva migración: workspace/members/grants) `[verificar]`
- `../efeonce-globe/packages/database/src/stores/` (stores durables nuevos, patrón TASK-1465) `[verificar]`
- `../efeonce-globe/packages/domain/src/` (aggregate + commands/readers + reconciliación con el trusted context) `[verificar]`
- `../efeonce-globe/packages/contracts/src/index.ts` (schemas versionados de workspace/member/grant) `[verificar]`
- `../efeonce-globe/apps/studio-web/src/` (wiring + la derivación de `workspaceBindings` reconciliada) `[verificar]`
- `docs/architecture/creative-studio/` sólo para el ADR de boundary + actualizar SPEC/DECISIONS_INDEX.

## Current Repo State

### Already exists

- Datastore durable (`TASK-1465`): Cloud SQL `globe-pg`, `packages/database` (client + migration runner + stores durables + `DurableAuditLog`), `globe_owner` role model, 6 tablas tenant-scoped.
- El spine: `deriveTrustedContext`, `TrustedCommandContextV1` (branded), `workspaceBindings`/`workspaceSelection`, `parseGlobeCapabilities`, capability registry.
- La derivación actual del workspace: `internalWorkspaceId(orgClientId)` = `greenhouse-org:<clientId>` (`apps/studio-web/src/app.ts`), un string del broker, sin entidad de respaldo.

### Gap

- No existe entidad `workspace` id-bearing, ni `members`, ni `grants` persistidos (todo greenfield).
- No hay reconciliación persistida entre el desired-access-state del broker y una proyección Globe-side.
- No hay ADR que decida el boundary (Globe posee vs proyecta la tenancy) — bloqueante de diseño.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `código/infra en efeonce-globe (packages/{contracts,domain,database}, apps/studio-web); gobernanza en greenhouse-eo`
- Future candidate home: `remain-shared`
- Boundary: `agregado workspace + members + grants persistidos en la DB durable de Globe; commands/readers en el spine; reconciliados con el broker de Greenhouse (no identidad paralela)`
- Server/browser split: `entidad/grants/reconciliación server-only; el browser sólo consume readers/commands gobernados; secretos/DB fuera del browser`
- Build impact: `none (usa el cliente durable existente); migración aditiva de schema`
- Extraction blocker: `la reconciliación con el broker de identidad de Greenhouse + el trusted-context derivation acoplan Globe↔Greenhouse a nivel identidad`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration` (+ `command` + `reader`)
- Source of truth afectado: `Greenhouse (broker) = identidad de ecosistema + desired access state + workspace/client bindings; Globe = proyección runtime de tenancy + grants propios de operación creativa`
- Consumidores afectados: `Globe UI/MCP/SDK/CLI (por el spine); el trusted-context derivation; Greenhouse sólo vía contrato versionado`
- Runtime target: `sibling-service` (efeonce-globe, Cloud SQL durable)

### Contract surface

- Contrato existente a respetar: `SPEC-007 (durable persistence), SPEC-001 (spine + trusted context), ADR-001 (broker de identidad)`
- Contrato nuevo o modificado: `schemas versionados workspace/member/grant + commands/readers gobernados + la derivación de workspaceBindings reconciliada`
- Backward compatibility: `gated` — la derivación actual (`greenhouse-org:<clientId>` string) debe seguir funcionando; el modelo rico se introduce aditivo detrás de flag hasta reconciliar
- Full API parity: `los primitives workspace/member/grant nacen con command/reader transport-neutral + coverage + conformance; UI/MCP consumen el mismo primitive, no lógica ad hoc`

### Data model and invariants

- Entidades/tablas/views afectadas: `greenfield: workspace (id-bearing), workspace_member, workspace_grant — en el schema durable de Globe [verificar nombres en Discovery]`
- Invariantes que no se pueden romper:
  - `Toda fila ligada a workspace_id; ninguna operación cross-tenant (mismo predicado que el spine)`
  - `NUNCA identidad paralela al broker: el workspace persistido se reconcilia con el binding del broker; un grant Globe-side nunca sobre-otorga respecto al desired-access-state`
  - `El workspaceSelection sólo elige entre los workspaceBindings del principal; nunca los inventa`
  - `Grants append-only/auditados (quién otorgó, cuándo, por qué); supersede, no delete`
- Tenant/space boundary: `workspace_id derivado del trusted context (broker → reconciliado con el workspace persistido); nunca aceptado ciego del cliente`
- Idempotency/concurrency: `commands mutantes con idempotencyKey + tx atómica; grants con precondición de estado`
- Audit/outbox/history: `todo cambio de member/grant a DurableAuditLog append-only (actor/correlation/decisión/estado, sin PII cruda)`

### Migration, backfill and rollout

- Migration posture: `additive` (nuevas tablas; no toca las 6 de TASK-1465)
- Default state: `flag OFF / la derivación string del broker sigue siendo el default hasta reconciliar; el modelo rico shadow primero`
- Backfill plan: `seed/proyección de los workspaces existentes (hoy `greenhouse-org:<clientId>`) al agregado persistido, reversible; dry-run antes de apply`
- Rollback path: `flag OFF (vuelve a la derivación string) + revert de migración aditiva (drop de tablas nuevas) sin tocar TASK-1465`
- External coordination: `owner del broker de identidad en Greenhouse (el contrato del desired-access-state); GCP/DB owner para la migración`

### Security and access

- Auth/access gate: `capability por actor/workspace/acción (registry del spine); crear/otorgar un grant es una capability gobernada, no admin-coarse`
- Sensitive data posture: `grants/roles/membership = access-control data; sin PII cruda en audit; secretos server-only`
- Error contract: `errores tipados del dominio mapeados a los códigos canónicos del spine (invalid_request/access_denied/not_found); nunca prosa cruda ni fuga de existencia cross-workspace`
- Abuse/rate-limit posture: `un grant nunca se auto-otorga; el loop de escritura pasa por command gobernado; sin elevación por payload`

### Runtime evidence

- Local checks: `pnpm check (tsc NodeNext + node --test) en efeonce-globe; tests negativos de aislamiento cross-tenant + no-sobre-otorgar-vs-broker`
- DB/runtime checks: `migración aplicada + readback contra Postgres real (proxy/keyless); invariantes tenant-scoped ejercitadas en vivo`
- Integration checks: `smoke del trusted-context derivation reconciliado (el binding del broker → workspace persistido) sin romper el path actual`
- Reliability signals/logs: `correlation_id + outcome; signal de drift si un grant Globe-side diverge del desired-access-state del broker`
- Production verification sequence: `local → shadow (modelo rico OFF, derivación string activa) → flag ON internal allowlist → verificar reconciliación → promoción explícita (nunca clientes sin TASK-1480)`

### Acceptance criteria additions

- [x] Source of truth, contract surface y consumers nombrados con paths/objetos reales.
- [x] Invariantes (tenant isolation, no-identidad-paralela, no-sobre-otorgar-vs-broker, grants append-only) explícitos.
- [x] Migración additive + rollback (flag OFF + drop aditivo) explícitos.
- [x] Evidencia runtime/DB listada (migración + readback + tests negativos de aislamiento + smoke de reconciliación).
- [x] Dominio sensible (access-control) con errores canónicos + audit + sin fuga cross-workspace.

## Capability Definition of Done — Full API Parity gate

- [x] Lógica en el primitive (`packages/domain` command/reader), no en la UI.
- [x] Modelada como aggregate `workspace` + commands (crear workspace / agregar member / otorgar grant) + readers, no click-handler.
- [x] Read = reader canónico; write = command con semantics + authorization fina (capability) + idempotencia + audit + errores canónicos.
- [x] Capability + grant en el mismo PR (registry del spine + grant al principal correcto + coverage).
- [x] Camino programático declarado: HTTP/SDK del spine (UI/MCP consumen por construcción).
- [x] Write apto para `propose → confirm → execute` si un actor humano/LLM lo dispara.
- [x] Un primitive, muchos consumers: cero lógica duplicada por consumer.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md según TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — ADR de boundary (bloqueante de diseño)

- Con `arch-architect` + `greenhouse-globe`: decidir si Globe **posee** su workspace/members/grants o **proyecta** los del broker, y cómo reconcilia con el desired-access-state de Greenhouse. Emitir/registrar la decisión (ADR en `creative-studio/`) antes de escribir schema. Sin esta decisión, no se implementa.

### Slice 1 — Schema durable (migración aditiva)

- Migración `packages/database/migrations/` con las tablas workspace/member/grant tenant-scoped (id-bearing), índices, CHECK, grants append-only (supersede). Aplicada + readback contra Postgres real. No toca las 6 tablas de TASK-1465.

### Slice 2 — Aggregate + stores durables + commands/readers

- Aggregate `workspace` en `packages/domain` + stores durables (patrón TASK-1465) + commands (crear workspace / add member / grant) + readers, transport-neutral sobre el spine, con capability + grant + coverage + conformance. Audit de todo cambio.

### Slice 3 — Reconciliación con el broker + wiring (aditivo, detrás de flag)

- Reconciliar la derivación de `workspaceBindings`/`deriveTrustedContext` con el workspace persistido (el binding del broker → agregado), aditivo y compatible; flag OFF por defecto (la derivación string sigue). Tests negativos: no-sobre-otorgar-vs-broker, aislamiento cross-tenant, no elevar grants por payload.

## Out of Scope

- Habilitar producción, clientes externos, pricing/wallet self-serve (sigue tras `TASK-1480`).
- Reemplazar o duplicar la identidad de ecosistema del broker (Greenhouse sigue siendo el SoT de bindings).
- UI de administración de workspace/members/grants (una task `ui-ux` consumer posterior, si aplica).
- El credit ledger comercial (`TASK-1468`) ni el run lifecycle (`TASK-1469`).

## Detailed Spec

La tensión central (a resolver en Slice 0): Greenhouse es el broker de identidad y dueño de los workspace/client bindings; Globe no puede crear una identidad paralela. Por lo tanto el modelo rico de Globe es una **proyección runtime persistida** del binding del broker + grants propios de operación creativa (quién opera qué capability en Globe), reconciliados con el desired-access-state. El `workspace_id` sigue derivándose del trusted context; lo nuevo es que ahora hay un agregado persistido detrás (con members + grants) en vez de un string efímero, y una capa de reconciliación que nunca sobre-otorga respecto al broker. El detalle de schema/commands se congela tras el ADR de Slice 0.

## Rollout Plan & Risk Matrix

Task backend-critical (tenancy/access-control) sobre la DB durable. Migración aditiva + flag; el modelo rico nace shadow.

### Slice ordering hard rule

- Slice 0 (ADR de boundary) **DEBE** cerrar antes de Slice 1 (schema). Sin ADR aceptada no se escribe schema — el boundary Globe↔broker es load-bearing.
- Slice 1 (schema) → Slice 2 (aggregate/commands/readers) → Slice 3 (reconciliación + wiring detrás de flag).
- El flag arranca OFF (derivación string del broker activa); flip a ON sólo tras verificar la reconciliación en allowlist interna.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Crear una identidad paralela al broker | identity | high | ADR de boundary (Slice 0) + reconciliación, nunca reemplazo; tests no-sobre-otorgar | grant Globe-side diverge del desired-access-state del broker |
| Fuga/elevación cross-tenant | security | medium | workspace_id del trusted context; predicado idéntico al spine; tests negativos | query/command sin workspace predicate; elevación por payload |
| Romper el path actual de workspaceBindings | spine | medium | cambio aditivo + flag OFF por defecto; el string derivation sigue de default | trusted-context derivation falla / cambia de shape |
| Grant otorgado fuera del command gobernado | access-control | low | escritura sólo vía command con capability + audit append-only | INSERT directo a grants sin audit |
| Migración toca las tablas de TASK-1465 | data | low | migración estrictamente aditiva (tablas nuevas); marker `-- Up Migration` + verificación post-DDL | plan altera/elimina tablas de 1465 |

### Feature flags / cutover

Flag de habilitación del modelo rico (env/config, default OFF). OFF ⇒ la derivación string del broker (comportamiento actual). Flip a ON tras verificar la reconciliación en allowlist interna; revert = flag OFF (vuelve al string) + drop aditivo de tablas nuevas.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 (ADR) | supersede con nueva ADR; no toca runtime | <30 min | sí |
| Slice 1 (schema) | drop de las tablas nuevas (aditivas), sin tocar 1465 | <30 min | sí |
| Slice 2 (aggregate/commands) | flag OFF + revert PR (los primitives quedan inertes) | <15 min | sí |
| Slice 3 (reconciliación) | flag OFF (vuelve a la derivación string del broker) | <10 min | sí |

### Production verification sequence

Local (`pnpm check` + tests negativos) → migración aplicada + readback en Postgres real → modelo rico en shadow (flag OFF, string derivation activa) → flag ON en allowlist interna + verificar reconciliación (binding del broker → agregado persistido, sin sobre-otorgar) → sólo entonces evaluar promoción. Clientes externos permanecen tras `TASK-1480`.

### Out-of-band coordination required

- Owner del broker de identidad en Greenhouse (contrato del desired-access-state / bindings).
- GCP/DB owner para la migración aditiva.
- Product/Security para el boundary (Globe proyecta, no reemplaza) y para no habilitar clientes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe una ADR aceptada de boundary (Globe proyecta vs posee) antes de cualquier schema.
- [x] Existe un agregado `workspace` persistido (id-bearing) + `members` + `grants` en la DB durable, tenant-scoped, con migración aditiva (no toca las tablas de TASK-1465).
- [x] Los primitives nacen con command/reader transport-neutral + capability + grant + coverage + conformance (Full API Parity); UI/MCP/SDK los consumen por construcción.
- [x] La reconciliación con el broker es aditiva y compatible: la derivación string actual sigue funcionando con el flag OFF; un grant Globe-side nunca sobre-otorga respecto al desired-access-state del broker.
- [x] Tests negativos demuestran ausencia de acceso/elevación cross-tenant y de identidad paralela.
- [x] Todo cambio de member/grant queda en el audit append-only; errores canónicos sin fuga cross-workspace.
- [x] No se habilitan producción ni clientes externos.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- Migración aplicada + readback contra Postgres real (proxy/keyless), invariantes tenant-scoped ejercitadas
- Tests negativos de aislamiento + no-sobre-otorgar-vs-broker (`node --test`)
- Smoke del trusted-context derivation reconciliado sin romper el path actual
- `pnpm task:lint --task TASK-1511`, `pnpm ops:lint --changed`, `pnpm docs:closure-check`

## Runtime evidence — 2026-07-22/23

- ADR-006 quedó aceptada antes del schema. Migraciones Globe `0001…0023` están aplicadas y el aggregate
  workspace/member/grant opera sobre Cloud SQL con audit append-only y aislamiento tenant-scoped.
- Globe `main` publicó `1a0651d` y `0279e13`; CI, `pnpm check`, `pnpm build`, tests de tenancy y los 30 contratos
  Terraform quedaron verdes. La API se desplegó por el workflow keyless a la revisión
  `globe-api-internal-00038-*`, con API anónima `403` y 100% de tráfico.
- Terraform creó `globe-tenancy-operator@efeonce-globe.iam.gserviceaccount.com`, limitado en aplicación a
  `globe.tenancy.read/manage`, separado del broker (`reconcile`, sin `manage`) y sin capabilities de Lab, Producer
  ni créditos. Plan/apply: `2 add / 1 change / 0 destroy`; segunda convergencia: `0 add / 1 change / 0 destroy`;
  plan final sin drift.
- El control plane quedó ligado por configuración al binding canónico Greenhouse dev `efeonce-internal`; el
  caller genérico conserva el alias legado y no hereda esa autoridad. OAuth dev emitió el sujeto opaco y 15
  capabilities desde `dev-greenhouse.efeoncepro.com`; no se usó Production para el bootstrap.
- Smoke live: broker revision `1784776354849`, workspace `shadow`, member `active`, desired capabilities `15`,
  grants activos `15`, expiración `2026-07-23T03:17:34.818Z`. La impersonación humana fue temporal y quedó
  revocada en ambas service accounts (`0/0`). El Asset Governance Job `globe-asset-governance-hpfn6` terminó
  exitosamente y vacío (`claimed=0`, `created=0`, `failed=0`).
- Estado honesto: **complete internal-only en shadow; enforcement continuo pendiente de un rollout posterior**. No se promueve a
  `enforced` porque falta un reconciliador continuo Greenhouse dev → Globe que renueve snapshots/revocaciones sin
  intervención. El bootstrap corto ya expiró y no se usa como autoridad permanente. Production y clientes externos
  siguen bloqueados.

## Closing Protocol

- [x] `Lifecycle` y carpeta sincronizados con el estado real.
- [x] `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md` y EPIC-028 sincronizados.
- [x] ADR de boundary registrada en `creative-studio/DECISIONS_INDEX.md`; SPEC-007 referenciada/extendida.
- [x] `GLOBE_RUNTIME_HANDOFF.md` + doc funcional/manual si cambia comportamiento operable.
- [x] `greenhouse-qa-release-auditor` y `greenhouse-documentation-governor` revisan el cierre.
- [x] Runtime Rollout Completion Gate: `shadow` fue flipeado y verificado en vivo; `enforced` permanece fuera de este cierre hasta tener reconciliación continua.

## Follow-ups

- UI de administración de workspace/members/grants (task `ui-ux` consumer), si aplica.
- Los modos `client-operated`/`co-operated`/`efeonce-managed` de EPIC-028 que consumen este modelo.

## Open Questions

- **Boundary (bloqueante, Slice 0):** ¿Globe **posee** su workspace/members/grants o los **proyecta** desde el broker de Greenhouse? El skill `greenhouse-globe` fija que Greenhouse es dueño de los workspace/client bindings; por lo tanto la hipótesis fuerte es "proyección persistida + grants propios de operación creativa reconciliados con el desired-access-state", NUNCA identidad paralela. Requiere `arch-architect` + ADR aceptada antes de implementar.
- ¿Los grants Globe-side son sólo de operación creativa (qué capability opera un member) o también modelan el rol organizacional? (Resolver en el ADR; preferir el mínimo que no duplique al broker.)
