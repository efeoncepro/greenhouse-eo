# Anexo A — Dominio, motor de precios, API e integraciones

> **Pertenece a:** [Auditoría del cotizador actual de Greenhouse — 2026-10-12](2026-10-12-cotizador-actual-auditoria.md).
> **Fecha de corte:** 2026-10-12.
> **Alcance:** `src/lib/finance/pricing/**`, `src/lib/commercial/**`, `src/lib/finance/quote-share/**`, `src/lib/finance/pdf/**`, `src/lib/hubspot/**`, `src/app/api/finance/quotes/**` y los consumidores de plataforma, Nexa y MCP.
> **Método:** solo lectura de código. Tres comportamientos se ejecutaron además con números sintéticos sobre funciones puras, sin base de datos (F-08, F-09, F-12). Corrida focal de tests del motor, del comando de autoría y del constructor: verde. Sin `pnpm build` ni suite completa.
> **Marcas:** *verificado* = leído en código; *verificado por ejecución* = además corrido; *inferido* = depende de datos vivos o de runtime.

Las rutas son relativas a la raíz del repositorio. Los identificadores `F-01`…`F-33` son los del informe original; el documento principal los reagrupa (tabla de equivalencias al final).

Las notas marcadas **«Corrección de la consolidación»** son ajustes hechos al cruzar este informe con los otros dos y al reabrir cada cita.

---

## 1. Mapa

### 1.1 Agregados y dónde viven

| Agregado | Almacenamiento (según lo escribe el código) | Quién escribe | Notas |
| --- | --- | --- | --- |
| Cabecera de cotización | `greenhouse_commercial.quotations` | `insertQuotationHeader` (`src/lib/commercial/submit-quote-from-builder.ts:233-297`); creación legada `POST /api/finance/quotes` (`src/app/api/finance/quotes/route.ts:386-560`); `persistQuotationPricing` UPDATE (`src/lib/finance/pricing/quotation-pricing-orchestrator.ts:471-541`); sincronización entrante `syncCanonicalFinanceQuote` (`src/lib/finance/quotation-canonical-store.ts:963`) | Una sola tabla guarda cotizaciones del constructor (`source_system='manual'`), entrantes de HubSpot y entrantes de Nubox. La cabecera lleva los totales **solo de la versión vigente**. |
| Líneas | `greenhouse_commercial.quotation_line_items`, llave `(quotation_id, version_number)` | `persistQuotationPricing` DELETE+INSERT (`quotation-pricing-orchestrator.ts:543-659`); clon de `createNewVersion` (`src/lib/commercial/governance/versions-store.ts:224-279`); ajuste de costo (`src/lib/finance/quotation-line-cost-override-store.ts:249`) | La entrada del motor se guarda por línea en `pricing_input` (jsonb); la procedencia del costo en `cost_breakdown` (jsonb). |
| Versión | `greenhouse_commercial.quotation_versions` (`snapshot_json`, totales, `diff_from_previous`) | `persistQuotationPricing` cuando `createVersion` (`quotation-pricing-orchestrator.ts:661-704`); `createNewVersion` (`versions-store.ts:291-316`) | Dos formas distintas de `snapshot_json` (F-19). |
| Aprobación | `greenhouse_commercial.approval_policies`, `approval_steps` | `requestApproval` / `decideApprovalStep` (`src/lib/commercial/governance/approval-steps-store.ts:118-475`) | Pasos con llave `(quotation_id, version_number)`. |
| Términos, plantillas, auditoría | `governance/terms-store.ts`, `templates-store.ts`, `audit-log.ts` | rutas `[id]/terms`, `[id]/save-as-template`, rutas de gobierno | No afectan el precio. |
| Enlace compartido | `greenhouse_commercial.quote_short_links` | `createQuoteShortLink` (`src/lib/finance/quote-share/short-link.ts:115-150`) | Código base62 de 7 caracteres → `/public/quote/[id]/[v]/[token]`. |
| Aceptación | columnas `accepted_*` de la cabecera | `recordQuoteAcceptance` (`src/lib/finance/quote-share/accept-quote.ts:49-112`) | «Aceptación blanda»: no mueve el ciclo de vida. |
| PDF | se renderiza a pedido y se guarda como asset (`quote-share/quote-pdf-asset.ts`) | `renderQuotationPdf` (`src/lib/finance/pdf/render-quotation-pdf.ts`) | Contrato de entrada `RenderQuotationPdfInput` (`src/lib/finance/pdf/contracts.ts`). |
| Foto de tipo de cambio | `quotations.exchange_rates` (jsonb) + `exchange_snapshot_date` | `finalizeQuotationIssued` (`src/lib/commercial/quotation-issuance.ts:78-92`) | Se congela al emitir. |
| Foto de impuesto | columnas de cabecera y línea `tax_code`, `tax_rate_snapshot`, `tax_amount_snapshot`, `tax_snapshot_json` | `persistQuotationPricing` (`quotation-pricing-orchestrator.ts:463-468, 559-565`) | Solo Chile (`src/lib/tax/chile`). Se vuelve a congelar en **cada** guardado (`tax_snapshot_frozen_at = NOW()`, línea 504). |

### 1.2 Máquina de estados (tal como se hace cumplir)

`draft` → (emitir) → `issued` directo, o → `pending_approval` → `issued` | `approval_rejected` → (emitir otra vez)…; `issued` → `converted` (cierre a factura); cualquiera con `expiry_date` pasada → `expired` (barrido diario); nueva versión → `draft`.

- Compuerta de emisión: `ISSUE_ALLOWED_STATUSES = draft | approval_rejected` (`src/lib/commercial/quotation-issue-command.ts:71, 113-131`).
- Escritura de emitida: `persistIssuedState` (`quotation-issuance.ts:46-145`) fija `status='issued'`, `issued_at`, `sent_at`, congela el tipo de cambio, y escribe auditoría y eventos de outbox en una sola transacción.
- Resolución de aprobación: `decideApprovalStep` (`approval-steps-store.ts:250-475`).
- Expiración: `runQuotationLifecycleSweep` (`src/lib/commercial-intelligence/renewal-lifecycle.ts`), programado en el ops-worker (`services/ops-worker/server.ts:810-833, 3278`); la ruta de Vercel `src/app/api/cron/quotation-lifecycle/route.ts` sigue existiendo.
- Estados convertibles en el código: `issued | sent | approved` (`src/lib/commercial/party/commands/convert-quote-to-cash.ts:129-134`, `src/lib/commercial/quote-to-cash/close-quote-to-cash.ts:348-351`).
- **No se hace cumplir en ninguna parte:** la matriz de transiciones. `PUT /api/finance/quotes/[id]` escribe cualquiera de seis estados directamente (F-11).

> **Corrección de la consolidación.** `sent` y `approved` ya no son estados posibles: la migración `20260419212111960_task-504-…` los fundió en `issued` y la restricción `CHECK` de la base los prohíbe ([Anexo B §1.1](2026-10-12-cotizador-actual-anexo-b-base-de-datos.md)). El código todavía los nombra en varios filtros; en la práctica solo `issued` es alcanzable.

### 1.3 Comandos de escritura

