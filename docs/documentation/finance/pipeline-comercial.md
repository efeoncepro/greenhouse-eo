# Pipeline Comercial — Vista Híbrida de Deals + Quotes Standalone

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.2
> **Creado:** 2026-04-19 por Claude (TASK-457)
> **Ultima actualizacion:** 2026-05-07 por Codex (TASK-557.1 — limpieza legacy/limbo)
> **Documentacion tecnica:**
> - Spec: [TASK-457](../../tasks/complete/TASK-457-ui-revenue-pipeline-hybrid.md)
> - Lane dedicada: [TASK-557](../../tasks/complete/TASK-557-commercial-pipeline-lane-extraction.md)
> - Deal snapshots: [TASK-456](../../tasks/complete/TASK-456-deal-pipeline-snapshots-projection.md)
> - Quote snapshots: [TASK-351](../../tasks/complete/) (quotation intelligence)
> - Lifecyclestage sync: [TASK-454](../../tasks/complete/TASK-454-lifecyclestage-sync-company-contact.md)
> - Legacy cleanup: [TASK-557.1](../../tasks/complete/TASK-557.1-legacy-quotes-cleanup-audit.md)

## Delta 2026-05-07 — TASK-557.1

Pipeline comercial ahora filtra dos señales al leer quotes standalone:

- `COALESCE(legacy_excluded, FALSE) = FALSE`
- `legacy_status IS NULL`

`legacy_excluded` oculta filas históricas o limbo marcadas por el audit operativo. `legacy_status IS NULL` se conserva para ocultar 19 filas recuperables que requieren normalización humana antes de volver al forecast comercial. Las vistas legacy de Finanzas no aplican este filtro y pueden seguir mostrando la evidencia histórica cuando corresponda.

## Delta 2026-05-07 — TASK-557

Pipeline comercial ahora tiene una lane dedicada en `/finance/intelligence/pipeline`. La URL sigue bajo `/finance/...` por compatibilidad, pero el entrypoint primario vive en el dominio **Comercial** y aparece como primer item del bloque Comercial del sidebar.

La tab **Pipeline comercial** dentro de `/finance/intelligence` se mantiene como embed compatible durante la ventana de coexistencia. Su retiro queda condicionado a:

- `comercial.pipeline` y los links internos apuntando al path dedicado.
- auditoria de deep links externos a `/finance/intelligence?tab=quotations`.
- al menos 30 dias de convivencia post-deploy.

TASK-557.1 agregó el flag `legacy_excluded` y ejecutó la limpieza inicial. La lane nueva sigue excluyendo también `legacy_status` para no mostrar recoverables no normalizadas.

## Qué es

La vista canonica `/finance/intelligence/pipeline` muestra todas las oportunidades comerciales activas de Efeonce en un solo lugar, mezclando tres tipos de oportunidad que **antes estaban divorciadas** en la UI:

Aunque el path siga usando el prefijo legacy `/finance`, el owner funcional de esta lane es **Comercial**. Finanzas la consume para forecast, revenue planning y validacion downstream.

1. **Deals de HubSpot** (net-new sales con pipeline stage)
2. **Contratos standalone** (quotes sin deal — ej. Nubox recurring, MSA/SOW activo con cliente customer, o deals ya cerrados won que están en ejecución)
3. **Pre-sales standalone** (quotes a leads/prospectos sin deal todavía)

Cada oportunidad aparece como una sola fila con un chip de categoría. No hay double-counting.

## Por qué existe

Antes de TASK-457, la sub-tab "Pipeline" (TASK-351) mostraba filas a nivel de **cotización** — cada quote era una fila. Eso producía varios problemas:

- Un deal con 3 quotes aparecía como 3 filas en el "pipeline" — double-counting del forecast
- Quotes standalone (Nubox, MSA) se mezclaban con quotes de deals sin distinción visible
- Lo que el CEO o Finance llamaba "pipeline" no coincidía con lo que mostraba la UI

TASK-456 materializó `deal_pipeline_snapshots` (1 fila por deal canónico), TASK-454 trajo `lifecyclestage` vivo por cliente. TASK-457 une ambos con las quotes standalone en una sola vista coherente.

## Las tres categorías

