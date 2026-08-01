# TASK-1579 — Globe Credit Rating, Settlement and Fallback Policy

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio-Alto`
- Type: `policy`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-028`
- Status real: `Policy V1, settlement y expiry worker code-complete local; receipts, calibración y rollout pendientes`
- Rank: `next.2`
- Domain: `finance|creative|platform|reliability`
- Blocked by: `none`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Definir la política normativa que determina cuántos Studio Credits representa una operación generativa, cómo se
autoriza el gasto, cómo se liquida el consumo real y cómo se comportan fallbacks, retries, batches, outputs parciales,
versiones de rates y cambios de ruta. La policy será consumida por `TASK-1468` como kernel durable y por `TASK-1578`
como onboarding de modelos; no crea un tercer motor de cálculo.

## Why This Task Exists

Globe ya tiene un ledger, un estimate previewable y un catálogo multi-modelo, pero la unidad exacta de cálculo y la
relación estimate → reservation → actual → settlement todavía no están cerradas como un contrato único. Sin esta
policy, dos providers pueden interpretar de forma distinta un mismo shape, un fallback puede ampliar silenciosamente
el gasto aprobado o una rate nueva puede alterar la lectura histórica.

## Goal

Entregar un contrato versionado, provider-neutral y auditable que permita responder consistentemente:

- qué operación genera créditos;
- qué factores determinan la cantidad;
- qué significa estimate, reservation, actual y settlement;
- qué sucede ante fallback, retry, timeout, output parcial o cambio de dirección;
- cuándo dos rutas comparten rate y cuándo requieren una banda diferente;
- cómo se publica, recalibra, depreca y retira una rate sin reescribir historia.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md`
- `docs/tasks/in-progress/TASK-1468-globe-studio-credits-shadow-ledger.md`
- `docs/tasks/to-do/TASK-1578-globe-model-onboarding-credit-rate-promotion.md`

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Ownership Boundary

| Concern | Owner | Relationship |
|---|---|---|
| Credit rating and settlement policy | `TASK-1579` | define and version |
| Durable ledger, reservations and adjustments | `TASK-1468` | implement policy |
| Routes, models, adapters and bindings | `TASK-1553` | provide route facts |
| Model onboarding and promotion receipt | `TASK-1578` | consume policy and certify route |
| Pools, grants and budgets | `TASK-1482`/`TASK-1483` | enforce policy context |
| Rights/readiness commercial gate | `TASK-1535` | authorize commercial promotion |

This task no posee provider adapters, route catalog, UI, checkout, price book, invoice, tax, wallet ni GL.

## Dependencies & Impact

### Depends on

- TASK-1468 para el kernel/ledger existente y los hechos reales de reservation/settlement.
- TASK-1553 para identidad exacta de route, provider facts y output shapes; no para decidir la unidad económica.
- El modelo vigente de Studio Credits y los constraints de Full API Parity.

### Blocks / Impacts

- TASK-1468 no cierra `actual|settlement` hasta implementar esta policy versionada.
- TASK-1586 no publica lifecycle/receipts autoritativos hasta que los estados económicos tengan semántica única.
- TASK-1578 consume la policy para emitir onboarding receipts por route/version.

### Files owned

- `docs/tasks/in-progress/TASK-1579-globe-credit-rating-settlement-fallback-policy.md`
- deltas normativos al modelo de Studio Credits aprobados durante Plan Mode;
- fixtures/conformance de rating y settlement que Plan Mode ubique en Globe. El runtime
  `packages/contracts/src/credits.ts`, `packages/domain/src/credit-ledger.ts` y stores/migrations sigue bajo
  implementación coordinada con TASK-1468; esta task no edita esos archivos en paralelo.

## Current Repo State

### Already exists

- Globe tiene rate catalog versionado, estimate, reservations, settlements y ledger append-only.
- Existen rates por rutas reales y receipts que permiten comparar estimate/reserved/actual.

### Gap

- No existe una policy única que cierre factores, fallback/retry/batch, actual mayor a reserved, outputs parciales,
  equivalencia entre providers, calibración y lifecycle de rates sin reescribir historia.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Greenhouse governance/documentation; Globe runtime implementation`