| Comando | Archivo | De dónde saca los precios | Control de estado | Control de alcance por tenant |
| --- | --- | --- | --- | --- |
| `submitQuoteFromBuilder` (crear / editar [+ emitir]) | `src/lib/commercial/submit-quote-from-builder.ts:917` | motor, re-simulado en el servidor (`:191-229`) | ninguno al editar (`runEditSave`, `:564-855`) | ninguno al editar |
| `persistQuotationPricing` | `quotation-pricing-orchestrator.ts:432` | lo que le pase quien llama | ninguno | ninguno |
| `recalculateQuotationPricing` | `quotation-pricing-orchestrator.ts:738` | repetición del motor sobre el `pricing_input` guardado | ninguno | ninguno |
| `requestQuotationIssue` | `quotation-issue-command.ts:91` | no aplica | sí | sí (predicado organización/espacio, `:100-103`) |
| `requestApproval` / `decideApprovalStep` | `approval-steps-store.ts` | no aplica | el paso debe estar `pending` | solo rol |
| `createNewVersion` | `versions-store.ts:152` | clona líneas | ninguno | ninguno |
| `applyQuotationLineCostOverride` | `src/lib/finance/quotation-line-cost-override-store.ts:198` | costo manual | — | capacidad `commercial.quotation.cost_override` |
| `recordQuoteAcceptance` | `quote-share/accept-quote.ts:49` | no aplica | ninguno | token HMAC |
| `runQuoteRepriceBulk` | `src/lib/commercial-cost-worker/quote-reprice-bulk.ts:250` | repetición del motor (`strictReplay: true`) | solo con el criterio `current_open_quotes` (`:62-64`) | worker |
| Cierre a factura | `src/lib/commercial/quote-to-cash/close-quote-to-cash.ts`, `src/lib/commercial/party/commands/convert-quote-to-cash.ts` | lee los totales de cabecera | sí | — |

### 1.4 Lectores

- `listFinanceQuotesFromCanonical`, `getFinanceQuoteDetailFromCanonical`, `listFinanceQuoteLinesFromCanonical` (`src/lib/finance/quotation-canonical-store.ts:285, 355, 449`): lista, detalle y líneas para la interfaz.
- `resolveQuotationIdentity` (`src/lib/finance/pricing/quotation-id-resolver.ts:13`): acepta `quotation_id` o `finance_quote_id`.
- `loadPublicQuoteView` (`src/lib/finance/quote-share/load-quote-for-public-view.ts`) y `load-quote-for-pdf-internal.ts`: alimentan la página pública y el PDF.
- `resolveHubSpotQuoteSyncPayload` (`src/lib/hubspot/hubspot-quote-sync.ts:308`): carga para HubSpot.
- `document-chain-reader.ts`, `q2c-readiness-report.ts`: cierre a factura.
- Lectores de simulación: `simulateQuotePricing`, `simulateQuotePricingFromService`, `runQuoteSimulationFromBody` (`src/lib/finance/pricing/simulate-quote-pricing.ts:63, 80, 118`); `searchServiceCatalog`.

> **Corrección de la consolidación.** El lector de la lista filtra `q.organization_id = ANY(...)` (`quotation-canonical-store.ts:303`) y limita a 200 filas. Una cotización sin organización no aparece en la lista. Hoy son 9 (ver documento principal, sección 8).

### 1.5 Rutas de la API

Todas bajo `requireCommercialTenantContext` = grupo de rutas `commercial` o `finance`, o `efeonce_admin` (`src/lib/tenant/authorization.ts:95-98, 493-514`).

`commercial.quotation` (leer, crear, actualizar, aprobar, exportar) se concede en bloque al grupo `commercial` o a `efeonce_admin` (`src/lib/entitlements/runtime.ts`, bloque `for (const action of ['read','create','update','approve','export'])`). `commercial.quotation.cost_override` y `.pricing_config` son solo de `finance_admin` / `efeonce_admin` (`runtime.ts:1929-1932`).

| Ruta | Método | Capacidad | Llama a |
| --- | --- | --- | --- |
| `/api/finance/quotes` | GET | solo contexto | `listFinanceQuotesFromCanonical` |
| `/api/finance/quotes` | POST | `commercial.quotation:create` | **creación legada**: INSERT propio de cabecera + `persistQuotationPricing` con líneas dadas por el cliente (`route.ts:226-560`) |
| `/api/finance/quotes/author` | POST | dentro del comando (`create`/`update`, `approve` si emite) | `submitQuoteFromBuilder` (`author/route.ts:24-80`) |
| `/api/finance/quotes/[id]` | GET | contexto | lector de detalle |
| `/api/finance/quotes/[id]` | PUT | `update` | UPDATE de cabecera, incluidos `status`, `quotationNumber`, `targetMarginPct`, `marginFloorPct`; después `recalculateQuotationPricing` por defecto (`[id]/route.ts:225-592`) |
| `/api/finance/quotes/[id]/lines` | GET / POST | contexto / `update` | POST = `persistQuotationPricing` con `unitPrice`, `manualUnitCost` y `resolvedCostBreakdown` dados por el cliente (`[id]/lines/route.ts:146-340`) |
| `/api/finance/quotes/[id]/recalculate` | POST | `update` | `recalculateQuotationPricing` |
| `/api/finance/quotes/[id]/issue`, `/send` | POST | `approve` / `export` | ambas llaman a `requestQuotationIssue` (`send` es un alias de compatibilidad, `[id]/send/route.ts:49-60`) |
| `/api/finance/quotes/[id]/approve` | GET / POST | contexto / `approve` | `requestApproval`, `decideApprovalStep` |
| `/api/finance/quotes/[id]/versions` | GET / POST | contexto / `update` | `createNewVersion` |
| `/api/finance/quotes/[id]/lines/[lineItemId]/cost-override` | GET / POST | vista de costos / `commercial.quotation.cost_override:update` | almacén de ajustes |
| `/api/finance/quotes/[id]/pdf`, `/share`, `/share/[shortCode]` (+ `send-email`, `resend-email`, `pdf-size`), `/share/contacts`, `/share/dashboard` | GET / POST / DELETE | `export` para escrituras | render de PDF, enlaces cortos, correo |
| `/api/finance/quotes/[id]/terms`, `/save-as-template`, `/audit`, `/document-chain`, `/fx-snapshot`, `/health` | mixto | `update` para escrituras | gobierno |
| `/api/finance/quotes/[id]/convert-to-invoice` | POST | `commercial.quote_to_cash.execute:approve` | cierre a factura (cierre canónico cuando `COMMERCIAL_Q2C_CANONICAL_CLOSE_ENABLED`) |
| `/api/commercial/quotations/[id]/convert-to-cash` | POST | — | comando de cierre |
| `/api/finance/quotes/pricing/simulate` | POST | `commercial.quote.simulate:read` | motor + redacción (`pricing/simulate/route.ts:13-62`) |
| `/api/finance/quotes/pricing/config`, `/lookup` | GET / PUT | `pricing_config:update` para PUT | catálogo + tablas de gobierno |
| `/api/finance/quotes/from-service` | POST | `create` | `expandServiceIntoQuoteLines` (expande y cotiza; no escribe) |
| `/api/finance/quotes/hubspot` | POST | ninguna | responde 410 (obsoleta, `hubspot/route.ts`) |
| `/api/platform/app/quotation/{services,simulate}` | GET / POST | `commercial.quote.simulate` | `src/lib/api-platform/resources/app-quotation.ts` |
| `/api/platform/ecosystem/quotation/{services,simulate}` | GET / POST | solo el vínculo del consumidor, sin capacidad | `src/lib/api-platform/resources/ecosystem-quotation.ts` |
| `/api/public/quote/[quotationId]/[versionNumber]/[token]/accept` | POST | token HMAC | `recordQuoteAcceptance` |
| `/api/finance/quotation-governance/**`, `/api/admin/pricing-catalog/**` | CRUD | admin | políticas, plantillas, términos, catálogo |

### 1.6 Consumidores

