# CODEX TASK — Financial Module: Runtime Gap Closure (v2)

## Resumen

Esta task no parte desde cero. `Finance` ya existe como módulo operativo en Greenhouse y esta `v2` cubre los gaps backend y de cierre funcional que todavía impiden considerarlo realmente completo como producto.

Ruta activa:
- `/finance`
- `/finance/income`
- `/finance/expenses`
- `/finance/suppliers`
- `/finance/clients`
- `/finance/reconciliation`

Objetivo de esta v2:
- cerrar el backend que faltaba para que `Finance` sea operable end-to-end
- dejar contratos claros para que Claude construya frontend sin inventar lógica server-side
- mantener `Finance` alineado al modelo 360 y al backend canónico ya existente

## Estado real del módulo

### Ya implementado

- route group `finance` con guard dedicado y navegación
- bootstrap runtime de:
  - `greenhouse.fin_accounts`
  - `greenhouse.fin_suppliers`
  - `greenhouse.fin_client_profiles`
  - `greenhouse.fin_income`
  - `greenhouse.fin_expenses`
  - `greenhouse.fin_reconciliation_periods`
  - `greenhouse.fin_bank_statement_rows`
  - `greenhouse.fin_exchange_rates`
- dashboard financiero
- directorios y detalle de:
  - ingresos
  - egresos
  - proveedores
  - clientes
- resolución canónica de referencias Finance:
  - `clientId`
  - `clientProfileId`
  - `hubspotCompanyId`
  - `memberId`
  - `payrollEntryId`
- overview financiero read-only de colaborador en:
  - `GET /api/people/[memberId]/finance`

### Gap operativo que esta v2 debe cubrir

`Finance` ya no está bloqueado por ausencia de módulo, sino por cierre incompleto de backend y por drift entre task y runtime:

1. Conciliación necesitaba backend operable para UI real
- faltaba superficie backend clara para:
  - candidatos de conciliación
  - exclusión de filas del extracto
  - consistencia entre `auto-match`, `match` y `unmatch`

2. Egresos especializados estaban desalineados
- `POST /api/finance/expenses` no aceptaba formalmente los campos especializados que sí existían en schema y en bulk:
  - `socialSecurityType`
  - `socialSecurityInstitution`
  - `socialSecurityPeriod`
  - `taxType`
  - `taxPeriod`
  - `taxFormNumber`
  - `miscellaneousCategory`

3. Payroll estaba soportado en backend, pero no expuesto como contrato de descubrimiento reutilizable
- faltaba un endpoint claro para listar payroll aprobada/exportada disponible para convertirse en egresos financieros

4. Frontend no debía seguir inventando enums o catálogos manuales
- faltaba un endpoint meta para proveedores, cuentas, métodos de pago, service lines, tipos previsionales e impuestos

## Alineación obligatoria con arquitectura