- Future candidate home: `remain-shared`
- Boundary: `credit policy and versioned rating/settlement contract; TASK-1468 implements the runtime`
- Server/browser split: `policy, rates, settlement and provider facts server-only; client receives redacted estimates and outcomes`
- Build impact: `TASK-1468, TASK-1578, Model Lab, provider adapters and conformance fixtures`
- Extraction blocker: `ninguno; implementation remains in Globe and policy remains governed from Greenhouse`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration + source-of-truth policy`
- Source of truth afectado: `versioned credit rating policy consumed by TASK-1468`
- Consumidores afectados: `Model Lab, creative runner, ledger, Producer, UI, SDK, MCP, CLI and workers`
- Runtime target: `sibling-service + governed control plane`

### Canonical rating model

La policy debe resolver una unidad común antes de mirar el provider concreto:

```text
credits =
  capability_class
  × quality_tier
  × output_shape
  × quantity_or_duration
  × governed_modifiers
```

La ruta identifica el modelo y su ejecución. No es automáticamente la unidad económica. Una ruta puede compartir rate
con otra cuando promete la misma capacidad semántica; requiere una rate distinta cuando cambia materialmente fidelity,
control, duración, output contract, quality tier o la política aprobada.

Cada rate version declara:

- capability class (`image_generate`, `video_generate`, `audio_generate`, `voice_generate`, `specialist_inference`,
  `prompt_direction`, `format_adaptation`, `regional_edit`, `format_set`, etc.);
- quality tier y shape constraints;
- unidad de cantidad/duración y reglas de redondeo;
- modifiers permitidos y su justificación;
- rutas elegibles o equivalencia semántica;
- effective-from, effective-until y policy version;
- calibración, muestra, p50/p75/p95 y margen mínimo objetivo;
- audience/redaction rules;
- approval authority y change reason.

Los tokens, dólares, costo contractual del provider y margen Efeonce no son unidades públicas de credits.

### Creative operation semantics

- `prompt_direction` y `specialist_inference` deben declarar si son gratuitos, incluidos en una generación o
  consumen una banda propia; nunca pueden activar gasto oculto al escribir en el composer.
- `format_adaptation` y `regional_edit` son operaciones creativas nuevas sobre un asset existente: deben
  conservar parent lineage, estrategia, preservaciones y ratio destino en la identidad de estimate/reservation.
- `format_set` agrega miembros con un tope común; cada miembro puede tener rate propio, pero el agregado no
  puede superar el envelope autorizado ni crear reservations huérfanas.
- Cambiar prompt, receta, cámara, ratio, estrategia, preservación o route invalida el fingerprint vigente y
  exige un nuevo estimate cuando modifica la operación económica.

### Estimate, reservation, actual and settlement

| Phase | Contract | Balance effect |
|---|---|---:|
| `estimate` | preview read-only, versionado y vigente | 0 |
| `reservation` | hold idempotente con rate, route, shape, scope y TTL pinneados | inmoviliza |
| `execution` | attempts y actual usage con evidencia | no liquida por sí solo |
| `settlement` | convierte el hold en consumo según policy | consume actual autorizado |
| `release` | devuelve hold no usado | libera |
| `adjustment` | entrada compensatoria por refund/correction | nunca edita historia |

`actualCredits` puede diferir de `estimatedCredits` sólo dentro del envelope aprobado. Un actual superior exige
reautorización, cap o settlement parcial; nunca se cobra silenciosamente. El estimate aprobado debe conservar una
identidad/fingerprint que impida ejecutar otra ruta o shape sin nueva autorización.

### Fallback, retry and partial output policy

- Un fallback que no cambia la capacidad ni el envelope puede ejecutarse y debe dejar ambas rutas en evidence.
- Un fallback que cambia tier, shape, cantidad, duración o rate requiere nuevo estimate y autorización.
- Retry técnico idempotente no duplica cargo; retry creativo o cambio de brief crea una nueva identidad.
- Timeout ambiguo conserva la reservation hasta reconciliar si el provider recibió la solicitud.
- Provider failure sin trabajo útil libera o ajusta según evidence; output parcial usa una regla versionada.
- Output válido pero no elegido sigue consumiendo si la exploración estaba aprobada; preferencia creativa no equivale
  a defecto técnico.
- Error de plataforma, adapter, preflight o rights gate atribuible a Efeonce no se traslada silenciosamente al cliente.

### Shape and batch policy

La policy debe cubrir explícitamente:

- candidatos múltiples;
- segundos de video/audio;
- stems y tracks;
- resolución, frame rate y formato;
- references, masks y control inputs;
- upscale, extend, variation, inpaint y transform;
- retries internos del provider;
- outputs parciales o multi-output.

Un batch no puede cambiar la unidad de cobro por conveniencia del provider ni incentivar fragmentar artificialmente una
operación.

### Rate lifecycle and calibration

```text
draft → calibrated → approved → effective → superseded → retired
```

- Rate nueva aplica a nuevas estimates/reservations después de su effective date.
- Reservations y settlements históricos conservan su rate version.
- Nunca se reescribe una entrada del ledger por publicar una rate nueva.
- Calibración usa runs observados, costos servidos, retries, outputs útiles y p50/p75/p95.
- Si la desviación estimate/actual supera el umbral aprobado, la ruta pasa a `gated` o requiere recalibración.
- La recalibración no puede modificar unilateralmente el envelope de una reservation existente.

### Provider equivalence and route behavior

Dos providers comparten rate sólo si la capability y el quality tier son semánticamente equivalentes. La policy debe
considerar fidelity, control, duración, consistencia, output contract, rights y limitaciones materiales, no sólo que
ambos generen el mismo tipo de media.

La selección explícita, recomendación, auto-routing y fallback son comportamientos distintos y deben conservarse en
el receipt y en el ledger.

### Tenant, authority and security

- Workspace, proyecto, pool, grant y budget authority se derivan del trusted context.
- Rate, reservation, settlement y adjustment requieren capabilities específicas.
- El cliente no puede enviar su propio rate, balance, actor, workspace o actual usage como autoridad.
- Provider secrets, raw prompts internos, endpoints, vendor cost y margin permanecen server-side/redacted.
- No hay saldo negativo salvo policy futura, versionada y aprobada.

### API, SDK, MCP, UI and worker contract

Todas las surfaces consumen el mismo contrato:

```text
rate.catalog.read
→ estimate.read
→ reserve.command
→ execute.command
→ settle/release.command
→ balance/history.read
```

La UI muestra estimate, vigencia, fase, ámbito y recovery; no calcula. SDK, MCP y CLI usan los mismos commands/readers;
MCP permanece `policy-blocked` cuando su coverage no esté habilitada. Workers ejecutan expiry/reconciliation mediante
primitives canónicos y nunca escriben tablas directamente.

### Audit, signals and runtime evidence

Cada execution debe conservar:

- estimate/rate version y fingerprint;
- route propuesta y ejecutada;
- provider/model/version/fallback por attempt;
- reservation/settlement/release/adjustment;
- actual usage y outcome;
- actor, workspace, project/run, correlation e idempotency;
- output/provenance evidence y reason codes.

Signals mínimos: estimate/actual drift, rate mismatch, fallback rate, provider failure, retry rate, stuck hold,
settlement delay, partial output, route availability drift, credits per successful candidate y margin-floor breach.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Rating unit and rate version contract

- Resolver la contradicción `route × shape` versus `capability × tier × shape` y publicar una fórmula única.
- Definir rate version, rounding, quantity/duration, batch, equivalence y calibration fields.
- Versionar el contract y actualizar `TASK-1468`/`TASK-1578` como consumers.

### Slice 2 — Settlement and fallback policy

- Definir estimate envelope, actual tolerance/cap, reauthorization, fallback, retry, timeout, partial output,
  release, refund y adjustment.
- Definir cómo se pinnean route/rate/shape en reservation y settlement.
- Crear matrices de casos y negative fixtures para API/SDK/MCP/worker.

### Slice 3 — Lifecycle, calibration and observability

- Definir publicación, effective dates, supersession, retirement y recalibration.
- Definir umbrales de estimate/actual drift, provider failure, fallback y margin-floor.
- Producir un receipt de policy aplicable al onboarding de un modelo nuevo.

## Out of Scope

- Implementar el ledger o cambiar tablas sin la task dueña.
- Implementar providers, adapters, route catalog, selector UI o MCP execution surface.
- Fijar precios públicos, checkout, payments, tax, invoice, GL, top-ups o revenue recognition.
- Convertir provider cost, tokens o dólares en credits visibles.
- Promover una ruta o habilitar clientes externos.

## Detailed Spec

La policy se aprueba primero como contrato versionado y golden fixtures provider-neutral. TASK-1468 la implementa
en el kernel y demuestra conformance estimate → reservation → actual → settlement. TASK-1578 sólo puede promover
una route cuando su rate version y receipt apuntan a esa misma policy; ningún adapter introduce multiplicadores.

## Rollout Plan & Risk Matrix

| Riesgo | Mitigation | Signal |
|---|---|---|
| Dos fórmulas de credits | una policy versionada consumida por 1468/1578 | estimate/ledger mismatch |
| Fallback amplía el gasto | envelope + reauthorization + route evidence | actual > approved |
| Rate nueva altera historia | pinning + effective dates + append-only | historical drift |
| Provider equivalente mal clasificado | capability/quality/shape review + calibration | high variance |
| Retry/timeout duplica cargo | idempotency + reconciliation | double settlement |
| Datos parciales tratados como cero | explicit partial/unknown states | false balance |

- Default: policy `draft`/`gated`; no cambia runtime ni rates vivos hasta aprobación.
- Rollback: retirar la policy futura, conservar rates/ledger históricos y detener nuevas reservations afectadas.
- Runtime rollout: primero fixtures y shadow reconciliation, después canary interno, finalmente promotion separada.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Existe una fórmula única y versionada que resuelve capability, tier, shape, quantity/duration y modifiers.
- [ ] La policy define el tratamiento económico de `prompt_direction`, `format_adaptation`, `regional_edit` y
      `format_set`, incluyendo si consumen credits, si están incluidos o si requieren rate propia.
- [ ] Cambiar ratio, estrategia de adaptación, preservación, cámara, receta o parent asset cambia la identidad
      económica cuando corresponde e invalida el estimate anterior; no existe cobro oculto.
- [ ] Un Format Set respeta un envelope agregado y una adaptación conserva lineage, ratio origen/destino,
      estrategia y preservación en estimate, reservation y settlement.
- [ ] `estimate`, `reservation`, `actual`, `settlement`, `release` y `adjustment` tienen semántica y balance effect explícitos.
- [ ] Estimate/actual drift, caps y reauthorization están definidos; no existe cobro silencioso por encima del envelope.
- [ ] Fallback, retry, timeout, partial output, batch y cambio creativo tienen outcomes deterministas y auditables.
- [ ] Rate versions tienen effective dates, pinning, supersession, calibration y rollback sin reescritura histórica.
- [ ] Equivalencia entre providers se decide por capability/tier/shape/rights, no por nombre de provider.
- [ ] UI/API/SDK/MCP/CLI/worker consumen el mismo contract y ninguna surface calcula o muta balances localmente.
- [ ] Tenant, authority, idempotency, concurrency, redaction, canonical errors y audit están cubiertos.
- [ ] Signals de drift, fallback, retries, stuck holds, settlement delay y rate availability tienen owner y evidence.
- [ ] `TASK-1468` y `TASK-1578` enlazan esta policy como dependencia normativa antes de cerrar sus respectivos gaps.

## Verification

- `pnpm task:lint --task TASK-1579`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`