- **Interfaz:** el constructor guarda por `/author` (`src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx:1821-1845`); vista previa en vivo por `/pricing/simulate`; el detalle usa `/lines` GET, `/issue`, `/approve`, `/versions`, `/convert-to-invoice`, `/save-as-template` y PUT (`src/views/greenhouse/finance/QuoteDetailView.tsx:281-750`).
- **Nexa:** herramienta de lectura `quote_price` (`src/lib/nexa/nexa-tools.ts:1417-1530`, solo código de servicio); acción gobernada `author_quote` (`src/lib/nexa/actions/author-quote.ts`), detrás de `NEXA_ACTION_RUNTIME_ENABLED` + `NEXA_QUOTE_AUTHOR_ACTION_ENABLED`.
- **MCP:** `search_services`, `quote_price` (`src/mcp/greenhouse/server.ts:289-316`); las entradas son solo `serviceSku` + `currency`.
- **Salida a HubSpot:** proyección `quotation_hubspot_outbound` (`src/lib/sync/projections/quotation-hubspot-outbound.ts:22-30`) ante creada / actualizada / emitida / enviada / aprobada / rechazada / versión creada → `pushCanonicalQuoteToHubSpot` (`src/lib/hubspot/push-canonical-quote.ts`).
- **Entrada desde HubSpot y Nubox:** `sync-hubspot-quotes.ts`, `sync-hubspot-line-items.ts`, rutas del ops-worker `/hubspot/quotes-sync`, `/nubox/quotes-hot-sync` (`services/ops-worker/server.ts:31, 36, 2706, 2756`).
- **Otras proyecciones sobre eventos de cotización:** `quotation-pipeline.ts`, `quotation-profitability.ts`, `deal-pipeline.ts`, `quote-to-cash-autopromoter.ts`, `party-lifecycle-snapshot.ts`, `party-hubspot-outbound.ts`, `src/lib/team-capacity/overcommit-detector.ts`.
- **Workers y cron:** re-precio masivo del `commercial-cost-worker` (`services/commercial-cost-worker/server.ts`, `quote-reprice-bulk.ts`); barrido de ciclo de vida del ops-worker.
- **Correo y Slack:** rutas `send-email` / `resend-email` del enlace; alerta de Slack al aceptar públicamente (`accept/route.ts:98-105`).

---

## 2. Cómo se calcula hoy un precio

Hay **dos motores en serie**, con unidades distintas y con dueños distintos del número final.

### 2.1 Etapa A — `buildPricingEngineOutputV2` (`src/lib/finance/pricing/pricing-engine-v2.ts:975-1352`)

Entrada (`PricingEngineInputV2`, `contracts.ts:280-303`): `businessLineCode`, `commercialModel` (4 códigos), `countryFactorCode`, `outputCurrency` (USD, CLP, CLF, COP, MXN, PEN), `quoteDate`, `lines[]`, `autoResolveAddons`.

Todo se calcula con **USD como pivote** y después se convierte a la moneda de salida.

| Número | Fuente | Evidencia |
| --- | --- | --- |
| Multiplicador comercial | tabla de gobierno vía `getCommercialModelMultiplier(code, quoteDate)`; factor = `1 + multiplierPct`; código desconocido → 1,00 + aviso `critical` | `pricing-engine-v2.ts:992-1002, 1060` |
| Factor país | `getCountryPricingFactor(code, quoteDate)`; usa `factorOpt`; desconocido → 1,00 + aviso `critical` | `:993, 1004-1011, 1061` |
| Costo de rol | 1) `role_blended_cost_basis_snapshots` del periodo de la cotización (o el último periodo); 2) si no, `role_modeled_cost_basis_snapshots`, construido desde `sellable_role_cost_components`; si no hay ninguno → lanza error | `:244-267`; tablas en `src/lib/commercial-cost-basis/people-role-cost-basis.ts`, `role-modeled-cost-basis.ts` |
| Margen de rol | `overrideMarginPct` de la **línea de entrada**; si no, `marginOpt` del nivel en `role_tier_margins`; si no, constante **0,35** | `:364-375` |
| Precio de rol (USD) | `costo / (1 − margen)` (margen acotado a [0, 0,95]) × multiplicador comercial × factor país | `:74-92, 384-389` |
| Precio de rol (no USD) | **no** es el precio USD convertido: sale de la lista de precios del rol para esa moneda (`getCurrentPricing(roleId, currency, quoteDate)` → `fteMonthlyPrice` / `hourlyPrice`) × multiplicadores; solo se convierte por tipo de cambio si no hay fila | `:402-426` |
| Costo de persona | `getPreferredMemberActualCostBasis(memberId, period)`, con origen en `member_role_cost_basis_snapshots` / `greenhouse_serving.member_capacity_economics` / versiones de compensación de nómina | `:500-548`; tablas en `people-role-cost-basis.ts` |
| Margen de persona | `overrideMarginPct` o constante **0,35**; sin control de nivel (`tierCompliance.status='unknown'`) | `:561, 625-631` |
| Costo de herramienta | `tool_provider_cost_basis_snapshots`; si no, `tool_catalog.proratedCostUsd`; si no, el monto de la suscripción convertido | `:666-715` |
| Precio de herramienta | `tool_catalog.proratedPriceUsd`; si no, **costo × 1,15** (+ aviso `info`); solo × factor país (sin multiplicador comercial) | `:718-730` |
| Costo directo (manual) | el monto del usuario es a la vez costo y precio; margen 0 | `:799-882` |
| Línea de recargo explícita | `computeAddonChargeUsd`: fijo / `resource_month` / porcentaje del subtotal base, con mínimo opcional | `src/lib/finance/pricing/addon-resolver.ts:127-159` |
| Recargos automáticos | reglas fijas por código `EFO-003…007` (`addon-resolver.ts:45-85`); en modo `internal_only` solo se suman los de `visibleToClient=false` y el resto vuelve como sugerencia | `pricing-engine-v2.ts:1162-1216, 1276-1313` |
| Horas por FTE | `convertFteToHours` (tabla de gobierno) → horas modeladas → promedio de muestra → constante **160** | `:356-362` |
| Tipo de cambio | `greenhouse_finance.exchange_rates`, en o antes de `quoteDate`, directo y luego inverso, tasa de 6 decimales, caché en proceso de 5 minutos | `src/lib/finance/pricing/currency-converter.ts:49-127` |
| Preparación del tipo de cambio | `resolveFxReadiness(domain='pricing_output')` → solo aviso | `pricing-engine-v2.ts:1018-1058` |
| Totales | `subtotalUsd`, `overheadUsd`, `totalUsd`, `totalOutputCurrency`, `exchangeRateUsed` (en silencio `1` si falta) | `:1218-1252, 1333-1344`; `currency-converter.ts:172-190` |
| Margen agregado | `1 − totalCostUsd/totalUsd`, como **fracción con 4 decimales**; clasificación `critical` si alguna línea está `below_min`, `warning` si < 0,25 o alguna `unknown` | `:52-64, 1249-1261` |

Redondeo: `Math.round(x*100)/100` sobre números de punto flotante en cada paso (costo unitario, precio unitario, totales), para todas las monedas, incluidas CLP y CLF (`pricing-engine-v2.ts:47`). El precio unitario se redondea primero y después se multiplica por las unidades.

> **Corrección de la consolidación (costo de rol en la práctica).** La tabla `role_modeled_cost_basis_snapshots` está vacía en la base. Con la tabla vacía, `getPreferredRoleModeledCostBasisByRoleId` cae a los supuestos vigentes de `sellable_role_cost_components` y arma una foto ad hoc (`src/lib/commercial-cost-basis/role-modeled-cost-basis.ts:382-470`). Es decir: salvo para los 2 roles con foto «blended», el costo de un rol es el supuesto sembrado en el catálogo. La tabla `tool_provider_cost_basis_snapshots` también está vacía, así que el costo de herramienta siempre cae al catálogo.

### 2.2 Etapa B — `persistQuotationPricing` → `buildQuotationPricingSnapshot` (`quotation-pricing-orchestrator.ts:277-398, 432-729`)

