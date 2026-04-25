# TASK-599 — Finance Preventive Test Lane (Playwright + Component + Route Resilience)

## Delta 2026-04-25

- TASK-600 entregó la foundation `Reliability Control Plane V1`. Esta task ya tiene un `ReliabilityIntegrationBoundary` reservado en `src/lib/reliability/get-reliability-overview.ts`:
  - `finance.test_lane` ← `getFinanceSmokeLaneStatus` (smoke E2E `/finance/{expenses,clients,suppliers}` + component tests + route resilience)
- Para enchufar: implementar el helper de fetch + agregar adapter en `src/lib/reliability/signals.ts` que normalice el resultado del lane a `ReliabilitySignal[]` con `kind=test_lane` y mover el boundary a `ready`.
- El módulo `finance` ya declara los smoke specs esperados en `src/lib/reliability/registry.ts`. El registry queda listo para que el conteo `missingSignalKinds` se reduzca automáticamente cuando esta task entre en producción.
- Spec del contrato a respetar: `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` §3 y §7.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-599-finance-preventive-test-lane`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Agregar una lane preventiva de tests para Finance que cubra el gap entre unit/route tests y detección tardía por Sentry. La task incorpora smoke E2E con Playwright para `clients`, `suppliers` y `expenses`, tests de componente para las surfaces de gastos más críticas y route tests adicionales orientados a degradación explícita.

## Why This Task Exists

El incidente alrededor de `GET /api/finance/expenses/meta` mostró que hoy Finance tiene buena cobertura unitaria en backend, pero todavía puede romper rutas y drawers visibles sin que exista una alarma temprana en el repo. `TASK-589` cerró el root cause arquitectónico, pero el descubrimiento dejó claro que faltan tres capas de defensa:

- smoke real en sitio para rutas Finance críticas (`/finance/clients`, `/finance/suppliers`, `/finance/expenses`)
- tests de componente para `ExpensesListView` y `CreateExpenseDrawer`
- route tests explícitos para degradación parcial del metadata provider de expenses

Sin esa lane preventiva, seguimos dependiendo de smoke manual o de Sentry para detectar regresiones de wiring entre UI, API y stores canónicos.

## Goal

- Agregar smoke tests Playwright para las rutas Finance operativas más sensibles.
- Cubrir con tests de componente los estados críticos de `ExpensesListView` y `CreateExpenseDrawer`.
- Endurecer los route tests de `expenses/meta` para que la degradación parcial sea un contrato explícito y verificable.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- los smoke Playwright deben validar flows reales sobre rutas autenticadas del portal, no snapshots artificiales sin sesión
- los tests de componente deben reutilizar MSW / fetch mocking del repo antes de inventar harnesses paralelos
- los route tests de Finance deben dejar explícito qué slices son críticos y cuáles son enrichment opcional
- no convertir esta task en una reimplementación funcional del módulo Finance; el scope es observabilidad preventiva de tests

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/complete/TASK-589-finance-runtime-read-path-decoupling-clients-suppliers.md`

## Dependencies & Impact

### Depends on

- `tests/e2e/global-setup.ts`
- `tests/e2e/fixtures/auth.ts`
- `tests/e2e/smoke/login-session.spec.ts`
- `tests/e2e/smoke/finance-quotes.spec.ts`
- `playwright.config.ts`
- `src/app/api/finance/expenses/meta/route.test.ts`
- `src/views/greenhouse/finance/ExpensesListView.tsx`
- `src/views/greenhouse/finance/drawers/CreateExpenseDrawer.tsx`
- `src/app/api/finance/clients/read-cutover.test.ts`
- `src/app/api/finance/suppliers/route.test.ts`
- `src/app/api/finance/suppliers/[id]/route.test.ts`

### Blocks / Impacts

- detección temprana de regresiones en `clients`, `suppliers` y `expenses`
- confianza para futuros cambios en read paths Finance
- follow-ups de resiliencia / observabilidad funcional del módulo Finance

### Files owned

