# RESEARCH-005 — CPQ Gap Analysis & Hardening Plan

> **Tipo de documento:** Research brief (auditoria + roadmap)
> **Version:** 1.1
> **Creado:** 2026-04-24 por Julio + Claude
> **Actualizado:** 2026-04-24 — Delta 1.1 incorpora business context confirmado (renewal via service catalog, SaaS bundles, footprint LATAM) + hallazgo del service catalog como proto-bundle engine
> **Status:** Active
> **Alcance:** Modulo Cotizaciones + Product Catalog + HubSpot Sync
> **Documentacion tecnica relacionada:**
> - [GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md](../architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md)
> - [GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md](../architecture/GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md)
> - [catalogo-productos-fullsync.md](../documentation/admin-center/catalogo-productos-fullsync.md)
> - [cotizaciones-gobernanza.md](../documentation/finance/cotizaciones-gobernanza.md)

## Proposito

Auditoria end-to-end del pipeline Cotizaciones → Product Catalog → HubSpot Sync, contrastada contra el canon CPQ del mercado (Salesforce CPQ, HubSpot CPQ, Oracle CPQ, Conga, DealHub, PROS, Zuora). Produce un roadmap priorizado por impacto para cerrar gaps de robustez primero, luego gaps funcionales.

Esta investigacion surge del cierre del programa TASK-587 (Product Catalog Full-Fidelity HubSpot Sync) el 2026-04-24. Tras ejecutar el backfill + verificar 74 productos en HubSpot portal 48713323, se identificaron gaps residuales de varios tipos: algunos de datos (materializer), otros de arquitectura (race conditions), otros funcionales (bundles, eSignature).

## Metodo de la auditoria

1. **Mapeo exhaustivo** del codigo con agente Explore — inventario de 23 API routes quote + 4 handlers materializer + 9 rutas middleware Python + 5 projections reactivas.
2. **Muestreo live** contra portal HubSpot (48713323): `GET /crm/v3/properties/products/*` para validar opciones reales y `GET /crm/v3/objects/products?limit=100` para agregados post-backfill.
3. **Mapeo contra CPQ canonico** — 7 dimensiones (Product Catalog, Quote Config, Pricing, Document, CRM, Quote-to-Cash, Analytics).
4. **Clasificacion de hallazgos** en 3 categorias: **robustez** (data consistency), **funcional** (features vs mercado), **cosmeticos** (deuda tecnica sin impacto de negocio).

## Delta 2026-04-24 (v1.1) — Business Context Confirmado

Post-revision del service catalog con el owner del producto, se confirman 4 inputs que **cambian la priorizacion del plan**:

1. **Service Catalog es el vehiculo para bundles** — no se va a replicar Salesforce CPQ ni construir un motor de bundle desde cero. La tabla `greenhouse_commercial.service_modules` + `service_role_recipe` + `service_tool_recipe` ya es un **proto-bundle engine** (composite products: un service SKU contiene roles + tools con quantity + optional flag + pass-through flag). `expandServiceIntoQuoteLines()` ya expande servicios a multiples quote lines via `pricing-engine-v2`.
2. **Renewal es un must-have** con base actual ya funcional: `service_modules.default_duration_months` + `commercial_model='on_going'` ya persisten el concepto. Falta el schedule engine + co-term + amendment.
3. **SaaS bundles entran en roadmap** — requiere motor `pricingModel=volume|graduated` (hoy engine es `flat` only) + licencias con periodos recurrentes formales.
4. **LATAM multi-pais confirmado** — FX ya multi-moneda (6 codigos: CLP, USD, CLF, COP, MXN, PEN). Tax engine multi-pais sube en prioridad (hoy solo IVA Chile).

### Hallazgo — Service Catalog como proto-bundle

Revision de `src/lib/commercial/service-catalog-{store,expand,constraints}.ts`:

| Capability bundle CPQ | Estado service catalog | Gap |
|---|---|---|
| Parent container (bundle SKU) | ✅ `service_modules.service_sku` | — |
| Child components | ✅ `service_role_recipe` + `service_tool_recipe` | — |
| Quantity per component | ✅ `hours_per_period` + `quantity` | — |
| Optional flag | ✅ `is_optional` | — |
| Override at quote time | ✅ `ServiceLineOverride` en `expandServiceIntoQuoteLines()` (excluded, qty, hours) | — |
| Commercial model recurring | ✅ `commercial_model: on_going \| on_demand \| hybrid \| license_consulting` | — |
| Tier (1-4) | ✅ `tier` column | — |
| Duration | ✅ `default_duration_months` | — |
| Pass-through (reventa) | ✅ `pass_through` en tool recipe | — |
| Business line | ✅ `business_line_code` | — |
| **Nesting (bundle dentro de bundle)** | ❌ | Gap — service no referencia otro service |
| **Constraint rules entre components** | ❌ | Gap — no hay "si rol X, tool Y requerido" |
| **Bundle-level discount** | ⚠️ Hoy se aplica via `globalDiscount`, no por-bundle | Gap menor |
| **Sync a HubSpot como bundle** | ❌ `hubspot_bundle_type='none'` hardcoded | Gap — HS si soporta bundles |
| **Renewal schedule engine** | ❌ | Gap — `default_duration_months` persiste pero no hay cron/event que genere renewal quote |
| **Amendment / co-term** | ❌ | Gap |

**Conclusion:** no se construye "bundles desde cero"; se **extiende service_catalog** con: nesting, constraint rules, HubSpot bundle sync, renewal engine, amendment. Reduce esfuerzo 60-70% vs disenar desde cero y aprovecha tests existentes (`service-catalog-constraints.test.ts`, `service-catalog-expand.test.ts`).

### Confirmacion de decisiones abiertas

| Decision | Resolucion | Racional |
|---|---|---|
| Bundle model | **Extender service_catalog** (NO replicar Salesforce) | Proto-bundle ya existe; 70% del camino hecho |
| Renewal trigger | **Event-based + cliente-driven combinado** | Cron por `default_duration_months` expira + boton opcional en portal para adelantar |
| Tax engine | **Extender Chile IVA incrementalmente** a otros paises LATAM (Colombia IVA, Mexico IVA, Peru IGV) antes de Avalara | Cada pais LATAM tiene su enum tributario; Avalara solo cuando escales fuera de LATAM |
| Analytics stack | **In-portal Next.js + BQ** | Dashboards nativos aprovechan permisos del portal; sin overhead Metabase |
| eSignature | **DocuSign only en Fase 1** | Mayor cobertura LATAM; Adobe Sign si cliente enterprise lo pide |

Con estas decisiones cerradas, el plan pasa de "hipotetico" a "accionable" — las tasks P0/P1 arrancan sin blockers.

## Hallazgos principales

### A. Score Greenhouse vs CPQ canon (benchmark mercado)

| Dimension | Score (/10) | Observacion |
|---|---|---|
| Product Catalog | 6 | Falta bundles + tier pricing (engine es flat-only) |
| Quote Configuration | 5 | Falta guided selling + constraint-based config |
| Pricing & Discounting | 8 | Ventajoso: cost-plus + margin floor + FX snapshot |
| Document & Workflow | 6 | Falta eSignature + multi-level approval + i18n |
| CRM Integration | 9 | Drift detection es diferenciador unico |
| Quote-to-Cash | 6 | Falta renewal + rev rec + tax engine externo |
| Analytics | 4 | Gap amplio; no hay dashboards de win/loss o velocidad |
| **Global funcional** | **6.5/10** | Solido para agencia LATAM; gaps esperables |
| **Global arquitectonico** | **7/10** | Moderno (event-driven + projections); con 3 bugs de race condition |

### B. Ventajas unicas de Greenhouse sobre el mercado CPQ

1. **Cost-plus + margin floor como first-class del engine** — Salesforce CPQ lo trata como addon; Greenhouse lo tiene en core.
2. **FX snapshot inmutable per quote** — pocos CPQ lo hacen (Zuora lo hace para subscriptions).
3. **Drift detection bidireccional contra CRM** — nadie lo hace en el mercado. Filosofia mainstream es "CPQ es master, CRM es viewer"; Greenhouse reconoce que HubSpot es CRM canonico y GH es SoT comercial.
4. **Event-driven reactive projections** — el mercado hace ETL batch; pattern comparable a Shopify/Stripe.
5. **Materializer de source catalogs** (sellable_roles, tools, overheads, services → product_catalog) — unico para modelo agency (team-as-product).
6. **IVA explicito con buckets tributarios** (recuperable vs no recuperable) — mas transparente que apoyarse 100% en Avalara.