La cotización guardada **no** conserva los totales del motor. Cada línea se reduce a `quantity`, `unitPrice`, `manualUnitCost` (`src/lib/finance/pricing/quote-builder-line-items.ts:249-318`) y el motor más antiguo vuelve a calcular:

- línea: `subtotalPrice = quantity × unitPrice`, `subtotalCost = quantity × unitCost`, descuento de línea (porcentaje o fijo), margen como **porcentaje con 2 decimales** (`src/lib/finance/pricing/line-item-totals.ts:36-81`);
- cotización: sumas, descuento global, `effectiveMarginPct` en porcentaje (`line-item-totals.ts:89-138`);
- objetivo y piso de margen: el de la cotización; si no, `greenhouse_commercial.margin_targets` por línea de negocio y fecha; si no, constantes **25 / 15** (`src/lib/finance/pricing/pricing-config-store.ts:17-18, 195-257`);
- salud: `checkDiscountHealth` (`src/lib/finance/pricing/margin-health.ts:17-106`), con aviso de descuento sobre la constante **25 %**;
- métricas de ingreso MRR / ARR / TCV / ACV a partir de la recurrencia, la frecuencia de cobro y los meses de contrato (`src/lib/finance/pricing/revenue-metrics.ts:32-84`);
- impuesto: código chileno (por defecto `cl_vat_19`), foto en cabecera y por línea (`quotation-tax-snapshot.ts:92-119`; `quotation-pricing-orchestrator.ts:463-468, 559-565`);
- `total_amount_clp` y `exchange_rate_to_clp` desde la tabla de tipos de cambio en `quoteDate` (`:441-458`).

Las líneas sin entrada v2 caen al **motor de costos legado** (`src/lib/finance/pricing/costing-engine.ts:94-345`): `role_rate_cards`, `member_capacity_economics`, y `product_catalog.default_unit_price` usado como costo.

### 2.3 Qué se congela y qué se recalcula

| Elemento | Se congela cuando | Se recalcula cuando |
| --- | --- | --- |
| Precio unitario, costo unitario, procedencia del costo, entrada del motor por línea | en cada guardado (`pricing_input`, `cost_breakdown`, `unit_cost`, `unit_price`) | en cada edición, en cada `PUT` (recalcular es el valor por defecto, `[id]/route.ts:492`), en `/recalculate`, en el worker de re-precio |
| Objetivo y piso de margen | en el primer guardado: los valores resueltos se escriben en la cabecera (`quotation-pricing-orchestrator.ts:481-482, 517-518`) y de ahí en adelante se leen como `quotation_override` (`quotation-issue-command.ts:163-174`) | solo si quien llama manda valores nuevos |
| Foto de impuesto | en cada guardado (`tax_snapshot_frozen_at = NOW()`) | en cada guardado |
| Foto de tipo de cambio del documento | al emitir (`quotation-issuance.ts:78-92`) | al resolverse la aprobación (`approval-steps-store.ts:344-411`) |
| Foto de versión | al crear (`createVersion: true`, `submit-quote-from-builder.ts:487`) y al pedir «nueva versión» | **no** al editar (`createVersion: false`, `:829`) |
| Nada se recalcula al leer | — | los lectores devuelven las columnas guardadas |

### 2.4 Control de margen y piso

Solo al emitir: `checkDiscountHealth` sobre los totales guardados en la cabecera. Se pide aprobación solo si `health.requiresApproval`, es decir, solo ante la alerta `margin_below_floor` (`margin-health.ts:45-53, 91`; `quotation-issue-command.ts:193`). El cumplimiento de nivel de la etapa A es solo visual: ningún camino del servidor lee `structuredWarnings` (solo lo referencian `pricing-engine-v2.ts`, `pricing-output-redaction.ts`, `currency-converter.ts`, `contracts.ts`).

---

## 3. Hallazgos, por severidad

Severidad original: **A** = bloquea o condiciona un reemplazo · **B** = hoy cuesta dinero o confianza · **C** = deuda.

### A — restricciones que un reemplazo no puede ignorar

**F-01 (A, verificado). La cotización de registro la produce la etapa B, no el motor.** Aguas abajo nadie ve `PricingEngineOutputV2`: ven `quantity × unitPrice` re-totalizado por `computeLineItemTotals`. Un motor nuevo que devuelva totales, periodos, repartos o un precio todo incluido no tiene dónde ponerlos a menos que cambien también la etapa B y la forma de la línea. Evidencia: `quote-builder-line-items.ts:249-318`, `quotation-pricing-orchestrator.ts:291-342, 400-425`.

**F-02 (A, verificado). Contrato guardado del que dependen los consumidores.** Cabecera: `total_cost`, `total_price_before_discount`, `total_discount`, `total_price`, `effective_margin_pct` (porcentaje), `target_margin_pct`, `margin_floor_pct`, `mrr`, `arr`, `tcv`, `acv`, `revenue_type`, `subtotal`, `total_amount`, `total_amount_clp`, `exchange_rate_to_clp`, `pricing_context`, columnas de impuesto (`quotation-pricing-orchestrator.ts:472-505`). Línea: `quantity`, `unit`, `unit_cost`, `unit_price`, `subtotal_cost`, `subtotal_price`, `discount_*`, `subtotal_after_discount`, `effective_margin_pct`, `recurrence_type`, `currency`, `pricing_input`, `cost_breakdown`, columnas de impuesto (`:568-616`). Lectores de esas columnas exactas: carga de HubSpot (`hubspot-quote-sync.ts:359-381, 398-425`), vista pública y PDF (`load-quote-for-public-view.ts`, `pdf/contracts.ts`), cierre a factura (`materialize-invoice-from-quotation.ts:105-108, 193-194`), aprobación (`quotation-issue-command.ts:94-98, 156-191`), proyecciones de embudo y rentabilidad.

**F-03 (A, verificado). Tres puertas de escritura aceptan precios de quien llama; solo una recalcula en el servidor.** `/author` re-simula. `POST /api/finance/quotes` (`route.ts:522-560`) y `POST /api/finance/quotes/[id]/lines` (`[id]/lines/route.ts:226-265`) pasan los `lineItems` de la solicitud —incluidos `unitPrice`, `manualUnitCost` y `resolvedCostBreakdown`— directo a `persistQuotationPricing`, que confía en ellos (`quotation-pricing-orchestrator.ts:292-301`). Cambiar el motor detrás de `/author` no las cubre.

**F-04 (A, verificado). El token público está atado al total guardado.** Token = HMAC(`quotationId:version:hash(total, moneda, cantidad de líneas)`), truncado a 32 caracteres hexadecimales (`src/lib/finance/pdf/qr-verification.ts:42-55, 114-123`; `load-quote-for-public-view.ts:191-212`, la comprobación del token va antes que cualquier otra rama). El total usado es el neto de la cabecera más el impuesto de la foto. Cualquier recálculo que mueva el total un centavo —basta otra regla de redondeo— invalida todos los enlaces compartidos y los QR impresos de esa versión. Como el total es el de la cabecera (versión vigente), los enlaces a una versión anterior dejan de validar en cuanto el total de la nueva difiere; la rama «hay una versión más nueva» queda entonces inalcanzable.

**F-05 (A, verificado). El modelo de monedas está partido.** Salida del motor: 6 monedas (`contracts.ts:202`). Tipo guardado: 3 (`contracts.ts:10`), puenteado con conversiones de tipo (`submit-quote-from-builder.ts:402-404`). La repetición solo funciona para CLP / USD / CLF (`quotation-pricing-orchestrator.ts:849-853`); una cotización en COP / MXN / PEN no puede re-preciarla el worker (`strictReplay` lanza error, `:855-859`). El impuesto es solo chileno; `total_amount_clp` siempre es derivado.

