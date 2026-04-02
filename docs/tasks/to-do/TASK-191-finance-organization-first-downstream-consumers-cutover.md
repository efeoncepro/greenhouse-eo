# TASK-191 - Finance Organization-First Downstream Consumers Cutover

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `51`
- Domain: `finance`
- GitHub Project: `TBD`
- GitHub Issue: `TBD`

## Summary

Follow-on explícito de `TASK-181` para cortar los consumers downstream de Finance que todavía dependen de `clientId` como llave operativa obligatoria. El objetivo no es ocultar el bridge legacy, sino encapsularlo: `organizationId` debe pasar a ser el anchor de entrada para `purchase orders`, `HES`, `cost allocations`, `expenses` y los readers analíticos que hoy todavía excluyen clientes org-first.

## Why This Task Exists

`TASK-181` dejó `Finance Clients` org-first sobre `greenhouse_core.organizations`, pero el runtime sigue mezclando dos contratos:

- el módulo de clientes acepta `organizationId` como identidad canónica;
- varios consumers downstream siguen exigiendo `clientId` en API, UI o materialización analítica.

Hoy eso genera un gap real:

- `Purchase Orders` y `HES` siguen rechazando requests si no llega `clientId`;
- los drawers de Finance filtran la lista para mostrar solo clientes con `clientId` legado;
- `expenses`, `cost_allocations`, `client_economics`, `organization_economics`, `commercial_cost_attribution` y `operational_pl` siguen agregando o filtrando por `client_id` sin una resolución org-aware consistente;
- un cliente canónico visible en `/api/finance/clients` puede quedar inutilizable aguas abajo si el consumer todavía asume `clientId` obligatorio.

Sin esta lane, `TASK-181` queda técnicamente correcta en el entrypoint pero incompleta en la operación real del ecosistema Finance.

## Goal

- Hacer que los consumers downstream de Finance acepten identidad canónica org-first (`organizationId`, con bridges permitidos hacia `clientId` solo donde el storage legacy todavía lo requiera).
- Centralizar la resolución de identidad y scope para que UI/APIs dejen de propagar `clientId` como requisito de entrada cuando ya existe `organizationId`.
- Endurecer readers/materializers analíticos para que los clientes org-first no se pierdan por joins o filtros anclados ciegamente en `client_id`.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- `greenhouse_core.organizations` sigue siendo la fuente canónica para identidad B2B; `client_id` queda solo como bridge de compatibilidad mientras existan tablas legacy que todavía lo persistan.
- Toda query de runtime debe mantener tenant isolation por `space_id` o por bridge organizacional explícito; no se permiten joins ambiguos cross-tenant.
- Nuevos cambios de acceso a base deben usar `query`, `getDb` o `withTransaction` desde `@/lib/db`; no crear pools nuevos ni leer credenciales directo.
- Las métricas y serving cross-module no deben recalcular semántica de negocio inline si ya existe projection/materialización canónica.

## Dependencies & Impact

### Depends on

- `TASK-181` - `Finance Clients` org-first ya implementado y validado
- `TASK-164` - baseline funcional de `Purchase Orders` y `HES`
- `TASK-162` - `commercial_cost_attribution` canónica por cliente
- `greenhouse_finance.purchase_orders`
- `greenhouse_finance.service_entry_sheets`
- `greenhouse_finance.cost_allocations`
- `greenhouse_finance.expenses`
- `greenhouse_finance.client_economics`
- `greenhouse_core.organizations`
- `greenhouse_core.spaces`
- `greenhouse_finance.client_profiles`

### Impacts to

- `TASK-175` - ampliar cobertura de tests para contratos org-first en Finance
- `TASK-176` - fully-loaded cost model depende de bridges consistentes en readers analíticos
- `TASK-167` y `TASK-177` - P&L por organization/business unit hereda los joins correctos
- `TASK-179` - reconciliation y otros follow-ons deben consumir el contrato ya saneado, no reintroducir `clientId` como entrada obligatoria

### Files owned

- `src/app/api/finance/purchase-orders/route.ts`
- `src/app/api/finance/purchase-orders/[id]/route.ts`
- `src/app/api/finance/hes/route.ts`
- `src/app/api/finance/hes/[id]/route.ts`
- `src/app/api/finance/intelligence/allocations/route.ts`
- `src/app/api/finance/expenses/route.ts`
- `src/app/api/finance/expenses/[id]/route.ts`
- `src/lib/finance/purchase-order-store.ts`
- `src/lib/finance/hes-store.ts`
- `src/lib/finance/postgres-store-intelligence.ts`
- `src/lib/finance/postgres-store-slice2.ts`
- `src/lib/finance/expense-scope.ts`
- `src/lib/account-360/organization-economics.ts`
- `src/lib/cost-intelligence/compute-operational-pl.ts`
- `src/lib/commercial-cost-attribution/member-period-attribution.ts`
- `src/views/greenhouse/finance/drawers/CreatePurchaseOrderDrawer.tsx`
- `src/views/greenhouse/finance/drawers/CreateHesDrawer.tsx`
- `src/views/greenhouse/finance/drawers/CreateExpenseDrawer.tsx`
- `docs/tasks/in-progress/TASK-181-finance-clients-organization-canonical-source.md`

## Current Repo State

### Ya existe

