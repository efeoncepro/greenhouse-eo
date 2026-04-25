# RESEARCH-005 — CPQ Gap Analysis & Hardening Plan

> **Tipo de documento:** Research brief (auditoria + roadmap)
> **Version:** 1.9
> **Creado:** 2026-04-24 por Julio + Claude
> **Status:** Active (programa CPQ completo: Bloque 0 Domain Separation + A eSignature + B Rich Text + C Catalog + D Composer + E Cross-cutting; 6 capas no-ruptura + feature flag matrix + runway deprecacion documentado)
> **Alcance:** Modulo Cotizaciones + Product Catalog + HubSpot Sync + Sellable Catalog Unification + Commercial Domain Separation

**Actualizaciones:**

- v1.1 (2026-04-24): incorpora business context confirmado (renewal via service catalog, SaaS bundles, footprint LATAM) + hallazgo del service catalog como proto-bundle engine
- v1.2 (2026-04-24): incorpora PDF enterprise spec + product descriptions rich HTML + DocuSign integration + renewal periodicity variable confirmada + conceptos explicados (constraint rules DSL, nesting, co-term, amendment)
- v1.3 (2026-04-24): cierra las 7 decisiones operativas pendientes con racional robustez + escalabilidad documentado; refina alcance de TASK-619/620/624/626/629/630 con los acuerdos cerrados
- v1.4 (2026-04-24): decision PDF — single template con secciones condicionales (no multi-template explicito); refina TASK-629 con el contrato de secciones (always vs conditional) + reglas de activacion
- v1.5 (2026-04-24): **TASK-629 IMPLEMENTADA** — PDF enterprise rediseño live en develop. 8 secciones modulares + tokens DM Sans+Poppins + QR signed HMAC + sub-brand PNG pipeline + product_catalog JOIN + endpoint público de verificación + 33 tests unitarios. Render validado end-to-end (enterprise 84KB / compact 52KB). Único follow-up: setear `GREENHOUSE_QUOTE_VERIFICATION_SECRET` en Vercel prod (sin esto el QR se omite gracefully).
- v1.6 (2026-04-25): **TASK-619 re-scoped a ZapSign** — DocuSign descartado tras descubrir que ZapSign ya está integrado en prod (Master Agreements). ZapSign es LATAM-native (Brasilera), 5–10x más barato/envelope que DocuSign, soporta WhatsApp + email automático nativo, y ya tiene cliente API + webhook handler funcionando en repo. Capa `eSignatureProvider` interface se mantiene para permitir DocuSign/Adobe Sign como secundarios si un cliente enterprise lo exige. Estimación TASK-619 baja de 2 sprints → ~5 días (solo orquestación + fields nuevos en `quotations` + UI; reusa [src/lib/integrations/zapsign/client.ts](../../src/lib/integrations/zapsign/client.ts) y [src/app/api/webhooks/zapsign/route.ts](../../src/app/api/webhooks/zapsign/route.ts)).
- v1.7 (2026-04-25): **TASK-619 expandida al camino largo (defense-in-depth + multi-domain reuse)** — Tras audit de gaps con owner se decide ir por la opcion mas resiliente, robusta y escalable. Se renuncia al short path (~6.5 dias) en favor de la cadena completa: TASK-489 (foundation documental) → TASK-490 (signature aggregate neutro con XState formal + provider interface real) → TASK-491 (ZapSign adapter con circuit breaker + dedup + DLQ) → TASK-619 (consumer del foundation, mucho mas liviano) + 3 tasks derivadas: TASK-619.1 (storage hardening: bucket separado + retention 10 anos + multi-region replica), TASK-619.2 (worker operacional: reconciliation 6h + expiry alerting + DLQ replay), TASK-619.3 (notificaciones: 3 reactores email/in-app/Slack independientes). Ganancia: HR contracts (TASK-027) reusa foundation gratis + compliance LATAM defendible legalmente + multi-provider real. Costo: estimacion total ~20 dias (~4 semanas) en vez de 6.5 dias short path.
- v1.8 (2026-04-25): **Bloques B + C + D agregados (rich text editor + sellable catalog unification + composer with native nesting + tool partner program). TASK-627 cancelada (absorbida en TASK-620.3).** Tras conversacion con owner sobre 2 temas pendientes (productos sin descripcion + composer de bundles), se decide: (B) TipTap editor reusable como `<GreenhouseRichTextEditor>` + backfill productos legacy + AI-assisted generator. (C) Sellable Catalog Unification: 4 dimensiones canonicas (sellable_roles ya existente + sellable_tools NUEVO + sellable_artifacts NUEVO con pricing hibrido + service_modules existente extendido con nesting). (D) Composer visual con nesting nativo desde dia 1 (depth max 3, cycle detection en trigger DB + UI), constraint rules tipadas con suggested fixes, picker unificado a 4 catalogos en quote builder, modal ad-hoc bundles persistentes con promote-to-catalog. Adicional: tool partner program (Adobe / Microsoft / HubSpot reseller tracking + commission accounting + HubSpot sync con product_type='tool_license'). Estimacion programa total: ~44 dias (~9 semanas con 1 dev). 11 tasks creadas/canceladas (TASK-620 + 620.1 + 620.1.1 + 620.2 + 620.3 + 620.4 + 620.5 + TASK-630 + 630.1 + 630.2; TASK-627 cancelada).
- v1.9 (2026-04-25): **Programa CPQ completo: Bloque 0 (Commercial Domain Separation EPIC-002 integrado) + Bloque E (cross-cutting hardening) + 14 gaps criticos cerrados + estrategia no-ruptura formalizada.** Tras pregunta del owner "como lo hacemos para que no rompa lo existente", se documenta: (1) Strangler Fig Pattern + 6 capas no-ruptura (schema aditivo, dual-namespace endpoints, sidebar feature-flagged, components con error boundary fallback, expand engine flat preservado, eventos outbox aditivos). (2) Feature Flag Matrix con 13 flags productivos (infra ya existe en `client_feature_flags`). (3) Runway de deprecacion 30-90 dias por elemento legacy. (4) Plan de rollback < 5 min por bloque. (5) Quote regression suite bloqueante en CI. (6) Bloque 0 (EPIC-002 TASK-554-557) integrado como prerequisite UX/access del programa CPQ con coordinacion de merge ordering documentada. (7) 14 gaps criticos resueltos: lifecycle/sunset catalog (TASK-620.7), soft delete unificado, HubSpot bidirectional signature sync (TASK-619.4), expand cache (TASK-620.3 amplificado), legacy quotes cleanup (TASK-557.1), cost guardrails per tenant (TASK-619.5), GDPR signer anonymization (TASK-619.5), audit timeline UI (TASK-628.1), i18n del programa (TASK-625 expandido), analytics CPQ (TASK-621 expandido), quote cloning (TASK-627.1 reusa ID liberado), HubSpot field mapping detallado (TASK-620.6), DR runbooks per provider, permission granularity hierarchy (TASK-622 expandido). (8) 7 tasks faltantes creadas (621/622/623/624/625/626/628). (9) 9 deseables Fase 2 documentados explicitamente. (10) 7 fuera-de-scope cross-referenced a sus programas correspondientes. **Estimacion programa total: ~90-92 dias (~18-19 semanas con 1 dev, ~9-10 semanas con 2 devs en paralelo).** 23 tasks nuevas reservadas en TASK_ID_REGISTRY.

**Documentacion tecnica relacionada:**

- [GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md](../architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md)
- [GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md](../architecture/GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md)
- [catalogo-productos-fullsync.md](../documentation/admin-center/catalogo-productos-fullsync.md)
- [cotizaciones-gobernanza.md](../documentation/finance/cotizaciones-gobernanza.md)

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
| eSignature | **ZapSign primary** (LATAM-native, ya integrado en prod) | DocuSign/Adobe Sign disponibles via `eSignatureProvider` interface si cliente enterprise lo exige. Ver Delta v1.6. |

Con estas decisiones cerradas, el plan pasa de "hipotetico" a "accionable" — las tasks P0/P1 arrancan sin blockers.

## Delta 2026-04-24 (v1.2) — PDF enterprise + product descriptions + DocuSign + conceptos

### a) Renewal periodicity confirmada

El campo `service_modules.default_duration_months` hoy persiste un integer. Se confirma que el rango operacional es **variable, con mínimo mensual**: mensual, bimensual, trimestral, semestral, anual. El engine debe soportar cualquier entero de meses (no solo los 5 tipicos — algunos retainers pueden ser de 4 o 9 meses).

**Modelado:** el campo actual ya soporta cualquier entero. No requiere cambio de schema. Lo que falta es:

- Una tabla de **periodicidades canonicas** con labels humanos (`mensual`, `bimensual`, `trimestral`, `semestral`, `anual`) que se muestre en UI como preset, con opcion "Personalizado" para valores arbitrarios.
- El renewal engine (TASK-624) usa directamente `default_duration_months` para calcular `next_renewal_date = start_date + INTERVAL N MONTH` sin asumir que la periodicidad es una de las 5 tipicas.

### b) Product descriptions rich HTML — estado actual vs gap

HubSpot ya soporta 2 fields nativos: `description` (text plain) + `hs_rich_text_description` (HTML). Mapping del estado real:

| Layer | `description` plain | `description_rich_html` | Status |
|---|---|---|---|
| HubSpot portal 48713323 | ✅ field existe | ✅ field existe | — |
| Greenhouse `product_catalog` schema | ✅ columna `description TEXT` | ✅ columna `description_rich_html TEXT` (TASK-603) | — |
| Adapter outbound GH→HS | ✅ emite `description` | ✅ emite sanitized HTML via `sanitizeProductDescriptionHtml` | — |
| Adapter inbound HS→GH (v2 rehydration) | ✅ | ✅ first-sync only | TASK-604 |
| Backfill 2026-04-24 | ✅ presente en los 74 products que tengan valor | ⚠️ presente pero la mayoria no tiene rich HTML cargado (operator no lo editó aún) | Populacion progresiva via admin UI |
| **Quote PDF rendering** | ⚠️ Linea del quote tiene su propio `description` operator-set, **no lee el del product_catalog** | ❌ **NO se renderiza en PDF** | **Gap del PDF, no de los datos** |
| Admin UI editor rich text | ⚠️ A validar — existe el campo pero hay que confirmar si el detail view usa un editor WYSIWYG (TipTap/Slate) o solo textarea | ⚠️ Mismo | Gap menor |

**Conclusion:** el contrato end-to-end funciona. El gap es que el **PDF no linkea line_item → product_id → product.description_rich_html** para enriquecer la linea con la descripcion canonica del catalogo. Fix trivial en `render-quotation-pdf.ts`.

### c) PDF enterprise — spec de rediseno

El PDF actual ([src/lib/finance/pdf/quotation-pdf-document.tsx](../../src/lib/finance/pdf/quotation-pdf-document.tsx)) es funcional pero no-enterprise. Principales problemas:

1. "Efeonce" es texto plano en Helvetica, no el logo real
2. Color primary `#0375DB` no es el canon (canon Efeonce: `#023c70` azul marino, con `#0375db` como accent)
3. Direccion del cliente aparece siempre `—`
4. No hay datos del emisor (RUT 77.357.182-1, direccion legal)
5. Sin pagina de portada ni sub-brand identification (Globe/Wave/Reach)
6. Footer minimal sin paginacion (N/M)
7. Sin signature block ni QR de verificacion online
8. Sin executive summary ni investment timeline
9. `product_catalog.description_rich_html` no se renderiza en el PDF
10. Bundles no visualmente agrupados (todas las lineas mezcladas)

**Spec PDF enterprise propuesta:**

```text
Pagina 1 — Cover
├─ Logo real (public/branding/logo-full.png, ~150x40px via <Image>)
├─ Sub-brand badge (isotipo globe/wave/reach segun business_line_code)
├─ Titulo: "Propuesta Comercial"
├─ Quote ID + version + fecha emision
├─ "Preparada para:" [Client name + organization]
├─ "Preparada por:" [sales rep name + email + phone]
├─ "Valida hasta:" [fecha]
└─ Footer cover: datos legales emisor

Pagina 2 — Executive Summary
├─ TL;DR: "Inversion total [TOTAL] [MONEDA]"
├─ "Duracion estimada: [duration_months] meses"
├─ "Modelo: [commercial_model label]"
├─ "Equipo asignado: [N roles seniors, N analysts]"
└─ Descripcion ejecutiva (< 400 palabras — desde quote.description)

Pagina 3+ — Scope of Work
├─ Para cada line item / bundle:
│   ├─ Nombre del producto/servicio
│   ├─ Rich HTML description del product_catalog (NEW — hoy no se renderiza)
│   ├─ Quantity + unit + recurrencia
│   └─ Componentes si es bundle (roles/tools listados con indent)
└─ Bundles visualmente agrupados con linea lateral accent color

Pagina N-2 — Commercial Proposal (tabla detalle)
├─ Tabla pricing idéntica a hoy + mejoras:
│   ├─ Agrupacion visual por bundle (subtotales)
│   ├─ Line-level IVA si aplica (hoy solo total)
│   └─ Alternate row background con surface color
└─ Pricing summary sidebar: Neto / IVA / Total

Pagina N-1 — Investment Timeline + Payment Terms
├─ Milestones visualizados en timeline horizontal
├─ "Mes 1: [amount]"
├─ "Mes 2-12: [amount recurrente]"
└─ Metodos de pago aceptados

Pagina N — Terms & Conditions + Signatures
├─ Terms block (existente, mejor formato)
├─ Signature block:
│   ├─ "Firma cliente" + area + "Nombre, cargo, fecha"
│   ├─ "Firma Efeonce Group" + area + "Nombre, cargo, fecha"
│   └─ QR code → link a version online verificable
└─ FX footer (existente)

Footer fijo todas las paginas
├─ "Efeonce Group SpA · RUT 77.357.182-1 · Santiago, Chile"
├─ "Propuesta [QUOTE-NUMBER] v[N] · Pagina N de M"
└─ "Confidencial · No distribuir sin autorizacion"
```

**Brand assets ya disponibles en el repo** (inventario via Explore agent):

- `public/branding/logo-full.png` — logo completo para PDF via `<Image>`
- `public/branding/SVG/isotipo-efeonce-negativo.svg` — isotipo
- Sub-brand variants: `globe-full.svg`, `wave-full.svg`, `reach-full.svg` (+ negativo variants)
- Colores canonicos: `#023c70` (Efeonce Digital navy), `#0375db` (accent), `#bb1954` (Globe), `#00BAD1` (Wave), `#ff6500` (Reach)
- Fuentes: DM Sans (body) + Poppins (headings) — via `Font.register()` en `@react-pdf/renderer`, requiere `.ttf` en `src/assets/fonts/`
- Emisor legal: **Efeonce Group SpA, RUT 77.357.182-1, Dr. Manuel Barros Borgoño 71 of 05, Providencia, Chile**

**Decisiones tecnicas a resolver:**

| Tema | Decision recomendada |
|---|---|
| Logo SVG vs PNG en PDF | PNG via `<Image>` (SVG en `@react-pdf/renderer` soporta limitado) |
| Rich HTML renderer | Whitelist `<p>`, `<strong>`, `<em>`, `<ul>`, `<li>`, `<br>` via parser custom → React-PDF `<Text>` jerarquicos |
| QR code | Libreria `qrcode` → PNG data URL → `<Image>` |
| Executive summary auto | Fallback al campo `description`; enriquecer con AI cuando TASK-609 este live |
| Sales rep info | De session `tenant.userId` → lookup `team_members` (name, email, phone) |

**Gap clasificado:** Este PDF redesign es un item **funcional-visibilidad**, no robustez. Alto impacto percibido (cada cliente ve el PDF) con esfuerzo medio (2 sprints). Encaja en **P2 Fase 1** junto con eSignature (ambos tocan el "momento de cierre").

### d) DocuSign integration — contexto

> **Superado por Delta v1.6 (2026-04-25):** DocuSign descartado en favor de ZapSign (LATAM-native, ya integrado en prod para Master Agreements). Esta sección se mantiene como referencia histórica del análisis original. Ver Delta v1.6 para el contexto actual.

DocuSign es el lider enterprise con ~70% market share. Para LATAM:

- **Integracion tecnica:** API REST + webhooks (`envelope.sent`, `envelope.signed`, `envelope.declined`, `envelope.voided`).
- **Flujo operacional:** quote emitida → POST a DocuSign → envelope con PDF + campos de firma → email al cliente → cliente firma → webhook → GH actualiza `quotation.signed_at` + `signed_by`.
- **Validez legal LATAM:** Chile (Ley 19.799), Colombia (Ley 527), Mexico (NOM-151), Peru (Ley 27269). Todas validas con eSignature no-certificada para contratos comerciales.
- **Costo:** ~$10-25 USD/envelope segun plan (Business Pro = $40 USD/user/mes + envelopes incluidos).
- **Alternativas:** Adobe Sign (enterprise mas caro), HelloSign (barato, menos trust), Signaturit (LATAM-nativo, mas barato), **ZapSign (LATAM-native, ya integrado — adoptado en v1.6)**.

**Recomendacion v1.2 (superada):** DocuSign only con capa de abstraccion `eSignatureProvider` (interface) para permitir swap a Adobe Sign sin rework cuando un cliente enterprise lo pida.
**Recomendacion vigente (v1.6):** ZapSign primary (ya integrado), capa `eSignatureProvider` se mantiene para DocuSign/Adobe Sign como secundarios on-demand.

**Fields nuevos en `quotations`:**

- `esignature_provider VARCHAR` (zapsign, docusign, adobe_sign)
- `esignature_envelope_id VARCHAR` (en ZapSign: `document_token`)
- `esignature_status ENUM(pending, sent, viewed, signed, declined, voided, expired)`
- `esignature_sent_at TIMESTAMP`
- `esignature_signed_at TIMESTAMP`
- `esignature_signed_by VARCHAR` (nombre del firmante)
- `esignature_signed_ip VARCHAR` (audit trail)

### e) Conceptos explicados (pedido explicito del owner)

#### Constraint rules DSL: DB vs TS declarativo

**Problema:** al construir bundles necesitas reglas de compatibilidad entre componentes:

- "Si agregas `senior-data-scientist` **debes** incluir `bigquery-license`"
- "`retainer-premium` **no puede** combinarse con `retainer-basic`"
- "Si `quantity > 10 horas/mes` de `strategy-director`, obligatorio agregar `project-manager`"

**Opcion A — DSL en DB:** tabla `bundle_constraints` con operadores (`AND`/`OR`/`REQUIRES`/`EXCLUDES`) que persiste. Admins editan sin deploy. Mas flexible, mas complejo de testear.

**Opcion B — TS declarativo:** reglas viven en TypeScript como funciones tipadas. Maximo type safety, cada cambio requiere deploy.

**Recomendacion Greenhouse:** TS declarativo en Fase 1 (mas robusto, menos bugs). Migrar a DB solo si los product managers piden autonomia real sin PR.

#### Nesting recursivo vs 1 nivel

**1 nivel:** Service A contiene roles + tools. Service B tambien. **No** puedes meter Service A dentro de Service B.

**Recursivo (N niveles):** "Retainer Premium" = "Retainer Base" + "Analytics Add-on", cada uno podria contener otros bundles.

**Riesgos del recursivo:**

1. Ciclos infinitos (A → B → A) requieren deteccion
2. Pricing engine se vuelve arbol profundo (mas CPU)
3. UX confuso al editar quote

**Recomendacion:** 1 nivel + campo `service.add_ons[]` para un paso extra sin recursividad. Cubre el caso "Retainer Premium = Base + Analytics" sin complejidad de arbol.

#### Co-term estricto vs paralelo-agrupable

Cliente con 3 servicios recurrentes:

- Service A: vence Mar 2027
- Service B: vence Jun 2027
- Service C: vence Sep 2027

**Co-term estricto:** al renovar uno, forzas alinear los 3 a la misma fecha (ej. todos a Mar 2028). Una sola fecha de renewal, un solo quote, un solo pago anual.

**Paralelo-agrupable:** cada servicio mantiene su fecha. Opcional: boton "Renovar todos juntos" genera quote combinado con prorrateo (adelantar B y C a Mar).

**Recomendacion:** paralelo-agrupable. Estricto genera friccion (clientes no quieren pagar 6 meses antes solo por alineacion).

#### Amendment vs re-quote

Cliente con retainer vigente pide cambios (ej. subir de 40 a 60 horas/mes):

**Amendment:** modifica contrato existente. Anexo "cambio nro 1" con fecha efectiva, delta, firma adicional. Contrato original sigue siendo unidad legal. Contabilidad: ajuste de revenue.

**Re-quote:** cotizacion nueva que **supersede** la anterior. Cancela contrato vigente + crea uno nuevo. Contabilidad: baja original + alta nuevo.

**Diferencia practica:** amendment mantiene continuidad legal (serial, auditoria, terminos heredados). Re-quote es mas simple operacionalmente pero pierde trazabilidad del cambio.

**Recomendacion LATAM:** soportar ambos. Amendment es lo estandar en contratos corporativos LATAM; re-quote como fallback cuando el cambio es tan grande que amerita renegociar todo.

### f) Impacto en priorizacion (update a la tabla P2)

Agregar 2 items al plan:

| ID | Spec candidato | Gap | Fase | Esfuerzo |
|---|---|---|---|---|
| **TASK-629** | PDF enterprise redesign (7 paginas + logo + sub-brand + signature block + QR verificacion + paginacion + datos emisor dinamicos + rich HTML descriptions rendering) | PDF generico | P2 Fase 1 (junto con eSignature) | 2 sprints |
| **TASK-630** | Rich text editor (TipTap) en admin UI product-catalog para poblar `description_rich_html` | Datos product | P2 Fase 1 | 1 sprint |

Y refinar el alcance de tasks ya planeadas:

- **TASK-620** (Service catalog como bundle CPQ) incluye explicitamente **constraint rules en TS declarativo** (Opcion B elegida) + **1 nivel de nesting** con `service.add_ons[]`.
- **TASK-624** (Renewal engine) incluye **paralelo-agrupable** (no co-term estricto) + soporta cualquier `default_duration_months` entero (no solo los 5 presets tipicos).
- **TASK-628** (Amendment) queda **NO diferible**: sube de Fase 5 a Fase 2 porque LATAM corporate lo espera.
- **TASK-619** (eSignature) — **re-scoped en v1.6 a ZapSign primary** (DocuSign descartado). Reusa cliente API + webhook handler ya productivos en repo. Capa `eSignatureProvider` interface se mantiene para DocuSign/Adobe Sign on-demand.

## Delta 2026-04-24 (v1.3) — 7 decisiones operativas cerradas con racional robustez+escalabilidad

Las 7 decisiones operativas que quedaban abiertas en v1.2 se cierran. Cada una tiene su racional documentado para que cualquier futuro cambio de criterio entienda el trade-off.

### Decision 1 — Renewal lead time → multi-valor cascada estandar (90 / 30 / 7 dias)

Emitir 3 events en cascada antes del vencimiento:

- **90 dias antes**: `commercial.service.renewal_due_advance` → CSM tiene tiempo para revisar valor entregado y negociar
- **30 dias antes**: `commercial.service.renewal_due_imminent` → genera renewal quote draft automatica
- **7 dias antes**: `commercial.service.renewal_due_critical` → escala a manager si no hay aceptacion

**Racional:** enterprise estandar (Salesforce/Zuora/Chargebee). Single-event te deja sin segunda oportunidad si el cliente no responde. Multi-tier permite procesos diferenciados (revision → quote → escalacion) sin construirlos despues.

**Modelado:** tabla `service_renewal_alerts` con `(service_module_id, alert_offset_days, event_type)`. **Configurable por tenant** para que algunos clientes premium tengan 120/60/14 si se justifica.

### Decision 2 — Discount levels → soportar los tres jerarquicamente

Soportar **line + bundle + global** con orden de aplicacion claro:

```text
precio_linea
  → -line_discount
  → subtotal_linea
  → suma_subtotales_bundle
  → -bundle_discount
  → subtotal_bundle
  → suma_bundles
  → -global_discount
  → total
```

**Racional:** bundle-level es lo que el operador comercial intuitivamente quiere ofrecer ("15% off al paquete completo"). Line-level es necesario para casos puntuales (descontar solo una herramienta cara). Negar uno de los dos corta UX: operador termina haciendo calculos mentales para "fingir" el descuento que no tiene.

**Robustez:** agregar tabla `bundle_discount_audit` registrando que descuento se aplico a que nivel + por quien. Sin esto el margin engine no puede explicar por que la cotizacion quedo debajo del floor.

### Decision 3 — Tax engine LATAM → generico parametrico con override per-pais

Motor base generico con interface `TaxRule(country, rate, scope, exemptions)` + sub-modulos por pais que sobreescriben **solo los matices**:

- Chile: usa el generico (IVA 19% directo)
- Colombia: extiende con retencion en la fuente
- Mexico: extiende con IEPS para ciertos productos
- Peru: usa el generico (IGV 18% directo)

**Racional:** sub-motor por pais desde dia 1 duplica logica que es 80% igual. Solo generico choca en 6 meses con el primer caso colombiano de retencion y refactorizas todo. **Plugin extensible** te da la base generica + extension points donde realmente importa.

**Escalabilidad:** el dia que llegues a Brasil (ICMS+PIS+COFINS+IPI, el mas complejo de LATAM), agregas un sub-modulo Brasil sin tocar los otros 4 paises.

### Decision 4 — Rich text editor → TipTap

**Racional vs alternativas:**

- **TipTap vs Lexical:** TipTap tiene 4 anios de madurez, comunidad React grande, ecosistema de extensions (mentions, slash commands, tables). Lexical es de Meta pero el ecosistema es chico, breaking changes frecuentes.
- **TipTap vs Slate:** Slate es low-level (te da las primitivas, construyes todo encima). TipTap viene con extensions production-ready out-of-the-box.
- **TipTap vs Quill:** Quill es legacy (Delta format propio, no extensible). TipTap output es HTML estandar — clave porque tu sanitizer ya espera HTML.

**Robustez extra:** TipTap output → tu `sanitizeProductDescriptionHtml` (TASK-603) → DB. La cadena ya esta armada, no hay que cambiar el sanitizer.

### Decision 5 — QR del PDF → publico con signed token

Ruta publica `/public/quote/[quotationId]/[versionNumber]/[signedToken]`. El token es HMAC del `quotationId+version+pdfHash+secret`.

**Racional:**

- **UX:** el cliente abre el QR desde su celular sin login. Autenticado requiere que el cliente sea usuario del portal — friction enorme.
- **Seguridad:** el signed token previene URL guessing. Solo quien tiene el PDF (con el QR) puede acceder.
- **Trazabilidad:** registras hits a esa URL → analytics de "el cliente abrio el quote N veces" → senial comercial valiosa.
- **Audit:** el token incluye el hash del PDF. Si el PDF fue alterado offline, el QR muestra "documento invalido" al validar.

**Escalabilidad:** el endpoint publico sirve para verificacion legal en disputa ("este quote es autentico, este no"). Salesforce/HubSpot CPQ lo hacen asi.

### Decision 6 — Sub-brand detection → mayoria de lineas con override en header

Logica en cascada al renderizar el PDF:

1. Si `quotation.business_line_code_override` esta set → usa ese (admin lo seteo manualmente)
2. Si no, mayoria de los `line_items.product.business_line_code` → usa esa BL
3. Si hay empate o todas null → usa `efeonce` (matriz)

**Racional:**

- **Header solo:** no captura quotes mixtas (cada vez mas comunes — "te vendo Globe + Wave en el mismo retainer").
- **Por linea solo:** confuso visualmente — que logo poner en el cover si hay 60% Globe y 40% Wave.
- **Mayoria con override:** respeta la realidad de las quotes mixtas pero da escape hatch al admin para forzar cuando el negocio dice "esta es Globe aunque tenga 1 linea Wave".

**Robustez:** persistir el resultado en `quotation.resolved_business_line_code` al issue para que el PDF siempre renderice consistente (no recalcule cada vez).

### Decision 7 — Legal entity → dinamico desde greenhouse_core.organizations

Query dinamico al render del PDF, con cache de 1 hora.

**Racional:**

- **Hardcoded** parece simple hoy pero es deuda futura: el dia que cambies de "Efeonce Group SpA" a "Efeonce Holding SpA" (M&A, restructuring), todos los quotes nuevos siguen mostrando el viejo nombre hasta que un dev haga deploy. Pesimo legalmente.
- **Dinamico** se autocorrige solo. Y permite multi-entity (operating_entity por pais: Efeonce Chile SpA, Efeonce Colombia SAS, Efeonce Mexico SAPI) cuando expandas LATAM.

**Robustez:** funcion `getOperatingEntityForCountry(country_code)` resuelve la entidad correcta basandose en el pais del cliente. Esto te prepara para que clientes mexicanos reciban factura desde Efeonce Mexico SAPI sin codigo nuevo.

### Resumen de impacto en estimados

Los acuerdos cerrados absorben scope a tasks ya planeadas:

| Task | Cambio de estimado | Motivo |
|---|---|---|
| TASK-624 (renewals) | +1 sprint | Multi-tier 90/30/7 + tabla `service_renewal_alerts` configurable |
| TASK-620 (bundles) | +0.5 sprint | `bundle_discount` + tabla `bundle_discount_audit` |
| TASK-626 (tax) | -1 sprint | Re-formateada como "engine generico + Chile plugin Fase 1"; otros paises entran on-demand |
| TASK-629 (PDF) | +0.5 sprint | Sub-brand resolver + legal entity dinamico + QR signed token |
| TASK-630 (rich text editor) | sin cambio | Especificamente TipTap |

Estimado total P2 Fase 1-2: **+1 sprint neto**.

## Delta 2026-04-24 (v1.4) — PDF: single template con secciones condicionales

### Decision: NO multi-template explicito

Se descarta el approach de tener 3 templates (`compact` / `standard` / `enterprise`) seleccionables manualmente o por reglas. En su lugar, **un solo template con secciones condicionales** que se activan basandose en si los datos existen.

**Racional:**

- **Una sola codebase a mantener** — no hay 3 layouts paralelos que pueden divergir.
- **Sin decision operativa** — el sales rep no elige template, el sistema decide segun la data.
- **Look-and-feel consistente** — el cover, branding, fonts, colores son siempre identicos. Solo varia cuantas secciones aparecen.
- **Validacion empirica primero** — empezamos con 1 template; si en 5-10 quotes reales se valida la necesidad de templates explicitos (ej. "para SaaS bundles necesito un layout diferente al de retainers"), se evoluciona a multi-template en una segunda iteracion. No se sobre-ingenieriza antes de validar.

### Contrato de secciones — always vs conditional

| Seccion | Renderizado | Trigger de activacion |
|---|---|---|
| **Cover** | ✅ Siempre | — |
| **Executive Summary** | ⚠️ Condicional | `quotation.description` tiene >= 200 caracteres O `total > $50M CLP equivalente` O tag `enterprise` |
| **About Efeonce / Sub-brand** | ⚠️ Condicional | `total > $50M CLP equivalente` O tag `enterprise` O cliente en su 1er quote |
| **Scope of Work** | ✅ Siempre | — |
| **Commercial Proposal (tabla)** | ✅ Siempre | — |
| **Investment Timeline** | ⚠️ Condicional | Existe alguna linea con `is_recurring=true` O hay milestones de pago definidos |
| **Terms & Conditions** | ✅ Siempre | — |
| **Signatures + QR** | ✅ Siempre | — |
| **Footer fijo** | ✅ Siempre (todas las paginas) | — |

**Comportamiento esperado:**

- Quote chica (1-3 lineas, < $5M, sin recurring, sin description): **2-3 paginas** (Cover + Scope + Commercial + Terms + Signatures, sin Executive Summary, sin About, sin Timeline).
- Quote estandar (3-10 lineas, retainer o bundle, $5-50M): **4-5 paginas** (agrega Investment Timeline si hay recurring; sin Executive Summary ni About).
- Quote enterprise (> 10 lineas, > $50M o tag enterprise): **6-7 paginas** (todas las secciones activas).

### Triggers detallados de activacion

```ts
interface QuotationPdfFlags {
  showExecutiveSummary: boolean
  showAboutEfeonce: boolean
  showInvestmentTimeline: boolean
}

const computePdfFlags = (quote: Quotation): QuotationPdfFlags => {
  const totalInClp = quote.totalCLP // pre-calculado en outbound
  const isEnterpriseTagged = quote.tags?.includes('enterprise') ?? false
  const isFirstQuoteForClient = quote.clientQuoteCount === 1
  const hasLongDescription = (quote.description?.length ?? 0) >= 200
  const hasRecurringLines = quote.lineItems.some(li => li.isRecurring)
  const hasPaymentMilestones = quote.paymentMilestones?.length > 0

  return {
    showExecutiveSummary: hasLongDescription || totalInClp > 50_000_000 || isEnterpriseTagged,
    showAboutEfeonce: totalInClp > 50_000_000 || isEnterpriseTagged || isFirstQuoteForClient,
    showInvestmentTimeline: hasRecurringLines || hasPaymentMilestones
  }
}
```

