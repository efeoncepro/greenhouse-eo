# Usar el modelo de pricing por CLI

Requiere checkout interno, Node y dependencias del repo (`pnpm install` si no están instaladas).
Ejecutar desde la raíz. No requiere portal, UI, credenciales ni conexión DB.
Usar `--silent` de pnpm para obtener sólo JSON en stdout.

## Encontrar y revisar datos

```bash
pnpm --silent pricing:workbook --help
pnpm --silent pricing:workbook summary
pnpm --silent pricing:workbook search --query HubSpot --kind roles
pnpm --silent pricing:workbook role ECG-021
pnpm --silent pricing:workbook sheet "Precios personal" --range C22:W28
pnpm --silent pricing:workbook sheet "Addons - Overheads" --range A1:K10
pnpm --silent pricing:workbook audit
```

`role` muestra el costo, bonos, fee, precio antiguo, margen sobre venta y celdas de respaldo.
`sheet` conserva fórmulas y resultados cacheados (máximo 1000 celdas por consulta).
`audit` concilia las ecuaciones conocidas de roles; no recalcula todas las fórmulas de Excel.
Un servicio con precio cero está incompleto, no es gratuito. Los placeholders sin nombre no son roles.

## Calcular un perfil

```bash
pnpm --silent pricing:workbook scenario ECG-021 --input data/pricing/examples/crm-capacity-shared.json
```

Ese ejemplo supone 80 horas sobre 140 vendibles, venta de capacidad restante, costo histórico,
USD 530 adicionales, USD 600 de setup amortizado en tres meses, margen 40% y fee transaccional 3%.
Es un ejemplo hipotético de funcionamiento, no una tarifa o prueba de demanda.

## Costear un equipo y comparar precios

```bash
pnpm --silent pricing:workbook estimate --input data/pricing/examples/crm-capacity-plan.json
pnpm --silent pricing:workbook compare --input data/pricing/examples/crm-capacity-plan.json --margins 0.35,0.40,0.45
```

Editar una copia del [plan](../../../data/pricing/examples/crm-capacity-plan.json) en el expediente de trabajo:

1. Elegir SKU, horas, capacidad vendible y `allocationMode` por cada rol.
2. Para reemplazar el costo del Excel, declarar `roleCostOverrideUsd` como costo mensual completo,
   y `roleCostSource` con `reference` y `asOf` (fecha válida YYYY-MM-DD). Puede ser evidencia real o
   hipótesis explícitamente etiquetada; la CLI no certifica la evidencia.
3. Declarar `additionalMonthlyCostsUsd`: cada costo tiene `label` único y `amount` en USD para
   **este plan mensual**. No son porcentajes ni costos de toda la agencia sin asignar.
4. Declarar `setupCostUsd`; si es positivo, indicar `amortizationMonths` entero. Validar recuperación
   por plazo comprometido o cobrar setup por separado. El resultado sólo muestra precio durante
   esa amortización, no garantiza el cobro ni calcula automáticamente el fee posterior.
5. Declarar `targetMarginFraction` y `transactionFeeFraction` como fracciones: 0.40 y 0.03.
   Usar fee cero explícito si no existe. No sumar el fee transaccional dos veces.
6. Revisar costo total, precio resultante, margen sobre costos declarados, fuentes y advertencias.

`dedicated` cobra el costo del mes completo. `shared` requiere `assumeRemainingCapacitySold: true`;
esa venta es una hipótesis, no una capacidad confirmada. Si el recurso no puede ocuparse en otras cuentas,
usar `dedicated`. Cada línea representa una capacidad modelada, no una asignación real a una persona.
El plan aplica margen y gastos globales una sola vez, después de sumar todos los roles.

## Salida para agentes

JSON incluye `schemaVersion`, `commercialStatus`, `source` (ruta/hash/fechas) y `result`.
Un escenario también incluye `assumptions`, `sourceCostStatus`, desglose USD, fórmulas y procedencia.
Los errores salen por stderr como JSON y exit 1; audit con errores aritméticos devuelve exit 2.
No interpretar warnings comerciales como aprobación ni silenciarlos al preparar una recomendación.

## Actualizar la extracción

El JSON derivado está en [extracción](../../../data/pricing/extracted/workbook-v1.json).
Las consultas verifican el SHA256 del Excel contra el snapshot. Si cambia, devolverán `source_changed`.

```bash
pnpm --silent pricing:workbook export --out /tmp/pricing-workbook-candidate.json
pnpm --silent pricing:workbook audit --model /tmp/pricing-workbook-candidate.json
```

Revisar las diferencias antes de reemplazar el snapshot del repo. Para sobrescribir explícitamente:

```bash
pnpm --silent pricing:workbook export --out data/pricing/extracted/workbook-v1.json --overwrite
pnpm --silent pricing:workbook:test
```

Sin `--out`, `export` devuelve el JSON completo por stdout. No usar `--source` o `--out` en comandos
de consulta. Se rechazan opciones/campos desconocidos para evitar supuestos ignorados.
La exportación nunca modifica ni recalcula el Excel original; fórmulas son texto, no código ejecutable.

## Diagnóstico

- `source_changed` / `source_unavailable`: recuperar/verificar el Excel y reexportar si corresponde.
- `missing_number`: falta un número requerido; no reemplazar automáticamente por cero.
- `unfunded_capacity`: declarar la hipótesis de venta restante o usar dedicación exclusiva.
- `missing_cost_source`: agregar referencia y fecha para el costo que reemplaza al Excel.
- `invalid_margin`: usar fracciones; margen + fee deben ser menores a 1.
- `EEXIST`: destino ya existe; revisar y usar `--overwrite` sólo si se quiere reemplazarlo.

[Qué hace y límites](../../documentation/finance/pricing-workbook-cli.md) ·
[Contrato técnico](../../architecture/GREENHOUSE_PRICING_WORKBOOK_AGENT_CLI_DECISION_V1.md)