- `/api/finance/clients` ya lee y escribe org-first sobre `greenhouse_core.organizations`.
- `resolveFinanceClientContext()` ya resuelve `organizationId`, `clientId`, `clientProfileId`, `hubspotCompanyId` y `spaceId`.
- `purchase_orders` y `service_entry_sheets` ya tienen columna `organization_id`.
- `CreateIncomeDrawer` ya soporta selección org-first y preserva `clientId` solo cuando existe bridge disponible.

### Gap actual

- `purchase-orders` sigue exigiendo `clientId` en query y create path.
- `hes` sigue exigiendo `clientId` en query y create path.
- `CreatePurchaseOrderDrawer` y `CreateHesDrawer` excluyen clientes que no tengan `clientId`.
- `intelligence/allocations` y su store siguen aceptando `clientId` como única llave de lectura/escritura.
- `CreateExpenseDrawer` sigue propagando `clientId` y `allocatedClientId` desde el espacio seleccionado.
- fallbacks analíticos (`organization-economics`, `client_economics`, `operational_pl`, `commercial_cost_attribution`) todavía agregan por `client_id` sin bridge org-aware consistente.

## Scope

### Slice 1 - Canonical Contract Inventory

- Formalizar el contrato de entrada downstream: `organizationId | clientId | clientProfileId | hubspotCompanyId`, reutilizando `resolveFinanceClientContext()`.
- Auditar DTOs, requests y tests que todavía marcan `clientId` como obligatorio cuando ya existe contexto organizacional.
- Definir explícitamente dónde `clientId` sigue siendo storage bridge y dónde deja de ser input contract.

### Slice 2 - Purchase Orders y HES Org-First

- Actualizar APIs y stores de `purchase-orders` y `hes` para aceptar `organizationId` como anchor de entrada.
- Permitir que los drawers operen con clientes org-first y resuelvan internamente el bridge legado cuando exista.
- Fallar cerrado con error accionable cuando un flujo realmente necesite bridge legado persistente y el runtime no pueda derivarlo.

### Slice 3 - Expenses y Cost Allocations

- Centralizar la resolución de scope/canonical identity para que `expenses` y `allocations` no requieran `clientId` crudo desde UI.
- Ajustar `CreateExpenseDrawer` y los routes/store de allocations para aceptar identidad org-first sin romper tablas legacy que todavía persisten `client_id`.
- Mantener el bridge `allocated_client_id` solo como detalle de persistencia, no como contrato de entrada.

### Slice 4 - Readers Analíticos y Materializers

- Endurecer `organization-economics`, `postgres-store-intelligence`, `operational_pl` y `commercial_cost_attribution` para que los clientes org-first no desaparezcan por joins directos a `client_id`.
- Documentar y aislar los readers que sigan siendo client-based por contrato histórico de serving.
- Evitar que snapshots o agregaciones mezclen organizations distintas por falta de bridge explícito.

### Slice 5 - Tests, Docs y Cutover Notes

- Actualizar tests unitarios/integración de los consumers tocados.
- Actualizar arquitectura viva y notas de cutover donde el contrato downstream cambie.
- Dejar inventario explícito del residual legacy que todavía persista `client_id` por diseño y no por omisión.

## Out of Scope

- Eliminar físicamente columnas `client_id` del schema Finance en esta lane.
- Reescribir por completo el modelo de `commercial_cost_attribution` a `organization_id` si el serving vigente sigue siendo por cliente.
- Mezclar este trabajo con reconciliación bancaria o cleanup BigQuery de `TASK-179`.
- Cambiar rutas, branding o UX no relacionados con el contrato de identidad downstream.

## Acceptance Criteria

- [ ] `purchase-orders` deja de exigir `clientId` como único input contract y acepta contexto org-first.
- [ ] `hes` deja de exigir `clientId` como único input contract y acepta contexto org-first.
- [ ] `CreatePurchaseOrderDrawer` y `CreateHesDrawer` ya no excluyen clientes solo por carecer de `clientId` en la capa de presentación.
- [ ] `intelligence/allocations` puede resolver contexto canónico sin depender exclusivamente de `clientId` crudo en la request.
- [ ] `expenses` puede derivar el bridge cliente/scope desde `organizationId` o `spaceId` sin requerir que la UI empuje `clientId` manualmente.
- [ ] Los fallbacks/readers analíticos relevantes no silencian clientes org-first por filtros o joins directos a `client_id`.
- [ ] Los errores residuales donde el bridge legacy siga siendo necesario son explícitos, accionables y documentados.
- [ ] `pnpm lint` pasa.
- [ ] `pnpm build` pasa.
- [ ] Existe cobertura de tests suficiente para los contratos org-first tocados.

## Verification

- `pnpm lint`
- `pnpm build`
- `pnpm exec vitest run src/app/api/finance/clients/read-cutover.test.ts`
- `pnpm exec vitest run src/lib/finance/canonical.test.ts`
- `pnpm exec vitest run src/app/api/finance/purchase-orders/*.test.ts src/app/api/finance/hes/*.test.ts src/app/api/finance/expenses/*.test.ts`
- Smoke manual:
  - crear OC para un cliente org-first
  - crear HES para un cliente org-first
  - registrar expense imputado por `space`
  - consultar allocations/economics sin pérdida del cliente resuelto

## Follow-ups

- Si después del cutover siguen existiendo tablas Finance que requieran `client_id` no nullable sin bridge derivable, abrir una lane específica de schema evolution en vez de seguir propagando el requisito a UI/API.
- Revaluar luego si `client_economics` y `commercial_cost_attribution` ameritan una evolución formal a `organization_id` como scope persistido.