**Threshold $50M CLP** es ajustable via env var `GREENHOUSE_PDF_ENTERPRISE_THRESHOLD_CLP`. Permite calibrar segun feedback operativo sin deploy.

### Refinamiento TASK-629

Alcance final del rediseno PDF:

1. **Componentes React-PDF reutilizables**: cada seccion (Cover, ExecutiveSummary, ScopeOfWork, CommercialProposal, InvestmentTimeline, Terms, Signatures) es un componente independiente con su propia data shape.
2. **Orquestador**: `<QuotationPdfDocument>` lee los flags via `computePdfFlags()` y compone las secciones aplicables.
3. **Brand assets**: logo PNG via `<Image>`, fonts DM Sans + Poppins via `Font.register()`.
4. **Sub-brand resolver**: persistir `quotation.resolved_business_line_code` al issue (Decision 6 v1.3).
5. **Legal entity**: query dinamico a `greenhouse_core.organizations` con cache 1h (Decision 7 v1.3).
6. **QR**: signed HMAC token publico (Decision 5 v1.3).
7. **Rich HTML descriptions**: line items leen `product_catalog.description_rich_html` y lo renderizan via parser whitelist (`<p>`, `<strong>`, `<em>`, `<ul>`, `<li>`, `<br>`).
8. **Threshold configurable** via env var.

**Estimado mantenido:** 2 sprints (no cambia vs v1.3 — el modelo single-template con conditionals es comparable en esfuerzo a multi-template explicit, y no agrega ceremonia operativa).

### Migration path si en el futuro se necesita multi-template explicito

Si despues de validar con 5-10 quotes reales se descubre que SaaS bundles requieren un layout estructuralmente distinto (ej. "comparison table vs feature list" o "cover diferente"):

1. Agregar campo `quotation.pdf_template VARCHAR DEFAULT 'universal'`.
2. Crear archivo `quotation-pdf-template-saas.tsx` que reusa los mismos componentes pero los compone diferente.
3. El orquestador switch on `quote.pdf_template`.

Sin breaking change al template universal. La inversion en componentes reutilizables paga el rework futuro.

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
| F3 | eSignature (ZapSign/DocuSign/Adobe) | ⚠️ ZapSign integrado en MSA, pendiente cableo a quotes (TASK-619) | ✅ Tabla de apuestas | Medio — hoy "sent" no rastrea firma; ZapSign primary post v1.6 |
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
| **P2.1** | TASK-619 — eSignature ZapSign integration | F3 | **~5 días (revised v1.6)** | Cierra loop quote-to-signed, mejora cobranza. **ZapSign primary** (LATAM-native, ya integrado en prod para Master Agreements — reusa cliente API + webhook). DocuSign/Adobe Sign opcionales via `eSignatureProvider` interface si cliente enterprise lo exige. Estimación reducida de 2 sprints → ~5 días por reuso de integración existente. |
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

- **Fase 1 — Ciclo comercial completo:** TASK-619 (eSignature **ZapSign**, ~5 días por reuso) + TASK-623 (tier pricing engine).
- **Fase 2 — Bundles + Renewals (el corazon SaaS):** TASK-620 (service catalog como bundle CPQ) + TASK-624 (renewal engine + co-term). **Orden:** bundles primero, renewals despues, porque renewals necesitan bundles estables como unidad de renovacion.
- **Fase 3 — LATAM expansion:** TASK-626 (tax engine Colombia/Mexico/Peru) + TASK-625 (multi-language ES/EN).
- **Fase 4 — Intelligence + Analytics:** TASK-609 (AI quote draft con bundles + renewals como features) + TASK-621 (dashboards con MRR + renewal rate).
- **Fase 5 — Scale (diferibles):** TASK-622 (multi-level approval) + TASK-627 (bundle nesting) + TASK-628 (amendment).

### Bloque 4 — P3 + OP

Oportunistico — ir resolviendo mientras se ejecutan los bloques 1-3.

## Delta 2026-04-24 (v1.5) — TASK-629 PDF enterprise IMPLEMENTADA + deployada

TASK-629 (PDF redesign) fue implementada end-to-end y commiteada a develop en una sola sesion de iteracion intensiva. Es la primera task del backlog P2 que se cierra fuera del orden secuencial planeado, motivada por la urgencia operativa de tener un PDF enterprise para nuevas propuestas en curso.

### Entregas

| Categoria | Entrega |
|---|---|
| Mockup HTML (visual contract) | `docs/research/mockups/quote-pdf-cover-mockup.html` (cover) + `quote-pdf-full-mockup.html` (8 secciones a tamaño A4 real) |
| Sistema de tokens | `src/lib/finance/pdf/tokens.ts` (PdfColors + PdfFonts + PdfSpacing + PdfRadii + PdfPage + SUB_BRAND_ASSETS + DEFAULT_LEGAL_ENTITY) |
| Orquestador | `quotation-pdf-document.tsx` refactorizado de 510 líneas monolíticas a 194 líneas como composer |
| 8 secciones modulares | `sections/cover.tsx`, `executive-summary.tsx`, `about-efeonce.tsx`, `scope-of-work.tsx`, `commercial-proposal.tsx`, `investment-timeline.tsx`, `terms.tsx`, `signatures.tsx`, `shared.tsx` |
| Conditional rendering | `flags.ts` (computePdfFlags + computeSectionPageMap + computeTotalPages) — threshold ajustable via `GREENHOUSE_PDF_ENTERPRISE_THRESHOLD_CLP` |
| Fonts reales | DM Sans 400/500/700 + Poppins 500/600/700 (.ttf en `src/assets/fonts/`) + `register-fonts.ts` con lazy registration + cache singleton + tryRegister fallback |
| QR verificacion | `qr-verification.ts` con HMAC-SHA256 signed token + content-hash binding + falla cerrado sin secret + qrcode lib generando PNG real |
| Endpoint publico | `/public/quote/[quotationId]/[versionNumber]/[token]/page.tsx` valida el token recomputando hash desde DB; muestra "documento autentico" o "documento invalido" |
| Sub-brand assets | `scripts/build-pdf-brand-assets.ts` (sharp SVG→PNG pipeline) + 7 PNGs en `public/branding/pdf/` |
| Rich HTML rendering | `rich-html-renderer.tsx` parser whitelist (`<p>`, `<strong>`, `<em>`, `<ul>`, `<ol>`, `<li>`, `<br>`) → React-PDF Text/View jerarquicos |
| Product catalog JOIN | `route.ts` LEFT JOIN al `product_catalog` para `product_code` + `description_rich_html` por linea |
| Sales rep + legal entity dinamicos | Lookups best-effort en route.ts contra `team_members` y `greenhouse_core.organizations` |
| Validation script | `scripts/render-test-pdf.ts` renderiza enterprise (8 paginas, 84KB) + compact (5 paginas, 52KB) → `tmp/` |
| Tests | 33 specs nuevos: `flags.test.ts` (12) + `qr-verification.test.ts` (12) + `formatters.test.ts` (9) — 100% verde |

### Decisiones implementadas (de v1.1-v1.4)

- ✅ **D6 v1.3 sub-brand detection**: implementada via `subBrand` prop con default `efeonce` cuando no se proporciona
- ✅ **D7 v1.3 legal entity dinamica**: `route.ts` query a `greenhouse_core.organizations` con fallback a `DEFAULT_LEGAL_ENTITY`
- ✅ **D5 v1.3 QR signed token publico**: HMAC-SHA256 + endpoint publico que recomputa hash desde DB
- ✅ **D17 v1.4 single template**: implementado con conditional sections + 3 flags (Executive Summary, About Efeonce, Investment Timeline)
- ✅ **D2 v1.3 product descriptions rich HTML**: pipeline end-to-end (DB → adapter → PDF)
- ✅ **D4 v1.3 TipTap**: NO implementada (es admin UI editor — fuera del scope PDF; queda como TASK-630 separado)

### Validacion

- `npx tsc --noEmit` clean
- `pnpm lint` clean (2 warnings pre-existentes ajenos)
- `pnpm test` 2052/2054 passing (33 nuevos + 2019 pre-existentes; 2 skipped)
- `pnpm build` clean
- Render real validado: enterprise mode (Globe, USD 184,500) + compact mode (Wave, $4.76M CLP)
- Endpoint publico funciona: token valido → "documento autentico" / token alterado → "documento invalido"

### Follow-ups operativos (no codigo)

1. **Setear `GREENHOUSE_QUOTE_VERIFICATION_SECRET` en Vercel production** — generar con `openssl rand -hex 32`. Sin esta variable el PDF se renderiza identico pero sin QR (graceful degradation).
2. **Re-ejecutar `pnpm tsx scripts/build-pdf-brand-assets.ts`** cada vez que cambien los SVGs canonicos en `public/branding/SVG/`.
3. **Comunicar a sales reps** que la nueva propuesta usa el PDF enterprise (cambio visible para clientes — onboarding de 5 min).

### Tasks restantes del programa (sin tocar)

Las demas tasks de RESEARCH-005 (P0 race conditions, P1 robustez, resto de P2) siguen pendientes y mantienen su priorizacion original. TASK-629 se adelanto por urgencia operativa pero no cambia el orden recomendado del resto.

## Delta 2026-04-25 (v1.6) — TASK-619 re-scoped: ZapSign primary (DocuSign descartado)

### Hallazgo

Durante el cierre de TASK-631 Fase 4 (PDF email attachment + GCS asset cache), revision del repo descubrio que **ZapSign ya esta integrado en producion** para el flujo de Master Service Agreements (MSA). La integracion incluye:

| Pieza | Ubicacion | Estado |
|---|---|---|
| Cliente API (`createZapSignDocument`, `getZapSignDocument`, `isZapSignConfigured`) | [src/lib/integrations/zapsign/client.ts](../../src/lib/integrations/zapsign/client.ts) | ✅ Productivo |
| Webhook handler inbound (signed/refused/expired events) | [src/app/api/webhooks/zapsign/route.ts](../../src/app/api/webhooks/zapsign/route.ts) | ✅ Productivo |
| Uso en MSA signing | [src/app/api/finance/master-agreements/[id]/signature-requests/route.ts](../../src/app/api/finance/master-agreements/%5Bid%5D/signature-requests/route.ts) | ✅ Productivo |
| Env vars en Vercel (`ZAPSIGN_API_TOKEN_SECRET_REF`, `ZAPSIGN_WEBHOOK_SHARED_SECRET_SECRET_REF`, `ZAPSIGN_API_BASE_URL`) | Secret Manager + project config | ✅ Configurado |
| Tasks alineadas: TASK-490 (signature orchestration foundation), TASK-491 (zapsign-adapter convergence) | [docs/tasks/to-do/](../tasks/to-do/) | 📋 To-do |

### Decision

**TASK-619 (eSignature) cambia de DocuSign a ZapSign primary** por las siguientes razones:

1. **LATAM-native:** ZapSign es Brasilera, fuerte en CL/MX/CO/BR. Validez legal cubre las mismas leyes que DocuSign (Ley 19.799 CL, Ley 527 CO, NOM-151 MX, MP 2.200-2 BR).
2. **Costo:** Plan Business arranca ~$50 USD/mes con envelopes incluidos. DocuSign Business Pro = ~$40/user/mes + ~$10-25/envelope adicional. ZapSign es 5–10x mas barato por envelope a volumen agency.
3. **WhatsApp + email automatico nativo:** El cliente `ZapSignSignerInput` soporta `sendAutomaticWhatsapp` y `sendAutomaticWhatsappSignedFile` — diferenciador real en LATAM (DocuSign requiere integracion separada).
4. **Reuso 100%:** Cero trabajo de integracion para client + webhook + auth. DocuSign requeriria implementar todo desde cero (~2 sprints solo en plumbing).
5. **Capa `eSignatureProvider` se mantiene:** TASK-490 ya define la interface. ZapSign queda como primary, dejando puerta abierta a DocuSign/Adobe Sign cuando un cliente enterprise lo exija.

### Impacto en TASK-619

**Scope reducido:**

- ✅ Reusar [src/lib/integrations/zapsign/client.ts](../../src/lib/integrations/zapsign/client.ts) (no implementar nada nuevo)
- ✅ Extender [src/app/api/webhooks/zapsign/route.ts](../../src/app/api/webhooks/zapsign/route.ts) para emitir eventos `commercial.quote.signed` ademas de los eventos MSA actuales
- ✅ Agregar campos `esignature_*` a `quotations` (migracion node-pg-migrate)
- ✅ Endpoint nuevo `POST /api/finance/quotes/[id]/signature-requests` analogo al de master-agreements
- ✅ UI: boton "Enviar para firma" en `QuoteShareDrawer` + estados de firma en detail view

**Estimacion revisada:** 2 sprints → **~5 dias** (gracias al reuso de la integracion existente).

### Validez legal verificada

ZapSign cumple los mismos marcos legales que DocuSign para eSignature no-certificada:

| Pais | Marco legal | Cobertura ZapSign |
|---|---|---|
| Chile | Ley 19.799 (firma electronica simple) | ✅ |
| Colombia | Ley 527 / Decreto 2364 | ✅ |
| Mexico | Codigo de Comercio Art. 89-114 (NOM-151 para certificada, no requerida en B2B no-financiero) | ✅ |
| Peru | Ley 27269 + Reglamento DS 052-2008 | ✅ |
| Brasil | MP 2.200-2 (firma electronica simples) | ✅ nativo |

Para contratos comerciales B2B (caso 95% de Greenhouse) la firma simple ZapSign es legalmente vinculante en los 5 paises de la matriz LATAM.

### Tasks impactadas

- **TASK-619** (eSignature integration): scope re-orientado a ZapSign + reuso. Nueva estimacion **~6.5 dias** (subio de 5 a 6.5 al incluir modelo bilateral firmante/refrendario).
- **TASK-490** (signature orchestration foundation): sin cambios — la interface `eSignatureProvider` sigue siendo el contrato.
- **TASK-491** (zapsign-adapter webhook convergence): adelanta su valor — ahora es prerequisite explicito de TASK-619 (asegura que el webhook handler emita eventos consumibles por el quote flow).

### Modelo bilateral firmante / refrendario (refinamiento 2026-04-25)

Tras conversacion con owner, se refina el modelo de signers para reflejar la naturaleza bilateral de los contratos comerciales:

**Roles diferenciados:**

| Rol | Lado | Orden ZapSign | Cantidad | Naturaleza |
|---|---|---|---|---|
| `client_signer` | Cliente (Space) | `order_group=1` | 1–N (default: 1) | Compromete legalmente al cliente |
| `efeonce_countersigner` | Efeonce (Greenhouse) | `order_group=2` | 1–N (default: 1) | Refrenda y cierra el ciclo bilateral |
| `observer` | Cualquiera | (sin orden) | 0–N | Solo recibe copia, sin valor legal |

**Por que el orden importa legalmente:** primero firma cliente (acepta los terminos), despues refrenda Efeonce (confirma compromiso). Si Efeonce firmara primero, quedaria una propuesta unilateral abierta. ZapSign maneja esto con `signature_order_active=true` + `order_group` distintos.

**Politica de firma — 100% opcional + configurable per-version:**

Sales rep decide en cada version si esa version requiere firma. Casos contemplados:

| `signature_enabled` | `requires_client_signers` | `requires_efeonce_countersigners` | Caso de uso |
|---|---|---|---|
| `false` (default) | (ignorado) | (ignorado) | Iteracion exploratoria, draft, propuesta sin commitment |
| `true` | `true` | `true` | **Default cuando enabled** — version final, firma bilateral completa |
| `true` | `true` | `false` | Carta de aceptacion cliente (Efeonce solo recibe copia) |
| `true` | `false` | `true` | SLA addendum unilateral Efeonce |
| `true` | `false` | `false` | **Invalido** — bloqueado en validacion |

**Disponibilidad desde v1:**

El toggle `signature_enabled` esta disponible **desde la creacion de la quote v1**, no aparece "cuando llega la version final". Sales rep puede:

- Crear v1 con `signature_enabled=false` (exploratoria) y activar firma en v3 cuando la propuesta este lista.
- Crear v1 con `signature_enabled=true` (esperando aceptacion rapida) y desactivar en v2 si el cliente pide cambios mayores.

La politica se hereda al crear nueva version pero puede override-arse via body del endpoint.

**Schema final — politica vive en `quotations` (header de version vigente), snapshots en `quotation_versions.snapshot_json`:**

```sql
ALTER TABLE greenhouse_commercial.quotations
  -- Politica de firma (editable per-version)
  ADD COLUMN signature_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN signature_requires_client_signers boolean NOT NULL DEFAULT true,
  ADD COLUMN signature_requires_efeonce_countersigners boolean NOT NULL DEFAULT true,
  ADD COLUMN signature_min_client_signers int NOT NULL DEFAULT 1,
  ADD COLUMN signature_min_efeonce_countersigners int NOT NULL DEFAULT 1,
  ADD COLUMN signature_order_active boolean NOT NULL DEFAULT true,

  -- Estado runtime (provider-agnostic)
  ADD COLUMN esignature_provider text,
  ADD COLUMN esignature_document_token text,
  ADD COLUMN esignature_status text,    -- not_required, draft, pending_client, pending_countersign, signed, declined, voided, expired, cancelled
  ADD COLUMN esignature_sent_at timestamptz,
  ADD COLUMN esignature_completed_at timestamptz,
  ADD COLUMN esignature_signed_asset_id uuid;

CREATE TABLE greenhouse_commercial.quotation_signature_signers (
  signer_id uuid PRIMARY KEY,
  quotation_id text NOT NULL,
  version_number int NOT NULL,
  signer_role text NOT NULL,    -- client_signer, efeonce_countersigner, observer
  order_group int NOT NULL,
  full_name, email, phone_country, phone_number, qualification text,
  contact_id text,    -- bridge a HubSpot CRM (lado cliente)
  member_id text,     -- bridge a team_members (lado Efeonce)
  zapsign_signer_token text,
  status, signed_at, signed_ip, decline_reason
);
```

**State machine de firma:**

```text
not_required        (signature_enabled=false — estado por defecto)
draft               (signature_enabled=true, configurando signers en UI)
  → pending_client          (enviado a ZapSign, esperando firmantes cliente)
  → pending_countersign     (cliente firmo, esperando refrendarios Efeonce)
  → signed                  (todos firmaron, contrato perfecto)
  → declined / expired / voided / cancelled
```

**Eventos outbox emitidos:**

- `commercial.quote.signature_requested` (al enviar a ZapSign)
- `commercial.quote.signed_by_client` (todos los `client_signer` firmaron)
- `commercial.quote.countersigned_by_efeonce` (todos los `efeonce_countersigner` firmaron — contrato cerrado)
- `commercial.quote.signature_declined` (cualquier signer rechaza)

**Defaults inteligentes en UI:**

Al togglear "esta version requiere firma":

- **Pre-poblar firmantes cliente:** contactos HubSpot del `organization_id` con role `legal_signatory` o `decision_maker`. Empty list si no hay.
- **Pre-poblar refrendarios Efeonce:** sales rep que creo la quote (siempre). Mas mandatorios definidos en `business_line_signature_policy` si se crea esa tabla opcional.
- **Plazo default:** 30 dias desde envio.
- **Orden secuencial:** ON.

**Detalle completo de implementacion:** ver `docs/tasks/to-do/TASK-619-quote-esignature-zapsign.md`.

### Validacion

- ✅ Cliente ZapSign verificado en [src/lib/integrations/zapsign/client.ts](../../src/lib/integrations/zapsign/client.ts)
- ✅ Webhook handler verificado en [src/app/api/webhooks/zapsign/route.ts](../../src/app/api/webhooks/zapsign/route.ts)
- ✅ Patron de uso productivo verificado en [src/app/api/finance/master-agreements/[id]/signature-requests/route.ts](../../src/app/api/finance/master-agreements/%5Bid%5D/signature-requests/route.ts)
- ✅ Env vars confirmadas en Secret Manager via project config

### Follow-ups operativos (no codigo)

1. **Actualizar TASK-619 spec en `docs/tasks/`** cuando se cree (hoy aun no existe como `TASK-619-*.md` standalone — al crearla, reflejar este scope reducido).
2. **No requiere setup de cuenta nueva** — la cuenta ZapSign de produccion ya esta provisionada y funcionando para MSA.

## Decisiones abiertas

**Todas las decisiones del brief estan cerradas a partir de v1.3.** Los 3 bloques de decisiones se documentaron con racional para que cualquier futura iteracion entienda el trade-off:

| Bloque | # | Decision | Resolucion | Doc |
|---|---|---|---|---|
| Fundacional | 1 | Bundle model | Extender service_catalog (no replicar Salesforce) | Delta v1.1 |
| Fundacional | 2 | Renewal trigger | Event-based + cliente-driven combinado | Delta v1.1 |
| Fundacional | 3 | Tax engine | Extender Chile IVA a LATAM incrementalmente | Delta v1.1 |
| Fundacional | 4 | Analytics stack | In-portal Next.js + BQ | Delta v1.1 |
| Fundacional | 5 | eSignature | **ZapSign primary** (LATAM-native, ya integrado); DocuSign/Adobe Sign on-demand via `eSignatureProvider` interface | Delta v1.6 (super-seded v1.1) |
| Conceptual | 6 | Constraint rules DSL | TS declarativo Fase 1 | Delta v1.2 |
| Conceptual | 7 | Nesting | 1 nivel + `service.add_ons[]` | Delta v1.2 |
| Conceptual | 8 | Co-term | Paralelo-agrupable | Delta v1.2 |
| Conceptual | 9 | Amendment vs re-quote | Soportar ambos | Delta v1.2 |
| Operativa | 10 | Renewal lead time | Multi-valor 90/30/7 cascada | Delta v1.3 |
| Operativa | 11 | Discount levels | Line + bundle + global jerarquicos | Delta v1.3 |
| Operativa | 12 | Tax engine arquitectura | Generico + plugins per-pais | Delta v1.3 |
| Operativa | 13 | Rich text editor | TipTap | Delta v1.3 |
| Operativa | 14 | QR destino | Publico con signed token HMAC | Delta v1.3 |
| Operativa | 15 | Sub-brand detection | Mayoria lineas + override header | Delta v1.3 |
| Operativa | 16 | Legal entity | Dinamico desde organizations | Delta v1.3 |
| PDF | 17 | Multi-template vs single-template | Single template con secciones condicionales | Delta v1.4 |

