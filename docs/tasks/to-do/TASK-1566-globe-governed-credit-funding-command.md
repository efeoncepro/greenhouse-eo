# TASK-1566 — Comando gobernado de fondeo de crédito de Globe (`credits.month.fund.propose` / `.confirm`)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-1566-globe-governed-credit-funding-command`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementa el carril gobernado de fondeo de crédito de Globe que decide **ADR-015**: el comando `globe.credits.month.fund.propose` (read-only, con expiración) y `globe.credits.month.fund.confirm` (único punto de mutación), publicados en la surface `sister-platform`, con la **topología de identidades disjunta** (aprobador que firma y no muta / ejecutor que muta y no puede firmar), la **firma asimétrica en KMS** que reemplaza el HMAC compartido, y el **retiro de la autoridad de crédito del caller genérico**. Hoy fondear el mes no lo puede ejecutar nadie sin break-glass, y el break-glass ya se usó tres veces para la misma clase de acto.

## Why This Task Exists

Hay tres defectos encadenados, todos verificados contra el código el 2026-07-26:

1. **Una sola identidad tiene fondeo y gasto, y Greenhouse puede asumirla.** El principal genérico `globe:service:internal-caller` carga `globe.credits.grant.issue`, `grant.correct`, `policy.manage` y `budget.manage` **más** `globe.lab.experiment.run` (`apps/studio-web/src/app.ts:3515` + `3545-3563`), y `greenhouse-portal@efeonce-group` tiene `serviceAccountTokenCreator` sobre `greenhouse-globe-caller` (`infra/terraform/iam.tf:16-20`). El único freno es un secreto que no puede leer. **No falta una capability: sobra.**
2. **El maker-checker de crédito es vacuo para cualquier caller de workload.** `approval()` en `packages/domain/src/credit-administration.ts` compara `approval.proposedBy` contra `context.actor.principalId`, que para un workload es la **constante** `'globe:service:internal-caller'` (`app.ts:3503`). Un proceso que conozca el HMAC es maker y checker poniendo otro string. La disyunción real no puede vivir en Globe (sus principals son constantes por clase) — vive donde hay identidades humanas: Greenhouse.
3. **El HMAC es simétrico: leer implica forjar.** Su radio es correcto (`only api_runtime can read them`, `infra/terraform/secrets.tf:100-110`) y por eso mismo **no existe superficie que firme** — `.sign(` no aparece en `app.ts`; los únicos consumidores del firmador son el verificador, su test y un script que por contrato no puede leer el secreto. El carril nunca fue ejercitado.

Consecuencia operativa medida: con el tope mensual publicado en ~110 créditos y 108 gastados, imagen y video **no se pueden generar** y **nadie —ni humano ni agente— puede fondear el mes** sin break-glass (`GLOBE_RUNTIME_HANDOFF.md:220`, ejercido ≥3 veces). Y `ISSUE-124` está abierta porque el 409 de esa vía es ambiguo.

## Goal

