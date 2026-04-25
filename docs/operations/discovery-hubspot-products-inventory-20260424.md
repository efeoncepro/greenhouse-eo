# HubSpot Products Inventory — 2026-04-24

> **Tipo de documento:** Reporte operativo (TASK-601 Fase A Discovery)
> **Portal HubSpot:** 48713323
> **Scanned at:** 2026-04-24T13:30:00Z
> **Total productos:** 74
> **Script reproducible:** [`scripts/discovery/hubspot-products-inventory.ts`](../../scripts/discovery/hubspot-products-inventory.ts)
> **Método:** HubSpot MCP directo (el middleware Cloud Run `hubspot-greenhouse-integration` v1 no expone raw properties; el script se vuelve ejecutable cuando TASK-603 despliegue contract v2)

---

## Resumen ejecutivo

| Métrica | Valor |
|---|---|
| Productos totales | 74 |
| Con al menos 1 `hs_price_*` poblado | **42/74 (57%)** |
| Con `hs_cost_of_goods_sold` seteado | **33/74 (45%)** |
| Con `hubspot_owner_id` | **0/74** |
| Con `hs_url` | **0/74** |
| Con `hs_images` | **0/74** |
| Con `hs_rich_text_description` | **~6/74** (igual al plain `description` cuando poblado) |

## Distribución de precios por moneda

| Currency | Populated | % |
|---|---|---|
| CLP | 34/74 | 46% |
| USD | 42/74 | 57% |
| CLF (UF) | 34/74 | 46% |
| COP | 34/74 | 46% |
| MXN | 34/74 | 46% |
| PEN | 32/74 | 43% |

USD es la moneda más cobertura. Los 32 productos sin ningún precio incluyen los EFG recientes sin pricing, el E2E smoke, varios EFO, y algunos ETG tools base.

## Distribuciones por property

### `categoria_de_item`

- Populated: **36/74** (49%)
- Null: 38
- Valores únicos (4):
  - `Staff augmentation` — 32
  - `Retainer (On-Going)` — 2
  - `Proyecto o Implementación` — 1
  - `Licencia / Acceso Tecnológico` — 1

### `unidad`

- Populated: **1/74** (1%)
- Null: 73
- Valores únicos (1):
  - `Licencia` — 1 (solo EFO-001)

### `hs_product_type`

- Populated: **32/74** (43%)
- Null: 42
- Valores únicos (3):
  - `non_inventory` — 30
  - `service` — 2 (EFG-002, EFG-003)
  - `inventory` — 1 (ECG-002) — outlier, probablemente misclassification

### `hs_pricing_model`

- Populated: **74/74** (100%)
- Valores únicos (1): `flat` — 74

### `hs_product_classification`

- Populated: **74/74** (100%)
- Valores únicos (1): `standalone` — 74

### `hs_bundle_type`

- Populated: **74/74** (100%)
- Valores únicos (1): `none` — 74

### `hs_status`

- Populated: **74/74** (100%)
- Valores únicos (1): `active` — 74 (0 inactive)

### `recurringbillingfrequency`

- Populated: **34/74** (46%)
- Valores únicos (1): `monthly` — 34

### `gh_source_kind`

- Populated: **74/74** (100%)
- Valores únicos (4):
  - `sellable_role` — 33 (ECG-*)
  - `tool` — 26 (ETG-*)
  - `overhead_addon` — 8 (EFO-*)
  - `service` — 7 (EFG-*)

### `gh_business_line`

- Populated: **27/74** (36%)
- Null: 47
- Valores únicos (7) — **⚠️ data quality issues**:
  - `wave` (lowercase) — 11 (tools)
  - `globe` (lowercase) — 8 (tools)
  - `Wave` (capitalizado) — 3 (services EFG-001, EFG-005, EFG-006)
  - `reach` (lowercase) — 1 (Metricool tool)
  - `Globe` (capitalizado) — 1 (service EFG-002)
  - `Efeonce` (capitalizado) — 1 (service EFG-004)
  - `Efeonce / Globe / Wave / Reach` (multi-valor string) — 1 (service EFG-007)

## Options de enumeration HS relevantes (para seed de ref tables)

### `unidad` — 12 options

Seedeadas 1:1 en `greenhouse_commercial.product_units`:
`Hora`, `FTE`, `Día`, `Mes`, `Trimestre`, `Proyecto`, `Entrega`, `Año`, `Licencia`, `Bolsa`, `Créditos`, `Addon`

### `categoria_de_item` — 5 options

Seedeadas 1:1 en `greenhouse_commercial.product_categories`:
`Staff augmentation`, `Proyecto o Implementación`, `Retainer (On-Going)`, `Consultoría Estratégica - IP`, `Licencia / Acceso Tecnológico`

### `hs_tax_category` — 0 options ⚠️

**Options array vacío en el portal.** Follow-up governance: coordinar con HS admin la creación de options (`standard`, `exempt`, `non_taxable`, etc.) para habilitar mapping bidi en TASK-603 (Fase C outbound). Por ahora los seeds de `greenhouse_finance.tax_categories` llevan `hubspot_option_value=NULL`.