**Total:** 17 decisiones cerradas, 0 abiertas. El brief esta listo para generar las TASK-### especificas cuando el owner lo apruebe.

Cualquier nueva decision que surja en la implementacion se documenta como Delta vN+1 a este mismo brief, no como ad-hoc en cada task.

## Criterio "ready for task"

Cada item pasa a `docs/tasks/to-do/TASK-###-...md` cuando:

- Spec tiene **gap claro** (causa raiz + comportamiento actual + comportamiento deseado).
- Spec tiene **acceptance criteria** testeable.
- Spec tiene **rollback plan** si el fix sale mal.
- Spec declara **archivos owned** para detectar impacto cruzado.
- Decisiones abiertas estan resueltas.

## Delta 2026-04-25 (v1.7) — TASK-619 expandida al camino largo (defense-in-depth + multi-domain reuse)

Tras audit profunda con owner, se identificaron 14 gaps no cubiertos por el spec v2 (modelo bilateral) en 5 dimensiones criticas: compliance & auditoria LATAM, integracion con flujos existentes (HubSpot/approval/income), casos limite operacionales, seguridad, y costos & UX delivery. Se decide ir por la opcion mas resiliente, robusta y escalable.

### Cambios estructurales vs v1.6

| Decision | v1.6 (short path) | v1.7 (long path) |
| --- | --- | --- |
| Camino | Replicar patron MSA en quotes directamente | TASK-489 → TASK-490 → TASK-491 → TASK-619 (foundation neutro primero) |
| State machine | Transiciones ad-hoc en TS | XState formal — invalidas rechazadas en compile-time |
| Webhook processing | Sincrono en handler | Async via outbox + reactive worker (DLQ + retry) |
| Provider abstraction | Interface minima | `eSignatureProvider` real desde dia 1, ZapSign como primera implementacion |
| Storage PDF firmado | Mismo bucket private-assets (DELETE 730d) | Bucket dedicado `signed-documents` + retention 10 anos + replicacion us-east4 → us-central1 |
| Hash integridad | No mencionado | SHA-256 + SHA-512 inmutables persistidos en evento outbox |
| Cross-flow gates | Solo Gate C (edicion bloqueada) | Gates A/B/C/D (approve previo + convert-income bloqueado + edicion + valid_until) |
| Auth mode por monto | No | Tabla `business_line_signature_policy.min_auth_mode_above_amount` |
| PII en logs | Risk no abordado | Logger custom sanitiza emails/IPs/nombres (hash SHA-256[:8]) |
| Notificaciones | "Eventos outbox emitidos" sin reactores | 3 reactores independientes (email + in-app + Slack) — failures aislados |
| Re-envio + edit signer | No | Endpoints PATCH + resend en MVP |
| Partial signed + expired | No | Estado `partial_signed_expired` + alerting 24h antes (TASK-619.2) |
| Void post-firma | Mencionado, sin detalle | Estado `voided_after_signature` + integracion con TASK-628 |
| Reconciliation | No | Worker cada 6h compara estado provider vs Greenhouse (TASK-619.2) |
| HubSpot sync | "signed → Closed Won" | Stage nuevo `Signed - Awaiting Invoice` (separa firma de facturacion) |
| Backup off-region | No | Replicacion cross-region GCS hourly (TASK-619.1) |

### Nueva cadena de tasks

| Task | Estado | Esfuerzo | Rol |
| --- | --- | --- | --- |
| **TASK-489** Document Registry & Versioning Foundation | to-do | ~3 dias | Foundation documental canonica |
| **TASK-490** Signature Orchestration Foundation | to-do | ~5 dias | Agregado neutro `signature_requests` + XState + provider interface |
| **TASK-491** ZapSign Adapter + Webhook Convergence | to-do | ~3 dias | Implementacion ZapSign del provider interface + circuit breaker + dedup + DLQ; refactor MSA al agregado neutro |
| **TASK-619** Quote eSignature (consumer) | to-do | ~4 dias | Consumer del foundation para quotes (politica per-version + UI + gates cross-flow) |
| **TASK-619.1** Signed PDF Storage Hardening | to-do | ~1.5 dias | Bucket dedicado `signed-documents` + retention 10 anos + multi-region |
| **TASK-619.2** Signature Operational Worker | to-do | ~2 dias | Reconciliation 6h + expiry alerting + DLQ replay sobre Cloud Run ops-worker |
| **TASK-619.3** Quote Signature Notifications | to-do | ~1.5 dias | 3 reactores independientes (email + in-app + Slack) |
| **TASK-027** HRIS Document Vault | to-do | (existente) | Consumer hermano del foundation — valida que el modelo es generalizable |
| **TASK-628** Quote Amendment Engine | to-do | (existente) | Consumer de quotes firmadas |

### Estimacion total

- **v1.6 short path:** ~6.5 dias (1 task TASK-619)
- **v1.7 long path:** ~20 dias (~4 semanas con 1 dev) — incluye foundation reutilizable

### ROI del long path

| Beneficio | Valor |
| --- | --- |
| HR contracts (TASK-027) reusa foundation | Ahorra ~5 dias futuros |
| Refactor MSA al agregado neutro (TASK-491) | Ya estaba planeado, esto lo absorbe |
| Compliance LATAM defendible legalmente | Evita riesgo en auditorias SII + disputas |
| Multi-provider real desde dia 1 | DocuSign/Adobe Sign en cliente enterprise = ~2 dias adapter, no ~2 sprints |
| Defense-in-depth storage | Evita perdida catastrofica de evidencia legal |
| State machine formal XState | Imposible introducir transiciones invalidas accidentalmente |
| Async webhook processing | Webhook handler responde < 100ms; processing pesado en worker con retry |
| Reconciliation periodica | Drift provider/Greenhouse detectado y auto-corregido sin intervencion humana |

### Tasks afectadas por refinamiento P2 ordering

La secuenciacion P2 Fase 1 cambia: ahora TASK-619 deja de ser standalone (~5-6.5 dias) y se vuelve la cuarta task de una cadena (~20 dias total). Eso modifica la priorizacion:

- Bloque preparatorio (TASK-489 + TASK-490 + TASK-491) puede ejecutarse en paralelo con otras tasks P0/P1
- TASK-619 no puede arrancar hasta que TASK-491 este complete (gate critico)
- TASK-619.1 / TASK-619.2 / TASK-619.3 pueden desarrollarse en paralelo a TASK-619 mismo (dependencias laterales, no secuenciales)

### Decisiones cerradas (24 total — extiende las 17 cerradas en v1.3)

Ver tabla completa en `docs/tasks/to-do/TASK-619-quote-esignature-zapsign.md` seccion "Decisions Cerradas".

## Delta 2026-04-25 (v1.8) — Bloques B + C + D + tool partner program (44 dias programa total)

Tras conversacion con owner sobre 2 temas pendientes que el plan actual no atacaba completamente:

1. **Productos sin descripcion + librerias para HubSpot sync** — gap real es que `descriptionRichHtml` es textarea pelado, nadie escribe HTML manual. TipTap esta instalado pero no se usa. 74 productos vacios.
2. **Composer de service bundles** — necesidad de soportar 4 patrones de venta (persona sola / herramienta sola / persona+herramienta / servicio empaquetado con artefactos + sub-servicios anidados). Modelo actual solo cubre el ultimo.

Y 6 decisiones tomadas con criterio robusto/escalable + 1 confirmacion explicita del owner sobre nesting.

### Bloque B — Rich text editor + descriptions

3 tasks creadas:

| Task | Alcance | Esfuerzo |
| --- | --- | --- |
| **TASK-630** | Componente `<GreenhouseRichTextEditor>` reusable con TipTap (instalado v3.14.0), 3 variantes toolbar (minimal/standard/extended), integrado en ProductCatalogDetailView reemplazando textarea | ~2 dias |
| **TASK-630.1** | Backfill operativo: para los 74 productos legacy, envolver `description` plano como `<p>{escaped}</p>` en `description_rich_html` para que PDF renderice algo | ~0.25 dia |
| **TASK-630.2** | AI-assisted generator: boton "Generar con AI" en toolbar extended que usa @google/genai (ya en repo), prompt template per-tipo (product/service/role/tool/artifact), credit tracking + rate limit | ~1.5 dias |

Total Bloque B: **~4 dias**.

### Bloque C — Sellable Catalog Unification

Modelo del catalogo extendido a **4 dimensiones canonicas**:

```text
Catalogo de "vendibles" canonico:
  ┌─────────────────────────────────────────────────────────┐
  │ 1. sellable_roles      → Senior Designer, Strategy Lead  │
  │ 2. sellable_tools      → Figma seat, Adobe CC seat       │
  │ 3. sellable_artifacts  → Brand book, Video manifesto     │
  │ 4. service_modules     → Bundle de los 3 anteriores      │
  └─────────────────────────────────────────────────────────┘
                                ↓
                    Quote line items materializados
```

4 tasks creadas:

| Task | Alcance | Esfuerzo |
| --- | --- | --- |
| **TASK-620** | Migracion atomica: tool_partners + sellable_tools + sellable_tool_pricing_currency + sellable_tool_pricing_tier + sellable_artifacts + sellable_artifact_pricing_currency + service_module_children + has_cycle function + trigger BEFORE INSERT/UPDATE + depth check 3. Seed 3 partners (Adobe/Microsoft/HubSpot). | ~2 dias |
| **TASK-620.1** | Refactor `service_tool_recipe.tool_id` -> FK a `sellable_tools` (en vez de `ai.tool_catalog` legacy). Backfill desde `ai.tool_catalog`. Pricing canonico + override opcional en recipe. Endpoints CRUD `/api/commercial/sellable-tools`. | ~2 dias |
| **TASK-620.1.1** | Tool Partner Program: snapshot attribution per quote line + reportes de comision per partner per periodo + reconciliation flow (gross vs neto) + HubSpot sync con `product_type='tool_license'` + dashboard PartnerRevenueDashboard. | ~1.5 dias |
| **TASK-620.2** | Artifacts Catalog: hibrido `is_priced_directly=true` (precio fijo standalone) o `false` (absorbido en horas). Service_artifact_recipe + endpoints CRUD + seed 8 artifacts canonicos. | ~1.5 dias |

Total Bloque C: **~7 dias** (sin tool partner) + 1.5 dias = **~8.5 dias** con partner program.

### Bloque D — Composer with Native Nesting

3 tasks creadas (TASK-627 absorbida en TASK-620.3):

