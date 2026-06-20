# TASK-1195 — Posición F29 mensual consolidada (IVA + Retenciones + PPM)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `reader`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-1195-f29-consolidated-monthly-position`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Child E de la umbrella TASK-1186. Une las 3 líneas mensuales del F29 ya materializadas (IVA TASK-725, Retenciones TASK-1188, PPM TASK-1189) en un **reader + endpoint consolidado** por entidad legal/período: un solo contrato que devuelve la posición F29 completa del mes (débito/crédito IVA neto + retención practicada + PPM), reusando los 3 readers canónicos existentes. No materializa nada nuevo ni toca schema — compone.

## Why This Task Exists

Las 3 líneas del F29 existen como readers/endpoints separados (`/api/finance/{vat,retention,ppm}/monthly-position`). Hoy no hay un único contrato que entregue la posición F29 mensual completa para que la UI, Nexa o el contador la vean de un vistazo. Esta task cierra el programa de posiciones fiscales mensuales con la vista consolidada — sin lógica nueva de cálculo, solo composición gobernada de los primitives ya construidos. La UI visible (card/dashboard F29) queda como follow-up `ui-ux` separado (disciplina de split backend-data → ui-ux).

## Goal

- Reader canónico `getF29ConsolidatedMonthlyPosition({ legalEntityOrganizationId, year, month })` que compone los 3 readers existentes (IVA, retenciones, PPM) en un VM unificado.
- Endpoint `GET /api/finance/f29/monthly-position` (scope operating entity, degradación honesta) que expone la posición consolidada + el estado `enabled` de cada línea (oficial vs shadow).
- Cero materialización nueva, cero schema nuevo — reuso puro de primitives canónicos.
- El consolidado refleja por línea si está en shadow (flag OFF) para no presentar como oficial una cifra no validada por el contador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (Deltas 2026-06-20 de las 3 líneas del F29: TASK-725 IVA, TASK-1188 retenciones, TASK-1189 PPM)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (reader gobernado consumible por Nexa por construcción)

Reglas obligatorias:

- **NUNCA** recomputar las posiciones inline: el consolidado SOLO compone los 3 readers canónicos (`getVatMonthlyPosition`, `getRetentionMonthlyPosition`, `getPpmMonthlyPosition`). No SQL nuevo de cálculo fiscal.
- **NUNCA** scopear por `space_id`: el F29 es por entidad legal (operating entity), igual que sus 3 líneas.
- **SIEMPRE** propagar el `enabled` de cada línea (flags `RETENTION_POSITION_ENABLED` / `PPM_POSITION_ENABLED`; el IVA no tiene flag) para que el consumer distinga oficial vs shadow.

## Normative Docs

- `docs/tasks/complete/TASK-725-finance-fiscal-scope-legal-entity-foundation.md` (IVA + foundation del scope).
- `docs/tasks/complete/TASK-1188-retenciones-monthly-position.md` (línea retenciones).
- `docs/tasks/complete/TASK-1189-ppm-monthly-position.md` (línea PPM).

## Dependencies & Impact

### Depends on

- `getVatMonthlyPosition` / `listVatMonthlyPositions` (`src/lib/finance/vat-ledger.ts`) — complete.
- `getRetentionMonthlyPosition` / `listRetentionMonthlyPositions` (`src/lib/finance/retention-ledger.ts`) — complete.
- `getPpmMonthlyPosition` / `listPpmMonthlyPositions` (`src/lib/finance/ppm-ledger.ts`) — complete.
- `getOperatingEntityIdentity()` (`src/lib/account-360/organization-identity.ts`).
- Flags `isRetentionPositionEnabled()` (`src/lib/finance/retention/flags.ts`) + `isPpmPositionEnabled()` (`src/lib/finance/ppm/flags.ts`).

### Blocks / Impacts

- Habilita la UI visible del F29 consolidado (follow-up `ui-ux` separado).
- Cierra el alcance mensual de la umbrella TASK-1186 (quedan child C — F22 anual — y child D — multi-entidad).