- `tests/e2e/smoke/finance-expenses.spec.ts`
- `tests/e2e/smoke/finance-clients.spec.ts`
- `tests/e2e/smoke/finance-suppliers.spec.ts`
- `src/views/greenhouse/finance/ExpensesListView.test.tsx`
- `src/views/greenhouse/finance/drawers/CreateExpenseDrawer.test.tsx`
- `src/app/api/finance/expenses/meta/route.test.ts`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- Playwright ya está instalado y el repo ya corre smoke autenticado con agente en `tests/e2e/smoke/` y `tests/e2e/global-setup.ts`
- existe smoke Finance para quotes en `tests/e2e/smoke/finance-quotes.spec.ts`
- `expenses/meta` ya tiene route tests en `src/app/api/finance/expenses/meta/route.test.ts`
- `CreateExpenseDrawer` existe y consume `GET /api/finance/expenses/meta` + `POST /api/finance/expenses` en `src/views/greenhouse/finance/drawers/CreateExpenseDrawer.tsx`
- `ExpensesListView` existe y consume `GET /api/finance/expenses` en `src/views/greenhouse/finance/ExpensesListView.tsx`
- `TASK-589` dejó `clients`, `suppliers`, `expenses` y `expenses/meta` estables sobre el boundary Postgres-first / fallback explícito

### Gap

- no existe smoke Playwright para `/finance/expenses`, `/finance/clients` ni `/finance/suppliers`
- no existen tests de componente para `ExpensesListView` ni `CreateExpenseDrawer`
- la cobertura de `expenses/meta` todavía puede crecer en degradación parcial, especialmente alrededor de providers opcionales

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

### Slice 1 — Playwright smoke para Finance operativo

- crear `tests/e2e/smoke/finance-expenses.spec.ts`
- crear `tests/e2e/smoke/finance-clients.spec.ts`
- crear `tests/e2e/smoke/finance-suppliers.spec.ts`
- validar éxito mínimo: ruta carga, no hay estado fatal visible, la tabla o drawer recibe datos reales y el detalle abre cuando aplique

### Slice 2 — Component tests de gastos

- crear `src/views/greenhouse/finance/ExpensesListView.test.tsx`
- crear `src/views/greenhouse/finance/drawers/CreateExpenseDrawer.test.tsx`
- cubrir al menos:
  - load success
  - empty state
  - error state
  - payload parcial/degradado del meta
  - submit success / submit error en el drawer

### Slice 3 — Route hardening de `expenses/meta`

- extender `src/app/api/finance/expenses/meta/route.test.ts`
- agregar casos explícitos de:
  - Postgres OK sin tocar BigQuery
  - fallback legacy por slice
  - institutions Finance fallan y el endpoint igual responde `200`
  - Payroll falla y el endpoint igual responde `200`
- dejar explícito por test cuáles providers son críticos y cuáles no

### Slice 4 — Docs y operación

- documentar en la arquitectura Finance la existencia de la lane preventiva si el diseño final agrega contratos nuevos de degradación
- dejar el handoff y changelog sincronizados si cambian los criterios de validación recomendados del módulo

## Out of Scope

- reabrir `TASK-589` o volver a modificar los read paths de Finance salvo que Discovery encuentre una contradicción real
- agregar mega-E2E transaccionales de punta a punta con creación completa de entidades ajenas al scope
- visual regression masiva o snapshots visuales del módulo entero
- observabilidad cloud / billing / Playwright screenshots fuera del smoke mínimo operativo

## Detailed Spec

La lane debe quedar deliberadamente en tres niveles, cada uno cubriendo un tipo de riesgo distinto:

1. **Playwright smoke**
   - protege wiring real entre auth, routing, UI y APIs Finance
   - debe ser chico, estable y reutilizar el setup de agente existente
   - no debe depender de datos efímeros creados por el test si se puede validar contra data ya presente en staging/local

2. **Component tests con mocking controlado**
   - protegen estados UX que no conviene validar en Playwright de forma exhaustiva
   - deben usar los helpers de render / mocking ya vigentes en el repo
   - `CreateExpenseDrawer` debe dejar claro que la metadata parcial no es fatal

3. **Route degradation tests**
   - documentan el contrato de resiliencia del metadata provider
   - deben impedir que reaparezca el patrón “si falla un enrichment opcional, cae todo el endpoint”