| Task | Alcance | Esfuerzo |
| --- | --- | --- |
| **TASK-620.3** | `<ServiceModuleComposer>` visual con drag-and-drop tipo arbol, nesting nativo depth 3 + cycle detection UI/DB, constraint rules tipadas con `ConstraintScope` (within_service / within_subservice / cross_subservice / whole_tree / business_line), suggested fixes auto-applicables, override pricing pct per child sub-service, optional flag, override pricing per tool/artifact in recipe. Reusa `<GreenhouseRichTextEditor>` para descripcion. **ABSORBE TASK-627.** | ~4 dias |
| **TASK-620.4** | Quote Builder Direct Picker: autocomplete unificado en `QuoteLineItemsEditor` que busca en los 4 catalogos. Resultados agrupados por tipo. Selection -> snapshot pricing + partner attribution snapshot. Empty state con link a ad-hoc bundle. | ~2 dias |
| **TASK-620.5** | Ad-hoc Bundle Composer in Quote: modal inline reusa `<ServiceModuleComposer>` con `mode='ad-hoc'`. Persiste como service_modules con `is_ad_hoc=true, is_catalog_visible=false, originated_from_quotation_id, originated_by_user_id`. Promote-to-catalog flow valida metadata + cambia flags. Panel "Mis bundles ad-hoc". | ~3 dias |

Total Bloque D: **~9 dias**.

### Decisiones cerradas en v1.8 (29 total — extiende las 24 cerradas en v1.7)

Las nuevas 5 decisiones (con criterio robusto/escalable):

| # | Decision | Resolucion |
| --- | --- | --- |
| 25 | Servicios anidados (TASK-627) | **Absorbida en TASK-620.3** — composer construido nesting-ready desde dia 1 (depth max 3, cycle detection) en vez de feature posterior. Confirmacion explicita owner. |
| 26 | Pricing de tools: canonico vs embebido | **Canonico en sellable_tools + override opcional en recipe**. Cambio de precio Microsoft propaga a 30 services en 1 lugar. |
| 27 | Artifacts pricing model | **Hibrido confirmado por owner** — `is_priced_directly=true` (precio fijo: brand book $5K USD) o `false` (absorbido: 12 social posts en 32h del designer). Check constraint enforce. |
| 28 | Ad-hoc bundles | **Persisten + promovibles** (Trade-off A confirmado por owner). Tabla service_modules con flags is_ad_hoc / is_catalog_visible / originated_* / promoted_*. Picker excluye ad-hocs publicos pero muestra propios. |
| 29 | Tools partner program | **Adobe / Microsoft / HubSpot reseller tracking** confirmado por owner. Snapshot attribution per quote line + comision reports + HubSpot sync con `product_type='tool_license'`. Tabla `tool_partners` con commission_pct seed (Adobe 15%, MSFT 10%, HubSpot 20%). |

### Plan unificado v1.8

| Bloque | Tasks | Esfuerzo | Status |
| --- | --- | --- | --- |
| **A** eSignature long path | 489 → 490 → 491 → 619 + 619.1/2/3 | ~20 dias | Diseno cerrado v1.7 |
| **B** Rich text editor | 630 + 630.1 + 630.2 | ~4 dias | Diseno cerrado v1.8 |
| **C** Sellable catalog unification | 620 + 620.1 + 620.1.1 + 620.2 | ~8.5 dias | Diseno cerrado v1.8 |
| **D** Composer with native nesting | 620.3 + 620.4 + 620.5 | ~9 dias | Diseno cerrado v1.8 |
| ~~E Service nesting (cancelado)~~ | ~~TASK-627~~ | ~~0 dias~~ | **Absorbida en TASK-620.3** |

**Total programa: ~44 dias** (~9 semanas con 1 dev) — antes 46 dias planeados (con E separada), ahora 44 (con nesting in-baked).

### Recomendacion de orden de ejecucion

```text
Semana 1-2:  Bloque B (rich text editor) — desbloquea population de descriptions
             en paralelo: TASK-489 (foundation documental, no bloquea)

Semana 3-4:  Bloque C (sellable catalog unification + tools/artifacts/partners)
             en paralelo: TASK-490 (signature foundation)

Semana 5-6:  Bloque D (composer + ad-hoc + picker)
             en paralelo: TASK-491 (ZapSign adapter)

Semana 7-8:  Bloque A finishing (TASK-619 + 619.1/2/3)

Semana 9-10: Buffer + smoke E2E + documentation + training operadores
```

Bloques B+C+D y A son **independientes** — pueden ejecutarse en paralelo si hay 2 devs disponibles. Sinergia: Bloque B desbloquea TipTap usado en Bloque C+D (composer reusa GreenhouseRichTextEditor para descripciones).

### Tasks afectadas por re-priorizacion

- **TASK-620** (v1.6: "Service catalog como bundle CPQ", esfuerzo "2 sprints") — Reformateada completamente como **Sellable Catalog Unification + nesting schema**, esfuerzo ~2 dias para la migracion atomica (los otros componentes son tasks separadas)
- **TASK-627** (v1.1: "Service nesting" P2 fase 5 diferible) — **CANCELADA**, absorbida en TASK-620.3 nesting nativo dia 1
- **TASK-629** ya implementada en v1.5 — sin cambios; solo se beneficia indirectamente del rich html populate post Bloque B
- **TASK-628** (Amendment) — sigue pendiente, ahora gana dependencia explicita en `signed` quotes (TASK-619) + posibilidad de amendar service module composition (TASK-620.3)
- **TASK-624** (Renewal engine) — sigue pendiente, ahora consume composition de service modules con nesting

## Delta 2026-04-25 (v1.9) — Programa CPQ completo: Bloque 0 + Bloque E + 14 gaps + estrategia no-ruptura

Tras pregunta del owner "como lo hacemos para que no rompa lo existente" + audit de gaps faltantes (TASK-554-557 EPIC-002 + 14 gaps no cubiertos en v1.8), se cierra el programa CPQ end-to-end con criterio robusto/escalable + garantia de cero ruptura productiva.

### Estrategia de cero ruptura — 6 capas

| # | Capa | Regla |
| --- | --- | --- |
| 1 | **Schema (DB)** | Migraciones aditivas only en F1 (ADD COLUMN NULL, CREATE TABLE, CREATE INDEX CONCURRENTLY). Nunca renombrar columnas — agregar nueva, dual-write, deprecar vieja. NOT NULL constraints + DROP COLUMN solo en migracion separada post-runway 30+ dias |
| 2 | **Endpoints API** | Nunca borrar ni renombrar endpoints existentes. Nuevos endpoints `/api/commercial/*` se agregan en paralelo a `/api/finance/*`. Auth check OR durante runway: `userHasRouteGroup('commercial') OR userHasRouteGroup('finance')` |
| 3 | **UI Sidebar** | TASK-554 mueve items a seccion "Comercial" pero **paths `/finance/...` exactos**. Cero URL change. Bookmarks intactos. Feature flag `commercial_section_in_sidebar` con fallback al sidebar actual si flag falla |
| 4 | **Componentes UI** | Componentes nuevos (TipTap editor, picker, modal) son **aditivos**: botones nuevos al lado del flow actual. Error boundary que cae al componente legacy si el nuevo crashea. Feature flags por componente |
| 5 | **Engines / logica** | Expand engine reescrito para soportar nesting **pero caso flat preservado byte-perfect** (test exhaustivo). Pricing engine: snapshot inmutable en quote_line_items, cambios canonicos no afectan quotes historicas |
| 6 | **Eventos outbox** | Nunca cambiar shape de evento existente. Solo agregar campos opcionales o emitir eventos nuevos en paralelo. Reactores existentes siguen funcionando idénticos |

### Feature Flag Matrix (13 flags productivos — infra ya existe en `client_feature_flags`)

| Flag | Default prod | Activacion gradual | Owner task |
| --- | --- | --- | --- |
| `commercial_section_in_sidebar` | off → on dia 7 | 0% → 25% → 50% → 100% en 1 semana | TASK-554 |
| `commercial_routegroup_dual_namespace` | on inmediato | 100% (no destructivo) | TASK-555 |
| `commercial_framing_breadcrumbs` | off → on dia 14 | 100% post-validacion visual | TASK-556 |
| `pipeline_lane_commercial` | off → on dia 14 | 100% post-validacion | TASK-557 |
| `product_rich_text_editor_tiptap` | off → on dia 7 | 50% admin users → 100% | TASK-630 |
| `product_description_ai_generator` | off → on dia 7 | Internal users only → 100% | TASK-630.2 |
| `sellable_tools_standalone` | off → on dia 14 | 100% (read-only) → write enabled | TASK-620.1 |
| `tool_partner_attribution` | on inmediato | 100% (cero impacto user-facing) | TASK-620.1.1 |
| `service_composer_v2_with_nesting` | off → on dia 21 | 100% post-regression suite | TASK-620.3 |
| `quote_catalog_picker` | off → on dia 21 | 100% post-validacion | TASK-620.4 |
| `quote_adhoc_bundle_modal` | off → on dia 28 | 100% post-validacion | TASK-620.5 |
| `quote_signature_enabled` | off | Per-tenant opt-in inicial | TASK-619 |
| `quote_amendments_enabled` | off → on dia 35 | 100% post-firma adoption | TASK-628 |

**Rollback < 5 min** por bloque via feature flag toggle. Cero deploy requerido.

### Runway de deprecacion

| Cosa a deprecar | Cuando es seguro | Quien verifica |
| --- | --- | --- |
| Textarea actual del rich html | 0 errors en 30 dias + 100% productos editados con TipTap | Logs + Sentry |
| Endpoint `/api/finance/quotes/...` con solo `routeGroup: finance` | 0 requests via `finance` route group para esos paths en 90 dias | Cloud Logging |
| `ai.tool_catalog` referencia legacy | 0 reads en 90 dias | Logs |
| `tool_id` column en `service_tool_recipe` | 0 reads y `sellable_tool_id` NOT NULL en 30 dias | Logs + DB introspection |

### Quote Regression Suite (bloqueante en CI)

Suite nueva (creada en TASK-620 baseline) que re-calcula totales de 100 quotes historicas reales y compara byte-perfect pre vs post deploy. Si hay drift, merge bloqueado. Suite re-ejecuta antes de cada deploy del programa.

### Bloque 0 — Commercial Domain Separation (EPIC-002 integrado)

| Task | Alcance | Esfuerzo | Coordinacion |
| --- | --- | --- | --- |
| **TASK-554** Sidebar separation | Crea seccion "Comercial" en sidebar moviendo Quotes/Contracts/MSA/Productos. Paths `/finance/...` intactos. Feature flag `commercial_section_in_sidebar` | ~2 dias | Debe completar **antes** de Bloques B/C/D (sales reps encuentran las nuevas features bajo "Comercial" no "Finanzas") |
| **TASK-555** Access foundation | `routeGroup: commercial` + namespace `comercial.*` + compat `finanzas.*` legacy. Seed automatico que da `commercial` a todos los users con `finance` role (cero perdida de acceso) | ~3 dias | Debe completar **antes** de TASK-619/620.4/620.5 (nuevos endpoints usan `comercial.*` desde dia 1) |
| **TASK-556** Framing adoption | Breadcrumbs, guards, CTAs tratan quotes/contracts/MSA/products como Comercial. Paths legacy intactos | ~3 dias | **Riesgo merge conflict con TASK-619/620.4/620.5** — 556 va antes; specs CPQ rebase sobre la base ya migrada |
| **TASK-557** Pipeline lane extraction | Pipeline comercial deja de ser sub-tab de Finance Intelligence, gana entrypoint propio | ~2 dias | Independent (puede paralelizarse) |
| **TASK-557.1** Legacy quotes cleanup | Audit + flag `legacy_excluded` para quotes en estado limbo (legacy_status set, sin canonical record) que romperian las nuevas surfaces | ~1 dia | Bloquea TASK-556/557 (data clean prerequisito) |

