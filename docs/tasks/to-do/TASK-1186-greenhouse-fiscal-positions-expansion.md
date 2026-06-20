# TASK-1186 — Greenhouse fiscal positions expansion (PPM · Retenciones · Renta Anual F22 · multi-country)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `umbrella`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `migration`
- Epic: `[verificar] candidata a EPIC-### si se decide formalizar`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-1186-greenhouse-fiscal-positions-expansion`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Umbrella que extiende el foundation de scope fiscal por entidad legal (TASK-725) más allá del IVA/F29 a las demás posiciones fiscales que Efeonce debe declarar, y a la dimensión multi-entidad/multi-país. Coordina 4 sub-capacidades distintas — **PPM** (Pago Provisional Mensual), **Retenciones** (honorarios SII + 2da categoría), **Renta Anual F22**, y **multi-country / multi-entity tax profiles** — cada una construida sobre el mismo patrón canónico: scope = entidad legal (`getOperatingEntityIdentity()` / `legal_entity_organization_id`), posición materializada por (entidad, período), reliability signal de drift, y readers/endpoint gobernados. Es prioritaria porque son obligaciones tributarias reales de Efeonce, hoy fuera del portal.

## Why This Task Exists

TASK-725 dejó el IVA/F29 correctamente scopeado por entidad legal y probó el patrón canónico (operating entity como dueño fiscal, posición consolidada por período, signal de drift, degradación honesta). Pero el F29 IVA es solo una de las posiciones fiscales de la empresa: PPM, retenciones (honorarios/2da categoría), y la renta anual F22 hoy no viven en el portal, y el modelo multi-entidad/multi-país (varios RUT, distintos regímenes) sigue siendo un supuesto singleton. Esta umbrella captura y prioriza ese trabajo como un programa coherente que reusa el foundation de TASK-725 en vez de reinventarlo por forma fiscal.

## Goal

- Cada posición fiscal (PPM, retenciones, F22) se materializa por **entidad legal + período**, reusando el patrón canónico de TASK-725 (no por `space_id`/cliente).
- El modelo soporta **multi-entidad** (varios RUT) y **multi-país** (distintos regímenes) sin redesign: la entidad legal se resuelve por documento (`legal_entity_organization_id`), no por singleton.
- Cada posición tiene su reliability signal de drift (steady=0) y readers/endpoint gobernados, consumibles por UI/Nexa/CLI por construcción (Full API Parity).
- El programa se descompone en child tasks ejecutables por sub-capacidad, con dependencias claras hacia el foundation de TASK-725.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (Delta 2026-06-20 VAT scope = entidad legal, TASK-725 — patrón a replicar)
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` (FX/multi-currency para multi-país)
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` (retención honorarios SII — `SII_RETENTION_RATES`, ver invariantes payroll)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (cada posición = contrato gobernado)

Reglas obligatorias:

- **NUNCA** particionar una posición fiscal por `space_id`/`client_id` — la SSOT fiscal es la entidad legal (RUT). Replicar el patrón de TASK-725.
- **NUNCA** hardcodear tasas tributarias (retención honorarios, IDPC, etc.): usar las SSOT versionadas (`SII_RETENTION_RATES` en `src/types/hr-contracts.ts` para honorarios; ver skill `greenhouse-payroll-auditor`).
- **SIEMPRE** que una posición fiscal mute, emitir su reliability signal de drift (steady=0).
- **NUNCA** asumir singleton de entidad legal en el modelo nuevo: multi-entidad se resuelve por documento (`legal_entity_organization_id`).
- No es asesoría tributaria de filings: las tasas/umbrales/reglas SII se verifican contra fuente oficial antes de cerrar cada child.

## Normative Docs

- `docs/tasks/in-progress/TASK-725-finance-fiscal-scope-legal-entity-foundation.md` (foundation + patrón canónico).
- `docs/tasks/to-do/TASK-1185-vat-materializer-fiscal-robustness-hardening.md` (hardening del materializador VAT — hermana).
- Skill `greenhouse-finance-accounting-operator` (Chile SII: DTE, F29, F22, PPM, retenciones; tasas vigentes).
- Skill `greenhouse-payroll-auditor` (retención honorarios SII).

## Dependencies & Impact

### Depends on

- TASK-725 (foundation de scope fiscal por entidad legal) — implementado. Es el patrón base.
- `getOperatingEntityIdentity()` / `getOrganizationIssuerIdentityById()` (`src/lib/account-360/organization-identity.ts`) — resolver de entidad legal (singleton hoy; multi-entidad por documento es parte del scope).
- `SII_RETENTION_RATES` (`src/types/hr-contracts.ts`) para retenciones de honorarios.

### Blocks / Impacts

- Cada child reusa el patrón TASK-725; un cambio al foundation (tablas VAT, resolver) impacta el diseño de las posiciones nuevas.
- Multi-país impacta el FX platform y `economic_indicators` (UF/UTM y equivalentes por país).

### Files owned

- Esta umbrella **no implementa código directamente**; coordina child tasks. Los files se declaran en cada child al crearse.
- `docs/tasks/TASK_ID_REGISTRY.md`, `docs/tasks/README.md` (registro de children).

## Current Repo State

### Already exists

- Foundation de scope fiscal por entidad legal (TASK-725): operating entity como dueño fiscal, posición por (entidad, período), signal de drift, readers/endpoint gobernados, degradación honesta. Es el molde a replicar.
- Retención honorarios SII ya modelada en payroll (`SII_RETENTION_RATES`, 15.25% en 2026) — fuente para la posición de retenciones.
- FX/multi-currency platform + `economic_indicators` (UF/UTM) — base para multi-país.

### Gap

- No existen posiciones materializadas de PPM, retenciones (consolidada mensual F29 línea retenciones) ni renta anual F22.
- El modelo de entidad legal es singleton (`is_operating_entity=TRUE`); no hay `legal_entity_organization_id` por documento en income/expenses para multi-entidad real.
- No hay perfiles tributarios por país (régimen, calendario fiscal, monedas) más allá de Chile.

## Backend/Data Contract

> Umbrella — contrato a nivel programa. Cada child hereda este contrato y lo materializa con su propio Backend/Data Contract detallado (tablas, signals, endpoints específicos por posición fiscal).

### Backend/data brief

- Backend rigor: `backend-critical` por child (cada posición fiscal materializa un insumo tributario; sign-off contable requerido). La umbrella no implementa código.
- Impacto principal: `migration` + `command` (cada child crea su tabla de posición + materializador) + `reader` (signals + endpoints)
- Source of truth afectado: nuevas tablas `greenhouse_finance.*` por posición (PPM, retenciones, F22); resolver de entidad legal compartido
- Consumidores afectados: UI Finance, Nexa, CLI (por construcción Full API Parity); ops-worker (materializadores reactivos)
- Runtime target: `worker` (materializadores) + `app` (signals/readers) por child

### Contract surface

- Contrato existente a respetar: patrón canónico de TASK-725 (operating entity como dueño fiscal, posición por (entidad, período), signal de drift, degradación honesta); `SII_RETENTION_RATES` para retenciones.
- Contrato nuevo o modificado: una tabla de posición + materializador + signal de drift + reader/endpoint por sub-capacidad. Definidos en cada child.
- Backward compatibility: `compatible` (additive; no toca el IVA/F29 ya entregado).
- Full API parity: cada posición nace como reader/endpoint gobernado, consumible por todos los consumers (incl. Nexa) por construcción.

### Data model and invariants

- Entidades/tablas afectadas: nuevas por posición fiscal (`[verificar]` nombres en cada child); `income`/`expenses` (lectura + posible `legal_entity_organization_id` por documento en sub-capacidad D); `greenhouse_core.organizations` (resolver).
- Invariantes que no se pueden romper:
  - Scope fiscal = entidad legal (RUT), NUNCA `space_id`/`client_id`.
  - Tasas/parámetros desde SSOT versionada, NUNCA hardcode.
  - Cada posición mantiene su signal de drift steady=0.
  - Multi-entidad se resuelve por documento, no por singleton.
- Tenant/space boundary: posiciones fiscales son de la entidad legal (internas); nunca client-facing.
- Idempotency/concurrency: materializadores DELETE+INSERT por (entidad, período) con advisory lock (heredado del hardening TASK-1185).
- Audit/outbox/history: cada materialización deja `materialized_at` + razón; signals read-only.

### Migration, backfill and rollout

- Migration posture: `additive` por child (tablas de posición nuevas). La umbrella no migra.
- Default state: cada materializador gateado con flag default OFF + shadow (patrón TASK-725).
- Backfill plan: re-materializar períodos por child + validación contable.
- Rollback path: por child — revert PR + redeploy (app + ops-worker), additive.
- External coordination: validación contable + verificación de tasas/reglas vs SII por child; redeploy ops-worker si toca materializador.

### Security and access

- Auth/access gate: readers vía contexto finance (interno); cada endpoint gateado por capability/entitlement si expone acción.
- Sensitive data posture: `finance` (cifras fiscales internas; retenciones pueden tocar honorarios de personas → cuidado PII, ver invariantes payroll).
- Error contract: `canonicalErrorResponse` / `captureWithDomain(err,'finance',...)`.
- Abuse/rate-limit posture: N/A (lecturas internas) salvo endpoints de acción en children.

### Runtime evidence

- Por child: tests focales + re-materialización dev + drift=0 + validación contable + staging request. La umbrella verifica la existencia/calidad de las children.

### Acceptance criteria additions

- [ ] Cada child declara su Backend/Data Contract completo (tablas, signals, endpoints) reusando el patrón TASK-725.
- [ ] Ninguna child hardcodea tasas fiscales.
- [ ] El boundary entidad legal (no `space_id`) se respeta en todas las children.

## Capability Definition of Done — Full API Parity gate

Aplica por child: cada posición fiscal que exponga una acción (recálculo, cierre de período, export) nace con contrato gobernado a nivel capability. La umbrella declara el principio; las children lo cumplen. Lecturas de posición = readers canónicos consumibles por Nexa por construcción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

Umbrella: el alcance se ejecuta como **child tasks**, una por sub-capacidad. Al tomar esta umbrella, el agente crea las children (cada una `implementation`, `backend-data`, con su propio Backend/Data Contract + Rollout + signal de drift), reusando el patrón TASK-725.

### Sub-capacidad A — PPM (Pago Provisional Mensual)

- Posición mensual de PPM por entidad legal: base imponible × tasa PPM vigente, crédito/arrastre. Materializada por (entidad, período), signal de drift, reader/endpoint.

### Sub-capacidad B — Retenciones (honorarios SII + 2da categoría)

- Ledger + posición mensual de retenciones por entidad legal (línea retenciones del F29), reusando `SII_RETENTION_RATES` versionado. NO hardcodear la tasa.

### Sub-capacidad C — Renta Anual F22

- Posición anual (F22) por entidad legal: IDPC, créditos, RAI/REX/SAC, capital propio tributario. Más compleja; probablemente su propia sub-task con sign-off contable.

### Sub-capacidad D — Multi-country / multi-entity tax profiles

- `legal_entity_organization_id` resuelto **por documento** (income/expenses) en vez de singleton; perfil tributario por país (régimen, calendario fiscal, monedas); selector fiscal en Finance cuando haya >1 entidad. Generaliza el foundation de TASK-725.

## Out of Scope

- Implementación de código en esta umbrella (la hacen las children).
- Cambiar el contrato del IVA/F29 ya entregado por TASK-725 (las posiciones nuevas lo reusan, no lo modifican).
- Presentación/envío real a SII (esto materializa el insumo de cada posición, no el filing).
- Asesoría tributaria formal: tasas/umbrales se verifican contra SII por child.

## Detailed Spec

Umbrella — Detailed Spec se delega a cada child. El patrón canónico a replicar (de TASK-725, Delta 2026-06-20 en `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`): (1) scope = entidad legal resuelta server-side; (2) posición materializada por (entidad, período) en tabla dedicada; (3) reliability signal de drift (steady=0) comparando materializado vs Σ fuente; (4) readers + endpoint gobernados con degradación honesta (`canonicalErrorResponse`); (5) tasas/parámetros desde SSOT versionada, nunca hardcode.

## Rollout Plan & Risk Matrix

Umbrella — **impact-only**. Esta task no introduce runtime change por sí misma; el rollout real vive en cada child (cada una con su migración/signal/redeploy según el patrón TASK-725 + ops-worker redeploy si toca materializador).

### Slice ordering hard rule

- D (multi-entity foundation) debería ir **antes o en paralelo temprano** si se confirma multi-RUT, porque cambia el modelo de resolución de entidad para A/B/C. Si Efeonce sigue siendo single-RUT en el corto plazo, A/B/C pueden ir primero sobre el singleton actual y D después.
- C (F22) es la más compleja y de mayor riesgo contable → última, con sign-off de contador.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Tasa fiscal hardcodeada/desactualizada | finance/payroll | medium | usar SSOT versionada (`SII_RETENTION_RATES`, indicadores); verificar vs SII por child | drift signal de la posición |
| Multi-entity introducido tarde fuerza retrabajo de A/B/C | finance | medium | decidir D temprano (single vs multi-RUT) en Discovery de la umbrella | revisión arquitectura |
| Cifra fiscal incorrecta sin validación contable | finance | high | sign-off de contador por posición antes de baseline (como TASK-725 C/F29) | — |

### Feature flags / cutover

Cada child gatea su materializador/posición con flag default OFF + shadow, igual que el patrón TASK-725. La umbrella no introduce flags.

### Rollback plan per slice

Por child: revert PR + redeploy (app + ops-worker si toca materializador), additive por diseño. Detalle en cada child.

### Production verification sequence

Por child: staging → re-materializar dev → drift=0 → validación contable de la cifra → prod. La umbrella se cierra cuando las children core (A, B, D) están complete; C (F22) puede quedar como child independiente posterior.

### Out-of-band coordination required

Validación contable (contador) de cada posición fiscal antes de baseline productivo. Verificación de tasas/reglas vs SII por sub-capacidad.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se crearon child tasks ejecutables para A (PPM), B (Retenciones), C (F22) y D (multi-country/multi-entity), cada una con su Backend/Data Contract + Rollout + signal de drift.
- [ ] Cada child declara explícitamente que reusa el patrón canónico de TASK-725 (scope = entidad legal, no `space_id`).
- [ ] La decisión single-RUT vs multi-RUT (sub-capacidad D timing) quedó resuelta y documentada antes de ejecutar A/B/C.
- [ ] Ninguna child hardcodea tasas fiscales (usan SSOT versionada).
- [ ] La umbrella se cierra cuando las children core (A, B, D) están complete; C puede quedar como follow-up.

## Verification

- Revisión manual (umbrella): existencia + calidad de las child tasks creadas, `pnpm task:lint` verde por child, registro en registry/README.
- La verificación funcional/runtime vive en cada child.

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrar las children core)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados con las children
- [ ] `Handoff.md` actualizado con el programa fiscal
- [ ] chequeo de impacto cruzado (TASK-725 §Follow-ups: marcar PPM/retenciones/F22/multi-country como movidos a esta umbrella)
- [ ] decisión de formalizar como `EPIC-###` tomada (o documentado por qué no)

## Follow-ups

- Formalizar como `EPIC-###` si las children core resultan ser >3 tasks grandes.
- Presentación/envío a SII (más allá del insumo) — fuera de alcance, evaluar a futuro.

## Open Questions

- ¿Efeonce será single-RUT en el corto/mediano plazo, o hay multi-entidad real planeada? Define el timing de la sub-capacidad D (multi-entity foundation) vs A/B/C sobre el singleton.
- ¿Esta umbrella debería formalizarse como `EPIC-###` desde el inicio (si las 4 sub-capacidades son cada una multi-task)?
- ¿Prioridad relativa entre A (PPM), B (Retenciones) y C (F22)? F22 es anual (menos frecuente) pero más complejo; PPM/Retenciones son mensuales (más operativos).