### C. Gaps criticos (robustez — afectan data consistency)

Estos son **anteriores** a cualquier gap funcional. El mercado CPQ los resolvio hace 10+ anios.

| # | Issue | Severidad | Lugar | Por que es critico |
|---|---|---|---|---|
| R1 | Race condition en quotation repricing | **Critico** | `POST /api/finance/quotes` + `/recalculate` | Dos requests paralelos crean versiones duplicadas (no hay row lock ni unique constraint en `version_number`). Salesforce usa optimistic locking; GH no. |
| R2 | Quote → HubSpot orphaning post-create | **Critico** | `src/lib/hubspot/create-hubspot-quote.ts` | Si `persistHubSpotQuoteState` falla post-API-call, la HS quote existe pero GH no sabe su ID. Sin idempotency key validado en retry, genera duplicados en HS. |
| R3 | Partial line item sync sin rollback | **Critico** | `syncQuoteLineItems()` en `sync-hubspot-quotes.ts` | Si sync de una quote OK pero 1 lineitem falla, la quote HS queda parcial. Salesforce usa transactional bulk API. |
| R4 | Cost override sin idempotency | Alto | `/api/finance/quotes/[id]/lines/[lineItemId]/cost-override` | Double-POST crea registros duplicados. |
| R5 | Anti-ping-pong window 60s sin marca de origen | Moderado | `push-product-to-hubspot.ts:42` | Si GH push + HS edit coinciden en 60s, uno gana arbitrariamente. Mercado CPQ usa `last_modified_by_source_system` explicito. |
| R6 | Drift report bloat sin prune policy | Moderado | `source_sync_runs` | Reconcile semanal persiste para siempre; tabla crece sin limite. |

### D. Gaps funcionales vs mercado CPQ (features)

| # | Feature | Greenhouse | Mercado | Impacto agency |
|---|---|---|---|---|
| F1 | Bundles + configuration rules | ❌ (`bundleType='none'` hardcoded) | ✅ Salesforce CPQ core | Alto si vendes paquetes componibles (ej. "retainer + herramientas") |
| F2 | Tier/volume/graduated pricing | ❌ (engine flat-only) | ✅ Todos | Medio — relevante para retainers con descuento por volumen |
| F3 | eSignature (DocuSign/Adobe) | ❌ | ✅ Tabla de apuestas | Medio — hoy "sent" no rastrea firma |
| F4 | Multi-level approval con escalation | ❌ (single gate por monto) | ✅ Todos | Bajo a medio — por ahora governance basta |
| F5 | Guided selling wizard | ❌ | ✅ Salesforce/DealHub signature | Medio — reduce onboarding de SDRs nuevos |
| F6 | Renewal management (co-term, auto-renew) | ❌ | ✅ Salesforce Subscription | Alto si creces en retainers/SaaS recurrente |
| F7 | Cross-sell / upsell recomendaciones | ❌ | ✅ | Medio — combinable con TASK-609 (AI quote draft) |
| F8 | Price books por segmento/region | ❌ (un price book global) | ✅ Salesforce Price Books | Bajo hoy (FX cubre la mayoria del caso) |
| F9 | Revenue recognition schedule | ❌ | ✅ Zuora RevPro / Salesforce RevRec | Bajo hoy — contabilidad no lo pide |
| F10 | Tax engine externo (Avalara/Vertex) | ⚠️ Chile IVA hardcoded | ✅ 190+ paises | Bajo hoy (LATAM focus), alto si internacionalizas |
| F11 | Amendment / co-term quote | ❌ | ✅ | Bajo hoy |
| F12 | Multi-language doc | ❌ (solo ES) | ✅ | Bajo hoy, alto si Globe clients crecen |
| F13 | Analytics dashboards (win/loss, velocity, discount) | ⚠️ ad-hoc queries | ✅ Builtin | Medio — hoy se hace via BQ manual |