Esta task debe revisarse contra:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md`

Reglas obligatorias:
- `Finance` mantiene `fin_*` como capa transaccional propia
- `Finance` no crea identidades paralelas de cliente o colaborador
- nuevas escrituras deben seguir anclándose a:
  - `greenhouse.clients.client_id`
  - `greenhouse.team_members.member_id`
- referencias de compatibilidad pueden sobrevivir:
  - `clientProfileId`
  - `hubspotCompanyId`
  - `payrollEntryId`
- reconciliación y egresos siguen siendo ownership de `Finance`, no de `People` ni `Payroll`

## Backend activo de referencia

### Superficie core existente

- `GET /api/finance/accounts`
- `GET /api/finance/accounts/[id]`
- `GET /api/finance/dashboard/summary`
- `GET /api/finance/dashboard/cashflow`
- `GET /api/finance/dashboard/aging`
- `GET /api/finance/dashboard/by-service-line`
- `GET /api/finance/exchange-rates/latest`
- `GET/POST /api/finance/income`
- `GET/PUT /api/finance/income/[id]`
- `POST /api/finance/income/[id]/payment`
- `GET/POST /api/finance/expenses`
- `POST /api/finance/expenses/bulk`
- `GET/PUT /api/finance/expenses/[id]`
- `GET/POST /api/finance/suppliers`
- `GET/PUT /api/finance/suppliers/[id]`
- `GET/POST /api/finance/clients`
- `GET/PUT /api/finance/clients/[id]`
- `POST /api/finance/clients/sync`
- `GET/POST /api/finance/reconciliation`
- `GET/PUT /api/finance/reconciliation/[id]`
- `POST /api/finance/reconciliation/[id]/auto-match`
- `POST /api/finance/reconciliation/[id]/match`
- `POST /api/finance/reconciliation/[id]/unmatch`
- `POST /api/finance/reconciliation/[id]/statements`

### Backend agregado o endurecido en esta v2

- `GET /api/finance/reconciliation/[id]/candidates`
  - devuelve ingresos y egresos no conciliados para el período con ventana configurable
  - pensado para el panel derecho de matching manual

- `POST /api/finance/reconciliation/[id]/exclude`
  - marca filas del extracto como `excluded`
  - si la fila estaba vinculada, libera también el target reconciliado

- `GET /api/finance/expenses/meta`
  - expone catálogo backend para formularios:
    - suppliers activos
    - accounts activas
    - `paymentMethods`
    - `serviceLines`
    - `socialSecurityTypes`
    - `socialSecurityInstitutions`
    - `taxTypes`

- `GET /api/finance/expenses/payroll-candidates`
  - lista payroll entries de períodos `approved` o `exported`
  - indica si ya tienen egreso financiero vinculado

- endurecimiento de `POST /api/finance/expenses`
  - ahora acepta y persiste también campos especializados de previsión, impuestos y gastos varios

- endurecimiento de conciliación
  - `auto-match` ahora también actualiza `fin_income` / `fin_expenses` como reconciliados cuando aplica
  - `match` valida que el target no esté reconciliado a otra fila
  - `match`, `unmatch` y `exclude` mantienen consistencia entre fila bancaria y transacción financiera
  - `GET /api/finance/reconciliation/[id]` expone `matchStatus` normalizado para frontend y `rawMatchStatus` para depuración/UX avanzada

## Contrato backend para Claude frontend

### Conciliación

Claude debe asumir este flujo:

1. `GET /api/finance/reconciliation`
- lista períodos

2. `POST /api/finance/reconciliation`
- crea período

3. `GET /api/finance/reconciliation/[id]`
- detalle del período
- incluye filas del extracto con:
  - `matchStatus`
  - `rawMatchStatus`
  - `matchedType`
  - `matchedId`

4. `POST /api/finance/reconciliation/[id]/statements`
- importa extracto

5. `GET /api/finance/reconciliation/[id]/candidates`
- devuelve candidatos manuales de match

6. `POST /api/finance/reconciliation/[id]/match`
- vincula fila de extracto con ingreso o egreso

7. `POST /api/finance/reconciliation/[id]/unmatch`
- deshace vínculo

8. `POST /api/finance/reconciliation/[id]/exclude`
- excluye fila operativamente

9. `POST /api/finance/reconciliation/[id]/auto-match`
- ejecuta matching server-side

### Egresos

Claude puede montar formularios especializados apoyándose en:

- `GET /api/finance/expenses/meta`
- `GET /api/finance/expenses/payroll-candidates`
- `POST /api/finance/expenses`
- `POST /api/finance/expenses/bulk`
- `GET /api/finance/expenses/[id]`
- `PUT /api/finance/expenses/[id]`

Campos especializados ya soportados por backend:
- payroll:
  - `payrollEntryId`
  - `payrollPeriodId`
  - `memberId`
  - `memberName`
- social security:
  - `socialSecurityType`
  - `socialSecurityInstitution`
  - `socialSecurityPeriod`
- tax:
  - `taxType`
  - `taxPeriod`
  - `taxFormNumber`
- miscellaneous:
  - `miscellaneousCategory`

## Payloads ejemplo para Claude

### 1. Crear período de conciliación

`POST /api/finance/reconciliation`

```json
{
  "accountId": "bci-clp-operativa",
  "year": 2026,
  "month": 3,
  "openingBalance": 12500000,
  "notes": "Conciliacion marzo cuenta operativa"
}
```

### 2. Importar extracto bancario ya parseado

`POST /api/finance/reconciliation/[id]/statements`

```json
{
  "rows": [
    {
      "transactionDate": "2026-03-04",
      "valueDate": "2026-03-04",
      "description": "TRANSFERENCIA CLIENTE SKY",
      "reference": "INC-202603-003",
      "amount": 4500000,
      "balance": 17125000
    },
    {
      "transactionDate": "2026-03-05",
      "description": "PAGO AFP HABITAT",
      "reference": "PREV-03",
      "amount": -980000,
      "balance": 16145000
    }
  ]
}
```

### 3. Consultar candidatos de match manual

`GET /api/finance/reconciliation/[id]/candidates?type=all&search=&limit=100&windowDays=45`

Respuesta esperable:

```json
{
  "period": {
    "periodId": "bci-clp-operativa_2026_03",
    "accountId": "bci-clp-operativa",
    "year": 2026,
    "month": 3,
    "status": "in_progress",
    "monthLabel": "2026-03"
  },
  "items": [
    {
      "id": "INC-202603-003",
      "type": "income",
      "amount": 4500000,
      "currency": "CLP",
      "transactionDate": "2026-03-04",
      "dueDate": "2026-03-30",
      "reference": "FAC-003",
      "description": "Fee mensual Sky",
      "partyName": "Sky Airline",
      "status": "pending",
      "isReconciled": false,
      "reconciliationId": null
    }
  ],
  "total": 1
}
```

### 4. Match manual

`POST /api/finance/reconciliation/[id]/match`

```json
{
  "rowId": "bci-clp-operativa_2026_03_0001",
  "matchedType": "income",
  "matchedId": "INC-202603-003",
  "notes": "Match confirmado por referencia"
}
```

### 5. Excluir fila de extracto

`POST /api/finance/reconciliation/[id]/exclude`

```json
{
  "rowId": "bci-clp-operativa_2026_03_0002",
  "notes": "Comision bancaria interna"
}
```

### 6. Descubrir catálogos de egresos

`GET /api/finance/expenses/meta`

Respuesta esperable:

```json
{
  "suppliers": [
    {
      "supplierId": "adobe-inc",
      "legalName": "Adobe Inc.",
      "tradeName": "Adobe",
      "paymentCurrency": "USD"
    }
  ],
  "accounts": [
    {
      "accountId": "bci-clp-operativa",
      "accountName": "BCI Cuenta Corriente CLP",
      "currency": "CLP",
      "accountType": "checking"
    }
  ],
  "paymentMethods": ["transfer", "credit_card", "paypal", "wise", "check", "cash", "other"],
  "serviceLines": ["globe", "efeonce_digital", "reach", "wave", "crm_solutions"],
  "socialSecurityTypes": ["afp", "health", "unemployment", "mutual", "caja_compensacion"],
  "socialSecurityInstitutions": ["AFP Habitat", "AFC Chile", "Fonasa", "Isapre"],
  "taxTypes": ["iva_mensual", "ppm", "renta_anual", "patente", "contribuciones", "retencion_honorarios", "other"]
}
```

### 7. Descubrir payroll aprobada/exportada disponible

`GET /api/finance/expenses/payroll-candidates?linkStatus=available`

Respuesta esperable:

```json
{
  "items": [
    {
      "payrollEntryId": "2026-03_daniela-ferreira",
      "payrollPeriodId": "2026-03",
      "payrollStatus": "approved",
      "approvedAt": "2026-03-31",
      "memberId": "daniela-ferreira",
      "memberName": "Daniela Ferreira",
      "currency": "CLP",
      "grossTotal": 2850000,
      "netTotal": 2336000,
      "linkedExpenseId": null,
      "linkedPaymentStatus": null,
      "isLinked": false
    }
  ],
  "total": 1
}
```

### 8. Crear egreso de nómina

`POST /api/finance/expenses`

```json
{
  "expenseType": "payroll",
  "description": "Nomina marzo 2026 Daniela Ferreira",
  "currency": "CLP",
  "subtotal": 2336000,
  "totalAmount": 2336000,
  "paymentDate": "2026-03-31",
  "paymentStatus": "scheduled",
  "paymentAccountId": "bci-clp-operativa",
  "payrollEntryId": "2026-03_daniela-ferreira",
  "payrollPeriodId": "2026-03",
  "memberId": "daniela-ferreira",
  "memberName": "Daniela Ferreira",
  "notes": "Importado desde payroll aprobada"
}
```

### 9. Crear lote previsional

`POST /api/finance/expenses/bulk`

```json
{
  "items": [
    {
      "expenseType": "social_security",
      "description": "AFP marzo 2026",
      "currency": "CLP",
      "subtotal": 980000,
      "totalAmount": 980000,
      "paymentDate": "2026-04-10",
      "paymentStatus": "scheduled",
      "paymentAccountId": "bci-clp-operativa",
      "socialSecurityType": "afp",
      "socialSecurityInstitution": "AFP Habitat",
      "socialSecurityPeriod": "2026-03"
    },
    {
      "expenseType": "social_security",
      "description": "Salud marzo 2026",
      "currency": "CLP",
      "subtotal": 740000,
      "totalAmount": 740000,
      "paymentDate": "2026-04-10",
      "paymentStatus": "scheduled",
      "paymentAccountId": "bci-clp-operativa",
      "socialSecurityType": "health",
      "socialSecurityInstitution": "Fonasa",
      "socialSecurityPeriod": "2026-03"
    }
  ]
}
```

### 10. Crear impuesto mensual

`POST /api/finance/expenses`

```json
{
  "expenseType": "tax",
  "description": "F29 marzo 2026",
  "currency": "CLP",
  "subtotal": 1560000,
  "totalAmount": 1560000,
  "paymentDate": "2026-04-12",
  "paymentStatus": "scheduled",
  "paymentAccountId": "bci-clp-operativa",
  "taxType": "iva_mensual",
  "taxPeriod": "2026-03",
  "taxFormNumber": "F29"
}
```

### Orden recomendado de consumo en frontend

#### Conciliación

1. crear o listar período
2. abrir detalle
3. importar extracto
4. ejecutar `auto-match`
5. refrescar detalle
6. pedir `candidates` para filas restantes
7. usar `match`, `unmatch` o `exclude`

#### Egresos especializados

1. cargar `expenses/meta`
2. si la tab es nómina, cargar `expenses/payroll-candidates`
3. persistir con `POST /api/finance/expenses` o `POST /api/finance/expenses/bulk`
4. refrescar lista

## Alcance restante de frontend

Esta v2 deja a Claude el cierre UI encima de backend real, no encima de supuestos.

Frontend principal pendiente:
- creación de período de conciliación desde pantalla
- importador de extracto desde UI
- panel doble de conciliación con candidatos manuales
- acción de excluir
- tabs especializadas de egresos:
  - proveedores
  - nómina
  - previsión
  - impuestos
  - varios
- formularios UX usando `expenses/meta`
- selector de payroll aprobada usando `expenses/payroll-candidates`

## Criterios de aceptación de esta v2

- frontend ya no necesita inventar contratos de conciliación manual
- `auto-match`, `match`, `unmatch` y `exclude` dejan estado coherente en `fin_bank_statement_rows` y en la transacción target
- egresos especializados pueden persistirse también por `POST /api/finance/expenses`, no solo por bulk
- existe un contrato backend explícito para descubrir payroll disponible para Finance
- existe un contrato backend explícito para catálogos operativos de formularios financieros
- `pnpm exec eslint` pasa sobre archivos backend tocados

## Archivos backend tocados en esta fase

- `src/lib/finance/reconciliation.ts`
- `src/lib/finance/shared.ts`
- `src/app/api/finance/reconciliation/[id]/route.ts`
- `src/app/api/finance/reconciliation/[id]/auto-match/route.ts`
- `src/app/api/finance/reconciliation/[id]/match/route.ts`
- `src/app/api/finance/reconciliation/[id]/unmatch/route.ts`
- `src/app/api/finance/reconciliation/[id]/candidates/route.ts`
- `src/app/api/finance/reconciliation/[id]/exclude/route.ts`
- `src/app/api/finance/expenses/route.ts`
- `src/app/api/finance/expenses/meta/route.ts`
- `src/app/api/finance/expenses/payroll-candidates/route.ts`

## QA funcional 2026-03-15

### Alcance auditado

- revisión estática profunda de:
  - `src/views/greenhouse/finance/*`
  - `src/app/api/finance/*`
  - `src/lib/finance/reconciliation.ts`
  - `src/lib/finance/shared.ts`
- foco en:
  - dashboard
  - ingresos
  - egresos
  - clientes
  - proveedores
  - conciliación bancaria

### Hallazgos priorizados

#### Alta

1. Reimportar extractos en un mismo período recicla `row_id` y deja conteo inconsistente.
- Evidencia:
  - `src/app/api/finance/reconciliation/[id]/statements/route.ts:90-133`
  - `src/lib/finance/schema.ts:171-184`
- Qué pasa:
  - cada import vuelve a crear IDs desde `..._0001`
  - `statement_row_count` se actualiza con la cantidad de la última importación, no con el total acumulado del período
- Impacto:
  - un segundo import puede dejar filas con `row_id` duplicado dentro del mismo período
  - `match`, `unmatch` y `exclude` pasan a operar sobre IDs ambiguos
  - el contador de filas del período deja de representar la realidad

2. Un período puede seguir mutando aunque ya esté reconciliado o cerrado.
- Evidencia:
  - `src/app/api/finance/reconciliation/[id]/match/route.ts:25-123`
  - `src/app/api/finance/reconciliation/[id]/unmatch/route.ts:25-84`
  - `src/app/api/finance/reconciliation/[id]/route.ts:169-179`
- Qué pasa:
  - `match` y `unmatch` no bloquean acciones en períodos `reconciled` o `closed`
  - `PUT /api/finance/reconciliation/[id]` permite marcar un período como `reconciled` sin validar diferencia cero, extracto importado ni integridad del cierre
- Impacto:
  - el lock operativo de conciliación se puede saltar por API
  - el sistema puede declarar conciliado un período que todavía no está cuadrado

3. La conciliación manual de ingresos omite cobros válidos si la factura es antigua.
- Evidencia:
  - `src/lib/finance/reconciliation.ts:165-196`
  - `src/lib/finance/reconciliation.ts:237-250`
- Qué pasa:
  - los candidatos de ingresos se filtran por `invoice_date BETWEEN @startDate AND @endDate`
  - además se exponen con `transactionDate = invoice_date`
- Impacto:
  - si una factura vieja se cobra este mes, puede no aparecer como candidata en conciliación manual
  - la conciliación bancaria favorece la fecha de emisión en vez de la fecha real de cobro

4. El auto-match también compara ingresos contra `invoice_date`, no contra fecha real de cobro.
- Evidencia:
  - `src/app/api/finance/reconciliation/[id]/auto-match/route.ts:115-149`
  - `src/app/api/finance/reconciliation/[id]/auto-match/route.ts:170-178`
- Qué pasa:
  - el algoritmo usa `invoice_date` para la ventana temporal de match de ingresos
- Impacto:
  - baja la tasa de auto-match en cobros tardíos o facturas emitidas fuera de la ventana del extracto
  - aumenta el riesgo de sugerencias pobres o no sugerir nada cuando sí existe un cobro válido

#### Media

5. El dashboard no siempre muestra los verdaderos “últimos movimientos”.
- Evidencia:
  - `src/views/greenhouse/finance/FinanceDashboardView.tsx:253-260`
  - `src/views/greenhouse/finance/FinanceDashboardView.tsx:322-324`
- Qué pasa:
  - primero trae solo 6 ingresos y 6 egresos
  - recién después mezcla, ordena y corta a 8
- Impacto:
  - si hay más de 6 movimientos recientes de un mismo tipo, la tabla puede omitir movimientos más nuevos y mostrar otros más viejos

6. El KPI `Saldo total` usa saldo de apertura, no saldo bancario actual.
- Evidencia:
  - `src/views/greenhouse/finance/FinanceDashboardView.tsx:358-359`
  - `src/app/api/finance/accounts/route.ts:22-79`
- Qué pasa:
  - el dashboard suma `openingBalance`
  - el endpoint de cuentas no expone balance corriente ni último saldo conciliado
- Impacto:
  - el KPI se ve “correcto” visualmente, pero puede representar un monto histórico y no la posición bancaria actual

7. `Ingresos del mes`, `Egresos del mes` y `Flujo de caja` mezclan devengo con caja.
- Evidencia:
  - `src/views/greenhouse/finance/FinanceDashboardView.tsx:478-500`
  - `src/views/greenhouse/finance/FinanceDashboardView.tsx:550-572`
  - `src/app/api/finance/income/summary/route.ts:35-65`
  - `src/app/api/finance/expenses/summary/route.ts:34-63`
- Qué pasa:
  - ingresos se agregan por `invoice_date`
  - egresos se agregan por `document_date` o `payment_date`
  - luego el dashboard llama a eso `Flujo de caja`
- Impacto:
  - el gráfico de caja y los KPIs mensuales pueden inflar o distorsionar la liquidez real
  - una factura emitida pero no cobrada igual entra al gráfico

8. El orden de meses del dashboard puede romperse a partir de octubre.
- Evidencia:
  - `src/views/greenhouse/finance/FinanceDashboardView.tsx:368-377`
- Qué pasa:
  - los meses se guardan como strings tipo `2026-2`, `2026-10`
  - luego se hace `Array.sort()` lexicográfico
- Impacto:
  - el eje temporal puede quedar mal ordenado entre meses de una misma anualidad
  - los gráficos pueden contar una historia equivocada aunque los valores estén bien

9. La taxonomía de categorías de proveedores está desalineada entre vistas.
- Evidencia:
  - `src/views/greenhouse/finance/drawers/CreateSupplierDrawer.tsx:22-31`
  - `src/views/greenhouse/finance/SuppliersListView.tsx:54-76`
  - `src/views/greenhouse/finance/SupplierDetailView.tsx:79-88`
  - `src/lib/finance/shared.ts:179-183`
- Qué pasa:
  - create/list usan categorías como `software`, `media`, `legal_accounting`
  - detail espera categorías como `technology`, `marketing`, `financial`, `legal`
- Impacto:
  - etiquetas inconsistentes
  - categorías válidas pueden mostrarse en bruto en el detalle
  - el módulo pierde coherencia taxonómica entre alta, listado y detalle

10. La lista de proveedores parece clickeable pero no navega al detalle.
- Evidencia:
  - `src/views/greenhouse/finance/SuppliersListView.tsx:284-338`
- Qué pasa:
  - la fila tiene `cursor: 'pointer'` y `hover`, pero no `onClick` ni `Link`
- Impacto:
  - la UX sugiere una acción que no existe
  - el detalle de proveedor queda efectivamente oculto desde la lista

11. La conciliación sugerida se abre como si ya estuviera conciliada.
- Evidencia:
  - `src/views/greenhouse/finance/dialogs/ReconciliationMatchDialog.tsx:111-129`
  - `src/views/greenhouse/finance/dialogs/ReconciliationMatchDialog.tsx:343-357`
  - `src/views/greenhouse/finance/dialogs/ReconciliationMatchDialog.tsx:526-565`
- Qué pasa:
  - una fila con estado `suggested` entra por defecto en modo `unmatch`
- Impacto:
  - la primera acción visible no es confirmar la sugerencia sino deshacerla
  - la UX trata una sugerencia como si fuera una conciliación ya cerrada

12. El detalle de cliente fuerza montos de facturas a CLP aunque la factura tenga otra moneda.
- Evidencia:
  - `src/views/greenhouse/finance/ClientDetailView.tsx:75-85`
  - `src/views/greenhouse/finance/ClientDetailView.tsx:425-427`
- Qué pasa:
  - la interfaz de `Invoice` trae `currency`
  - el render usa `formatCLP(...)` para total, pagado y pendiente
- Impacto:
  - clientes facturados en USD quedan representados con moneda incorrecta

#### Baja

13. Varias grillas navegan con `window.location.href` y fuerzan recarga completa.
- Evidencia:
  - `src/views/greenhouse/finance/IncomeListView.tsx:274`
  - `src/views/greenhouse/finance/ExpensesListView.tsx:318`
  - `src/views/greenhouse/finance/ClientsListView.tsx:302`
  - `src/views/greenhouse/finance/ClientDetailView.tsx:417`
- Impacto:
  - se pierde navegación SPA
  - peor UX, peor preservación de estado y comportamiento menos consistente con App Router

14. El detalle de proveedor no formatea montos no-CLP como moneda.
- Evidencia:
  - `src/views/greenhouse/finance/SupplierDetailView.tsx:107-108`
  - `src/views/greenhouse/finance/SupplierDetailView.tsx:468-472`
- Impacto:
  - un pago en USD se muestra como número plano sin símbolo monetario

15. Hay fechas crudas `YYYY-MM-DD` visibles en detalles de ingresos y egresos.
- Evidencia:
  - `src/views/greenhouse/finance/IncomeDetailView.tsx:253`
  - `src/views/greenhouse/finance/IncomeDetailView.tsx:280-284`
  - `src/views/greenhouse/finance/IncomeDetailView.tsx:386`
  - `src/views/greenhouse/finance/ExpenseDetailView.tsx:248-257`
- Impacto:
  - inconsistencia visual con el resto del módulo
  - lectura menos natural para usuarios de operación

16. La sincronización manual de clientes todavía usa `alert(...)`.
- Evidencia:
  - `src/views/greenhouse/finance/ClientsListView.tsx:157-170`
- Impacto:
  - feedback bloqueante
  - UX poco integrada con el resto del portal

### QA técnico adicional

- El scope auditado no pasa `eslint` todavía. Hallazgos:
  - `src/app/api/finance/exchange-rates/route.ts:8`
  - `src/app/api/finance/reconciliation/route.ts:9`
  - `src/views/greenhouse/finance/ExpensesListView.tsx:159`
  - `src/views/greenhouse/finance/ExpensesListView.tsx:161`
  - `src/views/greenhouse/finance/IncomeListView.tsx:129`
  - `src/views/greenhouse/finance/IncomeListView.tsx:131`
  - `src/views/greenhouse/finance/ReconciliationDetailView.tsx:116`
  - `src/views/greenhouse/finance/SuppliersListView.tsx:5`
  - `src/views/greenhouse/finance/SuppliersListView.tsx:15`
  - `src/views/greenhouse/finance/SuppliersListView.tsx:24`
  - `src/views/greenhouse/finance/SuppliersListView.tsx:120`

### Validación ejecutada para este QA

- `pnpm exec eslint src/views/greenhouse/finance src/app/api/finance src/lib/finance`
  - resultado: con errores, usados como parte del diagnóstico
- revisión estática de contratos UI/API y flujos de estado

### Próxima tanda recomendada

- primero cerrar integridad de conciliación:
  - IDs únicos por extracto
  - lock real de períodos cerrados
  - criterio temporal correcto para cobros
- después corregir semántica del dashboard:
  - balance real
  - caja vs devengo
  - orden cronológico
- luego cerrar bugs visibles de UX:
  - proveedor sin navegación
  - monedas mal renderizadas
  - navegación SPA y feedbacks

### Handoff backend Codex -> Claude 2026-03-15

#### Corregido en esta tanda backend

- `src/app/api/finance/reconciliation/[id]/statements/route.ts`
  - la importación ya no reinicia la secuencia de `row_id` en cada reimportación del mismo período
  - `statement_row_count` pasa a persistirse contra el total real acumulado del período
- `src/app/api/finance/reconciliation/[id]/match/route.ts`
- `src/app/api/finance/reconciliation/[id]/unmatch/route.ts`
- `src/app/api/finance/reconciliation/[id]/exclude/route.ts`
- `src/app/api/finance/reconciliation/[id]/auto-match/route.ts`
  - ahora bloquean mutaciones si el período está `reconciled` o `closed`
- `src/app/api/finance/reconciliation/[id]/route.ts`
  - ya no permite:
    - reconciliar un período sin extracto importado
    - reconciliar con filas `unmatched` o `suggested`
    - reconciliar con `difference != 0`
    - cerrar un período que todavía no fue reconciliado
    - mutar un período `closed`
- `src/lib/finance/reconciliation.ts`
- `src/app/api/finance/reconciliation/[id]/auto-match/route.ts`
  - ingresos ahora usan la fecha y referencia del último `payments_received` cuando existe
  - si no existe pago registrado, siguen cayendo a `invoice_date` / `invoice_number`

#### Lo que queda mejor para Claude

- corregir el modal de conciliación para que una fila `suggested` abra en modo de confirmación y no parezca ya conciliada
- ajustar dashboard y vistas para consumir semánticas más claras:
  - caja vs devengo
  - saldo real vs saldo de apertura
- corregir la navegación UX:
  - proveedores sin detalle accesible desde lista
  - grillas con `window.location.href`
- corregir render y microcopy:
  - moneda en detalle de cliente y proveedor
  - fechas crudas
  - `alert(...)` en clientes

#### Deuda backend que no conviene resolver desde UI sin decisión previa

- reconciliación de ingresos con pagos parciales múltiples
  - hoy el modelo guarda `is_reconciled` y `reconciliation_id` a nivel de factura, no a nivel de cada pago individual
  - si se quiere conciliación bancaria realmente exacta para cobros parciales, conviene abrir una siguiente tanda backend/modelo antes de pedirle a Claude que profundice esa UX

#### Estado del reparto

- Codex tomó la parte de integridad y reglas server-side
- Claude puede continuar seguro sobre UI/UX y consumo de contratos, sin tener que inventar bloqueos ni remiendos client-side para conciliación

### Actualización backend Codex 2026-03-15 — persistencia diaria de tipo de cambio

#### Qué quedó corregido

- `src/lib/finance/exchange-rates.ts`
  - nueva capa server-only para:
    - consultar `mindicador.cl` como fuente primaria de `USD/CLP`
    - usar `open.er-api.com` como fallback
    - construir y persistir ambos pares por fecha:
      - `USD -> CLP`
      - `CLP -> USD`
- `src/app/api/finance/exchange-rates/sync/route.ts`
  - nuevo endpoint de sincronización diaria
  - soporta:
    - `GET` para cron interno
    - `POST` para ejecución manual autenticada desde backend/admin
- `src/app/api/finance/exchange-rates/latest/route.ts`
  - ahora ya no depende solo de que exista una fila previa en BBDD
  - si no encuentra tasa almacenada, intenta hidratarla y persistirla automáticamente
- `src/lib/finance/shared.ts`
  - `getLatestExchangeRate()` ahora puede auto-sincronizar `USD/CLP` / `CLP/USD` antes de devolver `null`
  - `resolveExchangeRateToClp()` hereda ese comportamiento, por lo que ingresos y egresos en USD ya no exigen carga manual previa del tipo de cambio
- `vercel.json`
  - se agregó cron diario hacia `/api/finance/exchange-rates/sync`
- `.env.example`
  - se agregó `CRON_SECRET`

#### Impacto operativo

- el módulo `Finance` ya puede mantener snapshots diarios de tipo de cambio en `greenhouse.fin_exchange_rates`
- los cálculos server-side en USD quedan menos frágiles para:
  - ingresos
  - egresos
  - KPIs que dependen de `exchange_rate_to_clp`
- el flujo manual `POST /api/finance/exchange-rates` sigue vigente para override o corrección operacional

#### Pendiente menor

- el sync diario queda hoy enfocado en `USD/CLP`, que es el par realmente soportado por el módulo
- si en el futuro se agregan más monedas, conviene promover esta capa a un servicio FX multi-par y ampliar el catálogo `VALID_CURRENCIES`

#### Frontend sugerido después de este cambio

- No hace falta frontend adicional para que el flujo funcione:
  - ingresos y egresos en USD ya pueden resolverse desde backend
  - `GET /api/finance/exchange-rates/latest` ya puede hidratar el snapshot si todavía no existe
  - el cron diario ya mantiene la tabla viva
- Sí conviene una mejora UX pequeña y no bloqueante:
  - mostrar en dashboard o cabecera financiera el `USD/CLP` vigente con:
    - `rate`
    - `rateDate`
    - `source`
  - contrato recomendado:
    - `GET /api/finance/exchange-rates/latest`
- Si se quiere una mejora operativa adicional:
  - agregar botón `Sincronizar tipo de cambio` que pegue a `POST /api/finance/exchange-rates/sync`
  - dejarlo en una surface interna/admin o en `Finance Dashboard`, no en formularios transaccionales
- Recomendación de implementación:
  - mantener el cálculo siempre server-side
  - usar frontend solo para visibilidad y retry manual
  - no duplicar lógica de conversión ni fallback en cliente
- Prioridad sugerida:
  - `P1` badge o card informativa con tasa, fecha y fuente
  - `P2` CTA manual de sincronización para operación/admin
  - `P3` feedback contextual en formularios USD mostrando qué tasa se aplicó al guardar

### QA runtime 2026-03-15 — frontend + flujos activos

#### Flujos mapeados

- dashboard:
  - `GET /api/finance/accounts`
  - `GET /api/finance/exchange-rates/latest`
  - `GET /api/finance/income/summary`
  - `GET /api/finance/expenses/summary`
  - `GET /api/finance/income`
  - `GET /api/finance/expenses`
- ingresos:
  - lista
  - alta desde drawer
  - detalle
- egresos:
  - lista
  - alta desde drawer
  - detalle
- clientes:
  - lista
  - sync manual
  - alta de perfil
  - detalle
- proveedores:
  - lista
  - alta
  - detalle
- conciliación:
  - creación de período
  - importación de cartola
  - matching manual y auto-match

#### Fix aplicado en esta pasada QA

- `src/views/greenhouse/finance/FinanceDashboardView.tsx`
  - `Saldo total` todavía seguía mostrando `openingBalance` aunque backend ya exponía `currentBalance`
  - ahora usa saldo operativo real y muestra fecha de referencia cuando existe
  - la card de tipo de cambio ahora también muestra la fecha del snapshot además de la fuente

#### Estado después del QA

- el flujo principal de `Finance` queda consistente entre dashboard y backend actualizado
- no se detectó en esta pasada otro bloqueo frontend duro equivalente al saldo real
- sigue faltando smoke autenticado en preview para validar datos reales end-to-end

### Handoff backend Codex -> Claude 2026-03-15 (actualización segunda tanda)

#### Corregido en esta segunda tanda backend

- `src/lib/finance/schema.ts`
- `src/lib/finance/income-payments.ts`
- `src/lib/finance/reconciliation.ts`
  - conciliación de ingresos ya soporta pagos parciales a nivel de `payments_received`, sin romper la compatibilidad del modelo actual
  - `fin_bank_statement_rows` ahora puede persistir `matched_payment_id` además de `matched_id`
  - los pagos nuevos guardados por `POST /api/finance/income/[id]/payment` ya nacen con metadata de conciliación:
    - `isReconciled`
    - `reconciliationRowId`
    - `reconciledAt`
    - `reconciledBy`
  - los helpers de conciliación ahora:
    - generan candidatos por pago individual cuando existe `payments_received`
    - dejan fallback a nivel de factura solo para casos legacy sin detalle de pagos
    - recomputan `fin_income.is_reconciled` y `fin_income.reconciliation_id` como resumen backward-compatible de la factura completa
- `src/app/api/finance/reconciliation/[id]/match/route.ts`
- `src/app/api/finance/reconciliation/[id]/unmatch/route.ts`
- `src/app/api/finance/reconciliation/[id]/exclude/route.ts`
- `src/app/api/finance/reconciliation/[id]/auto-match/route.ts`
- `src/app/api/finance/reconciliation/[id]/route.ts`
  - ya distinguen `matchedRecordId` vs `matchedPaymentId`
  - las filas sugeridas o conciliadas pueden apuntar a un pago específico sin perder la referencia al `income_id` canónico
- `src/app/api/finance/accounts/route.ts`
  - ahora expone saldo operativo real por cuenta cuando existe:
    - `currentBalance`
    - `balanceAsOf`
    - `balanceSource`
  - prioridad de cálculo:
    - último saldo de cartola
    - último cierre bancario del período
    - saldo de apertura como fallback
- `src/app/api/finance/income/summary/route.ts`
- `src/app/api/finance/expenses/summary/route.ts`
- `src/app/api/finance/dashboard/summary/route.ts`
- `src/app/api/finance/dashboard/cashflow/route.ts`
  - backend ya separa explícitamente caja vs devengo
  - se mantuvieron los campos legacy para no romper la UI actual
  - además se agregaron contratos nuevos para Claude:
    - `accrualCurrentMonth`
    - `accrualMonthly`
    - `cashCurrentMonth`
    - `cashMonthly`
    - `cashDataQuality`
  - `dashboard/summary` ahora entrega secciones `cash` y `accrual`
  - `dashboard/cashflow` ahora entrega por mes:
    - `income` / `expenses` / `net` como cash legacy-compatible
    - `cashIncome` / `cashExpenses` / `cashNet`
    - `accrualIncome` / `accrualExpenses` / `accrualNet`

#### Contrato backend listo para Claude

- Dashboard:
  - puede migrar `Saldo total` desde `openingBalance` hacia `currentBalance`
  - puede mostrar fecha/fuente con `balanceAsOf` y `balanceSource`
  - puede separar KPIs y series usando `cash*` vs `accrual*`
- Conciliación:
  - `GET /api/finance/reconciliation/[id]` ya devuelve:
    - `matchedId` como id operativo del candidato seleccionado
    - `matchedRecordId` como id canónico de la transacción
    - `matchedPaymentId` cuando el match es contra un pago parcial
  - `GET /api/finance/reconciliation/[id]/candidates` ya puede devolver candidatos de ingreso a nivel de pago individual
- Ingresos:
  - `paymentsReceived` puede traer metadata de conciliación por pago sin romper la vista actual

#### Deuda backend que sigue abierta pero ya no bloquea UI

- el modelo de pagos parciales sigue embebido en JSON (`payments_received`), no en una tabla normalizada propia
- `fin_income.is_reconciled` y `fin_income.reconciliation_id` siguen existiendo como resumen backward-compatible a nivel de factura, no como ledger detallado
- egresos todavía no soportan pagos parciales; la semántica de caja depende de que `payment_date` exista cuando el egreso está `paid`

#### Siguiente paso recomendado para Claude

- migrar dashboard a los nuevos campos backend:
  - `currentBalance`
  - `balanceSource`
  - `cash*`
  - `accrual*`
- ajustar conciliación para renderizar mejor:
  - `matchedRecordId`
  - `matchedPaymentId`
  - candidatos por pago
- reemplazar cualquier copy que todavía llame “flujo de caja” a series por devengo
- cerrar UX pendiente ya documentada:
  - navegación de proveedores
  - `window.location.href`
  - formatos y toasts

### Re-QA backend 2026-03-15

#### Hallazgos backend detectados en el segundo QA

- `src/app/api/finance/dashboard/aging/route.ts`
  - seguía calculando aging con `total_amount - amount_paid` en moneda nativa, aunque frontend lo interpreta como CLP
- `src/app/api/finance/clients/route.ts`
- `src/app/api/finance/clients/[id]/route.ts`
  - `totalReceivable` seguía mezclando monedas nativas y luego la UI lo formatea como CLP
- `src/app/api/finance/dashboard/by-service-line/route.ts`
  - todavía exponía un agregado ambiguo sin separación caja/devengo, quedando desalineado con la segunda tanda de reporting

#### Corregido en este re-QA

- `dashboard/aging` ahora devuelve aging en CLP estimado proporcional sobre `total_amount_clp`
- `clients` list y detail ahora calculan `totalReceivable` en CLP estimado proporcional, consistente con su render actual
- `dashboard/by-service-line` ahora expone:
  - `income` / `expenses` / `net` como cash legacy-compatible
  - `cashIncome` / `cashExpenses` / `cashNet`
  - `accrualIncome` / `accrualExpenses` / `accrualNet`

#### Estado backend después del re-QA

- `pnpm exec eslint src/app/api/finance src/lib/finance`
  - correcto
- `git diff --check -- src/app/api/finance src/lib/finance docs/tasks/in-progress/CODEX_TASK_Financial_Module_v2.md Handoff.md changelog.md`
  - correcto
- `pnpm exec tsc --noEmit --pretty false`
  - el proyecto sigue con ruido previo en `.next/types`, pero no aparecieron errores del scope `finance` al filtrarlo

#### Decisión operativa

- backend de `Finance` queda suficientemente estable para sacar a Claude de UI sobre contratos ya congelados
- el siguiente foco backend recomendado pasa a `HR-Payroll`

## Fuera de alcance de esta v2

- rehacer la arquitectura de `Finance`
- convertir `fin_suppliers` en identidad global de provider
- mover writes de `Finance` a `People` o `Payroll`
- construir frontend final de conciliación o egresos
- reescribir el dashboard financiero
