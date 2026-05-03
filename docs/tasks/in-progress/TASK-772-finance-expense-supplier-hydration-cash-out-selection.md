# TASK-772 — Finance Expense Supplier Hydration & Cash-Out Selection Integrity

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `—`
- Status real: `Implementación`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none` (TASK-771 cerrada 2026-05-03, scope desbloqueado)
- Branch: `develop` (instrucción explícita 2026-05-03 — no crear branch dedicado)
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Corregir la cadena Finance `Registrar obligacion -> Compras -> Registrar pago` para que una obligacion asociada a proveedor muestre siempre el proveedor real, sea visible inmediatamente en compras, aparezca correctamente en el selector de pagos y preserve la semantica de monto/moneda original vs CLP. El incidente visible es Figma: el supplier existe (`figma-inc` / `Figma`) pero la obligacion queda con `supplierName=null`, se esconde en pagos bajo "Sin proveedor" y puede mezclar monto CLP con moneda USD.

## Why This Task Exists

El flujo actual permite registrar una obligacion con `supplierId`, pero el write/read path de expenses no hidrata `supplierName` desde `greenhouse_finance.suppliers`. Eso rompe dos superficies operativas:

- `/finance/expenses` no muestra la obligacion de forma confiable arriba porque la API ordena por fecha canonica pero la tabla reordena client-side por `paymentDate`.
- `/finance/cash-out` agrupa documentos pendientes por `supplierName || 'Sin proveedor'`, por lo que obligaciones con `supplierId` valido pero `supplierName=null` quedan escondidas en "Sin proveedor".
- el drawer de pago calcula `pendingAmount` con `totalAmountClp`, pero conserva `currency` del documento; en obligaciones USD puede mostrar CLP como si fuera USD.

Este fix debe ser robusto y no un parche visual: el backend debe exponer un contrato consistente para supplier display e importes, y la UI debe consumir ese contrato sin recomputar semantica financiera frágil.

## Goal

- Hidratar proveedor de forma canónica en expenses cuando existe `supplierId`.
- Asegurar que Compras muestre obligaciones recién creadas con fecha/sort coherente para obligaciones.
- Asegurar que Registrar pago agrupe y seleccione por proveedor real, no por `supplierName` nullable.
- Separar monto pendiente en moneda original y equivalente CLP para pagos, evitando mezclar `totalAmountClp` con `currency`.
- Agregar tests de regresión con el caso Figma/manual supplier USD.

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
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/tasks/complete/TASK-766-finance-clp-currency-reader-contract.md`
- `docs/tasks/complete/TASK-768-finance-expense-economic-category-dimension.md`
- `docs/tasks/in-progress/TASK-771-finance-supplier-write-decoupling-bq-projection.md`

Reglas obligatorias:

- No tocar ni duplicar el scope de `TASK-771`: supplier write decoupling y BQ provider projection pertenecen a esa task.
- `greenhouse_finance.suppliers` sigue siendo el perfil financiero/pagable; `greenhouse_core.providers` es la identidad vendor reusable.
- `supplierName` en expenses no puede quedar como unica fuente de verdad si existe `supplierId`; debe ser snapshot legible o display hidratado desde supplier.
- Registrar obligacion pendiente no rebaja banco/tarjeta; solo `expense_payments` y settlement/ledger canónico deben afectar pagos/saldos.
- No reintroducir matematica FX ad hoc: respetar el contrato de `TASK-766` y separar monto documento vs monto CLP.
- No recalcular métricas inline en UI; el backend debe entregar un contrato claro.

## Normative Docs

