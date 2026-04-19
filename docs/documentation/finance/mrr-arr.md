# MRR/ARR — Proyección Contractual de Revenue Recurrente

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-19 por Claude (TASK-462)
> **Ultima actualizacion:** 2026-04-19 por Claude
> **Documentacion tecnica:**
> - Spec: [TASK-462](../../tasks/complete/TASK-462-mrr-arr-contractual-projection-dashboard.md)
> - Contracts entity: [TASK-460](../../tasks/complete/TASK-460-contract-sow-canonical-entity.md)
> - Delivery model: [TASK-459](../../tasks/complete/TASK-459-delivery-model-refinement.md)

## Qué es

El dashboard MRR/ARR vive en `/finance/intelligence` tab **"MRR/ARR"** y responde en un solo click una pregunta que antes requería abrir Excel: **¿cuánto revenue recurrente tiene Efeonce este mes, y cómo evolucionó?**

MRR (Monthly Recurring Revenue) = suma del `mrr_clp` de todos los contracts **retainer activos** en el mes.
ARR (Annual Recurring Revenue) = MRR × 12 (convención SaaS estándar, no deriva de fechas de cierre).

## Por qué existe

Efeonce opera con ~85% de revenue retainer recurrente. Antes de TASK-462:

- La fuente de verdad era un Excel mantenido manualmente por Finance
- Nadie podía responder "¿cuánto es el MRR hoy?" sin abrirlo
- Churn, expansion y reactivation eran invisibles en la UI
- El dashboard ejecutivo perdía señal crítica

Con TASK-460 ya canonicalizado (`greenhouse_commercial.contracts` con `mrr_clp`), TASK-462 materializa la proyección serving y expone la UI.

## Los 4 KPIs principales

| KPI | Fórmula | Qué responde |
|---|---|---|
| **MRR actual** | `Σ mrr_clp` de contracts activos este mes | "¿Cuánto revenue recurrente estoy generando este mes?" |
| **ARR anualizado** | `MRR × 12` | "¿A cuánto equivale si se mantiene todo el año?" |
| **NRR 12 meses** | `(Starting + Expansion + Reactivation - Contraction - Churn) / Starting` | "¿Cómo creció mi cohort de hace un año? (>100% = crecimiento orgánico)" |
| **Contratos activos** | Count de contracts retainer con `mrr_clp` configurado | "¿Cuántos contratos generan revenue este mes?" |

## Los 6 tipos de movimiento (classifier)

Cada contract que aparece en un snapshot mensual recibe un `movement_type` comparado contra el mes anterior:

| Movement | Cuándo | Color |
|---|---|---|
| **Nuevo** | Primera vez que aparece el contract en el pipeline | Verde (success) |
| **Expansion** | MRR subió vs mes anterior | Azul (info) |
| **Contracción** | MRR bajó vs mes anterior pero sigue > 0 | Naranja (warning) |
| **Churn** | Contract que antes tenía MRR > 0 ahora no está activo o MRR = 0 | Rojo (error) |
| **Reactivación** | Contract volvió a MRR > 0 después de haber churneado previamente | Primary (primary) |
| **Sin cambio** | MRR igual al mes anterior | Default |

El classifier se ejecuta automáticamente cuando se materializa un período, basado en el snapshot del mes inmediatamente anterior.

## El timeline chart (12 meses)

Bar chart stacked que muestra la descomposición mensual:
- **Positivo (crecimiento)**: Nuevo + Expansion + Reactivación apilados hacia arriba
- **Negativo (contracción)**: Contracción + Churn apilados hacia abajo

Visualmente muestra si el negocio crece (barras verdes/azules/cyan dominando) o se erosiona (barras naranjas/rojas creciendo).

## Breakdown por dimensión

Tres cards al lado de la home:

| Breakdown | Para qué sirve |
|---|---|
| **Por modelo comercial** | Distribución retainer vs otros (hoy solo retainer entra al MRR) |
| **Por modelo de staffing** | `named_resources` (equipo dedicado) vs `outcome_based` (por entregable) vs `hybrid` |
| **Por unidad de negocio** | Globe, Growth, etc. — cada BU contribuye distinto al MRR total |

Cada card muestra MRR + count de contratos para esa dimensión.

## Top 10 contracts

Tabla ordenada por MRR descendente con los 10 mayores contribuyentes. Columnas:
- Contrato (número + cliente)
- Modelo comercial / Staffing
- MRR / ARR
- Δ vs mes anterior (verde si subió, rojo si bajó)
- Chip de movement

Útil para: "¿Quiénes son mis top clients recurrentes? ¿Alguno entró en churn o contracción?"