### Files owned

- `src/lib/finance/f29-consolidated.ts` (nuevo — reader compositor) `[verificar nombre]`
- `src/app/api/finance/f29/monthly-position/route.ts` (nuevo)
- tests asociados

## Current Repo State

### Already exists

- Las 3 líneas del F29 materializadas + sus readers/endpoints/signals (IVA/retenciones/PPM).
- Resolver de entidad legal `getOperatingEntityIdentity()`.
- Flags de retención y PPM.

### Gap

- No existe un reader/endpoint que una las 3 líneas en una posición F29 mensual consolidada.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard` (reader compositor additive; sin schema/migración; reusa primitives fiscales)
- Impacto principal: `reader` (+ `api`)
- Source of truth afectado: ninguno nuevo — compone `vat_monthly_positions` + `retention_monthly_positions` + `ppm_monthly_positions` vía sus readers
- Consumidores afectados: UI Finance (futuro card F29), Nexa, CLI/contador
- Runtime target: `app`

### Contract surface

- Contrato existente a respetar: los 3 readers canónicos + el patrón de endpoint de las 3 líneas (scope operating entity, `canonicalErrorResponse('fiscal_entity_unavailable')`).
- Contrato nuevo o modificado: reader `getF29ConsolidatedMonthlyPosition` + endpoint `GET /api/finance/f29/monthly-position`.
- Backward compatibility: `compatible` (additive; no toca las 3 líneas existentes).
- Full API parity: reader gobernado consumible por Nexa por construcción; un primitive, muchos consumers.

### Data model and invariants

- Entidades/tablas afectadas: ninguna nueva (lectura vía readers existentes).
- Invariantes:
  - Composición pura: NUNCA recomputar; solo agregar los 3 readers.
  - Scope = entidad legal (operating entity), NUNCA `space_id`.
  - Propagar `enabled` por línea (oficial vs shadow).
- Tenant/space boundary: N/A (F29 = entidad legal interna).
- Idempotency/concurrency: N/A (read-only).
- Audit/outbox/history: N/A (read-only).

### Migration, backfill and rollout

- Migration posture: `none`.
- Default state: `read-only` (additive; sin flag propio — hereda el `enabled` de cada línea).
- Backfill plan: ninguno.
- Rollback path: revert PR.
- External coordination: ninguna (repo-only; las cifras subyacentes ya tienen sus gates contables en las child tasks).

### Security and access

- Auth/access gate: `requireFinanceTenantContext`; scope operating entity.
- Sensitive data posture: `finance` — el detalle de retenciones expone contraparte (la línea de retención ya no expone RUT; el consolidado agrega, no detalla).
- Error contract: `canonicalErrorResponse('fiscal_entity_unavailable')`; `captureWithDomain(err,'finance',...)`.
- Abuse/rate-limit posture: N/A (lectura interna).

### Runtime evidence

- Local checks: test del compositor (suma correcta de las 3 líneas + propagación de `enabled`).
- DB/runtime checks: ejecutar el reader contra PG con la data shadow ya materializada de IVA/retención/PPM.
- Integration checks: `staging:request /api/finance/f29/monthly-position` → 200 con las 3 líneas + `legalEntity`.
- Reliability signals/logs: reusa los 3 signals existentes (`finance.{vat,retention,ppm}.position_drift`); esta task no agrega signal.
- Production verification sequence: ver Rollout.

### Acceptance criteria additions

- [ ] Source of truth y consumers nombrados con paths reales (los 3 readers).
- [ ] El consolidado NO recomputa: solo compone los 3 readers (test lo verifica).
- [ ] Propaga `enabled` por línea (oficial vs shadow).
- [ ] Evidencia runtime: endpoint 200 con las 3 líneas.

## Capability Definition of Done — Full API Parity gate

`N/A — no capability` nueva de write (reader compositor de solo lectura). El read queda como reader/recurso canónico consumible por Nexa por construcción; sin capability nueva.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Reader compositor

- `getF29ConsolidatedMonthlyPosition({ legalEntityOrganizationId, year, month })`: llama los 3 readers canónicos en paralelo, arma un VM unificado (IVA: débito/crédito/neto; retención: total; PPM: base/tasa/monto), con el `enabled` de cada línea. Tests.

### Slice 2 — Endpoint + verificación + docs

- `GET /api/finance/f29/monthly-position` (mirror del patrón de las 3 líneas, scope operating entity). Verificación staging + Delta arch doc + closing. Declarar el follow-up `ui-ux` (card F29 consolidado).

## Out of Scope

- UI visible (card/dashboard F29) — follow-up `ui-ux` separado.
- F22 anual (child C / TASK-1196) y multi-entidad (child D).
- Cualquier recálculo o materialización nueva.
- Envío real del F29 a SII.

## Detailed Spec

Composición pura. El reader llama `getVatMonthlyPosition` + `getRetentionMonthlyPosition` + `getPpmMonthlyPosition` para `(operatingEntity, year, month)` y arma:

```text
F29 mensual (entidad legal, período):
  · IVA:        débito − crédito = neto IVA           (enabled: siempre, sin flag)
  · Retención:  total retención practicada            (enabled: RETENTION_POSITION_ENABLED)
  · PPM:        base × tasa = PPM                      (enabled: PPM_POSITION_ENABLED)