### E. Gaps cosmeticos / deuda tecnica (sin impacto negocio)

| # | Issue | Impacto | Fix |
|---|---|---|---|
| C1 | Duplicacion pricing logic frontend vs backend | Bajo | Consolidar `quote-builder-pricing.ts` como cliente de `/simulate` |
| C2 | Endpoint deprecated `/api/finance/quotes/hubspot` aun accesible | Bajo | Retornar 410 Gone o 301 redirect |
| C3 | `console.error` en lugar de Cloud Logging structured | Bajo | Migrar a logger estructurado |
| C4 | Tests ausentes en API routes (0/23) | Medio | Crear suite de integracion |
| C5 | Tests ausentes en materializer handlers (0/4) | Medio | Unit tests por handler |
| C6 | References hard-coded sin cache | Muy bajo | Agregar memoize simple |

### F. Gaps de datos que NO son codigo (operacion)

Estos son gaps del materializer TASK-546 que no son del scope de TASK-587. Registrados para awareness:

- `sellable_role.business_line_id` null (33 productos) — el source catalog `sellable_roles` no proyecta esta columna.
- `tool.business_line_id` mezclado case (Globe/globe) — inconsistencia de data histórica; parcialmente mitigado por `normalizeBusinessLineCode()` en outbound.
- `commercial_owner_member_id` null (74/74 productos) — requiere asignacion humana via admin UI o default por source_kind.
- `hs_tax_category` null (todos) — requiere habilitar Taxation add-on en HubSpot portal.

## Plan de hardening priorizado

### Criterio de priorizacion

Ordenado por **Impacto × Urgencia / Esfuerzo**:

- **P0 — Unblocker**: afecta data consistency hoy; corrupcion silenciosa o duplicacion en prod. Fix < 2 sesiones.
- **P1 — Robustez estructural**: no hay data corruption hoy pero la probabilidad crece con volumen. Fix 1-3 sesiones.
- **P2 — Funcional relevante**: gap de feature que mercado tiene; habilita nuevo modelo de negocio o reduce friccion operativa. Fix 1-4 sprints.
- **P3 — Polish / deuda**: no bloquea nada; mejora mantenibilidad.

### P0 — Cerrar race conditions antes de escalar volumen

Impacto: datos consistentes hoy. Urgencia: cada duplicado/orfano en prod es debt que crece.

| ID | Spec candidato | Gap | Esfuerzo | Dependencias |
|---|---|---|---|---|
| **P0.1** | TASK-611 — Quote repricing optimistic locking | R1 | 1 sesion | Migration: UNIQUE (`quotation_id`, `version_number`); select `FOR UPDATE` en `/recalculate` |
| **P0.2** | TASK-612 — HubSpot quote idempotency key enforcement | R2 | 1 sesion | Agregar `gh_idempotency_key` validation en `create-hubspot-quote` + check dedup pre-POST |
| **P0.3** | TASK-613 — Quote line items transactional sync | R3 | 1-2 sesiones | Envolver `syncQuoteLineItems` en bulk PATCH transactional o retry granular con telemetry |

### P1 — Robustez estructural (preventiva)

Impacto: previene clase de bugs con volumen. Sin urgencia hoy pero acumula debt.

| ID | Spec candidato | Gap | Esfuerzo |
|---|---|---|---|
| **P1.1** | TASK-614 — Cost override idempotency + conflict detection | R4 | 0.5 sesion |
| **P1.2** | TASK-615 — Anti-ping-pong con `last_modified_by_source_system` | R5 | 1 sesion |
| **P1.3** | TASK-616 — Drift report prune policy (retention 90 dias + archive) | R6 | 0.5 sesion |
| **P1.4** | TASK-617 — API routes integration tests (top-10 rutas criticas) | C4 | 2-3 sesiones |
| **P1.5** | TASK-618 — Structured logging migration | C3 | 1 sesion |

### P2 — Funcionales priorizadas por impacto agency

Re-priorizadas post-Delta v1.1 con business context confirmado (renewal must-have, SaaS bundles, LATAM multi-pais). Ordenadas por ROI estrategico:

| ID | Spec candidato | Gap | Esfuerzo | Por que en este orden |
|---|---|---|---|---|
| **P2.1** | TASK-619 — eSignature DocuSign integration | F3 | 2 sprints | Cierra loop quote-to-signed, mejora cobranza. DocuSign cubre LATAM; Adobe queda opcional cuando un cliente enterprise lo requiera. |
| **P2.2** | TASK-623 — Tier/volume/graduated pricing en engine | F2 | 2 sprints | **Prerequisite para SaaS bundles + renewals maduros.** Hoy engine es flat-only, bloquea vender licencias con commitment discounts. |
| **P2.3** | TASK-620 — Service catalog como bundle CPQ (extension) | F1 | 2 sprints | **NO construir desde cero**: extender `service_modules` con (a) sync a HubSpot como bundle real (desbloquea `hubspot_bundle_type='open'`), (b) bundle-level discount, (c) constraint rules entre role+tool recipes. Aprovecha 70% del modelo ya implementado. |
| **P2.4** | TASK-624 — Renewal engine + co-term | F6 | 3 sprints | **Must-have confirmado.** Base ya existe (`default_duration_months` + `on_going` model). Requiere: cron que detecta expiracion, emite `commercial.service.renewal_due` event, genera renewal quote automatica con opcion de override. Co-term para agrupar renewals en un solo quote date. |
| **P2.5** | TASK-626 — Tax engine LATAM extendido (Colombia IVA + Mexico IVA + Peru IGV) | F10 | 2 sprints | **LATAM confirmado.** Extender buckets tributarios actuales (Chile IVA 19%) a los 4 paises de la matriz FX (CLP/COP/MXN/PEN). Mantener el motor propio; Avalara solo si escalas fuera de LATAM. |
| **P2.6** | TASK-625 — Multi-language doc (ES/EN) | F12 | 1 sprint | LATAM empuja ingles para accounts cross-border (Mexico + Colombia frecuentemente bilingues). |
| **P2.7** | TASK-609 — AI quote draft (ya registrada) | F5 + F7 | 2-3 sprints | Aprovecha bundles (P2.3) + renewal history (P2.4) como input al modelo — si se hace antes de P2.3/P2.4 el AI no tiene features ricas que aprender. |
| **P2.8** | TASK-621 — Analytics dashboards (win/loss + velocity + discount + renewal rate + MRR) | F13 | 2 sprints | Despues de P2.4 hay metricas de MRR/renewal rate que hoy no existen; vale mas hacerlo con data completa. |
| **P2.9** | TASK-622 — Multi-level approval con escalation | F4 | 2 sprints | Postergable: governance actual basta hasta que equipo comercial crezca 3x. |
| **P2.10** | TASK-627 — Service bundle nesting (service → service reference) | F1 ext | 1 sprint | Feature avanzada: permite super-bundles como "Retainer Premium = Retainer Base + Add-on Analytics". Despues de P2.3 estable. |
| **P2.11** | TASK-628 — Amendment / co-term quotes | F11 | 2 sprints | Co-term incluido en P2.4; amendment pura (modificar contrato vigente) puede esperar. |

### P3 — Polish / deuda tecnica

| ID | Spec candidato | Gap | Esfuerzo |
|---|---|---|---|
| P3.1 | Consolidar pricing logic frontend/backend | C1 | 1 sesion |
| P3.2 | Deprecated endpoint → 410 Gone | C2 | <1 hora |
| P3.3 | Materializer handler unit tests | C5 | 1 sesion |
| P3.4 | Cache en `getProductCategoryByCode` | C6 | <1 hora |

### Gaps de datos (operacion, no codigo)

Registrados para ejecucion humana cuando corresponda:

- **OP.1** — Enriquecer materializer TASK-546: proyectar `business_line_id` desde `sellable_roles` al `product_catalog`. SQL migration + update handler.
- **OP.2** — Asignar `commercial_owner_member_id` a los 74 productos (manual via admin UI o default por source_kind).
- **OP.3** — Habilitar Taxation add-on en HubSpot portal 48713323 (si/cuando se justifique tax engine multi-pais).
- **OP.4** — Configurar field permissions HubSpot UI para rol operador (read-only de 21 fields — ver `hubspot-product-catalog-field-permissions.md`).

