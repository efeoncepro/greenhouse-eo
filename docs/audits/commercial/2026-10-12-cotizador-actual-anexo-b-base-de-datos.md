# Anexo B — Base de datos: esquema y datos vivos

> **Pertenece a:** [Auditoría del cotizador actual de Greenhouse — 2026-10-12](2026-10-12-cotizador-actual-auditoria.md).
> **Alcance:** el cotizador de producción del portal (`greenhouse_commercial.*`, el legado `greenhouse_finance.quotes*` y los espejos de servicio y de HubSpot). No cubre la CLI local «Pricing V3».
> **Fecha de medición:** 2026-10-12, cerca de las 08:10 UTC. Los números se mueven: dos trabajos de sincronización tocan estas tablas varias veces al día.
> **Instancia:** Cloud SQL `greenhouse-pg-dev`, base `greenhouse_app`, PostgreSQL 16. Una sola instancia para desarrollo, staging y producción: cada número de abajo es «todo lo que hay».
> **Conexión:** usuario de runtime, cada sesión con `default_transaction_read_only=on` y `statement_timeout=60s`. Solo corrieron `SELECT` y lecturas de catálogo. Sin DDL, sin DML, sin comandos de migración.
> **Marcas:** **[V-vivo]** = verificado con una consulta en vivo; **[V-código]** = verificado leyendo un archivo del repositorio; **[I]** = inferido.
> **Privacidad:** solo agregados. No se copiaron nombres de clientes ni de personas, remuneraciones ni precios individuales. Las formas JSON son solo nombres de llave y tipos.
> **SQL exacto:** cada número lleva un identificador de consulta (`Q1`, `M5`, `J8`…). El texto completo de cada consulta está en el apéndice, tal cual se ejecutó.

Las notas marcadas **«Corrección de la consolidación»** son ajustes hechos al cruzar este informe con los otros dos.

---

## 1. Inventario del esquema

Las 75 tablas de `greenhouse_commercial` pertenecen a `greenhouse_ops` (`G5`). El usuario de runtime tiene INSERT, UPDATE y DELETE sobre todas las tablas de cotización y de auditoría (`G4`).

«Creada por» y «último cambio» salen de buscar en `migrations/**` el DDL que nombra al objeto (script `migmap.sh`, en el apéndice). Los conteos de filas son `count(*)` exactos (`sql_counts`).

### 1.1 Núcleo de cotización

| Objeto | Filas | Creada por | Último cambio de DDL |
| --- | ---: | --- | --- |
| `greenhouse_commercial.quotations` (100 columnas) | 110 | `20260417103700979_task-345-quotation-canonical-schema-finance-compatibility-bridge` | `20260507125706498_task-557-1-add-legacy-excluded-flag` (12 migraciones la tocan) |
| `greenhouse_commercial.quotation_versions` | 100 | task-345 (mismo archivo) | nunca cambió |
| `greenhouse_commercial.quotation_line_items` (57 columnas) | 135 | task-345 | `20260421162238991_task-530-quote-tax-snapshot` (6 migraciones) |
| `greenhouse_commercial.quotation_line_cost_override_history` | 0 | `20260420135821435_task-481-quote-line-cost-override-governance` | — |
| `greenhouse_commercial.quotation_audit_log` | 20 | `20260417140553325_task-348-quotation-governance-runtime` | `20260419212111960_task-504-…` |
| `greenhouse_commercial.quotation_terms` | 16 | task-348 | — |
| `greenhouse_commercial.terms_library` | 6 | task-348 | — |
| `greenhouse_commercial.approval_policies` | 3 | task-348 | `20260421011323497_task-466-…` |
| `greenhouse_commercial.approval_steps` | 0 | task-348 | task-504 |
| `greenhouse_commercial.quote_templates` / `quote_template_items` | 0 / 0 | task-348 | — |
| `greenhouse_commercial.quotation_renewal_reminders` | 2 | `20260418005940703_task-351-quotation-intelligence` | `20260418020055064_task-351-runtime-grants` |
| `greenhouse_commercial.quote_short_links` | 0 | `20260425010847591_task-631-quote-short-links` | — |
| `greenhouse_commercial.quote_share_views` | 0 | `20260425013645028_task-631-fase2-acceptance-tracking` | — |
| `greenhouse_commercial.quote_pdf_assets` | 1 | `20260425114402117_task-631-fase4-email-org-pdf-attach` | — |
| `greenhouse_commercial.commercial_operations_audit` (cierre a factura) | 3 | `20260421150625283_task-541-commercial-operations-audit` | `20260621222152560_task-1206-q2c-audit-suspended-status` |
| `greenhouse_finance.quotes` (legado, 33 columnas) | 88 | script previo a migraciones `scripts/setup-postgres-*.sql`; propiedad en `20260402000000000_consolidate-ownership-to-greenhouse-ops` | `20260407182811937_add-hubspot-quotes-columns` |
| `greenhouse_finance.quote_line_items` (legado) | 147 | `20260407193443222_create-products-and-quote-line-items` | — |

Columnas clave de `quotations` y la migración que las agregó **[V-código]**: el `CHECK` de `status` lo reescribió task-504 (`20260419212111960`); el `CHECK` de `currency` lo amplió task-466; `sales_context_at_sent` task-455; `contact_identity_profile_id` task-486; `pricing_context` y `pricing_input` de línea task-480 (`20260420131341856`); `cost_override_*` de línea task-481; `tax_code` / `tax_snapshot_json` task-530; `billing_start_date` task-576; `hubspot_quote_status|link|pdf_download_link|locked` task-583; `accepted_*` task-631 fase 2; `legacy_excluded*` task-557-1.

**Restricciones de las tres tablas núcleo [V-vivo]:**

- `quotations`: PK `quotation_id` (por defecto `'qt-' || gen_random_uuid()`), UNIQUE `finance_quote_id`, 4 FK (cliente, organización, espacio, perfil de identidad del contacto, todas `ON DELETE SET NULL`), 14 CHECK. Enumeraciones: `status` ∈ {draft, pending_approval, approval_rejected, issued, expired, converted}; `currency` ∈ {CLP, USD, CLF, COP, MXN, PEN}; `pricing_model` ∈ {staff_aug, retainer, project}; `commercial_model` ∈ {retainer, project, one_off}; `staffing_model` ∈ {named_resources, outcome_based, hybrid}; `revenue_type` ∈ {recurring, one_time, hybrid}; `billing_frequency` ∈ {monthly, milestone, one_time}; `escalation_mode`; `global_discount_type`; `tax_code` ∈ {cl_vat_19, cl_vat_exempt, cl_vat_non_billable}; un CHECK de coherencia amarra `tax_code`, `tax_snapshot_json` y `tax_snapshot_frozen_at`.
- `quotation_versions`: PK `version_id`, UNIQUE `(quotation_id, version_number)`, FK a `quotations ON DELETE CASCADE`, un CHECK (`snapshot_json` es un arreglo JSON).
- `quotation_line_items`: PK `line_item_id`, UNIQUE `finance_line_item_id`, FK a quotations (CASCADE), `product_catalog`, `greenhouse_ai.tool_catalog`, `overhead_addons`, `greenhouse_core.service_modules` (todas SET NULL), 11 CHECK (`line_type` ∈ {person, role, deliverable, direct_cost}; `unit` ∈ {hour, month, unit, project}; `recurrence_type`; coherencia del ajuste de costo; exclusividad herramienta / recargo; código de impuesto).
- **No existe ningún disparador sobre ninguna tabla de cotización** (el único disparador en alcance está en `deals`). Sin disparador de `updated_at`, sin guarda de inmutabilidad, sin guarda de solo-agregar.
- **Ninguna secuencia respalda la numeración de cotizaciones** (`pg_sequences`): las únicas secuencias son contadores de SKU y de identificadores de fotos.

### 1.2 Catálogo de precios

| Objeto | Filas | Creada por |
| --- | ---: | --- |
| `sellable_roles` | 38 (32 activos) | `20260418203054136_task-464a-sellable-roles-foundation` |
| `sellable_role_cost_components` (PK rol × tipo de contratación × effective_from) | 31 | task-464a; ampliada por `20260419151636951_task-477-role-modeled-cost-basis` |
| `sellable_role_pricing_currency` (PK rol × moneda × effective_from) | 192 | task-464a |
| `role_employment_compatibility` | 31 | task-464a |
| `employment_types` / `employment_type_aliases` | 7 / 7 | task-464a / `20260418211035632_task-468-…` |
| `role_tier_margins`, `service_tier_margins` (PK nivel × effective_from) | 4 / 4 | `20260418212705475_task-464b-pricing-governance-tables` |
| `commercial_model_multipliers` (PK modelo × effective_from) | 4 | task-464b |
| `country_pricing_factors` (PK factor × effective_from) | 6 | task-464b |
| `fte_hours_guide` (PK fracción × effective_from) | 11 | task-464b |
| `margin_targets` | 6 | `20260417124905235_task-346-quotation-pricing-config` |
| `role_rate_cards` | **0** | task-346 (tocada por última vez en task-466) |
| `revenue_metric_config` | 6 | task-346 |
| `service_pricing` (PK `module_id`) | 7 | `20260419093339069_task-465-service-composition-catalog` |
| `service_role_recipe` / `service_tool_recipe` | 7 / 14 | task-465 |
| `overhead_addons` | 9 | `20260418214928987_task-464c-tool-catalog-overhead-addons` |
| `greenhouse_ai.tool_catalog` (columnas de precio agregadas por task-464c) | 34 | script previo a migraciones; task-464c |
| `greenhouse_core.tool_catalog` (una segunda lista de herramientas, sin relación) | 29 | `20260411102251746_tool-catalog-member-tools` |
| `pricing_catalog_audit_log` | 104 | `20260419003745335_task-467-…`; lista de entidades ampliada hasta `20260422011657625_task-548-…` |
| `pricing_catalog_approval_queue` | **0** | `20260420235850220_task-471-pricing-catalog-approval-queue` |
| `commercial_cost_basis_snapshots` (corridas del worker) | 178 | `20260419120945432_task-483-commercial-cost-worker-foundation` |
| `member_role_cost_basis_snapshots` / `role_blended_cost_basis_snapshots` | 66 / 16 | `20260419141717643_task-479-…` |
| `role_modeled_cost_basis_snapshots` | **0** | task-477 |
| `tool_provider_cost_basis_snapshots` | **0** | `20260419132037430_task-478-…` |

Funciones y secuencias **[V-vivo `G2`, V-código]**: `generate_sellable_role_sku()` → `'ECG-' || LPAD(nextval, 3, '0')` sobre `sellable_role_sku_seq` (último valor 38); `generate_overhead_addon_sku()` → `EFO-` (9); `generate_service_sku()` → `EFG-` (secuencia nunca llamada; los 7 servicios se habrían sembrado con SKU explícitos **[I]**); `greenhouse_ai.tool_sku_seq` → `ETG-` (26); `generate_commercial_cost_basis_public_id()` → `EO-CCB-` + 6 dígitos (178); identificadores de fotos de persona y «blended» en 1650 y 394.

### 1.3 Espejos de HubSpot, negocios y catálogo de productos

| Objeto | Filas | Creada por |
| --- | ---: | --- |
| `greenhouse_commercial.product_catalog` (53 columnas, espejo de productos de HubSpot) | 77 | task-345; último DDL `20260424133208734_task-601-…` (6 migraciones) |
| `product_catalog_prices` + vista `product_catalog_authoritative_price` | 215 | `20260424174148326_task-602-…` / `…148937_task-602-…-view` |
| `product_categories` / `product_units` / `product_source_kind_mapping` | 5 / 12 / 7 | task-601 |
| `product_sync_conflicts` | 90 | `20260421122812484_task-545-…` |
| `greenhouse_commercial.deals` (disparador `trg_commercial_deals_apply_stage_config`) | 35 | `20260418224710163_task-453-commercial-deals-canonical-bridge` |
| `deal_create_attempts` | 18 | `20260421143050333_task-539-…` |
| `greenhouse_crm.deals` (espejo más antiguo) | 25 | script previo a migraciones |
| Identificadores de HubSpot guardados en cotizaciones: `hubspot_quote_id`, `hubspot_deal_id`, `hubspot_last_synced_at`, `hubspot_quote_status|link|pdf_download_link|locked`; en líneas: `hubspot_line_item_id`, `hubspot_product_id` | — | task-345, task-583 |

### 1.4 Qué cuelga de una cotización aguas abajo

Toda columna de la base cuyo nombre contiene `quot`:

| Columna que referencia | ¿FK? | Filas con valor |
| --- | --- | ---: |
| `greenhouse_finance.income.quotation_id` | FK, SET NULL | 3 de 89 |
| `greenhouse_finance.purchase_orders.quotation_id` | FK, SET NULL | 0 de 2 |
| `greenhouse_finance.service_entry_sheets.quotation_id` | FK, SET NULL | 0 de 1 |
| `greenhouse_commercial.contracts.originator_quote_id` | FK, SET NULL | 25 de 25 |
| `greenhouse_commercial.contract_quotes.quotation_id` | FK, **RESTRICT** | 3 |
| `greenhouse_commercial.proposals.quote_id` (+ `quote_snapshot_json`) | FK, sin acción | 0 de 4 |
| `greenhouse_commercial.engagement_outcomes.next_quotation_id` | FK, SET NULL | 0 de 0 |
| `greenhouse_commercial.commercial_operations_audit.quotation_id` | FK, SET NULL | la tabla tiene 3 filas |
| `greenhouse_serving.quotation_pipeline_snapshots.quotation_id` | FK, CASCADE | 72 |
| `greenhouse_serving.quotation_profitability_snapshots.quotation_id` | FK, CASCADE | 6 |
| `greenhouse_serving.deal_pipeline_snapshots.latest_quote_id` | FK, SET NULL | 14 de 35 |
| `quote_pdf_assets.quotation_id`, `quote_short_links.quotation_id`, `quote_share_views.quotation_id` | **sin FK** | 1 / 0 / 0 |
| `quotations.finance_quote_id`, `.hubspot_deal_id`, `.converted_to_income_id`, `.accepted_via_short_code`, `.created_by`, `.issued_by`, `.business_line_code` | **sin FK** | ver §2.7 |

Ninguna vista ni vista materializada depende de las tablas de cotización (`G3`); la única vista dependiente en alcance es `product_catalog_authoritative_price`.