**F-06 (A, verificado). Una tabla, tres orígenes.** `greenhouse_commercial.quotations` también guarda cotizaciones entrantes de HubSpot y de Nubox (`quotation-canonical-store.ts:963`, rutas de sincronización del ops-worker). No tienen `pricing_input`; un reemplazo no debe recalcularlas ni reinterpretarlas. El cierre a factura ya las trata aparte (`materialize-invoice-from-quotation.ts:198-236`).

**F-07 (A, verificado). Cinco sitios de llamada del motor y siete del comando de persistencia.** Motor: `pricing/simulate/route.ts:49`, `submit-quote-from-builder.ts:214`, `service-catalog-expand.ts:147`, `quotation-pricing-orchestrator.ts:864`, `simulate-quote-pricing.ts:67`. Persistir / recalcular: `quotes/route.ts:525`, `[id]/route.ts:493`, `[id]/recalculate/route.ts:48`, `[id]/lines/route.ts:226`, `submit-quote-from-builder.ts:462, 799`, `commercial-cost-worker/quote-reprice-bulk.ts:264`.

### B — hoy cuesta dinero o confianza

**F-08 (B, verificado por ejecución). Los meses se pierden al guardar una línea de rol o de persona.** El constructor deja `quantity = 1` y guarda los meses en `metadata.periods` (`QuoteLineItemsEditor.tsx:1287-1310`); el motor cobra `unidad × periods × quantity` (`pricing-engine-v2.ts:390-392`); la línea guardada es `quantity: line.quantity` con el precio unitario mensual (`quote-builder-line-items.ts:295-301`); la etapa B multiplica `quantity × unitPrice` (`line-item-totals.ts:39`). Corrida sintética: periods = 4, unidad 1000 → total del motor 4000, subtotal guardado 1000. Nada aguas abajo lee `periods` (búsqueda en el almacén canónico, compartir, PDF, HubSpot, gobierno y cierre a factura: sin coincidencias). Ningún test cubre un total guardado con `periods > 1`. El efecto sobre cotizaciones reales es **inferido** (no se contrastó con datos): el total que se ve al editar y el total guardado, enviado a HubSpot e impreso diferirían para cualquier línea con meses ≠ 1.

**F-09 (B, verificado por ejecución). Una cotización con margen negativo se emite sin aprobación.** `margin_below_zero` es una alerta `error` sin `requiredApproval` (`margin-health.ts:36-44`); el comando de emisión solo comprueba `health.requiresApproval` y nunca `health.blocking` (`quotation-issue-command.ts:193`). Corrida sintética: costo 1200, precio 1000 → `blocking: true, requiresApproval: false`; con 5 % de margen → `requiresApproval: true`. El peor caso se salta la compuerta que el caso leve activa.

**F-10 (B, verificado). Las políticas de aprobación por monto, por descuento y «siempre» no se alcanzan por sí solas.** `evaluateApproval` solo corre dentro de `requestApproval`, que solo se llama cuando el margen está bajo el piso (`quotation-issue-command.ts:193-215`; `approval-evaluator.ts:92-131`).

**F-11 (B, verificado). Quien cotiza controla el piso, el estado y el costo.**
(a) `targetMarginPct` / `marginFloorPct` se aceptan en la carga de autoría (`submit-quote-from-builder-schema.ts:78-79`) y en `PUT` (`[id]/route.ts:313-314`), y después se respetan como `quotation_override` al emitir.
(b) `PUT` acepta `status: 'issued'` (o `converted`) sin compuerta, sin control de tipo de cambio, sin fila de auditoría, sin `issued_at` y sin evento de emisión (`[id]/route.ts:216-222, 295-301`).
(c) `/lines` acepta un costo dado por quien llama, saltándose la capacidad `cost_override`, que es solo de finanzas (F-03).
(d) No hay regla de «quien hace no aprueba»: `decideApprovalStep` solo comprueba el rol (`approval-steps-store.ts:283-289`); nada compara a quien decide con `created_by` ni con quien pidió.
Todo esto es interno (grupo de rutas `commercial` / `finance`): es una brecha de control, no una exposición externa.

> **Corrección de la consolidación (rol `finance`).** Las políticas sembradas piden `required_role = 'finance'` (`migrations/20260417140553325_task-348-quotation-governance-runtime.sql:243-248`). `decideApprovalStep` compara ese valor con los códigos de rol del actor o con `efeonce_admin` (`approval-steps-store.ts:283-285`), y la ruta le pasa `tenant.roleCodes` (`[id]/approve/route.ts:142-146`). `finance` no es un código de rol (`src/config/role-codes.ts` define `finance_admin` y `finance_analyst`). Resultado: un paso «de Finanzas» solo lo puede decidir `efeonce_admin`. La interfaz ofrece decidir a `finance_admin` (`src/lib/finance/quotation-access.ts`, `canDecideFinanceQuotationApproval`), y el servidor lo rechazaría. Nunca se ejerció: `approval_steps` tiene 0 filas.

**F-12 (B, verificado por ejecución). Las líneas manuales se guardan sin costo e inflan el margen guardado.** En el motor una línea manual tiene costo = precio (margen 0, `pricing-engine-v2.ts:828-866`); al guardarla su costo es `null` (`quote-builder-line-items.ts:301`; `costing-engine.ts:100-112`) y cuenta como 0 en el total (`line-item-totals.ts:98`). Corrida sintética: una línea de rol a −20 % más una línea manual → margen de cotización guardado de 80 %. El control de piso usa la cifra guardada, así que una línea manual esconde a una línea que pierde.

**F-13 (B, verificado). Los documentos emitidos se pueden cambiar en sitio.** No hay control de estado en `runEditSave` (`submit-quote-from-builder.ts:564-855`), en `POST /lines`, en `PUT`, en `/recalculate` ni en `createNewVersion` (`versions-store.ts:152-180`). Ninguna de esas rutas comprueba tampoco el alcance por tenant (compara con `issue/route.ts:53-62`). `PUT` re-precia por defecto (`recalculatePricing !== false`, `[id]/route.ts:492`).

> **Corrección de la consolidación.** El informe original sumaba aquí que el filtro por defecto del worker de re-precio incluye `sent` y `approved`. Es más débil de lo dicho: esos estados no pueden existir (los prohíbe la base), y con el criterio `current_open_quotes` el worker solo alcanza `draft` y `pending_approval`; `issued` queda fuera. Lo que sí es cierto es que los otros dos criterios, `quote_ids` y `period_scope`, no filtran por estado (`quote-reprice-bulk.ts:45-63`), así que por ahí sí se puede re-preciar una emitida.

**F-14 (B, verificado). Dos callejones sin salida de aprobación.**
(a) Bajo el piso pero sin una política activa que calce → `requestApproval` no devuelve pasos y no cambia el estado (`approval-steps-store.ts:121-125`), pero el comando responde `newStatus: 'pending_approval'` (`quotation-issue-command.ts:230-243`). La cotización queda en `draft` y nunca podría emitirse mientras esté bajo el piso.
(b) Tras un rechazo, emitir otra vez la misma versión encuentra los pasos viejos, los devuelve y se salta la actualización de estado (`approval-steps-store.ts:128-139`), mientras informa `quotationStatusChanged: true` (`:229`). Una segunda ronda de aprobación sobre la misma versión es imposible; la cotización queda en `approval_rejected`.

> **Corrección de la consolidación.** El caso (a) es poco probable hoy: la política `margin_below_floor` está sembrada por migración y la base tiene 3 políticas con los mismos roles requeridos (que sean las sembradas es inferido). El caso (b) se mantiene tal cual.