| Categoría | Chip | Color | Qué representa | Ejemplo |
|---|---|---|---|---|
| **Deal** | "Deal" | Primary (azul) | Deal abierto en HubSpot con pipeline stage activa | Sky Chile pidió propuesta, deal en "Presented", probabilidad 40% |
| **Contrato** | "Contrato" | Info (celeste) | Quote standalone a cliente activo (customer) O deal que ya cerró won y está en ejecución | Nubox recurring retainer, MSA de Pinturas Berel en pleno servicio |
| **Pre-sales** | "Pre-sales" | Warning (naranja) | Quote a lead/prospecto sin deal en HubSpot todavía | Colaborador mandó quote a lead qualified, aún no se creó el deal |

## Reglas del classifier

El classifier decide a qué categoría va cada oportunidad. Reglas explícitas:

1. **Si la oportunidad viene de `deal_pipeline_snapshots` y `is_open=TRUE`** → categoría `deal`
2. **Si viene de `quotation_pipeline_snapshots` (quote standalone)**, se evalúa:
   - ¿Tiene `hubspot_deal_id` asociado a un deal **abierto**? → **se excluye** (el deal grain ya representa esa oportunidad, evita double-counting)
   - ¿Tiene `hubspot_deal_id` asociado a un deal **cerrado lost**? → **se excluye** (perdido, no es forecast)
   - ¿Tiene `hubspot_deal_id` asociado a un deal **cerrado won**? → categoría `contract` (revenue en ejecución)
   - ¿No tiene `hubspot_deal_id`? → categoría según `clients.lifecyclestage` **vivo** (no snapshot histórico):
     - `customer` → `contract`
     - `lead | marketingqualifiedlead | salesqualifiedlead | opportunity` → `pre-sales`
     - cualquier otro (unknown, subscriber, etc.) → `pre-sales` (default conservador)

## Los 4 KPIs arriba

| KPI | Fórmula | Qué representa |
|---|---|---|
| **Pipeline abierto** | Sum de `amount_clp` de todas las oportunidades mostradas | Total de dinero en negociación activa |
| **Pipeline ponderado** | Sum de `amount_clp × probability / 100` | Forecast ajustado por probabilidad (lo que realmente se estima cerrar) |
| **Ganado (mes)** | Sum de `amount_clp` de deals cerrados **won** con `close_date` en el mes actual | Victoria del mes, útil para comparar contra quota |
| **Perdido (mes)** | Sum de `amount_clp` de deals cerrados **lost** del mes | Lost del mes, útil para pipeline health |

## Frontera contable: forecast no es revenue reconocido

El Pipeline reporta **forecast comercial**: deals y quotes en negociación ponderados por probabilidad. No es revenue contable ni reemplaza el cierre financiero.

Bajo ASC 606 / IFRS 15, un quote o deal no constituye revenue hasta cumplir los 5 pasos: contrato enforceable, obligaciones de desempeño identificadas, transaction price determinado, allocation a obligaciones y recognition cuando o como se satisfacen esas obligaciones.

Por eso `amount × probability` es una técnica de FP&A y planificación comercial. El revenue reconocido vive en Economía operativa, cierre de período y P&L materializado.

## Como se accede

- **Entrypoint canonico:** `Comercial > Pipeline` abre `/finance/intelligence/pipeline`.
- **Compat temporal:** `Finanzas > Economía > Pipeline comercial` sigue disponible como embed compartido para usuarios que aun entran por el wrapper financiero.
- **Deep links legacy:** `/finance/intelligence` no redirige ni se rompe en este corte.

## Cómo se usa

### Flujo típico del Account Lead

1. Entra a `Comercial > Pipeline`
2. Vista default muestra todas las oportunidades activas
3. Aplica filtros:
   - **Categoría**: ver solo deals (para review con sales manager) o solo pre-sales (para priorizar outreach)
   - **Etapa**: deals en "Negotiation" específicamente
   - **Estado del cliente**: solo leads nuevos
   - **Unidad de negocio**: Globe / Growth / etc.
4. Click en una fila → link a detalle de la oportunidad (quote detail para standalone, deal detail para deals)

### Flujo típico de Finance

