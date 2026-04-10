# TASK-306 — Shareholder Account Canonical Traceability & Cross-Module Linkage

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Cerrada`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `feature/codex-task-306-canonical-traceability`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cerrar el gap enterprise del módulo de Cuenta Corriente Accionista para que sus movimientos no dependan de IDs manuales escritos a mano. La CCA debe resolver vínculos canónicos contra `expenses`, `income`, `income_payments`, `expense_payments` y `settlement_groups`, con validación tenant-scoped, UX de búsqueda real y read models navegables.

## Why This Task Exists

El runtime actual de CCA ya está operativo, pero la trazabilidad cruzada no quedó enterprise: el drawer de movimientos usa campos libres para `expense_id`, `income_id`, `payment_id` y `settlement_group_id`; el backend persiste esas referencias sin validar la existencia real del documento/pago; `payment_id` es ambiguo sin `linkedPaymentType`; y `settlement_group_id` ni siquiera gobierna el flujo porque el store siempre crea uno nuevo.

Esto rompe la promesa de sinergia con el ecosistema Greenhouse: la CCA sí reutiliza settlement y balances, pero sus vínculos con otros módulos siguen siendo débiles, poco navegables y no confiables para auditoría o automatización.

## Goal

- Reemplazar la trazabilidad manual por un contrato canónico de origen para movimientos CCA
- Conectar la CCA con `expenses`, `income`, `payments` y `settlement` mediante lookups y validación server-side
- Dejar el módulo listo para escalar a workflows cross-module sin duplicar identidad ni semánticas de caja

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/schema-snapshot-baseline.sql` como baseline historico, pero validar contra migraciones recientes de Finance/Settlement/CCA

Reglas obligatorias:

- Los vínculos de CCA deben ser tenant-safe y filtrar por `space_id` cuando la entidad vinculada sea tenant-scoped
- Cuando la entidad origen no tenga `space_id` directo (caso actual de `income`), el tenant scope debe resolverse por sus anclas canónicas (`client_id`, `client_profile_id`, `organization_id`) en vez de asumir columna local
- `settlement_group_id` debe ser derivado por backend o resuelto desde el origen real; no debe quedar como campo libre editable
- No introducir identidades paralelas ni shortcuts fuera de `@/lib/db`
- La solución debe distinguir claramente documento (`income` / `expense`) de caja (`income_payment` / `expense_payment`) y no mezclar ambas semánticas
- Si el contrato actual de `shareholder_account_movements` no escala, la task puede evolucionarlo mediante migración versionada en `greenhouse_finance`
- Los readers actuales de `cash-in`, `cash-out`, payments y settlement pueden servir como referencia funcional, pero no deben reutilizarse como validadores tenant-safe sin endurecer explícitamente sus filtros de scope

## Normative Docs

- `docs/tasks/complete/TASK-284-shareholder-current-account.md`
- `docs/tasks/in-progress/TASK-224-finance-document-vs-cash-semantic-contract.md` `[verificar]`

## Dependencies & Impact

### Depends on

- `src/lib/finance/shareholder-account/store.ts`
- `src/app/api/finance/shareholder-account/[id]/movements/route.ts`
- `src/views/greenhouse/finance/shareholder-account/RegisterShareholderMovementDrawer.tsx`
- `src/views/greenhouse/finance/shareholder-account/ShareholderAccountDetailDrawer.tsx`
- `src/lib/finance/payment-ledger.ts`
- `src/lib/finance/expense-payment-ledger.ts`
- `src/lib/finance/settlement-orchestration.ts`
- `src/app/api/finance/cash-in/route.ts`
- `src/app/api/finance/cash-out/route.ts`

### Blocks / Impacts

- Runtime real de `TASK-284` — la CCA deja de depender de texto libre para trazabilidad
- `TASK-283` Banco/Tesorería — mejora consistencia del instrumento `shareholder_account` con el settlement layer
- `TASK-224` documento vs caja — la CCA debe alinearse con ese contrato, no degradarlo
- Futuras automatizaciones desde detalle de gasto, ingreso o pago hacia CCA

