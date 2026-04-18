# Pricing Comercial — Catálogo, Motor y Builder de Cotizaciones

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-18 por Claude (TASK-469)
> **Ultima actualizacion:** 2026-04-18 por Claude (TASK-469)
> **Estado:** Programa en diseño (TASK-463..468 en backlog; no implementado en runtime todavía)
> **Documentacion tecnica:**
> - Plano UI: [TASK-469 — Commercial Pricing UI Interface Plan](../../tasks/complete/TASK-469-commercial-pricing-ui-interface-plan.md)
> - Tasks de schema + engine: [TASK-464a..d](../../tasks/to-do/) — roles, governance, tool catalog, engine
> - Task bridge payroll: [TASK-468](../../tasks/to-do/TASK-468-payroll-commercial-employment-types-unification.md)

## Que es

El programa de pricing comercial es el sistema que Efeonce usa internamente para cotizar a un cliente de forma consistente, auditable y alineada con el margen objetivo de la agencia. Es la combinación de tres cosas: un **catálogo canónico** de lo que Efeonce vende (roles, herramientas, overhead, servicios empaquetados), un **motor de pricing** que aplica las reglas comerciales (modelo, país, moneda, tier), y un **builder de cotizaciones** que los Account Leads usan día a día.

El programa nace de un problema real: hoy cada Account Lead cotiza copiando Excels viejos, interpreta márgenes con criterio propio y Efeonce no tiene forma rápida de saber si una cotización tiene el margen que corresponde según el tier de rol y el modelo comercial. El programa elimina esa improvisación sin volverse burocrático: los defaults están bien pensados, el override existe cuando hace sentido, y Finance gana visibilidad sin pedirle permiso al Account Lead.

## Que resuelve

| Dolor operativo | Como lo resuelve el programa |
|---|---|
| Cada cotización se arma desde cero copiando Excels viejos | Catálogo canónico de 33 roles, 26 herramientas, 9 overhead add-ons y servicios empaquetados — todo con SKU estable |
| El margen no se ve hasta que Finance lo calcula ex-post | Cost stack panel en el builder muestra margen bruto en vivo (gated a finance/admin — el Account Lead no lo ve por default) |
| No hay una sola tarifa — cambia por empleo, país, moneda, modelo | Pricing engine v2 aplica employment_type × country_factor × commercial_model × currency en un solo paso determinista |
| Cotizar para Pinturas Berel en MXN obliga a conversiones manuales | Multi-currency output con exchange rate snapshot inmutable al momento de envío |
| Revisar qué se le cotizó al cliente hace 6 meses es forense de Excel | Cada quote tiene su versión, su sales context snapshot y su audit trail de cambios |
| Agregar un rol nuevo o una herramienta nueva requiere un developer | Admin UI self-service `/admin/pricing-catalog` con CRUD completo y audit log |

## Pilares

### 1. Catálogo canónico (lo que Efeonce vende)

Cuatro tipos de ítems vendibles conviven en el catálogo:

- **Roles vendibles** (33, SKU `ECG-001..033`): Sr Strategist, Mid Designer, Jr Developer, etc. Cada rol tiene una tarifa base por employment_type y moneda, y pertenece a un tier (Commoditizado, Especializado, Estratégico, IP Propietaria) que define el rango de margen objetivo.
- **Herramientas** (26, SKU externo del proveedor): Figma, Notion, Adobe Creative Cloud, Envato, etc. Cada una tiene un modelo de tarifa (per-seat, flat mensual, prorrateo por proyecto) y metadata de proveedor.
- **Overhead add-ons** (9): PM Fee, Setup Staff Augmentation, Transactional Fee, AI Infra, Efeonce Operational, Descuento por Retención. Se aplican como porcentaje sobre subtotal o monto fijo, con fórmulas parseables (`10% del subtotal`, `1 mes del costo del recurso`, `4-7% variable`).
- **Servicios empaquetados** (7 activos + 41 placeholder, SKU `EFG-001..048`): combinaciones recurrentes de roles + herramientas + overhead con una composición fija (ej. "Branding Básico" = Sr Strategist 0.25 FTE + Mid Designer 0.5 FTE + PM Fee 5%).

> Detalle técnico: schemas `greenhouse_commercial.sellable_roles`, `tool_catalog` (extendido), `overhead_addons`, `service_catalog`. Ver [TASK-464a](../../tasks/to-do/TASK-464a-sellable-roles-catalog-canonical.md), [TASK-464c](../../tasks/to-do/TASK-464c-tool-catalog-extension-overhead-addons.md), [TASK-465](../../tasks/to-do/TASK-465-service-composition-catalog-ui.md).

### 2. Governance (las reglas del comercio)

Además del catálogo, hay tablas que fijan las **dimensiones comerciales**:

- **Tiers de rol** (4): Commoditizado, Especializado, Estratégico, IP Propietaria — cada uno con margen min / opt / max (ej. Estratégico: 30-40%)
- **Modelos comerciales** (4): On-Going (retainer), On-Demand (+10% sobre tarifa base), Hybrid (+5%), License / Consulting (+15%)
- **Factores por país** (6): Chile Corporate (1.0), Chile PYME (0.9), Colombia / LATAM (0.85-0.9), International USD (1.0), Licitación Pública (1.2), Cliente Estratégico (descuento negociado)
- **Tipos de contratación** (6): Indefinido CLP, Plazo Fijo CLP, Honorarios CLP, Contractor Deel USD, Contractor EOR USD, Part-time CLP — cada uno con su propia composición de costo previsional + fee de gestión
- **FTE hours guide**: equivalencia `% dedicación → horas mensuales` (0.1 FTE = 17h, 0.25 FTE = 42h, 1.0 FTE = 168h)

Estas dimensiones son code-versioned (vocabulario cerrado, no aprendido del CSV). Cambiarlas requiere migración + deploy — no se improvisan desde admin UI.

> Detalle técnico: schemas `greenhouse_commercial.role_tier_margins`, `commercial_model_multipliers`, `country_pricing_factors`, `employment_types`, `fte_hours_guide`. Ver [TASK-464b](../../tasks/to-do/TASK-464b-pricing-governance-tables.md).

### 3. Motor de pricing (el cerebro)

El engine v2 toma una cotización en estado bruto (cliente, modelo, país, moneda, líneas) y devuelve:

1. **Cost stack por línea**: costo base + bonos + previsional + fee de gestión (deel/EOR) — gated a finance/admin
2. **Precio al cliente por línea**: costo × (1 + margen_tier) × multiplicador_modelo × factor_país
3. **Totales multi-moneda**: el mismo quote renderizable en CLP, USD, EUR, GBP con snapshot de exchange rate
4. **Tier compliance flag**: la cotización está `below_min` / `in_range` / `above_max` vs el tier objetivo
5. **Auto-resolve de addons**: si aplica PM Fee, Setup Aug, etc. según la composición de la quote

El engine consume tablas ya normalizadas; no parsea CSV en runtime. Si una línea hace referencia a un SKU inexistente, falla de forma determinista — no adivina.

> Detalle técnico: `src/lib/commercial/pricing-engine-v2.ts` (consume tablas de TASK-464a/b/c, adapta backward-compat vía `costing-engine.ts` legacy). Ver [TASK-464d](../../tasks/to-do/TASK-464d-pricing-engine-full-model-refactor.md).

### 4. Builder de cotizaciones (la experiencia)

El builder (superficie visible que ve el Account Lead) tiene tres zonas:

- **Card principal**: header con logo + número + fechas + cliente/deal, line items editables con 4 tipos de picker (rol, herramienta, overhead, servicio), totales al pie
- **Sidebar contextual**: modelo comercial, país, moneda, tipo de contratación, términos de pago, CTAs "Guardar borrador" / "Enviar al cliente" / "Vista previa"
- **Cost stack panel** (gated a finance/admin): desglose de costo, margen bruto con semáforo, tier fit indicador

El semáforo de margen usa cuatro estados con icono + label + color (nunca solo color):

| Estado | Rango vs tier objetivo | Icono | Label |
|---|---|---|---|
| Crítico | marginPct < tier.min | `tabler-alert-triangle` | Crítico |
| Atención | tier.min ≤ marginPct < tier.opt | `tabler-alert-circle` | Atención |
| Óptimo | tier.opt ≤ marginPct ≤ tier.max | `tabler-circle-check` | Óptimo |
| Sobre meta | marginPct > tier.max | `tabler-info-circle` | Sobre meta |

"Sobre meta" no es malo — puede indicar una cotización muy competitiva con margen de sobra; el semáforo solo comunica "estás fuera del rango objetivo por arriba" para que Finance sepa si hay espacio para negociar o si es un error de captura.

> Detalle técnico: componentes en `src/components/greenhouse/pricing/` (9 piezas nuevas inventariadas en TASK-469 §3), views en `src/views/greenhouse/finance/quotes/`. Ver [TASK-464e](../../tasks/to-do/TASK-464e-quote-builder-ui-exposure.md), [TASK-465](../../tasks/to-do/TASK-465-service-composition-catalog-ui.md), [TASK-466](../../tasks/to-do/TASK-466-multi-currency-quote-output.md).

### 5. Admin UI self-service (Torre de Control)

`/admin/pricing-catalog` permite que Finance y admins de Efeonce evolucionen el catálogo sin developer:

- CRUD sobre roles, herramientas, overhead add-ons, servicios empaquetados
- Lectura sobre tiers, modelos comerciales, factores de país, tipos de contratación (edición de estos requiere migración — son code-versioned)
- Audit timeline que muestra quién cambió qué precio, cuándo, y con qué razón
- Preview de rates vigentes de payroll (AFP, previsional) como referencia read-only para que se entienda por qué un tipo de contratación cuesta lo que cuesta

