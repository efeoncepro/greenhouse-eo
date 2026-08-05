# Efeonce Globe — Route Promotion Operation Decision V1

- Decision: ADR-009
- Status: Accepted; implementation and rollout gated. **El sello del canary (`canary-confirm`) fallaba en runtime y
  quedó corregido el 2026-08-04 — ver [§ Delta 2026-08-04](#delta-2026-08-04--canary-confirm-fallaba-con-la-evidencia-correcta-task-1641).**
- Date: 2026-07-23
- Owners: Efeonce Globe platform, creative operations and security
- Implements through: `TASK-1527`; corrección del sello del canary en `TASK-1641`
- Related: `TASK-1521`, `EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`,
  `EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`,
  `EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`

## Context

Globe already has independent durable authorities for model readiness, generated-output rights, production route
bindings and provider circuits. The internal canary tooling can invoke those authorities in a safe order, but it
does not persist one coordinated promotion operation. A timeout or process failure between authorities can
therefore leave a route partially promoted without a canonical checkpoint or bounded recovery path.

The current generated-rights policy is also global: its contract and table do not carry `workspace_id`, and its
readers ignore trusted workspace context. Treating that record as a workspace authorization decision would let
one tenant's adoption and restrictions become evidence for another. In addition, model readiness currently
accepts a configured policy version without resolving the exact durable policy tuple and digest.

The seven remaining Producer routes cannot be promoted safely by adding another in-memory script or a principal
that combines every capability. Promotion must remain an auditable separation-of-duties workflow.

## Decision

Globe adopts a **workspace-scoped rights application authority plus a durable route-promotion saga**.

The saga coordinates existing authorities; it does not replace them and never writes their tables directly.
Each externally callable phase has a fixed capability, resolves evidence server-side, invokes the canonical child
command with a deterministic idempotency key, reads the child authority back exactly, and only then advances its
own checkpoint.

### 1. Rights application is workspace-scoped

- `GeneratedRightsPolicyV1` includes the trusted `workspaceId`.
- Publish derives workspace and actor from `TrustedCommandContextV1`; callers cannot choose either in payload.
- Get/list always scope by trusted workspace. Cross-workspace and unknown policies are indistinguishable.
- Idempotency and immutable identity are scoped by workspace.
- A policy fixes route, provider, model, model version, provider-terms reference/digest, application posture,
  restrictions and validity window. Readiness resolves and verifies that exact durable record.
- Provider terms evidence may later become a separately governed global evidence object. A workspace's adoption,
  restrictions and validity never become global by implication.
- Legacy rows are not assigned to arbitrary tenants. The expand migration permits only an explicitly configured,
  verified internal workspace backfill; commercial rollout remains blocked until no compatibility default is
  required.

### 2. Promotion is a durable saga

The operation fixes this identity at creation:

`workspace + routeId + providerId + modelId + modelVersion + capability + fidelityContract + endpointId + region + completionDriver`

The forward lifecycle is:

`planned → staging_controls → controls_staged → promoting_readiness → readiness_promoted → activating → activated → verifying_canary → canary_passed`

Rollback is:

`rolling_back → rolled_back`

`rollback_failed` remains reclaimable. A generic terminal `failed` is permitted only before external effects or
after exact readback proves the circuit open and binding disabled.

The operation stores:

- a mutable head protected by expected revision, row lock and lease/fencing;
- append-only revisions containing sanitized evidence references, actors, correlation and safe result codes;
- command receipts keyed by workspace, command and idempotency key with a request fingerprint;
- one active operation per `workspace + routeId + modelVersion`.

An advisory transaction lock serializes short claims for that identity. It is never held while invoking another
authority. Child idempotency keys are deterministic:

`promotion:{operationId}:{phase}:{step}`

After an uncertain child outcome, recovery reads the child authority before retrying. It never assumes that a
client timeout means the mutation failed.

### 3. Phase order and evidence are fail-closed

- `stage`: resolve approved terms/rights evidence → publish/read exact rights policy → append disabled binding →
  open circuit → read all three back.
- `promote`: resolve signed human review and proposal from canonical readiness authorities → promote readiness →
  exact readback.
- `activate`: verify rights, readiness, disabled binding and open circuit → enable binding → close circuit →
  exact readback.
- `canary-confirm`: resolve an exact post-activation governed run, attempt, retained output, governance decision
  and route tuple. A caller boolean, browser payload or local JSON file cannot certify success.
- `rollback`: open circuit first, then disable binding, and read both back. Immutable rights/readiness history is
  preserved; rollback removes execution authority rather than deleting evidence.

### 4. Authority remains separated

Commands use separate capabilities because the capability registry authorizes one fixed capability per command:

- `read`
- `plan-stage`
- `promote`
- `activate`
- `canary-attest`
- `rollback`
- `recover`

Normal principals are separated:

- maker/reviewer: review and proposal, with maker different from reviewer;
- readiness promoter: promote/read;
- routing operator: start/stage/activate/rollback/read;
- independent canary checker: canary-attest/read;
- recovery worker: recover/rollback/read.

No normal principal combines reviewer, promoter and routing authority. Lower-level rights/readiness/routing
commands remain available only as audited break-glass operations after the aggregate flag is enabled.

### 5. Recovery is non-expansive

The recovery worker may:

- claim expired/reclaimable operations with lease and fencing;
- reconcile a child command already applied through exact readback;
- finish an operation checkpoint whose child authority proves success;
- execute circuit-first rollback to reduce authority.

It may not review, promote readiness, enable a binding, close a circuit or attest a canary. Stalled work is
`WARNING`, partial promotion is `ERROR`, and `rollback_failed` is `CRITICAL`. Queue age counts only reclaimable
operations.

## Consequences

- Promotion survives process crashes and uncertain outcomes without SQL repair.
- Tenant scope and evidence become enforceable in schema and contracts rather than operator convention.
- More principals and transitions are required, and promotion takes multiple authorized calls.
- Existing canary scripts become clients/checkers of the aggregate rather than an alternate orchestrator.
- Creating the aggregate does not promote any route. Each exact route still requires its own terms, fixture,
  evaluation, independent review/proposal and governed canary.

## Rollout and rollback

1. Expand rights schema and contracts; backfill only a verified internal workspace.
2. Deploy operation schema/readers with `GLOBE_PRODUCTION_PROMOTION_OPERATIONS_ENABLED=false`.
3. Exercise shadow reads and stage→rollback with separated identities.
4. Enable aggregate commands for allowlisted operators/checkers and remove lower-level grants from normal callers.
5. Exercise stage→promote→activate→canary on an internal-only route with complete evidence.
6. Soak signals and recovery before using the operation for the seven-route backlog.

Rollback disables the aggregate flag, opens the affected circuit, disables its binding and preserves all
operation/authority history. Schema changes remain additive until the compatibility window has been proven empty.

## Rejected alternatives

- **One all-powerful batch command:** rejected because it concentrates authority and cannot prove which human or
  service approved each irreversible phase.
- **Distributed database transaction across authorities:** rejected because current authorities own independent
  stores/transactions and external effects; pretending atomicity would make recovery less honest.
- **Browser/local JSON evidence:** rejected because the caller could assert the result it is asking to authorize.
- **Recovery that auto-promotes or activates:** rejected because recovery would become a privilege-escalation
  path.
- **Global rights application policy:** rejected because adoption, restrictions and validity are tenant decisions,
  even when provider terms evidence is shared.

## Verification required before rollout

- Migration, tenant-isolation, immutable-history and concurrent-claim tests.
- State-machine, expected-revision, idempotency, actor-separation and failure-injection tests.
- Exact readback tests for rights, review/proposal, readiness, binding, circuit and canary.
- Worker tests proving it cannot promote, activate or attest.
- Internal stage→rollback and full canary rehearsals with distinct identities.
- Cloud SQL readback, alert/signal verification, `pnpm check`, `pnpm build` and IaC plan without destructive drift.

## Delta 2026-08-04 — `canary-confirm` fallaba con la evidencia correcta (TASK-1641)

`efeonce-globe@38c528d`. La fase `canary-confirm` devolvía `internal_error` 500 **con toda la evidencia
correcta**: corrida gobernada, intento, output retenido, decisión de governance y tupla de ruta estaban donde
debían. Como `activated` no es terminal y la ventana vence, cada promoción quedaba condenada a revertirse sola —
**10 de 12 promociones históricas terminaron `rolled_back`**. El diseño de esta ADR no se relajó; lo que faltaba
era que su último paso pudiera ejecutarse.

### La causa: un consumidor que pide 14 columnas contra una vista que proyectaba 3

El resolver del canary hace JOIN contra la vista `generated_asset_rights_authority_effective` por linaje
(`run_id`, `attempt_id`, `route_id`, `provider_id`, `model_id`, `model_version`). Esa vista proyectaba
`workspace_id`, `asset_id` y `authority`, así que PostgreSQL fallaba en **planificación** con `42703`: los datos
nunca entraban en la ecuación. La migración `0050` la lleva a **16 columnas** —todo el linaje más
`rights_policy_purpose`— y fue aplicada por el workflow keyless.

La razón es de dominio, no de compilación: **una corrección corrige los DERECHOS, no el origen.** La tabla de
correcciones no tiene columnas de linaje y tiene FK a la base, así que el linaje es **invariante por
construcción**; el `UNION ALL` anterior lo perdía por accidente en la rama corregida. El `LEFT JOIN` sobre la PK
compartida proyecta la base completa y sobreescribe sólo `authority`.

### La migración committeada tenía dos defectos fatales invisibles al leerla

Ambos aparecieron al ejercitarla contra PG real dentro de una transacción con `ROLLBACK`, **antes** de aplicarla:

1. **`CREATE OR REPLACE VIEW` no puede reordenar ni renombrar columnas** — sólo agregar al final conservando
   nombre, tipo y posición. Reordenar aborta con **`42P16`**. Va `DROP` + `CREATE`, **sin `CASCADE`** a propósito
   (si mañana alguien construye encima, el DROP debe fallar en vez de arrastrarla), re-otorgando los GRANT
   explícitos que el DROP se lleva.
2. **El runner de migraciones de Globe ejecuta el archivo completo sin parsear markers.** La sección
   `-- Down Migration` —convención de `node-pg-migrate`, que es de Greenhouse, no de Globe— se ejecutaba y
   **re-creaba la vista rota tres líneas después de arreglarla**, quedando registrada como aplicada. En Globe el
   rollback de un forward-fix es **otra migración forward**, nunca una sección en el mismo archivo.

### El checkpoint irreversible ocurría antes de la lectura que podía fallar

`activated → verifying_canary` se escribía **antes** de resolver la evidencia, que es una lectura pura. De
`verifying_canary` no se vuelve: cada intento fallido quemaba una promoción y reintentar quemaba otra. Ahora se
lee primero y el checkpoint cubre **sólo el sello**. La ventana sin retorno queda reducida a un único write.

### Un `DatabaseError` deja de ser un 500 opaco

Las clases de infraestructura (`08`, `40`, `53`, `55`, `57`) se mapean a `dependency_unavailable`; las
deterministas (`42703`, `23505`, …) siguen en `internal_error`, **que es la verdad** — prometer reintento sobre un
defecto de código manda a reintentar para siempre. Todo error de Postgres emite además su SQLSTATE en el evento
`globe.dispatch.database_error`: mapear no puede costar la observación.

### Cobertura en los dos eslabones de la frontera

El path tenía cobertura cero: el único test stubeaba el resolver. Ahora hay dos gates, probados en rojo y en verde:

- **`consumidor ⊆ contrato declarado`** — test sin base, en cada `pnpm check`.
- **`contrato ⊆ vista real`** — bloque `DO` de la migración, en cada apply.

Más un test en vivo opt-in que ejecuta la query real. Ningún gate solo alcanza: el defecto vivía exactamente entre
los dos.

### Estado en runtime al cierre

- **`ref/motion/reference-v1` (Gemini Omni Flash) → `canary_passed`**: promoción sellada, binding habilitado,
  circuito cerrado. Es el mismo command que devolvía 500.
- **`ref/video/frames-v1` (Veo 3.1) → `canary_passed`**: promoción sellada (revisión 9, terminal), binding
  habilitado, circuito cerrado, 32 créditos reservados = 32 gastados. Con esto **las dos rutas de video quedaron
  promovidas, selladas y habilitadas**. ⚠️ El canary **no se produjo desde la UI del Producer** sino por el
  **carril gobernado**, con los commands canónicos del spine (`estimate` → `prepare` → `execute`): la ruta exige
  referencias de imagen y sus dos caminos de entrada en el Producer siguen rotos hoy (el botón «Usar como
  referencia» no despacha ningún command; la subida ingesta pero Asset Governance falla en `inspecting` con la
  causa enmascarada). **Ambos bloqueos son ajenos a esta ADR** y quedaron registrados aparte; ya no ponen en
  riesgo la promoción, pero sí mantienen bloqueada la generación desde el Producer para rutas con entrada
  obligatoria.

Evidencia viva (revisiones desplegadas, promociones, bindings y canarios) en
[`GLOBE_RUNTIME_HANDOFF.md`](../../operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md).

### Invariantes que deja este Delta

- **NUNCA** escribir el checkpoint `activated → verifying_canary` antes de resolver la evidencia. El checkpoint
  irreversible cubre el sello, no la lectura que puede fallar; adelantarlo convierte cada reintento en una
  promoción quemada.
- **NUNCA** cambiar la tabla por una vista (ni al revés) sin verificar que la proyección cubre **todas** las
  columnas que el consumidor referencia. La falla es de planificación (`42703`) y ocurre con datos perfectos.
- **NUNCA** reordenar ni renombrar columnas con `CREATE OR REPLACE VIEW` (`42P16`): va `DROP` + `CREATE` sin
  `CASCADE`, re-otorgando GRANT explícitos y verificando columnas **y** accesos en el bloque `DO`.
- **NUNCA** escribir una sección `-- Down Migration` en una migración de Globe: su runner ejecuta el archivo
  entero y deshace el fix en la misma transacción, en silencio.
- **NUNCA** mapear un error determinista de Postgres a `dependency_unavailable`. Reintentar no arregla un defecto
  de código, y la promesa de reintento esconde el defecto.
- **SIEMPRE** ejercitar una migración contra PG real dentro de una transacción con `ROLLBACK` antes de aplicarla.
  Los dos defectos fatales de `0050` eran invisibles leyéndola.
- **SIEMPRE** cubrir la frontera consumidor↔schema por los dos lados (test sin base + verificación en el apply).
  Un gate solo deja pasar exactamente el hueco que ya se coló.

## Delta 2026-08-05 — la saga declara su convergencia, y su ventana se observa ANTES de vencer

### El contrato de convergencia de la saga

`PROMOTION_DEPENDENT_AGGREGATES` (`packages/domain/src/promotion-aggregate-convergence.ts`) declara los tres
agregados que la saga mueve, con test bidireccional — una postura sin señal rompe el build:

| Agregado | Postura | Lo cierra |
|---|---|---|
| `production_routing_circuits` | `converges` | la saga (`setCircuit`, **antes** que el binding: fail-closed) |
| `production_route_bindings` | `converges` | la saga (`setBinding enabled=false`) |
| `model_readiness_revisions` | **`observable`** | `globe.model-readiness.route.pause` — **autoridad disjunta** |

🔴 **Readiness es `observable` por una frontera de AUTORIDAD.** `pause` exige `globe.model-readiness.pause` y la
saga sólo porta `globe.production-promotion.*`; son disjuntas a propósito — es la separación maker/checker que
hace vendible el régimen humano. Dársela dejaría que un **rollback automático retire una promoción que un humano
firmó**. Por eso la fase `rollback` (§ arriba) deja `model_readiness_revisions` en `promoted` **deliberadamente**,
y la divergencia se **cuenta y se hace visible** en vez de cerrarse sola.

⚠️ Y hoy ese remedio **no tiene camino ejecutable por ningún carril** (ver ADR-010 § chokepoints corregidos);
dueño del follow-up: `TASK-1463`.

### Dos señales nuevas, y una de ellas es el complemento estricto de `stalled`

- **`globe_promotion_window_closing`** (WARNING, 30 min de antelación): promociones `activated` con
  `deadline_at > now` dentro del umbral. 🔴 **No sustituye a `stalled`, lo complementa por el otro lado del mismo
  instante**: `stalled` / `promotion_queue_oldest_age_seconds` miden `deadline_at <= now`, o sea avisan **cuando
  la ventana ya venció**. Las cuatro promociones que murieron el 2026-08-04 lo hicieron a +2 s, +18 s, +26 s y
  +40 s del deadline: para todas ellas esa alerta llegaba tarde **por diseño**. Una ventana vencida **no** entra
  en la señal nueva — contarla dos veces borraría la frontera.
- **`globe_promotion_readiness_divergent`** (ERROR): rollbacks cuya readiness sigue `promoted`. Es la señal que
  permite declarar ese agregado `observable` y que la palabra signifique algo.

Ambas las emite un **solo consumidor** en el worker, porque son el mismo lector cross-workspace; usa la política
de scan que ya existía (`app.promotion_recovery_scan`, migración `0028`) mediante
`PromotionConvergenceObservationStorePort` + `PromotionReadinessStateReaderPort` — **sin migración nueva**.

### 🔴 El invariante de predicado que esta sesión ganó

Un predicado derivado de historia append-only necesita su **cláusula de vigencia**, y hicieron falta **dos**:
supersede por promoción posterior **y** binding vigente apagado. El segundo se descubrió con la señal ya
desplegada, porque el **lane automatizado de ADR-010 habilita rutas sin pasar por la saga** y no deja operación
posterior que las supersede. **Cuando dos mecanismos pueden mover el mismo estado, derivar de la historia de uno
solo es incorrecto por construcción**: el predicado se cierra sobre el **estado actual del efecto**.

### Métrica: la forma la decide la dirección de la magnitud

«Segundos restantes» se alinea al revés — pediría `COMPARISON_LT`, y **no existe `ALIGN_MIN` para DISTRIBUTION**,
así que un `ALIGN_PERCENTILE_99` alertaría sobre la promoción **menos** urgente. Se emite el **evento discreto
contable** (DELTA/INT64 + `ALIGN_SUM`) y el número vive en la línea de log que un humano lee.