### Files owned

- `src/lib/finance/shareholder-account/store.ts`
- `src/app/api/finance/shareholder-account/[id]/movements/route.ts`
- `src/views/greenhouse/finance/shareholder-account/RegisterShareholderMovementDrawer.tsx`
- `src/views/greenhouse/finance/shareholder-account/ShareholderAccountDetailDrawer.tsx`
- `src/views/greenhouse/finance/shareholder-account/types.ts`
- `src/views/greenhouse/finance/shareholder-account/utils.ts`
- `src/app/api/finance/shareholder-account/[nuevo-lookup-routes]/` `[verificar]`
- `migrations/*shareholder-account*traceability*.sql` `[nuevo]`

## Current Repo State

### Already exists

- El subdominio CCA ya existe y registra movimientos append-only:
  - `src/lib/finance/shareholder-account/store.ts`
- La route de alta de movimientos ya existe:
  - `src/app/api/finance/shareholder-account/[id]/movements/route.ts`
- El drawer actual permite capturar trazabilidad manual:
  - `src/views/greenhouse/finance/shareholder-account/RegisterShareholderMovementDrawer.tsx`
- El detalle actual renderiza vínculos como texto plano:
  - `src/views/greenhouse/finance/shareholder-account/ShareholderAccountDetailDrawer.tsx`
- La arquitectura Finance ya reconoce la CCA como instrumento integrado a treasury y settlement:
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- Ya existen los módulos y readers que deberían fungir como source of truth:
  - `expenses`
  - `income`
  - `income_payments`
  - `expense_payments`
  - `settlement_groups`
- Fuente real del DDL vigente para esta lane:
  - `migrations/20260408103211338_finance-reconciliation-ledger-orchestration.sql`
  - `migrations/20260409002455606_shareholder-current-account-schema.sql`

### Gap

- `expense_id`, `income_id`, `payment_id` y `settlement_group_id` hoy son inputs libres en UI; no vienen de otros módulos
- El backend persiste `linkedExpenseId`, `linkedIncomeId` y `linkedPaymentId` sin validar existencia ni compatibilidad cross-module
- `payment_id` queda ambiguo porque el drawer no pide `linkedPaymentType`, aunque el backend sí lo soporta
- `settlement_group_id` del drawer no gobierna el flujo real: la route no lo pasa al store y el store crea un `settlementGroupId` nuevo en cada movimiento
- El detalle CCA no resuelve labels ni links navegables al módulo origen; solo muestra IDs crudos
- El modelo actual no expresa bien un origen canónico de movimiento (`manual`, `expense`, `income`, `expense_payment`, `income_payment`, `settlement_group`)
- `schema-snapshot-baseline.sql` no refleja todavía las tablas nuevas de CCA ni settlement; para esta task debe tratarse como referencia histórica y no como contrato suficiente por sí solo
- Los readers actuales de pagos/caja no aplican tenant isolation en SQL, por lo que no deben reutilizarse tal cual para validar referencias CCA

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

### Slice 1 — Canonical reference contract

- Formalizar un contrato canónico de origen para movimientos CCA
- Evaluar y ejecutar el refactor de schema más robusto:
  - `source_type` + `source_id`
  - y/o tabla de links secundarios si hace falta soportar múltiples referencias
- Mantener backwards compatibility razonable para datos ya cargados en staging/dev

### Slice 2 — Server validation and lookup APIs

- Validar server-side que toda referencia vinculada exista realmente y sea visible para el tenant
- Resolver automáticamente `linkedPaymentType` cuando el origen sea un pago
- Quitar del contrato mutante cualquier campo libre que backend deba derivar (`settlement_group_id`)
- Crear lookup APIs tenant-scoped para buscar:
  - gastos
  - ingresos
  - pagos
  - settlement groups, solo si el caso de uso lo justifica

### Slice 3 — Enterprise drawer UX