### `recurringbillingfrequency` — 10 options HS canónicos

`weekly`, `biweekly`, `monthly`, `quarterly`, `per_six_months`, `annually`, `per_two_years`, `per_three_years`, `per_four_years`, `per_five_years`. Guardados como string directo en `recurring_billing_frequency_code`.

### `hs_recurring_billing_period` — string libre

Type `string`, NO enumeration. HS espera ISO 8601 duration (`P12M`, `P1Y`, etc.). Columna `recurring_billing_period_iso` en el catálogo.

---

## Implicaciones para el programa TASK-587

### TASK-601 (Fase A) — schema + ref tables [ESTE TASK]

- ✅ **Seeds validados** contra las `hubspot_option_value` observadas. Las 4 ref tables quedan alineadas 1:1 con el portal para `product_categories` y `product_units`.
- ✅ **`product_source_kind_mapping` sembrado** con 7 source kinds (los 5 canónicos + `sellable_role_variant` + `hubspot_imported` observados en TASK-545 CHECK).
- ⚠️ **Data quality `gh_business_line`**: casing inconsistente (wave/Wave, globe/Globe) + valor multi-BU concatenado — candidato a task follow-up de limpieza. TASK-601 no lo toca.

### TASK-602 (Fase B) — multi-currency prices

- **No es green-field completo**: 42/74 productos ya tienen precios en HS. El Discovery seed de Fase B debe capturar estos valores como `source='hs_seed'` autoritativos antes del primer outbound.
- USD lidera cobertura (42/74), CLP segundo (34/74). La derivación FX aplica a las monedas faltantes después del seed.
- Los 32 productos sin precio alguno nacen con precio NULL en GH — operador los setea via UI admin (TASK-605).

### TASK-603 (Fase C) — outbound v2 + COGS unblock

- **33/74 productos tienen COGS real** en HS. El desbloqueo de COGS outbound (TASK-603) entrega valor inmediato — los GH-side COGS que no están en HS se propagan.
- **0/74 tienen `hubspot_owner_id` en HS**: el owner bridge nace efectivamente green-field. La conflict resolution `HS-wins durante ventana sin UI` (TASK-604) se simplifica — no hay conflicts reales hasta que alguien empiece a setear owners.
- **`hs_product_type` actualmente solo en 32/74**: el primer outbound v2 normaliza a los 74.
- **`hs_pricing_model`, `hs_product_classification`, `hs_bundle_type` ya están 100% poblados con los defaults esperados** (`flat`/`standalone`/`none`). El outbound v2 confirmará estos valores — no debería causar drift.

### TASK-604 (Fase D) — inbound rehydration

- `marketing_url`: 0/74 hoy — mapeo trivial cuando el operador los setee.
- `image_urls`: 0/74 hoy — validar shape array en el middleware.
- `description_rich_html`: ~6/74 con contenido (igual al plain `description`) — propagar a `description_rich_html` en primer sync.

### TASK-605 (Fase E) — admin UI + backfill + governance

- Backfill masivo tocará los 74 productos; primer outbound v2 es un rehydrate completo del portal.
- Field permissions HS deben bloquear escritura operativa sobre TODOS los fields catalog (CLP/USD/CLF/COP/MXN/PEN, name, description, classification, type, category, unit, tax, recurrencia, status, COGS).
- `hubspot_owner_id` queda editable (soft-SoT hasta que UI admin flip a GH-wins).

---

## Outliers y observaciones

1. **ECG-036 `TASK-563 E2E live-smoke-20260422d`**: producto de test generado por el smoke de TASK-563. El backfill debería excluir/marcar outliers E2E de producción — follow-up si emerge.
2. **ECG-002 con `hs_product_type=inventory`**: único producto clasificado como inventory. Es un staff role, debería ser `service`. Candidato a corrección automática por el outbound v2 vía `product_source_kind_mapping` (`sellable_role → service`).
3. **EFO-001 único con `unidad=Licencia`**: todos los otros 73 productos no tienen unidad seteada — operativamente la unidad se infiere del SKU prefix hoy. El outbound v2 va a poder escribir `unidad` consistentemente.
4. **EFG-007 con `gh_business_line="Efeonce / Globe / Wave / Reach"`**: string multi-BU concatenado. Indica que este producto se ofrece en 4 BUs. El modelo actual no soporta multi-BU — candidato a rediseño en follow-up (posible `product_business_lines` many-to-many).

---

## Próximos pasos

1. **TASK-601 cierra aquí** — schema + ref tables + este Discovery.
2. **TASK-602 inicia** con este reporte como input para el Discovery script de prices (reuse de `hs_price_*` observados).
3. **Governance follow-up**: coordinar con HubSpot portal admin la creación de options en `hs_tax_category`.
4. **Data quality follow-up**: definir task de cleanup para `gh_business_line` casing + multi-BU handling.