## Cómo se usa

### Flujo del CEO / Finance Lead
1. Entra a `/finance/intelligence` → tab "MRR/ARR"
2. Revisa los 4 KPIs: ¿MRR creció vs mes anterior? ¿NRR > 100%?
3. Mira el timeline: ¿hay meses donde churn supera a expansion? ¿la tendencia es alcista?
4. Navega entre meses con botones "Mes anterior / Mes siguiente"
5. Abre breakdown cards: ¿qué BU genera más MRR? ¿qué modelo de staffing?
6. Ve top 10: ¿algún cliente grande churneó? ¿quién expandió?

### Flujo del Account Lead
1. Después de cerrar una renovación con expansion de scope, verifica que aparezca como **Expansion** en el snapshot del mes actual
2. Si un cliente canceló, verifica que aparezca como **Churn** y que el MRR del mes siguiente refleje la baja

## Cómo se actualiza

**Reactive materialization**: cada vez que hay un evento `commercial.contract.{created,activated,renewed,modified,terminated,completed}`, la projection `contractMrrArrProjection` dispara el materializer del mes actual. En menos de 5 minutos después del cambio, el dashboard refleja el estado nuevo.

**Backfill**: el script `scripts/backfill-mrr-arr-snapshots.ts` (opcional) puede materializar mes-a-mes desde el primer contract retainer histórico hasta hoy, dando historia completa para el timeline.

## Qué NO hace (MVP)

- **No hace forecast de MRR futuro** — requiere modelo predictivo (follow-up)
- **No hace cohort analysis** (retention curves) — follow-up
- **No es revenue recognition contable** — el MRR aquí es billing commercial, distinto de lo que contabilidad reconoce por mes
- **No incluye contracts `commercial_model='project'` ni `one_off`** — por definición MRR es solo retainer recurrente
- **No incluye contracts sin `mrr_clp` poblado** — se excluyen con alerta "configurar MRR"

## Fuentes de datos

| Dato | Tabla | Se actualiza |
|---|---|---|
| Contracts activos + MRR | `greenhouse_commercial.contracts` (TASK-460) | Al promover quote approved → contract, o al modificar scope |
| Snapshots mensuales | `greenhouse_serving.contract_mrr_arr_snapshots` (TASK-462) | Reactive: al llegar evento `commercial.contract.*`, re-materializa período actual |
| Client names | `greenhouse_core.clients` | JOIN en el reader (TASK-454 sync + canonical identity) |
| Business lines | Campo `business_line_code` en contract | Cargado al crear contract |

## Qué diferencia este dashboard de los otros 3 tabs

Tab "Economía operativa" tiene 4 tabs outer post-TASK-462:

| Tab | Grain | Fuente | Para qué |
|---|---|---|---|
| **Cierre de período** (existente) | Mensual global | `period_closure_snapshots` | Cerrar P&L operativo |
| **Rentabilidad por cliente** (existente) | Cliente-mes | `client_economics_snapshots` | Ver margen por cliente |
| **Pipeline comercial** (TASK-457) | Deal + quote híbrido | `deal_pipeline_snapshots` + `quotation_pipeline_snapshots` | Forecast de revenue **futuro** |
| **MRR/ARR** (este doc) | Contract-mes | `contract_mrr_arr_snapshots` | Revenue **recurrente firmado** |

Pipeline ≠ MRR: Pipeline es oportunidad que **podría** cerrar. MRR es contract **activo** generando revenue hoy.

> **Detalle técnico:** código en [src/lib/commercial-intelligence/mrr-arr-materializer.ts](../../../src/lib/commercial-intelligence/mrr-arr-materializer.ts) + [mrr-arr-store.ts](../../../src/lib/commercial-intelligence/mrr-arr-store.ts). Projection en [src/lib/sync/projections/contract-mrr-arr.ts](../../../src/lib/sync/projections/contract-mrr-arr.ts). UI en [src/views/greenhouse/finance/MrrArrDashboardView.tsx](../../../src/views/greenhouse/finance/MrrArrDashboardView.tsx). Migration [migrations/20260419083556852_task-462-mrr-arr-schema.sql](../../../migrations/20260419083556852_task-462-mrr-arr-schema.sql).

## Próximos pasos (follow-ups)

- Forecast MRR futuro con modelo predictivo (churn probability, expansion likelihood)
- Cohort analysis: retention curves por mes de incorporación
- Surface MRR top-line en home ejecutiva (widget)
- Nexa weekly digest incluye MRR MoM Δ + top movements
- Drill-down por contract → timeline histórico de ese contract específico
- Alert automático si NRR cae bajo umbral crítico
