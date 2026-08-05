# TASK-1578 — Globe Model Onboarding and Credit Rate Promotion

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio-Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-028`
- Status real: `Proceso transversal pendiente de formalizar y ejecutar como capability operable`
- Rank: `TBD`
- Domain: `creative|platform|finance|reliability`
- Blocked by: `TASK-1468, TASK-1553, TASK-1554, TASK-1579`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear el proceso gobernado y repetible para incorporar un nuevo modelo de AI Gen a Globe sin reescribir adapters,
duplicar cálculos de créditos ni publicar una ruta prematuramente. La unidad conecta `route → credit rate → binding
→ estimate/actual reconciliation → canary → promotion → API/SDK/MCP/UI availability`.

## Why This Task Exists

`TASK-1468` posee el ledger y el rate catalog; `TASK-1553` posee el catálogo multi-modelo, la resolución por ruta y
los bindings; `TASK-1554` proyecta availability. Sin una task de unión, agregar un modelo requiere coordinación
manual no verificable y deja abierto el riesgo de que el estimate, el rate, el binding y la ruta ejecutada diverjan.

## Goal

Entregar una receta técnica y operativa que permita incorporar mañana un modelo dentro de un provider existente —o
declarar claramente los pasos adicionales para un provider nuevo— usando los mismos contratos de API, SDK, MCP, UI,
worker y conformance, con un receipt auditable de promoción.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md`
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md`
- `docs/tasks/in-progress/TASK-1468-globe-studio-credits-shadow-ledger.md`
- `docs/tasks/in-progress/TASK-1553-globe-extensible-multi-model-provider-catalog.md`
- `docs/tasks/complete/TASK-1554-globe-producer-fleet-availability-projection.md`

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

## Ownership Boundary

| Concern | Owner | This task consumes |
|---|---|---|
| Ledger, rate catalog, pinning, reservation and settlement | `TASK-1468` | rate version and lifecycle commands/readers |
| Rating, settlement, fallback and calibration policy | `TASK-1579` | normative formula and versioned behavior |
| Route catalog, adapter resolution and provider binding | `TASK-1553` | route identity, shape and binding evidence |
| Availability projection | `TASK-1554` | `available|gated|blocked` per route/workspace |
| Model rights/readiness attestation | `TASK-1535` | promotion authority and evidence |
| Onboarding sequence, receipt and cross-surface conformance | `TASK-1578` | this task |
| Model selector and Producer presentation | `TASK-1552`/`TASK-1555` | published availability and estimate |

This task no crea otro ledger, rate engine, provider adapter, registry, selector ni promotion saga. No puede cerrarse
sin consumir la policy normativa de `TASK-1579`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration + command + reliability`
- Source of truth afectado: `route catalog/binding de Globe + credit rate catalog de TASK-1468`
- Consumidores afectados: `creative runner, Model Lab, Producer, UI, SDK, MCP, CLI, worker y conformance harness`
- Runtime target: `sibling-service + governed control plane`

### Canonical onboarding contract

Cada onboarding debe producir un `ModelOnboardingReceiptV1` con, como mínimo:

- `routeId`, capability class, quality tier y output-shape contract;
- public model label, provider, model version y región permitida;
- `creditRateVersion`, rate rationale, effective date y shape coverage;
- binding identity y endpoint allowlist reference, sin exponer secretos;
- estimate preview, actual usage, reservation y settlement/release result;
- canary output MIME/hash/provenance, fallback result y error evidence;
- readiness/rights attestation, actor, workspace, correlation e idempotency keys;
- coverage por `ui`, `http`, `sdk`, `mcp`, `cli`, `worker`, `sister-platform` y `e2e`;
- decisión `promoted|gated|blocked|rejected` y razón de recovery.

La ruta no puede quedar `available` si falta rate vigente, binding válido, canary verificable, readiness o coverage
declarada. La promoción `internal` puede operar con acceso interno y policy explícita; la promoción `commercial` exige
además rights/readiness attestation de `TASK-1535`. Una surface no implementada se declara `policy-blocked` o
`not-applicable`, nunca se omite.

### Provider scenarios

#### Existing provider, new model or tier

1. Crear `routeId` aditiva; `update` sólo cambia la versión de una ruta equivalente, `add` crea una ruta nueva.
2. Declarar capability, quality tier, output shapes, restricciones y nombre comercial.
3. Crear o seleccionar `creditRateVersion` en `TASK-1468`; el rate representa capacidad semántica, no un token ni
   una tarifa pública del provider.
4. Crear binding route → provider model/version/region y validar endpoint allowlist.
5. Confirmar resolución route→model en el adapter y consistencia `binding == estimate == executed route`.
6. Ejecutar estimate sin red ni gasto, reserve idempotente, canary y settle/release real.
7. Promover la ruta internamente sólo después del receipt y publicar availability mediante el reader canónico;
   promoverla comercialmente requiere además `TASK-1535`.

#### New provider

Además de lo anterior, requiere provider contract, adapter, secrets/IAM, submit/poll o equivalente, normalización de
outputs, error taxonomy, actual usage, provenance, cost/retry policy, conformance y canary del provider. Catalogar un
provider sin seam ejecutable debe quedar `gated`, no `available`.

### API, SDK, MCP, UI and worker path

El flujo programático único es:

```text
catalog/fleet.read
  → credit.rate.catalog.read
  → lab.experiment.estimate
  → credits.reserve
  → lab.experiment.execute
  → credits.settle | credits.release
  → credits.balance/history.read
  → fleet availability refresh
```

- API/SDK/MCP/CLI llaman los mismos commands/readers y el mismo `CapabilityRegistry`.
- UI muestra catálogo, readiness, estimate y resultado; no calcula credits ni escribe balances.
- MCP sólo puede ejecutar surfaces cuyo coverage esté `available`; una capability `policy-blocked` permanece
  declarada y falla cerrado con el error canónico.
- Workers no escriben tablas directamente: ejecutan expiry/reconciliation mediante primitives canónicos.
- Commands exigen idempotency key; readers son read-only y devuelven DTOs redactados por audience.

## Scope

### Slice 1 — Recipe and contract

- Documentar la receta `route → rate → binding → estimate → reserve → canary → settle → promote`.
- Definir `ModelOnboardingReceiptV1`, estados, errores, evidence refs y coverage matrix.
- Definir los gates distintos para existing-provider/new-model y new-provider.

### Slice 2 — Rate and route reconciliation

- Hacer que el estimate del Model Lab y el rate catalog de `TASK-1468` compartan un único cálculo autoritativo.
- Verificar que rate version, route, shape y actual usage queden pinneados en reservation/settlement.
- Rechazar promotion ante `rate_missing`, `rate_mismatch`, `route_binding_missing`, `route_identity_mismatch` o
  `estimate_actual_unreconciled`.

### Slice 3 — Cross-surface onboarding evidence

- Ejecutar la receta por API/SDK y conformance; validar UI y MCP según coverage real.
- Probar replay, payload conflict, concurrent reservation, fallback, provider failure, partial output y rollback.
- Emitir receipt auditable y actualizar manual/handoff del runtime.

### Slice 4 — Internal operator handoff

- Dejar un checklist ejecutable para que un operador pueda saber exactamente qué falta antes de promover.
- Registrar un ejemplo real de modelo nuevo y un ejemplo gated por ausencia de allowlist/readiness.

## Out of Scope

- Crear o reemplazar el ledger, rate catalog, provider adapter, route catalog o selector de UI.
- Elegir pricing comercial, top-ups, checkout, tax, invoice, margen o equivalencia pública provider→money.
- Promover modelos externos sin rights/readiness/attestation de `TASK-1535`.
- Habilitar MCP, UI o clientes externos por defecto; cada surface requiere coverage y grant propios.
- Hacer que un modelo nuevo sustituya silenciosamente el default vigente.

## Rollout Plan & Risk Matrix

| Riesgo | Mitigation | Signal |
|---|---|---|
| Estimate y ledger calculan distinto | un rate autoritativo + contract test | `estimate_rate_mismatch` |
| Ruta disponible sin provider listo | readiness/binding/canary gate | `route_binding_missing` |
| Modelo nuevo reemplaza al anterior | add/update semantics + route identity | default cambia sin decisión |
| MCP/UI aparentan disponibilidad | coverage explícita y fail-closed | surface omitida o `missing` |
| Canary muestra éxito pero settlement falla | receipt exige reserve/settle/release | ledger sin evidencia de run |
| Provider nuevo filtra secreto o slug | DTO redaction + slug drift guard | leak en catálogo/logs |

- Default: `gated`, internal-only y sin impacto en la ruta vigente.
- Rollback: despromover/pausar la ruta, conservar receipt y ledger, no borrar rate ni evidencia.
- Promotion interna: receipt completo y availability reader verificado. Promotion comercial: además approval de
  rights/readiness y atestación de `TASK-1535`.

## Acceptance Criteria

- [ ] Existe una receta única y ejecutable para existing-provider/new-model y new-provider.
- [ ] `ModelOnboardingReceiptV1` conecta route, rate, binding, estimate, actual, canary, promotion y coverage.
- [ ] El Model Lab y `TASK-1468` comparten un único cálculo autoritativo de credits.
- [ ] Una ruta sin rate vigente, binding, readiness interna, canary o coverage no puede quedar `available`.
- [ ] La diferencia `promoted internal` vs `promoted commercial` es explícita; la segunda exige `TASK-1535`.
- [ ] API, SDK, MCP, CLI, worker y UI consumen los mismos commands/readers; ninguna surface calcula o muta balance.
- [ ] Replay, idempotencia, payload conflict, concurrencia, fallback, release y settlement tienen evidencia.
- [ ] El modelo nuevo puede quedar honestamente `gated` con reason/recovery sin romper la flota existente.
- [ ] El checklist y receipt están documentados para un operador que deba incorporar un modelo futuro.
- [ ] No se exponen provider secrets, raw errors, vendor cost o margin fuera de audiences autorizadas.

## Verification

- `pnpm task:lint --task TASK-1578`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- Conformance del runtime Globe y canary por ruta cuando el cambio llegue a `efeonce-globe`.

## Closing Protocol

- [ ] `TASK-1468`, `TASK-1553`, `TASK-1554` y `TASK-1535` tienen receipts/links de ownership sincronizados.
- [ ] Recipe, contract, manual y Handoff documentan el estado real.
- [ ] La ruta existente permanece sin regresión y el nuevo modelo queda `promoted` o `gated` honestamente.
- [ ] Estado de cierre: `code complete, rollout pendiente` hasta que el runtime y el canary estén verificados.
