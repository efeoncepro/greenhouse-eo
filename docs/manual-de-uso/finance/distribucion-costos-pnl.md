# Distribución de costos para P&L operativo

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-05-03 por Codex
> **Ultima actualizacion:** 2026-05-03 por Codex
> **Modulo:** Finanzas / Intelligence / P&L operativo
> **Ruta en portal:** `/finance/intelligence`
> **Documentacion relacionada:** [Distribución de costos para P&L operativo](../../documentation/finance/distribucion-costos-pnl.md), [Arquitectura Finance](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md)

## Para que sirve

Este flujo permite revisar el P&L operativo sin que gastos que no son overhead operacional inflen artificialmente el margen de un cliente.

La distribución canónica separa cada gasto en una lane de gestión:

| Lane | Uso operativo |
|---|---|
| `member_direct_labor` | Costo laboral directo de una persona asignable. |
| `member_direct_tool` | Herramienta o SaaS atribuible a una persona/asiento. |
| `client_direct_non_labor` | Gasto directo de un cliente, proyecto o servicio específico. |
| `shared_operational_overhead` | Overhead operacional compartido que sí puede repartirse entre clientes. |
| `shared_financial_cost` | Costos financieros compartidos: factoring, intereses, comisiones financieras, FX financiero. |
| `regulatory_payment` | Pagos regulatorios o previsionales como Previred, AFP, Isapre, TGR o SII. |
| `provider_payroll` | Pagos de nómina/proveedores laborales externos como Deel/EOR. |
| `treasury_transit` | Movimientos de caja, settlement o tránsito que no son costo operativo. |
| `unallocated` | Caso pendiente o ambiguo que necesita revisión humana. |

La regla central: solo `shared_operational_overhead` entra al pool de overhead operacional compartido del P&L.

## Antes de empezar

- Verifica que el período tenga ingresos, gastos y FX registrados.
- Verifica que la distribución de costos esté materializada para el período.
- Si el período muestra readiness menor a 100%, revisa si el bloqueo viene de distribución, ingresos, gastos o FX.
- No confundas categoría económica con distribución: `economic_category` dice qué es el gasto; `distribution_lane` dice dónde impacta en gestión.

## Paso a paso

### 1. Revisar el P&L por cliente

1. Entra a `/finance/intelligence`.
2. Abre el período que quieres revisar.
3. En el panel "P&L operativo por cliente", revisa `Ingresos`, `Costo laboral`, `Gastos directos`, `Overhead`, `Costo total`, `Margen bruto` y `Margen %`.
4. Si un cliente muestra overhead inesperadamente alto, no cierres el período todavía. Revisa primero la distribución canónica.

### 2. Verificar que la distribución esté lista

El período puede cerrarse solo si la distribución está completa:

- todas las expenses del período tienen resolución activa
- no hay filas `manual_required`, `blocked` o `unallocated`
- el pool `shared_operational_overhead` no contiene payroll, regulatorio, impuestos, costos financieros ni settlement

Si una de esas condiciones falla, el cierre debe quedar bloqueado hasta corregir la clasificación o aprobar una resolución.

### 3. Materializar un período

Para recalcular la distribución desde el runtime canónico:

```bash
pnpm run finance:materialize-expense-distribution -- --period 202604
```

Usa el período en formato `YYYYMM`. Por ejemplo:

- Abril 2026: `202604`
- Mayo 2026: `202605`

Después de materializar, refresca las proyecciones que consumen el P&L antes de revisar la pantalla final.

### 4. Interpretar SKY, ANAM y otros clientes

Si el overhead se ve concentrado en un cliente, revisa si realmente existe evidencia de que ese gasto sea directo.

Ejemplos de tratamiento esperado:

- Pagos Deel de Melkin: no son overhead de SKY por defecto; deben vivir como provider payroll o costo laboral directo si hay ancla válida.
- X Capital / factoring / intereses: no son overhead operacional; son costos financieros compartidos.
- Mantención de cuenta bancaria: no es costo directo de SKY; normalmente es costo financiero/operativo compartido según política.
- Previred: no es overhead de SKY; es pago regulatorio/previsional y debe anclarse al contexto laboral correspondiente.

## Sugerencias asistidas por IA

La IA de distribución es asistida y no ejecutiva.

Puede proponer una lane cuando falta evidencia, pero:

- está apagada por defecto con `FINANCE_DISTRIBUTION_AI_ENABLED=false`
- no modifica P&L automáticamente
- no cierra períodos
- no toca saldos bancarios, conciliación ni payment orders
- requiere aprobación humana antes de crear una resolución `ai_approved`

Para usarla en operación admin:

```bash
pnpm staging:request GET '/api/admin/finance/expense-distribution/suggestions?year=2026&month=4'
```

Generar sugerencias:

```bash
pnpm staging:request POST /api/admin/finance/expense-distribution/suggestions '{"year":2026,"month":4}'
```

Revisar una sugerencia:

```bash
pnpm staging:request POST /api/admin/finance/expense-distribution/suggestions/<suggestionId> '{"decision":"approve","reason":"Evidencia revisada por Finance"}'
```

Usa `reject` cuando la sugerencia no tenga evidencia suficiente o mezcle capas contables.

## Que no hacer

- No cierres un período con filas `unallocated`, `manual_required` o `blocked`.
- No metas Previred, impuestos, AFP, Isapre, SII, TGR, factoring o comisiones financieras en overhead operacional para "cuadrar rápido".
- No uses SQL directo para cambiar una resolución si existe endpoint/script canónico o si necesitas audit trail.
- No uses IA como motor automático de cierre. La IA sugiere; Finance aprueba.
- No interpretes movimientos de treasury transit como gasto operativo.
- No asumas que un gasto pertenece a SKY solo porque SKY tiene la mayor facturación del período.

## Problemas comunes

### SKY aparece con overhead inflado

Revisa si hay costos regulatorios, financieros, provider payroll o bank fees entrando como overhead operacional. Esos gastos deben salir del pool operacional salvo que exista una política explícita y auditable.

### ANAM aparece con overhead aunque no tenga ingresos

Puede ocurrir si el overhead operacional compartido se distribuye por FTE/capacidad. Revisa si el período tiene miembros/capacidad activa asociada y si el criterio de reparto corresponde al policy vigente.

### El período no deja cerrar

Consulta el readiness del período. Si la causa es distribución, materializa el período y revisa filas sin resolución activa o contaminaciones del pool compartido.

### El P&L no cambió después de materializar

La distribución puede estar correcta pero las proyecciones aún no fueron refrescadas. Refresca member capacity, commercial attribution y operational P&L antes de leer `/finance/intelligence`.

### Una sugerencia IA fue aprobada por error

No hagas un update directo. Crea una resolución manual correcta o una corrección auditada según el flujo admin vigente, dejando `reason` claro y evidencia de la revisión.

## Referencias tecnicas

- `greenhouse_finance.expense_distribution_resolution`
- `greenhouse_finance.expense_distribution_policy`
- `greenhouse_finance.expense_distribution_ai_suggestions`
- `src/lib/finance/expense-distribution/*`
- `src/lib/finance/expense-distribution-intelligence/*`
- `src/lib/cost-intelligence/check-period-readiness.ts`
- `scripts/finance/materialize-expense-distribution.ts`