```

El endpoint devuelve `{ enabledByLine: {...}, vat, retention, ppm, legalEntity, year, month }`. Cada línea puede venir `null` si no hay posición materializada del período (degradación honesta). NUNCA presentar como total oficial las líneas con `enabled:false`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (reader) → Slice 2 (endpoint). El endpoint depende del reader.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Presentar como oficial una línea en shadow | finance | medium | propagar `enabled` por línea; el consumer no totaliza líneas shadow | revisión + flags |
| Recomputar inline en vez de componer | finance | low | test que verifica que el reader llama los 3 readers (no SQL fiscal nuevo) | code review |

### Feature flags / cutover

Sin flag propio. El consolidado hereda el `enabled` de cada línea (`RETENTION_POSITION_ENABLED`, `PPM_POSITION_ENABLED`; IVA sin flag). Additive, immediate cutover del reader/endpoint.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR | <5 min | sí |
| Slice 2 | revert PR | <5 min | sí |

### Production verification sequence

1. Deploy a staging → `staging:request /api/finance/f29/monthly-position` 200 con las 3 líneas.
2. Confirmar que las líneas con flag OFF vienen con `enabled:false`.
3. Prod: deploy + smoke del endpoint.

### Out-of-band coordination required

N/A — repo-only change. Las cifras subyacentes ya tienen sus gates contables en TASK-1188/1189.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `getF29ConsolidatedMonthlyPosition` compone los 3 readers canónicos sin recomputar (test).
- [ ] `GET /api/finance/f29/monthly-position` responde 200 con las 3 líneas + `legalEntity` (sesión admin interno).
- [ ] El response propaga el `enabled` de cada línea (oficial vs shadow).
- [ ] Scope = operating entity; sin `space_id`.
- [ ] Sin migración ni schema nuevo.

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm test`
- `pnpm staging:request /api/finance/f29/monthly-position`

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` Delta (vista F29 consolidada)
- [ ] chequeo de impacto cruzado: marcar en TASK-1186 (umbrella) la child E como complete
- [ ] declarar el follow-up `ui-ux` (card F29 consolidado)

## Follow-ups

- **UI F29 consolidado** (`ui-ux`): card/dashboard que consume este reader — task separada.
- Export consolidado (PDF/CSV del F29 completo) si el contador lo pide.

## Open Questions

- ¿El consolidado incluye también el arrastre/saldo a favor de IVA del período anterior, o eso queda para la vista F22/anual? Resolver con contador.