**Bloque 0 total: ~11 dias.**

### Bloque E — Cross-cutting Hardening (NUEVO en v1.9)

Tasks que cierran los gaps cross-program detectados:

| Task | Alcance | Esfuerzo |
| --- | --- | --- |
| **TASK-619.4** HubSpot bidirectional signature sync | Stage `Signed - Awaiting Invoice` + outbound on signed event + inbound webhook con anti-ping-pong + conflict resolution | ~2 dias |
| **TASK-619.5** Cost guardrails + GDPR anonymization | Tabla `tenant_quotas` con limits envelopes/AI + reset cron + endpoint anonymize signers (right-to-be-forgotten) preservando PDF firmado | ~2 dias |
| **TASK-620.6** HubSpot field mapping extended | 15 custom properties HubSpot para sellable_tools/artifacts/nested service_modules + outbound v3 + inbound rehydration v2 | ~2 dias |
| **TASK-620.7** Catalog lifecycle + sunset | States `draft / active / sunset / archived` unificado en 4 catalogos + soft-delete + sunset notifications a sales reps con quotes vigentes impactadas | ~2 dias |
| **TASK-621** Commercial analytics dashboards | Sales metrics (win/loss + velocity + MRR + renewal rate) + Program adoption metrics (% rich html, composer adoption, quotes con firma, conversion, costo envelope) | ~3 dias |
| **TASK-622** Multi-level approval + permission hierarchy | 4 roles (sales_rep / account_lead / sales_lead / commercial_admin) + thresholds per business_line + workflow approval con escalation 48h SLA | ~3 dias |
| **TASK-623** Tier/volume/graduated pricing engine | `pricingModel: flat \| volume \| graduated` para sellable_tools + sellable_artifacts. Habilita commitment discounts SaaS reseller | ~3 dias |
| **TASK-624** Renewal engine + co-term + alerting | Cron 90/30/7 dias antes expiracion + auto-generate renewal draft + co-term grouping de multiples quotes mismo cliente | ~4 dias |
| **TASK-625** Multi-language i18n del programa CPQ | next-intl + ES/EN translations para PDF + composer + notifications + ZapSign envelope language per signer | ~3 dias |
| **TASK-626** Tax engine LATAM extendido | Engine generico + plugins CL (existing) + CO + MX + PE + BR spec-ready | ~3 dias |
| **TASK-627.1** Quote cloning + templating | Endpoint clone quote con override cliente/version/pricing + lineage tracking | ~1 dia |
| **TASK-628** Quote amendment engine | Amendments para quotes firmadas (anexo legal vs re-quote). Composition diff + delta visualization + opcional re-firma | ~3 dias |
| **TASK-628.1** Audit timeline UI | Timeline visible en QuoteDetailView con audit_log + outbox events + diff viewer entre versiones | ~1.5 dias |

**Bloque E total: ~32.5 dias.**

### Plan unificado v1.9 final

| Bloque | Tasks | Esfuerzo |
| --- | --- | --- |
| **0. Commercial Domain Separation** (NUEVO en v1.9) | 554 + 555 + 556 + 557 + 557.1 | ~11 dias |
| **A. eSignature long path** | 489 → 490 → 491 → 619 + 619.1/2/3 | ~20 dias |
| **B. Rich text editor** | 630 + 630.1 + 630.2 | ~4 dias |
| **C. Sellable catalog unification** | 620 + 620.1 + 620.1.1 + 620.2 | ~8.5 dias |
| **D. Composer with native nesting** | 620.3 + 620.4 + 620.5 | ~9 dias |
| **E. Cross-cutting hardening** (NUEVO en v1.9) | 619.4 + 619.5 + 620.6 + 620.7 + 621 + 622 + 623 + 624 + 625 + 626 + 627.1 + 628 + 628.1 | ~32.5 dias |

**Total programa CPQ v1.9: ~85 dias = ~17 semanas con 1 dev = ~9 semanas con 2 devs en paralelo.**

(Bloque 0 + A son paralelos independientes; B + C + D dependen de Bloque 0 access foundation pero independientes entre si; E mayoritariamente sequential despues de A/B/C/D)

### Plan de Rollback per Bloque

| Bloque | Rollback time | Como |
| --- | --- | --- |
| 0. Commercial Domain Separation | < 1 min | Toggle 4 feature flags (sidebar, framing, pipeline lane, dual namespace permanece) |
| A. eSignature | < 5 min | Flag `quote_signature_enabled=false` → quotes vuelven a state pre-firma; envelopes ZapSign existentes continuan via ZapSign UI directa |
| B. Rich text editor | < 1 min | Flag `product_rich_text_editor_tiptap=false` → vuelve textarea |
| C. Sellable catalog unification | Reversible si zero data | Drop tabla manteniendo `service_tool_recipe.tool_id` legacy intacto |
| D. Composer with native nesting | < 5 min | Flag `service_composer_v2_with_nesting=false` → vuelve admin UI legacy |
| E. Cross-cutting hardening | Por flag individual | Cada feature flag independientemente toggleable |

### 14 Gaps Criticos Cerrados en v1.9

1. **Lifecycle / sunset catalog** → TASK-620.7
2. **Soft delete unificado** → TASK-620.7 (parte del lifecycle)
3. **HubSpot bidirectional signature sync** → TASK-619.4
4. **Performance expand engine recursivo** → TASK-620.3 amplificado con cache (Slice extra)
5. **Migracion quotes legacy en limbo** → TASK-557.1
6. **Cost guardrails per tenant** → TASK-619.5
7. **GDPR signer anonymization** → TASK-619.5
8. **Audit trail visibility en UI** → TASK-628.1
9. **i18n del programa completo** → TASK-625
10. **Analytics CPQ + program adoption metrics** → TASK-621
11. **Quote cloning** → TASK-627.1
12. **HubSpot field mapping detallado** → TASK-620.6
13. **DR runbooks per provider** → TASK-619.2 amplificado
14. **Permission granularity hierarchy** → TASK-622

### Fase 2 (deseables, no bloqueantes — documentados explicitamente)

| # | Gap | Por que Fase 2 |
| --- | --- | --- |
| 1 | Negociacion in-quote (chat por linea) | Feature avanzada que no bloquea produccion |
| 2 | Cross-quote comparison ("este cliente vs aquel") | Análisis avanzado, util cuando >100 quotes/mes |
| 3 | Search inside PDF (text layer) | Solo si auditoria legal lo exige explicitamente |
| 4 | Multi-attachment en envelope | Util cuando ventas enterprise piden propuesta + slide deck + case studies |
| 5 | Batch send a multiples prospects | Util para outbound sales scale |
| 6 | A/B testing de PDF/email subject | Marketing optimization, no operacional |
| 7 | Bulk operations (duplicate, bulk update pricing, bulk import) | Util cuando catalogo > 200 items |
| 8 | Preview cliente pre-firma (sin signature request formal) | Feature comfort |
| 9 | Service composition templates por business_line | Util despues de validar el composer en uso real |

### Fuera de Scope CPQ (cross-references a otros programas)

| # | Gap | Programa correspondiente |
| --- | --- | --- |
| 1 | Mobile/responsive del composer | UX program general del portal |
| 2 | Cliente portal externo (cliente firma + ve PDF + comenta) | Programa "Client Portal" separado |
| 3 | SOX / segregation of duties / dual approval | Programa "Financial Controls" — relevante post-IPO |
| 4 | Print/export Excel/CSV del quote | Programa "Reporting & Exports" |
| 5 | SEO publico del catalogo (pagina marketing) | Programa "Marketing Site" |
| 6 | AI Quote Draft Assistant | TASK-609 ya existe spec separado |
| 7 | Webhooks outbound publicos a clientes | Programa "Public API" futuro |

### Decisiones cerradas en v1.9 (38 total — extiende las 29 cerradas en v1.8)

Las nuevas 9 decisiones (con criterio robusto/escalable):

| # | Decision | Resolucion |
| --- | --- | --- |
| 30 | Strangler Fig vs Big Bang migration | **Strangler Fig** — todo aditivo, deprecate gradual con runway 30-90 dias |
| 31 | Feature flag matrix vs deploy gates | **Feature flags por feature** — rollback < 5 min sin deploy |
| 32 | Quote regression suite enforcement | **Bloqueante en CI** — drift en pricing rechaza merge |
| 33 | EPIC-002 integration con CPQ | **Bloque 0 prerequisite** — TASK-554/555 antes de B/C/D |
| 34 | HubSpot stage post-firma | **`Signed - Awaiting Invoice` separado de Closed Won** — separa firma de facturacion |
| 35 | Cost guardrails per tenant | **Hard limit + soft warning 80%** + monthly/daily reset |
| 36 | GDPR scope | **Solo signers externos** (employees Efeonce no GDPR scope) + PDF firmado preserved |
| 37 | i18n scope | **Programa completo** (PDF + UI + notifications + ZapSign) no solo PDF |
| 38 | Catalog lifecycle | **Soft-delete unificado** + state machine `draft → active → sunset → archived`; never hard-delete |

### Recomendacion de orden de ejecucion v1.9

```text
Semana 1-2:  Bloque 0 (TASK-554 + 555 + 557.1)
             en paralelo: TASK-489 (foundation documental, no bloquea)

Semana 3-4:  Bloque 0 finishing (TASK-556 + 557)
             Bloque B (rich text editor: 630 + 630.1 + 630.2)
             en paralelo: TASK-490 (signature foundation)

Semana 5-6:  Bloque C (sellable catalog: 620 + 620.1 + 620.1.1 + 620.2)
             en paralelo: TASK-491 (ZapSign adapter)

Semana 7-9:  Bloque D (composer + picker + ad-hoc: 620.3 + 620.4 + 620.5)
             en paralelo: TASK-619 + 619.1 + 619.2 + 619.3 (eSignature consumer + workers + notifications)

Semana 10-13: Bloque E primer batch (619.4 + 619.5 + 620.6 + 620.7 + 627.1 + 628.1)

Semana 14-17: Bloque E segundo batch (621 + 622 + 623 + 624 + 625 + 626 + 628)

Semana 18:   Buffer + smoke tests E2E + documentation + training operadores
```

Con 2 devs en paralelo: ~9 semanas. Con 1 dev sequencial: ~17-18 semanas.

## Referencias

- Auditoria interna ejecutada 2026-04-24 con Explore agent (mapeo codigo) + muestreo live portal HubSpot 48713323.
- Contraste CPQ mercado: Salesforce CPQ docs, HubSpot CPQ features, Zuora RevPro, DealHub CPQ, Conga CPQ.
- Backfill report: [backfill-product-catalog-hs-v2-20260424.md](../operations/backfill-product-catalog-hs-v2-20260424.md).
- Architecture context: [GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md](../architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md) v1.5.