## Progreso verificable 2026-08-01

- El hook canónico se ejecutó con `--develop --subagents`; se mantiene el checkout compartido y no se usa worktree.
- Globe incorpora una policy pura `studio-credits-settlement-v1` consumida por ambos finalizadores, durable y
  síncrono, con outcomes `settle | release | keep-held-for-reconciliation | requires-reauthorization`.
- Un timeout aceptado, un output parcial o un fallback fuera del envelope conserva el hold; un fallo definitivo
  libera y un candidato completo liquida la rate semántica pinneada, no unidades crudas del provider.
- Verificación del settlement: typecheck de contracts/domain, 396 tests de domain y `pnpm check && pnpm build`
  monorepo verdes.
  Commit local de Globe `develop`: `9acfa58 feat(credits): govern settlement fallback outcomes`.
- Expiry periódica quedó implementada localmente en el `globe-producer-worker` existente, siempre después del
  governed batch. Reclama reservas vencidas mediante lease, `FOR UPDATE SKIP LOCKED` y fencing tenant-scoped;
  sólo evidencia terminal `failed|cancelled` ejecuta el command canónico `expire`. Estados activos solicitan
  cancelación/conciliación y `completed|timed_out|unknown|partial` conservan el hold.
- La migración aditiva `0044_credit_reservation_expiry_claims.sql` agrega únicamente coordinación y outcome
  curado; no crea un segundo saldo ni muta el ledger. El flag `GLOBE_CREDIT_EXPIRY_ENABLED` permanece `false`
  por defecto hasta migración y rollout explícitos.
- La observabilidad publica summary por batch y `creditExpiryOldestAgeSeconds`; existe métrica/alerta WARNING
  para un hold vencido por más de 900 segundos. Verificación focal: 399 tests domain, 132 database y 285
  studio-web verdes; OpenTofu format y `git diff --check` verdes.
- Pendiente antes de cerrar: policy receipts/readers, calibración/onboarding, aplicar migraciones, deploy,
  activar flag y verificar canary/reconciliation live.
- Contract fixtures/conformance en `efeonce-globe` cuando la policy se implemente.

## Closing Protocol

- [ ] Policy version, receipt y links de ownership sincronizados en TASK-1468, TASK-1578 y EPIC-028.
- [ ] No hay fórmula paralela en adapter, Model Lab, UI, SDK, MCP, CLI o worker.
- [ ] Estado honesto: `code complete, rollout pendiente` hasta aplicar la policy y verificar canary/reconciliation.
