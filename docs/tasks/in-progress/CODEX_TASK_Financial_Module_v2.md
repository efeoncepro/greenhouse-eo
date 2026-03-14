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

## Fuera de alcance de esta v2

- rehacer la arquitectura de `Finance`
- convertir `fin_suppliers` en identidad global de provider
- mover writes de `Finance` a `People` o `Payroll`
- construir frontend final de conciliación o egresos
- reescribir el dashboard financiero