- Un fondeo mensual real, ejecutado punta a punta por **dos humanos distintos** de Greenhouse, **sin break-glass**.
- La evidencia de aprobación **nunca sale del runtime de Globe**, y **ningún actor obtiene aprobación y ejecución a la vez**.
- La mutación (grant + asiento de ledger + política) ocurre en **una sola transacción Postgres**, idempotente por `proposalId`.
- El caller genérico **pierde** la autoridad de crédito, con señal que detecta si vuelve.
- Un `conflict` de administración de crédito declara **qué fase** lo produjo — cerrando la mitad de diagnóstico de `ISSUE-124`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md` — **ADR-015, la decisión que esta task implementa.** Leerla completa antes de Discovery; sus `Reglas duras` son el contrato.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` — SPEC-001: trusted context vs untrusted payload, coverage de 3 estados (`missing` no existe), errores canónicos.
- `docs/architecture/creative-studio/GREENHOUSE_CONNECTIVITY_V1.md` — ADR-001: federación humana vs federación keyless de workload. **No se modifica.**
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_PROMOTION_OPERATION_DECISION_V1.md` — ADR-009: el patrón de identidades disjuntas por clase de workload que esta task **reusa, no reinventa**.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_COMMERCIAL_PROMOTION_ATTESTATION_DECISION_V1.md` — ADR-010: el rollout de 3 pasos zero-downtime de scopes OAuth y la lección del login caído.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — la capability nace con contrato gobernado; Nexa y MCP la operan por construcción.
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` — state machine + CHECK + audit trio; defense-in-depth.

Reglas obligatorias (extracto de ADR-015 § Reglas duras — la lista completa manda):

- **NUNCA** dejar que una identidad cargue a la vez autoridad de **fondeo** y de **gasto**.
- **NUNCA** darle `secretmanager.versions.access` sobre un secreto de aprobación de Globe a ninguna identidad de Greenhouse.
- **NUNCA** usar el reconciliador de tenancy (`greenhouse-portal@`) para administrar crédito, ni reusar las identidades del saga de promoción de modelos (`globe-promotion-*`).
- **NUNCA** apoyar la disyunción de actores sólo en `approval.proposedBy !== context.actor.principalId`: para un caller de workload ese chequeo es **vacuo**.
- **NUNCA** volver a un esquema de aprobación simétrico, ni dejar el verificador dual sin fecha de retiro declarada y sin la señal que mide el uso del legacy.
- **NUNCA** emitir el grant y mover la política en dos transacciones dentro de la intención compuesta.
- **NUNCA** reintentar un `confirm` tras un timeout del cliente sin leer primero el estado.
- **NUNCA** exponer saldos, política cruda, SQL ni payload en la razón de fase del conflicto: es un enum cerrado y sanitizado.
- **SIEMPRE** retirar la autoridad vieja **después** de que la nueva esté verde con un caso real.
- **SIEMPRE** registrar cada test nuevo en el script `test` de su package en `efeonce-globe`: los scripts **enumeran los archivos a mano** y un test no registrado deja la suite verde por no haberlo mirado.

## Normative Docs

- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md` — estado vivo de revisiones/flags/bloqueos, y el procedimiento de break-glass en la línea 220 que esta task existe para dejar de necesitar. **Es el SoT del estado mutable; no inferir revisiones desde esta task.**
- `docs/issues/open/ISSUE-124-globe-credit-grant-canonical-409-root-cause-hidden.md` — la mitad de diagnóstico que cierra el Slice 1.
- `.claude/skills/greenhouse-globe/SKILL.md` § `Gasto y crédito en Globe` — las cinco reglas medidas contra el runtime.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md` [verificar path exacto: el runbook vive en `docs/operations/creative-studio/`] — protocolo de import de Terraform: `plan` con cero `destroy`/`replace` de identidad viva.

## Dependencies & Impact

### Depends on

- **Nada bloqueante.** El ledger comercial durable (`TASK-1468`) ya existe y es el que la política consulta. El carril `sister-platform` ya existe y está `available` en tenancy (`packages/domain/src/tenancy.ts:23`).
- **Habilitación nueva de infra:** Cloud KMS **no está habilitado** en el proyecto de Globe (`grep -rn kms infra/terraform/` = 0 resultados). Hay que sumar `cloudkms.googleapis.com` a `local.enabled_services` en `infra/terraform/locals.tf`, y si el recurso nuevo no tiene arista implícita hacia la API, darle `depends_on` explícito — **arreglar la carrera en el HCL, no reintentar a ciegas** (lección de `TASK-1507`).
- **Coordinación humana**, no código: el fondeo real del criterio de salida del Slice 4 necesita **dos personas** de Greenhouse.

### Blocks / Impacts

- **`ISSUE-124`** — el Slice 1 cierra su mitad de diagnóstico (la fase de negación deja de ser opaca). El guard de "un solo grant activo" que el issue descarta sigue siendo tema aparte.
- **Follow-up `ui-ux`** — la superficie de administración en el portal (Slice 4 de ADR-015) es una task aparte, bloqueada por esta.
- **Follow-up `backend-data`** — capabilities por usuario (Slice 6 de ADR-015), bloqueada por `tenancy_mode = enforced` (`TASK-1511`), no por esta.
- **`TASK-1521` / `TASK-1480`** — el fondeo de un workspace de cliente pasará por este carril.
- **Retiro** de `efeonce-globe/scripts/raise-credit-monthly-cap.mjs` y `scripts/fund-internal-credit-month.mjs`: su premisa (firmar desde el cliente) contradice el diseño.

### Files owned

En `efeonce-globe`:

- `packages/contracts/src/credit-administration.ts` — comandos, capabilities, tipos de propuesta y de razón de fase.
- `packages/domain/src/credit-administration.ts` — coverage `sister-platform`, `propose`/`confirm`, verificador dual, ports transaction-scoped.
- `packages/database/src/stores/credit-administration-store.ts` + `migrations/00NN_credit_funding_proposals.sql` [verificar siguiente número de migración].
- `apps/studio-web/src/{app,main,worker-main,credit-admin-approval,dispatch}.ts`.
- `apps/credit-approver/**` — unidad de ejecución nueva (aprobador).
- `infra/terraform/{locals,iam,secrets,kms,cloud_run_services,variables,outputs}.tf`.

En `greenhouse-eo`:

- `src/lib/globe/credit-administration-broker.ts` [nuevo] + su test.
- `migrations/` — tabla de propuestas/confirmaciones de Greenhouse (append-only) con el `CHECK` de confirmante ≠ proponente.
- `src/lib/entitlements/runtime.ts` + seed de `capabilities_registry` — capabilities `globe_admin.credit_funding.propose` / `.confirm` (mismo PR, con grant a ≥1 rol real).
- `src/lib/reliability/queries/` — las señales nuevas.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md` — deltas de implementación.
- `docs/operations/creative-studio/` — runbook del carril.

## Current Repo State

### Already exists

- **La administración de crédito completa como dominio.** `GLOBE_CREDIT_ADMIN_COMMANDS` (14 comandos), `GLOBE_CREDIT_ADMIN_READERS` (10 readers), `GLOBE_CREDIT_ADMIN_CAPABILITIES` (10 capabilities) en `packages/contracts/src/credit-administration.ts`; handlers, `AdminCreditBudgetPolicy` y parsers en `packages/domain/src/credit-administration.ts`.
- **El maker-checker con expiración**, ya implementado: `approval()` rechaza proponente igual al actor, aprobación vencida y digest inválido, con `CreditAdministrationError('maker_checker_required')`.
- **El verificador HMAC tenant-bound**: `createHmacCreditAdminApproval` en `apps/studio-web/src/credit-admin-approval.ts`, firmando `(workspaceId, proposedBy, proposedAt, expiresAt, payload sin digest)` con `timingSafeEqual`.
- **El carril `sister-platform` operable**, probado en tenancy: coverage `available` (`tenancy.ts:23`), broker caller allowlisted (`GLOBE_TENANCY_BROKER_CALLER_SERVICE_ACCOUNTS`), y el guard de disyunción de clases de caller (`app.ts:1222`) que ya impide que el operator y el broker se superpongan.
- **El patrón de identidades disjuntas**: `globe-promotion-{routing,promoter,checker,auto-lane}` + `globe-tenancy-operator` en `infra/terraform/locals.tf:3-17`, con sus clases de workload de capability fija en `internalServicePrincipal`.
- **El precedente de unidad de ejecución separada**: `apps/asset-governance` y `apps/media-derivatives` (ADR-007/ADR-008).
- **Un checker independiente de pool que ya funciona**: el `tenancy-operator` tiene `globe.credits.pool.read` + `pool.manage` y explícitamente **no** puede emitir grants ni publicar política (`app.ts:3487-3497`). **No se toca.**
- **Los desambiguadores**: `globe.credits.budget.evaluate` devuelve `reason` tipado (`pool_paused|pool_exhausted|project_cap_exceeded|month_cap_exceeded|policy_unavailable`) y `budget.availability.get` devuelve `policyAvailable` vs `ledgerAvailable`.
- **El cliente de Greenhouse hacia el API privada**: `src/lib/globe/client.ts` (`createGreenhouseGlobeClient`, WIF/ADC keyless) + `src/lib/globe/tenancy-reconciler.ts`.

### Gap

- **No existe `credits.month.fund`** en ninguna forma: ni comando compuesto, ni propuesta durable, ni expiración de propuesta.
- **No existe superficie que firme.** `.sign(` no aparece en `apps/studio-web/src/app.ts`; el firmador sólo se instancia para construir el *verificador* (`main.ts:104`).
- **`sister-platform` está `policy-blocked` en las tres familias de crédito**: `credit-administration.ts:33`, `credit-ledger.ts:27,31`.
- **No hay identidad de administración de crédito.** Ni en Globe (`grep tenancy_operator … tokenCreator` = 0: nadie puede impersonar ni siquiera al operator existente) ni en Greenhouse (sólo existe `greenhouse-portal@`, el reconciliador de tenancy).
- **No hay KMS.** `grep -rn kms infra/terraform/` = 0.
- **Los ports no comparten transacción.** `issueCreditGrant` hace `store.issueGrant` → `await ledger.allocate` → `store.markGrantPosted` como tres llamadas independientes; `CreditAdministrationStorePort` y `CreditAdministrationLedgerPort` no reciben un handle transaccional.
- **El `conflict` no dice la fase.** `apps/studio-web/src/dispatch.ts` § `handlerErrorToApiCode` (~304-320) colapsa **tres** clases en `conflict`: `CreditLedgerError` (`insufficient_balance`, `budget_denied`), `CommercialCreditLifecycleError` (todo salvo `shape_required`) y `CreditAdministrationError` (todo salvo invalid/not_found/dependency — **incluyendo `maker_checker_required`**, indistinguible de `pool_paused`).
- **No hay señal de reliability** para break-glass activo, drift de autoridad del caller genérico, uso del HMAC legacy ni estado parcial de fondeo.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: la mayor parte vive en el repo hermano `efeonce-globe` (`packages/{contracts,domain,database}`, `apps/studio-web`, `apps/credit-approver` nuevo, `infra/terraform`); la mitad de Greenhouse vive en `src/lib/globe/**` + `migrations/` + `src/lib/entitlements/runtime.ts`, corriendo en el runtime de Vercel.
- Future candidate home: `remain-shared`
- Boundary: el contrato canónico son los comandos `globe.credits.month.fund.propose` / `.confirm` sobre la surface `sister-platform` del spine. Consumers autorizados: el broker de administración de Greenhouse (`src/lib/globe/credit-administration-broker.ts`) y, por Full API Parity, la UI del portal, Nexa y MCP a través de la capability de Greenhouse. **Ningún consumer llama la API privada de Globe directo ni firma aprobaciones.**
- Server/browser split: server-only en su totalidad. El broker de Greenhouse declara `import 'server-only'` (igual que `src/lib/globe/client.ts`); la clave de KMS, la firma, el ID token y los stores nunca cruzan al browser. El browser sólo recibe el plan y el resultado ya proyectados.
- Build impact: imagen Cloud Run nueva en Globe para `apps/credit-approver` + dependencia del SDK de KMS en el package que firma. Su `Dockerfile` debe hacer COPY + build de cada package de workspace que importe, o el servicio bootea sin cliente de DB (lección viva de `TASK-1465`). En Greenhouse no se agrega dependencia: reusa el `GlobeClient` y `@efeonce-globe/contracts` ya instalados.
- Extraction blocker: la transacción única de `confirm` (grant + asiento de ledger + política) exige que store y ledger compartan el `TransactionPort` de `packages/database` — mientras eso no exista, el confirm no es extraíble de `studio-web`. Y la topología de IAM (quién puede impersonar a quién) ata las dos plataformas por Terraform, no por código.

`Future candidate home` se declara `remain-shared` por el lado de Greenhouse: `src/lib/globe/**` es el borde canónico hacia la plataforma hermana y no se extrae por sí solo. Del lado de Globe el aprobador **nace** como unidad propia (`apps/credit-approver`) — es la decisión de topología de ADR-015, no una extracción oportunista, y ocurre en el repo hermano, así que no toca la frontera de deployables de `EPIC-027`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `globe.credit_grants`, `globe.credit_budget_policies`, el ledger de crédito de Globe, y la tabla nueva de propuestas de fondeo (Globe) + la tabla nueva de propuestas/confirmaciones humanas (Greenhouse). La autoridad de la decisión es **Globe**; la autoridad de la intención y de la identidad humana es **Greenhouse**.
- Consumidores afectados: `sister-platform` (broker de Greenhouse), `http`, `sdk`, `cli`, `e2e`, `worker`; y por Full API Parity la UI del portal, Nexa y MCP a través de la capability de Greenhouse.
- Runtime target: `production` (Globe internal `globe-api-internal` + la unidad nueva `globe-credit-approver` + el runtime de Vercel de Greenhouse en staging y producción).

### Contract surface

- Contrato existente a respetar: `packages/contracts/src/credit-administration.ts` (comandos/readers/capabilities y `CreditAdminApprovalV1`), `packages/domain/src/index.ts` (`CapabilityRegistry`, `deriveTrustedContext`, `TrustedCommandContextV1` branded), `apps/studio-web/src/dispatch.ts` (`handlerErrorToApiCode`), ADR-005 §3/§4 (trust boundary), ADR-001 (federación keyless).
- Contrato nuevo o modificado:
  - Comandos `globe.credits.month.fund.propose` y `globe.credits.month.fund.confirm`.
  - Capabilities `globe.credits.funding.propose` (broker, read-only) y `globe.credits.funding.confirm` (ejecutor).
  - Tipos nuevos: `CreditFundingProposalV1` (plan legible + `proposalId` + fingerprint + `expiresAt` + estado), `CreditFundingIntentV1` (la intención atribuida que Greenhouse manda), `CreditAdminDenialPhaseV1` (enum cerrado de razón de fase), y `CreditAdminApprovalV1` extendido con la firma asimétrica.
  - Coverage: `sister-platform` pasa a `available` para las capabilities de crédito que el carril necesita; `budget.evaluate` y `budget.availability.get` pasan a `ui: available` para principals de administración.
  - Capabilities de Greenhouse: `globe_admin.credit_funding.propose` / `.confirm` en `capabilities_registry` + `entitlements-catalog` + grant a ≥1 rol real, **en el mismo PR**.
- Backward compatibility: `gated`. Los comandos existentes (`grant.issue`, `policy.publish`, …) siguen operando sin cambio de firma. La extensión de `CreditAdminApprovalV1` es **aditiva** y el verificador acepta **ambos** formatos durante la transición. El único cambio breaking deliberado y declarado es el retiro de las cuatro capabilities de crédito del principal genérico (Slice 6), y ocurre después de que el carril nuevo esté verde.
- Full API parity: el primitive es el par `propose`/`confirm` en `packages/domain`. Greenhouse lo consume por el broker; la UI del portal, Nexa y MCP lo consumen por la capability de Greenhouse sobre el mismo broker. **El LLM nunca cruza el gate de confirmación** — sólo puede proponer, y el `propose` no muta. Cero lógica duplicada por consumer.

### Data model and invariants

- Entidades/tablas/views afectadas: `globe.credit_grants`, `globe.credit_budget_policies`, las tablas del ledger de crédito, `globe.credit_funding_proposals` (nueva), y en Greenhouse la tabla append-only de intenciones/confirmaciones (nueva, schema `greenhouse_core` o `greenhouse_sync` — decidir en Discovery).
- Invariantes que no se pueden romper:
  - **Ningún actor obtiene aprobación y ejecución a la vez.** El aprobador puede firmar y **no** puede mutar crédito; el ejecutor puede mutar y **no** puede firmar (`publicKeyViewer`, no `signerVerifier`).
  - **La llave de aprobación nunca sale del runtime de Globe.** Ninguna identidad de Greenhouse obtiene `asymmetricSign` ni `secretmanager.versions.access` sobre ella.
  - **Confirmante ≠ proponente, y ambos son humanos autenticados de Greenhouse**, enforceado con `CHECK` en Postgres de Greenhouse **y** re-verificado en Globe contra las dos atribuciones del payload. **No** se apoya en `proposedBy !== principalId` (vacuo para workloads).
  - **Una propuesta vencida no se confirma**, y un fingerprint que no calza rechaza con fase `replay_fingerprint_mismatch`.
  - **Grant + asiento de ledger + política publish/supersede ocurren en UNA transacción**, o ninguno.
  - **Append-only**: propuestas, confirmaciones y audit no se UPDATE-ean para "corregir" ni se borran; los estados terminales (`expired`, `confirm_failed`) se conservan como evidencia.
  - **La razón de fase es un enum cerrado y sanitizado**: sin saldos, sin política cruda, sin SQL, sin payload.
  - **El desired state y la intención se anclan al `Persona` canónico** (`client_users.user_id`); cero identidad paralela.
- Tenant/space boundary: en Globe, `workspaceId` sale **exclusivamente** de `deriveTrustedContext` validando el `workspaceSelection` no confiable contra los `workspaceBindings` del principal — nunca del body. En Greenhouse, el entitlement del humano se resuelve server-side sobre su sesión y el workspace se valida contra `sister_platform_bindings` para `sister_platform_key='globe'`.
- Idempotency/concurrency: clave de idempotencia derivada del `proposalId` (`fund:<proposalId>`), una operación por propuesta; un `confirm` repetido devuelve el estado resultante, no un segundo grant. Concurrencia optimista (`expectedPolicyId` + `expectedVersion`) resuelta **dentro** de la transacción con `SELECT ... FOR UPDATE` sobre la política vigente del workspace — no se le hace adivinar al caller sobre una vista stale. La idempotencia vive en SQL (`ON CONFLICT DO NOTHING` + re-lectura), **nunca** read-then-write: los servicios corren a `maxScale=3` y entre réplicas eso es una carrera cuyo síntoma visible sería un grant duplicado.
- Audit/outbox/history: append-only en **los dos lados**. Greenhouse registra la intención, el entitlement ejercido y la confirmación; Globe registra la mutación con `correlationId`, `idempotencyKey`, fingerprint y la **firma** como evidencia verificable con la clave pública. Se conserva la cadena causal `greenhouse auth audit id → intención atribuida → correlation id → command id → grant/policy id`.

### Migration, backfill and rollout

- Migration posture: `additive` en los dos repos (tabla nueva de propuestas en Globe, tabla nueva append-only en Greenhouse, seed de `capabilities_registry`). **Cero migración destructiva. Cero backfill mutante.**
- Default state: `flag OFF`. `GLOBE_CREDIT_ADMIN_LANE_ENABLED` declarado en `infra/terraform/variables.tf` con default `false` — **nunca sólo en `terraform.tfvars`**, que está gitignoreado — y **cableado al recurso**: si `grep -rn GLOBE_CREDIT_ADMIN_LANE_ENABLED infra/terraform/` devuelve **una** línea, esa línea es su declaración y no está conectado a nada. Con el flag OFF los comandos nuevos devuelven `policy_blocked` (fail-closed) y el carril viejo sigue operando sin cambio.
- Backfill plan: `N/A — sin backfill.` Las aprobaciones HMAC históricas no se migran: el verificador dual las sigue aceptando hasta la fecha de retiro declarada (ver Follow-ups para la decisión de retención).
- Rollback path: flag OFF + redeploy para los Slices 2-5. El Slice 6 (retiro de autoridad del caller genérico) revierte con una edición de HCL/código + deploy — **no** es un flag, y por eso va último y sólo con el carril nuevo verde. El Slice 7 (retiro del HMAC) revierte restaurando el accessor del secreto.
- External coordination: **sí, y es load-bearing.** Habilitar `cloudkms.googleapis.com` en el proyecto `efeonce-globe`; crear el keyring/clave por Terraform; bindings de IAM cross-proyecto (`greenhouse-globe-admin@efeonce-group` → `tokenCreator` sobre `globe-admin-broker@efeonce-globe`), que el classifier del entorno suele bloquear y **necesita aprobación del operador**; env vars nuevas en `globe-api-internal`, en el `producer-worker` y en Vercel (staging + production); y **dos personas** de Greenhouse para el fondeo real del criterio de salida.

### Security and access

- Auth/access gate: capability de Greenhouse (`globe_admin.credit_funding.propose` / `.confirm`) sobre sesión humana + entitlement; del lado de Globe, ID token verificado en-app (`verifyWorkloadCaller`, audience + allowlist de SAs, ambos fail-closed) + clase de workload de capability fija + `deriveTrustedContext`. **Cuatro identidades disjuntas**, una por propósito, ninguna con dos mitades.
- Sensitive data posture: `finance`. El plan del `propose` expone **agregados de presupuesto** (tope, disponible, razón de negación) al plano de Greenhouse — es una ampliación **consciente** respecto de lo que hoy sale por el transporte, y es la señal que el operador necesita para no proponer a ciegas. **Nunca** sale la clave, la firma privada, el payload crudo del upstream ni detalle de SQL.
- Error contract: códigos canónicos del spine (`policy_blocked` ≠ `access_denied` ≠ `not_found`), `CreditAdministrationError` mapeado en `handlerErrorToApiCode`, y la razón de fase como **enum cerrado**. Del lado de Greenhouse, `canonicalErrorResponse(code)` con prose es-CL y `actionable` — un fondeo bloqueado por presupuesto **no** es reintentable y no debe mostrar "Reintentar". Sentry vía `captureWithDomain(err, 'identity'|'finance', …)` [decidir el dominio en Discovery], nunca `Sentry.captureException` directo.
- Abuse/rate-limit posture: el `propose` es read-only y su costo es una lectura de política; el `confirm` es idempotente por propuesta y requiere un segundo humano, lo que acota el abuso por construcción. Replay guard = fingerprint + expiración. **Caso de abuso central y su capa**: un actor que intenta autofinanciarse choca con (a) el segundo humano, (b) el aprobador que no puede mutar, (c) el ejecutor que no puede firmar. Residual declarado en ADR-015: el compromiso **simultáneo** de aprobador y ejecutor no se mitiga.

### Runtime evidence

- Local checks: `pnpm check && pnpm build` en `efeonce-globe` (typecheck NodeNext strict + `node --test`); `pnpm local:check` + `pnpm test` en `greenhouse-eo`. Tests nuevos: verificación de firma KMS (con doble inyectado), verificador dual HMAC+KMS, disyunción de callers, rechazo de propuesta vencida y de fingerprint alterado, y **test de concurrencia con dos `confirm` simultáneos** sobre la misma propuesta. **Registrar cada test nuevo en el script `test` de su package en Globe.**
- DB/runtime checks: verificar el DDL aplicado contra `information_schema` después de `migrate:up` en los dos repos; probar la transacción parcial (fallo del publish de política deja **cero** grant); leer la propuesta y el grant resultante contra Postgres real.
- Integration checks: `tofu plan` con **cero** `destroy`/`replace` de identidad viva antes de cualquier apply; verificar que la clave de KMS existe y que **sólo** el aprobador tiene `asymmetricSign` (readback de IAM, no asumido); smoke del lane con el broker nuevo desde staging de Greenhouse; y el **fondeo real punta a punta con dos humanos distintos**.
- Reliability signals/logs: `globe.credit_admin.break_glass_active` (steady 0), `globe.credit_admin.caller_authority_drift` (steady 0), `globe.credit_admin.partial_funding_state` (steady 0), `globe.credit_admin.legacy_hmac_approval_used` (mide el retiro del HMAC y es lo que le da fecha real), y del lado de Greenhouse la señal de propuestas vencidas sin confirmar. Logs: en Cloud Logging, `textPayload:"…"` **no** matchea logs JSON — usar texto libre o `jsonPayload.event="…"`.
- Production verification sequence: ver `## Rollout Plan & Risk Matrix § Production verification sequence`.

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

### Slice 1 — La fase de negación se hace legible (cierra la mitad de `ISSUE-124`)

- `CreditAdminDenialPhaseV1` como **enum cerrado** en `packages/contracts`: `approval_stale | approval_invalid | maker_checker_required | pool_paused | pool_exhausted | month_cap_exceeded | project_cap_exceeded | policy_unavailable | replay_fingerprint_mismatch`.
- `CreditAdministrationError` transporta la fase; `handlerErrorToApiCode` la propaga junto al `conflict` sin cambiar el status HTTP.
- `globe.credits.budget.evaluate` y `globe.credits.budget.availability.get` pasan a `ui: available` para principals de administración.
- Tests de que cada fase emerge donde corresponde, y de que **ninguna** expone saldo, política cruda, SQL ni payload.
- Delta en `ISSUE-124` con la evidencia y el estado.

### Slice 2 — KMS asimétrico y verificador dual

- `cloudkms.googleapis.com` en `local.enabled_services`; keyring + clave `EC_SIGN_P256_SHA256` en `infra/terraform/kms.tf` (nuevo), con `depends_on` explícito si el recurso no alcanza la API por arista implícita.
- `CreditApprovalSignerPort` (nuevo) + impl KMS; `CreditApprovalVerifierPort` acepta **HMAC legacy y firma KMS**, con la fecha de retiro declarada en código y en el runbook.
- Señal `globe.credit_admin.legacy_hmac_approval_used`.
- **El carril viejo sigue operando sin cambios.** Nada muta todavía.

### Slice 3 — Topología de identidades y publicación del lane

- Las cuatro identidades y sus bindings en Terraform: `greenhouse-globe-admin@efeonce-group`, `globe-admin-broker`, `globe-credit-approver`, `globe-credit-executor`. Protocolo de import: `plan` con **cero** `destroy`/`replace` de identidad viva.
- Las dos clases de workload nuevas en `internalServicePrincipal` con su set fijo y mínimo; el guard de disyunción de callers extendido (mismo espíritu que `app.ts:1222`).
- `apps/credit-approver` — unidad Cloud Run IAM-private con **una** superficie estrecha: *"dada esta propuesta verificada, firmá su aprobación"*. Lee la propuesta, verifica el invariante de dos humanos, firma. **Cero DML sobre agregados de crédito.**
- Coverage `sister-platform: 'available'` en las capabilities de crédito que el carril necesita.
- Señal `globe.credit_admin.caller_authority_drift`.

### Slice 4 — `propose` / `confirm` y la transacción única

- Migración de `globe.credit_funding_proposals`: `proposalId`, workspace, plan, fingerprint, `expiresAt`, estado + `CHECK` de su máquina de estados, índice `(workspace_id, state, expires_at)`, y bloque `DO` con `RAISE EXCEPTION` que aborta si el DDL no quedó aplicado.
- `globe.credits.month.fund.propose` — read-only, devuelve el plan legible (grant propuesto, tope resultante, disponible resultante, `reason` actual de `budget.evaluate`) y persiste la propuesta con expiración. **No firma, no muta.**
- `globe.credits.month.fund.confirm` — verifica propuesta/vigencia/fingerprint y las dos atribuciones distintas; pide la firma al aprobador; **verifica la firma**; aplica **grant + asiento de ledger + política** en **una** transacción Postgres; readback; devuelve el estado resultante.
- Variante transaction-scoped de `CreditAdministrationStorePort` + `CreditAdministrationLedgerPort` enhebrando el `TransactionPort` de `packages/database`.
- Señal `globe.credit_admin.partial_funding_state`.
- Tests: concurrencia (dos `confirm` simultáneos, uno gana limpio), propuesta vencida, fingerprint alterado, transacción parcial (fallo de política deja cero grant), idempotencia del replay.
- **Criterio de salida: un fondeo real, punta a punta, con dos humanos distintos y cero break-glass.**

### Slice 5 — El broker y la intención del lado de Greenhouse

- `src/lib/globe/credit-administration-broker.ts` (`import 'server-only'`), reusando `createGreenhouseGlobeClient` — **no** un cliente paralelo.
- Migración de la tabla append-only de intenciones/confirmaciones, con `CHECK` de confirmante ≠ proponente, `UNIQUE` de `(workspaceId, proposalId)` y triggers anti-UPDATE/anti-DELETE.
- Capabilities `globe_admin.credit_funding.propose` / `.confirm` en `capabilities_registry` (seed) + `entitlements-catalog` + **grant a ≥1 rol real en el mismo PR** (el guard de coverage rompe el build si falta).
- Rutas del contrato gobernado (`propose`/`confirm`/readers) con `canonicalErrorResponse`, idempotencia y audit.
- Señal de propuestas vencidas sin confirmar.
- Retiro de `scripts/raise-credit-monthly-cap.mjs` y `scripts/fund-internal-credit-month.mjs` en `efeonce-globe`.

### Slice 6 — Retiro de la autoridad de crédito del caller genérico

- `globe:service:internal-caller` deja de cargar `globe.credits.grant.issue`, `grant.correct`, `policy.manage` y `budget.manage`. `pool.manage` del `tenancy-operator` **no se toca**.
- La señal `caller_authority_drift` queda vigilando el regreso.
- **Sólo después del Slice 4 verde con el fondeo real.**

### Slice 7 — Break-glass gobernado y retiro del HMAC

- Procedimiento con TTL, motivo obligatorio, aprobación de un segundo humano, revocación automática y **readback del corte verificado** (no se asume que la revocación propagó); documentado en el runbook y con la señal `break_glass_active`.
- Retiro del HMAC cuando `legacy_hmac_approval_used` esté en cero por la ventana declarada, con `api_runtime` perdiendo `secretmanager.versions.access` sobre `globe-credit-approval-secret`.

## Out of Scope

- **La superficie de administración en el portal** (ruta, layout, jerarquía, estados, copy, motion, GVC). Es la Slice 4 de ADR-015 y una task `ui-ux` aparte, bloqueada por esta. Esta task entrega el contrato gobernado; el portal lo consume después.
- **Capabilities por usuario.** Es la Slice 6 de ADR-015, `backend-data`, y está bloqueada por `tenancy_mode = enforced` (`TASK-1511`), no por esta task. **No introducir la dimensión per-member acá.**
- **El promover `tenancy_mode` a `enforced`.** Gate zero-drift propio.
- **El guard de "un solo grant activo"** que `ISSUE-124` descarta como causa. Esta task cierra la ambigüedad del diagnóstico, no la política de emisión.
- **El ledger comercial** (`TASK-1468`) y el **spend fence de seguridad** del Lab. Son otras capas y no se tocan.
- **La promoción de rutas** (ADR-009/ADR-010). Sus identidades **no se reusan** y su saga no se modifica.
- **El payload de browser** (ADR-014) y cualquier superficie humana de Globe.
- **Ampliar el techo de scopes OAuth de Globe.** Si emergiera la necesidad, es el rollout de 3 pasos zero-downtime de ADR-010 y su propia decisión — nunca dentro de esta task.
- **Fondear workspaces de clientes externos.** Gated por `TASK-1480`.
- **La decisión de retención de las aprobaciones HMAC históricas.** Follow-up declarado.

## Detailed Spec

El diseño completo —topología de identidades con su tabla de autoridad y de prohibiciones, el flujo de tres pasos `propose → confirm humano → execute`, el razonamiento de por qué la disyunción exige una unidad de ejecución separada, por qué la atomicidad es una transacción y no una saga, y las alternativas rechazadas con su motivo— vive en **`docs/architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md`** (ADR-015). No se duplica acá: el agente que tome esta task **lee la ADR completa** antes de Discovery, y cualquier divergencia entre esta task y la ADR se resuelve a favor de la ADR (o se registra como Delta en las dos).

Los tres hechos de código que ordenan el diseño y que hay que **re-verificar en Discovery** antes de tocar nada (pueden haber cambiado):

1. `apps/studio-web/src/app.ts` § `internalServicePrincipal` — el set de capabilities del caller genérico, y que sigue incluyendo crédito **y** `globe.lab.experiment.run`.
2. `packages/domain/src/credit-administration.ts` § `approval()` — que el chequeo de maker-checker sigue comparando contra `context.actor.principalId`.
3. `apps/studio-web/src/dispatch.ts` § `handlerErrorToApiCode` — qué clases de error colapsan en `conflict`.

## Rollout Plan & Risk Matrix

Esta sección es **load-bearing**: la task toca autoridad financiera, IAM cross-proyecto, criptografía de aprobación y un carril vivo de federación. Ningún slice se ejecuta fuera del orden declarado.

### Slice ordering hard rule

- **Slice 1** (fase de negación) es independiente y va **primero**: es el más barato, cierra la mitad de `ISSUE-124` y **sin él todo el diagnóstico de los slices siguientes es ciego**. Un 409 opaco durante el Slice 4 costaría la misma sesión que ya costó una vez.
- **Slice 2** (KMS + verificador dual) → **Slice 3** (identidades + lane) → **Slice 4** (propose/confirm + transacción). Este es el camino crítico y no admite reordenamiento: no se pueden publicar los comandos sin las identidades, ni las identidades sin la clave que justifica la disyunción.
- **Slice 5** (broker de Greenhouse) puede correr en paralelo con el Slice 4 una vez que el Slice 3 cerró, **pero su smoke end-to-end depende del Slice 4**.
- **Slice 6** (retiro de autoridad del caller genérico) **MUST** shippear **DESPUÉS** de que el Slice 4 esté verde con un fondeo real. Al revés se corta el único camino operable antes de tener el reemplazo.
- **Slice 7** (break-glass + retiro del HMAC) va último, y el retiro del HMAC además espera a que la señal del legacy esté en cero por la ventana declarada. **Retirarlo antes convierte un carril degradado en un carril muerto.**

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un `tofu apply` destruye o recrea una identidad viva (el caller sostiene el bridge de identidad, el piloto interno y el SSO) | identity / IaC | medium | Protocolo de import: `plan` → **leer el plan** → aplicar **sólo** con cero `destroy`/`replace`. Nunca aplicar a ciegas | `tofu plan` no vacío post-apply |
| El binding de IAM cross-proyecto queda mal y el broker no alcanza el API, o alcanza **de más** | identity | medium | Readback de IAM después de cada binding (no asumir que propagó); `GLOBE_API_CALLER_SERVICE_ACCOUNTS` explícito; guard de disyunción de clases en-app | `globe.credit_admin.caller_authority_drift` |
| El retiro de capabilities del caller genérico rompe un consumidor no identificado del carril viejo | finance / identity | medium | Slice 6 **después** del fondeo real verde; inventario previo de quién llama esos comandos; rollback = revertir el set + deploy | 5xx / `access_denied` en `globe-api-internal`; el `caller_authority_drift` en el sentido inverso |
| El retiro del HMAC deja un consumidor sin poder verificar aprobaciones históricas | finance | medium | Verificador dual con fecha de retiro; el retiro se dispara **por la señal en cero**, no por calendario | `globe.credit_admin.legacy_hmac_approval_used` > 0 después del retiro |
| La transacción única no cubre los tres writes y queda un estado parcial (grant sin política) | finance | low | Una transacción Postgres real (los tres agregados viven en la misma base); test de fallo de política que verifica **cero** grant; readback | `globe.credit_admin.partial_funding_state` |
| Dos `confirm` concurrentes producen doble grant | finance | medium | Idempotencia en SQL (`ON CONFLICT DO NOTHING` + re-lectura) + `SELECT … FOR UPDATE` sobre la política vigente; test de concurrencia. **Nunca** read-then-write: a `maxScale=3` es una carrera | grant duplicado sobre el mismo `proposalId` |
| El flag se declara y no se cablea: el registro dice ON y producción sirve lo viejo, en silencio | release / IaC | **high** (ya pasó dos veces) | `grep -rn <flag> infra/terraform/` debe devolver **≥2** líneas (declaración + consumo); `git merge-base --is-ancestor <sha-código> <sha-imagen>`; verificar en la **revisión activa** | ninguna — **este riesgo sólo se detecta verificando; no hay señal que lo delate** |
| El env var se mueve con `--set-env-vars` (destructivo) y borra variables no listadas | ops | medium | **Siempre** `--update-env-vars`. Y desde `TASK-1508` la config del servicio vive en Terraform: una mutación `gcloud` out-of-band muere en el próximo apply, en silencio | `tofu plan` mostrando el servicio volviendo atrás |
| El nuevo `apps/credit-approver` bootea sin cliente de DB o sin SDK de KMS | ops | medium | COPY + build de todo package de workspace en su `Dockerfile` (lección `TASK-1465`); línea de arranque que siempre aparece en logs; `roles/logging.logWriter` en su SA — sin él corre **mudo** y no lo dice | ausencia de la línea de arranque |
| El classifier del entorno bloquea los IAM policy-bindings a mitad del slice | ops | high | Pedir aprobación del operador **antes** de empezar el Slice 3, no en el medio | falla del comando, visible |
| Un test nuevo no se registra en el script `test` de su package y la suite queda verde sin haberlo mirado | testing | **high** (ya pasó dos veces en Globe) | Registrar el archivo en `package.json` y **confirmar que aparece en la salida del run** | conteo de tests que no sube |

### Feature flags / cutover

- **`GLOBE_CREDIT_ADMIN_LANE_ENABLED`** — variable de Terraform `credit_admin_lane_enabled`, declarada en `infra/terraform/variables.tf` con default **`false`** y **cableada** al spec de `globe-api-internal` (y del `producer-worker` si lo lee). Con OFF, `propose` y `confirm` devuelven `policy_blocked` (fail-closed) y el carril viejo opera sin cambio. Revert: default a `false` + `tofu apply`. Tiempo: <10 min.
- **`GLOBE_CREDIT_APPROVAL_KMS_ENABLED`** — controla si el firmador KMS está activo. Con OFF, sólo el verificador HMAC opera (estado actual). Es el flag que permite que el Slice 2 shippee sin cambiar comportamiento.
- **Del lado de Greenhouse**: el flag `*_ENABLED` que gatee la ruta del broker se **registra en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR** — `pnpm docs:closure-check` corre `feature-flags-audit --strict` y **falla si un `*_ENABLED` no tiene fila**. Y hay que mapear dónde se **lee** (`grep -rn "<FLAG>" src/ services/`) antes de prenderlo: **5 runtimes** con env vars independientes, y lo async vive en el **`ops-worker`, NO en Vercel**.
- **El flag NO es evidencia de nada por sí solo.** Antes de declarar el carril prendido: `grep` en `infra/terraform/` debe devolver **más que la declaración**, y la **imagen desplegada** debe contener el código que lo lee (`git merge-base --is-ancestor`). Un `tofu apply` verde con plan vacío es exactamente cómo el registro termina diciendo ON con la realidad en OFF.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR + deploy. Aditivo: la fase acompaña al `conflict` sin cambiar el status | <15 min | sí |
| Slice 2 | `GLOBE_CREDIT_APPROVAL_KMS_ENABLED=false` + `tofu apply`; el verificador vuelve a HMAC-only. La clave de KMS queda creada y sin usar (costo despreciable) | <15 min | sí |
| Slice 3 | Revert del HCL de las identidades + `tofu apply` con plan leído; revert del código de las clases de workload + deploy. **Las SAs nuevas se pueden dejar creadas y sin bindings** — es más seguro que destruirlas y recrearlas | <30 min | sí |
| Slice 4 | `GLOBE_CREDIT_ADMIN_LANE_ENABLED=false` + `tofu apply`. La tabla de propuestas queda (aditiva, sin consumidores). **Un fondeo ya ejecutado NO se revierte por rollback de código**: se corrige con `grant.correct` + `policy.supersede`, que es el camino diseñado y auditado | <10 min (carril) / manual (dato) | parcial |
| Slice 5 | Flag OFF en Vercel + redeploy (las env vars **no** se calientan solas). La tabla append-only queda; la capability queda sembrada y sin grant efectivo | <10 min | sí |
| Slice 6 | Restaurar el set de capabilities del caller genérico + deploy. **No es un flag** — por eso va último y sólo con el carril nuevo verde | <30 min | sí |
| Slice 7 | Restaurar `secretmanager.versions.access` de `api_runtime` sobre el secreto + `tofu apply`; el verificador dual vuelve a aceptar HMAC | <20 min | sí |

### Production verification sequence

1. **Slice 1** en staging: provocar cada fase de negación y verificar que el `conflict` la declara y que **ninguna** filtra saldo, política cruda, SQL ni payload. Repetir en producción.
2. **Slice 2**: `tofu plan` leído → apply → **readback de IAM**: sólo el aprobador tiene `asymmetricSign` sobre la clave. Verificar que el verificador sigue aceptando una aprobación HMAC existente (**no** romper el carril viejo).
3. **Slice 3**: `tofu plan` con **cero** `destroy`/`replace` → apply → readback de los bindings → verificar que el broker alcanza el API y que el `admin-broker` **no** puede confirmar ni mutar (negativo explícito, no inferido).
4. **Slice 4** en staging: `migrate:up` → verificar el DDL contra `information_schema` → flag ON → `propose` con la sesión de un humano → revisar el plan → `confirm` con **un segundo humano distinto** → verificar el grant, el asiento y la política resultantes en Postgres → verificar que un `confirm` repetido es idempotente → verificar que una propuesta vencida se rechaza con la fase correcta.
5. **Slice 4 en producción**, con cooldown de 24 h respecto de staging: el **fondeo real del mes**, dos humanos, cero break-glass. Verificar que imagen y video **generan** después (es la prueba de que el fondeo tuvo efecto, no sólo de que el comando respondió 200).
6. **Slice 5**: smoke del broker desde staging de Greenhouse → verificar audit en los dos lados y la cadena de correlación completa → repetir en producción.
7. **Slice 6**: inventario de consumidores del carril viejo → retiro → verificar que el fondeo por el carril nuevo **sigue** funcionando y que el viejo devuelve `access_denied`.
8. **Slice 7**: `break_glass_active` en 0 → `legacy_hmac_approval_used` en 0 por la ventana declarada → retiro del HMAC → verificar que una aprobación KMS sigue verificando.
9. **Monitorear las cinco señales durante 7 días** post-producción de cada slice mutante.

Stop & escalate si cualquier verify falla. En particular: si el paso 5 responde 200 pero imagen/video siguen sin generar, **el fondeo no tuvo efecto** — no avanzar.

### Out-of-band coordination required

- **Habilitar `cloudkms.googleapis.com`** en el proyecto `efeonce-globe`.
- **IAM cross-proyecto**: crear `greenhouse-globe-admin@efeonce-group` y su `tokenCreator` sobre `globe-admin-broker@efeonce-globe`. El classifier del entorno bloquea policy-bindings de IAM en Globe: **pedir aprobación del operador antes de empezar el Slice 3**, no en el medio.
- **Env vars nuevas** en `globe-api-internal`, en el `producer-worker` si lee el flag, y en Vercel (staging + production; **las env vars no se calientan solas — hay redeploy**).
- **Dos personas de Greenhouse** para el `propose` y el `confirm` del fondeo real (pasos 4 y 5). **No es automatizable — es una propiedad del diseño, no una limitación temporal.**
- **`gcloud auth login` + `gcloud auth application-default login`**: son credenciales **distintas** y pueden estar desalineadas; una puede estar vencida y la otra viva.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un `conflict` de administración de crédito declara su **fase** desde un enum cerrado, y ninguna fase expone saldo, política cruda, SQL ni payload.
- [ ] `globe.credits.budget.evaluate` y `budget.availability.get` están `ui: available` para principals de administración.
- [ ] Existe una clave asimétrica de KMS en el proyecto de Globe, y el **readback de IAM** confirma que **sólo** `globe-credit-approver` tiene `asymmetricSign` sobre ella.
- [ ] El verificador acepta HMAC legacy **y** firma KMS, con la fecha de retiro declarada en código y en el runbook, y la señal que mide el uso del legacy existe.
- [ ] Las cuatro identidades existen con sus bindings en Terraform, y `tofu plan` post-apply queda en **No changes** sin haber destruido ni recreado ninguna identidad viva.
- [ ] `globe-admin-broker` **no puede** confirmar, mutar, firmar, correr el Producer ni gastar — verificado con negativos explícitos, no inferido de la config.
- [ ] `globe-credit-approver` **no tiene ninguna** capability de crédito y **cero** DML sobre agregados de crédito o ledger; `globe-credit-executor` **no puede firmar**.
- [ ] `globe.credits.month.fund.propose` es read-only, devuelve el plan legible con el `reason` de `budget.evaluate`, y persiste una propuesta con expiración. No firma y no muta.
- [ ] `globe.credits.month.fund.confirm` rechaza: propuesta inexistente, vencida, con fingerprint alterado, con proponente igual al confirmante, y con firma inválida — cada una con su fase correcta.
- [ ] Grant + asiento de ledger + política ocurren en **una** transacción: un test verifica que un fallo del publish de política deja **cero** grant.
- [ ] Un `confirm` repetido con la misma propuesta es idempotente y **no** produce un segundo grant; un test de concurrencia con dos `confirm` simultáneos deja uno ganando limpio.
- [ ] **Un fondeo mensual real se ejecutó punta a punta con dos humanos distintos de Greenhouse y cero break-glass**, y después de él **imagen y video generan**.
- [ ] El broker de Greenhouse es `server-only`, reusa `createGreenhouseGlobeClient` y no instancia un cliente paralelo.
- [ ] La tabla de intenciones de Greenhouse es append-only (triggers anti-UPDATE/anti-DELETE) con `CHECK` de confirmante ≠ proponente, y ambos se re-verifican en Globe.
- [ ] Las capabilities de Greenhouse están en `capabilities_registry` (seed) + `entitlements-catalog` + **grant a ≥1 rol real, en el mismo PR** (el guard de coverage pasa).
- [ ] `globe:service:internal-caller` **ya no** carga `grant.issue`, `grant.correct`, `policy.manage` ni `budget.manage`, y la señal `caller_authority_drift` detecta el regreso.
- [ ] Los dos scripts (`raise-credit-monthly-cap.mjs`, `fund-internal-credit-month.mjs`) están retirados.
- [ ] El break-glass tiene TTL, motivo, aprobación, revocación automática, **readback del corte verificado** y su contador con señal.
- [ ] Las cinco señales de reliability existen, están wired al dashboard y su steady es 0.
- [ ] Todo test nuevo en `efeonce-globe` está **registrado en el script `test` de su package** y aparece en la salida del run.
- [ ] Todo flag `*_ENABLED` nuevo tiene su fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con su **runtime** declarado, y `pnpm docs:closure-check` pasa.
- [ ] Antes de declarar el carril prendido: el `grep` en `infra/terraform/` devuelve más que la declaración del flag, y `git merge-base --is-ancestor` confirma que la imagen desplegada contiene el código que lo lee.
- [ ] Source of truth, contract surface y consumers están nombrados con paths u objetos reales.
- [ ] Los invariantes de datos, la frontera de tenant/acceso y la postura de idempotencia/concurrencia están explícitos.
- [ ] La postura de migración/backfill/rollback está explícita y es proporcional al riesgo.
- [ ] Hay evidencia de runtime o DB listada para todo cambio más allá de docs/tooling.
- [ ] El dominio sensible tiene errores canónicos, postura de audit/señal y cero filtración de dato crudo.

## Verification

En `efeonce-globe`:

- `pnpm check` (typecheck NodeNext strict + `node --test` en todos los packages/apps)
- `pnpm build`
- `tofu plan` leído antes de cada apply, con cero `destroy`/`replace` de identidad viva

En `greenhouse-eo`:

- `pnpm local:check`
- `pnpm test` (suite completa, no focal)
- `pnpm build`
- `pnpm task:lint --task TASK-1566` y `pnpm ops:lint --changed`
- `pnpm docs:closure-check`

Validación manual (no automatizable, y es una propiedad del diseño):

- El fondeo real del mes con **dos personas distintas**.
- Readback de IAM después de cada binding.
- Verificar el flag en la **revisión activa** de cada runtime, no en el HCL.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] **ADR-015 actualizada con Deltas de implementación**: qué se construyó, qué se verificó en vivo, y qué quedó pendiente. La ADR es la doc gobernante y vive en Greenhouse, **nunca** en `efeonce-globe/docs/**`.
- [ ] **`ISSUE-124` cerrada o actualizada** con la evidencia del Slice 1 y el estado del guard de grant activo.
- [ ] **`GLOBE_RUNTIME_HANDOFF.md` actualizado** con las identidades nuevas, los flags, la revisión y el estado del break-glass.
- [ ] **Runbook del carril** creado en `docs/operations/creative-studio/` (propose → confirm, qué hacer ante cada fase de negación, cómo se revoca el break-glass, cómo se verifica el corte).
- [ ] **Doc funcional + manual de uso** proporcionales (`docs/documentation/creative-studio/`, `docs/manual-de-uso/creative-studio/`): un operador debe poder fondear el mes sin leer código.
- [ ] **Skill `greenhouse-globe` actualizada**: la sección `Gasto y crédito en Globe` cambia — la regla 5 ("firmar desde un cliente es break-glass") pasa a "el carril gobernado es `propose`/`confirm`", y la regla 2 (409 opaco) se actualiza con la fase de negación.
- [ ] **`greenhouse-documentation-governor` invocada** y **`greenhouse-qa-release-auditor`** con veredicto registrado.

## Follow-ups

- **Task `ui-ux`: superficie de administración de crédito en el portal** (Slice 4 de ADR-015). Bloqueada por esta task. Requiere su Discovery de UI, wireframe/flow robustos, y GVC desktop + mobile. **No crearla como stub para pasar el gate.**
- **Task `backend-data`: capabilities por usuario** (Slice 6 de ADR-015). Bloqueada por `tenancy_mode = enforced` (`TASK-1511`), no por esta task. Hoy el desired state es una constante por workspace (`tenancy-reconciler.ts:216`) y la dimensión per-member no existe en ninguno de los dos lados.
- **Decisión de retención de las aprobaciones HMAC históricas**: se conservan como verificables con el secreto archivado, o se marcan verificables-sólo-hasta-la-fecha-de-corte. Es retención, no arquitectura, y ADR-015 la declara deliberadamente no decidida.
- **El guard de "un solo grant activo"** de `ISSUE-124`: decidir si es política deseada o si el 409 venía de otra fase (que el Slice 1 vuelve observable).
- **Modelo de roles de administración de crédito**: si `propose` y `confirm` son dos capabilities sobre los ROLE_CODES existentes o merecen un rol nuevo. Decidir contra los **14 ROLE_CODES reales** de `src/config/role-codes.ts`, nunca contra un rol fantasma.
- **Aplicar el mismo carril al resto de la administración de crédito** (pools, budgets de proyecto, correcciones) si el patrón `propose`/`confirm` resulta el correcto para el fondeo.

## Open Questions

- **¿El aprobador es un Cloud Run service o un Cloud Run Job invocado por request?** ADR-015 fija la **separación física** y deja la forma a esta task, a decidir contra el perfil de latencia real del `confirm`. Un Job tiene arranque en frío que puede volver el `confirm` incómodamente lento; un service con `minScale=0` tiene el mismo problema en el primer request. Medir antes de elegir.
- **¿En qué schema de Greenhouse vive la tabla de intenciones/confirmaciones?** `greenhouse_core` (es governance de identidad/acceso) o `greenhouse_sync` (es estado de un puente cross-plataforma). Decidir en Discovery contra los schemas activos.
- **¿El dominio de Sentry para el broker es `identity` o `finance`?** La acción es financiera pero el mecanismo es de identidad/federación. Elegir uno y ser consistente en todo el carril.
- **¿La razón de fase viaja en el body del error canónico o en un header?** El body es lo natural para un consumer tipado; verificar que no rompa consumers existentes que sólo leen `error.code`.