## Secuenciacion recomendada

### Bloque 1 — P0 (prioridad absoluta, ~1-2 semanas)

TASK-611, TASK-612, TASK-613 juntas — cierran los 3 gaps criticos de data consistency. Baratas, rapidas, previenen corrupcion silenciosa.

### Bloque 2 — P1 (~2-3 semanas)

TASK-614..618 en paralelo donde posible. Habilita escalamiento seguro de volumen.

### Bloque 3 — P2 por fases (actualizado v1.1)

- **Fase 1 — Ciclo comercial completo:** TASK-619 (eSignature) + TASK-623 (tier pricing engine).
- **Fase 2 — Bundles + Renewals (el corazon SaaS):** TASK-620 (service catalog como bundle CPQ) + TASK-624 (renewal engine + co-term). **Orden:** bundles primero, renewals despues, porque renewals necesitan bundles estables como unidad de renovacion.
- **Fase 3 — LATAM expansion:** TASK-626 (tax engine Colombia/Mexico/Peru) + TASK-625 (multi-language ES/EN).
- **Fase 4 — Intelligence + Analytics:** TASK-609 (AI quote draft con bundles + renewals como features) + TASK-621 (dashboards con MRR + renewal rate).
- **Fase 5 — Scale (diferibles):** TASK-622 (multi-level approval) + TASK-627 (bundle nesting) + TASK-628 (amendment).

### Bloque 4 — P3 + OP

Oportunistico — ir resolviendo mientras se ejecutan los bloques 1-3.

## Decisiones abiertas

Las 5 decisiones fundacionales se cerraron en la Delta v1.1 (ver tabla arriba). Quedan las siguientes decisiones de segundo orden:

1. **Nesting de bundles (service → service)**: ¿recursivo (N niveles) o limitado a 1 nivel? Limitacion 1 nivel simplifica pricing engine y previene ciclos infinitos; recursivo habilita super-bundles complejos pero agrega complejidad exponencial.
2. **Renewal notification lead time**: ¿30 / 60 / 90 dias antes del vencimiento emitir el event `commercial.service.renewal_due`? Depende de velocidad de aprobacion del cliente.
3. **Co-term policy**: ¿alinear todos los renewals a fecha comun por cliente (co-term estricto), o permitir varios vencimientos paralelos con opcion de agrupar manualmente? Salesforce soporta ambos; preferencia operativa.
4. **Bundle-level discount vs line-level**: ¿un bundle aplica descuento como unidad (ej. 15% off total del bundle) o los descuentos siguen siendo line-level agregados? Line-level es mas simple; bundle-level es mas intuitivo para upsell.
5. **Amendment vs re-quote**: ¿extender el quote vigente con un amendment (mantiene contrato original) o emitir un nuevo quote que supersede al anterior? Implicancias legales + contables.
6. **Tax engine LATAM per-pais**: ¿un sub-motor por pais (Colombia IVA, Mexico IVA, Peru IGV) o un motor generico parametrico? El generico escala mejor pero pierde matices locales (ej. retencion en Colombia).
7. **Constraint rules para bundles**: ¿DSL propio en DB (tabla `bundle_constraints` con operators AND/OR/NOT) o codigo TS declarativo? DB es mas flexible para admins; TS es mas testable.

## Criterio "ready for task"

Cada item pasa a `docs/tasks/to-do/TASK-###-...md` cuando:

- Spec tiene **gap claro** (causa raiz + comportamiento actual + comportamiento deseado).
- Spec tiene **acceptance criteria** testeable.
- Spec tiene **rollback plan** si el fix sale mal.
- Spec declara **archivos owned** para detectar impacto cruzado.
- Decisiones abiertas estan resueltas.

## Referencias

- Auditoria interna ejecutada 2026-04-24 con Explore agent (mapeo codigo) + muestreo live portal HubSpot 48713323.
- Contraste CPQ mercado: Salesforce CPQ docs, HubSpot CPQ features, Zuora RevPro, DealHub CPQ, Conga CPQ.
- Backfill report: [backfill-product-catalog-hs-v2-20260424.md](../operations/backfill-product-catalog-hs-v2-20260424.md).
- Architecture context: [GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md](../architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md) v1.5.