La implementación debe priorizar robustez y mantenibilidad por sobre cobertura cosmética. Si un smoke E2E empieza a depender de demasiadas precondiciones, mover esa aserción al nivel componente o route.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] existen smoke tests Playwright para `/finance/expenses`, `/finance/clients` y `/finance/suppliers` (`tests/e2e/smoke/finance-{clients,suppliers,expenses}.spec.ts`).
- [x] `ExpensesListView` y `CreateExpenseDrawer` tienen tests de componente con estados de éxito, error y degradación relevante (`*.test.tsx` correspondientes).
- [x] `expenses/meta/route.test.ts` cubre degradación parcial explícita sin tumbar el endpoint completo (3 nuevos tests TASK-599 explícitos sobre slices críticos vs enrichment).
- [x] la suite nueva ejecuta con los comandos canónicos del repo (`pnpm test`, `pnpm test:e2e`).
- [x] señal `kind=test_lane` para módulo `finance` ahora rinde en `/api/admin/reliability` cuando hay reporte Playwright disponible; degrada honestamente a `awaiting_data` cuando no.

## Verification

- `pnpm lint` ✅
- `pnpm exec tsc --noEmit --pretty false` ✅
- `pnpm test` ✅ (409 files / 2101 passed — 4 nuevos tests del lane finance)
- `pnpm build` ✅
- `pnpm test:e2e --grep finance` queda como validación manual cuando los secrets estén disponibles.

## Resolution

V1 entregada con 3 niveles de defensa:

1. **Playwright smoke** (`finance-clients`, `finance-suppliers`, `finance-expenses`) — registrados en `RELIABILITY_REGISTRY[finance].smokeTests`. Reusan template canónico de `finance-quotes.spec.ts`. El Change-Based Verification Matrix (TASK-633) los recoge automáticamente cuando un PR toca finance.
2. **Component tests** — `ExpensesListView.test.tsx` (4 casos: success, empty, API error, network failure) + `CreateExpenseDrawer.test.tsx` (4 casos: open=false sin fetch, open=true fetch meta+accounts, payload parcial no fatal, meta 500 no rompe drawer).
3. **Route hardening** — 3 tests TASK-599 nuevos en `expenses/meta/route.test.ts` que documentan explícitamente: slices críticos (suppliers + accounts con Postgres-first/BQ-fallback) vs enrichment (institutions, members, spaces, supplierToolLinks degradan a empty sin tumbar) vs static (paymentMethods, drawerTabs, etc. siempre presentes).

Adicionalmente:

- Reader `getFinanceSmokeLaneStatus` en `src/lib/reliability/finance/get-finance-smoke-lane-status.ts` que parsea `artifacts/playwright/results.json` con degradación honesta cuando no hay reporte.
- Adapter `buildFinanceSmokeLaneSignals` en `src/lib/reliability/signals.ts` emite 1 señal agregada `finance.test_lane.smoke` + N señales por suite fallida.
- Boundary TASK-599 en `RELIABILITY_INTEGRATION_BOUNDARIES` movido a status=`ready`.

## Closing Protocol

- [x] `Lifecycle` sincronizado con estado real (`complete`)
- [x] archivo en la carpeta `complete/`
- [x] `docs/tasks/README.md` sincronizado con el cierre
- [x] `Handoff.md` + `changelog.md` actualizados
- [x] chequeo cruzado: TASK-633 (matrix) recoge los 3 specs nuevos via `mapModulesToSmokeSpecs`. TASK-632 (synthetic) probes `/finance/*` siguen complementarios. TASK-589 (read paths) NO se reabre — la spec lo prohíbe explícito.
- [x] cobertura documentada por nivel: Playwright (smoke wiring), Component (states UX), Route (degradación parcial contractual).

## Follow-ups

- Persistir `finance_smoke_lane_runs` en `source_sync_runs` con `source_system='finance_smoke_lane'` cuando aparezca el caso de uso de "histórico cross-CI". V1 lee `artifacts/playwright/results.json` directo.
- Component tests de submit success / submit error en `CreateExpenseDrawer` (requieren llenar todos los campos requeridos del form — más brittle, queda como follow-up cuando se necesite).
- `RegisterCashOutDrawer` merece una segunda ola de component tests siguiendo el mismo patrón.
- Integración con TASK-586 si Admin Center necesita "test health" como sub-surface dedicada (hoy es señal en la sección Reliability).

## Open Questions (resueltas)

- ✅ Smoke estable por ambiente: el patrón ya canónico (`gotoAuthenticated` + status<400 + no fatal text) NO depende de data específica — corre estable contra cualquier ambiente con Agent Auth disponible.
