# RESEARCH-005 — CPQ Gap Analysis & Hardening Plan

> **Tipo de documento:** Research brief (auditoria + roadmap)
> **Version:** 1.0
> **Creado:** 2026-04-24 por Julio + Claude
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

Ordenadas por ROI para modelo agency-LATAM actual:

| ID | Spec candidato | Gap | Esfuerzo | Por que primero |
|---|---|---|---|---|
| **P2.1** | TASK-619 — eSignature integration (DocuSign primero) | F3 | 2 sprints | Cierra loop quote-to-signed, elimina "lost in email" |
| **P2.2** | TASK-620 — Bundles + config rules engine (MVP) | F1 | 3 sprints | Permite vender "paquetes retainer + tools" sin hacks. Encaja en modelo agency (upsells). |
| **P2.3** | TASK-621 — Analytics dashboards (win/loss + velocity + discount) | F13 | 2 sprints | Usa BQ ya existente; multiplica visibilidad comercial |
| **P2.4** | TASK-622 — Multi-level approval con escalation matrix | F4 | 2 sprints | Prep para cuando equipo comercial crezca |
| **P2.5** | TASK-609 — AI quote draft (ya registrada, apunta a F5/F7) | F5 + F7 | 2-3 sprints | Reduce onboarding SDR; diferenciador premium |
| **P2.6** | TASK-623 — Tier/volume pricing en engine | F2 | 2 sprints | Necesario para retainers con descuento por commitment |
| **P2.7** | TASK-624 — Renewal management + co-term | F6 | 3 sprints | Critico cuando retainers >30% del libro |
| **P2.8** | TASK-625 — Multi-language doc (ES/EN primero) | F12 | 1 sprint | Habilita cuentas Globe internacionales |

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

### Bloque 3 — P2 por fases

- **Fase 1 (quote-to-cash completo):** TASK-619 (eSignature) + TASK-623 (tier pricing) + TASK-621 (analytics).
- **Fase 2 (bundles + config):** TASK-620 (bundles MVP) + TASK-609 (AI draft).
- **Fase 3 (subscription maturity):** TASK-624 (renewals) + TASK-622 (multi-approval).
- **Fase 4 (internacionalizacion):** TASK-625 (i18n).

### Bloque 4 — P3 + OP

Oportunistico — ir resolviendo mientras se ejecutan los bloques 1-3.

## Decisiones abiertas para validar

1. **Alcance eSignature**: DocuSign only o DocuSign + Adobe Sign? Costo vs coverage de clientes.
2. **Bundle model**: ¿replicar pattern Salesforce (productOptions + constraintRules) o modelo propio mas simple para agency (templates + line presets)?
3. **Renewal trigger**: ¿event-based (cron vs fecha_fin_contrato) o cliente-driven (boton en portal)?
4. **Tax engine**: construir motor propio extendiendo el de Chile IVA, o integrar Avalara cuando pasemos 3+ paises?
5. **Analytics stack**: dashboards dentro del portal (Next.js + BQ) o Metabase/Looker dedicado?

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