### 1.5 Documentos contra el esquema vivo

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` nombra cinco tablas que no existen: `greenhouse_commercial.product_overhead_defaults`, `.profitability_tracking`, `.purchase_orders`, `.revenue_pipeline`, `.service_entries` **[V-vivo]**. Sus funciones terminaron en `greenhouse_finance.purchase_orders` / `service_entry_sheets` y en `greenhouse_serving.*_snapshots` **[I]**.
- `src/lib/finance/pricing-v3/**` **no tiene huella en la base**: ninguna migración lo menciona y ningún archivo de esa carpeta abre una conexión **[V-código]**.

---

## 2. Qué guarda realmente la base

### 2.1 El titular

**Existen 110 cotizaciones. 80 son espejos de documentos hechos en otra parte (64 de HubSpot, 16 de Nubox). 30 tienen origen en el portal, y ninguna de las 30 parece una cotización comercial real.** La última del portal se creó el 2026-06-22; en las 16 semanas siguientes no se escribió nada por esa vía. (`Q1`, `Q2`, `Q3`, `N1`, `R1`)

| Origen (`source_system`) | Cotizaciones | `created_by` | Creadas (primera – última) |
| --- | ---: | --- | --- |
| `hubspot` | 64 | valor por defecto de la columna, `task-345-bridge` | 2026-04-07 – 2026-06-22 |
| `nubox` | 16 | valor por defecto de la columna, `task-345-bridge` | 2026-03-19 – 2026-09-23 |
| `manual` (portal) | 30 | un `client_users.user_id` real | 2026-04-19 – 2026-06-22 |

> **Corrección de la consolidación.** «30 del constructor» es impreciso: `source_system = 'manual'` no garantiza que la fila haya pasado por el constructor. Al menos las 3 «convertidas» las inserta por SQL directo el script `scripts/commercial/task-1206-q2c-close-smoke.ts:90-109`, ya en estado `issued`, sin `issued_at` y sin fila de versión. Eso explica los hallazgos de §2.4 sobre esas filas.

**Cómo se distinguió a una persona de una semilla o una prueba:** (a) `created_by` igual al valor por defecto `task-345-bridge` significa que la fila la escribió un puente de sincronización; (b) para los identificadores de usuario, se cruzó con `greenhouse_core.client_users` y se miró si el correo contiene `agent` (la persona técnica de autenticación de agentes); (c) se buscaron marcas de prueba con límite de palabra (`test`, `prueba`, `demo`, `smoke`, `e2e`, `task-###`, …) en el texto de la cotización y en las etiquetas de sus líneas; (d) total cero y sin líneas. El criterio (c) es una heurística textual: la separación es aproximada.

| Cotizaciones del portal (30) | Persona técnica (agente) | Una persona interna |
| --- | ---: | ---: |
| Total | 23 | 7 |
| Creadas | 2026-04-19 – 2026-06-22 | 2026-04-19 – 2026-04-23 |
| Con marca de prueba | 13 | 7 (todas) |
| Sin marca, pero sin líneas y con total cero | 10 | 0 |
| Con líneas | 6 | 4 |
| Marcadas `legacy_excluded` | 9 | 3 |

Toda cotización del portal está rotulada como prueba o es un borrador vacío (`R1`). En total hay 2 autores distintos (`M1`).

### 2.2 Estado, tiempo, moneda

- **Estado (`Q1`):** emitidas 66 (49 HubSpot, 16 Nubox, 1 portal); borradores 39 (15 HubSpot, 24 portal); convertidas 3 (portal); expiradas 2 (portal). `pending_approval` y `approval_rejected` nunca se usaron.
- **Mes de creación (`Q3`):** 2026-03: 10 · 04: 42 · 05: 2 · 06: 53 · 07: 1 · 08: 1 · 09: 1. Los picos de abril y junio son cargas de sincronización, no actividad de ventas.
- **`quote_date` es NULL en las 64 cotizaciones de HubSpot** (`Q3b`, `X5`).
- **Moneda (`Q4`):** CLP 85, CLF 12, USD 8, COP 3, MXN 2. Toda cotización que no está en CLP es un espejo de HubSpot. Las 30 del portal están en CLP.
- **Columnas de modelo (`Q5`):** `staffing_model` es `outcome_based` en las 110; `pricing_model` es igual a `commercial_model` en las 110 (`Z3`); 101 son `one_time` / `one_time`.
- **Anclas de tenant (`O1`):** `organization_id` NULL en 9, `client_id` NULL en 74, `space_id` NULL en 84. `space_resolution_source = 'unresolved'` en 84 (`Q6`). Las cotizaciones del portal nunca tienen cliente ni espacio (`M1`).

> **Corrección de la consolidación.** Las 9 cotizaciones sin organización no aparecen en la lista del portal: el lector filtra por organización (`src/lib/finance/quotation-canonical-store.ts:303`). Por eso la interfaz ve 101 y no 110. Por aritmética contra la respuesta de la lista (cada celda origen × estado coincide salvo borradores del portal, 15 contra 24), las 9 son borradores del portal; que sean exactamente las 9 sin organización es **[I]**.

### 2.3 Hijos de una cotización (`M5`, `N3`–`N6`)

| Tiene… | HubSpot (64) | Nubox (16) | Portal (30) |
| --- | ---: | ---: | ---: |
| líneas | 58 | 0 | 10 |
| una fila de versión | 64 | 16 | 20 |
| más de una versión | 0 | 0 | 0 |
| filas de auditoría | 1 | 1 | 6 |
| pasos de aprobación | 0 | 0 | 0 |
| términos | 0 | 1 | 3 |
| un PDF guardado | 0 | 0 | 1 |
| un enlace compartido | 0 | 0 | 0 |
| `hubspot_deal_id` | 63 | 0 | 1 |
| `hubspot_quote_id` | 64 | 0 | 1 |
| `finance_quote_id` (gemelo legado) | 64 | 16 | 0 |
| identificador de documento de Nubox | 0 | 16 | 0 |
| un ingreso (`converted_to_income_id`) | 0 | 0 | 3 |
| `pricing_context` no vacío | 0 | 0 | 3 |
| foto de impuesto | 18 | 10 | 23 |
| aceptación registrada | 0 | 0 | 0 |

- **Las 110 cotizaciones están en `current_version = 1`.** Nunca se creó una segunda versión; `diff_from_previous` es NULL en las 100 filas de versión.
- 10 cotizaciones del portal no tienen fila de versión, incluidas las 3 convertidas y la emitida (`Y5`); 4 líneas apuntan a una versión que no existe (`N6`).
- 36 de las 100 fotos de versión son arreglos vacíos (`N5`).
- 135 líneas: 122 de HubSpot y **13 del portal** (8 de rol, 4 entregables, 1 costo directo) (`L1`). Solo 3 líneas llevan costo unitario; **1 línea** lleva `pricing_input` (la entrada de repetición del motor actual).
- Los totales de cabecera coinciden con la suma de las líneas en las 68 cotizaciones que tienen líneas (`L3`). De esas 68, costo y margen están cargados en 6.

### 2.4 Campos del ciclo de vida (`N2`)

- 66 cotizaciones `issued`, 22 con `issued_at`. La única del portal en `issued` no tiene `issued_at` ni fila de versión.
- 3 cotizaciones `converted`: tienen `converted_at` y un ingreso, pero `issued_at`, `sent_at` y `approved_at` son NULL.
- `approved_at`, `approved_by`, `approval_rejected_at`, `approval_rejected_by` y `accepted_*` son NULL en todas las filas.
- Los 3 ingresos enlazados a cotizaciones están `pending`, no emitidos a Nubox, llevan texto de prueba, los creó la persona técnica el 2026-06-22 y viven en el libro financiero compartido (`Z1`, `F1b`).

### 2.5 Columnas que nunca se usan (`colstats`)

- **`quotations`, siempre NULL (20):** `global_discount_type`, `global_discount_value`, `conditions_text`, `notes`, `escalation_pct`, `escalation_frequency_months`, `escalation_base_date`, `nubox_sii_track_id`, `approved_by`, `approved_at`, `approval_rejected_at`, `approval_rejected_by`, `hubspot_quote_status`, `hubspot_quote_link`, `hubspot_quote_pdf_download_link`, `accepted_at`, `accepted_by_name`, `accepted_by_role`, `accepted_via_short_code`, `accepted_ip`.
- **`quotations`, un solo valor en todas (3):** `current_version` (1), `escalation_mode` (`none`), `staffing_model` (`outcome_based`).
- **`quotations`, menos de 10 % con valor:** `expiry_date` 2, `internal_notes` 1, `converted_to_income_id` 3, `sent_at` 3, `expired_at` 2, `converted_at` 3, `sales_context_at_sent` 2, `contact_identity_profile_id` 4, `billing_start_date` 1, `hubspot_quote_locked` 1.
- **`quotation_line_items`, siempre NULL (17):** `member_id`, `fte_allocation`, `hours_estimated`, `margin_pct`, `notes`, `tool_id`, `addon_id`, `module_id`, `service_sku`, `service_line_order` y las siete columnas `cost_override_*`.
- **`quotation_line_items`, un solo valor en todas:** `version_number` (1), `recurrence_type` (`inherit`).
- **`quotation_versions`:** `diff_from_previous` siempre NULL; `version_number` siempre 1.

### 2.6 Fotos JSON — solo formas (`J1`–`J9`)

| Columna | Filas con valor | Forma |
| --- | ---: | --- |
| `quotations.pricing_context` | 3 | objeto: `autoResolveAddons`, `commercialModelCode`, `countryFactorCode` |
| `quotations.exchange_rates` | 72 | objeto con una sola llave `CLP` (número) |
| `quotations.sales_context_at_sent` | 2 | objeto: `captured_at`, `category_at_sent`, `commercial_model`, `deal_id`, `dealstage`, `hubspot_deal_id`, `hubspot_lead_id`, `is_standalone`, `lifecyclestage`, `pricing_model`, `staffing_model` |
| `quotations.tax_snapshot_json` | 51 | objeto: `taxCode`, `rate`, `taxableAmount`, `taxAmount`, `totalAmount`, `jurisdiction`, `kind`, `labelEs`, `recoverability`, `effectiveFrom`, `frozenAt`, `version`, `metadata` |
| `quotation_line_items.cost_breakdown` | 9 | objeto plano, 14 llaves con forma de nómina que son **NULL en las 9** (`salaryComponent`, `employerCosts`, `directOverhead`, `structuralOverhead`, `costPerHour`, `fxRateApplied`, `fxRateDate`, `sourcePayrollPeriodId`, `sourceCompensationVersionId`, `sourcePeriod`…) más `loadedTotal`, `snapshotSource`, `sourceCurrency`, `targetCurrency`; 3 filas agregan llaves `pricingV2*` (`pricingV2UnitCostUsd`, `pricingV2TotalCostUsd`, `…OutputCurrency`, `pricingV2CostBasisKind`, `…ConfidenceScore`, `…SnapshotDate`, `…SourceRef`) |
| `quotation_line_items.pricing_input` | 1 | objeto: `lineType`, `roleSku`, `employmentTypeCode`, `fteFraction`, `hours`, `periods`, `quantity` |
| `quotation_line_items.tax_snapshot_json` | 50 | las mismas 13 llaves que la foto de cabecera |
| `quotation_versions.snapshot_json` | 100 | **arreglo de líneas, nada más.** Escritas por el puente (122 elementos): `lineItemId`, `label`, `description`, `quantity`, `unit`, `unitPrice`, `subtotalPrice`, `discountAmount`, `subtotalAfterDiscount`, `productId`, `financeProductId`, `sourceSystem`. Escritas por el portal (9 elementos): lo mismo más `lineType`, `roleCode`, `memberId`, `unitCost`, `subtotalCost`, `effectiveMarginPct`, `currency`, `recurrenceType`, `discountType`, `discountValue`, `costBreakdown`, `resolutionNotes`, y `pricingInput` en 1 |
| `quotation_audit_log.details` | 20 | por acción; `issue_requested` lleva `marginPct`, `marginFloorPct`, `marginTargetPct`, `approvalRequired`, `currentStatus`, `fxReadiness`; `issued` lleva `viaApproval`, `fxSnapshot`; `invoice_triggered` lleva `incomeId`, `totalAmountClp`, `branch`, `via` |

Una fila de versión guarda cuatro totales (`total_cost`, `total_price`, `total_discount`, `effective_margin_pct`) junto al arreglo de líneas. No guarda moneda, tipo de cambio, impuesto, términos, vigencia, contexto de precio ni fecha de catálogo.

### 2.7 Huérfanos y referencias rotas (`O1`, `O2`, `Y1`, `Y4`)

| Referencia (ninguna tiene FK) | Con valor | Colgando |
| --- | ---: | ---: |
| `quotations.hubspot_deal_id` → `greenhouse_commercial.deals.hubspot_deal_id` | 64 | **45** |
| la misma → `greenhouse_crm.deals` | 64 | 51 |
| `quotations.issued_by` → `client_users` | 24 | 22 (actores de sistema escritos como texto libre) |
| línea `(quotation_id, version_number)` → `quotation_versions` | 135 | 4 |
| `quotations.finance_quote_id` → `finance.quotes` | 80 | 0 |
| `finance.quotes` sin gemelo canónico | 88 | **8** |
| `finance.quote_line_items` sin gemelo canónico | 147 | 25 (todas bajo esos 8 padres) |
| `quotations.converted_to_income_id` → `finance.income` | 3 | 0 |
| línea `role_code` → `sellable_roles` | 8 | 0 |

- Las 8 cotizaciones legadas sin espejo son de HubSpot. Las cotizaciones de HubSpot creadas en la tabla legada en 2026-08 (1) y 2026-10 (2) no se copiaron a `greenhouse_commercial.quotations`; la última cotización canónica de HubSpot se creó el 2026-06-22 (`Y1`, `Y2`). El espejo hacia la tabla canónica se detuvo para cotizaciones nuevas, mientras sigue refrescando las 64 que ya tiene (`X2`: `updated_at` hasta el 2026-10-12).
- Hoy no hay duplicados en `quotation_number`, `hubspot_quote_id`, `nubox_document_id` ni `hubspot_line_item_id`. 9 negocios de HubSpot tienen más de una cotización; 52 negocios distintos en total (`O2`).

### 2.8 El catálogo de precios en la práctica (`C1`–`C4`, `T1`–`T3`)

- **El catálogo es una sola semilla del 2026-04-18.** Cada tabla con vigencia tiene exactamente un valor de `effective_from`: precios de rol, componentes de costo de rol, márgenes por nivel, multiplicadores de modelo, factores país, horas por FTE, recargos, tipos de contratación. Nada se re-preció. `margin_targets` también tiene una sola fecha (2026-01-01).
- Última edición humana del catálogo de precios: 2026-04-22 (14 filas de auditoría, 1 actor: 6 roles creados y 6 desactivados el mismo día, 2 actualizados). Las otras 90 filas de auditoría son un actor `system` actualizando `product_catalog` hasta el 2026-07-22 (`C2`). 3 filas de costo de rol tienen `source_kind = admin_manual`, y la fila de costo más nueva es del 2026-06-20; que sean las mismas 3 filas es **[I]**. Ninguna fila de auditoría las registra.
- 38 roles: 32 activos y 6 inactivos; 6 con nombres de prueba; 32 con precios (6 monedas cada uno = 192 filas, todas con la misma fecha, así que el tipo de cambio de ese día quedó horneado en cinco de las seis columnas de precio); 31 con fila de costo (`C3`, `C3b`).
- 28 de las 31 filas de costo de rol son `catalog_seed` con confianza `medium`; ninguna viene de `payroll_bridge` (`C3c`).
- **El worker de costos falló en 176 de sus 178 corridas**, cerca de una por día desde 2026-04 hasta hoy; los 2 éxitos son del 2026-04-19 (`T2`, `X4`). Aun así, las fotos de persona-rol y de rol «blended» tienen `materialized_at` hasta el 2026-10-12, y cubren 11 personas y 2 roles, todas en CLP.
- `role_rate_cards`, `role_modeled_cost_basis_snapshots`, `tool_provider_cost_basis_snapshots`, `pricing_catalog_approval_queue`, `quote_templates`, `quote_template_items`, `quotation_line_cost_override_history`, `approval_steps`, `quote_short_links`, `quote_share_views`, `master_agreements`: **0 filas cada una**.
- Dos catálogos de herramientas: `greenhouse_ai.tool_catalog` (34, con SKU y costo y precio prorrateados; última actualización 2026-04-18) y `greenhouse_core.tool_catalog` (29; última actualización 2026-04-11). Solo coinciden 3 nombres de herramienta (`T1`).
- Catálogo de productos (espejo de HubSpot): 77 filas, todas escritas por `task-546-materializer`; `hubspot_sync_status` es `synced` en 35 y `endpoint_not_deployed` en 41. 215 precios: 59 autoritativos en USD, 156 derivados por tipo de cambio a CLP / COP / MXN / PEN, el último el 2026-06-20 (`T3`).
- `greenhouse_commercial.deals`: 35 filas, última sincronización 2026-06-19. `greenhouse_crm.deals`: 25 filas, última sincronización 2026-04-02 (`T4`).

> **Corrección de la consolidación.** Con `role_modeled_cost_basis_snapshots` vacía, el motor no se queda sin costo: el lector cae al supuesto vigente de `sellable_role_cost_components` (`src/lib/commercial-cost-basis/role-modeled-cost-basis.ts:382-470`). El costo efectivo de casi todos los roles es, entonces, la semilla de abril.

### 2.9 Actividad vista por el outbox (`G1`)

| Evento | Cantidad | Ventana |
| --- | ---: | --- |
| `finance.quote.synced` | 37.122 | 2026-04-07 – 2026-10-12 |
| `commercial.quotation.synced` | 32.404 | 2026-04-18 – 2026-10-12 |
| `commercial.quotation.pipeline_materialized` | 31.948 | la misma |
| `finance.quote_line_item.synced` | 29.502 | la misma |
| `commercial.quotation.line_items_synced` | 29.078 | la misma |
| `commercial.quotation.created` | 3 | 2026-04-23 – 2026-06-21 |
| `commercial.quotation.issued` / `.sent` / `.converted` / `.expired` / `.updated` | 2 / 3 / 3 / 2 / 1 | — |
| `commercial.quotation.pushed_to_hubspot` / `.hubspot_sync_failed` | 7 / 5 | último 2026-06-21 / 2026-04-23 |

Cerca de 160.000 eventos «sincronizado» para 110 cotizaciones: el espejo emite un evento por cotización en cada corrida, haya cambiado o no. Los eventos de negocio son menos de 30 en seis meses.

### 2.10 Deriva entre el repositorio y lo vivo

- **`src/types/db.d.ts` contra lo vivo: sin deriva en alcance.** Las 62 tablas auditadas y la vista tienen exactamente los mismos nombres de columna en ambos lados. En toda la base, las 663 relaciones `greenhouse_*` vivas están tipadas; el archivo de tipos lista 2 tablas de `greenhouse_hiring` que no se vieron en vivo (fuera de este alcance; puede ser un efecto de privilegios del usuario de runtime).
- **Migraciones: 672 archivos, 672 filas en `public.pgmigrations`**; el archivo más nuevo es el último aplicado. No hay nada pendiente.
- **Deriva de documentos:** las cinco tablas inexistentes de §1.5.
- **Deriva de vocabulario dentro del esquema:** `quotations.commercial_model` admite {retainer, project, one_off}; `service_pricing.commercial_model` y `commercial_model_multipliers.model_code` admiten {on_going, on_demand, hybrid, license_consulting}. Mismo nombre de columna, dos vocabularios sin relación. El valor del motor solo se guarda dentro de `pricing_context.commercialModelCode` (3 filas).
- `approval_policies.required_role` guarda `finance` y `efeonce_admin` (`F4`).

> **Corrección de la consolidación.** Confirmado en código: `finance` no es un código de rol (`src/config/role-codes.ts` define `finance_admin` y `finance_analyst`), y el servidor compara el valor guardado contra los códigos de rol del actor (`src/lib/commercial/governance/approval-steps-store.ts:283-285`). Los tres valores coinciden con la semilla de `migrations/20260417140553325_task-348-quotation-governance-runtime.sql:243-248`. Ver hallazgo G-05 del documento principal.

---

## 3. Juicio

### 3.1 Bien modelado

- **La vigencia por fecha del catálogo** está bien diseñada: PK compuestas `(entidad, effective_from)` en precios, costos, márgenes, multiplicadores, factores y horas. (Nunca se ejerció: una sola fecha en cada tabla.)
- **El dinero es `numeric` en todo el alcance.** Ninguna columna `real`, `double precision` ni `money` (`T0`).
- **La foto de impuesto** tiene un CHECK de coherencia (código, JSON y fecha de congelado se mueven juntos) y un conjunto cerrado de códigos.
- **`product_catalog_prices`** separa los precios autoritativos de los derivados por tipo de cambio y obliga los campos de derivación con un CHECK.
- **El gobierno del ajuste de costo en líneas** tiene un CHECK de coherencia, un enum de categoría y una tabla de historia con un CHECK de largo mínimo del motivo.
- **FK duras desde finanzas y contratos hacia la cotización** (`income`, `purchase_orders`, `service_entry_sheets`, `contracts`, `contract_quotes` con RESTRICT).
- **Propiedad uniforme:** todas las tablas son de `greenhouse_ops`.

### 3.2 Cosas ortogonales mezcladas en una columna o enum

1. **`quotations` es tres cosas en una tabla:** un espejo de cotizaciones de HubSpot, un espejo de documentos tributarios de Nubox (DTE 52: `nubox_*`, `dte_type_code`, `dte_folio`) y el agregado propio del portal. 100 columnas; el significado de la fila depende de `source_system`.
2. **`status` carga el ciclo de vida de documentos de tres sistemas.** `legacy_status` conserva la palabra original (`sent`, `issued`, `draft`); un documento de Nubox marcado `sent` y una cotización de HubSpot marcada `issued` terminan los dos en `issued`. La aceptación del cliente tiene columnas pero no tiene estado.
3. **Cinco ejes de «modelo» que se solapan:** `pricing_model`, `commercial_model`, `staffing_model`, `revenue_type`, `billing_frequency`, más el `commercialModelCode` del motor en JSON. Dos son idénticos en todas las filas; uno tiene un solo valor.
4. **`total_amount` contra `total_price` contra `subtotal`:** distintos en 54 filas, sin una columna que diga cuál incluye impuesto (`Z3`).
5. **Tres columnas de fecha para la misma idea:** `valid_until`, `expiry_date`, `due_date`. Dos representaciones de impuesto: `tax_rate` / `tax_amount` y `tax_rate_snapshot` / `tax_amount_snapshot` (41 filas tienen solo el par de la foto).
6. **`created_by` e `issued_by` mezclan identificadores de usuario con etiquetas de sistema** en una columna de texto libre, y el valor por defecto de la columna es el nombre de una tarea (`task-345-bridge`).
7. **`line_type`** mezcla lo que se vende (entregable) con cómo se costea (persona, rol, costo directo); herramientas, recargos y servicios se distinguen por cuál FK anulable está llena.
8. **`quotation_audit_log.action`** mezcla ediciones, transiciones de ciclo de vida, generación de PDF y facturación en un solo enum.

### 3.3 Restricciones que faltan

1. **`quotation_number` no tiene restricción UNIQUE ni secuencia.** Se genera en código de aplicación como `EO-QUO-YYYYMM-` + 6 caracteres al azar, en dos lugares con dos generadores distintos (hexadecimal de `randomUUID` en `src/lib/commercial/submit-quote-from-builder.ts:93`, base 36 de `Math.random` en `src/app/api/finance/quotes/route.ts:217`) **[V-código]**. Los espejos guardan el número de HubSpot o de Nubox en la misma columna (tres formatos vivos, `O3`). Los números de contrato se derivan de él por reemplazo de texto (`EO-QUO-` → `EO-CTR-`, `contract-lifecycle.ts:99`), así que una colisión se propagaría.
2. **Sin FK de las líneas a su versión** `(quotation_id, version_number)`; ya cuelgan 4 líneas.
3. **Sin FK de `quotations.hubspot_deal_id` a `deals`**; cuelgan 45 de 64.
4. **Sin FK en `quote_pdf_assets`, `quote_short_links`, `quote_share_views`** hacia la cotización o la versión, ni en `accepted_via_short_code`.
5. **Sin CHECK que amarre el estado a sus fechas.** Los datos vivos tienen `issued` sin `issued_at` (44 filas) y `converted` sin haber sido emitida (3).
6. **Sin CHECK de que `current_version` tenga una fila de versión** (10 cotizaciones no la tienen).
7. **Sin CHECK de que una cotización que no está en CLP lleve su tipo de cambio y su fecha.** `exchange_snapshot_date` es NULL en las 64 cotizaciones de HubSpot (`Z2`).
8. **El alcance por tenant es opcional:** `organization_id`, `client_id` y `space_id` son anulables.
9. **`greenhouse_finance.quotes` solo tiene llave primaria.** Sin CHECK, sin FK, sin NOT NULL más allá del identificador y la moneda; sus columnas de dinero son `numeric` sin límite.
10. **Los generadores de SKU rellenan a 3 dígitos con `LPAD`**, que trunca pasado 999 (`ECG-`, `EFO-`, `EFG-`, `ETG-`). El máximo actual es 38, así que es latente **[V-código]**.

### 3.4 Rastro de auditoría ausente e historia mutable

1. **Nada en la base impide reescribir la historia.** Sin disparadores en cotizaciones, versiones, líneas ni en ninguna de las dos bitácoras; el usuario de runtime puede hacer UPDATE y DELETE en todas (`G4`). Tablas agregadas después en el mismo esquema (`proposals`, `proposal_state_transitions`, `engagement_audit_log`, `engagement_outcomes`) sí tienen disparadores de solo-agregar y de inmutabilidad: el patrón existe en el código y aquí no se aplicó.
2. **Borrar una cotización borra su historia:** versiones, líneas, bitácora, pasos de aprobación, términos, historia de ajustes de costo y fotos de servicio son `ON DELETE CASCADE`.
3. **La bitácora no registra creación ni ediciones.** 20 filas para 110 cotizaciones; las acciones presentes son `pdf_generated`, `issue_requested`, `issued`, `sent`, `expired`, `invoice_triggered`. `created`, `updated`, `line_item_*`, `version_created` y `status_changed` están permitidas por el CHECK y nunca se escriben.
4. **Una versión no es una foto fiel.** Guarda el arreglo de líneas y cuatro totales; la cabecera (moneda, tipo de cambio, impuesto, términos, vigencia, contexto de precio) queda solo en la fila mutable de `quotations`. Las líneas son filas vivas con llave por número de versión, y no existe una segunda versión que muestre si las líneas viejas sobreviven a una nueva.
5. **El precio no se puede reproducir.** Una línea guarda `role_code` pero no el `effective_from` del catálogo, el nivel de margen, el multiplicador, el factor país ni una versión de motor. La única procedencia está dentro del JSON `cost_breakdown` de 3 líneas (`pricingV2CostBasisSnapshotDate`, `…SourceRef`). La entrada de repetición `pricing_input` existe en 1 línea. No hay columna de versión de motor en la cotización, en la versión ni en la línea.
6. **Un PDF por versión** (la PK de `quote_pdf_assets` es `(quotation_id, version_number)`): regenerar sobrescribe el puntero.
7. **El tipo de cambio usado al emitir vive en una llave JSON de la bitácora** (`fxSnapshot`, 1 fila), no en una columna tipada.

### 3.5 Dinero y unidades

1. **`tax_rate` guarda dos escalas en una columna:** 9 filas guardan el porcentaje (mayor que 1) y 74 la fracción; la tabla legada tiene la misma mezcla (`Z4`). `tax_rate_snapshot` es fracción de forma consistente.
2. **Los márgenes usan dos escalas entre tablas:** fracciones en `role_tier_margins`, `service_tier_margins`, `sellable_role_pricing_currency`, `overhead_addons`; puntos porcentuales en `margin_targets` y en `quotations` (`C4`). `quoted_margin_pct` en la foto de servicio guarda las dos escalas en 4 filas (`Z5`).
3. **El dinero de la línea tiene moneda opcional:** `quotation_line_items.currency` es anulable y está en NULL en 4 líneas; `unit_cost`, `unit_price` y los subtotales no tienen moneda propia. Campos de costo llamados `*_usd` conviven en la misma fila con campos en la moneda de la cotización.
4. **Siete precisiones distintas para montos** en alcance —`(10,2)`, `(12,2)`, `(12,4)`, `(14,2)`, `(14,4)`, `(18,2)`, `(18,4)`— más 21 columnas `numeric` sin límite (`T0`). Los totales de `quotations` son `(14,2)`, la foto de impuesto `(18,2)`, servicio `(18,2)`, precios de catálogo `(18,4)`.
5. **El tipo de cambio es un solo número más un JSON de una llave** (`exchange_rate_to_clp`, `exchange_rates: {CLP}`); la fecha de la tasa falta en las 64 filas de HubSpot, que son las únicas cotizaciones que no están en CLP (`Z2`).
6. **Los precios de catálogo en seis monedas comparten una fecha**, así que cinco de ellos son conversiones congeladas del sexto, sin tasa ni fuente guardadas.

### 3.6 Identificadores que pueden chocar o confundir

- `quotation_number`: sufijo al azar, sin unicidad (§3.3.1).
- `quotation_id`, `version_id`, `line_item_id`: `prefijo + gen_random_uuid()`; seguros.
- `quote_short_links.short_code`: 7 a 12 caracteres alfanuméricos como PK; la tabla tiene además una columna `full_token text NOT NULL` (si guarda el token mismo o un hash es una pregunta de código). Sin uso (0 filas).
- Tres tablas responden «qué negocio es»: `greenhouse_commercial.deals`, `greenhouse_crm.deals` y el texto libre `quotations.hubspot_deal_id`.
- Dos tablas se llaman `tool_catalog` en esquemas distintos y con llaves distintas (`tool_id` contra `tool_code`).

### 3.7 Peso muerto

| Evidencia | Objetos |
| --- | --- |
| 0 filas desde su creación en abril | `approval_steps`, `quote_templates`, `quote_template_items`, `quote_short_links`, `quote_share_views`, `quotation_line_cost_override_history`, `role_rate_cards`, `pricing_catalog_approval_queue`, `role_modeled_cost_basis_snapshots`, `tool_provider_cost_basis_snapshots`, `master_agreements` |
| 1 a 3 filas, atadas a cotizaciones de prueba | `quote_pdf_assets` (1), `commercial_operations_audit` (3), `contract_quotes` (3); `quotation_renewal_reminders` (2, no se revisó a qué cotizaciones pertenecen) |
| Columnas nunca escritas | 20 en `quotations`, 17 en `quotation_line_items` (§2.5) |
| Gemelo superado que se sigue alimentando | `greenhouse_finance.quotes` + `quote_line_items`: ninguna cotización del portal vive ahí, pero reciben primero las filas de HubSpot y de Nubox y van 8 cotizaciones adelante de la tabla canónica |
| Fallando hace seis meses | `commercial_cost_basis_snapshots` (176 corridas fallidas) |

### 3.8 Con qué tendrían que convivir las tablas de un motor nuevo

Solo hechos y restricciones.

1. **Numeración.** `EO-QUO-YYYYMM-XXXXXX` (al azar, sin hacer cumplir) para las cotizaciones del portal; los números de HubSpot y de Nubox en la misma columna. Los números de contrato `EO-CTR-…` se derivan por reemplazo de prefijo.
2. **Identidad.** `quotation_id = 'qt-' + uuid` es lo que otras 11 tablas referencian por FK (§1.4): `income`, `purchase_orders`, `service_entry_sheets`, `contracts`, `contract_quotes` (RESTRICT), `proposals`, `engagement_outcomes`, `commercial_operations_audit` y tres tablas de fotos de servicio.
3. **Versiones.** `(quotation_id, version_number)` es la llave que usan `quotation_line_items`, `approval_steps`, `quote_pdf_assets`, `quote_short_links`, `quote_share_views` y `quotation_audit_log`. Solo existió la versión 1, así que el comportamiento con varias versiones no está probado por datos.
4. **Identificadores de HubSpot.** `hubspot_quote_id` y `hubspot_deal_id` en la cotización; `hubspot_line_item_id` y `hubspot_product_id` en las líneas; `product_catalog.hubspot_product_id` (UNIQUE), con 35 productos sincronizados y 41 no; `deals` con llave `hubspot_deal_id`. Un espejo reactivo reescribe 64 cotizaciones de HubSpot y sus líneas en cada corrida y emite un evento de outbox cada vez.
5. **Gemelo legado.** `greenhouse_finance.quotes` sigue siendo la tabla de aterrizaje de HubSpot y de Nubox; `quotations.finance_quote_id` (UNIQUE) y `quotation_line_items.finance_line_item_id` (UNIQUE) son las llaves puente.
6. **Nubox.** `nubox_document_id`, `dte_type_code`, `dte_folio` y `nubox_emission_status` viven en la fila de cotización; 16 filas son documentos tributarios, no cotizaciones.
7. **Tokens de enlace y aceptación.** `quote_short_links` (código corto, token completo, expiración, revocación), `quote_share_views` y las cinco columnas `accepted_*` existen y están vacías.
8. **Vínculos con finanzas.** `income.quotation_id` y `quotations.converted_to_income_id` se apuntan mutuamente (el segundo sin FK); `purchase_orders` y `service_entry_sheets` llevan `quotation_id`; `quotation_profitability_snapshots` compara lo cotizado contra lo autorizado, lo facturado y lo realizado, en CLP.
9. **Impuesto.** `tax_code` + `tax_snapshot_json` + `tax_snapshot_frozen_at` en cabecera y en líneas, con un CHECK de coherencia y tres códigos de IVA chileno.
10. **Servicio.** `quotation_pipeline_snapshots` (72 filas, refrescadas el día de la medición) y `deal_pipeline_snapshots` leen `status`, `pricing_model`, `commercial_model`, `staffing_model`, `total_amount_clp`, el margen y las fechas del ciclo de vida.
11. **Catálogo.** Las filas del catálogo de productos se materializan desde `sellable_roles`, `tool_catalog`, `overhead_addons` y `service_pricing` (`source_kind`) y se envían a HubSpot; reemplazar esas tablas cambia lo que HubSpot recibe.
12. **Enumeraciones que hace cumplir un CHECK** y que los valores de un motor nuevo tendrían que respetar o ampliar: 6 monedas, 6 estados, 4 tipos de línea, 4 unidades, 3 códigos de impuesto, 4 niveles, 5 categorías de rol, 6 códigos de factor país, 4 códigos de modelo comercial.
13. **Datos existentes que llevar o dejar:** 30 cotizaciones del portal que son pruebas o borradores vacíos, 13 líneas de esas cotizaciones, 1 entrada de precio guardada. Con la evidencia de §2.1, no se perdería ni habría que migrar ninguna cotización real del portal.

---

## 4. Lo que no se pudo determinar

1. **Si los eventos del outbox se purgan.** Si se purgan, «3 eventos `created` para 30 cotizaciones del portal» no dice nada; si no, ese camino no emite `created` de forma confiable. (Al menos 3 de las 30 se insertaron por script, sin evento.)
2. **Por qué falla el worker de costos.** Solo se leyeron las llaves de `summary_jsonb` (`error`), no su texto.
3. **Cómo se comporta una segunda versión** (copia de líneas, contenido de la foto, re-enlace del PDF y del enlace compartido): no hay datos.
4. **Por qué el espejo de HubSpot hacia la tabla canónica se detuvo para cotizaciones nuevas después del 2026-06-22**, mientras la tabla legada sigue recibiéndolas (3 desde agosto).
5. **Si la heurística de prueba clasifica mal una cotización real.** Es textual; el grupo «una persona interna» son 7 cotizaciones, todas rotuladas como prueba, en cinco días de abril.
6. **Copias en BigQuery** de estas tablas: no se examinaron.
7. **Visibilidad de filas:** la conexión fue con el usuario de runtime. Los conteos son de tabla completa y no se observó ninguna política RLS en estas tablas, pero no se revisó `pg_policies`.
8. **Las dos tablas de `greenhouse_hiring`** presentes en `db.d.ts` y no visibles en vivo están fuera de este alcance y sin explicar.

Resuelto por la consolidación: si `approval_policies.required_role = 'finance'` corresponde a un rol real. No corresponde (§2.10).

---

## Apéndice — SQL exacto

Envoltorio usado en cada consulta: `psql` contra un proxy local de Cloud SQL, con el usuario de runtime, `-X -v ON_ERROR_STOP=1` y `PGOPTIONS="-c default_transaction_read_only=on -c statement_timeout=60000"`. Las consultas se reproducen tal cual se ejecutaron; los comentarios dentro del SQL quedan en su idioma original.

### Conteos de filas (`sql_counts`)
```sql
select 'greenhouse_commercial.quotations' t, count(*) n from greenhouse_commercial.quotations
union all select 'greenhouse_commercial.quotation_versions' t, count(*) n from greenhouse_commercial.quotation_versions
union all select 'greenhouse_commercial.quotation_line_items' t, count(*) n from greenhouse_commercial.quotation_line_items
union all select 'greenhouse_commercial.quotation_line_cost_override_history' t, count(*) n from greenhouse_commercial.quotation_line_cost_override_history
union all select 'greenhouse_commercial.quotation_audit_log' t, count(*) n from greenhouse_commercial.quotation_audit_log
union all select 'greenhouse_commercial.quotation_terms' t, count(*) n from greenhouse_commercial.quotation_terms
union all select 'greenhouse_commercial.quotation_renewal_reminders' t, count(*) n from greenhouse_commercial.quotation_renewal_reminders
union all select 'greenhouse_commercial.approval_policies' t, count(*) n from greenhouse_commercial.approval_policies
union all select 'greenhouse_commercial.approval_steps' t, count(*) n from greenhouse_commercial.approval_steps
union all select 'greenhouse_commercial.quote_pdf_assets' t, count(*) n from greenhouse_commercial.quote_pdf_assets
union all select 'greenhouse_commercial.quote_short_links' t, count(*) n from greenhouse_commercial.quote_short_links
union all select 'greenhouse_commercial.quote_share_views' t, count(*) n from greenhouse_commercial.quote_share_views
union all select 'greenhouse_commercial.quote_templates' t, count(*) n from greenhouse_commercial.quote_templates
union all select 'greenhouse_commercial.quote_template_items' t, count(*) n from greenhouse_commercial.quote_template_items
union all select 'greenhouse_commercial.terms_library' t, count(*) n from greenhouse_commercial.terms_library
union all select 'greenhouse_commercial.commercial_operations_audit' t, count(*) n from greenhouse_commercial.commercial_operations_audit
union all select 'greenhouse_finance.quotes' t, count(*) n from greenhouse_finance.quotes
union all select 'greenhouse_finance.quote_line_items' t, count(*) n from greenhouse_finance.quote_line_items
union all select 'greenhouse_commercial.sellable_roles' t, count(*) n from greenhouse_commercial.sellable_roles
union all select 'greenhouse_commercial.sellable_role_cost_components' t, count(*) n from greenhouse_commercial.sellable_role_cost_components
union all select 'greenhouse_commercial.sellable_role_pricing_currency' t, count(*) n from greenhouse_commercial.sellable_role_pricing_currency
union all select 'greenhouse_commercial.role_employment_compatibility' t, count(*) n from greenhouse_commercial.role_employment_compatibility
union all select 'greenhouse_commercial.employment_types' t, count(*) n from greenhouse_commercial.employment_types
union all select 'greenhouse_commercial.employment_type_aliases' t, count(*) n from greenhouse_commercial.employment_type_aliases
union all select 'greenhouse_commercial.role_rate_cards' t, count(*) n from greenhouse_commercial.role_rate_cards
union all select 'greenhouse_commercial.role_tier_margins' t, count(*) n from greenhouse_commercial.role_tier_margins
union all select 'greenhouse_commercial.service_tier_margins' t, count(*) n from greenhouse_commercial.service_tier_margins
union all select 'greenhouse_commercial.margin_targets' t, count(*) n from greenhouse_commercial.margin_targets
union all select 'greenhouse_commercial.commercial_model_multipliers' t, count(*) n from greenhouse_commercial.commercial_model_multipliers
union all select 'greenhouse_commercial.country_pricing_factors' t, count(*) n from greenhouse_commercial.country_pricing_factors
union all select 'greenhouse_commercial.fte_hours_guide' t, count(*) n from greenhouse_commercial.fte_hours_guide
union all select 'greenhouse_commercial.revenue_metric_config' t, count(*) n from greenhouse_commercial.revenue_metric_config
union all select 'greenhouse_commercial.service_pricing' t, count(*) n from greenhouse_commercial.service_pricing
union all select 'greenhouse_commercial.service_role_recipe' t, count(*) n from greenhouse_commercial.service_role_recipe
union all select 'greenhouse_commercial.service_tool_recipe' t, count(*) n from greenhouse_commercial.service_tool_recipe
union all select 'greenhouse_commercial.overhead_addons' t, count(*) n from greenhouse_commercial.overhead_addons
union all select 'greenhouse_ai.tool_catalog' t, count(*) n from greenhouse_ai.tool_catalog
union all select 'greenhouse_core.tool_catalog' t, count(*) n from greenhouse_core.tool_catalog
union all select 'greenhouse_commercial.pricing_catalog_audit_log' t, count(*) n from greenhouse_commercial.pricing_catalog_audit_log
union all select 'greenhouse_commercial.pricing_catalog_approval_queue' t, count(*) n from greenhouse_commercial.pricing_catalog_approval_queue
union all select 'greenhouse_commercial.commercial_cost_basis_snapshots' t, count(*) n from greenhouse_commercial.commercial_cost_basis_snapshots
union all select 'greenhouse_commercial.member_role_cost_basis_snapshots' t, count(*) n from greenhouse_commercial.member_role_cost_basis_snapshots
union all select 'greenhouse_commercial.role_blended_cost_basis_snapshots' t, count(*) n from greenhouse_commercial.role_blended_cost_basis_snapshots
union all select 'greenhouse_commercial.role_modeled_cost_basis_snapshots' t, count(*) n from greenhouse_commercial.role_modeled_cost_basis_snapshots
union all select 'greenhouse_commercial.tool_provider_cost_basis_snapshots' t, count(*) n from greenhouse_commercial.tool_provider_cost_basis_snapshots
union all select 'greenhouse_commercial.product_catalog' t, count(*) n from greenhouse_commercial.product_catalog
union all select 'greenhouse_commercial.product_catalog_prices' t, count(*) n from greenhouse_commercial.product_catalog_prices
union all select 'greenhouse_commercial.product_categories' t, count(*) n from greenhouse_commercial.product_categories
union all select 'greenhouse_commercial.product_units' t, count(*) n from greenhouse_commercial.product_units
union all select 'greenhouse_commercial.product_source_kind_mapping' t, count(*) n from greenhouse_commercial.product_source_kind_mapping
union all select 'greenhouse_commercial.product_sync_conflicts' t, count(*) n from greenhouse_commercial.product_sync_conflicts
union all select 'greenhouse_commercial.deals' t, count(*) n from greenhouse_commercial.deals
union all select 'greenhouse_commercial.deal_create_attempts' t, count(*) n from greenhouse_commercial.deal_create_attempts
union all select 'greenhouse_crm.deals' t, count(*) n from greenhouse_crm.deals
union all select 'greenhouse_commercial.contracts' t, count(*) n from greenhouse_commercial.contracts
union all select 'greenhouse_commercial.contract_quotes' t, count(*) n from greenhouse_commercial.contract_quotes
union all select 'greenhouse_commercial.master_agreements' t, count(*) n from greenhouse_commercial.master_agreements
union all select 'greenhouse_finance.purchase_orders' t, count(*) n from greenhouse_finance.purchase_orders
union all select 'greenhouse_finance.service_entry_sheets' t, count(*) n from greenhouse_finance.service_entry_sheets
union all select 'greenhouse_serving.quotation_pipeline_snapshots' t, count(*) n from greenhouse_serving.quotation_pipeline_snapshots
union all select 'greenhouse_serving.quotation_profitability_snapshots' t, count(*) n from greenhouse_serving.quotation_profitability_snapshots
union all select 'greenhouse_serving.deal_pipeline_snapshots' t, count(*) n from greenhouse_serving.deal_pipeline_snapshots

```

### Inventario, restricciones, índices, disparadores, secuencias, referencias y deriva (lecturas de catálogo)
```sql
-- relations.txt
select n.nspname, c.relname, c.relkind, c.reltuples::bigint, pg_size_pretty(pg_total_relation_size(c.oid)), has_table_privilege(c.oid,'select')
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind in ('r','v','m','p') and n.nspname not in ('pg_catalog','information_schema','pg_toast')
and (n.nspname='greenhouse_commercial' or c.relname ~* '(quot|pricing|rate_card|sellable|deal|tool_catalog|product_catalog|purchase_order|service_entry|hes|proposal)')
order by 1,2;

-- cols_core.txt  (<IN> = the 5 core tables)  /  cols_all.txt (<IN> = the 62 tables of tables.txt)
select table_schema||'.'||table_name t, ordinal_position, column_name, data_type || coalesce('('||numeric_precision||','||numeric_scale||')','') dt, is_nullable, coalesce(left(column_default,60),'')
from information_schema.columns where (table_schema||'.'||table_name) in (<IN>) order by 1,2;

-- constraints.txt
select n.nspname||'.'||c.relname t, con.contype, con.conname, pg_get_constraintdef(con.oid), con.convalidated
from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace
where (n.nspname||'.'||c.relname) in (<IN>) order by 1,2,3;

-- indexes.txt
select schemaname||'.'||tablename, indexname, indexdef from pg_indexes where (schemaname||'.'||tablename) in (<IN>) order by 1,2;

-- triggers.txt
select n.nspname||'.'||c.relname, t.tgname, p.proname, pg_get_triggerdef(t.oid)
from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid
where not t.tgisinternal and (n.nspname||'.'||c.relname) in (<IN>) order by 1,2;

-- sequences
select schemaname, sequencename, last_value, increment_by, max_value from pg_sequences
where schemaname in ('greenhouse_commercial','greenhouse_finance') or sequencename ~* 'quot|sku|cost_basis' order by 1,2;

-- id defaults
select table_name, column_name, column_default from information_schema.columns
where table_schema='greenhouse_commercial' and table_name in ('quotations','quotation_versions','quotation_line_items','quotation_audit_log','approval_steps','sellable_roles','overhead_addons','service_pricing','commercial_cost_basis_snapshots')
and column_default ~ '(nextval|uuid|generate_)';

-- quote_refs.txt : every column in the database that names a quote, with its FK if any
select c.table_schema||'.'||c.table_name, c.column_name, c.data_type,
 (select t.table_type from information_schema.tables t where t.table_schema=c.table_schema and t.table_name=c.table_name),
 coalesce((select string_agg(pg_get_constraintdef(con.oid),' ; ') from pg_constraint con join pg_class cl on cl.oid=con.conrelid join pg_namespace n on n.oid=cl.relnamespace join pg_attribute a on a.attrelid=cl.oid and a.attnum=any(con.conkey) where con.contype='f' and n.nspname=c.table_schema and cl.relname=c.table_name and a.attname=c.column_name),'NO FK')
from information_schema.columns c
where c.column_name ~* '(quotation|quote)' and c.table_schema not in ('pg_catalog','information_schema')
  and not (c.table_schema='greenhouse_commercial' and c.table_name in ('quotations')) order by 1,2;

-- drift: live columns compared in Python against the interfaces of src/types/db.d.ts
select table_schema||'.'||table_name, column_name from information_schema.columns where table_schema like 'greenhouse_%' order by 1,2;
select count(*), max(name), max(run_on) from public.pgmigrations;   -- 672 | 20261004152040741_… ; ls migrations/*.sql | wc -l = 672
select to_regclass('<schema.table named in a doc>') is null;        -- one call per table name found in the docs

-- colstats: generated per table (quotations, quotation_line_items, quotation_versions); one branch per column:
--   select '<col>' c, count(<col>) nn, count(distinct <col>::text) nd, count(*) tot from <schema>.<table>  union all ...
```

### `u1.sql`
```sql
\echo == Q1 by status / legacy_status / source_system
select status, legacy_status, source_system, count(*) n from greenhouse_commercial.quotations group by 1,2,3 order by 4 desc;
\echo == Q2 by source_system x created_by kind
select source_system,
  case when created_by='task-345-bridge' then 'default:task-345-bridge'
       when created_by ~ '^(user-|usr|u-)' then 'user-id-like'
       when created_by ~ '@' then 'email'
       when created_by ~* '(seed|test|agent|system|sync|hubspot|nubox|bridge|script|cron|backfill)' then 'system-like:'||created_by
       else 'other:'||left(regexp_replace(created_by,'[0-9a-f]{6,}','#','g'),30) end creator_kind,
  count(*) n, min(created_at)::date first_created, max(created_at)::date last_created
from greenhouse_commercial.quotations group by 1,2 order by 3 desc;
\echo == Q3 by month created x source_system
select to_char(created_at,'YYYY-MM') m, source_system, count(*) n from greenhouse_commercial.quotations group by 1,2 order by 1,2;
\echo == Q3b by month of quote_date
select to_char(quote_date,'YYYY-MM') m, count(*) n from greenhouse_commercial.quotations group by 1 order by 1;
\echo == Q4 by currency
select currency, source_system, count(*) n, count(exchange_rate_to_clp) with_fx, count(*) filter (where exchange_rates<>'{}'::jsonb) with_fx_json, count(total_amount_clp) with_clp from greenhouse_commercial.quotations group by 1,2 order by 1,2;
\echo == Q5 pricing_model/commercial_model/staffing_model/revenue_type/billing_frequency
select pricing_model, commercial_model, staffing_model, revenue_type, billing_frequency, count(*) from greenhouse_commercial.quotations group by 1,2,3,4,5 order by 6 desc;
\echo == Q6 legacy_excluded, space_resolution_source
select legacy_excluded, space_resolution_source, count(*) from greenhouse_commercial.quotations group by 1,2 order by 3 desc;
```

### `u2.sql`
```sql
\echo == M1 manual quotes: distinct creators, creators resolvable to users, agent users
with m as (select * from greenhouse_commercial.quotations where source_system='manual')
select count(*) n, count(distinct created_by) creators,
  count(*) filter (where exists (select 1 from greenhouse_core.client_users u where u.user_id=m.created_by)) creator_is_client_user,
  count(distinct organization_id) orgs, count(*) filter (where organization_id is null) no_org,
  count(*) filter (where client_id is null) no_client, count(*) filter (where space_id is null) no_space,
  count(*) filter (where hubspot_deal_id is not null) with_deal, count(*) filter (where hubspot_quote_id is not null) with_hs_quote,
  count(*) filter (where contact_identity_profile_id is not null) with_contact
from m;
\echo == M2 manual quotes per creator (anonymised rank) and whether the creator is an agent/test user
select dense_rank() over (order by q.created_by) creator_rank,
  coalesce(u.tenant_type,'?') tenant_type, (u.email ~* '(agent|test|e2e|playwright|bot|demo)') email_looks_test,
  count(*) n, min(q.created_at)::date first_c, max(q.created_at)::date last_c,
  string_agg(distinct q.status, ',') statuses
from greenhouse_commercial.quotations q left join greenhouse_core.client_users u on u.user_id=q.created_by
where q.source_system='manual' group by q.created_by, u.tenant_type, u.email order by n desc;
\echo == M3 manual quotes: test-like text markers (description/notes/client_name_cache/labels)
select count(*) filter (where coalesce(description,'')||' '||coalesce(notes,'')||' '||coalesce(internal_notes,'')||' '||coalesce(client_name_cache,'') ~* '(test|prueba|demo|smoke|dummy|sandbox|qa\M|ejemplo|borrar|xxx)') textual_test_marker,
  count(*) filter (where description is null or trim(description)='') empty_description,
  count(*) filter (where coalesce(total_price,0)=0 and coalesce(total_amount,0)=0) zero_total,
  count(*) n
from greenhouse_commercial.quotations where source_system='manual';
\echo == M4 manual quotes by org type / sandbox flags
select o.organization_type, o.status org_status, (o.organization_name ~* '(test|demo|sandbox|prueba|efeonce)') org_name_looks_internal_or_test, count(*) n
from greenhouse_commercial.quotations q left join greenhouse_core.organizations o on o.organization_id=q.organization_id
where q.source_system='manual' group by 1,2,3 order by 4 desc;
\echo == M5 children per source
select q.source_system, q.status, count(*) quotes,
  count(*) filter (where exists (select 1 from greenhouse_commercial.quotation_line_items l where l.quotation_id=q.quotation_id)) with_lines,
  count(*) filter (where exists (select 1 from greenhouse_commercial.quotation_line_items l where l.quotation_id=q.quotation_id and l.version_number=q.current_version)) with_lines_current_version,
  count(*) filter (where exists (select 1 from greenhouse_commercial.quotation_versions v where v.quotation_id=q.quotation_id)) with_versions,
  count(*) filter (where (select count(*) from greenhouse_commercial.quotation_versions v where v.quotation_id=q.quotation_id)>1) with_gt1_versions,
  count(*) filter (where exists (select 1 from greenhouse_commercial.quotation_audit_log a where a.quotation_id=q.quotation_id)) with_audit,
  count(*) filter (where exists (select 1 from greenhouse_commercial.approval_steps a where a.quotation_id=q.quotation_id)) with_approval_steps,
  count(*) filter (where exists (select 1 from greenhouse_commercial.quotation_terms a where a.quotation_id=q.quotation_id)) with_terms,
  count(*) filter (where exists (select 1 from greenhouse_commercial.quote_pdf_assets a where a.quotation_id=q.quotation_id)) with_pdf,
  count(*) filter (where exists (select 1 from greenhouse_commercial.quote_short_links a where a.quotation_id=q.quotation_id)) with_share,
  count(*) filter (where q.hubspot_deal_id is not null) with_hs_deal,
  count(*) filter (where q.hubspot_quote_id is not null) with_hs_quote,
  count(*) filter (where q.finance_quote_id is not null) with_finance_quote,
  count(*) filter (where q.nubox_document_id is not null) with_nubox,
  count(*) filter (where q.converted_to_income_id is not null) with_income,
  count(*) filter (where q.pricing_context<>'{}'::jsonb) with_pricing_context,
  count(*) filter (where q.tax_code is not null) with_tax_snapshot,
  count(*) filter (where q.sales_context_at_sent is not null) with_sales_ctx,
  count(*) filter (where q.accepted_at is not null) accepted,
  count(*) filter (where q.issued_at is not null) issued_at_set,
  count(*) filter (where q.sent_at is not null) sent_at_set,
  count(*) filter (where q.approved_at is not null) approved_at_set
from greenhouse_commercial.quotations q group by 1,2 order by 1,2;
```

### `u3.sql`
```sql
\echo == N1 manual quotes: creator kind x status x markers
select case when u.email ~* 'agent' then 'agent-persona' when u.email ~* '(test|e2e|playwright|bot|demo)' then 'test-email' else 'human-internal' end creator_kind,
  q.status,
  count(*) n,
  count(*) filter (where coalesce(q.description,'')||' '||coalesce(q.notes,'')||' '||coalesce(q.internal_notes,'')||' '||coalesce(q.client_name_cache,'') ~* '(test|prueba|demo|smoke|dummy|sandbox|qa\M|ejemplo|borrar|xxx)') test_text,
  count(*) filter (where coalesce(q.total_price,0)=0 and coalesce(q.total_amount,0)=0) zero_total,
  count(*) filter (where exists (select 1 from greenhouse_commercial.quotation_line_items l where l.quotation_id=q.quotation_id)) with_lines,
  count(*) filter (where q.organization_id is null) no_org,
  min(q.created_at)::date, max(q.created_at)::date, max(q.updated_at)::date last_upd
from greenhouse_commercial.quotations q left join greenhouse_core.client_users u on u.user_id=q.created_by
where q.source_system='manual' group by 1,2 order by 1,2;
\echo == N2 status vs lifecycle timestamps (all)
select status, count(*) n, count(issued_at) issued_at, count(issued_by) issued_by, count(sent_at) sent_at, count(approved_at) approved_at, count(approved_by) approved_by,
 count(expired_at) expired_at, count(converted_at) converted_at, count(converted_to_income_id) income, count(approval_rejected_at) rej_at, count(accepted_at) accepted_at,
 count(valid_until) valid_until, count(expiry_date) expiry_date, count(due_date) due_date, count(quote_date) quote_date, count(billing_start_date) billing_start
from greenhouse_commercial.quotations group by 1 order by 1;
\echo == N3 current_version distribution and version rows
select q.current_version, count(*) quotes, sum((select count(*) from greenhouse_commercial.quotation_versions v where v.quotation_id=q.quotation_id)) version_rows,
  count(*) filter (where not exists (select 1 from greenhouse_commercial.quotation_versions v where v.quotation_id=q.quotation_id and v.version_number=q.current_version)) missing_current_version_row
from greenhouse_commercial.quotations q group by 1 order by 1;
\echo == N4 versions: created_by, snapshot length, diff
select created_by ~ '^user-' or created_by ~ '^usr' as by_user, created_by='task-345-bridge' by_bridge, jsonb_array_length(snapshot_json) snap_len_bucket, count(*) n, count(diff_from_previous) with_diff, count(total_price) with_total_price, count(total_cost) with_total_cost, count(notes) with_notes
from greenhouse_commercial.quotation_versions group by 1,2,3 order by 4 desc limit 20;
\echo == N5 versions vs line items in same version (snapshot length = live line count?)
select count(*) versions, count(*) filter (where jsonb_array_length(v.snapshot_json) = (select count(*) from greenhouse_commercial.quotation_line_items l where l.quotation_id=v.quotation_id and l.version_number=v.version_number)) snapshot_len_equals_lines,
 count(*) filter (where jsonb_array_length(v.snapshot_json)=0) empty_snapshot
from greenhouse_commercial.quotation_versions v;
\echo == N6 line items version orphaning
select count(*) lines, count(*) filter (where not exists (select 1 from greenhouse_commercial.quotation_versions v where v.quotation_id=l.quotation_id and v.version_number=l.version_number)) no_version_row,
 count(*) filter (where l.version_number <> q.current_version) not_current_version, count(distinct l.quotation_id) quotes_with_lines
from greenhouse_commercial.quotation_line_items l join greenhouse_commercial.quotations q using (quotation_id);
```

### `u4.sql`
```sql
\echo == L1 line items by quote source x line source x line_type
select q.source_system quote_src, l.source_system line_src, l.line_type, l.unit, l.recurrence_type, count(*) n,
 count(l.role_code) role_code, count(l.member_id) member_id, count(l.product_id) product_id, count(l.finance_product_id) fin_prod, count(l.hubspot_line_item_id) hs_li, count(l.hubspot_product_id) hs_prod,
 count(l.tool_id) tool, count(l.addon_id) addon, count(l.service_sku) service_sku, count(l.module_id) module,
 count(l.unit_cost) unit_cost, count(l.subtotal_cost) subtotal_cost, count(l.unit_price) unit_price, count(l.margin_pct) margin_pct, count(l.effective_margin_pct) eff_margin,
 count(*) filter (where l.cost_breakdown<>'{}'::jsonb) cost_breakdown, count(l.pricing_input) pricing_input, count(l.fte_allocation) fte, count(l.hours_estimated) hours,
 count(l.currency) currency, count(l.tax_code) tax_code, count(l.cost_override_reason) cost_override, count(l.discount_type) discount, count(l.finance_line_item_id) fin_li
from greenhouse_commercial.quotation_line_items l join greenhouse_commercial.quotations q using (quotation_id) group by 1,2,3,4,5 order by 6 desc;
\echo == L2 line currency vs quote currency
select (l.currency is null) line_cur_null, (l.currency = q.currency) same, count(*) from greenhouse_commercial.quotation_line_items l join greenhouse_commercial.quotations q using (quotation_id) group by 1,2;
\echo == L3 header totals vs sum of lines (current version), quotes with lines
with s as (select quotation_id, version_number, sum(coalesce(subtotal_after_discount, subtotal_price, quantity*unit_price)) line_sum, sum(subtotal_cost) cost_sum from greenhouse_commercial.quotation_line_items group by 1,2)
select q.source_system, count(*) n,
 count(*) filter (where q.total_price is null) total_price_null, count(*) filter (where q.subtotal is null) subtotal_null,
 count(*) filter (where abs(coalesce(q.total_price,q.subtotal,0) - s.line_sum) <= 1) header_matches_lines,
 count(*) filter (where abs(coalesce(q.total_price,q.subtotal,0) - s.line_sum) > 1) header_differs,
 count(*) filter (where q.total_cost is not null) total_cost_set, count(*) filter (where q.effective_margin_pct is not null) margin_set
from greenhouse_commercial.quotations q join s on s.quotation_id=q.quotation_id and s.version_number=q.current_version group by 1;
\echo == L4 header money columns filled, by source
select source_system, count(*) n, count(subtotal) subtotal, count(tax_rate) tax_rate, count(tax_amount) tax_amount, count(total_amount) total_amount, count(total_amount_clp) total_clp,
 count(total_cost) total_cost, count(total_price_before_discount) tpbd, count(total_discount) total_discount, count(total_price) total_price, count(effective_margin_pct) eff_margin,
 count(target_margin_pct) target_margin, count(margin_floor_pct) margin_floor, count(mrr) mrr, count(arr) arr, count(tcv) tcv, count(acv) acv, count(global_discount_type) gdisc, count(contract_duration_months) duration,
 count(*) filter (where escalation_mode<>'none') escalation, count(business_line_code) bl
from greenhouse_commercial.quotations group by 1;
```

### `u5.sql`
```sql
\echo == J1 quotations.pricing_context top-level keys
select k, count(*) n, string_agg(distinct jsonb_typeof(pricing_context->k), ',') types from greenhouse_commercial.quotations, jsonb_object_keys(pricing_context) k group by 1 order by 2 desc, 1;
\echo == J2 quotations.exchange_rates keys
select k, count(*) n, string_agg(distinct jsonb_typeof(exchange_rates->k), ',') types from greenhouse_commercial.quotations, jsonb_object_keys(exchange_rates) k group by 1 order by 2 desc, 1;
\echo == J3 quotations.sales_context_at_sent keys
select k, count(*) n, string_agg(distinct jsonb_typeof(sales_context_at_sent->k), ',') types from greenhouse_commercial.quotations, jsonb_object_keys(sales_context_at_sent) k group by 1 order by 2 desc, 1;
\echo == J4 quotations.tax_snapshot_json keys
select k, count(*) n, string_agg(distinct jsonb_typeof(tax_snapshot_json->k), ',') types from greenhouse_commercial.quotations, jsonb_object_keys(tax_snapshot_json) k group by 1 order by 2 desc, 1;
\echo == J5 line cost_breakdown keys
select k, count(*) n, string_agg(distinct jsonb_typeof(cost_breakdown->k), ',') types from greenhouse_commercial.quotation_line_items, jsonb_object_keys(cost_breakdown) k group by 1 order by 2 desc, 1;
\echo == J5b line cost_breakdown second-level keys
select k, k2, count(*) n, string_agg(distinct jsonb_typeof(cost_breakdown->k->k2), ',') types from greenhouse_commercial.quotation_line_items, jsonb_object_keys(cost_breakdown) k, jsonb_object_keys(case when jsonb_typeof(cost_breakdown->k)='object' then cost_breakdown->k else '{}'::jsonb end) k2 group by 1,2 order by 1,2;
\echo == J6 line pricing_input keys
select k, count(*) n, string_agg(distinct jsonb_typeof(pricing_input->k), ',') types from greenhouse_commercial.quotation_line_items, jsonb_object_keys(pricing_input) k group by 1 order by 2 desc, 1;
\echo == J7 line tax_snapshot_json keys
select k, count(*) n from greenhouse_commercial.quotation_line_items, jsonb_object_keys(tax_snapshot_json) k group by 1 order by 2 desc, 1;
\echo == J8 versions.snapshot_json element keys (by creator kind)
select (v.created_by='task-345-bridge') bridge, k, count(*) n, string_agg(distinct jsonb_typeof(e->k), ',') types from greenhouse_commercial.quotation_versions v, jsonb_array_elements(v.snapshot_json) e, jsonb_object_keys(e) k group by 1,2 order by 1,3 desc, 2;
\echo == J9 quotation_audit_log actions + details keys
select action, count(*) n, min(created_at)::date, max(created_at)::date from greenhouse_commercial.quotation_audit_log group by 1 order by 2 desc;
```

### `u6.sql`
```sql
\echo == O1 soft-reference orphans (columns with NO FK)
select 'quotations.finance_quote_id -> finance.quotes' ref, count(*) filter (where q.finance_quote_id is not null) set_, count(*) filter (where q.finance_quote_id is not null and not exists (select 1 from greenhouse_finance.quotes f where f.quote_id=q.finance_quote_id)) orphan from greenhouse_commercial.quotations q
union all select 'finance.quotes without commercial mirror', count(*), count(*) filter (where not exists (select 1 from greenhouse_commercial.quotations q where q.finance_quote_id=f.quote_id)) from greenhouse_finance.quotes f
union all select 'quotations.hubspot_deal_id -> commercial.deals.hubspot_deal_id', count(*) filter (where q.hubspot_deal_id is not null), count(*) filter (where q.hubspot_deal_id is not null and not exists (select 1 from greenhouse_commercial.deals d where d.hubspot_deal_id=q.hubspot_deal_id)) from greenhouse_commercial.quotations q
union all select 'quotations.hubspot_deal_id -> crm.deals.hubspot_deal_id', count(*) filter (where q.hubspot_deal_id is not null), count(*) filter (where q.hubspot_deal_id is not null and not exists (select 1 from greenhouse_crm.deals d where d.hubspot_deal_id=q.hubspot_deal_id)) from greenhouse_commercial.quotations q
union all select 'quotations.converted_to_income_id -> finance.income', count(*) filter (where q.converted_to_income_id is not null), count(*) filter (where q.converted_to_income_id is not null and not exists (select 1 from greenhouse_finance.income i where i.income_id=q.converted_to_income_id)) from greenhouse_commercial.quotations q
union all select 'quotations.created_by(manual) -> client_users', count(*) filter (where q.source_system='manual'), count(*) filter (where q.source_system='manual' and not exists (select 1 from greenhouse_core.client_users u where u.user_id=q.created_by)) from greenhouse_commercial.quotations q
union all select 'quotations.issued_by -> client_users', count(q.issued_by), count(*) filter (where q.issued_by is not null and not exists (select 1 from greenhouse_core.client_users u where u.user_id=q.issued_by)) from greenhouse_commercial.quotations q
union all select 'line.finance_line_item_id -> finance.quote_line_items', count(l.finance_line_item_id), count(*) filter (where l.finance_line_item_id is not null and not exists (select 1 from greenhouse_finance.quote_line_items f where f.line_item_id=l.finance_line_item_id)) from greenhouse_commercial.quotation_line_items l
union all select 'finance.quote_line_items without commercial mirror', count(*), count(*) filter (where not exists (select 1 from greenhouse_commercial.quotation_line_items l where l.finance_line_item_id=f.line_item_id)) from greenhouse_finance.quote_line_items f
union all select 'line.role_code -> sellable_roles.role_code', count(l.role_code), count(*) filter (where l.role_code is not null and not exists (select 1 from greenhouse_commercial.sellable_roles r where r.role_code=l.role_code or r.role_sku=l.role_code)) from greenhouse_commercial.quotation_line_items l
union all select 'line.(quotation_id,version_number) -> versions', count(*), count(*) filter (where not exists (select 1 from greenhouse_commercial.quotation_versions v where v.quotation_id=l.quotation_id and v.version_number=l.version_number)) from greenhouse_commercial.quotation_line_items l
union all select 'quote_pdf_assets.quotation_id -> quotations', count(*), count(*) filter (where not exists (select 1 from greenhouse_commercial.quotations q where q.quotation_id=p.quotation_id)) from greenhouse_commercial.quote_pdf_assets p
union all select 'quotations.business_line_code set', count(business_line_code), count(distinct business_line_code) from greenhouse_commercial.quotations q
union all select 'quotations.organization_id null (all)', count(*), count(*) filter (where organization_id is null) from greenhouse_commercial.quotations
union all select 'quotations.client_id null (all)', count(*), count(*) filter (where client_id is null) from greenhouse_commercial.quotations
union all select 'quotations.space_id null (all)', count(*), count(*) filter (where space_id is null) from greenhouse_commercial.quotations;
\echo == O2 duplicates in natural keys
select 'quotation_number dup groups' k, count(*) from (select quotation_number from greenhouse_commercial.quotations group by 1 having count(*)>1) x
union all select 'hubspot_quote_id dup groups', count(*) from (select hubspot_quote_id from greenhouse_commercial.quotations where hubspot_quote_id is not null group by 1 having count(*)>1) x
union all select 'nubox_document_id dup groups', count(*) from (select nubox_document_id from greenhouse_commercial.quotations where nubox_document_id is not null group by 1 having count(*)>1) x
union all select 'hubspot_deal_id with >1 quote', count(*) from (select hubspot_deal_id from greenhouse_commercial.quotations where hubspot_deal_id is not null group by 1 having count(*)>1) x
union all select 'distinct hubspot_deal_id', count(distinct hubspot_deal_id) from greenhouse_commercial.quotations
union all select 'hubspot_line_item_id dup groups', count(*) from (select hubspot_line_item_id from greenhouse_commercial.quotation_line_items where hubspot_line_item_id is not null group by 1 having count(*)>1) x;
\echo == O3 quotation_number formats
select regexp_replace(regexp_replace(quotation_number,'[0-9]','9','g'),'[A-Z]','A','g') fmt, source_system, count(*) from greenhouse_commercial.quotations group by 1,2 order by 3 desc limit 15;
\echo == O4 quotation_id formats
select regexp_replace(regexp_replace(quotation_id,'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}','<uuid>'),'[0-9]+','9','g') fmt, source_system, count(*) from greenhouse_commercial.quotations group by 1,2 order by 3 desc limit 15;
```

### `u7.sql`
```sql
\echo == C1 catalog freshness
select 'sellable_roles' t, count(*) n, count(*) filter (where active) active, min(created_at)::date first_created, max(created_at)::date last_created, max(updated_at)::date last_updated, null::date min_eff, null::date max_eff, null::int distinct_eff from greenhouse_commercial.sellable_roles
union all select 'sellable_role_cost_components', count(*), null, min(created_at)::date, max(created_at)::date, null, min(effective_from), max(effective_from), count(distinct effective_from)::int from greenhouse_commercial.sellable_role_cost_components
union all select 'sellable_role_pricing_currency', count(*), null, min(created_at)::date, max(created_at)::date, null, min(effective_from), max(effective_from), count(distinct effective_from)::int from greenhouse_commercial.sellable_role_pricing_currency
union all select 'role_employment_compatibility', count(*), count(*) filter (where allowed), min(created_at)::date, max(created_at)::date, null, null, null, null from greenhouse_commercial.role_employment_compatibility
union all select 'employment_types', count(*), count(*) filter (where active), min(created_at)::date, max(created_at)::date, max(updated_at)::date, min(effective_from), max(effective_from), count(distinct effective_from)::int from greenhouse_commercial.employment_types
union all select 'role_tier_margins', count(*), null, null, null, max(updated_at)::date, min(effective_from), max(effective_from), count(distinct effective_from)::int from greenhouse_commercial.role_tier_margins
union all select 'service_tier_margins', count(*), null, null, null, max(updated_at)::date, min(effective_from), max(effective_from), count(distinct effective_from)::int from greenhouse_commercial.service_tier_margins
union all select 'margin_targets', count(*), count(*) filter (where effective_until is null), min(created_at)::date, max(created_at)::date, max(updated_at)::date, min(effective_from), max(effective_from), count(distinct effective_from)::int from greenhouse_commercial.margin_targets
union all select 'commercial_model_multipliers', count(*), null, null, null, max(updated_at)::date, min(effective_from), max(effective_from), count(distinct effective_from)::int from greenhouse_commercial.commercial_model_multipliers
union all select 'country_pricing_factors', count(*), null, null, null, max(updated_at)::date, min(effective_from), max(effective_from), count(distinct effective_from)::int from greenhouse_commercial.country_pricing_factors
union all select 'fte_hours_guide', count(*), null, null, null, max(updated_at)::date, min(effective_from), max(effective_from), count(distinct effective_from)::int from greenhouse_commercial.fte_hours_guide
union all select 'overhead_addons', count(*), count(*) filter (where active), min(created_at)::date, max(created_at)::date, max(updated_at)::date, min(effective_from), max(effective_from), count(distinct effective_from)::int from greenhouse_commercial.overhead_addons
union all select 'service_pricing', count(*), count(*) filter (where active), min(created_at)::date, max(created_at)::date, max(updated_at)::date, null, null, null from greenhouse_commercial.service_pricing
union all select 'service_role_recipe', count(*), null, min(created_at)::date, max(created_at)::date, max(updated_at)::date, null, null, null from greenhouse_commercial.service_role_recipe
union all select 'service_tool_recipe', count(*), null, min(created_at)::date, max(created_at)::date, max(updated_at)::date, null, null, null from greenhouse_commercial.service_tool_recipe
union all select 'revenue_metric_config', count(*), count(*) filter (where active), min(created_at)::date, max(created_at)::date, max(updated_at)::date, null, null, null from greenhouse_commercial.revenue_metric_config;
\echo == C2 pricing catalog audit log: by entity_type x action, actors
select entity_type, action, count(*) n, count(distinct actor_user_id) actors, min(created_at)::date, max(created_at)::date from greenhouse_commercial.pricing_catalog_audit_log group by 1,2 order by 1,2;
\echo == C2b audit actor kinds
select case when actor_user_id ~ '^user-' then 'user' else 'system:'||left(actor_user_id,40) end actor_kind, count(*) from greenhouse_commercial.pricing_catalog_audit_log group by 1 order by 2 desc;
\echo == C3 sellable roles: categories/tiers; roles with cost components / pricing / compat
select count(*) roles, count(distinct category) categories, count(distinct tier) tiers,
 count(*) filter (where exists (select 1 from greenhouse_commercial.sellable_role_cost_components c where c.role_id=r.role_id)) with_cost,
 count(*) filter (where exists (select 1 from greenhouse_commercial.sellable_role_pricing_currency c where c.role_id=r.role_id)) with_price,
 count(*) filter (where exists (select 1 from greenhouse_commercial.role_employment_compatibility c where c.role_id=r.role_id)) with_compat,
 count(*) filter (where role_code ~* '(test|demo|prueba|smoke)' or role_label_es ~* '(test|demo|prueba|smoke)') test_like
from greenhouse_commercial.sellable_roles r;
\echo == C3b pricing currency coverage per role
select currency_code, count(*) n, count(distinct role_id) roles from greenhouse_commercial.sellable_role_pricing_currency group by 1 order by 1;
\echo == C3c cost components per employment type / source_kind
select employment_type_code, source_kind, confidence_label, count(*) n, count(distinct role_id) roles, count(total_monthly_cost_usd) with_total, count(loaded_monthly_cost_usd) with_loaded from greenhouse_commercial.sellable_role_cost_components group by 1,2,3 order by 4 desc;
\echo == C4 margin scale: fraction vs percent points
select 'role_tier_margins.margin_opt' c, min(margin_opt)<=1 and max(margin_opt)<=1 as is_fraction_0_1 from greenhouse_commercial.role_tier_margins
union all select 'service_tier_margins.margin_base', max(margin_base)<=1 from greenhouse_commercial.service_tier_margins
union all select 'sellable_role_pricing_currency.margin_pct', max(margin_pct)<=1 from greenhouse_commercial.sellable_role_pricing_currency
union all select 'overhead_addons.margin_pct', max(margin_pct)<=1 from greenhouse_commercial.overhead_addons
union all select 'margin_targets.target_margin_pct', max(target_margin_pct)<=1 from greenhouse_commercial.margin_targets
union all select 'quotations.target_margin_pct', max(target_margin_pct)<=1 from greenhouse_commercial.quotations
union all select 'quotations.effective_margin_pct', max(abs(effective_margin_pct))<=1 from greenhouse_commercial.quotations
union all select 'commercial_model_multipliers.multiplier_pct', max(abs(multiplier_pct))<=1 from greenhouse_commercial.commercial_model_multipliers;
```

### `u8.sql`
```sql
\echo == F1 finance links to quotes
select 'income.quotation_id set' k, count(*) filter (where quotation_id is not null) n, count(*) total from greenhouse_finance.income
union all select 'purchase_orders.quotation_id set', count(*) filter (where quotation_id is not null), count(*) from greenhouse_finance.purchase_orders
union all select 'service_entry_sheets.quotation_id set', count(*) filter (where quotation_id is not null), count(*) from greenhouse_finance.service_entry_sheets
union all select 'contracts.originator_quote_id set', count(*) filter (where originator_quote_id is not null), count(*) from greenhouse_commercial.contracts
union all select 'contract_quotes rows / distinct quotes', count(distinct quotation_id), count(*) from greenhouse_commercial.contract_quotes
union all select 'proposals.quote_id set', count(*) filter (where quote_id is not null), count(*) from greenhouse_commercial.proposals
union all select 'proposals.quote_snapshot_json set', count(quote_snapshot_json), count(*) from greenhouse_commercial.proposals
union all select 'engagement_outcomes.next_quotation_id set', count(next_quotation_id), count(*) from greenhouse_commercial.engagement_outcomes
union all select 'deal_pipeline_snapshots.latest_quote_id set', count(latest_quote_id), count(*) from greenhouse_serving.deal_pipeline_snapshots;
\echo == F1b which quotes are linked from finance/contracts (by quote source/creator kind)
select q.source_system, q.status, case when u.email ~* 'agent' then 'agent-persona' when u.user_id is not null then 'human' else 'system' end creator, count(distinct q.quotation_id) quotes,
 count(distinct i.income_id) incomes, count(distinct c.contract_id) contracts_originated, count(distinct cq.contract_id) contract_links
from greenhouse_commercial.quotations q left join greenhouse_core.client_users u on u.user_id=q.created_by
left join greenhouse_finance.income i on i.quotation_id=q.quotation_id
left join greenhouse_commercial.contracts c on c.originator_quote_id=q.quotation_id
left join greenhouse_commercial.contract_quotes cq on cq.quotation_id=q.quotation_id
where i.income_id is not null or c.contract_id is not null or cq.contract_id is not null group by 1,2,3;
\echo == F2 contracts by source
select (originator_quote_id is not null) from_quote, status, count(*) from greenhouse_commercial.contracts group by 1,2 order by 3 desc;
\echo == F3 serving snapshots freshness
select 'quotation_pipeline_snapshots' t, count(*) n, min(materialized_at)::date, max(materialized_at)::date from greenhouse_serving.quotation_pipeline_snapshots
union all select 'quotation_profitability_snapshots', count(*), min(materialized_at)::date, max(materialized_at)::date from greenhouse_serving.quotation_profitability_snapshots
union all select 'deal_pipeline_snapshots', count(*), min(materialized_at)::date, max(materialized_at)::date from greenhouse_serving.deal_pipeline_snapshots;
\echo == F4 approval policies (shape only)
select condition_type, required_role, active, (business_line_code is null) all_bl, (pricing_model is null) all_pm, count(*) from greenhouse_commercial.approval_policies group by 1,2,3,4,5;
\echo == F5 terms
select 'terms_library' t, count(*) n, count(*) filter (where active) active from greenhouse_commercial.terms_library union all select 'quotation_terms', count(*), count(distinct quotation_id) from greenhouse_commercial.quotation_terms;
\echo == F6 pdf assets / reminders / ops audit
select 'quote_pdf_assets' t, count(*) n, min(generated_at)::date a, max(generated_at)::date b from greenhouse_commercial.quote_pdf_assets
union all select 'quotation_renewal_reminders', count(*), min(created_at)::date, max(created_at)::date from greenhouse_commercial.quotation_renewal_reminders
union all select 'commercial_operations_audit', count(*), min(created_at)::date, max(created_at)::date from greenhouse_commercial.commercial_operations_audit;
```

### `u9.sql`
```sql
\echo == G1 outbox events for quotes
select aggregate_type, event_type, status, count(*) n, min(occurred_at)::date a, max(occurred_at)::date b from greenhouse_sync.outbox_events where aggregate_type ~* 'quot' or event_type ~* 'quot' group by 1,2,3 order by 4 desc limit 40;
\echo == G2 functions in greenhouse_commercial
select p.proname, pg_get_function_result(p.oid) ret, l.lanname, (select count(*) from pg_trigger t where t.tgfoid=p.oid and not t.tgisinternal) used_by_triggers from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang where n.nspname='greenhouse_commercial' order by 1;
\echo == G3 views/matviews depending on quote tables
select distinct dn.nspname||'.'||dc.relname dependent_view, dc.relkind, sn.nspname||'.'||sc.relname source
from pg_depend d join pg_rewrite r on r.oid=d.objid join pg_class dc on dc.oid=r.ev_class join pg_namespace dn on dn.oid=dc.relnamespace
join pg_class sc on sc.oid=d.refobjid join pg_namespace sn on sn.oid=sc.relnamespace
where sc.relname in ('quotations','quotation_line_items','quotation_versions','quotes','quote_line_items','sellable_roles','sellable_role_pricing_currency','sellable_role_cost_components','product_catalog','product_catalog_prices','deals')
 and sn.nspname in ('greenhouse_commercial','greenhouse_finance') and dc.oid<>sc.oid order by 1,3;
\echo == G4 runtime privileges on history tables
select t, has_table_privilege('greenhouse_app', t, 'INSERT') ins, has_table_privilege('greenhouse_app', t, 'UPDATE') upd, has_table_privilege('greenhouse_app', t, 'DELETE') del
from (values ('greenhouse_commercial.quotations'),('greenhouse_commercial.quotation_versions'),('greenhouse_commercial.quotation_line_items'),('greenhouse_commercial.quotation_audit_log'),('greenhouse_commercial.pricing_catalog_audit_log'),('greenhouse_commercial.approval_steps'),('greenhouse_commercial.quote_pdf_assets'),('greenhouse_commercial.sellable_role_pricing_currency'),('greenhouse_commercial.commercial_operations_audit')) v(t);
\echo == G5 owners
select tableowner, count(*) from pg_tables where schemaname='greenhouse_commercial' group by 1;
```

### `u10.sql`
```sql
\echo == T0 float columns / money type spread in scope
select data_type||coalesce('('||numeric_precision||','||numeric_scale||')','') dt, count(*) cols from information_schema.columns where (table_schema||'.'||table_name) in ('greenhouse_commercial.quotations','greenhouse_commercial.quotation_versions','greenhouse_commercial.quotation_line_items','greenhouse_commercial.quotation_line_cost_override_history','greenhouse_commercial.quotation_audit_log','greenhouse_commercial.quotation_terms','greenhouse_commercial.quotation_renewal_reminders','greenhouse_commercial.approval_policies','greenhouse_commercial.approval_steps','greenhouse_commercial.quote_pdf_assets','greenhouse_commercial.quote_short_links','greenhouse_commercial.quote_share_views','greenhouse_commercial.quote_templates','greenhouse_commercial.quote_template_items','greenhouse_commercial.terms_library','greenhouse_commercial.commercial_operations_audit','greenhouse_finance.quotes','greenhouse_finance.quote_line_items','greenhouse_commercial.sellable_roles','greenhouse_commercial.sellable_role_cost_components','greenhouse_commercial.sellable_role_pricing_currency','greenhouse_commercial.role_employment_compatibility','greenhouse_commercial.employment_types','greenhouse_commercial.employment_type_aliases','greenhouse_commercial.role_rate_cards','greenhouse_commercial.role_tier_margins','greenhouse_commercial.service_tier_margins','greenhouse_commercial.margin_targets','greenhouse_commercial.commercial_model_multipliers','greenhouse_commercial.country_pricing_factors','greenhouse_commercial.fte_hours_guide','greenhouse_commercial.revenue_metric_config','greenhouse_commercial.service_pricing','greenhouse_commercial.service_role_recipe','greenhouse_commercial.service_tool_recipe','greenhouse_commercial.overhead_addons','greenhouse_ai.tool_catalog','greenhouse_core.tool_catalog','greenhouse_commercial.pricing_catalog_audit_log','greenhouse_commercial.pricing_catalog_approval_queue','greenhouse_commercial.commercial_cost_basis_snapshots','greenhouse_commercial.member_role_cost_basis_snapshots','greenhouse_commercial.role_blended_cost_basis_snapshots','greenhouse_commercial.role_modeled_cost_basis_snapshots','greenhouse_commercial.tool_provider_cost_basis_snapshots','greenhouse_commercial.product_catalog','greenhouse_commercial.product_catalog_prices','greenhouse_commercial.product_categories','greenhouse_commercial.product_units','greenhouse_commercial.product_source_kind_mapping','greenhouse_commercial.product_sync_conflicts','greenhouse_commercial.deals','greenhouse_commercial.deal_create_attempts','greenhouse_crm.deals','greenhouse_commercial.contracts','greenhouse_commercial.contract_quotes','greenhouse_commercial.master_agreements','greenhouse_finance.purchase_orders','greenhouse_finance.service_entry_sheets','greenhouse_serving.quotation_pipeline_snapshots','greenhouse_serving.quotation_profitability_snapshots','greenhouse_serving.deal_pipeline_snapshots') and data_type in ('numeric','real','double precision','money','integer','bigint') group by 1 order by 2 desc;
\echo == T1 tool catalogs
select 'ai.tool_catalog' t, count(*) n, count(*) filter (where is_active) active, count(tool_sku) with_sku, count(prorated_cost_usd) with_cost, count(prorated_price_usd) with_price, count(subscription_amount) with_subscription, count(distinct subscription_currency) sub_currencies, max(updated_at)::date last_upd, count(*) filter (where includes_in_addon) in_addon from greenhouse_ai.tool_catalog;
select 'core.tool_catalog' t, count(*) n, count(*) filter (where active) active, max(updated_at)::date last_upd, (select count(*) from greenhouse_core.tool_catalog c join greenhouse_ai.tool_catalog a on lower(a.tool_name)=lower(c.tool_name)) name_overlap_with_ai from greenhouse_core.tool_catalog;
\echo == T2 cost basis snapshots
select basis_scope, status, engine_version, trigger_source, count(*) n, min(period_id) p0, max(period_id) p1, max(finished_at)::date last_run from greenhouse_commercial.commercial_cost_basis_snapshots group by 1,2,3,4 order by 5 desc;
select 'member_role' t, count(*) n, count(distinct member_id) members, count(role_id) with_role, min(period_id) p0, max(period_id) p1, max(materialized_at)::date last_mat, string_agg(distinct resolved_currency, ',') cur from greenhouse_commercial.member_role_cost_basis_snapshots
union all select 'role_blended', count(*), count(distinct role_id), count(role_id), min(period_id), max(period_id), max(materialized_at)::date, string_agg(distinct resolved_currency, ',') from greenhouse_commercial.role_blended_cost_basis_snapshots;
\echo == T3 product catalog
select source_system, source_kind, product_type, active, is_archived, count(*) n, count(hubspot_product_id) with_hs, count(finance_product_id) with_fin, count(default_unit_price) with_price, max(updated_at)::date last_upd from greenhouse_commercial.product_catalog group by 1,2,3,4,5 order by 6 desc;
select currency_code, is_authoritative, source, count(*) n, count(distinct product_id) products, max(updated_at)::date from greenhouse_commercial.product_catalog_prices group by 1,2,3 order by 1,2,3;
select hubspot_sync_status, count(*) from greenhouse_commercial.product_catalog group by 1;
select conflict_type, resolution_status, count(*) n, max(detected_at)::date from greenhouse_commercial.product_sync_conflicts group by 1,2 order by 3 desc;
\echo == T4 deals
select 'commercial.deals' t, count(*) n, count(*) filter (where is_deleted) deleted, count(*) filter (where is_closed) closed, count(*) filter (where is_won) won, count(distinct currency) cur, count(amount_clp) with_clp, max(hubspot_last_synced_at)::date last_sync, count(organization_id) with_org from greenhouse_commercial.deals;
select 'crm.deals' t, count(*) n, count(*) filter (where is_deleted) deleted, max(synced_at)::date last_sync, (select count(*) from greenhouse_crm.deals c join greenhouse_commercial.deals d using (hubspot_deal_id)) overlap from greenhouse_crm.deals;
select status, count(*) n, min(created_at)::date, max(created_at)::date from greenhouse_commercial.deal_create_attempts group by 1;
```

### `u11.sql`
```sql
\echo == X1 FX relations
select n.nspname||'.'||c.relname rel, c.relkind, c.reltuples::bigint est from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','v','m') and c.relname ~* '(exchange|fx_|currenc|economic_indic)' and n.nspname like 'greenhouse_%' order by 1;
\echo == X2 sync freshness
select 'quotations.hubspot_last_synced_at' k, count(hubspot_last_synced_at) n, min(hubspot_last_synced_at)::date a, max(hubspot_last_synced_at)::date b from greenhouse_commercial.quotations
union all select 'quotations.updated_at (hubspot)', count(*), min(updated_at)::date, max(updated_at)::date from greenhouse_commercial.quotations where source_system='hubspot'
union all select 'quotations.updated_at (nubox)', count(*), min(updated_at)::date, max(updated_at)::date from greenhouse_commercial.quotations where source_system='nubox'
union all select 'quotations.updated_at (manual)', count(*), min(updated_at)::date, max(updated_at)::date from greenhouse_commercial.quotations where source_system='manual'
union all select 'finance.quotes.updated_at', count(*), min(updated_at)::date, max(updated_at)::date from greenhouse_finance.quotes
union all select 'finance.quotes.hubspot_last_synced_at', count(hubspot_last_synced_at), min(hubspot_last_synced_at)::date, max(hubspot_last_synced_at)::date from greenhouse_finance.quotes
union all select 'line_items.updated_at', count(*), min(updated_at)::date, max(updated_at)::date from greenhouse_commercial.quotation_line_items;
\echo == X3 finance.quotes by source/status and the 8 unmirrored
select f.source_system, f.status, count(*) n, count(*) filter (where not exists (select 1 from greenhouse_commercial.quotations q where q.finance_quote_id=f.quote_id)) unmirrored,
 count(f.hubspot_quote_id) hs_quote, count(f.nubox_document_id) nubox, count(f.converted_to_income_id) income, count(f.organization_id) org, count(f.client_id) client
from greenhouse_finance.quotes f group by 1,2 order by 3 desc;
\echo == X3b unmirrored finance quotes: same hubspot_quote_id/number exists canonically?
select count(*) n, count(*) filter (where exists (select 1 from greenhouse_commercial.quotations q where q.hubspot_quote_id=f.hubspot_quote_id)) hs_match,
 count(*) filter (where exists (select 1 from greenhouse_commercial.quotations q where q.quotation_number=f.quote_number)) number_match, min(f.created_at)::date, max(f.created_at)::date, string_agg(distinct f.created_by, ',') creators_kind
from greenhouse_finance.quotes f where not exists (select 1 from greenhouse_commercial.quotations q where q.finance_quote_id=f.quote_id) and (f.created_by is null or f.created_by !~ '@');
\echo == X4 cost worker failures cadence
select to_char(started_at,'YYYY-MM') m, status, count(*) from greenhouse_commercial.commercial_cost_basis_snapshots group by 1,2 order by 1,2;
select k, count(*) from greenhouse_commercial.commercial_cost_basis_snapshots, jsonb_object_keys(summary_jsonb) k where status='failed' group by 1 order by 2 desc limit 12;
\echo == X5 quote_date null for hubspot quotes; issued w/o issued_at
select source_system, status, count(*) n, count(quote_date) quote_date, count(issued_at) issued_at, count(valid_until) valid_until from greenhouse_commercial.quotations group by 1,2 order by 1,2;
```

### `u12.sql`
```sql
\echo == Y1 finance.quotes created per month x source, mirrored?
select to_char(f.created_at,'YYYY-MM') m, f.source_system, count(*) n, count(*) filter (where exists (select 1 from greenhouse_commercial.quotations q where q.finance_quote_id=f.quote_id)) mirrored from greenhouse_finance.quotes f group by 1,2 order by 1,2;
\echo == Y2 canonical hubspot quotes: created_at vs legacy finance created_at
select to_char(q.created_at,'YYYY-MM') canonical_created, to_char(f.created_at,'YYYY-MM') finance_created, count(*) from greenhouse_commercial.quotations q join greenhouse_finance.quotes f on f.quote_id=q.finance_quote_id where q.source_system='hubspot' group by 1,2 order by 1,2;
\echo == Y3 legacy_excluded by source/status
select source_system, status, legacy_excluded, count(*) from greenhouse_commercial.quotations group by 1,2,3 order by 1,2,3;
\echo == Y4 finance.quote_line_items unmirrored: parent mirrored?
select count(*) n, count(*) filter (where exists (select 1 from greenhouse_commercial.quotations q where q.finance_quote_id=f.quote_id)) parent_mirrored, count(distinct f.quote_id) parents from greenhouse_finance.quote_line_items f where not exists (select 1 from greenhouse_commercial.quotation_line_items l where l.finance_line_item_id=f.line_item_id);
\echo == Y5 the 4 lines without a version row + 10 quotes without version row
select q.source_system, q.status, count(distinct q.quotation_id) quotes_missing_v1, count(l.line_item_id) lines from greenhouse_commercial.quotations q left join greenhouse_commercial.quotation_line_items l on l.quotation_id=q.quotation_id where not exists (select 1 from greenhouse_commercial.quotation_versions v where v.quotation_id=q.quotation_id) group by 1,2;
\echo == Y6 audit log actor kinds + details keys
select case when actor_user_id ~ '^user-' then 'user' else 'system:'||left(actor_user_id,30) end actor, count(*) from greenhouse_commercial.quotation_audit_log group by 1;
select action, k, count(*) from greenhouse_commercial.quotation_audit_log, jsonb_object_keys(details) k group by 1,2 order by 1,2;
\echo == Y7 org coverage: distinct orgs quoted per source
select source_system, count(distinct organization_id) orgs, count(distinct client_id) clients, count(distinct space_id) spaces, count(distinct hubspot_deal_id) deals from greenhouse_commercial.quotations group by 1;
\echo == Y8 non-legacy-excluded "live" quote universe
select source_system, status, count(*) n from greenhouse_commercial.quotations where not legacy_excluded group by 1,2 order by 1,2;
```

### `u13.sql`
```sql
\echo == Z1 income rows linked to quotes (aggregate)
select i.payment_status, i.income_type, i.currency, (i.nubox_document_id is not null) emitted_nubox, (i.description ~* '(test|prueba|smoke|demo)') test_text, count(*) n, min(i.created_at)::date, max(i.created_at)::date
from greenhouse_finance.income i where i.quotation_id is not null group by 1,2,3,4,5;
\echo == Z2 FX columns on quotations
select source_system, count(*) n, count(exchange_snapshot_date) snap_date, count(exchange_rate_to_clp) rate, count(*) filter (where exchange_rates <> '{}'::jsonb) rates_json,
 count(*) filter (where currency<>'CLP' and exchange_rate_to_clp is null) nonclp_without_rate from greenhouse_commercial.quotations group by 1;
\echo == Z3 redundancy checks
select count(*) n, count(*) filter (where pricing_model = commercial_model) pm_eq_cm,
 count(*) filter (where valid_until is not null and expiry_date is not null) both_valid_expiry, count(*) filter (where valid_until is distinct from due_date and due_date is not null) due_ne_valid,
 count(*) filter (where total_amount is not null and total_price is not null and total_amount<>total_price) amount_ne_price,
 count(*) filter (where tax_amount is not null and tax_amount_snapshot is not null) both_tax_cols, count(*) filter (where tax_amount_snapshot is not null and tax_amount is null) only_snapshot_tax,
 count(*) filter (where tax_rate is not null and tax_rate_snapshot is not null and tax_rate<>tax_rate_snapshot) tax_rate_scale_mismatch
from greenhouse_commercial.quotations;
\echo == Z4 tax_rate scale (legacy column vs snapshot column)
select 'tax_rate' c, count(*) filter (where tax_rate>1) gt1, count(*) filter (where tax_rate<=1) le1 from greenhouse_commercial.quotations where tax_rate is not null
union all select 'tax_rate_snapshot', count(*) filter (where tax_rate_snapshot>1), count(*) filter (where tax_rate_snapshot<=1) from greenhouse_commercial.quotations where tax_rate_snapshot is not null
union all select 'finance.quotes.tax_rate', count(*) filter (where tax_rate>1), count(*) filter (where tax_rate<=1) from greenhouse_finance.quotes where tax_rate is not null;
\echo == Z5 margin scale stored on quote vs snapshots
select 'serving.quoted_margin_pct' c, count(*) filter (where abs(quoted_margin_pct)>1) gt1, count(*) filter (where abs(quoted_margin_pct)<=1) le1 from greenhouse_serving.quotation_pipeline_snapshots where quoted_margin_pct is not null
union all select 'line.effective_margin_pct', count(*) filter (where abs(effective_margin_pct)>1), count(*) filter (where abs(effective_margin_pct)<=1) from greenhouse_commercial.quotation_line_items where effective_margin_pct is not null;
```

### `u14.sql`
```sql
\echo == R1 manual quotes: strict (word-bounded) test markers in header text or line labels
with m as (
 select q.*, (coalesce(q.description,'')||' '||coalesce(q.notes,'')||' '||coalesce(q.internal_notes,'')||' '||coalesce(q.client_name_cache,'')||' '||coalesce((select string_agg(l.label||' '||coalesce(l.description,''),' ') from greenhouse_commercial.quotation_line_items l where l.quotation_id=q.quotation_id),'')) txt,
  exists (select 1 from greenhouse_commercial.quotation_line_items l where l.quotation_id=q.quotation_id) has_lines,
  (u.email ~* 'agent') agent
 from greenhouse_commercial.quotations q left join greenhouse_core.client_users u on u.user_id=q.created_by where q.source_system='manual')
select agent, (txt ~* '\m(test|tests|testing|prueba|pruebas|demo|smoke|dummy|sandbox|qa|e2e|ejemplo|borrar|task-[0-9]+|canary|verificaci[oó]n)\M') strict_marker,
  has_lines, (coalesce(total_price,0)>0 or coalesce(total_amount,0)>0) nonzero_total, (organization_id is not null) has_org, legacy_excluded, count(*) n
from m group by 1,2,3,4,5,6 order by 7 desc;
```

### `migmap.sh` (lado del repositorio: migración que crea y última que cambia cada tabla)

La única línea alterada respecto de lo ejecutado es el `cd`, que apuntaba a una ruta absoluta local.
```bash
#!/bin/bash
# For each qualified object name: first (creating) and last (changing) migration that mentions it in a DDL statement
cd "$(git rev-parse --show-toplevel)"
while read -r obj; do
  [ -z "$obj" ] && continue
  esc=$(printf '%s' "$obj" | sed 's/\./\\./g')
  files=$(grep -liE "(create (or replace )?(table|view|materialized view)( if not exists)?|alter table( if exists)?( only)?|drop table( if exists)?|comment on (table|column)|create (unique )?index[^;]* on|create (or replace )?trigger[^;]* on) +${esc}\b" migrations/*.sql 2>/dev/null | sort)
  # second pass: multi-line index/trigger "ON obj"
  files2=$(grep -liE "\bon +${esc}\b" migrations/*.sql 2>/dev/null | sort)
  all=$(printf '%s\n%s\n' "$files" "$files2" | grep -v '^$' | sort -u)
  first=$(echo "$all" | head -1 | xargs -I{} basename {} 2>/dev/null)
  last=$(echo "$all" | tail -1 | xargs -I{} basename {} 2>/dev/null)
  n=$(echo "$all" | grep -c .)
  legacy=$(grep -liE "create table( if not exists)? +${esc}\b" scripts/*.sql 2>/dev/null | xargs -n1 basename 2>/dev/null | tr '\n' ',')
  echo "$obj|$n|$first|$last|$legacy"
done
```

Nota sobre `u8.sql`: su último bloque (`F6`) se detuvo en un error (`commercial_operations_audit` no tiene columna `created_at`); por eso no se obtuvieron los rangos de fechas de `quote_pdf_assets` ni de `quotation_renewal_reminders` de ese bloque. Los conteos de filas de esas tablas salen de `sql_counts`.