- Reemplazar los campos de texto libre por selectores/buscadores reales
- Mostrar campos contextuales según `movement_type`
- Dejar el drawer capaz de abrirse:
  - manual
  - precontextualizado desde otros módulos
- Hacer explícita la diferencia entre:
  - documento origen
  - pago origen
  - settlement derivado

### Slice 4 — Enriched read model

- Hacer que el detalle de cuenta devuelva y renderice vínculos enriquecidos:
  - label humano
  - estado
  - tipo de entidad
  - href navegable
- Evitar mostrar IDs crudos como UX principal

### Slice 5 — Cross-module entry points

- Agregar entry points desde superficies relevantes de Finance:
  - detalle de gasto
  - detalle de ingreso
  - cash-in / cash-out
  - settlement / conciliación si aplica
- Permitir crear un movimiento CCA desde el contexto del documento/pago real, no desde un drawer aislado

## Out of Scope

- Aportes de capital / equity accounting completo
- Reglas tributarias o contables especiales de accionistas
- Préstamos formales con cuotas, intereses o amortización
- Conciliación bancaria automática específica de CCA
- Reabrir la arquitectura completa de Banco/Tesorería fuera de lo necesario para el vínculo CCA

## Detailed Spec

### Contrato objetivo

La solución enterprise no debe depender de cuatro campos de texto libres. Debe existir una referencia canónica de origen del movimiento CCA.

Dirección preferida:

- `source_type`
- `source_id`

Donde `source_type` sea uno de:

- `manual`
- `expense`
- `income`
- `expense_payment`
- `income_payment`
- `settlement_group`

Si se requiere preservar vínculos secundarios, agregar una tabla auxiliar tipo:

- `greenhouse_finance.shareholder_account_movement_links`

con:

- `movement_id`
- `link_type`
- `linked_entity_id`
- metadata mínima de resolución

### Reglas de resolución

- `settlement_group_id` no debe ser capturado manualmente cuando el backend lo deriva o lo puede resolver a partir del origen
- si el usuario selecciona un `payment_id`, backend debe resolver:
  - si es `income_payment` o `expense_payment`
  - documento padre
  - `settlement_group_id` si existe
- si el usuario selecciona un `expense` o `income`, la UI no debe obligarlo a memorizar IDs de pago relacionados

### Reglas UX

- No usar `CustomTextField` simple para referencias cross-module
- Usar búsqueda remota / autocomplete con labels semánticos
- Cada selector debe mostrar al menos:
  - ID
  - descripción corta
  - monto
  - moneda
  - fecha
  - estado

### Regla de tenant isolation

- Toda búsqueda y validación debe respetar `space_id`
- Si una entidad no pertenece al tenant visible, debe rechazarse aunque el ID exista

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Los movimientos CCA ya no dependen de inputs manuales de IDs para trazabilidad cross-module
- [ ] El backend valida existencia y compatibilidad de toda referencia vinculada antes de persistir el movimiento
- [ ] `payment_id` deja de ser ambiguo: el sistema resuelve o captura explícitamente el tipo de pago de forma canónica
- [ ] `settlement_group_id` deja de ser un input libre en la UI si el backend lo deriva
- [ ] El detalle CCA muestra vínculos enriquecidos y navegables, no solo IDs crudos
- [ ] Existe al menos un entry point cross-module desde Finance hacia CCA

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- validación manual en `/finance/shareholder-account`
- validación manual desde al menos una superficie origen (`expense`, `income`, `cash-in` o `cash-out`)

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` si cambia el contrato canónico de referencia de movimientos CCA
- [ ] Actualizar la task `TASK-284` con un delta si este follow-on corrige supuestos que quedaron obsoletos en su spec

## Follow-ups

- Evaluar si la CCA debe tener un feed consolidado “orígenes vinculados” reutilizable para futuras superficies de equity / préstamos / director-related balances

## Open Questions

- Confirmar si conviene una migración directa a `source_type/source_id` o una fase intermedia compat con `linked_*` antes de la limpieza total