**F-15 (B, verificado). El costo se puede leer desde la simulación.**
(a) La entrada de simulación acepta `overrideMarginPct` en líneas de rol y de persona (`simulate-input-schema.ts:26, 36`); con `0`, el precio es el costo cargado por los multiplicadores (`pricing-engine-v2.ts:66-92, 561-568`). Los carriles de plataforma `app` y `ecosystem` aceptan una entrada completa del motor (`simulate-quote-pricing.ts:118-142`), y el carril `ecosystem` no comprueba capacidad y atiende vínculos de tipo `client` (`ecosystem-quotation.ts:23-26, 47-74`). Una línea de persona acepta cualquier `memberId`. MCP y Nexa no están afectados: solo reciben un código de servicio.
(b) La redacción para `client` / `public` conserva `addons`, `suggestedVisibleAddons`, `totals.overheadUsd`, `exchangeRateUsed` y el `lineInput` de cada línea (identificador de colaborador, tipo de contratación, margen forzado) (`pricing-output-redaction.ts:80-108`, por `...output` y `...rest`).
(c) A los usuarios internos sin acceso al desglose de costos se les devuelve margen y precio, así que el costo queda a una resta.

**F-16 (B, verificado). Editar re-precia con la fecha de hoy.** La carga de autoría del constructor no lleva `quoteDate` (`QuoteBuilderShell.tsx:1821-1845`); el comando cae a hoy para la simulación (`submit-quote-from-builder.ts:198`) y después persiste con el `quote_date` guardado (`:784-805`). Los márgenes por nivel, los multiplicadores, el tipo de cambio y las fotos de costo tienen vigencia por fecha, así que la misma cotización puede cambiar de precio entre dos guardados sin que el usuario cambie nada.

> **Corrección de la consolidación.** El informe decía que la documentación funcional afirma lo contrario (`docs/documentation/finance/cotizador.md:249`). La documentación es correcta para la vista previa en pantalla, que sí usa la fecha original (`QuoteBuilderShell.tsx:963`). Lo que diverge es el recálculo del servidor al guardar. El efecto práctico es el mismo: lo que ves y lo que se guarda pueden diferir.

**F-17 (B, verificado). El margen mostrado no es el margen del precio cobrado, en líneas de rol que no están en USD.** El precio sale de la lista de precios de la moneda (`pricing-engine-v2.ts:402-426`); `effectiveMarginPct`, el cumplimiento de nivel y la clasificación agregada se calculan sobre el precio USD de costo más margen (`:430-439, 1249-1261`). Con entradas por defecto, el margen USD es igual al óptimo del nivel por construcción, así que el «cumplimiento de nivel» refleja sobre todo los multiplicadores, no el precio local. El margen guardado (etapa B) se calcula con el precio y el costo unitarios reales, así que las dos cifras que un usuario ve antes y después de guardar pueden discrepar.

**F-18 (B, verificado). Valores por defecto silenciosos que se vuelven precios.** Margen 0,35 cuando no hay política de nivel (`:365`) y siempre para personas (`:561`); recargo de herramienta de 15 % (`:719`); 160 horas (`:362`); modelo comercial o país desconocido → factor 1,00 (`:1060-1061`); tipo de cambio faltante → se conserva el monto en USD y solo se deja una nota (`:109-145`); `exchangeRateUsed` → `1` (`currency-converter.ts:189`); objetivo y piso 25 / 15 (`pricing-config-store.ts:17-18`). Se emiten avisos, pero ningún camino del servidor bloquea por ellos; solo la compuerta de tipo de cambio bloquea la emisión (`quotation-issue-command.ts:138-154`). La frase de la documentación «los críticos bloquean el envío» (`cotizador.md:396`) no se hace cumplir en el servidor.

**F-19 (B, verificado). Las versiones pierden datos y la foto no es confiable.** `createNewVersion` no copia `pricing_input`, las columnas de la foto de impuesto, `finance_line_item_id` ni `service_sku` (`versions-store.ts:224-279`), así que las líneas de catálogo de una versión nueva no tienen entrada del motor: no se pueden repetir y son candidatas al camino legado de tarifas. `snapshot_json` tiene dos formas (rica en `quotation-pricing-orchestrator.ts:400-425`, pobre en `versions-store.ts:281-289`). Las ediciones no refrescan la foto (`submit-quote-from-builder.ts:829`), así que la foto de versión guardada puede describir precios que ya no coinciden con las líneas.

**F-20 (B, verificado en código; efecto en runtime inferido). Los borradores se empujan a HubSpot como cotizaciones publicadas.** La proyección de salida se dispara con `created` y `updated` (`quotation-hubspot-outbound.ts:22-30`) y crea la cotización en HubSpot con `publishImmediately: true` y estado `APPROVAL_NOT_NEEDED` (`push-canonical-quote.ts:129-142`; `hubspot-quote-sync.ts:93, 445`). No hay flag en este camino.

> **Corrección de la consolidación.** La base registra 7 eventos de envío a HubSpot y 5 de fallo, y una cotización de origen `manual` (de prueba) con identificador de cotización de HubSpot. El camino sí corrió. Si quedó algo publicado en el CRM no se comprobó.

**F-21 (B, verificado). El enlace público no tiene control de estado y la aceptación no tiene efecto.** `loadPublicQuoteView` devuelve `ok` para cualquier estado; `recordQuoteAcceptance` acepta una cotización en borrador, expirada o rechazada y solo estampa columnas (`accept-quote.ts:59-91`); no hay límite de frecuencia en la ruta de aceptación. `alreadyAccepted` se deduce comparando nombres (`:101`), así que una segunda aceptación de alguien con el mismo nombre cuenta como la primera.

### C — deuda

**F-22 (C, verificado).** Crear no es atómico: la cabecera se inserta en una transacción y el precio en otra, compensado con un `DELETE` de mejor esfuerzo (`submit-quote-from-builder.ts:430-552`). El uso de la plantilla se registra antes de que exista la cabecera (`:390`).

**F-23 (C, verificado).** El comando soporta idempotencia (`:917-993`), pero el constructor nunca envía una llave (`QuoteBuilderShell.tsx:1821-1845`); la afirmación de la documentación sobre el doble clic (`cotizador.md:491-492`) solo vale para el punto de confirmación de Nexa.

**F-24 (C, verificado).** Número de cotización = `EO-QUO-YYYYMM-` + 6 caracteres al azar, sin reintento ante colisión; la ruta legada y `PUT` aceptan un número dado por quien llama (`quotes/route.ts:386`; `[id]/route.ts:293`).

> **Corrección de la consolidación.** No son dos copias del mismo generador: `submit-quote-from-builder.ts:93-100` usa los primeros 6 caracteres hexadecimales de un UUID, y `quotes/route.ts:217-223` usa `Math.random` en base 36. La base confirma que no hay restricción `UNIQUE` ni secuencia ([Anexo B §3.3](2026-10-12-cotizador-actual-anexo-b-base-de-datos.md)).

**F-25 (C, verificado).** Crear y editar discrepan sobre el contexto de repetición guardado: crear guarda `commercialModelCode` solo desde `pricingEngineCommercialModel` (`submit-quote-from-builder.ts:477-483`), mientras la simulación cae a `commercialModel` o a `'on_going'` (`:200-202`); editar sí aplica esa caída (`:817-825`).

**F-26 (C, verificado).** El motor de costos legado sigue siendo alcanzable para cualquier línea sin metadatos v2 (líneas sembradas por plantilla `submit-quote-from-builder.ts:445-458`, versiones clonadas, cotizaciones entrantes): `role_rate_cards` (obsoleta según su propio comentario, `pricing-config-store.ts:157-166`; 0 filas en la base) y el precio por defecto del producto usado como costo (`costing-engine.ts:279-336`).

**F-27 (C, verificado en la semilla; datos vivos inferidos).** Los recargos internos automáticos están muertos en la práctica: solo `EFO-008` es interno (`overhead-addons-seed.ts:335`) y ninguna regla lo resuelve (`addon-resolver.ts:45-85`). Las reglas de recargo están fijas en código por código de recargo, línea de negocio y moneda.