1. Entra desde `Comercial > Pipeline` o, durante la convivencia, desde `Finanzas > Economía > Pipeline comercial`.
2. Valida que el total de "Contratos" cuadre con lo que está facturado/en ejecución
3. Review de deals "cerrados won" que se movieron automáticamente a categoría "contract"
4. Filtro por BU para reportería por unidad

### Flujo típico del CEO

1. Dashboard executive → mira los 4 KPIs top
2. Compara pipeline ponderado mes-a-mes
3. Drill-down por categoría para ver qué % es deal vs contract vs pre-sales

## Trampa operativa importante: transición Pre-sales → Deal

Cuando un lead se convierte en oportunidad comercial y el AE crea un deal nuevo en HubSpot, **el AE debe asociar la quote existente al deal en HubSpot** (acción humana, 1 clic).

Sin ese paso:
- La quote queda "colgada" como `pre-sales` para siempre
- Aunque el deal se gane y el cliente se vuelva customer, la quote no se detecta como "contract"
- El forecast del CEO queda incompleto

El reminder está en la UI como Alert colapsable ("Entendido" persiste en localStorage para no molestar después).

## Qué NO hace

- **No edita deal stage** desde esta UI — es solo lectura. El AE edita en HubSpot y el siguiente sync (4h) refleja el cambio
- **No muestra drill-down deal → quotes asociadas** — solo cuenta `quoteCount` y `approvedQuoteCount`. Para ver las quotes del deal, click "Ver" (follow-up: drill-down UI)
- **No permite forecast editable** ni scenarios "what-if" — probabilidad viene del snapshot de `hubspot_deal_pipeline_config`
- **No exporta a Excel/PDF** — follow-up

## Cómo se diferencia de las otras sub-tabs

El tab "Pipeline comercial" tiene 3 sub-tabs:

| Sub-tab | Grain | Fuente | Propósito |
|---|---|---|---|
| **Pipeline** (TASK-457, este doc) | Mixto (deal + quote) | `deal_pipeline_snapshots` ∪ `quotation_pipeline_snapshots` | Forecast de revenue futuro |
| **Rentabilidad** (TASK-351) | Quote | `quotation_profitability_snapshots` | Drift de margen cotizado vs efectivo |
| **Renovaciones** (TASK-351) | Quote | `quotation_pipeline_snapshots` filtrado | Quotes próximas a expirar + expiradas |

Las dos últimas son quote-level correctamente — cada quote es una unidad de margen y renovación independiente. Solo la primera (Pipeline) cambió a modelo híbrido porque el forecast de revenue SÍ es deal-level.

## Fuentes de datos

| Dato | Tabla | Se actualiza |
|---|---|---|
| Deal open/closed/won/lost | `greenhouse_serving.deal_pipeline_snapshots` | Reactive — se materializa al cambiar un deal via TASK-456 projection |
| Quote status/amount/expiry | `greenhouse_serving.quotation_pipeline_snapshots` | Reactive — materializado por `quotation_pipeline` projection de TASK-351 |
| `lifecyclestage` del cliente | `greenhouse_core.clients.lifecyclestage` | Cron 6h de HubSpot sync (TASK-454) — lectura **vivo**, no snapshot histórico |
| `hubspot_deal_id` de la quote | `greenhouse_commercial.quotations` | Cron 4h del deal-bridge (TASK-453) — AE asocia la quote en HubSpot, llega en próximo sync |

> **Detalle técnico:** código en [src/lib/commercial-intelligence/revenue-pipeline-reader.ts](../../../src/lib/commercial-intelligence/revenue-pipeline-reader.ts). Endpoint en [src/app/api/finance/commercial-intelligence/revenue-pipeline/route.ts](../../../src/app/api/finance/commercial-intelligence/revenue-pipeline/route.ts). Componente UI en [src/views/greenhouse/finance/workspace/PipelineBoardUnified.tsx](../../../src/views/greenhouse/finance/workspace/PipelineBoardUnified.tsx).

## Próximos pasos (follow-ups)

- Drill-down deal → lista de quotes asociadas con document chain por quote
- Forecast revenue editable: override por quote/deal con audit trail
- Snapshot histórico del pipeline para comparar week-over-week
- Export a Excel/PDF para reportería mensual
- Widget del pipeline en la home ejecutiva