- `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- `docs/manual-de-uso/finance/sugerencias-asistidas-conciliacion.md`
- `docs/tasks/complete/TASK-599-finance-preventive-test-lane.md`
- `docs/tasks/complete/TASK-701-payment-provider-catalog-greenhouse-as-platform.md`

## Dependencies & Impact

### Depends on

- `src/app/api/finance/expenses/route.ts`
- `src/app/api/finance/expenses/[id]/payments/route.ts`
- `src/lib/finance/postgres-store-slice2.ts`
- `src/views/greenhouse/finance/ExpensesListView.tsx`
- `src/views/greenhouse/finance/drawers/CreateExpenseDrawer.tsx`
- `src/views/greenhouse/finance/drawers/RegisterCashOutDrawer.tsx`
- `src/app/api/finance/expenses/meta/route.ts`
- `src/app/api/finance/suppliers/route.ts` solo como consumer contract; no editar si `TASK-771` sigue activa

### Blocks / Impacts

- Operacion diaria de compras y pagos proveedores en `/finance/expenses` y `/finance/cash-out`.
- Flujo de pago contra tarjeta/cuenta (`santander-corp-clp`) para obligaciones registradas manualmente.
- `TASK-752` Payment Profiles V2, porque el selector de beneficiarios/proveedores debe ser confiable antes de expandir perfiles de pago.
- `TASK-756` auto-generacion de Payment Orders, porque supplier display y amounts deben ser canónicos antes de automatizar órdenes.

### Files owned

- `src/app/api/finance/expenses/route.ts`
- `src/lib/finance/postgres-store-slice2.ts`
- `src/views/greenhouse/finance/ExpensesListView.tsx`
- `src/views/greenhouse/finance/drawers/CreateExpenseDrawer.tsx`
- `src/views/greenhouse/finance/drawers/RegisterCashOutDrawer.tsx`
- `src/views/greenhouse/finance/ExpensesListView.test.tsx`
- `src/views/greenhouse/finance/drawers/CreateExpenseDrawer.test.tsx`
- `src/views/greenhouse/finance/drawers/RegisterCashOutDrawer.test.tsx` si no existe, crear
- `src/app/api/finance/expenses/route.test.ts` o tests equivalentes del route/reader
- docs funcionales/manuales de finance si cambia copy o flujo visible

## Current Repo State

### Already exists

- `POST /api/finance/expenses` crea obligaciones manuales y acepta `supplierId`.
- `GET /api/finance/expenses` lista documentos pendientes y pagados desde Postgres-first.
- `RegisterCashOutDrawer` consume `/api/finance/expenses?pageSize=200&status=pending,partial` para elegir proveedor/documento.
- `POST /api/finance/expenses/[id]/payments` registra pagos reales; si no existe payment, la obligacion no rebaja banco/tarjeta.
- `TASK-766` ya dejó helper/VIEW canónica para evitar inflar CLP por FX.

### Gap

- `CreateExpenseDrawer` manda `supplierId`, pero no manda `supplierName`; el backend no hidrata snapshot/display desde `greenhouse_finance.suppliers`.
- `listFinanceExpensesFromPostgres` selecciona `supplier_name` directo desde `greenhouse_finance.expenses`, sin join/fallback a suppliers.
- `RegisterCashOutDrawer` agrupa por `supplierName || 'Sin proveedor'`, escondiendo documentos con `supplierId` valido.
- `RegisterCashOutDrawer` calcula `pendingAmount` con `totalAmountClp` mientras conserva `currency`, mezclando importes CLP con moneda original.
- `ExpensesListView` inicializa sorting client-side por `paymentDate desc`, lo que puede ocultar obligaciones recién creadas cuando su fecha de pago difiere de `documentDate/createdAt`.

### Runtime Evidence — Figma 2026-05-03

Verificado en staging con `pnpm staging:request`:

- `GET /api/finance/suppliers?pageSize=20` contiene supplier:
  - `supplierId=figma-inc`
  - `providerId=figma`
  - `legalName=Figma, Inc`
  - `tradeName=Figma`
  - `country=US`
  - `paymentCurrency=USD`
- `GET /api/finance/expenses/EXP-202604-008` contiene:
  - `supplierId=figma-inc`
  - `supplierName=null`
  - `description=Pago mensual - Figma`
  - `currency=USD`
  - `totalAmount=92.9`
  - `totalAmountClp=83773.5`
  - `paymentStatus=pending`
  - `paymentAccountId=santander-corp-clp`
- `GET /api/finance/expenses/EXP-202604-008/payments` devuelve `payments=[]`, `totalPaid=0`, `paymentCount=0`.
- Resultado esperado: Figma debe aparecer como proveedor en Compras y Registrar pago, pero no debe rebajar Santander Corp hasta que se registre un `expense_payment`.

## Canonical Solution — robusta, segura, resiliente y escalable

La solucion canónica NO es corregir strings en UI ni meter excepciones para Figma. La solucion debe endurecer el contrato completo de `Expense` para que cualquier proveedor manual, Nubox, internacional o futuro Payment Profile se comporte igual.

### 1. Source of truth y snapshots

- `greenhouse_finance.suppliers` es la fuente canónica del perfil financiero/pagable del proveedor.
- `greenhouse_core.providers` sigue siendo la identidad vendor reusable cross-module y queda fuera del scope de esta task salvo lectura indirecta.
- `greenhouse_finance.expenses.supplier_id` es la FK/relación operacional.
- `greenhouse_finance.expenses.supplier_name` debe tratarse como **snapshot legible/auditable**, no como fuente única de verdad.
- Al crear o actualizar una expense con `supplierId`, el backend debe resolver el display name desde `greenhouse_finance.suppliers` y persistir `supplier_name = COALESCE(trade_name, legal_name)` cuando no venga un snapshot explícito.
- Los readers deben seguir siendo resilientes ante datos legacy: si `expense.supplier_name` está nulo pero `supplier_id` existe, deben hacer fallback por join a `suppliers.trade_name/legal_name`.

Rationale: snapshot persistido protege auditoría histórica y exports; fallback por join protege datos legacy, backfills incompletos y errores transitorios de writers.

### 2. Expense API contract estable

Extender el contrato de `GET /api/finance/expenses` y `GET /api/finance/expenses/[id]` con campos derivados explícitos, sin romper los existentes:

- `supplierId`
- `supplierName` — snapshot legacy/auditable.
- `supplierDisplayName` — display canónico resolviendo `expense.supplier_name -> suppliers.trade_name -> suppliers.legal_name -> null`.
- `documentDate`
- `paymentDate`
- `createdAt`
- `sortDate` — fecha canónica de display/listado: `documentDate ?? paymentDate ?? createdAt`.
- `totalAmount` — monto en moneda del documento.
- `totalAmountClp` — equivalente CLP persistido/resuelto.
- `amountPaid` — monto pagado en moneda del documento, si el reader lo puede resolver con seguridad.
- `amountPaidClp` — monto pagado equivalente CLP usando readers canónicos TASK-766, si aplica.
- `pendingAmount` — saldo pendiente en moneda del documento.
- `pendingAmountClp` — saldo pendiente equivalente CLP.

Regla: si el backend no puede resolver `amountPaid` en moneda documento sin introducir matematica FX ad hoc, debe exponer `amountPaidClp/pendingAmountClp` y dejar `amountPaid/pendingAmount` documentados como best-effort o nulos hasta que el reader canónico los soporte. No inventar conversiones en UI.

Rationale: la UI no debe inferir semántica financiera desde campos ambiguos. El contrato debe decir qué monto es original, qué monto es CLP y qué fecha ordena la obligación.

### 3. Reader Postgres-first con fallback seguro

`listFinanceExpensesFromPostgres` y el detail reader deben preferir una consulta con `LEFT JOIN greenhouse_finance.suppliers s ON s.supplier_id = e.supplier_id`, exponiendo:

```sql
COALESCE(e.supplier_name, s.trade_name, s.legal_name) AS supplier_display_name
```

Si se decide persistir snapshot en write path, usar una lectura previa del supplier dentro de la misma transacción cuando sea viable. Si no se puede por compatibilidad, al menos el read path debe hidratarlo.

Rationale: Postgres-first es el runtime actual. La hidratación en reader hace que la reparación sea inmediata para datos existentes como Figma; la hidratación en writer evita volver a crear filas incompletas.

### 4. UI consume contrato, no reinterpreta finanzas

`ExpensesListView` debe:

- mostrar `supplierDisplayName ?? supplierName ?? '—'`
- respetar `sortDate`/orden server-side, o inicializar sort client-side por `sortDate`, no por `paymentDate`
- conservar `paymentDate` como dato visible del pago/fecha esperada, pero no como única fecha de la obligación
- refrescar tras `onSuccess` y mantener visible el registro recién creado si está en la primera página server-side

`RegisterCashOutDrawer` debe:

- agrupar por clave estable `supplierKey = supplierId ?? supplierDisplayName ?? supplierName ?? '__unassigned__'`
- mostrar label `supplierDisplayName ?? supplierName ?? 'Sin proveedor'`
- usar fallback "Sin proveedor" solo cuando no haya `supplierId` ni display name
- mostrar documento con descripción, fecha y saldo en moneda original + equivalente CLP separado
- no usar `totalAmountClp` como `pendingAmount` si `currency !== 'CLP'`

Rationale: esto elimina el bug sistémico donde un `supplierId` válido desaparece bajo "Sin proveedor" y evita errores de pago por confundir CLP con USD.

### 5. Payment semantics explícita

- Registrar obligación pendiente crea deuda/cuenta por pagar; no rebaja tarjeta/banco.
- `paymentAccountId` en la obligation es instrumento sugerido/esperado, no movimiento real.
- Solo `POST /api/finance/expenses/[id]/payments` crea `expense_payment` y habilita rebaja/settlement en los readers de pagos.
- El drawer de pagos debe mostrar que está pagando una obligación existente y que la rebaja ocurre al guardar el payment real.

Rationale: separa devengo/obligación de caja/settlement y evita que una UI ambigua haga pensar que se movió la tarjeta cuando no existe `expense_payment`.

### 6. Tests y regresión

La task debe cubrir mínimo:

- reader: `supplier_id` válido + `supplier_name=NULL` + supplier existente => `supplierDisplayName='Figma'`
- writer: crear expense con `supplierId=figma-inc` persiste o retorna display canónico
- expenses UI: Figma aparece como proveedor y no queda oculto por sort de `paymentDate`
- cash-out UI: Figma aparece como grupo propio, no bajo "Sin proveedor"
- cash-out amounts: documento USD muestra `USD 92.90` y CLP separado, no `USD 83.773,50`
- payments endpoint: sin payment real, `/payments` sigue vacío y no hay rebaja de tarjeta

Rationale: el bug no es uno solo, es una cadena. Si se testea solo un componente, vuelve a romperse en otra superficie.

### 7. Coordinación con TASK-771

- `TASK-771` arregla el write decoupling de suppliers y BQ projection.
- `TASK-772` arregla consumers de expenses/cash-out y el contrato de obligation/payment selection.
- No editar `src/app/api/finance/suppliers/**` en esta task mientras `TASK-771` siga activa, salvo acuerdo explícito en `Handoff.md`.
- Si `TASK-771` cambia el contrato de suppliers, `TASK-772` debe revalidar discovery y adaptar el reader, no revertir cambios de Claude.

Rationale: evita conflicto multi-agente y mantiene límites claros entre crear proveedor y consumir proveedor en obligaciones/pagos.

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

### Slice 1 — Supplier display hydration contract

- Extender el reader/list endpoint de expenses para resolver `supplierDisplayName` desde `supplierId` cuando `supplier_name` sea nulo.
- Evaluar si el write path debe persistir `supplierName` snapshot al crear obligacion; si lo hace, debe usar una lectura canónica de `greenhouse_finance.suppliers`.
- No editar `POST /api/finance/suppliers` mientras `TASK-771` esté activa salvo coordinación explícita.
- Agregar test para `supplierId=figma-inc` con `supplier_name=null` y supplier existente `trade_name=Figma`.

### Slice 2 — Compras list sorting and visibility

- Corregir el sort inicial de `ExpensesListView` para usar fecha canónica visible (`documentDate ?? paymentDate ?? createdAt`) o respetar el orden server-side.
- Añadir campos mínimos al tipo UI si faltan (`documentDate`, `createdAt`, `supplierDisplayName`) sin romper columnas existentes.
- Asegurar que una obligacion recién creada aparezca arriba o sea inmediatamente visible/seleccionable después de `onSuccess`.

### Slice 3 — Cash-out supplier grouping and document selection

- Cambiar `RegisterCashOutDrawer` para agrupar por identidad estable:
  - `supplierId` si existe
  - `supplierDisplayName` / `supplierName` como label
  - fallback "Sin proveedor" solo cuando no exista `supplierId` ni display name.
- Mostrar documentos pendientes con proveedor real aunque el snapshot legacy venga nulo.
- Agregar estado de degradación claro si hay `supplierId` pero no se puede hidratar display.

### Slice 4 — Amount and currency integrity in payment drawer

- Separar `pendingAmount` en moneda del documento vs `pendingAmountClp`.
- Para documentos USD, mostrar `USD 92.90` como monto del documento y `$83.774 CLP` como equivalente, no mezclar `totalAmountClp` con `currency=USD`.
- Validar el POST de pago contra el monto correcto esperado por `recordExpensePayment` y el contrato de `TASK-766`.
- Agregar tests para pago de obligacion USD con cuenta CLP/tarjeta CLP y tipo de cambio explícito/opcional.

### Slice 5 — Regression tests and docs

- Cubrir route/reader y componentes con caso Figma manual supplier.
- Actualizar documentación funcional/manual si cambia el lenguaje de "Fecha de pago", "Pagado desde", "monto pendiente" o el flujo recomendado.
- Dejar `Handoff.md` con evidencia de staging antes/después si se valida en vivo.

## Out of Scope

- No resolver el error genérico al crear proveedores; eso pertenece a `TASK-771`.
- No construir Organization Workspace ni Provider Workspace.
- No cambiar el modelo de `greenhouse_core.providers` vs `greenhouse_finance.suppliers`.
- No rebajar saldos al registrar una obligacion pendiente.
- No crear Payment Orders automáticas ni reemplazar el drawer de pagos completo.
- No modificar proveedores/suppliers si Claude mantiene ownership activo de `TASK-771`.

## Detailed Spec

## Implementation Strategy — backend contract first

La forma robusta de resolver esta task es tratarla como un problema de **contrato de dominio** y no como un bug de UI. El orden recomendado es:

1. Backend read model primero.
2. Writer resiliente con snapshot.
3. Reader resiliente para datos legacy.
4. UI consumiendo contrato explícito.
5. Tests de cadena end-to-end del caso Figma.

### 1. Backend primero: canonical expense read model

El API de expenses debe entregar una representación completa y confiable de la obligación. El frontend no debe tener que buscar proveedores ni inferir fechas/montos.

Contrato objetivo ilustrativo:

```ts
{
  supplierId: 'figma-inc',
  supplierName: null,           // snapshot legacy/auditable, puede venir nulo
  supplierDisplayName: 'Figma', // display canónico hidratado
  currency: 'USD',
  totalAmount: 92.9,
  totalAmountClp: 83773.5,
  pendingAmount: 92.9,
  pendingAmountClp: 83773.5,
  sortDate: '2026-04-29'
}
```

`supplierDisplayName` debe resolverse en backend, no en UI:

```sql
COALESCE(expenses.supplier_name, suppliers.trade_name, suppliers.legal_name)
```

### 2. Writer resiliente: snapshot al crear obligación

Cuando `POST /api/finance/expenses` recibe `supplierId`, debe resolver el proveedor y persistir `supplier_name` como snapshot legible.

Regla:

- si el request trae `supplierName` explícito y confiable, puede conservarse como snapshot
- si trae `supplierId` sin `supplierName`, resolver desde `greenhouse_finance.suppliers`
- si el supplier no existe, fallar con error claro o degradar según contrato vigente, pero nunca crear una obligación asociada a un `supplierId` inválido sin evidencia

Rationale:

- auditoría y exports siguen entendibles aunque el proveedor cambie de nombre
- cash-out no depende de un join para cada caso nuevo
- datos nuevos no vuelven a nacer incompletos

### 3. Reader resiliente: fallback para datos existentes

Aunque se arregle el writer, ya existen registros como `EXP-202604-008` con `supplierId=figma-inc` y `supplierName=null`.

Por eso el reader debe hacer `LEFT JOIN` contra `greenhouse_finance.suppliers` y exponer `supplierDisplayName`. Esto corrige datos históricos sin exigir backfill inmediato.

Rationale:

- corrige Figma de inmediato
- evita migraciones/backfills innecesarios para display
- tolera errores pasados, imports incompletos y datos legacy

### 4. UI tonta, contrato inteligente

La UI no debe reconstruir identidad ni finanzas. Debe consumir campos explícitos:

- `supplierDisplayName`
- `sortDate`
- `pendingAmount`
- `pendingAmountClp`
- `totalAmount`
- `totalAmountClp`

`ExpensesListView` debe mostrar:

```ts
supplierDisplayName ?? supplierName ?? '—'
```

Y debe respetar `sortDate` o el orden server-side, no ordenar por `paymentDate` como si toda obligación ya fuese un pago.

### 5. Cash-Out agrupado por identidad estable

`RegisterCashOutDrawer` no debe agrupar por `supplierName || 'Sin proveedor'`. Debe separar key estable de label visible:

```ts
supplierKey = supplierId ?? supplierDisplayName ?? supplierName ?? '__unassigned__'
supplierLabel = supplierDisplayName ?? supplierName ?? 'Sin proveedor'
```

Regla:

- si hay `supplierId`, el documento NO puede caer bajo "Sin proveedor"
- "Sin proveedor" solo aplica cuando no existe `supplierId`, `supplierDisplayName` ni `supplierName`
- si hay `supplierId` pero no se pudo resolver nombre, mostrar fallback auditable como `Proveedor sin nombre (figma-inc)` y emitir warning/error de datos según corresponda

### 6. Monto original separado de CLP

Para documentos USD, el drawer debe mostrar ambos planos:

```txt
USD 92.90
Equivalente: $83.774 CLP
```

Nunca debe mostrar:

```txt
USD 83.773,50
```

Reglas:

- `totalAmount` y `pendingAmount` viven en moneda del documento
- `totalAmountClp` y `pendingAmountClp` viven en CLP
- si la cuenta/instrumento de pago es CLP y el documento es USD, el tipo de cambio debe ser explícito o venir del helper canónico
- no introducir matemática FX local fuera de los helpers/readers canónicos de Finance

### 7. Semántica clara: obligación vs pago

Registrar obligación pendiente:

- crea deuda/cuenta por pagar
- puede guardar instrumento esperado/sugerido
- no rebaja tarjeta/banco

Registrar pago:

- crea `expense_payment`
- afecta pagos/saldos vía ledger/settlement canónico
- puede cambiar estado a `paid` o `partial`

Copy recomendado:

- En obligación: usar "Instrumento esperado" o "Se pagará desde" si no se crea payment.
- En pago: usar "Pagado desde".

Si se quiere soportar "registrar obligación como ya pagada", debe ser una task separada o slice explícita que cree expense + payment de forma atómica. No mezclarlo silenciosamente en esta task.

### 8. Tests de cadena, no solo unitarios

La regresión debe cubrir la cadena completa:

- supplier existe
- expense tiene `supplierId` pero `supplierName=null`
- API devuelve `supplierDisplayName='Figma'`
- Compras muestra Figma
- Cash-Out agrupa Figma
- monto USD y equivalente CLP se muestran separados
- sin `expense_payment`, Santander Corp no baja

Rationale:

El bug no vive en un único archivo. Es una cadena de contrato roto entre writer, reader, tabla, selector de pago y semántica de caja. Testear solo un componente deja el sistema vulnerable a volver a esconder proveedores o mezclar monedas.

### Contract target

`GET /api/finance/expenses` y `GET /api/finance/expenses/[id]` deben poder exponer, como mínimo:

- `supplierId`
- `supplierName` legacy/snapshot si existe
- `supplierDisplayName` resuelto desde:
  1. `expense.supplier_name`
  2. `suppliers.trade_name`
  3. `suppliers.legal_name`
  4. `null`
- `totalAmount` en moneda original
- `totalAmountClp` como equivalente CLP
- `amountPaid` / `amountPaidClp` si el contrato ya existe o debe extenderse
- `pendingAmount` en moneda original
- `pendingAmountClp` como equivalente CLP

Si extender el contrato público completo es demasiado amplio para el slice, al menos `RegisterCashOutDrawer` debe derivar estos campos de forma local desde datos explícitos y testeados, sin mezclar `totalAmountClp` con `currency`.

### Payment semantics

- `paymentStatus=pending` + `payments=[]` significa: no rebaja banco/tarjeta.
- `paymentAccountId` en la obligacion es metadata de instrumento esperado/sugerido, no pago real.
- El pago real se registra en `POST /api/finance/expenses/[id]/payments`.
- La UI debe explicar esta diferencia si muestra "Pagado desde" o "Fecha de pago" en un contexto de obligacion pendiente.

### Figma regression case

El caso mínimo que debe pasar:

1. Existe supplier `figma-inc` con `tradeName=Figma`.
2. Existe expense `EXP-202604-008` con `supplierId=figma-inc`, `supplierName=null`, `currency=USD`, `totalAmount=92.9`, `totalAmountClp=83773.5`, `paymentStatus=pending`.
3. `/finance/expenses` muestra proveedor "Figma" y no lo oculta por sort client-side.
4. `/finance/cash-out` muestra grupo "Figma (1 documento)" y el documento "Pago mensual - Figma".
5. El monto a pagar se muestra como `USD 92.90` y equivalente CLP separado.
6. Santander Corp no cambia hasta registrar payment real.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Una obligacion con `supplierId` valido y `supplierName=null` muestra el proveedor real en `/finance/expenses`.
- [ ] Una obligacion recién creada queda visible inmediatamente o conserva el orden server-side correcto en Compras.
- [ ] `RegisterCashOutDrawer` agrupa Figma bajo "Figma", no bajo "Sin proveedor".
- [ ] El selector de documento de pago muestra monto pendiente en moneda original y equivalente CLP sin mezclar unidades.
- [ ] Registrar una obligacion pendiente no rebaja saldos; registrar payment real sigue siendo el unico camino que afecta tarjeta/banco.
- [ ] El caso Figma queda cubierto por tests de regresión.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test -- src/views/greenhouse/finance/ExpensesListView.test.tsx`
- `pnpm test -- src/views/greenhouse/finance/drawers/CreateExpenseDrawer.test.tsx`
- `pnpm test -- src/views/greenhouse/finance/drawers/RegisterCashOutDrawer.test.tsx` si existe/se crea
- tests focalizados de route/reader de expenses
- validación manual o staging:
  - `/finance/expenses` muestra Figma
  - `/finance/cash-out` muestra Figma como proveedor pendiente
  - `/api/finance/expenses/EXP-202604-008/payments` sigue vacío antes de registrar pago

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` o doc funcional de finance queda actualizado si cambia contrato API/UX visible
- [ ] Si se modifica copy visible, se actualiza el manual/doc funcional correspondiente

## Follow-ups

- `TASK-771` debe cerrar el problema de supplier write decoupling y BQ projection.
- `TASK-752` puede reutilizar el contrato supplier/payment profile una vez este selector sea confiable.
- Crear una task separada si se decide soportar "registrar obligacion como ya pagada" en una sola transacción.

## Open Questions

Resueltas al crear la task:

- Snapshot vs reader fallback: **ambos**. Persistir `supplier_name` como snapshot legible al crear/actualizar expense con `supplierId`; además hidratar `supplierDisplayName` en readers para datos legacy y resiliencia.
- Moneda de pago en drawer: **monto documento como input principal; CLP como equivalente/settlement explícito**. Si el documento es USD, el usuario ve y paga la obligación en USD o registra el equivalente con tipo de cambio claro; nunca se debe presentar `totalAmountClp` con `currency=USD`.