**F-28 (C, verificado).** `service_sku` en las líneas se lee (`hubspot-quote-sync.ts:376, 401`; `quotation-canonical-store.ts:485`), pero no existe quien lo escriba en `src` ni en `scripts`. La base lo confirma: la columna está vacía en todas las líneas.

**F-29 (C, verificado).** La señal de confiabilidad `commercial.quote.authored_without_command` solo cuenta cotizaciones manuales emitidas con cero líneas (`src/lib/reliability/queries/commercial-quote-authored-without-command.ts:25-36`); no detecta el uso de las puertas de escritura legadas.

**F-30 (C, verificado).** Manejo de errores: emitir y enviar deducen el código HTTP por subcadena de un mensaje en español (`issue/route.ts:15-29`); varias rutas responden prosa en inglés (`'Quotation not found'`, `'Invalid JSON payload.'`), contra el contrato canónico de errores del repositorio; `/recalculate`, `/versions` POST y `/lines` POST no envuelven el comando en `try/catch`; la alerta de outbox al guardar se traga (`quotation-pricing-orchestrator.ts:706-725`); el nombre del actor es `tenant.clientName || tenant.userId` (`author/route.ts:61`).

**F-31 (C, verificado).** Duplicación: `buildResolvedCostBreakdown` dos veces (`quote-builder-line-items.ts:112-143`, `quotation-pricing-orchestrator.ts:89-120`); `isPricingEngineCommercialModel` tres veces; `/send` duplica a `/issue`; queda en el constructor una costura muerta `onSubmit` con cálculo de precio en el cliente (`QuoteBuilderShell.tsx:1753-1818`); `/api/finance/quotes/hubspot` responde 410.

**F-32 (C, verificado).** Tests: ninguno para `quotation-pricing-orchestrator` (persistir, recalcular, repetir), `quotation-issue-command`, `quotation-issuance`, `approval-steps-store`, `versions-store`, `costing-engine`, `currency-converter`, `load-quote-for-public-view`, `load-quote-for-pdf-internal`, `hubspot-quote-sync`, `quotation-line-cost-override-store`, `renewal-lifecycle`. Cubierto: motor v2, totales, salud de margen, impuesto, redacción, simulación, resolutor de recargos, el comando y la ruta de autoría, la construcción de líneas del constructor. Nada ejercita motor → total guardado de punta a punta, y por eso F-08 y F-12 son invisibles para la suite.

**F-33 (C, verificado).** El worker de re-precio masivo filtra por `sent` / `approved`, estados que el ciclo de vida actual ya no produce (termina en `issued`), y omite `issued` (`quote-reprice-bulk.ts:63`).

### Lo que está sólido

- El motor v2 es una sola función con dependencias inyectables (`pricing-engine-v2.ts:147-189, 975-982`), sin escrituras, con avisos estructurados y buena cobertura unitaria.
- El comando de autoría: contrato Zod, capacidad comprobada dentro del comando, re-precio en el servidor, precios de catálogo no modificables, idempotencia opcional (`submit-quote-from-builder.ts`, `-schema.ts`).
- Las líneas se reemplazan de forma atómica por versión (`quotation-pricing-orchestrator.ts:470-659`).
- Emisión: controles de estado explícitos, compuerta de tipo de cambio, foto de tipo de cambio, auditoría y eventos en una transacción (`quotation-issue-command.ts`, `quotation-issuance.ts`).
- Controles de alcance por tenant en emitir, enviar, aprobar y foto de tipo de cambio (`quotation-tenant-access.ts`).
- El token público está atado al contenido y el secreto debe tener al menos 32 caracteres (`qr-verification.ts:30-34`).
- La salida a HubSpot nunca envía campos de costo ni de margen (forma de la carga, `hubspot-quote-sync.ts:15-32`).
- Las herramientas de lectura de MCP y de Nexa solo aceptan un código de servicio, así que no pueden fabricar entradas del motor.

---

## 4. Qué está realmente conectado

| Flag o variable | Dónde se lee | Estado documentado (`docs/operations/FEATURE_FLAG_STATE_LEDGER.md`) |
| --- | --- | --- |
| `NEXA_QUOTE_AUTHOR_ACTION_ENABLED` | `src/lib/nexa/flags.ts:73` | apagado en todos los ambientes (líneas 358, 481) |
| `NEXA_ACTION_RUNTIME_ENABLED` | `src/lib/nexa/flags.ts` | encendido en staging y producción (línea 474) |
| `COMMERCIAL_Q2C_CANONICAL_CLOSE_ENABLED` | `src/lib/commercial/quote-to-cash/flags.ts:12-13` | encendido en staging (2026-06-22) y en producción (2026-06-29, reverificado 2026-09-02) (líneas 360, 483). El propio registro advierte que se contradice sobre este flag (línea 14). |
| `COMMERCIAL_Q2C_CONTRACT_ONLY_ENABLED` | `flags.ts:20-21` | apagado en todas partes (línea 484) |
| `FINANCE_CLF_INCOME_PROJECTION_ENABLED` | cierre a factura | dos afirmaciones en el registro: encendido en el release del 2026-06-22 (línea 179) y «apagado / por defecto» en la tabla de pendientes (línea 355). No se resolvió aquí. |
| `GREENHOUSE_QUOTE_VERIFICATION_SECRET` | `qr-verification.ts:31` | no es un flag; sin él, los enlaces, el QR y la aceptación responden `no-secret` (503) |
| `GREENHOUSE_PDF_ENTERPRISE_THRESHOLD_CLP` | `src/lib/finance/pdf/flags.ts:21` | valor de ajuste con valor por defecto |
| `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL` (+ referencia al secreto del token) | `src/lib/integrations/hubspot-greenhouse-service.ts:576-594` | transporte a HubSpot; no hay flag de encendido |

Ningún flag controla: el constructor, el motor, `/author`, las puertas de escritura legadas, la proyección de salida a HubSpot, el camino público de compartir y aceptar, los carriles de simulación de plataforma, las herramientas MCP.

En vivo contra solo en código, hasta donde lo muestra el repositorio:

- **Conectado:** constructor → `/author`; simulación; emisión y aprobación; rutas de PDF, compartir y correo; vista pública y aceptación; proyección de salida a HubSpot (registrada, sin flag); sincronización entrante de HubSpot y de Nubox y el barrido de ciclo de vida en el ops-worker; cierre canónico a factura (flag encendido según el registro); `quote_price` de Nexa; `search_services` / `quote_price` de MCP; carriles de plataforma.
- **Solo en código o apagado:** `author_quote` de Nexa (flag apagado); estrategia `contract_only` del cierre (flag apagado); Pricing V3 (nada fuera de su propia carpeta importa `src/lib/finance/pricing-v3/**`; verificado por búsqueda).
- **No determinable desde el repositorio:** si el consumidor del outbox entrega hoy los eventos de cotización a HubSpot, si el re-precio masivo del `commercial-cost-worker` está programado, y los valores de ambiente.

Trabajo abierto sobre el mismo terreno: `docs/tasks/to-do/TASK-622` (aprobación multinivel), `TASK-628` (enmiendas), `TASK-623` (precios por nivel y volumen), `TASK-562` (seguimientos de impuesto), `TASK-552` (seguimientos multimoneda), `TASK-576` (contrato de publicación en HubSpot), `TASK-499` (pendientes del constructor); `docs/tasks/in-progress/TASK-1206` (cierre a factura), `TASK-1222` (reconciliación de cotizaciones de HubSpot), `TASK-2017` (economía de Pricing V3). El mapa de promoción de V3 (`docs/documentation/finance/cotizador-v3-promocion-canonica.md`) propone reemplazar el motor por debajo de las primitivas existentes y lista «equivalencia V2/V3» como paso 2; no menciona la etapa B, las puertas de escritura legadas, el token atado al total ni la pérdida de `periods`.

