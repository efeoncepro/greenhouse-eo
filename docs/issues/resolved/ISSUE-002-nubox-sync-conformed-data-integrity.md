# ISSUE-002 — Nubox Sync Conformed Layer: Data Integrity Issues

## Ambiente

staging + production (afecta ambos)

## Detectado

- **Fecha:** 2026-03-30
- **Canal:** Validación visual de TASK-163 contra Nubox directo
- **Síntoma:** `INC-NB-25379450` tiene folio NULL y cliente incorrecto; Greenhouse muestra más registros en marzo que Nubox

## Síntoma

1. Un registro de income (`INC-NB-25379450`) aparece sin folio (`invoice_number = NULL`) y asignado a "Gobierno regional" con $752.730, cuando en Nubox corresponde a una factura con folio definido
2. Marzo 2026 en Nubox solo tiene 1 factura emitida ($6.902.000 a Sky Airline), pero Greenhouse muestra múltiples facturas de meses anteriores como si fueran del período actual
3. Los KPIs de revenue pueden estar inflados por documentos de períodos anteriores que se re-procesan

## Causa raíz

Tres problemas en la capa conformed del sync pipeline:

### Problema 1 — Sin filtro de período en lectura conformed

`readLatestRawSales()` en `sync-nubox-conformed.ts` lee TODOS los sales snapshots de BigQuery sin filtrar por período:

```sql
SELECT payload_json
FROM (
  SELECT payload_json,
    ROW_NUMBER() OVER (PARTITION BY source_object_id ORDER BY ingested_at DESC) AS rn
  FROM greenhouse_raw.nubox_sales_snapshots
  WHERE is_deleted = FALSE
)
WHERE rn = 1
-- NO HAY FILTRO POR PERÍODO
```

Luego hace `DELETE FROM greenhouse_conformed.nubox_sales WHERE TRUE` y re-inserta todo. El raw sync sí limita a 2 períodos (`sync-nubox-raw.ts:130`), pero el conformed lee toda la historia raw.

**Efecto:** documentos de 2025 y anteriores se re-procesan cada sync y llegan a income.

### Problema 2 — Identity resolution multi-space pierde client_id

`buildOrgByRutMap()` en `sync-nubox-conformed.ts` hace:

```sql
SELECT o.organization_id, o.tax_id, s.client_id
FROM greenhouse_core.organizations o
LEFT JOIN greenhouse_core.spaces s ON s.organization_id = o.organization_id AND s.active = TRUE
```

Si una organización tiene múltiples spaces activos, el Map sobreescribe con el último — puede quedar con `client_id = null` si el último space no tiene client_id.

**Efecto:** income records con `client_id = null` se skipean en `upsertIncomeFromSale()` → revenue silenciosamente perdido.

### Problema 3 — Full-refresh DELETE/INSERT sin protección

El conformed sync hace `DELETE ... WHERE TRUE` antes de re-insertar. Si el read falla (red, auth, timeout), la tabla queda vacía sin forma de recuperar.

## Impacto

| Componente | Impacto |
|------------|---------|
| Revenue total | Inflado por documentos históricos re-procesados |
| Revenue por período | Incorrecto — mezcla períodos |
| Folio de facturas | Puede ser NULL cuando no debería |
| Client attribution | Income asignado al space incorrecto o skipeado |
| Expense tracking | Expenses sin supplier_id son skipeados |
| Finance Dashboard | KPIs basados en datos incorrectos |
| P&L | Revenue y margins distorsionados |

## Solución propuesta

### Fix 1 — Filtro de período en conformed read

```sql
SELECT payload_json
FROM (
  SELECT payload_json,
    ROW_NUMBER() OVER (PARTITION BY source_object_id ORDER BY ingested_at DESC) AS rn
  FROM greenhouse_raw.nubox_sales_snapshots
  WHERE is_deleted = FALSE
    AND period_year >= EXTRACT(YEAR FROM CURRENT_DATE()) - 1  -- solo últimos 2 años
)
WHERE rn = 1
```

O mejor: filtrar por los mismos períodos que el raw sync usa (current + previous month).

### Fix 2 — Identity resolution con prioridad

```sql
SELECT o.organization_id, o.tax_id,
       MAX(s.client_id) FILTER (WHERE s.client_id IS NOT NULL) AS client_id
FROM greenhouse_core.organizations o
LEFT JOIN greenhouse_core.spaces s ON s.organization_id = o.organization_id AND s.active = TRUE
WHERE o.tax_id IS NOT NULL AND o.tax_id <> ''
GROUP BY o.organization_id, o.tax_id
```

### Fix 3 — Upsert en vez de DELETE/INSERT

Reemplazar el patrón full-refresh con MERGE/upsert que preserve registros existentes si el re-read falla.

## Verificación

1. Después del fix, verificar contra Nubox:
   - Marzo 2026: solo 1 factura ($6.902.000 a Sky, folio 114)
   - Todas las facturas tienen folio
   - No hay documentos de períodos anteriores mezclados

2. Comparar `SELECT COUNT(*), SUM(total_amount_clp) FROM income WHERE invoice_date >= '2026-03-01'` contra Nubox

## Estado

`resolved` — 2026-04-13

### Resolución

Los tres problemas fueron resueltos:

1. **Período/frescura**: el raw default dejó de depender solo de la ventana reciente; ahora combina hot window configurable con historical sweep rotativo, y la proyección a PostgreSQL usa `source_last_ingested_at` real en vez de `NOW()` como falsa señal de frescura.
2. **Identity resolution**: corregido con `GROUP BY + MAX(client_id) FILTER` en `buildOrgByRutMap()` — ya no pierde `client_id` en organizaciones multi-space.
3. **DELETE/INSERT**: la mitigación selectiva de TASK-165 no alcanzó para backfills porque BigQuery igual bloquea `DELETE` sobre filas en streaming buffer. Desde `2026-04-13`, el writer conformed quedó append-only por snapshots y los readers relevantes resuelven latest snapshot por ID; con eso se elimina la dependencia de borrar filas calientes.
4. **Recuperación operativa**: se ejecutó backfill raw `2023-01 -> 2026-04` y luego corridas exitosas `conformed -> postgres`; el estado final verificado en staging quedó `succeeded`.

## Relacionado

- `src/lib/nubox/sync-nubox-conformed.ts` — identity resolution + append-only snapshot writes
- `src/lib/nubox/sync-nubox-to-postgres.ts` — projection to Postgres
- `src/lib/nubox/mappers.ts` — field mapping (correcto)
- `src/lib/nubox/sync-nubox-raw.ts` — raw sync (correcto, filtra por período)
- TASK-163 (Finance Document Type Separation) — separación de tipos funciona correctamente, este issue es del sync layer
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — dual-store architecture