> Detalle técnico: `src/views/greenhouse/admin/pricing-catalog/`. Ver [TASK-467](../../tasks/to-do/TASK-467-pricing-catalog-admin-ui.md).

## Relación con otros módulos

### Con HubSpot

Crear una cotización en Greenhouse desde `/finance/cotizaciones` propaga automáticamente a HubSpot (nombre, total, estado, deal asociado). Ediciones significativas (send, approve, nueva versión) también sincronizan. La cotización canónica vive en Greenhouse; HubSpot es el espejo donde el equipo comercial trabaja su pipeline.

> Detalle técnico: [TASK-463](../../tasks/to-do/TASK-463-unified-quote-builder-hubspot-bidirectional.md).

### Con Payroll

El programa comercial **no modifica payroll**. Cuando el builder necesita saber cuánto cuesta un "Indefinido CLP" en términos de AFP + previsional + ISAPRE, lee directamente de `greenhouse_payroll.chile_afp_rates`, `chile_previred_indicators` y `chile_tax_brackets` — SELECT-only, sin triggers, sin FK sobre payroll. El programa tiene su propio catálogo `greenhouse_commercial.employment_types` que resuelve alias desde strings legacy de payroll vía un resolver commercial-side.

Esto preserva el baseline de regresión payroll (194 tests / 29 files) sin excepciones.

> Detalle técnico: [TASK-468](../../tasks/to-do/TASK-468-payroll-commercial-employment-types-unification.md).

### Con Finance (P&L, margen)

Una vez la cotización está **aprobada y convertida en contrato**, entra al flujo tradicional de Finance: se materializa como income esperado, se asignan costos reales (payroll de los colaboradores asignados + herramientas + overhead consumido), y el P&L muestra margen real vs proyectado. El pricing engine proyecta; el P&L mide. Si el margen real del servicio difiere del proyectado >10%, el Finance Signal Engine lo levanta como anomalía.

> Detalle técnico: [GREENHOUSE_FINANCE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md), [TASK-245](../../tasks/complete/TASK-245-finance-signal-engine.md).

### Con Business Lines

Cada servicio empaquetado y cada herramienta declaran `applicable_business_lines` (globe, wave, reach, efeonce_digital, crm_solutions). Esto permite que el reporte de MRR y margen por BU sea exacto — no se mezclan servicios de Globe con capacity de Reach.

> Detalle técnico: [GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md).

## Aislamiento de payroll (regla dura)

Ningún componente del programa comercial toca archivos dentro de `src/views/greenhouse/hr/payroll/**` ni `src/components/hr/payroll/**`. Los 194 tests de payroll (29 archivos) son gate de regresión antes de cualquier merge del programa. El employment_type canónico vive en commercial; la facticidad del contract_type por colaborador sigue viviendo en payroll.

## Orden de implementación (6 olas)

El programa se implementa en olas para no romper flujos vivos:

1. **Ola 1** — TASK-458 fix de labels en `/finance/pipeline` (ya completado)
2. **Ola 2** — schema + seeds: TASK-464a (roles), TASK-468 (bridge payroll), TASK-464b (governance), TASK-464c (tools + overhead), TASK-464d (engine v2)
3. **Ola 3** — copy canónico + scaffolds UI: TASK-469 Slice 4 (ya completado)
4. **Ola 4** — UI builder + admin: TASK-464e (quote builder pickers + cost stack), TASK-465 (service composition), TASK-467 (admin UI)
5. **Ola 5** — integración externa: TASK-463 (HubSpot bidirectional), TASK-466 (multi-currency PDF + email)
6. **Ola 6** — revenue pipeline hybrid: TASK-453..457 + TASK-460..462 (contract/SOW/MSA, MRR/ARR, pipeline UI)

Durante Ola 2-3 el portal sigue usando el engine v1 y el flow de cotización legacy. La migración al engine v2 + UI nueva ocurre en Ola 4 con feature flag; el legacy queda deprecado en Ola 5.

## Componentes UI disponibles (pre-Ola 4)

Tres primitives presentacionales standalone ya están implementados en `src/components/greenhouse/pricing/` y pueden ser consumidos por features que no dependen del engine v2:

- **`MarginIndicatorBadge`** — semáforo de margen con los 4 estados del tier fit; recibe `marginPct` y `target {min, opt, max}` ya calculados por el caller.
- **`CurrencySwitcher`** — selector de 4 monedas (CLP, USD, EUR, GBP) con disclaimer opcional de exchange rate snapshot.
- **`PricingCatalogNavCard`** — card de navegación a secciones del admin catalog (roles, tools, overhead, etc.) con icon + count + link.

El resto (CostStackPanel, SellableItemPickerDrawer, ServiceCompositionEditor, QuickEntityFormDrawer, PriceChangeAuditTimeline, SellableItemRow) requiere el engine v2 y catálogos de Ola 2, por lo que llegan con TASK-464e/465/467.