---

## 5. Costuras y restricciones para un reemplazo (sin diseño)

1. **Costura de cálculo — `buildPricingEngineOutputV2(input, deps)`** (`pricing-engine-v2.ts:975`). Cinco sitios de llamada (F-07). Contrato de entrada: `PricingEngineInputV2`. Contrato de salida: `PricingEngineOutputV2` (`contracts.ts:392-427`): por línea, `costStack`, `suggestedBillRate.{pricingBasis, unitPriceUsd, unitPriceOutputCurrency, totalBill*}`, `effectiveMarginPct` (fracción), `tierCompliance`, `resolutionNotes`; además `addons`, `suggestedVisibleAddons`, `totals`, `aggregateMargin`, `warnings`, `structuredWarnings`. La interfaz, el redactor (`pricing-output-redaction.ts`), la herramienta de Nexa y el expansor de servicios leen esta forma directamente.

2. **Costura de traducción de líneas — `buildPersistedQuoteLineItems`** (`quote-builder-line-items.ts:249`). El único lugar donde un resultado del motor se vuelve una línea guardada. Empareja líneas del motor con líneas del borrador por posición y por igualdad exacta del JSON de entrada (`:262-286`). Aquí se pierde `periods` (F-08) y se descarta el costo manual (F-12).

3. **Costura de persistencia — `persistQuotationPricing(input, options)`** (`quotation-pricing-orchestrator.ts:432`). Recibe `QuotationPricingInput` con `QuotationLineInput[]`; es dueña de totales, descuentos, salud, métricas de ingreso, impuesto, conversión a CLP, foto de versión y el evento de alerta de salud. Siete sitios de llamada (F-07). Todo lo que un motor nuevo quiera guardar tiene que pasar por aquí o reemplazarlo.

4. **Costura de repetición — `recalculateQuotationPricing`** (`:738`) y los `pricing_input` + `pricing_context` guardados (`:829-881`). Un motor nuevo necesita su propia entrada repetible guardada por cotización, y las cotizaciones viejas tienen que seguir repitiéndose con el motor viejo (o quedar congeladas). El mapa de promoción de V3 ya dice que «las cotizaciones previas conservan su versión de motor».

5. **Sobre de simulación — `simulateQuotePricing*` / `runQuoteSimulationFromBody`** (`simulate-quote-pricing.ts`) y `redactPricingOutputForProfile`. Los carriles de plataforma, Nexa y MCP dependen del sobre `{ pricing, estimate, service? }`.

6. **Comando de autoría — `submitQuoteFromBuilder`** y su carga Zod (`submit-quote-from-builder-schema.ts`): forma de la línea borrador `{label, lineType, unit, quantity, unitPrice, metadata{pricingV2LineType, sku, fteFraction, periods, employmentTypeCode, …}}`. La interfaz y Nexa envían esta forma.

7. **Conjunto de dependencias de catálogo y costo** (el objeto `deps`, `pricing-engine-v2.ts:147-167`): roles vendibles + compatibilidad de contratación + lista de precios por moneda, márgenes por nivel, multiplicadores comerciales, factores país, guía de horas por FTE, catálogo de herramientas, recargos, tres lectores de fotos de costo, tipo de cambio. La interfaz de administración del catálogo y `pricing-catalog-impact-analysis.ts` están construidas sobre las mismas tablas.

Qué se rompería, por consumidor, si cambian los totales o la forma de la línea:

- **Enlaces, QR y aceptación:** invalidación del token ante cualquier cambio de total (F-04).
- **HubSpot:** necesita al menos una línea; `quantity`, `unitPrice`, `discount`, `taxAmount`, `currency`, `recurrence_type` + `billing_frequency` de la cabecera (una línea recurrente con cobro único lanza `billing_frequency_missing`, `hubspot-quote-sync.ts:170`); un producto de HubSpot enlazado para las líneas de catálogo (`catalog_binding_missing`, `:404`); y una tasa de impuesto que calce con un grupo de impuesto de HubSpot.
- **PDF y página pública:** `RenderQuotationPdfInput`: línea `{label, description, quantity, unit, unitPrice, subtotalAfterDiscount}`, totales `{subtotal, totalDiscount, total, tax}`; sin noción de periodos, fases, puesta en marcha contra recurrente, ni precio todo incluido.
- **Aprobación:** márgenes en porcentaje en la cabecera y `subtotal_cost` / `subtotal_after_discount` por línea; piso y objetivo en porcentaje.
- **Cierre a factura e ingreso:** `total_price`, `total_amount_clp`, JSON de la foto de impuesto, estado `issued`.
- **Proyecciones de embudo, MRR-ARR y rentabilidad:** `mrr`, `arr`, `tcv`, `acv`, `revenue_type`, `total_cost`, `effective_margin_pct` y las cargas de los eventos de cotización (`quotation-events.ts`).
- **Worker de re-precio y `PUT`:** llaman a la repetición; una cotización cuya entrada guardada el motor activo no pueda leer falla con `strictReplay` o conserva en silencio los números viejos.
- **Desajuste de unidades:** los márgenes del motor son fracciones con 4 decimales, los guardados son porcentajes con 2; el dinero es punto flotante de 2 decimales en ambos, para todas las monedas.

---

## 6. No determinado por este frente

- Datos vivos: los resolvió en buena parte el [Anexo B](2026-10-12-cotizador-actual-anexo-b-base-de-datos.md) (no hay cotizaciones reales; el número no es único; las políticas existen; el catálogo es una sola semilla). Sigue sin medirse si alguna línea guardada tiene `periods ≠ 1`.
- Qué muestra el constructor como total después de guardar: lo cubre el [Anexo C](2026-10-12-cotizador-actual-anexo-c-interfaz.md) solo por lectura de código; no se guardó nada.
- Valores reales de flags y secretos por ambiente, y si la proyección de salida a HubSpot y el worker de re-precio corren en producción.
- Las plantillas de correo y su contrato de datos (`share/[shortCode]/send-email/route.ts`) no se leyeron a fondo; tampoco `terms-store.ts`, `templates-store.ts`, `sync-hubspot-quotes.ts` (entrante) ni `close-quote-to-cash.ts` más allá del manejo de estados.
- Los umbrales de `resolveFxReadiness` y las reglas de `evaluateQuotationFxReadinessGate` se tomaron como las describen quienes las llaman; no se auditaron.

---

## 7. Equivalencia con el documento principal

| Documento principal | Este anexo |
| --- | --- |
| C-01 | F-01 |
| C-02 | F-08 |
| C-03 | F-12 |
| C-04 | F-17 |
| C-05 | F-18 |
| C-06 | F-16 |
| C-07 | §2.1 (corrección sobre el costo de rol) + Anexo B §2.8 |
| C-08 | §2.1 (redondeo), §5 (desajuste de unidades) |
| C-09 | F-26, F-27 |
| G-01 | F-09 |
| G-02 | F-03, F-11 (a), (b), (c) |
| G-03 | F-13 |
| G-04 | F-10 |
| G-05 | F-11 (corrección sobre el rol `finance`) |
| G-06 | F-14 |
| G-07 | F-11 (d) |
| G-08 | F-15 |
| M-01 | F-06 |
| M-02 | F-19 |
| M-03 | F-24 |
| M-08 | F-05 |
| I-01 | F-20 |
| D-02 | F-21 |
| D-03 | F-04 |
| Sección 6 (restricciones) | F-02, F-03, F-04, F-06, F-07, §5 |
| Deuda no llevada al documento principal | F-22, F-23, F-25, F-28 a F-33 |
